export type BiomeId = 'floresta' | 'cristal';

export type DecorKind = 'mushroom' | 'crystal';

export interface BiomeTheme {
  void: number;
  floor: number;
  wall: number;
  wallStroke: number;
  roomCeiling: number;
  rock: number;
  rockHighlight: number;
}

export interface BiomeDef {
  id: BiomeId;
  name: string;
  shortName: string;
  description: string;
  bossSpeciesId: string;
  bossPortalHint: string;
  enemySpecies: readonly string[];
  chestLoot: readonly string[];
  decorKind: DecorKind;
  theme: BiomeTheme;
  /** Bioma que precisa ter o chefe derrotado para desbloquear. */
  unlockAfterBossIn: BiomeId | null;
}

export const BIOMES: Record<BiomeId, BiomeDef> = {
  floresta: {
    id: 'floresta',
    name: 'Floresta Fúngica',
    shortName: 'Floresta',
    description: 'Cogumelos bioluminescentes e esporos adormecidos.',
    bossSpeciesId: 'rei_esporas',
    bossPortalHint: 'Derrote o Rei das Esporas para ativar o portal',
    enemySpecies: ['esporo_dorminhoco', 'lumimorcego', 'carapaca_musgo'],
    chestLoot: ['cogumelo_comum', 'fibra_musgo', 'esporo_brilhante'],
    decorKind: 'mushroom',
    theme: {
      void: 0x120f1a,
      floor: 0x2a4a2a,
      wall: 0x1a2e1a,
      wallStroke: 0x3d5c3a,
      roomCeiling: 0x1a2e1a,
      rock: 0x4a4a5a,
      rockHighlight: 0x6a6a7a,
    },
    unlockAfterBossIn: null,
  },
  cristal: {
    id: 'cristal',
    name: 'Caverna de Cristal',
    shortName: 'Cristal',
    description: 'Reflexos prismáticos e criaturas de luz.',
    bossSpeciesId: 'matriarca_prismatica',
    bossPortalHint: 'Derrote a Matriarca Prismática para ativar o portal',
    enemySpecies: ['prismarin', 'lumicascalho', 'eco_quartzo'],
    chestLoot: ['fragmento_cristal', 'quartzo_bruto', 'poeira_prismatica'],
    decorKind: 'crystal',
    theme: {
      void: 0x0a0c18,
      floor: 0x1e2a4a,
      wall: 0x141c32,
      wallStroke: 0x4a6a9a,
      roomCeiling: 0x141c32,
      rock: 0x3a4a6a,
      rockHighlight: 0x7ab8e8,
    },
    unlockAfterBossIn: 'floresta',
  },
};

export const BIOME_ORDER: BiomeId[] = ['floresta', 'cristal'];

export function getBiomeDef(id: BiomeId): BiomeDef {
  return BIOMES[id];
}

export function listBiomes(): BiomeDef[] {
  return BIOME_ORDER.map((id) => BIOMES[id]);
}
