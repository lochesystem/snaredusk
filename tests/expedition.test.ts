import { describe, expect, it } from 'vitest';
import {
  beginExpedition,
  checkpointExpedition,
  choosePerkAndAdvance,
  endExpedition,
  restoreExpeditionCheckpoint,
} from '../src/systems/expedition.ts';
import { defaultGameState } from '../src/types.ts';

describe('ciclo de vida da expedição', () => {
  it('inicia no andar 1 com seed e checkpoint imutáveis', () => {
    const state = defaultGameState();
    state.playerHp = 72;
    state.playerStamina = 33;
    state.bag[0] = {
      kind: 'loot',
      id: 'fibra_musgo',
      name: 'Fibra de musgo',
      baseValue: 20,
      quantity: 2,
    };

    const expedition = beginExpedition(state, 'floresta', 12345);
    state.bag[0]!.name = 'alterado depois';

    expect(expedition).toMatchObject({
      biomeId: 'floresta',
      seed: 12345,
      floor: 1,
      phase: 'exploring',
      checkpointHp: 72,
      checkpointStamina: 33,
    });
    expect(expedition.checkpointBag[0]).toMatchObject({ name: 'Fibra de musgo' });
  });

  it('retoma o começo do andar e descarta mutações feitas no meio da sala', () => {
    const state = defaultGameState();
    state.bag[0] = {
      kind: 'loot',
      id: 'cogumelo_comum',
      name: 'Cogumelo comum',
      baseValue: 15,
      quantity: 1,
    };
    beginExpedition(state, 'floresta', 91);
    state.playerHp = 12;
    state.playerStamina = 4;
    state.bag[0] = null;
    state.bag[1] = {
      kind: 'loot',
      id: 'drop_do_meio',
      name: 'Drop do meio',
      baseValue: 1,
      quantity: 1,
    };

    const resumed = restoreExpeditionCheckpoint(state);

    expect(resumed?.seed).toBe(91);
    expect(state.playerHp).toBe(100);
    expect(state.playerStamina).toBe(80);
    expect(state.bag[0]).toMatchObject({ id: 'cogumelo_comum' });
    expect(state.bag[1]).toBeNull();
  });

  it('fixa ofertas e avança com um perk válido sem trocar a seed', () => {
    const state = defaultGameState();
    beginExpedition(state, 'cristal', 2026);
    checkpointExpedition(state, 1, 'reward', ['fio_afiado', 'passo_leve', 'guardiao']);

    const next = choosePerkAndAdvance(state, 'passo_leve');

    expect(next).toMatchObject({
      seed: 2026,
      floor: 2,
      phase: 'exploring',
      perks: ['passo_leve'],
      perkOffers: [],
    });
  });

  it('rejeita transições sem recompensa ou com perk fora das ofertas', () => {
    const state = defaultGameState();
    beginExpedition(state, 'termal', 77);

    expect(() => choosePerkAndAdvance(state, 'guardiao')).toThrow();
    checkpointExpedition(state, 1, 'reward', ['fio_afiado']);
    expect(() => choosePerkAndAdvance(state, 'guardiao')).toThrow();
  });

  it.each(['extract', 'death', 'abandon', 'victory'] as const)(
    'limpa completamente a expedição ao encerrar por %s',
    (reason) => {
      const state = defaultGameState();
      beginExpedition(state, 'floresta', 8);
      state.activeExpedition!.perks.push('fio_afiado');

      const ended = endExpedition(state, reason);

      expect(ended?.perks).toEqual(['fio_afiado']);
      expect(state.activeExpedition).toBeNull();
    },
  );
});
