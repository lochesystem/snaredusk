import { FREE_BUILD_COUNT, getStation, type StationId } from '../data/baseStations.ts';
import type { BaseHabitatZone, BasePlacement, GameState } from '../types.ts';
import { BaseCellKind, getCell, isWalkableCell } from '../world/baseGrid.ts';
import { createChestState, findChestAt } from './baseChest.ts';
import { countCreaturesInPen } from './habitat.ts';
import { getPenZoneCapacity, isCellInZone, zonesOverlap } from './habitatZones.ts';

export interface PlaceResult {
  ok: boolean;
  message: string;
}

function getPlacementFootprint(p: BasePlacement): BaseHabitatZone {
  if (p.stationId === 'habitat_pen' && p.habitatZone) return p.habitatZone;
  const def = getStation(p.stationId);
  return { cellX: p.cellX, cellY: p.cellY, width: def.width, height: def.height };
}

function zoneOccupiedByPlacements(
  placements: BasePlacement[],
  zone: BaseHabitatZone,
  excludeId?: string,
): boolean {
  for (const p of placements) {
    if (excludeId && p.id === excludeId) continue;
    const footprint = getPlacementFootprint(p);
    if (zonesOverlap(zone, footprint)) return true;
  }
  return false;
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
    const footprint = getPlacementFootprint(p);
    for (let oy = 0; oy < height; oy++) {
      for (let ox = 0; ox < width; ox++) {
        if (isCellInZone(footprint, cellX + ox, cellY + oy)) return true;
      }
    }
  }
  return false;
}

function isZoneOnFloor(state: GameState, zone: BaseHabitatZone): PlaceResult {
  for (let dy = 0; dy < zone.height; dy++) {
    for (let dx = 0; dx < zone.width; dx++) {
      const cx = zone.cellX + dx;
      const cy = zone.cellY + dy;
      if (!isWalkableCell(state.base, cx, cy)) {
        return { ok: false, message: 'Precisa de chão escavado' };
      }
      if (getCell(state.base, cx, cy) !== BaseCellKind.Floor) {
        return { ok: false, message: 'Célula inválida' };
      }
    }
  }
  return { ok: true, message: '' };
}

export function canPlaceStation(
  state: GameState,
  stationId: StationId,
  cellX: number,
  cellY: number,
  excludePlacementId?: string,
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

  if (occupiesCells(base.placements, cellX, cellY, def.width, def.height, excludePlacementId)) {
    return { ok: false, message: 'Espaço ocupado' };
  }

  const free = base.freeBuildsUsed < FREE_BUILD_COUNT;
  if (!free && def.goldCost > 0 && state.gold < def.goldCost) {
    return { ok: false, message: `Precisa de ${def.goldCost} ouro` };
  }

  return { ok: true, message: '' };
}

export function canPlaceHabitatPen(
  state: GameState,
  zone: BaseHabitatZone,
  excludePlacementId?: string,
): PlaceResult {
  const floorCheck = isZoneOnFloor(state, zone);
  if (!floorCheck.ok) return floorCheck;

  if (zoneOccupiedByPlacements(state.base.placements, zone, excludePlacementId)) {
    return { ok: false, message: 'Espaço ocupado' };
  }

  const def = getStation('habitat_pen');
  const free = state.base.freeBuildsUsed < FREE_BUILD_COUNT;
  if (!free && def.goldCost > 0 && state.gold < def.goldCost) {
    return { ok: false, message: `Precisa de ${def.goldCost} ouro` };
  }

  return { ok: true, message: '' };
}

export function placeHabitatPen(state: GameState, zone: BaseHabitatZone): PlaceResult {
  const check = canPlaceHabitatPen(state, zone);
  if (!check.ok) return check;

  const def = getStation('habitat_pen');
  const free = state.base.freeBuildsUsed < FREE_BUILD_COUNT;

  if (!free && def.goldCost > 0) {
    state.gold -= def.goldCost;
  } else if (free) {
    state.base.freeBuildsUsed += 1;
  }

  const id = `place_${state.base.nextPlacementId++}`;
  const placement: BasePlacement = {
    id,
    stationId: 'habitat_pen',
    cellX: zone.cellX,
    cellY: zone.cellY,
    rotation: 0,
    habitatZone: { ...zone },
  };
  state.base.placements.push(placement);

  const cap = getPenZoneCapacity(zone);
  return { ok: true, message: `Cercado criado! Cabem ${cap} criaturas — [E] para gerenciar` };
}

export function placeStation(
  state: GameState,
  stationId: StationId,
  cellX: number,
  cellY: number,
  rotation: 0 | 1 | 2 | 3 = 0,
): PlaceResult {
  if (stationId === 'habitat_pen') {
    return { ok: false, message: 'Arraste no mapa para criar o cercado' };
  }

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

export function findPlacementById(state: GameState, placementId: string): BasePlacement | null {
  return state.base.placements.find((p) => p.id === placementId) ?? null;
}

export function relocatePlacement(
  state: GameState,
  placementId: string,
  cellX: number,
  cellY: number,
): PlaceResult {
  const placement = findPlacementById(state, placementId);
  if (!placement) return { ok: false, message: 'Não encontrado' };

  if (placement.stationId === 'habitat_pen' && placement.habitatZone) {
    const dx = cellX - placement.cellX;
    const dy = cellY - placement.cellY;
    const newZone: BaseHabitatZone = {
      cellX: placement.habitatZone.cellX + dx,
      cellY: placement.habitatZone.cellY + dy,
      width: placement.habitatZone.width,
      height: placement.habitatZone.height,
    };
    const check = canPlaceHabitatPen(state, newZone, placementId);
    if (!check.ok) return check;
    placement.habitatZone = newZone;
    placement.cellX = newZone.cellX;
    placement.cellY = newZone.cellY;
    return { ok: true, message: 'Cercado movido!' };
  }

  const check = canPlaceStation(
    state,
    placement.stationId,
    cellX,
    cellY,
    placementId,
  );
  if (!check.ok) return check;

  placement.cellX = cellX;
  placement.cellY = cellY;

  if (placement.stationId === 'chest_wood') {
    const chest = state.base.chests.find((c) => c.id === placement.id);
    if (chest) {
      chest.cellX = cellX;
      chest.cellY = cellY;
    }
  }

  const def = getStation(placement.stationId);
  return { ok: true, message: `${def.name} movido!` };
}

export function findPlacementAt(
  state: GameState,
  cellX: number,
  cellY: number,
): BasePlacement | null {
  for (const p of state.base.placements) {
    const footprint = getPlacementFootprint(p);
    if (isCellInZone(footprint, cellX, cellY)) return p;
  }
  return null;
}

export function findHabitatPenAt(state: GameState, cellX: number, cellY: number): BasePlacement | null {
  for (const p of state.base.placements) {
    if (p.stationId !== 'habitat_pen' || !p.habitatZone) continue;
    if (isCellInZone(p.habitatZone, cellX, cellY)) return p;
  }
  return null;
}

export function findNearestHabitatPen(
  state: GameState,
  worldX: number,
  worldY: number,
  cellSize: number,
  range: number,
): BasePlacement | null {
  let best: BasePlacement | null = null;
  let bestDist = range;
  for (const p of state.base.placements) {
    if (p.stationId !== 'habitat_pen' || !p.habitatZone) continue;
    const z = p.habitatZone;
    const cx = (z.cellX + z.width / 2) * cellSize;
    const cy = (z.cellY + z.height / 2) * cellSize;
    const dist = Math.hypot(worldX - cx, worldY - cy);
    if (dist < bestDist) {
      bestDist = dist;
      best = p;
    }
  }
  return best;
}

export function removePlacement(state: GameState, placementId: string): PlaceResult {
  const idx = state.base.placements.findIndex((p) => p.id === placementId);
  if (idx === -1) return { ok: false, message: 'Não encontrado' };

  const placement = state.base.placements[idx];
  const def = getStation(placement.stationId);

  if (placement.stationId === 'habitat_pen') {
    if (countCreaturesInPen(state, placement.id) > 0) {
      return { ok: false, message: 'Retire as criaturas do cercado antes de remover' };
    }
  }

  if (placement.stationId === 'chest_wood') {
    const chest = findChestAt(state.base, placement.cellX, placement.cellY);
    if (chest && (chest.slots.some(Boolean) || chest.weaponSlots?.some(Boolean))) {
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
  let cap = 0;
  for (const p of state.base.placements) {
    if (p.stationId === 'habitat_pen' && p.habitatZone) {
      cap += getPenZoneCapacity(p.habitatZone);
    }
  }
  return cap;
}
