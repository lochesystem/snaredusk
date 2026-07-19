import type { CraftRecipe } from '../data/recipes.ts';
import { CRAFT_RECIPES, getRecipe } from '../data/recipes.ts';
import { LOOT_TABLE } from '../data/items.ts';
import type { GameState } from '../types.ts';
import { acquireWeapon, equipWeapon as armoryEquip } from './weaponArmory.ts';

export interface CraftStatus {
  canCraft: boolean;
  owned: boolean;
  missing: string[];
}

export function getCraftStatus(state: GameState, recipeId: string): CraftStatus {
  const recipe = getRecipe(recipeId);
  if (!recipe) return { canCraft: false, owned: false, missing: ['Receita inválida'] };

  const owned = state.ownedWeapons.includes(recipe.weaponId);
  if (owned) return { canCraft: false, owned: true, missing: [] };

  const missing: string[] = [];
  if (recipe.goldCost > 0 && state.gold < recipe.goldCost) {
    missing.push(`${recipe.goldCost - state.gold} ouro`);
  }
  for (const ing of recipe.ingredients) {
    const have = countLootInBag(state, ing.lootId);
    if (have < ing.quantity) {
      const name = LOOT_TABLE[ing.lootId]?.name ?? ing.lootId;
      missing.push(`${ing.quantity - have}× ${name}`);
    }
  }

  return { canCraft: missing.length === 0, owned: false, missing };
}

export function formatCraftMissing(missing: string[]): string {
  if (missing.length === 0) return '';
  return `Falta: ${missing.join(', ')}`;
}

export function countLootInBag(state: GameState, lootId: string): number {
  let total = 0;
  for (const entry of state.bag) {
    if (!entry || entry.kind !== 'loot') continue;
    if (entry.id === lootId) total += entry.quantity;
  }
  return total;
}

function consumeLoot(state: GameState, lootId: string, quantity: number): boolean {
  let remaining = quantity;
  for (let i = 0; i < state.bag.length && remaining > 0; i++) {
    const entry = state.bag[i];
    if (!entry || entry.kind !== 'loot' || entry.id !== lootId) continue;
    const take = Math.min(entry.quantity, remaining);
    entry.quantity -= take;
    remaining -= take;
    if (entry.quantity <= 0) state.bag[i] = null;
  }
  return remaining === 0;
}

export function canCraft(state: GameState, recipeId: string): boolean {
  return getCraftStatus(state, recipeId).canCraft;
}

export function craftWeapon(state: GameState, recipeId: string): boolean {
  if (!canCraft(state, recipeId)) return false;
  const recipe = getRecipe(recipeId)!;
  state.gold -= recipe.goldCost;
  for (const ing of recipe.ingredients) {
    if (!consumeLoot(state, ing.lootId, ing.quantity)) return false;
  }
  if (!state.ownedWeapons.includes(recipe.weaponId)) {
    acquireWeapon(state, recipe.weaponId);
  }
  return true;
}

export function equipWeapon(state: GameState, weaponId: string): boolean {
  return armoryEquip(state, weaponId);
}

export function listRecipes(): CraftRecipe[] {
  return CRAFT_RECIPES;
}
