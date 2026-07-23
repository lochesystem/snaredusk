import { describe, expect, it } from 'vitest';
import { planShopDay, runShopDay } from '../src/systems/shopDay.ts';
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

  it('prioritizes unique customers and never repeats one more than twice', () => {
    const state = defaultGameState();
    state.shopLevel = 5;
    state.shopShelves = Array.from({ length: 8 }, (_, slotIndex) => ({
      entry: { kind: 'loot' as const, id: `loot-${slotIndex}`, name: 'Gema', baseValue: 50, quantity: 1 },
      price: 45,
      slotIndex,
      isCage: false,
    }));
    state.shopCages = Array.from({ length: 2 }, (_, slotIndex) => ({
      entry: {
        kind: 'creature' as const,
        speciesId: `creature-${slotIndex}`,
        name: 'Criatura',
        baseValue: 50,
      },
      price: 45,
      slotIndex,
      isCage: true,
    }));

    const plans = planShopDay(state, () => 0);
    const ids = plans.map((plan) => plan.archetype.id);
    const counts = ids.reduce<Record<string, number>>((all, id) => {
      all[id] = (all[id] ?? 0) + 1;
      return all;
    }, {});

    expect(plans).toHaveLength(8);
    expect(new Set(ids.slice(0, 6))).toHaveLength(6);
    expect(Math.max(...Object.values(counts))).toBeLessThanOrEqual(2);
    expect(ids).toContain('crianca');
  });
});
