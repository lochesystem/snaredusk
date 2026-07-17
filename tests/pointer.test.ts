import { describe, expect, it } from 'vitest';
import { clientToGameScreen } from '../src/engine/pointer.ts';

describe('clientToGameScreen', () => {
  it('maps client coords to logical game space regardless of canvas backing resolution', () => {
    const canvas = {
      getBoundingClientRect: () => ({
        left: 100,
        top: 50,
        width: 960,
        height: 540,
        right: 1060,
        bottom: 590,
        x: 100,
        y: 50,
        toJSON: () => ({}),
      }),
      width: 1440,
      height: 810,
    } as HTMLCanvasElement;

    const center = clientToGameScreen(canvas, 100 + 480, 50 + 270);
    expect(center.x).toBeCloseTo(240, 5);
    expect(center.y).toBeCloseTo(135, 5);

    const above = clientToGameScreen(canvas, 100 + 480, 50 + 90);
    expect(above.x).toBeCloseTo(240, 5);
    expect(above.y).toBeCloseTo(45, 5);
    expect(above.y).toBeLessThan(center.y);
  });
});
