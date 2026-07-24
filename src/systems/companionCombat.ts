import type { Rect } from '../types.ts';
import type { DungeonObstacle } from '../world/dungeonGenerator.ts';
import {
  PARTY_ATTACK_RANGE,
  PARTY_LEASH_RANGE,
  PARTY_RANGED_OFFSET,
} from '../engine/constants.ts';
import type { EnemyBehaviorDef } from '../data/enemyBehaviors.ts';
import { getEnemyBehavior, isRangedBossKind } from '../data/enemyBehaviors.ts';
import { calcDamage, distance, normalize } from './combat.ts';
import { createProjectileData } from './projectiles.ts';
import { hasLineOfSight } from '../world/collision.ts';
import { isWalkablePosition } from '../world/pathfinding.ts';

export function isCompanionRanged(behaviorId: string): boolean {
  const behavior = getEnemyBehavior(behaviorId);
  return behavior.kind === 'ranged' || isRangedBossKind(behavior.kind);
}

export function getCompanionBehavior(behaviorId: string): EnemyBehaviorDef {
  return getEnemyBehavior(behaviorId);
}

export interface CompanionRangedShot {
  data: ReturnType<typeof createProjectileData>;
  visualStyle: 'orb' | 'spear' | 'spore';
  attackCooldown: number;
}

export function buildCompanionRangedShot(
  behaviorId: string,
  fromX: number,
  fromY: number,
  targetX: number,
  targetY: number,
  atk: number,
  targetDef = 0,
): CompanionRangedShot {
  const behavior = getEnemyBehavior(behaviorId);
  const angle = Math.atan2(targetY - fromY, targetX - fromX);
  const damage = calcDamage(atk, targetDef);
  return {
    data: createProjectileData(
      fromX,
      fromY - 4,
      angle,
      behavior.projectileSpeed ?? 150,
      damage,
      'companion',
      behavior.attackRange,
      0,
      6,
    ),
    visualStyle: 'spore',
    attackCooldown: behavior.attackCooldown,
  };
}

export function companionPreferredRange(behaviorId: string): number {
  const behavior = getEnemyBehavior(behaviorId);
  return behavior.preferredRange ?? behavior.attackRange * 0.5;
}

export function companionAttackRange(behaviorId: string): number {
  return getEnemyBehavior(behaviorId).attackRange;
}

export function companionFollowAnchor(playerX: number, playerY: number): { x: number; y: number } {
  return { x: playerX - 20, y: playerY + 2 };
}

/** Ponto ideal para ranged: perto do jogador, na direção do inimigo. */
export function companionRangedAnchor(
  playerX: number,
  playerY: number,
  enemyX: number,
  enemyY: number,
  offset = PARTY_RANGED_OFFSET,
): { x: number; y: number } {
  const dx = enemyX - playerX;
  const dy = enemyY - playerY;
  const dist = Math.hypot(dx, dy) || 1;
  return {
    x: playerX + (dx / dist) * offset,
    y: playerY + (dy / dist) * offset,
  };
}

export interface CompanionMoveIntent {
  goalX: number;
  goalY: number;
  shouldShoot: boolean;
  shouldMelee: boolean;
  faceX: number;
  faceY: number;
}

export interface CompanionIntentInput {
  behaviorId: string;
  compX: number;
  compY: number;
  playerX: number;
  playerY: number;
  attackCd: number;
  atk: number;
  walls: Rect[];
  target?: { x: number; y: number; def: number } | null;
}

export function computeCompanionIntent(input: CompanionIntentInput): CompanionMoveIntent {
  const {
    behaviorId,
    compX,
    compY,
    playerX,
    playerY,
    attackCd,
    walls,
    target,
  } = input;

  const follow = companionFollowAnchor(playerX, playerY);
  const distToPlayer = distance(compX, compY, playerX, playerY);

  if (!target) {
    return {
      goalX: follow.x,
      goalY: follow.y,
      shouldShoot: false,
      shouldMelee: false,
      faceX: playerX - compX,
      faceY: 0,
    };
  }

  const faceX = target.x - compX;
  const faceY = target.y - compY;
  const distToTarget = distance(compX, compY, target.x, target.y);
  const los = hasLineOfSight(compX, compY, target.x, target.y, walls);

  if (distToPlayer > PARTY_LEASH_RANGE) {
    return {
      goalX: follow.x,
      goalY: follow.y,
      shouldShoot: false,
      shouldMelee: false,
      faceX: playerX - compX,
      faceY: playerY - compY,
    };
  }

  if (isCompanionRanged(behaviorId)) {
    const anchor = companionRangedAnchor(playerX, playerY, target.x, target.y);
    const attackRange = companionAttackRange(behaviorId);
    const canShoot = attackCd <= 0 && los && distToTarget <= attackRange;
    const distToAnchor = distance(compX, compY, anchor.x, anchor.y);

    if (canShoot && distToAnchor < 28) {
      return {
        goalX: compX,
        goalY: compY,
        shouldShoot: true,
        shouldMelee: false,
        faceX,
        faceY,
      };
    }

    if (!los || distToAnchor > 18) {
      return {
        goalX: anchor.x,
        goalY: anchor.y,
        shouldShoot: false,
        shouldMelee: false,
        faceX,
        faceY,
      };
    }

    return {
      goalX: anchor.x,
      goalY: anchor.y,
      shouldShoot: canShoot,
      shouldMelee: false,
      faceX,
      faceY,
    };
  }

  if (distToTarget <= PARTY_ATTACK_RANGE && attackCd <= 0 && los) {
    return {
      goalX: compX,
      goalY: compY,
      shouldShoot: false,
      shouldMelee: true,
      faceX,
      faceY,
    };
  }

  if (distToTarget > PARTY_ATTACK_RANGE * 0.6) {
    const dir = normalize(target.x - compX, target.y - compY);
    const step = Math.min(distToTarget - PARTY_ATTACK_RANGE * 0.5, 40);
    return {
      goalX: compX + dir.x * step,
      goalY: compY + dir.y * step,
      shouldShoot: false,
      shouldMelee: false,
      faceX,
      faceY,
    };
  }

  return {
    goalX: compX,
    goalY: compY,
    shouldShoot: false,
    shouldMelee: false,
    faceX,
    faceY,
  };
}

export function shouldMoveTowardGoal(
  compX: number,
  compY: number,
  goalX: number,
  goalY: number,
  minGap = 6,
): boolean {
  return distance(compX, compY, goalX, goalY) > minGap;
}

export const COMPANION_IDLE_ROAM_SPEED = 46;
export const COMPANION_IDLE_ROAM_RADIUS = 44;
const COMPANION_IDLE_BREAK_DISTANCE = 58;

export interface CompanionIdleRoamFields {
  decisionTimer: number;
  targetX: number;
  targetY: number;
  active: boolean;
}

export function initCompanionIdleRoam(x: number, y: number): CompanionIdleRoamFields {
  return {
    decisionTimer: 0.65 + Math.random() * 0.8,
    targetX: x,
    targetY: y,
    active: false,
  };
}

export interface CompanionIdleRoamInput {
  compX: number;
  compY: number;
  playerX: number;
  playerY: number;
  playerMoving: boolean;
  hasCombatTarget: boolean;
  dt: number;
  floors: Rect[];
  walls: Rect[];
  obstacles: DungeonObstacle[];
  rng?: () => number;
}

export interface CompanionIdleRoamResult {
  active: boolean;
  goalX: number;
  goalY: number;
}

export function tickCompanionIdleRoam(
  fields: CompanionIdleRoamFields,
  input: CompanionIdleRoamInput,
): CompanionIdleRoamResult {
  const rng = input.rng ?? Math.random;
  const distToPlayer = distance(
    input.compX,
    input.compY,
    input.playerX,
    input.playerY,
  );

  if (
    input.playerMoving
    || input.hasCombatTarget
    || distToPlayer > COMPANION_IDLE_BREAK_DISTANCE
  ) {
    fields.active = false;
    fields.decisionTimer = 0.45 + rng() * 0.55;
    return { active: false, goalX: input.playerX, goalY: input.playerY };
  }

  fields.decisionTimer -= input.dt;
  if (fields.active && distance(input.compX, input.compY, fields.targetX, fields.targetY) <= 2.5) {
    fields.active = false;
    fields.decisionTimer = 0.65 + rng() * 1.35;
  }

  if (!fields.active && fields.decisionTimer <= 0) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const angle = rng() * Math.PI * 2;
      const roamDistance = 18 + rng() * (COMPANION_IDLE_ROAM_RADIUS - 18);
      const x = input.playerX + Math.cos(angle) * roamDistance;
      const y = input.playerY + Math.sin(angle) * roamDistance * 0.72;
      if (!isWalkablePosition(x, y, 8, input.floors, input.walls, input.obstacles)) continue;
      fields.targetX = x;
      fields.targetY = y;
      fields.active = true;
      break;
    }
    if (!fields.active) fields.decisionTimer = 0.5 + rng() * 0.7;
  }

  return {
    active: fields.active,
    goalX: fields.targetX,
    goalY: fields.targetY,
  };
}

const SPAWN_OFFSETS = [
  { x: 0, y: 0 },
  { x: -18, y: 0 },
  { x: 18, y: 0 },
  { x: 0, y: -14 },
  { x: 0, y: 14 },
  { x: -24, y: 8 },
  { x: 24, y: 8 },
  { x: -12, y: -12 },
  { x: 12, y: 12 },
];

/** Posição caminhável perto do jogador (spawn inicial / arena do chefe). */
export function findCompanionSpawnNearPlayer(
  playerX: number,
  playerY: number,
  floors: Rect[],
  walls: Rect[],
  holes: DungeonObstacle[] = [],
  radius = 8,
): { x: number; y: number } {
  const anchor = companionFollowAnchor(playerX, playerY);
  for (const off of SPAWN_OFFSETS) {
    const x = anchor.x + off.x;
    const y = anchor.y + off.y;
    if (isWalkablePosition(x, y, radius, floors, walls, holes)) {
      return { x, y };
    }
  }
  return anchor;
}

export { hasLineOfSight };
