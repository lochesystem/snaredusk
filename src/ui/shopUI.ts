import type { BagEntry, GameState } from '../types.ts';
import { bagEntryTotalValue, discardBagSlot, formatBagEntry } from '../systems/inventory.ts';
import { formatReputationSummary } from '../systems/reputation.ts';
import { getNextShopLevel, getShopLevelDef } from '../systems/shopUpgrade.ts';
import { openQuantityPicker } from './quantityPicker.ts';

export interface ShopUICallbacks {
  getState: () => GameState;
  onChange: () => void;
  showToast: (msg: string) => void;
  onBack: () => void;
  onOpenShopDay: () => void;
  onUpgradeShop: () => void;
  onBagSelect: (bagIndex: number, quantity?: number) => void;
  getSelectedBag: () => number;
  getSelectedBagQuantity: () => number;
}

export class ShopUI {
  private priceTarget: { type: 'shelf' | 'cage'; index: number; entry: BagEntry } | null = null;
  private draftPrice = 50;
  private stockPanelCollapsed = false;
  private cb: ShopUICallbacks;

  constructor(cb: ShopUICallbacks) {
    this.cb = cb;
    document.getElementById('btn-shop-back')?.addEventListener('click', () => this.cb.onBack());
    document.getElementById('btn-shop-open')?.addEventListener('click', () => this.cb.onOpenShopDay());
    document.getElementById('btn-shop-upgrade')?.addEventListener('click', () => this.cb.onUpgradeShop());
    document.getElementById('btn-shop-stock-toggle')?.addEventListener('click', () => {
      this.stockPanelCollapsed = !this.stockPanelCollapsed;
      this.syncStockPanel();
    });
    document.getElementById('price-up')?.addEventListener('click', () => this.adjustPrice(5));
    document.getElementById('price-down')?.addEventListener('click', () => this.adjustPrice(-5));
    document.getElementById('price-confirm')?.addEventListener('click', () => this.confirmPrice());
    document.getElementById('price-modal-close')?.addEventListener('click', () => this.closePriceModal());
  }

  render(): void {
    const state = this.cb.getState();
    const def = getShopLevelDef(state.shopLevel);
    const next = getNextShopLevel(state.shopLevel);

    const goldEl = document.getElementById('shop-gold');
    if (goldEl) goldEl.textContent = `${state.gold} ouro`;

    const levelEl = document.getElementById('shop-level');
    if (levelEl) {
      levelEl.textContent = `Nível ${def.level} — ${def.label}`;
    }

    const repEl = document.getElementById('shop-reputation');
    if (repEl) {
      repEl.textContent = formatReputationSummary(state.shopGoldSold);
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
      if (state.shopDayUsed) {
        openBtn.disabled = true;
        openBtn.textContent = 'Loja já abriu hoje';
      } else {
        openBtn.disabled = false;
        openBtn.textContent = 'Abrir loja ao público';
      }
    }

    this.renderBagStrip();
    this.syncStockPanel();
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
    if (hint) hint.textContent = `Valor de referência do lote: ~${bagEntryTotalValue(listing.entry)} ouro`;
    if (value) value.textContent = String(this.draftPrice);
    modal?.classList.remove('hidden');
  }

  setHint(text: string): void {
    const el = document.getElementById('shop-hint');
    if (el) el.textContent = text;
  }

  setShopDayBusy(busy: boolean): void {
    const openBtn = document.getElementById('btn-shop-open') as HTMLButtonElement | null;
    if (!openBtn) return;
    const state = this.cb.getState();
    if (state.shopDayUsed) {
      openBtn.disabled = true;
      openBtn.textContent = 'Loja já abriu hoje';
      return;
    }
    openBtn.disabled = busy;
    openBtn.textContent = busy ? 'Clientes na loja…' : 'Abrir loja ao público';
  }

  private renderBagStrip(): void {
    const container = document.getElementById('shop-bag-strip');
    if (!container) return;
    container.innerHTML = '';
    const state = this.cb.getState();
    const selected = this.cb.getSelectedBag();
    const selectedQuantity = this.cb.getSelectedBagQuantity();

    state.bag.forEach((entry, index) => {
      if (!entry) return;

      const wrap = document.createElement('span');
      wrap.className = 'bag-chip-wrap';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bag-chip';
      if (index === selected) btn.classList.add('selected');
      const kind = document.createElement('span');
      kind.className = 'bag-chip-kind';
      kind.textContent = entry.kind === 'creature' ? 'Criatura' : 'Item';
      const name = document.createElement('strong');
      name.className = 'bag-chip-name';
      name.textContent = formatEntry(entry);
      const value = document.createElement('span');
      value.className = 'bag-chip-value';
      value.textContent = entry.kind === 'loot'
        ? `${entry.quantity} un. · ${entry.baseValue}g cada`
        : `${entry.baseValue}g base`;
      if (index === selected && entry.kind === 'loot') {
        const selectedQty = document.createElement('span');
        selectedQty.className = 'bag-chip-selected-qty';
        selectedQty.textContent = `Selecionado: ${selectedQuantity}`;
        btn.append(kind, name, value, selectedQty);
      } else {
        btn.append(kind, name, value);
      }
      btn.title = 'Selecionar para colocar na loja';
      btn.addEventListener('click', () => {
        if (index === selected) {
          this.cb.onBagSelect(-1);
          this.renderBagStrip();
          return;
        }
        if (entry.kind === 'loot' && entry.quantity > 1) {
          openQuantityPicker({
            title: 'Separar para a loja',
            itemName: entry.name,
            max: entry.quantity,
            actionLabel: 'Carregar lote',
            onConfirm: (quantity) => {
              this.cb.onBagSelect(index, quantity);
              this.renderBagStrip();
            },
          });
          return;
        }
        this.cb.onBagSelect(index, 1);
        this.renderBagStrip();
      });
      wrap.appendChild(btn);

      const discard = document.createElement('button');
      discard.type = 'button';
      discard.className = 'bag-chip-discard';
      discard.textContent = '×';
      discard.title = 'Descartar';
      discard.addEventListener('click', (e) => {
        e.stopPropagation();
        const result = discardBagSlot(state, index, 'all');
        if (result.ok) {
          if (index === selected) this.cb.onBagSelect(-1);
          this.cb.onChange();
          this.cb.showToast(result.message);
        }
      });
      wrap.appendChild(discard);

      container.appendChild(wrap);
    });

    if (!container.children.length) {
      container.innerHTML = '<span class="empty">Bolsa vazia</span>';
    }
  }

  private syncStockPanel(): void {
    const panel = document.getElementById('shop-stock-panel');
    const toggle = document.getElementById('btn-shop-stock-toggle');
    if (!panel || !toggle) return;

    panel.classList.toggle('is-collapsed', this.stockPanelCollapsed);
    toggle.textContent = this.stockPanelCollapsed ? 'Abrir bolsa' : 'Ocultar';
    toggle.setAttribute('aria-expanded', String(!this.stockPanelCollapsed));
    toggle.setAttribute(
      'aria-label',
      this.stockPanelCollapsed ? 'Abrir painel da bolsa' : 'Ocultar painel da bolsa',
    );
  }

  private closePriceModal(): void {
    document.getElementById('price-modal')?.classList.add('hidden');
    this.priceTarget = null;
  }

  private adjustPrice(delta: number): void {
    this.draftPrice = Math.max(1, this.draftPrice + delta);
    const value = document.getElementById('price-value');
    if (value) value.textContent = String(this.draftPrice);
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
  return formatBagEntry(entry);
}
