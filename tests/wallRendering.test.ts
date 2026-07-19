import { describe, expect, it } from 'vitest';
import { WALL_STRIP_CROPS } from '../src/world/environmentAssets.ts';
import {
  computeWallStripTilePosition,
  cornerSpriteFlips,
  shouldFlipWallStrip,
} from '../src/world/wallRendering.ts';

describe('wallRendering', () => {
  it('recortes são fixos no canto do frame 32×32', () => {
    expect(WALL_STRIP_CROPS.wall_h).toEqual({ x: 0, y: 0, w: 32, h: 14 });
    expect(WALL_STRIP_CROPS.wall_v).toEqual({ x: 0, y: 0, w: 14, h: 32 });
    expect(WALL_STRIP_CROPS.wall_corner).toEqual({ x: 0, y: 0, w: 14, h: 14 });
  });

  it('tilePosition só desloca no eixo longo (nunca na espessura 14px)', () => {
    expect(computeWallStripTilePosition('h', 48, 48)).toEqual({ x: 16, y: 0 });
    expect(computeWallStripTilePosition('h', 80, 99)).toEqual({ x: 16, y: 0 });

    expect(computeWallStripTilePosition('v', 48, 48)).toEqual({ x: 0, y: 16 });
    expect(computeWallStripTilePosition('v', 274, 112)).toEqual({ x: 0, y: 16 });
  });

  it('paredes norte/oeste não espelham; sul/leste sim (padrão)', () => {
    expect(shouldFlipWallStrip('h', 'n')).toEqual({ flipX: false, flipY: false });
    expect(shouldFlipWallStrip('h', 's')).toEqual({ flipX: false, flipY: true });
    expect(shouldFlipWallStrip('v', 'w')).toEqual({ flipX: false, flipY: false });
    expect(shouldFlipWallStrip('v', 'e')).toEqual({ flipX: true, flipY: false });
  });

  it('quinas espelham a partir do NW do atlas', () => {
    expect(cornerSpriteFlips('nw')).toEqual({ flipX: false, flipY: false });
    expect(cornerSpriteFlips('se')).toEqual({ flipX: true, flipY: true });
  });
});
