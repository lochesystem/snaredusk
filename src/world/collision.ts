import type { Rect } from '../types.ts';
import type { DungeonObstacle } from './dungeonGenerator.ts';
import { PLAYER_RADIUS } from './dungeonGenerator.ts';

function circleHitsRect(cx: number, cy: number, radius: number, rect: Rect): boolean {
  const nearestX = Math.max(rect.x, Math.min(cx, rect.x + rect.width));
  const nearestY = Math.max(rect.y, Math.min(cy, rect.y + rect.height));
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy < radius * radius;
}

export function collidesCircle(cx: number, cy: number, radius: number, walls: Rect[]): boolean {
  for (const wall of walls) {
    if (circleHitsRect(cx, cy, radius, wall)) return true;
  }
  return false;
}

/** Só é possível ficar em pé sobre piso (salas + corredores). */
export function isOnWalkableFloor(cx: number, cy: number, radius: number, floors: Rect[]): boolean {
  for (const floor of floors) {
    if (circleHitsRect(cx, cy, radius, floor)) return true;
  }
  return false;
}

/** Buracos são áreas não caminháveis no chão (para inimigos e pathfinding). */
export function isInHole(
  cx: number,
  cy: number,
  radius: number,
  obstacles: DungeonObstacle[],
): boolean {
  for (const obs of obstacles) {
    if (obs.kind !== 'hole') continue;
    const dx = cx - obs.x;
    const dy = cy - obs.y;
    if (dx * dx + dy * dy < (obs.radius + radius * 0.6) ** 2) return true;
  }
  return false;
}

/** Formações sólidas bloqueiam movimento (rochas, cristais e estalactites). */
export function isInRock(
  cx: number,
  cy: number,
  radius: number,
  obstacles: DungeonObstacle[],
): boolean {
  for (const obs of obstacles) {
    if (obs.kind === 'hole') continue;
    const dx = cx - obs.x;
    const dy = cy - obs.y;
    if (dx * dx + dy * dy < (obs.radius + radius * 0.5) ** 2) return true;
  }
  return false;
}

export interface MoveCollisionOptions {
  /** Jogador pode entrar no buraco para disparar queda. */
  blockHoles?: boolean;
  blockRocks?: boolean;
}

function isMovementBlocked(
  cx: number,
  cy: number,
  radius: number,
  obstacles: DungeonObstacle[],
  options: MoveCollisionOptions,
): boolean {
  if (options.blockHoles !== false && isInHole(cx, cy, radius, obstacles)) return true;
  if (options.blockRocks !== false && isInRock(cx, cy, radius, obstacles)) return true;
  return false;
}

export function moveWithCollision(
  x: number,
  y: number,
  dx: number,
  dy: number,
  radius: number,
  walls: Rect[],
  floors: Rect[],
  obstacles: DungeonObstacle[] = [],
  options: MoveCollisionOptions = {},
): { x: number; y: number } {
  let nx = x + dx;
  let ny = y;

  if (
    !collidesCircle(nx, ny, radius, walls) &&
    isOnWalkableFloor(nx, ny, radius, floors) &&
    !isMovementBlocked(nx, ny, radius, obstacles, options)
  ) {
    x = nx;
  }

  ny = y + dy;
  if (
    !collidesCircle(x, ny, radius, walls) &&
    isOnWalkableFloor(x, ny, radius, floors) &&
    !isMovementBlocked(x, ny, radius, obstacles, options)
  ) {
    y = ny;
  }

  return { x, y };
}

/** Verifica visão livre entre dois pontos (amostragem contra paredes). */
export function hasLineOfSight(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  walls: Rect[],
  checkRadius = 6,
  steps = 10,
): boolean {
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const px = ax + (bx - ax) * t;
    const py = ay + (by - ay) * t;
    if (collidesCircle(px, py, checkRadius, walls)) return false;
  }
  return true;
}

/** Tenta mover em direção ao alvo contornando paredes (várias direções). */
export function steerToward(
  x: number,
  y: number,
  goalX: number,
  goalY: number,
  speed: number,
  dt: number,
  radius: number,
  walls: Rect[],
  floors: Rect[],
  holes: DungeonObstacle[] = [],
): { x: number; y: number } {
  const dx = goalX - x;
  const dy = goalY - y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return { x, y };

  const ux = dx / dist;
  const uy = dy / dist;
  const step = speed * dt;
  const candidates = [
    { x: ux, y: uy },
    { x: ux, y: 0 },
    { x: 0, y: uy },
    { x: uy, y: -ux },
    { x: -uy, y: ux },
    { x: -ux, y: 0 },
    { x: 0, y: -uy },
    { x: -ux, y: -uy },
  ];

  for (const dir of candidates) {
    const len = Math.hypot(dir.x, dir.y);
    if (len < 0.001) continue;
    const ndx = (dir.x / len) * step;
    const ndy = (dir.y / len) * step;
    const moved = moveWithCollision(x, y, ndx, ndy, radius, walls, floors, holes);
    if (Math.abs(moved.x - x) > 0.01 || Math.abs(moved.y - y) > 0.01) {
      return moved;
    }
  }

  return { x, y };
}

export { PLAYER_RADIUS };
