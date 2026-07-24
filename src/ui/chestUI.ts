import type { Container } from 'pixi.js';
import { getSpecies } from '../data/creatures.ts';
import type { GameState } from '../types.ts';
import { WEAPONS } from '../data/weapons.ts';
import {
  findChestById,
  transferLootToBag,
  transferLootToChest,
} from '../systems/baseChest.ts';
import { withdrawWeaponFromChest } from '../systems/weaponArmory.ts';
import { createCreatureSprite, createLootIcon, createWeaponIcon } from '../world/placeholderArt.ts';

export interface ChestUICallbacks {
  getState: () => GameState;
  onChange: () => void;
  showToast: (msg: string) => void;
  setPixiIcon?: (img: HTMLImageElement, createIcon: () => Container, cacheKey: string) => void;
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
  const weaponGrid = document.getElementById('chest-weapon-grid');
  if (!chestGrid || !bagGrid || !weaponGrid) return;

  chestGrid.innerHTML = '';
  bagGrid.innerHTML = '';
  weaponGrid.innerHTML = '';

  const appendIcon = (
    button: HTMLButtonElement,
    createIcon: () => Container,
    key: string,
    alt: string,
  ) => {
    if (!callbacks.setPixiIcon) return;
    const icon = document.createElement('img');
    icon.className = 'inv-slot-sprite';
    icon.alt = alt;
    callbacks.setPixiIcon(icon, createIcon, key);
    button.appendChild(icon);
  };

  const appendLabel = (button: HTMLButtonElement, text: string, quantity?: number) => {
    const label = document.createElement('span');
    label.className = 'inv-slot-label';
    label.textContent = text;
    button.appendChild(label);
    if (quantity === undefined) return;
    const qty = document.createElement('span');
    qty.className = 'inv-slot-qty';
    qty.textContent = String(quantity);
    button.appendChild(qty);
  };

  chest.slots.forEach((slot, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'inv-slot';
    if (slot) {
      appendIcon(btn, () => createLootIcon(slot.id), `loot-${slot.id}`, slot.name);
      appendLabel(btn, slot.name, slot.quantity);
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

  (chest.weaponSlots ?? []).forEach((weaponId, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'inv-slot';
    if (weaponId && WEAPONS[weaponId]) {
      appendIcon(
        btn,
        () => createWeaponIcon(weaponId),
        `weapon-${weaponId}`,
        WEAPONS[weaponId].name,
      );
      appendLabel(btn, WEAPONS[weaponId].name);
      btn.title = 'Retirar para o arsenal';
      btn.addEventListener('click', () => {
        if (withdrawWeaponFromChest(state, chest, index)) {
          callbacks.onChange();
          renderChestModal(callbacks);
          callbacks.showToast(`${WEAPONS[weaponId].name} retirada — configure na bancada`);
        } else {
          callbacks.showToast('Não foi possível retirar a arma');
        }
      });
    } else {
      btn.classList.add('empty');
      btn.textContent = '—';
      btn.disabled = true;
    }
    weaponGrid.appendChild(btn);
  });

  state.bag.forEach((entry, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'inv-slot';
    if (entry && entry.kind === 'loot') {
      appendIcon(btn, () => createLootIcon(entry.id), `loot-${entry.id}`, entry.name);
      appendLabel(btn, entry.name, entry.quantity);
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
      const species = getSpecies(entry.speciesId);
      appendIcon(
        btn,
        () => createCreatureSprite(species),
        `inventory-creature-${entry.speciesId}`,
        entry.name,
      );
      appendLabel(btn, entry.name);
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
