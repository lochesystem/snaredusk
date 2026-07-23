import { describe, expect, it } from 'vitest';
import { findMeleeHits } from '../src/systems/weaponAttack.ts';
import {
  createWeaponAttackFx,
  isTargetInMeleeSweep,
  tickWeaponAttackFx,
} from '../src/world/weaponAttackFx.ts';
import { WEAPONS } from '../src/data/weapons.ts';

describe('weaponAttack', () => {
  it('knife hits targets along the slash sweep in front', () => {
    const weapon = WEAPONS.faca_enferrujada!;
    const hits = findMeleeHits(0, 0, 0, weapon, [
      { id: 'a', x: 28, y: 2, def: 0, dead: false, fled: false, captureLocked: false },
      { id: 'b', x: -20, y: 0, def: 0, dead: false, fled: false, captureLocked: false },
    ]);
    expect(hits.map((h) => h.id)).toContain('a');
    expect(hits.map((h) => h.id)).not.toContain('b');
  });

  it('knife reaches along blade length using enemy body radius', () => {
    expect(isTargetInMeleeSweep(0, -4, 0, 36, 1, 'knife', 34, 10)).toBe(true);
    expect(isTargetInMeleeSweep(0, -4, 0, -20, 0, 'knife', 34, 10)).toBe(false);
  });

  it('hits the visible edge of a large crystal enemy', () => {
    const weapon = WEAPONS.faca_enferrujada!;
    const hits = findMeleeHits(0, 0, 0, weapon, [
      {
        id: 'prismarin',
        x: 55,
        y: 0,
        def: 0,
        dead: false,
        fled: false,
        captureLocked: false,
        hitRadius: 25,
      },
    ]);
    expect(hits.map((hit) => hit.id)).toContain('prismarin');
  });

  it('knife misses targets behind the player', () => {
    expect(isTargetInMeleeSweep(0, -4, 0, -8, -22, 'knife', 34, 10)).toBe(false);
  });

  it('knife hits target above when aiming up', () => {
    const aim = -Math.PI / 2;
    expect(isTargetInMeleeSweep(0, -4, aim, 4, -28, 'knife', 34, 10)).toBe(true);
    expect(isTargetInMeleeSweep(0, -4, aim, 28, 2, 'knife', 34, 10)).toBe(false);
  });

  it('knife animation ends pointing at aim', () => {
    const aim = -Math.PI / 2;
    const fx = createWeaponAttackFx('knife', aim, 34, 0xffffff);
    let alive = true;
    while (alive) alive = tickWeaponAttackFx(fx, 0.02, 0, 0);
    expect(fx.root.rotation).toBeCloseTo(aim, 2);
    expect(fx.blades![0]!.rotation).toBeCloseTo(0, 2);
  });

  it('knife hits multiple overlapping targets with unique ids', () => {
    const weapon = WEAPONS.faca_enferrujada!;
    const hits = findMeleeHits(0, 0, 0, weapon, [
      { id: 'enemy-0', x: 28, y: 2, def: 0, dead: false, fled: false, captureLocked: false },
      { id: 'enemy-1', x: 28, y: 2, def: 0, dead: false, fled: false, captureLocked: false },
    ]);
    expect(hits.map((h) => h.id).sort()).toEqual(['enemy-0', 'enemy-1']);
  });

  it('knife ignores dead duplicate-id targets when one is already defeated', () => {
    const weapon = WEAPONS.faca_enferrujada!;
    const hits = findMeleeHits(0, 0, 0, weapon, [
      { id: 'dup', x: 28, y: 2, def: 0, dead: true, fled: false, captureLocked: false },
      { id: 'dup', x: 28, y: 2, def: 0, dead: false, fled: false, captureLocked: false },
    ]);
    expect(hits).toHaveLength(1);
    expect(hits[0]!.id).toBe('dup');
  });

  it('pickaxe reaches farther with head padding', () => {
    const weapon = WEAPONS.picareta_combate!;
    const hits = findMeleeHits(0, 0, 0, weapon, [
      { id: 'a', x: 38, y: 4, def: 0, dead: false, fled: false, captureLocked: false },
    ]);
    expect(hits.map((h) => h.id)).toContain('a');
  });
});
