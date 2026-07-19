import { describe, expect, it } from 'vitest';
import { calcFogOpacity, BOSS_FOG_DISSIPATE_SEC } from '../src/world/bossArenaFog.ts';

describe('bossArenaFog', () => {
  it('is fully opaque while locked in', () => {
    expect(calcFogOpacity('full', 0)).toBe(1);
  });

  it('eases to transparent while dissipating', () => {
    expect(calcFogOpacity('dissipating', 0)).toBe(1);
    expect(calcFogOpacity('dissipating', BOSS_FOG_DISSIPATE_SEC / 2)).toBeLessThan(0.6);
    expect(calcFogOpacity('dissipating', BOSS_FOG_DISSIPATE_SEC)).toBe(0);
  });

  it('stays clear after dissipation', () => {
    expect(calcFogOpacity('cleared', 0)).toBe(0);
  });
});
