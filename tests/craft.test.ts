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

  it('crafts a reusable base construction unit', () => {
    const state = defaultGameState();
    state.gold = 30;
    state.bag[0] = {
      kind: 'loot',
      id: 'madeira_petrificada',
      name: 'Madeira petrificada',
      baseValue: 28,
      quantity: 3,
    };
    state.bag[1] = {
      kind: 'loot',
      id: 'fibra_musgo',
      name: 'Fibra de musgo',
      baseValue: 20,
      quantity: 1,
    };

    expect(craftWeapon(state, 'craft_bau_madeira')).toBe(true);
    expect(state.craftedStations.chest_wood).toBe(1);
    expect(canCraft(state, 'craft_bau_madeira')).toBe(false);
  });

  it('crafts loot and stacks it in the bag', () => {
    const state = defaultGameState();
    state.gold = 20;
    state.bag[0] = {
      kind: 'loot',
      id: 'cogumelo_comum',
      name: 'Cogumelo comum',
      baseValue: 15,
      quantity: 3,
    };
    state.bag[1] = {
      kind: 'loot',
      id: 'fibra_musgo',
      name: 'Fibra de musgo',
      baseValue: 20,
      quantity: 1,
    };

    expect(craftWeapon(state, 'craft_concentrar_esporos')).toBe(true);
    const crafted = state.bag.find((entry) => entry?.kind === 'loot' && entry.id === 'esporo_brilhante');
    expect(crafted?.kind === 'loot' ? crafted.quantity : 0).toBe(1);
  });

  it('crafts capture orbs', () => {
    const state = defaultGameState();
    state.gold = 30;
    state.bag[0] = {
      kind: 'loot',
      id: 'fibra_musgo',
      name: 'Fibra de musgo',
      baseValue: 20,
      quantity: 2,
    };
    state.bag[1] = {
      kind: 'loot',
      id: 'po_bioluminescente',
      name: 'Pó bioluminescente',
      baseValue: 25,
      quantity: 1,
    };
    const before = state.orbs;

    expect(craftWeapon(state, 'craft_orbe_vinculo')).toBe(true);
    expect(state.orbs).toBe(before + 1);
  });
});
