import { getBiomeDef } from '../data/biomes.ts';
import type { ActiveExpedition } from '../types.ts';
import type {
  DungeonEnemySpawn,
  DungeonLayout,
} from '../world/dungeonGenerator.ts';

export type EliteAffixId = 'implacavel' | 'tempestade' | 'bastiao';

export interface EliteAffixDef {
  id: EliteAffixId;
  name: string;
  description: string;
  color: number;
}

export interface ExpeditionEliteAssignment {
  speciesId: string;
  affixId: EliteAffixId;
}

export interface EliteCombatModifiers {
  hpMultiplier: number;
  attackMultiplier: number;
  speedMultiplier: number;
  defenseBonus: number;
  attackCooldownScale: number;
  shieldRate: number;
}

export const ELITE_AFFIXES: Record<EliteAffixId, EliteAffixDef> = {
  implacavel: {
    id: 'implacavel',
    name: 'Implacável',
    description: '+20% ataque, +18% velocidade e golpes mais frequentes.',
    color: 0xe85d4a,
  },
  tempestade: {
    id: 'tempestade',
    name: 'Tempestade',
    description: 'Dispara uma rajada de três projéteis periodicamente.',
    color: 0x72c7ff,
  },
  bastiao: {
    id: 'bastiao',
    name: 'Bastião',
    description: 'Recebe defesa adicional e um grande escudo.',
    color: 0xb8a4ff,
  },
};

export function getEliteCombatModifiers(
  affixId: EliteAffixId,
): EliteCombatModifiers {
  return {
    hpMultiplier: 1.7,
    attackMultiplier: 1.1 * (affixId === 'implacavel' ? 1.2 : 1),
    speedMultiplier: affixId === 'implacavel' ? 1.18 : 1,
    defenseBonus: affixId === 'bastiao' ? 3 : 0,
    attackCooldownScale: affixId === 'implacavel' ? 0.78 : 1,
    shieldRate: affixId === 'bastiao' ? 0.4 : 0,
  };
}

export function tickEliteStorm(
  cooldown: number,
  dt: number,
  active: boolean,
): { cooldown: number; fire: boolean } {
  if (!active) return { cooldown, fire: false };
  const next = cooldown - dt;
  if (next > 0) return { cooldown: next, fire: false };
  return { cooldown: 3.1, fire: true };
}

export function shouldAwakenExpeditionElite(
  enemies: Array<{
    isElite?: boolean;
    isBoss?: boolean;
    isMinion?: boolean;
    dead?: boolean;
    fled?: boolean;
  }>,
): boolean {
  const hasLivingElite = enemies.some(
    (enemy) => enemy.isElite && !enemy.dead && !enemy.fled,
  );
  if (!hasLivingElite) return false;

  return !enemies.some(
    (enemy) =>
      !enemy.isElite &&
      !enemy.isBoss &&
      !enemy.isMinion &&
      !enemy.dead &&
      !enemy.fled,
  );
}

const AFFIX_ORDER: EliteAffixId[] = ['implacavel', 'tempestade', 'bastiao'];

function mix(seed: number): number {
  let value = seed >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  return (value ^ (value >>> 16)) >>> 0;
}

export function getExpeditionEliteAssignment(
  expedition: ActiveExpedition,
): ExpeditionEliteAssignment {
  const biome = getBiomeDef(expedition.biomeId);
  const defeated = new Set(expedition.defeatedEliteSpecies);
  let candidates = biome.enemySpecies.filter((speciesId) => !defeated.has(speciesId));
  if (candidates.length === 0) candidates = [...biome.enemySpecies];
  const speciesIndex = mix(
    expedition.seed ^ Math.imul(expedition.floor, 0x9e3779b1),
  ) % candidates.length;
  const affixOffset = mix(expedition.seed ^ 0x51f15e) % AFFIX_ORDER.length;
  const affixIndex = (affixOffset + expedition.floor - 1) % AFFIX_ORDER.length;
  return {
    speciesId: candidates[speciesIndex]!,
    affixId: AFFIX_ORDER[affixIndex]!,
  };
}

export function promoteExpeditionElite(
  layout: DungeonLayout,
  expedition: ActiveExpedition,
): ExpeditionEliteAssignment | null {
  if (expedition.floor >= 4 || layout.enemySpawns.length === 0) return null;
  const assignment = getExpeditionEliteAssignment(expedition);
  const roomCandidateIndex = layout.enemySpawns.findIndex(
    (spawn) => !spawn.isBoss && spawn.roomIndex === layout.portalRoomIndex,
  );
  const fallbackIndex = layout.enemySpawns.findIndex((spawn) => !spawn.isBoss);
  const candidateIndex = roomCandidateIndex >= 0
    ? roomCandidateIndex
    : fallbackIndex;
  if (candidateIndex < 0) return null;

  const current = layout.enemySpawns[candidateIndex]!;
  const promoted: DungeonEnemySpawn = {
    ...current,
    speciesId: assignment.speciesId,
    roomIndex: layout.portalRoomIndex,
    x: layout.portal.x,
    y: layout.portal.y,
    isElite: true,
    eliteAffix: assignment.affixId,
  };
  layout.enemySpawns[candidateIndex] = promoted;
  return assignment;
}
