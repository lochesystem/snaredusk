import { describe, expect, it } from 'vitest';
import { calcDamage, isInAttackArc, circlesOverlap } from '../src/systems/combat.ts';

describe('combat', () => {
  it('calcDamage respects defense', () => {
    expect(calcDamage(15, 0)).toBe(15);
    expect(calcDamage(15, 10)).toBe(10);
    expect(calcDamage(5, 20)).toBe(1);
  });

  it('isInAttackArc only hits targets in front arc', () => {
    const inFront = isInAttackArc(0, 0, 0, 30, 0, 40, 1.0);
    const behind = isInAttackArc(0, 0, 0, -30, 0, 40, 1.0);
    expect(inFront).toBe(true);
    expect(behind).toBe(false);
  });

  it('circlesOverlap detects collision', () => {
    expect(circlesOverlap(0, 0, 5, 8, 0, 5)).toBe(true);
    expect(circlesOverlap(0, 0, 5, 20, 0, 5)).toBe(false);
  });
});
