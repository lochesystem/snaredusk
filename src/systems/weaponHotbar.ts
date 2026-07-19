import type { GameState } from '../types.ts';
import { STARTING_WEAPON_ID } from '../data/weapons.ts';
import { normalizeWeaponArmory } from './weaponArmory.ts';

export const WEAPON_HOTBAR_SLOTS = 2;

export function defaultWeaponHotbar(): [string | null, string | null] {
  return [STARTING_WEAPON_ID, null];
}

/** Valida hotbar e migra armas extras para o arsenal. */
export function syncWeaponHotbar(state: GameState): void {
  normalizeWeaponArmory(state);
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
