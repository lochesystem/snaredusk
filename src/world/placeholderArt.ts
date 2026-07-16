import { Container, Graphics, Text } from 'pixi.js';
import type { SpeciesDef } from '../types.ts';

const SHADOW_COLOR = 0x000000;

export function drawShadow(parent: Container, width: number): Graphics {
  const shadow = new Graphics();
  shadow.ellipse(0, 0, width * 0.3, width * 0.1);
  shadow.fill({ color: SHADOW_COLOR, alpha: 0.35 });
  parent.addChild(shadow);
  return shadow;
}

export function createPlayerSprite(): Container {
  const root = new Container();
  const shadow = drawShadow(root, 20);
  shadow.y = 8;

  const body = new Graphics();
  body.roundRect(-8, -14, 16, 22, 3);
  body.fill(0xe8a84a);
  body.stroke({ width: 2, color: 0x8a5a20 });
  root.addChild(body);

  const head = new Graphics();
  head.circle(0, -18, 7);
  head.fill(0xf0d060);
  head.stroke({ width: 1, color: 0x8a5a20 });
  root.addChild(head);

  (root as Container & { zOffset?: number }).zOffset = 0.5;
  return root;
}

export function createCreatureSprite(species: SpeciesDef, capturableGlow = false): Container {
  const root = new Container();
  const shadow = drawShadow(root, 18);
  shadow.y = 6;

  const body = new Graphics();
  body.roundRect(-10, -10, 20, 16, 4);
  body.fill(species.color);
  body.stroke({ width: 2, color: 0x1a2e1a });
  root.addChild(body);

  const eyes = new Graphics();
  eyes.circle(-4, -4, 2);
  eyes.circle(4, -4, 2);
  eyes.fill(species.accent);
  root.addChild(eyes);

  if (capturableGlow) {
    const glow = new Graphics();
    glow.roundRect(-12, -12, 24, 20, 5);
    glow.stroke({ width: 2, color: 0xc4f082, alpha: 0.9 });
    root.addChildAt(glow, 0);
  }

  (root as Container & { zOffset?: number }).zOffset = 0.5;
  return root;
}

export function createPortalSprite(): Container {
  const root = new Container();
  const ring = new Graphics();
  ring.circle(0, 0, 18);
  ring.stroke({ width: 3, color: 0xc4f082 });
  ring.fill({ color: 0x5dbb63, alpha: 0.35 });
  root.addChild(ring);

  const label = new Text({
    text: 'Portal',
    style: { fontFamily: 'monospace', fontSize: 9, fill: 0xf0e6d3 },
  });
  label.anchor.set(0.5);
  label.y = -28;
  root.addChild(label);
  return root;
}

export function drawDungeonLayout(
  g: Graphics,
  layout: {
    floors: { x: number; y: number; width: number; height: number }[];
    walls: { x: number; y: number; width: number; height: number }[];
    rooms: { rect: { x: number; y: number; width: number; height: number } }[];
    decor: { kind: string; x: number; y: number; size: number; variant: number }[];
    obstacles: { kind: string; x: number; y: number; radius: number }[];
    chests: { x: number; y: number; opened?: boolean }[];
    width: number;
    height: number;
  },
): void {
  const { floors, walls, rooms, decor, obstacles, chests, width, height } = layout;

  g.rect(0, 0, width, height);
  g.fill(0x120f1a);

  for (const floor of floors) {
    g.rect(floor.x, floor.y, floor.width, floor.height);
    g.fill(0x2a4a2a);
  }

  for (const obs of obstacles) {
    if (obs.kind !== 'hole') continue;
    g.circle(obs.x, obs.y, obs.radius);
    g.fill(0x0a0810);
    g.circle(obs.x, obs.y, obs.radius);
    g.stroke({ width: 2, color: 0x1a1520, alpha: 0.9 });
    g.circle(obs.x - obs.radius * 0.25, obs.y - obs.radius * 0.2, obs.radius * 0.2);
    g.fill({ color: 0x151018, alpha: 0.6 });
  }

  for (const wall of walls) {
    g.rect(wall.x, wall.y, wall.width, wall.height);
    g.fill(0x1a2e1a);
    g.rect(wall.x, wall.y, wall.width, wall.height);
    g.stroke({ width: 2, color: 0x3d5c3a });
  }

  for (const obs of obstacles) {
    if (obs.kind !== 'rock') continue;
    g.roundRect(obs.x - obs.radius, obs.y - obs.radius * 0.8, obs.radius * 2, obs.radius * 1.6, 4);
    g.fill(0x4a4a5a);
    g.roundRect(obs.x - obs.radius + 2, obs.y - obs.radius * 0.8 + 2, obs.radius * 1.4, obs.radius * 0.9, 3);
    g.fill({ color: 0x6a6a7a, alpha: 0.7 });
  }

  for (const room of rooms) {
    const r = room.rect;
    g.rect(r.x + 4, r.y + 4, r.width - 8, 22);
    g.fill({ color: 0x1a2e1a, alpha: 0.35 });
  }

  for (const d of decor) {
    if (d.kind !== 'mushroom') continue;
    const cap = d.variant === 0 ? 0x5dbb63 : d.variant === 1 ? 0x8fd894 : 0x6b9a6b;
    const stem = 0x4a6a4a;
    g.circle(d.x, d.y - 2, d.size);
    g.fill(cap);
    g.rect(d.x - 2, d.y, 4, d.size + 3);
    g.fill(stem);
  }

  for (const chest of chests) {
    drawChestGraphic(g, chest.x, chest.y, chest.opened ?? false);
  }
}

export function drawChestGraphic(g: Graphics, x: number, y: number, opened: boolean): void {
  const w = 18;
  const h = 14;
  g.roundRect(x - w / 2, y - h / 2, w, h, 2);
  g.fill(opened ? 0x5a4a30 : 0x8a6a30);
  g.roundRect(x - w / 2, y - h / 2, w, h, 2);
  g.stroke({ width: 2, color: 0xc4a040 });
  g.rect(x - w / 2 + 2, y - 2, w - 4, 3);
  g.fill(0xc4a040);
  if (opened) {
    g.rect(x - w / 2 + 1, y - h / 2 - 4, w - 2, 5);
    g.fill({ color: 0x3a3020, alpha: 0.8 });
  }
}

export function createChestSprite(opened = false): Container {
  const root = new Container();
  const gfx = new Graphics();
  drawChestGraphic(gfx, 0, 0, opened);
  root.addChild(gfx);
  (root as Container & { zOffset?: number }).zOffset = 0.5;
  return root;
}

/** Câmara acolhedora da base — piso mais claro, musgos e luzes suaves. */
export function drawHabitatLayout(
  g: Graphics,
  floors: { x: number; y: number; width: number; height: number }[],
  walls: { x: number; y: number; width: number; height: number }[],
  decorSeed: number,
  worldWidth: number,
  worldHeight: number,
): void {
  g.rect(0, 0, worldWidth, worldHeight);
  g.fill(0x14101c);

  for (const floor of floors) {
    g.rect(floor.x, floor.y, floor.width, floor.height);
    g.fill(0x355a35);
    g.rect(floor.x + 6, floor.y + 6, floor.width - 12, floor.height - 12);
    g.fill(0x3d6a3d);
  }

  for (const wall of walls) {
    g.rect(wall.x, wall.y, wall.width, wall.height);
    g.fill(0x2a4a2a);
    g.rect(wall.x, wall.y, wall.width, wall.height);
    g.stroke({ width: 2, color: 0x4d7a4d });
  }

  const floor = floors[0];
  if (!floor) return;

  g.rect(floor.x + 8, floor.y + 8, floor.width - 16, 28);
  g.fill({ color: 0x2a4a2a, alpha: 0.35 });

  const lampCount = 3;
  for (let i = 0; i < lampCount; i++) {
    const lx = floor.x + 40 + i * ((floor.width - 80) / (lampCount - 1));
    const ly = floor.y + 22;
    g.circle(lx, ly, 10);
    g.fill({ color: 0xc4f082, alpha: 0.12 });
    g.circle(lx, ly, 4);
    g.fill(0xe8d878);
  }

  const mushCount = 5 + (decorSeed % 3);
  for (let i = 0; i < mushCount; i++) {
    const mx = floor.x + 20 + ((decorSeed + i * 53) % (floor.width - 40));
    const my = floor.y + floor.height - 16 - ((decorSeed + i * 17) % 28);
    const r = 3 + (i % 3);
    g.circle(mx, my, r);
    g.fill(i % 2 === 0 ? 0x5dbb63 : 0x8fd894);
    g.rect(mx - 2, my, 4, 6 + (i % 2));
    g.fill(0x6b9a6b);
  }
}

/** @deprecated use drawDungeonLayout */
export function drawDungeonFloor(
  g: Graphics,
  rooms: { x: number; y: number; width: number; height: number }[],
): void {
  for (const room of rooms) {
    g.rect(room.x, room.y, room.width, room.height);
    g.fill(0x2a4a2a);

    // Borda musgo
    g.rect(room.x, room.y, room.width, room.height);
    g.stroke({ width: 3, color: 0x3d5c3a });

    // Detalhe oblíquo: faixa superior mais escura (pseudo profundidade)
    g.rect(room.x + 4, room.y + 4, room.width - 8, 24);
    g.fill({ color: 0x1a2e1a, alpha: 0.45 });
  }

  // Cogumelos decorativos
  for (const room of rooms) {
    for (let i = 0; i < 4; i++) {
      const mx = room.x + 30 + i * 60;
      const my = room.y + room.height - 20;
      g.circle(mx, my, 5);
      g.fill(0x5dbb63);
      g.rect(mx - 2, my, 4, 8);
      g.fill(0x8fd894);
    }
  }
}

export function drawAttackSlash(g: Graphics, x: number, y: number, angle: number): void {
  g.clear();
  g.arc(x, y, 20, angle - 0.8, angle + 0.8);
  g.stroke({ width: 4, color: 0xf0e6d3, alpha: 0.85 });
}

export function drawDamageNumber(parent: Container, amount: number, x: number, y: number): void {
  const t = new Text({
    text: String(amount),
    style: { fontFamily: 'monospace', fontSize: 11, fill: 0xffffff, fontWeight: 'bold' },
  });
  t.anchor.set(0.5);
  t.x = x;
  t.y = y;
  parent.addChild(t);

  let life = 0.6;
  const tick = () => {
    life -= 0.016;
    t.y -= 0.6;
    t.alpha = Math.max(0, life);
    if (life > 0) requestAnimationFrame(tick);
    else parent.removeChild(t);
  };
  requestAnimationFrame(tick);
}

export function createCaptureOrbGraphic(): Graphics {
  const g = new Graphics();
  g.circle(0, 0, 6);
  g.fill({ color: 0x8ab4f8, alpha: 0.95 });
  g.circle(0, 0, 9);
  g.stroke({ width: 2, color: 0xc4f082, alpha: 0.9 });
  g.circle(-2, -2, 2);
  g.fill({ color: 0xffffff, alpha: 0.7 });
  return g;
}

export function drawCaptureBurst(parent: Container, x: number, y: number, success: boolean): void {
  const burst = new Graphics();
  const color = success ? 0xc4f082 : 0xe85d4a;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    burst.moveTo(x, y);
    burst.lineTo(x + Math.cos(a) * 16, y + Math.sin(a) * 16);
  }
  burst.stroke({ width: 3, color, alpha: 0.9 });
  burst.circle(x, y, success ? 14 : 10);
  burst.stroke({ width: 2, color, alpha: 0.6 });
  parent.addChild(burst);

  let life = 0.35;
  const tick = () => {
    life -= 0.016;
    burst.alpha = Math.max(0, life * 2);
    burst.scale.set(1 + (0.35 - life) * 2);
    if (life > 0) requestAnimationFrame(tick);
    else parent.removeChild(burst);
  };
  requestAnimationFrame(tick);
}

/** Interior da loja — piso acolhedor, balcão e prateleiras. */
export function drawShopLayout(
  g: Graphics,
  floors: { x: number; y: number; width: number; height: number }[],
  walls: { x: number; y: number; width: number; height: number }[],
  counter: { x: number; y: number },
  decorSeed: number,
  worldWidth: number,
  worldHeight: number,
): void {
  g.rect(0, 0, worldWidth, worldHeight);
  g.fill(0x14101c);

  for (const floor of floors) {
    g.rect(floor.x, floor.y, floor.width, floor.height);
    g.fill(0x3d3228);
    g.rect(floor.x + 4, floor.y + 4, floor.width - 8, floor.height - 8);
    g.fill(0x4a3d32);
  }

  for (const wall of walls) {
    g.rect(wall.x, wall.y, wall.width, wall.height);
    g.fill(0x2a2420);
    g.rect(wall.x, wall.y, wall.width, wall.height);
    g.stroke({ width: 2, color: 0x5a4a3a });
  }

  const cx = counter.x;
  const cy = counter.y;
  g.roundRect(cx - 56, cy - 14, 112, 28, 4);
  g.fill(0x6a5a48);
  g.roundRect(cx - 56, cy - 14, 112, 28, 4);
  g.stroke({ width: 2, color: 0x8a7a60 });

  const floor = floors[0];
  if (floor) {
    for (let i = 0; i < 4; i++) {
      const lx = floor.x + 30 + i * ((floor.width - 60) / 3);
      g.circle(lx, floor.y + floor.height - 18, 8);
      g.fill({ color: 0xe8a84a, alpha: 0.15 });
      g.circle(lx, floor.y + floor.height - 18, 3);
      g.fill(0xe8c868);
    }
  }

  const rugW = 80 + (decorSeed % 20);
  g.ellipse(cx, cy + 42, rugW * 0.5, 18);
  g.fill({ color: 0x5a3a4a, alpha: 0.35 });
}

export function createShelfStandSprite(isCage: boolean): Container {
  const root = new Container();
  const g = new Graphics();
  if (isCage) {
    g.roundRect(-26, -20, 52, 40, 3);
    g.fill(0x3a4a3a);
    g.roundRect(-26, -20, 52, 40, 3);
    g.stroke({ width: 2, color: 0x5dbb63 });
    g.rect(-22, -16, 44, 4);
    g.fill(0x2a3a2a);
    g.rect(-22, 4, 44, 4);
    g.fill(0x2a3a2a);
  } else {
    g.roundRect(-24, -6, 48, 12, 2);
    g.fill(0x6a5a48);
    g.rect(-22, -18, 4, 14);
    g.fill(0x5a4a38);
    g.rect(18, -18, 4, 14);
    g.fill(0x5a4a38);
    g.rect(-22, -18, 44, 3);
    g.fill(0x7a6a58);
  }
  root.addChild(g);
  return root;
}

export function createShopItemSprite(name: string, color: number, isCreature: boolean): Container {
  const root = new Container();
  const g = new Graphics();
  if (isCreature) {
    g.roundRect(-8, -8, 16, 14, 3);
    g.fill(color);
  } else {
    g.roundRect(-7, -7, 14, 14, 2);
    g.fill(color);
  }
  root.addChild(g);
  const label = new Text({
    text: name.length > 8 ? `${name.slice(0, 7)}…` : name,
    style: { fontFamily: 'monospace', fontSize: 7, fill: 0xf0e6d3 },
  });
  label.anchor.set(0.5);
  label.y = -16;
  root.addChild(label);
  return root;
}

export function createCustomerSprite(bodyColor: number): Container {
  const root = new Container();
  const shadow = drawShadow(root, 16);
  shadow.y = 6;
  const body = new Graphics();
  body.roundRect(-7, -12, 14, 18, 3);
  body.fill(bodyColor);
  body.stroke({ width: 1, color: 0x1a1520 });
  root.addChild(body);
  const head = new Graphics();
  head.circle(0, -16, 6);
  head.fill(0xf0d8b8);
  root.addChild(head);
  (root as Container & { zOffset?: number }).zOffset = 0.5;
  return root;
}

export function createEmojiBubble(emoji: string): Container {
  const root = new Container();
  const bg = new Graphics();
  bg.roundRect(-16, -14, 32, 22, 6);
  bg.fill({ color: 0x1a1520, alpha: 0.92 });
  bg.roundRect(-16, -14, 32, 22, 6);
  bg.stroke({ width: 1, color: 0x5dbb63 });
  root.addChild(bg);
  const t = new Text({
    text: emoji,
    style: { fontSize: 14 },
  });
  t.anchor.set(0.5);
  t.y = -2;
  root.addChild(t);
  root.y = -32;
  return root;
}

