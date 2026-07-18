import { FREE_BUILD_COUNT, getStation, type StationId } from '../data/baseStations.ts';
import type { BasePlacement, GameState } from '../types.ts';
import { BaseCellKind, getCell, isWalkableCell } from '../world/baseGrid.ts';
import { createChestState, findChestAt } from './baseChest.ts';

export interface PlaceResult {
  ok: boolean;
  message: string;
}

function occupiesCells(
  placements: BasePlacement[],
  cellX: number,
  cellY: number,
  width: number,
  height: number,
  excludeId?: string,
): boolean {
  for (const p of placements) {
    if (excludeId && p.id === excludeId) continue;
    const def = getStation(p.stationId);
    for (let dy = 0; dy < def.height; dy++) {
      for (let dx = 0; dx < def.width; dx++) {
        for (let oy = 0; oy < height; oy++) {
          for (let ox = 0; ox < width; ox++) {
            if (p.cellX + dx === cellX + ox && p.cellY + dy === cellY + oy) return true;
          }
        }
      }
    }
  }
  return false;
}

export function canPlaceStation(
  state: GameState,
  stationId: StationId,
  cellX: number,
  cellY: number,
): PlaceResult {
  const def = getStation(stationId);
  const base = state.base;

  for (let dy = 0; dy < def.height; dy++) {
    for (let dx = 0; dx < def.width; dx++) {
      const cx = cellX + dx;
      const cy = cellY + dy;
      if (!isWalkableCell(base, cx, cy)) {
        return { ok: false, message: 'Precisa de chão escavado' };
      }
      if (getCell(base, cx, cy) !== BaseCellKind.Floor) {
        return { ok: false, message: 'Célula inválida' };
      }
    }
  }

  if (occupiesCells(base.placements, cellX, cellY, def.width, def.height)) {
    return { ok: false, message: 'Espaço ocupado' };
  }

  const free = base.freeBuildsUsed < FREE_BUILD_COUNT;
  if (!free && def.goldCost > 0 && state.gold < def.goldCost) {
    return { ok: false, message: `Precisa de ${def.goldCost} ouro` };
  }

  return { ok: true, message: '' };
}

export function placeStation(
  state: GameState,
  stationId: StationId,
  cellX: number,
  cellY: number,
  rotation: 0 | 1 | 2 | 3 = 0,
): PlaceResult {
  const check = canPlaceStation(state, stationId, cellX, cellY);
  if (!check.ok) return check;

  const def = getStation(stationId);
  const free = state.base.freeBuildsUsed < FREE_BUILD_COUNT;

  if (!free && def.goldCost > 0) {
    state.gold -= def.goldCost;
  } else if (free) {
    state.base.freeBuildsUsed += 1;
  }

  const id = `place_${state.base.nextPlacementId++}`;
  const placement: BasePlacement = {
    id,
    stationId,
    cellX,
    cellY,
    rotation,
  };
  state.base.placements.push(placement);

  if (stationId === 'chest_wood') {
    state.base.chests.push(createChestState(id, cellX, cellY));
  }

  return { ok: true, message: `${def.name} colocado!` };
}

export function findPlacementAt(
  state: GameState,
  cellX: number,
  cellY: number,
): BasePlacement | null {
  for (const p of state.base.placements) {
    const def = getStation(p.stationId);
    for (let dy = 0; dy < def.height; dy++) {
      for (let dx = 0; dx < def.width; dx++) {
        if (p.cellX + dx === cellX && p.cellY + dy === cellY) return p;
      }
    }
  }
  return null;
}

export function removePlacement(state: GameState, placementId: string): PlaceResult {
  const idx = state.base.placements.findIndex((p) => p.id === placementId);
  if (idx === -1) return { ok: false, message: 'Não encontrado' };

  const placement = state.base.placements[idx];
  const def = getStation(placement.stationId);

  if (placement.stationId === 'chest_wood') {
    const chest = findChestAt(state.base, placement.cellX, placement.cellY);
    if (chest && chest.slots.some(Boolean)) {
      return { ok: false, message: 'Esvazie o baú antes de remover' };
    }
    state.base.chests = state.base.chests.filter((c) => c.id !== placement.id);
  }

  state.base.placements.splice(idx, 1);

  const refund = Math.floor(def.goldCost * 0.5);
  if (refund > 0) state.gold += refund;

  return { ok: true, message: `${def.name} removido` };
}

export function getHabitatCapacityFromBase(state: GameState): number {
  const pens = state.base.placements.filter((p) => p.stationId === 'habitat_pen').length;
  return Math.min(6, 4 + pens);
}
