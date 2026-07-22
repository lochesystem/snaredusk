import { LOOT_TABLE } from '../data/items.ts';
import { getRecipe } from '../data/recipes.ts';
import type { BaseChestState, GameState } from '../types.ts';
import { getStation } from '../data/baseStations.ts';
import { countLootInChest, removeLootFromChest } from './baseChest.ts';
import { countLootInBag } from './craft.ts';
import { acquireWeapon } from './weaponArmory.ts';

export type ChestDirection = 'north' | 'east' | 'south' | 'west';

export interface AdjacentChest {
  chest: BaseChestState;
  direction: ChestDirection;
}

const DIR_ORDER: ChestDirection[] = ['north', 'east', 'south', 'west'];

export function getAdjacentChestsForWorkbench(
  state: GameState,
  benchCellX: number,
  benchCellY: number,
): AdjacentChest[] {
  const bench = getStation('workbench');
  const cellsByDirection: Record<ChestDirection, { x: number; y: number }[]> = {
    north: Array.from({ length: bench.width }, (_, dx) => ({ x: benchCellX + dx, y: benchCellY - 1 })),
    east: Array.from({ length: bench.height }, (_, dy) => ({ x: benchCellX + bench.width, y: benchCellY + dy })),
    south: Array.from({ length: bench.width }, (_, dx) => ({ x: benchCellX + dx, y: benchCellY + bench.height })),
    west: Array.from({ length: bench.height }, (_, dy) => ({ x: benchCellX - 1, y: benchCellY + dy })),
  };
  const result: AdjacentChest[] = [];
  for (const dir of DIR_ORDER) {
    const placement = state.base.placements.find((p) =>
      p.stationId === 'chest_wood'
      && cellsByDirection[dir].some((cell) => p.cellX === cell.x && p.cellY === cell.y));
    if (!placement) continue;
    const chest = state.base.chests.find((c) => c.id === placement.id);
    if (chest) result.push({ chest, direction: dir });
  }
  return result;
}

export function countLootInSources(
  state: GameState,
  lootId: string,
  adjacentChests: AdjacentChest[],
  allowBag: boolean,
): number {
  let total = 0;
  for (const { chest } of adjacentChests) {
    total += countLootInChest(chest, lootId);
  }
  if (allowBag) total += countLootInBag(state, lootId);
  return total;
}

export interface CraftConsumePlan {
  lootId: string;
  quantity: number;
  source: ChestDirection | 'bag';
}

export interface CraftPreview {
  canCraft: boolean;
  owned: boolean;
  missing: string[];
  consumePlan: CraftConsumePlan[];
}

export function getCraftPreviewFromSources(
  state: GameState,
  recipeId: string,
  benchCellX: number,
  benchCellY: number,
  allowBag = false,
): CraftPreview {
  const recipe = getRecipe(recipeId);
  if (!recipe) {
    return { canCraft: false, owned: false, missing: ['Receita inválida'], consumePlan: [] };
  }

  const owned = state.ownedWeapons.includes(recipe.weaponId);
  if (owned) return { canCraft: false, owned: true, missing: [], consumePlan: [] };

  const adjacent = getAdjacentChestsForWorkbench(state, benchCellX, benchCellY);
  const missing: string[] = [];
  const consumePlan: CraftConsumePlan[] = [];

  if (recipe.goldCost > 0 && state.gold < recipe.goldCost) {
    missing.push(`${recipe.goldCost - state.gold} ouro`);
  }

  for (const ing of recipe.ingredients) {
    let need = ing.quantity;
    const name = LOOT_TABLE[ing.lootId]?.name ?? ing.lootId;

    for (const { chest, direction } of adjacent) {
      if (need <= 0) break;
      const have = countLootInChest(chest, ing.lootId);
      const take = Math.min(have, need);
      if (take > 0) {
        consumePlan.push({ lootId: ing.lootId, quantity: take, source: direction });
        need -= take;
      }
    }

    if (need > 0 && allowBag) {
      const bagHave = countLootInBag(state, ing.lootId);
      const take = Math.min(bagHave, need);
      if (take > 0) {
        consumePlan.push({ lootId: ing.lootId, quantity: take, source: 'bag' });
        need -= take;
      }
    }

    if (need > 0) missing.push(`${need}× ${name}`);
  }

  return {
    canCraft: missing.length === 0,
    owned: false,
    missing,
    consumePlan,
  };
}

function consumeFromPlan(state: GameState, plan: CraftConsumePlan[], adjacent: AdjacentChest[]): boolean {
  for (const item of plan) {
    if (item.source === 'bag') {
      let remaining = item.quantity;
      for (let i = 0; i < state.bag.length && remaining > 0; i++) {
        const entry = state.bag[i];
        if (!entry || entry.kind !== 'loot' || entry.id !== item.lootId) continue;
        const take = Math.min(entry.quantity, remaining);
        entry.quantity -= take;
        remaining -= take;
        if (entry.quantity <= 0) state.bag[i] = null;
      }
      if (remaining > 0) return false;
      continue;
    }

    const chest = adjacent.find((a) => a.direction === item.source)?.chest;
    if (!chest || !removeLootFromChest(chest, item.lootId, item.quantity)) return false;
  }
  return true;
}

export function craftWeaponFromWorkbench(
  state: GameState,
  recipeId: string,
  benchCellX: number,
  benchCellY: number,
  allowBag = false,
): boolean {
  const preview = getCraftPreviewFromSources(state, recipeId, benchCellX, benchCellY, allowBag);
  if (!preview.canCraft) return false;

  const recipe = getRecipe(recipeId)!;
  const adjacent = getAdjacentChestsForWorkbench(state, benchCellX, benchCellY);

  state.gold -= recipe.goldCost;
  if (!consumeFromPlan(state, preview.consumePlan, adjacent)) return false;

  if (!state.ownedWeapons.includes(recipe.weaponId)) {
    acquireWeapon(state, recipe.weaponId);
  }
  return true;
}

export function formatConsumePlan(plan: CraftConsumePlan[]): string {
  if (plan.length === 0) return '';
  const dirLabel: Record<ChestDirection | 'bag', string> = {
    north: 'baú norte',
    east: 'baú leste',
    south: 'baú sul',
    west: 'baú oeste',
    bag: 'bolsa',
  };
  return plan
    .map((p) => {
      const name = LOOT_TABLE[p.lootId]?.name ?? p.lootId;
      return `${p.quantity}× ${name} (${dirLabel[p.source]})`;
    })
    .join(', ');
}

export function findNearestWorkbench(
  state: GameState,
  playerX: number,
  playerY: number,
): { placement: GameState['base']['placements'][number]; dist: number } | null {
  let best: { placement: GameState['base']['placements'][number]; dist: number } | null = null;
  for (const p of state.base.placements) {
    if (p.stationId !== 'workbench') continue;
    const def = getStation(p.stationId);
    const cx = (p.cellX + def.width / 2) * 32;
    const cy = (p.cellY + def.height / 2) * 32;
    const dist = Math.hypot(cx - playerX, cy - playerY);
    if (!best || dist < best.dist) best = { placement: p, dist };
  }
  return best;
}
