import type { Container } from 'pixi.js';
import { BIOME_ORDER, getBiomeDef, type BiomeId } from '../data/biomes.ts';
import { getSpecies } from '../data/creatures.ts';
import {
  getBestiaryEntries,
  getBestiaryProgress,
  type BestiaryEntryView,
} from '../systems/bestiary.ts';
import type { GameState } from '../types.ts';
import { createCreatureSprite } from '../world/placeholderArt.ts';

export interface BestiaryUICallbacks {
  getState: () => GameState;
  setPixiIcon?: (img: HTMLImageElement, createIcon: () => Container, cacheKey: string) => void;
}

let activeBiome: BiomeId = 'floresta';
let activeCallbacks: BestiaryUICallbacks | null = null;

function appendCreaturePreview(
  target: HTMLElement,
  entry: BestiaryEntryView,
  callbacks: BestiaryUICallbacks,
): void {
  const preview = document.createElement('img');
  preview.className = `bestiary-creature${entry.discovered ? '' : ' undiscovered'}`;
  preview.alt = entry.discovered ? entry.name : 'Criatura ainda não registrada';
  callbacks.setPixiIcon?.(
    preview,
    () => createCreatureSprite(getSpecies(entry.speciesId)),
    `bestiary-${entry.speciesId}`,
  );
  target.appendChild(preview);
}

function createStat(label: string, value: number): HTMLElement {
  const stat = document.createElement('span');
  const key = document.createElement('small');
  key.textContent = label;
  const number = document.createElement('strong');
  number.textContent = String(value);
  stat.append(key, number);
  return stat;
}

function createDetail(label: string, value: string): HTMLElement {
  const row = document.createElement('p');
  row.className = 'bestiary-detail';
  const key = document.createElement('span');
  key.textContent = label;
  const text = document.createElement('strong');
  text.textContent = value;
  row.append(key, text);
  return row;
}

function createEntryCard(
  entry: BestiaryEntryView,
  callbacks: BestiaryUICallbacks,
): HTMLElement {
  const card = document.createElement('article');
  card.className = `bestiary-card${entry.discovered ? ' discovered' : ' locked'}${entry.isBoss ? ' boss' : ''}`;
  card.dataset.speciesId = entry.speciesId;

  const heading = document.createElement('div');
  heading.className = 'bestiary-card-heading';
  const number = document.createElement('span');
  number.className = 'bestiary-index';
  number.textContent = String(entry.slot + 1).padStart(2, '0');
  const title = document.createElement('h4');
  title.textContent = entry.name;
  heading.append(number, title);
  if (entry.isBoss) {
    const badge = document.createElement('span');
    badge.className = 'bestiary-boss-badge';
    badge.textContent = 'CHEFE';
    heading.appendChild(badge);
  }

  const body = document.createElement('div');
  body.className = 'bestiary-card-body';
  const portrait = document.createElement('div');
  portrait.className = 'bestiary-portrait';
  appendCreaturePreview(portrait, entry, callbacks);
  body.appendChild(portrait);

  const info = document.createElement('div');
  info.className = 'bestiary-card-info';
  if (!entry.discovered || !entry.stats) {
    const locked = document.createElement('p');
    locked.className = 'bestiary-locked-copy';
    locked.textContent = entry.isBoss
      ? 'Derrote ou capture esta criatura para revelar o registro.'
      : 'Capture esta criatura para revelar o registro.';
    info.appendChild(locked);
  } else {
    const role = document.createElement('p');
    role.className = 'bestiary-role';
    role.textContent = entry.role ?? 'Criatura';
    const stats = document.createElement('div');
    stats.className = 'bestiary-stats';
    stats.append(
      createStat('HP', entry.stats.hp),
      createStat('ATK', entry.stats.atk),
      createStat('DEF', entry.stats.def),
      createStat('VEL', entry.stats.speed),
    );
    info.append(
      role,
      stats,
      createDetail('Drop', entry.drop ?? '—'),
      createDetail('Cercado', entry.production ?? 'Não produz'),
      createDetail('Companheiro', entry.companionAvailable ? 'Disponível' : 'Indisponível'),
    );
  }
  body.appendChild(info);
  card.append(heading, body);
  return card;
}

export function renderBestiaryModal(callbacks: BestiaryUICallbacks): void {
  activeCallbacks = callbacks;
  const state = callbacks.getState();
  const grid = document.getElementById('bestiary-grid');
  const totalLabel = document.getElementById('bestiary-total-progress');
  const biomeLabel = document.getElementById('bestiary-biome-progress');
  if (!grid || !totalLabel || !biomeLabel) return;

  const total = getBestiaryProgress(state);
  const biomeProgress = getBestiaryProgress(state, activeBiome);
  totalLabel.textContent = `${total.discovered}/${total.total} registros`;
  biomeLabel.textContent = `${getBiomeDef(activeBiome).name} · ${biomeProgress.discovered}/${biomeProgress.total}`;

  document.querySelectorAll<HTMLButtonElement>('.bestiary-biome-tab').forEach((button) => {
    button.classList.toggle('active', button.dataset.biome === activeBiome);
  });

  grid.replaceChildren(
    ...getBestiaryEntries(state, activeBiome).map((entry) => createEntryCard(entry, callbacks)),
  );
}

export function openBestiaryModal(
  callbacks: BestiaryUICallbacks,
  biomeId: BiomeId = activeBiome,
): void {
  activeBiome = BIOME_ORDER.includes(biomeId) ? biomeId : 'floresta';
  document.getElementById('bestiary-modal')?.classList.remove('hidden');
  renderBestiaryModal(callbacks);
}

export function closeBestiaryModal(): void {
  document.getElementById('bestiary-modal')?.classList.add('hidden');
}

export function isBestiaryModalOpen(): boolean {
  const modal = document.getElementById('bestiary-modal');
  return modal ? !modal.classList.contains('hidden') : false;
}

export function bindBestiaryModal(): void {
  document.getElementById('bestiary-modal-close')?.addEventListener('click', closeBestiaryModal);
  document.querySelectorAll<HTMLButtonElement>('.bestiary-biome-tab').forEach((button) => {
    button.addEventListener('click', () => {
      const biomeId = button.dataset.biome as BiomeId;
      if (!BIOME_ORDER.includes(biomeId) || !activeCallbacks) return;
      activeBiome = biomeId;
      renderBestiaryModal(activeCallbacks);
    });
  });
}
