import { Container, Graphics, Sprite, Text } from 'pixi.js';

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

import {
  findPlacementAt,
  findPlacementById,
  findHabitatPenAt,
  findNearestHabitatPen,
  placeStation,
  placeHabitatPen,
  canPlaceHabitatPen,
  relocatePlacement,
  removePlacement,
  canPlaceStation,
} from '../systems/baseBuild.ts';

import { findChestAt } from '../systems/baseChest.ts';

import { digCell, canDigCell } from '../systems/baseDig.ts';

import { canUseBaseLandmark, canEnterDungeonDuringTutorial } from '../systems/tutorial.ts';

import { distance, normalize } from '../systems/combat.ts';

import { creaturePenId, getZoneForPen } from '../systems/habitat.ts';
import {
  clampToZone,
  normalizeDragZone,
  previewDragZone,
  randomPointInZone,
} from '../systems/habitatZones.ts';

import type { BuildTool } from '../ui/buildModeUI.ts';

import type { CreatureItem, GameState } from '../types.ts';
import { moveWithCollision, PLAYER_RADIUS } from '../world/collision.ts';
import {

  getBaseWorldSize,
  getDungeonPortalWorld,
  getFloorsForCollision,
  getRockWallsForCollision,
  getStationWallsForCollision,
  getShopStaircaseWorld,
  getSpawnPosition,
  worldToCell,
  findAdjacentRockCells,
} from '../world/baseGrid.ts';
import { getBaseStationTexture } from '../world/environmentAssets.ts';

import {

  createCreatureSprite,

  createPlayerSprite,

  createPortalSprite,

  createStaircaseSprite,

  type CreatureSprite,

  type PlayerSprite,

} from '../world/placeholderArt.ts';
import { buildBaseTileLayer } from '../world/tileRenderer.ts';

const INTERACT_RANGE = 44;
const LANDMARK_RANGE = 36;

const CREATURE_RADIUS = 9;

const WANDER_SPEED = 38;



export interface BaseSceneCallbacks {

  getState: () => GameState;

  onStateChange: () => void;

  showToast: (msg: string) => void;

  setHint: (text: string) => void;

  onOpenChest: (chestId: string) => void;

  onOpenWorkbench: (cellX: number, cellY: number) => void;

  onOpenDungeon: () => void;

  onOpenShop: () => void;

  onOpenHabitatPen: (penId: string) => void;

  onCreatureClick: (habitatIndex: number) => void;

  onSleep: () => void;

  onHabitatPenPlaced?: () => void;
}



interface Wanderer {

  habitatIndex: number;

  penId: string;

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

  private landmarkLayer = new Container();

  private entityLayer = new YSortLayer();

  private overlayLayer = new Container();

  private player!: PlayerSprite;

  private portalSprite = createPortalSprite();

  private staircaseSprite = createStaircaseSprite();

  private playerX = 0;

  private playerY = 0;

  private camera = new Camera();

  private floors: { x: number; y: number; width: number; height: number }[] = [];

  private walls: { x: number; y: number; width: number; height: number }[] = [];

  private wanderers: Wanderer[] = [];

  private selectedTool: BuildTool | null = null;

  private heldPlacementId: string | null = null;

  private buildRotation: 0 | 1 | 2 | 3 = 0;

  private ghostGfx: Graphics | null = null;

  private penDragStart: { x: number; y: number } | null = null;

  private lastMouseDown = false;

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

    this.world.addChild(this.landmarkLayer);

    this.world.addChild(this.entityLayer);

    this.root.addChild(this.overlayLayer);

    this.landmarkLayer.addChild(this.portalSprite);

    this.landmarkLayer.addChild(this.staircaseSprite);

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

    this.selectedTool = null;

    this.heldPlacementId = null;

    this.clearGhost();

    this.root.destroy({ children: true });

  }



  setBuildTool(tool: BuildTool | null): void {

    this.selectedTool = tool;

    if (!tool) {

      this.heldPlacementId = null;

      this.clearGhost();

    } else {

      this.ensureGhost();

    }

    this.updateHint();

  }



  getBuildTool(): BuildTool | null {

    return this.selectedTool;

  }



  isBuildMode(): boolean {

    return this.selectedTool !== null;

  }



  cancelBuildAction(): void {

    this.heldPlacementId = null;

    if (!this.selectedTool) this.clearGhost();

  }



  clearBuildTool(): void {

    this.selectedTool = null;

    this.heldPlacementId = null;

    this.clearGhost();

    this.updateHint();

  }



  rotateBuildGhost(): void {

    this.buildRotation = ((this.buildRotation + 1) % 4) as 0 | 1 | 2 | 3;

  }



  rebuildWorld(): void {

    const state = this.cb.getState();

    this.tileLayer.removeChildren();

    this.stationLayer.removeChildren();



    const tileGfx = buildBaseTileLayer(state.base.width, state.base.height, state.base.cells);
    this.tileLayer.addChild(tileGfx);

    for (const placement of state.base.placements) {
      if (placement.stationId !== 'habitat_pen' || !placement.habitatZone) continue;
      const z = placement.habitatZone;
      const penGfx = new Graphics();
      const px = z.cellX * BASE_CELL_SIZE;
      const py = z.cellY * BASE_CELL_SIZE;
      const pw = z.width * BASE_CELL_SIZE;
      const ph = z.height * BASE_CELL_SIZE;
      penGfx.rect(px, py, pw, ph);
      penGfx.fill({ color: 0x4a9e6a, alpha: 0.15 });
      penGfx.rect(px, py, pw, ph);
      penGfx.stroke({ width: 2, color: 0x7ed492, alpha: 0.7 });
      this.tileLayer.addChild(penGfx);
    }

    for (const placement of state.base.placements) {

      if (placement.id === this.heldPlacementId) continue;

      if (placement.stationId === 'habitat_pen') continue;

      const def = getStation(placement.stationId);

      const frameByStation: Partial<Record<StationId, string>> = {
        chest_wood: 'base_chest',
        workbench: 'base_workbench',
        bed: 'base_bed',
      };
      const texture = getBaseStationTexture(frameByStation[placement.stationId] ?? '');
      if (texture) {
        const sprite = new Sprite(texture);
        sprite.anchor.set(0.5, 1);
        sprite.x = (placement.cellX + def.width / 2) * BASE_CELL_SIZE;
        sprite.y = (placement.cellY + def.height) * BASE_CELL_SIZE - 1;
        sprite.roundPixels = true;
        this.stationLayer.addChild(sprite);
        continue;
      }

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



    const portal = getDungeonPortalWorld(state.base);

    this.portalSprite.x = portal.x;

    this.portalSprite.y = portal.y;



    const stairs = getShopStaircaseWorld(state.base);

    this.staircaseSprite.x = stairs.x;

    this.staircaseSprite.y = stairs.y;



    this.floors = getFloorsForCollision(state.base);

    this.walls = [
      ...getRockWallsForCollision(state.base),
      ...getStationWallsForCollision(state.base, this.heldPlacementId),
    ];

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

      const penId = creaturePenId(creature);

      if (!penId) return;

      const zone = getZoneForPen(state, penId);

      if (!zone) return;

      const pt = randomPointInZone(zone, BASE_CELL_SIZE, Math.random);

      const x = pt.x;

      const y = pt.y;

      container.x = x;

      container.y = y;

      this.entityLayer.addChild(container);



      this.wanderers.push({

        habitatIndex,

        penId,

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



  private updateWanderers(dt: number, state: GameState): void {

    for (const w of this.wanderers) {

      const zone = getZoneForPen(state, w.penId);

      if (!zone) continue;

      const bounds = {
        minX: zone.cellX * BASE_CELL_SIZE + 10,
        minY: zone.cellY * BASE_CELL_SIZE + 10,
        maxX: (zone.cellX + zone.width) * BASE_CELL_SIZE - 10,
        maxY: (zone.cellY + zone.height) * BASE_CELL_SIZE - 10,
      };

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



      const clamped = clampToZone(zone, w.x, w.y, BASE_CELL_SIZE);

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

    if (this.input.consumeKey('r') && this.selectedTool && this.selectedTool !== 'move') {

      this.rotateBuildGhost();

    }



    if (this.selectedTool) {

      const worldMouse = this.camera.screenToWorld(this.input.mouseX, this.input.mouseY);

      const mouseCell = worldToCell(worldMouse.x, worldMouse.y);



      if (this.input.consumeClick()) {

        if (this.selectedTool === 'move') {

          this.handleMoveClick(state, mouseCell.x, mouseCell.y);

        } else if (this.selectedTool === 'habitat_pen') {

          this.penDragStart = { x: mouseCell.x, y: mouseCell.y };

        } else {

          this.handlePlaceClick(state, mouseCell.x, mouseCell.y);

        }

      }

      if (this.penDragStart && this.input.mouseDown) {
        // arrastando preview
      }

      if (this.penDragStart && this.lastMouseDown && !this.input.mouseDown && this.selectedTool === 'habitat_pen') {

        const end = worldToCell(worldMouse.x, worldMouse.y);

        const zone = normalizeDragZone(this.penDragStart.x, this.penDragStart.y, end.x, end.y);

        const result = placeHabitatPen(state, zone);

        if (result.ok) {

          this.cb.onStateChange();

          this.rebuildWorld();

          this.cb.showToast(result.message);

          this.cb.onHabitatPenPlaced?.();

        } else {

          this.cb.showToast(result.message);

        }

        this.penDragStart = null;

      }

      this.lastMouseDown = this.input.mouseDown;



      if (this.input.consumeKey('e') && this.selectedTool === 'move' && this.heldPlacementId) {

        const removed = removePlacement(state, this.heldPlacementId);

        if (removed.ok) {

          this.heldPlacementId = null;

          this.cb.onStateChange();

          this.rebuildWorld();

          this.cb.showToast(removed.message);

        } else {

          this.cb.showToast(removed.message);

        }

      }

      return;

    }



    if (this.input.consumeKey('e')) {

      const landmark = this.findNearestLandmark(state);

      if (landmark === 'portal') {

        if (!canUseBaseLandmark(state, 'portal')) {
          this.cb.showToast('Siga a orientação da Mira primeiro.');
          return;
        }

        if (state.dungeonUsedToday && !canEnterDungeonDuringTutorial(state)) {
          this.cb.showToast('Você já foi à masmorra hoje — durma para um novo dia');
          return;
        }

        this.cb.onOpenDungeon();

        return;

      }

      if (landmark === 'shop') {

        if (!canUseBaseLandmark(state, 'shop')) {
          this.cb.showToast('A Mira pediu para ir ao portal da masmorra primeiro.');
          return;
        }

        this.cb.onOpenShop();

        return;

      }

      const habitatPenId = this.findHabitatInteractTarget(state);

      if (habitatPenId) {

        this.cb.onOpenHabitatPen(habitatPenId);

        return;

      }

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

        } else if (near.kind === 'bed') {

          this.cb.onSleep();

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



  private handlePlaceClick(state: GameState, cellX: number, cellY: number): void {

    if (!this.selectedTool || this.selectedTool === 'move' || this.selectedTool === 'habitat_pen') return;

    const result = placeStation(state, this.selectedTool, cellX, cellY, this.buildRotation);

    if (result.ok) {

      this.cb.onStateChange();

      this.rebuildWorld();

      this.cb.showToast(result.message);

    } else {

      this.cb.showToast(result.message);

    }

  }



  private handleMoveClick(state: GameState, cellX: number, cellY: number): void {

    if (!this.heldPlacementId) {

      const placement = findPlacementAt(state, cellX, cellY);

      if (!placement) {

        this.cb.showToast('Clique numa estação para levantar');

        return;

      }

      this.heldPlacementId = placement.id;

      this.rebuildWorld();

      this.cb.showToast('Clique onde reposicionar · [E] remover');

      return;

    }



    const result = relocatePlacement(state, this.heldPlacementId, cellX, cellY);

    if (result.ok) {

      this.heldPlacementId = null;

      this.cb.onStateChange();

      this.rebuildWorld();

      this.cb.showToast(result.message);

    } else {

      this.cb.showToast(result.message);

    }

  }



  private findHabitatInteractTarget(state: GameState): string | null {

    const pc = worldToCell(this.playerX, this.playerY);

    const penAt = findHabitatPenAt(state, pc.x, pc.y);

    if (penAt) return penAt.id;

    const nearPen = findNearestHabitatPen(state, this.playerX, this.playerY, BASE_CELL_SIZE, INTERACT_RANGE);

    if (nearPen) return nearPen.id;

    return null;

  }

  private findNearestLandmark(state: GameState): 'portal' | 'shop' | null {

    const portal = getDungeonPortalWorld(state.base);

    const stairs = getShopStaircaseWorld(state.base);

    const portalDist = distance(this.playerX, this.playerY, portal.x, portal.y);

    const stairsDist = distance(this.playerX, this.playerY, stairs.x, stairs.y);



    if (portalDist <= LANDMARK_RANGE && portalDist <= stairsDist) return 'portal';

    if (stairsDist <= LANDMARK_RANGE) return 'shop';

    return null;

  }



  private findNearestInteractable(state: GameState): {

    kind: 'chest' | 'workbench' | 'bed';

    chestId?: string;

    cellX?: number;

    cellY?: number;

    dist: number;

  } | null {

    let best: {

      kind: 'chest' | 'workbench' | 'bed';

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

      if (p.stationId === 'bed') {

        if (!best || dist < best.dist) {

          best = { kind: 'bed', cellX: p.cellX, cellY: p.cellY, dist };

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

    if (!this.selectedTool) return;

    this.ensureGhost();

    if (!this.ghostGfx) return;



    const worldMouse = this.camera.screenToWorld(this.input.mouseX, this.input.mouseY);

    const cell = worldToCell(worldMouse.x, worldMouse.y);



    let stationId: StationId;

    let excludeId: string | undefined;



    if (this.selectedTool === 'move') {

      if (!this.heldPlacementId) {

        this.ghostGfx.clear();

        return;

      }

      const held = findPlacementById(state, this.heldPlacementId);

      if (!held) {

        this.heldPlacementId = null;

        this.ghostGfx.clear();

        return;

      }

      stationId = held.stationId;

      excludeId = held.id;

    } else if (this.selectedTool === 'habitat_pen' && this.penDragStart) {

      const preview = previewDragZone(this.penDragStart.x, this.penDragStart.y, cell.x, cell.y);

      const check = canPlaceHabitatPen(state, normalizeDragZone(this.penDragStart.x, this.penDragStart.y, cell.x, cell.y));

      const px = preview.cellX * BASE_CELL_SIZE - this.camera.x;

      const py = preview.cellY * BASE_CELL_SIZE - this.camera.y;

      const w = preview.width * BASE_CELL_SIZE;

      const h = preview.height * BASE_CELL_SIZE;

      this.ghostGfx.clear();

      this.ghostGfx.rect(px, py, w, h);

      this.ghostGfx.fill({ color: check.ok ? 0x5dbb63 : 0xcc4444, alpha: 0.35 });

      this.ghostGfx.stroke({ width: 2, color: check.ok ? 0xc4f082 : 0xff6666, alpha: 0.8 });

      return;

    } else if (this.selectedTool === 'habitat_pen') {

      this.ghostGfx.clear();

      return;

    } else {

      stationId = this.selectedTool;

    }



    const def = getStation(stationId);

    const check = canPlaceStation(state, stationId, cell.x, cell.y, excludeId);



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

    let hint = 'WASD mover · [I] bolsa · [E] no cercado · Clique criatura → bolsa';



    if (this.selectedTool === 'move') {

      hint = this.heldPlacementId

        ? 'Mover: clique para colocar · [E] remover estação · Esc cancelar'

        : 'Mover: clique numa estação para levantar · Esc cancelar';

      this.cb.setHint(hint);

      return;

    }



    if (this.selectedTool === 'habitat_pen') {

      hint = 'Cercado: clique e arraste para definir a área · [E] no cercado para gerenciar criaturas';

      this.cb.setHint(hint);

      return;

    }

    if (this.selectedTool) {

      const def = getStation(this.selectedTool);

      hint = `${def.name}: clique para colocar · Esc cancelar`;

      this.cb.setHint(hint);

      return;

    }



    const landmark = this.findNearestLandmark(state);

    if (landmark === 'portal') {

      hint = state.dungeonUsedToday
        ? 'Portal — masmorra já visitada hoje'
        : '[E] Portal — escolher masmorra';

    } else if (landmark === 'shop') {

      hint = state.shopDayUsed ? '[E] Escada — loja fechada hoje' : '[E] Escada — subir para a loja';

    } else {

      const rocks = findAdjacentRockCells(state.base, this.playerX, this.playerY);

      if (rocks.length > 0) {

        hint = '[E] Escavar rocha adjacente (5 STA)';

      } else {

        const near = this.findNearestInteractable(state);

        if (near?.kind === 'chest') hint = '[E] Abrir baú';

        else if (near?.kind === 'workbench') hint = '[E] Usar bancada';

        else if (near?.kind === 'bed') {
          hint = state.dungeonReturnedToday
            ? '[E] Dormir'
            : 'Cama — volte da masmorra para dormir';
        }

      else if (this.findHabitatInteractTarget(state)) hint = '[E] Gerenciar criaturas do cercado';

      }

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

