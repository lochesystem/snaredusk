import { describe, expect, it } from 'vitest';
import { canUpgradeShop, getShopLevelDef, SHOP_LEVELS } from '../src/systems/shopUpgrade.ts';

describe('shopUpgrade', () => {
  it('defines five levels', () => {
    expect(SHOP_LEVELS).toHaveLength(5);
    expect(getShopLevelDef(1).shelfCount).toBe(6);
    expect(getShopLevelDef(5).shelfCount).toBe(24);
  });

  it('canUpgradeShop checks gold', () => {
    expect(canUpgradeShop(200, 1)).toBe(true);
    expect(canUpgradeShop(50, 1)).toBe(false);
    expect(canUpgradeShop(99999, 5)).toBe(false);
  });
});
