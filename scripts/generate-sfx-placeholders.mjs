import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'public', 'assets', 'audio', 'sfx');

const SFX = [
  { name: 'combat_attack_knife', freq: 520, duration: 0.08 },
  { name: 'combat_attack_pickaxe', freq: 280, duration: 0.12 },
  { name: 'combat_attack_spear', freq: 420, duration: 0.07 },
  { name: 'combat_hit', freq: 180, duration: 0.06 },
  { name: 'combat_hurt', freq: 140, duration: 0.1 },
  { name: 'combat_dodge', freq: 360, duration: 0.09 },
  { name: 'dungeon_chest', freq: 240, duration: 0.14 },
  { name: 'dungeon_gate', freq: 200, duration: 0.18 },
  { name: 'capture_throw', freq: 440, duration: 0.1 },
  { name: 'capture_shake', freq: 300, duration: 0.05 },
  { name: 'capture_success', freq: 660, duration: 0.2 },
  { name: 'capture_fail', freq: 120, duration: 0.15 },
  { name: 'boss_intro', freq: 160, duration: 0.35 },
  { name: 'boss_phase2', freq: 90, duration: 0.4 },
  { name: 'boss_heatwave', freq: 70, duration: 0.25 },
  { name: 'boss_defeated', freq: 110, duration: 0.55 },
  { name: 'ui_click', freq: 800, duration: 0.04 },
  { name: 'ui_toast', freq: 500, duration: 0.06 },
];

function writeWav(filePath, freq, duration, volume = 0.28) {
  const sampleRate = 22050;
  const samples = Math.floor(sampleRate * duration);
  const dataSize = samples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const attack = Math.min(1, i / (sampleRate * 0.01));
    const release = Math.min(1, (samples - i) / (sampleRate * 0.04));
    const env = attack * release;
    const sample = Math.sin(2 * Math.PI * freq * t) * volume * env;
    buffer.writeInt16LE(Math.max(-32767, Math.min(32767, Math.floor(sample * 32767))), 44 + i * 2);
  }

  fs.writeFileSync(filePath, buffer);
}

fs.mkdirSync(outDir, { recursive: true });
for (const sfx of SFX) {
  writeWav(path.join(outDir, `${sfx.name}.wav`), sfx.freq, sfx.duration);
}
console.log(`Generated ${SFX.length} SFX in ${outDir}`);
