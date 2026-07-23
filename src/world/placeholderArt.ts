import { AnimatedSprite, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import type { SpeciesDef } from '../types.ts';
import { LOOT_TABLE } from '../data/items.ts';
import type { FxRunner } from '../engine/fxRunner.ts';
import {
  CREATURE_ANIM_SPEED,
  CREATURE_WALK_ANIM_SPEED,
  getCreatureSpriteLayout,
  getCreatureVisual,
} from './creatureAssets.ts';
import {
  getPlayerAnimations,
  PLAYER_IDLE_ANIM_SPEED,
  PLAYER_WALK_ANIM_SPEED,
} from './playerAssets.ts';
import type { BiomeId, BiomeTheme } from '../data/biomes.ts';
import type { CustomerArchetypeId } from '../systems/customers.ts';
import { createPixelText } from './pixelText.ts';
import {
  chestPropFrameName,
  getBaseLandmarkTexture,
  getBasePortalTextures,
  getBaseStationTexture,
  getBiomePropTexture,
} from './environmentAssets.ts';
import { getShopPropTexture } from './shopAssets.ts';
import { CUSTOMER_WALK_ANIM_SPEED, getCustomerWalkFrames } from './customerAssets.ts';
import {
  drawEnergyOrb,
  drawKnifeBlade,
  drawPickaxeHead,
  drawSpearAlongX,
  drawSpearProjectile,
  drawSporeOrb,
} from './graphicsPaths.ts';
const SHADOW_COLOR = 0x000000;

export function drawShadow(parent: Container, width: number): Graphics {
  const shadow = new Graphics();
  shadow.ellipse(0, 0, width * 0.3, width * 0.1);
  shadow.fill({ color: SHADOW_COLOR, alpha: 0.35 });
  parent.addChild(shadow);
  return shadow;
}

/** Sprites de IA vêm olhando para a esquerda em `scale.x = 1`. */
function applySpriteFacing(
  target: { scale: { x: number } },
  moveX: number,
  facing: { value: number },
  nativeScale = 1,
): void {
  if (moveX < -0.01) facing.value = 1;
  else if (moveX > 0.01) facing.value = -1;
  target.scale.x = facing.value * nativeScale;
}

export interface PlayerSprite extends Container {
  zOffset: number;
  setLocomotion(moving: boolean, moveX?: number): void;
  playAttack(weaponId: string, aimX: number, duration: number): void;
}

export function createPlayerSprite(): PlayerSprite {
  const root = new Container() as PlayerSprite;
  root.zOffset = 0.5;
  // Os sprites v6 usam quadros 48×48 com arte em resolução final; escala 1:1
  // evita ampliar pixels pequenos e preserva a nitidez do pixel art.
  root.scale.set(1);

  const playerAnims = getPlayerAnimations();
  let anim: AnimatedSprite | null = null;
  const facing = { value: 1 };
  let attacking = false;
  let lastMoving = false;
  let lastMoveX = 0;

  if (playerAnims) {
    const shadow = drawShadow(root, 20);
    shadow.y = playerAnims.layout.shadowY;

    anim = new AnimatedSprite(playerAnims.idle);
    anim.anchor.set(playerAnims.layout.anchorX, playerAnims.layout.anchorY);
    anim.roundPixels = true;
    anim.animationSpeed = PLAYER_IDLE_ANIM_SPEED;
    anim.play();
    root.addChild(anim);
  } else {
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
  }

  root.setLocomotion = (moving: boolean, moveX = 0) => {
    if (!anim || !playerAnims) return;

    lastMoving = moving;
    if (Math.abs(moveX) > 0.01) lastMoveX = moveX;
    if (attacking) return;

    if (anim) applySpriteFacing(anim, moveX, facing);

    const nextTextures = moving ? playerAnims.walk : playerAnims.idle;
    if (anim.textures !== nextTextures) {
      anim.textures = nextTextures;
      anim.animationSpeed = moving ? PLAYER_WALK_ANIM_SPEED : PLAYER_IDLE_ANIM_SPEED;
      anim.gotoAndPlay(0);
    }
  };

  root.playAttack = (weaponId: string, aimX: number, duration: number) => {
    if (!anim || !playerAnims) return;
    const textures = playerAnims.attacks[weaponId];
    if (!textures?.length) return;

    attacking = true;
    applySpriteFacing(anim, aimX, facing);
    anim.loop = false;
    anim.textures = textures;
    anim.animationSpeed = textures.length / Math.max(1, duration * 60);
    anim.onComplete = () => {
      if (!anim || !playerAnims) return;
      attacking = false;
      anim.loop = true;
      anim.onComplete = undefined;
      const nextTextures = lastMoving ? playerAnims.walk : playerAnims.idle;
      anim.textures = nextTextures;
      anim.animationSpeed = lastMoving ? PLAYER_WALK_ANIM_SPEED : PLAYER_IDLE_ANIM_SPEED;
      applySpriteFacing(anim, lastMoveX, facing);
      anim.gotoAndPlay(0);
    };
    anim.gotoAndPlay(0);
  };

  return root;
}

export interface CreatureSprite extends Container {
  zOffset: number;
  setFacing(moveX: number): void;
  setLocomotion(moving: boolean, moveX?: number): void;
}

export function createCreatureSprite(species: SpeciesDef, capturableGlow = false): CreatureSprite {
  const root = new Container() as CreatureSprite;
  const visual = getCreatureVisual(species.id);
  const usesTexture = visual !== null;
  const layout = usesTexture ? getCreatureSpriteLayout(species.id) : null;
  const isDetailedCreature = species.id === 'prismarin'
    || species.id === 'esporo_dorminhoco'
    || species.id === 'lumimorcego'
    || species.id === 'carapaca_musgo'
    || species.id === 'lumicascalho'
    || species.id === 'eco_quartzo'
    || species.id === 'matriarca_prismatica'
    || species.id === 'salamandra'
    || species.id === 'vaporoso'
    || species.id === 'caranguejo_termal'
    || species.id === 'salamandra_ancia';
  let flipTarget: Sprite | AnimatedSprite | null = null;
  let animSprite: AnimatedSprite | null = null;
  let idleTextures: Texture[] | null = null;
  let walkTextures: Texture[] | null = null;
  const facing = { value: 1 };

  const shadowRadius = species.id === 'matriarca_prismatica'
    ? 42
    : species.id === 'salamandra_ancia'
      ? 44
      : species.id === 'rei_esporas'
        ? 36
        : isDetailedCreature
          ? 22
          : 18;
  const shadow = drawShadow(root, shadowRadius);
  shadow.y = layout?.shadowY ?? 6;

  if (visual?.kind === 'animated') {
    idleTextures = visual.idle;
    walkTextures = visual.walk ?? null;
    const anim = new AnimatedSprite(idleTextures);
    anim.anchor.set(layout!.anchorX, layout!.anchorY);
    anim.roundPixels = true;
    anim.animationSpeed = CREATURE_ANIM_SPEED;
    anim.play();
    root.addChild(anim);
    flipTarget = anim;
    animSprite = anim;
  } else if (visual?.kind === 'static') {
    const sprite = new Sprite(visual.texture);
    sprite.anchor.set(layout!.anchorX, layout!.anchorY);
    sprite.roundPixels = true;
    root.addChild(sprite);
    flipTarget = sprite;
  } else {
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
  }

  if (flipTarget && layout?.nativeFacing === 'right') {
    flipTarget.scale.x = -1;
  }

  if (capturableGlow) {
    const reticle = new Graphics({ roundPixels: true });
    const glowW = species.id === 'matriarca_prismatica'
      ? 82
      : species.id === 'salamandra_ancia'
        ? 88
        : isDetailedCreature ? 46 : 24;
    const glowH = species.id === 'matriarca_prismatica'
      ? 72
      : species.id === 'salamandra_ancia'
        ? 68
        : isDetailedCreature ? 42 : 20;
    const left = -glowW / 2;
    const right = glowW / 2;
    const top = -glowH;
    const bottom = 0;
    const corner = Math.min(8, glowW * 0.22, glowH * 0.22);

    reticle
      .moveTo(left, top + corner).lineTo(left, top).lineTo(left + corner, top)
      .moveTo(right - corner, top).lineTo(right, top).lineTo(right, top + corner)
      .moveTo(right, bottom - corner).lineTo(right, bottom).lineTo(right - corner, bottom)
      .moveTo(left + corner, bottom).lineTo(left, bottom).lineTo(left, bottom - corner)
      .stroke({ width: 1.25, color: 0xb7d98a, alpha: 0.62 });
    root.addChildAt(reticle, 0);
  }

  root.zOffset = 0.5;
  root.setLocomotion = (moving: boolean, moveX = 0) => {
    if (flipTarget) {
      const nativeScale = layout?.nativeFacing === 'right' ? -1 : 1;
      applySpriteFacing(flipTarget, moveX, facing, nativeScale);
    }

    if (!animSprite || !idleTextures) return;

    const walk = walkTextures && walkTextures.length > 0 ? walkTextures : idleTextures;
    const nextTextures = moving ? walk : idleTextures;
    if (animSprite.textures !== nextTextures) {
      animSprite.textures = nextTextures;
      animSprite.animationSpeed = moving && walkTextures
        ? CREATURE_WALK_ANIM_SPEED
        : CREATURE_ANIM_SPEED;
      animSprite.gotoAndPlay(0);
    } else if (moving && walkTextures) {
      animSprite.animationSpeed = CREATURE_WALK_ANIM_SPEED;
    } else if (!moving) {
      animSprite.animationSpeed = CREATURE_ANIM_SPEED;
    }
  };
  root.setFacing = (moveX: number) => {
    root.setLocomotion(Math.abs(moveX) > 0.001, moveX);
  };
  return root;
}

export function createPortalSprite(): Container {
  const root = new Container();
  const textures = getBasePortalTextures();
  if (textures.length > 0) {
    const portal = new AnimatedSprite(textures);
    portal.anchor.set(0.5, 1);
    portal.y = 42;
    portal.animationSpeed = 8 / 60;
    portal.loop = true;
    portal.roundPixels = true;
    portal.play();
    root.addChild(portal);

    const label = createPixelText('Portal', 9, 0xc7e7df);
    label.anchor.set(0.5);
    label.y = -52;
    root.addChild(label);
    return root;
  }

  const ring = new Graphics();
  ring.circle(0, 0, 18);
  ring.stroke({ width: 3, color: 0xc4f082 });
  ring.fill({ color: 0x5dbb63, alpha: 0.35 });
  root.addChild(ring);

  const label = createPixelText('Portal', 10, 0xf0e6d3);
  label.anchor.set(0.5);
  label.y = -28;
  root.addChild(label);
  return root;
}

export function createStaircaseSprite(rotation: 0 | 1 | 2 | 3 = 0): Container {
  const root = new Container();
  const texture = getBaseStationTexture(`shop_ladder_${rotation}`)
    ?? getBaseLandmarkTexture('shop_ladder');
  if (texture) {
    const ladder = new Sprite(texture);
    ladder.anchor.set(0.5, 1);
    ladder.y = 1;
    ladder.roundPixels = true;
    root.addChild(ladder);

    const label = createPixelText('Loja', 9, 0xd8c8a8);
    label.anchor.set(0.5);
    label.y = 10;
    root.addChild(label);
    return root;
  }

  const steps = new Graphics();
  for (let i = 0; i < 4; i++) {
    const w = 28 - i * 4;
    steps.rect(-w / 2, -4 + i * 6, w, 5);
    steps.fill({ color: 0x6a5038, alpha: 0.95 });
    steps.stroke({ width: 1, color: 0x9a7048, alpha: 0.8 });
  }
  root.addChild(steps);

  const arrow = createPixelText('↑', 14, 0xe8d4a8);
  arrow.anchor.set(0.5);
  arrow.y = -22;
  root.addChild(arrow);

  const label = createPixelText('Loja', 9, 0xd8c8a8);
  label.anchor.set(0.5);
  label.y = 30;
  root.addChild(label);
  return root;
}

function roomTypeTint(type?: string): number {
  switch (type) {
    case 'treasure':
      return 0xc4a040;
    case 'rest':
      return 0x5dbb63;
    case 'event':
      return 0x8a6ab8;
    case 'merchant':
      return 0xe8a84a;
    case 'boss':
      return 0xe85d4a;
    default:
      return 0x3d5c3a;
  }
}

export function createInteractableSprite(kind: 'rest' | 'event' | 'merchant', used = false): Container {
  const root = new Container();
  const g = new Graphics();
  const alpha = used ? 0.35 : 1;
  const accent =
    kind === 'rest' ? 0x5dbb63 : kind === 'event' ? 0x8a6ab8 : 0xe8a84a;

  if (!used) {
    g.circle(0, -6, 18);
    g.fill({ color: accent, alpha: 0.18 });
  }

  if (kind === 'rest') {
    g.circle(0, -4, 12);
    g.fill({ color: 0x5dbb63, alpha: 0.85 * alpha });
    g.rect(-3, 4, 6, 12);
    g.fill({ color: 0x8a5a30, alpha });
    g.circle(0, -8, 4);
    g.fill({ color: 0xffa040, alpha: 0.7 * alpha });
  } else if (kind === 'event') {
    g.roundRect(-12, -14, 24, 24, 4);
    g.fill({ color: 0x6a5a8a, alpha: 0.92 * alpha });
    g.roundRect(-12, -14, 24, 24, 4);
    g.stroke({ width: 1, color: 0xc4f082, alpha });
    g.circle(0, -2, 5);
    g.fill({ color: 0xc4f082, alpha });
    if (!used) {
      const mark = createPixelText('!', 12, 0xfff0a0, { fontWeight: 'bold' });
      mark.anchor.set(0.5);
      mark.y = -22;
      root.addChild(mark);
    }
  } else {
    g.roundRect(-14, -10, 28, 18, 3);
    g.fill({ color: 0x6a5a48, alpha });
    g.roundRect(-14, -10, 28, 18, 3);
    g.stroke({ width: 1, color: 0xe8c868, alpha });
    g.circle(-6, -2, 4);
    g.fill({ color: 0xe8c868, alpha });
  }
  root.addChild(g);
  const label = createPixelText(
    kind === 'rest' ? 'Descanso' : kind === 'event' ? 'Evento' : 'Mercador',
    10,
    0xf0e6d3,
  );
  label.alpha = alpha;
  label.anchor.set(0.5);
  label.y = -28;
  root.addChild(label);
  return root;
}

export function createSpeechBubble(lines: string[], accent = 0x5dbb63): Container {
  const root = new Container();
  const fontSize = 10;
  const lineHeight = 13;
  const padX = 8;
  const padY = 6;
  const charW = 5.8;
  const contentW = Math.max(...lines.map((l) => l.length * charW), 44);
  const w = Math.min(176, contentW + padX * 2);
  const h = lines.length * lineHeight + padY * 2;
  const top = -h - 14;

  const bg = new Graphics({ roundPixels: true });
  bg.roundRect(-w / 2, top, w, h, 5);
  bg.fill({ color: 0x120f1a, alpha: 0.96 });
  bg.roundRect(-w / 2, top, w, h, 5);
  bg.stroke({ width: 1.5, color: accent });
  bg.moveTo(-7, top + h);
  bg.lineTo(7, top + h);
  bg.lineTo(0, top + h + 8);
  bg.closePath();
  bg.fill({ color: 0x120f1a, alpha: 0.96 });
  bg.moveTo(-7, top + h);
  bg.lineTo(7, top + h);
  bg.lineTo(0, top + h + 8);
  bg.closePath();
  bg.stroke({ width: 1.5, color: accent });
  root.addChild(bg);

  for (let i = 0; i < lines.length; i++) {
    const t = createPixelText(lines[i]!, fontSize, 0xf0e6d3);
    t.anchor.set(0.5, 0);
    t.y = top + padY + i * lineHeight;
    root.addChild(t);
  }

  return root;
}

export function drawDungeonLayoutVector(
  g: Graphics,
  layout: {
    floors: { x: number; y: number; width: number; height: number }[];
    walls: { x: number; y: number; width: number; height: number }[];
    rooms: { rect: { x: number; y: number; width: number; height: number }; type?: string }[];
    decor: { kind: string; x: number; y: number; size: number; variant: number }[];
    obstacles: { kind: string; x: number; y: number; radius: number }[];
    hazards?: { kind: string; x: number; y: number; radius: number }[];
    chests: { x: number; y: number; opened?: boolean }[];
    width: number;
    height: number;
    theme?: BiomeTheme;
    skipBaseLayers?: boolean;
  },
): void {
  const { floors, walls, rooms, decor, obstacles, hazards = [], chests, width, height } = layout;
  const skipBase = layout.skipBaseLayers ?? false;
  const theme = layout.theme ?? {
    void: 0x120f1a,
    floor: 0x2a4a2a,
    wall: 0x1a2e1a,
    wallStroke: 0x3d5c3a,
    roomCeiling: 0x1a2e1a,
    rock: 0x4a4a5a,
    rockHighlight: 0x6a6a7a,
  };

  if (!skipBase) {
    g.rect(0, 0, width, height);
    g.fill(theme.void);

    for (const floor of floors) {
      g.rect(floor.x, floor.y, floor.width, floor.height);
      g.fill(theme.floor);
    }

    for (const room of rooms) {
      const r = room.rect;
      const tint = roomTypeTint(room.type);
      g.rect(r.x + 6, r.y + 6, r.width - 12, r.height - 12);
      g.fill({ color: tint, alpha: 0.22 });
    }
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

  for (const hazard of hazards) {
    if (hazard.kind === 'poison') {
      const puddle = poisonPuddlePoints(hazard.x, hazard.y, hazard.radius, 1);
      g.poly(puddle);
      g.fill({ color: 0x30461f, alpha: 0.72 });
      g.stroke({ width: 1.5, color: 0x657a32, alpha: 0.62 });

      const inner = poisonPuddlePoints(hazard.x - 2, hazard.y, hazard.radius, 0.72);
      g.poly(inner);
      g.fill({ color: 0x526f2a, alpha: 0.28 });

      for (let i = 0; i < 4; i++) {
        const a = i * 2.17 + hazard.x * 0.013 + hazard.y * 0.007;
        const bx = hazard.x + Math.cos(a) * hazard.radius * 0.55;
        const by = hazard.y + Math.sin(a) * hazard.radius * 0.3;
        const bubbleRadius = 1.4 + (i % 2) * 0.8;
        g.circle(bx, by, bubbleRadius);
        g.fill({ color: 0x9bad55, alpha: 0.5 });
        g.stroke({ width: 0.75, color: 0x26381a, alpha: 0.8 });
      }

      for (let i = 0; i < 2; i++) {
        const sx = hazard.x - hazard.radius * 0.25 + i * hazard.radius * 0.42;
        const sy = hazard.y - hazard.radius * 0.18;
        g.moveTo(sx, sy);
        g.bezierCurveTo(sx - 3, sy - 5, sx + 4, sy - 8, sx + 1, sy - 13);
        g.stroke({ width: 1, color: 0xa6b56a, alpha: 0.24 });
      }
      continue;
    }
    if (hazard.kind === 'spore') {
      const mist = poisonPuddlePoints(hazard.x, hazard.y, hazard.radius, 1);
      g.poly(mist);
      g.fill({ color: 0x3b6138, alpha: 0.12 });

      const seed = hazard.x * 0.019 + hazard.y * 0.027;
      for (let i = 0; i < 15; i++) {
        const angle = i * 2.31 + seed;
        const distance = hazard.radius * (0.18 + ((i * 37) % 73) / 100);
        const px = hazard.x + Math.cos(angle) * distance;
        const py = hazard.y + Math.sin(angle) * distance * 0.62;
        const size = 0.7 + (i % 3) * 0.35;
        g.circle(px, py, size);
        g.fill({ color: i % 4 === 0 ? 0xc0e878 : 0x8fcf73, alpha: 0.28 + (i % 2) * 0.08 });
      }

      for (let i = 0; i < 3; i++) {
        const x = hazard.x - hazard.radius * 0.45 + i * hazard.radius * 0.42;
        const y = hazard.y + hazard.radius * (i % 2 === 0 ? 0.12 : -0.08);
        g.moveTo(x, y + 5);
        g.bezierCurveTo(x - 3, y, x + 4, y - 5, x + 1, y - 10);
        g.stroke({ width: 1, color: 0xb2df85, alpha: 0.16 });
      }
    }
  }

  if (!skipBase) {
    for (const wall of walls) {
      g.rect(wall.x, wall.y, wall.width, wall.height);
      g.fill(theme.wall);
      g.rect(wall.x, wall.y, wall.width, wall.height);
      g.stroke({ width: 2, color: theme.wallStroke });
    }

    for (const obs of obstacles) {
      if (obs.kind !== 'rock') continue;
      g.roundRect(obs.x - obs.radius, obs.y - obs.radius * 0.8, obs.radius * 2, obs.radius * 1.6, 4);
      g.fill(theme.rock);
      g.roundRect(obs.x - obs.radius + 2, obs.y - obs.radius * 0.8 + 2, obs.radius * 1.4, obs.radius * 0.9, 3);
      g.fill({ color: theme.rockHighlight, alpha: 0.7 });
    }

    for (const room of rooms) {
      const r = room.rect;
      g.rect(r.x + 4, r.y + 4, r.width - 8, 22);
      g.fill({ color: theme.roomCeiling, alpha: 0.35 });
    }

    for (const d of decor) {
      if (d.kind === 'mushroom') {
        const cap = d.variant === 0 ? 0x5dbb63 : d.variant === 1 ? 0x8fd894 : 0x6b9a6b;
        const stem = 0x4a6a4a;
        g.circle(d.x, d.y - 2, d.size);
        g.fill(cap);
        g.rect(d.x - 2, d.y, 4, d.size + 3);
        g.fill(stem);
        continue;
      }
      if (d.kind === 'crystal') {
        const colors = [0x7ab8e8, 0xa8e0ff, 0xc8a8ff];
        const color = colors[d.variant % colors.length] ?? 0x7ab8e8;
        const h = d.size * 2.2;
        g.moveTo(d.x, d.y - h);
        g.lineTo(d.x + d.size, d.y);
        g.lineTo(d.x, d.y + h * 0.35);
        g.lineTo(d.x - d.size, d.y);
        g.closePath();
        g.fill(color);
        g.stroke({ width: 1, color: 0xe8f4ff, alpha: 0.5 });
        continue;
      }
      if (d.kind === 'thermal') {
        const pool = d.variant === 0 ? 0xc06030 : d.variant === 1 ? 0xe87840 : 0xa04828;
        g.ellipse(d.x, d.y + 2, d.size * 1.4, d.size * 0.7);
        g.fill({ color: pool, alpha: 0.85 });
        g.ellipse(d.x, d.y + 1, d.size * 0.9, d.size * 0.45);
        g.fill({ color: 0xffc080, alpha: 0.35 });
        g.moveTo(d.x - 2, d.y - d.size);
        g.quadraticCurveTo(d.x - 4, d.y - d.size * 2, d.x, d.y - d.size * 2.4);
        g.quadraticCurveTo(d.x + 4, d.y - d.size * 2, d.x + 2, d.y - d.size);
        g.stroke({ width: 1.5, color: 0xe8e8e8, alpha: 0.45 });
      }
    }
  }

  for (const chest of chests) {
    drawChestGraphic(g, chest.x, chest.y, chest.opened ?? false);
  }
}

function poisonPuddlePoints(
  x: number,
  y: number,
  radius: number,
  scale: number,
): number[] {
  const points: number[] = [];
  const count = 16;
  const seed = x * 0.031 + y * 0.017;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const wobble = 0.88
      + Math.sin(angle * 3 + seed) * 0.08
      + Math.cos(angle * 5 - seed * 0.7) * 0.045;
    points.push(
      x + Math.cos(angle) * radius * scale * wobble,
      y + Math.sin(angle) * radius * 0.62 * scale * wobble,
    );
  }
  return points;
}

/** @deprecated use drawDungeonLayoutVector */
export function drawDungeonLayout(
  g: Graphics,
  layout: Parameters<typeof drawDungeonLayoutVector>[1],
): void {
  drawDungeonLayoutVector(g, layout);
}

export function drawChestGraphic(g: Graphics, x: number, y: number, opened: boolean, epic = false): void {
  const w = epic ? 22 : 18;
  const h = epic ? 17 : 14;
  const body = opened ? 0x5a4a30 : epic ? 0x5a3a78 : 0x8a6a30;
  const trim = epic ? 0xe8c868 : 0xc4a040;
  g.roundRect(x - w / 2, y - h / 2, w, h, epic ? 3 : 2);
  g.fill(body);
  g.roundRect(x - w / 2, y - h / 2, w, h, epic ? 3 : 2);
  g.stroke({ width: epic ? 2.5 : 2, color: trim });
  g.rect(x - w / 2 + 2, y - 2, w - 4, 3);
  g.fill(trim);
  if (epic && !opened) {
    g.circle(x, y - h / 2 - 4, 3);
    g.fill({ color: 0xc4f082, alpha: 0.9 });
  }
  if (opened) {
    g.rect(x - w / 2 + 1, y - h / 2 - 4, w - 2, 5);
    g.fill({ color: 0x3a3020, alpha: 0.8 });
  }
}

export function createChestSprite(opened = false, epic = false, biomeId?: BiomeId): Container {
  if (biomeId) {
    const frame = chestPropFrameName(opened, epic);
    const texture = getBiomePropTexture(biomeId, frame);
    if (texture) {
      const root = new Container();
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5, 0.85);
      sprite.roundPixels = true;
      root.addChild(sprite);
      (root as Container & { zOffset?: number }).zOffset = 0.5;
      return root;
    }
  }

  const root = new Container();
  const gfx = new Graphics();
  drawChestGraphic(gfx, 0, 0, opened, epic);
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

export function createProjectileSprite(
  style: 'orb' | 'spear' | 'spore' = 'orb',
  color = 0xc4f082,
): Container {
  const root = new Container();
  const g = new Graphics({ roundPixels: true });

  if (style === 'spear') {
    drawSpearProjectile(g, color);
    root.pivot.set(0, 6);
  } else if (style === 'spore') {
    drawSporeOrb(g, color);
  } else {
    drawEnergyOrb(g, color);
  }

  root.addChild(g);
  return root;
}
export function createLootIcon(lootId: string): Container {
  const root = new Container();
  const g = new Graphics();
  const def = LOOT_TABLE[lootId];
  const color =
    def?.rarity === 'epic'
      ? 0xc4a040
      : def?.rarity === 'rare'
        ? 0x8ab4f8
        : def?.rarity === 'uncommon'
          ? 0x5dbb63
          : 0x8a6a48;

  if (lootId === 'fibra_musgo') {
    g.roundRect(-8, -4, 16, 10, 2);
    g.fill(color);
    for (let i = -6; i <= 6; i += 4) {
      g.moveTo(i, -4);
      g.lineTo(i + 2, 6);
      g.stroke({ width: 1.5, color: 0x3d5c3a });
    }
  } else if (lootId === 'esporo_brilhante') {
    g.circle(0, 0, 8);
    g.fill(color);
    g.circle(-2, -2, 2);
    g.fill({ color: 0xffffff, alpha: 0.7 });
  } else if (lootId === 'coroa_esporas') {
    g.moveTo(-8, 4);
    g.lineTo(-4, -6);
    g.lineTo(0, 2);
    g.lineTo(4, -6);
    g.lineTo(8, 4);
    g.closePath();
    g.fill(color);
    g.stroke({ width: 1, color: 0xe8c868 });
  } else if (lootId === 'nucleo_fungico') {
    g.circle(0, 0, 9);
    g.fill(color);
    g.circle(0, 0, 4);
    g.fill(0x3d5c3a);
  } else {
    g.circle(0, 2, 7);
    g.fill(color);
    g.roundRect(-2, -6, 4, 5, 1);
    g.fill(0xf0e6d3);
  }

  root.addChild(g);
  return root;
}

export function createWeaponIcon(weaponId: string): Container {
  const root = new Container();
  const g = new Graphics({ roundPixels: true });

  if (weaponId === 'picareta_combate') {
    drawPickaxeHead(g, 14, 0xc4a040);
  } else if (weaponId === 'lanca_esporo') {
    drawSpearAlongX(g, 12, 0xc4f082);
  } else {
    drawKnifeBlade(g, 12, 0xc0c0c0, 1);
  }

  root.addChild(g);
  return root;
}

export function drawDamageNumber(
  parent: Container,
  amount: number,
  x: number,
  y: number,
  fx: FxRunner,
): void {
  const t = createPixelText(String(amount), 11, 0xffffff, { fontWeight: 'bold' });
  t.anchor.set(0.5);
  t.x = x;
  t.y = y;
  parent.addChild(t);

  fx.spawn(
    0.6,
    (_progress, dt) => {
      t.y -= 36 * dt;
      t.alpha = Math.max(0, t.alpha - dt * 1.65);
    },
    () => {
      parent.removeChild(t);
      t.destroy();
    },
  );
}
export function createCaptureOrbBall(): Container {
  const root = new Container();
  const g = new Graphics();
  g.circle(0, 0, 9);
  g.fill({ color: 0x4a6ab8, alpha: 0.35 });
  g.circle(0, 0, 7);
  g.fill({ color: 0x8ab4f8, alpha: 0.95 });
  g.circle(0, 0, 10);
  g.stroke({ width: 2, color: 0xc4f082, alpha: 0.95 });
  g.circle(-2.5, -2.5, 2.5);
  g.fill({ color: 0xffffff, alpha: 0.75 });
  root.addChild(g);
  (root as Container & { orbCore?: Graphics }).orbCore = g;
  return root;
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

export function createCaptureAttemptHud(): Container {
  const root = new Container();
  const bg = new Graphics();
  bg.roundRect(-52, -28, 104, 36, 5);
  bg.fill({ color: 0x120f1a, alpha: 0.94 });
  bg.roundRect(-52, -28, 104, 36, 5);
  bg.stroke({ width: 1.5, color: 0x8ab4f8 });
  root.addChild(bg);

  const attempt = createPixelText('Tentativa 1/3', 10, 0xf0e6d3);
  attempt.anchor.set(0.5);
  attempt.y = -18;
  root.addChild(attempt);

  const pct = createPixelText('0%', 11, 0xc4f082, { fontWeight: 'bold' });
  pct.anchor.set(0.5);
  pct.y = -4;
  root.addChild(pct);

  (root as Container & { attemptText?: Text; pctText?: Text }).attemptText = attempt;
  (root as Container & { attemptText?: Text; pctText?: Text }).pctText = pct;
  return root;
}

export function updateCaptureAttemptHud(
  hud: Container,
  attempt: number,
  total: number,
  pct: string,
  status: 'waiting' | 'shake' | 'pass' | 'fail',
): void {
  const attemptText = (hud as Container & { attemptText?: Text }).attemptText;
  const pctText = (hud as Container & { pctText?: Text }).pctText;
  if (!attemptText || !pctText) return;

  attemptText.text = attempt <= 0 ? 'Preparando...' : `Tentativa ${attempt}/${total}`;
  pctText.text = pct;

  const accent =
    status === 'fail' ? 0xe85d4a : status === 'pass' ? 0xc4f082 : status === 'shake' ? 0xe8c868 : 0x8ab4f8;
  pctText.style.fill = accent;

  const bg = hud.children[0] as Graphics | undefined;
  if (bg) {
    bg.clear();
    bg.roundRect(-52, -28, 104, 36, 5);
    bg.fill({ color: 0x120f1a, alpha: 0.94 });
    bg.roundRect(-52, -28, 104, 36, 5);
    bg.stroke({ width: 1.5, color: accent });
  }
}

export function createCaptureSuccessBanner(speciesName: string): Container {
  const root = new Container();
  const bg = new Graphics();
  bg.roundRect(-72, -22, 144, 44, 6);
  bg.fill({ color: 0x1a2e1a, alpha: 0.96 });
  bg.roundRect(-72, -22, 144, 44, 6);
  bg.stroke({ width: 2, color: 0xc4f082 });
  root.addChild(bg);

  const title = createPixelText('✦ Capturado! ✦', 11, 0xc4f082, { fontWeight: 'bold' });
  title.anchor.set(0.5);
  title.y = -10;
  root.addChild(title);

  const name = createPixelText(speciesName, 10, 0xf0e6d3);
  name.anchor.set(0.5);
  name.y = 6;
  root.addChild(name);

  return root;
}

export function drawCaptureBurst(
  parent: Container,
  x: number,
  y: number,
  success: boolean,
  fx: FxRunner,
): void {
  const burst = new Graphics({ roundPixels: true });
  const color = success ? 0xc4f082 : 0xe85d4a;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    burst.moveTo(0, 0);
    burst.lineTo(Math.cos(a) * 16, Math.sin(a) * 16);
  }
  burst.stroke({ width: 3, color, alpha: 0.9, cap: 'round' });
  burst.circle(0, 0, success ? 14 : 10);
  burst.stroke({ width: 2, color, alpha: 0.6 });
  burst.x = x;
  burst.y = y;
  parent.addChild(burst);

  fx.spawn(
    0.35,
    (progress) => {
      burst.alpha = Math.max(0, (1 - progress) * 2);
      burst.scale.set(1 + progress * 2);
    },
    () => {
      parent.removeChild(burst);
      burst.destroy();
    },
  );
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
  drawShopFloorBase(g, floors, worldWidth, worldHeight);
  drawShopFixtures(g, floors, walls, counter, decorSeed);
}

export function drawShopFloorBase(
  g: Graphics,
  floors: { x: number; y: number; width: number; height: number }[],
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
}

export function drawShopFixtures(
  g: Graphics,
  floors: { x: number; y: number; width: number; height: number }[],
  walls: { x: number; y: number; width: number; height: number }[],
  counter: { x: number; y: number },
  decorSeed: number,
): void {
  for (const wall of walls) {
    g.rect(wall.x, wall.y, wall.width, wall.height);
    g.fill(0x2a2420);
    g.rect(wall.x, wall.y, wall.width, wall.height);
    g.stroke({ width: 2, color: 0x5a4a3a });
  }

  const cx = counter.x;
  const cy = counter.y;
  g.roundRect(cx - 58, cy - 15, 116, 31, 4);
  g.fill(0x3a2419);
  g.roundRect(cx - 58, cy - 15, 116, 9, 4);
  g.fill(0x80502e);
  g.rect(cx - 53, cy - 4, 106, 16);
  g.fill(0x573522);
  for (let x = cx - 35; x <= cx + 35; x += 35) {
    g.rect(x - 1, cy - 3, 2, 14);
    g.fill({ color: 0x2b1b14, alpha: 0.75 });
  }
  g.roundRect(cx - 58, cy - 15, 116, 31, 4);
  g.stroke({ width: 2, color: 0xa46f3c });
  g.circle(cx, cy + 4, 2);
  g.fill(0xd5a551);

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
  const texture = getShopPropTexture(isCage ? 'creature_pen' : 'display_case');
  if (texture) {
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5, 1);
    sprite.roundPixels = true;
    root.addChild(sprite);
    return root;
  }

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

/** Camada frontal fica acima do item/criatura para integrá-lo ao expositor. */
export function createShelfStandFrontSprite(isCage: boolean): Container {
  const root = new Container();
  if (isCage) {
    const texture = getShopPropTexture('creature_pen_front');
    if (texture) {
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5, 1);
      sprite.roundPixels = true;
      root.addChild(sprite);
      return root;
    }
    const bars = new Graphics();
    bars.rect(-26, -11, 52, 3);
    bars.fill(0x25252a);
    for (let x = -22; x <= 22; x += 9) {
      bars.rect(x, -11, 2, 16);
      bars.fill(0x34343a);
    }
    root.addChild(bars);
    return root;
  }

  // Brilho sutil sobre o item: o móvel continua legível como vidro, não como caixa opaca.
  const glass = new Graphics({ roundPixels: true });
  glass.roundRect(-34, -54, 68, 38, 3);
  glass.fill({ color: 0x9edce8, alpha: 0.08 });
  glass.moveTo(-27, -49);
  glass.lineTo(-13, -35);
  glass.moveTo(8, -50);
  glass.lineTo(24, -34);
  glass.stroke({ width: 2, color: 0xd8f4ff, alpha: 0.28 });
  root.addChild(glass);
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
  const label = createPixelText(name.length > 8 ? `${name.slice(0, 7)}…` : name, 8, 0xf0e6d3);
  label.anchor.set(0.5);
  label.y = -16;
  root.addChild(label);
  return root;
}

export interface CustomerSprite extends Container {
  setLocomotion(moving: boolean, moveX?: number): void;
}

export function createCustomerSprite(
  archetypeId: CustomerArchetypeId,
  bodyColor: number,
): CustomerSprite {
  const root = new Container() as CustomerSprite;
  const shadow = drawShadow(root, 16);
  shadow.y = 0;
  const frames = getCustomerWalkFrames(archetypeId);
  const facing = { value: 1 };

  if (frames?.length) {
    const anim = new AnimatedSprite(frames);
    anim.anchor.set(0.5, 0.958);
    // A criança ocupa menos altura dentro da célula; aproxima pés e sombra do piso.
    const groundOffset = archetypeId === 'crianca' ? 2 : 0;
    anim.y = groundOffset;
    shadow.y = groundOffset;
    anim.roundPixels = true;
    anim.animationSpeed = CUSTOMER_WALK_ANIM_SPEED;
    anim.gotoAndStop(0);
    root.addChild(anim);
    root.setLocomotion = (moving: boolean, moveX = 0) => {
      applySpriteFacing(anim, moveX, facing);
      if (moving) {
        if (!anim.playing) anim.play();
      } else {
        anim.gotoAndStop(0);
      }
    };
  } else {
    const visual = new Container();
    const body = new Graphics();
    body.roundRect(-7, -12, 14, 18, 3);
    body.fill(bodyColor);
    body.stroke({ width: 1, color: 0x1a1520 });
    visual.addChild(body);
    const head = new Graphics();
    head.circle(0, -16, 6);
    head.fill(0xf0d8b8);
    visual.addChild(head);
    root.addChild(visual);
    root.setLocomotion = (_moving: boolean, moveX = 0) => {
      applySpriteFacing(visual, moveX, facing);
    };
  }

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
  const t = createPixelText(emoji, 14, 0xffffff);
  t.anchor.set(0.5);
  t.y = -2;
  root.addChild(t);
  root.y = -32;
  return root;
}
