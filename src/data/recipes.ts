export interface RecipeIngredient {
  lootId: string;
  quantity: number;
}

export interface CraftRecipe {
  id: string;
  weaponId: string;
  name: string;
  goldCost: number;
  ingredients: RecipeIngredient[];
}

export const CRAFT_RECIPES: CraftRecipe[] = [
  {
    id: 'craft_picareta',
    weaponId: 'picareta_combate',
    name: 'Picareta de combate',
    goldCost: 40,
    ingredients: [{ lootId: 'fibra_musgo', quantity: 3 }],
  },
  {
    id: 'craft_lanca_esporo',
    weaponId: 'lanca_esporo',
    name: 'Lança esporo',
    goldCost: 0,
    ingredients: [
      { lootId: 'esporo_brilhante', quantity: 2 },
      { lootId: 'cogumelo_comum', quantity: 5 },
    ],
  },
];

export function getRecipe(id: string): CraftRecipe | undefined {
  return CRAFT_RECIPES.find((r) => r.id === id);
}
