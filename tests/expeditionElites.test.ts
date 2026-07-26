import { describe, expect, it } from 'vitest';
import {
  getEliteCombatModifiers,
  getExpeditionEliteAssignment,
  promoteExpeditionElite,
  shouldAwakenExpeditionElite,
  tickEliteStorm,
} from '../src/systems/expeditionElites.ts';
import { beginExpedition } from '../src/systems/expedition.ts';
import { defaultGameState } from '../src/types.ts';
import { generateExpeditionFloor } from '../src/world/dungeonGenerator.ts';
import type { BiomeId } from '../src/data/biomes.ts';

describe('elites da expedição', () => {
  it.each(['floresta', 'cristal', 'termal'] as BiomeId[])(
    'escolhe três espécies sem repetição e usa os três afixos em %s',
    (biomeId) => {
      const state = defaultGameState();
      const expedition = beginExpedition(state, biomeId, 20260724);
      const species = new Set<string>();
      const affixes = new Set<string>();

      for (const floor of [1, 2, 3] as const) {
        expedition.floor = floor;
        const assignment = getExpeditionEliteAssignment(expedition);
        species.add(assignment.speciesId);
        affixes.add(assignment.affixId);
        expedition.defeatedEliteSpecies.push(assignment.speciesId);
      }

      expect(species.size).toBe(3);
      expect(affixes).toEqual(new Set(['implacavel', 'tempestade', 'bastiao']));
    }
  );

  it('promove um único spawn no centro da sala da passagem', () => {
    const state = defaultGameState();
    const expedition = beginExpedition(state, 'floresta', 99);
    const layout = generateExpeditionFloor({
      biomeId: 'floresta',
      floor: 1,
      seed: 456,
      includeBoss: false,
    });

    const assignment = promoteExpeditionElite(layout, expedition);
    const elites = layout.enemySpawns.filter((spawn) => spawn.isElite);

    expect(assignment).not.toBeNull();
    expect(elites).toHaveLength(1);
    expect(elites[0]).toMatchObject({
      roomIndex: layout.portalRoomIndex,
      x: layout.portal.x,
      y: layout.portal.y,
      speciesId: assignment!.speciesId,
      eliteAffix: assignment!.affixId,
    });
  });

  it('aplica identidades de combate diferentes aos três afixos', () => {
    expect(getEliteCombatModifiers('implacavel')).toMatchObject({
      attackMultiplier: 1.32,
      speedMultiplier: 1.18,
      attackCooldownScale: 0.78,
    });
    expect(getEliteCombatModifiers('bastiao')).toMatchObject({
      defenseBonus: 3,
      shieldRate: 0.4,
    });
    expect(tickEliteStorm(0.1, 0.2, true)).toEqual({
      cooldown: 3.1,
      fire: true,
    });
    expect(tickEliteStorm(0.1, 0.2, false).fire).toBe(false);
  });

  it('só desperta o elite depois que os inimigos comuns forem resolvidos', () => {
    const enemies = [
      { isElite: true, dead: false, fled: false },
      { dead: false, fled: false },
      { isMinion: true, dead: false, fled: false },
    ];

    expect(shouldAwakenExpeditionElite(enemies)).toBe(false);
    enemies[1].dead = true;
    expect(shouldAwakenExpeditionElite(enemies)).toBe(true);
  });
});
