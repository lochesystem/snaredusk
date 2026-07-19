import type { Rect } from '../types.ts';
import type { DungeonObstacle } from '../world/dungeonGenerator.ts';
import {
  collidesCircle,
  isInRock,
  isOnWalkableFloor,
} from '../world/collision.ts';

export const PIT_FALL_DAMAGE = 10;
export const PIT_FALL_INVULN_SEC = 1.5;
const SAFE_MARGIN = 26;

/** Centro do jogador dentro da abertura do buraco — dispara queda. */
export function getHoleFallTrigger(
  cx: number,
  cy: number,
  obstacles: DungeonObstacle[],
): DungeonObstacle | null {
  for (const obs of obstacles) {
    if (obs.kind !== 'hole') continue;
    const dx = cx - obs.x;
    const dy = cy - obs.y;
    const triggerRadius = obs.radius * 0.58;
    if (dx * dx + dy * dy < triggerRadius * triggerRadius) return obs;
  }
  return null;
}

export function findSafeBesideHole(
  hole: DungeonObstacle,
  fromX: number,
  fromY: number,
  entityRadius: number,
  walls: Rect[],
  floors: Rect[],
  obstacles: DungeonObstacle[],
): { x: number; y: number } | null {
  const awayAngle = Math.atan2(fromY - hole.y, fromX - hole.x);
  const baseDist = hole.radius + entityRadius + SAFE_MARGIN;
  const candidates: { x: number; y: number; angleScore: number; distScore: number }[] = [];

  for (let i = 0; i < 12; i++) {
    const a = (Math.PI * 2 * i) / 12;
    for (const mul of [1, 1.2, 1.45]) {
      const x = hole.x + Math.cos(a) * baseDist * mul;
      const y = hole.y + Math.sin(a) * baseDist * mul;
      if (!isOnWalkableFloor(x, y, entityRadius, floors)) continue;
      if (collidesCircle(x, y, entityRadius, walls)) continue;
      if (getHoleFallTrigger(x, y, obstacles)) continue;
      if (isInRock(x, y, entityRadius, obstacles)) continue;
      const angleDiff = Math.abs(Math.atan2(Math.sin(a - awayAngle), Math.cos(a - awayAngle)));
      candidates.push({
        x,
        y,
        angleScore: angleDiff,
        distScore: Math.hypot(x - fromX, y - fromY),
      });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => a.angleScore - b.angleScore || a.distScore - b.distScore);
  return { x: candidates[0]!.x, y: candidates[0]!.y };
}
