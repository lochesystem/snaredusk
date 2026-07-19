import { LOOT_TABLE } from './items.ts';

export interface HabitatYieldDef {
  lootId: string;
  quantity: number;
}

/** Yield fixo por dia para espécies capturáveis (chefes sem entrada). */
export const HABITAT_YIELDS: Record<string, HabitatYieldDef> = {
  lumimorcego: { lootId: 'po_bioluminescente', quantity: 2 },
  carapaca_musgo: { lootId: 'fibra_musgo', quantity: 3 },
  esporo_dorminhoco: { lootId: 'fibra_musgo', quantity: 1 },
  prismarin: { lootId: 'fragmento_cristal', quantity: 1 },
  lumicascalho: { lootId: 'quartzo_bruto', quantity: 2 },
  eco_quartzo: { lootId: 'gema_rachada', quantity: 1 },
  salamandra: { lootId: 'escama_termal', quantity: 1 },
  vaporoso: { lootId: 'condensado', quantity: 2 },
  caranguejo_termal: { lootId: 'essencia_termal', quantity: 1 },
};

export function getHabitatYield(speciesId: string): HabitatYieldDef | null {
  return HABITAT_YIELDS[speciesId] ?? null;
}

export function formatYieldPerDay(speciesId: string): string | null {
  const yieldDef = getHabitatYield(speciesId);
  if (!yieldDef) return null;
  const loot = LOOT_TABLE[yieldDef.lootId];
  const name = loot?.name ?? yieldDef.lootId;
  return `+${yieldDef.quantity} ${name}/dia`;
}
