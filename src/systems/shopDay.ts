import type { GameState, ShopListing } from '../types.ts';
import {
  customerBuysListing,
  pickListingForCustomer,
  rollCustomerArchetype,
  salePriceForCustomer,
  type CustomerArchetype,
} from './customers.ts';
import { getPriceTier, getPriceTierLabel, type PriceTier } from './pricing.ts';
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

  for (let i = 0; i < customerCount; i++) {
    const available = listings.filter((l) => {
      const ref = listingSlotRef(l);
      const key = `${ref.slotKind}:${ref.slotIndex}`;
      return !taken.has(key);
    });
    if (available.length === 0) break;

    const archetype = rollCustomerArchetype(rng);
    const listing = pickListingForCustomer(archetype.id, available, rng);
    if (!listing) continue;

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
): void {
  if (!sale.willBuy) return;
  state.gold += sale.paidPrice;
  if (sale.slotKind === 'cage') {
    state.shopCages[sale.slotIndex] = null;
  } else {
    state.shopShelves[sale.slotIndex] = null;
  }
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
