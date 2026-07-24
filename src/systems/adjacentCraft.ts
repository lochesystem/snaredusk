import { LOOT_TABLE } from '../data/items.ts';
import { getRecipe } from '../data/recipes.ts';
import type { BaseChestState, GameState } from '../types.ts';
import { getStation } from '../data/baseStations.ts';
import { countLootInChest, removeLootFromChest } from './baseChest.ts';
import { countLootInBag, grantCraftOutput } from './craft.ts';

export type ChestDirection = 'base';

export interface WorkbenchChest {
  chest: BaseChestState;
  direction: ChestDirection;
}

/**
 * A bancada acessa o armazenamento da base inteira. Isso permite organizar os
 * móveis visualmente sem obrigar o jogador a colar todos os baús na oficina.
 */
export function getWorkbenchChests(
  state: GameState,
  _benchCellX: number,
  _benchCellY: number,
): WorkbenchChest[] {
  return state.base.chests.map((chest) => ({ chest, direction: 'base' }));
}

export function countLootInSources(
  state: GameState,
  lootId: string,
  workbenchChests: WorkbenchChest[],
  allowBag: boolean,
): number {
  let total = 0;
  for (const { chest } of workbenchChests) {
    total += countLootInChest(chest, lootId);
  }
  if (allowBag) total += countLootInBag(state, lootId);
  return total;
}

export interface CraftConsumePlan {
  lootId: string;
  quantity: number;
  source: ChestDirection | 'bag';
  chestId?: string;
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

  const owned = recipe.output.kind === 'weapon'
    && state.ownedWeapons.includes(recipe.output.weaponId);
  if (owned) return { canCraft: false, owned: true, missing: [], consumePlan: [] };

  const workbenchChests = getWorkbenchChests(state, benchCellX, benchCellY);
  const missing: string[] = [];
  const consumePlan: CraftConsumePlan[] = [];

  if (recipe.output.kind === 'loot') {
    const outputLootId = recipe.output.lootId;
    if (!state.bag.some((entry) =>
      entry === null || (entry.kind === 'loot' && entry.id === outputLootId))) {
      missing.push('espaço na bolsa');
    }
  }

  if (recipe.goldCost > 0 && state.gold < recipe.goldCost) {
    missing.push(`${recipe.goldCost - state.gold} ouro`);
  }

  for (const ing of recipe.ingredients) {
    let need = ing.quantity;
    const name = LOOT_TABLE[ing.lootId]?.name ?? ing.lootId;

    for (const { chest, direction } of workbenchChests) {
      if (need <= 0) break;
      const have = countLootInChest(chest, ing.lootId);
      const take = Math.min(have, need);
      if (take > 0) {
        consumePlan.push({
          lootId: ing.lootId,
          quantity: take,
          source: direction,
          chestId: chest.id,
        });
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

function consumeFromPlan(
  state: GameState,
  plan: CraftConsumePlan[],
  workbenchChests: WorkbenchChest[],
): boolean {
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

    const chest = workbenchChests.find(({ chest: candidate }) =>
      candidate.id === item.chestId)?.chest;
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
  const workbenchChests = getWorkbenchChests(state, benchCellX, benchCellY);

  state.gold -= recipe.goldCost;
  if (!consumeFromPlan(state, preview.consumePlan, workbenchChests)) return false;

  grantCraftOutput(state, recipe);
  return true;
}

export function formatConsumePlan(plan: CraftConsumePlan[]): string {
  if (plan.length === 0) return '';
  const dirLabel: Record<ChestDirection | 'bag', string> = {
    base: 'baú da base',
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
