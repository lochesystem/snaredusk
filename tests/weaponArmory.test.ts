import { describe, expect, it } from 'vitest';
import { defaultGameState } from '../src/types.ts';
import {
  acquireWeapon,
  assignWeaponToHotbar,
  depositWeaponToChest,
  findWeaponLocation,
  normalizeWeaponArmory,
} from '../src/systems/weaponArmory.ts';
import { findChestById } from '../src/systems/baseChest.ts';
import { equipWeapon } from '../src/systems/craft.ts';
import { selectHotbarSlot } from '../src/systems/weaponHotbar.ts';

describe('weaponArmory', () => {
  it('puts third weapon in stash when hotbar is full', () => {
    const state = defaultGameState();
    state.ownedWeapons = ['faca_enferrujada', 'picareta_combate'];
    state.weaponHotbar = ['faca_enferrujada', 'picareta_combate'];
    state.weaponStash = [];

    acquireWeapon(state, 'lanca_esporo');

    expect(state.weaponStash).toContain('lanca_esporo');
    expect(state.weaponHotbar).not.toContain('lanca_esporo');
    expect(findWeaponLocation(state, 'lanca_esporo')?.kind).toBe('stash');
  });

  it('assigns stashed weapon to hotbar slot and allows equip in dungeon', () => {
    const state = defaultGameState();
    state.ownedWeapons = ['faca_enferrujada', 'picareta_combate', 'lanca_esporo'];
    state.weaponHotbar = ['faca_enferrujada', 'picareta_combate'];
    state.weaponStash = ['lanca_esporo'];

    expect(assignWeaponToHotbar(state, 'lanca_esporo', 1)).toBe(true);
    expect(state.weaponHotbar[1]).toBe('lanca_esporo');
    expect(state.weaponStash).not.toContain('lanca_esporo');
    expect(state.weaponStash).toContain('picareta_combate');

    equipWeapon(state, 'lanca_esporo');
    expect(state.equippedWeaponId).toBe('lanca_esporo');
    expect(selectHotbarSlot(state, 1)).toBe(true);
  });

  it('migrates unassigned owned weapons to stash on normalize', () => {
    const state = defaultGameState();
    state.ownedWeapons = ['faca_enferrujada', 'picareta_combate', 'lanca_esporo'];
    state.weaponHotbar = ['faca_enferrujada', 'picareta_combate'];
    state.weaponStash = [];

    normalizeWeaponArmory(state);

    expect(findWeaponLocation(state, 'lanca_esporo')?.kind).toBe('stash');
  });

  it('stores and withdraws weapons from chest', () => {
    const state = defaultGameState();
    state.ownedWeapons = ['faca_enferrujada', 'picareta_combate', 'lanca_esporo'];
    state.weaponHotbar = ['faca_enferrujada', 'picareta_combate'];
    state.weaponStash = ['lanca_esporo'];
    const chest = findChestById(state.base, 'chest_default')!;

    expect(depositWeaponToChest(state, chest, 'lanca_esporo')).toBe(true);
    expect(findWeaponLocation(state, 'lanca_esporo')?.kind).toBe('chest');
    expect(state.weaponStash).not.toContain('lanca_esporo');
  });
});
