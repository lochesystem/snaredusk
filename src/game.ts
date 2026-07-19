import { Application, Container, UPDATE_PRIORITY } from 'pixi.js';
import { GAME_HEIGHT, GAME_WIDTH } from './engine/constants.ts';
import { InputManager } from './engine/input.ts';
import { DungeonScene } from './scenes/dungeonScene.ts';
import { BaseScene } from './scenes/baseScene.ts';
import { ShopScene } from './scenes/shopScene.ts';
import { defaultGameState, type GameState } from './types.ts';
import { hasSave, loadGame, saveGame } from './systems/saveManager.ts';
import { clearDungeonSpecial } from './systems/dungeonSpecial.ts';
import { moveCreatureToBag, moveCreatureToHabitat, listHabitatPens } from './systems/habitat.ts';
import { endDay, formatDayEndMessage, canSleepToday, canEnterDungeonToday } from './systems/dayCycle.ts';
import { buyOrbPack, canBuyOrbPack } from './systems/orbShop.ts';
import { ORB_BUNDLE_PRICE, ORB_PRICE, PLAYER_MAX_HP, PLAYER_MAX_STAMINA, DODGE_STAMINA_COST } from './engine/constants.ts';
import { tryUpgradeShop } from './systems/shopProgress.ts';
import { ShopUI } from './ui/shopUI.ts';
import { getEquippedWeapon } from './data/weapons.ts';
import { ensureCreatureSpritesPreloaded } from './world/creatureAssets.ts';
import { ensurePlayerSpritesPreloaded } from './world/playerAssets.ts';
import {
  ensureBaseTilesetPreloaded,
  ensureEnvironmentPreloaded,
} from './world/environmentAssets.ts';
import {
  bindInventoryModal,
  closeInventoryModal,
  isInventoryModalOpen,
  openInventoryModal,
  renderInventoryPanel,
  type InventoryUICallbacks,
} from './ui/inventoryUI.ts';
import {
  bindAbandonModal,
  closeAbandonModal,
  isAbandonModalOpen,
  openAbandonModal,
} from './ui/abandonUI.ts';
import type { DungeonExitReason } from './scenes/dungeonScene.ts';
import { isBiomeUnlocked } from './systems/biomeProgress.ts';
import { renderWeaponHotbar } from './ui/hotbarUI.ts';
import { syncWeaponHotbar } from './systems/weaponHotbar.ts';
import { createWeaponIcon } from './world/placeholderArt.ts';
import {
  bindBaseBar,
  renderBaseHeader,
  setBaseHint,
  showBaseHub,
} from './ui/baseBarUI.ts';
import {
  bindBuildModeModal,
  bindBuildHotbarKeys,
  clearBuildTool,
  renderBaseBuildHotbar,
  type BuildTool,
} from './ui/buildModeUI.ts';
import {
  bindChestModal,
  closeChestModal,
  isChestModalOpen,
  openChestModal,
  renderChestModal,
} from './ui/chestUI.ts';
import {
  bindWorkshopModal,
  closeWorkshopModal,
  isWorkshopModalOpen,
  openWorkshopModal,
} from './ui/workshopModalUI.ts';
import {
  bindBaseModals,
  closeDungeonModal,
  closeOrbsModal,
  closePartyModal,
  openDungeonModal,
  openOrbsModal,
  openPartyModal,
} from './ui/baseModals.ts';
import {
  bindHabitatPenModal,
  closeHabitatPenModal,
  isHabitatPenModalOpen,
  openHabitatPenModal,
  renderHabitatPenModal,
} from './ui/habitatPenUI.ts';

type Screen = 'title' | 'base' | 'dungeon' | 'shop';

export class Game {
  private app!: Application;
  private input!: InputManager;
  private state: GameState = defaultGameState();
  private screen: Screen = 'title';
  private dungeon: DungeonScene | null = null;
  private baseScene: BaseScene | null = null;
  private shopScene: ShopScene | null = null;
  private pendingDungeonExit: DungeonExitReason | null = null;
  private shopUI: ShopUI;
  private iconCache = new Map<string, string>();

  constructor() {
    this.shopUI = new ShopUI({
      getState: () => this.state,
      onChange: () => {
        saveGame(this.state);
        this.shopScene?.syncFromState(this.state);
        this.shopUI.render();
        this.refreshBaseUI();
      },
      showToast: (m) => this.showToast(m),
      onBack: () => this.showScreen('base'),
      onOpenShopDay: () => this.startShopDay(),
      onUpgradeShop: () => this.upgradeShop(),
      onBagSelect: (index) => {
        this.shopScene?.setSelectedBag(index);
        this.shopUI.render();
      },
      getSelectedBag: () => this.shopScene?.getSelectedBag() ?? -1,
    });
    this.bindDom();
    bindInventoryModal();
    bindAbandonModal();
    this.bindBaseUI();
  }

  private baseModalCallbacks() {
    return {
      getState: () => this.state,
      onChange: () => {
        saveGame(this.state);
        this.refreshBaseUI();
      },
      showToast: (m: string) => this.showToast(m),
      onEnterDungeon: () => void this.enterDungeon(),
    };
  }

  private workshopCallbacks() {
    return {
      getState: () => this.state,
      onChange: () => {
        saveGame(this.state);
        this.refreshBaseUI();
      },
      showToast: (m: string) => this.showToast(m),
      setPixiIcon: (img: HTMLImageElement, createIcon: () => Container, key: string) => {
        void this.setPixiIcon(img, createIcon, key);
      },
    };
  }

  private bindBaseUI(): void {
    const modalCb = this.baseModalCallbacks();
    const buildHotbarCb = {
      onSelect: (tool: BuildTool | null) => this.onBuildHotbarSelect(tool),
    };
    bindBaseBar({
      getState: () => this.state,
      onParty: () => openPartyModal(modalCb),
      onOrbs: () => openOrbsModal(modalCb),
    });
    bindBuildModeModal(buildHotbarCb);
    bindChestModal({
      getState: () => this.state,
      onChange: () => {
        saveGame(this.state);
        this.refreshBaseUI();
        renderChestModal({
          getState: () => this.state,
          onChange: () => {
            saveGame(this.state);
            this.refreshBaseUI();
          },
          showToast: (m) => this.showToast(m),
        });
      },
      showToast: (m) => this.showToast(m),
    });
    bindWorkshopModal(this.workshopCallbacks());
    bindBaseModals(modalCb);
    bindHabitatPenModal(this.habitatPenCallbacks());
    document.getElementById('base-bag-close')?.addEventListener('click', () => this.closeBaseBagModal());
    document.getElementById('btn-buy-orb-1')?.addEventListener('click', () => this.tryBuyOrbs('single'));
    document.getElementById('btn-buy-orb-3')?.addEventListener('click', () => this.tryBuyOrbs('bundle'));
  }

  private habitatPenCallbacks() {
    return {
      getState: () => this.state,
      onChange: () => {
        saveGame(this.state);
        this.refreshBaseUI();
        this.baseScene?.syncCreatures(this.state.habitat);
        if (isHabitatPenModalOpen()) renderHabitatPenModal(this.habitatPenCallbacks());
      },
      showToast: (m: string) => this.showToast(m),
    };
  }

  private inventoryCallbacks(): InventoryUICallbacks {
    return {
      getState: () => this.state,
      onChange: () => {
        saveGame(this.state);
        this.refreshBaseUI();
        this.shopUI.render();
        this.updateHud();
        if (this.isBaseBagModalOpen()) this.renderBaseBagModal();
      },
      showToast: (m) => this.showToast(m),
    };
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
      autoStart: false,
    });

    this.fitCanvas();
    window.addEventListener('resize', () => this.fitCanvas());

    this.input = new InputManager(canvas);

    void Promise.all([
      ensureCreatureSpritesPreloaded(),
      ensurePlayerSpritesPreloaded(),
      ensureBaseTilesetPreloaded(),
    ]);

    if (hasSave()) {
      document.getElementById('btn-continue')?.classList.remove('hidden');
    }

    this.app.ticker.add(
      (ticker) => {
        if (this.screen === 'title') return;
        const dt = Math.min(0.05, ticker.deltaMS / 1000);
        this.update(dt);
      },
      undefined,
      UPDATE_PRIORITY.HIGH,
    );
    this.app.stop();
  }

  private setRenderLoop(active: boolean): void {
    if (active) this.app.start();
    else this.app.stop();
  }

  private fitCanvas(): void {
    const wrapper = document.getElementById('game-wrapper');
    const appEl = document.getElementById('app');
    if (!wrapper) return;

    const canvas = this.app.canvas;
    const onBase = appEl?.classList.contains('layout-base');
    const onShop = appEl?.classList.contains('layout-shop');

    if (onBase || onShop) {
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      return;
    }

    if (!onBase && !onShop) {
      const scale = Math.max(1, Math.floor(Math.min(
        wrapper.clientWidth / GAME_WIDTH,
        wrapper.clientHeight / GAME_HEIGHT,
      )));
      if (this.app.renderer.resolution !== scale) {
        this.app.renderer.resolution = scale;
      }
      this.app.renderer.resize(GAME_WIDTH, GAME_HEIGHT);
      canvas.style.width = `${GAME_WIDTH * scale}px`;
      canvas.style.height = `${GAME_HEIGHT * scale}px`;
    }
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
  }

  private onBuildHotbarSelect(tool: BuildTool | null): void {
    this.baseScene?.setBuildTool(tool);
  }

  private tryOpenShop(): void {
    if (this.state.shopDayUsed) {
      this.showToast('A loja já fechou hoje — durma ou espere o próximo dia');
      return;
    }
    this.showScreen('shop');
  }

  private handleSleep(): void {
    if (!canSleepToday(this.state)) {
      this.showToast('Volte da masmorra antes de dormir');
      return;
    }
    const result = endDay(this.state);
    saveGame(this.state);
    this.refreshBaseUI();
    this.showToast(formatDayEndMessage(result));
  }

  private toggleBaseBagModal(): void {
    const modal = document.getElementById('base-bag-modal');
    if (!modal) return;
    const open = modal.classList.contains('hidden');
    if (open) {
      modal.classList.remove('hidden');
      this.renderBaseBagModal();
    } else {
      this.closeBaseBagModal();
    }
  }

  private closeBaseBagModal(): void {
    document.getElementById('base-bag-modal')?.classList.add('hidden');
  }

  private isBaseBagModalOpen(): boolean {
    return !document.getElementById('base-bag-modal')?.classList.contains('hidden');
  }

  private renderBaseBagModal(): void {
    renderInventoryPanel('base-bag-modal', 'base-bag-grid', 'base-bag-special', this.inventoryCallbacks());
    const habitatRow = document.getElementById('base-bag-habitat-row');
    if (!habitatRow) return;
    habitatRow.innerHTML = '';
    const pens = listHabitatPens(this.state);
    if (pens.length === 0) {
      const note = document.createElement('p');
      note.className = 'panel-hint';
      note.textContent = 'Construa um cercado (tecla 3) para colocar criaturas.';
      habitatRow.appendChild(note);
      return;
    }
    this.state.bag.forEach((entry, index) => {
      if (!entry || entry.kind !== 'creature') return;
      pens.forEach((pen, penIndex) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'party-pick';
        const label = pens.length > 1 ? `Cercado ${penIndex + 1}: ${entry.name}` : `Cercado: ${entry.name}`;
        btn.textContent = label;
        btn.addEventListener('click', () => {
          const moved = moveCreatureToHabitat(this.state, index, pen.id);
          if (moved) {
            saveGame(this.state);
            this.refreshBaseUI();
            this.renderBaseBagModal();
            this.showToast(`${moved.name} entrou no cercado!`);
          } else {
            this.showToast('Cercado cheio');
          }
        });
        habitatRow.appendChild(btn);
      });
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
    this.setRenderLoop(true);
    this.showScreen('base');
    saveGame(this.state);
  }

  private showScreen(screen: Screen): void {
    this.screen = screen;
    this.setRenderLoop(screen !== 'title');
    document.querySelectorAll('.screen').forEach((el) => el.classList.add('hidden'));
    document.getElementById('hud')?.classList.toggle('hidden', screen !== 'dungeon');
    document.getElementById('app')?.classList.toggle('layout-base', screen === 'base');
    document.getElementById('app')?.classList.toggle('layout-shop', screen === 'shop');

    if (screen === 'base') {
      showBaseHub(true);
      this.closeBaseModals();
      void this.showBaseView().then(() => {
        this.refreshBaseUI();
        requestAnimationFrame(() => this.fitCanvas());
      });
    } else if (screen === 'shop') {
      showBaseHub(false);
      document.getElementById('shop-screen')?.classList.remove('hidden');
      this.showShopView();
      this.shopUI.render();
      requestAnimationFrame(() => this.fitCanvas());
    } else {
      showBaseHub(false);
      this.destroyBase();
      this.destroyShop();
      this.app.stage.removeChildren();
      requestAnimationFrame(() => this.fitCanvas());
    }
  }

  private closeBaseModals(): void {
    clearBuildTool();
    closeChestModal();
    closeWorkshopModal();
    closePartyModal();
    closeDungeonModal();
    closeOrbsModal();
    closeHabitatPenModal();
    this.closeBaseBagModal();
    this.baseScene?.clearBuildTool();
    renderBaseBuildHotbar(this.state, {
      onSelect: (tool) => this.onBuildHotbarSelect(tool),
    });
  }

  private showShopView(): void {
    this.destroyBase();
    this.destroyShop();

    this.shopScene = new ShopScene(this.input, {
      getState: () => this.state,
      onStateChange: () => {
        saveGame(this.state);
        this.shopScene?.syncFromState(this.state);
        this.shopUI.render();
      },
      showToast: (m) => this.showToast(m),
      setHint: (text) => this.shopUI.setHint(text),
      openPriceModal: (kind, index) => this.shopUI.openPriceModal(kind, index),
      onShopDayEnd: (gold) => {
        let dayMsg = '';
        if (this.state.shopDayUsed) {
          const result = endDay(this.state);
          dayMsg = formatDayEndMessage(result);
        }
        saveGame(this.state);
        this.shopScene?.syncFromState(this.state);
        this.shopUI.render();
        this.shopUI.setShopDayBusy(false);
        this.refreshBaseUI();
        const shopPart = gold > 0 ? `Loja: +${gold} ouro` : 'Nenhuma venda hoje';
        if (dayMsg) {
          this.showToast(`${dayMsg} · ${shopPart}`);
        } else {
          this.showToast(shopPart);
        }
      },
    });

    this.app.stage.removeChildren();
    this.app.stage.addChild(this.shopScene.root);
    this.shopScene.enter();
  }

  private destroyShop(): void {
    if (!this.shopScene) return;
    this.shopScene.exit();
    this.shopScene = null;
  }

  private async showBaseView(): Promise<void> {
    await Promise.all([
      ensureCreatureSpritesPreloaded(),
      ensurePlayerSpritesPreloaded(),
      ensureBaseTilesetPreloaded(),
    ]);
    this.destroyBase();
    this.baseScene = new BaseScene(this.input, {
      getState: () => this.state,
      onStateChange: () => {
        saveGame(this.state);
        this.refreshBaseUI();
      },
      showToast: (m) => this.showToast(m),
      setHint: (text) => setBaseHint(text),
      onOpenChest: (chestId) => {
        openChestModal(chestId, {
          getState: () => this.state,
          onChange: () => {
            saveGame(this.state);
            this.refreshBaseUI();
            renderChestModal({
              getState: () => this.state,
              onChange: () => {
                saveGame(this.state);
                this.refreshBaseUI();
              },
              showToast: (m) => this.showToast(m),
            });
          },
          showToast: (m) => this.showToast(m),
        });
      },
      onOpenWorkbench: (cellX, cellY) => openWorkshopModal(cellX, cellY, this.workshopCallbacks()),
      onOpenDungeon: () => {
        if (!canEnterDungeonToday(this.state)) {
          this.showToast('Você já foi à masmorra hoje — durma para um novo dia');
          return;
        }
        openDungeonModal(this.baseModalCallbacks());
      },
      onOpenShop: () => this.tryOpenShop(),
      onOpenHabitatPen: (penId) => openHabitatPenModal(penId, this.habitatPenCallbacks()),
      onCreatureClick: (index) => {
        const moved = moveCreatureToBag(this.state, index);
        if (!moved) {
          this.showToast('Bolsa cheia — não dá para retirar');
          return;
        }
        saveGame(this.state);
        this.baseScene?.syncCreatures(this.state.habitat);
        this.refreshBaseUI();
        this.showToast(`${moved.name} voltou para a bolsa`);
      },
      onSleep: () => this.handleSleep(),
    });
    this.app.stage.removeChildren();
    this.app.stage.addChild(this.baseScene.root);
    this.baseScene.enter();
    this.baseScene.syncCreatures(this.state.habitat);
    this.refreshBaseUI();
  }

  private destroyBase(): void {
    if (!this.baseScene) return;
    this.baseScene.exit();
    this.baseScene = null;
  }

  private refreshBaseUI(): void {
    renderBaseHeader(this.state);
    this.updateMerchantButtons();
    renderBaseBuildHotbar(this.state, {
      onSelect: (tool) => this.onBuildHotbarSelect(tool),
    });
    this.baseScene?.syncCreatures(this.state.habitat);
    if (this.isBaseBagModalOpen()) this.renderBaseBagModal();
  }

  private async setPixiIcon(
    img: HTMLImageElement,
    createIcon: () => Container,
    cacheKey: string,
  ): Promise<void> {
    const cached = this.iconCache.get(cacheKey);
    if (cached) {
      img.src = cached;
      return;
    }
    const icon = createIcon();
    const wrapper = new Container();
    wrapper.addChild(icon);
    const base64 = await this.app.renderer.extract.base64({
      target: wrapper,
      clearColor: [0, 0, 0, 0],
      resolution: 2,
    });
    wrapper.destroy({ children: true });
    this.iconCache.set(cacheKey, base64);
    img.src = base64;
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

  private async enterDungeon(): Promise<void> {
    if (!isBiomeUnlocked(this.state, this.state.activeBiome)) {
      this.showToast('Bioma ainda bloqueado');
      return;
    }
    if (!canEnterDungeonToday(this.state)) {
      this.showToast('Você já foi à masmorra hoje — durma para um novo dia');
      return;
    }
    await Promise.all([
      ensureCreatureSpritesPreloaded(),
      ensurePlayerSpritesPreloaded(),
      ensureEnvironmentPreloaded(this.state.activeBiome),
    ]);
    this.pendingDungeonExit = null;
    this.destroyBase();
    showBaseHub(false);
    this.closeBaseModals();
    document.getElementById('app')?.classList.remove('layout-base');
    this.destroyDungeon();
    this.state.playerHp = PLAYER_MAX_HP;
    this.state.playerStamina = PLAYER_MAX_STAMINA;
    clearDungeonSpecial(this.state);
    syncWeaponHotbar(this.state);
    const seed = Date.now();

    this.dungeon = new DungeonScene(this.state, this.input, {
      onReturnToBase: (reason) => {
        this.pendingDungeonExit = reason;
      },
      onStateChange: () => saveGame(this.state),
      showToast: (m) => this.showToast(m),
      updateHud: () => this.updateHud(),
    }, seed);

    this.state.dungeonUsedToday = true;
    saveGame(this.state);

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
    if (this.screen === 'base' && this.baseScene) {
      if (this.input.consumeKey('i')) {
        if (this.isBaseBagModalOpen()) this.closeBaseBagModal();
        else this.toggleBaseBagModal();
      }
      bindBuildHotbarKeys(
        (key) => this.input.consumeKey(key),
        this.state,
        { onSelect: (tool) => this.onBuildHotbarSelect(tool) },
      );
      if (this.input.consumeKey('escape')) {
        if (isWorkshopModalOpen()) closeWorkshopModal();
        else if (isChestModalOpen()) closeChestModal();
        else if (isHabitatPenModalOpen()) closeHabitatPenModal();
        else if (this.isBaseBagModalOpen()) this.closeBaseBagModal();
        else if (this.baseScene.getBuildTool()) {
          clearBuildTool();
          this.baseScene.cancelBuildAction();
          this.baseScene.clearBuildTool();
          renderBaseBuildHotbar(this.state, {
            onSelect: (tool) => this.onBuildHotbarSelect(tool),
          });
        } else this.closeBaseModals();
      }
      this.baseScene.update(dt);
    }

    if (this.screen === 'shop' && this.shopScene) {
      this.shopScene.update(dt);
    }

    if (this.screen === 'dungeon' && this.dungeon) {
      if (this.input.consumeKey('i')) {
        if (isInventoryModalOpen()) closeInventoryModal();
        else openInventoryModal(this.inventoryCallbacks());
      }
      if (this.input.consumeKey('escape')) {
        if (isInventoryModalOpen()) closeInventoryModal();
        else if (isAbandonModalOpen()) closeAbandonModal();
        else if (this.dungeon.canAbandon()) {
          openAbandonModal(() => this.dungeon!.abandon());
        }
      }

      this.dungeon.update(dt);
      const hint = document.getElementById('hud-hint');
      if (hint) hint.textContent = this.dungeon.getHudHint();
    }

    if (this.pendingDungeonExit !== null) {
      const reason = this.pendingDungeonExit;
      this.pendingDungeonExit = null;
      closeAbandonModal();
      closeInventoryModal();
      clearDungeonSpecial(this.state);
      this.state.dungeonReturnedToday = true;
      this.destroyDungeon();
      saveGame(this.state);
      this.showScreen('base');
      if (reason === 'portal') this.showToast('Retornou à base com a bolsa!');
      else if (reason === 'abandon') { /* toast já exibido na masmorra */ }
    }
  }

  private updateHud(): void {
    const hp = document.getElementById('hud-hp');
    const hpFill = document.getElementById('hud-hp-fill');
    const gold = document.getElementById('hud-gold');
    const orbs = document.getElementById('hud-orbs');
    const stamina = document.getElementById('hud-stamina');
    const staminaFill = document.getElementById('hud-stamina-fill');
    const w = getEquippedWeapon(this.state.equippedWeaponId);
    const hpVal = Math.max(0, Math.min(100, this.state.playerHp));
    const staVal = Math.max(0, Math.min(PLAYER_MAX_STAMINA, Math.round(this.state.playerStamina)));
    const staLowThreshold = Math.min(DODGE_STAMINA_COST, w.staminaCost);

    if (hp) hp.textContent = String(hpVal);
    if (hpFill) {
      hpFill.style.width = `${hpVal}%`;
      hpFill.classList.toggle('low', hpVal <= 25);
    }
    if (gold) gold.textContent = `Ouro: ${this.state.gold}`;
    if (orbs) orbs.textContent = `Orbes: ${this.state.orbs}`;
    if (stamina) stamina.textContent = String(staVal);
    if (staminaFill) {
      const pct = (staVal / PLAYER_MAX_STAMINA) * 100;
      staminaFill.style.width = `${pct}%`;
      staminaFill.classList.toggle('low', staVal < staLowThreshold);
    }

    const petWrap = document.getElementById('hud-pet');
    const petFill = document.getElementById('hud-pet-fill');
    const companion = this.dungeon?.getCompanionHud() ?? null;
    if (petWrap && petFill) {
      if (companion) {
        petWrap.classList.remove('hidden');
        const petPct = (companion.hp / companion.maxHp) * 100;
        petFill.style.width = `${petPct}%`;
        petFill.classList.toggle('low', petPct <= 25);
      } else {
        petWrap.classList.add('hidden');
      }
    }

    syncWeaponHotbar(this.state);
    renderWeaponHotbar(this.state, {
      setIcon: (img, weaponId) => {
        void this.setPixiIcon(img, () => createWeaponIcon(weaponId), `weapon-${weaponId}`);
      },
    });
  }

  private startShopDay(): void {
    if (!this.shopScene) return;
    if (this.state.shopDayUsed) {
      this.showToast('Loja já abriu hoje — durma na base para um novo dia');
      return;
    }
    if (this.shopScene.startShopDay()) {
      this.state.shopDayUsed = true;
      saveGame(this.state);
      this.shopUI.setShopDayBusy(true);
      this.shopUI.render();
    }
  }

  private upgradeShop(): void {
    const result = tryUpgradeShop(this.state);
    this.showToast(result.message);
    if (result.ok) {
      saveGame(this.state);
      this.shopScene?.rebuildLayout();
      this.shopScene?.syncFromState(this.state);
      this.shopUI.render();
      this.refreshBaseUI();
    }
  }

  private showToast(msg: string): void {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2200);
  }
}
