// Ce que l'hôte et les invités s'échangent. L'hôte fait tourner le combat ; il envoie vingt fois par seconde un
// instantané de ce que l'affichage doit montrer, avec les événements du moment. Les invités lui envoient leurs
// commandes à chaque image.
import type { PlayerConfig } from '../game/config';
import type { Vec2 } from '../game/math';
import type { GameEvent, InputFrame } from '../game/types';
import type { EnemyView, HeroView, PeachView, ProjectileView, StumpView, SummonView, WebView } from '../game/view';
import type { World } from '../game/world';

/** À changer quand les messages changent : deux versions différentes du jeu ne jouent pas ensemble. */
export const PROTOCOL = 1;
/** Trois héros au plus dans une partie. */
export const MAX_PLAYERS = 3;
/** L'hôte envoie un instantané tous les `SNAPSHOT_EVERY` pas de simulation (20 par seconde). */
export const SNAPSHOT_EVERY = 3;

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

/** Début d'une descente : le donjon, son niveau, les héros dans l'ordre et la place de celui qui reçoit. */
export interface Start {
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
  tick: number;
  heroes: HeroSnap[];
  enemies: EnemyView[];
  summons: SummonView[];
  projectiles: ProjectileView[];
  stumps: StumpView[];
  peaches: PeachView[];
  webs: WebView[];
}

/** Paquet de l'hôte : l'instantané et les événements depuis le précédent. */
export interface StatePacket {
  snap: Snapshot;
  events: GameEvent[];
}

export type InputPacket = InputFrame;

/** Arrondi au millième : les instantanés restent légers. */
const r = (x: number): number => Math.round(x * 1000) / 1000;
const v = (p: Vec2): Vec2 => ({ x: r(p.x), z: r(p.z) });

/** Instantané de la partie, pour les invités. */
export function snapshotOf(world: World, tick: number): Snapshot {
  return {
    tick,
    heroes: world.players.map((p) => ({
      id: p.id,
      pos: v(p.pos),
      facing: v(p.facing),
      radius: p.radius,
      pose: p.pose,
      altitude: r(p.altitude),
      hp: r(p.hp),
      dead: p.dead,
      revive: r(p.revive),
      invulnerable: r(p.invulnerable),
      frenzy: r(p.frenzy),
      transformed: r(p.transformed),
      hidden: r(p.hidden),
      aura: r(p.aura),
      choir: r(p.choir),
      smoke: p.smoke ? { pos: v(p.smoke.pos), cloud: p.smoke.cloud } : null,
      drawProgress: r(p.drawProgress),
      rage: r(p.rage),
      canSmash: p.canSmash,
      dodgeCooldown: r(p.dodgeCooldown),
      bondCooldown: r(p.bondCooldown),
      frenzyCooldown: r(p.frenzyCooldown),
      recallCooldown: r(p.recallCooldown),
      sacrificeCooldown: r(p.sacrificeCooldown),
      choirCooldown: r(p.choirCooldown),
      dashCharges: p.dashCharges,
      dashRecharge: r(p.dashRecharge),
      deathMarkCooldown: r(p.deathMarkCooldown),
      smokeCooldown: r(p.smokeCooldown),
      danceCooldown: r(p.danceCooldown),
      auraCooldown: r(p.auraCooldown),
      hammerCooldown: r(p.hammerCooldown),
      raiseCooldown: r(p.raiseCooldown),
      netCooldown: r(p.netCooldown),
      huntCooldown: r(p.huntCooldown),
      leapCooldown: r(p.leapCooldown),
      soulNear: world.soulNear(p),
      graveNear: world.graveNear(p),
      hammerOut: world.hammerOutOf(p),
    })),
    enemies: world.enemies.map((e) => {
      const extra = e as Partial<Pick<EnemyView, 'gaze' | 'watched' | 'repelled' | 'thread'>>;
      return {
        id: e.id,
        kind: e.kind,
        sprite: e.sprite,
        pos: v(e.pos),
        facing: v(e.facing),
        radius: e.radius,
        pose: e.pose,
        altitude: r(e.altitude),
        spawnProgress: r(e.spawnProgress),
        elite: e.elite,
        mark: e.mark,
        dead: e.dead,
        boss: e.boss,
        hp: r(e.hp),
        maxHp: r(e.maxHp),
        ...(e.boss ? { prey: world.preyOf(e.id) } : {}),
        ...(extra.gaze !== undefined ? { gaze: r(extra.gaze), watched: Boolean(extra.watched), repelled: Boolean(extra.repelled) } : {}),
        ...(extra.thread !== undefined ? { thread: extra.thread ? { to: v(extra.thread.to), taut: extra.thread.taut } : null } : {}),
      };
    }),
    summons: world.summons.map((s) => ({
      id: s.id,
      kind: s.kind,
      owner: s.owner,
      pos: v(s.pos),
      facing: v(s.facing),
      radius: s.radius,
      pose: s.pose,
      spawnProgress: r(s.spawnProgress),
      vigor: r(s.vigor),
      holy: s.holy,
    })),
    projectiles: world.projectiles.map((p) => ({ id: p.id, kind: p.kind, pos: v(p.pos), dir: v(p.dir), full: p.full })),
    stumps: world.stumps.map((s) => ({ pos: v(s.pos), radius: s.radius })),
    peaches: world.peaches.map((p) => ({ pos: v(p.pos), radius: p.radius, ripe: p.ripe })),
    webs: world.webs.map((w) => ({ id: w.id, pos: v(w.pos), radius: w.radius, age: r(w.age), burning: w.burning === null ? null : r(w.burning) })),
  };
}
