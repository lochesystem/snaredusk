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

/** Buracos são áreas não caminháveis no chão. */
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

export function moveWithCollision(
  x: number,
  y: number,
  dx: number,
  dy: number,
  radius: number,
  walls: Rect[],
  floors: Rect[],
  holes: DungeonObstacle[] = [],
): { x: number; y: number } {
  let nx = x + dx;
  let ny = y;

  if (
    !collidesCircle(nx, ny, radius, walls) &&
    isOnWalkableFloor(nx, ny, radius, floors) &&
    !isInHole(nx, ny, radius, holes)
  ) {
    x = nx;
  }

  ny = y + dy;
  if (
    !collidesCircle(x, ny, radius, walls) &&
    isOnWalkableFloor(x, ny, radius, floors) &&
    !isInHole(x, ny, radius, holes)
  ) {
    y = ny;
  }

  return { x, y };
}

export { PLAYER_RADIUS };
