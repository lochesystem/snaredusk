import { Application } from 'pixi.js';
import { GAME_HEIGHT, GAME_WIDTH } from './engine/constants.ts';
import { InputManager } from './engine/input.ts';
import { DungeonScene } from './scenes/dungeonScene.ts';
import { HabitatScene } from './scenes/habitatScene.ts';
import { defaultGameState, type BagEntry, type GameState, type ShopListing } from './types.ts';
import { hasSave, loadGame, saveGame, bagCount } from './systems/saveManager.ts';
import { moveCreatureToBag, moveCreatureToHabitat } from './systems/habitat.ts';
import { buyOrbPack, canBuyOrbPack } from './systems/orbShop.ts';
import { HABITAT_CAPACITY, ORB_BUNDLE_PRICE, ORB_PRICE } from './engine/constants.ts';
import { customerBuys, getPriceTier, getPriceTierLabel } from './systems/pricing.ts';
import { ShopUI } from './ui/shopUI.ts';

type Screen = 'title' | 'base' | 'dungeon' | 'shop';

export class Game {
  private app!: Application;
  private input!: InputManager;
  private state: GameState = defaultGameState();
  private screen: Screen = 'title';
  private dungeon: DungeonScene | null = null;
  private habitatScene: HabitatScene | null = null;
  private pendingDungeonExit: boolean | null = null;
  private shopUI: ShopUI;
  private lastTime = 0;

  constructor() {
    this.shopUI = new ShopUI({
      getState: () => this.state,
      onChange: () => {
        saveGame(this.state);
        this.refreshBaseUI();
      },
      showToast: (m) => this.showToast(m),
      onBack: () => this.showScreen('base'),
      runShopDay: () => this.simulateShopDay(),
    });
    this.bindDom();
  }

  async init(): Promise<void> {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.app = new Application();
    await this.app.init({
      canvas,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      backgroundColor: 0x1a1520,
      antialias: false,
      resolution: 1,
    });

    this.fitCanvas();
    window.addEventListener('resize', () => this.fitCanvas());

    this.input = new InputManager(canvas);

    if (hasSave()) {
      document.getElementById('btn-continue')?.classList.remove('hidden');
    }

    this.lastTime = performance.now();
    this.app.ticker.add(() => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - this.lastTime) / 1000);
      this.lastTime = now;
      this.update(dt);
    });
  }

  private fitCanvas(): void {
    const wrapper = document.getElementById('game-wrapper');
    const appEl = document.getElementById('app');
    if (!wrapper) return;

    const canvas = this.app.canvas;
    const onBase = appEl?.classList.contains('layout-base');

    if (onBase) {
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      return;
    }

    const scale = Math.max(1, Math.floor(Math.min(
      wrapper.clientWidth / GAME_WIDTH,
      wrapper.clientHeight / GAME_HEIGHT,
    )));
    canvas.style.width = `${GAME_WIDTH * scale}px`;
    canvas.style.height = `${GAME_HEIGHT * scale}px`;
  }

  private bindDom(): void {
    document.getElementById('btn-new-game')?.addEventListener('click', () => {
      this.state = defaultGameState();
      saveGame(this.state);
      this.startGame();
    });

    document.getElementById('btn-continue')?.addEventListener('click', () => {
      const loaded = loadGame();
      if (loaded) {
        this.state = loaded;
        this.startGame();
      }
    });

    document.getElementById('btn-dungeon')?.addEventListener('click', () => {
      this.enterDungeon();
    });

    document.getElementById('btn-shop')?.addEventListener('click', () => {
      this.showScreen('shop');
      this.shopUI.render();
    });

    document.getElementById('btn-buy-orb-1')?.addEventListener('click', () => {
      this.tryBuyOrbs('single');
    });

    document.getElementById('btn-buy-orb-3')?.addEventListener('click', () => {
      this.tryBuyOrbs('bundle');
    });
  }

  private tryBuyOrbs(pack: 'single' | 'bundle'): void {
    if (!canBuyOrbPack(this.state, pack)) {
      this.showToast('Ouro insuficiente para comprar orbes');
      return;
    }
    const qty = pack === 'bundle' ? 3 : 1;
    buyOrbPack(this.state, pack);
    saveGame(this.state);
    this.refreshBaseUI();
    this.showToast(qty === 1 ? '+1 Orbe de Vínculo' : `+${qty} Orbes de Vínculo`);
  }

  private startGame(): void {
    document.getElementById('title-screen')?.classList.add('hidden');
    this.showScreen('base');
    saveGame(this.state);
  }

  private showScreen(screen: Screen): void {
    this.screen = screen;
    document.querySelectorAll('.screen').forEach((el) => el.classList.add('hidden'));
    document.getElementById('hud')?.classList.toggle('hidden', screen !== 'dungeon');
    document.getElementById('app')?.classList.toggle('layout-base', screen === 'base');

    if (screen === 'base') {
      document.getElementById('base-screen')?.classList.remove('hidden');
      this.showHabitatView();
      this.refreshBaseUI();
      requestAnimationFrame(() => this.fitCanvas());
    } else {
      this.destroyHabitat();
      this.app.stage.removeChildren();
      if (screen === 'shop') {
        document.getElementById('shop-screen')?.classList.remove('hidden');
      }
      requestAnimationFrame(() => this.fitCanvas());
    }
  }

  private showHabitatView(): void {
    this.destroyHabitat();
    this.habitatScene = new HabitatScene(this.input, {
      onCreatureClick: (index) => {
        const moved = moveCreatureToBag(this.state, index);
        if (!moved) {
          this.showToast('Bolsa cheia — não dá para retirar');
          return;
        }
        saveGame(this.state);
        this.habitatScene?.syncCreatures(this.state.habitat);
        this.refreshBaseUI();
        this.showToast(`${moved.name} voltou para a bolsa`);
      },
    });
    this.app.stage.removeChildren();
    this.app.stage.addChild(this.habitatScene.root);
    this.habitatScene.enter();
    this.habitatScene.syncCreatures(this.state.habitat);
  }

  private destroyHabitat(): void {
    if (!this.habitatScene) return;
    this.habitatScene.exit();
    this.habitatScene = null;
  }

  private refreshBaseUI(): void {
    this.updateBaseStats();
    this.habitatScene?.syncCreatures(this.state.habitat);
    this.renderBaseBagCreatures();
    this.updateMerchantButtons();
  }

  private updateMerchantButtons(): void {
    const single = document.getElementById('btn-buy-orb-1') as HTMLButtonElement | null;
    const bundle = document.getElementById('btn-buy-orb-3') as HTMLButtonElement | null;
    if (single) {
      single.disabled = !canBuyOrbPack(this.state, 'single');
      single.textContent = `Orbe ×1 — ${ORB_PRICE} ouro`;
    }
    if (bundle) {
      bundle.disabled = !canBuyOrbPack(this.state, 'bundle');
      bundle.textContent = `Orbes ×3 — ${ORB_BUNDLE_PRICE} ouro`;
    }
  }

  private updateBaseStats(): void {
    const stats = document.getElementById('base-stats');
    if (stats) {
      const inHabitat = this.state.habitat.length;
      stats.textContent = `Ouro: ${this.state.gold} · Orbes: ${this.state.orbs} · HP: ${this.state.playerHp} · Bolsa: ${bagCount(this.state)}/12 · Habitat: ${inHabitat}/${HABITAT_CAPACITY} · Bestiário: ${this.state.bestiary.length}`;
    }
  }

  private renderBaseBagCreatures(): void {
    const container = document.getElementById('base-bag-creatures');
    if (!container) return;
    container.innerHTML = '';

    let hasCreature = false;
    this.state.bag.forEach((entry, index) => {
      if (!entry || entry.kind !== 'creature') return;
      hasCreature = true;

      const btn = document.createElement('button');
      btn.className = 'depot-item';
      btn.textContent = entry.name;
      btn.title = 'Colocar no habitat';
      btn.addEventListener('click', () => {
        if (this.state.habitat.length >= HABITAT_CAPACITY) {
          this.showToast(`Habitat cheio (${HABITAT_CAPACITY}/${HABITAT_CAPACITY})`);
          return;
        }
        const moved = moveCreatureToHabitat(this.state, index);
        if (!moved) return;
        saveGame(this.state);
        this.refreshBaseUI();
        this.showToast(`${moved.name} foi para o habitat!`);
      });
      container.appendChild(btn);
    });

    if (!hasCreature) {
      container.innerHTML = '<p class="empty">Nenhuma criatura na bolsa — capture na masmorra com Q.</p>';
    }
  }

  private enterDungeon(): void {
    this.pendingDungeonExit = null;
    this.destroyHabitat();
    document.getElementById('app')?.classList.remove('layout-base');
    this.destroyDungeon();
    this.state.playerHp = Math.min(this.state.playerHp, 100);
    const seed = Date.now();

    this.dungeon = new DungeonScene(this.state, this.input, {
      onReturnToBase: (died) => {
        this.pendingDungeonExit = died;
      },
      onStateChange: () => saveGame(this.state),
      showToast: (m) => this.showToast(m),
      updateHud: () => this.updateHud(),
    }, seed);

    this.app.stage.addChild(this.dungeon.root);
    this.dungeon.enter();
    this.screen = 'dungeon';
    document.querySelectorAll('.screen').forEach((el) => el.classList.add('hidden'));
    document.getElementById('hud')?.classList.remove('hidden');
    this.updateHud();
    requestAnimationFrame(() => this.fitCanvas());
  }

  private destroyDungeon(): void {
    if (!this.dungeon) return;
    this.dungeon.exit();
    this.dungeon = null;
    this.app.stage.removeChildren();
  }

  private update(dt: number): void {
    if (this.screen === 'base' && this.habitatScene) {
      this.habitatScene.update(dt);
    }

    if (this.screen === 'dungeon' && this.dungeon) {
      this.dungeon.update(dt);
      const hint = document.getElementById('hud-hint');
      if (hint) hint.textContent = this.dungeon.getHudHint();
    }

    if (this.pendingDungeonExit !== null) {
      const died = this.pendingDungeonExit;
      this.pendingDungeonExit = null;
      this.destroyDungeon();
      saveGame(this.state);
      this.showScreen('base');
      if (!died) this.showToast('Retornou à base com a bolsa!');
    }
  }

  private updateHud(): void {
    const hp = document.getElementById('hud-hp');
    const gold = document.getElementById('hud-gold');
    const orbs = document.getElementById('hud-orbs');
    const bag = document.getElementById('hud-bag');
    if (hp) hp.textContent = `HP ${this.state.playerHp}/100`;
    if (gold) gold.textContent = `Ouro: ${this.state.gold}`;
    if (orbs) orbs.textContent = `Orbes: ${this.state.orbs}`;
    if (bag) bag.textContent = `Bolsa: ${bagCount(this.state)}/12`;
  }

  private simulateShopDay(): void {
    const log = document.getElementById('shop-log');
    if (log) log.innerHTML = '';
    let sales = 0;

    const listings: ShopListing[] = [
      ...this.state.shopShelves.filter((s): s is ShopListing => s !== null),
      ...(this.state.shopCage ? [this.state.shopCage] : []),
    ];

    if (listings.length === 0) {
      this.showToast('Coloque itens nas prateleiras primeiro!');
      return;
    }

    for (const listing of [...listings]) {
      const base = listing.entry.baseValue;
      if (customerBuys(listing.price, base)) {
        this.state.gold += listing.price;
        sales += listing.price;
        this.appendShopLog(
          `Vendeu ${formatEntry(listing.entry)} por ${listing.price}g — ${getPriceTierLabel(getPriceTier(listing.price, base))}`,
        );
        if (listing.isCage) {
          this.state.shopCage = null;
        } else {
          this.state.shopShelves[listing.slotIndex] = null;
        }
      } else {
        this.appendShopLog(`Cliente recusou ${formatEntry(listing.entry)} (${listing.price}g)`);
      }
    }

    saveGame(this.state);
    this.shopUI.render();
    this.refreshBaseUI();
    this.showToast(sales > 0 ? `Dia de loja: +${sales} ouro` : 'Nenhuma venda hoje');
  }

  private appendShopLog(line: string): void {
    const log = document.getElementById('shop-log');
    if (!log) return;
    const p = document.createElement('p');
    p.textContent = line;
    log.appendChild(p);
  }

  private showToast(msg: string): void {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2200);
  }
}

function formatEntry(entry: BagEntry): string {
  if (entry.kind === 'loot') return `${entry.name} x${entry.quantity}`;
  return entry.name;
}
