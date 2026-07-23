import type { GameState, ShopListing } from '../types.ts';
import {
  customerArchetypesForReputation,
  customerBuysListing,
  customerInterested,
  pickListingForCustomer,
  rollCustomerFromPool,
  salePriceForCustomer,
  type CustomerArchetype,
} from './customers.ts';
import { getPriceTier, getPriceTierLabel, type PriceTier } from './pricing.ts';
import { getReputationLevel, recordShopGold, type ReputationLevelUp } from './reputation.ts';
import { getShopLevelDef } from './shopUpgrade.ts';

export interface ShopDayLogLine {
  text: string;
}

export interface ShopDayResult {
  goldEarned: number;
  logs: ShopDayLogLine[];
}

export interface ShopCustomerPlan {
  archetype: CustomerArchetype;
  slotKind: 'shelf' | 'cage';
  slotIndex: number;
  paidPrice: number;
  willBuy: boolean;
  tier: PriceTier;
  tierLabel: string;
}

function activeListings(state: GameState): ShopListing[] {
  return [
    ...state.shopShelves.filter((s): s is ShopListing => s !== null),
    ...state.shopCages.filter((c): c is ShopListing => c !== null),
  ];
}

function listingSlotRef(listing: ShopListing): { slotKind: 'shelf' | 'cage'; slotIndex: number } {
  return {
    slotKind: listing.isCage ? 'cage' : 'shelf',
    slotIndex: listing.slotIndex,
  };
}

function tierEmoji(tier: PriceTier): string {
  switch (tier) {
    case 'bargain':
      return '😄';
    case 'perfect':
      return '😊';
    case 'expensive':
      return '😐';
    case 'refuse':
      return '😠';
  }
}

export function planEmoji(plan: ShopCustomerPlan): string {
  return tierEmoji(plan.tier);
}

export function planShopDay(state: GameState, rng: () => number = Math.random): ShopCustomerPlan[] {
  const plans: ShopCustomerPlan[] = [];
  const listings = activeListings(state);
  if (listings.length === 0) return plans;

  const levelDef = getShopLevelDef(state.shopLevel);
  const customerCount = 3 + levelDef.level;
  const taken = new Set<string>();
  const visitCounts = new Map<string, number>();
  const archetypes = customerArchetypesForReputation(getReputationLevel(state.shopGoldSold));

  for (let i = 0; i < customerCount; i++) {
    const available = listings.filter((l) => {
      const ref = listingSlotRef(l);
      const key = `${ref.slotKind}:${ref.slotIndex}`;
      return !taken.has(key);
    });
    if (available.length === 0) break;

    const compatible = archetypes.filter((candidate) =>
      (visitCounts.get(candidate.id) ?? 0) < 2
      && available.some((listing) => customerInterested(candidate.id, listing.entry)),
    );
    if (compatible.length === 0) break;

    // Todos os tipos compatíveis visitam a loja antes de qualquer repetição.
    const unseen = compatible.filter((candidate) => !visitCounts.has(candidate.id));
    const archetype = rollCustomerFromPool(unseen.length > 0 ? unseen : compatible, rng);
    const listing = pickListingForCustomer(archetype.id, available, rng);
    if (!listing) continue;
    visitCounts.set(archetype.id, (visitCounts.get(archetype.id) ?? 0) + 1);

    const paidPrice = salePriceForCustomer(archetype.id, listing.price);
    const tier = getPriceTier(paidPrice, listing.entry.baseValue);
    const willBuy = customerBuysListing(archetype.id, listing, rng);
    const { slotKind, slotIndex } = listingSlotRef(listing);

    if (willBuy) {
      taken.add(`${slotKind}:${slotIndex}`);
    }

    plans.push({
      archetype,
      slotKind,
      slotIndex,
      paidPrice,
      willBuy,
      tier,
      tierLabel: getPriceTierLabel(tier),
    });
  }

  return plans;
}

export function applyShopSale(
  state: GameState,
  sale: Pick<ShopCustomerPlan, 'slotKind' | 'slotIndex' | 'paidPrice' | 'willBuy'>,
): ReputationLevelUp | null {
  if (!sale.willBuy) return null;
  state.gold += sale.paidPrice;
  const levelUp = recordShopGold(state, sale.paidPrice);
  if (sale.slotKind === 'cage') {
    state.shopCages[sale.slotIndex] = null;
  } else {
    state.shopShelves[sale.slotIndex] = null;
  }
  return levelUp;
}

export function runShopDay(state: GameState, rng: () => number = Math.random): ShopDayResult {
  const logs: ShopDayLogLine[] = [];
  const plans = planShopDay(state, rng);
  let goldEarned = 0;

  if (plans.length === 0 && activeListings(state).length === 0) {
    return { goldEarned: 0, logs: [{ text: 'Nenhum item exposto — dia sem clientes.' }] };
  }

  for (const plan of plans) {
    if (plan.willBuy) {
      applyShopSale(state, plan);
      goldEarned += plan.paidPrice;
    }
    const verb = plan.willBuy ? 'comprou' : 'recusou';
    logs.push({
      text: `${plan.archetype.emoji} ${plan.archetype.label} ${verb} (${plan.paidPrice}g) — ${plan.tierLabel}`,
    });
  }

  if (goldEarned === 0 && plans.length > 0) {
    logs.push({ text: 'Dia fraco — ajuste preços ou estoque amanhã.' });
  }

  return { goldEarned, logs };
}
