import type { GameState } from '../types.ts';
import { canUpgradeShop, getNextShopLevel, getShopLevelDef } from './shopUpgrade.ts';
import { resizeShopForLevel } from './saveManager.ts';

export function tryUpgradeShop(state: GameState): { ok: boolean; message: string } {
  const next = getNextShopLevel(state.shopLevel);
  if (!next) return { ok: false, message: 'Loja já está no nível máximo.' };
  if (!canUpgradeShop(state.gold, state.shopLevel)) {
    return { ok: false, message: `Precisa de ${next.upgradeCost} ouro para ${next.label}.` };
  }

  state.gold -= next.upgradeCost;
  resizeShopForLevel(state, next.level);
  const def = getShopLevelDef(next.level);
  return {
    ok: true,
    message: `Loja nível ${def.level} — ${def.label}! ${def.shelfCount} prateleiras, ${def.cageCount} gaiolas.`,
  };
}
