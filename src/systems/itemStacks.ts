import type { BagEntry, LootItem } from '../types.ts';

export type ItemSlot = BagEntry | LootItem | null;

export function isSameLoot(a: LootItem, b: LootItem): boolean {
  return a.id === b.id;
}

/** Adiciona loot em uma coleção de slots, priorizando uma pilha existente. */
export function addLootToSlots(
  slots: ItemSlot[],
  loot: LootItem,
  requestedQuantity = loot.quantity,
): number {
  const quantity = Math.max(0, Math.min(requestedQuantity, loot.quantity));
  if (quantity <= 0) return 0;

  const existing = slots.find(
    (entry): entry is LootItem => entry?.kind === 'loot' && isSameLoot(entry, loot),
  );
  if (existing) {
    existing.quantity += quantity;
    return quantity;
  }

  const emptyIndex = slots.findIndex((entry) => entry === null);
  if (emptyIndex < 0) return 0;
  slots[emptyIndex] = { ...loot, quantity };
  return quantity;
}

/** Consolida pilhas duplicadas sem alterar a ordem relativa de criaturas/itens distintos. */
export function normalizeItemStacks<T extends ItemSlot>(
  source: readonly T[] | undefined,
  slotCount: number,
): ItemSlot[] {
  const result: ItemSlot[] = Array.from({ length: slotCount }, () => null);
  if (!source) return result;

  for (const entry of source) {
    if (!entry) continue;
    if (entry.kind === 'loot') {
      addLootToSlots(result, { ...entry }, entry.quantity);
      continue;
    }
    const emptyIndex = result.findIndex((slot) => slot === null);
    if (emptyIndex < 0) break;
    result[emptyIndex] = { ...entry };
  }
  return result;
}

export function clampTransferQuantity(requested: number, available: number): number {
  if (!Number.isFinite(requested)) return available;
  return Math.max(1, Math.min(Math.floor(requested), available));
}
