import { MUSIC_CATALOG, type MusicTrackId } from '../data/musicCatalog.ts';
import { getEffectiveMusicVolume } from '../systems/audioSettings.ts';

const FADE_MS = 1200;
const FADE_STEP_MS = 40;

let unlocked = false;
let currentId: MusicTrackId | null = null;
let fadeTimer: ReturnType<typeof setInterval> | null = null;
let slotA: HTMLAudioElement | null = null;
let slotB: HTMLAudioElement | null = null;
let activeSlot: HTMLAudioElement | null = null;
let inactiveSlot: HTMLAudioElement | null = null;

function createSlot(): HTMLAudioElement {
  const audio = new Audio();
  audio.loop = true;
  audio.preload = 'auto';
  return audio;
}

function ensureSlots(): { active: HTMLAudioElement; inactive: HTMLAudioElement } {
  if (!slotA) slotA = createSlot();
  if (!slotB) slotB = createSlot();
  if (!activeSlot) activeSlot = slotA;
  if (!inactiveSlot) inactiveSlot = slotB;
  return { active: activeSlot, inactive: inactiveSlot };
}

function clearFadeTimer(): void {
  if (!fadeTimer) return;
  clearInterval(fadeTimer);
  fadeTimer = null;
}

function applySlotVolume(slot: HTMLAudioElement): void {
  slot.volume = getEffectiveMusicVolume();
}

function stopSlot(slot: HTMLAudioElement): void {
  slot.pause();
  slot.currentTime = 0;
  slot.removeAttribute('src');
  slot.load();
}

export function setMusicUnlocked(next: boolean): void {
  unlocked = next;
}

export function syncMusicVolume(): void {
  if (typeof Audio === 'undefined') return;
  const { active, inactive } = ensureSlots();
  applySlotVolume(active);
  applySlotVolume(inactive);
}

export function getCurrentMusicTrack(): MusicTrackId | null {
  return currentId;
}

export function playMusic(trackId: MusicTrackId): void {
  if (!unlocked) return;
  const { active, inactive } = ensureSlots();
  if (currentId === trackId && !active.paused) return;

  const url = MUSIC_CATALOG[trackId];
  currentId = trackId;
  clearFadeTimer();

  const nextSlot = inactive;
  nextSlot.src = url;
  nextSlot.currentTime = 0;
  applySlotVolume(nextSlot);

  const startFade = (): void => {
    const fromSlot = active;
    const toSlot = nextSlot;
    const targetVolume = getEffectiveMusicVolume();

    if (targetVolume <= 0 || fromSlot.paused) {
      stopSlot(fromSlot);
      toSlot.volume = targetVolume;
      void toSlot.play().catch(() => {
        // Autoplay policy or missing asset — ignore.
      });
      activeSlot = toSlot;
      inactiveSlot = fromSlot;
      return;
    }

    const steps = Math.max(1, Math.round(FADE_MS / FADE_STEP_MS));
    let step = 0;
    const fromStart = fromSlot.volume;
    toSlot.volume = 0;
    void toSlot.play().catch(() => {
      // Ignore play failures during crossfade.
    });

    fadeTimer = setInterval(() => {
      step += 1;
      const t = step / steps;
      fromSlot.volume = fromStart * (1 - t);
      toSlot.volume = targetVolume * t;
      if (step >= steps) {
        clearFadeTimer();
        stopSlot(fromSlot);
        toSlot.volume = targetVolume;
        activeSlot = toSlot;
        inactiveSlot = fromSlot;
      }
    }, FADE_STEP_MS);
  };

  void nextSlot.play()
    .then(startFade)
    .catch(() => {
      nextSlot.addEventListener(
        'canplay',
        () => {
          void nextSlot.play().then(startFade).catch(() => {
            currentId = null;
          });
        },
        { once: true },
      );
    });
}

export function stopMusic(): void {
  clearFadeTimer();
  currentId = null;
  if (slotA) stopSlot(slotA);
  if (slotB) stopSlot(slotB);
  activeSlot = slotA;
  inactiveSlot = slotB;
}

export function resetMusicForTests(): void {
  clearFadeTimer();
  currentId = null;
  if (slotA) stopSlot(slotA);
  if (slotB) stopSlot(slotB);
  unlocked = false;
  slotA = null;
  slotB = null;
  activeSlot = null;
  inactiveSlot = null;
}
