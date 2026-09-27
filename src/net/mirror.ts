// Chez un invité : la partie telle que l'hôte la décrit. Les instantanés arrivent vingt fois par seconde ; entre
// deux, on interpole les positions avec un léger retard, pour que tout bouge sans saccades. Le héros de l'invité,
// lui, suit toujours le dernier instantané, pour répondre au plus vite à ses commandes.
import type { PlayerConfig } from '../game/config';
import { lerp, type Vec2 } from '../game/math';
import type { EnemyView, HeroView, PeachView, ProjectileView, StumpView, SummonView, WebView, WorldView } from '../game/view';
import type { HeroSnap, Snapshot } from './protocol';

/** Pas de simulation par seconde chez l'hôte. */
const TICK_RATE = 60;
/** Retard d'affichage des autres (en pas) : un peu plus que l'écart entre deux instantanés. */
const DELAY_TICKS = 6;
/** Instantanés gardés en mémoire pour interpoler. */
const BUFFER = 12;

type Mirror<T> = { -readonly [K in keyof T]: T[K] };

const mix = (a: Vec2, b: Vec2, t: number): Vec2 => lerp(a, b, t);

/** Entre deux listes d'entités, interpole la position de celles qui sont dans les deux (par identifiant). */
function blend<T extends { id: number; pos: Vec2 }>(before: readonly T[], after: readonly T[], t: number): T[] {
  const old = new Map(before.map((e) => [e.id, e]));
  return after.map((e) => {
    const was = old.get(e.id);
    return was ? { ...e, pos: mix(was.pos, e.pos, t) } : e;
  });
}

export class MirrorWorld implements WorldView {
  players: HeroView[] = [];
  player: HeroView;
  enemies: EnemyView[] = [];
  summons: SummonView[] = [];
  projectiles: ProjectileView[] = [];
  stumps: StumpView[] = [];
  peaches: PeachView[] = [];
  webs: WebView[] = [];
  soulInReach = false;
  graveInReach = false;
  hammerOut = false;
  readonly cfg: WorldView['cfg'];

  preyOf(enemyId: number): number {
    return this.enemies.find((e) => e.id === enemyId)?.prey ?? this.seat;
  }

  private readonly buffer: { snap: Snapshot; at: number }[] = [];
  /** Dernières souches et pêchers affichés : on garde les mêmes tableaux tant qu'ils ne changent pas. */
  private stumpKey = '';
  private peachKey = '';

  constructor(
    private readonly configs: PlayerConfig[],
    /** La place du héros de ce joueur. */
    readonly seat: number,
    webBurnTime: number,
    level: number,
  ) {
    this.cfg = { webs: { burnTime: webBurnTime }, difficulty: { level } };
    this.players = configs.map((cfg, id) => this.hero(cfg, id));
    this.player = this.players[seat];
  }

  /** Un instantané vient d'arriver ; `at` : l'heure d'arrivée (performance.now()). */
  push(snap: Snapshot, at: number): void {
    const last = this.buffer[this.buffer.length - 1];
    if (last && snap.tick <= last.snap.tick) return;
    this.buffer.push({ snap, at });
    if (this.buffer.length > BUFFER) this.buffer.shift();
  }

  get ready(): boolean {
    return this.buffer.length > 0;
  }

  /** Prépare ce qu'on affiche à l'instant `now`. */
  update(now: number): void {
    const latest = this.buffer[this.buffer.length - 1];
    if (!latest) return;
    // Pas de l'hôte estimé maintenant, puis celui qu'on montre, un peu en retard.
    const hostTick = latest.snap.tick + ((now - latest.at) / 1000) * TICK_RATE;
    const shown = hostTick - DELAY_TICKS;
    let a = latest.snap;
    let b = latest.snap;
    for (let i = this.buffer.length - 1; i > 0; i--) {
      const before = this.buffer[i - 1].snap;
      const after = this.buffer[i].snap;
      if (before.tick <= shown && shown <= after.tick) {
        a = before;
        b = after;
        break;
      }
      if (i === 1 && shown < before.tick) a = b = before;
    }
    const t = b.tick > a.tick ? (shown - a.tick) / (b.tick - a.tick) : 1;

    this.players = b.heroes.map((snap) => {
      // Le héros de ce joueur : le plus récent ; les autres, interpolés.
      if (snap.id === this.seat) return this.hero(this.configs[snap.id], snap.id, latest.snap.heroes[snap.id] ?? snap);
      const was = a.heroes.find((h) => h.id === snap.id);
      return this.hero(this.configs[snap.id], snap.id, was ? { ...snap, pos: mix(was.pos, snap.pos, t) } : snap);
    });
    this.player = this.players[this.seat] ?? this.players[0];
    this.enemies = blend(a.enemies, b.enemies, t);
    this.summons = blend(a.summons, b.summons, t);
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
    const mine = latest.snap.heroes[this.seat];
    this.soulInReach = mine?.soulNear ?? false;
    this.graveInReach = mine?.graveNear ?? false;
    this.hammerOut = mine?.hammerOut ?? false;
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
      choir: 0,
      smoke: null,
      drawProgress: 0,
      rage: 0,
      canSmash: false,
      dodgeCooldown: 0,
      bondCooldown: 0,
      frenzyCooldown: 0,
      recallCooldown: 0,
      sacrificeCooldown: 0,
      choirCooldown: 0,
      dashCharges: cfg.blade.shadowDash.charges,
      dashRecharge: 0,
      deathMarkCooldown: 0,
      smokeCooldown: 0,
      danceCooldown: 0,
      auraCooldown: 0,
      hammerCooldown: 0,
      raiseCooldown: 0,
      netCooldown: 0,
      huntCooldown: 0,
      leapCooldown: 0,
    };
    if (snap) {
      const { soulNear: _soul, graveNear: _grave, hammerOut: _hammer, ...fields } = snap;
      Object.assign(view, fields);
    }
    return view;
  }
}
