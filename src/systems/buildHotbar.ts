import type { StationId } from '../data/baseStations.ts';
import type { GameState } from '../types.ts';

export const BUILD_HOTBAR_ITEM_SLOTS = 4;
export type BuildHotbar = [
  StationId | null,
  StationId | null,
  StationId | null,
  StationId | null,
];

export function defaultBuildHotbar(): BuildHotbar {
  return ['workbench', 'chest_wood', 'habitat_pen', 'bed'];
}

export function normalizeBuildHotbar(value: unknown): BuildHotbar {
  const valid: StationId[] = ['workbench', 'chest_wood', 'habitat_pen', 'bed'];
  const source = Array.isArray(value) ? value : defaultBuildHotbar();
  return Array.from({ length: BUILD_HOTBAR_ITEM_SLOTS }, (_, index) => {
    const stationId = source[index];
    return valid.includes(stationId as StationId) ? stationId as StationId : null;
  }) as BuildHotbar;
}

export function assignBuildHotbar(
  state: GameState,
  stationId: StationId,
  slotIndex: number,
): boolean {
  if (slotIndex < 0 || slotIndex >= BUILD_HOTBAR_ITEM_SLOTS) return false;
  if ((state.craftedStations[stationId] ?? 0) <= 0) return false;
  state.buildHotbar = state.buildHotbar.map((id) =>
    id === stationId ? null : id) as BuildHotbar;
  state.buildHotbar[slotIndex] = stationId;
  return true;
}

export function assignBuildToFirstAvailable(state: GameState, stationId: StationId): number {
  const existing = state.buildHotbar.indexOf(stationId);
  if (existing >= 0) return existing;
  const empty = state.buildHotbar.findIndex((id) => id === null);
  const slot = empty >= 0 ? empty : 0;
  return assignBuildHotbar(state, stationId, slot) ? slot : -1;
}
