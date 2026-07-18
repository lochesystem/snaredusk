import type { GameState } from '../types.ts';
import { findChestById, transferLootToBag, transferLootToChest } from '../systems/baseChest.ts';

export interface ChestUICallbacks {
  getState: () => GameState;
  onChange: () => void;
  showToast: (msg: string) => void;
}

let activeChestId: string | null = null;

export function openChestModal(chestId: string, callbacks: ChestUICallbacks): void {
  activeChestId = chestId;
  const modal = document.getElementById('chest-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  renderChestModal(callbacks);
}

export function closeChestModal(): void {
  activeChestId = null;
  document.getElementById('chest-modal')?.classList.add('hidden');
}

export function isChestModalOpen(): boolean {
  return !document.getElementById('chest-modal')?.classList.contains('hidden');
}

export function renderChestModal(callbacks: ChestUICallbacks): void {
  if (!activeChestId) return;
  const state = callbacks.getState();
  const chest = findChestById(state.base, activeChestId);
  if (!chest) {
    closeChestModal();
    return;
  }

  const chestGrid = document.getElementById('chest-modal-grid');
  const bagGrid = document.getElementById('chest-bag-grid');
  if (!chestGrid || !bagGrid) return;

  chestGrid.innerHTML = '';
  bagGrid.innerHTML = '';

  chest.slots.forEach((slot, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'inv-slot';
    if (slot) {
      btn.textContent = `${slot.name} ×${slot.quantity}`;
      btn.title = 'Mover para bolsa';
      btn.addEventListener('click', () => {
        if (transferLootToBag(state, chest, index)) {
          callbacks.onChange();
          renderChestModal(callbacks);
        } else {
          callbacks.showToast('Bolsa cheia');
        }
      });
    } else {
      btn.classList.add('empty');
      btn.textContent = '—';
      btn.disabled = true;
    }
    chestGrid.appendChild(btn);
  });

  state.bag.forEach((entry, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'inv-slot';
    if (entry && entry.kind === 'loot') {
      btn.textContent = `${entry.name} ×${entry.quantity}`;
      btn.title = 'Depositar no baú';
      btn.addEventListener('click', () => {
        if (transferLootToChest(state, chest, index)) {
          callbacks.onChange();
          renderChestModal(callbacks);
        } else {
          callbacks.showToast('Baú cheio ou item inválido');
        }
      });
    } else if (entry && entry.kind === 'creature') {
      btn.textContent = `🐾 ${entry.name}`;
      btn.disabled = true;
    } else {
      btn.classList.add('empty');
      btn.textContent = '—';
      btn.disabled = true;
    }
    bagGrid.appendChild(btn);
  });
}

export function bindChestModal(_callbacks: ChestUICallbacks): void {
  document.getElementById('chest-modal-close')?.addEventListener('click', () => closeChestModal());
}
