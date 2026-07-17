import { describe, expect, it } from 'vitest';
import {
  createWeaponAttackFx,
  getAttackFxDuration,
  tickWeaponAttackFx,
} from '../src/world/weaponAttackFx.ts';

describe('weaponAttackFx', () => {
  it('knife fx expires after its duration', () => {
    const fx = createWeaponAttackFx('knife', 0, 34, 0xffffff);
    expect(getAttackFxDuration('knife')).toBeGreaterThan(0);
    expect(tickWeaponAttackFx(fx, 0.05, 10, 20)).toBe(true);
    expect(tickWeaponAttackFx(fx, 0.1, 10, 20)).toBe(false);
  });

  it('pickaxe fx lasts longer than knife', () => {
    expect(getAttackFxDuration('pickaxe')).toBeGreaterThan(getAttackFxDuration('knife'));
  });
});
