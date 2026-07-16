import type { BagEntry, GameState } from '../types.ts';
import { getPriceTier, getPriceTierLabel } from '../systems/pricing.ts';
import { getNextShopLevel, getShopLevelDef } from '../systems/shopUpgrade.ts';

export interface ShopUICallbacks {
  getState: () => GameState;
  onChange: () => void;
  showToast: (msg: string) => void;
  onBack: () => void;
  onOpenShopDay: () => void;
  onUpgradeShop: () => void;
  onBagSelect: (bagIndex: number) => void;
  getSelectedBag: () => number;
}

export class ShopUI {
  private priceTarget: { type: 'shelf' | 'cage'; index: number; entry: BagEntry } | null = null;
  private draftPrice = 50;
  private cb: ShopUICallbacks;

  constructor(cb: ShopUICallbacks) {
    this.cb = cb;
    document.getElementById('btn-shop-back')?.addEventListener('click', () => this.cb.onBack());
    document.getElementById('btn-shop-open')?.addEventListener('click', () => this.cb.onOpenShopDay());
    document.getElementById('btn-shop-upgrade')?.addEventListener('click', () => this.cb.onUpgradeShop());
    document.getElementById('price-up')?.addEventListener('click', () => this.adjustPrice(5));
    document.getElementById('price-down')?.addEventListener('click', () => this.adjustPrice(-5));
    document.getElementById('price-confirm')?.addEventListener('click', () => this.confirmPrice());
    document.getElementById('price-cancel')?.addEventListener('click', () => this.closePriceModal());
  }

  render(): void {
    const state = this.cb.getState();
    const def = getShopLevelDef(state.shopLevel);
    const next = getNextShopLevel(state.shopLevel);

    const goldEl = document.getElementById('shop-gold');
    if (goldEl) goldEl.textContent = `Ouro: ${state.gold}`;

    const levelEl = document.getElementById('shop-level');
    if (levelEl) {
      levelEl.textContent = `Nível ${def.level} — ${def.label}`;
    }

    const upgradeBtn = document.getElementById('btn-shop-upgrade') as HTMLButtonElement | null;
    if (upgradeBtn) {
      if (next) {
        upgradeBtn.textContent = `Melhorar (${next.upgradeCost}g)`;
        upgradeBtn.disabled = state.gold < next.upgradeCost;
        upgradeBtn.classList.remove('hidden');
      } else {
        upgradeBtn.classList.add('hidden');
      }
    }

    const openBtn = document.getElementById('btn-shop-open') as HTMLButtonElement | null;
    if (openBtn) {
      openBtn.textContent = 'Abrir loja ao público';
    }

    this.renderBagStrip();
  }

  openPriceModal(kind: 'shelf' | 'cage', index: number): void {
    const state = this.cb.getState();
    const listing = kind === 'cage' ? state.shopCages[index] : state.shopShelves[index];
    if (!listing) return;
    this.priceTarget = { type: kind, index, entry: listing.entry };
    this.draftPrice = listing.price;

    const modal = document.getElementById('price-modal');
    const title = document.getElementById('price-modal-title');
    const hint = document.getElementById('price-modal-hint');
    const value = document.getElementById('price-value');
    if (title) title.textContent = `Preço: ${formatEntry(listing.entry)}`;
    if (hint) hint.textContent = `Valor base: ~${listing.entry.baseValue} ouro`;
    if (value) value.textContent = String(this.draftPrice);
    this.updatePricePreview();
    modal?.classList.remove('hidden');
  }

  setHint(text: string): void {
    const el = document.getElementById('shop-hint');
    if (el) el.textContent = text;
  }

  setShopDayBusy(busy: boolean): void {
    const openBtn = document.getElementById('btn-shop-open') as HTMLButtonElement | null;
    if (openBtn) openBtn.disabled = busy;
  }

  private renderBagStrip(): void {
    const container = document.getElementById('shop-bag-strip');
    if (!container) return;
    container.innerHTML = '';
    const state = this.cb.getState();
    const selected = this.cb.getSelectedBag();

    state.bag.forEach((entry, index) => {
      if (!entry) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bag-chip';
      if (index === selected) btn.classList.add('selected');
      btn.textContent = formatEntry(entry);
      btn.title = 'Selecionar para colocar na loja';
      btn.addEventListener('click', () => {
        const next = index === selected ? -1 : index;
        this.cb.onBagSelect(next);
        this.renderBagStrip();
      });
      container.appendChild(btn);
    });

    if (!container.children.length) {
      container.innerHTML = '<span class="empty">Bolsa vazia</span>';
    }
  }

  private closePriceModal(): void {
    document.getElementById('price-modal')?.classList.add('hidden');
    this.priceTarget = null;
  }

  private adjustPrice(delta: number): void {
    this.draftPrice = Math.max(1, this.draftPrice + delta);
    const value = document.getElementById('price-value');
    if (value) value.textContent = String(this.draftPrice);
    this.updatePricePreview();
  }

  private updatePricePreview(): void {
    if (!this.priceTarget) return;
    const preview = document.getElementById('price-preview');
    if (preview) {
      preview.textContent = getPriceTierLabel(getPriceTier(this.draftPrice, this.priceTarget.entry.baseValue));
    }
  }

  private confirmPrice(): void {
    if (!this.priceTarget) return;
    const state = this.cb.getState();
    if (this.priceTarget.type === 'cage') {
      const listing = state.shopCages[this.priceTarget.index];
      if (listing) listing.price = this.draftPrice;
    } else {
      const listing = state.shopShelves[this.priceTarget.index];
      if (listing) listing.price = this.draftPrice;
    }
    this.cb.onChange();
    this.closePriceModal();
    this.render();
  }
}

function formatEntry(entry: BagEntry): string {
  if (entry.kind === 'loot') return `${entry.name} x${entry.quantity}`;
  return entry.name;
}
