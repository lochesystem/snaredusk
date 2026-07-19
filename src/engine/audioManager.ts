import { ALL_SFX_IDS, AUDIO_CATALOG, type SfxId } from '../data/audioCatalog.ts';

let unlocked = false;
let muted = false;
let volume = 0.65;
let preloaded = false;
let ctx: AudioContext | null = null;

const buffers = new Map<SfxId, AudioBuffer>();
const loading = new Map<SfxId, Promise<AudioBuffer | null>>();

export function setAudioMuted(next: boolean): void {
  muted = next;
}

export function setAudioVolume(next: number): void {
  volume = Math.max(0, Math.min(1, next));
}

export function isAudioUnlocked(): boolean {
  return unlocked;
}

function getContext(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

async function resumeContext(): Promise<void> {
  const audio = getContext();
  if (!audio || audio.state !== 'suspended') return;
  try {
    await audio.resume();
  } catch {
    // Ignore resume failures (autoplay policy).
  }
}

export async function unlockAudio(): Promise<void> {
  if (unlocked) return;
  unlocked = true;
  await resumeContext();
}

async function loadBuffer(id: SfxId): Promise<AudioBuffer | null> {
  const cached = buffers.get(id);
  if (cached) return cached;

  const pending = loading.get(id);
  if (pending) return pending;

  const audio = getContext();
  if (!audio) return null;

  const promise = fetch(AUDIO_CATALOG[id])
    .then((res) => {
      if (!res.ok) throw new Error(`SFX not found: ${id}`);
      return res.arrayBuffer();
    })
    .then((data) => audio.decodeAudioData(data))
    .catch(() => null);

  loading.set(id, promise);
  const decoded = await promise;
  loading.delete(id);
  if (decoded) buffers.set(id, decoded);
  return decoded;
}

export function preloadAudio(): void {
  if (preloaded) return;
  preloaded = true;
  for (const id of ALL_SFX_IDS) {
    void loadBuffer(id);
  }
}

function safeVolume(value: number | undefined): number {
  const v = value ?? volume;
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.65;
}

export function playSfx(id: SfxId, options?: { volume?: number; speed?: number }): void {
  if (muted || !unlocked) return;
  if (!preloaded) preloadAudio();

  void (async () => {
    const audio = getContext();
    if (!audio) return;
    await resumeContext();

    const buffer = await loadBuffer(id);
    if (!buffer) return;

    const source = audio.createBufferSource();
    source.buffer = buffer;
    if (options?.speed && Number.isFinite(options.speed) && options.speed > 0) {
      source.playbackRate.value = options.speed;
    }

    const gain = audio.createGain();
    gain.gain.value = safeVolume(options?.volume);

    source.connect(gain);
    gain.connect(audio.destination);
    try {
      source.start(0);
    } catch {
      // Ignore if context was interrupted mid-play.
    }
  })();
}

export function resetAudioForTests(): void {
  unlocked = false;
  muted = false;
  volume = 0.65;
  preloaded = false;
  buffers.clear();
  loading.clear();
  if (ctx) {
    void ctx.close();
    ctx = null;
  }
}
