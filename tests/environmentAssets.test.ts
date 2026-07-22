import { describe, expect, it } from 'vitest';
import {
  chestPropFrameName,
  decorPropFrameName,
  resetEnvironmentCache,
} from '../src/world/environmentAssets.ts';
import { baseCellTileFrame, baseCellTileFrameAt } from '../src/world/tileRenderer.ts';
import { BaseCellKind } from '../src/world/baseGrid.ts';
import { buildBaseTileLayer } from '../src/world/tileRenderer.ts';

describe('environmentAssets', () => {
  it('mapeia decor para frames de props', () => {
    expect(decorPropFrameName('mushroom', 0)).toBe('mushroom_a');
    expect(decorPropFrameName('mushroom', 1)).toBe('mushroom_b');
    expect(decorPropFrameName('crystal', 2)).toBe('crystal_a');
    expect(decorPropFrameName('thermal', 3)).toBe('thermal_b');
  });

  it('mapeia baús para frames corretos', () => {
    expect(chestPropFrameName(false, false)).toBe('chest');
    expect(chestPropFrameName(false, true)).toBe('chest_epic');
    expect(chestPropFrameName(true, false)).toBe('chest_open');
  });

  it('reset limpa cache sem erro', () => {
    resetEnvironmentCache();
    expect(true).toBe(true);
  });
});

describe('tileRenderer', () => {
  it('mapeia células da base para frames', () => {
    expect(baseCellTileFrame(BaseCellKind.Floor)).toBe('floor');
    expect(baseCellTileFrame(BaseCellKind.Rock)).toBe('rock');
    expect(baseCellTileFrame(BaseCellKind.Wall)).toBe('wall');
    expect(baseCellTileFrame(BaseCellKind.Void)).toBeNull();
  });

  it('varia chão e rocha por coordenada sem mudar entre renders', () => {
    const floor = baseCellTileFrameAt(BaseCellKind.Floor, 7, 11);
    const rock = baseCellTileFrameAt(BaseCellKind.Rock, 7, 11);
    expect(['floor', 'floor_b', 'floor_c']).toContain(floor);
    expect(['rock', 'rock_b', 'rock_c']).toContain(rock);
    expect(baseCellTileFrameAt(BaseCellKind.Floor, 7, 11)).toBe(floor);
  });

  it('buildBaseTileLayer usa fallback vector sem tileset', () => {
    resetEnvironmentCache();
    const layer = buildBaseTileLayer(4, 4, [
      BaseCellKind.Void,
      BaseCellKind.Floor,
      BaseCellKind.Rock,
      BaseCellKind.Wall,
      BaseCellKind.Floor,
      BaseCellKind.Floor,
      BaseCellKind.Rock,
      BaseCellKind.Wall,
      BaseCellKind.Void,
      BaseCellKind.Floor,
      BaseCellKind.Rock,
      BaseCellKind.Wall,
      BaseCellKind.Void,
      BaseCellKind.Floor,
      BaseCellKind.Rock,
      BaseCellKind.Wall,
    ]);
    expect(layer.children.length).toBeGreaterThan(0);
  });
});
