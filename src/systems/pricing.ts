export type PriceTier = 'bargain' | 'perfect' | 'expensive' | 'refuse';

/** Faixas conforme GDD §7 (proporção preço / valor base). */
export function getPriceTier(price: number, baseValue: number): PriceTier {
  if (baseValue <= 0) return 'perfect';
  const ratio = price / baseValue;
  if (ratio > 1.45) return 'refuse';
  if (ratio > 1.1) return 'expensive';
  if (ratio >= 0.9) return 'perfect';
  return 'bargain';
}

export function getPriceTierLabel(tier: PriceTier): string {
  switch (tier) {
    case 'bargain':
      return '😄 Barganha — vende rápido, lucro baixo';
    case 'perfect':
      return '😊 Perfeito — lucro ideal';
    case 'expensive':
      return '😐 Caro — cliente hesita';
    case 'refuse':
      return '😠 Recusa — preço alto demais';
  }
}

export function customerBuys(price: number, baseValue: number, rng: () => number = Math.random): boolean {
  const tier = getPriceTier(price, baseValue);
  if (tier === 'refuse') return false;
  if (tier === 'expensive') return rng() < 0.4;
  if (tier === 'perfect') return rng() < 0.82;
  return rng() < 0.95;
}
