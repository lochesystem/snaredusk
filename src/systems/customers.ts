import type { BagEntry, ShopListing } from '../types.ts';
import { getPriceTier, type PriceTier } from './pricing.ts';
import { bagEntryTotalValue } from './inventory.ts';

export type CustomerArchetypeId =
  | 'morador'
  | 'minerador'
  | 'colecionador'
  | 'crianca'
  | 'rico'
  | 'viajante';

export interface CustomerArchetype {
  id: CustomerArchetypeId;
  label: string;
  weight: number;
  emoji: string;
}

export const CUSTOMER_ARCHETYPES: CustomerArchetype[] = [
  { id: 'morador', label: 'Morador', weight: 40, emoji: '🏠' },
  { id: 'minerador', label: 'Minerador', weight: 20, emoji: '⛏️' },
  { id: 'colecionador', label: 'Colecionador', weight: 10, emoji: '🔮' },
  { id: 'crianca', label: 'Criança', weight: 15, emoji: '🧒' },
  { id: 'rico', label: 'Rico', weight: 10, emoji: '💎' },
  { id: 'viajante', label: 'Mercador viajante', weight: 5, emoji: '🎒' },
];

export function rollCustomerArchetype(
  rng: () => number = Math.random,
  reputationLevel = 1,
): CustomerArchetype {
  return rollCustomerFromPool(customerArchetypesForReputation(reputationLevel), rng);
}

export function rollCustomerFromPool(
  archetypes: CustomerArchetype[],
  rng: () => number = Math.random,
): CustomerArchetype {
  if (archetypes.length === 0) return CUSTOMER_ARCHETYPES[0]!;
  const total = archetypes.reduce((s, c) => s + c.weight, 0);
  let roll = rng() * total;
  for (const archetype of archetypes) {
    roll -= archetype.weight;
    if (roll <= 0) return archetype;
  }
  return archetypes[0]!;
}

export function customerArchetypesForReputation(reputationLevel: number): CustomerArchetype[] {
  if (reputationLevel < 3) return CUSTOMER_ARCHETYPES;
  return CUSTOMER_ARCHETYPES.map((a) =>
    a.id === 'colecionador' ? { ...a, weight: 20 } : a,
  );
}

export function customerInterested(archetypeId: CustomerArchetypeId, entry: BagEntry): boolean {
  switch (archetypeId) {
    case 'morador':
    case 'rico':
      return true;
    case 'minerador':
      return entry.kind === 'loot';
    case 'colecionador':
      return entry.baseValue >= 40;
    case 'crianca':
      return entry.kind === 'creature';
    case 'viajante':
      return entry.kind === 'loot';
    default:
      return true;
  }
}

function buyChanceForTier(tier: PriceTier, archetypeId: CustomerArchetypeId, rng: () => number): boolean {
  if (tier === 'refuse') {
    if (archetypeId === 'rico') return rng() < 0.35;
    return false;
  }
  if (tier === 'expensive') {
    if (archetypeId === 'rico') return rng() < 0.75;
    return rng() < 0.4;
  }
  if (tier === 'perfect') return rng() < 0.82;
  return rng() < 0.95;
}

export function customerWillBuy(
  archetypeId: CustomerArchetypeId,
  price: number,
  baseValue: number,
  rng: () => number = Math.random,
): boolean {
  const tier = getPriceTier(price, baseValue);
  return buyChanceForTier(tier, archetypeId, rng);
}

export function pickListingForCustomer(
  archetypeId: CustomerArchetypeId,
  listings: ShopListing[],
  rng: () => number = Math.random,
): ShopListing | null {
  const interested = listings.filter((l) => customerInterested(archetypeId, l.entry));
  if (interested.length === 0) return null;
  return interested[Math.floor(rng() * interested.length)] ?? null;
}

export function salePriceForCustomer(
  archetypeId: CustomerArchetypeId,
  listingPrice: number,
): number {
  if (archetypeId === 'viajante') return Math.max(1, Math.floor(listingPrice * 0.85));
  if (archetypeId === 'crianca' && listingPrice > 0) {
    // Orçamento baixo — não compra itens muito caros (proxy simples)
    return listingPrice;
  }
  return listingPrice;
}

export function customerBuysListing(
  archetypeId: CustomerArchetypeId,
  listing: ShopListing,
  rng: () => number = Math.random,
): boolean {
  if (!customerInterested(archetypeId, listing.entry)) return false;
  const price = salePriceForCustomer(archetypeId, listing.price);
  const referenceValue = bagEntryTotalValue(listing.entry);
  if (archetypeId === 'crianca' && price > referenceValue * 1.2) return false;
  return customerWillBuy(archetypeId, price, referenceValue, rng);
}
