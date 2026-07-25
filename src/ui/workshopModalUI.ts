import { WEAPONS } from '../data/weapons.ts';
import { LOOT_TABLE } from '../data/items.ts';
import { HOODS } from '../data/hoods.ts';
import { listRecipes, equipWeapon } from '../systems/craft.ts';
import {
  craftWeaponFromWorkbench,
  formatConsumePlan,
  getWorkbenchChests,
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
import {
  createCaptureOrbBall,
  createHoodIcon,
  createLootIcon,
  createStationRecipeIcon,
  createWeaponIcon,
} from '../world/placeholderArt.ts';

export interface WorkshopModalCallbacks {
  getState: () => GameState;
  onChange: () => void;
  showToast: (msg: string) => void;
  setPixiIcon: (img: HTMLImageElement, createIcon: () => Container, cacheKey: string) => void;
}

import type { GameState } from '../types.ts';

let benchCellX = 0;
let benchCellY = 0;
let selectedRecipeId: string | null = null;

export function openWorkshopModal(cellX: number, cellY: number, callbacks: WorkshopModalCallbacks): void {
  benchCellX = cellX;
  benchCellY = cellY;
  const modal = document.getElementById('workshop-modal');
  if (!modal) return;
  selectedRecipeId ??= listRecipes()[0]?.id ?? null;
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
  const workbenchChests = getWorkbenchChests(state, benchCellX, benchCellY);
  const canDeposit = workbenchChests.some(({ chest }) => chestWeaponHasSpace(chest));

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
        const target = workbenchChests.find(({ chest }) => chestWeaponHasSpace(chest));
        if (!target || !depositWeaponToChest(state, target.chest, weaponId)) {
          callbacks.showToast('Nenhum baú da base tem espaço para armas');
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
        const target = workbenchChests.find(({ chest }) => chestWeaponHasSpace(chest));
        if (!target || !depositWeaponToChest(state, target.chest, weaponId)) {
          callbacks.showToast('Nenhum baú da base tem espaço para armas');
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
  const detail = document.getElementById('workshop-modal-detail');
  const armory = document.getElementById('workshop-modal-armory');
  if (!container || !detail || !armory) return;

  container.innerHTML = '';
  detail.innerHTML = '';
  const recipes = listRecipes();
  const selectedRecipe = recipes.find((recipe) => recipe.id === selectedRecipeId) ?? recipes[0];
  if (selectedRecipe) selectedRecipeId = selectedRecipe.id;

  const setRecipeIcon = (iconImg: HTMLImageElement, recipe: (typeof recipes)[number]) => {
    if (recipe.output.kind === 'weapon') {
      const weaponId = recipe.output.weaponId;
      callbacks.setPixiIcon(iconImg, () => createWeaponIcon(weaponId), `weapon-${weaponId}`);
    } else if (recipe.output.kind === 'hood') {
      const hoodId = recipe.output.hoodId;
      callbacks.setPixiIcon(iconImg, () => createHoodIcon(hoodId), `hood-${hoodId}`);
    } else if (recipe.output.kind === 'station') {
      const stationId = recipe.output.stationId;
      callbacks.setPixiIcon(
        iconImg,
        () => createStationRecipeIcon(stationId),
        `station-recipe-${stationId}`,
      );
    } else if (recipe.output.kind === 'loot') {
      const lootId = recipe.output.lootId;
      callbacks.setPixiIcon(iconImg, () => createLootIcon(lootId), `loot-${lootId}`);
    } else {
      callbacks.setPixiIcon(iconImg, () => createCaptureOrbBall(), 'craft-orb');
    }
  };

  for (const recipe of recipes) {
    const weapon = recipe.output.kind === 'weapon' ? WEAPONS[recipe.output.weaponId] : null;
    if (recipe.output.kind === 'weapon' && !weapon) continue;
    if (recipe.output.kind === 'hood' && !HOODS[recipe.output.hoodId]) continue;
    const preview = getCraftPreviewFromSources(state, recipe.id, benchCellX, benchCellY, false);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'craft-grid-slot';
    btn.dataset.controllerKey = `recipe:${recipe.id}`;
    btn.dataset.recipeId = recipe.id;
    if (recipe.id === selectedRecipeId) btn.classList.add('selected');
    if (preview.owned) btn.classList.add('owned');
    if (!preview.canCraft && !preview.owned) btn.classList.add('missing');
    btn.title = recipe.name;

    const iconImg = document.createElement('img');
    iconImg.className = 'craft-icon';
    setRecipeIcon(iconImg, recipe);
    btn.appendChild(iconImg);
    const shortName = document.createElement('span');
    shortName.className = 'craft-grid-name';
    shortName.textContent = recipe.name;
    btn.appendChild(shortName);
    btn.addEventListener('click', () => {
      selectedRecipeId = recipe.id;
      renderWorkshopModal(callbacks);
      requestAnimationFrame(() => {
        container.querySelector<HTMLButtonElement>(
          `[data-recipe-id="${recipe.id}"]`,
        )?.focus();
      });
    });
    container.appendChild(btn);
  }

  if (selectedRecipe) {
    const preview = getCraftPreviewFromSources(
      state,
      selectedRecipe.id,
      benchCellX,
      benchCellY,
      false,
    );
    const hero = document.createElement('div');
    hero.className = 'craft-detail-hero';
    const icon = document.createElement('img');
    icon.className = 'craft-detail-icon';
    setRecipeIcon(icon, selectedRecipe);
    if (
      selectedRecipe.output.kind === 'station'
      && (state.craftedStations[selectedRecipe.output.stationId] ?? 0) > 0
    ) {
      const stationId = selectedRecipe.output.stationId;
      icon.draggable = true;
      icon.title = 'Arraste para um slot da barra inferior';
      icon.addEventListener('dragstart', (event) => {
        event.dataTransfer?.setData('application/x-snaredusk-station', stationId);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
      });
    }
    const heading = document.createElement('div');
    heading.innerHTML = `
      <p class="modal-kicker">Resultado</p>
      <h4>${selectedRecipe.name}</h4>
      <span class="craft-gold-cost">${selectedRecipe.goldCost} ouro</span>
    `;
    hero.append(icon, heading);
    detail.appendChild(hero);

    const ingredients = document.createElement('div');
    ingredients.className = 'craft-ingredients';
    for (const ingredient of selectedRecipe.ingredients) {
      const chip = document.createElement('div');
      chip.className = 'craft-ingredient-chip';
      const itemIcon = document.createElement('img');
      itemIcon.className = 'craft-ingredient-icon';
      callbacks.setPixiIcon(
        itemIcon,
        () => createLootIcon(ingredient.lootId),
        `loot-${ingredient.lootId}`,
      );
      const name = LOOT_TABLE[ingredient.lootId]?.name ?? ingredient.lootId;
      chip.append(itemIcon, Object.assign(document.createElement('span'), {
        textContent: `${ingredient.quantity}× ${name}`,
      }));
      ingredients.appendChild(chip);
    }
    detail.appendChild(ingredients);

    const source = document.createElement('p');
    source.className = 'craft-source-preview';
    source.textContent = preview.consumePlan.length > 0
      ? `Dos baús: ${formatConsumePlan(preview.consumePlan)}`
      : preview.owned
        ? 'Você já possui este equipamento.'
        : preview.missing.length > 0
          ? `Falta: ${preview.missing.join(', ')}`
          : 'Pronto para fabricar.';
    detail.appendChild(source);

    const craftButton = document.createElement('button');
    craftButton.type = 'button';
    craftButton.className = 'craft-confirm-button';
    craftButton.dataset.controllerKey = 'craft-confirm';
    craftButton.textContent = preview.owned ? 'Já fabricada' : 'Fabricar';
    craftButton.disabled = preview.owned || !preview.canCraft;
    craftButton.addEventListener('click', () => {
      const fresh = getCraftPreviewFromSources(
        state,
        selectedRecipe.id,
        benchCellX,
        benchCellY,
        false,
      );
      if (!fresh.canCraft) {
        callbacks.showToast(`Falta: ${fresh.missing.join(', ')}`);
        return;
      }
      if (!craftWeaponFromWorkbench(state, selectedRecipe.id, benchCellX, benchCellY, false)) return;
      callbacks.onChange();
      renderWorkshopModal(callbacks);
      if (selectedRecipe.output.kind === 'weapon') {
        const loc = findWeaponLocation(state, selectedRecipe.output.weaponId);
        callbacks.showToast(
          `${selectedRecipe.name} fabricada!${loc?.kind === 'stash' ? ' — foi para o arsenal' : ''}`,
        );
      } else if (selectedRecipe.output.kind === 'hood') {
        callbacks.showToast(`${selectedRecipe.name} fabricado — equipe no inventário`);
      } else if (selectedRecipe.output.kind === 'station') {
        callbacks.showToast(`${selectedRecipe.name} virou um item de construção`);
      } else {
        callbacks.showToast(`${selectedRecipe.name} fabricado!`);
      }
    });
    detail.appendChild(craftButton);
  }

  renderArmorySection(state, callbacks, armory);
}

export function bindWorkshopModal(_callbacks: WorkshopModalCallbacks): void {
  document.getElementById('workshop-modal-close')?.addEventListener('click', () => closeWorkshopModal());
}
