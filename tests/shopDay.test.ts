import { describe, expect, it } from 'vitest';
import { runShopDay } from '../src/systems/shopDay.ts';
import { defaultGameState } from '../src/types.ts';

describe('shopDay', () => {
  it('returns empty day when no stock', () => {
    const state = defaultGameState();
    const result = runShopDay(state);
    expect(result.goldEarned).toBe(0);
    expect(result.logs[0]?.text).toContain('Nenhum item');
  });

  it('can sell stocked items with seeded rng', () => {
    const state = defaultGameState();
    state.shopShelves[0] = {
      entry: { kind: 'loot', id: 'cogumelo_comum', name: 'Cogumelo', baseValue: 15, quantity: 2 },
      price: 14,
      slotIndex: 0,
      isCage: false,
    };
    let seed = 0;
    const rng = () => {
      seed = (seed + 0.17) % 1;
      return seed;
    };
    const result = runShopDay(state, rng);
    expect(result.logs.length).toBeGreaterThan(0);
  });
});
