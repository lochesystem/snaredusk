import { getBiomeDef, listBiomes } from '../data/biomes.ts';
import { isBiomeUnlocked, selectBiome } from '../systems/biomeProgress.ts';
import { assignPartyCompanion, stashPartyCompanion } from '../systems/party.ts';
import type { GameState } from '../types.ts';

export interface BaseModalCallbacks {
  getState: () => GameState;
  onChange: () => void;
  showToast: (msg: string) => void;
  onEnterDungeon: () => void;
}

export function openPartyModal(callbacks: BaseModalCallbacks): void {
  document.getElementById('party-modal')?.classList.remove('hidden');
  renderPartyModal(callbacks);
}

export function closePartyModal(): void {
  document.getElementById('party-modal')?.classList.add('hidden');
}

export function openDungeonModal(callbacks: BaseModalCallbacks): void {
  document.getElementById('dungeon-modal')?.classList.remove('hidden');
  renderDungeonModal(callbacks);
}

export function closeDungeonModal(): void {
  document.getElementById('dungeon-modal')?.classList.add('hidden');
}

export function openOrbsModal(_callbacks: BaseModalCallbacks): void {
  document.getElementById('orbs-modal')?.classList.remove('hidden');
}

export function closeOrbsModal(): void {
  document.getElementById('orbs-modal')?.classList.add('hidden');
}

export function renderPartyModal(callbacks: BaseModalCallbacks): void {
  const state = callbacks.getState();
  const current = document.getElementById('party-modal-current');
  const picks = document.getElementById('party-modal-picks');
  if (!current || !picks) return;

  current.textContent = state.partyCompanion
    ? `Na party: ${state.partyCompanion.name}`
    : 'Nenhum companheiro';

  picks.innerHTML = '';

  if (state.partyCompanion) {
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'party-pick';
    clearBtn.textContent = `Retirar ${state.partyCompanion.name}`;
    clearBtn.addEventListener('click', () => {
      if (stashPartyCompanion(state)) {
        callbacks.onChange();
        renderPartyModal(callbacks);
        callbacks.showToast('Companheiro guardado');
      } else {
        callbacks.showToast('Bolsa e habitat cheios');
      }
    });
    picks.appendChild(clearBtn);
  }

  state.bag.forEach((entry, index) => {
    if (!entry || entry.kind !== 'creature') return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'party-pick';
    btn.textContent = entry.name;
    btn.addEventListener('click', () => {
      const c = assignPartyCompanion(state, { kind: 'bag', index });
      if (c) {
        callbacks.onChange();
        renderPartyModal(callbacks);
        callbacks.showToast(`${c.name} vai com você!`);
      }
    });
    picks.appendChild(btn);
  });

  state.habitat.forEach((creature, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'party-pick';
    btn.textContent = `${creature.name} (habitat)`;
    btn.addEventListener('click', () => {
      const c = assignPartyCompanion(state, { kind: 'habitat', index });
      if (c) {
        callbacks.onChange();
        renderPartyModal(callbacks);
        callbacks.showToast(`${c.name} vai com você!`);
      }
    });
    picks.appendChild(btn);
  });
}

export function renderDungeonModal(callbacks: BaseModalCallbacks): void {
  const state = callbacks.getState();
  const container = document.getElementById('dungeon-modal-biomes');
  const btnEnter = document.getElementById('dungeon-modal-enter');
  if (!container) return;

  container.innerHTML = '';
  for (const biome of listBiomes()) {
    const unlocked = isBiomeUnlocked(state, biome.id);
    const selected = state.activeBiome === biome.id;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `biome-pick${selected ? ' selected' : ''}${unlocked ? '' : ' locked'}`;
    btn.disabled = !unlocked;
    btn.innerHTML = `<span class="biome-pick-title">${unlocked ? biome.name : `🔒 ${biome.name}`}</span>`;
    btn.addEventListener('click', () => {
      if (selectBiome(state, biome.id)) {
        callbacks.onChange();
        renderDungeonModal(callbacks);
      }
    });
    container.appendChild(btn);
  }

  if (btnEnter) {
    const active = getBiomeDef(state.activeBiome);
    btnEnter.textContent = `Entrar — ${active.shortName}`;
    btnEnter.onclick = () => {
      closeDungeonModal();
      callbacks.onEnterDungeon();
    };
  }
}

export function bindBaseModals(_callbacks: BaseModalCallbacks): void {
  document.getElementById('party-modal-close')?.addEventListener('click', () => closePartyModal());
  document.getElementById('dungeon-modal-close')?.addEventListener('click', () => closeDungeonModal());
  document.getElementById('orbs-modal-close')?.addEventListener('click', () => closeOrbsModal());
}
