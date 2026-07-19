import { setAudioMuted, setAudioVolume } from '../engine/audioManager.ts';
import { syncMusicVolume } from '../engine/musicManager.ts';

export const AUDIO_SETTINGS_KEY = 'snaredusk-audio-settings';

export interface AudioSettings {
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
}

const DEFAULT_SETTINGS: AudioSettings = {
  musicVolume: 0.55,
  sfxVolume: 0.65,
  muted: false,
};

let current: AudioSettings = { ...DEFAULT_SETTINGS };

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function normalizeSettings(raw: Partial<AudioSettings> | null | undefined): AudioSettings {
  return {
    musicVolume: clamp01(raw?.musicVolume ?? DEFAULT_SETTINGS.musicVolume),
    sfxVolume: clamp01(raw?.sfxVolume ?? DEFAULT_SETTINGS.sfxVolume),
    muted: Boolean(raw?.muted),
  };
}

function storage(): Storage | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage;
}

export function loadAudioSettings(): AudioSettings {
  try {
    const raw = storage()?.getItem(AUDIO_SETTINGS_KEY);
    if (!raw) {
      current = { ...DEFAULT_SETTINGS };
      return getAudioSettings();
    }
    current = normalizeSettings(JSON.parse(raw) as Partial<AudioSettings>);
  } catch {
    current = { ...DEFAULT_SETTINGS };
  }
  return getAudioSettings();
}

export function getAudioSettings(): AudioSettings {
  return { ...current };
}

export function saveAudioSettings(next: AudioSettings): void {
  current = normalizeSettings(next);
  storage()?.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(current));
  applyAudioSettings();
}

export function applyAudioSettings(): void {
  setAudioMuted(current.muted);
  setAudioVolume(current.sfxVolume);
  syncMusicVolume();
}

export function getEffectiveMusicVolume(): number {
  return current.muted ? 0 : current.musicVolume;
}

export function resetAudioSettingsForTests(): void {
  current = { ...DEFAULT_SETTINGS };
  storage()?.removeItem(AUDIO_SETTINGS_KEY);
}
