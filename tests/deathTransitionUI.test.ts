import { describe, expect, it } from 'vitest';
import { formatDeathKillerLine } from '../src/ui/deathTransitionUI.ts';

describe('deathTransitionUI', () => {
  it('formats killer line with name', () => {
    expect(formatDeathKillerLine('Rei das Esporas')).toBe('Morto por Rei das Esporas');
  });

  it('falls back when killer name is empty', () => {
    expect(formatDeathKillerLine('   ')).toBe('Morto por forças desconhecidas');
  });
});
