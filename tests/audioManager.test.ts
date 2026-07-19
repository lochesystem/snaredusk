import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

class MockAudioBuffer {}

class MockBufferSource {
  buffer: AudioBuffer | null = null;
  playbackRate = { value: 1 };
  connect = vi.fn();
  start = vi.fn();
}

class MockGainNode {
  gain = { value: 1 };
  connect = vi.fn();
}

class MockAudioContext {
  state: AudioContextState = 'running';
  destination = {};
  resume = vi.fn(async () => {
    this.state = 'running';
  });
  close = vi.fn(async () => {
    this.state = 'closed';
  });
  createBufferSource = vi.fn(() => new MockBufferSource());
  createGain = vi.fn(() => new MockGainNode());
  decodeAudioData = vi.fn(async () => new MockAudioBuffer() as AudioBuffer);
}

let mockCtx: MockAudioContext;

beforeEach(() => {
  mockCtx = new MockAudioContext();
  vi.stubGlobal(
    'AudioContext',
    vi.fn(function AudioContextStub(this: unknown) {
      return mockCtx;
    }) as unknown as typeof AudioContext,
  );
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

import {
  playSfx,
  preloadAudio,
  resetAudioForTests,
  setAudioMuted,
  unlockAudio,
} from '../src/engine/audioManager.ts';

describe('audioManager', () => {
  beforeEach(() => {
    resetAudioForTests();
  });

  it('does not play before unlock', async () => {
    preloadAudio();
    playSfx('ui.click');
    await new Promise((r) => setTimeout(r, 0));
    expect(mockCtx.createBufferSource).not.toHaveBeenCalled();
  });

  it('plays after unlock', async () => {
    preloadAudio();
    await unlockAudio();
    playSfx('combat.hit');
    await new Promise((r) => setTimeout(r, 0));
    expect(mockCtx.createBufferSource).toHaveBeenCalled();
    expect(mockCtx.createGain).toHaveBeenCalled();
  });

  it('respects mute', async () => {
    await unlockAudio();
    setAudioMuted(true);
    playSfx('ui.toast');
    await new Promise((r) => setTimeout(r, 0));
    expect(mockCtx.createBufferSource).not.toHaveBeenCalled();
  });
});
