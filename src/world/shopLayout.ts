import type { Rect } from '../types.ts';
import { getShopLevelDef } from '../systems/shopUpgrade.ts';

const WALL = 14;
const SHELF_W = 52;
const SHELF_H = 36;
const CAGE_W = 58;
const CAGE_H = 48;
const GAP_X = 10;
const GAP_Y = 12;
const MARGIN_TOP = 28;
const MARGIN_SIDE = 36;

export interface ShopSlotLayout {
  kind: 'shelf' | 'cage';
  index: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ShopLayout {
  width: number;
  height: number;
  floors: Rect[];
  walls: Rect[];
  obstacles: Rect[];
  slots: ShopSlotLayout[];
  entrance: { x: number; y: number };
  counter: { x: number; y: number };
  decorSeed: number;
}

function gridPositions(
  count: number,
  cols: number,
  startX: number,
  startY: number,
  cellW: number,
  cellH: number,
): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    out.push({
      x: startX + col * (cellW + GAP_X),
      y: startY + row * (cellH + GAP_Y),
    });
  }
  return out;
}

export function buildShopLayout(shopLevel: number): ShopLayout {
  const def = getShopLevelDef(shopLevel);
  const shelfCount = def.shelfCount;
  const cageCount = def.cageCount;

  const shelfCols = shopLevel <= 2 ? 5 : shopLevel <= 3 ? 7 : shopLevel <= 4 ? 6 : 8;
  const shelfRows = Math.ceil(shelfCount / shelfCols);
  const cageColW = cageCount > 0 ? CAGE_W + 24 : 0;

  const gridW = shelfCols * SHELF_W + (shelfCols - 1) * GAP_X;
  const width = Math.max(480, MARGIN_SIDE * 2 + gridW + cageColW);
  const height = Math.max(
    270,
    MARGIN_TOP + shelfRows * (SHELF_H + GAP_Y) + 100,
  );

  const floor: Rect = { x: WALL, y: WALL, width: width - WALL * 2, height: height - WALL * 2 };
  const walls: Rect[] = [
    { x: 0, y: 0, width, height: WALL },
    { x: 0, y: height - WALL, width, height: WALL },
    { x: 0, y: 0, width: WALL, height },
    { x: width - WALL, y: 0, width: WALL, height },
  ];

  const slots: ShopSlotLayout[] = [];
  const obstacles: Rect[] = [];

  const gridStartX = (width - gridW - cageColW) / 2;
  const shelfPositions = gridPositions(shelfCount, shelfCols, gridStartX, MARGIN_TOP, SHELF_W, SHELF_H);

  shelfPositions.forEach((pos, i) => {
    slots.push({
      kind: 'shelf',
      index: i,
      x: pos.x + SHELF_W / 2,
      y: pos.y + SHELF_H / 2,
      w: SHELF_W,
      h: SHELF_H,
    });
    obstacles.push({
      x: pos.x,
      y: pos.y + SHELF_H * 0.35,
      width: SHELF_W,
      height: SHELF_H * 0.65,
    });
  });

  const cageX = width - MARGIN_SIDE - CAGE_W / 2 - 8;
  const cageStartY = MARGIN_TOP + 8;
  for (let c = 0; c < cageCount; c++) {
    const y = cageStartY + c * (CAGE_H + GAP_Y);
    slots.push({
      kind: 'cage',
      index: c,
      x: cageX,
      y: y + CAGE_H / 2,
      w: CAGE_W,
      h: CAGE_H,
    });
    obstacles.push({
      x: cageX - CAGE_W / 2,
      y: y + CAGE_H * 0.3,
      width: CAGE_W,
      height: CAGE_H * 0.7,
    });
  }

  return {
    width,
    height,
    floors: [floor],
    walls,
    obstacles,
    slots,
    entrance: { x: width / 2, y: height - WALL - 28 },
    counter: { x: width / 2, y: floor.y + floor.height * 0.55 },
    decorSeed: 4200 + shopLevel * 131,
  };
}

export function findSlotAt(
  layout: ShopLayout,
  wx: number,
  wy: number,
  radius = 22,
): ShopSlotLayout | null {
  let best: ShopSlotLayout | null = null;
  let bestD = radius * radius;
  for (const slot of layout.slots) {
    const dx = wx - slot.x;
    const dy = wy - slot.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD) {
      bestD = d2;
      best = slot;
    }
  }
  return best;
}
