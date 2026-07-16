import { ORB_BUNDLE_PRICE, ORB_BUNDLE_QTY, ORB_PRICE } from '../engine/constants.ts';
import type { GameState } from '../types.ts';

export type OrbPurchasePack = 'single' | 'bundle';

export function orbPackCost(pack: OrbPurchasePack): number {
  return pack === 'bundle' ? ORB_BUNDLE_PRICE : ORB_PRICE;
}

export function orbPackQuantity(pack: OrbPurchasePack): number {
  return pack === 'bundle' ? ORB_BUNDLE_QTY : 1;
}

export function canBuyOrbPack(state: GameState, pack: OrbPurchasePack): boolean {
  return state.gold >= orbPackCost(pack);
}

export function buyOrbPack(state: GameState, pack: OrbPurchasePack): boolean {
  const cost = orbPackCost(pack);
  if (state.gold < cost) return false;
  state.gold -= cost;
  state.orbs += orbPackQuantity(pack);
  return true;
}
