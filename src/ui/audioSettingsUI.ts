import { playSfx } from '../engine/audioManager.ts';
import {
  getAudioSettings,
  saveAudioSettings,
  type AudioSettings,
} from '../systems/audioSettings.ts';
import {
  closeControllerBindingCapture,
  renderControllerSettings,
} from './controllerSettingsUI.ts';

function pctLabel(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function readForm(): AudioSettings {
  const music = document.getElementById('audio-music-volume') as HTMLInputElement | null;
  const sfx = document.getElementById('audio-sfx-volume') as HTMLInputElement | null;
  const mute = document.getElementById('audio-mute') as HTMLInputElement | null;
  return {
    musicVolume: Number(music?.value ?? 55) / 100,
    sfxVolume: Number(sfx?.value ?? 65) / 100,
    muted: Boolean(mute?.checked),
  };
}

function renderForm(settings: AudioSettings): void {
  const music = document.getElementById('audio-music-volume') as HTMLInputElement | null;
  const sfx = document.getElementById('audio-sfx-volume') as HTMLInputElement | null;
  const mute = document.getElementById('audio-mute') as HTMLInputElement | null;
  const musicValue = document.getElementById('audio-music-value');
  const sfxValue = document.getElementById('audio-sfx-value');

  if (music) music.value = String(Math.round(settings.musicVolume * 100));
  if (sfx) sfx.value = String(Math.round(settings.sfxVolume * 100));
  if (mute) mute.checked = settings.muted;
  if (musicValue) musicValue.textContent = pctLabel(settings.musicVolume);
  if (sfxValue) sfxValue.textContent = pctLabel(settings.sfxVolume);
}

function onSettingsChange(): void {
  const next = readForm();
  saveAudioSettings(next);
  renderForm(next);
}

export function bindAudioSettingsModal(): void {
  const music = document.getElementById('audio-music-volume');
  const sfx = document.getElementById('audio-sfx-volume');
  const mute = document.getElementById('audio-mute');

  music?.addEventListener('input', onSettingsChange);
  sfx?.addEventListener('input', onSettingsChange);
  mute?.addEventListener('change', onSettingsChange);

  document.getElementById('audio-settings-close')?.addEventListener('click', () => {
    playSfx('ui.click');
    closeAudioSettingsModal();
  });
}

export function openAudioSettingsModal(): void {
  renderForm(getAudioSettings());
  renderControllerSettings();
  document.getElementById('audio-settings-modal')?.classList.remove('hidden');
}

export function closeAudioSettingsModal(): void {
  closeControllerBindingCapture();
  document.getElementById('audio-settings-modal')?.classList.add('hidden');
}

export function isAudioSettingsModalOpen(): boolean {
  return !document.getElementById('audio-settings-modal')?.classList.contains('hidden');
}
