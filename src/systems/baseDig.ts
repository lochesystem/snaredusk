import { BASE_DIG_STAMINA_COST } from '../engine/constants.ts';
import type { GameState } from '../types.ts';
import {
  BaseCellKind,
  getCell,
  isAdjacentToPlayer,
  setCell,
} from '../world/baseGrid.ts';

export function canDigCell(
  state: GameState,
  cellX: number,
  cellY: number,
  playerX: number,
  playerY: number,
): boolean {
  if (!state.base) return false;
  if (getCell(state.base, cellX, cellY) !== BaseCellKind.Rock) return false;
  if (!isAdjacentToPlayer(cellX, cellY, playerX, playerY)) return false;
  if (state.playerStamina < BASE_DIG_STAMINA_COST) return false;
  return true;
}

export function digCell(
  state: GameState,
  cellX: number,
  cellY: number,
  playerX: number,
  playerY: number,
): boolean {
  if (!canDigCell(state, cellX, cellY, playerX, playerY)) return false;
  setCell(state.base, cellX, cellY, BaseCellKind.Floor);
  state.playerStamina -= BASE_DIG_STAMINA_COST;
  return true;
}
