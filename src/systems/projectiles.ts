import type { Container } from 'pixi.js';
import type { Rect } from '../types.ts';
import type { DungeonObstacle } from '../world/dungeonGenerator.ts';
import { collidesCircle } from '../world/collision.ts';
import { circlesOverlap, distance, normalize } from './combat.ts';

export type ProjectileOwner = 'player' | 'enemy' | 'companion';

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  owner: ProjectileOwner;
  maxRange: number;
  traveled: number;
  pierceRemaining: number;
  hitIds: Set<string>;
  container: Container;
  radius: number;
  visualStyle?: 'orb' | 'spear' | 'spore';
  /** Nome exibido na morte quando o projétil acerta o jogador. */
  sourceName?: string;
}

let projectileIdCounter = 0;

export function resetProjectileIds(): void {
  projectileIdCounter = 0;
}

export function createProjectileData(
  x: number,
  y: number,
  angle: number,
  speed: number,
  damage: number,
  owner: ProjectileOwner,
  maxRange: number,
  pierce = 0,
  radius = 5,
): Omit<Projectile, 'container' | 'hitIds'> {
  const dir = normalize(Math.cos(angle), Math.sin(angle));
  return {
    id: `proj-${projectileIdCounter++}`,
    x,
    y,
    vx: dir.x * speed,
    vy: dir.y * speed,
    damage,
    owner,
    maxRange,
    traveled: 0,
    pierceRemaining: pierce,
    radius,
  };
}

export function advanceProjectile(
  p: Projectile,
  dt: number,
  walls: Rect[],
  floors: Rect[],
  obstacles: DungeonObstacle[],
): boolean {
  const step = Math.hypot(p.vx * dt, p.vy * dt);
  p.traveled += step;
  if (p.traveled >= p.maxRange) return false;

  const nx = p.x + p.vx * dt;
  const ny = p.y + p.vy * dt;

  if (collidesCircle(nx, ny, p.radius, walls)) return false;

  let onFloor = false;
  for (const floor of floors) {
    const nearestX = Math.max(floor.x, Math.min(nx, floor.x + floor.width));
    const nearestY = Math.max(floor.y, Math.min(ny, floor.y + floor.height));
    const dx = nx - nearestX;
    const dy = ny - nearestY;
    if (dx * dx + dy * dy < p.radius * p.radius) {
      onFloor = true;
      break;
    }
  }
  if (!onFloor) return false;

  for (const obs of obstacles) {
    if (obs.kind === 'hole' && circlesOverlap(nx, ny, p.radius, obs.x, obs.y, obs.radius)) return false;
    if (obs.kind === 'rock' && circlesOverlap(nx, ny, p.radius, obs.x, obs.y, obs.radius)) return false;
  }

  p.x = nx;
  p.y = ny;
  p.container.x = nx;
  p.container.y = ny;
  if (p.visualStyle === 'spear') {
    p.container.rotation = Math.atan2(p.vy, p.vx) + Math.PI / 2;
  }
  return true;
}

export function projectileHitEnemy(
  p: Projectile,
  enemyId: string,
  ex: number,
  ey: number,
  enemyRadius = 10,
): boolean {
  if (p.hitIds.has(enemyId)) return false;
  return circlesOverlap(p.x, p.y, p.radius, ex, ey, enemyRadius);
}

export function markProjectileHit(p: Projectile, enemyId: string): boolean {
  p.hitIds.add(enemyId);
  if (p.pierceRemaining > 0) {
    p.pierceRemaining -= 1;
    return true;
  }
  return false;
}

export function projectileHitPlayer(
  p: Projectile,
  px: number,
  py: number,
  playerRadius: number,
): boolean {
  return distance(p.x, p.y, px, py) < playerRadius + p.radius;
}
