import { Container, Graphics, Text } from 'pixi.js';
import { getSpecies } from '../data/creatures.ts';
import { getStation, type StationId } from '../data/baseStations.ts';
import {
  BASE_CELL_SIZE,
  BASE_STAMINA_REGEN,
  PLAYER_MAX_STAMINA,
  PLAYER_SPEED,
} from '../engine/constants.ts';
import { Camera } from '../engine/camera.ts';
import type { InputManager } from '../engine/input.ts';
import { YSortLayer } from '../engine/ySortLayer.ts';
import { findPlacementAt, placeStation, removePlacement, canPlaceStation } from '../systems/baseBuild.ts';
import { findChestAt } from '../systems/baseChest.ts';
import { digCell, canDigCell } from '../systems/baseDig.ts';
import { distance, normalize } from '../systems/combat.ts';
import type { CreatureItem, GameState } from '../types.ts';
import { moveWithCollision, PLAYER_RADIUS } from '../world/collision.ts';
import {
  BaseCellKind,
  clampToHabitat,
  getBaseWorldSize,
  getFloorsForCollision,
  getHabitatWorldBounds,
  getHabitatZone,
  getRockWallsForCollision,
  getSpawnPosition,
  randomPointInHabitat,
  worldToCell,
  findAdjacentRockCells,
} from '../world/baseGrid.ts';
import { createCreatureSprite, createPlayerSprite, type CreatureSprite, type PlayerSprite } from '../world/placeholderArt.ts';

const INTERACT_RANGE = 44;
const CREATURE_RADIUS = 9;
const WANDER_SPEED = 38;

export interface BaseSceneCallbacks {
  getState: () => GameState;
  onStateChange: () => void;
  showToast: (msg: string) => void;
  setHint: (text: string) => void;
  onOpenChest: (chestId: string) => void;
  onOpenWorkbench: (cellX: number, cellY: number) => void;
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
  idlePhase: number;
  container: CreatureSprite;
}

export class BaseScene {
  readonly root = new Container();
  private world = new Container();
  private tileLayer = new Container();
  private stationLayer = new Container();
  private entityLayer = new YSortLayer();
  private overlayLayer = new Container();
  private player!: PlayerSprite;
  private playerX = 0;
  private playerY = 0;
  private camera = new Camera();
  private floors: { x: number; y: number; width: number; height: number }[] = [];
  private walls: { x: number; y: number; width: number; height: number }[] = [];
  private wanderers: Wanderer[] = [];
  private buildMode = false;
  private buildStation: StationId = 'workbench';
  private buildRotation: 0 | 1 | 2 | 3 = 0;
  private ghostGfx: Graphics | null = null;
  private active = false;
  private input: InputManager;
  private cb: BaseSceneCallbacks;
  private lastCreatureSig = '';

  constructor(input: InputManager, callbacks: BaseSceneCallbacks) {
    this.input = input;
    this.cb = callbacks;
    this.root.addChild(this.world);
    this.world.addChild(this.tileLayer);
    this.world.addChild(this.stationLayer);
    this.world.addChild(this.entityLayer);
    this.root.addChild(this.overlayLayer);
    this.spawnPlayerSprite();
  }

  private spawnPlayerSprite(): void {
    if (this.player?.parent) {
      this.player.parent.removeChild(this.player);
    }
    this.player = createPlayerSprite();
    this.entityLayer.addChild(this.player);
  }

  enter(): void {
    this.active = true;
    this.spawnPlayerSprite();
    const state = this.cb.getState();
    const spawn = getSpawnPosition(state.base);
    this.playerX = spawn.x;
    this.playerY = spawn.y;
    this.rebuildWorld();
    this.syncCreatures(state.habitat);
    this.updateHint();
  }

  exit(): void {
    this.active = false;
    this.clearWanderers();
    this.root.destroy({ children: true });
  }

  setBuildMode(active: boolean, stationId?: StationId): void {
    this.buildMode = active;
    if (stationId) this.buildStation = stationId;
    if (!active) this.clearGhost();
    else this.ensureGhost();
    this.updateHint();
  }

  isBuildMode(): boolean {
    return this.buildMode;
  }

  setBuildStation(stationId: StationId): void {
    this.buildStation = stationId;
  }

  rotateBuildGhost(): void {
    this.buildRotation = ((this.buildRotation + 1) % 4) as 0 | 1 | 2 | 3;
  }

  rebuildWorld(): void {
    const state = this.cb.getState();
    this.tileLayer.removeChildren();
    this.stationLayer.removeChildren();

    const tileGfx = new Graphics();
    for (let y = 0; y < state.base.height; y++) {
      for (let x = 0; x < state.base.width; x++) {
        const kind = state.base.cells[y * state.base.width + x] as BaseCellKind;
        const px = x * BASE_CELL_SIZE;
        const py = y * BASE_CELL_SIZE;
        if (kind === BaseCellKind.Void) continue;
        if (kind === BaseCellKind.Floor) {
          tileGfx.rect(px, py, BASE_CELL_SIZE, BASE_CELL_SIZE);
          tileGfx.fill({ color: 0x2a3d2a, alpha: 0.95 });
          tileGfx.rect(px + 1, py + 1, BASE_CELL_SIZE - 2, BASE_CELL_SIZE - 2);
          tileGfx.fill({ color: 0x3d5c3a, alpha: 0.9 });
        } else if (kind === BaseCellKind.Rock) {
          tileGfx.rect(px, py, BASE_CELL_SIZE, BASE_CELL_SIZE);
          tileGfx.fill({ color: 0x1a1520, alpha: 1 });
          tileGfx.rect(px + 4, py + 4, BASE_CELL_SIZE - 8, BASE_CELL_SIZE - 8);
          tileGfx.fill({ color: 0x3a3048, alpha: 1 });
        } else if (kind === BaseCellKind.Wall) {
          tileGfx.rect(px, py, BASE_CELL_SIZE, BASE_CELL_SIZE);
          tileGfx.fill({ color: 0x4a3a30, alpha: 1 });
        }
      }
    }
    this.tileLayer.addChild(tileGfx);

    const habitatGfx = new Graphics();
    const zone = getHabitatZone(state.base);
    const hx = zone.cellX * BASE_CELL_SIZE;
    const hy = zone.cellY * BASE_CELL_SIZE;
    const hw = zone.width * BASE_CELL_SIZE;
    const hh = zone.height * BASE_CELL_SIZE;
    habitatGfx.rect(hx, hy, hw, hh);
    habitatGfx.fill({ color: 0x5dbb63, alpha: 0.12 });
    habitatGfx.rect(hx, hy, hw, hh);
    habitatGfx.stroke({ width: 2, color: 0x5dbb63, alpha: 0.55 });
    this.tileLayer.addChild(habitatGfx);

    for (const placement of state.base.placements) {
      const def = getStation(placement.stationId);
      const gfx = new Graphics();
      const w = def.width * BASE_CELL_SIZE - 4;
      const h = def.height * BASE_CELL_SIZE - 4;
      const px = placement.cellX * BASE_CELL_SIZE + 2;
      const py = placement.cellY * BASE_CELL_SIZE + 2;
      gfx.roundRect(px, py, w, h, 4);
      gfx.fill(def.color);
      gfx.stroke({ width: 2, color: def.accent, alpha: 0.9 });

      const label = new Text({
        text: def.name.charAt(0),
        style: { fontSize: 10, fill: 0xf0e6d3, fontFamily: 'monospace' },
      });
      label.x = px + w / 2 - 4;
      label.y = py + h / 2 - 6;
      gfx.addChild(label);
      this.stationLayer.addChild(gfx);
    }

    this.floors = getFloorsForCollision(state.base);
    this.walls = getRockWallsForCollision(state.base);
  }

  syncCreatures(habitat: CreatureItem[]): void {
    const sig = habitat.map((c) => `${c.speciesId}:${c.name}`).join('|');
    if (sig === this.lastCreatureSig) return;
    this.lastCreatureSig = sig;
    this.clearWanderers();

    const state = this.cb.getState();

    habitat.forEach((creature, habitatIndex) => {
      const species = getSpecies(creature.speciesId);
      const container = createCreatureSprite(species);
      const pt = randomPointInHabitat(state.base, Math.random);
      const x = pt.x;
      const y = pt.y;
      container.x = x;
      container.y = y;
      this.entityLayer.addChild(container);

      this.wanderers.push({
        habitatIndex,
        x,
        y,
        targetX: x,
        targetY: y,
        pauseTimer: 0,
        wanderTimer: 0.5 + Math.random(),
        idlePhase: Math.random() * Math.PI * 2,
        container,
      });
    });
  }

  update(dt: number): void {
    if (!this.active) return;
    const state = this.cb.getState();

    if (state.playerStamina < PLAYER_MAX_STAMINA) {
      state.playerStamina = Math.min(PLAYER_MAX_STAMINA, state.playerStamina + BASE_STAMINA_REGEN * dt);
    }

    const move = this.input.getMovement();
    const moveLen = Math.hypot(move.x, move.y);
    if (moveLen > 0) {
      const dir = normalize(move.x, move.y);
      const vel = { x: dir.x * PLAYER_SPEED * dt, y: dir.y * PLAYER_SPEED * dt };
      const next = moveWithCollision(
        this.playerX,
        this.playerY,
        vel.x,
        vel.y,
        PLAYER_RADIUS,
        this.walls,
        this.floors,
      );
      this.playerX = next.x;
      this.playerY = next.y;
    }

    this.player.x = this.playerX;
    this.player.y = this.playerY;
    this.player.setLocomotion(moveLen > 0, move.x);

    const worldSize = getBaseWorldSize(state.base);
    this.camera.follow(this.playerX, this.playerY, worldSize.width, worldSize.height);
    this.camera.update();
    this.world.x = -this.camera.x;
    this.world.y = -this.camera.y;

    this.updateWanderers(dt, state);
    this.handleInput(state);
    this.updateBuildGhost(state);
    this.updateHint();
    this.entityLayer.resort();
  }

  getHudHint(): string {
    return '';
  }

  private updateWanderers(dt: number, state: GameState): void {
    const bounds = getHabitatWorldBounds(state.base);

    for (const w of this.wanderers) {
      w.wanderTimer -= dt;
      w.pauseTimer -= dt;
      w.idlePhase += dt * 2.2;

      if (w.wanderTimer <= 0 && w.pauseTimer <= 0) {
        w.targetX = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
        w.targetY = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
        w.wanderTimer = 1.2 + Math.random() * 2;
        w.pauseTimer = 0.3 + Math.random() * 0.8;
      }

      const dx = w.targetX - w.x;
      const dy = w.targetY - w.y;
      const dist = Math.hypot(dx, dy);
      let movedX = 0;
      if (dist > 2 && w.pauseTimer <= 0) {
        const dir = normalize(dx, dy);
        const prevX = w.x;
        w.x += dir.x * WANDER_SPEED * dt;
        w.y += dir.y * WANDER_SPEED * dt;
        movedX = w.x - prevX;
      }

      const clamped = clampToHabitat(state.base, w.x, w.y);
      w.x = clamped.x;
      w.y = clamped.y;

      const moving = Math.abs(movedX) > 0.001;
      w.container.setLocomotion(moving, moving ? movedX : dx);

      const bob = Math.sin(w.idlePhase) * 0.6;
      w.container.x = w.x;
      w.container.y = w.y + bob;
    }
  }

  private handleInput(state: GameState): void {
    if (this.input.consumeKey('r') && this.buildMode) {
      this.rotateBuildGhost();
    }

    if (this.buildMode) {
      const worldMouse = this.camera.screenToWorld(this.input.mouseX, this.input.mouseY);
      const mouseCell = worldToCell(worldMouse.x, worldMouse.y);

      if (this.input.consumeClick()) {
        const result = placeStation(state, this.buildStation, mouseCell.x, mouseCell.y, this.buildRotation);
        if (result.ok) {
          this.cb.onStateChange();
          this.rebuildWorld();
          this.cb.showToast(result.message);
        } else {
          this.cb.showToast(result.message);
        }
      }

      if (this.input.consumeKey('e')) {
        const placement = findPlacementAt(state, mouseCell.x, mouseCell.y);
        if (placement) {
          const removed = removePlacement(state, placement.id);
          if (removed.ok) {
            this.cb.onStateChange();
            this.rebuildWorld();
            this.cb.showToast(removed.message);
          } else {
            this.cb.showToast(removed.message);
          }
        }
      }
      return;
    }

    if (this.input.consumeKey('e')) {
      const adjacentRocks = findAdjacentRockCells(state.base, this.playerX, this.playerY);
      if (adjacentRocks.length > 0) {
        const target = adjacentRocks[0];
        if (digCell(state, target.x, target.y, this.playerX, this.playerY)) {
          this.cb.onStateChange();
          this.rebuildWorld();
          this.cb.showToast('Rocha escavada!');
          return;
        }
        if (!canDigCell(state, target.x, target.y, this.playerX, this.playerY)) {
          if (state.playerStamina < 5) this.cb.showToast('Stamina insuficiente para escavar');
        }
      }

      const near = this.findNearestInteractable(state);
      if (near) {
        if (near.kind === 'chest' && near.chestId) {
          this.cb.onOpenChest(near.chestId);
        } else if (near.kind === 'workbench' && near.cellX !== undefined && near.cellY !== undefined) {
          this.cb.onOpenWorkbench(near.cellX, near.cellY);
        }
      }
    }

    if (this.input.consumeClick()) {
      const worldMouse = this.camera.screenToWorld(this.input.mouseX, this.input.mouseY);
      for (const w of this.wanderers) {
        const d = distance(worldMouse.x, worldMouse.y, w.x, w.y);
        if (d < CREATURE_RADIUS + 10) {
          this.cb.onCreatureClick(w.habitatIndex);
          return;
        }
      }
    }
  }

  private findNearestInteractable(state: GameState): {
    kind: 'chest' | 'workbench';
    chestId?: string;
    cellX?: number;
    cellY?: number;
    dist: number;
  } | null {
    let best: {
      kind: 'chest' | 'workbench';
      chestId?: string;
      cellX?: number;
      cellY?: number;
      dist: number;
    } | null = null;

    for (const p of state.base.placements) {
      const def = getStation(p.stationId);
      const cx = (p.cellX + def.width / 2) * BASE_CELL_SIZE;
      const cy = (p.cellY + def.height / 2) * BASE_CELL_SIZE;
      const dist = distance(this.playerX, this.playerY, cx, cy);
      if (dist > INTERACT_RANGE) continue;

      if (p.stationId === 'chest_wood') {
        const chest = findChestAt(state.base, p.cellX, p.cellY);
        if (!best || dist < best.dist) {
          best = { kind: 'chest', chestId: chest?.id ?? p.id, dist };
        }
      }
      if (p.stationId === 'workbench') {
        if (!best || dist < best.dist) {
          best = { kind: 'workbench', cellX: p.cellX, cellY: p.cellY, dist };
        }
      }
    }
    return best;
  }

  private ensureGhost(): void {
    if (this.ghostGfx) return;
    this.ghostGfx = new Graphics();
    this.overlayLayer.addChild(this.ghostGfx);
  }

  private clearGhost(): void {
    if (this.ghostGfx) {
      this.ghostGfx.destroy();
      this.ghostGfx = null;
    }
  }

  private updateBuildGhost(state: GameState): void {
    if (!this.buildMode) return;
    this.ensureGhost();
    if (!this.ghostGfx) return;

    const def = getStation(this.buildStation);
    const worldMouse = this.camera.screenToWorld(this.input.mouseX, this.input.mouseY);
    const cell = worldToCell(worldMouse.x, worldMouse.y);
    const check = canPlaceStation(state, this.buildStation, cell.x, cell.y);

    const px = cell.x * BASE_CELL_SIZE - this.camera.x;
    const py = cell.y * BASE_CELL_SIZE - this.camera.y;
    const w = def.width * BASE_CELL_SIZE;
    const h = def.height * BASE_CELL_SIZE;

    this.ghostGfx.clear();
    this.ghostGfx.rect(px, py, w, h);
    this.ghostGfx.fill({ color: check.ok ? 0x5dbb63 : 0xcc4444, alpha: 0.35 });
    this.ghostGfx.stroke({ width: 2, color: check.ok ? 0xc4f082 : 0xff6666, alpha: 0.8 });
  }

  private updateHint(): void {
    const state = this.cb.getState();
    let hint = 'WASD mover · [E] interagir/escavar';

    if (this.buildMode) {
      const def = getStation(this.buildStation);
      hint = `Construção: ${def.name} · Clique colocar · [E] remover · [R] rotacionar · Esc sair`;
      this.cb.setHint(hint);
      return;
    }

    const rocks = findAdjacentRockCells(state.base, this.playerX, this.playerY);
    if (rocks.length > 0) {
      hint = '[E] Escavar rocha adjacente (5 STA)';
    } else {
      const near = this.findNearestInteractable(state);
      if (near?.kind === 'chest') hint = '[E] Abrir baú';
      else if (near?.kind === 'workbench') hint = '[E] Usar bancada';
    }

    this.cb.setHint(hint);
  }

  private clearWanderers(): void {
    for (const w of this.wanderers) {
      w.container.destroy();
    }
    this.wanderers = [];
  }
}
