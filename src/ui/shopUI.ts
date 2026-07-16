import type { BagEntry, GameState, ShopListing } from '../types.ts';
import { getPriceTier, getPriceTierLabel } from '../systems/pricing.ts';

export interface ShopUICallbacks {
  getState: () => GameState;
  onChange: () => void;
  showToast: (msg: string) => void;
  onBack: () => void;
  runShopDay: () => void;
}

export class ShopUI {
  private priceTarget: { type: 'shelf' | 'cage'; index?: number; entry: BagEntry } | null = null;
  private draftPrice = 50;
  private cb: ShopUICallbacks;

  constructor(cb: ShopUICallbacks) {
    this.cb = cb;
    document.getElementById('btn-shop-back')?.addEventListener('click', () => this.cb.onBack());
    document.getElementById('btn-shop-open')?.addEventListener('click', () => this.cb.runShopDay());
    document.getElementById('price-up')?.addEventListener('click', () => this.adjustPrice(5));
    document.getElementById('price-down')?.addEventListener('click', () => this.adjustPrice(-5));
    document.getElementById('price-confirm')?.addEventListener('click', () => this.confirmPrice());
    document.getElementById('price-cancel')?.addEventListener('click', () => this.closePriceModal());
  }

  render(): void {
    const state = this.cb.getState();
    const goldEl = document.getElementById('shop-gold');
    if (goldEl) goldEl.textContent = `Ouro: ${state.gold}`;

    this.renderDepot();
    this.renderShelves();
    this.renderCage();
  }

  private renderDepot(): void {
    const container = document.getElementById('shop-depot-items');
    if (!container) return;
    container.innerHTML = '';
    const state = this.cb.getState();

    state.bag.forEach((entry, index) => {
      if (!entry) return;
      const btn = document.createElement('button');
      btn.className = 'depot-item';
      btn.textContent = formatEntry(entry);
      btn.title = 'Clique para colocar na prateleira ou gaiola';
      btn.addEventListener('click', () => this.placeFromBag(index, entry));
      container.appendChild(btn);
    });

    if (!container.children.length) {
      container.innerHTML = '<p class="empty">Bolsa vazia — explore a masmorra!</p>';
    }
  }

  private renderShelves(): void {
    const container = document.getElementById('shelf-slots');
    if (!container) return;
    container.innerHTML = '';
    const state = this.cb.getState();

    state.shopShelves.forEach((listing, i) => {
      const slot = document.createElement('div');
      slot.className = 'shop-slot';
      if (listing) {
        slot.innerHTML = `<strong>${formatEntry(listing.entry)}</strong><br>${listing.price}g`;
        slot.addEventListener('click', () => this.openPriceModal('shelf', i, listing.entry, listing.price));
        const remove = document.createElement('button');
        remove.textContent = 'Remover';
        remove.addEventListener('click', (e) => {
          e.stopPropagation();
          this.returnToBag(listing);
          state.shopShelves[i] = null;
          this.cb.onChange();
          this.render();
        });
        slot.appendChild(remove);
      } else {
        slot.textContent = `Prateleira ${i + 1} (vazia)`;
      }
      container.appendChild(slot);
    });
  }

  private renderCage(): void {
    const cage = document.getElementById('cage-slot');
    if (!cage) return;
    const state = this.cb.getState();
    cage.innerHTML = '';

    if (state.shopCage) {
      const listing = state.shopCage;
      cage.innerHTML = `<strong>${formatEntry(listing.entry)}</strong><br>${listing.price}g`;
      cage.addEventListener('click', () => this.openPriceModal('cage', 0, listing.entry, listing.price));
      const remove = document.createElement('button');
      remove.textContent = 'Remover';
      remove.addEventListener('click', (e) => {
        e.stopPropagation();
        this.returnToBag(listing);
        state.shopCage = null;
        this.cb.onChange();
        this.render();
      });
      cage.appendChild(remove);
    } else {
      cage.textContent = 'Gaiola vazia — coloque uma criatura da bolsa';
    }
  }

  private placeFromBag(bagIndex: number, entry: BagEntry): void {
    const state = this.cb.getState();

    if (entry.kind === 'creature') {
      if (state.shopCage) {
        this.cb.showToast('Gaiola já ocupada');
        return;
      }
      state.bag[bagIndex] = null;
      state.shopCage = {
        entry,
        price: entry.baseValue,
        slotIndex: 0,
        isCage: true,
      };
      this.cb.onChange();
      this.render();
      this.openPriceModal('cage', 0, entry, entry.baseValue);
      return;
    }

    const emptyShelf = state.shopShelves.findIndex((s) => s === null);
    if (emptyShelf === -1) {
      this.cb.showToast('Prateleiras cheias');
      return;
    }
    state.bag[bagIndex] = null;
    state.shopShelves[emptyShelf] = {
      entry,
      price: entry.baseValue,
      slotIndex: emptyShelf,
      isCage: false,
    };
    this.cb.onChange();
    this.render();
    this.openPriceModal('shelf', emptyShelf, entry, entry.baseValue);
  }

  private returnToBag(listing: ShopListing): void {
    const state = this.cb.getState();
    const idx = state.bag.findIndex((s) => s === null);
    if (idx === -1) {
      this.cb.showToast('Bolsa cheia — não pode remover');
      return;
    }
    state.bag[idx] = listing.entry;
  }

  private openPriceModal(type: 'shelf' | 'cage', index: number, entry: BagEntry, price: number): void {
    this.priceTarget = { type, index, entry };
    this.draftPrice = price;
    const modal = document.getElementById('price-modal');
    const title = document.getElementById('price-modal-title');
    const hint = document.getElementById('price-modal-hint');
    const value = document.getElementById('price-value');
    if (title) title.textContent = `Preço: ${formatEntry(entry)}`;
    if (hint) hint.textContent = `Valor base: ~${entry.baseValue} ouro`;
    if (value) value.textContent = String(this.draftPrice);
    this.updatePricePreview();
    modal?.classList.remove('hidden');
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
    if (this.priceTarget.type === 'cage' && state.shopCage) {
      state.shopCage.price = this.draftPrice;
    } else if (this.priceTarget.type === 'shelf' && this.priceTarget.index !== undefined) {
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
