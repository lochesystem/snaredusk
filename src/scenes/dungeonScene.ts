import { Container, Graphics } from 'pixi.js';
import { FxRunner } from '../engine/fxRunner.ts';
import {
  createEnemyStatusBars,
  updateEnemyStatusBars,
  type EnemyStatusBars,
} from '../world/enemyStatusBars.ts';
import { snapContainer } from '../world/pixelText.ts';
import {
  PLAYER_MAX_HP,
  PLAYER_MAX_STAMINA,
  PLAYER_SPEED,
  DODGE_STAMINA_COST,
  DODGE_DURATION,
  DODGE_DISTANCE,
  STAMINA_REGEN,
  CAPTURE_RANGE,
  ORB_BUNDLE_PRICE,
  ORB_PRICE,
} from '../engine/constants.ts';
import { Camera } from '../engine/camera.ts';
import type { InputManager } from '../engine/input.ts';
import { DungeonMinimap } from '../ui/dungeonMinimap.ts';
import { YSortLayer } from '../engine/ySortLayer.ts';
import { getSpecies } from '../data/creatures.ts';
import { LOOT_TABLE, getEnemyChestDrop } from '../data/items.ts';
import { generateDungeon, type DungeonInteractable, type DungeonLayout } from '../world/dungeonGenerator.ts';
import { moveWithCollision, PLAYER_RADIUS } from '../world/collision.ts';
import {
  createWeaponAttackFx,
  tickWeaponAttackFx,
  type AttackFxStyle,
  type WeaponAttackFxState,
} from '../world/weaponAttackFx.ts';
import { getEquippedWeapon } from '../data/weapons.ts';
import { getEnemyBehavior } from '../data/enemyBehaviors.ts';
import { calcDamage, distance, normalize } from '../systems/combat.ts';
import {
  applyShieldDamage,
  initEnemyCombatFields,
  tickEnemyCombat,
  type EnemyCombatPhase,
} from '../systems/enemyCombat.ts';
import {
  advanceProjectile,
  markProjectileHit,
  projectileHitEnemy,
  projectileHitPlayer,
  type Projectile,
} from '../systems/projectiles.ts';
import { buildPlayerProjectile, findMeleeHits } from '../systems/weaponAttack.ts';
import {
  canTargetForCapture,
  CAPTURE_ARRIVE_PAUSE,
  CAPTURE_FAIL_FX_DURATION,
  CAPTURE_ORB_FLY_SPEED,
  CAPTURE_SHAKE_DURATION,
  CAPTURE_SHAKE_PAUSE,
  CAPTURE_SUCCESS_FX_DURATION,
  formatCaptureChance,
  formatCapturePercent,
  planCaptureSequence,
  type CaptureSequencePlan,
} from '../systems/capture.ts';
import { shouldEnemyAggro } from '../systems/enemyAi.ts';
import { buyOrbPack } from '../systems/orbShop.ts';
import { addToBag, bagCount } from '../systems/saveManager.ts';
import type { CreatureItem, GameState, LootItem } from '../types.ts';
import {
  createChestSprite,
  createCreatureSprite,
  createInteractableSprite,
  createPlayerSprite,
  createPortalSprite,
  createSpeechBubble,
  createCaptureOrbBall,
  createCaptureAttemptHud,
  updateCaptureAttemptHud,
  createCaptureSuccessBanner,
  drawCaptureBurst,
  drawDamageNumber,
  drawDungeonLayout,
  createProjectileSprite,
  createShieldGraphic,
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
  roomIndex: number;
  isBoss: boolean;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  atk: number;
  speed: number;
  def: number;
  behaviorId: string;
  attackCd: number;
  enraged: boolean;
  aggroed: boolean;
  fled: boolean;
  dead: boolean;
  lootDropped: boolean;
  container: Container;
  shieldGfx: Graphics | null;
  statusBars: EnemyStatusBars | null;
  capturableGlow: boolean;
  captureLocked: boolean;
  shieldHp: number;
  shieldMax: number;
  shieldRegenCd: number;
  combatPhase: EnemyCombatPhase;
  phaseTimer: number;
  burstShotsLeft: number;
}

type CaptureOrbPhase = 'flying' | 'arrived' | 'shaking' | 'success_fx' | 'fail_fx';
type ShakeSubPhase = 'anim' | 'pause';

interface ActiveCaptureOrb {
  container: Container;
  hud: Container;
  successBanner: Container | null;
  target: LiveEnemy;
  plan: CaptureSequencePlan;
  phase: CaptureOrbPhase;
  currentShake: number;
  shakeSubPhase: ShakeSubPhase;
  phaseTimer: number;
  wobbleTime: number;
}

interface LiveChest {
  x: number;
  y: number;
  lootId: string;
  lootQuantity: number;
  goldBonus: number;
  epic: boolean;
  opened: boolean;
  container: Container;
}

interface LiveInteractable {
  data: DungeonInteractable;
  container: Container;
  bubble: Container | null;
  used: boolean;
}

interface PendingChoices {
  kind: 'event' | 'merchant';
  interactable: LiveInteractable;
  labelA: string;
  labelB: string;
  applyA: () => void;
  applyB: () => void;
}

export class DungeonScene {
  readonly root = new Container();
  private world = new Container();
  private entityLayer = new YSortLayer();
  private fxLayer = new Container();
  private camera = new Camera();
  private playerSprite = createPlayerSprite();
  private portalSprite = createPortalSprite();
  private attackFx: WeaponAttackFxState | null = null;

  private playerX = 0;
  private playerY = 0;
  private playerHp: number;
  private playerStamina: number;
  private invincibleTimer = 0;
  private dodgeTimer = 0;
  private attackCd = 0;
  private projectiles: Projectile[] = [];
  private enemies: LiveEnemy[] = [];
  private active = false;
  private portalActive = false;
  private activeCapture: ActiveCaptureOrb | null = null;
  private chests: LiveChest[] = [];
  private interactables: LiveInteractable[] = [];
  private pendingChoices: PendingChoices | null = null;
  private layout: DungeonLayout;
  private glowTargetId: string | null = null;
  private minimap: DungeonMinimap;
  private deathHandled = false;
  private fxRunner = new FxRunner();

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
    this.playerStamina = state.playerStamina;
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
    floorGfx.cacheAsTexture(true);

    this.playerX = this.layout.spawn.x;
    this.playerY = this.layout.spawn.y;

    this.portalSprite.x = this.layout.portal.x;
    this.portalSprite.y = this.layout.portal.y;
    this.portalSprite.alpha = 0.35;
    this.entityLayer.addChild(this.portalSprite);

    this.playerSprite.x = this.playerX;
    this.playerSprite.y = this.playerY;
    this.entityLayer.addChild(this.playerSprite);

    this.world.addChild(this.entityLayer);
    this.world.addChild(this.fxLayer);
    this.root.addChild(this.world);
    this.root.addChild(this.minimap.container);

    this.spawnEnemies();
    this.spawnChests();
    this.spawnInteractables();
  }

  enter(): void {
    this.active = true;
    this.callbacks.updateHud();
  }

  exit(): void {
    this.active = false;
    this.state.playerHp = this.playerHp;
    this.state.playerStamina = this.playerStamina;
    this.clearActiveCapture();
    this.clearAttackFx();
    this.fxRunner.clear();
    this.clearProjectiles();
    this.root.destroy({ children: true });
  }

  private spawnEnemies(): void {
    let nextEnemyId = 0;
    for (const spawn of this.layout.enemySpawns) {
      const species = getSpecies(spawn.speciesId);
      const container = createCreatureSprite(species);
      container.x = spawn.x;
      container.y = spawn.y;
      if (spawn.isBoss) {
        container.scale.set(1.35);
      }
      this.entityLayer.addChild(container);
      const combatInit = initEnemyCombatFields(species.behaviorId);
      const enemy: LiveEnemy = {
        id: `enemy-${nextEnemyId++}`,
        speciesId: spawn.speciesId,
        roomIndex: spawn.roomIndex,
        isBoss: spawn.isBoss ?? false,
        hp: species.maxHp,
        maxHp: species.maxHp,
        x: spawn.x,
        y: spawn.y,
        atk: species.atk,
        speed: species.speed,
        def: species.def,
        behaviorId: species.behaviorId,
        attackCd: 0,
        enraged: false,
        aggroed: false,
        fled: false,
        dead: false,
        lootDropped: false,
        container,
        shieldGfx: null,
        statusBars: null,
        capturableGlow: false,
        captureLocked: false,
        ...combatInit,
      };
      this.attachEnemyShield(enemy);
      this.attachEnemyStatusBars(enemy);
      this.enemies.push(enemy);
    }
  }

  private spawnInteractables(): void {
    for (const data of this.layout.interactables) {
      const container = createInteractableSprite(data.kind, false);
      container.x = data.x;
      container.y = data.y;
      this.entityLayer.addChild(container);
      this.interactables.push({ data, container, bubble: null, used: false });
    }
  }

  private refreshInteractableSprite(item: LiveInteractable): void {
    this.clearInteractableBubble(item);
    const parent = item.container.parent;
    parent?.removeChild(item.container);
    item.container.destroy({ children: true });
    item.container = createInteractableSprite(item.data.kind, item.used);
    item.container.x = item.data.x;
    item.container.y = item.data.y;
    parent?.addChild(item.container);
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
        lootQuantity: 1,
        goldBonus: 0,
        epic: false,
        opened: false,
        container,
      });
    }
  }

  update(dt: number): void {
    if (!this.active) return;

    this.tryDodge(dt);
    this.movePlayer(dt);
    this.fxRunner.update(dt);
    this.updateAttackFx(dt);
    this.updateProjectiles(dt);
    this.updateEnemies(dt);
    this.updateCaptureOrbs(dt);
    this.tryLaunchCapture();
    this.resolvePendingChoices();
    this.handleInteract();
    this.checkPlayerDeath();
    this.updateCapturableGlow();
    this.updatePortalState();
    this.updateInteractablePrompts();

    this.entityLayer.resort();
    this.camera.follow(this.playerX, this.playerY, this.layout.width, this.layout.height);
    this.camera.update();
    this.world.x = -this.camera.x;
    this.world.y = -this.camera.y;
    this.minimap.update(this.layout, this.playerX, this.playerY);

    this.state.playerHp = Math.round(this.playerHp);
    this.state.playerStamina = Math.round(this.playerStamina);
    this.callbacks.updateHud();
  }

  private tryDodge(dt: number): void {
    if (this.dodgeTimer > 0) {
      this.dodgeTimer -= dt;
      this.invincibleTimer = Math.max(this.invincibleTimer, this.dodgeTimer);
    }
    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= dt;
      this.playerSprite.alpha = 0.45 + Math.sin(Date.now() * 0.04) * 0.2;
    } else {
      this.playerSprite.alpha = 1;
    }
    if (this.playerStamina < PLAYER_MAX_STAMINA) {
      this.playerStamina = Math.min(PLAYER_MAX_STAMINA, this.playerStamina + STAMINA_REGEN * dt);
    }
    if (!this.input.consumeKey('r')) return;
    if (this.playerStamina < DODGE_STAMINA_COST || this.dodgeTimer > 0) return;
    const move = this.input.getMovement();
    const dir = move.x !== 0 || move.y !== 0 ? move : { x: 1, y: 0 };
    const norm = normalize(dir.x, dir.y);
    const moved = moveWithCollision(
      this.playerX,
      this.playerY,
      norm.x * DODGE_DISTANCE,
      norm.y * DODGE_DISTANCE,
      PLAYER_RADIUS,
      this.layout.walls,
      this.layout.floors,
      this.layout.obstacles,
    );
    this.playerX = moved.x;
    this.playerY = moved.y;
    this.playerSprite.x = moved.x;
    this.playerSprite.y = moved.y;
    this.playerStamina -= DODGE_STAMINA_COST;
    this.dodgeTimer = DODGE_DURATION;
    this.invincibleTimer = DODGE_DURATION;
  }

  private movePlayer(dt: number): void {
    if (this.dodgeTimer > 0) return;
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
    const weapon = getEquippedWeapon(this.state.equippedWeaponId);
    const worldMouse = this.camera.screenToWorld(this.input.mouseX, this.input.mouseY);
    const dir = normalize(worldMouse.x - this.playerX, worldMouse.y - this.playerY);
    const angle = Math.atan2(dir.y, dir.x);

    if (weapon.kind === 'melee') {
      this.playAttackFx(weapon.attackFx ?? 'knife', angle, weapon.range, weapon.slashColor ?? 0xf0e6d3);
      const hits = findMeleeHits(
        this.playerX,
        this.playerY,
        angle,
        weapon,
        this.enemies.map((e) => ({
          id: e.id,
          x: e.x,
          y: e.y,
          def: e.def,
          dead: e.dead,
          fled: e.fled,
          captureLocked: e.captureLocked,
        })),
      );
      for (const hit of hits) {
        const enemy = this.enemies.find((e) => e.id === hit.id);
        if (enemy) this.damageEnemy(enemy, hit.damage);
      }
    } else {
      this.playAttackFx(weapon.attackFx ?? 'spear_thrust', angle, weapon.range, weapon.slashColor ?? 0xc4f082);
      const data = buildPlayerProjectile(this.playerX, this.playerY, angle, weapon);
      this.spawnProjectile(data, 'player', weapon.projectileStyle ?? 'orb');
    }

    this.attackCd = weapon.cooldown;
  }

  private playAttackFx(style: AttackFxStyle, angle: number, range: number, color: number): void {
    this.clearAttackFx();
    const fx = createWeaponAttackFx(style, angle, range, color);
    this.attackFx = fx;
    this.fxLayer.addChild(fx.root);
    tickWeaponAttackFx(fx, 0, this.playerX, this.playerY);
  }

  private updateAttackFx(dt: number): void {
    if (!this.attackFx) return;
    const alive = tickWeaponAttackFx(this.attackFx, dt, this.playerX, this.playerY);
    if (!alive) this.clearAttackFx();
  }

  private clearAttackFx(): void {
    if (!this.attackFx) return;
    this.attackFx.root.parent?.removeChild(this.attackFx.root);
    this.attackFx.root.destroy({ children: true });
    this.attackFx = null;
  }

  private spawnProjectile(
    data: Omit<Projectile, 'container' | 'hitIds'>,
    owner: 'player' | 'enemy',
    style: 'orb' | 'spear' | 'spore' = 'orb',
  ): void {
    const color = owner === 'player' ? 0xc4f082 : 0x8fd894;
    const container = createProjectileSprite(style, color);
    container.x = data.x;
    container.y = data.y;
    if (style === 'spear') {
      container.rotation = Math.atan2(data.vy, data.vx) + Math.PI / 2;
    }
    this.fxLayer.addChild(container);
    this.projectiles.push({
      ...data,
      owner,
      container,
      hitIds: new Set(),
      visualStyle: style,
    });
  }

  private clearProjectiles(): void {
    for (const p of this.projectiles) {
      p.container.parent?.removeChild(p.container);
      p.container.destroy({ children: true });
    }
    this.projectiles = [];
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]!;
      const alive = advanceProjectile(
        p,
        dt,
        this.layout.walls,
        this.layout.floors,
        this.layout.obstacles,
      );
      if (!alive) {
        this.fxLayer.removeChild(p.container);
        p.container.destroy({ children: true });
        this.projectiles.splice(i, 1);
        continue;
      }

      if (p.owner === 'player') {
        for (const enemy of this.enemies) {
          if (enemy.dead || enemy.fled) continue;
          if (!projectileHitEnemy(p, enemy.id, enemy.x, enemy.y)) continue;
          this.damageEnemy(enemy, p.damage);
          if (!markProjectileHit(p, enemy.id)) {
            this.fxLayer.removeChild(p.container);
            p.container.destroy({ children: true });
            this.projectiles.splice(i, 1);
          }
          break;
        }
      } else if (this.invincibleTimer <= 0) {
        if (projectileHitPlayer(p, this.playerX, this.playerY, PLAYER_RADIUS)) {
          const dmg = calcDamage(p.damage, this.state.playerDef);
          this.playerHp = Math.max(0, this.playerHp - dmg);
          drawDamageNumber(this.fxLayer, dmg, this.playerX, this.playerY - 24, this.fxRunner);
          this.fxLayer.removeChild(p.container);
          p.container.destroy({ children: true });
          this.projectiles.splice(i, 1);
        }
      }
    }
  }

  private damageEnemy(enemy: LiveEnemy, rawDmg: number): void {
    if (enemy.dead || enemy.fled) return;
    enemy.aggroed = true;
    const behavior = getEnemyBehavior(enemy.behaviorId);
    const afterShield = applyShieldDamage(enemy, rawDmg, behavior);
    this.updateEnemyShieldGfx(enemy);
    this.updateEnemyStatusBars(enemy);
    if (afterShield <= 0) return;
    const finalDmg = calcDamage(afterShield, enemy.def);
    enemy.hp = Math.max(0, enemy.hp - finalDmg);
    drawDamageNumber(this.fxLayer, finalDmg, enemy.x, enemy.y - 20, this.fxRunner);
    if (enemy.hp <= 0) {
      this.eliminateEnemy(enemy);
    }
  }

  private eliminateEnemy(enemy: LiveEnemy, options?: { skipToast?: boolean }): void {
    if (enemy.dead) return;
    enemy.dead = true;
    enemy.aggroed = false;
    enemy.captureLocked = false;
    enemy.container.visible = false;
    enemy.container.alpha = 1;
    if (enemy.shieldGfx) enemy.shieldGfx.visible = false;
    if (enemy.statusBars) enemy.statusBars.root.visible = false;
    if (!enemy.lootDropped) {
      enemy.lootDropped = true;
      this.spawnEnemyChest(enemy);
      if (!options?.skipToast) {
        const species = getSpecies(enemy.speciesId);
        if (enemy.isBoss) {
          this.callbacks.showToast(`${species.name} derrotado — baú épico apareceu!`);
        } else {
          this.callbacks.showToast(`${species.name} derrotado — baú deixado`);
        }
      }
    }
  }

  private attachEnemyStatusBars(enemy: LiveEnemy): void {
    enemy.statusBars?.root.parent?.removeChild(enemy.statusBars.root);
    const bars = createEnemyStatusBars(enemy.shieldMax > 0, enemy.isBoss);
    enemy.statusBars = bars;
    enemy.container.addChild(bars.root);
    this.updateEnemyStatusBars(enemy);
  }

  private updateEnemyStatusBars(enemy: LiveEnemy): void {
    if (!enemy.statusBars || enemy.dead) return;
    updateEnemyStatusBars(
      enemy.statusBars,
      enemy.hp,
      enemy.maxHp,
      enemy.shieldHp,
      enemy.shieldMax,
    );
  }

  private attachEnemyShield(enemy: LiveEnemy): void {
    if (enemy.shieldMax <= 0) {
      enemy.shieldGfx = null;
      return;
    }
    if (enemy.shieldGfx?.parent === enemy.container) return;
    enemy.shieldGfx?.parent?.removeChild(enemy.shieldGfx);
    const shieldGfx = createShieldGraphic(enemy.shieldMax);
    shieldGfx.y = -2;
    enemy.container.addChildAt(shieldGfx, 0);
    enemy.shieldGfx = shieldGfx;
    this.updateEnemyShieldGfx(enemy);
  }

  private updateEnemyShieldGfx(enemy: LiveEnemy): void {
    if (!enemy.shieldGfx) return;
    enemy.shieldGfx.visible = enemy.shieldHp > 0 && !enemy.dead;
    enemy.shieldGfx.alpha = 0.35 + (enemy.shieldHp / Math.max(1, enemy.shieldMax)) * 0.55;
  }

  private spawnEnemyChest(enemy: LiveEnemy): void {
    const drop = getEnemyChestDrop(enemy.speciesId, enemy.isBoss);
    const container = createChestSprite(false, drop.epic);
    container.x = enemy.x;
    container.y = enemy.y;
    this.entityLayer.addChild(container);
    this.chests.push({
      x: enemy.x,
      y: enemy.y,
      lootId: drop.lootId,
      lootQuantity: drop.quantity,
      goldBonus: drop.goldBonus,
      epic: drop.epic,
      opened: false,
      container,
    });
  }

  private updateEnemies(dt: number): void {
    for (const enemy of this.enemies) {
      if (enemy.dead || enemy.fled || enemy.captureLocked) continue;

      const dist = distance(this.playerX, this.playerY, enemy.x, enemy.y);
      enemy.aggroed = shouldEnemyAggro({
        aggroed: enemy.aggroed,
        enraged: enemy.enraged,
        isBoss: enemy.isBoss,
        distToPlayer: dist,
        playerInSpawnRoom: this.isPlayerInRoom(enemy.roomIndex),
      });

      const result = tickEnemyCombat(enemy, {
        playerX: this.playerX,
        playerY: this.playerY,
        dt,
      });

      if (enemy.aggroed || enemy.combatPhase !== 'idle') {
        const moved = moveWithCollision(
          enemy.x,
          enemy.y,
          result.moveX - enemy.x,
          result.moveY - enemy.y,
          9,
          this.layout.walls,
          this.layout.floors,
          this.layout.obstacles,
        );
        enemy.x = moved.x;
        enemy.y = moved.y;
      }

      for (const shot of result.projectiles) {
        this.spawnProjectile(shot.data, 'enemy');
      }

      if (result.playerDamage > 0 && this.invincibleTimer <= 0) {
        const dmg = calcDamage(result.playerDamage, this.state.playerDef);
        this.playerHp = Math.max(0, this.playerHp - dmg);
        drawDamageNumber(this.fxLayer, dmg, this.playerX, this.playerY - 24, this.fxRunner);
      }

      enemy.container.x = enemy.x;
      enemy.container.y = enemy.y;
      snapContainer(enemy.container);
      this.updateEnemyShieldGfx(enemy);
      this.updateEnemyStatusBars(enemy);
    }

    if (this.attackCd > 0) this.attackCd -= dt;
  }

  private isPlayerInRoom(roomIndex: number): boolean {
    const room = this.layout.rooms.find((r) => r.index === roomIndex);
    if (!room) return false;
    const { x, y, width, height } = room.rect;
    const margin = 6;
    return (
      this.playerX >= x + margin &&
      this.playerX <= x + width - margin &&
      this.playerY >= y + margin &&
      this.playerY <= y + height - margin
    );
  }

  private getNearestCaptureTarget(): LiveEnemy | null {
    let best: LiveEnemy | null = null;
    let bestDist = Infinity;
    for (const enemy of this.enemies) {
      if (enemy.dead || enemy.fled || enemy.captureLocked) continue;
      const species = getSpecies(enemy.speciesId);
      if (!species.capturable) continue;
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
      if (enemy.dead || enemy.fled || enemy.captureLocked) continue;
      const shouldGlow = enemy.id === targetId;
      if (enemy.capturableGlow === shouldGlow) continue;
      enemy.capturableGlow = shouldGlow;
      const species = getSpecies(enemy.speciesId);
      const parent = enemy.container.parent;
      if (!parent) continue;
      parent.removeChild(enemy.container);
      enemy.container.destroy({ children: true });
      enemy.container = createCreatureSprite(species, shouldGlow);
      if (enemy.isBoss) enemy.container.scale.set(1.35);
      enemy.container.x = enemy.x;
      enemy.container.y = enemy.y;
      this.attachEnemyShield(enemy);
      this.attachEnemyStatusBars(enemy);
      parent.addChild(enemy.container);
    }
  }

  private tryLaunchCapture(): void {
    if (!this.input.consumeKey('q')) return;
    if (this.activeCapture) return;

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
    const rollInput = { targetHp: target.hp, targetMaxHp: target.maxHp };
    const plan = planCaptureSequence(rollInput);
    const container = createCaptureOrbBall();
    container.x = this.playerX;
    container.y = this.playerY - 8;
    const hud = createCaptureAttemptHud();
    hud.visible = false;
    this.fxLayer.addChild(container);
    this.fxLayer.addChild(hud);
    target.captureLocked = true;
    target.container.alpha = 0.45;

    this.activeCapture = {
      container,
      hud,
      successBanner: null,
      target,
      plan,
      phase: 'flying',
      currentShake: 0,
      shakeSubPhase: 'anim',
      phaseTimer: 0,
      wobbleTime: 0,
    };
  }

  private getCaptureAnchor(enemy: LiveEnemy): { x: number; y: number } {
    return { x: enemy.x, y: enemy.y - 6 };
  }

  private syncCaptureHud(cap: ActiveCaptureOrb): void {
    const anchor = this.getCaptureAnchor(cap.target);
    cap.hud.x = anchor.x;
    cap.hud.y = anchor.y - 42;
    cap.container.x = anchor.x;
    cap.container.y = anchor.y;
    if (cap.successBanner) {
      cap.successBanner.x = anchor.x;
      cap.successBanner.y = anchor.y - 58;
    }
  }

  private applyOrbWobble(cap: ActiveCaptureOrb, intensity: number): void {
    cap.wobbleTime += intensity;
    const wobble = Math.sin(cap.wobbleTime * 16) * 0.14;
    cap.container.scale.set(1 + wobble, 1 - wobble * 0.6);
    cap.container.rotation = Math.sin(cap.wobbleTime * 11) * 0.28;
  }

  private updateCaptureOrbs(dt: number): void {
    const cap = this.activeCapture;
    if (!cap) return;

    const { target, plan } = cap;
    if (target.dead || target.fled) {
      this.callbacks.showToast('Alvo perdido — Orbe desperdiçado');
      this.clearActiveCapture();
      return;
    }

    const pct = formatCapturePercent(plan.chance);
    const anchor = this.getCaptureAnchor(target);

    if (cap.phase === 'flying') {
      cap.hud.visible = false;
      const dir = normalize(anchor.x - cap.container.x, anchor.y - cap.container.y);
      cap.container.x += dir.x * CAPTURE_ORB_FLY_SPEED * dt;
      cap.container.y += dir.y * CAPTURE_ORB_FLY_SPEED * dt;
      cap.container.rotation += dt * 6;
      cap.wobbleTime += dt;

      if (distance(cap.container.x, cap.container.y, anchor.x, anchor.y) < 10) {
        cap.phase = 'arrived';
        cap.phaseTimer = CAPTURE_ARRIVE_PAUSE;
        cap.container.rotation = 0;
        cap.container.scale.set(1);
        this.syncCaptureHud(cap);
      }
      return;
    }

    this.syncCaptureHud(cap);
    cap.hud.visible = true;

    if (cap.phase === 'arrived') {
      updateCaptureAttemptHud(cap.hud, 0, plan.totalShakes, pct, 'waiting');
      cap.phaseTimer -= dt;
      if (cap.phaseTimer <= 0) {
        cap.phase = 'shaking';
        cap.currentShake = 1;
        cap.shakeSubPhase = 'anim';
        cap.phaseTimer = CAPTURE_SHAKE_DURATION;
        cap.wobbleTime = 0;
      }
      return;
    }

    if (cap.phase === 'shaking') {
      const shake = cap.currentShake;
      const isFailShake = !plan.success && plan.failAtShake === shake;
      const status = cap.shakeSubPhase === 'anim' ? 'shake' : isFailShake ? 'fail' : 'pass';
      updateCaptureAttemptHud(cap.hud, shake, plan.totalShakes, pct, status);
      this.applyOrbWobble(cap, dt);

      cap.phaseTimer -= dt;
      if (cap.phaseTimer > 0) return;

      if (cap.shakeSubPhase === 'anim') {
        cap.shakeSubPhase = 'pause';
        cap.phaseTimer = CAPTURE_SHAKE_PAUSE;
        cap.container.rotation = 0;
        cap.container.scale.set(1);
        return;
      }

      cap.shakeSubPhase = 'anim';
      if (isFailShake) {
        cap.phase = 'fail_fx';
        cap.phaseTimer = CAPTURE_FAIL_FX_DURATION;
        cap.hud.visible = false;
        drawCaptureBurst(this.fxLayer, anchor.x, anchor.y, false, this.fxRunner);
        return;
      }

      if (shake >= plan.totalShakes) {
        cap.phase = 'success_fx';
        cap.phaseTimer = CAPTURE_SUCCESS_FX_DURATION;
        cap.hud.visible = false;
        const species = getSpecies(target.speciesId);
        cap.successBanner = createCaptureSuccessBanner(species.name);
        this.fxLayer.addChild(cap.successBanner);
        this.syncCaptureHud(cap);
        return;
      }

      cap.currentShake += 1;
      cap.phaseTimer = CAPTURE_SHAKE_DURATION;
      cap.wobbleTime = 0;
      return;
    }

    if (cap.phase === 'success_fx') {
      this.applyOrbWobble(cap, dt * 0.35);
      const t = 1 - cap.phaseTimer / CAPTURE_SUCCESS_FX_DURATION;
      cap.container.scale.set(1 + Math.sin(t * Math.PI * 6) * 0.08);
      if (cap.successBanner) {
        cap.successBanner.alpha = Math.min(1, t * 3);
        cap.successBanner.scale.set(0.85 + Math.sin(t * Math.PI) * 0.12);
      }
      cap.container.alpha = 1 - t * 0.35;
      cap.phaseTimer -= dt;
      if (cap.phaseTimer > 0) return;
      this.finishCaptureSuccess(target, plan);
      this.clearActiveCapture();
      return;
    }

    if (cap.phase === 'fail_fx') {
      target.container.alpha = 1;
      cap.container.alpha -= dt * 2.2;
      cap.phaseTimer -= dt;
      if (cap.phaseTimer > 0) return;
      this.finishCaptureFail(target, plan);
      this.clearActiveCapture();
    }
  }

  private finishCaptureSuccess(enemy: LiveEnemy, plan: CaptureSequencePlan): void {
    const species = getSpecies(enemy.speciesId);
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
      this.eliminateEnemy(enemy, { skipToast: true });
      const anchor = this.getCaptureAnchor(enemy);
      drawCaptureBurst(this.fxLayer, anchor.x, anchor.y, true, this.fxRunner);
      this.callbacks.showToast(`Capturou ${species.name}! (${formatCapturePercent(plan.chance)})`);
      this.callbacks.onStateChange();
    } else {
      this.callbacks.showToast('Bolsa cheia — captura falhou!');
      enemy.captureLocked = false;
      enemy.container.alpha = 1;
    }
  }

  private finishCaptureFail(enemy: LiveEnemy, plan: CaptureSequencePlan): void {
    const species = getSpecies(enemy.speciesId);
    enemy.captureLocked = false;
    enemy.container.alpha = 1;
    enemy.aggroed = true;
    this.callbacks.showToast(`${species.name} escapou da Orbe! (${formatCapturePercent(plan.chance)})`);
  }

  private clearActiveCapture(): void {
    if (!this.activeCapture) return;
    const cap = this.activeCapture;
    cap.container.parent?.removeChild(cap.container);
    cap.container.destroy({ children: true });
    cap.hud.parent?.removeChild(cap.hud);
    cap.hud.destroy({ children: true });
    if (cap.successBanner) {
      cap.successBanner.parent?.removeChild(cap.successBanner);
      cap.successBanner.destroy({ children: true });
    }
    if (!cap.target.dead && !cap.target.fled) {
      cap.target.captureLocked = false;
      cap.target.container.alpha = 1;
    }
    this.activeCapture = null;
  }

  private clearInteractableBubble(item: LiveInteractable): void {
    if (!item.bubble) return;
    item.bubble.parent?.removeChild(item.bubble);
    item.bubble.destroy({ children: true });
    item.bubble = null;
  }

  private showInteractableBubble(item: LiveInteractable, lines: string[], accent: number): void {
    this.clearInteractableBubble(item);
    const bubble = createSpeechBubble(lines, accent);
    bubble.x = item.data.x;
    bubble.y = item.data.y - 36;
    snapContainer(bubble);
    this.entityLayer.addChild(bubble);
    item.bubble = bubble;
  }

  private updateInteractablePrompts(): void {
    for (const item of this.interactables) {
      this.clearInteractableBubble(item);
    }

    if (this.pendingChoices) {
      const item = this.pendingChoices.interactable;
      const accent = item.data.kind === 'event' ? 0x8a6ab8 : 0xe8a84a;
      const header = item.data.kind === 'event' ? '— Escolha —' : '— Mercador —';
      this.showInteractableBubble(
        item,
        [header, `[1] ${this.pendingChoices.labelA}`, `[2] ${this.pendingChoices.labelB}`],
        accent,
      );
      return;
    }

    const near = this.getNearestInteractable(52);
    if (!near) return;

    if (near.used) {
      this.showInteractableBubble(near, ['Já usado nesta run'], 0x6a6a78);
      return;
    }

    if (near.data.kind === 'rest') {
      this.showInteractableBubble(near, ['[E] Descansar aqui', 'Recupera 25% HP'], 0x5dbb63);
    } else if (near.data.kind === 'event') {
      this.showInteractableBubble(near, ['[E] Investigar altar', 'Um evento aguarda...'], 0x8a6ab8);
    } else {
      this.showInteractableBubble(near, ['[E] Falar com mercador', 'Compra Orbes de Vínculo'], 0xe8a84a);
    }
  }

  private getNearestInteractable(maxDist = 30): LiveInteractable | null {
    let best: LiveInteractable | null = null;
    let bestDist = Infinity;
    for (const item of this.interactables) {
      const d = distance(this.playerX, this.playerY, item.data.x, item.data.y);
      if (d < maxDist && d < bestDist) {
        best = item;
        bestDist = d;
      }
    }
    return best;
  }

  private resolvePendingChoices(): void {
    if (!this.pendingChoices) return;

    if (this.input.consumeKey('1')) {
      this.pendingChoices.applyA();
      if (this.pendingChoices.kind === 'event') {
        this.pendingChoices.interactable.used = true;
        this.refreshInteractableSprite(this.pendingChoices.interactable);
      }
      this.pendingChoices = null;
      this.callbacks.onStateChange();
      return;
    }

    if (this.input.consumeKey('2')) {
      this.pendingChoices.applyB();
      if (this.pendingChoices.kind === 'event') {
        this.pendingChoices.interactable.used = true;
        this.refreshInteractableSprite(this.pendingChoices.interactable);
      }
      this.pendingChoices = null;
      this.callbacks.onStateChange();
    }
  }

  private openRest(item: LiveInteractable): void {
    if (item.used) {
      this.callbacks.showToast('Fogueira já usada nesta run');
      return;
    }
    const heal = Math.ceil(PLAYER_MAX_HP * 0.25);
    this.playerHp = Math.min(PLAYER_MAX_HP, this.playerHp + heal);
    item.used = true;
    this.refreshInteractableSprite(item);
    this.callbacks.showToast(`Descanso — recuperou ${heal} HP`);
    this.callbacks.onStateChange();
  }

  private openEvent(item: LiveInteractable): void {
    if (item.used) {
      this.callbacks.showToast('Altar já ativado nesta run');
      return;
    }

    const pool = [
      {
        label: 'Beber orvalho (+15 HP)',
        apply: () => {
          this.playerHp = Math.min(PLAYER_MAX_HP, this.playerHp + 15);
          this.callbacks.showToast('Orvalho restaurador: +15 HP');
        },
      },
      {
        label: 'Colher esporos (+12 ouro)',
        apply: () => {
          this.state.gold += 12;
          this.callbacks.showToast('Esporos trocados por 12 ouro');
        },
      },
      {
        label: 'Morder cogumelo (-10 HP)',
        apply: () => {
          this.playerHp = Math.max(1, this.playerHp - 10);
          this.callbacks.showToast('Cogumelo amargo — perdeu 10 HP');
        },
      },
      {
        label: 'Saco surpresa (loot)',
        apply: () => {
          const lootDef = LOOT_TABLE.esporo_brilhante;
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
            this.callbacks.showToast(`Encontrou ${lootDef.name}!`);
          }
        },
      },
      {
        label: 'Relíquia antiga (+20 ouro, -8 HP)',
        apply: () => {
          this.playerHp = Math.max(1, this.playerHp - 8);
          this.state.gold += 20;
          this.callbacks.showToast('Relíquia vendida — +20 ouro, -8 HP');
        },
      },
    ];

    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const a = shuffled[0]!;
    const b = shuffled[1]!;

    this.pendingChoices = {
      kind: 'event',
      interactable: item,
      labelA: a.label,
      labelB: b.label,
      applyA: a.apply,
      applyB: b.apply,
    };
  }

  private openMerchant(item: LiveInteractable): void {
    this.pendingChoices = {
      kind: 'merchant',
      interactable: item,
      labelA: `Orbe ×1 (${ORB_PRICE} ouro)`,
      labelB: `Orbes ×3 (${ORB_BUNDLE_PRICE} ouro)`,
      applyA: () => {
        if (buyOrbPack(this.state, 'single')) {
          this.callbacks.showToast('Comprou 1 Orbe');
        } else {
          this.callbacks.showToast('Ouro insuficiente');
        }
      },
      applyB: () => {
        if (buyOrbPack(this.state, 'bundle')) {
          this.callbacks.showToast('Comprou 3 Orbes');
        } else {
          this.callbacks.showToast('Ouro insuficiente');
        }
      },
    };
  }

  private handleInteract(): void {
    if (this.pendingChoices) return;
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
        quantity: chest.lootQuantity,
      };
      if (!addToBag(this.state, loot)) {
        this.callbacks.showToast('Bolsa cheia!');
        return;
      }

      if (chest.goldBonus > 0) {
        this.state.gold += chest.goldBonus;
      }

      chest.opened = true;
      const parent = chest.container.parent;
      parent?.removeChild(chest.container);
      chest.container.destroy({ children: true });
      chest.container = createChestSprite(true, chest.epic);
      chest.container.x = chest.x;
      chest.container.y = chest.y;
      parent?.addChild(chest.container);

      const qtyLabel = chest.lootQuantity > 1 ? ` ×${chest.lootQuantity}` : '';
      const goldLabel = chest.goldBonus > 0 ? ` +${chest.goldBonus} ouro` : '';
      if (chest.epic) {
        this.callbacks.showToast(`Baú épico: ${lootDef.name}${qtyLabel}${goldLabel}!`);
      } else {
        this.callbacks.showToast(`Baú: ${lootDef.name}${qtyLabel}!`);
      }
      this.callbacks.onStateChange();
      return;
    }

    const near = this.getNearestInteractable();
    if (near) {
      if (near.data.kind === 'rest') {
        this.openRest(near);
        return;
      }
      if (near.data.kind === 'event') {
        this.openEvent(near);
        return;
      }
      if (near.data.kind === 'merchant') {
        this.openMerchant(near);
        return;
      }
    }
  }

  private updatePortalState(): void {
    const aliveEnemies = this.enemies.filter((e) => !e.dead && !e.fled).length;
    this.portalActive = aliveEnemies === 0;
    this.portalSprite.alpha = this.portalActive ? 1 : 0.35;
  }

  private checkPlayerDeath(): void {
    if (this.deathHandled || this.playerHp > 0) return;
    this.deathHandled = true;
    this.state.bag = this.state.bag.map(() => null);
    this.playerHp = PLAYER_MAX_HP;
    this.state.playerHp = PLAYER_MAX_HP;
    this.callbacks.showToast('Você desmaiou — perdeu a bolsa!');
    this.active = false;
    this.callbacks.onReturnToBase(true);
  }

  getHudHint(): string {
    if (this.pendingChoices) {
      return `[1] ${this.pendingChoices.labelA} · [2] ${this.pendingChoices.labelB}`;
    }
    if (this.activeCapture) {
      const cap = this.activeCapture;
      const pct = formatCapturePercent(cap.plan.chance);
      if (cap.phase === 'flying') return 'Orbe de Vínculo em voo...';
      if (cap.phase === 'arrived') return `Preparando captura — ${pct}`;
      if (cap.phase === 'shaking') {
        return `Tentativa ${cap.currentShake}/${cap.plan.totalShakes} — ${pct}`;
      }
      if (cap.phase === 'success_fx') return '✦ Capturado! ✦';
      return 'Captura falhou...';
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
      return nearChest.epic ? '[E] Abrir baú épico' : '[E] Abrir baú';
    }
    const near = this.getNearestInteractable();
    if (near && !near.used) {
      if (near.data.kind === 'rest') return '[E] Descansar na fogueira (+25% HP)';
      if (near.data.kind === 'event') return '[E] Investigar altar misterioso';
      if (near.data.kind === 'merchant') return '[E] Falar com mercador ambulante';
    }
    const bossAlive = this.enemies.some((e) => !e.dead && !e.fled && e.speciesId === 'rei_esporas');
    if (bossAlive) {
      return 'Derrote o Rei das Esporas para ativar o portal';
    }
    return 'WASD mover · Clique atacar · R esquivar · Q lançar Orbe';
  }
}
