import { describe, expect, it } from 'vitest';
import {
  generatePerkOffers,
  getExpeditionPerkModifiers,
} from '../src/systems/expeditionPerks.ts';
import { defaultGameState } from '../src/types.ts';
import { beginExpedition } from '../src/systems/expedition.ts';

describe('perks da expedição', () => {
  it('oferece três opções distintas, determinísticas e ainda não escolhidas', () => {
    const state = defaultGameState();
    const expedition = beginExpedition(state, 'floresta', 20260724);
    expedition.perks = ['fio_afiado'];

    const first = generatePerkOffers(expedition);
    const second = generatePerkOffers(expedition);

    expect(first).toEqual(second);
    expect(first).toHaveLength(3);
    expect(new Set(first).size).toBe(3);
    expect(first).not.toContain('fio_afiado');
  });

  it('centraliza e combina os modificadores escolhidos', () => {
    expect(
      getExpeditionPerkModifiers([
        'fio_afiado',
        'casca_reforcada',
        'segundo_folego',
        'vinculo_feroz',
      ]),
    ).toMatchObject({
      weaponDamageMultiplier: 1.15,
      playerDefenseBonus: 3,
      transitionHealBonusRate: 0.05,
      companionDamageMultiplier: 1.2,
    });
  });
});
