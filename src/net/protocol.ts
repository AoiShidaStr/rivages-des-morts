// Ce que l'hôte et les invités s'échangent. L'hôte fait tourner le combat ; vingt fois par seconde, il envoie à chaque
// invité un instantané de ce que l'affichage doit montrer, par le canal rapide : un instantané perdu est remplacé par
// le suivant. Les événements du combat (coups, morts, butin) partent à part, par le canal sûr. Les invités envoient
// leurs commandes à chaque pas, numérotées, par le canal rapide.
import type { PlayerConfig } from '../game/config';
import type { Vec2 } from '../game/math';
import type { GameEvent } from '../game/types';
import type { EnemyView, HeroView, PeachView, ProjectileView, StumpView, SummonView, WebView } from '../game/view';
import type { World } from '../game/world';
import type { Json } from './transport';

/** À changer quand les messages changent : deux versions différentes du jeu ne jouent pas ensemble. */
export const PROTOCOL = 3;
/** Trois héros au plus dans une partie. */
export const MAX_PLAYERS = 3;
/** L'hôte envoie un instantané tous les `SNAPSHOT_EVERY` pas de simulation (20 par seconde). */
export const SNAPSHOT_EVERY = 3;
/** Pas de simulation par seconde. */
export const TICK_RATE = 60;

/** Qui l'on est, tel qu'on se présente au salon. */
export interface Member {
  name: string;
  race: string;
  cls: string;
  level: number;
  sprite: string;
  config: PlayerConfig;
}

export interface LobbyPlayer {
  peer: string;
  name: string;
  race: string;
  cls: string;
  level: number;
  ready: boolean;
  host: boolean;
}

export interface Lobby {
  code: string;
  players: LobbyPlayer[];
  dungeon: string;
  level: number;
  open: boolean;
  inGame: boolean;
}

/** Début d'une descente : son numéro, le donjon, son niveau, les héros dans l'ordre et la place de celui qui reçoit. */
export interface Start {
  run: number;
  dungeon: string;
  level: number;
  seat: number;
  heroes: { name: string; sprite: string; config: PlayerConfig }[];
}

/** Annonce d'une partie publique, pour la liste des parties ouvertes. */
export interface Announce {
  code: string;
  host: string;
  cls: string;
  level: number;
  dungeon: string;
  dungeonLevel: number;
  players: number;
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/** Un héros dans un instantané : tout ce que l'affichage lit, sauf ses réglages (connus depuis le départ). */
export type HeroSnap = Omit<Mutable<HeroView>, 'cfg'> & { soulNear: boolean; graveNear: boolean; hammerOut: boolean };

export interface Snapshot {
  /** Numéro de la descente : un paquet d'une descente précédente, arrivé en retard, est ignoré. */
  run: number;
  tick: number;
  /** Dernière commande de ce joueur que l'hôte a jouée (0 : aucune). */
  ack: number;
  heroes: HeroSnap[];
  enemies: EnemyView[];
  summons: SummonView[];
  projectiles: ProjectileView[];
  stumps: StumpView[];
  peaches: PeachView[];
  webs: WebView[];
}

/** Événements du combat depuis le paquet précédent, jusqu'au pas `tick`. */
export interface EventPacket {
  run: number;
  tick: number;
  events: GameEvent[];
}

/**
 * Commandes d'un invité pour un pas. Les appuis sont comptés depuis le début de la descente : si un paquet se perd,
 * le suivant dit quand même combien de fois on a appuyé, et aucun appui ne se perd ni ne compte deux fois.
 */
export interface InputPacket {
  run: number;
  seq: number;
  move: Vec2;
  aim: Vec2;
  aimGround: Vec2;
  attackHeld: boolean;
  signatureHeld: boolean;
  /** Appuis : attaque, signature, esquive, A, E, R. */
  presses: number[];
  /** Ping mesuré par l'invité (ms), pour l'afficher chez l'hôte. */
  ping: number;
}

// --- Instantanés compacts -------------------------------------------------------------
//
// Un champ égal à sa valeur par défaut n'est pas envoyé ; les vecteurs partent en paires [x, z] arrondies au centimètre ;
// les noms des champs sont remplacés par un code court (leur rang dans `FIELDS`). Les recharges des alliés ne servent
// qu'au HUD de leur propre joueur : chacun ne reçoit que les siennes. Un instantané tient ainsi dans un paquet réseau.

/** Arrondi au centième. */
const r = (x: number): number => Math.round(x * 100) / 100;

const COOLDOWNS = {
  dodgeCooldown: 0,
  bondCooldown: 0,
  frenzyCooldown: 0,
  recallCooldown: 0,
  sacrificeCooldown: 0,
  choirCooldown: 0,
  dashRecharge: 0,
  deathMarkCooldown: 0,
  smokeCooldown: 0,
  danceCooldown: 0,
  auraCooldown: 0,
  hammerCooldown: 0,
  guardBroken: 0,
  raiseCooldown: 0,
  netCooldown: 0,
  huntCooldown: 0,
  leapCooldown: 0,
} as const;

/** Champs du héros que seul son joueur reçoit. */
const PRIVATE: readonly string[] = [...Object.keys(COOLDOWNS), 'dashCharges', 'guardLeft', 'rage', 'canSmash', 'drawProgress', 'soulNear', 'graveNear', 'hammerOut'];

const HERO_DEFAULTS: Partial<HeroSnap> = {
  pose: 'idle',
  altitude: 0,
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
  ...COOLDOWNS,
  guardLeft: 100,
  soulNear: false,
  graveNear: false,
  hammerOut: false,
};
const ENEMY_DEFAULTS: Partial<EnemyView> = { pose: 'idle', altitude: 0, spawnProgress: 1, elite: false, mark: null, dead: false, boss: false };
const SUMMON_DEFAULTS: Partial<SummonView> = { pose: 'idle', spawnProgress: 1, vigor: 1, holy: false, companion: false };
const PROJECTILE_DEFAULTS: Partial<ProjectileView> = { full: false };
const WEB_DEFAULTS: Partial<WebView> = { burning: null };
const NO_DEFAULTS = {};

/** Champs qui sont des vecteurs. */
const VECTORS = new Set(['pos', 'facing', 'dir', 'to']);

/** Champs des instantanés, dans un ordre fixe : leur rang donne leur code. Un champ absent de la liste garde son nom. */
const FIELDS = [
  ...['id', 'pos', 'facing', 'radius', 'pose', 'hp', 'kind', 'sprite', 'maxHp', 'altitude', 'spawnProgress', 'elite', 'mark', 'dead', 'boss', 'prey'],
  ...['gaze', 'watched', 'repelled', 'thread', 'to', 'taut', 'owner', 'vigor', 'holy', 'dir', 'full', 'ripe', 'age', 'burning', 'companion'],
  ...['revive', 'invulnerable', 'frenzy', 'transformed', 'hidden', 'aura', 'choir', 'smoke', 'cloud', 'drawProgress', 'rage', 'canSmash'],
  ...['dashCharges', 'soulNear', 'graveNear', 'hammerOut', 'guardLeft', ...Object.keys(COOLDOWNS)],
];
const CODE = new Map(FIELDS.map((name, i) => [name, i.toString(36)]));
const NAME = new Map(FIELDS.map((name, i) => [i.toString(36), name]));

type Plain = { [key: string]: unknown };

function packValue(value: unknown): Json {
  if (typeof value === 'number') return r(value);
  if (value === null || typeof value !== 'object') return value as Json;
  if (Array.isArray(value)) return value.map(packValue);
  return packObject(value as Plain, NO_DEFAULTS);
}

function packObject(obj: Plain, defaults: Plain, skip?: readonly string[]): { [key: string]: Json } {
  const out: { [key: string]: Json } = {};
  for (const key in obj) {
    const value = obj[key];
    if (value === undefined || skip?.includes(key)) continue;
    if (key in defaults && defaults[key] === value) continue;
    const code = CODE.get(key) ?? key;
    if (VECTORS.has(key) && value && typeof value === 'object') {
      const v = value as Vec2;
      out[code] = [r(v.x), r(v.z)];
    } else {
      out[code] = packValue(value);
    }
  }
  return out;
}

function unpackObject<T>(obj: Plain, defaults: Plain): T {
  const out: Plain = { ...defaults };
  for (const code in obj) {
    const value = obj[code];
    const key = NAME.get(code) ?? code;
    if (VECTORS.has(key) && Array.isArray(value)) out[key] = { x: value[0], z: value[1] };
    else if (value && typeof value === 'object' && !Array.isArray(value)) out[key] = unpackObject(value as Plain, NO_DEFAULTS);
    else out[key] = value;
  }
  return out as T;
}

const packList = (list: readonly object[], defaults: Plain): Json => list.map((item) => packObject(item as Plain, defaults));
const unpackList = <T>(list: unknown, defaults: Plain): T[] => (Array.isArray(list) ? list.map((item) => unpackObject<T>(item as Plain, defaults)) : []);

/** Les héros tels que l'hôte les voit, avec ce que seul leur joueur lit. */
function heroSnaps(world: World): HeroSnap[] {
  return world.players.map((p) => ({
    id: p.id,
    pos: p.pos,
    facing: p.facing,
    radius: p.radius,
    pose: p.pose,
    altitude: p.altitude,
    hp: p.hp,
    dead: p.dead,
    revive: p.revive,
    invulnerable: p.invulnerable,
    frenzy: p.frenzy,
    transformed: p.transformed,
    hidden: p.hidden,
    aura: p.aura,
    choir: p.choir,
    smoke: p.smoke ? { pos: p.smoke.pos, cloud: p.smoke.cloud } : null,
    drawProgress: p.drawProgress,
    rage: p.rage,
    canSmash: p.canSmash,
    dodgeCooldown: p.dodgeCooldown,
    bondCooldown: p.bondCooldown,
    frenzyCooldown: p.frenzyCooldown,
    recallCooldown: p.recallCooldown,
    sacrificeCooldown: p.sacrificeCooldown,
    choirCooldown: p.choirCooldown,
    dashCharges: p.dashCharges,
    dashRecharge: p.dashRecharge,
    deathMarkCooldown: p.deathMarkCooldown,
    smokeCooldown: p.smokeCooldown,
    danceCooldown: p.danceCooldown,
    auraCooldown: p.auraCooldown,
    hammerCooldown: p.hammerCooldown,
    guardLeft: p.guardLeft,
    guardBroken: p.guardBroken,
    raiseCooldown: p.raiseCooldown,
    netCooldown: p.netCooldown,
    huntCooldown: p.huntCooldown,
    leapCooldown: p.leapCooldown,
    soulNear: world.soulNear(p),
    graveNear: world.graveNear(p),
    hammerOut: world.hammerOutOf(p),
  }));
}

/** L'état de la partie à un pas, commun à tous les invités : compacté une fois, puis chacun reçoit ses héros. */
export interface SharedSnap {
  tick: number;
  heroes: HeroSnap[];
  rest: { [key: string]: Json };
}

export function shareSnapshot(world: World, tick: number): SharedSnap {
  const enemies = world.enemies.map((e) => {
    const extra = e as Partial<Pick<EnemyView, 'gaze' | 'watched' | 'repelled' | 'thread'>>;
    return {
      id: e.id,
      kind: e.kind,
      // La planche porte presque toujours le nom du yokai : on ne l'envoie que si elle diffère.
      ...(e.sprite !== e.kind ? { sprite: e.sprite } : {}),
      pos: e.pos,
      facing: e.facing,
      radius: e.radius,
      pose: e.pose,
      altitude: e.altitude,
      spawnProgress: e.spawnProgress,
      elite: e.elite,
      mark: e.mark,
      dead: e.dead,
      boss: e.boss,
      hp: e.hp,
      maxHp: e.maxHp,
      ...(e.boss ? { prey: world.preyOf(e.id) } : {}),
      ...(extra.gaze !== undefined ? { gaze: extra.gaze, watched: Boolean(extra.watched), repelled: Boolean(extra.repelled) } : {}),
      ...(extra.thread !== undefined ? { thread: extra.thread ? { to: extra.thread.to, taut: extra.thread.taut } : null } : {}),
    };
  });
  const summons = world.summons.map((s) => ({
    id: s.id,
    kind: s.kind,
    owner: s.owner,
    pos: s.pos,
    facing: s.facing,
    radius: s.radius,
    pose: s.pose,
    spawnProgress: s.spawnProgress,
    vigor: s.vigor,
    holy: s.holy,
    companion: s.companion,
  }));
  return {
    tick,
    heroes: heroSnaps(world),
    rest: {
      e: packList(enemies, ENEMY_DEFAULTS),
      s: packList(summons, SUMMON_DEFAULTS),
      p: packList(
        world.projectiles.map((p) => ({ id: p.id, kind: p.kind, pos: p.pos, dir: p.dir, full: p.full })),
        PROJECTILE_DEFAULTS,
      ),
      t: packList(
        world.stumps.map((s) => ({ pos: s.pos, radius: s.radius })),
        NO_DEFAULTS,
      ),
      c: packList(
        world.peaches.map((p) => ({ pos: p.pos, radius: p.radius, ripe: p.ripe })),
        NO_DEFAULTS,
      ),
      w: packList(
        world.webs.map((w) => ({ id: w.id, pos: w.pos, radius: w.radius, age: w.age, burning: w.burning })),
        WEB_DEFAULTS,
      ),
    },
  };
}

/** L'instantané d'un invité, prêt à partir ; `ack` : la dernière de ses commandes jouée. */
export function packSnapshot(shared: SharedSnap, run: number, seat: number, ack: number): Json {
  return {
    run,
    tick: shared.tick,
    ack,
    h: shared.heroes.map((hero) => packObject(hero, HERO_DEFAULTS, hero.id === seat ? undefined : PRIVATE)),
    ...shared.rest,
  };
}

/** Un instantané reçu ; `null` s'il est illisible. */
export function unpackSnapshot(data: Json): Snapshot | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const d = data as Plain;
  if (typeof d.tick !== 'number' || typeof d.run !== 'number') return null;
  return {
    run: d.run,
    tick: d.tick,
    ack: typeof d.ack === 'number' ? d.ack : 0,
    heroes: unpackList<HeroSnap>(d.h, HERO_DEFAULTS),
    enemies: unpackList<Mutable<EnemyView>>(d.e, ENEMY_DEFAULTS).map((e) => {
      e.sprite ??= e.kind;
      return e;
    }),
    summons: unpackList<SummonView>(d.s, SUMMON_DEFAULTS),
    projectiles: unpackList<ProjectileView>(d.p, PROJECTILE_DEFAULTS),
    stumps: unpackList<StumpView>(d.t, NO_DEFAULTS),
    peaches: unpackList<PeachView>(d.c, NO_DEFAULTS),
    webs: unpackList<WebView>(d.w, WEB_DEFAULTS),
  };
}
