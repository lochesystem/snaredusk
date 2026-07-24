import { Container, Graphics } from 'pixi.js';
import { createPixelText } from './pixelText.ts';

export interface EnemyStatusBars {
  root: Container;
  hpFill: Graphics;
  shieldFill: Graphics | null;
  barWidth: number;
  eliteLabel: ReturnType<typeof createPixelText> | null;
}

export function createEnemyStatusBars(
  hasShield: boolean,
  isBoss: boolean,
  isElite = false,
  eliteName = '',
): EnemyStatusBars {
  const barWidth = isBoss ? 34 : isElite ? 40 : 26;
  const root = new Container();
  root.y = isBoss ? -26 : isElite ? -31 : -22;

  const frame = new Graphics({ roundPixels: true });
  frame.roundRect(-barWidth / 2, 0, barWidth, 4, 1);
  frame.fill(0x120f1a);
  frame.roundRect(-barWidth / 2, 0, barWidth, 4, 1);
  frame.stroke({
    width: 1,
    color: isElite ? 0xd8b86b : 0x3d5c3a,
    alpha: 0.9,
  });
  root.addChild(frame);

  const hpFill = new Graphics({ roundPixels: true });
  root.addChild(hpFill);

  let shieldFill: Graphics | null = null;
  if (hasShield) {
    const shieldFrame = new Graphics({ roundPixels: true });
    shieldFrame.roundRect(-barWidth / 2, -6, barWidth, 3, 1);
    shieldFrame.fill(0x120f1a);
    shieldFrame.roundRect(-barWidth / 2, -6, barWidth, 3, 1);
    shieldFrame.stroke({ width: 1, color: 0x5a4a7a, alpha: 0.9 });
    root.addChild(shieldFrame);

    shieldFill = new Graphics({ roundPixels: true });
    root.addChild(shieldFill);
  }

  let eliteLabel: ReturnType<typeof createPixelText> | null = null;
  if (isElite) {
    eliteLabel = createPixelText(`ELITE · ${eliteName}`, 6, 0xf2d58c);
    eliteLabel.anchor.set(0.5, 1);
    eliteLabel.y = hasShield ? -9 : -4;
    root.addChild(eliteLabel);
  }

  return { root, hpFill, shieldFill, barWidth, eliteLabel };
}

export function updateEnemyStatusBars(
  bars: EnemyStatusBars,
  hp: number,
  maxHp: number,
  shieldHp: number,
  shieldMax: number,
): void {
  const w = bars.barWidth;
  const hpRatio = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
  const hpColor = hpRatio > 0.45 ? 0xe85d4a : hpRatio > 0.2 ? 0xff7040 : 0xff3030;

  bars.hpFill.clear();
  if (hpRatio > 0) {
    const fillW = Math.max(1, w * hpRatio);
    bars.hpFill.roundRect(-w / 2, 0, fillW, 4, 1).fill(hpColor);
  }

  if (bars.shieldFill) {
    bars.shieldFill.clear();
    if (shieldMax > 0 && shieldHp > 0) {
      const shRatio = Math.max(0, Math.min(1, shieldHp / shieldMax));
      const fillW = Math.max(1, w * shRatio);
      bars.shieldFill.roundRect(-w / 2, -6, fillW, 3, 1).fill(0x8ab4f8);
      bars.shieldFill.visible = true;
    } else {
      bars.shieldFill.visible = false;
    }
  }
}
