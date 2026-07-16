import { SPECIES } from './creatures.ts';
import type { SpeciesDef } from '../types.ts';

export const FOREST_SPECIES: SpeciesDef[] = [
  SPECIES.lumimorcego,
  SPECIES.esporo_dorminhoco,
  SPECIES.carapaca_musgo,
];

export { generateDungeon } from '../world/dungeonGenerator.ts';
export type { DungeonLayout, DungeonEnemySpawn } from '../world/dungeonGenerator.ts';
