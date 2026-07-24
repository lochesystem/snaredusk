import { describe, expect, it } from 'vitest';
import { defaultGameState } from '../src/types.ts';
import { discardBagSlot } from '../src/systems/inventory.ts';
import { addToBag, bagCount, deserializeState, serializeState } from '../src/systems/saveManager.ts';
import {
  createChestState,
  transferLootToBag,
  transferLootToChest,
} from '../src/systems/baseChest.ts';

describe('inventory', () => {
  it('descarta loot inteiro', () => {
    const state = defaultGameState();
    state.bag[0] = {
      kind: 'loot',
      id: 'cogumelo_comum',
      name: 'Cogumelo comum',
      baseValue: 15,
      quantity: 3,
    };
    const result = discardBagSlot(state, 0, 'all');
    expect(result.ok).toBe(true);
    expect(state.bag[0]).toBeNull();
    expect(bagCount(state)).toBe(0);
  });

  it('descarta uma unidade de loot empilhado', () => {
    const state = defaultGameState();
    state.bag[0] = {
      kind: 'loot',
      id: 'cogumelo_comum',
      name: 'Cogumelo comum',
      baseValue: 15,
      quantity: 3,
    };
    discardBagSlot(state, 0, 'one');
    expect(state.bag[0]?.kind).toBe('loot');
    if (state.bag[0]?.kind === 'loot') {
      expect(state.bag[0].quantity).toBe(2);
    }
  });

  it('descarta criatura', () => {
    const state = defaultGameState();
    state.bag[1] = {
      kind: 'creature',
      speciesId: 'lumimorcego',
      name: 'Lumimorcego',
      baseValue: 65,
    };
    discardBagSlot(state, 1, 'all');
    expect(state.bag[1]).toBeNull();
  });

  it('empilha loot igual ao coletar mesmo sem slot vazio', () => {
    const state = defaultGameState();
    state.bag = state.bag.map((_, index) => ({
      kind: 'creature',
      speciesId: 'lumimorcego',
      name: `Lumimorcego ${index}`,
      baseValue: 65,
    }));
    state.bag[0] = {
      kind: 'loot',
      id: 'cogumelo_comum',
      name: 'Cogumelo comum',
      baseValue: 15,
      quantity: 2,
    };

    expect(addToBag(state, {
      kind: 'loot',
      id: 'cogumelo_comum',
      name: 'Cogumelo comum',
      baseValue: 15,
      quantity: 3,
    })).toBe(true);
    expect(state.bag[0]).toMatchObject({ id: 'cogumelo_comum', quantity: 5 });
    expect(bagCount(state)).toBe(12);
  });

  it('consolida pilhas duplicadas de saves antigos', () => {
    const state = defaultGameState();
    state.bag[0] = {
      kind: 'loot',
      id: 'fibra_musgo',
      name: 'Fibra de musgo',
      baseValue: 12,
      quantity: 2,
    };
    state.bag[5] = {
      kind: 'loot',
      id: 'fibra_musgo',
      name: 'Fibra de musgo',
      baseValue: 12,
      quantity: 4,
    };

    const loaded = deserializeState(serializeState(state));
    expect(loaded?.bag[0]).toMatchObject({ id: 'fibra_musgo', quantity: 6 });
    expect(loaded?.bag.filter(Boolean)).toHaveLength(1);
  });

  it('preserva slots extras declarados por saves especiais de teste', () => {
    const state = defaultGameState();
    state.bag = Array.from({ length: 18 }, (_, index) => ({
      kind: 'creature' as const,
      speciesId: `criatura_${index}`,
      name: `Criatura ${index}`,
      baseValue: 10 + index,
    }));

    const loaded = deserializeState(serializeState(state));
    expect(loaded?.bag).toHaveLength(18);
    expect(loaded?.bag.filter(Boolean)).toHaveLength(18);
  });

  it('preserva o capuz equipado e migra saves antigos para o original', () => {
    const state = defaultGameState();
    state.ownedHoods = ['cacador', 'prismatico'];
    state.equippedHoodId = 'prismatico';
    const loaded = deserializeState(serializeState(state));
    expect(loaded?.ownedHoods).toEqual(['cacador', 'prismatico']);
    expect(loaded?.equippedHoodId).toBe('prismatico');

    const legacy = JSON.parse(serializeState(state));
    delete legacy.state.ownedHoods;
    delete legacy.state.equippedHoodId;
    const migrated = deserializeState(JSON.stringify(legacy));
    expect(migrated?.ownedHoods).toEqual(['cacador']);
    expect(migrated?.equippedHoodId).toBe('cacador');
  });

  it('move uma quantidade escolhida entre bolsa e baú e mescla pilhas', () => {
    const state = defaultGameState();
    const chest = createChestState('test', 0, 0);
    state.bag[0] = {
      kind: 'loot',
      id: 'esporo_brilhante',
      name: 'Esporo brilhante',
      baseValue: 18,
      quantity: 8,
    };

    expect(transferLootToChest(state, chest, 0, 3)).toBe(true);
    expect(state.bag[0]).toMatchObject({ quantity: 5 });
    expect(chest.slots[0]).toMatchObject({ quantity: 3 });

    expect(transferLootToBag(state, chest, 0, 2)).toBe(true);
    expect(state.bag[0]).toMatchObject({ quantity: 7 });
    expect(chest.slots[0]).toMatchObject({ quantity: 1 });
  });
});
