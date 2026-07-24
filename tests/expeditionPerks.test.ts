import { describe, expect, it } from 'vitest';
import {
  absorbDamageWithBarrier,
  EXPEDITION_PERKS,
  generatePerkOffers,
  getExpeditionOutgoingDamageMultiplier,
  getExpeditionPerkModifiers,
  rollFailedOrbRefund,
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

  it('fecha o pool inicial com doze perks', () => {
    expect(Object.keys(EXPEDITION_PERKS)).toHaveLength(12);
  });

  it('combina Golpe Pesado, Caçador de Elite e os perks de captura', () => {
    const modifiers = getExpeditionPerkModifiers([
      'fio_afiado',
      'maos_rapidas',
      'golpe_pesado',
      'cacador_elite',
      'barreira_inicial',
      'laco_preciso',
      'orbe_persistente',
    ]);

    expect(modifiers.weaponDamageMultiplier).toBeCloseTo(1.4375);
    expect(modifiers.attackCooldownMultiplier).toBeCloseTo(0.968);
    expect(modifiers.eliteBossDamageMultiplier).toBe(1.2);
    expect(modifiers.floorBarrierHp).toBe(20);
    expect(modifiers.captureChanceBonus).toBe(0.1);
    expect(modifiers.failedOrbRefundChance).toBe(0.35);
  });

  it('barreira absorve dano e informa quando quebra', () => {
    expect(absorbDamageWithBarrier(20, 7)).toEqual({
      barrierHp: 13,
      hpDamage: 0,
      absorbed: 7,
      broken: false,
    });
    expect(absorbDamageWithBarrier(5, 12)).toEqual({
      barrierHp: 0,
      hpDamage: 7,
      absorbed: 5,
      broken: true,
    });
  });

  it('Caçador de Elite afeta o jogador somente nos alvos especiais', () => {
    const modifiers = getExpeditionPerkModifiers([
      'fio_afiado',
      'cacador_elite',
      'vinculo_feroz',
    ]);

    expect(getExpeditionOutgoingDamageMultiplier(modifiers, {
      source: 'player',
      isElite: true,
      isBoss: false,
    })).toBeCloseTo(1.15 * 1.2);
    expect(getExpeditionOutgoingDamageMultiplier(modifiers, {
      source: 'player',
      isElite: false,
      isBoss: false,
    })).toBeCloseTo(1.15);
    expect(getExpeditionOutgoingDamageMultiplier(modifiers, {
      source: 'companion',
      isElite: true,
      isBoss: false,
    })).toBeCloseTo(1.2);
  });

  it('recupera Orbe de forma testável pela chance configurada', () => {
    expect(rollFailedOrbRefund(0.35, () => 0.2)).toBe(true);
    expect(rollFailedOrbRefund(0.35, () => 0.8)).toBe(false);
  });
});
