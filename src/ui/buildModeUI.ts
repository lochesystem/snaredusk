import { BUILDABLE_STATIONS, getStation, type StationId } from '../data/baseStations.ts';
import { canUseBuildTool } from '../systems/tutorial.ts';
import type { GameState } from '../types.ts';

export type BuildTool = StationId | 'move';

export const BUILD_HOTBAR_SLOTS: BuildTool[] = [...BUILDABLE_STATIONS, 'move'];

export interface BuildHotbarCallbacks {
  onSelect: (tool: BuildTool | null) => void;
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

export function renderBaseBuildHotbar(state: GameState, callbacks: BuildHotbarCallbacks): void {
  const container = document.getElementById('base-build-hotbar');
  if (!container) return;
  container.innerHTML = '';

  BUILD_HOTBAR_SLOTS.forEach((tool, index) => {
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'hotbar-slot';
    if (selected === tool) slot.classList.add('selected');

    const key = document.createElement('span');
    key.className = 'hotbar-key';
    key.textContent = String(index + 1);
    slot.appendChild(key);

    if (tool === 'move') {
      const icon = document.createElement('span');
      icon.className = 'hotbar-icon-text';
      icon.textContent = '✋';
      slot.appendChild(icon);

      const label = document.createElement('span');
      label.className = 'hotbar-label';
      label.textContent = 'Mover';
      label.title = 'Clique numa estação para levantar e reposicionar';
      slot.appendChild(label);
    } else {
      const def = getStation(tool);
      if (tool === 'habitat_pen') slot.id = 'build-hotbar-habitat-pen';
      const icon = document.createElement('span');
      icon.className = 'hotbar-icon-text';
      icon.style.background = `#${def.color.toString(16).padStart(6, '0')}`;
      icon.style.borderColor = `#${def.accent.toString(16).padStart(6, '0')}`;
      icon.textContent = def.name.charAt(0);
      slot.appendChild(icon);

      const label = document.createElement('span');
      label.className = 'hotbar-label';
      label.textContent = def.name.split(' ')[0] ?? def.name;
      label.title = `${def.name} — arraste para definir área · [E] para gerenciar criaturas`;
      slot.appendChild(label);
    }

    slot.addEventListener('click', () => {
      if (!canUseBuildTool(state, tool) && selected !== tool) return;
      const next = toggleBuildTool(tool);
      callbacks.onSelect(next);
      renderBaseBuildHotbar(state, callbacks);
    });

    container.appendChild(slot);
  });
}

export function bindBuildHotbarKeys(
  consumeKey: (key: string) => boolean,
  state: GameState,
  callbacks: BuildHotbarCallbacks,
): void {
  for (let i = 0; i < BUILD_HOTBAR_SLOTS.length; i++) {
    if (consumeKey(String(i + 1))) {
      const tool = BUILD_HOTBAR_SLOTS[i]!;
      if (!canUseBuildTool(state, tool) && selected !== tool) continue;
      const next = toggleBuildTool(tool);
      callbacks.onSelect(next);
      renderBaseBuildHotbar(state, callbacks);
      return;
    }
  }
}

/** @deprecated use renderBaseBuildHotbar */
export function openBuildModeUI(_callbacks: BuildHotbarCallbacks): void {}

/** @deprecated use clearBuildTool */
export function closeBuildModeUI(): void {
  clearBuildTool();
}

export function isBuildModeUIOpen(): boolean {
  return selected !== null;
}

/** @deprecated use getSelectedBuildTool */
export function getSelectedBuildStation(): StationId {
  return selected && selected !== 'move' ? selected : 'workbench';
}

export function bindBuildModeModal(_callbacks: BuildHotbarCallbacks): void {}
