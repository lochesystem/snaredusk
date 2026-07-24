import { describe, expect, it } from 'vitest';
import {
  createMerchantHealingOffer,
  MERCHANT_HEAL_PRICE_MAX_RATE,
  MERCHANT_HEAL_PRICE_MIN_RATE,
  purchaseMerchantHealing,
} from '../src/systems/merchantHealing.ts';
import { ORB_BUNDLE_PRICE } from '../src/engine/constants.ts';

describe('cura do mercador da expedição', () => {
  it('cobra entre 20% e 40% do ouro e oferece de 5% a 10% de cura', () => {
    const cheapest = createMerchantHealingOffer(1_000, () => 0);
    const priciest = createMerchantHealingOffer(1_000, () => 0.999999);

    expect(cheapest.priceRate).toBe(MERCHANT_HEAL_PRICE_MIN_RATE);
    expect(cheapest.price).toBe(200);
    expect(cheapest.healPercent).toBe(5);
    expect(priciest.priceRate).toBeCloseTo(MERCHANT_HEAL_PRICE_MAX_RATE);
    expect(priciest.price).toBe(400);
    expect(priciest.healPercent).toBe(10);
  });

  it('continua sendo a opção mais cara quando o jogador tem pouco ouro', () => {
    const offer = createMerchantHealingOffer(100, () => 0);
    expect(offer.price).toBeGreaterThan(ORB_BUNDLE_PRICE);
  });

  it('cura sem ultrapassar o máximo e não cobra se estiver cheio ou sem ouro', () => {
    const offer = createMerchantHealingOffer(1_000, () => 0.999999);
    expect(purchaseMerchantHealing(1_000, 94, offer)).toEqual({
      ok: true,
      hp: 100,
      healed: 6,
    });
    expect(purchaseMerchantHealing(1_000, 100, offer).reason).toBe('full_hp');
    expect(purchaseMerchantHealing(0, 50, offer).reason).toBe('not_enough_gold');
  });
});
