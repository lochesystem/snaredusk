import { describe, expect, it } from 'vitest';
import {
  advanceExpeditionStage,
  beginExpedition,
  checkpointExpedition,
  choosePerkAndAdvance,
  endExpedition,
  getExpeditionDifficulty,
  getExpeditionStageSeed,
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

  it('deriva seeds estáveis e distintas para cada estágio', () => {
    const state = defaultGameState();
    const expedition = beginExpedition(state, 'floresta', 20260724);
    const floorOneSeed = getExpeditionStageSeed(expedition);
    expedition.floor = 2;
    const floorTwoSeed = getExpeditionStageSeed(expedition);

    expect(floorOneSeed).toBe(getExpeditionStageSeed({ ...expedition, floor: 1 }));
    expect(floorTwoSeed).not.toBe(floorOneSeed);
  });

  it('recupera 5% de HP, restaura stamina e cria o próximo checkpoint', () => {
    const state = defaultGameState();
    beginExpedition(state, 'floresta', 14);
    state.playerHp = 40;
    state.playerStamina = 3;

    const next = advanceExpeditionStage(state);

    expect(next).toMatchObject({
      floor: 2,
      phase: 'exploring',
      checkpointHp: 45,
      checkpointStamina: 80,
    });
    expect(state.playerHp).toBe(45);
    expect(state.playerStamina).toBe(80);
  });

  it('aplica a cura base mais Segundo Fôlego ao escolher o perk e prosseguir', () => {
    const state = defaultGameState();
    beginExpedition(state, 'floresta', 18);
    state.playerHp = 40;
    state.playerStamina = 2;
    checkpointExpedition(state, 1, 'reward', ['segundo_folego']);

    const next = choosePerkAndAdvance(state, 'segundo_folego');

    expect(next.checkpointHp).toBe(50);
    expect(next.checkpointStamina).toBe(80);
    expect(next.perks).toContain('segundo_folego');
  });

  it('usa a curva de dificuldade definida para cada andar', () => {
    expect(getExpeditionDifficulty(1)).toEqual({
      hpMultiplier: 1,
      attackMultiplier: 1,
      speedMultiplier: 1,
    });
    expect(getExpeditionDifficulty(3)).toEqual({
      hpMultiplier: 1.55,
      attackMultiplier: 1.25,
      speedMultiplier: 1.08,
    });
    expect(getExpeditionDifficulty(4).hpMultiplier).toBe(1.25);
  });

  it('rejeita transições sem recompensa ou com perk fora das ofertas', () => {
    const state = defaultGameState();
    beginExpedition(state, 'termal', 77);

    expect(() => choosePerkAndAdvance(state, 'guardiao')).toThrow();
    checkpointExpedition(state, 1, 'reward', ['fio_afiado']);
    expect(() => choosePerkAndAdvance(state, 'guardiao')).toThrow();
    state.activeExpedition!.perks.push('fio_afiado');
    expect(() => choosePerkAndAdvance(state, 'fio_afiado')).toThrow();
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
