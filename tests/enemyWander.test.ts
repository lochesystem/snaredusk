import { describe, expect, it } from 'vitest';
import { initEnemyWanderFields, tickEnemyWander } from '../src/systems/enemyWander.ts';

const room = { x: 100, y: 80, width: 240, height: 180 };
const floors = [room];
const walls: { x: number; y: number; width: number; height: number }[] = [];

describe('enemyWander', () => {
  it('moves toward wander target while idle in room', () => {
    const fields = initEnemyWanderFields(220, 170);
    fields.wanderTargetX = 260;
    fields.wanderTargetY = 190;
    fields.wanderPauseTimer = 0;
    fields.wanderTimer = 2;

    const result = tickEnemyWander(fields, 220, 170, {
      roomRect: room,
      dt: 0.1,
      walls,
      floors,
      obstacles: [],
      rng: () => 0.5,
    });

    expect(result.moving).toBe(true);
    expect(result.x).toBeGreaterThan(220);
    expect(result.y).toBeGreaterThan(170);
  });

  it('picks new target after wander timer expires', () => {
    const fields = initEnemyWanderFields(200, 160);
    fields.wanderTimer = 0;
    fields.wanderPauseTimer = 0;
    const beforeX = fields.wanderTargetX;

    tickEnemyWander(fields, 200, 160, {
      roomRect: room,
      dt: 0.05,
      walls,
      floors,
      obstacles: [],
      rng: () => 0.25,
    });

    expect(fields.wanderTimer).toBeGreaterThan(0);
    expect(fields.wanderPauseTimer).toBeGreaterThan(0);
    expect(
      fields.wanderTargetX !== beforeX || fields.wanderTargetY !== 160,
    ).toBe(true);
  });
});
