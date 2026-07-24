// @ts-expect-error O runtime do Vitest fornece node:fs; o bundle do jogo não inclui tipos Node.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HOOD_IDS } from '../src/data/hoods.ts';

const projectPath = (relative: string) => new URL(`../${relative}`, import.meta.url);

describe('hood sprite assets', () => {
  it('mantém cinco folhas 2×2 de 48px para cada capuz temático', () => {
    const sheets = [
      ['player-idle', 'idle'],
      ['player-walk', 'walk'],
      ['player-attack-faca', 'attack'],
      ['player-attack-picareta', 'attack'],
      ['player-attack-lanca', 'attack'],
    ] as const;

    for (const hoodId of HOOD_IDS.filter((id) => id !== 'cacador')) {
      for (const [sheet, animation] of sheets) {
        const metadata = JSON.parse(readFileSync(
          projectPath(`public/assets/player/skins/${hoodId}/${sheet}.json`),
          'utf8',
        ));
        expect(metadata.meta.size).toEqual({ w: 96, h: 96 });
        expect(metadata.meta.snaredusk).toMatchObject({
          anchorX: 0.5,
          anchorY: 0.92,
          shadowY: 0,
        });
        expect(metadata.animations[animation]).toHaveLength(4);
        for (const frame of Object.values(metadata.frames) as Array<{ frame: { w: number; h: number } }>) {
          expect(frame.frame).toMatchObject({ w: 48, h: 48 });
        }
      }
    }
  });
});
