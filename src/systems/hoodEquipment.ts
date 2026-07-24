import { HOODS, isHoodId, type HoodId } from '../data/hoods.ts';
import type { GameState } from '../types.ts';

export function ownsHood(state: GameState, hoodId: HoodId): boolean {
  return state.ownedHoods.includes(hoodId);
}

export function acquireHood(state: GameState, hoodId: HoodId): void {
  if (!state.ownedHoods.includes(hoodId)) state.ownedHoods.push(hoodId);
}

export function equipHood(state: GameState, hoodId: HoodId): boolean {
  if (!HOODS[hoodId] || !ownsHood(state, hoodId)) return false;
  state.equippedHoodId = hoodId;
  return true;
}

export function normalizeHoodEquipment(
  owned: unknown,
  equipped: unknown,
): { ownedHoods: HoodId[]; equippedHoodId: HoodId } {
  const ownedHoods = Array.isArray(owned)
    ? owned.filter(isHoodId).filter((id, index, all) => all.indexOf(id) === index)
    : [];
  if (!ownedHoods.includes('cacador')) ownedHoods.unshift('cacador');
  const equippedHoodId = isHoodId(equipped) && ownedHoods.includes(equipped)
    ? equipped
    : 'cacador';
  return { ownedHoods, equippedHoodId };
}
