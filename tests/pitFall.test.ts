import { describe, expect, it } from 'vitest';
import type { DungeonObstacle } from '../src/world/dungeonGenerator.ts';
import { getHoleFallTrigger, findSafeBesideHole } from '../src/systems/pitFall.ts';

const hole: DungeonObstacle = {
  kind: 'hole',
  x: 100,
  y: 100,
  radius: 14,
  roomIndex: 1,
};

const floors = [{ x: 0, y: 0, width: 300, height: 300 }];

describe('pitFall', () => {
  it('detects player center inside hole opening', () => {
    expect(getHoleFallTrigger(100, 100, [hole])).toBe(hole);
    expect(getHoleFallTrigger(130, 100, [hole])).toBeNull();
  });

  it('finds safe position beside hole away from center', () => {
    const safe = findSafeBesideHole(hole, 100, 100, 10, [], floors, [hole]);
    expect(safe).not.toBeNull();
    expect(getHoleFallTrigger(safe!.x, safe!.y, [hole])).toBeNull();
    const dist = Math.hypot(safe!.x - hole.x, safe!.y - hole.y);
    expect(dist).toBeGreaterThan(hole.radius + 20);
  });
});
