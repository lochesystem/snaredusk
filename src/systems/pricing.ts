import type { PriceTier } from '../types.ts';

/** Fase 1: duas faixas úteis + recusa simplificada. */
export function getPriceTier(price: number, baseValue: number): PriceTier {
  if (price > baseValue * 1.15) return 'too_high';
  if (price < baseValue * 0.85) return 'bargain';
  return 'good';
}

export function getPriceTierLabel(tier: PriceTier): string {
  switch (tier) {
    case 'bargain':
      return '😄 Barganha — vende rápido, lucro baixo';
    case 'good':
      return '😊 Bom preço — lucro ideal';
    case 'too_high':
      return '😠 Caro demais — cliente recusa';
  }
}

export function customerBuys(price: number, baseValue: number, rng: () => number = Math.random): boolean {
  const tier = getPriceTier(price, baseValue);
  if (tier === 'too_high') return false;
  if (tier === 'bargain') return rng() < 0.95;
  return rng() < 0.75;
}
