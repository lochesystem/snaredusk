// @ts-expect-error O runtime do Vitest fornece node:fs; o bundle do jogo não inclui tipos Node.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const projectPath = (relative: string) => new URL(`../${relative}`, import.meta.url);

describe('interactable sprite assets', () => {
  it('mantém quatro quadros 64px estáveis para cada evento da masmorra', () => {
    for (const kind of ['rest', 'event', 'merchant'] as const) {
      const metadata = JSON.parse(readFileSync(
        projectPath(`public/assets/interactables/${kind}.json`),
        'utf8',
      ));

      expect(metadata.meta.size).toEqual({ w: 256, h: 64 });
      expect(metadata.meta.snaredusk).toMatchObject({
        kind,
        frameSize: 64,
        anchorX: 0.5,
      });
      expect(metadata.animations[kind]).toHaveLength(4);
      for (const frame of Object.values(metadata.frames) as Array<{ frame: { w: number; h: number } }>) {
        expect(frame.frame).toMatchObject({ w: 64, h: 64 });
      }
    }
  });
});
