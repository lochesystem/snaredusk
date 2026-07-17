import { Application, Container, UPDATE_PRIORITY } from 'pixi.js';
import { GAME_HEIGHT, GAME_WIDTH } from './engine/constants.ts';
import { InputManager } from './engine/input.ts';
import { DungeonScene } from './scenes/dungeonScene.ts';
import { HabitatScene } from './scenes/habitatScene.ts';
import { ShopScene } from './scenes/shopScene.ts';
import { defaultGameState, type GameState } from './types.ts';
import { hasSave, loadGame, saveGame, bagCount } from './systems/saveManager.ts';
import { moveCreatureToBag, moveCreatureToHabitat } from './systems/habitat.ts';
import { buyOrbPack, canBuyOrbPack } from './systems/orbShop.ts';
import { HABITAT_CAPACITY, ORB_BUNDLE_PRICE, ORB_PRICE, PLAYER_MAX_HP, PLAYER_MAX_STAMINA, DODGE_STAMINA_COST } from './engine/constants.ts';
import { tryUpgradeShop } from './systems/shopProgress.ts';
import { ShopUI } from './ui/shopUI.ts';
import { getEquippedWeapon, WEAPONS } from './data/weapons.ts';
import { craftWeapon, equipWeapon, formatCraftMissing, getCraftStatus, listRecipes } from './systems/craft.ts';
import { LOOT_TABLE } from './data/items.ts';
import { createLootIcon, createWeaponIcon } from './world/placeholderArt.ts';
import { ensureCreatureSpritesPreloaded } from './world/creatureAssets.ts';
import { ensurePlayerSpritesPreloaded } from './world/playerAssets.ts';
import {
  bindInventoryModal,
  closeInventoryModal,
  isInventoryModalOpen,
  openInventoryModal,
  renderInventoryGrid,
  type InventoryUICallbacks,
} from './ui/inventoryUI.ts';
import {
  bindAbandonModal,
  closeAbandonModal,
  isAbandonModalOpen,
  openAbandonModal,
} from './ui/abandonUI.ts';
import type { DungeonExitReason } from './scenes/dungeonScene.ts';
import { assignPartyCompanion, stashPartyCompanion } from './systems/party.ts';
import { getBiomeDef, listBiomes } from './data/biomes.ts';
import { isBiomeUnlocked, selectBiome } from './systems/biomeProgress.ts';
import { renderWeaponHotbar } from './ui/hotbarUI.ts';
import { syncWeaponHotbar } from './systems/weaponHotbar.ts';

type Screen = 'title' | 'base' | 'dungeon' | 'shop';

export class Game {
  private app!: Application;
  private input!: InputManager;
  private state: GameState = defaultGameState();
  private screen: Screen = 'title';
  private dungeon: DungeonScene | null = null;
  private habitatScene: HabitatScene | null = null;
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
  }

  private inventoryCallbacks(): InventoryUICallbacks {
    return {
      getState: () => this.state,
      onChange: () => {
        saveGame(this.state);
        this.renderInventoryPanel();
        this.renderPartyPanel();
        this.shopUI.render();
        this.updateHud();
        this.habitatScene?.syncCreatures(this.state.habitat);
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

    void Promise.all([ensureCreatureSpritesPreloaded(), ensurePlayerSpritesPreloaded()]);

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

    document.getElementById('btn-dungeon')?.addEventListener('click', () => {
      void this.enterDungeon();
    });

    document.getElementById('btn-shop')?.addEventListener('click', () => {
      this.showScreen('shop');
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
      document.getElementById('base-screen')?.classList.remove('hidden');
      this.showHabitatView();
      this.refreshBaseUI();
      requestAnimationFrame(() => this.fitCanvas());
    } else if (screen === 'shop') {
      document.getElementById('shop-screen')?.classList.remove('hidden');
      this.showShopView();
      this.shopUI.render();
      requestAnimationFrame(() => this.fitCanvas());
    } else {
      this.destroyHabitat();
      this.destroyShop();
      this.app.stage.removeChildren();
      requestAnimationFrame(() => this.fitCanvas());
    }
  }

  private showShopView(): void {
    this.destroyHabitat();
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
        saveGame(this.state);
        this.shopScene?.syncFromState(this.state);
        this.shopUI.render();
        this.shopUI.setShopDayBusy(false);
        this.refreshBaseUI();
        this.showToast(gold > 0 ? `Dia de loja: +${gold} ouro` : 'Nenhuma venda hoje');
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
    this.renderInventoryPanel();
    this.renderPartyPanel();
    this.habitatScene?.syncCreatures(this.state.habitat);
    this.renderBaseBagCreatures();
    this.renderWorkshop();
    this.renderArmory();
    this.renderBiomePanel();
    this.updateMerchantButtons();
  }

  private renderBiomePanel(): void {
    const container = document.getElementById('biome-picks');
    const btnDungeon = document.getElementById('btn-dungeon');
    if (!container) return;

    container.innerHTML = '';
    for (const biome of listBiomes()) {
      const unlocked = isBiomeUnlocked(this.state, biome.id);
      const selected = this.state.activeBiome === biome.id;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `biome-pick${selected ? ' selected' : ''}${unlocked ? '' : ' locked'}`;
      btn.disabled = !unlocked;

      const title = document.createElement('span');
      title.className = 'biome-pick-title';
      title.textContent = unlocked ? biome.name : `🔒 ${biome.name}`;

      const hint = document.createElement('span');
      hint.className = 'biome-pick-hint';
      hint.textContent = unlocked
        ? biome.description
        : 'Derrote o Rei das Esporas na Floresta';

      btn.append(title, hint);
      btn.addEventListener('click', () => {
        if (selectBiome(this.state, biome.id)) {
          saveGame(this.state);
          this.renderBiomePanel();
        }
      });
      container.appendChild(btn);
    }

    if (btnDungeon) {
      const active = getBiomeDef(this.state.activeBiome);
      btnDungeon.textContent = `Entrar — ${active.shortName}`;
    }
  }

  private renderInventoryPanel(): void {
    renderInventoryGrid('inventory-grid', this.inventoryCallbacks());
  }

  private renderPartyPanel(): void {
    const current = document.getElementById('party-current');
    const picks = document.getElementById('party-picks');
    if (!current || !picks) return;

    current.textContent = this.state.partyCompanion
      ? `Na party: ${this.state.partyCompanion.name}`
      : 'Nenhum companheiro';

    picks.innerHTML = '';

    if (this.state.partyCompanion) {
      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'party-pick selected';
      clearBtn.textContent = `Retirar ${this.state.partyCompanion.name}`;
      clearBtn.addEventListener('click', () => {
        if (stashPartyCompanion(this.state)) {
          saveGame(this.state);
          this.refreshBaseUI();
          this.showToast('Companheiro guardado');
        } else {
          this.showToast('Bolsa e habitat cheios — libere espaço');
        }
      });
      picks.appendChild(clearBtn);
    }

    this.state.bag.forEach((entry, index) => {
      if (!entry || entry.kind !== 'creature') return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'party-pick';
      btn.textContent = entry.name;
      btn.addEventListener('click', () => {
        const c = assignPartyCompanion(this.state, { kind: 'bag', index });
        if (c) {
          saveGame(this.state);
          this.refreshBaseUI();
          this.showToast(`${c.name} vai com você!`);
        } else {
          this.showToast('Libere o companheiro atual primeiro');
        }
      });
      picks.appendChild(btn);
    });

    this.state.habitat.forEach((creature, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'party-pick';
      btn.textContent = `${creature.name} (habitat)`;
      btn.addEventListener('click', () => {
        const c = assignPartyCompanion(this.state, { kind: 'habitat', index });
        if (c) {
          saveGame(this.state);
          this.refreshBaseUI();
          this.showToast(`${c.name} vai com você!`);
        } else {
          this.showToast('Libere o companheiro atual primeiro');
        }
      });
      picks.appendChild(btn);
    });

    if (!picks.children.length) {
      picks.innerHTML = '<span class="empty">Capture criaturas na masmorra</span>';
    }
  }

  private renderWorkshop(): void {
    const container = document.getElementById('workshop-recipes');
    if (!container) return;
    container.innerHTML = '';

    for (const recipe of listRecipes()) {
      const weapon = WEAPONS[recipe.weaponId];
      if (!weapon) continue;
      const status = getCraftStatus(this.state, recipe.id);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'depot-item craft-recipe-btn';
      btn.disabled = status.owned;

      const iconWrap = document.createElement('span');
      iconWrap.className = 'craft-icon-wrap';
      const iconImg = document.createElement('img');
      iconImg.className = 'craft-icon';
      iconImg.alt = weapon.name;
      iconWrap.appendChild(iconImg);
      void this.setPixiIcon(iconImg, () => createWeaponIcon(recipe.weaponId), `weapon-${recipe.weaponId}`);

      const body = document.createElement('span');
      body.className = 'craft-recipe-body';

      const title = document.createElement('span');
      title.className = 'craft-recipe-title';
      title.textContent = status.owned ? `${weapon.name} — possui` : `Craft: ${weapon.name}`;

      const ingIcons = document.createElement('span');
      ingIcons.className = 'craft-ing-icons';
      for (const ing of recipe.ingredients) {
        const ingImg = document.createElement('img');
        ingImg.className = 'craft-ing-icon';
        ingImg.alt = LOOT_TABLE[ing.lootId]?.name ?? ing.lootId;
        ingImg.title = `${ing.quantity}× ${ingImg.alt}`;
        ingIcons.appendChild(ingImg);
        void this.setPixiIcon(ingImg, () => createLootIcon(ing.lootId), `loot-${ing.lootId}`);
      }

      const reqs = document.createElement('span');
      reqs.className = 'craft-recipe-reqs';
      const ingText = recipe.ingredients
        .map((i) => {
          const name = LOOT_TABLE[i.lootId]?.name ?? i.lootId;
          const have = this.countLootInBag(i.lootId);
          const ok = have >= i.quantity;
          return `${i.quantity}× ${name} (${have}/${i.quantity})${ok ? '' : ' ✗'}`;
        })
        .join(' · ');
      const goldText =
        recipe.goldCost > 0 ? ` · ${recipe.goldCost} ouro (${this.state.gold}/${recipe.goldCost})` : '';
      reqs.textContent = ingText + goldText;

      const missing = document.createElement('span');
      missing.className = 'craft-recipe-missing';
      if (!status.owned && status.missing.length > 0) {
        missing.textContent = formatCraftMissing(status.missing);
      }

      body.appendChild(title);
      body.appendChild(ingIcons);
      body.appendChild(reqs);
      body.appendChild(missing);
      btn.appendChild(iconWrap);
      btn.appendChild(body);

      btn.addEventListener('click', () => {
        if (status.owned) return;
        const fresh = getCraftStatus(this.state, recipe.id);
        if (!fresh.canCraft) {
          this.showToast(formatCraftMissing(fresh.missing));
          return;
        }
        if (craftWeapon(this.state, recipe.id)) {
          saveGame(this.state);
          this.refreshBaseUI();
          this.showToast(`${weapon.name} craftada!`);
        }
      });
      container.appendChild(btn);
    }
  }

  private countLootInBag(lootId: string): number {
    let total = 0;
    for (const entry of this.state.bag) {
      if (!entry || entry.kind !== 'loot') continue;
      if (entry.id === lootId) total += entry.quantity;
    }
    return total;
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

  private renderArmory(): void {
    const container = document.getElementById('armory-weapons');
    if (!container) return;
    container.innerHTML = '';

    for (const weaponId of this.state.ownedWeapons) {
      const weapon = WEAPONS[weaponId];
      if (!weapon) continue;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'depot-item craft-recipe-btn';
      const equipped = this.state.equippedWeaponId === weaponId;
      if (equipped) btn.disabled = true;

      const iconWrap = document.createElement('span');
      iconWrap.className = 'craft-icon-wrap';
      const iconImg = document.createElement('img');
      iconImg.className = 'craft-icon';
      iconImg.alt = weapon.name;
      iconWrap.appendChild(iconImg);
      void this.setPixiIcon(iconImg, () => createWeaponIcon(weaponId), `weapon-${weaponId}`);

      const body = document.createElement('span');
      body.className = 'craft-recipe-body';
      const title = document.createElement('span');
      title.className = 'craft-recipe-title';
      title.textContent = equipped
        ? `✓ ${weapon.name} (ATK ${weapon.atk})`
        : `Equipar ${weapon.name} (ATK ${weapon.atk})`;
      body.appendChild(title);

      btn.appendChild(iconWrap);
      btn.appendChild(body);

      btn.addEventListener('click', () => {
        if (equipWeapon(this.state, weaponId)) {
          saveGame(this.state);
          this.refreshBaseUI();
          this.showToast(`Equipou ${weapon.name}`);
        }
      });
      container.appendChild(btn);
    }
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
      const shopNote = this.state.shopDayUsed ? ' · Loja fechada hoje' : ' · Loja disponível';
      stats.textContent = `Ouro: ${this.state.gold} · Orbes: ${this.state.orbs} · HP: ${this.state.playerHp} · Bolsa: ${bagCount(this.state)}/12 · Habitat: ${inHabitat}/${HABITAT_CAPACITY} · Bestiário: ${this.state.bestiary.length}${shopNote}`;
    }

    const shopBtn = document.getElementById('btn-shop') as HTMLButtonElement | null;
    if (shopBtn) {
      shopBtn.textContent = this.state.shopDayUsed ? 'Loja (fechada hoje)' : 'Abrir Loja';
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

  private async enterDungeon(): Promise<void> {
    if (!isBiomeUnlocked(this.state, this.state.activeBiome)) {
      this.showToast('Bioma ainda bloqueado');
      return;
    }
    await Promise.all([ensureCreatureSpritesPreloaded(), ensurePlayerSpritesPreloaded()]);
    this.state.shopDayUsed = false;
    this.pendingDungeonExit = null;
    this.destroyHabitat();
    document.getElementById('app')?.classList.remove('layout-base');
    this.destroyDungeon();
    this.state.playerHp = PLAYER_MAX_HP;
    this.state.playerStamina = PLAYER_MAX_STAMINA;
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
      this.showToast('Loja já abriu hoje — explore a masmorra para um novo dia');
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
