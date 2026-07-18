import type { BiomeId } from './biomes.ts';
import type { SpecialItem } from '../types.ts';

export const BOSS_GATE_KEY_IDS: Record<BiomeId, string> = {
  floresta: 'chave_arena_floresta',
  cristal: 'chave_arena_cristal',
  termal: 'chave_arena_termal',
};

export function createBossGateKey(biomeId: BiomeId): SpecialItem {
  const names: Record<BiomeId, string> = {
    floresta: 'Chave da Arena — Floresta',
    cristal: 'Chave da Arena — Cristal',
    termal: 'Chave da Arena — Termal',
  };
  return {
    kind: 'special',
    id: BOSS_GATE_KEY_IDS[biomeId],
    name: names[biomeId],
    description: 'Abre o portão do chefe nesta expedição. Some ao voltar à base.',
  };
}
