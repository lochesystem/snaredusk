import { ORB_BUNDLE_PRICE, PLAYER_MAX_HP } from '../engine/constants.ts';

export const MERCHANT_HEAL_MIN_PERCENT = 5;
export const MERCHANT_HEAL_MAX_PERCENT = 10;
export const MERCHANT_HEAL_PRICE_MIN_RATE = 0.2;
export const MERCHANT_HEAL_PRICE_MAX_RATE = 0.4;

export interface MerchantHealingOffer {
  price: number;
  healPercent: number;
  healAmount: number;
  priceRate: number;
}

export interface MerchantHealingPurchase {
  ok: boolean;
  hp: number;
  healed: number;
  reason?: 'full_hp' | 'not_enough_gold';
}

export function createMerchantHealingOffer(
  gold: number,
  rng: () => number = Math.random,
): MerchantHealingOffer {
  const safeGold = Math.max(0, Math.floor(gold));
  const priceRate = MERCHANT_HEAL_PRICE_MIN_RATE
    + Math.min(1, Math.max(0, rng()))
      * (MERCHANT_HEAL_PRICE_MAX_RATE - MERCHANT_HEAL_PRICE_MIN_RATE);
  const healPercent = MERCHANT_HEAL_MIN_PERCENT
    + Math.floor(
      Math.min(0.999999, Math.max(0, rng()))
        * (MERCHANT_HEAL_MAX_PERCENT - MERCHANT_HEAL_MIN_PERCENT + 1),
    );
  return {
    price: Math.max(ORB_BUNDLE_PRICE + 1, Math.ceil(safeGold * priceRate)),
    healPercent,
    healAmount: Math.ceil(PLAYER_MAX_HP * (healPercent / 100)),
    priceRate,
  };
}

export function purchaseMerchantHealing(
  gold: number,
  hp: number,
  offer: MerchantHealingOffer,
): MerchantHealingPurchase {
  if (hp >= PLAYER_MAX_HP) {
    return { ok: false, hp, healed: 0, reason: 'full_hp' };
  }
  if (gold < offer.price) {
    return { ok: false, hp, healed: 0, reason: 'not_enough_gold' };
  }
  const nextHp = Math.min(PLAYER_MAX_HP, hp + offer.healAmount);
  return {
    ok: true,
    hp: nextHp,
    healed: nextHp - hp,
  };
}
