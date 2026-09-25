import type { Engine } from '@babylonjs/core';
import { content, portraitUrl, type Line } from './content';
import type { GameConfig } from './game/config';
import { clampLevel, difficultyFor, rewardsFor } from './game/difficulty';
import { toWorld, type Interactable, type Island } from './game/island';
import { buildLoadout, levelProgress, type Loadout } from './game/loadout';
import { add, length, normalize, scale, vec, type Vec2 } from './game/math';
import { Progress, bindSelf, type Action } from './game/progress';
import type { GameEvent, InputFrame, Outcome } from './game/types';
import { World } from './game/world';
import type { Input } from './input';
import type { Hud } from './render/hud';
import type { IslandRenderer } from './render/islandRenderer';
import type { Renderer } from './render/renderer';
import { DialogueBox } from './ui/dialogue';
import {
  PanelHost,
  openDungeonEntry,
  openForge,
  openInventory,
  openLoot,
  openQuests,
  openShop,
  openSkills,
  trackedQuest,
  type UiContext,
} from './ui/panels';
import { Screens, type MenuOption } from './ui/screens';

type Mode = 'title' | 'island' | 'dungeon' | 'result';

/** La simulation du combat avance par pas fixes, quelle que soit la fréquence de l'écran. */
const STEP = 1 / 60;
const MAX_STEPS_PER_FRAME = 5;
/** Centre du village, survolé par la caméra derrière l'écran titre. */
const TITLE_ORBIT = { u: -4, v: 1, radius: 5, speed: 0.07 };

interface Loot {
  oboles: number;
  xp: number;
  materials: Record<string, number>;
  items: string[];
  waves: number;
}

const emptyLoot = (): Loot => ({ oboles: 0, xp: 0, materials: {}, items: [], waves: 0 });
/** Expérience de la victoire sur la Jorōgumo, la première fois. */
const BOSS_QUEST_XP = 120;

export interface AppDeps {
  engine: Engine;
  input: Input;
  islandRenderer: IslandRenderer;
  dungeonRenderer: Renderer;
  hud: Hud;
  config: GameConfig;
  progress: Progress;
  island: Island;
  uiRoot: HTMLElement;
  /** `?vague=N` : commence directement le donjon à cette vague (tests). */
  devWave: number | null;
  /** `?niveau=N` : niveau du donjon pour `?vague` (tests). */
  devLevel: number | null;
}

const randInt = ([min, max]: [number, number]) => min + Math.floor(Math.random() * (max - min + 1));

/**
 * Chef d'orchestre : écran titre, exploration de l'île, dialogues, donjon, résultats.
 * La logique du combat (World) et celle de l'île (Island) ne se connaissent pas : tout passe par ici.
 */
export class App {
  private mode: Mode = 'title';
  private world: World | null = null;
  /** Un dialogue, une transition ou une action à plusieurs étapes est en cours. */
  private busy = false;
  private accumulator = 0;
  private last = performance.now();
  private titleAngle = 0;
  private run: Loot = emptyLoot();
  /** Niveau du donjon en cours (choisi à l'entrée). */
  private dungeonLevel = 1;
  private outcome: Outcome | null = null;
  private readonly dialogue: DialogueBox;
  private readonly panels: PanelHost;
  private readonly screens: Screens;
  private readonly ui: UiContext;

  constructor(private readonly d: AppDeps) {
    this.screens = new Screens(d.uiRoot);
    this.dialogue = new DialogueBox(d.uiRoot);
    this.panels = new PanelHost(d.uiRoot);
    this.ui = {
      progress: d.progress,
      basePlayer: d.config.player,
      loadout: () => this.loadout(),
      toast: (text, tone) => this.screens.toast(text, tone),
    };
  }

  start(): void {
    if (this.d.devWave !== null) void this.enterDungeon(this.d.devWave, false, this.d.devLevel ?? 1);
    else this.showTitle();
    this.d.engine.runRenderLoop(() => this.frame());
  }

  /** Accès depuis la console, en développement. */
  debug(): object {
    const app = this;
    return {
      get world() {
        return app.world;
      },
      get island() {
        return app.d.island;
      },
      get progress() {
        return app.d.progress;
      },
      get mode() {
        return app.mode;
      },
      /** Fait avancer le jeu sans attendre l'écran (onglet masqué, tests automatisés). */
      advance(seconds: number) {
        for (let i = 0; i < Math.round(seconds * 60); i++) app.step(1 / 60);
        app.last = performance.now();
      },
    };
  }

  // --- Boucle -------------------------------------------------------------------

  private frame(): void {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.step(dt);
  }

  private step(dt: number): void {
    this.dialogue.tick(dt);
    this.handleKeys();

    switch (this.mode) {
      case 'title':
        this.updateTitle(dt);
        break;
      case 'island':
        this.updateIsland(dt);
        break;
      case 'dungeon':
        this.updateDungeon(dt);
        break;
      case 'result':
        if (this.world) this.d.dungeonRenderer.sync(this.world, [], dt);
        this.d.dungeonRenderer.render();
        break;
    }
    // Le combat vide lui-même les appuis après ses pas de simulation.
    if (this.mode !== 'dungeon') this.d.input.flush();
  }

  private handleKeys(): void {
    const { input } = this.d;
    const key = (code: string) => input.consumeKey(code);
    if (this.dialogue.open) {
      if (key('KeyE') || key('Space') || key('Enter')) this.dialogue.advance();
      if (key('ArrowUp') || key('KeyW')) this.dialogue.move(-1);
      if (key('ArrowDown') || key('KeyS')) this.dialogue.move(1);
      for (let n = 1; n <= 4; n++) if (key(`Digit${n}`) || key(`Numpad${n}`)) this.dialogue.pick(n - 1);
      return;
    }
    if (this.panels.open) {
      if (key('Escape') || key('KeyI') || key('KeyJ') || key('KeyK')) this.panels.close();
      return;
    }
    if (this.screens.paused) {
      if (key('Escape')) this.screens.hidePause();
      return;
    }
    if (this.busy) return;
    if (this.mode === 'island') {
      if (key('KeyE')) {
        const target = this.d.island.nearest();
        if (target) void this.interact(target);
      } else if (key('KeyI')) openInventory(this.panels, this.ui);
      else if (key('KeyJ')) openQuests(this.panels, this.ui);
      else if (key('KeyK')) openSkills(this.panels, this.ui);
      else if (key('Escape')) this.openPause();
    } else if (this.mode === 'dungeon' && key('Escape')) {
      this.openPause();
    }
  }

  // --- Écran titre ------------------------------------------------------------------

  private showTitle(): void {
    this.setMode('title');
    const hasSave = Progress.hasSave();
    const options: MenuOption[] = [];
    if (hasSave) options.push({ label: 'Continuer', primary: true, action: () => void this.beginIsland(false) });
    options.push({
      label: hasSave ? 'Nouvelle partie (efface la sauvegarde)' : 'Nouvelle partie',
      primary: !hasSave,
      action: () => {
        this.d.progress.reset();
        void this.beginIsland(true);
      },
    });
    this.screens.showTitle(options);
  }

  private updateTitle(dt: number): void {
    const { island, islandRenderer } = this.d;
    this.titleAngle += dt * TITLE_ORBIT.speed;
    const center = toWorld({
      u: TITLE_ORBIT.u + Math.cos(this.titleAngle) * TITLE_ORBIT.radius,
      v: TITLE_ORBIT.v + Math.sin(this.titleAngle) * TITLE_ORBIT.radius,
    });
    islandRenderer.focus(center, dt);
    islandRenderer.sync(island, null, new Map(), dt, false);
    islandRenderer.render();
  }

  private async beginIsland(newGame: boolean): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    const { island, islandRenderer } = this.d;
    await this.screens.transition('Yomotsu Hirasaka', 'Île du Yomi', () => {
      this.screens.hideTitle();
      island.placeAt(content.island.spawn);
      islandRenderer.focus(island.player.pos, 0, true);
      this.setMode('island');
    });
    this.busy = false;
    // À l'arrivée, Charon accueille la nouvelle âme.
    if (newGame || this.d.progress.quest('passeur') === 'none') {
      const charon = island.interactables().find((it) => it.def.id === 'charon');
      if (charon) await this.interact(charon);
    }
  }

  // --- Île ------------------------------------------------------------------------------

  private updateIsland(dt: number): void {
    const { island, islandRenderer, progress } = this.d;
    const modal = this.busy || this.dialogue.open || this.panels.open || this.screens.paused;
    const entered = island.update(dt, modal ? vec() : this.readMove(islandRenderer.forward, islandRenderer.right));
    if (entered) this.screens.announceArea(entered.name);
    const target = modal ? null : island.nearest();
    islandRenderer.focus(island.player.pos, dt);
    islandRenderer.sync(island, target?.def.id ?? null, this.markers(), dt);
    islandRenderer.render();
    this.screens.updateIslandHud({
      area: island.area?.name ?? island.data.name,
      oboles: progress.state.oboles,
      xp: levelProgress(content.skills, progress.state.xp),
      points: progress.skillPoints,
      quest: trackedQuest(progress),
      prompt: target ? { verb: target.def.verb ?? 'Parler à', name: target.name } : null,
    });
  }

  /** « ! » ou « ? » au-dessus des PNJ, selon la variante de dialogue qui serait jouée. */
  private markers(): Map<string, string> {
    const markers = new Map<string, string>();
    for (const it of this.d.island.interactables()) {
      const variants = bindSelf(content.dialogues[it.def.dialogue ?? it.def.id] ?? [], it.def.id);
      const marker = variants.find((v) => this.d.progress.check(v.if))?.marker;
      if (marker) markers.set(it.def.id, marker);
    }
    return markers;
  }

  private readMove(forward: Vec2, right: Vec2): Vec2 {
    const axis = this.d.input.moveAxis();
    const move = add(scale(right, axis.x), scale(forward, axis.y));
    return length(move) > 1 ? normalize(move) : move;
  }

  private async interact(it: Interactable): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    const { progress } = this.d;
    try {
      const variants = bindSelf(content.dialogues[it.def.dialogue ?? it.def.id] ?? [], it.def.id);
      const variant = variants.find((v) => progress.check(v.if));
      if (!variant) return;
      await this.playLines(variant.lines);
      const actions = progress.apply(variant.then);
      const available = (variant.choices ?? []).filter((c) => progress.check(c.if));
      if (available.length > 0) {
        const choice = available[await this.dialogue.choose(available.map((c) => c.text))];
        actions.push(...progress.apply(choice.then));
        if (choice.reply) await this.playLines(choice.reply);
      }
      this.dialogue.close();
      await this.runActions(actions);
    } finally {
      this.dialogue.close();
      this.busy = false;
    }
  }

  private async playLines(lines: Line[]): Promise<void> {
    for (const [speakerId, text] of lines) {
      const speaker = content.speakers[speakerId] ?? { name: speakerId };
      await this.dialogue.say({ name: speaker.name, portrait: portraitUrl(speaker.sprite) }, this.d.progress.format(text));
    }
  }

  private async runActions(actions: Action[]): Promise<void> {
    for (const action of actions) {
      switch (action.kind) {
        case 'toast':
          this.screens.toast(action.text, action.tone);
          break;
        case 'shop':
          openShop(this.panels, this.ui, action.id);
          break;
        case 'forge':
          openForge(this.panels, this.ui);
          break;
        case 'chests':
          this.openChests();
          break;
        case 'dungeon':
          // Le joueur choisit le niveau du donjon avant d'y entrer.
          openDungeonEntry(this.panels, this.ui, (level) => void this.descend(level));
          break;
      }
    }
  }

  /** Les coffres gagnés en combat s'ouvrent sur la barque de Charon, comme dans Waven. */
  private openChests(): void {
    const { progress } = this.d;
    const count = progress.state.chests;
    if (count <= 0) return;
    const chest = content.chest;
    let oboles = 0;
    const materials: Record<string, number> = {};
    for (let i = 0; i < count; i++) {
      oboles += randInt(chest.oboles);
      for (let k = randInt(chest.count); k > 0; k--) {
        const id = chest.materials[Math.floor(Math.random() * chest.materials.length)];
        materials[id] = (materials[id] ?? 0) + 1;
      }
    }
    progress.state.chests = 0;
    progress.gainOboles(oboles);
    for (const [id, amount] of Object.entries(materials)) progress.gainMaterial(id, amount);
    progress.save();
    const lines = [`+${oboles} oboles`, ...Object.entries(materials).map(([id, n]) => `${n} × ${content.materials[id]}`)];
    openLoot(this.panels, `${count} coffre${count > 1 ? 's' : ''} ouvert${count > 1 ? 's' : ''}`, lines);
  }

  // --- Donjon -----------------------------------------------------------------------

  /** Descente depuis l'île, au niveau choisi à l'entrée. */
  private async descend(level: number): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    await this.enterDungeon(0, true, level);
    this.busy = false;
  }

  private async enterDungeon(startWave: number, withTransition: boolean, level: number): Promise<void> {
    const { config, dungeonRenderer, hud, islandRenderer } = this.d;
    const player = this.loadout().config;
    this.dungeonLevel = clampLevel(content.difficulty, level);
    const difficulty = difficultyFor(content.difficulty, this.dungeonLevel);
    const begin = () => {
      this.screens.hideResult();
      this.panels.close();
      this.world = new World({ ...config, player, difficulty }, startWave);
      dungeonRenderer.reset();
      hud.reset(this.dungeonLevel);
      this.run = emptyLoot();
      this.outcome = null;
      this.accumulator = 0;
      islandRenderer.hideMarkers();
      this.setMode('dungeon');
    };
    if (withTransition) await this.screens.transition('Rizières noyées', `Donjon du Yomi · niveau ${this.dungeonLevel}`, begin);
    else begin();
  }

  private updateDungeon(dt: number): void {
    const world = this.world;
    if (!world) return;
    const { input, dungeonRenderer, hud } = this.d;
    if (!this.screens.paused) {
      this.accumulator += dt;
      let steps = 0;
      while (this.accumulator >= STEP && steps < MAX_STEPS_PER_FRAME) {
        world.update(STEP, this.readCombatInput(world));
        this.accumulator -= STEP;
        steps++;
      }
      if (steps === MAX_STEPS_PER_FRAME) this.accumulator = 0;
      if (steps > 0) input.flush();
    } else {
      input.flush();
    }
    const events = world.drainEvents();
    for (const event of events) this.track(event);
    dungeonRenderer.sync(world, events, dt);
    hud.update(world, events, dt);
    dungeonRenderer.render();
    if (this.outcome) this.finishDungeon(this.outcome);
  }

  private readCombatInput(world: World): InputFrame {
    const { input, dungeonRenderer } = this.d;
    const { forward, right } = dungeonRenderer.groundBasis();
    const aim = dungeonRenderer.pickGround(input.pointer.x, input.pointer.y) ?? add(world.player.pos, world.player.facing);
    return {
      move: this.readMove(forward, right),
      aim,
      attackPressed: input.consumeClick(0),
      attackHeld: input.isButtonDown(0),
      blockHeld: input.isButtonDown(2),
      dodgePressed: input.consumeKey('Space'),
      smashPressed: input.consumeKey('KeyQ'), // touche A en AZERTY
      bondPressed: input.consumeKey('KeyE'),
      frenzyPressed: input.consumeKey('KeyR'),
    };
  }

  /** Réglages du Guerrier avec l'équipement, le niveau et les talents actuels. */
  private loadout(): Loadout {
    const { config, progress } = this.d;
    return buildLoadout(config.player, progress.state, content, progress.level);
  }

  /** Butin de la descente : tout est gardé, même en cas de défaite (GDD). Il grandit avec le niveau du donjon. */
  private track(event: GameEvent): void {
    if (event.type === 'wave') this.run.waves++;
    else if (event.type === 'end') this.outcome = event.outcome;
    else if (event.type === 'death') {
      const drop = content.drops[event.kind];
      if (!drop) return;
      const rewards = rewardsFor(content.difficulty, this.dungeonLevel);
      this.run.oboles += drop.oboles * rewards.oboles;
      this.run.xp += (drop.xp ?? 0) * rewards.xp;
      if (drop.material && Math.random() < (drop.chance ?? 1)) {
        this.run.materials[drop.material] = (this.run.materials[drop.material] ?? 0) + (drop.count ?? 1) + rewards.extraMaterials;
      }
      // Armes, reliques et objets de quête : chacun sa chance, jamais en double.
      for (const entry of drop.items ?? []) {
        const known = this.d.progress.has(entry.item) || this.run.items.includes(entry.item);
        if (!known && this.d.progress.check(entry.if) && Math.random() < Math.min(1, entry.chance * rewards.rareChance)) {
          this.run.items.push(entry.item);
          this.screens.toast(`Butin rare : ${content.items[entry.item]?.name ?? entry.item}`, 'loot');
        }
      }
    }
  }

  private finishDungeon(outcome: Outcome): void {
    const { progress } = this.d;
    this.outcome = null;
    this.setMode('result');
    const victory = outcome === 'victory';
    // Chaque combat gagné laisse un coffre ; en cas de défaite, la dernière vague n'est pas gagnée.
    const chests = Math.max(0, this.run.waves - (victory ? 0 : 1));
    const oboles = Math.round(this.run.oboles * (1 + this.loadout().bonus.oboles));
    const xp = Math.round(this.run.xp);
    progress.gainOboles(oboles);
    for (const [id, amount] of Object.entries(this.run.materials)) progress.gainMaterial(id, amount);
    for (const item of this.run.items) progress.acquire(item, content.items[item]?.slot);
    progress.state.chests += chests;
    const actions: Action[] = progress.gainXp(xp);
    let unlocked: number | undefined;
    if (victory) {
      const firstWin = progress.quest('dame') !== 'done';
      actions.push(...progress.apply([{ completeQuest: 'dame' }, { set: 'jorogumo_vaincue' }, ...(firstWin ? [{ xp: BOSS_QUEST_XP }] : [])]));
      if (progress.winDungeon(this.dungeonLevel, content.difficulty.maxLevel)) unlocked = progress.state.dungeon.unlocked;
    }
    progress.save();

    const options: MenuOption[] = victory
      ? [
          { label: 'Boutique de fin', action: () => openShop(this.panels, this.ui, 'fin') },
          { label: 'Retourner sur l’île', primary: true, action: () => void this.returnToIsland() },
        ]
      : [
          { label: 'Réessayer', action: () => void this.retry() },
          { label: 'Retourner sur l’île', primary: true, action: () => void this.returnToIsland() },
        ];
    this.screens.showResult(
      victory,
      {
        level: this.dungeonLevel,
        unlocked,
        oboles,
        xp,
        chests,
        materials: [
          ...this.run.items.map((id) => `Objet : ${content.items[id]?.name ?? id}`),
          ...Object.entries(this.run.materials).map(([id, n]) => `${n} × ${content.materials[id]}`),
        ],
      },
      options,
    );
    void this.runActions(actions);
  }

  private async retry(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    await this.enterDungeon(0, true, this.dungeonLevel);
    this.busy = false;
  }

  private async returnToIsland(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    const { island, islandRenderer, progress } = this.d;
    await this.screens.transition('Yomotsu Hirasaka', 'Retour sur l’île', () => {
      this.screens.hideResult();
      this.screens.hidePause();
      this.panels.close();
      this.world = null;
      island.placeAt(content.island.dungeonExit);
      islandRenderer.focus(island.player.pos, 0, true);
      this.setMode('island');
    });
    this.busy = false;
    if (progress.state.chests > 0) this.screens.toast('Des coffres t’attendent sur la barque de Charon.', 'loot');
  }

  // --- Pause -------------------------------------------------------------------------

  private openPause(): void {
    const options: MenuOption[] = [{ label: 'Reprendre', primary: true, action: () => this.screens.hidePause() }];
    if (this.mode === 'dungeon') {
      options.push({
        label: 'Abandonner le donjon',
        action: () => {
          this.screens.hidePause();
          this.finishDungeon('defeat');
        },
      });
    }
    options.push({
      label: 'Menu principal',
      action: () => {
        this.screens.hidePause();
        void this.backToTitle();
      },
    });
    this.screens.showPause(options);
  }

  private async backToTitle(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    await this.screens.transition('Rivages des Morts', '', () => {
      this.screens.hideResult();
      this.panels.close();
      this.world = null;
      this.d.islandRenderer.hideMarkers();
      this.showTitle();
    });
    this.busy = false;
  }

  private setMode(mode: Mode): void {
    this.mode = mode;
    document.body.dataset.mode = mode;
    this.screens.showIslandHud(mode === 'island');
  }
}
