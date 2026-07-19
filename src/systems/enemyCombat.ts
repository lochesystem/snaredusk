import type { EnemyBehaviorDef } from '../data/enemyBehaviors.ts';
import { getEnemyBehavior, isBossBehaviorKind, isRangedBossKind } from '../data/enemyBehaviors.ts';
import { getBossPhaseModifiers, type BossCombatPhase } from './bossPhase.ts';
import { calcDamage, distance, normalize } from './combat.ts';
import { createProjectileData } from './projectiles.ts';

export type EnemyCombatPhase = 'idle' | 'windup' | 'burst' | 'charge' | 'leap';

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
  bossCombatPhase: BossCombatPhase;
  def: number;
  behaviorId: string;
  shieldHp: number;
  shieldMax: number;
  shieldRegenCd: number;
  combatPhase: EnemyCombatPhase;
  phaseTimer: number;
  burstShotsLeft: number;
  leapCd: number;
  chargeDirX: number;
  chargeDirY: number;
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
): Pick<
  EnemyCombatEnemy,
  | 'shieldHp'
  | 'shieldMax'
  | 'shieldRegenCd'
  | 'combatPhase'
  | 'phaseTimer'
  | 'burstShotsLeft'
  | 'leapCd'
  | 'chargeDirX'
  | 'chargeDirY'
> {
  const behavior = getEnemyBehavior(behaviorId);
  const shieldMax = behavior.shieldHp ?? 0;
  return {
    shieldHp: shieldMax,
    shieldMax,
    shieldRegenCd: 0,
    combatPhase: 'idle',
    phaseTimer: 0,
    burstShotsLeft: 0,
    leapCd: behavior.leapInterval ?? 5,
    chargeDirX: 0,
    chargeDirY: 0,
  };
}

function getEffectiveBehavior(enemy: EnemyCombatEnemy, behavior: EnemyBehaviorDef): EnemyBehaviorDef {
  if (!enemy.isBoss) return behavior;
  const mods = getBossPhaseModifiers(enemy, behavior);
  return {
    ...behavior,
    attackCooldown: behavior.attackCooldown * mods.attackCooldownMult,
    burstCount: (behavior.burstCount ?? 3) + mods.burstCountBonus,
    chargeDuration: (behavior.chargeDuration ?? 0.55) * mods.chargeDurationMult,
    leapInterval: (behavior.leapInterval ?? 5) * mods.leapIntervalMult,
  };
}

function getMoveSpeed(enemy: EnemyCombatEnemy, behavior: EnemyBehaviorDef): number {
  let mult = enemy.enraged ? 1.2 : 1;
  if (enemy.isBoss) {
    mult *= getBossPhaseModifiers(enemy, behavior).speedMult;
  }
  return enemy.speed * mult;
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

  const behavior = getEffectiveBehavior(enemy, getEnemyBehavior(enemy.behaviorId));
  const baseBehavior = getEnemyBehavior(enemy.behaviorId);
  const dist = distance(enemy.x, enemy.y, ctx.playerX, ctx.playerY);

  if (enemy.combatPhase === 'charge') {
    enemy.phaseTimer -= ctx.dt;
    const spd = behavior.chargeSpeed ?? 200;
    result.moveX = enemy.x + enemy.chargeDirX * spd * ctx.dt;
    result.moveY = enemy.y + enemy.chargeDirY * spd * ctx.dt;
    if (enemy.phaseTimer <= 0) {
      enemy.combatPhase = 'idle';
      enemy.attackCd = behavior.attackCooldown;
      if (dist < 42) {
        result.playerDamage = calcDamage(Math.round(enemy.atk * 1.4));
      }
    }
    return result;
  }

  if (enemy.combatPhase === 'leap') {
    enemy.phaseTimer -= ctx.dt;
    const dir = normalize(ctx.playerX - enemy.x, ctx.playerY - enemy.y);
    const spd = (baseBehavior.chargeSpeed ?? 200) * 1.15;
    result.moveX = enemy.x + dir.x * spd * ctx.dt;
    result.moveY = enemy.y + dir.y * spd * ctx.dt;
    if (enemy.phaseTimer <= 0) {
      enemy.combatPhase = 'idle';
      enemy.attackCd = behavior.attackCooldown;
      if (dist < 50) {
        result.playerDamage = calcDamage(Math.round(enemy.atk * 1.2));
      }
    }
    return result;
  }

  if (enemy.combatPhase === 'windup') {
    enemy.phaseTimer -= ctx.dt;
    if (enemy.phaseTimer <= 0) {
      const angle = Math.atan2(ctx.playerY - enemy.y, ctx.playerX - enemy.x);
      if (isRangedBossKind(behavior.kind) && enemy.burstShotsLeft > 0) {
        const spread = behavior.kind === 'boss_spore' ? 0.42 : 0.35;
        const base = angle;
        const idx = (behavior.burstCount ?? 3) - enemy.burstShotsLeft;
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

  if (behavior.kind === 'boss_thermal') {
    enemy.leapCd -= ctx.dt;
    if (enemy.leapCd <= 0 && dist > 35 && dist < 160) {
      enemy.leapCd = behavior.leapInterval ?? 4.5;
      enemy.combatPhase = 'leap';
      enemy.phaseTimer = 0.35;
      return result;
    }

    enemy.attackCd -= ctx.dt;
    if (enemy.attackCd <= 0 && dist > 45 && dist < 200) {
      const dir = normalize(ctx.playerX - enemy.x, ctx.playerY - enemy.y);
      enemy.chargeDirX = dir.x;
      enemy.chargeDirY = dir.y;
      enemy.combatPhase = 'charge';
      enemy.phaseTimer = behavior.chargeDuration ?? 0.55;
      return result;
    }

    if (dist > 8) {
      const dir = normalize(ctx.playerX - enemy.x, ctx.playerY - enemy.y);
      const spd = getMoveSpeed(enemy, baseBehavior);
      result.moveX = enemy.x + dir.x * spd * ctx.dt;
      result.moveY = enemy.y + dir.y * spd * ctx.dt;
    }

    if (dist < behavior.attackRange && enemy.attackCd <= 0) {
      enemy.attackCd = behavior.attackCooldown;
      result.playerDamage = calcDamage(enemy.atk);
    }
    return result;
  }

  if (behavior.kind === 'boss_spore') {
    enemy.leapCd -= ctx.dt;
    if (enemy.leapCd <= 0 && dist > 30 && dist < 140) {
      enemy.leapCd = behavior.leapInterval ?? 5;
      enemy.combatPhase = 'leap';
      enemy.phaseTimer = 0.4;
      return result;
    }
  }

  if (behavior.kind === 'ranged' || isRangedBossKind(behavior.kind)) {
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
      if (isRangedBossKind(behavior.kind)) {
        enemy.burstShotsLeft = behavior.burstCount ?? 3;
      }
    }
    return result;
  }

  if (dist > 8) {
    const dir = normalize(ctx.playerX - enemy.x, ctx.playerY - enemy.y);
    const spd = getMoveSpeed(enemy, baseBehavior);
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
  if (enemy.shieldHp > 0 && (behavior.kind === 'shielded' || isBossBehaviorKind(behavior.kind))) {
    const absorbed = Math.min(enemy.shieldHp, damage);
    enemy.shieldHp -= absorbed;
    const remaining = damage - absorbed;
    return remaining;
  }
  return damage;
}
