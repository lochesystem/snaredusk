import { describe, expect, it } from 'vitest';
import { defaultGameState } from '../src/types.ts';
import { discardBagSlot } from '../src/systems/inventory.ts';
import { bagCount } from '../src/systems/saveManager.ts';

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
});
