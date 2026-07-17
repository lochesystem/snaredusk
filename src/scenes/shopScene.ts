import { Container, Graphics, Text } from 'pixi.js';
import { getSpecies } from '../data/creatures.ts';
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
import {
  buildShopLayout,
  findSlotAt,
  type ShopLayout,
  type ShopSlotLayout,
} from '../world/shopLayout.ts';
import {
  createCustomerSprite,
  createEmojiBubble,
  createPlayerSprite,
  createShelfStandSprite,
  createShopItemSprite,
  drawShopLayout,
} from '../world/placeholderArt.ts';

const CUSTOMER_SPEED = 72;
const LOOK_MIN = 1.1;
const LOOK_MAX = 2.2;
const SPAWN_GAP = 2.4;

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
  container: Container;
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

    this.layout = buildShopLayout(state.shopLevel);
    this.collisionRects = [...this.layout.walls, ...this.layout.obstacles];

    const floorGfx = new Graphics();
    drawShopLayout(
      floorGfx,
      this.layout.floors,
      this.layout.walls,
      this.layout.counter,
      this.layout.decorSeed,
      this.layout.width,
      this.layout.height,
    );
    this.world.addChild(floorGfx);

    for (const slot of this.layout.slots) {
      const stand = createShelfStandSprite(slot.kind === 'cage');
      stand.x = slot.x;
      stand.y = slot.y;

      const highlight = new Graphics();
      highlight.roundRect(-slot.w / 2 - 2, -slot.h / 2 - 2, slot.w + 4, slot.h + 4, 4);
      highlight.stroke({ width: 2, color: 0xc4f082, alpha: 0 });
      stand.addChild(highlight);

      const itemLayer = new Container();
      itemLayer.y = -8;
      stand.addChild(itemLayer);

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

      const color =
        listing.entry.kind === 'creature'
          ? getSpecies(listing.entry.speciesId).color
          : 0x8a6a30;
      const item = createShopItemSprite(
        listing.entry.name,
        color,
        listing.entry.kind === 'creature',
      );
      visual.itemLayer.addChild(item);

      const priceTag = new Text({
        text: `${listing.price}g`,
        style: { fontFamily: 'monospace', fontSize: 7, fill: 0xe8c868 },
      });
      priceTag.anchor.set(0.5);
      priceTag.y = 10;
      visual.itemLayer.addChild(priceTag);
    }
    this.updateCarriedVisual(state);
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
      this.cb.showToast('Loja já abriu hoje — explore a masmorra para um novo dia');
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

    const nearSlot = findSlotAt(this.layout, this.playerX, this.playerY, 30);
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
        this.cb.showToast('Slot ocupado — clique no item para ajustar preço');
        return;
      }
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
      this.cb.setHint('Dia encerrado — organize a loja ou abra de novo.');
      this.updateHint();
    }
  }

  private spawnCustomer(plan: ShopCustomerPlan): void {
    const slot = this.layout.slots.find(
      (s) => s.kind === plan.slotKind && s.index === plan.slotIndex,
    );
    if (!slot) return;

    const color = CUSTOMER_COLORS[plan.archetype.id] ?? 0x888888;
    const container = createCustomerSprite(color);
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
        const step = CUSTOMER_SPEED * dt;
        c.x += (dx / dist) * step;
        c.y += (dy / dist) * step;
      }
      c.container.x = c.x;
      c.container.y = c.y;
      return;
    }

    if (c.phase === 'look') {
      c.lookTimer -= dt;
      if (!c.bubble) {
        c.bubble = createEmojiBubble(planEmoji(c.plan));
        c.container.addChild(c.bubble);
      }
      if (c.lookTimer > 0) return;

      const state = this.cb.getState();
      if (c.plan.willBuy) {
        applyShopSale(state, c.plan);
        this.shopDayGold += c.plan.paidPrice;
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
