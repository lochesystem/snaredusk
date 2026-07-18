import { WEAPONS } from '../data/weapons.ts';
import { equipWeapon, listRecipes } from '../systems/craft.ts';
import {
  craftWeaponFromWorkbench,
  formatConsumePlan,
  getCraftPreviewFromSources,
} from '../systems/adjacentCraft.ts';
import type { Container } from 'pixi.js';
import { createWeaponIcon } from '../world/placeholderArt.ts';

export interface WorkshopModalCallbacks {
  getState: () => GameState;
  onChange: () => void;
  showToast: (msg: string) => void;
  setPixiIcon: (img: HTMLImageElement, createIcon: () => Container, cacheKey: string) => void;
}

import type { GameState } from '../types.ts';

let benchCellX = 0;
let benchCellY = 0;

export function openWorkshopModal(cellX: number, cellY: number, callbacks: WorkshopModalCallbacks): void {
  benchCellX = cellX;
  benchCellY = cellY;
  const modal = document.getElementById('workshop-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  renderWorkshopModal(callbacks);
}

export function closeWorkshopModal(): void {
  document.getElementById('workshop-modal')?.classList.add('hidden');
}

export function isWorkshopModalOpen(): boolean {
  return !document.getElementById('workshop-modal')?.classList.contains('hidden');
}

export function renderWorkshopModal(callbacks: WorkshopModalCallbacks): void {
  const state = callbacks.getState();
  const container = document.getElementById('workshop-modal-recipes');
  const armory = document.getElementById('workshop-modal-armory');
  if (!container || !armory) return;

  container.innerHTML = '';
  armory.innerHTML = '';

  for (const recipe of listRecipes()) {
    const weapon = WEAPONS[recipe.weaponId];
    if (!weapon) continue;
    const preview = getCraftPreviewFromSources(state, recipe.id, benchCellX, benchCellY, false);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'depot-item craft-recipe-btn';
    btn.disabled = preview.owned;

    const iconImg = document.createElement('img');
    iconImg.className = 'craft-icon';
    callbacks.setPixiIcon(iconImg, () => createWeaponIcon(recipe.weaponId), `weapon-${recipe.weaponId}`);

    const body = document.createElement('span');
    body.className = 'craft-recipe-body';

    const title = document.createElement('span');
    title.className = 'craft-recipe-title';
    title.textContent = preview.owned ? `${weapon.name} — possui` : `Craft: ${weapon.name}`;

    const previewText = document.createElement('span');
    previewText.className = 'craft-recipe-reqs';
    if (preview.consumePlan.length > 0) {
      previewText.textContent = `Consome: ${formatConsumePlan(preview.consumePlan)}`;
    } else if (!preview.owned && preview.missing.length > 0) {
      previewText.textContent = `Falta: ${preview.missing.join(', ')}`;
    }

    body.appendChild(title);
    body.appendChild(previewText);
    btn.appendChild(iconImg);
    btn.appendChild(body);

    btn.addEventListener('click', () => {
      if (preview.owned) return;
      const fresh = getCraftPreviewFromSources(state, recipe.id, benchCellX, benchCellY, false);
      if (!fresh.canCraft) {
        callbacks.showToast(fresh.missing.length ? `Falta: ${fresh.missing.join(', ')}` : 'Materiais insuficientes nos baús adjacentes');
        return;
      }
      if (craftWeaponFromWorkbench(state, recipe.id, benchCellX, benchCellY, false)) {
        callbacks.onChange();
        renderWorkshopModal(callbacks);
        callbacks.showToast(`${weapon.name} craftada!`);
      }
    });
    container.appendChild(btn);
  }

  for (const weaponId of state.ownedWeapons) {
    const weapon = WEAPONS[weaponId];
    if (!weapon) continue;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'depot-item craft-recipe-btn';
    const equipped = state.equippedWeaponId === weaponId;
    if (equipped) btn.disabled = true;
    btn.textContent = equipped ? `✓ ${weapon.name}` : `Equipar ${weapon.name}`;
    btn.addEventListener('click', () => {
      if (equipWeapon(state, weaponId)) {
        callbacks.onChange();
        renderWorkshopModal(callbacks);
        callbacks.showToast(`Equipou ${weapon.name}`);
      }
    });
    armory.appendChild(btn);
  }
}

export function bindWorkshopModal(_callbacks: WorkshopModalCallbacks): void {
  document.getElementById('workshop-modal-close')?.addEventListener('click', () => closeWorkshopModal());
}
