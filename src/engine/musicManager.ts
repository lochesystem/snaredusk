import { MUSIC_CATALOG, type MusicTrackId } from '../data/musicCatalog.ts';
import { getEffectiveMusicVolume } from '../systems/audioSettings.ts';

const FADE_MS = 1200;
const FADE_STEP_MS = 40;
const CRYSTAL_LOOP_CROSSFADE_MS = 1800;

let unlocked = false;
let currentId: MusicTrackId | null = null;
let fadeTimer: ReturnType<typeof setInterval> | null = null;
let slotA: HTMLAudioElement | null = null;
let slotB: HTMLAudioElement | null = null;
let activeSlot: HTMLAudioElement | null = null;
let inactiveSlot: HTMLAudioElement | null = null;
let loopTransitioning = false;

function usesSeamlessLoop(trackId: MusicTrackId | null): boolean {
  return trackId === 'biome_cristal';
}

function configureLoop(slot: HTMLAudioElement, trackId: MusicTrackId): void {
  // The crystal track has a sustained ending that does not join its opening
  // cleanly. It is looped by overlapping two slots below instead.
  slot.loop = !usesSeamlessLoop(trackId);
}

function startCrystalLoopCrossfade(fromSlot: HTMLAudioElement): void {
  if (
    loopTransitioning
    || currentId !== 'biome_cristal'
    || activeSlot !== fromSlot
    || !inactiveSlot
  ) return;

  loopTransitioning = true;
  const toSlot = inactiveSlot;
  const trackAtStart = currentId;
  toSlot.src = MUSIC_CATALOG[trackAtStart];
  toSlot.currentTime = 0;
  configureLoop(toSlot, trackAtStart);
  toSlot.volume = 0;

  void toSlot.play().then(() => {
    if (currentId !== trackAtStart || activeSlot !== fromSlot) {
      stopSlot(toSlot);
      loopTransitioning = false;
      return;
    }

    const steps = Math.max(1, Math.round(CRYSTAL_LOOP_CROSSFADE_MS / FADE_STEP_MS));
    const fromStart = fromSlot.volume;
    let step = 0;
    clearFadeTimer();
    fadeTimer = setInterval(() => {
      step += 1;
      const t = Math.min(1, step / steps);
      const targetVolume = getEffectiveMusicVolume();
      fromSlot.volume = fromStart * (1 - t);
      toSlot.volume = targetVolume * t;
      if (t >= 1) {
        clearFadeTimer();
        stopSlot(fromSlot);
        toSlot.volume = targetVolume;
        activeSlot = toSlot;
        inactiveSlot = fromSlot;
        loopTransitioning = false;
      }
    }, FADE_STEP_MS);
  }).catch(() => {
    // Keep native looping as a safe fallback if the second slot cannot start.
    fromSlot.loop = true;
    loopTransitioning = false;
  });
}

function monitorSeamlessLoop(slot: HTMLAudioElement): void {
  if (
    currentId !== 'biome_cristal'
    || activeSlot !== slot
    || !Number.isFinite(slot.duration)
    || slot.duration <= 0
  ) return;

  const crossfadeSeconds = CRYSTAL_LOOP_CROSSFADE_MS / 1000;
  if (slot.duration - slot.currentTime <= crossfadeSeconds) {
    startCrystalLoopCrossfade(slot);
  }
}

function createSlot(): HTMLAudioElement {
  const audio = new Audio();
  audio.loop = true;
  audio.preload = 'auto';
  audio.addEventListener('timeupdate', () => monitorSeamlessLoop(audio));
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
  loopTransitioning = false;
  clearFadeTimer();

  const nextSlot = inactive;
  nextSlot.src = url;
  nextSlot.currentTime = 0;
  configureLoop(nextSlot, trackId);
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
  loopTransitioning = false;
  currentId = null;
  if (slotA) stopSlot(slotA);
  if (slotB) stopSlot(slotB);
  activeSlot = slotA;
  inactiveSlot = slotB;
}

export function resetMusicForTests(): void {
  clearFadeTimer();
  loopTransitioning = false;
  currentId = null;
  if (slotA) stopSlot(slotA);
  if (slotB) stopSlot(slotB);
  unlocked = false;
  slotA = null;
  slotB = null;
  activeSlot = null;
  inactiveSlot = null;
}
