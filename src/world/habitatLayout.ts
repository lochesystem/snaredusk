import type { Rect } from '../types.ts';

const WALL_THICKNESS = 14;

export interface HabitatLayout {
  width: number;
  height: number;
  floors: Rect[];
  walls: Rect[];
  decorSeed: number;
}

export function buildHabitatLayout(): HabitatLayout {
  const floor: Rect = { x: 12, y: 12, width: 456, height: 246 };
  const t = WALL_THICKNESS;
  const walls: Rect[] = [
    { x: floor.x - t, y: floor.y - t, width: floor.width + t * 2, height: t },
    { x: floor.x - t, y: floor.y + floor.height, width: floor.width + t * 2, height: t },
    { x: floor.x - t, y: floor.y, width: t, height: floor.height },
    { x: floor.x + floor.width, y: floor.y, width: t, height: floor.height },
  ];

  return {
    width: 480,
    height: 270,
    floors: [floor],
    walls,
    decorSeed: 7312,
  };
}

export function randomPointInHabitat(
  floor: Rect,
  margin: number,
  rng: () => number,
): { x: number; y: number } {
  const innerW = Math.max(8, floor.width - margin * 2);
  const innerH = Math.max(8, floor.height - margin * 2);
  return {
    x: floor.x + margin + rng() * innerW,
    y: floor.y + margin + rng() * innerH,
  };
}
