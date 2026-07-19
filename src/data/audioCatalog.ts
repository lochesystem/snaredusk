const BASE = import.meta.env.BASE_URL;

function sfxPath(filename: string): string {
  return `${BASE}assets/audio/sfx/${filename}`;
}

export const AUDIO_CATALOG = {
  'combat.attack.knife': sfxPath('combat_attack_knife.wav'),
  'combat.attack.pickaxe': sfxPath('combat_attack_pickaxe.wav'),
  'combat.attack.spear': sfxPath('combat_attack_spear.wav'),
  'combat.hit': sfxPath('combat_hit.wav'),
  'combat.hurt': sfxPath('combat_hurt.wav'),
  'combat.dodge': sfxPath('combat_dodge.wav'),
  'dungeon.chest': sfxPath('dungeon_chest.wav'),
  'dungeon.gate': sfxPath('dungeon_gate.wav'),
  'capture.throw': sfxPath('capture_throw.wav'),
  'capture.shake': sfxPath('capture_shake.wav'),
  'capture.success': sfxPath('capture_success.wav'),
  'capture.fail': sfxPath('capture_fail.wav'),
  'boss.intro': sfxPath('boss_intro.wav'),
  'boss.phase2': sfxPath('boss_phase2.wav'),
  'boss.heatwave': sfxPath('boss_heatwave.wav'),
  'boss.defeated': sfxPath('boss_defeated.wav'),
  'ui.click': sfxPath('ui_click.wav'),
  'ui.toast': sfxPath('ui_toast.wav'),
} as const;

export type SfxId = keyof typeof AUDIO_CATALOG;

export const ALL_SFX_IDS = Object.keys(AUDIO_CATALOG) as SfxId[];
