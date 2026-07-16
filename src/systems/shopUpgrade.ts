export interface ShopLevelDef {
  level: number;
  shelfCount: number;
  cageCount: number;
  premiumDisplays: number;
  upgradeCost: number;
  label: string;
}

/** Níveis de loja conforme GDD §7. */
export const SHOP_LEVELS: ShopLevelDef[] = [
  { level: 1, shelfCount: 6, cageCount: 1, premiumDisplays: 0, upgradeCost: 0, label: 'Barraca' },
  { level: 2, shelfCount: 10, cageCount: 2, premiumDisplays: 1, upgradeCost: 150, label: 'Vitrine' },
  { level: 3, shelfCount: 14, cageCount: 3, premiumDisplays: 2, upgradeCost: 500, label: 'Empório' },
  { level: 4, shelfCount: 18, cageCount: 4, premiumDisplays: 3, upgradeCost: 1200, label: 'Salão' },
  { level: 5, shelfCount: 24, cageCount: 6, premiumDisplays: 4, upgradeCost: 3000, label: 'Mercado' },
];

export function getShopLevelDef(level: number): ShopLevelDef {
  return SHOP_LEVELS.find((d) => d.level === level) ?? SHOP_LEVELS[0]!;
}

export function getNextShopLevel(level: number): ShopLevelDef | null {
  return SHOP_LEVELS.find((d) => d.level === level + 1) ?? null;
}

export function canUpgradeShop(gold: number, currentLevel: number): boolean {
  const next = getNextShopLevel(currentLevel);
  if (!next) return false;
  return gold >= next.upgradeCost;
}

export function upgradeShopCost(currentLevel: number): number | null {
  const next = getNextShopLevel(currentLevel);
  return next?.upgradeCost ?? null;
}
