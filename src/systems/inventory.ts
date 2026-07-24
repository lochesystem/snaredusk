import type { BagEntry, GameState, LootItem } from '../types.ts';

export function formatBagEntry(entry: BagEntry): string {
  if (entry.kind === 'loot') {
    return entry.quantity > 1 ? `${entry.name} ×${entry.quantity}` : entry.name;
  }
  return entry.nickname ? `${entry.name} (${entry.nickname})` : entry.name;
}

export function bagEntryTotalValue(entry: BagEntry): number {
  return entry.baseValue * (entry.kind === 'loot' ? entry.quantity : 1);
}

export interface DiscardResult {
  ok: boolean;
  message: string;
}

/** Remove item do slot. Loot empilhado: `one` descarta 1 unidade; `all` esvazia o slot. */
export function discardBagSlot(
  state: GameState,
  index: number,
  mode: 'one' | 'all' = 'all',
): DiscardResult {
  const entry = state.bag[index];
  if (!entry) {
    return { ok: false, message: 'Slot vazio' };
  }

  if (entry.kind === 'creature') {
    const name = entry.name;
    state.bag[index] = null;
    return { ok: true, message: `Descartou ${name}` };
  }

  const loot = entry as LootItem;
  if (mode === 'all' || loot.quantity <= 1) {
    const label = formatBagEntry(loot);
    state.bag[index] = null;
    return { ok: true, message: `Descartou ${label}` };
  }

  loot.quantity -= 1;
  return { ok: true, message: `Descartou 1× ${loot.name}` };
}
