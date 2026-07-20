import { describe, expect, it } from 'vitest';
import {
  formatReputationSummary,
  getReputationLevel,
  getReputationProgress,
  getReputationShelfBonus,
  getShopShelfCapacity,
  recordShopGold,
  REPUTATION_LEVELS,
} from '../src/systems/reputation.ts';
import { defaultGameState } from '../src/types.ts';
import { rollCustomerArchetype } from '../src/systems/customers.ts';

describe('reputation', () => {
  it('starts at level 1 with zero gold sold', () => {
    expect(getReputationLevel(0)).toBe(1);
    expect(getReputationShelfBonus(0)).toBe(0);
  });

  it('reaches level 2 at 500 gold sold', () => {
    expect(getReputationLevel(499)).toBe(1);
    expect(getReputationLevel(500)).toBe(2);
    expect(getReputationShelfBonus(500)).toBe(1);
  });

  it('reaches level 3 at 2000 gold sold', () => {
    expect(getReputationLevel(1999)).toBe(2);
    expect(getReputationLevel(2000)).toBe(3);
  });

  it('tracks progress toward next level', () => {
    const p = getReputationProgress(750);
    expect(p.level).toBe(2);
    expect(p.nextGoldRequired).toBe(2000);
    expect(p.progressToNext).toBeCloseTo(0.167, 2);
  });

  it('recordShopGold levels up and adds shelf slot', () => {
    const state = defaultGameState();
    const baseShelves = state.shopShelves.length;
    const levelUp = recordShopGold(state, 500);
    expect(levelUp?.level).toBe(2);
    expect(state.shopGoldSold).toBe(500);
    expect(state.shopShelves.length).toBe(baseShelves + 1);
  });

  it('getShopShelfCapacity includes reputation bonus', () => {
    const state = defaultGameState();
    expect(getShopShelfCapacity(state)).toBe(6);
    state.shopGoldSold = 600;
    expect(getShopShelfCapacity(state)).toBe(7);
  });

  it('formatReputationSummary shows progress', () => {
    expect(formatReputationSummary(100)).toContain('100/500');
    expect(formatReputationSummary(2500)).toContain('máx');
  });

  it('level 3 boosts colecionador spawn weight', () => {
    let colecionadorHits = 0;
    for (let i = 0; i < 200; i++) {
      const a = rollCustomerArchetype(() => (i * 0.013) % 1, 3);
      if (a.id === 'colecionador') colecionadorHits++;
    }
    let baseline = 0;
    for (let i = 0; i < 200; i++) {
      const a = rollCustomerArchetype(() => (i * 0.013) % 1, 1);
      if (a.id === 'colecionador') baseline++;
    }
    expect(colecionadorHits).toBeGreaterThan(baseline);
  });

  it('defines three reputation levels', () => {
    expect(REPUTATION_LEVELS).toHaveLength(3);
  });
});
