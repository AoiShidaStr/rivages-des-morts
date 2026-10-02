import type { Engine } from '@babylonjs/core';
import { Music } from './audio/music';
import { whileHidden } from './background';
import { ENDLESS, ENDLESS_RECORD, content, endlessArenas, portraitUrl, type DungeonDef, type Line } from './content';
import type { GameConfig } from './game/config';
import { clampLevel, difficultyFor, rewardsFor, unlockAfter } from './game/difficulty';
import { arenaOf, blocOf, blocWaves, firstPalier, globalRecord, levelAt, rollEndlessItem, submitGlobalRecord } from './game/infini';
import { toWorld, type Interactable, type Island, type ScreenPoint } from './game/island';
import { Bot } from './game/bot';
import type { PlayerConfig } from './game/config';
import { buildLoadout, classWeapon, heroClass, heroLabel, levelProgress, type Loadout } from './game/loadout';
import { drawWeighted, salvage, type RolledOffer } from './game/loot';
import { add, length, normalize, scale, vec, type Vec2 } from './game/math';
import { MAX_CHARACTERS, bindSelf, type Action, type Progress } from './game/progress';
import type { GameEvent, InputFrame, Outcome } from './game/types';
import type { WorldView } from './game/view';
import { World } from './game/world';
import { InputSender, RemoteInput, idleFrame } from './net/frames';
import { MirrorWorld } from './net/mirror';
import { SNAPSHOT_EVERY, shareSnapshot, type InputPacket, type Member, type Start } from './net/protocol';
import type { CoopSession } from './net/session';
import { traffic, type Network } from './net/transport';
import type { Input } from './input';
import { heroImage, heroSprite } from './render/heroes';
import type { Hud } from './render/hud';
import type { IslandRenderer } from './render/islandRenderer';
import { AIM_HEIGHT, type Renderer } from './render/renderer';
import { openCharacters } from './ui/characters';
import { CreationScreen } from './ui/creation';
import { DialogueBox } from './ui/dialogue';
import {
  PanelHost,
  lootLine,
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
import { openCoopMenu, openLobby } from './ui/coop';
import { openEndlessEntry } from './ui/infini';
import { openOptions } from './ui/options';
import { hasUnseenNotes, latestVersion, openPatchNotes } from './ui/patchNotes';
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
  /** Objets déjà possédés tombés à nouveau : fondus en oboles et matériaux (déjà comptés ci-dessus). */
  duplicates: string[];
  waves: number;
}

const emptyLoot = (): Loot => ({ oboles: 0, xp: 0, materials: {}, items: [], duplicates: [], waves: 0 });
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
  /** `?donjon=palais` : donjon de `?vague` (tests). */
  devDungeon: string;
  /** `?coop=N` : nombre de héros, les alliés étant joués par l'ordinateur (tests de la coop sans réseau). */
  devCoop: number;
  /** Coop en ligne : Trystero (WebRTC entre navigateurs), ou `?reseau=local` entre onglets (tests). */
  network: Network;
}

/** Un allié de la descente : ses réglages, son apparence et son nom. */
interface Ally {
  config: PlayerConfig;
  sprite: string;
  name: string;
}

/** Classes des alliés joués par l'ordinateur, dans l'ordre où on les ajoute (en sautant celle du joueur). */
const ALLY_CLASSES = ['paladin', 'rodeur', 'guerrier', 'lame', 'invocateur'];
const ALLY_RACES = ['oushebti', 'demi-dieu', 'hanyo', 'einherjar'];

const randInt = ([min, max]: [number, number]) => min + Math.floor(Math.random() * (max - min + 1));

/**
 * Chef d'orchestre : écran titre, exploration de l'île, dialogues, donjon, résultats.
 * La logique du combat (World) et celle de l'île (Island) ne se connaissent pas : tout passe par ici.
 */
export class App {
  private mode: Mode = 'title';
  private world: World | null = null;
  /** Alliés joués par l'ordinateur (`?coop`), un par héros après le premier. */
  private bots: Bot[] = [];
  /**
   * Coop en ligne : la session (salon puis descentes). L'hôte fait tourner `world` ; un invité n'a que `mirror`,
   * la partie telle que l'hôte la lui décrit.
   */
  private coop: CoopSession | null = null;
  private mirror: MirrorWorld | null = null;
  private lobbyOpen = false;
  private refreshLobby: (() => void) | null = null;
  /** Numéro de la descente en coop : les paquets d'une descente précédente sont ignorés. */
  private coopRun = 0;
  /** Hôte : les commandes de chaque invité, pas de simulation, événements à envoyer. */
  private readonly remote = new Map<number, RemoteInput>();
  private hostTick = 0;
  private sentTick = 0;
  private outbox: GameEvent[] = [];
  /** Invité : événements reçus de l'hôte, pas encore montrés ; ses commandes numérotées, une par pas. */
  private inbox: GameEvent[] = [];
  private sender: InputSender | null = null;
  /** Un dialogue, une transition ou une action à plusieurs étapes est en cours. */
  private busy = false;
  private accumulator = 0;
  private last = performance.now();
  private titleAngle = 0;
  private run: Loot = emptyLoot();
  /** Boutique de fin tirée à la dernière victoire : elle reste la même tant qu'on ne redescend pas. */
  private endShop: RolledOffer[] = [];
  /** Donjon en cours, et son niveau (choisi à l'entrée). */
  private dungeon: DungeonDef = content.dungeons.rizieres;
  private dungeonLevel = 1;
  /**
   * Donjon infini en cours : le bloc joué, le dernier palier franchi, et vrai à la fin d'un bloc tant qu'on n'a pas
   * choisi d'encaisser ou de continuer. Le butin de `run` court de bloc en bloc tant qu'il n'est pas encaissé.
   */
  private endless: { bloc: number; cleared: number; awaiting: boolean } | null = null;
  /** Où l'on reparaît sur l'île en remontant (devant la cascade, après le donjon infini). */
  private exitAt: ScreenPoint | null = null;
  private outcome: Outcome | null = null;
  /** Micro-pause d'impact (hitstop) sur les coups critiques et parades majeures pour le game feel. */
  private hitstop = 0;
  private readonly dialogue: DialogueBox;
  private readonly panels: PanelHost;
  private readonly music = new Music();
  private readonly screens: Screens;
  private readonly creation: CreationScreen;
  private readonly ui: UiContext;

  constructor(private readonly d: AppDeps) {
    this.screens = new Screens(d.uiRoot);
    this.creation = new CreationScreen(d.uiRoot);
    this.dialogue = new DialogueBox(d.uiRoot);
    this.panels = new PanelHost(d.uiRoot);
    this.ui = {
      progress: d.progress,
      basePlayer: d.config.player,
      loadout: () => this.loadout(),
      toast: (text, tone, icon) => this.screens.toast(text, tone, icon),
    };
  }

  start(): void {
    if (this.d.devWave !== null && this.d.devDungeon === ENDLESS) void this.descendEndless(blocOf(content.endless, this.d.devLevel ?? 1));
    else if (this.d.devWave !== null) void this.enterDungeon(this.d.devDungeon, this.d.devWave, false, this.d.devLevel ?? 1);
    else this.showTitle();
    this.d.engine.runRenderLoop(() => this.frame());
    // Onglet caché, le navigateur n'anime plus la page : l'hôte d'une partie en coop continue pourtant le combat.
    whileHidden(() => {
      if (this.coop?.isHost && this.world && this.mode === 'dungeon') this.frame();
    });
  }

  /** Accès depuis la console, en développement. */
  debug(): object {
    const app = this;
    return {
      get world() {
        return app.world;
      },
      /** Coop en ligne : la session, et chez un invité la partie telle que l'hôte la décrit. */
      get coop() {
        return app.coop;
      },
      get mirror() {
        return app.mirror;
      },
      /** Octets échangés en coop depuis l'ouverture de la page. */
      traffic,
      get island() {
        return app.d.island;
      },
      get progress() {
        return app.d.progress;
      },
      get mode() {
        return app.mode;
      },
      get renderer() {
        return app.d.dungeonRenderer;
      },
      get islandRenderer() {
        return app.d.islandRenderer;
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
      case 'dungeon': {
        this.updateDungeon(dt);
        const view = this.world ?? this.mirror;
        this.music.play(view?.enemies.some((e) => e.boss) ? 'boss' : 'combat');
        break;
      }
      case 'result':
        if (this.world ?? this.mirror) this.d.dungeonRenderer.sync((this.world ?? this.mirror) as WorldView, [], dt);
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
      for (let n = 1; n <= 9; n++) if (key(`Digit${n}`) || key(`Numpad${n}`)) this.dialogue.pick(n - 1);
      return;
    }
    // La lettre M, où qu'elle soit : en AZERTY, la touche « KeyM » est la virgule.
    if (input.consumeTyped('m')) {
      this.music.setMuted(!this.music.settings.muted);
      this.screens.toast(this.music.settings.muted ? 'Musique coupée (M)' : 'Musique remise (M)');
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
    const characters = this.d.progress.characters();
    const last = characters[0];
    const options: MenuOption[] = [];
    if (last) {
      options.push({ label: `Continuer : ${heroLabel(content.skills, last.hero)}, niv. ${last.level}`, primary: true, action: () => this.play(last.id) });
    }
    if (last) options.push({ label: 'Coop en ligne', action: () => this.play(last.id, () => this.openCoop()) });
    options.push({ label: 'Nouveau personnage', primary: !last, action: () => this.createHero() });
    options.push({ label: last ? `Personnages (${characters.length})` : 'Importer une sauvegarde', action: () => this.openCharacters() });
    options.push({ label: hasUnseenNotes() ? 'Nouveautés •' : 'Nouveautés', action: () => openPatchNotes(this.panels, () => this.showTitle()) });
    options.push({ label: 'Options', action: () => openOptions(this.panels, this.music) });
    const record = globalRecord();
    this.screens.showTitle(options, latestVersion, record ? `Record du ${content.endless.name} : palier ${record.palier} (${record.hero})` : '');
  }

  /** Les personnages sauvegardés : en reprendre un, en créer, exporter, importer, supprimer. */
  private openCharacters(): void {
    openCharacters(
      this.panels,
      this.ui,
      {
        play: (id) => {
          this.panels.close();
          this.play(id);
        },
        create: () => {
          this.panels.close();
          this.createHero();
        },
      },
      () => this.showTitle(),
    );
  }

  /** Reprend ce personnage sur l'île ; `then` : ce qu'on fait une fois arrivé (ouvrir la coop). */
  private play(id: string, then?: () => void): void {
    if (this.d.progress.use(id)) void this.beginIsland(false).then(then);
  }

  /** Nouveau personnage, dans un emplacement libre : on choisit d'abord sa race et sa classe. */
  private createHero(): void {
    if (!this.d.progress.canCreate) {
      this.screens.toast(`${MAX_CHARACTERS} personnages au plus : supprimes-en un dans « Personnages » pour en créer un autre.`);
      return;
    }
    this.screens.hideTitle();
    this.creation.show(
      content.skills,
      content.items,
      (hero) => {
        this.d.progress.start(hero);
        void this.beginIsland(true);
      },
      () => this.showTitle(),
    );
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
      this.creation.hide();
      island.placeAt(content.island.spawn);
      this.setHero();
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
      prompt: target ? { verb: target.verb ?? 'Parler à', name: target.name } : null,
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
      const chatter = (variant.pool ?? []).filter((p) => progress.check(p.if));
      const turn = `bavardage_${it.def.dialogue ?? it.def.id}`;
      if (chatter.length > 0) await this.playLines(chatter[progress.flag(turn) % chatter.length].lines);
      const actions = progress.apply([...(chatter.length > 0 ? [{ add: [turn, 1] as [string, number] }] : []), ...(variant.then ?? [])]);
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
    for (const [speakerId, text, conditions] of lines) {
      if (!this.d.progress.check(conditions)) continue;
      const speaker = content.speakers[speakerId] ?? { name: speakerId };
      // Le héros parle avec le visage de sa race et de sa classe.
      const portrait = speaker.sprite === 'heros' ? `${import.meta.env.BASE_URL}sprites/${heroImage(this.d.progress.state.hero)}` : portraitUrl(speaker.sprite);
      await this.dialogue.say({ name: speaker.name, portrait }, this.d.progress.format(text));
    }
  }

  private async runActions(actions: Action[]): Promise<void> {
    for (const action of actions) {
      switch (action.kind) {
        case 'toast':
          this.screens.toast(action.text, action.tone, action.icon);
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
        case 'changeHero':
          await this.changeHero();
          break;
        case 'dungeon': {
          // Le joueur choisit le niveau du donjon avant d'y entrer.
          const id = action.id;
          if (id === ENDLESS) {
            openEndlessEntry(this.panels, this.ui, () => void this.descendEndless(0));
            break;
          }
          openDungeonEntry(this.panels, this.ui, content.dungeons[id], (level) => void this.descend(id, level));
          break;
        }
      }
    }
  }

  /**
   * Le moine du Rocher, comme Withers dans Baldur's Gate 3 : on reprend le choix de la race et de la classe à l'écran
   * de création. L'équipement, les oboles et les quêtes sont gardés ; les points de compétence sont rendus.
   */
  private changeHero(): Promise<void> {
    const { progress } = this.d;
    return new Promise((resolve) => {
      this.creation.show(
        content.skills,
        content.items,
        (hero) => {
          const weapon = classWeapon(content.items, progress.state, hero, content.skills);
          progress.changeHero(hero, weapon);
          this.setHero();
          this.screens.toast(`Une autre vie te revient : ${heroLabel(content.skills, hero)}. Tes points de compétence te sont rendus.`, 'quest');
          resolve();
        },
        resolve,
        progress.state.hero,
      );
    });
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
    const lines = [`+${oboles} oboles`, ...Object.entries(materials).map(([id, n]) => lootLine(id, `${n} × ${content.materials[id]}`))];
    openLoot(this.panels, `${count} coffre${count > 1 ? 's' : ''} ouvert${count > 1 ? 's' : ''}`, lines);
  }

  // --- Donjon -----------------------------------------------------------------------

  /** Descente depuis l'île, au niveau choisi à l'entrée. */
  private async descend(id: string, level: number): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    await this.enterDungeon(id, 0, true, level);
    this.busy = false;
  }

  /** Le Yomi sans fond : un bloc de 5 paliers ; `bloc` > 0 quand on continue, le butin en jeu restant le même. */
  private async descendEndless(bloc: number): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    const data = content.endless;
    const keep = bloc > 0 && this.endless !== null;
    const cleared = keep && this.endless ? this.endless.cleared : 0;
    const player = this.loadout().config;
    const allies = this.botAllies();
    const dungeon = content.dungeons[arenaOf(data, bloc)];
    const waves = blocWaves(data, content.difficulty, bloc, endlessArenas, 1 + allies.length);
    const first = firstPalier(data, bloc);
    await this.screens.transition(data.name, this.endlessSubtitle(bloc, 1 + allies.length), () => {
      const world = new World({ ...this.d.config, ...dungeon.arena, waves, player, allies: allies.map((a) => a.config), difficulty: waves[0].difficulty });
      this.world = world;
      this.mirror = null;
      this.bots = world.players.slice(1).map((hero) => new Bot(world, hero));
      this.prepareDungeon(dungeon, levelAt(data, first), allies, keep);
      this.endless = { bloc, cleared, awaiting: false };
    });
    this.busy = false;
  }

  /** « Paliers 6 à 10 · niveau 60 », sous le nom du donjon infini. */
  private endlessSubtitle(bloc: number, heroes: number): string {
    const data = content.endless;
    const first = firstPalier(data, bloc);
    return `Paliers ${first} à ${first + data.palierStep - 1} · niveau ${levelAt(data, first)}${heroes > 1 ? ` · ${heroes} héros` : ''}`;
  }

  private async enterDungeon(id: string, startWave: number, withTransition: boolean, level: number): Promise<void> {
    const { config } = this.d;
    const player = this.loadout().config;
    const allies = this.botAllies();
    const dungeon = content.dungeons[id] ?? content.dungeons.rizieres;
    this.dungeon = dungeon;
    this.endless = null;
    this.dungeonLevel = clampLevel(content.difficulty, level);
    const difficulty = difficultyFor(content.difficulty, this.dungeonLevel, 1 + allies.length, dungeon.strength);
    const begin = () => {
      const world = new World({ ...config, ...dungeon.arena, player, allies: allies.map((a) => a.config), difficulty }, startWave);
      this.world = world;
      this.mirror = null;
      this.bots = world.players.slice(1).map((hero) => new Bot(world, hero));
      this.prepareDungeon(dungeon, this.dungeonLevel, allies);
    };
    if (withTransition) await this.screens.transition(dungeon.name, `${dungeon.region} · niveau ${this.dungeonLevel}`, begin);
    else begin();
  }

  private updateDungeon(dt: number): void {
    if (this.mirror) {
      this.updateGuest(dt);
      return;
    }
    const world = this.world;
    if (!world) return;
    const { input, dungeonRenderer, hud } = this.d;
    // En ligne, le menu n'arrête pas le combat : les autres jouent encore.
    const online = this.coop !== null;
    if (this.hitstop > 0 && !online) {
      // Le monde se fige, mais les clics et les touches restent en attente : rien n'est perdu pendant la pause.
      this.hitstop = Math.max(0, this.hitstop - dt);
    } else if (online || !this.screens.paused) {
      this.accumulator += dt;
      let steps = 0;
      while (this.accumulator >= STEP && steps < MAX_STEPS_PER_FRAME) {
        const mine = this.screens.paused ? idleFrame(world.player.pos) : this.readCombatInput(world);
        if (online) {
          const now = performance.now();
          // Blocage parfait : la garde d'un invité arrive en retard d'un demi-aller-retour, sa fenêtre s'élargit d'autant.
          for (const hero of world.players.slice(1)) hero.latency = (this.remote.get(hero.id)?.ping ?? 0) / 2000;
          world.update(STEP, [mine, ...world.players.slice(1).map((hero) => this.remote.get(hero.id)?.frame(hero.pos, now) ?? idleFrame(hero.pos))]);
          this.hostTick++;
        } else {
          world.update(STEP, this.bots.length ? [mine, ...this.bots.map((bot) => bot.input())] : mine);
        }
        this.accumulator -= STEP;
        steps++;
      }
      if (steps === MAX_STEPS_PER_FRAME) this.accumulator = 0;
      if (steps > 0) input.flush();
    } else {
      input.flush();
    }
    const events = world.drainEvents();
    if (online) this.shareState(world, events);
    for (const event of events) {
      this.track(event);
      // Micro-pause d'impact, seul : en ligne, figer un joueur le décalerait des autres.
      if (online) continue;
      if (event.type === 'enemyHit' && event.crit) this.hitstop = 0.045;
      else if (event.type === 'parry' || event.type === 'perfectGuard') this.hitstop = 0.05;
      else if (event.type === 'smash') this.hitstop = 0.04;
    }
    dungeonRenderer.sync(world, events, dt);
    if (online) hud.pings = world.players.slice(1).map((hero) => this.remote.get(hero.id)?.ping);
    hud.update(world, events, dt);
    // Onglet caché : l'hôte fait avancer le combat pour ses amis, sans rien dessiner.
    if (!document.hidden) dungeonRenderer.render();
    if (this.outcome) this.finishDungeon(this.outcome);
  }

  /**
   * Donne au héros l'apparence de sa race et de sa classe, sur l'île comme au donjon : la planche du donjon se
   * charge ainsi pendant qu'on est encore sur l'île.
   */
  private setHero(): void {
    const sprite = heroSprite(this.d.progress.state.hero);
    this.d.islandRenderer.setHero(sprite);
    this.d.dungeonRenderer.setHero(sprite);
  }

  // --- Coop en ligne ---------------------------------------------------------------

  /**
   * Hôte : vingt fois par seconde, un instantané pour chaque invité (canal rapide), et les événements du combat
   * depuis le précédent (canal sûr).
   */
  private shareState(world: World, events: GameEvent[]): void {
    const session = this.coop;
    if (!session) return;
    this.outbox.push(...events);
    const ended = events.some((e) => e.type === 'end');
    if (this.hostTick - this.sentTick < SNAPSHOT_EVERY && !ended) return;
    if (this.outbox.length) session.sendEvents({ run: this.coopRun, tick: this.hostTick, events: this.outbox });
    session.sendSnapshots(shareSnapshot(world, this.hostTick), this.coopRun, (seat) => this.remote.get(seat)?.applied ?? 0);
    this.outbox = [];
    this.sentTick = this.hostTick;
  }

  /** Invité : envoie ses commandes à l'hôte, une par pas comme chez l'hôte, et montre la partie telle qu'il la décrit. */
  private updateGuest(dt: number): void {
    const mirror = this.mirror;
    const session = this.coop;
    if (!mirror) return;
    const { input, dungeonRenderer, hud } = this.d;
    const now = performance.now();
    this.accumulator += dt;
    let steps = 0;
    let packet: InputPacket | null = null;
    while (this.accumulator >= STEP && steps < MAX_STEPS_PER_FRAME) {
      const frame = this.screens.paused ? idleFrame(mirror.player.pos) : this.readCombatInput(mirror);
      if (this.sender) {
        packet = this.sender.next(frame, session?.ping ?? 0);
        mirror.record(packet.seq, frame);
      }
      this.accumulator -= STEP;
      steps++;
    }
    if (steps === MAX_STEPS_PER_FRAME) this.accumulator = 0;
    if (steps > 0) input.flush();
    // La dernière commande suffit : elle porte la direction du moment et le compte de tous les appuis.
    if (packet) session?.sendInput(packet);
    mirror.update(now);
    const events = this.inbox;
    this.inbox = [];
    for (const event of events) this.track(event);
    if (mirror.ready) {
      dungeonRenderer.sync(mirror, events, dt);
      // Le ping qui compte pour un invité : celui vers l'hôte, affiché sur sa barre.
      hud.pings = mirror.players.filter((hero) => hero.id !== mirror.seat).map((hero) => (hero.id === 0 ? session?.ping : undefined));
      hud.update(mirror, events, dt);
    }
    dungeonRenderer.render();
    if (this.outcome) this.finishDungeon(this.outcome);
  }

  /** Ouvre la coop : le salon si on est déjà dans une partie, sinon créer ou rejoindre. */
  private openCoop(): void {
    if (this.coop) {
      this.showLobby();
      return;
    }
    openCoopMenu(this.panels, {
      progress: this.d.progress,
      network: this.d.network,
      member: (name) => this.member(name),
      opened: (session) => this.joinSession(session),
      toast: (text) => this.screens.toast(text),
    });
  }

  /** Ce héros, tel qu'on le présente au salon ; `name` : le pseudo (sinon celui déjà donné). */
  private member(name?: string): Member {
    if (name !== undefined) this.memberName = name;
    const hero = this.d.progress.state.hero;
    return {
      name: name ?? this.memberName,
      race: hero.race,
      cls: hero.class,
      level: this.d.progress.level,
      sprite: heroSprite(hero),
      config: this.loadout().config,
    };
  }

  /** Pseudo choisi en ouvrant la coop. */
  private memberName = '';

  private joinSession(session: CoopSession): void {
    this.coop = session;
    session.handlers = {
      lobby: (lobby) => {
        if (!session.isHost && !lobby.inGame && this.endless?.awaiting) this.bankEndless();
        if (this.lobbyOpen) this.refreshLobby?.();
      },
      start: (start) => void this.startCoop(start),
      state: (snap) => this.mirror?.push(snap, performance.now()),
      events: (packet) => {
        if (this.mirror && packet.run === this.mirror.run) this.inbox.push(...packet.events);
      },
      input: (seat, packet) => this.remote.get(seat)?.receive(packet, performance.now()),
      left: (seat) => this.world?.retire(seat),
      closed: (reason) => this.sessionClosed(session, reason),
    };
    this.showLobby();
  }

  private showLobby(): void {
    const session = this.coop;
    if (!session) return;
    this.lobbyOpen = true;
    this.refreshLobby = openLobby(this.panels, session, this.d.progress, {
      launch: () => {
        if (session.isHost && session.allReady) void this.startCoop(session.start(this.member()));
      },
      quit: () => {
        this.panels.close();
        session.leave();
      },
      ready: (ready) => session.setReady(ready, this.member()),
      closed: () => {
        this.lobbyOpen = false;
      },
    });
  }

  /** La session est finie : on l'a quittée, ou l'hôte est parti. Un invité en pleine descente garde son butin. */
  private sessionClosed(session: CoopSession, reason: string): void {
    if (this.coop !== session) return;
    this.coop = null;
    if (this.lobbyOpen) this.panels.close();
    if (reason) this.screens.toast(reason);
    if (this.mode === 'dungeon' && this.mirror && !this.outcome) this.finishDungeon('defeat');
  }

  /** Une descente à plusieurs commence : l'hôte fait tourner le combat, les invités l'affichent. */
  private async startCoop(start: Start): Promise<void> {
    const session = this.coop;
    if (!session) return;
    // Un dialogue ou une transition en cours : on descend dès qu'ils sont finis.
    if (this.busy || this.dialogue.open) {
      window.setTimeout(() => void this.startCoop(start), 250);
      return;
    }
    this.busy = true;
    // Donjon infini : `start.level` est le premier palier du bloc ; on garde le butin en jeu d'un bloc à l'autre.
    const data = content.endless;
    const endless = start.dungeon === ENDLESS;
    const bloc = endless ? blocOf(data, start.level) : 0;
    const keep = endless && bloc > 0 && this.endless !== null;
    const cleared = keep && this.endless ? this.endless.cleared : 0;
    const dungeon = endless ? content.dungeons[arenaOf(data, bloc)] : (content.dungeons[start.dungeon] ?? content.dungeons.rizieres);
    const level = endless ? levelAt(data, start.level) : clampLevel(content.difficulty, start.level);
    const configs = start.heroes.map((hero) => hero.config);
    const others = start.heroes.filter((_, seat) => seat !== start.seat);
    const title = endless ? data.name : dungeon.name;
    const subtitle = endless ? this.endlessSubtitle(bloc, start.heroes.length) : `${dungeon.region} · niveau ${level} · ${start.heroes.length} héros`;
    await this.screens.transition(title, subtitle, () => {
      this.coopRun = start.run;
      if (session.isHost) {
        const waves = endless ? blocWaves(data, content.difficulty, bloc, endlessArenas, configs.length) : null;
        const difficulty = waves ? waves[0].difficulty : difficultyFor(content.difficulty, level, configs.length, dungeon.strength);
        this.world = new World({ ...this.d.config, ...dungeon.arena, ...(waves ? { waves } : {}), player: configs[0], allies: configs.slice(1), difficulty });
        this.mirror = null;
        this.remote.clear();
        for (let seat = 1; seat < configs.length; seat++) this.remote.set(seat, new RemoteInput(start.run));
        this.hostTick = 0;
        this.sentTick = 0;
        this.outbox = [];
      } else {
        this.world = null;
        const arena = { halfSize: dungeon.arena.arenaHalfSize, webSlow: dungeon.arena.webs.slowFactor, webBurnTime: dungeon.arena.webs.burnTime };
        this.mirror = new MirrorWorld(configs, start.seat, start.run, arena, level);
        this.sender = new InputSender(start.run);
        this.inbox = [];
      }
      this.bots = [];
      this.prepareDungeon(dungeon, level, others, keep);
      this.endless = endless ? { bloc, cleared, awaiting: false } : null;
    });
    this.busy = false;
  }

  /** Remet l'affichage à neuf pour une descente : décor, héros, alliés, HUD. */
  private prepareDungeon(dungeon: DungeonDef, level: number, allies: { sprite: string; name: string }[], keepLoot = false): void {
    const { dungeonRenderer, hud, islandRenderer } = this.d;
    this.screens.hideResult();
    this.panels.close();
    this.dungeon = dungeon;
    this.dungeonLevel = level;
    dungeonRenderer.reset();
    this.setHero();
    dungeonRenderer.setAllies(allies);
    hud.setAllies(allies.map((a) => a.name));
    dungeonRenderer.setStyle(dungeon.style);
    hud.reset(level, dungeon.boss);
    hud.configure(heroClass(content.skills, this.d.progress.state.hero));
    if (!keepLoot) this.run = emptyLoot();
    this.outcome = null;
    this.accumulator = 0;
    this.hitstop = 0;
    islandRenderer.hideMarkers();
    this.setMode('dungeon');
  }

  private readCombatInput(world: WorldView): InputFrame {
    const { input, dungeonRenderer } = this.d;
    const { forward, right } = dungeonRenderer.groundBasis();
    const { x, y } = input.pointer;
    const fallback = add(world.player.pos, world.player.facing);
    return {
      move: this.readMove(forward, right),
      aim: dungeonRenderer.pickGround(x, y, AIM_HEIGHT) ?? fallback,
      aimGround: dungeonRenderer.pickGround(x, y) ?? fallback,
      attackPressed: input.consumeClick(0),
      attackHeld: input.isButtonDown(0),
      signatureHeld: input.isButtonDown(2),
      signaturePressed: input.consumeClick(2),
      dodgePressed: input.consumeKey('Space'),
      skillAPressed: input.consumeKey('KeyQ'), // touche A en AZERTY
      skillEPressed: input.consumeKey('KeyE'),
      skillRPressed: input.consumeKey('KeyR'),
    };
  }

  /**
   * `?coop=N` : les alliés joués par l'ordinateur, au niveau du héros, avec l'arme de départ de leur classe
   * et sans talents.
   */
  private botAllies(): Ally[] {
    const { config, progress } = this.d;
    const classes = ALLY_CLASSES.filter((c) => c !== progress.state.hero.class);
    return classes.slice(0, this.d.devCoop - 1).map((cls, i) => {
      const hero = { race: ALLY_RACES[i % ALLY_RACES.length], class: cls };
      const weapon = content.skills.classes[cls].weapon;
      const state = { ...progress.state, hero, talents: [], equipped: { arme: weapon }, items: [weapon], itemLevels: {} };
      const name = `${content.skills.classes[cls].name} (ordinateur)`;
      return { config: buildLoadout(config.player, state, content, progress.level).config, sprite: heroSprite(hero), name };
    });
  }

  /** Réglages du héros avec sa race, sa classe, l'équipement, le niveau et les talents actuels. */
  private loadout(): Loadout {
    const { config, progress } = this.d;
    return buildLoadout(config.player, progress.state, content, progress.level);
  }

  /** Butin de la descente : tout est gardé, même en cas de défaite (GDD). Il grandit avec le niveau du donjon. */
  private track(event: GameEvent): void {
    if (event.type === 'wave') {
      this.run.waves++;
      // Donjon infini : la vague d'un palier, c'est le palier d'avant franchi.
      if (this.endless && event.palier) {
        this.dungeonLevel = levelAt(content.endless, event.palier);
        this.recordEndless(event.palier - 1);
      }
    } else if (event.type === 'end') this.outcome = event.outcome;
    else if (event.type === 'death') {
      const drop = content.drops[event.kind];
      if (!drop) return;
      const rewards = rewardsFor(content.difficulty, this.dungeonLevel);
      this.run.oboles += drop.oboles * rewards.oboles;
      this.run.xp += (drop.xp ?? 0) * rewards.xp;
      if (drop.material && Math.random() < (drop.chance ?? 1)) {
        this.run.materials[drop.material] = (this.run.materials[drop.material] ?? 0) + (drop.count ?? 1) + rewards.extraMaterials;
      }
      // Armes, reliques et objets de quête : chacun sa chance (GDD, drops à la Warframe).
      // Un objet déjà possédé est fondu en ressources plutôt que perdu.
      for (const entry of drop.items ?? []) {
        if (!this.d.progress.check(entry.if) || Math.random() >= Math.min(1, entry.chance * rewards.rareChance)) continue;
        this.gainRunItem(entry.item);
      }
    }
  }

  /** Un objet rejoint le butin de la descente ; déjà possédé, il est fondu en ressources plutôt que perdu. */
  private gainRunItem(id: string, label = 'Butin rare'): void {
    const def = content.items[id];
    if (!def) return;
    if (!this.d.progress.has(id) && !this.run.items.includes(id)) {
      this.run.items.push(id);
      this.screens.toast(`${label} : ${def.name}`, 'loot', id);
    } else if (def.slot) {
      const s = salvage(content.duplicates, content.upgrade, def);
      this.run.duplicates.push(id);
      this.run.oboles += s.oboles;
      if (s.material) this.run.materials[s.material] = (this.run.materials[s.material] ?? 0) + s.count;
      this.screens.toast(`Doublon : ${def.name}, fondu en ressources`, 'loot', id);
    }
  }

  /** Ce que rapporte le butin de la descente : chaque combat gagné laisse un coffre (pas la vague perdue). */
  private runTotals(victory: boolean): { oboles: number; xp: number; chests: number; materials: (string | Node)[] } {
    return {
      chests: Math.max(0, this.run.waves - (victory ? 0 : 1)),
      oboles: Math.round(this.run.oboles * (1 + this.loadout().bonus.oboles)),
      xp: Math.round(this.run.xp),
      materials: [
        ...this.run.items.map((id) => lootLine(id, `Objet : ${content.items[id]?.name ?? id}`)),
        ...this.duplicateLines(),
        ...Object.entries(this.run.materials).map(([id, n]) => lootLine(id, `${n} × ${content.materials[id]}`)),
      ],
    };
  }

  /** Le butin de la descente rejoint la progression ; renvoie les actions de l'expérience gagnée. */
  private grantRun(victory: boolean): Action[] {
    const { progress } = this.d;
    const { oboles, xp, chests } = this.runTotals(victory);
    progress.gainOboles(oboles);
    for (const [id, amount] of Object.entries(this.run.materials)) progress.gainMaterial(id, amount);
    for (const item of this.run.items) progress.acquire(item, content.items[item]?.slot);
    progress.state.chests += chests;
    return progress.gainXp(xp);
  }

  private finishDungeon(outcome: Outcome): void {
    if (this.endless) {
      this.finishEndless(outcome);
      return;
    }
    const { progress } = this.d;
    this.outcome = null;
    this.setMode('result');
    const victory = outcome === 'victory';
    const totals = this.runTotals(victory);
    const actions = this.grantRun(victory);
    let unlocked: number | undefined;
    const dungeon = this.dungeon;
    if (victory) {
      const firstWin = progress.check(dungeon.firstVictory.if);
      actions.push(...progress.apply([...dungeon.onVictory, ...(firstWin ? dungeon.firstVictory.then : [])]));
      if (progress.winDungeon(dungeon.id, this.dungeonLevel, unlockAfter(content.difficulty, this.dungeonLevel))) unlocked = progress.dungeon(dungeon.id).unlocked;
      this.endShop = this.rollEndShop(dungeon.shop);
    }
    progress.save();

    const session = this.coop;
    if (session?.isHost) session.backToLobby();
    const options: MenuOption[] = session
      ? [
          ...(victory ? [{ label: 'Boutique de fin', action: () => openShop(this.panels, this.ui, dungeon.shop, this.endShop) }] : []),
          {
            label: 'Quitter la coop',
            action: () => {
              session.leave();
              void this.returnToIsland();
            },
          },
          { label: 'Retour au salon', primary: true, action: () => void this.returnToIsland().then(() => this.showLobby()) },
        ]
      : victory
      ? [
          { label: 'Boutique de fin', action: () => openShop(this.panels, this.ui, dungeon.shop, this.endShop) },
          { label: 'Retourner sur l’île', primary: true, action: () => void this.returnToIsland() },
        ]
      : [
          { label: 'Réessayer', action: () => void this.retry() },
          { label: 'Retourner sur l’île', primary: true, action: () => void this.returnToIsland() },
        ];
    this.screens.showResult(
      victory,
      {
        place: dungeon.name,
        victory: dungeon.victory,
        level: this.dungeonLevel,
        unlocked,
        ...totals,
      },
      options,
    );
    void this.runActions(actions);
  }

  // --- Donjon infini -----------------------------------------------------------------

  /**
   * Fin d'un bloc du Yomi sans fond. Gagné : l'objet du palier rejoint le butin, puis on choisit d'encaisser ou de
   * continuer (en coop, c'est l'hôte qui choisit ; un invité peut encaisser et partir). Perdu : tout le butin en jeu.
   */
  private finishEndless(outcome: Outcome): void {
    const endless = this.endless;
    if (!endless) return;
    const data = content.endless;
    const { progress } = this.d;
    this.outcome = null;
    this.setMode('result');
    const session = this.coop;
    const last = firstPalier(data, endless.bloc) + data.palierStep - 1;

    if (outcome === 'victory') {
      const record = this.recordEndless(last);
      const item = rollEndlessItem(data, last, content.items, progress.state.hero, content.skills, (id) => progress.has(id) || this.run.items.includes(id));
      if (item) this.gainRunItem(item, `Palier ${last}`);
      endless.awaiting = true;
      const next = endless.bloc + 1;
      const nextFirst = firstPalier(data, next);
      const nextLast = nextFirst + data.palierStep - 1;
      const guest = session !== null && !session.isHost;
      const options: MenuOption[] = guest
        ? [
            {
              label: 'Encaisser et quitter la coop',
              action: () => {
                session.leave();
                this.bankEndless();
              },
            },
          ]
        : [
            { label: 'Encaisser et remonter', action: () => this.bankEndless() },
            { label: `Continuer : paliers ${nextFirst} à ${nextLast}`, primary: true, action: () => this.continueEndless(next) },
          ];
      const levels = levelAt(data, nextLast) > levelAt(data, nextFirst) ? `niveau ${levelAt(data, nextFirst)}, puis ${levelAt(data, nextLast)} au boss` : `niveau ${levelAt(data, nextFirst)}`;
      this.screens.showResult(
        true,
        {
          place: data.name,
          level: levelAt(data, last),
          subtitle: `${data.name} · palier ${last}${record ? ' · nouveau record !' : ''}`,
          victory: {
            title: `Palier ${last} franchi`,
            text: guest
              ? 'L’hôte choisit : continuer plus bas ou encaisser. Tu peux aussi encaisser tout de suite et quitter la coop.'
              : `Encaisse ton butin et remonte, ou continue plus bas (${levels}). Si tu tombes, tu perds tout ce qui n’est pas encaissé.`,
          },
          lootTitle: 'Butin en jeu, pas encore encaissé',
          ...this.runTotals(true),
        },
        options,
      );
      return;
    }

    // Tombé : le Yomi garde tout ce qui n'a pas été encaissé.
    const totals = this.runTotals(false);
    this.endless = null;
    this.exitAt = data.exit;
    if (session?.isHost) session.backToLobby();
    const best = progress.state.flags[ENDLESS_RECORD] ?? 0;
    this.screens.showResult(
      false,
      {
        place: data.name,
        level: this.dungeonLevel,
        subtitle: `Tombé au palier ${endless.cleared + 1} · ton record : palier ${best}`,
        victory: data.victory,
        defeat: { title: 'Le Yomi te garde', text: data.defeat },
        lootTitle: 'Butin perdu',
        ...totals,
      },
      this.afterEndlessOptions(),
    );
  }

  /** Encaisser : le butin en jeu rejoint la progression, et l'on remonte. */
  private bankEndless(): void {
    const endless = this.endless;
    if (!endless) return;
    const data = content.endless;
    const totals = this.runTotals(true);
    const actions = this.grantRun(true);
    this.d.progress.save();
    this.endless = null;
    this.exitAt = data.exit;
    const session = this.coop;
    if (session?.isHost) session.backToLobby();
    this.screens.showResult(
      true,
      {
        place: data.name,
        level: this.dungeonLevel,
        subtitle: `${data.name} · encaissé au palier ${endless.cleared}`,
        victory: data.victory,
        ...totals,
      },
      this.afterEndlessOptions(),
    );
    void this.runActions(actions);
  }

  /** Continuer plus bas : en solo, le bloc suivant ; en coop, l'hôte relance tout le monde. */
  private continueEndless(bloc: number): void {
    const session = this.coop;
    if (!session) {
      void this.descendEndless(bloc);
      return;
    }
    if (!session.isHost) return;
    session.choose(ENDLESS, firstPalier(content.endless, bloc));
    void this.startCoop(session.start(this.member()));
  }

  private afterEndlessOptions(): MenuOption[] {
    const session = this.coop;
    if (!session) return [{ label: 'Retourner sur l’île', primary: true, action: () => void this.returnToIsland() }];
    return [
      {
        label: 'Quitter la coop',
        action: () => {
          session.leave();
          void this.returnToIsland();
        },
      },
      { label: 'Retour au salon', primary: true, action: () => void this.returnToIsland().then(() => this.showLobby()) },
    ];
  }

  /** Retient le palier franchi : record du personnage, et record de tous les personnages. Vrai si le premier est battu. */
  private recordEndless(palier: number): boolean {
    const endless = this.endless;
    if (!endless || palier <= endless.cleared) return false;
    endless.cleared = palier;
    const { progress } = this.d;
    const best = progress.state.flags[ENDLESS_RECORD] ?? 0;
    submitGlobalRecord(palier, `${heroLabel(content.skills, progress.state.hero)}, niv. ${progress.level}`);
    if (palier <= best) return false;
    progress.state.flags[ENDLESS_RECORD] = palier;
    progress.save();
    return true;
  }

  /** « Doublon fondu : Katana de rōnin ×2 (+80 oboles, +6 Écaille de kappa) », un par objet. */
  private duplicateLines(): HTMLElement[] {
    const counts = new Map<string, number>();
    for (const id of this.run.duplicates) counts.set(id, (counts.get(id) ?? 0) + 1);
    return [...counts].map(([id, n]) => {
      const def = content.items[id];
      const s = salvage(content.duplicates, content.upgrade, def);
      const gain = [`+${s.oboles * n} oboles`, s.material ? `+${s.count * n} ${content.materials[s.material]}` : null].filter(Boolean).join(', ');
      return lootLine(id, `Doublon fondu : ${def.name}${n > 1 ? ` ×${n}` : ''} (${gain})`);
    });
  }

  /**
   * Boutique de fin (GDD, comme dans Waven) : tirée au hasard à chaque victoire parmi les objets et
   * ressources du donjon. Jamais un objet déjà possédé ; les lots de matériaux complètent l'offre.
   */
  private rollEndShop(shopId: string): RolledOffer[] {
    const shop = content.shops[shopId];
    const { progress } = this.d;
    const eligible = (shop?.pool ?? []).filter((e) => progress.check(e.if) && !(e.item && progress.has(e.item)));
    const limits = shop?.offers ?? { items: 2, total: 4 };
    const items = drawWeighted(eligible.filter((e) => e.item), limits.items);
    const bundles = drawWeighted(eligible.filter((e) => e.material), limits.total - items.length);
    return [...items, ...bundles].map(({ weight: _weight, if: _if, ...offer }) => offer);
  }

  private async retry(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    await this.enterDungeon(this.dungeon.id, 0, true, this.dungeonLevel);
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
      this.mirror = null;
      island.placeAt(this.exitAt ?? this.dungeon.exit ?? content.island.dungeonExit);
      this.exitAt = null;
      this.setHero();
      islandRenderer.focus(island.player.pos, 0, true);
      this.setMode('island');
    });
    this.busy = false;
    if (progress.state.chests > 0) this.screens.toast('Des coffres t’attendent sur la barque de Charon.', 'loot');
  }

  // --- Pause -------------------------------------------------------------------------

  private openPause(): void {
    const options: MenuOption[] = [{ label: 'Reprendre', primary: true, action: () => this.screens.hidePause() }];
    const session = this.coop;
    if (this.mode === 'dungeon') {
      options.push({
        label: session ? 'Quitter la partie en coop' : 'Abandonner le donjon',
        action: () => {
          this.screens.hidePause();
          session?.leave();
          if (this.mode === 'dungeon' && !this.outcome) this.finishDungeon('defeat');
        },
      });
    } else if (this.mode === 'island') {
      options.push({
        label: session ? 'Salon coop' : 'Coop en ligne',
        action: () => {
          this.screens.hidePause();
          this.openCoop();
        },
      });
    }
    options.push({ label: 'Options', action: () => openOptions(this.panels, this.music) });
    options.push({
      label: 'Menu principal',
      action: () => {
        this.screens.hidePause();
        void this.backToTitle();
      },
    });
    // Les compétences de la classe du héros ; E sert aussi à parler sur l'île.
    const cls = heroClass(content.skills, this.d.progress.state.hero);
    const skills = cls.actives.map((a): [string, string] => [a.key, `${a.name.toLowerCase()}${a.key === 'E' ? ' (au combat)' : ''}`]);
    this.screens.showPause(options, skills, cls.kit === 'rodeur');
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
    if (mode === 'title') this.music.play('menu');
    else if (mode === 'island') this.music.play('ile');
    document.body.dataset.mode = mode;
    this.screens.showIslandHud(mode === 'island');
  }
}
