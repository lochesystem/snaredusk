import { describe, expect, it } from 'vitest';
import { defaultGameState } from '../src/types.ts';
import { generateDungeon } from '../src/world/dungeonGenerator.ts';
import {
  isBiomeUnlocked,
  onBiomeBossChestOpened,
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

  it('derrotar chefe da floresta ainda não desbloqueia cristal', () => {
    const state = defaultGameState();
    onBiomeBossDefeated(state, 'floresta');
    expect(state.biomeBossDefeated.floresta).toBe(true);
    expect(isBiomeUnlocked(state, 'cristal')).toBe(false);
    expect(state.hasSporeKey).toBe(false);
  });

  it('abrir o baú épico da floresta entrega a chave e desbloqueia cristal', () => {
    const state = defaultGameState();
    onBiomeBossDefeated(state, 'floresta');
    expect(onBiomeBossChestOpened(state, 'floresta')).toBe('cristal');
    expect(isBiomeUnlocked(state, 'cristal')).toBe(true);
    expect(state.hasSporeKey).toBe(true);
    expect(state.bag.filter((entry) => entry?.kind === 'loot' && entry.id === 'chave_esporo'))
      .toHaveLength(1);
  });

  it('não concede chave nem desbloqueio sem derrotar o chefe', () => {
    const state = defaultGameState();
    expect(onBiomeBossChestOpened(state, 'floresta')).toBeNull();
    expect(state.hasSporeKey).toBe(false);
    expect(isBiomeUnlocked(state, 'cristal')).toBe(false);
  });

  it('abrir novamente o baú épico não duplica a chave', () => {
    const state = defaultGameState();
    onBiomeBossDefeated(state, 'floresta');
    onBiomeBossChestOpened(state, 'floresta');
    expect(onBiomeBossChestOpened(state, 'floresta')).toBeNull();
    expect(state.bag.filter((entry) => entry?.kind === 'loot' && entry.id === 'chave_esporo'))
      .toHaveLength(1);
  });

  it('permite selecionar bioma desbloqueado', () => {
    const state = defaultGameState();
    onBiomeBossDefeated(state, 'floresta');
    onBiomeBossChestOpened(state, 'floresta');
    expect(selectBiome(state, 'cristal')).toBe(true);
    expect(state.activeBiome).toBe('cristal');
  });

  it('derrotar chefe do cristal desbloqueia termal', () => {
    const state = defaultGameState();
    onBiomeBossDefeated(state, 'floresta');
    onBiomeBossChestOpened(state, 'floresta');
    onBiomeBossDefeated(state, 'cristal');
    expect(isBiomeUnlocked(state, 'termal')).toBe(false);
    expect(state.hasPrismaticKey).toBe(false);
    expect(onBiomeBossChestOpened(state, 'cristal')).toBe('termal');
    expect(state.biomeBossDefeated.cristal).toBe(true);
    expect(isBiomeUnlocked(state, 'termal')).toBe(true);
    expect(state.hasPrismaticKey).toBe(true);
    expect(selectBiome(state, 'termal')).toBe(true);
    expect(state.activeBiome).toBe('termal');
  });

  it('termal começa bloqueado', () => {
    const state = defaultGameState();
    expect(isBiomeUnlocked(state, 'termal')).toBe(false);
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

  it('usa criaturas e formações sólidas do bioma cristal', () => {
    const layout = generateDungeon(99, 'cristal');
    const species = new Set(layout.enemySpawns.filter((s) => !s.isBoss).map((s) => s.speciesId));
    for (const id of species) {
      expect(['prismarin', 'lumicascalho', 'eco_quartzo', 'gema_viva', 'refrator']).toContain(id);
    }
    expect(layout.obstacles.some((o) => o.kind === 'crystal')).toBe(true);
    expect(layout.obstacles.some((o) => o.kind === 'rock')).toBe(true);
    expect(layout.decor).toHaveLength(0);
  });

  it('gera chefe e decor do bioma termal', () => {
    const layout = generateDungeon(77, 'termal');
    expect(layout.biomeId).toBe('termal');
    expect(layout.enemySpawns.find((s) => s.isBoss)?.speciesId).toBe('salamandra_ancia');
    const species = new Set(layout.enemySpawns.filter((s) => !s.isBoss).map((s) => s.speciesId));
    for (const id of species) {
      expect(['salamandra', 'vaporoso', 'caranguejo_termal', 'lodo_vivo', 'fenix_bruma']).toContain(id);
    }
    expect(layout.decor.some((d) => d.kind === 'thermal')).toBe(true);
    expect(layout.decor.every((d) => d.kind === 'thermal')).toBe(true);
    expect(layout.obstacles.some((o) => o.kind === 'rock')).toBe(true);
  });

  it('gera cogumelos atravessáveis em grupos e pedras sólidas na floresta', () => {
    const layout = generateDungeon(123, 'floresta');
    expect(layout.decor.length).toBeGreaterThan(layout.rooms.length * 3);
    expect(layout.decor.every((d) => d.kind === 'mushroom')).toBe(true);
    expect(layout.obstacles.some((o) => o.kind === 'rock')).toBe(true);

    const nearbyPairs = layout.decor.filter((decor, index) =>
      layout.decor.slice(index + 1).some((other) =>
        Math.hypot(decor.x - other.x, decor.y - other.y) < 34)).length;
    expect(nearbyPairs).toBeGreaterThan(3);
  });

  it('cogumante aparece com taxa baixa na floresta', () => {
    let cogumante = 0;
    let total = 0;
    for (let seed = 0; seed < 200; seed++) {
      const layout = generateDungeon(seed, 'floresta');
      for (const spawn of layout.enemySpawns) {
        if (spawn.isBoss) continue;
        total++;
        if (spawn.speciesId === 'cogumante') cogumante++;
      }
    }
    expect(total).toBeGreaterThan(50);
    expect(cogumante / total).toBeLessThan(0.14);
  });
});
