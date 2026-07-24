import { describe, expect, it } from 'vitest';
import { GAME_HEIGHT, GAME_WIDTH } from '../src/engine/constants.ts';
import {
  VISION_CLEAR_RADIUS,
  VISION_FADE_RADIUS,
  visionFogCoversViewport,
  visionFogPosition,
} from '../src/world/dungeonVisionFog.ts';

describe('dungeonVisionFog', () => {
  it('mantém uma transição longa entre a área clara e a escuridão', () => {
    expect(VISION_CLEAR_RADIUS).toBeGreaterThan(50);
    expect(VISION_FADE_RADIUS - VISION_CLEAR_RADIUS).toBeGreaterThan(90);
  });

  it('centraliza a máscara no jogador', () => {
    expect(visionFogPosition(GAME_WIDTH / 2, GAME_HEIGHT / 2)).toEqual({
      x: -GAME_WIDTH / 2,
      y: -GAME_HEIGHT / 2,
    });
  });

  it('cobre a tela inteira até quando o jogador está nos quatro cantos', () => {
    expect(visionFogCoversViewport(0, 0)).toBe(true);
    expect(visionFogCoversViewport(GAME_WIDTH, 0)).toBe(true);
    expect(visionFogCoversViewport(0, GAME_HEIGHT)).toBe(true);
    expect(visionFogCoversViewport(GAME_WIDTH, GAME_HEIGHT)).toBe(true);
  });
});
