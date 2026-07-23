import { describe, expect, it } from 'vitest';
import { getEnemyHitbox } from '../src/data/enemyHitboxes.ts';

describe('enemyHitboxes', () => {
  it('keeps legacy enemies on the original compact hitbox', () => {
    expect(getEnemyHitbox('lumimorcego')).toEqual({
      hitRadius: 10,
      hitOffsetY: 0,
      collisionRadius: 9,
      statusBarY: -22,
    });
  });

  it('matches crystal enemies and gives the boss the largest target', () => {
    expect(getEnemyHitbox('prismarin').hitRadius).toBe(25);
    expect(getEnemyHitbox('lumicascalho').hitRadius).toBe(26);
    expect(getEnemyHitbox('eco_quartzo').hitRadius).toBe(28);
    expect(getEnemyHitbox('matriarca_prismatica').hitRadius).toBe(44);
    expect(getEnemyHitbox('matriarca_prismatica').hitOffsetY).toBe(-52);
    expect(getEnemyHitbox('matriarca_prismatica').collisionRadius).toBeLessThan(44);
  });

  it('matches thermal swamp hitboxes to the new high-resolution silhouettes', () => {
    expect(getEnemyHitbox('salamandra')).toMatchObject({ hitRadius: 27, hitOffsetY: -17 });
    expect(getEnemyHitbox('vaporoso')).toMatchObject({ hitRadius: 28, hitOffsetY: -31 });
    expect(getEnemyHitbox('caranguejo_termal')).toMatchObject({ hitRadius: 30, hitOffsetY: -26 });
    expect(getEnemyHitbox('salamandra_ancia')).toMatchObject({
      hitRadius: 43,
      hitOffsetY: -38,
      collisionRadius: 31,
    });
  });
});
