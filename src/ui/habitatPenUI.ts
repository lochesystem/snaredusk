import type { GameState } from '../types.ts';
import {
  countCreaturesInPen,
  getPenCapacity,
  moveCreatureToBag,
  moveCreatureToHabitat,
  moveCreatureToPen,
} from '../systems/habitat.ts';
import { DEFAULT_PEN_ID } from '../systems/habitatZones.ts';
import { formatYieldPerDay } from '../data/habitatYields.ts';

export interface HabitatPenCallbacks {
  getState: () => GameState;
  onChange: () => void;
  showToast: (msg: string) => void;
  onCreaturePlaced?: () => void;
}

let activePenId: string = DEFAULT_PEN_ID;

export function openHabitatPenModal(penId: string, callbacks: HabitatPenCallbacks): void {
  activePenId = penId;
  document.getElementById('habitat-pen-modal')?.classList.remove('hidden');
  renderHabitatPenModal(callbacks);
}

export function closeHabitatPenModal(): void {
  document.getElementById('habitat-pen-modal')?.classList.add('hidden');
}

export function isHabitatPenModalOpen(): boolean {
  return !document.getElementById('habitat-pen-modal')?.classList.contains('hidden');
}

export function renderHabitatPenModal(callbacks: HabitatPenCallbacks): void {
  const state = callbacks.getState();
  const title = document.getElementById('habitat-pen-title');
  const summary = document.getElementById('habitat-pen-summary');
  const inPen = document.getElementById('habitat-pen-in');
  const available = document.getElementById('habitat-pen-available');
  if (!title || !summary || !inPen || !available) return;

  const penName = 'Cercado';
  const cap = getPenCapacity(state, activePenId);
  const count = countCreaturesInPen(state, activePenId);

  title.textContent = penName;
  summary.textContent = `${count}/${cap} criaturas nesta área · Clique para mover entre zonas`;

  inPen.innerHTML = '';
  available.innerHTML = '';

  state.habitat.forEach((creature, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'party-pick';
    const inThisPen = creature.penId === activePenId;
    const yieldLabel = formatYieldPerDay(creature.speciesId);
    const yieldSuffix = yieldLabel ? ` · ${yieldLabel}` : '';
    btn.textContent = inThisPen ? `${creature.name} (aqui)${yieldSuffix}` : `${creature.name}${yieldSuffix}`;
    if (inThisPen) {
      btn.addEventListener('click', () => {
        const moved = moveCreatureToBag(state, index);
        if (moved) {
          callbacks.onChange();
          renderHabitatPenModal(callbacks);
          callbacks.showToast(`${moved.name} voltou para a bolsa`);
        } else {
          callbacks.showToast('Bolsa cheia');
        }
      });
      inPen.appendChild(btn);
    } else {
      btn.addEventListener('click', () => {
        const moved = moveCreatureToPen(state, index, activePenId);
        if (moved) {
          callbacks.onChange();
          renderHabitatPenModal(callbacks);
          callbacks.showToast(`${moved.name} entrou no ${penName.toLowerCase()}`);
        } else {
          callbacks.showToast('Área cheia');
        }
      });
      available.appendChild(btn);
    }
  });

  state.bag.forEach((entry, bagIndex) => {
    if (!entry || entry.kind !== 'creature') return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'party-pick';
    btn.textContent = `${entry.name} (bolsa)`;
    btn.addEventListener('click', () => {
      const moved = moveCreatureToHabitat(state, bagIndex, activePenId);
      if (moved) {
        callbacks.onChange();
        renderHabitatPenModal(callbacks);
        callbacks.showToast(`${moved.name} entrou no ${penName.toLowerCase()}`);
        callbacks.onCreaturePlaced?.();
      } else {
        callbacks.showToast('Área cheia ou bolsa inválida');
      }
    });
    available.appendChild(btn);
  });

  if (!inPen.children.length) {
    const empty = document.createElement('p');
    empty.className = 'panel-hint';
    empty.textContent = 'Nenhuma criatura nesta área.';
    inPen.appendChild(empty);
  }
  if (!available.children.length) {
    const empty = document.createElement('p');
    empty.className = 'panel-hint';
    empty.textContent = 'Nenhuma criatura disponível na bolsa ou em outras áreas.';
    available.appendChild(empty);
  }
}

export function bindHabitatPenModal(_callbacks: HabitatPenCallbacks): void {
  document.getElementById('habitat-pen-close')?.addEventListener('click', () => closeHabitatPenModal());
}
