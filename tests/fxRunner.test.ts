import { describe, expect, it } from 'vitest';
import { FxRunner } from '../src/engine/fxRunner.ts';

describe('fxRunner', () => {
  it('runs and removes fx after duration', () => {
    const fx = new FxRunner();
    let ticks = 0;
    let done = false;
    fx.spawn(
      0.1,
      () => {
        ticks += 1;
      },
      () => {
        done = true;
      },
    );
    expect(fx.spawn(0.1, () => {}, () => {})).toBeTruthy();
    fx.update(0.05);
    expect(ticks).toBeGreaterThan(0);
    expect(done).toBe(false);
    fx.update(0.1);
    expect(done).toBe(true);
  });
});
