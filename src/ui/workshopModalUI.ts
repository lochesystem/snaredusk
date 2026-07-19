import { WEAPONS } from '../data/weapons.ts';
import { listRecipes, equipWeapon } from '../systems/craft.ts';
import {
  craftWeaponFromWorkbench,
  formatConsumePlan,
  getAdjacentChestsForWorkbench,
  getCraftPreviewFromSources,
} from '../systems/adjacentCraft.ts';
import {
  assignWeaponToHotbar,
  depositWeaponToChest,
  findWeaponLocation,
  moveWeaponToStash,
} from '../systems/weaponArmory.ts';
import { WEAPON_HOTBAR_SLOTS } from '../systems/weaponHotbar.ts';
import { chestWeaponHasSpace } from '../systems/baseChest.ts';
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

function renderArmorySection(state: GameState, callbacks: WorkshopModalCallbacks, armory: HTMLElement): void {
  armory.innerHTML = '';
  const adjacentChests = getAdjacentChestsForWorkbench(state, benchCellX, benchCellY);
  const canDeposit = adjacentChests.some(({ chest }) => chestWeaponHasSpace(chest));

  const slotsHeading = document.createElement('p');
  slotsHeading.className = 'panel-hint';
  slotsHeading.textContent = 'Slots rápidos (teclas 1 e 2 na masmorra):';
  armory.appendChild(slotsHeading);

  for (let i = 0; i < WEAPON_HOTBAR_SLOTS; i++) {
    const weaponId = state.weaponHotbar[i];
    const slotBox = document.createElement('div');
    slotBox.className = 'armory-slot-box';

    const label = document.createElement('h5');
    label.className = 'subheading';
    label.textContent = `Slot ${i + 1}`;
    slotBox.appendChild(label);

    if (!weaponId || !WEAPONS[weaponId]) {
      const empty = document.createElement('p');
      empty.className = 'panel-hint';
      empty.textContent = 'Vazio — atribua uma arma do arsenal abaixo.';
      slotBox.appendChild(empty);
      armory.appendChild(slotBox);
      continue;
    }

    const equipped = state.equippedWeaponId === weaponId;
    const row = document.createElement('div');
    row.className = 'armory-weapon-row';

    const iconImg = document.createElement('img');
    iconImg.className = 'craft-icon';
    callbacks.setPixiIcon(iconImg, () => createWeaponIcon(weaponId), `weapon-${weaponId}`);

    const info = document.createElement('span');
    info.className = 'craft-recipe-body';
    info.innerHTML = `<span class="craft-recipe-title">${WEAPONS[weaponId].name}${equipped ? ' ✓ equipada' : ''}</span>`;

    const actions = document.createElement('div');
    actions.className = 'armory-actions';

    if (!equipped) {
      const equipBtn = document.createElement('button');
      equipBtn.type = 'button';
      equipBtn.className = 'party-pick';
      equipBtn.textContent = 'Equipar';
      equipBtn.addEventListener('click', () => {
        if (equipWeapon(state, weaponId)) {
          callbacks.onChange();
          renderWorkshopModal(callbacks);
          callbacks.showToast(`Equipou ${WEAPONS[weaponId].name}`);
        }
      });
      actions.appendChild(equipBtn);
    }

    const stashBtn = document.createElement('button');
    stashBtn.type = 'button';
    stashBtn.className = 'party-pick';
    stashBtn.textContent = 'Guardar';
    stashBtn.addEventListener('click', () => {
      if (moveWeaponToStash(state, weaponId)) {
        callbacks.onChange();
        renderWorkshopModal(callbacks);
        callbacks.showToast(`${WEAPONS[weaponId].name} guardada no arsenal`);
      }
    });
    actions.appendChild(stashBtn);

    if (canDeposit) {
      const chestBtn = document.createElement('button');
      chestBtn.type = 'button';
      chestBtn.className = 'party-pick';
      chestBtn.textContent = 'No baú';
      chestBtn.addEventListener('click', () => {
        const target = adjacentChests.find(({ chest }) => chestWeaponHasSpace(chest));
        if (!target || !depositWeaponToChest(state, target.chest, weaponId)) {
          callbacks.showToast('Baú adjacente sem espaço para armas');
          return;
        }
        callbacks.onChange();
        renderWorkshopModal(callbacks);
        callbacks.showToast(`${WEAPONS[weaponId].name} guardada no baú`);
      });
      actions.appendChild(chestBtn);
    }

    row.appendChild(iconImg);
    row.appendChild(info);
    row.appendChild(actions);
    slotBox.appendChild(row);
    armory.appendChild(slotBox);
  }

  const stashIds = [
    ...state.weaponStash,
    ...state.ownedWeapons.filter((id) => {
      const loc = findWeaponLocation(state, id);
      return loc?.kind === 'stash';
    }),
  ].filter((id, idx, arr) => arr.indexOf(id) === idx && !state.weaponHotbar.includes(id));

  const stashHeading = document.createElement('h5');
  stashHeading.className = 'subheading';
  stashHeading.textContent = 'Arsenal (não nos slots)';
  armory.appendChild(stashHeading);

  if (stashIds.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'panel-hint';
    empty.textContent = 'Nenhuma arma no arsenal — armas extras vão para cá ao craftar.';
    armory.appendChild(empty);
    return;
  }

  for (const weaponId of stashIds) {
    if (!WEAPONS[weaponId]) continue;
    const row = document.createElement('div');
    row.className = 'armory-row-wrap';

    const inner = document.createElement('div');
    inner.className = 'armory-weapon-row';

    const iconImg = document.createElement('img');
    iconImg.className = 'craft-icon';
    callbacks.setPixiIcon(iconImg, () => createWeaponIcon(weaponId), `weapon-${weaponId}`);

    const info = document.createElement('span');
    info.className = 'craft-recipe-body';
    info.innerHTML = `<span class="craft-recipe-title">${WEAPONS[weaponId].name}</span>`;

    const actions = document.createElement('div');
    actions.className = 'armory-actions';

    for (let slot = 0; slot < WEAPON_HOTBAR_SLOTS; slot++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'party-pick';
      btn.textContent = `Slot ${slot + 1}`;
      btn.addEventListener('click', () => {
        if (assignWeaponToHotbar(state, weaponId, slot)) {
          callbacks.onChange();
          renderWorkshopModal(callbacks);
          callbacks.showToast(`${WEAPONS[weaponId].name} no slot ${slot + 1}`);
        }
      });
      actions.appendChild(btn);
    }

    const equipBtn = document.createElement('button');
    equipBtn.type = 'button';
    equipBtn.className = 'party-pick';
    equipBtn.textContent = 'Equipar';
    equipBtn.addEventListener('click', () => {
      if (equipWeapon(state, weaponId)) {
        callbacks.onChange();
        renderWorkshopModal(callbacks);
        callbacks.showToast(`Equipou ${WEAPONS[weaponId].name}`);
      }
    });
    actions.appendChild(equipBtn);

    if (canDeposit) {
      const chestBtn = document.createElement('button');
      chestBtn.type = 'button';
      chestBtn.className = 'party-pick';
      chestBtn.textContent = 'No baú';
      chestBtn.addEventListener('click', () => {
        const target = adjacentChests.find(({ chest }) => chestWeaponHasSpace(chest));
        if (!target || !depositWeaponToChest(state, target.chest, weaponId)) {
          callbacks.showToast('Baú adjacente sem espaço para armas');
          return;
        }
        callbacks.onChange();
        renderWorkshopModal(callbacks);
        callbacks.showToast(`${WEAPONS[weaponId].name} guardada no baú`);
      });
      actions.appendChild(chestBtn);
    }

    inner.appendChild(iconImg);
    inner.appendChild(info);
    inner.appendChild(actions);
    row.appendChild(inner);
    armory.appendChild(row);
  }
}

export function renderWorkshopModal(callbacks: WorkshopModalCallbacks): void {
  const state = callbacks.getState();
  const container = document.getElementById('workshop-modal-recipes');
  const armory = document.getElementById('workshop-modal-armory');
  if (!container || !armory) return;

  container.innerHTML = '';

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
        const loc = findWeaponLocation(state, recipe.weaponId);
        const note = loc?.kind === 'stash' ? ' — atribua um slot na bancada' : '';
        callbacks.showToast(`${weapon.name} craftada!${note}`);
      }
    });
    container.appendChild(btn);
  }

  renderArmorySection(state, callbacks, armory);
}

export function bindWorkshopModal(_callbacks: WorkshopModalCallbacks): void {
  document.getElementById('workshop-modal-close')?.addEventListener('click', () => closeWorkshopModal());
}
