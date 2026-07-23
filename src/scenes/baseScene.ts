import { Container, Graphics, Sprite, Text } from 'pixi.js';

import { getSpecies } from '../data/creatures.ts';

import {
  canRotateStation,
  getStation,
  getStationFootprint,
  type StationId,
} from '../data/baseStations.ts';

import {

  BASE_CELL_SIZE,

  BASE_STAMINA_REGEN,

  PLAYER_MAX_STAMINA,

  PLAYER_SPEED,

} from '../engine/constants.ts';

import { Camera } from '../engine/camera.ts';
import { playSfx } from '../engine/audioManager.ts';
import { FxRunner } from '../engine/fxRunner.ts';

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
import { getBaseStationTexture, getBaseTileTexture } from '../world/environmentAssets.ts';
import { baseCellTileFrameAt } from '../world/tileRenderer.ts';

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

  private digFxLayer = new Container();

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

  private fxRunner = new FxRunner();



  constructor(input: InputManager, callbacks: BaseSceneCallbacks) {

    this.input = input;

    this.cb = callbacks;

    this.root.addChild(this.world);

    this.world.addChild(this.tileLayer);

    this.world.addChild(this.digFxLayer);

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

    this.fxRunner.clear();

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

      if (placement.stationId === 'dungeon_portal' || placement.stationId === 'shop_ladder') continue;

      const def = getStation(placement.stationId);
      const footprint = getStationFootprint(placement.stationId, placement.rotation);

      const frameByStation: Partial<Record<StationId, string>> = {
        chest_wood: 'base_chest',
        workbench: 'base_workbench',
        bed: 'base_bed',
      };
      const frameBase = frameByStation[placement.stationId];
      const texture = frameBase
        ? getBaseStationTexture(`${frameBase}_${placement.rotation}`)
        : null;
      if (texture) {
        const sprite = new Sprite(texture);
        sprite.anchor.set(0.5, 1);
        sprite.x = (placement.cellX + footprint.width / 2) * BASE_CELL_SIZE;
        sprite.y = (placement.cellY + footprint.height) * BASE_CELL_SIZE - 1;
        sprite.roundPixels = true;
        this.stationLayer.addChild(sprite);
        continue;
      }

      const gfx = new Graphics();

      const w = footprint.width * BASE_CELL_SIZE - 4;

      const h = footprint.height * BASE_CELL_SIZE - 4;

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

    this.portalSprite.visible = !state.base.placements.some(
      (p) => p.id === this.heldPlacementId && p.stationId === 'dungeon_portal',
    );



    const ladderPlacement = state.base.placements.find((p) => p.stationId === 'shop_ladder');
    const ladderRotation = ladderPlacement?.rotation ?? 0;
    this.staircaseSprite.removeFromParent();
    this.staircaseSprite.destroy({ children: true });
    this.staircaseSprite = createStaircaseSprite(ladderRotation);
    this.landmarkLayer.addChild(this.staircaseSprite);

    const stairs = getShopStaircaseWorld(state.base);

    this.staircaseSprite.x = stairs.x;

    this.staircaseSprite.y = stairs.y;

    this.staircaseSprite.visible = !state.base.placements.some(
      (p) => p.id === this.heldPlacementId && p.stationId === 'shop_ladder',
    );



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

    this.fxRunner.update(dt);



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

    if (this.input.consumeKey('r') && this.selectedTool) {
      const held = this.heldPlacementId ? findPlacementById(state, this.heldPlacementId) : null;
      const stationId = this.selectedTool === 'move' ? held?.stationId : this.selectedTool;
      if (stationId && canRotateStation(stationId)) {
        this.rotateBuildGhost();
        this.updateHint();
      } else if (held?.stationId === 'dungeon_portal') {
        this.cb.showToast('O portal mantém a orientação fixa');
      }
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

          this.playRockBreakAnimation(target.x, target.y);

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

  private playRockBreakAnimation(cellX: number, cellY: number): void {
    const root = new Container();
    root.x = cellX * BASE_CELL_SIZE;
    root.y = cellY * BASE_CELL_SIZE;
    root.zIndex = 100;

    const rockFrame = baseCellTileFrameAt(2, cellX, cellY) ?? 'rock';
    const rockTexture = getBaseTileTexture(rockFrame) ?? getBaseTileTexture('rock');
    const rock = rockTexture ? new Sprite(rockTexture) : new Graphics();
    if (rock instanceof Graphics) {
      rock.rect(0, 0, BASE_CELL_SIZE, BASE_CELL_SIZE);
      rock.fill(0x3f3440);
    }
    rock.roundPixels = true;
    root.addChild(rock);

    const crackTextures = [
      getBaseTileTexture('rock_crack_1'),
      getBaseTileTexture('rock_crack_2'),
      getBaseTileTexture('rock_crack_3'),
    ];
    const crack = crackTextures[0] ? new Sprite(crackTextures[0]) : null;
    if (crack) {
      crack.roundPixels = true;
      root.addChild(crack);
    }

    const rubbleTexture = getBaseTileTexture('rock_rubble');
    const rubble = rubbleTexture ? new Sprite(rubbleTexture) : null;
    if (rubble) {
      rubble.visible = false;
      rubble.roundPixels = true;
      root.addChild(rubble);
    }

    this.digFxLayer.addChild(root);
    playSfx('combat.attack.pickaxe', { volume: 0.72, speed: 0.82 });
    let impactPlayed = false;

    this.fxRunner.spawn(0.52, (progress) => {
      const frame = Math.min(2, Math.floor(progress * 4));
      if (crack && crackTextures[frame] && crack.texture !== crackTextures[frame]) {
        crack.texture = crackTextures[frame]!;
      }

      if (progress < 0.68) {
        const shake = progress < 0.18 ? 2 : 1;
        root.x = cellX * BASE_CELL_SIZE + (Math.floor(progress * 48) % 2 === 0 ? -shake : shake);
        root.y = cellY * BASE_CELL_SIZE;
      } else {
        if (!impactPlayed) {
          impactPlayed = true;
          playSfx('combat.hit', { volume: 0.48, speed: 0.72 });
        }
        root.x = cellX * BASE_CELL_SIZE;
        if (crack) crack.visible = false;
        rock.alpha = Math.max(0, 1 - (progress - 0.68) / 0.14);
        if (rubble) {
          rubble.visible = true;
          rubble.alpha = Math.max(0, 1 - (progress - 0.72) / 0.28);
          rubble.y = Math.round((progress - 0.72) * 8);
        }
      }
    }, () => {
      root.removeFromParent();
      root.destroy({ children: true });
    });
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
      this.buildRotation = placement.rotation;

      this.rebuildWorld();

      this.cb.showToast(
        placement.stationId === 'dungeon_portal'
          ? 'Clique onde reposicionar'
          : 'Clique onde reposicionar · [R] girar · [E] remover',
      );

      return;

    }



    const result = relocatePlacement(state, this.heldPlacementId, cellX, cellY, this.buildRotation);

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

      const footprint = getStationFootprint(p.stationId, p.rotation);

      const cx = (p.cellX + footprint.width / 2) * BASE_CELL_SIZE;

      const cy = (p.cellY + footprint.height / 2) * BASE_CELL_SIZE;

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

      if (held.stationId === 'habitat_pen' && held.habitatZone) {
        const swap = this.buildRotation % 2 !== held.rotation % 2;
        const zone = {
          cellX: cell.x,
          cellY: cell.y,
          width: swap ? held.habitatZone.height : held.habitatZone.width,
          height: swap ? held.habitatZone.width : held.habitatZone.height,
        };
        const check = canPlaceHabitatPen(state, zone, held.id);
        const px = zone.cellX * BASE_CELL_SIZE - this.camera.x;
        const py = zone.cellY * BASE_CELL_SIZE - this.camera.y;
        const w = zone.width * BASE_CELL_SIZE;
        const h = zone.height * BASE_CELL_SIZE;
        this.ghostGfx.clear();
        this.ghostGfx.rect(px, py, w, h);
        this.ghostGfx.fill({ color: check.ok ? 0x5dbb63 : 0xcc4444, alpha: 0.35 });
        this.ghostGfx.stroke({ width: 2, color: check.ok ? 0xc4f082 : 0xff6666, alpha: 0.8 });
        return;
      }

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



    const footprint = getStationFootprint(stationId, this.buildRotation);

    const check = canPlaceStation(
      state,
      stationId,
      cell.x,
      cell.y,
      excludeId,
      this.buildRotation,
    );



    const px = cell.x * BASE_CELL_SIZE - this.camera.x;

    const py = cell.y * BASE_CELL_SIZE - this.camera.y;

    const w = footprint.width * BASE_CELL_SIZE;

    const h = footprint.height * BASE_CELL_SIZE;



    this.ghostGfx.clear();

    this.ghostGfx.rect(px, py, w, h);

    this.ghostGfx.fill({ color: check.ok ? 0x5dbb63 : 0xcc4444, alpha: 0.35 });

    this.ghostGfx.stroke({ width: 2, color: check.ok ? 0xc4f082 : 0xff6666, alpha: 0.8 });

  }



  private updateHint(): void {

    const state = this.cb.getState();

    let hint = 'WASD mover · [I] bolsa · [E] no cercado · Clique criatura → bolsa';



    if (this.selectedTool === 'move') {
      const held = this.heldPlacementId ? findPlacementById(state, this.heldPlacementId) : null;
      const permanentLandmark = held?.stationId === 'dungeon_portal' || held?.stationId === 'shop_ladder';
      hint = this.heldPlacementId
        ? permanentLandmark
          ? held?.stationId === 'dungeon_portal'
            ? 'Mover: clique para colocar · portal com orientação fixa · Esc cancelar'
            : 'Mover: clique para colocar · [R] girar 90° · Esc cancelar'
          : 'Mover: clique para colocar · [R] girar 90° · [E] remover estação · Esc cancelar'
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

      hint = `${def.name}: clique para colocar · [R] girar 90° · Esc cancelar`;

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
