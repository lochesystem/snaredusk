import { describe, expect, it, beforeEach, vi } from 'vitest';

const memory = new Map<string, string>();

beforeEach(() => {
  memory.clear();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
    clear: () => {
      memory.clear();
    },
  });
});

import {
  AUDIO_SETTINGS_KEY,
  applyAudioSettings,
  getAudioSettings,
  loadAudioSettings,
  resetAudioSettingsForTests,
  saveAudioSettings,
} from '../src/systems/audioSettings.ts';
import { resetAudioForTests } from '../src/engine/audioManager.ts';
import { resetMusicForTests } from '../src/engine/musicManager.ts';

describe('audioSettings', () => {
  beforeEach(() => {
    resetAudioSettingsForTests();
    resetAudioForTests();
    resetMusicForTests();
    localStorage.clear();
  });

  it('loads defaults when nothing is saved', () => {
    const settings = loadAudioSettings();
    expect(settings.musicVolume).toBe(0.55);
    expect(settings.sfxVolume).toBe(0.65);
    expect(settings.muted).toBe(false);
  });

  it('persists settings in localStorage', () => {
    saveAudioSettings({ musicVolume: 0.2, sfxVolume: 0.9, muted: true });
    const raw = localStorage.getItem(AUDIO_SETTINGS_KEY);
    expect(raw).toContain('"muted":true');
    expect(getAudioSettings().musicVolume).toBe(0.2);
  });

  it('clamps invalid values', () => {
    saveAudioSettings({ musicVolume: 2, sfxVolume: -1, muted: false });
    expect(getAudioSettings()).toEqual({ musicVolume: 1, sfxVolume: 0, muted: false });
  });

  it('applies settings without throwing', () => {
    saveAudioSettings({ musicVolume: 0.3, sfxVolume: 0.4, muted: false });
    expect(() => applyAudioSettings()).not.toThrow();
  });
});
