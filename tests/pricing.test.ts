import { describe, expect, it } from 'vitest';
import { customerBuys, getPriceTier, getPriceTierLabel } from '../src/systems/pricing.ts';

describe('pricing', () => {
  const base = 100;

  it('classifies bargain, good, too_high', () => {
    expect(getPriceTier(70, base)).toBe('bargain');
    expect(getPriceTier(100, base)).toBe('good');
    expect(getPriceTier(130, base)).toBe('too_high');
  });

  it('customer refuses too_high', () => {
    expect(customerBuys(130, base, () => 0)).toBe(false);
  });

  it('customer usually buys bargain', () => {
    expect(customerBuys(70, base, () => 0.5)).toBe(true);
  });

  it('labels are in portuguese', () => {
    expect(getPriceTierLabel('good')).toContain('Bom preço');
  });
});
