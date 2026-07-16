import { describe, expect, it } from 'vitest';
import { defaultGameState } from '../src/types.ts';
import { buyOrbPack, canBuyOrbPack, orbPackCost } from '../src/systems/orbShop.ts';

describe('orbShop', () => {
  it('buys a single orb for 25 gold', () => {
    const state = defaultGameState();
    state.gold = 50;
    state.orbs = 1;

    expect(buyOrbPack(state, 'single')).toBe(true);
    expect(state.gold).toBe(25);
    expect(state.orbs).toBe(2);
  });

  it('buys a bundle of 3 orbs for 70 gold', () => {
    const state = defaultGameState();
    state.gold = 100;
    state.orbs = 0;

    expect(buyOrbPack(state, 'bundle')).toBe(true);
    expect(state.gold).toBe(30);
    expect(state.orbs).toBe(3);
  });

  it('rejects purchase without enough gold', () => {
    const state = defaultGameState();
    state.gold = 10;

    expect(canBuyOrbPack(state, 'single')).toBe(false);
    expect(buyOrbPack(state, 'single')).toBe(false);
    expect(state.gold).toBe(10);
  });

  it('bundle is cheaper per orb than singles', () => {
    expect(orbPackCost('bundle') / 3).toBeLessThan(orbPackCost('single'));
  });
});
