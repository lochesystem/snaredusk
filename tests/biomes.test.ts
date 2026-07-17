import { describe, expect, it } from 'vitest';
import { defaultGameState } from '../src/types.ts';
import { generateDungeon } from '../src/world/dungeonGenerator.ts';
import {
  isBiomeUnlocked,
  onBiomeBossDefeated,
  selectBiome,
  syncBiomeUnlocks,
} from '../src/systems/biomeProgress.ts';

describe('biomes', () => {
  it('cristal começa bloqueado', () => {
    const state = defaultGameState();
    expect(isBiomeUnlocked(state, 'floresta')).toBe(true);
    expect(isBiomeUnlocked(state, 'cristal')).toBe(false);
  });

  it('derrotar chefe da floresta desbloqueia cristal', () => {
    const state = defaultGameState();
    onBiomeBossDefeated(state, 'floresta');
    expect(state.biomeBossDefeated.floresta).toBe(true);
    expect(isBiomeUnlocked(state, 'cristal')).toBe(true);
    expect(state.hasSporeKey).toBe(true);
  });

  it('permite selecionar bioma desbloqueado', () => {
    const state = defaultGameState();
    onBiomeBossDefeated(state, 'floresta');
    expect(selectBiome(state, 'cristal')).toBe(true);
    expect(state.activeBiome).toBe('cristal');
  });

  it('migra save antigo com dungeonCleared', () => {
    const state = defaultGameState();
    state.dungeonCleared = true;
    syncBiomeUnlocks(state);
    expect(isBiomeUnlocked(state, 'cristal')).toBe(true);
  });
});

describe('dungeonGenerator biomes', () => {
  it('gera chefe correto por bioma', () => {
    const floresta = generateDungeon(42, 'floresta');
    const cristal = generateDungeon(42, 'cristal');
    expect(floresta.biomeId).toBe('floresta');
    expect(cristal.biomeId).toBe('cristal');
    expect(floresta.enemySpawns.find((s) => s.isBoss)?.speciesId).toBe('rei_esporas');
    expect(cristal.enemySpawns.find((s) => s.isBoss)?.speciesId).toBe('matriarca_prismatica');
  });

  it('usa criaturas e decor do bioma cristal', () => {
    const layout = generateDungeon(99, 'cristal');
    const species = new Set(layout.enemySpawns.filter((s) => !s.isBoss).map((s) => s.speciesId));
    for (const id of species) {
      expect(['prismarin', 'lumicascalho', 'eco_quartzo']).toContain(id);
    }
    expect(layout.decor.every((d) => d.kind === 'crystal')).toBe(true);
  });
});
