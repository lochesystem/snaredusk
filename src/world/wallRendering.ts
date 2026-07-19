import type { WallFacing } from './dungeonGenerator.ts';
import { ENV_TILE_SIZE, WALL_STRIP_CROPS, WALL_TILE_VISIBLE_PX } from './environmentAssets.ts';

export type WallCornerId = 'nw' | 'ne' | 'sw' | 'se';

export { WALL_STRIP_CROPS, WALL_TILE_VISIBLE_PX };

/**
 * Espelhamento por face da parede.
 * Edite aqui (ou no `meta.snaredusk.walls` do tileset) se a borda clara ficar do lado errado.
 */
export interface WallFacingFlipConfig {
  /** Parede sul: espelha `wall_h` no eixo Y. */
  flipSouth: boolean;
  /** Parede leste: espelha `wall_v` no eixo X. */
  flipEast: boolean;
}

export const DEFAULT_WALL_FACING_FLIPS: WallFacingFlipConfig = {
  flipSouth: true,
  flipEast: true,
};

function tileMod(n: number, size: number): number {
  return ((n % size) + size) % size;
}

/**
 * Fase do TilingSprite só no eixo **longo** da faixa (repetição a cada 32 px).
 * Nunca desloca na espessura de 14 px — isso empurrava a borda para o meio do tile.
 */
export function computeWallStripTilePosition(
  axis: 'h' | 'v',
  wallX: number,
  wallY: number,
  repeatPeriod = ENV_TILE_SIZE,
): { x: number; y: number } {
  if (axis === 'h') {
    return { x: tileMod(-wallX, repeatPeriod), y: 0 };
  }
  return { x: 0, y: tileMod(-wallY, repeatPeriod) };
}

export function shouldFlipWallStrip(
  axis: 'h' | 'v',
  facing: WallFacing,
  config: WallFacingFlipConfig = DEFAULT_WALL_FACING_FLIPS,
): { flipX: boolean; flipY: boolean } {
  if (axis === 'h') {
    const flipY = facing === 's' && config.flipSouth;
    return { flipX: false, flipY };
  }
  const flipX = facing === 'e' && config.flipEast;
  return { flipX, flipY: false };
}

/** Espelho da quina 14×14 (`wall_corner` desenhado no canto NW do frame). */
export function cornerSpriteFlips(corner: WallCornerId): { flipX: boolean; flipY: boolean } {
  return {
    flipX: corner === 'ne' || corner === 'se',
    flipY: corner === 'sw' || corner === 'se',
  };
}
