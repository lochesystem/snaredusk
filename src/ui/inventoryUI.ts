import type { BagEntry, GameState } from '../types.ts';
import { discardBagSlot, formatBagEntry } from '../systems/inventory.ts';
import { formatSpecialItem } from '../systems/dungeonSpecial.ts';

export interface InventoryUICallbacks {
  getState: () => GameState;
  onChange: () => void;
  showToast: (msg: string) => void;
}

type InventoryTab = 'loot' | 'special';

function slotIcon(entry: BagEntry): string {
  if (entry.kind === 'creature') return '🐾';
  return '◆';
}

function shortLabel(name: string, max = 10): string {
  if (name.length <= max) return name;
  return `${name.slice(0, max - 1)}…`;
}

function renderLootGrid(
  container: HTMLElement,
  state: GameState,
  cb: InventoryUICallbacks,
  compact: boolean,
): void {
  container.innerHTML = '';

  state.bag.forEach((entry, index) => {
    const slot = document.createElement('div');
    slot.className = 'inv-slot';
    if (!entry) slot.classList.add('empty');
    else if (entry.kind === 'creature') slot.classList.add('creature');
    else slot.classList.add('loot');

    const indexLabel = document.createElement('span');
    indexLabel.className = 'inv-slot-index';
    indexLabel.textContent = String(index + 1);
    slot.appendChild(indexLabel);

    if (entry) {
      const icon = document.createElement('span');
      icon.className = 'inv-slot-icon';
      icon.textContent = slotIcon(entry);
      slot.appendChild(icon);

      const label = document.createElement('span');
      label.className = 'inv-slot-label';
      label.textContent = shortLabel(entry.name);
      label.title = formatBagEntry(entry);
      slot.appendChild(label);

      if (entry.kind === 'loot' && entry.quantity > 1) {
        const qty = document.createElement('span');
        qty.className = 'inv-slot-qty';
        qty.textContent = `×${entry.quantity}`;
        slot.appendChild(qty);
      }

      const discard = document.createElement('button');
      discard.type = 'button';
      discard.className = 'inv-discard-btn';
      discard.textContent = '×';
      discard.title = 'Descartar tudo';
      discard.addEventListener('click', (e) => {
        e.stopPropagation();
        const result = discardBagSlot(state, index, 'all');
        if (result.ok) {
          cb.onChange();
          cb.showToast(result.message);
          renderLootGrid(container, cb.getState(), cb, compact);
        }
      });
      slot.appendChild(discard);

      if (entry.kind === 'loot' && entry.quantity > 1) {
        const minusOne = document.createElement('button');
        minusOne.type = 'button';
        minusOne.className = 'inv-discard-one';
        minusOne.textContent = '−1';
        minusOne.title = 'Descartar 1 unidade';
        minusOne.addEventListener('click', (e) => {
          e.stopPropagation();
          const result = discardBagSlot(state, index, 'one');
          if (result.ok) {
            cb.onChange();
            cb.showToast(result.message);
            renderLootGrid(container, cb.getState(), cb, compact);
          }
        });
        slot.appendChild(minusOne);
      }
    } else {
      const emptyLabel = document.createElement('span');
      emptyLabel.className = 'inv-slot-empty-label';
      emptyLabel.textContent = compact ? '—' : 'Vazio';
      slot.appendChild(emptyLabel);
    }

    container.appendChild(slot);
  });
}

function renderSpecialGrid(
  container: HTMLElement,
  state: GameState,
  compact: boolean,
): void {
  container.innerHTML = '';

  state.dungeonSpecial.forEach((entry, index) => {
    const slot = document.createElement('div');
    slot.className = 'inv-slot special';
    if (!entry) slot.classList.add('empty');

    const indexLabel = document.createElement('span');
    indexLabel.className = 'inv-slot-index';
    indexLabel.textContent = `★${index + 1}`;
    slot.appendChild(indexLabel);

    if (entry) {
      const icon = document.createElement('span');
      icon.className = 'inv-slot-icon';
      icon.textContent = '🗝';
      slot.appendChild(icon);

      const label = document.createElement('span');
      label.className = 'inv-slot-label';
      label.textContent = shortLabel(entry.name, 12);
      label.title = formatSpecialItem(entry);
      slot.appendChild(label);
    } else {
      const emptyLabel = document.createElement('span');
      emptyLabel.className = 'inv-slot-empty-label';
      emptyLabel.textContent = compact ? '—' : 'Vazio';
      slot.appendChild(emptyLabel);
    }

    container.appendChild(slot);
  });
}

function setInventoryTab(rootId: string, tab: InventoryTab): void {
  const root = document.getElementById(rootId);
  if (!root) return;
  root.querySelectorAll<HTMLButtonElement>('.inventory-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  const lootGrid = root.querySelector<HTMLElement>('[data-inventory-panel="loot"]');
  const specialGrid = root.querySelector<HTMLElement>('[data-inventory-panel="special"]');
  const hint = root.querySelector<HTMLElement>('.inventory-tab-hint');
  if (lootGrid) lootGrid.classList.toggle('hidden', tab !== 'loot');
  if (specialGrid) specialGrid.classList.toggle('hidden', tab !== 'special');
  if (hint) {
    hint.textContent =
      tab === 'loot'
        ? 'Loot e criaturas — ocupam os 12 slots.'
        : 'Itens especiais da expedição — não ocupam slots. Somem ao voltar à base.';
  }
}

function bindInventoryTabs(rootId: string, cb: InventoryUICallbacks, compact: boolean): void {
  const root = document.getElementById(rootId);
  if (!root) return;

  root.querySelectorAll<HTMLButtonElement>('.inventory-tab').forEach((btn) => {
    btn.onclick = () => {
      const tab = btn.dataset.tab as InventoryTab;
      setInventoryTab(rootId, tab);
      const lootContainer = root.querySelector<HTMLElement>('[data-inventory-panel="loot"]');
      const specialContainer = root.querySelector<HTMLElement>('[data-inventory-panel="special"]');
      const state = cb.getState();
      if (lootContainer) renderLootGrid(lootContainer, state, cb, compact);
      if (specialContainer) renderSpecialGrid(specialContainer, state, compact);
    };
  });
}

export function renderInventoryPanel(
  rootId: string,
  lootGridId: string,
  specialGridId: string,
  cb: InventoryUICallbacks,
  options?: { compact?: boolean },
): void {
  const compact = options?.compact ?? false;
  const lootContainer = document.getElementById(lootGridId);
  const specialContainer = document.getElementById(specialGridId);
  if (!lootContainer || !specialContainer) return;

  const state = cb.getState();
  renderLootGrid(lootContainer, state, cb, compact);
  renderSpecialGrid(specialContainer, state, compact);
  bindInventoryTabs(rootId, cb, compact);
  setInventoryTab(rootId, 'loot');
}

/** @deprecated use renderInventoryPanel */
export function renderInventoryGrid(
  containerId: string,
  cb: InventoryUICallbacks,
  options?: { compact?: boolean },
): void {
  const container = document.getElementById(containerId);
  if (!container) return;
  renderLootGrid(container, cb.getState(), cb, options?.compact ?? false);
}

export function bindInventoryModal(): void {
  document.getElementById('inventory-modal-close')?.addEventListener('click', () => {
    document.getElementById('inventory-modal')?.classList.add('hidden');
  });
}

export function openInventoryModal(cb: InventoryUICallbacks): void {
  renderInventoryPanel('inventory-modal-root', 'inventory-modal-grid', 'inventory-modal-special', cb, {
    compact: true,
  });
  document.getElementById('inventory-modal')?.classList.remove('hidden');
}

export function closeInventoryModal(): void {
  document.getElementById('inventory-modal')?.classList.add('hidden');
}

export function isInventoryModalOpen(): boolean {
  const modal = document.getElementById('inventory-modal');
  return modal ? !modal.classList.contains('hidden') : false;
}

export function refreshOpenInventory(cb: InventoryUICallbacks): void {
  if (isInventoryModalOpen()) {
    openInventoryModal(cb);
    return;
  }
  renderInventoryPanel('inventory-panel', 'inventory-grid', 'inventory-special-grid', cb);
}
