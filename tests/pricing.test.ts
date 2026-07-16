import { describe, expect, it } from 'vitest';
import { customerBuys, getPriceTier, getPriceTierLabel } from '../src/systems/pricing.ts';

describe('pricing', () => {
  const base = 100;

  it('classifies bargain, perfect, expensive, refuse', () => {
    expect(getPriceTier(60, base)).toBe('bargain');
    expect(getPriceTier(100, base)).toBe('perfect');
    expect(getPriceTier(120, base)).toBe('expensive');
    expect(getPriceTier(150, base)).toBe('refuse');
  });

  it('customer refuses refuse tier', () => {
    expect(customerBuys(150, base, () => 0)).toBe(false);
  });

  it('customer usually buys bargain', () => {
    expect(customerBuys(60, base, () => 0.5)).toBe(true);
  });

  it('expensive tier is uncertain', () => {
    expect(customerBuys(120, base, () => 0.5)).toBe(false);
    expect(customerBuys(120, base, () => 0.1)).toBe(true);
  });

  it('labels are in portuguese', () => {
    expect(getPriceTierLabel('perfect')).toContain('Perfeito');
    expect(getPriceTierLabel('refuse')).toContain('Recusa');
  });
});
