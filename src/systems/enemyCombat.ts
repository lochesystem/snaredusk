import type { EnemyBehaviorDef } from '../data/enemyBehaviors.ts';
import { getEnemyBehavior } from '../data/enemyBehaviors.ts';
import { calcDamage, distance, normalize } from './combat.ts';
import { createProjectileData } from './projectiles.ts';

export type EnemyCombatPhase = 'idle' | 'windup' | 'burst';

export interface EnemyCombatEnemy {
  id: string;
  speciesId: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  atk: number;
  speed: number;
  attackCd: number;
  enraged: boolean;
  aggroed: boolean;
  dead: boolean;
  fled: boolean;
  captureLocked: boolean;
  isBoss: boolean;
  def: number;
  behaviorId: string;
  shieldHp: number;
  shieldMax: number;
  shieldRegenCd: number;
  combatPhase: EnemyCombatPhase;
  phaseTimer: number;
  burstShotsLeft: number;
}

export interface EnemyCombatContext {
  playerX: number;
  playerY: number;
  dt: number;
}

export interface EnemyProjectileSpawn {
  data: ReturnType<typeof createProjectileData>;
  angle: number;
}

export interface EnemyCombatResult {
  moveX: number;
  moveY: number;
  playerDamage: number;
  projectiles: EnemyProjectileSpawn[];
}

export function initEnemyCombatFields(
  behaviorId: string,
): Pick<EnemyCombatEnemy, 'shieldHp' | 'shieldMax' | 'shieldRegenCd' | 'combatPhase' | 'phaseTimer' | 'burstShotsLeft'> {
  const behavior = getEnemyBehavior(behaviorId);
  const shieldMax = behavior.shieldHp ?? 0;
  return {
    shieldHp: shieldMax,
    shieldMax,
    shieldRegenCd: 0,
    combatPhase: 'idle',
    phaseTimer: 0,
    burstShotsLeft: 0,
  };
}

function spawnEnemyProjectile(
  enemy: EnemyCombatEnemy,
  behavior: EnemyBehaviorDef,
  angle: number,
): EnemyProjectileSpawn {
  const dmg = calcDamage(Math.round(enemy.atk * (behavior.projectileDamageMult ?? 1)));
  return {
    angle,
    data: createProjectileData(
      enemy.x,
      enemy.y - 4,
      angle,
      behavior.projectileSpeed ?? 140,
      dmg,
      'enemy',
      behavior.attackRange,
      0,
      6,
    ),
  };
}

export function tickEnemyCombat(
  enemy: EnemyCombatEnemy,
  ctx: EnemyCombatContext,
): EnemyCombatResult {
  const result: EnemyCombatResult = {
    moveX: enemy.x,
    moveY: enemy.y,
    playerDamage: 0,
    projectiles: [],
  };

  if (enemy.dead || enemy.fled || enemy.captureLocked) return result;

  const behavior = getEnemyBehavior(enemy.behaviorId);
  const dist = distance(enemy.x, enemy.y, ctx.playerX, ctx.playerY);

  if (behavior.kind === 'shielded' || behavior.kind === 'boss_burst') {
    if (enemy.shieldHp <= 0 && enemy.shieldRegenCd > 0) {
      enemy.shieldRegenCd -= ctx.dt;
      if (enemy.shieldRegenCd <= 0) {
        enemy.shieldHp = enemy.shieldMax;
      }
    }
  }

  if (enemy.combatPhase === 'windup') {
    enemy.phaseTimer -= ctx.dt;
    if (enemy.phaseTimer <= 0) {
      const angle = Math.atan2(ctx.playerY - enemy.y, ctx.playerX - enemy.x);
      if (behavior.kind === 'boss_burst' && enemy.burstShotsLeft > 0) {
        const spread = 0.35;
        const base = angle;
        const idx = behavior.burstCount! - enemy.burstShotsLeft;
        const offset = (idx - 1) * spread;
        result.projectiles.push(spawnEnemyProjectile(enemy, behavior, base + offset));
        enemy.burstShotsLeft -= 1;
        if (enemy.burstShotsLeft > 0) {
          enemy.phaseTimer = 0.15;
        } else {
          enemy.combatPhase = 'idle';
          enemy.attackCd = behavior.attackCooldown;
        }
      } else {
        result.projectiles.push(spawnEnemyProjectile(enemy, behavior, angle));
        enemy.combatPhase = 'idle';
        enemy.attackCd = behavior.attackCooldown;
      }
    }
    return result;
  }

  if (!enemy.aggroed) return result;

  const preferred = behavior.preferredRange ?? behavior.attackRange * 0.5;

  if (behavior.kind === 'ranged' || behavior.kind === 'boss_burst') {
    if (dist > preferred + 12) {
      const dir = normalize(ctx.playerX - enemy.x, ctx.playerY - enemy.y);
      const step = enemy.speed * ctx.dt;
      result.moveX = enemy.x + dir.x * step;
      result.moveY = enemy.y + dir.y * step;
    } else if (dist < preferred - 20) {
      const dir = normalize(enemy.x - ctx.playerX, enemy.y - ctx.playerY);
      const step = enemy.speed * 0.7 * ctx.dt;
      result.moveX = enemy.x + dir.x * step;
      result.moveY = enemy.y + dir.y * step;
    }

    enemy.attackCd -= ctx.dt;
    if (enemy.attackCd <= 0 && dist <= behavior.attackRange) {
      enemy.combatPhase = 'windup';
      enemy.phaseTimer = 0.35;
      if (behavior.kind === 'boss_burst') {
        enemy.burstShotsLeft = behavior.burstCount ?? 3;
      }
    }
    return result;
  }

  if (dist > 8) {
    const dir = normalize(ctx.playerX - enemy.x, ctx.playerY - enemy.y);
    const spd = enemy.speed * (enemy.enraged ? 1.2 : 1);
    result.moveX = enemy.x + dir.x * spd * ctx.dt;
    result.moveY = enemy.y + dir.y * spd * ctx.dt;
  }

  enemy.attackCd -= ctx.dt;
  if (dist < behavior.attackRange && enemy.attackCd <= 0) {
    enemy.attackCd = behavior.attackCooldown;
    result.playerDamage = calcDamage(enemy.atk);
  }

  return result;
}

export function applyShieldDamage(enemy: EnemyCombatEnemy, damage: number, behavior: EnemyBehaviorDef): number {
  if (enemy.shieldHp > 0 && (behavior.kind === 'shielded' || behavior.kind === 'boss_burst')) {
    const absorbed = Math.min(enemy.shieldHp, damage);
    enemy.shieldHp -= absorbed;
    const remaining = damage - absorbed;
    if (enemy.shieldHp <= 0) {
      enemy.shieldRegenCd = behavior.shieldRegenDelay ?? 5;
    }
    return remaining;
  }
  return damage;
}
