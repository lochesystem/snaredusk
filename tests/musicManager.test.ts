import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

class MockAudioElement {
  loop = false;
  preload = '';
  volume = 1;
  currentTime = 0;
  duration = 104.760979;
  paused = true;
  src = '';
  private listeners = new Map<string, Set<() => void>>();

  play = vi.fn(async () => {
    this.paused = false;
    return undefined;
  });

  pause = vi.fn(() => {
    this.paused = true;
  });

  load = vi.fn();

  removeAttribute = vi.fn((name: string) => {
    if (name === 'src') this.src = '';
  });

  addEventListener(type: string, listener: () => void, options?: { once?: boolean }): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
    if (options?.once) {
      const wrapped = () => {
        listener();
        this.listeners.get(type)?.delete(wrapped);
      };
      this.listeners.get(type)!.delete(listener);
      this.listeners.get(type)!.add(wrapped);
    }
  }

  dispatch(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) listener();
  }
}

let createdAudios: MockAudioElement[];

beforeEach(() => {
  createdAudios = [];
  vi.stubGlobal(
    'Audio',
    vi.fn(function AudioStub(this: unknown) {
      const audio = new MockAudioElement();
      createdAudios.push(audio);
      return audio;
    }) as unknown as typeof Audio,
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

import {
  getCurrentMusicTrack,
  playMusic,
  resetMusicForTests,
  setMusicUnlocked,
  stopMusic,
  syncMusicVolume,
} from '../src/engine/musicManager.ts';
import { loadAudioSettings, resetAudioSettingsForTests, saveAudioSettings } from '../src/systems/audioSettings.ts';

describe('musicManager', () => {
  beforeEach(() => {
    resetMusicForTests();
    resetAudioSettingsForTests();
    loadAudioSettings();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not play before unlock', () => {
    playMusic('title');
    expect(createdAudios).toHaveLength(0);
  });

  it('plays a track after unlock', async () => {
    setMusicUnlocked(true);
    playMusic('title');
    await Promise.resolve();
    expect(getCurrentMusicTrack()).toBe('title');
    expect(createdAudios.some((audio) => audio.play.mock.calls.length > 0)).toBe(true);
  });

  it('stops playback', async () => {
    setMusicUnlocked(true);
    playMusic('base');
    await Promise.resolve();
    const played = createdAudios.find((audio) => audio.play.mock.calls.length > 0);
    stopMusic();
    expect(getCurrentMusicTrack()).toBeNull();
    expect(played?.pause).toHaveBeenCalled();
  });

  it('syncs volume from settings', async () => {
    setMusicUnlocked(true);
    saveAudioSettings({ musicVolume: 0.4, sfxVolume: 0.8, muted: false });
    syncMusicVolume();
    playMusic('shop');
    await Promise.resolve();
    const playing = createdAudios.find((audio) => audio.src.includes('shop.mp3'));
    expect(playing?.volume).toBe(0.4);
  });

  it('crossfades the crystal biome ending into a fresh playback slot', async () => {
    setMusicUnlocked(true);
    playMusic('biome_cristal');
    await Promise.resolve();

    const first = createdAudios.find((audio) => audio.src.includes('biome_cristal.mp3'))!;
    expect(first.loop).toBe(false);
    first.currentTime = first.duration - 1;
    first.dispatch('timeupdate');
    await Promise.resolve();

    expect(createdAudios.filter((audio) => audio.src.includes('biome_cristal.mp3'))).toHaveLength(2);
    expect(createdAudios.every((audio) => audio.loop === false)).toBe(true);
  });
});
