import type { BaseGridState, BasePlacement } from '../types.ts';
import { BASE_CELL_SIZE, BASE_MAP_HEIGHT, BASE_MAP_WIDTH } from '../engine/constants.ts';
import { getStation } from '../data/baseStations.ts';
import { createChestState } from '../systems/baseChest.ts';

export const BaseCellKind = {
  Void: 0,
  Floor: 1,
  Rock: 2,
  Wall: 3,
} as const;

export type BaseCellKind = (typeof BaseCellKind)[keyof typeof BaseCellKind];

const INITIAL_OPEN = 12;

export function getInitialRoomOrigin(base: BaseGridState): { startX: number; startY: number } {
  return {
    startX: Math.floor((base.width - INITIAL_OPEN) / 2),
    startY: Math.floor((base.height - INITIAL_OPEN) / 2),
  };
}

export function createDefaultBaseGrid(): BaseGridState {
  const cells = new Uint8Array(BASE_MAP_WIDTH * BASE_MAP_HEIGHT);
  cells.fill(BaseCellKind.Rock);

  const startX = Math.floor((BASE_MAP_WIDTH - INITIAL_OPEN) / 2);
  const startY = Math.floor((BASE_MAP_HEIGHT - INITIAL_OPEN) / 2);

  carveRoom(cells, startX, startY, INITIAL_OPEN, INITIAL_OPEN);

  // Corredor para entrada (norte)
  for (let y = startY - 1; y >= startY - 3 && y >= 0; y--) {
    const cx = startX + Math.floor(INITIAL_OPEN / 2);
    setCellRaw(cells, cx, y, BaseCellKind.Floor);
    setCellRaw(cells, cx - 1, y, BaseCellKind.Floor);
  }

  const placements: BasePlacement[] = [
    { id: 'bench_default', stationId: 'workbench', cellX: startX + 4, cellY: startY + 5, rotation: 0 },
    { id: 'chest_default', stationId: 'chest_wood', cellX: startX + 6, cellY: startY + 5, rotation: 0 },
    { id: 'bed_default', stationId: 'bed', cellX: startX + 2, cellY: startY + 2, rotation: 0 },
    { id: 'portal_default', stationId: 'dungeon_portal', cellX: startX + 3, cellY: startY, rotation: 0 },
    { id: 'ladder_default', stationId: 'shop_ladder', cellX: startX + 9, cellY: startY, rotation: 0 },
  ];

  const chests = [createChestState('chest_default', startX + 6, startY + 5)];

  return {
    width: BASE_MAP_WIDTH,
    height: BASE_MAP_HEIGHT,
    cells: Array.from(cells),
    placements,
    chests,
    freeBuildsUsed: 2,
    nextPlacementId: 1,
  };
}

function carveRoom(cells: Uint8Array, x: number, y: number, w: number, h: number): void {
  for (let cy = y; cy < y + h && cy < BASE_MAP_HEIGHT; cy++) {
    for (let cx = x; cx < x + w && cx < BASE_MAP_WIDTH; cx++) {
      setCellRaw(cells, cx, cy, BaseCellKind.Floor);
    }
  }
}

function setCellRaw(cells: Uint8Array, x: number, y: number, kind: BaseCellKind): void {
  if (x < 0 || y < 0 || x >= BASE_MAP_WIDTH || y >= BASE_MAP_HEIGHT) return;
  cells[y * BASE_MAP_WIDTH + x] = kind;
}

export function getCell(base: BaseGridState, x: number, y: number): BaseCellKind {
  if (x < 0 || y < 0 || x >= base.width || y >= base.height) return BaseCellKind.Void;
  return base.cells[y * base.width + x] as BaseCellKind;
}

export function setCell(base: BaseGridState, x: number, y: number, kind: BaseCellKind): void {
  if (x < 0 || y < 0 || x >= base.width || y >= base.height) return;
  base.cells[y * base.width + x] = kind;
}

export function cellToWorld(cx: number, cy: number): { x: number; y: number } {
  return {
    x: cx * BASE_CELL_SIZE + BASE_CELL_SIZE / 2,
    y: cy * BASE_CELL_SIZE + BASE_CELL_SIZE / 2,
  };
}

export function worldToCell(wx: number, wy: number): { x: number; y: number } {
  return {
    x: Math.floor(wx / BASE_CELL_SIZE),
    y: Math.floor(wy / BASE_CELL_SIZE),
  };
}

export function isWalkableCell(base: BaseGridState, x: number, y: number): boolean {
  const kind = getCell(base, x, y);
  return kind === BaseCellKind.Floor;
}

export function getBaseWorldSize(base: BaseGridState): { width: number; height: number } {
  return {
    width: base.width * BASE_CELL_SIZE,
    height: base.height * BASE_CELL_SIZE,
  };
}

export function getSpawnPosition(base: BaseGridState): { x: number; y: number } {
  const startX = Math.floor((base.width - INITIAL_OPEN) / 2);
  const startY = Math.floor((base.height - INITIAL_OPEN) / 2);
  return cellToWorld(startX + Math.floor(INITIAL_OPEN / 2), startY + 2);
}

/** Escada para a loja na superfície, separada do portal no canto superior da base. */
export function getShopStaircaseWorld(base: BaseGridState): { x: number; y: number } {
  const placement = base.placements.find((p) => p.stationId === 'shop_ladder');
  if (placement) {
    const def = getStation(placement.stationId);
    return {
      x: (placement.cellX + def.width / 2) * BASE_CELL_SIZE,
      y: (placement.cellY + def.height / 2) * BASE_CELL_SIZE,
    };
  }
  const { startX, startY } = getInitialRoomOrigin(base);
  return cellToWorld(startX + INITIAL_OPEN - 3, startY + 1);
}

/** Portal para escolher destino da masmorra, na parede superior central da base. */
export function getDungeonPortalWorld(base: BaseGridState): { x: number; y: number } {
  const placement = base.placements.find((p) => p.stationId === 'dungeon_portal');
  if (placement) {
    const def = getStation(placement.stationId);
    return {
      x: (placement.cellX + def.width / 2) * BASE_CELL_SIZE,
      y: (placement.cellY + def.height / 2) * BASE_CELL_SIZE,
    };
  }
  const { startX, startY } = getInitialRoomOrigin(base);
  const cx = startX + Math.floor(INITIAL_OPEN / 2) - 2;
  return cellToWorld(cx, startY + 1);
}

export function getFloorsForCollision(base: BaseGridState): { x: number; y: number; width: number; height: number }[] {
  const floors: { x: number; y: number; width: number; height: number }[] = [];
  for (let y = 0; y < base.height; y++) {
    for (let x = 0; x < base.width; x++) {
      if (getCell(base, x, y) === BaseCellKind.Floor) {
        floors.push({
          x: x * BASE_CELL_SIZE,
          y: y * BASE_CELL_SIZE,
          width: BASE_CELL_SIZE,
          height: BASE_CELL_SIZE,
        });
      }
    }
  }
  return floors;
}

export function getRockWallsForCollision(base: BaseGridState): { x: number; y: number; width: number; height: number }[] {
  const walls: { x: number; y: number; width: number; height: number }[] = [];
  for (let y = 0; y < base.height; y++) {
    for (let x = 0; x < base.width; x++) {
      const kind = getCell(base, x, y);
      if (kind === BaseCellKind.Rock || kind === BaseCellKind.Wall) {
        walls.push({
          x: x * BASE_CELL_SIZE,
          y: y * BASE_CELL_SIZE,
          width: BASE_CELL_SIZE,
          height: BASE_CELL_SIZE,
        });
      }
    }
  }
  return walls;
}

/** Colisão das estações construídas (cercado é atravessável). */
export function getStationWallsForCollision(
  base: BaseGridState,
  excludePlacementId?: string | null,
): { x: number; y: number; width: number; height: number }[] {
  const walls: { x: number; y: number; width: number; height: number }[] = [];
  for (const placement of base.placements) {
    if (excludePlacementId && placement.id === excludePlacementId) continue;
    if (placement.stationId === 'habitat_pen') continue;
    if (placement.stationId === 'dungeon_portal' || placement.stationId === 'shop_ladder') continue;

    const def = getStation(placement.stationId);
    for (let dy = 0; dy < def.height; dy++) {
      for (let dx = 0; dx < def.width; dx++) {
        const cx = placement.cellX + dx;
        const cy = placement.cellY + dy;
        walls.push({
          x: cx * BASE_CELL_SIZE,
          y: cy * BASE_CELL_SIZE,
          width: BASE_CELL_SIZE,
          height: BASE_CELL_SIZE,
        });
      }
    }
  }
  return walls;
}

export function isAdjacentToPlayer(
  cellX: number,
  cellY: number,
  playerX: number,
  playerY: number,
): boolean {
  const pc = worldToCell(playerX, playerY);
  const dx = Math.abs(cellX - pc.x);
  const dy = Math.abs(cellY - pc.y);
  return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
}

export function findAdjacentRockCells(
  base: BaseGridState,
  playerX: number,
  playerY: number,
): { x: number; y: number }[] {
  const pc = worldToCell(playerX, playerY);
  const dirs = [
    { x: pc.x + 1, y: pc.y },
    { x: pc.x - 1, y: pc.y },
    { x: pc.x, y: pc.y + 1 },
    { x: pc.x, y: pc.y - 1 },
  ];
  return dirs.filter((d) => getCell(base, d.x, d.y) === BaseCellKind.Rock);
}

export function normalizeBaseGrid(partial: BaseGridState | undefined): BaseGridState {
  if (!partial || !partial.cells?.length) return createDefaultBaseGrid();

  const def = createDefaultBaseGrid();
  const cells = partial.cells.length === def.cells.length
    ? [...partial.cells]
    : [...def.cells];

  const placements = migrateStationFootprints(ensureRequiredBasePlacements(partial.placements ?? def.placements));
  const chests = (partial.chests ?? def.chests).map((chest) => {
    const placement = placements.find((p) => p.id === chest.id && p.stationId === 'chest_wood');
    return placement ? { ...chest, cellX: placement.cellX, cellY: placement.cellY } : chest;
  });

  return {
    width: partial.width ?? def.width,
    height: partial.height ?? def.height,
    cells,
    placements,
    chests,
    freeBuildsUsed: partial.freeBuildsUsed ?? 0,
    nextPlacementId: partial.nextPlacementId ?? 1,
  };
}

function migrateStationFootprints(placements: BasePlacement[]): BasePlacement[] {
  const bench = placements.find((p) => p.id === 'bench_default' && p.stationId === 'workbench');
  const chest = placements.find((p) => p.id === 'chest_default' && p.stationId === 'chest_wood');
  if (!bench || !chest || chest.cellY !== bench.cellY || chest.cellX !== bench.cellX + 1) {
    return placements;
  }
  return placements.map((p) => p.id === chest.id ? { ...p, cellX: bench.cellX + 2 } : p);
}

function ensureRequiredBasePlacements(placements: BasePlacement[]): BasePlacement[] {
  const def = createDefaultBaseGrid();
  const required = ['bed', 'dungeon_portal', 'shop_ladder'] as const;
  const missing = required
    .filter((stationId) => !placements.some((p) => p.stationId === stationId))
    .map((stationId) => def.placements.find((p) => p.stationId === stationId))
    .filter((placement): placement is BasePlacement => placement !== undefined);
  return missing.length > 0 ? [...placements, ...missing] : placements;
}
