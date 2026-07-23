import { Container, Graphics, Sprite, Text, type Texture } from 'pixi.js';
import { getSpecies } from '../data/creatures.ts';
import { getEnemyHitbox } from '../data/enemyHitboxes.ts';
import { PLAYER_SPEED } from '../engine/constants.ts';
import { Camera } from '../engine/camera.ts';
import type { InputManager } from '../engine/input.ts';
import { YSortLayer } from '../engine/ySortLayer.ts';
import { normalize } from '../systems/combat.ts';
import {
  applyShopSale,
  planEmoji,
  planShopDay,
  type ShopCustomerPlan,
} from '../systems/shopDay.ts';
import type { BagEntry, GameState, ShopListing } from '../types.ts';
import { moveWithCollision, PLAYER_RADIUS } from '../world/collision.ts';
import { getShopShelfCapacity } from '../systems/reputation.ts';
import {
  buildShopLayout,
  findSlotAt,
  type ShopLayout,
  type ShopSlotLayout,
} from '../world/shopLayout.ts';
import {
  createCustomerSprite,
  createCreatureSprite,
  createEmojiBubble,
  createLootIcon,
  createPlayerSprite,
  createShelfStandSprite,
  createShelfStandFrontSprite,
  createShopItemSprite,
  drawShopFixtures,
  drawShopFloorBase,
  type CustomerSprite,
} from '../world/placeholderArt.ts';
import { getShopTileTexture } from '../world/shopAssets.ts';

const CUSTOMER_SPEED = 72;
const LOOK_MIN = 1.1;
const LOOK_MAX = 2.2;
const SPAWN_GAP = 2.4;
const CUSTOMER_SEPARATION = 22;
/** Ultrapassa a profundidade dos expositores para permitir interação pelo corredor frontal. */
const SHOP_INTERACT_RADIUS = 60;

/** Todos os sprites usam a origem como ponto dos pés; este é o piso interno do cercado. */
const CAGE_CREATURE_GROUND_OFFSET = 10;

/** Sprites florestais altos precisam ficar acima da travessa frontal, sem perder contato com o piso. */
const CAGE_CREATURE_Y_OFFSET: Partial<Record<string, number>> = {
  lumimorcego: -2,
  carapaca_musgo: -4,
};

const CUSTOMER_COLORS: Record<string, number> = {
  morador: 0x6a8ab8,
  minerador: 0x8a6a4a,
  colecionador: 0x7a5ab8,
  crianca: 0xe8a84a,
  rico: 0xc4a040,
  viajante: 0x5a8a6a,
};

type CustomerPhase = 'walk_slot' | 'look' | 'leave' | 'done';

interface LiveCustomer {
  plan: ShopCustomerPlan;
  phase: CustomerPhase;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  lookTimer: number;
  bubble: Container | null;
  container: CustomerSprite;
}

interface SlotVisual {
  layout: ShopSlotLayout;
  stand: Container;
  itemLayer: Container;
  highlight: Graphics;
}

export interface ShopSceneCallbacks {
  getState: () => GameState;
  onStateChange: () => void;
  showToast: (msg: string) => void;
  setHint: (text: string) => void;
  openPriceModal: (kind: 'shelf' | 'cage', index: number) => void;
  onShopDayEnd: (goldEarned: number) => void;
  onCreatureStocked?: () => void;
}

export class ShopScene {
  readonly root = new Container();
  private world = new Container();
  private entityLayer = new YSortLayer();
  private uiLayer = new Container();
  private layout!: ShopLayout;
  private slotVisuals: SlotVisual[] = [];
  private player = createPlayerSprite();
  private playerX = 0;
  private playerY = 0;
  private carriedGfx: Container | null = null;
  private selectedBagIndex = -1;
  private camera = new Camera();
  private customers: LiveCustomer[] = [];
  private customerQueue: ShopCustomerPlan[] = [];
  private spawnTimer = 0;
  private shopDayActive = false;
  private shopDayGold = 0;
  private active = false;
  private input: InputManager;
  private cb: ShopSceneCallbacks;
  private collisionRects: { x: number; y: number; width: number; height: number }[] = [];

  constructor(input: InputManager, callbacks: ShopSceneCallbacks) {
    this.input = input;
    this.cb = callbacks;
    this.rebuildLayout();
  }

  enter(): void {
    this.active = true;
    const state = this.cb.getState();
    this.playerX = this.layout.entrance.x;
    this.playerY = this.layout.entrance.y - 40;
    this.syncFromState(state);
    this.updateHint();
  }

  exit(): void {
    this.active = false;
    this.clearCustomers();
    this.root.destroy({ children: true });
  }

  rebuildLayout(): void {
    const state = this.cb.getState();
    this.root.removeChildren();
    this.world = new Container();
    this.entityLayer = new YSortLayer();
    this.uiLayer = new Container();
    this.slotVisuals = [];

    this.layout = buildShopLayout(state.shopLevel, getShopShelfCapacity(state));
    this.collisionRects = [...this.layout.walls, ...this.layout.obstacles];

    const floorBase = new Graphics();
    drawShopFloorBase(
      floorBase,
      this.layout.floors,
      this.layout.width,
      this.layout.height,
    );
    this.world.addChild(floorBase);
    this.addShopTiles();

    const fixtures = new Graphics();
    drawShopFixtures(
      fixtures,
      this.layout.floors,
      this.layout.walls,
      this.layout.counter,
      this.layout.decorSeed,
    );
    this.world.addChild(fixtures);
    this.addShopDecorTiles();

    for (const slot of this.layout.slots) {
      const stand = createShelfStandSprite(slot.kind === 'cage');
      stand.x = slot.x;
      stand.y = slot.y + slot.h / 2;

      const highlight = new Graphics();
      highlight.roundRect(-slot.w / 2 - 3, -slot.h - 3, slot.w + 6, slot.h + 6, 5);
      highlight.stroke({ width: 2, color: 0xc4f082, alpha: 0 });
      stand.addChild(highlight);

      const itemLayer = new Container();
      itemLayer.y = slot.kind === 'cage' ? -34 : -32;
      stand.addChild(itemLayer);
      stand.addChild(createShelfStandFrontSprite(slot.kind === 'cage'));

      this.world.addChild(stand);
      this.slotVisuals.push({ layout: slot, stand, itemLayer, highlight });
    }

    this.player = createPlayerSprite();
    this.entityLayer.addChild(this.player);
    this.world.addChild(this.entityLayer);
    this.root.addChild(this.world);
    this.root.addChild(this.uiLayer);

    this.playerX = this.layout.entrance.x;
    this.playerY = this.layout.entrance.y - 36;
    this.syncFromState(state);
  }

  syncFromState(state: GameState): void {
    for (const visual of this.slotVisuals) {
      visual.itemLayer.removeChildren();
      const listing = this.getListing(state, visual.layout);
      if (!listing) continue;

      let item: Container;
      let itemName: Text | null = null;
      let labelY = -18;
      if (listing.entry.kind === 'creature') {
        const species = getSpecies(listing.entry.speciesId);
        const creature = createCreatureSprite(species);
        creature.setLocomotion(false);
        const isBoss = species.behaviorId.startsWith('boss_');
        if (isBoss) creature.scale.set(0.9);
        const creatureYOffset = CAGE_CREATURE_Y_OFFSET[species.id] ?? CAGE_CREATURE_GROUND_OFFSET;
        creature.y = creatureYOffset;
        item = creature;
        const hitbox = getEnemyHitbox(species.id);
        labelY = Math.min(
          isBoss ? -54 : -29,
          hitbox.statusBarY + creatureYOffset - 4,
        );
        itemName = new Text({
          text: species.name,
          style: { fontFamily: 'monospace', fontSize: 7, fill: 0xf0e6d3 },
        });
        itemName.anchor.set(0.5);
        itemName.y = labelY;
      } else {
        item = createLootIcon(listing.entry.id);
        const shortName = listing.entry.name.length > 15
          ? `${listing.entry.name.slice(0, 14)}…`
          : listing.entry.name;
        itemName = new Text({
          text: shortName,
          style: { fontFamily: 'monospace', fontSize: 6, fill: 0xf0e6d3 },
        });
        itemName.anchor.set(0.5);
        itemName.y = -12;
      }
      visual.itemLayer.addChild(item);
      if (itemName) visual.itemLayer.addChild(itemName);

      const priceTag = new Text({
        text: `${listing.price}g`,
        style: { fontFamily: 'monospace', fontSize: 7, fill: 0xe8c868 },
      });
      priceTag.anchor.set(0.5);
      priceTag.y = listing.entry.kind === 'creature' ? 20 : 24;
      visual.itemLayer.addChild(priceTag);
    }
    this.updateCarriedVisual(state);
  }

  private addShopTiles(): void {
    const floor = this.layout.floors[0];
    if (!floor) return;
    const textures = ['floor_planks']
      .map((name) => getShopTileTexture(name))
      .filter((texture): texture is Texture => texture !== null);
    if (!textures.length) return;

    const layer = new Container();
    const mask = new Graphics();
    mask.rect(floor.x, floor.y, floor.width, floor.height);
    mask.fill(0xffffff);
    layer.mask = mask;
    for (let y = floor.y; y < floor.y + floor.height; y += 32) {
      const ty = Math.floor((y - floor.y) / 32);
      for (let x = floor.x; x < floor.x + floor.width; x += 64) {
        const tx = Math.floor((x - floor.x) / 64);
        const texture = textures[(tx * 3 + ty * 5 + this.layout.decorSeed) % textures.length]!;
        const tile = new Sprite(texture);
        tile.x = x;
        tile.y = y;
        tile.roundPixels = true;
        layer.addChild(tile);
      }
    }
    this.world.addChild(layer);
    this.world.addChild(mask);
  }

  private addShopDecorTiles(): void {
    const floor = this.layout.floors[0];
    if (!floor) return;
    const wallTexture = getShopTileTexture('wall');
    if (wallTexture) {
      for (let x = 0; x < this.layout.width; x += 32) {
        const wall = new Sprite(wallTexture);
        wall.x = x;
        wall.y = 0;
        wall.roundPixels = true;
        this.world.addChild(wall);
      }
    }
    const rugTexture = getShopTileTexture('rug');
    if (rugTexture) {
      const rug = new Sprite(rugTexture);
      rug.anchor.set(0.5);
      rug.position.set(this.layout.entrance.x, this.layout.entrance.y - 24);
      rug.scale.set(2, 1.45);
      rug.roundPixels = true;
      this.world.addChild(rug);
    }
    const thresholdTexture = getShopTileTexture('threshold');
    if (thresholdTexture) {
      const threshold = new Sprite(thresholdTexture);
      threshold.anchor.set(0.5);
      threshold.position.set(this.layout.entrance.x, floor.y + floor.height - 15);
      threshold.roundPixels = true;
      this.world.addChild(threshold);
    }
  }

  setSelectedBag(index: number): void {
    this.selectedBagIndex = index;
    this.updateCarriedVisual(this.cb.getState());
    this.updateHint();
  }

  getSelectedBag(): number {
    return this.selectedBagIndex;
  }

  isShopDayActive(): boolean {
    return this.shopDayActive;
  }

  startShopDay(): boolean {
    const state = this.cb.getState();
    if (state.shopDayUsed) {
      this.cb.showToast('Loja já abriu hoje — durma na cama para um novo dia');
      return false;
    }
    const hasStock = state.shopShelves.some(Boolean) || state.shopCages.some(Boolean);
    if (!hasStock) {
      this.cb.showToast('Coloque itens nas prateleiras primeiro!');
      return false;
    }
    if (this.shopDayActive) return false;

    this.customerQueue = planShopDay(state, Math.random);
    if (this.customerQueue.length === 0) {
      this.cb.showToast('Nenhum cliente hoje — estoque ou preços não atraem ninguém.');
      return false;
    }

    this.shopDayActive = true;
    this.shopDayGold = 0;
    this.spawnTimer = 0.6;
    this.cb.setHint('Loja aberta — clientes a caminho…');
    return true;
  }

  update(dt: number): void {
    if (!this.active) return;

    this.updatePlayer(dt);
    this.updateCustomers(dt);
    this.separateCustomers();
    this.entityLayer.resort();
    this.updateCamera();
    this.world.x = -this.camera.x;
    this.world.y = -this.camera.y;
  }

  private updatePlayer(dt: number): void {
    if (this.shopDayActive) return;

    const move = this.input.getMovement();
    const len = Math.hypot(move.x, move.y);
    if (len > 0) {
      const dir = normalize(move.x, move.y);
      const spd = PLAYER_SPEED * 0.85 * dt;
      const next = moveWithCollision(
        this.playerX,
        this.playerY,
        dir.x * spd,
        dir.y * spd,
        PLAYER_RADIUS,
        this.collisionRects,
        this.layout.floors,
      );
      this.playerX = next.x;
      this.playerY = next.y;
    }

    this.player.x = this.playerX;
    this.player.y = this.playerY;
    this.player.setLocomotion(len > 0, move.x);

    if (this.carriedGfx) {
      this.carriedGfx.x = this.playerX;
      this.carriedGfx.y = this.playerY - 22;
    }

    const nearSlot = findSlotAt(
      this.layout,
      this.playerX,
      this.playerY,
      SHOP_INTERACT_RADIUS,
    );
    for (const v of this.slotVisuals) {
      const on = nearSlot === v.layout;
      v.highlight.alpha = on ? 1 : 0;
    }

    if (this.input.consumeKey('e')) {
      this.tryInteract(nearSlot);
    }

    if (this.input.consumeClick()) {
      const world = this.camera.screenToWorld(this.input.mouseX, this.input.mouseY);
      const clicked = findSlotAt(this.layout, world.x, world.y, 28);
      if (clicked) {
        const state = this.cb.getState();
        const listing = this.getListing(state, clicked);
        if (listing) {
          this.cb.openPriceModal(clicked.kind, clicked.index);
        }
      }
    }
  }

  private tryInteract(nearSlot: ShopSlotLayout | null): void {
    if (!nearSlot) return;
    const state = this.cb.getState();
    const listing = this.getListing(state, nearSlot);

    if (this.selectedBagIndex >= 0) {
      const entry = state.bag[this.selectedBagIndex];
      if (!entry) {
        this.selectedBagIndex = -1;
        return;
      }
      if (listing) {
        this.selectedBagIndex = -1;
        this.updateCarriedVisual(state);
        this.cb.showToast('Seleção cancelada — retirando item da prateleira');
      } else {
        if (nearSlot.kind === 'cage' && entry.kind !== 'creature') {
          this.cb.showToast('Criaturas vão nas gaiolas');
          return;
        }
        if (nearSlot.kind === 'shelf' && entry.kind !== 'loot') {
          this.cb.showToast('Loot vai nas prateleiras');
          return;
        }
        this.placeItem(state, nearSlot, this.selectedBagIndex, entry);
        return;
      }
    }

    if (listing) {
      const idx = state.bag.findIndex((s) => s === null);
      if (idx === -1) {
        this.cb.showToast('Bolsa cheia');
        return;
      }
      state.bag[idx] = listing.entry;
      this.clearListing(state, nearSlot);
      this.cb.onStateChange();
      this.syncFromState(state);
      this.cb.showToast('Item retirado para a bolsa');
    }
  }

  private placeItem(
    state: GameState,
    slot: ShopSlotLayout,
    bagIndex: number,
    entry: BagEntry,
  ): void {
    state.bag[bagIndex] = null;
    const listing: ShopListing = {
      entry,
      price: entry.baseValue,
      slotIndex: slot.index,
      isCage: slot.kind === 'cage',
    };
    if (slot.kind === 'cage') {
      state.shopCages[slot.index] = listing;
    } else {
      state.shopShelves[slot.index] = listing;
    }
    this.selectedBagIndex = -1;
    this.cb.onStateChange();
    this.syncFromState(state);
    this.cb.openPriceModal(slot.kind, slot.index);
    if (entry.kind === 'creature' && slot.kind === 'cage') {
      this.cb.onCreatureStocked?.();
    }
  }

  private updateCustomers(dt: number): void {
    if (!this.shopDayActive) return;

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.customerQueue.length > 0) {
      const plan = this.customerQueue.shift()!;
      this.spawnCustomer(plan);
      this.spawnTimer = SPAWN_GAP + Math.random() * 1.2;
    }

    let activeCount = 0;
    for (const c of this.customers) {
      if (c.phase === 'done') continue;
      activeCount++;
      this.tickCustomer(c, dt);
    }

    if (this.customerQueue.length === 0 && activeCount === 0) {
      this.shopDayActive = false;
      this.cb.onShopDayEnd(this.shopDayGold);
      this.cb.setHint('Expediente encerrado — volte à base e durma para o próximo dia.');
      this.updateHint();
    }
  }

  private spawnCustomer(plan: ShopCustomerPlan): void {
    const slot = this.layout.slots.find(
      (s) => s.kind === plan.slotKind && s.index === plan.slotIndex,
    );
    if (!slot) return;

    const color = CUSTOMER_COLORS[plan.archetype.id] ?? 0x888888;
    const container = createCustomerSprite(plan.archetype.id, color);
    container.x = this.layout.entrance.x;
    container.y = this.layout.entrance.y;
    this.entityLayer.addChild(container);

    this.customers.push({
      plan,
      phase: 'walk_slot',
      x: this.layout.entrance.x,
      y: this.layout.entrance.y,
      targetX: slot.x,
      targetY: slot.y + (slot.kind === 'cage' ? 20 : 28),
      lookTimer: LOOK_MIN + Math.random() * (LOOK_MAX - LOOK_MIN),
      bubble: null,
      container,
    });
  }

  private tickCustomer(c: LiveCustomer, dt: number): void {
    if (c.phase === 'walk_slot' || c.phase === 'leave') {
      const dx = c.targetX - c.x;
      const dy = c.targetY - c.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 4) {
        c.container.setLocomotion(false);
        if (c.phase === 'walk_slot') {
          c.phase = 'look';
          c.lookTimer = LOOK_MIN + Math.random() * (LOOK_MAX - LOOK_MIN);
        } else {
          c.phase = 'done';
          this.entityLayer.removeChild(c.container);
          c.container.destroy({ children: true });
          if (c.bubble) c.bubble.destroy({ children: true });
          return;
        }
      } else {
        c.container.setLocomotion(true, dx);
        const step = CUSTOMER_SPEED * dt;
        c.x += (dx / dist) * step;
        c.y += (dy / dist) * step;
      }
      c.container.x = c.x;
      c.container.y = c.y;
      return;
    }

    if (c.phase === 'look') {
      c.container.setLocomotion(false);
      c.lookTimer -= dt;
      if (!c.bubble) {
        c.bubble = createEmojiBubble(planEmoji(c.plan));
        c.container.addChild(c.bubble);
      }
      if (c.lookTimer > 0) return;

      const state = this.cb.getState();
      if (c.plan.willBuy) {
        const levelUp = applyShopSale(state, c.plan);
        this.shopDayGold += c.plan.paidPrice;
        if (levelUp) {
          this.cb.showToast(`Reputação ${levelUp.level}: ${levelUp.label} — ${levelUp.benefit}`);
          this.rebuildLayout();
        }
        this.cb.onStateChange();
        this.syncFromState(state);
      }

      if (c.bubble) {
        c.container.removeChild(c.bubble);
        c.bubble.destroy({ children: true });
        c.bubble = null;
      }

      c.phase = 'leave';
      c.targetX = this.layout.entrance.x;
      c.targetY = this.layout.entrance.y + 20;
    }
  }

  /** Evita clientes empilhados e mantém cabeça/corpo visíveis nas filas. */
  private separateCustomers(): void {
    const active = this.customers.filter((customer) => customer.phase !== 'done');
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < active.length; i++) {
        const a = active[i]!;
        for (let j = i + 1; j < active.length; j++) {
          const b = active[j]!;
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let distance = Math.hypot(dx, dy);
          if (distance >= CUSTOMER_SEPARATION) continue;
          if (distance < 0.001) {
            dx = 1;
            dy = 0;
            distance = 1;
          }
          const correction = (CUSTOMER_SEPARATION - distance) / 2;
          const pushX = (dx / distance) * correction;
          const pushY = (dy / distance) * correction;
          a.x -= pushX;
          a.y -= pushY;
          b.x += pushX;
          b.y += pushY;
        }
      }
    }

    for (const customer of active) {
      customer.x = Math.max(20, Math.min(this.layout.width - 20, customer.x));
      customer.y = Math.max(20, Math.min(this.layout.height - 20, customer.y));
      customer.container.x = customer.x;
      customer.container.y = customer.y;
    }
  }

  private clearCustomers(): void {
    for (const c of this.customers) {
      this.entityLayer.removeChild(c.container);
      c.container.destroy({ children: true });
    }
    this.customers = [];
    this.customerQueue = [];
    this.shopDayActive = false;
  }

  private updateCamera(): void {
    this.camera.follow(
      this.playerX,
      this.playerY,
      this.layout.width,
      this.layout.height,
    );
    this.camera.update();
  }

  private getListing(state: GameState, slot: ShopSlotLayout): ShopListing | null {
    if (slot.kind === 'cage') return state.shopCages[slot.index] ?? null;
    return state.shopShelves[slot.index] ?? null;
  }

  private clearListing(state: GameState, slot: ShopSlotLayout): void {
    if (slot.kind === 'cage') state.shopCages[slot.index] = null;
    else state.shopShelves[slot.index] = null;
  }

  private updateCarriedVisual(state: GameState): void {
    if (this.carriedGfx) {
      this.entityLayer.removeChild(this.carriedGfx);
      this.carriedGfx.destroy({ children: true });
      this.carriedGfx = null;
    }
    if (this.selectedBagIndex < 0) return;
    const entry = state.bag[this.selectedBagIndex];
    if (!entry) return;

    const color =
      entry.kind === 'creature' ? getSpecies(entry.speciesId).color : 0x8a6a30;
    this.carriedGfx = createShopItemSprite(entry.name, color, entry.kind === 'creature');
    this.carriedGfx.x = this.playerX;
    this.carriedGfx.y = this.playerY - 22;
    this.entityLayer.addChild(this.carriedGfx);
  }

  private updateHint(): void {
    if (this.shopDayActive) return;
    const state = this.cb.getState();
    if (this.selectedBagIndex >= 0) {
      const entry = state.bag[this.selectedBagIndex];
      this.cb.setHint(entry ? `Carregando: ${entry.name} — vá até um slot e pressione E` : 'WASD mover · E colocar/retirar · Clique no item para preço');
      return;
    }
    this.cb.setHint('WASD mover · Selecione item na bolsa · E colocar/retirar · Clique no expositor para preço');
  }
}
