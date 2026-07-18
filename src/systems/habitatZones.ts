import type { BaseHabitatZone } from '../types.ts';

export const DEFAULT_PEN_ID = 'default';
export const MIN_PEN_SIZE = 2;
export const MAX_PEN_SIZE = 6;

export function normalizeDragZone(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): BaseHabitatZone {
  const cellX = Math.min(startX, endX);
  const cellY = Math.min(startY, endY);
  let width = Math.abs(endX - startX) + 1;
  let height = Math.abs(endY - startY) + 1;
  width = Math.max(MIN_PEN_SIZE, Math.min(MAX_PEN_SIZE, width));
  height = Math.max(MIN_PEN_SIZE, Math.min(MAX_PEN_SIZE, height));
  return { cellX, cellY, width, height };
}

export function zonesOverlap(a: BaseHabitatZone, b: BaseHabitatZone): boolean {
  return !(
    a.cellX + a.width <= b.cellX ||
    b.cellX + b.width <= a.cellX ||
    a.cellY + a.height <= b.cellY ||
    b.cellY + b.height <= a.cellY
  );
}

export function getPenZoneCapacity(zone: BaseHabitatZone): number {
  return Math.max(1, Math.floor((zone.width * zone.height) / 3));
}

export function getZoneWorldBounds(
  zone: BaseHabitatZone,
  cellSize: number,
  margin = 10,
): { minX: number; minY: number; maxX: number; maxY: number } {
  return {
    minX: zone.cellX * cellSize + margin,
    minY: zone.cellY * cellSize + margin,
    maxX: (zone.cellX + zone.width) * cellSize - margin,
    maxY: (zone.cellY + zone.height) * cellSize - margin,
  };
}

export function clampToZone(
  zone: BaseHabitatZone,
  x: number,
  y: number,
  cellSize: number,
  margin = 10,
): { x: number; y: number } {
  const b = getZoneWorldBounds(zone, cellSize, margin);
  return {
    x: Math.max(b.minX, Math.min(b.maxX, x)),
    y: Math.max(b.minY, Math.min(b.maxY, y)),
  };
}

export function randomPointInZone(
  zone: BaseHabitatZone,
  cellSize: number,
  rng: () => number,
  margin = 10,
): { x: number; y: number } {
  const b = getZoneWorldBounds(zone, cellSize, margin);
  return {
    x: b.minX + rng() * Math.max(1, b.maxX - b.minX),
    y: b.minY + rng() * Math.max(1, b.maxY - b.minY),
  };
}

export function isCellInZone(zone: BaseHabitatZone, cellX: number, cellY: number): boolean {
  return (
    cellX >= zone.cellX &&
    cellX < zone.cellX + zone.width &&
    cellY >= zone.cellY &&
    cellY < zone.cellY + zone.height
  );
}

export function previewDragZone(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): BaseHabitatZone {
  const cellX = Math.min(startX, endX);
  const cellY = Math.min(startY, endY);
  const width = Math.min(MAX_PEN_SIZE, Math.abs(endX - startX) + 1);
  const height = Math.min(MAX_PEN_SIZE, Math.abs(endY - startY) + 1);
  return { cellX, cellY, width, height };
}
