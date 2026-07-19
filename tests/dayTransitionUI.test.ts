import { describe, expect, it } from 'vitest';
import { buildDayTransitionContent } from '../src/ui/dayTransitionUI.ts';
import type { DayEndResult } from '../src/systems/dayCycle.ts';

describe('dayTransitionUI', () => {
  it('builds content for a quiet night', () => {
    const result: DayEndResult = { newDay: 2, collected: [], overflow: [] };
    const content = buildDayTransitionContent(result);
    expect(content.dayNumber).toBe(2);
    expect(content.lines[0]).toContain('silêncio');
  });

  it('builds habitat summary and overflow warning', () => {
    const result: DayEndResult = {
      newDay: 4,
      collected: [{ lootId: 'fibra_musgo', lootName: 'Fibra de Musgo', speciesName: 'Esporo', quantity: 2 }],
      overflow: [{ lootId: 'esporo_brilhante', lootName: 'Esporo Brilhante', speciesName: 'Esporo', quantity: 1 }],
    };
    const content = buildDayTransitionContent(result, 'Loja: +12 ouro');
    expect(content.lines[0]).toContain('Fibra de Musgo');
    expect(content.warning).toContain('Bolsa cheia');
    expect(content.footer).toBe('Loja: +12 ouro');
  });
});
