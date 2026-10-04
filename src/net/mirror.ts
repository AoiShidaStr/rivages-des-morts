// Chez un invité : la partie telle que l'hôte la décrit. Les instantanés arrivent vingt fois par seconde, plus ou moins
// en retard selon le réseau. On montre le passé proche, en interpolant entre deux instantanés : le retard s'ajuste à
// l'irrégularité du réseau, juste assez pour avoir presque toujours un instantané d'avance, et l'horloge avance sans
// à-coups. Le héros de l'invité, lui, est prédit (voir `predict.ts`) : il répond tout de suite à ses commandes.
import type { PlayerConfig } from '../game/config';
import { lerp, type Vec2 } from '../game/math';
import type { InputFrame } from '../game/types';
import type { EnemyView, HeroView, PeachView, ProjectileView, StumpView, WebView, WorldView } from '../game/view';
import { Prediction } from './predict';
import { SNAPSHOT_EVERY, TICK_RATE, type HeroSnap, type Snapshot } from './protocol';

/** Pas de l'hôte par milliseconde. */
const TICKS_PER_MS = TICK_RATE / 1000;
/** Instantanés gardés pour interpoler, et arrivées retenues pour mesurer l'irrégularité du réseau (deux secondes). */
const BUFFER = 20;
const SAMPLES = 40;
/** Retard d'affichage (en pas) : au moins l'écart entre deux instantanés, au plus une demi-seconde. */
const MIN_DELAY = SNAPSHOT_EVERY + 1;
const MAX_DELAY = 30;
/** Faute d'instantané plus récent, on prolonge les mouvements pendant au plus ce nombre de pas, puis on attend. */
const MAX_EXTRAPOLATION = 6;
/** Écart (en pas) au-delà duquel l'horloge saute au lieu de rattraper doucement. */
const RESYNC = 45;

type Mirror<T> = { -readonly [K in keyof T]: T[K] };

/** Entre deux listes d'entités, interpole la position de celles qui sont dans les deux (par identifiant). */
function blend<T extends { id: number; pos: Vec2 }>(before: readonly T[], after: readonly T[], t: number): T[] {
  if (t === 1) return after as T[];
  const old = new Map(before.map((e) => [e.id, e]));
  return after.map((e) => {
    const was = old.get(e.id);
    return was ? { ...e, pos: lerp(was.pos, e.pos, t) } : e;
  });
}

export class MirrorWorld implements WorldView {
  players: HeroView[] = [];
  player: HeroView;
  enemies: EnemyView[] = [];
  projectiles: ProjectileView[] = [];
  stumps: StumpView[] = [];
  peaches: PeachView[] = [];
  webs: WebView[] = [];
  hammerOut = false;
  readonly cfg: WorldView['cfg'];

  preyOf(enemyId: number): number {
    return this.enemies.find((e) => e.id === enemyId)?.prey ?? this.seat;
  }

  private readonly buffer: Snapshot[] = [];
  /** Pour chaque instantané reçu : son pas moins l'heure d'arrivée (en pas). Le plus grand : l'arrivée la plus rapide. */
  private readonly arrivals: number[] = [];
  /** Pas de l'hôte montré à l'écran, et heure de la dernière image. */
  private clock: number | null = null;
  private lastFrame = 0;
  /** Retard d'affichage actuel (en pas). */
  delay = MIN_DELAY;
  private readonly prediction: Prediction;
  /** Dernières souches et pêchers affichés : on garde les mêmes tableaux tant qu'ils ne changent pas. */
  private stumpKey = '';
  private peachKey = '';

  constructor(
    private readonly configs: PlayerConfig[],
    /** La place du héros de ce joueur. */
    readonly seat: number,
    /** La descente : les paquets d'une autre sont ignorés. */
    readonly run: number,
    arena: { halfSize: number; webSlow: number; webBurnTime: number },
    level: number,
  ) {
    this.cfg = { webs: { burnTime: arena.webBurnTime }, difficulty: { level } };
    this.players = configs.map((cfg, id) => this.hero(cfg, id));
    this.player = this.players[seat];
    this.prediction = new Prediction(configs[seat], arena.halfSize, arena.webSlow);
  }

  /** Une commande vient de partir vers l'hôte. */
  record(seq: number, frame: InputFrame): void {
    this.prediction.record(seq, frame);
  }

  /** Un instantané vient d'arriver ; `at` : l'heure d'arrivée (performance.now()). */
  push(snap: Snapshot, at: number): void {
    if (snap.run !== this.run) return;
    const last = this.buffer[this.buffer.length - 1];
    this.arrivals.push(snap.tick - at * TICKS_PER_MS);
    if (this.arrivals.length > SAMPLES) this.arrivals.shift();
    // Arrivé après un plus récent : trop tard pour servir, mais il compte pour mesurer le réseau.
    if (last && snap.tick <= last.tick) return;
    this.buffer.push(snap);
    if (this.buffer.length > BUFFER) this.buffer.shift();
    const mine = snap.heroes[this.seat];
    if (mine) this.prediction.correct(mine, snap.ack, snap);
  }

  get ready(): boolean {
    return this.buffer.length > 0;
  }

  /** Dernier pas de l'hôte reçu. */
  get latestTick(): number {
    return this.buffer[this.buffer.length - 1]?.tick ?? 0;
  }

  /** Prépare ce qu'on affiche à l'instant `now`. */
  update(now: number): void {
    const latest = this.buffer[this.buffer.length - 1];
    if (!latest) return;
    const dt = this.lastFrame ? Math.min(0.25, (now - this.lastFrame) / 1000) : 0;
    this.lastFrame = now;
    const shown = this.advanceClock(now, dt);

    // Les deux instantanés qui encadrent le pas montré ; au-delà du dernier, on prolonge un peu les mouvements.
    let a = latest;
    let b = latest;
    let t = 1;
    if (this.buffer.length > 1) {
      let i = this.buffer.findIndex((s) => s.tick >= shown);
      if (i === 0) i = 1;
      if (i < 0) i = this.buffer.length - 1;
      a = this.buffer[i - 1];
      b = this.buffer[i];
      const span = b.tick - a.tick;
      t = Math.max(0, Math.min(1 + MAX_EXTRAPOLATION / span, (shown - a.tick) / span));
    }

    this.players = b.heroes.map((snap) => {
      if (snap.id === this.seat) return this.mine(latest.heroes[snap.id] ?? snap, dt);
      const was = a.heroes.find((h) => h.id === snap.id);
      return this.hero(this.configs[snap.id], snap.id, was ? { ...snap, pos: lerp(was.pos, snap.pos, t) } : snap);
    });
    this.player = this.players[this.seat] ?? this.players[0];
    this.enemies = blend(a.enemies, b.enemies, t);
    this.projectiles = blend(a.projectiles, b.projectiles, t);
    this.webs = b.webs;
    const stumpKey = JSON.stringify(b.stumps);
    if (stumpKey !== this.stumpKey) {
      this.stumpKey = stumpKey;
      this.stumps = b.stumps;
    }
    const peachKey = JSON.stringify(b.peaches);
    if (peachKey !== this.peachKey) {
      this.peachKey = peachKey;
      this.peaches = b.peaches;
    }
    const mine = latest.heroes[this.seat];
    this.hammerOut = mine?.hammerOut ?? false;
  }

  /**
   * Avance l'horloge de l'affichage et renvoie le pas de l'hôte à montrer. Elle vise l'heure de l'hôte moins un retard
   * qui couvre l'irrégularité des arrivées (neuf sur dix à l'heure) ; elle accélère ou ralentit un peu pour s'en
   * rapprocher, sans sauter.
   */
  private advanceClock(now: number, dt: number): number {
    const fastest = Math.max(...this.arrivals);
    const lateness = this.arrivals.map((x) => fastest - x).sort((x, y) => x - y);
    const jitter = lateness[Math.floor(0.9 * (lateness.length - 1))] ?? 0;
    const want = Math.max(MIN_DELAY, Math.min(MAX_DELAY, SNAPSHOT_EVERY + jitter + 1));
    // Le retard monte aussitôt quand le réseau se dégrade, et redescend lentement.
    this.delay = want > this.delay ? want : this.delay + (want - this.delay) * Math.min(1, dt * 0.5);
    const target = now * TICKS_PER_MS + fastest - this.delay;
    if (this.clock === null || Math.abs(target - this.clock) > RESYNC) {
      this.clock = target;
    } else {
      // Au plus 10 % plus vite ou plus lentement que le temps réel.
      const drift = Math.max(-0.1, Math.min(0.1, (target - this.clock) * 0.05));
      this.clock += dt * TICK_RATE * (1 + drift);
    }
    return this.clock;
  }

  /** Le héros de ce joueur : son état le plus récent, à la place prédite. */
  private mine(snap: HeroSnap, dt: number): HeroView {
    const shown = this.prediction.update(dt, this);
    return this.hero(this.configs[this.seat], this.seat, shown ? { ...snap, ...shown } : snap);
  }

  private hero(cfg: PlayerConfig, id: number, snap?: HeroSnap): HeroView {
    const view: Mirror<HeroView> = {
      id,
      cfg,
      pos: { x: 0, z: 0 },
      facing: { x: 1, z: 0 },
      radius: cfg.radius,
      pose: 'idle',
      altitude: 0,
      hp: cfg.maxHp,
      dead: false,
      revive: 0,
      invulnerable: 0,
      frenzy: 0,
      transformed: 0,
      hidden: 0,
      aura: 0,
      ward: 0,
      mana: 0,
      smoke: null,
      drawProgress: 0,
      canSmash: false,
      smashCooldown: 0,
      stance: 'garde',
      ghostCooldown: 0,
      aegisOn: null,
      aegisCooldown: 0,
      dodgeCooldown: 0,
      bondCooldown: 0,
      frenzyCooldown: 0,
      sealCooldown: 0,
      wardCooldown: 0,
      flightCooldown: 0,
      meteorCooldown: 0,
      deathMarkCooldown: 0,
      smokeCooldown: 0,
      danceCooldown: 0,
      auraCooldown: 0,
      hammerCooldown: 0,
      guardLeft: cfg.paladin.guard.max,
      guardBroken: 0,
      fervor: 0,
      barrier: 0,
      netCooldown: 0,
      huntCooldown: 0,
      leapCooldown: 0,
    };
    if (snap) {
      const { hammerOut: _hammer, ...fields } = snap;
      Object.assign(view, fields);
    }
    return view;
  }
}
