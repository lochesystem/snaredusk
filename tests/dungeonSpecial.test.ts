import { describe, expect, it } from 'vitest';
import { defaultGameState } from '../src/types.ts';
import {
  clearDungeonSpecial,
  countRemainingPhaseEnemies,
  grantBossGateKey,
  hasBossGateKey,
  isPhaseCleared,
} from '../src/systems/dungeonSpecial.ts';

describe('dungeonSpecial', () => {
  it('counts remaining phase enemies excluding boss and minions', () => {
    const enemies = [
      { dead: false, fled: false, isBoss: false, isMinion: false },
      { dead: true, fled: false, isBoss: false, isMinion: false },
      { dead: false, fled: false, isBoss: true, isMinion: false },
      { dead: false, fled: false, isBoss: false, isMinion: true },
    ];
    expect(countRemainingPhaseEnemies(enemies)).toBe(1);
    expect(isPhaseCleared(enemies)).toBe(false);
  });

  it('grants boss gate key per biome', () => {
    const state = defaultGameState();
    expect(grantBossGateKey(state, 'floresta')).toBe(true);
    expect(hasBossGateKey(state, 'floresta')).toBe(true);
    expect(grantBossGateKey(state, 'floresta')).toBe(false);
  });

  it('clears special items on return to base flow', () => {
    const state = defaultGameState();
    grantBossGateKey(state, 'cristal');
    clearDungeonSpecial(state);
    expect(hasBossGateKey(state, 'cristal')).toBe(false);
  });
});
