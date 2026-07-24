import type { StationId } from './baseStations.ts';

export interface RecipeIngredient {
  lootId: string;
  quantity: number;
}

export type CraftOutput =
  | { kind: 'weapon'; weaponId: string }
  | { kind: 'station'; stationId: StationId; quantity?: number }
  | { kind: 'loot'; lootId: string; quantity: number }
  | { kind: 'orbs'; quantity: number };

export interface CraftRecipe {
  id: string;
  name: string;
  goldCost: number;
  ingredients: RecipeIngredient[];
  output: CraftOutput;
}

export const CRAFT_RECIPES: CraftRecipe[] = [
  {
    id: 'craft_picareta',
    name: 'Picareta de combate',
    goldCost: 40,
    ingredients: [{ lootId: 'fibra_musgo', quantity: 3 }],
    output: { kind: 'weapon', weaponId: 'picareta_combate' },
  },
  {
    id: 'craft_lanca_esporo',
    name: 'Lança esporo',
    goldCost: 0,
    ingredients: [
      { lootId: 'esporo_brilhante', quantity: 2 },
      { lootId: 'cogumelo_comum', quantity: 5 },
    ],
    output: { kind: 'weapon', weaponId: 'lanca_esporo' },
  },
  {
    id: 'craft_bancada',
    name: 'Bancada',
    goldCost: 20,
    ingredients: [
      { lootId: 'madeira_petrificada', quantity: 4 },
      { lootId: 'fibra_musgo', quantity: 2 },
    ],
    output: { kind: 'station', stationId: 'workbench' },
  },
  {
    id: 'craft_bau_madeira',
    name: 'Baú de madeira',
    goldCost: 10,
    ingredients: [
      { lootId: 'madeira_petrificada', quantity: 3 },
      { lootId: 'fibra_musgo', quantity: 1 },
    ],
    output: { kind: 'station', stationId: 'chest_wood' },
  },
  {
    id: 'craft_cercado',
    name: 'Cercado',
    goldCost: 20,
    ingredients: [
      { lootId: 'madeira_petrificada', quantity: 4 },
      { lootId: 'fibra_musgo', quantity: 3 },
    ],
    output: { kind: 'station', stationId: 'habitat_pen' },
  },
  {
    id: 'craft_foice_micelio',
    name: 'Foice de micélio',
    goldCost: 35,
    ingredients: [
      { lootId: 'chifre_fungico', quantity: 1 },
      { lootId: 'madeira_petrificada', quantity: 2 },
      { lootId: 'esporo_brilhante', quantity: 1 },
    ],
    output: { kind: 'weapon', weaponId: 'foice_micelio' },
  },
  {
    id: 'craft_lamina_prismatica',
    name: 'Lâmina prismática',
    goldCost: 70,
    ingredients: [
      { lootId: 'prisma_refrator', quantity: 1 },
      { lootId: 'fragmento_cristal', quantity: 4 },
      { lootId: 'poeira_prismatica', quantity: 2 },
    ],
    output: { kind: 'weapon', weaponId: 'lamina_prismatica' },
  },
  {
    id: 'craft_tridente_termal',
    name: 'Tridente termal',
    goldCost: 90,
    ingredients: [
      { lootId: 'pluma_bruma', quantity: 1 },
      { lootId: 'essencia_termal', quantity: 3 },
      { lootId: 'escama_termal', quantity: 4 },
    ],
    output: { kind: 'weapon', weaponId: 'tridente_termal' },
  },
  {
    id: 'craft_cama',
    name: 'Cama',
    goldCost: 25,
    ingredients: [
      { lootId: 'madeira_petrificada', quantity: 5 },
      { lootId: 'fibra_musgo', quantity: 4 },
    ],
    output: { kind: 'station', stationId: 'bed' },
  },
  {
    id: 'craft_barra_ferro',
    name: 'Barra de ferro',
    goldCost: 8,
    ingredients: [
      { lootId: 'quartzo_bruto', quantity: 2 },
      { lootId: 'madeira_petrificada', quantity: 1 },
    ],
    output: { kind: 'loot', lootId: 'barra_ferro', quantity: 1 },
  },
  {
    id: 'craft_cristal_luminescente',
    name: 'Cristal luminescente',
    goldCost: 15,
    ingredients: [
      { lootId: 'fragmento_cristal', quantity: 4 },
      { lootId: 'po_bioluminescente', quantity: 2 },
    ],
    output: { kind: 'loot', lootId: 'cristal_luminescente', quantity: 1 },
  },
  {
    id: 'craft_estatueta_fungica',
    name: 'Estatueta fúngica',
    goldCost: 12,
    ingredients: [
      { lootId: 'cogumelo_comum', quantity: 4 },
      { lootId: 'madeira_petrificada', quantity: 2 },
      { lootId: 'esporo_brilhante', quantity: 1 },
    ],
    output: { kind: 'loot', lootId: 'estatueta_fungica', quantity: 1 },
  },
  {
    id: 'craft_ornamento_prismatico',
    name: 'Ornamento prismático',
    goldCost: 20,
    ingredients: [
      { lootId: 'fragmento_cristal', quantity: 3 },
      { lootId: 'poeira_prismatica', quantity: 2 },
    ],
    output: { kind: 'loot', lootId: 'ornamento_prismatico', quantity: 1 },
  },
  {
    id: 'craft_incensario_termal',
    name: 'Incensário termal',
    goldCost: 25,
    ingredients: [
      { lootId: 'concha_vapor', quantity: 2 },
      { lootId: 'essencia_termal', quantity: 2 },
      { lootId: 'lodo_termal', quantity: 1 },
    ],
    output: { kind: 'loot', lootId: 'incensario_termal', quantity: 1 },
  },
  {
    id: 'craft_orbe_vinculo',
    name: 'Orbe de Vínculo',
    goldCost: 20,
    ingredients: [
      { lootId: 'fibra_musgo', quantity: 2 },
      { lootId: 'po_bioluminescente', quantity: 1 },
    ],
    output: { kind: 'orbs', quantity: 1 },
  },
  {
    id: 'craft_orbes_reforcados',
    name: 'Conjunto de Orbes Reforçados',
    goldCost: 60,
    ingredients: [
      { lootId: 'fragmento_cristal', quantity: 3 },
      { lootId: 'prisma_refrator', quantity: 1 },
    ],
    output: { kind: 'orbs', quantity: 3 },
  },
  {
    id: 'craft_fibras_compactadas',
    name: 'Compactar fibras',
    goldCost: 4,
    ingredients: [{ lootId: 'cogumelo_comum', quantity: 3 }],
    output: { kind: 'loot', lootId: 'fibra_musgo', quantity: 1 },
  },
  {
    id: 'craft_lapidar_quartzo',
    name: 'Lapidar quartzo',
    goldCost: 6,
    ingredients: [{ lootId: 'quartzo_bruto', quantity: 2 }],
    output: { kind: 'loot', lootId: 'fragmento_cristal', quantity: 1 },
  },
  {
    id: 'craft_destilar_lodo',
    name: 'Destilar lodo termal',
    goldCost: 8,
    ingredients: [
      { lootId: 'lodo_termal', quantity: 2 },
      { lootId: 'concha_vapor', quantity: 1 },
    ],
    output: { kind: 'loot', lootId: 'essencia_termal', quantity: 1 },
  },
  {
    id: 'craft_concentrar_esporos',
    name: 'Concentrar esporos',
    goldCost: 6,
    ingredients: [
      { lootId: 'cogumelo_comum', quantity: 2 },
      { lootId: 'fibra_musgo', quantity: 1 },
    ],
    output: { kind: 'loot', lootId: 'esporo_brilhante', quantity: 1 },
  },
];

export function getRecipe(id: string): CraftRecipe | undefined {
  return CRAFT_RECIPES.find((r) => r.id === id);
}
