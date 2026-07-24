import { describe, expect, it } from 'vitest';
import {
  getOpenedChestPresentation,
  OPENED_CHEST_FADE_SEC,
  OPENED_CHEST_HOLD_SEC,
} from '../src/systems/openedChestLifecycle.ts';

describe('desaparecimento de baús abertos', () => {
  it('mantém o baú visível por cerca de um segundo', () => {
    expect(getOpenedChestPresentation(OPENED_CHEST_HOLD_SEC - 0.01)).toEqual({
      alpha: 1,
      scale: 1,
      expired: false,
    });
  });

  it('faz uma saída curta e remove o baú ao final', () => {
    const halfway = getOpenedChestPresentation(
      OPENED_CHEST_HOLD_SEC + OPENED_CHEST_FADE_SEC / 2,
    );
    expect(halfway.alpha).toBeCloseTo(0.5);
    expect(halfway.scale).toBeCloseTo(0.98);
    expect(halfway.expired).toBe(false);

    expect(
      getOpenedChestPresentation(OPENED_CHEST_HOLD_SEC + OPENED_CHEST_FADE_SEC),
    ).toEqual({
      alpha: 0,
      scale: 0.96,
      expired: true,
    });
  });
});
