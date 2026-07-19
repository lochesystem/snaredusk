import type { Rect } from '../types.ts';
import type { DungeonObstacle } from '../world/dungeonGenerator.ts';
import { normalize } from './combat.ts';
import { moveWithCollision } from '../world/collision.ts';

export const ENEMY_WANDER_SPEED = 42;
const ENEMY_RADIUS = 9;
const ROOM_MARGIN = 28;

export interface EnemyWanderFields {
  wanderTimer: number;
  wanderPauseTimer: number;
  wanderTargetX: number;
  wanderTargetY: number;
  wanderIdlePhase: number;
  homeX: number;
  homeY: number;
}

export function initEnemyWanderFields(x: number, y: number): EnemyWanderFields {
  return {
    wanderTimer: 0.4 + Math.random() * 1.5,
    wanderPauseTimer: 0.2 + Math.random() * 0.6,
    wanderTargetX: x,
    wanderTargetY: y,
    wanderIdlePhase: Math.random() * Math.PI * 2,
    homeX: x,
    homeY: y,
  };
}

export interface EnemyWanderContext {
  roomRect: Rect;
  dt: number;
  walls: Rect[];
  floors: Rect[];
  obstacles: DungeonObstacle[];
  /** Opcional — usa Math.random quando omitido (testes passam rng). */
  rng?: () => number;
}

export interface EnemyWanderResult {
  x: number;
  y: number;
  moving: boolean;
  faceDx: number;
  bobOffset: number;
}

function roomBounds(roomRect: Rect) {
  return {
    minX: roomRect.x + ROOM_MARGIN,
    minY: roomRect.y + ROOM_MARGIN,
    maxX: roomRect.x + roomRect.width - ROOM_MARGIN,
    maxY: roomRect.y + roomRect.height - ROOM_MARGIN,
  };
}

function clampToBounds(x: number, y: number, bounds: ReturnType<typeof roomBounds>) {
  return {
    x: Math.max(bounds.minX, Math.min(bounds.maxX, x)),
    y: Math.max(bounds.minY, Math.min(bounds.maxY, y)),
  };
}

export function tickEnemyWander(
  fields: EnemyWanderFields,
  x: number,
  y: number,
  ctx: EnemyWanderContext,
): EnemyWanderResult {
  const rng = ctx.rng ?? Math.random;
  const bounds = roomBounds(ctx.roomRect);

  fields.wanderTimer -= ctx.dt;
  fields.wanderPauseTimer -= ctx.dt;
  fields.wanderIdlePhase += ctx.dt * 2.2;

  if (fields.wanderTimer <= 0 && fields.wanderPauseTimer <= 0) {
    const roamRadius = Math.min(ctx.roomRect.width, ctx.roomRect.height) * 0.35;
    const angle = rng() * Math.PI * 2;
    const dist = roamRadius * (0.35 + rng() * 0.65);
    fields.wanderTargetX = Math.max(
      bounds.minX,
      Math.min(bounds.maxX, fields.homeX + Math.cos(angle) * dist),
    );
    fields.wanderTargetY = Math.max(
      bounds.minY,
      Math.min(bounds.maxY, fields.homeY + Math.sin(angle) * dist),
    );
    fields.wanderTimer = 1.1 + rng() * 2.2;
    fields.wanderPauseTimer = 0.25 + rng() * 1.1;
  }

  const dx = fields.wanderTargetX - x;
  const dy = fields.wanderTargetY - y;
  const dist = Math.hypot(dx, dy);
  let nx = x;
  let ny = y;
  let movedX = 0;
  let moving = false;

  if (dist > 3 && fields.wanderPauseTimer <= 0) {
    const dir = normalize(dx, dy);
    const step = ENEMY_WANDER_SPEED * ctx.dt;
    const prevX = x;
    const moved = moveWithCollision(
      x,
      y,
      dir.x * step,
      dir.y * step,
      ENEMY_RADIUS,
      ctx.walls,
      ctx.floors,
      ctx.obstacles,
    );
    nx = moved.x;
    ny = moved.y;
    movedX = nx - prevX;
    moving = Math.abs(movedX) > 0.001 || Math.abs(ny - y) > 0.001;
  }

  const clamped = clampToBounds(nx, ny, bounds);
  nx = clamped.x;
  ny = clamped.y;

  return {
    x: nx,
    y: ny,
    moving,
    faceDx: moving ? movedX : dx,
    bobOffset: Math.sin(fields.wanderIdlePhase) * 0.6,
  };
}

export function resetEnemyWanderHome(fields: EnemyWanderFields, x: number, y: number): void {
  fields.homeX = x;
  fields.homeY = y;
  fields.wanderTargetX = x;
  fields.wanderTargetY = y;
  fields.wanderPauseTimer = 0.35 + Math.random() * 0.8;
  fields.wanderTimer = 0.6 + Math.random() * 1.2;
}
