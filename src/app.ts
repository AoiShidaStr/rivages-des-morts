import type { Engine } from '@babylonjs/core';
import { Music } from './audio/music';
import { whileHidden } from './background';
import { ENDLESS, ENDLESS_RECORD, content, endlessArenas, portraitUrl, type DungeonDef, type Line } from './content';
import liens from './data/liens.json';
import type { GameConfig } from './game/config';
import { clampLevel, dungeonDifficultyFor, rewardsFor, unlockAfter } from './game/difficulty';
import { rollSeal, type Gravure } from './game/gravure';
import { arenaOf, blocOf, blocWaves, firstPalier, globalRecord, isBoss, levelAt, pacteDraft, rollEndlessItem, submitGlobalRecord, type EndlessModifierSeed } from './game/infini';
import { toScreen, toWorld, type Interactable, type Island, type ScreenPoint } from './game/island';
import { Bot } from './game/bot';
import type { PlayerConfig } from './game/config';
import { duelLoadout, duelState } from './game/pvp';
import { buildLoadout, classWeapon, equipBlock, heroClass, heroLabel, heroSubclass, levelProgress, type Loadout } from './game/loadout';
import { drawWeighted, type RolledOffer } from './game/loot';
import { add, length, normalize, scale, vec, type Vec2 } from './game/math';
import { MAX_CHARACTERS, STARTING_WEAPON, bindSelf, type Action, type Hero, type Progress, type ProgressState } from './game/progress';
import type { GameEvent, InputFrame, Outcome } from './game/types';
import type { WorldView } from './game/view';
import { World } from './game/world';
import { InputSender, RemoteInput, idleFrame } from './net/frames';
import { MirrorWorld } from './net/mirror';
import { DuelNet } from './net/rollback';
import { setRandomState } from './game/rng';
import { SNAPSHOT_EVERY, shareSnapshot, type InputPacket, type Member, type Start } from './net/protocol';
import { IslandPresence, sharedIsland, type Profile } from './net/presence';
import { CoopSession, DUEL } from './net/session';
import { SocialClient, type Goods } from './net/social';
import { restartWith, type AccountSaveStore } from './net/account';
import { serverClock, traffic, type Network } from './net/transport';
import { noteFrame, setPlace, startMeasures, type Place } from './net/mesures';
import type { Input } from './input';
import { heroImage, heroSprite } from './render/heroes';
import type { Hud } from './render/hud';
import type { IslandRenderer } from './render/islandRenderer';
import { AIM_HEIGHT, type Renderer } from './render/renderer';
import { AdaptiveResolution } from './render/resolution';
import { openAccount } from './ui/account';
import { openCharacters } from './ui/characters';
import { CreationScreen } from './ui/creation';
import { DialogueBox } from './ui/dialogue';
import {
  PanelHost,
  lootLine,
  openDungeonEntry,
  openForge,
  openInventory,
  openBuilds,
  openLoot,
  openPactDraft,
  openQuests,
  openRecords,
  openShop,
  openSkills,
  openSubclass,
  openTrainingTrial,
  trackedQuest,
  type TrialChoice,
  type UiContext,
} from './ui/panels';
import { openCoopMenu, openDuelMenu, openLobby, pseudo } from './ui/coop';
import { ChatBox, openSocial } from './ui/social';
import { openMarket, openPlayerShop, openTrade } from './ui/trade';
import { describeLot, give, receive } from './game/trade';
import { openEndlessEntry } from './ui/infini';
import { logRun, markSeen } from './game/journal';
import { landSeal, stockItem } from './game/reserve';
import { wearEquipped } from './game/durabilite';
import { SFX_DES_EVENTS, Sfx, type SfxId } from './audio/sfx';
import sfxData from './data/sfx.json';
import { Ambiance } from './audio/ambiance';
import { openOptions } from './ui/options';
import { PingBadge, type PingView } from './ui/ping';
import { hasUnseenNotes, latestVersion, openPatchNotes } from './ui/patchNotes';
import { Screens, type MenuOption } from './ui/screens';

type Mode = 'title' | 'island' | 'dungeon' | 'result';

/** La simulation du combat avance par pas fixes, quelle que soit la fréquence de l'écran. */
const STEP = 1 / 60;
const MAX_STEPS_PER_FRAME = 5;
/** Sans réponse du serveur depuis ce délai (ms, trois pings manqués), le badge de ping dit la connexion perdue. */
const LOST_AFTER = 6_000;

/**
 * Micro-pause d'impact (secondes) qu'appelle un événement : le monde se fige un instant pour que le coup se sente.
 * Critiques, parades et Frappe fracassante comme avant ; s'y ajoutent la mort d'un yokai (plus longue pour un boss)
 * et les gros coups reçus (tout coup d'un boss, ou plus de 15 % des PV).
 */
function hitstopFor(event: GameEvent, world: WorldView): number {
  switch (event.type) {
    case 'enemyHit':
      return event.crit ? 0.045 : 0;
    case 'parry':
    case 'perfectGuard':
      return 0.05;
    case 'smash':
      return 0.04;
    case 'death':
      return isBoss(event.kind) ? 0.12 : 0.05;
    case 'playerHit': {
      if (event.hero !== world.player.id || event.blocked) return 0;
      const big = event.amount >= world.player.cfg.maxHp * 0.15 || world.enemies.some((enemy) => enemy.boss);
      return big ? 0.07 : 0;
    }
    default:
      return 0;
  }
}
/** Centre du village, survolé par la caméra derrière l'écran titre. */
const TITLE_ORBIT = { u: -4, v: 1, radius: 5, speed: 0.07 };
/** Terrain d'entraînement : fenêtre du DPS affiché, en secondes de combat. */
const DPS_WINDOW = 5;
/** Une foulée sur l'île (s) : un pas qui sonne selon le sol. */
const STRIDE_S = 0.38;
/** Durée du koto qui ouvre le Yomi sans fond : la musique du combat se tait pendant ce temps. */
const KOTO_MS = 3500;

interface Loot {
  oboles: number;
  xp: number;
  materials: Record<string, number>;
  items: string[];
  /** Objets déjà possédés tombés à nouveau : fondus en oboles et matériaux (déjà comptés ci-dessus). */
  duplicates: string[];
  waves: number;
  /** Sceaux du Yomi gagnés dans la descente : la première gravure d'une arme, gardée en jeu jusqu'à l'encaissement. */
  seals: { item: string; gravure: Gravure }[];
}

const emptyLoot = (): Loot => ({ oboles: 0, xp: 0, materials: {}, items: [], duplicates: [], waves: 0, seals: [] });
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
  /** `?duel` : un duel d'entraînement dès le chargement (tests), contre la classe donnée (`?duel=lame`) ou au hasard. */
  devDuel: string | null;
  /** Coop en ligne : Trystero (WebRTC entre navigateurs), le serveur du jeu (`?reseau=serveur`), ou `?reseau=local` entre onglets (tests). */
  network: Network;
  /** Le compte connecté (jeu servi par son serveur), ou null : les personnages sont alors ceux du navigateur. */
  account: AccountSaveStore | null;
  /** Le jeu est servi par son serveur : on peut se connecter à un compte. */
  accounts: boolean;
  /** Messages à montrer au démarrage (compte injoignable…). */
  notices: string[];
}

/** Un allié de la descente : ses réglages, son apparence et son nom. */
interface Ally {
  config: PlayerConfig;
  sprite: string;
  name: string;
}

/** Classes des alliés joués par l'ordinateur, dans l'ordre où on les ajoute (en sautant celle du joueur). */
const ALLY_CLASSES = ['paladin', 'rodeur', 'guerrier', 'lame', 'sorcier'];
const ALLY_RACES = ['oushebti', 'demi-dieu', 'hanyo', 'einherjar'];

const randInt = ([min, max]: [number, number]) => min + Math.floor(Math.random() * (max - min + 1));

/**
 * Chef d'orchestre : écran titre, exploration de l'île, dialogues, donjon, résultats.
 * La logique du combat (World) et celle de l'île (Island) ne se connaissent pas : tout passe par ici.
 */
/** `?lieu=35,27` (tests, captures) : le héros arrive sur l'île en ce point (u, v) au lieu du ponton de Charon. */
function devPlace(): { u: number; v: number } | null {
  const [u, v] = (new URLSearchParams(location.search).get('lieu') ?? '').split(',').map(Number);
  return Number.isFinite(u) && Number.isFinite(v) ? { u, v } : null;
}

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
  /** Duel en ligne : chacun des deux joueurs fait tourner le combat, en netcode à rollback (src/net/rollback.ts). */
  private duelNet: DuelNet | null = null;
  private lobbyOpen = false;
  private refreshLobby: (() => void) | null = null;
  /** Numéro de la descente en coop : les paquets d'une descente précédente sont ignorés. */
  private coopRun = 0;
  /** Hôte : les commandes de chaque invité, pas de simulation, événements à envoyer. */
  private readonly remote = new Map<number, RemoteInput>();
  private hostTick = 0;
  private sentTick = 0;
  /** Pas du dernier envoi des pings des invités. */
  private pingsTick = 0;
  private outbox: GameEvent[] = [];
  /** Invité : événements reçus de l'hôte, pas encore montrés ; ses commandes numérotées, une par pas. */
  private inbox: GameEvent[] = [];
  private sender: InputSender | null = null;
  /** Un dialogue, une transition ou une action à plusieurs étapes est en cours. */
  private busy = false;
  private accumulator = 0;
  private last = performance.now();
  private readonly resolution: AdaptiveResolution;
  /** Descente en préparation : les planches de ses yokai se chargent, le combat attend (prepareDungeon). */
  private preparing: Promise<void> | null = null;
  private titleAngle = 0;
  private run: Loot = emptyLoot();
  /** Les sons courts (SFX) : les événements de combat et les gains d'objets ; les musiques restent celles des amis. */
  private readonly sfx: Sfx = new Sfx();
  private readonly ambiance = new Ambiance(this.sfx.settings);
  /** Temps avant le prochain pas dans l'eau (s). */
  private stride = 0;
  /** Le Rôdeur bandait son arc au pas précédent (le son part au début de la charge). */
  private drawing = false;
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
  /** Les pactes scellés dans la descente en cours du Yomi sans fond (un de plus à chaque bloc à partir du palier 51). */
  private pactesEncours: EndlessModifierSeed[] = [];
  /** Où l'on reparaît sur l'île en remontant (devant la cascade, après le donjon infini). */
  private exitAt: ScreenPoint | null = null;
  private outcome: Outcome | null = null;
  /** Terrain d'entraînement : dégâts portés au mannequin depuis l'entrée, et leurs instants (DPS glissant). */
  private trainingStats: { start: number; total: number; hits: { t: number; amount: number }[] } | null = null;
  /**
   * La classe et la voie que le billot prête pour la séance (`null` : le vrai héros). Rien n'en touche la sauvegarde :
   * c'est un essai, et il est oublié en sortant de l'arène ou en descendant dans un vrai donjon.
   */
  private trainingHero: Hero | null = null;
  /** Un dialogue a demandé le terrain d'entraînement : on y descend une fois le dialogue refermé. */
  private pendingTraining = false;
  /** Tetsu ouvre l'arène des duels : on y descend une fois le dialogue refermé. */
  private pendingDuel = false;
  /**
   * Duel en cours : le nom et la classe de l'adversaire (null hors duel). `online` : contre un autre joueur, dans un
   * salon à code ; sinon contre une ombre jouée par l'ordinateur (`?duel`, pour les tests).
   */
  private duelMatch: { opponent: string; cls: string; online: boolean } | null = null;
  /** Duel : manches gagnées par chaque héros, d'après le dernier point marqué. */
  private duelWins: number[] = [0, 0];
  /** Duel en ligne : la durée et le vainqueur de chaque manche, pour le journal des duels du serveur. */
  private duelRounds: { duree: number; gagnant: number }[] = [];
  private duelRoundStart = 0;
  /** Duel en ligne : l'adversaire est parti avant la fin. */
  private duelForfeit = false;
  /** Micro-pause d'impact (hitstop) sur les coups critiques et parades majeures pour le game feel. */
  private hitstop = 0;
  private readonly dialogue: DialogueBox;
  private readonly panels: PanelHost;
  private readonly music = new Music();
  private readonly screens: Screens;
  private readonly creation: CreationScreen;
  private readonly ui: UiContext;
  /** L'île partagée (jeu servi par son serveur) : les autres joueurs qui s'y promènent. */
  private readonly presence: IslandPresence | null;
  /** Le menu social et le chat (jeu hébergé, avec un compte). */
  private readonly social: SocialClient | null;
  private readonly chat: ChatBox | null;
  /** Le ping du joueur en ligne, toujours à l'écran. */
  private readonly pingBadge = new PingBadge();

  constructor(private readonly d: AppDeps) {
    this.presence = sharedIsland(d.network) ? new IslandPresence(d.network) : null;
    this.social = d.account ? new SocialClient(d.account.session.jeton) : null;
    // Avec un compte, la coop propose son pseudo, si l'on n'en a pas choisi d'autre.
    try {
      if (d.account && !localStorage.getItem('rivages-des-morts:pseudo')) localStorage.setItem('rivages-des-morts:pseudo', d.account.session.pseudo);
    } catch {
      // Stockage indisponible : la coop proposera le nom du héros.
    }
    this.chat = this.social
      ? new ChatBox(d.uiRoot, this.social, { joinGame: (code) => this.joinGame(code), openSocial: () => this.openSocialPanel() })
      : null;
    this.screens = new Screens(d.uiRoot);
    this.creation = new CreationScreen(d.uiRoot);
    this.dialogue = new DialogueBox(d.uiRoot);
    this.panels = new PanelHost(d.uiRoot);
    this.resolution = new AdaptiveResolution(d.engine);
    this.ui = {
      progress: d.progress,
      basePlayer: d.config.player,
      loadout: () => this.loadout(),
      toast: (text, tone, icon) => this.screens.toast(text, tone, icon),
    };
    if (this.social) {
      const social = this.social;
      social.onTradeStart = () => openTrade(this.panels, social, this.d.progress);
      social.onGoods = (goods) => this.receiveGoods(goods);
    }
  }

  /** Le serveur conclut un échange, une mise en vente, un achat… : on range (ou retire) dans le personnage. */
  private receiveGoods(goods: Goods): void {
    const progress = this.d.progress;
    let notes: string[] = [];
    if (goods.kind === 'echange') {
      give(progress, goods.donne);
      notes = [`Échange conclu avec ${goods.avec} : tu reçois ${describeLot(goods.recoit)}.`, ...receive(progress, goods.recoit)];
    } else if (goods.kind === 'mis') {
      give(progress, goods.lot);
      notes = [`En vente : ${describeLot(goods.lot)}.`];
    } else if (goods.kind === 'achat') {
      progress.gainOboles(-goods.prix);
      notes = [`Acheté pour ${goods.prix} oboles : ${describeLot(goods.lot)}.`, ...receive(progress, goods.lot)];
    } else if (goods.kind === 'rendu') {
      notes = [`Retiré de la vente : ${describeLot(goods.lot)}.`, ...receive(progress, goods.lot)];
    } else {
      progress.gainOboles(goods.oboles);
      notes = [`Tu encaisses ${goods.oboles} oboles de tes ventes.`];
    }
    progress.save();
    for (const note of notes) this.screens.toast(note, 'loot');
  }

  start(): void {
    if (this.d.devWave !== null && this.d.devDungeon === ENDLESS) void this.descendEndless(blocOf(content.endless, this.d.devLevel ?? 1));
    else if (this.d.devWave !== null) void this.enterDungeon(this.d.devDungeon, this.d.devWave, false, this.d.devLevel ?? 1);
    else if (this.d.devDuel !== null) void this.descendDuel(this.d.devDuel || undefined);
    else this.showTitle();
    for (const notice of this.d.notices) this.screens.toast(notice);
    startMeasures(this.d.network);
    this.d.engine.runRenderLoop(() => this.frame());
    // Onglet caché, le navigateur n'anime plus la page : l'hôte d'une partie en coop continue pourtant le combat.
    whileHidden(() => {
      // En duel, les deux joueurs font tourner le combat : l'autre attendrait le nôtre.
      if (((this.coop?.isHost && this.world) || this.duelNet) && this.mode === 'dungeon') this.frame();
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
      /** Duel en ligne : le combat à rollback (pas, pas sûrs, renvois du monde). */
      get duelNet() {
        return app.duelNet;
      },
      /** Octets échangés en coop depuis l'ouverture de la page. */
      traffic,
      get island() {
        return app.d.island;
      },
      get progress() {
        return app.d.progress;
      },
      /** Les fenêtres (forge, inventaire…) et leur contexte : de quoi ouvrir un écran depuis la console. */
      get panels() {
        return app.panels;
      },
      get ui() {
        return app.ui;
      },
      get mode() {
        return app.mode;
      },
      /** L'arène des duels en ligne (créer ou rejoindre un code), comme chez Tetsu. */
      openDuel: () => app.openDuel(),
      /** Vrai tant que les planches des yokai de la descente se chargent. */
      get preparing() {
        return app.preparing !== null;
      },
      get renderer() {
        return app.d.dungeonRenderer;
      },
      get islandRenderer() {
        return app.d.islandRenderer;
      },
      /** Descend dans le Yomi sans fond, au bloc `bloc` (0 : paliers 1 à 5), sans passer par la cascade. */
      endless(bloc = 0) {
        return app.descendEndless(bloc);
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
    const elapsed = now - this.last;
    const dt = Math.min(0.1, elapsed / 1000);
    this.last = now;
    this.step(dt);
    this.updateConnection();
    if (!document.hidden) {
      this.resolution.sample(elapsed, performance.now() - now);
      noteFrame(elapsed);
    }
  }

  /** Le ping à l'écran, et où l'on joue pour les mesures de la connexion (src/net/mesures.ts). */
  private updateConnection(): void {
    const session = this.coop;
    let place: Place = 'menu';
    let view: PingView = null;
    if ((this.mode === 'dungeon' || this.mode === 'result') && session) {
      place = session.isHost ? 'hote' : 'descente';
      // En duel, personne n'est l'hôte du combat : chacun voit son ping vers l'autre.
      view = this.duelNet ? { ms: session.isHost ? this.duelNet.ping : session.ping } : session.isHost ? 'host' : { ms: session.ping };
    } else if (this.mode === 'island' && (this.presence || session) && this.d.network === 'serveur') {
      place = 'ile';
      view = { ms: serverClock.ping };
    }
    // Sur le serveur du jeu, plus de réponse depuis un moment : la page se reconnecte d'elle-même, on le dit.
    if (view && this.d.network === 'serveur' && performance.now() - serverClock.lastPong > LOST_AFTER) view = 'lost';
    setPlace(place);
    this.pingBadge.show(view);
  }

  private step(dt: number): void {
    this.dialogue.tick(dt);
    this.handleKeys();
    this.ambiance.update(this.mode === 'island' ? toScreen(this.d.island.player.pos) : null, dt);

    switch (this.mode) {
      case 'title':
        this.updateTitle(dt);
        break;
      case 'island':
        this.updateIsland(dt);
        break;
      case 'dungeon': {
        if (this.preparing) {
          this.d.input.flush();
          break;
        }
        this.updateDungeon(dt);
        const view = this.combatView;
        this.music.play(view?.enemies.some((e) => e.boss) ? 'boss' : 'combat');
        break;
      }
      case 'result':
        if (this.combatView) this.d.dungeonRenderer.sync(this.combatView, [], dt);
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
      if (key('Escape') || key('KeyI') || key('KeyB') || key('KeyJ') || key('KeyK') || key('KeyO')) this.panels.close();
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
      else if (key('KeyB')) openBuilds(this.panels, this.ui);
      else if (key('KeyJ')) openQuests(this.panels, this.ui);
      else if (key('KeyK')) openSkills(this.panels, this.ui);
      else if (key('KeyO') && this.d.accounts) this.openSocialPanel();
      else if (key('Enter')) this.chat?.focus();
      else if (key('Escape')) this.openPause();
    } else if (this.mode === 'dungeon') {
      if (key('Escape')) this.openPause();
      else if (key('Enter')) this.chat?.focus();
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
    if (this.d.accounts) {
      const account = this.d.account;
      options.push({
        label: account ? `Compte : ${account.session.pseudo}` : 'Se connecter',
        action: () => openAccount(this.panels, { account, restart: (notice) => restartWith(notice) }, () => this.showTitle()),
      });
    }
    options.push({ label: hasUnseenNotes() ? 'Nouveautés •' : 'Nouveautés', action: () => openPatchNotes(this.panels, () => this.showTitle()) });
    options.push({ label: 'Options', action: () => openOptions(this.panels, this.music, this.sfx, this.resolution) });
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
      this.d.account ? `sur le compte ${this.d.account.session.pseudo}` : 'sauvegardés dans ce navigateur',
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
      island.placeAt(devPlace() ?? content.island.spawn);
      this.setHero();
      islandRenderer.focus(island.player.pos, 0, true);
      this.setMode('island');
    });
    // Pendant la promenade, les planches des yokai se chargent : la prochaine descente n'attendra pas.
    this.d.dungeonRenderer.prefetch([this.loadout().config.kit]);
    this.busy = false;
    // `?forge` (tests, captures) : la forge de Tetsu s'ouvre dès l'arrivée sur l'île.
    if (new URLSearchParams(location.search).has('forge')) {
      openForge(this.panels, this.ui);
      return;
    }
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
    this.steps(dt, island.player.moving ? island.ground() : null);
    const target = modal ? null : island.nearest();
    islandRenderer.focus(island.player.pos, dt);
    islandRenderer.sync(island, target?.def.id ?? null, this.markers(), dt);
    if (this.presence) {
      this.presence.enter(this.islandProfile());
      this.presence.update(dt, island.player);
      islandRenderer.syncVisitors(this.presence.visitors(), dt);
    }
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

  /** Le menu social : groupe, amis, joueurs de l'île. */
  private openSocialPanel(): void {
    openSocial(this.panels, {
      social: this.social,
      visitors: () => this.presence?.visitors().map((v) => v.name) ?? [],
      gameCode: () => this.coop?.code ?? null,
      whisper: (name) => {
        this.panels.close();
        this.chat?.focus(`/m ${name} `);
      },
      shop: (name) => this.social && openPlayerShop(this.panels, this.social, this.d.progress, name),
      market: () => this.social && openMarket(this.panels, this.social, this.d.progress, (name) => this.social && openPlayerShop(this.panels, this.social, this.d.progress, name)),
    });
  }

  /** Un joueur du groupe nous invite dans sa partie en coop. */
  private joinGame(code: string): void {
    if (this.coop) this.screens.toast('Tu es déjà dans une partie en coop.');
    else if (this.mode !== 'island' || this.busy) this.screens.toast('Reviens sur l’île pour rejoindre la partie.');
    else this.joinSession(CoopSession.join(this.d.network, code, this.member(this.d.account?.session.pseudo ?? pseudo(this.d.progress))));
  }

  /** Ce que les autres joueurs de l'île voient de nous : le pseudo du compte (sinon celui de la coop), le héros. */
  private islandProfile(): Profile {
    return {
      name: this.d.account?.session.pseudo ?? pseudo(this.d.progress),
      sprite: heroSprite(this.shownHero()),
      level: this.d.progress.level,
    };
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
      // Les PNJ qui ont une voix la font entendre quand on leur parle.
      const voix = `pnj-${it.def.id}`;
      if (voix in sfxData.sons) this.sfx.play(voix as SfxId, 1);
      await this.playLines(variant.lines, variant.prop);
      const chatter = (variant.pool ?? []).filter((p) => progress.check(p.if));
      const turn = `bavardage_${it.def.dialogue ?? it.def.id}`;
      if (chatter.length > 0) await this.playLines(chatter[progress.flag(turn) % chatter.length].lines, variant.prop);
      const actions = progress.apply([...(chatter.length > 0 ? [{ add: [turn, 1] as [string, number] }] : []), ...(variant.then ?? [])]);
      const available = (variant.choices ?? []).filter((c) => progress.check(c.if));
      if (available.length > 0) {
        const choice = available[await this.dialogue.choose(available.map((c) => c.text))];
        actions.push(...progress.apply(choice.then));
        if (choice.reply) await this.playLines(choice.reply, variant.prop);
      }
      this.dialogue.close();
      await this.runActions(actions);
    } finally {
      this.dialogue.close();
      this.busy = false;
    }
    // Le billot de Tetsu : on y descend une fois le dialogue refermé, et `busy` retombé.
    if (this.pendingTraining) {
      this.pendingTraining = false;
      await this.descendTraining();
    }
    if (this.pendingDuel) {
      this.pendingDuel = false;
      this.openDuel();
    }
  }

  private async playLines(lines: Line[], prop?: string): Promise<void> {
    // L'objet dont parle l'échange (`prop`) s'affiche en vignette dans la fenêtre de dialogue.
    const object = portraitUrl(prop);
    for (const [speakerId, text, conditions] of lines) {
      if (!this.d.progress.check(conditions)) continue;
      const speaker = content.speakers[speakerId] ?? { name: speakerId };
      // Le héros parle avec le visage de sa race et de sa classe.
      const portrait = speaker.sprite === 'heros' ? `${import.meta.env.BASE_URL}sprites/${heroImage(this.d.progress.state.hero)}` : portraitUrl(speaker.sprite);
      await this.dialogue.say({ name: speaker.name, portrait }, this.d.progress.format(text), object);
    }
  }

  private async runActions(actions: Action[]): Promise<void> {
    for (const action of actions) {
      switch (action.kind) {
        case 'toast':
          this.screens.toast(action.text, action.tone, action.icon);
          if (action.levelUp) this.sfx.play('niveau');
          break;
        case 'shop':
          openShop(this.panels, this.ui, action.id);
          break;
        case 'forge':
          openForge(this.panels, this.ui);
          break;
        case 'records':
          openRecords(this.panels, this.social);
          break;
        case 'chests':
          this.openChests();
          break;
        case 'changeHero':
          await this.changeHero();
          break;
        case 'subclass':
          openSubclass(this.panels, this.ui);
          break;
        case 'training':
          // La descente attend la fin du dialogue : voir `interact`.
          this.pendingTraining = true;
          break;
        case 'duel':
          this.pendingDuel = true;
          break;
        case 'dungeon': {
          // Le joueur choisit le niveau du donjon avant d'y entrer.
          const id = action.id;
          if (id === ENDLESS) {
            openEndlessEntry(this.panels, this.ui, () => void this.descendEndless(0));
            break;
          }
          // Le gardien errant : un seul combat, à un niveau imposé (la nuit sur le Mont Fujikasane, après minuit).
          const fixed = content.dungeons[id]?.fixedLevel;
          if (fixed) void this.descend(id, fixed);
          else openDungeonEntry(this.panels, this.ui, content.dungeons[id], (level) => void this.descend(id, level));
          break;
        }
      }
    }
  }

  /**
   * Le terrain d'entraînement de Tetsu, derrière sa forge : une arène à part, sans palier, sans butin et sans
   * risque, où deux mannequins immobiles encaissent les coups. On en ressort par la pause. Il sert à éprouver
   * une classe ou un équipement : rien de ce qui s'y passe ne touche la sauvegarde.
   */
  private async descendTraining(): Promise<void> {
    if (this.busy) return;
    // En coop, le combat appartient à l'hôte : le terrain d'entraînement reste une affaire solitaire.
    if (this.coop) {
      this.screens.toast('Quitte la partie en coop avant de t’entraîner.');
      return;
    }
    this.busy = true;
    const terrain = content.entrainement;
    // Le billot prête la classe essayée si l'on en a choisi une ; sinon, le héros du joueur.
    const player = this.trainingLoadout().config;
    await this.screens.transition(terrain.name, terrain.region, () => {
      // `training` : la vague du mannequin ne s'épuise pas, il revient à sa place. Aucune difficulté n'est passée,
      // donc aucune malédiction, aucun renfort de niveau, et rien à gagner.
      const world = new World({ ...this.d.config, ...terrain.arena, player, training: true });
      this.world = world;
      this.mirror = null;
      this.duelNet = null;
      this.bots = [];
      this.endless = null;
      this.exitAt = null;
      const ready = this.prepareDungeon(terrain, 1, []);
      this.trainingStats = { start: 0, total: 0, hits: [] };
      return ready;
    });
    this.busy = false;
  }

  /**
   * L'arène des duels (PVP), en entraînement : le héros du joueur affronte une ombre jouée par l'ordinateur, en deux
   * manches gagnantes. Tout y est égalisé (src/game/pvp.ts) : même niveau, arme de départ, rien d'autre. Rien ne s'y
   * gagne ni ne s'y perd. `cls` : la classe de l'ombre (au hasard sinon).
   */
  private async descendDuel(cls?: string): Promise<void> {
    if (this.busy) return;
    if (this.coop) {
      this.screens.toast('Quitte la partie en coop avant un duel.');
      return;
    }
    this.busy = true;
    const { config, progress } = this.d;
    const { arena, duel, level } = content.pvp;
    const player = duelLoadout(config.player, progress.state, content, level, content.pvp).config;
    const rival = this.duelOpponent(cls);
    this.trainingHero = null;
    this.duelMatch = { opponent: rival.name, cls: rival.cls, online: false };
    this.duelWins = [0, 0];
    this.duelForfeit = false;
    await this.screens.transition(arena.name, `${arena.region} · contre ${rival.name}`, () => {
      const world = new World({ ...config, ...arena.arena, player, allies: [rival.config], duel });
      this.world = world;
      this.mirror = null;
      this.duelNet = null;
      this.endless = null;
      this.exitAt = null;
      this.bots = [new Bot(world, world.players[1], false, true)];
      return this.prepareDungeon(arena, level, [rival]);
    });
    this.busy = false;
  }

  /** L'ombre d'un duel d'entraînement : une race et une classe (`cls`, ou au hasard), égalisée comme le joueur. */
  private duelOpponent(cls?: string): Ally & { cls: string } {
    const { config, progress } = this.d;
    const classes = Object.keys(content.skills.classes);
    const chosen = cls && classes.includes(cls) ? cls : classes[Math.floor(Math.random() * classes.length)];
    const hero = { race: ALLY_RACES[Math.floor(Math.random() * ALLY_RACES.length)], class: chosen };
    const state = { ...progress.state, hero, talents: [] };
    const loadout = duelLoadout(config.player, state, content, content.pvp.level, content.pvp);
    return { config: loadout.config, sprite: heroSprite(hero), name: `Ombre ${content.skills.classes[chosen].name.toLowerCase()}`, cls: chosen };
  }

  /** Journal des duels du serveur : l'équipement de duel de ce joueur (classe, voie, race, objets), au début du duel. */
  private reportDuelEquipment(): void {
    const state = duelState(this.d.progress.state, content, content.pvp.level);
    const { arme, ...others } = state.equipped;
    this.social?.reportDuelEquipment(state.hero.class, state.hero.subclass ?? '', state.hero.race, arme ?? '', Object.values(others).filter((id): id is string => Boolean(id)));
  }

  /** Journal des duels : l'hôte envoie le résultat. `forfeitWinner` : la place gagnante si l'adversaire a abandonné. */
  private reportDuelResult(forfeitWinner: number | null): void {
    const heroes = this.combatView?.players ?? [];
    const classes = heroes.map((h) => h.cfg.kit);
    if (classes.length !== 2) return;
    this.social?.reportDuelResult(classes, heroes.map((h) => h.cfg.sousClasse?.id ?? ''), this.duelRounds, forfeitWinner);
  }

  /**
   * Fin d'un duel : le score, puis la revanche ou le retour sur l'île. Rien n'est gagné ni perdu. La fin du monde
   * (`outcome`) se lit du côté du héros 0, l'hôte : chacun lit plutôt le score depuis sa propre place.
   */
  private finishDuel(outcome: Outcome): void {
    const match = this.duelMatch;
    const arena = content.pvp.arena;
    this.outcome = null;
    this.setMode('result');
    const me = this.combatView?.player.id ?? 0;
    const wins = [this.duelWins[me] ?? 0, this.duelWins[1 - me] ?? 0];
    const forfeit = this.duelForfeit;
    // En ligne, abandonner en cours de route est une défaite, même en menant au score.
    const victory = forfeit || (match?.online ? wins[0] >= content.pvp.duel.roundsToWin : outcome === 'victory');
    const session = this.coop;
    if (match?.online && session?.isHost) this.reportDuelResult(forfeit ? me : null);
    if (session?.isHost) session.backToLobby();
    const options: MenuOption[] = match?.online
      ? [
          ...(session
            ? [
                {
                  label: 'Quitter le duel',
                  action: () => {
                    session.leave();
                    void this.returnToIsland();
                  },
                },
                { label: 'Revanche', primary: true, action: () => void this.returnToIsland().then(() => this.showLobby()) },
              ]
            : [{ label: 'Retourner sur l’île', primary: true, action: () => void this.returnToIsland() }]),
        ]
      : [
          { label: 'Revanche', action: () => void this.descendDuel(match?.cls) },
          { label: 'Autre adversaire', action: () => void this.descendDuel() },
          { label: 'Retourner sur l’île', primary: true, action: () => void this.returnToIsland() },
        ];
    this.screens.showResult(
      victory,
      {
        place: arena.name,
        victory: arena.victory,
        level: content.pvp.level,
        oboles: 0,
        xp: 0,
        materials: [],
        chests: 0,
        subtitle: forfeit ? `${match?.opponent ?? 'Ton adversaire'} a quitté le duel` : `${wins[0]} – ${wins[1]} contre ${match?.opponent ?? 'ton adversaire'}`,
        defeat: { title: 'Défaite', text: 'Ton adversaire l’emporte, cette fois. Rien ne se perd ici : relève-toi et redemande un duel.' },
        noLoot: true,
      },
      options,
    );
  }

  /** L'arène des duels (Tetsu) : le salon si l'on est déjà dans un duel, sinon créer un duel ou rejoindre un code. */
  private openDuel(): void {
    if (this.coop) {
      if (!this.coop.duel) this.screens.toast('Quitte la partie en coop avant un duel.');
      else this.showLobby();
      return;
    }
    openDuelMenu(this.panels, {
      progress: this.d.progress,
      network: this.d.network,
      member: (name) => this.member(name),
      opened: (session) => this.joinSession(session),
      toast: (text) => this.screens.toast(text),
    });
  }

  /** Duel en ligne : l'adversaire est parti en plein combat, on gagne par abandon. */
  private winByForfeit(): void {
    if (this.mode !== 'dungeon' || !this.duelMatch?.online || this.outcome) return;
    this.duelForfeit = true;
    this.finishDungeon('victory');
  }

  /** Sortie du terrain d'entraînement : retour sur l'île, devant la forge de Tetsu. Rien n'est gagné ni perdu. */
  private async leaveTraining(): Promise<void> {
    this.trainingStats = null;
    // On sort du billot comme on y est entré : avec son propre héros.
    this.trainingHero = null;
    this.d.hud.setTraining(null);
    await this.returnToIsland();
  }

  /**
   * Le prêt du billot : on choisit une classe et une voie, et la séance reprend aussitôt avec elles (le compteur
   * repart de zéro, comme à chaque entrée). `null` : on reprend son propre héros.
   */
  private tryOn(choice: TrialChoice | null): void {
    this.trainingHero = choice ? { ...this.d.progress.state.hero, class: choice.class, subclass: choice.subclass ?? undefined } : null;
    void this.descendTraining();
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
    if (!keep) this.pactesEncours = [];
    const cleared = keep && this.endless ? this.endless.cleared : 0;
    const player = this.loadout().config;
    const allies = this.botAllies();
    const dungeon = this.endlessDungeon(bloc);
    const waves = blocWaves(data, content.difficulty, bloc, endlessArenas, 1 + allies.length, undefined, this.pactesEncours);
    const first = firstPalier(data, bloc);
    await this.screens.transition(data.name, this.endlessSubtitle(bloc, 1 + allies.length), () => {
      const world = new World({ ...this.d.config, ...dungeon.arena, waves, player, allies: allies.map((a) => a.config), difficulty: waves[0].difficulty });
      this.world = world;
      this.mirror = null;
      this.duelNet = null;
      this.bots = world.players.slice(1).map((hero) => new Bot(world, hero));
      const ready = this.prepareDungeon(dungeon, levelAt(data, first), allies, keep, true);
      this.endless = { bloc, cleared, awaiting: false };
      return ready;
    });
    this.busy = false;
  }

  /**
   * Le donjon d'un bloc du Yomi sans fond : les vagues et les boss de celui dont le bloc est tiré, dans l'arène du Yomi,
   * la même pour tous les blocs (elle n'est construite qu'une fois).
   */
  private endlessDungeon(bloc: number): DungeonDef {
    const source = content.dungeons[arenaOf(content.endless, bloc)];
    // Les rochers de la caverne noyée, quel que soit le donjon dont le bloc reprend les vagues.
    const layouts = content.endless.layouts ?? source.arena.layouts;
    return { ...source, arena: { ...source.arena, layouts }, style: content.endless.style };
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
    const difficulty = dungeonDifficultyFor(content.difficulty, this.dungeonLevel, 1 + allies.length, dungeon.strength);
    const begin = () => {
      const world = new World({ ...config, ...dungeon.arena, player, allies: allies.map((a) => a.config), difficulty }, startWave);
      this.world = world;
      this.mirror = null;
      this.duelNet = null;
      this.bots = world.players.slice(1).map((hero) => new Bot(world, hero));
      return this.prepareDungeon(dungeon, this.dungeonLevel, allies);
    };
    if (withTransition) await this.screens.transition(dungeon.name, `${dungeon.region} · niveau ${this.dungeonLevel}`, begin);
    else await begin();
  }

  /** Le combat tel qu'on l'affiche : le monde qu'on fait tourner, celui de l'hôte décrit par lui, ou celui du duel. */
  private get combatView(): WorldView | null {
    return this.world ?? this.mirror ?? this.duelNet?.view ?? null;
  }

  private updateDungeon(dt: number): void {
    if (this.duelNet) {
      this.updateDuelNet(dt);
      return;
    }
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
    this.bowDraw(world.player.drawProgress);
    for (const event of events) {
      this.sfxEvent(event, world.player.id, events);
      this.track(event);
      // Terrain d'entraînement : chaque coup porté au mannequin entre dans le compteur affiché.
      if (this.trainingStats && event.type === 'enemyHit') this.countDamage(event.amount, world.time);
      // Micro-pause d'impact, seul : en ligne, figer un joueur le décalerait des autres.
      if (online) continue;
      this.hitstop = Math.max(this.hitstop, hitstopFor(event, world));
    }
    dungeonRenderer.sync(world, events, dt);
    if (online) hud.pings = world.players.slice(1).map((hero) => this.remote.get(hero.id)?.ping);
    hud.update(world, events, dt);
    if (this.trainingStats) hud.setTraining(this.trainingReport(world.time));
    // Onglet caché : l'hôte fait avancer le combat pour ses amis, sans rien dessiner.
    if (!document.hidden) dungeonRenderer.render();
    if (this.outcome) this.finishDungeon(this.outcome);
  }

  /**
   * Donne au héros l'apparence de sa race et de sa classe, sur l'île comme au donjon : la planche du donjon se
   * charge ainsi pendant qu'on est encore sur l'île.
   */
  private setHero(): void {
    const sprite = heroSprite(this.trainingHero ?? this.d.progress.state.hero);
    this.d.islandRenderer.setHero(sprite);
    this.d.dungeonRenderer.setHero(sprite);
  }

  /**
   * L'état du héros prêté par le billot : la classe essayée, sa voie, une arme maniable par elle, et l'arbre canonique
   * du banc de mesure au niveau 10 et plus (deux branches pleines et un nœud), pour que deux classes se comparent à
   * armes égales. L'équipement universel du personnage reste porté : c'est le joueur qu'on mesure, avec une autre classe.
   */
  private trialState(hero: Hero): ProgressState {
    const { progress } = this.d;
    const level = progress.level;
    const theirs = progress.state.equipped.arme;
    const def = theirs ? content.items[theirs] : undefined;
    const usable = Boolean(theirs && def && !equipBlock(def, hero, content.skills));
    const weapon = usable ? theirs! : (content.skills.classes[hero.class]?.weapon ?? STARTING_WEAPON);
    const branches = content.skills.classes[hero.class]?.branches ?? [];
    return {
      ...progress.state,
      hero,
      talents: level >= 10 ? branches.flatMap((b) => b.nodes.map((n) => n.id)).slice(0, 9) : [],
      items: [...new Set([...progress.state.items, weapon])],
      equipped: { ...progress.state.equipped, arme: weapon },
      itemLevels: { ...progress.state.itemLevels, [weapon]: Math.min(level, 50) },
    };
  }

  /** Les réglages du héros pour la séance du billot : celui qu'on joue, ou la classe prêtée. */
  private trainingLoadout(): Loadout {
    const { config, progress } = this.d;
    const hero = this.trainingHero;
    if (!hero) return buildLoadout(config.player, progress.state, content, progress.level);
    return buildLoadout(config.player, this.trialState(hero), content, progress.level);
  }

  /** La classe dont le HUD et la pause montrent les compétences : la classe prêtée pendant une séance. */
  private shownHero(): Hero {
    return this.trainingHero ?? this.d.progress.state.hero;
  }

  // --- Coop en ligne ---------------------------------------------------------------

  /**
   * Les sons courts du combat : un coup critique sonne « crit », les autres événements suivent la carte (sfx.ts).
   * En coop, seuls mes coups et les coups que je reçois sonnent : ceux des alliés passeraient en rafale continue.
   */
  /** Les pas sur l'île : à chaque foulée, la terre, le bois (ponts, ponton) ou le clapotis du lit de la rivière. */
  private steps(dt: number, ground: 'eau' | 'bois' | 'terre' | null): void {
    if (!ground) {
      this.stride = 0;
      return;
    }
    this.stride -= dt;
    if (this.stride > 0) return;
    this.sfx.play(`pas-${ground}`);
    this.stride = STRIDE_S;
  }

  /** Le Rôdeur qui commence à bander son arc. */
  private bowDraw(progress: number): void {
    if (progress > 0 && !this.drawing) this.sfx.play('bander');
    this.drawing = progress > 0;
  }

  private sfxEvent(event: GameEvent, me: number, batch: readonly GameEvent[]): void {
    // Mon coup qui ne touche rien : le coup et ses touches tombent dans le même pas, donc dans le même lot.
    if (event.type === 'swing') {
      if (event.hero === me && !batch.some((e) => e.type === 'enemyHit' && e.owner === me)) this.sfx.play('vide');
      return;
    }
    if (event.type === 'dodge') {
      if (event.hero === me) this.sfx.play('esquive');
      return;
    }
    if (event.type === 'enemyHit') {
      if (event.owner >= 0 && event.owner !== me) return;
      // Une carapace (le kappa renforcé) arrête le coup ; le critique au repos sonne comme un coup ordinaire.
      if (event.shielded) this.sfx.play('carapace');
      else if (!event.crit || !this.sfx.play('crit')) this.sfx.play('coup');
      return;
    }
    // Le koto ouvre le Yomi sans fond, puis chaque bloc qu'on choisit de continuer, seul : la musique se tait.
    if (event.type === 'wave' && event.index === 0 && this.endless && this.sfx.play('manche', 1)) this.music.hush(KOTO_MS);
    if (event.type === 'end') {
      this.sfx.play(event.outcome === 'victory' ? 'victoire' : 'defaite');
      return;
    }
    if (event.type === 'playerHit' && event.hero !== me) return;
    // Le Météore du Sorcier sonne pour tout le monde : rare, et visible de toute l'arène.
    if ((event.type === 'blast' || event.type === 'blastEnd') && event.kind === 'meteor') {
      this.sfx.play(event.type === 'blast' ? 'meteore' : 'meteore-impact');
      return;
    }
    const id = SFX_DES_EVENTS[event.type];
    if (id) this.sfx.play(id);
  }

  /**
   * Hôte : à chaque pas, un instantané pour chaque invité (canal rapide), et les événements du combat
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
    // Une fois par seconde, le ping de chaque invité, pour que tous le voient (l'hôte n'en a pas : 0).
    if (this.hostTick - this.pingsTick >= 60) {
      this.pingsTick = this.hostTick;
      session.sendPings(world.players.map((hero) => (hero.id === 0 ? 0 : (this.remote.get(hero.id)?.ping ?? 0))));
    }
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
    // L'esquive prévue sonne et se voit dès l'appui ; celle que l'hôte annonce ensuite ne se rejoue pas.
    const events = [...mirror.takeEvents(), ...this.inbox.filter((event) => !mirror.echo(event))];
    this.inbox = [];
    for (const event of events) {
      this.track(event);
      this.sfxEvent(event, mirror.player.id, events);
    }
    if (mirror.ready) {
      dungeonRenderer.sync(mirror, events, dt);
      // Le ping qui compte pour un invité : celui vers l'hôte, affiché sur sa barre.
      // Chez un hôte joueur, son ping est le nôtre (l'aller-retour jusqu'à lui) ; les autres, l'hôte nous les envoie.
      hud.pings = mirror.players.filter((hero) => hero.id !== mirror.seat).map((hero) => (hero.id === 0 && !session?.dedicated ? session?.ping : session?.pings[hero.id] || undefined));
      hud.update(mirror, events, dt);
    }
    dungeonRenderer.render();
    if (this.outcome) this.finishDungeon(this.outcome);
  }

  /**
   * Duel en ligne : les deux joueurs font tourner le combat ; on avance du temps écoulé avec nos commandes, en
   * rejouant ce qu'il faut quand celles de l'adversaire arrivent (src/net/rollback.ts).
   */
  private updateDuelNet(dt: number): void {
    const net = this.duelNet;
    if (!net) return;
    const { input, dungeonRenderer, hud } = this.d;
    const session = this.coop;
    const view = net.view;
    const ping = (session?.isHost ? net.ping : session?.ping) ?? 0;
    const events = net.update(dt, () => (this.screens.paused ? idleFrame(view.player.pos) : this.readCombatInput(view)), ping, performance.now());
    if (net.steps > 0) input.flush();
    for (const event of events) {
      this.sfxEvent(event, net.seat, events);
      this.track(event);
    }
    dungeonRenderer.sync(view, events, dt);
    hud.pings = [ping || undefined];
    hud.update(view, events, dt);
    if (!document.hidden) dungeonRenderer.render();
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
      // Duel : le héros entre égalisé, au niveau commun, avec l'arme de départ de sa classe (src/game/pvp.ts).
      config: this.coop?.duel ? duelLoadout(this.d.config.player, this.d.progress.state, content, content.pvp.level, content.pvp).config : this.loadout().config,
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
      rollback: (data) => this.duelNet?.receive(data, performance.now()),
      rollbackState: (data) => this.duelNet?.receiveState(data),
      left: (seat) => {
        if (this.duelMatch?.online) this.winByForfeit();
        else this.world?.retire(seat);
      },
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
        else if (session.leads && session.allReady) session.launch(this.member());
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
    // Duel : l'hôte parti, c'est son adversaire qui gagne ; si c'est nous qui partons (`reason` vide), on abandonne.
    if (reason && (this.mirror || this.duelNet) && this.duelMatch?.online) this.winByForfeit();
    if (this.mode === 'dungeon' && (this.mirror || this.duelNet) && !this.outcome) this.finishDungeon('defeat');
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
    const duel = start.dungeon === DUEL;
    const endless = start.dungeon === ENDLESS;
    const bloc = endless ? blocOf(data, start.level) : 0;
    const keep = endless && bloc > 0 && this.endless !== null;
    if (endless && !keep) this.pactesEncours = [];
    const cleared = keep && this.endless ? this.endless.cleared : 0;
    const dungeon = duel ? content.pvp.arena : endless ? this.endlessDungeon(bloc) : (content.dungeons[start.dungeon] ?? content.dungeons.rizieres);
    const level = duel ? content.pvp.level : endless ? levelAt(data, start.level) : clampLevel(content.difficulty, start.level);
    const configs = start.heroes.map((hero) => hero.config);
    const others = start.heroes.filter((_, seat) => seat !== start.seat);
    const title = endless ? data.name : dungeon.name;
    const opponent = others[0]?.name ?? 'ton adversaire';
    const subtitle = duel ? `${dungeon.region} · contre ${opponent}` : endless ? this.endlessSubtitle(bloc, start.heroes.length) : `${dungeon.region} · niveau ${level} · ${start.heroes.length} héros`;
    // Duel : l'adversaire est connu avant de préparer l'arène (sa barre en haut de l'écran).
    this.duelMatch = duel ? { opponent, cls: '', online: true } : null;
    this.duelWins = [0, 0];
    this.duelRounds = [];
    this.duelForfeit = false;
    if (duel) this.reportDuelEquipment();
    await this.screens.transition(title, subtitle, () => {
      this.coopRun = start.run;
      if (duel) {
        // Les deux joueurs font tourner le même combat : mêmes réglages (passés par le réseau, pour être identiques
        // à l'octet près) et même graine du hasard.
        const same = JSON.parse(JSON.stringify(configs)) as typeof configs;
        setRandomState(start.seed ?? start.run);
        const world = new World({ ...this.d.config, ...dungeon.arena, player: same[0], allies: same.slice(1), duel: content.pvp.duel });
        this.world = null;
        this.mirror = null;
        this.duelNet = new DuelNet(world, start.seat, start.run, (packet) => session.sendRollback(packet), (state) => session.sendRollbackState(state));
      } else if (session.isHost) {
        const waves = endless ? blocWaves(data, content.difficulty, bloc, endlessArenas, configs.length, undefined, this.pactesEncours) : null;
        const difficulty = waves ? waves[0].difficulty : dungeonDifficultyFor(content.difficulty, level, configs.length, dungeon.strength);
        this.world = new World({ ...this.d.config, ...dungeon.arena, ...(waves ? { waves } : {}), player: configs[0], allies: configs.slice(1), difficulty });
        this.mirror = null;
        this.duelNet = null;
        this.remote.clear();
        for (let seat = 1; seat < configs.length; seat++) this.remote.set(seat, new RemoteInput(start.run));
        this.hostTick = 0;
        this.sentTick = 0;
        this.pingsTick = 0;
        this.outbox = [];
      } else {
        this.world = null;
        this.duelNet = null;
        const arena = { halfSize: dungeon.arena.arenaHalfSize, webSlow: dungeon.arena.webs.slowFactor, webBurnTime: dungeon.arena.webs.burnTime };
        this.mirror = new MirrorWorld(configs, start.seat, start.run, arena, level);
        this.sender = new InputSender(start.run);
        this.inbox = [];
      }
      this.bots = [];
      const ready = this.prepareDungeon(dungeon, level, others, keep, endless);
      this.endless = endless ? { bloc, cleared, awaiting: false } : null;
      return ready;
    });
    if (!session.isHost) session.loaded(start.run);
    this.busy = false;
  }

  /**
   * Remet l'affichage à neuf pour une descente : décor, héros, alliés, HUD, et charge les planches de ses yokai s'ils
   * ne le sont pas déjà (réduites à la taille de l'écran, elles restent chargées d'une descente à l'autre). Le combat
   * attend qu'elles soient prêtes ; la promesse est tenue alors, pendant le fondu au noir.
   * `allKinds` : les yokai de tous les donjons d'avance (donjon infini : aucun chargement d'un bloc à l'autre).
   */
  private prepareDungeon(dungeon: DungeonDef, level: number, allies: { sprite: string; name: string }[], keepLoot = false, allKinds = false): Promise<void> {
    const { dungeonRenderer, hud, islandRenderer } = this.d;
    this.screens.hideResult();
    this.panels.close();
    this.dungeon = dungeon;
    this.dungeonLevel = level;
    dungeonRenderer.reset();
    this.setHero();
    dungeonRenderer.setAllies(allies);
    // Duel : l'adversaire a sa barre en haut de l'écran, pas dans la liste des alliés.
    hud.setAllies(dungeon.id === 'duel' ? [] : allies.map((a) => a.name));
    dungeonRenderer.setStyle(dungeon.style);
    hud.reset(level, dungeon.boss);
    // Une descente ordinaire n'est pas un duel : seul l'arène des duels garde son adversaire.
    if (dungeon.id !== 'duel') this.duelMatch = null;
    hud.setDuel(this.duelMatch?.opponent ?? '');
    // Après un premier donjon gagné, la bande des touches s'efface (elle reste dans le menu pause).
    const novice = !Object.values(this.d.progress.state.dungeons).some((record) => record.best >= 1);
    const hero = this.shownHero();
    hud.configure(heroClass(content.skills, hero), heroSubclass(content.subclasses, hero)?.name, hero.subclass, novice);
    // Un vrai donjon reprend le héros du joueur : le prêt du billot ne survit pas à une descente.
    if (dungeon.id !== 'entrainement') this.trainingHero = null;
    // Le compteur d'entraînement ne survit pas à une descente : chaque séance repart de zéro.
    this.trainingStats = null;
    hud.setTraining(null);
    if (!keepLoot) this.run = emptyLoot();
    this.outcome = null;
    this.accumulator = 0;
    this.hitstop = 0;
    islandRenderer.hideMarkers();
    this.setMode('dungeon');
    // Un invité ne connaît pas les vagues de l'hôte : celles du donjon, et le reste à la demande (Renderer.syncEntity).
    const waves = allKinds ? Object.values(content.dungeons).flatMap((d) => d.arena.waves) : (this.world?.cfg.waves ?? dungeon.arena.waves);
    const view = this.combatView;
    const kits = view ? [view.player, ...view.players.filter((hero) => hero !== view.player)].map((hero) => hero.cfg.kit) : [];
    const preparing = dungeonRenderer
      .prepareDescent(
        waves.flatMap((wave) => wave.spawns.map((spawn) => spawn.kind)),
        kits,
      )
      .catch((error: unknown) => console.warn('Planches des yokai :', error))
      .finally(() => {
        if (this.preparing !== preparing) return;
        this.preparing = null;
        this.accumulator = 0;
      });
    this.preparing = preparing;
    return preparing;
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
      skillFPressed: input.consumeKey('KeyF'),
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
    else if (event.type === 'duel') {
      this.duelWins = [...event.wins];
      if (event.kind === 'round') this.duelRoundStart = Date.now();
      else this.duelRounds.push({ duree: (Date.now() - this.duelRoundStart) / 1000, gagnant: event.winner ?? -1 });
    }
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

  /** Un objet rejoint le butin de la descente ; déjà possédé, son exemplaire ira dans la réserve à l'encaissement. */
  private gainRunItem(id: string, label = 'Butin rare'): void {
    const def = content.items[id];
    if (!def) return;
    if (!this.d.progress.has(id) && !this.run.items.includes(id)) {
      this.run.items.push(id);
      markSeen(id);
      this.sfx.play('butin');
      this.screens.toast(`${label} : ${def.name}`, 'loot', id);
    } else if (def.slot) {
      this.run.duplicates.push(id);
      markSeen(id);
      this.screens.toast(`Doublon : ${def.name}, pour ta réserve`, 'loot', id);
    }
  }

  /** Un coup porté au mannequin : il entre dans le total, et dans la fenêtre glissante du DPS. */
  private countDamage(amount: number, time: number): void {
    const stats = this.trainingStats;
    if (!stats) return;
    stats.total += amount;
    stats.hits.push({ t: time, amount });
    const keep = time - DPS_WINDOW;
    while (stats.hits.length > 0 && stats.hits[0].t < keep) stats.hits.shift();
  }

  /** Ce que le panneau d'entraînement affiche : dégâts totaux, DPS des dernières secondes, durée de la séance. */
  private trainingReport(time: number): { total: number; dps: number; seconds: number } {
    const stats = this.trainingStats;
    if (!stats) return { total: 0, dps: 0, seconds: 0 };
    // Aux tout premiers coups, la fenêtre est plus courte que le DPS_WINDOW : sinon la moyenne serait écrasée.
    const span = Math.max(0.5, Math.min(DPS_WINDOW, time - stats.start));
    const recent = stats.hits.reduce((sum, hit) => sum + hit.amount, 0);
    return { total: stats.total, dps: recent / span, seconds: Math.max(0, time - stats.start) };
  }

  /** Ce que rapporte le butin de la descente : chaque combat gagné laisse un coffre (pas la vague perdue). */
  private runTotals(victory: boolean): { oboles: number; xp: number; chests: number; materials: (string | Node)[] } {
    return {
      chests: Math.max(0, this.run.waves - (victory ? 0 : 1)),
      oboles: Math.round(this.run.oboles * (1 + this.loadout().bonus.oboles)),
      xp: Math.round(this.run.xp),
      materials: [
        ...this.run.items.map((id) => lootLine(id, `Objet : ${content.items[id]?.name ?? id}`)),
        ...this.run.seals.map((seal) => lootLine(seal.item, `${content.gravures.sceau.name} : ${content.items[seal.item]?.name ?? seal.item} · gravure gagnée, posée sur l'arme (ou sur un exemplaire si elle est déjà gravée)`)),
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
    // Les doublons et les sceaux vont dans la réserve. Le sceau ne compte qu'avec le reste : tomber avant de remonter
    // le rend au Yomi, comme le butin en jeu.
    for (const item of this.run.duplicates) stockItem(progress, item);
    if (victory) for (const seal of this.run.seals) this.screens.toast(landSeal(progress, seal.item, seal.gravure), 'loot', seal.item);
    progress.state.chests += chests;
    this.wearGear(victory);
    return progress.gainXp(xp);
  }

  /**
   * La durabilité (src/game/durabilite.ts) : chaque pièce portée s'use à la fin d'une descente, plus fort à la défaite.
   * Une pièce qui casse, ou qui passe sous le seuil d'alerte, se dit tout de suite.
   */
  private wearGear(victory: boolean): void {
    const { progress } = this.d;
    const notes = wearEquipped(content.durabilite, content.items, Object.values(progress.state.equipped), progress.state.usure, victory);
    for (const note of notes) {
      const name = content.items[note.item]?.name ?? note.item;
      this.screens.toast(note.broken ? `${name} est cassé : il ne compte plus. Tetsu le répare à la forge.` : `${name} s'use : pense à le faire réparer chez Tetsu.`, 'quest', note.item);
    }
  }

  private finishDungeon(outcome: Outcome): void {
    // Terrain d'entraînement : ni butin, ni quête, ni écran de fin — on remonte sur l'île.
    if (this.trainingStats) {
      void this.leaveTraining();
      return;
    }
    if (this.duelMatch) {
      this.finishDuel(outcome);
      return;
    }
    if (this.endless) {
      this.finishEndless(outcome);
      return;
    }
    const { progress } = this.d;
    this.outcome = null;
    this.setMode('result');
    const victory = outcome === 'victory';
    logRun({ hero: heroLabel(content.skills, progress.state.hero), level: progress.level, dungeon: this.dungeon.id, dungeonLevel: this.dungeonLevel, victory, waves: this.run.waves, players: this.world?.players.length ?? 1 });
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
    logRun({ hero: heroLabel(content.skills, progress.state.hero), level: progress.level, dungeon: 'infini', dungeonLevel: last, victory: outcome === 'victory', waves: this.run.waves, players: this.world?.players.length ?? 1 });

    if (outcome === 'victory') {
      const record = this.recordEndless(last);
      const item = rollEndlessItem(data, last, content.items, progress.state.hero, content.skills, (id) => progress.has(id) || this.run.items.includes(id));
      if (item) this.gainRunItem(item, `Palier ${last}`);
      const eclat = data.rewards.eclat;
      if (eclat && last >= eclat.from) {
        this.run.materials[eclat.material] = (this.run.materials[eclat.material] ?? 0) + eclat.count;
        this.screens.toast(`Palier ${last} : ${eclat.count} × ${content.materials[eclat.material] ?? eclat.material}`, 'loot');
      }
      const seal = this.drawSeal(last);
      if (seal) {
        this.run.seals.push(seal);
        this.screens.toast(`${content.gravures.sceau.name} : ${content.items[seal.item]?.name ?? seal.item} · gravure scellée`, 'loot', seal.item);
      }
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
    // En coop, le salon retient le dernier bloc lancé : on le ramène au début, pour qu'une
    // relance reprenne au palier 1 au lieu de refiler le bloc perdu à l'équipe (palier 45 au lieu de 1).
    if (session?.isHost) {
      session.choose(ENDLESS, 1);
      session.backToLobby();
    }
    // Le butin est perdu, mais l'équipement s'use quand même.
    this.wearGear(false);
    progress.save();
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

  /**
   * Le sceau du Yomi (gravures.json) : la première gravure d'une arme ne s'achète pas. En finissant le bloc qui se
   * termine au palier du sceau, une arme du sac jamais gravée est désignée au hasard et reçoit son premier tirage.
   * Il rejoint le butin en jeu : tomber plus bas le perd, comme le reste.
   */
  private drawSeal(palier: number): { item: string; gravure: Gravure } | null {
    const { progress } = this.d;
    return rollSeal(content.gravures, palier, content.items, progress.state.items, (id) => progress.gravureRolls(id));
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

  /**
   * Continuer plus bas : les pactes d'abord, si le bloc suivant les réclame (premier palier ≥ 51), puis la descente ;
   * en coop, l'hôte scelle un pacte et relance tout le monde. Les invités ne passent jamais ici (ils encaissent).
   */
  private continueEndless(bloc: number): void {
    const relance = () => {
      const session = this.coop;
      if (!session) {
        void this.descendEndless(bloc);
        return;
      }
      if (!session.isHost) return;
      session.choose(ENDLESS, firstPalier(content.endless, bloc));
      void this.startCoop(session.start(this.member()));
    };
    const drafts = pacteDraft(content.endless, bloc, Math.random, this.pactesEncours.map((p) => p.id ?? p.name));
    if (drafts) {
      openPactDraft(this.panels, firstPalier(content.endless, bloc), content.endless.palierStep, drafts, (pacte) => {
        this.pactesEncours = [...this.pactesEncours, pacte];
        this.screens.toast(`Pacte scellé : ${pacte.name}`, 'quest');
        relance();
      });
      return;
    }
    relance();
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
    // Sur le serveur du jeu, avec un compte : le palier se grave aussi sur la stèle partagée.
    this.social?.submitRecord(heroLabel(content.skills, progress.state.hero), palier);
    if (palier <= best) return false;
    progress.state.flags[ENDLESS_RECORD] = palier;
    progress.save();
    return true;
  }

  /** « Doublon : Katana de rōnin ×2, dans ta réserve », un par objet. */
  private duplicateLines(): HTMLElement[] {
    const counts = new Map<string, number>();
    for (const id of this.run.duplicates) counts.set(id, (counts.get(id) ?? 0) + 1);
    return [...counts].map(([id, n]) => lootLine(id, `Doublon : ${content.items[id]?.name ?? id}${n > 1 ? ` ×${n}` : ''}, dans ta réserve`));
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
      this.duelNet = null;
      this.duelMatch = null;
      this.d.hud.setDuel('');
      // Les étiquettes des alliés vivent par-dessus l'écran : sans ça, elles restent sur l'île après la coop.
      this.d.dungeonRenderer.setAllies([]);
      island.placeAt(this.exitAt ?? this.dungeon.exit ?? content.island.dungeonExit);
      this.exitAt = null;
      this.setHero();
      islandRenderer.focus(island.player.pos, 0, true);
      this.setMode('island');
    });
    // Pendant la promenade, les planches des yokai se chargent : la prochaine descente n'attendra pas.
    this.d.dungeonRenderer.prefetch([this.loadout().config.kit]);
    this.busy = false;
    if (progress.state.chests > 0) this.screens.toast('Des coffres t’attendent sur la barque de Charon.', 'loot');
  }

  // --- Pause -------------------------------------------------------------------------

  private openPause(): void {
    const options: MenuOption[] = [{ label: 'Reprendre', primary: true, action: () => this.screens.hidePause() }];
    const session = this.coop;
    if (this.mode === 'dungeon') {
      options.push({
        label: this.trainingStats ? 'Quitter l’entraînement' : this.duelMatch ? 'Abandonner le duel' : session ? 'Quitter la partie en coop' : 'Abandonner le donjon',
        action: () => {
          this.screens.hidePause();
          // L'entraînement ne se termine pas par une défaite : on remonte, simplement.
          if (this.trainingStats) void this.leaveTraining();
          else {
            session?.leave();
            if (this.mode === 'dungeon' && !this.outcome) this.finishDungeon('defeat');
          }
        },
      });
      // Au billot seulement : on essaie la classe et la voie que l'on veut, le temps d'une séance.
      if (this.trainingStats) {
        options.push({
          label: 'Essayer une classe ou une voie',
          action: () => {
            this.screens.hidePause();
            const hero = this.shownHero();
            openTrainingTrial(this.panels, this.ui, { class: hero.class, subclass: hero.subclass ?? null }, (choice) => this.tryOn(choice));
          },
        });
      }
    } else if (this.mode === 'island') {
      options.push({
        label: session ? 'Salon coop' : 'Coop en ligne',
        action: () => {
          this.screens.hidePause();
          this.openCoop();
        },
      });
    }
    options.push({ label: 'Options', action: () => openOptions(this.panels, this.music, this.sfx, this.resolution) });
    // Le formulaire d'avis s'ouvre dans un nouvel onglet ; sans adresse dans src/data/liens.json, pas de bouton.
    if (liens.avis) options.push({ label: 'Donner mon avis', action: () => window.open(liens.avis, '_blank', 'noopener') });
    options.push({
      label: 'Menu principal',
      action: () => {
        this.screens.hidePause();
        void this.backToTitle();
      },
    });
    // Les compétences de la classe du héros ; E sert aussi à parler sur l'île.
    const cls = heroClass(content.skills, this.shownHero());
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
    // Hors de l'île (donjon, écran titre), on n'y est plus visible ; on y réapparaît au prochain passage.
    if (mode !== 'island' && this.presence) {
      this.presence.leave();
      this.d.islandRenderer.hideVisitors();
    }
    if (mode === 'title') this.music.play('menu');
    else if (mode === 'island') this.music.play('ile');
    document.body.dataset.mode = mode;
    this.screens.showIslandHud(mode === 'island');
    this.chat?.show(mode === 'island' || mode === 'dungeon');
  }
}
