import { describe, expect, it } from 'vitest';
import { buildShopLayout } from '../src/world/shopLayout.ts';

describe('shopLayout', () => {
  it('fits all slots without overlap for level 1', () => {
    const layout = buildShopLayout(1);
    expect(layout.slots).toHaveLength(7);
    for (let i = 0; i < layout.slots.length; i++) {
      for (let j = i + 1; j < layout.slots.length; j++) {
        const a = layout.slots[i]!;
        const b = layout.slots[j]!;
        const overlap =
          Math.abs(a.x - b.x) < (a.w + b.w) / 2 + 4 &&
          Math.abs(a.y - b.y) < (a.h + b.h) / 2 + 4;
        expect(overlap).toBe(false);
      }
    }
  });

  it('grows room size at higher levels', () => {
    const l1 = buildShopLayout(1);
    const l5 = buildShopLayout(5);
    expect(l5.slots.length).toBeGreaterThan(l1.slots.length);
    expect(l5.width).toBeGreaterThanOrEqual(l1.width);
  });
});
