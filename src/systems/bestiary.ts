import { BIOME_ORDER, getBiomeDef, type BiomeId } from '../data/biomes.ts';
import { getSpecies } from '../data/creatures.ts';
import { getHabitatYield } from '../data/habitatYields.ts';
import { getEnemyChestDrop, LOOT_TABLE } from '../data/items.ts';
import { getEnemyBehavior, isBossBehaviorKind } from '../data/enemyBehaviors.ts';
import type { GameState } from '../types.ts';

export interface BestiaryStats {
  hp: number;
  atk: number;
  def: number;
  speed: number;
}

export interface BestiaryEntryView {
  speciesId: string;
  biomeId: BiomeId;
  slot: number;
  discovered: boolean;
  isBoss: boolean;
  name: string;
  role: string | null;
  stats: BestiaryStats | null;
  drop: string | null;
  production: string | null;
  companionAvailable: boolean | null;
}

export interface BestiaryProgress {
  discovered: number;
  total: number;
}

const ROLE_LABELS: Record<string, string> = {
  melee: 'Corpo a corpo',
  ranged: 'Ataque à distância',
  shielded: 'Guardião com escudo',
  boss_burst: 'Chefe de rajadas',
  boss_spore: 'Chefe invocador',
  boss_prism: 'Chefe prismático',
  boss_thermal: 'Chefe de investida',
};

export function listBestiarySpecies(biomeId: BiomeId): string[] {
  const biome = getBiomeDef(biomeId);
  return [...biome.enemySpecies, biome.bossSpeciesId];
}

export function getSpeciesBiome(speciesId: string): BiomeId | null {
  for (const biomeId of BIOME_ORDER) {
    if (listBestiarySpecies(biomeId).includes(speciesId)) return biomeId;
  }
  return null;
}

export function isBestiarySpeciesDiscovered(state: GameState, speciesId: string): boolean {
  if (state.bestiary.includes(speciesId)) return true;
  const biomeId = getSpeciesBiome(speciesId);
  if (!biomeId) return false;
  return getBiomeDef(biomeId).bossSpeciesId === speciesId
    && state.biomeBossDefeated[biomeId] === true;
}

export function registerBestiarySpecies(state: GameState, speciesId: string): boolean {
  if (!getSpeciesBiome(speciesId) || state.bestiary.includes(speciesId)) return false;
  state.bestiary.push(speciesId);
  return true;
}

export function getBestiaryEntry(
  state: GameState,
  biomeId: BiomeId,
  speciesId: string,
  slot: number,
): BestiaryEntryView {
  const biome = getBiomeDef(biomeId);
  const isBoss = biome.bossSpeciesId === speciesId;
  const discovered = isBestiarySpeciesDiscovered(state, speciesId);
  if (!discovered) {
    return {
      speciesId,
      biomeId,
      slot,
      discovered: false,
      isBoss,
      name: '???',
      role: null,
      stats: null,
      drop: null,
      production: null,
      companionAvailable: null,
    };
  }

  const species = getSpecies(speciesId);
  const behavior = getEnemyBehavior(species.behaviorId);
  const chestDrop = getEnemyChestDrop(speciesId, isBoss);
  const dropDef = LOOT_TABLE[chestDrop.lootId];
  const habitatYield = getHabitatYield(speciesId);
  const yieldDef = habitatYield ? LOOT_TABLE[habitatYield.lootId] : null;
  const role = ROLE_LABELS[behavior.kind]
    ?? (isBossBehaviorKind(behavior.kind) ? 'Chefe' : 'Criatura');

  return {
    speciesId,
    biomeId,
    slot,
    discovered: true,
    isBoss,
    name: species.name,
    role,
    stats: {
      hp: species.maxHp,
      atk: species.atk,
      def: species.def,
      speed: species.speed,
    },
    drop: dropDef
      ? `${dropDef.name}${chestDrop.quantity > 1 ? ` ×${chestDrop.quantity}` : ''}`
      : null,
    production: habitatYield && yieldDef
      ? `${yieldDef.name} ×${habitatYield.quantity}/dia`
      : null,
    companionAvailable: species.capturable,
  };
}

export function getBestiaryEntries(state: GameState, biomeId: BiomeId): BestiaryEntryView[] {
  return listBestiarySpecies(biomeId).map((speciesId, slot) => (
    getBestiaryEntry(state, biomeId, speciesId, slot)
  ));
}

export function getBestiaryProgress(
  state: GameState,
  biomeId?: BiomeId,
): BestiaryProgress {
  const speciesIds = biomeId
    ? listBestiarySpecies(biomeId)
    : BIOME_ORDER.flatMap((id) => listBestiarySpecies(id));
  return {
    discovered: speciesIds.filter((id) => isBestiarySpeciesDiscovered(state, id)).length,
    total: speciesIds.length,
  };
}
