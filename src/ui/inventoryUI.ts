import type { BagEntry, GameState } from '../types.ts';
import { discardBagSlot, formatBagEntry } from '../systems/inventory.ts';

export interface InventoryUICallbacks {
  getState: () => GameState;
  onChange: () => void;
  showToast: (msg: string) => void;
}

function slotIcon(entry: BagEntry): string {
  if (entry.kind === 'creature') return '🐾';
  return '◆';
}

function shortLabel(entry: BagEntry): string {
  const name = entry.kind === 'creature' ? entry.name : entry.name;
  const max = 10;
  if (name.length <= max) return name;
  return `${name.slice(0, max - 1)}…`;
}

/** Renderiza grade 4×3 da bolsa com botões de descarte. */
export function renderInventoryGrid(
  containerId: string,
  cb: InventoryUICallbacks,
  options?: { compact?: boolean },
): void {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';
  const state = cb.getState();
  const compact = options?.compact ?? false;

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
      label.textContent = shortLabel(entry);
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
          renderInventoryGrid(containerId, cb, options);
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
            renderInventoryGrid(containerId, cb, options);
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

export function bindInventoryModal(): void {
  document.getElementById('inventory-modal-close')?.addEventListener('click', () => {
    document.getElementById('inventory-modal')?.classList.add('hidden');
  });
}

export function openInventoryModal(cb: InventoryUICallbacks): void {
  renderInventoryGrid('inventory-modal-grid', cb, { compact: true });
  document.getElementById('inventory-modal')?.classList.remove('hidden');
}

export function closeInventoryModal(): void {
  document.getElementById('inventory-modal')?.classList.add('hidden');
}

export function isInventoryModalOpen(): boolean {
  const modal = document.getElementById('inventory-modal');
  return modal ? !modal.classList.contains('hidden') : false;
}
