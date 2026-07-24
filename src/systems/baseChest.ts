import { LOOT_TABLE } from '../data/items.ts';
import { BAG_SLOTS } from '../engine/constants.ts';
import type { GameState } from '../types.ts';
import type { BaseChestState } from '../types.ts';
import { getStation } from '../data/baseStations.ts';
import { emptyWeaponSlots } from './weaponArmory.ts';
import { addLootToSlots, clampTransferQuantity, normalizeItemStacks } from './itemStacks.ts';

export const CHEST_SLOT_COUNT = 12;

export function findChestAt(base: GameState['base'], cellX: number, cellY: number): BaseChestState | null {
  return base.chests.find((c) => c.cellX === cellX && c.cellY === cellY) ?? null;
}

export function findChestById(base: GameState['base'], id: string): BaseChestState | null {
  return base.chests.find((c) => c.id === id) ?? null;
}

export function createChestState(id: string, cellX: number, cellY: number): BaseChestState {
  return {
    id,
    cellX,
    cellY,
    slots: Array.from({ length: CHEST_SLOT_COUNT }, () => null),
    weaponSlots: emptyWeaponSlots(),
  };
}

export function normalizeChestStacks(chest: BaseChestState): void {
  chest.slots = normalizeItemStacks(chest.slots, CHEST_SLOT_COUNT) as BaseChestState['slots'];
}

export function countLootInChest(chest: BaseChestState, lootId: string): number {
  let total = 0;
  for (const slot of chest.slots) {
    if (!slot || slot.id !== lootId) continue;
    total += slot.quantity;
  }
  return total;
}

export function countLootInAllChests(state: GameState, lootId: string): number {
  let total = 0;
  for (const chest of state.base.chests) {
    total += countLootInChest(chest, lootId);
  }
  return total;
}

export function addLootToChest(chest: BaseChestState, lootId: string, quantity: number): number {
  const def = LOOT_TABLE[lootId];
  if (!def || quantity <= 0) return 0;

  return addLootToSlots(chest.slots, {
    kind: 'loot',
    id: lootId,
    name: def.name,
    baseValue: def.baseValue,
    quantity,
  }, quantity);
}

export function removeLootFromChest(chest: BaseChestState, lootId: string, quantity: number): boolean {
  let remaining = quantity;
  for (let i = 0; i < chest.slots.length && remaining > 0; i++) {
    const slot = chest.slots[i];
    if (!slot || slot.id !== lootId) continue;
    const take = Math.min(slot.quantity, remaining);
    slot.quantity -= take;
    remaining -= take;
    if (slot.quantity <= 0) chest.slots[i] = null;
  }
  return remaining === 0;
}

export function transferLootToBag(
  state: GameState,
  chest: BaseChestState,
  chestIndex: number,
  requestedQuantity?: number,
): boolean {
  const slot = chest.slots[chestIndex];
  if (!slot) return false;

  const quantity = clampTransferQuantity(requestedQuantity ?? slot.quantity, slot.quantity);
  const moved = addLootToSlots(state.bag, slot, quantity);
  if (moved !== quantity) return false;
  slot.quantity -= moved;
  if (slot.quantity <= 0) chest.slots[chestIndex] = null;
  return true;
}

export function transferLootToChest(
  state: GameState,
  chest: BaseChestState,
  bagIndex: number,
  requestedQuantity?: number,
): boolean {
  const entry = state.bag[bagIndex];
  if (!entry || entry.kind !== 'loot') return false;

  const quantity = clampTransferQuantity(requestedQuantity ?? entry.quantity, entry.quantity);
  const moved = addLootToSlots(chest.slots, entry, quantity);
  if (moved !== quantity) return false;
  entry.quantity -= moved;
  if (entry.quantity <= 0) state.bag[bagIndex] = null;
  return true;
}

export function getChestLabel(stationId: string): string {
  return getStation(stationId as 'chest_wood').name;
}

export function chestUsedSlots(chest: BaseChestState): number {
  return chest.slots.filter(Boolean).length;
}

export function bagHasLootSpace(state: GameState): boolean {
  return state.bag.some((s) => s === null || s.kind === 'loot');
}

export function chestHasSpace(chest: BaseChestState): boolean {
  return chest.slots.some((s) => s === null || s.kind === 'loot');
}

export function chestWeaponHasSpace(chest: BaseChestState): boolean {
  return (chest.weaponSlots ?? emptyWeaponSlots()).some((s) => s === null);
}

export function normalizeChestWeapons(chest: BaseChestState): void {
  if (!chest.weaponSlots || chest.weaponSlots.length !== emptyWeaponSlots().length) {
    chest.weaponSlots = emptyWeaponSlots();
  }
}

export function maxBagLootSlots(): number {
  return BAG_SLOTS;
}
