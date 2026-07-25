import type { BiomeId } from '../data/biomes.ts';
import { BIOMES, listBiomes } from '../data/biomes.ts';
import { LOOT_TABLE } from '../data/items.ts';
import type { GameState, LootItem } from '../types.ts';
import { addToBag } from './saveManager.ts';

export function isBiomeUnlocked(state: GameState, biomeId: BiomeId): boolean {
  return state.unlockedBiomes.includes(biomeId);
}

export function unlockBiome(state: GameState, biomeId: BiomeId): void {
  if (!state.unlockedBiomes.includes(biomeId)) {
    state.unlockedBiomes.push(biomeId);
  }
}

/** Chefe do bioma anterior derrotado? */
export function canUnlockBiome(state: GameState, biomeId: BiomeId): boolean {
  const def = BIOMES[biomeId];
  if (!def.unlockAfterBossIn) return true;
  if (def.unlockAfterBossIn === 'floresta') return state.hasSporeKey;
  if (def.unlockAfterBossIn === 'cristal') return state.hasPrismaticKey;
  return state.biomeBossDefeated[def.unlockAfterBossIn] === true;
}

export function syncBiomeUnlocks(state: GameState): void {
  if (!state.unlockedBiomes.includes('floresta')) {
    state.unlockedBiomes = ['floresta', ...state.unlockedBiomes.filter((b) => b !== 'floresta')];
  }
  if (state.dungeonCleared) {
    state.biomeBossDefeated.floresta = true;
    // Compatibilidade com saves anteriores, nos quais dungeonCleared já
    // significava que a recompensa final da Floresta havia sido coletada.
    grantKey(state, 'chave_esporo', 'hasSporeKey');
  }
  for (const biome of listBiomes()) {
    if (canUnlockBiome(state, biome.id)) {
      unlockBiome(state, biome.id);
    }
  }
  if (state.activeBiome && !isBiomeUnlocked(state, state.activeBiome)) {
    state.activeBiome = 'floresta';
  }
}

export function onBiomeBossDefeated(state: GameState, biomeId: BiomeId): void {
  state.biomeBossDefeated[biomeId] = true;
}

/**
 * Concede a progressão somente quando o baú épico do chefe é aberto.
 * Retorna o bioma recém-desbloqueado para feedback da interface.
 */
export function onBiomeBossChestOpened(
  state: GameState,
  biomeId: BiomeId,
): BiomeId | null {
  if (state.biomeBossDefeated[biomeId] !== true) return null;

  const unlockedBefore = new Set(state.unlockedBiomes);
  if (biomeId === 'floresta') {
    state.dungeonCleared = true;
    grantKey(state, 'chave_esporo', 'hasSporeKey');
  } else if (biomeId === 'cristal') {
    grantKey(state, 'chave_prismatica', 'hasPrismaticKey');
  }
  syncBiomeUnlocks(state);

  return state.unlockedBiomes.find((id) => !unlockedBefore.has(id)) ?? null;
}

function grantKey(
  state: GameState,
  lootId: keyof typeof LOOT_TABLE,
  flag: 'hasSporeKey' | 'hasPrismaticKey',
): boolean {
  if (state[flag]) return false;
  const def = LOOT_TABLE[lootId];
  if (!def) return false;
  const key: LootItem = {
    kind: 'loot',
    id: def.id,
    name: def.name,
    baseValue: def.baseValue,
    quantity: 1,
  };
  addToBag(state, key);
  state[flag] = true;
  return true;
}

export function getBiomeUnlockToast(unlockedBiomeId: BiomeId): string | null {
  switch (unlockedBiomeId) {
    case 'cristal':
      return 'Chave de Esporo — Caverna de Cristal desbloqueada!';
    case 'termal':
      return 'Chave Prismática — Pântano Termal desbloqueado!';
    default:
      return null;
  }
}

export function selectBiome(state: GameState, biomeId: BiomeId): boolean {
  if (!isBiomeUnlocked(state, biomeId)) return false;
  state.activeBiome = biomeId;
  return true;
}
