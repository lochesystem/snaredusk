import { describe, expect, it } from 'vitest';
import {
  createProjectileData,
  projectileHitEnemy,
  projectileHitPlayer,
} from '../src/systems/projectiles.ts';

describe('projectiles', () => {
  it('creates projectile with velocity from angle', () => {
    const p = createProjectileData(0, 0, 0, 100, 10, 'player', 200);
    expect(p.vx).toBeCloseTo(100);
    expect(p.vy).toBeCloseTo(0);
    expect(p.damage).toBe(10);
  });

  it('detects enemy hit', () => {
    const data = createProjectileData(10, 10, 0, 0, 5, 'player', 50, 0, 6);
    const p = { ...data, container: null as never, hitIds: new Set<string>() };
    expect(projectileHitEnemy(p, 'e1', 12, 10)).toBe(true);
    p.hitIds.add('e1');
    expect(projectileHitEnemy(p, 'e1', 12, 10)).toBe(false);
  });

  it('detects player hit', () => {
    const data = createProjectileData(0, 0, 0, 0, 5, 'enemy', 50, 0, 6);
    const p = { ...data, container: null as never, hitIds: new Set<string>() };
    expect(projectileHitPlayer(p, 5, 0, 8)).toBe(true);
    expect(projectileHitPlayer(p, 30, 0, 8)).toBe(false);
  });
});
