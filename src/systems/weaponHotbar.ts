import type { GameState } from '../types.ts';
import { STARTING_WEAPON_ID } from '../data/weapons.ts';

export const WEAPON_HOTBAR_SLOTS = 2;

export function defaultWeaponHotbar(): [string | null, string | null] {
  return [STARTING_WEAPON_ID, null];
}

/** Preenche slots vazios com armas possuídas. */
export function syncWeaponHotbar(state: GameState): void {
  const owned = state.ownedWeapons;
  const hotbar = state.weaponHotbar;

  for (let i = 0; i < WEAPON_HOTBAR_SLOTS; i++) {
    if (hotbar[i] && !owned.includes(hotbar[i]!)) hotbar[i] = null;
  }

  for (const id of owned) {
    if (hotbar.includes(id)) continue;
    const empty = hotbar.findIndex((s) => s === null);
    if (empty === -1) break;
    hotbar[empty] = id;
  }

  if (owned.includes(state.equippedWeaponId) && !hotbar.includes(state.equippedWeaponId)) {
    const empty = hotbar.findIndex((s) => s === null);
    if (empty !== -1) hotbar[empty] = state.equippedWeaponId;
  }
}

export function selectHotbarSlot(state: GameState, index: number): boolean {
  if (index < 0 || index >= WEAPON_HOTBAR_SLOTS) return false;
  const id = state.weaponHotbar[index];
  if (!id || !state.ownedWeapons.includes(id)) return false;
  state.equippedWeaponId = id;
  return true;
}

export function hotbarSlotIndex(state: GameState): number {
  const idx = state.weaponHotbar.indexOf(state.equippedWeaponId);
  return idx >= 0 ? idx : 0;
}
