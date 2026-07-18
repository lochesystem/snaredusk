import type { Rect } from '../types.ts';
import type { DungeonObstacle } from './dungeonGenerator.ts';
import {
  collidesCircle,
  isInHole,
  isOnWalkableFloor,
  moveWithCollision,
} from './collision.ts';
import { distance } from '../systems/combat.ts';

export const NAV_CELL_SIZE = 16;
/** Raio usado só na grade de navegação (um pouco menor que o colisor real). */
export const NAV_ENTITY_RADIUS = 6;

export interface NavGrid {
  cellSize: number;
  originX: number;
  originY: number;
  cols: number;
  rows: number;
  walkable: Uint8Array;
}

export interface WorldPoint {
  x: number;
  y: number;
}

const NEIGHBORS = [
  { dx: 1, dy: 0, cost: 1 },
  { dx: -1, dy: 0, cost: 1 },
  { dx: 0, dy: 1, cost: 1 },
  { dx: 0, dy: -1, cost: 1 },
  { dx: 1, dy: 1, cost: 1.414 },
  { dx: 1, dy: -1, cost: 1.414 },
  { dx: -1, dy: 1, cost: 1.414 },
  { dx: -1, dy: -1, cost: 1.414 },
];

function cellIndex(grid: NavGrid, gx: number, gy: number): number {
  return gy * grid.cols + gx;
}

function inBounds(grid: NavGrid, gx: number, gy: number): boolean {
  return gx >= 0 && gy >= 0 && gx < grid.cols && gy < grid.rows;
}

function isWalkableCell(grid: NavGrid, gx: number, gy: number): boolean {
  if (!inBounds(grid, gx, gy)) return false;
  return grid.walkable[cellIndex(grid, gx, gy)] === 1;
}

export function isWalkablePosition(
  x: number,
  y: number,
  radius: number,
  floors: Rect[],
  walls: Rect[],
  holes: DungeonObstacle[] = [],
): boolean {
  return (
    isOnWalkableFloor(x, y, radius, floors) &&
    !collidesCircle(x, y, radius, walls) &&
    !isInHole(x, y, radius, holes)
  );
}

export function buildNavGrid(
  floors: Rect[],
  walls: Rect[],
  holes: DungeonObstacle[] = [],
  entityRadius = NAV_ENTITY_RADIUS,
  cellSize = NAV_CELL_SIZE,
): NavGrid {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const floor of floors) {
    minX = Math.min(minX, floor.x);
    minY = Math.min(minY, floor.y);
    maxX = Math.max(maxX, floor.x + floor.width);
    maxY = Math.max(maxY, floor.y + floor.height);
  }

  if (!Number.isFinite(minX)) {
    return {
      cellSize,
      originX: 0,
      originY: 0,
      cols: 1,
      rows: 1,
      walkable: new Uint8Array(1),
    };
  }

  const cols = Math.max(1, Math.ceil((maxX - minX) / cellSize));
  const rows = Math.max(1, Math.ceil((maxY - minY) / cellSize));
  const walkable = new Uint8Array(cols * rows);

  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const cx = minX + gx * cellSize + cellSize * 0.5;
      const cy = minY + gy * cellSize + cellSize * 0.5;
      if (isWalkablePosition(cx, cy, entityRadius, floors, walls, holes)) {
        walkable[cellIndex({ cols, rows } as NavGrid, gx, gy)] = 1;
      }
    }
  }

  return { cellSize, originX: minX, originY: minY, cols, rows, walkable };
}

export function worldToCell(grid: NavGrid, x: number, y: number): { gx: number; gy: number } {
  return {
    gx: Math.floor((x - grid.originX) / grid.cellSize),
    gy: Math.floor((y - grid.originY) / grid.cellSize),
  };
}

export function cellToWorld(grid: NavGrid, gx: number, gy: number): WorldPoint {
  return {
    x: grid.originX + gx * grid.cellSize + grid.cellSize * 0.5,
    y: grid.originY + gy * grid.cellSize + grid.cellSize * 0.5,
  };
}

export function findNearestWalkableCell(
  grid: NavGrid,
  gx: number,
  gy: number,
  maxRadius = 24,
): { gx: number; gy: number } | null {
  if (isWalkableCell(grid, gx, gy)) return { gx, gy };

  for (let r = 1; r <= maxRadius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const nx = gx + dx;
        const ny = gy + dy;
        if (isWalkableCell(grid, nx, ny)) return { gx: nx, gy: ny };
      }
    }
  }

  return null;
}

function heuristic(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

export function findPathOnGrid(
  grid: NavGrid,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): WorldPoint[] {
  const startCell = worldToCell(grid, fromX, fromY);
  const goalCell = worldToCell(grid, toX, toY);
  const start = findNearestWalkableCell(grid, startCell.gx, startCell.gy);
  const goal = findNearestWalkableCell(grid, goalCell.gx, goalCell.gy);
  if (!start || !goal) return [];

  const startIdx = cellIndex(grid, start.gx, start.gy);
  const goalIdx = cellIndex(grid, goal.gx, goal.gy);
  if (startIdx === goalIdx) {
    return [cellToWorld(grid, goal.gx, goal.gy)];
  }

  const total = grid.cols * grid.rows;
  const gScore = new Float32Array(total);
  gScore.fill(Infinity);
  const fScore = new Float32Array(total);
  fScore.fill(Infinity);
  const cameFrom = new Int32Array(total);
  cameFrom.fill(-1);
  const closed = new Uint8Array(total);

  gScore[startIdx] = 0;
  fScore[startIdx] = heuristic(start.gx, start.gy, goal.gx, goal.gy);

  const open: number[] = [startIdx];

  while (open.length > 0) {
    let bestPos = 0;
    for (let i = 1; i < open.length; i++) {
      if (fScore[open[i]] < fScore[open[bestPos]]) bestPos = i;
    }
    const current = open[bestPos];
    open[bestPos] = open[open.length - 1];
    open.pop();

    if (current === goalIdx) {
      const path: WorldPoint[] = [];
      let cursor = current;
      while (cursor !== -1) {
        const gy = Math.floor(cursor / grid.cols);
        const gx = cursor % grid.cols;
        path.push(cellToWorld(grid, gx, gy));
        cursor = cameFrom[cursor];
      }
      path.reverse();
      return simplifyPath(path);
    }

    if (closed[current]) continue;
    closed[current] = 1;

    const cgx = current % grid.cols;
    const cgy = Math.floor(current / grid.cols);

    for (const n of NEIGHBORS) {
      const ngx = cgx + n.dx;
      const ngy = cgy + n.dy;
      if (!isWalkableCell(grid, ngx, ngy)) continue;
      if (n.dx !== 0 && n.dy !== 0) {
        if (!isWalkableCell(grid, cgx + n.dx, cgy) || !isWalkableCell(grid, cgx, cgy + n.dy)) {
          continue;
        }
      }

      const neighbor = cellIndex(grid, ngx, ngy);
      if (closed[neighbor]) continue;

      const tentative = gScore[current] + n.cost;
      if (tentative >= gScore[neighbor]) continue;

      cameFrom[neighbor] = current;
      gScore[neighbor] = tentative;
      fScore[neighbor] = tentative + heuristic(ngx, ngy, goal.gx, goal.gy);

      if (!open.includes(neighbor)) open.push(neighbor);
    }
  }

  return [];
}

function simplifyPath(path: WorldPoint[]): WorldPoint[] {
  if (path.length <= 2) return path;
  const out: WorldPoint[] = [path[0]];
  for (let i = 1; i < path.length - 1; i++) {
    const prev = out[out.length - 1];
    const curr = path[i];
    const next = path[i + 1];
    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;
    const cross = dx1 * dy2 - dy1 * dx2;
    if (Math.abs(cross) > 0.5) out.push(curr);
  }
  out.push(path[path.length - 1]);
  return out;
}

export class DungeonPathfinder {
  private grid: NavGrid;

  constructor(
    floors: Rect[],
    walls: Rect[],
    holes: DungeonObstacle[] = [],
  ) {
    this.grid = buildNavGrid(floors, walls, holes);
  }

  rebuild(floors: Rect[], walls: Rect[], holes: DungeonObstacle[] = []): void {
    this.grid = buildNavGrid(floors, walls, holes);
  }

  findPath(fromX: number, fromY: number, toX: number, toY: number): WorldPoint[] {
    return findPathOnGrid(this.grid, fromX, fromY, toX, toY);
  }
}

export interface PathFollowResult {
  x: number;
  y: number;
  pathIndex: number;
  moved: boolean;
}

export function moveAlongPath(
  x: number,
  y: number,
  path: WorldPoint[],
  pathIndex: number,
  speed: number,
  dt: number,
  radius: number,
  walls: Rect[],
  floors: Rect[],
  holes: DungeonObstacle[] = [],
  waypointRadius = 12,
): PathFollowResult {
  if (path.length === 0) return { x, y, pathIndex, moved: false };

  let idx = pathIndex;
  while (idx < path.length && distance(x, y, path[idx].x, path[idx].y) <= waypointRadius) {
    idx++;
  }
  if (idx >= path.length) return { x, y, pathIndex: idx, moved: false };

  const wp = path[idx];
  const dx = wp.x - x;
  const dy = wp.y - y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.5) return { x, y, pathIndex: idx + 1, moved: false };

  const step = Math.min(speed * dt, dist);
  const ndx = (dx / dist) * step;
  const ndy = (dy / dist) * step;
  const moved = moveWithCollision(x, y, ndx, ndy, radius, walls, floors, holes);
  const didMove = Math.abs(moved.x - x) > 0.01 || Math.abs(moved.y - y) > 0.01;
  return { x: moved.x, y: moved.y, pathIndex: idx, moved: didMove };
}

export function shouldReplanPath(
  goalX: number,
  goalY: number,
  lastGoalX: number,
  lastGoalY: number,
  path: WorldPoint[],
  pathIndex: number,
  stuckTimer: number,
  replanTimer: number,
  goalThreshold = 28,
): boolean {
  if (path.length === 0 || pathIndex >= path.length) return true;
  if (distance(goalX, goalY, lastGoalX, lastGoalY) > goalThreshold) return true;
  if (stuckTimer > 0.45) return true;
  if (replanTimer <= 0) return true;
  return false;
}
