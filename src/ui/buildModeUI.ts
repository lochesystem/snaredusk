import { getStation, type StationId } from '../data/baseStations.ts';
import { assignBuildHotbar, BUILD_HOTBAR_ITEM_SLOTS } from '../systems/buildHotbar.ts';
import { canUseBuildTool } from '../systems/tutorial.ts';
import type { GameState } from '../types.ts';

export type BuildTool = StationId | 'move';

export interface BuildHotbarCallbacks {
  onSelect: (tool: BuildTool | null) => void;
  onAssign?: () => void;
  setStationIcon?: (img: HTMLImageElement, stationId: StationId) => void;
}

let selected: BuildTool | null = null;

export function getSelectedBuildTool(): BuildTool | null {
  return selected;
}

export function selectBuildTool(tool: BuildTool | null): void {
  selected = tool;
}

export function toggleBuildTool(tool: BuildTool): BuildTool | null {
  selected = selected === tool ? null : tool;
  return selected;
}

export function clearBuildTool(): void {
  selected = null;
}

function renderMoveSlot(
  container: HTMLElement,
  callbacks: BuildHotbarCallbacks,
): void {
  const slot = document.createElement('button');
  slot.type = 'button';
  slot.className = 'hotbar-slot build-move-slot';
  if (selected === 'move') slot.classList.add('selected');

  const key = document.createElement('span');
  key.className = 'hotbar-key';
  key.textContent = '5';
  slot.appendChild(key);

  const icon = document.createElement('span');
  icon.className = 'hotbar-icon-text';
  icon.textContent = '✋';
  slot.appendChild(icon);

  const label = document.createElement('span');
  label.className = 'hotbar-label';
  label.textContent = 'Mover';
  slot.appendChild(label);

  slot.addEventListener('click', () => callbacks.onSelect(toggleBuildTool('move')));
  container.appendChild(slot);
}

export function renderBaseBuildHotbar(state: GameState, callbacks: BuildHotbarCallbacks): void {
  const container = document.getElementById('base-build-hotbar');
  if (!container) return;
  container.innerHTML = '';

  for (let index = 0; index < BUILD_HOTBAR_ITEM_SLOTS; index++) {
    const stationId = state.buildHotbar[index];
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'hotbar-slot build-item-slot';
    slot.dataset.slotIndex = String(index);
    if (!stationId) slot.classList.add('empty');
    if (stationId && selected === stationId) slot.classList.add('selected');

    const key = document.createElement('span');
    key.className = 'hotbar-key';
    key.textContent = String(index + 1);
    slot.appendChild(key);

    if (stationId) {
      const def = getStation(stationId);
      const quantity = state.craftedStations[stationId] ?? 0;
      if (stationId === 'habitat_pen') slot.id = 'build-hotbar-habitat-pen';
      if (quantity <= 0) slot.classList.add('depleted');

      const icon = document.createElement('img');
      icon.className = 'hotbar-icon';
      icon.alt = def.name;
      callbacks.setStationIcon?.(icon, stationId);
      slot.appendChild(icon);

      const qty = document.createElement('span');
      qty.className = 'hotbar-qty';
      qty.textContent = String(quantity);
      slot.appendChild(qty);

      const label = document.createElement('span');
      label.className = 'hotbar-label';
      label.textContent = def.name.split(' ')[0] ?? def.name;
      label.title = quantity > 0
        ? `${def.name} ×${quantity} — cada colocação consome uma unidade`
        : `${def.name} esgotada — fabrique mais na bancada`;
      slot.appendChild(label);

      slot.addEventListener('click', () => {
        if (quantity <= 0) return;
        if (!canUseBuildTool(state, stationId) && selected !== stationId) return;
        callbacks.onSelect(toggleBuildTool(stationId));
        renderBaseBuildHotbar(state, callbacks);
      });
    } else {
      const empty = document.createElement('span');
      empty.className = 'hotbar-empty-mark';
      empty.textContent = '+';
      empty.title = 'Arraste uma construção do inventário';
      slot.appendChild(empty);
    }

    slot.addEventListener('dragover', (event) => {
      event.preventDefault();
      slot.classList.add('drag-over');
    });
    slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
    slot.addEventListener('drop', (event) => {
      event.preventDefault();
      slot.classList.remove('drag-over');
      const dropped = event.dataTransfer?.getData('application/x-snaredusk-station') as StationId;
      if (!dropped || !assignBuildHotbar(state, dropped, index)) return;
      selected = null;
      callbacks.onAssign?.();
      renderBaseBuildHotbar(state, callbacks);
    });

    container.appendChild(slot);
  }

  renderMoveSlot(container, callbacks);
}

export function bindBuildHotbarKeys(
  consumeKey: (key: string) => boolean,
  state: GameState,
  callbacks: BuildHotbarCallbacks,
): void {
  for (let i = 0; i < BUILD_HOTBAR_ITEM_SLOTS; i++) {
    if (!consumeKey(String(i + 1))) continue;
    const stationId = state.buildHotbar[i];
    if (!stationId || (state.craftedStations[stationId] ?? 0) <= 0) return;
    if (!canUseBuildTool(state, stationId) && selected !== stationId) return;
    callbacks.onSelect(toggleBuildTool(stationId));
    renderBaseBuildHotbar(state, callbacks);
    return;
  }
  if (consumeKey('5')) {
    callbacks.onSelect(toggleBuildTool('move'));
    renderBaseBuildHotbar(state, callbacks);
  }
}

/** @deprecated */
export function openBuildModeUI(_callbacks: BuildHotbarCallbacks): void {}

export function closeBuildModeUI(): void {
  clearBuildTool();
}

export function isBuildModeUIOpen(): boolean {
  return selected !== null;
}

/** @deprecated */
export function getSelectedBuildStation(): StationId {
  return selected && selected !== 'move' ? selected : 'workbench';
}

export function bindBuildModeModal(_callbacks: BuildHotbarCallbacks): void {}
