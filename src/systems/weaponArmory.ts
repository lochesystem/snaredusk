import { STARTING_WEAPON_ID, WEAPONS } from '../data/weapons.ts';
import type { BaseChestState, GameState } from '../types.ts';
import { WEAPON_HOTBAR_SLOTS } from './weaponHotbar.ts';

export const CHEST_WEAPON_SLOTS = 4;

export type WeaponLocationKind = 'hotbar' | 'stash' | 'chest';

export interface WeaponLocation {
  kind: WeaponLocationKind;
  hotbarIndex?: number;
  chestId?: string;
  chestSlot?: number;
}

export function emptyWeaponSlots(): (string | null)[] {
  return Array.from({ length: CHEST_WEAPON_SLOTS }, () => null);
}

export function isWeaponOwned(state: GameState, weaponId: string): boolean {
  return state.ownedWeapons.includes(weaponId);
}

export function findWeaponLocation(state: GameState, weaponId: string): WeaponLocation | null {
  for (let i = 0; i < WEAPON_HOTBAR_SLOTS; i++) {
    if (state.weaponHotbar[i] === weaponId) return { kind: 'hotbar', hotbarIndex: i };
  }
  if (state.weaponStash.includes(weaponId)) return { kind: 'stash' };
  for (const chest of state.base.chests) {
    const slots = chest.weaponSlots ?? [];
    for (let i = 0; i < slots.length; i++) {
      if (slots[i] === weaponId) return { kind: 'chest', chestId: chest.id, chestSlot: i };
    }
  }
  return null;
}

export function listWeaponsInChest(chest: BaseChestState): string[] {
  return (chest.weaponSlots ?? []).filter((id): id is string => Boolean(id));
}

function removeWeaponFromAllLocations(state: GameState, weaponId: string): void {
  for (let i = 0; i < WEAPON_HOTBAR_SLOTS; i++) {
    if (state.weaponHotbar[i] === weaponId) state.weaponHotbar[i] = null;
  }
  state.weaponStash = state.weaponStash.filter((id) => id !== weaponId);
  for (const chest of state.base.chests) {
    if (!chest.weaponSlots) chest.weaponSlots = emptyWeaponSlots();
    chest.weaponSlots = chest.weaponSlots.map((id) => (id === weaponId ? null : id));
  }
}

function addToStash(state: GameState, weaponId: string): void {
  if (!state.weaponStash.includes(weaponId)) state.weaponStash.push(weaponId);
}

/** Nova arma craftada: hotbar se houver vaga, senão arsenal. */
export function acquireWeapon(state: GameState, weaponId: string): 'hotbar' | 'stash' {
  if (!WEAPONS[weaponId]) return 'stash';
  if (!state.ownedWeapons.includes(weaponId)) state.ownedWeapons.push(weaponId);
  if (findWeaponLocation(state, weaponId)) {
    const loc = findWeaponLocation(state, weaponId)!;
    return loc.kind === 'hotbar' ? 'hotbar' : 'stash';
  }
  const empty = state.weaponHotbar.findIndex((slot) => slot === null);
  if (empty !== -1) {
    state.weaponHotbar[empty] = weaponId;
    return 'hotbar';
  }
  addToStash(state, weaponId);
  return 'stash';
}

export function assignWeaponToHotbar(state: GameState, weaponId: string, slotIndex: number): boolean {
  if (!isWeaponOwned(state, weaponId) || !WEAPONS[weaponId]) return false;
  if (slotIndex < 0 || slotIndex >= WEAPON_HOTBAR_SLOTS) return false;

  const displaced = state.weaponHotbar[slotIndex];
  removeWeaponFromAllLocations(state, weaponId);
  state.weaponHotbar[slotIndex] = weaponId;
  if (displaced && displaced !== weaponId) addToStash(state, displaced);
  ensureEquippedInHotbar(state);
  return true;
}

export function moveWeaponToStash(state: GameState, weaponId: string): boolean {
  if (!isWeaponOwned(state, weaponId)) return false;
  const loc = findWeaponLocation(state, weaponId);
  if (!loc || loc.kind === 'stash') return false;
  removeWeaponFromAllLocations(state, weaponId);
  addToStash(state, weaponId);
  ensureEquippedInHotbar(state);
  return true;
}

export function depositWeaponToChest(
  state: GameState,
  chest: BaseChestState,
  weaponId: string,
): boolean {
  if (!isWeaponOwned(state, weaponId)) return false;
  const loc = findWeaponLocation(state, weaponId);
  if (!loc || loc.kind === 'chest') return false;
  if (!chest.weaponSlots) chest.weaponSlots = emptyWeaponSlots();
  const slot = chest.weaponSlots.findIndex((id) => id === null);
  if (slot === -1) return false;
  removeWeaponFromAllLocations(state, weaponId);
  chest.weaponSlots[slot] = weaponId;
  ensureEquippedInHotbar(state);
  return true;
}

export function withdrawWeaponFromChest(
  state: GameState,
  chest: BaseChestState,
  slotIndex: number,
): boolean {
  if (!chest.weaponSlots) chest.weaponSlots = emptyWeaponSlots();
  const weaponId = chest.weaponSlots[slotIndex];
  if (!weaponId) return false;
  chest.weaponSlots[slotIndex] = null;
  acquireWeapon(state, weaponId);
  ensureEquippedInHotbar(state);
  return true;
}

export function equipWeapon(state: GameState, weaponId: string): boolean {
  if (!isWeaponOwned(state, weaponId) || !WEAPONS[weaponId]) return false;
  if (!state.weaponHotbar.includes(weaponId)) {
    const empty = state.weaponHotbar.findIndex((slot) => slot === null);
    if (empty !== -1) assignWeaponToHotbar(state, weaponId, empty);
    else assignWeaponToHotbar(state, weaponId, 0);
  }
  state.equippedWeaponId = weaponId;
  return true;
}

function ensureEquippedInHotbar(state: GameState): void {
  if (state.weaponHotbar.includes(state.equippedWeaponId)) return;
  const first = state.weaponHotbar.find((id) => id !== null);
  state.equippedWeaponId = first ?? STARTING_WEAPON_ID;
}

export function normalizeWeaponArmory(state: GameState): void {
  if (!state.weaponStash) state.weaponStash = [];
  for (const chest of state.base.chests) {
    if (!chest.weaponSlots || chest.weaponSlots.length !== CHEST_WEAPON_SLOTS) {
      chest.weaponSlots = emptyWeaponSlots();
    }
  }

  for (const id of [...state.ownedWeapons]) {
    if (!WEAPONS[id]) continue;
    if (!findWeaponLocation(state, id)) acquireWeapon(state, id);
  }

  state.weaponStash = state.weaponStash.filter(
    (id) => isWeaponOwned(state, id) && findWeaponLocation(state, id)?.kind === 'stash',
  );

  for (let i = 0; i < WEAPON_HOTBAR_SLOTS; i++) {
    const id = state.weaponHotbar[i];
    if (id && (!isWeaponOwned(state, id) || !WEAPONS[id])) state.weaponHotbar[i] = null;
  }

  ensureEquippedInHotbar(state);
}
