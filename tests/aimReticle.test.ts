import { describe, expect, it } from 'vitest';
import { calcAimAngle, calcAimReticlePosition } from '../src/world/aimReticle.ts';

describe('aimReticle', () => {
  it('calcAimAngle points toward target', () => {
    expect(calcAimAngle(0, 0, 10, 0)).toBeCloseTo(0, 5);
    expect(calcAimAngle(0, 0, 0, 10)).toBeCloseTo(Math.PI / 2, 5);
  });

  it('calcAimAngle uses fallback when target overlaps player', () => {
    expect(calcAimAngle(5, 5, 5, 5, 1.2)).toBeCloseTo(1.2, 5);
  });

  it('calcAimReticlePosition sits at weapon range on aim circle', () => {
    const pos = calcAimReticlePosition(100, 50, 0, 34);
    expect(pos.x).toBeCloseTo(134, 5);
    expect(pos.y).toBeCloseTo(50, 5);

    const up = calcAimReticlePosition(0, 0, -Math.PI / 2, 34);
    expect(up.x).toBeCloseTo(0, 5);
    expect(up.y).toBeCloseTo(-34, 5);
  });
});
