export type BiomeId = 'floresta' | 'cristal' | 'termal';

export type DecorKind = 'mushroom' | 'crystal' | 'thermal';

/** Mecânica ambiental do bioma na masmorra. */
export type BiomeHazardKind = 'spores' | 'slippery' | 'poison';

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
  hazardKind: BiomeHazardKind;
  theme: BiomeTheme;
  /** Bioma que precisa ter o chefe derrotado para desbloquear. */
  unlockAfterBossIn: BiomeId | null;
  /** Texto quando o bioma ainda está bloqueado. */
  lockHint: string;
}

export const BIOMES: Record<BiomeId, BiomeDef> = {
  floresta: {
    id: 'floresta',
    name: 'Floresta Fúngica',
    shortName: 'Floresta',
    description: 'Cogumelos bioluminescentes e esporos adormecidos.',
    bossSpeciesId: 'rei_esporas',
    bossPortalHint: 'Abra o baú épico do Rei das Esporas para ativar o portal',
    enemySpecies: [
      'esporo_dorminhoco',
      'lumimorcego',
      'carapaca_musgo',
      'cogumante',
      'ferrao_fungico',
    ],
    chestLoot: [
      'cogumelo_comum',
      'fibra_musgo',
      'esporo_brilhante',
      'madeira_petrificada',
      'chifre_fungico',
    ],
    decorKind: 'mushroom',
    hazardKind: 'spores',
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
    lockHint: '',
  },
  cristal: {
    id: 'cristal',
    name: 'Caverna de Cristal',
    shortName: 'Cristal',
    description: 'Reflexos prismáticos e criaturas de luz.',
    bossSpeciesId: 'matriarca_prismatica',
    bossPortalHint: 'Abra o baú épico da Matriarca para ativar o portal',
    enemySpecies: ['prismarin', 'lumicascalho', 'eco_quartzo', 'gema_viva', 'refrator'],
    chestLoot: [
      'fragmento_cristal',
      'quartzo_bruto',
      'poeira_prismatica',
      'coracao_geodo',
      'prisma_refrator',
    ],
    decorKind: 'crystal',
    hazardKind: 'slippery',
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
    lockHint: 'Derrote o Rei das Esporas na Floresta',
  },
  termal: {
    id: 'termal',
    name: 'Pântano Termal',
    shortName: 'Termal',
    description: 'Vapor quente, poças fumegantes e criaturas de fogo.',
    bossSpeciesId: 'salamandra_ancia',
    bossPortalHint: 'Abra o baú épico da Salamandra para ativar o portal',
    enemySpecies: ['salamandra', 'vaporoso', 'caranguejo_termal', 'lodo_vivo', 'fenix_bruma'],
    chestLoot: [
      'escama_termal',
      'concha_vapor',
      'essencia_termal',
      'lodo_termal',
      'pluma_bruma',
    ],
    decorKind: 'thermal',
    hazardKind: 'poison',
    theme: {
      void: 0x140c0a,
      floor: 0x3a2a1a,
      wall: 0x2a1e14,
      wallStroke: 0x6a4a30,
      roomCeiling: 0x2a1e14,
      rock: 0x5a4030,
      rockHighlight: 0x8a6040,
    },
    unlockAfterBossIn: 'cristal',
    lockHint: 'Derrote a Matriarca Prismática no Cristal',
  },
};

export const BIOME_ORDER: BiomeId[] = ['floresta', 'cristal', 'termal'];

export function getBiomeDef(id: BiomeId): BiomeDef {
  return BIOMES[id];
}

export function listBiomes(): BiomeDef[] {
  return BIOME_ORDER.map((id) => BIOMES[id]);
}
