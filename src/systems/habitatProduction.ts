import { LOOT_TABLE } from '../data/items.ts';
import { getHabitatYield } from '../data/habitatYields.ts';
import { DEFAULT_PEN_ID } from './habitatZones.ts';
import { addToBag } from './saveManager.ts';
import type { CreatureItem, GameState, LootItem } from '../types.ts';

export interface HabitatYieldResult {
  lootId: string;
  quantity: number;
  speciesName: string;
  lootName: string;
}

export interface HabitatProductionResult {
  collected: HabitatYieldResult[];
  overflow: HabitatYieldResult[];
}

function isInValidPen(state: GameState, creature: CreatureItem): boolean {
  if (!creature.penId || creature.penId === DEFAULT_PEN_ID) return false;
  return state.base.placements.some(
    (p) => p.id === creature.penId && p.stationId === 'habitat_pen' && p.habitatZone,
  );
}

function makeLootEntry(lootId: string, quantity: number): LootItem {
  const def = LOOT_TABLE[lootId];
  return {
    kind: 'loot',
    id: lootId,
    name: def?.name ?? lootId,
    baseValue: def?.baseValue ?? 0,
    quantity,
  };
}

export function collectHabitatProduction(state: GameState): HabitatProductionResult {
  const collected: HabitatYieldResult[] = [];
  const overflow: HabitatYieldResult[] = [];

  for (const creature of state.habitat) {
    if (!isInValidPen(state, creature)) continue;

    const yieldDef = getHabitatYield(creature.speciesId);
    if (!yieldDef) continue;

    const entry = makeLootEntry(yieldDef.lootId, yieldDef.quantity);
    const resultItem: HabitatYieldResult = {
      lootId: yieldDef.lootId,
      quantity: yieldDef.quantity,
      speciesName: creature.name,
      lootName: entry.name,
    };

    if (addToBag(state, entry)) {
      collected.push(resultItem);
    } else {
      overflow.push(resultItem);
    }
  }

  return { collected, overflow };
}

export function aggregateYieldResults(
  items: HabitatYieldResult[],
): { lootName: string; quantity: number }[] {
  const map = new Map<string, { lootName: string; quantity: number }>();
  for (const item of items) {
    const prev = map.get(item.lootId);
    if (prev) {
      prev.quantity += item.quantity;
    } else {
      map.set(item.lootId, { lootName: item.lootName, quantity: item.quantity });
    }
  }
  return [...map.values()];
}
