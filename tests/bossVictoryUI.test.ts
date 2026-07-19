import { describe, expect, it } from 'vitest';
import { getBossVictoryTitle } from '../src/ui/bossVictoryUI.ts';

describe('bossVictoryUI', () => {
  it('getBossVictoryTitle returns biome-specific message', () => {
    expect(getBossVictoryTitle('floresta')).toBe('Infestação Eliminada');
    expect(getBossVictoryTitle('cristal')).toBe('Cristal Purificado');
    expect(getBossVictoryTitle('termal')).toBe('Chama Antiga Extinguida');
  });
});
