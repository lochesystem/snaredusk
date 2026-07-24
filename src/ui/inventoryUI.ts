import type { Container } from 'pixi.js';
import { BUILDABLE_STATIONS, getStation } from '../data/baseStations.ts';
import { getSpecies } from '../data/creatures.ts';
import { WEAPONS } from '../data/weapons.ts';
import { getHood, type HoodId } from '../data/hoods.ts';
import { equipHood } from '../systems/hoodEquipment.ts';
import { assignBuildToFirstAvailable } from '../systems/buildHotbar.ts';
import { formatSpecialItem } from '../systems/dungeonSpecial.ts';
import { discardBagSlot, formatBagEntry } from '../systems/inventory.ts';
import type { BagEntry, GameState } from '../types.ts';
import {
  createCreatureSprite,
  createHoodIcon,
  createLootIcon,
  createPlayerSprite,
  createStationRecipeIcon,
  createWeaponIcon,
} from '../world/placeholderArt.ts';

export interface InventoryUICallbacks {
  getState: () => GameState;
  onChange: () => void;
  showToast: (msg: string) => void;
  onOpenBestiary?: () => void;
  setPixiIcon?: (img: HTMLImageElement, createIcon: () => Container, cacheKey: string) => void;
}

type InventoryTab = 'loot' | 'construction' | 'equipment' | 'special';

function shortLabel(name: string, max = 13): string {
  return name.length <= max ? name : `${name.slice(0, max - 1)}…`;
}

function appendPixiIcon(
  slot: HTMLElement,
  cb: InventoryUICallbacks,
  createIcon: () => Container,
  cacheKey: string,
  alt: string,
): void {
  if (!cb.setPixiIcon) return;
  const icon = document.createElement('img');
  icon.className = 'inv-slot-sprite';
  icon.alt = alt;
  cb.setPixiIcon(icon, createIcon, cacheKey);
  slot.appendChild(icon);
}

function renderLootIcon(slot: HTMLElement, entry: BagEntry, cb: InventoryUICallbacks): void {
  if (entry.kind === 'creature') {
    const species = getSpecies(entry.speciesId);
    appendPixiIcon(
      slot,
      cb,
      () => createCreatureSprite(species),
      `inventory-creature-${entry.speciesId}`,
      entry.name,
    );
    return;
  }
  appendPixiIcon(slot, cb, () => createLootIcon(entry.id), `loot-${entry.id}`, entry.name);
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
    else slot.classList.add(entry.kind);

    const indexLabel = document.createElement('span');
    indexLabel.className = 'inv-slot-index';
    indexLabel.textContent = String(index + 1);
    slot.appendChild(indexLabel);

    if (!entry) {
      const emptyLabel = document.createElement('span');
      emptyLabel.className = 'inv-slot-empty-label';
      emptyLabel.textContent = compact ? '' : 'Vazio';
      slot.appendChild(emptyLabel);
      container.appendChild(slot);
      return;
    }

    renderLootIcon(slot, entry, cb);

    const label = document.createElement('span');
    label.className = 'inv-slot-label';
    label.textContent = shortLabel(entry.name);
    label.title = formatBagEntry(entry);
    slot.appendChild(label);

    if (entry.kind === 'loot') {
      const qty = document.createElement('span');
      qty.className = 'inv-slot-qty';
      qty.textContent = String(entry.quantity);
      slot.appendChild(qty);
    }

    const discard = document.createElement('button');
    discard.type = 'button';
    discard.className = 'inv-discard-btn';
    discard.textContent = '×';
    discard.title = 'Descartar tudo';
    discard.addEventListener('click', (event) => {
      event.stopPropagation();
      const result = discardBagSlot(state, index, 'all');
      if (!result.ok) return;
      cb.onChange();
      cb.showToast(result.message);
      renderLootGrid(container, cb.getState(), cb, compact);
    });
    slot.appendChild(discard);

    container.appendChild(slot);
  });
}

function renderSpecialGrid(container: HTMLElement, state: GameState): void {
  container.innerHTML = '';
  state.dungeonSpecial.forEach((entry, index) => {
    const slot = document.createElement('div');
    slot.className = 'inv-slot special';
    if (!entry) slot.classList.add('empty');

    const indexLabel = document.createElement('span');
    indexLabel.className = 'inv-slot-index';
    indexLabel.textContent = `★${index + 1}`;
    slot.appendChild(indexLabel);

    const label = document.createElement('span');
    label.className = entry ? 'inv-slot-label' : 'inv-slot-empty-label';
    label.textContent = entry ? shortLabel(entry.name) : 'Vazio';
    if (entry) label.title = formatSpecialItem(entry);
    slot.appendChild(label);
    container.appendChild(slot);
  });
}

function renderConstructionGrid(
  container: HTMLElement,
  state: GameState,
  cb: InventoryUICallbacks,
): void {
  container.innerHTML = '';

  for (const stationId of BUILDABLE_STATIONS) {
    const def = getStation(stationId);
    const quantity = state.craftedStations[stationId] ?? 0;
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'construction-item inv-slot';
    item.draggable = quantity > 0;
    if (quantity <= 0) item.classList.add('empty');

    appendPixiIcon(
      item,
      cb,
      () => createStationRecipeIcon(stationId),
      `station-recipe-${stationId}`,
      def.name,
    );

    const label = document.createElement('span');
    label.className = 'inv-slot-label';
    label.textContent = def.name;
    item.appendChild(label);

    const qty = document.createElement('span');
    qty.className = 'inv-slot-qty';
    qty.textContent = String(quantity);
    item.appendChild(qty);

    item.title = quantity > 0
      ? 'Arraste para a barra inferior ou clique para atribuir automaticamente'
      : 'Fabrique este item na bancada';
    item.addEventListener('dragstart', (event) => {
      event.dataTransfer?.setData('application/x-snaredusk-station', stationId);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('click', () => {
      if (quantity <= 0) {
        cb.showToast(`Fabrique ${def.name} na bancada`);
        return;
      }
      const slot = assignBuildToFirstAvailable(state, stationId);
      if (slot < 0) return;
      cb.onChange();
      cb.showToast(`${def.name} atribuída ao slot ${slot + 1}`);
      renderConstructionGrid(container, cb.getState(), cb);
    });

    container.appendChild(item);
  }

  const hint = document.createElement('p');
  hint.className = 'inventory-drag-hint';
  hint.textContent = 'Arraste uma construção para os slots 1–4 da barra inferior. Cada colocação consome 1 unidade.';
  container.appendChild(hint);
}

function equipmentSlot(
  labelText: string,
  valueText: string,
  className: string,
): HTMLElement {
  const slot = document.createElement('div');
  slot.className = `equipment-slot ${className}`;
  const label = document.createElement('span');
  label.className = 'equipment-slot-label';
  label.textContent = labelText;
  const value = document.createElement('span');
  value.className = 'equipment-slot-value';
  value.textContent = valueText;
  slot.append(label, value);
  return slot;
}

function renderEquipmentPanel(
  container: HTMLElement,
  state: GameState,
  cb: InventoryUICallbacks,
): void {
  container.innerHTML = '';

  const paperdoll = document.createElement('div');
  paperdoll.className = 'equipment-paperdoll';
  const player = document.createElement('img');
  player.className = 'equipment-player-sprite';
  player.alt = 'Personagem';
  cb.setPixiIcon?.(
    player,
    () => createPlayerSprite(state.equippedHoodId),
    `inventory-player-${state.equippedHoodId}`,
  );
  paperdoll.appendChild(player);

  const equipped = WEAPONS[state.equippedWeaponId];
  const weaponSlot = equipmentSlot('Arma', equipped?.name ?? 'Vazio', 'weapon');
  if (equipped) {
    const icon = document.createElement('img');
    icon.className = 'equipment-slot-icon';
    icon.alt = equipped.name;
    cb.setPixiIcon?.(icon, () => createWeaponIcon(equipped.id), `weapon-${equipped.id}`);
    weaponSlot.prepend(icon);
  }

  const companion = state.partyCompanion?.name ?? 'Nenhum';
  const companionSlot = equipmentSlot('Companheiro', companion, 'companion');
  const defenseSlot = equipmentSlot('Proteção', `DEF ${state.playerDef}`, 'armor');
  const hood = getHood(state.equippedHoodId);
  const cloakSlot = equipmentSlot('Capuz', hood.name, 'cloak');
  const hoodChoices = document.createElement('div');
  hoodChoices.className = 'hood-equipment-choices';
  for (const hoodId of state.ownedHoods) {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'hood-equipment-option';
    option.classList.toggle('active', hoodId === state.equippedHoodId);
    option.title = `${getHood(hoodId).name} — ${getHood(hoodId).description}`;
    const icon = document.createElement('img');
    icon.alt = getHood(hoodId).name;
    cb.setPixiIcon?.(icon, () => createHoodIcon(hoodId), `hood-${hoodId}`);
    option.appendChild(icon);
    option.addEventListener('click', () => {
      if (!equipHood(state, hoodId as HoodId)) return;
      cb.onChange();
      cb.showToast(`${getHood(hoodId).name} equipado`);
      renderEquipmentPanel(container, cb.getState(), cb);
    });
    hoodChoices.appendChild(option);
  }
  cloakSlot.appendChild(hoodChoices);

  const stats = document.createElement('div');
  stats.className = 'equipment-stats';
  stats.innerHTML = `
    <span><b>HP</b> ${state.playerHp}/100</span>
    <span><b>STA</b> ${state.playerStamina}/80</span>
    <span><b>ATK</b> ${equipped?.atk ?? 0}</span>
    <span><b>DEF</b> ${state.playerDef}</span>
  `;

  container.append(paperdoll, weaponSlot, companionSlot, defenseSlot, cloakSlot, stats);
}

function setInventoryTab(rootId: string, tab: InventoryTab): void {
  const root = document.getElementById(rootId);
  if (!root) return;
  root.querySelectorAll<HTMLButtonElement>('.inventory-tab').forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === tab);
  });
  root.querySelectorAll<HTMLElement>('[data-inventory-panel]').forEach((panel) => {
    panel.classList.toggle('hidden', panel.dataset.inventoryPanel !== tab);
  });
  const hint = root.querySelector<HTMLElement>('.inventory-tab-hint');
  if (!hint) return;
  const hints: Record<InventoryTab, string> = {
    loot: 'Materiais e criaturas encontrados durante as expedições.',
    construction: 'Itens fabricados para usar no modo Construir.',
    equipment: 'Equipamentos ativos e atributos do caçador.',
    special: 'Itens de missão da expedição atual.',
  };
  hint.textContent = hints[tab];
}

function renderAllPanels(
  rootId: string,
  lootGridId: string,
  specialGridId: string,
  cb: InventoryUICallbacks,
  compact: boolean,
): void {
  const root = document.getElementById(rootId);
  const loot = document.getElementById(lootGridId);
  const special = document.getElementById(specialGridId);
  if (!root || !loot || !special) return;

  const state = cb.getState();
  renderLootGrid(loot, state, cb, compact);
  renderSpecialGrid(special, state);

  const construction = root.querySelector<HTMLElement>('[data-inventory-panel="construction"]');
  const equipment = root.querySelector<HTMLElement>('[data-inventory-panel="equipment"]');
  if (construction) renderConstructionGrid(construction, state, cb);
  if (equipment) renderEquipmentPanel(equipment, state, cb);

  root.querySelectorAll<HTMLButtonElement>('.inventory-tab').forEach((button) => {
    if (button.hasAttribute('data-open-bestiary')) {
      button.onclick = () => cb.onOpenBestiary?.();
      return;
    }
    button.onclick = () => {
      const tab = button.dataset.tab as InventoryTab;
      renderAllPanels(rootId, lootGridId, specialGridId, cb, compact);
      setInventoryTab(rootId, tab);
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
  renderAllPanels(rootId, lootGridId, specialGridId, cb, options?.compact ?? false);
  setInventoryTab(rootId, 'loot');
}

export function renderInventoryGrid(
  containerId: string,
  cb: InventoryUICallbacks,
  options?: { compact?: boolean },
): void {
  const container = document.getElementById(containerId);
  if (container) renderLootGrid(container, cb.getState(), cb, options?.compact ?? false);
}

export function bindInventoryModal(): void {
  document.getElementById('inventory-modal-close')?.addEventListener('click', closeInventoryModal);
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
  if (isInventoryModalOpen()) openInventoryModal(cb);
}
