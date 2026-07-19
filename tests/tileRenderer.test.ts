import { describe, expect, it } from 'vitest';
import { resetEnvironmentCache } from '../src/world/environmentAssets.ts';
import {
  buildDungeonFloorLayer,
  collectDoorJambCorners,
  cornerIdAt,
  resolveWallOrientation,
  rockPropFootY,
  spawnDungeonPropSprites,
  trimWallSegment,
} from '../src/world/tileRenderer.ts';
import { BIOMES } from '../src/data/biomes.ts';

describe('tileRenderer dungeon', () => {
  it('resolveWallOrientation usa metadados do gerador', () => {
    expect(
      resolveWallOrientation({ width: 120, height: 14, axis: 'h', facing: 's' }),
    ).toEqual({ axis: 'h', facing: 's' });
    expect(
      resolveWallOrientation({ width: 14, height: 200, axis: 'v', facing: 'e' }),
    ).toEqual({ axis: 'v', facing: 'e' });
  });

  it('resolveWallOrientation infere eixo quando ausente', () => {
    expect(resolveWallOrientation({ width: 80, height: 14 })).toEqual({ axis: 'h', facing: 'n' });
    expect(resolveWallOrientation({ width: 14, height: 120 })).toEqual({ axis: 'v', facing: 'w' });
  });

  it('trimWallSegment encurta segmentos nas quinas', () => {
    const corners = new Set(['48,48', '274,48']);
    const north = trimWallSegment(
      { x: 48, y: 48, width: 240, height: 14, axis: 'h', facing: 'n' },
      corners,
    );
    expect(north).toEqual({ x: 62, y: 48, width: 212, height: 14, axis: 'h', facing: 'n' });
  });

  it('cornerIdAt identifica quinas de sala', () => {
    const rooms = [{ rect: { x: 48, y: 48, width: 240, height: 180 } }];
    expect(cornerIdAt(rooms, 48, 48)).toBe('nw');
    expect(cornerIdAt(rooms, 274, 214)).toBe('se');
  });

  it('spawnDungeonPropSprites vazio sem props carregados', () => {
    resetEnvironmentCache();
    const props = spawnDungeonPropSprites({ decor: [], obstacles: [] }, 'floresta');
    expect(props).toEqual([]);
  });

  it('collectDoorJambCorners coloca quinas nas ombreiras', () => {
    const rooms = [
      {
        rect: { x: 48, y: 48, width: 240, height: 180 },
        doors: ['n' as const],
      },
    ];
    const jambs = collectDoorJambCorners(rooms);
    expect(jambs).toHaveLength(2);
    expect(jambs[0]?.corner).toBe('se');
    expect(jambs[1]?.corner).toBe('sw');
  });

  it('rockPropFootY alinha pé da pedra ao fallback vetorial', () => {
    expect(rockPropFootY(100, 10)).toBe(108);
  });

  it('buildDungeonFloorLayer fallback sem tileset', () => {
    resetEnvironmentCache();
    const layer = buildDungeonFloorLayer(
      {
        floors: [{ x: 0, y: 0, width: 64, height: 64 }],
        walls: [],
        rooms: [],
        decor: [],
        obstacles: [],
        width: 128,
        height: 128,
        theme: BIOMES.floresta.theme,
      },
      'floresta',
    );
    expect(layer.children.length).toBeGreaterThan(0);
  });
});
