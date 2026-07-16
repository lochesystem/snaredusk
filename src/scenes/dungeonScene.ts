import { Container, Graphics } from 'pixi.js';
import {
  PLAYER_ATTACK_COOLDOWN,
  PLAYER_ATTACK_DAMAGE,
  PLAYER_ATTACK_RANGE,
  PLAYER_MAX_HP,
  PLAYER_SPEED,
  CAPTURE_RANGE,
  CAPTURE_ORB_SPEED,
} from '../engine/constants.ts';
import { Camera } from '../engine/camera.ts';
import type { InputManager } from '../engine/input.ts';
import { DungeonMinimap } from '../ui/dungeonMinimap.ts';
import { YSortLayer } from '../engine/ySortLayer.ts';
import { getSpecies } from '../data/creatures.ts';
import { LOOT_TABLE } from '../data/items.ts';
import { generateDungeon, type DungeonLayout } from '../world/dungeonGenerator.ts';
import { moveWithCollision, PLAYER_RADIUS } from '../world/collision.ts';
import { calcDamage, distance, normalize } from '../systems/combat.ts';
import {
  canTargetForCapture,
  formatCaptureChance,
  rollCaptureFailure,
  rollCaptureSuccess,
} from '../systems/capture.ts';
import { addToBag, bagCount } from '../systems/saveManager.ts';
import type { CreatureItem, GameState, LootItem } from '../types.ts';
import {
  createChestSprite,
  createCreatureSprite,
  createPlayerSprite,
  createPortalSprite,
  createCaptureOrbGraphic,
  drawCaptureBurst,
  drawAttackSlash,
  drawDamageNumber,
  drawDungeonLayout,
} from '../world/placeholderArt.ts';

export interface DungeonCallbacks {
  onReturnToBase: (died: boolean) => void;
  onStateChange: () => void;
  showToast: (msg: string) => void;
  updateHud: () => void;
}

interface LiveEnemy {
  id: string;
  speciesId: string;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  atk: number;
  speed: number;
  attackCd: number;
  enraged: boolean;
  fled: boolean;
  dead: boolean;
  container: Container;
  capturableGlow: boolean;
}

interface FlyingOrb {
  gfx: Graphics;
  target: LiveEnemy;
}

interface LiveChest {
  x: number;
  y: number;
  lootId: string;
  opened: boolean;
  container: Container;
}

export class DungeonScene {
  readonly root = new Container();
  private world = new Container();
  private entityLayer = new YSortLayer();
  private fxLayer = new Container();
  private camera = new Camera();
  private playerSprite = createPlayerSprite();
  private portalSprite = createPortalSprite();
  private slashGfx = new Graphics();

  private playerX = 0;
  private playerY = 0;
  private playerHp: number;
  private attackCd = 0;
  private enemies: LiveEnemy[] = [];
  private active = false;
  private portalActive = false;
  private flyingOrbs: FlyingOrb[] = [];
  private chests: LiveChest[] = [];
  private layout: DungeonLayout;
  private glowTargetId: string | null = null;
  private minimap: DungeonMinimap;

  private state: GameState;
  private input: InputManager;
  private callbacks: DungeonCallbacks;

  constructor(
    state: GameState,
    input: InputManager,
    callbacks: DungeonCallbacks,
    dungeonSeed: number,
  ) {
    this.state = state;
    this.input = input;
    this.callbacks = callbacks;
    this.playerHp = state.playerHp;
    this.layout = generateDungeon(dungeonSeed);
    this.minimap = new DungeonMinimap(this.layout.portalRoomIndex);

    const floorGfx = new Graphics();
    drawDungeonLayout(floorGfx, {
      floors: this.layout.floors,
      walls: this.layout.walls,
      rooms: this.layout.rooms,
      decor: this.layout.decor,
      obstacles: this.layout.obstacles,
      chests: [],
      width: this.layout.width,
      height: this.layout.height,
    });
    this.world.addChild(floorGfx);

    this.playerX = this.layout.spawn.x;
    this.playerY = this.layout.spawn.y;

    this.portalSprite.x = this.layout.portal.x;
    this.portalSprite.y = this.layout.portal.y;
    this.entityLayer.addChild(this.portalSprite);

    this.playerSprite.x = this.playerX;
    this.playerSprite.y = this.playerY;
    this.entityLayer.addChild(this.playerSprite);

    this.world.addChild(this.entityLayer);
    this.world.addChild(this.fxLayer);
    this.fxLayer.addChild(this.slashGfx);
    this.root.addChild(this.world);
    this.root.addChild(this.minimap.container);

    this.spawnEnemies();
    this.spawnChests();
  }

  enter(): void {
    this.active = true;
    this.callbacks.updateHud();
  }

  exit(): void {
    this.active = false;
    this.state.playerHp = this.playerHp;
    for (const orb of this.flyingOrbs) {
      orb.gfx.destroy();
    }
    this.flyingOrbs = [];
    this.root.destroy({ children: true });
  }

  private spawnEnemies(): void {
    for (const spawn of this.layout.enemySpawns) {
      const species = getSpecies(spawn.speciesId);
      const container = createCreatureSprite(species);
      container.x = spawn.x;
      container.y = spawn.y;
      this.entityLayer.addChild(container);
      this.enemies.push({
        id: `${spawn.speciesId}-${spawn.roomIndex}`,
        speciesId: spawn.speciesId,
        hp: species.maxHp,
        maxHp: species.maxHp,
        x: spawn.x,
        y: spawn.y,
        atk: species.atk,
        speed: species.speed,
        attackCd: 0,
        enraged: false,
        fled: false,
        dead: false,
        container,
        capturableGlow: false,
      });
    }
  }

  private spawnChests(): void {
    for (const chest of this.layout.chests) {
      const container = createChestSprite(false);
      container.x = chest.x;
      container.y = chest.y;
      this.entityLayer.addChild(container);
      this.chests.push({
        x: chest.x,
        y: chest.y,
        lootId: chest.lootId,
        opened: false,
        container,
      });
    }
  }

  update(dt: number): void {
    if (!this.active) return;

    this.movePlayer(dt);
    this.updateEnemies(dt);
    this.updateCaptureOrbs(dt);
    this.tryLaunchCapture();
    this.handleInteract();
    this.checkPlayerDeath();
    this.updateCapturableGlow();
    this.updatePortalState();

    this.entityLayer.resort();
    this.camera.follow(this.playerX, this.playerY, this.layout.width, this.layout.height);
    this.camera.update();
    this.world.x = -this.camera.x;
    this.world.y = -this.camera.y;
    this.minimap.update(this.layout, this.playerX, this.playerY);

    this.state.playerHp = Math.round(this.playerHp);
    this.callbacks.updateHud();
  }

  private movePlayer(dt: number): void {
    const move = this.input.getMovement();
    const dx = move.x * PLAYER_SPEED * dt;
    const dy = move.y * PLAYER_SPEED * dt;

    const next = moveWithCollision(
      this.playerX,
      this.playerY,
      dx,
      dy,
      PLAYER_RADIUS,
      this.layout.walls,
      this.layout.floors,
      this.layout.obstacles,
    );

    this.playerX = next.x;
    this.playerY = next.y;
    this.playerSprite.x = next.x;
    this.playerSprite.y = next.y;

    if (this.input.consumeClick() && this.attackCd <= 0) {
      this.performAttack();
    }
  }

  private performAttack(): void {
    const worldMouse = this.camera.screenToWorld(this.input.mouseX, this.input.mouseY);
    const dir = normalize(worldMouse.x - this.playerX, worldMouse.y - this.playerY);
    const angle = Math.atan2(dir.y, dir.x);

    drawAttackSlash(this.slashGfx, this.playerX, this.playerY, angle);
    setTimeout(() => this.slashGfx.clear(), 80);

    this.attackCd = PLAYER_ATTACK_COOLDOWN;

    for (const enemy of this.enemies) {
      if (enemy.dead || enemy.fled) continue;
      const dist = distance(this.playerX, this.playerY, enemy.x, enemy.y);
      if (dist <= PLAYER_ATTACK_RANGE + 8) {
        this.damageEnemy(enemy, calcDamage(PLAYER_ATTACK_DAMAGE));
      }
    }
  }

  private damageEnemy(enemy: LiveEnemy, dmg: number): void {
    enemy.hp = Math.max(0, enemy.hp - dmg);
    drawDamageNumber(this.fxLayer, dmg, enemy.x, enemy.y - 20);
    if (enemy.hp <= 0) {
      enemy.dead = true;
      this.onEnemyKilled(enemy);
      enemy.container.visible = false;
    }
  }

  private onEnemyKilled(enemy: LiveEnemy): void {
    const species = getSpecies(enemy.speciesId);
    const lootKey = enemy.speciesId === 'lumimorcego' ? 'esporo_brilhante' : 'cogumelo_comum';
    const lootDef = LOOT_TABLE[lootKey] ?? LOOT_TABLE.cogumelo_comum;
    const loot: LootItem = {
      kind: 'loot',
      id: lootDef.id,
      name: lootDef.name,
      baseValue: lootDef.baseValue,
      quantity: 1,
    };
    if (!addToBag(this.state, loot)) {
      this.callbacks.showToast('Bolsa cheia!');
    } else {
      this.callbacks.showToast(`${species.name} derrotado — loot coletado`);
    }
    this.callbacks.onStateChange();
  }

  private updateEnemies(dt: number): void {
    for (const enemy of this.enemies) {
      if (enemy.dead || enemy.fled) continue;

      const dist = distance(this.playerX, this.playerY, enemy.x, enemy.y);
      if (dist > 8) {
        const dir = normalize(this.playerX - enemy.x, this.playerY - enemy.y);
        const spd = enemy.speed * (enemy.enraged ? 1.2 : 1);
        const stepX = dir.x * spd * dt;
        const stepY = dir.y * spd * dt;
        const moved = moveWithCollision(
          enemy.x,
          enemy.y,
          stepX,
          stepY,
          9,
          this.layout.walls,
          this.layout.floors,
          this.layout.obstacles,
        );
        enemy.x = moved.x;
        enemy.y = moved.y;
      }

      enemy.attackCd -= dt;
      if (dist < 18 && enemy.attackCd <= 0) {
        enemy.attackCd = 1.1;
        const dmg = calcDamage(enemy.atk);
        this.playerHp = Math.max(0, this.playerHp - dmg);
        drawDamageNumber(this.fxLayer, dmg, this.playerX, this.playerY - 24);
      }

      enemy.container.x = enemy.x;
      enemy.container.y = enemy.y;
    }

    if (this.attackCd > 0) this.attackCd -= dt;
  }

  private getNearestCaptureTarget(): LiveEnemy | null {
    let best: LiveEnemy | null = null;
    let bestDist = Infinity;
    for (const enemy of this.enemies) {
      if (enemy.dead || enemy.fled) continue;
      if (!canTargetForCapture(enemy.hp, enemy.maxHp)) continue;
      const d = distance(this.playerX, this.playerY, enemy.x, enemy.y);
      if (d < CAPTURE_RANGE && d < bestDist) {
        best = enemy;
        bestDist = d;
      }
    }
    return best;
  }

  private updateCapturableGlow(): void {
    const target = this.getNearestCaptureTarget();
    const targetId = target?.id ?? null;
    if (targetId === this.glowTargetId) return;
    this.glowTargetId = targetId;

    for (const enemy of this.enemies) {
      if (enemy.dead || enemy.fled) continue;
      const shouldGlow = enemy.id === targetId;
      if (enemy.capturableGlow === shouldGlow) continue;
      enemy.capturableGlow = shouldGlow;
      const species = getSpecies(enemy.speciesId);
      const parent = enemy.container.parent;
      if (!parent) continue;
      parent.removeChild(enemy.container);
      enemy.container.destroy({ children: true });
      enemy.container = createCreatureSprite(species, shouldGlow);
      enemy.container.x = enemy.x;
      enemy.container.y = enemy.y;
      parent.addChild(enemy.container);
    }
  }

  private tryLaunchCapture(): void {
    if (!this.input.consumeKey('q')) return;
    if (this.flyingOrbs.length > 0) return;

    if (this.state.orbs <= 0) {
      this.callbacks.showToast('Sem Orbes — compre na base!');
      return;
    }

    const enemy = this.getNearestCaptureTarget();
    if (!enemy) {
      this.callbacks.showToast('Nenhum alvo por perto para lançar o Orbe');
      return;
    }

    if (bagCount(this.state) >= 12) {
      this.callbacks.showToast('Bolsa cheia!');
      return;
    }

    this.state.orbs -= 1;
    this.launchOrb(enemy);
    this.callbacks.onStateChange();
  }

  private launchOrb(target: LiveEnemy): void {
    const gfx = createCaptureOrbGraphic();
    gfx.x = this.playerX;
    gfx.y = this.playerY - 8;
    this.fxLayer.addChild(gfx);
    this.flyingOrbs.push({ gfx, target });
  }

  private updateCaptureOrbs(dt: number): void {
    for (let i = this.flyingOrbs.length - 1; i >= 0; i--) {
      const orb = this.flyingOrbs[i]!;
      if (orb.target.dead || orb.target.fled) {
        this.removeOrb(i, false);
        this.callbacks.showToast('Alvo perdido — Orbe desperdiçado');
        continue;
      }

      const tx = orb.target.x;
      const ty = orb.target.y - 6;
      const dir = normalize(tx - orb.gfx.x, ty - orb.gfx.y);
      orb.gfx.x += dir.x * CAPTURE_ORB_SPEED * dt;
      orb.gfx.y += dir.y * CAPTURE_ORB_SPEED * dt;

      // Rastro luminescente
      orb.gfx.rotation += dt * 8;

      const dist = distance(orb.gfx.x, orb.gfx.y, tx, ty);
      if (dist < 10) {
        this.resolveCapture(orb.target);
        this.removeOrb(i, true);
      }
    }
  }

  private removeOrb(index: number, hit: boolean): void {
    const orb = this.flyingOrbs[index]!;
    const { x, y } = orb.gfx;
    this.fxLayer.removeChild(orb.gfx);
    orb.gfx.destroy();
    this.flyingOrbs.splice(index, 1);
    if (!hit) {
      drawCaptureBurst(this.fxLayer, x, y, false);
    }
  }

  private resolveCapture(enemy: LiveEnemy): void {
    const species = getSpecies(enemy.speciesId);
    const rollInput = { targetHp: enemy.hp, targetMaxHp: enemy.maxHp };
    const success = rollCaptureSuccess(rollInput);

    drawCaptureBurst(this.fxLayer, enemy.x, enemy.y - 6, success);

    if (success) {
      const creature: CreatureItem = {
        kind: 'creature',
        speciesId: species.id,
        name: species.name,
        baseValue: species.baseValue,
      };
      if (addToBag(this.state, creature)) {
        if (!this.state.bestiary.includes(species.id)) {
          this.state.bestiary.push(species.id);
        }
        enemy.dead = true;
        enemy.container.visible = false;
        this.callbacks.showToast(`Capturou ${species.name}! (${formatCaptureChance(rollInput)})`);
        this.callbacks.onStateChange();
      }
      return;
    }

    const fail = rollCaptureFailure();
    if (fail === 'enrage') {
      enemy.enraged = true;
      this.callbacks.showToast(`${species.name} enfureceu! (${formatCaptureChance(rollInput)} falhou)`);
    } else {
      enemy.fled = true;
      enemy.container.visible = false;
      this.callbacks.showToast(`${species.name} fugiu!`);
    }
  }

  private handleInteract(): void {
    if (!this.input.consumeKey('e')) return;

    const aliveEnemies = this.enemies.filter((e) => !e.dead && !e.fled).length;
    this.portalActive = aliveEnemies === 0;

    const portalDist = distance(this.playerX, this.playerY, this.layout.portal.x, this.layout.portal.y);
    if (this.portalActive && portalDist < 28) {
      this.state.dungeonCleared = true;
      this.active = false;
      this.callbacks.onReturnToBase(false);
      return;
    }

    for (const chest of this.chests) {
      if (chest.opened) continue;
      if (distance(this.playerX, this.playerY, chest.x, chest.y) >= 28) continue;

      const lootDef = LOOT_TABLE[chest.lootId] ?? LOOT_TABLE.cogumelo_comum;
      const loot: LootItem = {
        kind: 'loot',
        id: lootDef.id,
        name: lootDef.name,
        baseValue: lootDef.baseValue,
        quantity: 1,
      };
      if (!addToBag(this.state, loot)) {
        this.callbacks.showToast('Bolsa cheia!');
        return;
      }

      chest.opened = true;
      const parent = chest.container.parent;
      parent?.removeChild(chest.container);
      chest.container.destroy({ children: true });
      chest.container = createChestSprite(true);
      chest.container.x = chest.x;
      chest.container.y = chest.y;
      parent?.addChild(chest.container);
      this.callbacks.showToast(`Baú: ${lootDef.name}!`);
      this.callbacks.onStateChange();
      return;
    }
  }

  private updatePortalState(): void {
    const aliveEnemies = this.enemies.filter((e) => !e.dead && !e.fled).length;
    this.portalActive = aliveEnemies === 0;
  }

  private checkPlayerDeath(): void {
    if (this.playerHp <= 0) {
      this.state.bag = this.state.bag.map(() => null);
      this.state.playerHp = PLAYER_MAX_HP;
      this.callbacks.showToast('Você desmaiou — perdeu a bolsa!');
      this.active = false;
      this.callbacks.onReturnToBase(true);
    }
  }

  getHudHint(): string {
    if (this.flyingOrbs.length > 0) {
      return 'Orbe de Vínculo em voo...';
    }
    const target = this.getNearestCaptureTarget();
    if (target) {
      const species = getSpecies(target.speciesId);
      const chance = formatCaptureChance({ targetHp: target.hp, targetMaxHp: target.maxHp });
      return `[Q] Lançar Orbe → ${species.name} · ${chance} · HP ${Math.ceil(target.hp)}/${target.maxHp}`;
    }
    if (this.portalActive) {
      return '[E] Usar portal — retornar à base';
    }
    const nearChest = this.chests.find(
      (c) => !c.opened && distance(this.playerX, this.playerY, c.x, c.y) < 30,
    );
    if (nearChest) {
      return '[E] Abrir baú';
    }
    return 'WASD mover · Clique atacar · Q lançar Orbe';
  }
}
