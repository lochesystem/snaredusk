import { describe, expect, it } from 'vitest';
import { defaultGameState } from '../src/types.ts';
import { canCraft, craftWeapon, equipWeapon, formatCraftMissing, getCraftStatus } from '../src/systems/craft.ts';

describe('craft', () => {
  it('can craft picareta with materials', () => {
    const state = defaultGameState();
    state.gold = 50;
    state.bag[0] = { kind: 'loot', id: 'fibra_musgo', name: 'Fibra', baseValue: 20, quantity: 3 };
    expect(canCraft(state, 'craft_picareta')).toBe(true);
    expect(craftWeapon(state, 'craft_picareta')).toBe(true);
    expect(state.ownedWeapons).toContain('picareta_combate');
    expect(state.gold).toBe(10);
  });

  it('cannot craft twice', () => {
    const state = defaultGameState();
    state.gold = 50;
    state.bag[0] = { kind: 'loot', id: 'fibra_musgo', name: 'Fibra', baseValue: 20, quantity: 6 };
    craftWeapon(state, 'craft_picareta');
    expect(canCraft(state, 'craft_picareta')).toBe(false);
  });

  it('equips owned weapon', () => {
    const state = defaultGameState();
    state.ownedWeapons = ['faca_enferrujada', 'picareta_combate'];
    expect(equipWeapon(state, 'picareta_combate')).toBe(true);
    expect(state.equippedWeaponId).toBe('picareta_combate');
  });

  it('reports missing materials', () => {
    const state = defaultGameState();
    state.gold = 10;
    const status = getCraftStatus(state, 'craft_picareta');
    expect(status.canCraft).toBe(false);
    expect(status.missing.some((m) => m.includes('ouro'))).toBe(true);
    expect(formatCraftMissing(status.missing)).toMatch(/^Falta:/);
  });
});
