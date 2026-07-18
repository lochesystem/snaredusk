import { BUILDABLE_STATIONS, getStation, type StationId } from '../data/baseStations.ts';

export interface BuildModeCallbacks {
  onSelect: (stationId: StationId) => void;
  onClose: () => void;
}

let selected: StationId = 'workbench';

export function getSelectedBuildStation(): StationId {
  return selected;
}

export function openBuildModeUI(callbacks: BuildModeCallbacks): void {
  const modal = document.getElementById('build-mode-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  renderBuildPalette(callbacks);
}

export function closeBuildModeUI(): void {
  document.getElementById('build-mode-modal')?.classList.add('hidden');
}

export function isBuildModeUIOpen(): boolean {
  return !document.getElementById('build-mode-modal')?.classList.contains('hidden');
}

export function renderBuildPalette(callbacks: BuildModeCallbacks): void {
  const container = document.getElementById('build-station-picks');
  if (!container) return;
  container.innerHTML = '';

  for (const id of BUILDABLE_STATIONS) {
    const def = getStation(id);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `build-pick${selected === id ? ' selected' : ''}`;
    btn.textContent = def.name;
    btn.addEventListener('click', () => {
      selected = id;
      callbacks.onSelect(id);
      renderBuildPalette(callbacks);
    });
    container.appendChild(btn);
  }

  const closeBtn = document.getElementById('build-mode-close');
  if (closeBtn) {
    closeBtn.onclick = () => callbacks.onClose();
  }
}

export function bindBuildModeModal(callbacks: BuildModeCallbacks): void {
  document.getElementById('build-mode-close')?.addEventListener('click', () => callbacks.onClose());
}
