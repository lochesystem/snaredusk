import { Container, Graphics, Text } from 'pixi.js';
import { getSpecies } from '../data/creatures.ts';
import type { InputManager } from '../engine/input.ts';
import { YSortLayer } from '../engine/ySortLayer.ts';
import { distance, normalize } from '../systems/combat.ts';
import type { CreatureItem } from '../types.ts';
import { moveWithCollision } from '../world/collision.ts';
import {
  buildHabitatLayout,
  randomPointInHabitat,
  type HabitatLayout,
} from '../world/habitatLayout.ts';
import { createCreatureSprite, drawHabitatLayout } from '../world/placeholderArt.ts';

const CREATURE_RADIUS = 9;
const WANDER_SPEED_SCALE = 0.38;

export interface HabitatSceneCallbacks {
  onCreatureClick: (habitatIndex: number) => void;
}

interface Wanderer {
  habitatIndex: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  pauseTimer: number;
  wanderTimer: number;
  speed: number;
  idlePhase: number;
  container: Container;
}

export class HabitatScene {
  readonly root = new Container();
  private world = new Container();
  private entityLayer = new YSortLayer();
  private uiLayer = new Container();
  private layout: HabitatLayout;
  private wanderers: Wanderer[] = [];
  private emptyLabel: Text | null = null;
  private active = false;
  private rng = Math.random;
  private lastSignature = '';
  private input: InputManager;
  private callbacks: HabitatSceneCallbacks;

  constructor(input: InputManager, callbacks: HabitatSceneCallbacks) {
    this.input = input;
    this.callbacks = callbacks;
    this.layout = buildHabitatLayout();

    const floorGfx = new Graphics();
    drawHabitatLayout(
      floorGfx,
      this.layout.floors,
      this.layout.walls,
      this.layout.decorSeed,
      this.layout.width,
      this.layout.height,
    );
    this.world.addChild(floorGfx);
    this.world.addChild(this.entityLayer);
    this.root.addChild(this.world);
    this.root.addChild(this.uiLayer);
  }

  enter(): void {
    this.active = true;
  }

  exit(): void {
    this.active = false;
    this.clearWanderers();
    this.root.destroy({ children: true });
  }

  syncCreatures(habitat: CreatureItem[]): void {
    const signature = habitat.map((c) => `${c.speciesId}:${c.name}`).join('|');
    if (signature === this.lastSignature) return;
    this.lastSignature = signature;

    this.clearWanderers();
    const floor = this.layout.floors[0]!;

    habitat.forEach((creature, index) => {
      const species = getSpecies(creature.speciesId);
      const angle = (index / Math.max(1, habitat.length)) * Math.PI * 2 - Math.PI / 2;
      const spread = 28 + index * 18;
      const spawn = {
        x: floor.x + floor.width / 2 + Math.cos(angle) * spread,
        y: floor.y + floor.height / 2 + Math.sin(angle) * spread * 0.65,
      };
      const target = randomPointInHabitat(floor, CREATURE_RADIUS + 12, this.rng);

      const container = createCreatureSprite(species);
      container.x = spawn.x;
      container.y = spawn.y;

      const label = new Text({
        text: creature.name,
        style: { fontFamily: 'monospace', fontSize: 8, fill: 0xf0e6d3 },
      });
      label.anchor.set(0.5);
      label.y = -26;
      container.addChild(label);

      this.entityLayer.addChild(container);
      this.wanderers.push({
        habitatIndex: index,
        x: spawn.x,
        y: spawn.y,
        targetX: target.x,
        targetY: target.y,
        pauseTimer: 0.4 + this.rng() * 1.2,
        wanderTimer: 2 + this.rng() * 3,
        speed: species.speed * WANDER_SPEED_SCALE,
        idlePhase: this.rng() * Math.PI * 2,
        container,
      });
    });

    this.updateEmptyLabel(habitat.length === 0);
  }

  private clearWanderers(): void {
    for (const w of this.wanderers) {
      w.container.destroy({ children: true });
    }
    this.wanderers = [];
  }

  private updateEmptyLabel(show: boolean): void {
    if (this.emptyLabel) {
      this.emptyLabel.destroy();
      this.emptyLabel = null;
    }
    if (!show) return;

    this.emptyLabel = new Text({
      text: 'Habitat vazio — coloque criaturas da bolsa →',
      style: {
        fontFamily: 'monospace',
        fontSize: 11,
        fill: 0xa09880,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: 280,
      },
    });
    this.emptyLabel.anchor.set(0.5);
    this.emptyLabel.x = this.layout.width / 2;
    this.emptyLabel.y = this.layout.height / 2;
    this.uiLayer.addChild(this.emptyLabel);
  }

  update(dt: number): void {
    if (!this.active) return;

    const floor = this.layout.floors[0]!;
    for (const w of this.wanderers) {
      w.pauseTimer -= dt;
      w.wanderTimer -= dt;
      w.idlePhase += dt * 2.2;

      if (w.wanderTimer <= 0) {
        const next = randomPointInHabitat(floor, CREATURE_RADIUS + 12, this.rng);
        w.targetX = next.x;
        w.targetY = next.y;
        w.wanderTimer = 2.5 + this.rng() * 4;
      }

      if (w.pauseTimer <= 0) {
        const dist = distance(w.x, w.y, w.targetX, w.targetY);
        if (dist < 6) {
          w.pauseTimer = 0.8 + this.rng() * 2.5;
        } else {
          const dir = normalize(w.targetX - w.x, w.targetY - w.y);
          const moved = moveWithCollision(
            w.x,
            w.y,
            dir.x * w.speed * dt,
            dir.y * w.speed * dt,
            CREATURE_RADIUS,
            this.layout.walls,
            this.layout.floors,
          );
          w.x = moved.x;
          w.y = moved.y;
        }
      }

      const bob = Math.sin(w.idlePhase) * 0.6;
      w.container.x = w.x;
      w.container.y = w.y + bob;
    }

    this.entityLayer.resort();
    this.handleClicks();
  }

  private handleClicks(): void {
    if (!this.input.consumeClick() || this.wanderers.length === 0) return;

    let best: Wanderer | null = null;
    let bestDist = 22;
    for (const w of this.wanderers) {
      const d = distance(this.input.mouseX, this.input.mouseY, w.x, w.y);
      if (d < bestDist) {
        best = w;
        bestDist = d;
      }
    }

    if (best) {
      this.callbacks.onCreatureClick(best.habitatIndex);
    }
  }
}
