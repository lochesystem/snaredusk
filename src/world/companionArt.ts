import { AnimatedSprite, Container, Graphics, Sprite } from 'pixi.js';
import type { SpeciesDef } from '../types.ts';
import {
  getCompanionSpriteLayout,
  getCompanionVisual,
} from './companionAssets.ts';

// Idle is intentionally cadenced: the fourth frame contains the blink or
// species-specific accent, so a slower loop reads as breathing instead of a
// constant twitch. Locomotion and attacks stay more responsive.
const IDLE_SPEED = 2.25 / 60;
const WALK_SPEED = 7 / 60;
const ATTACK_SPEED = 10 / 60;

export interface CompanionSprite extends Container {
  zOffset: number;
  setFacing(moveX: number): void;
  setLocomotion(moving: boolean, moveX?: number): void;
  playAttack(moveX?: number): void;
}

function applyFacing(
  sprite: Sprite | AnimatedSprite,
  moveX: number,
  nativeFacing: 'left' | 'right',
): void {
  if (Math.abs(moveX) < 0.001) return;
  const wantsRight = moveX > 0;
  const nativeFacesRight = nativeFacing === 'right';
  sprite.scale.x = wantsRight === nativeFacesRight ? 1 : -1;
}

export function createCompanionSprite(species: SpeciesDef): CompanionSprite {
  const root = new Container() as CompanionSprite;
  const visual = getCompanionVisual(species.id);
  const layout = getCompanionSpriteLayout(species.id);

  const shadow = new Graphics({ roundPixels: true });
  shadow.ellipse(0, 0, 9, 3);
  shadow.fill({ color: 0x07130f, alpha: 0.34 });
  shadow.y = layout.shadowY;
  root.addChild(shadow);

  let currentMoving = false;
  let lastFacingX = 1;
  let attacking = false;
  let anim: AnimatedSprite | null = null;

  if (visual) {
    anim = new AnimatedSprite(visual.idle);
    anim.anchor.set(layout.anchorX, layout.anchorY);
    anim.animationSpeed = IDLE_SPEED;
    anim.roundPixels = true;
    anim.loop = true;
    anim.play();
    applyFacing(anim, lastFacingX, layout.nativeFacing);
    root.addChild(anim);
  } else {
    // Safe compact fallback; it intentionally does not reuse the full enemy art.
    const body = new Graphics({ roundPixels: true });
    body.circle(0, -9, 8);
    body.fill(species.color);
    body.stroke({ width: 2, color: 0x182019 });
    body.circle(-3, -11, 1.5);
    body.circle(3, -11, 1.5);
    body.fill(species.accent);
    root.addChild(body);
  }

  const showLocomotion = (): void => {
    if (!anim || !visual || attacking) return;
    const next = currentMoving ? visual.walk : visual.idle;
    if (anim.textures !== next) {
      anim.textures = next;
      anim.gotoAndPlay(0);
    }
    anim.loop = true;
    anim.animationSpeed = currentMoving ? WALK_SPEED : IDLE_SPEED;
  };

  root.setFacing = (moveX: number) => {
    if (Math.abs(moveX) >= 0.001) lastFacingX = moveX;
    if (anim) applyFacing(anim, lastFacingX, layout.nativeFacing);
  };

  root.setLocomotion = (moving: boolean, moveX = lastFacingX) => {
    currentMoving = moving;
    root.setFacing(moveX);
    showLocomotion();
  };

  root.playAttack = (moveX = lastFacingX) => {
    root.setFacing(moveX);
    if (!anim || !visual) return;
    attacking = true;
    anim.loop = false;
    anim.textures = visual.attack;
    anim.animationSpeed = ATTACK_SPEED;
    anim.onComplete = () => {
      if (!anim) return;
      attacking = false;
      anim.onComplete = undefined;
      showLocomotion();
    };
    anim.gotoAndPlay(0);
  };

  root.zOffset = 0.5;
  return root;
}
