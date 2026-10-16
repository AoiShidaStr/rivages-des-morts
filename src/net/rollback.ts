// Duel en ligne avec netcode à rollback. Les deux navigateurs font tourner le même combat (même graine, mêmes
// réglages) et ne s'envoient que leurs commandes, pas à pas. Chacun joue tout de suite les siennes ; celles de
// l'adversaire, qui arrivent avec le retard du réseau, sont devinées (il continue ce qu'il faisait). Quand la vraie
// commande arrive et diffère, on revient au pas où elle s'applique (chaque pas est gardé, src/net/copie.ts) et on
// rejoue jusqu'à maintenant. Chacun voit donc son héros et celui de l'autre au présent, sans hôte avantagé.
//
// Les commandes partent avec `INPUT_DELAY` pas de retard voulu : assez pour que celles de l'autre arrivent souvent à
// temps, trop peu pour qu'on le sente. Les sons et effets d'un pas se jouent la première fois qu'il est calculé (un
// coup découvert en rejouant se joue alors) ; le score et la fin du duel attendent que le pas soit sûr.
//
// Si les deux mondes divergent quand même (calculs flottants différents d'un navigateur à l'autre), l'hôte le voit
// à l'empreinte que l'invité lui envoie toutes les deux secondes, et lui renvoie son monde entier.
import type { GameEvent, InputFrame } from '../game/types';
import type { HeroView, WorldView } from '../game/view';
import type { World } from '../game/world';
import { randomState } from '../game/rng';
import { Copier, deserialize, serialize, type Saved } from './copie';
import { idleFrame } from './frames';
import { TICK_RATE } from './protocol';
import type { Json } from './transport';

const STEP = 1 / TICK_RATE;
const STEP_MS = 1000 / TICK_RATE;
/** Retard voulu des commandes (pas). */
export const INPUT_DELAY = 2;
/** Au-delà de ce nombre de pas devinés d'avance, on attend l'adversaire plutôt que de deviner encore (un tiers de seconde). */
const MAX_AHEAD = 20;
/** Commandes gardées (pas), pour rejouer après un renvoi du monde. */
const HISTORY = 900;
/** Commandes envoyées au plus par paquet : celles que l'autre n'a pas encore confirmées. */
const MAX_SENT = 120;
/** Empreinte du monde comparée tous les `HASH_EVERY` pas. */
const HASH_EVERY = 120;
/** Pas calculés au plus par image (après un onglet en arrière-plan, on rattrape par morceaux). */
const MAX_STEPS = 8;
/** Événements qui changent la partie elle-même : joués seulement une fois le pas sûr. */
const LOGIC: ReadonlySet<GameEvent['type']> = new Set(['duel', 'end']);
/** Quand un rejeu déplace l'adversaire, il glisse jusqu'à sa vraie place : la moitié de l'écart en ce temps (s). */
const HALF_LIFE = 0.05;
/** Au-delà de cet écart (m), il saute à sa place. */
const SNAP_DISTANCE = 3;

const BUTTONS = ['attackHeld', 'signatureHeld', 'attackPressed', 'signaturePressed', 'dodgePressed', 'skillAPressed', 'skillEPressed', 'skillRPressed', 'skillFPressed'] as const;
const PRESSES = BUTTONS.slice(2);

/** Une commande en sept nombres : direction (au millième), visée et sol visé (au centimètre), boutons. */
type Packed = number[];

function pack(frame: InputFrame): Packed {
  let flags = 0;
  BUTTONS.forEach((key, i) => {
    if (frame[key]) flags |= 1 << i;
  });
  const r = (x: number, k: number) => Math.round(x * k);
  return [r(frame.move.x, 1000), r(frame.move.z, 1000), r(frame.aim.x, 100), r(frame.aim.z, 100), r(frame.aimGround.x, 100), r(frame.aimGround.z, 100), flags];
}

function unpack(p: Packed): InputFrame {
  const frame = {
    move: { x: p[0] / 1000, z: p[1] / 1000 },
    aim: { x: p[2] / 100, z: p[3] / 100 },
    aimGround: { x: p[4] / 100, z: p[5] / 100 },
  } as InputFrame;
  BUTTONS.forEach((key, i) => {
    frame[key] = (p[6] & (1 << i)) !== 0;
  });
  return frame;
}

const samePacked = (a: Packed | undefined, b: Packed | undefined) => !!a && !!b && a.every((x, i) => x === b[i]);

/** Empreinte de l'état (positions, PV, hasard, temps) : la même dans deux navigateurs d'accord. */
function fingerprint(world: World, random: number): number {
  const parts: number[] = [random, world.time];
  for (const h of world.players) parts.push(h.pos.x, h.pos.z, h.hp, h.invulnerable);
  for (const e of world.enemies) parts.push(e.id, e.pos.x, e.pos.z, e.hp);
  parts.push(world.projectiles.length);
  let hash = 2166136261;
  for (const text of parts.map((x) => x.toFixed(4))) {
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  }
  return hash >>> 0;
}

/** Un paquet de commandes, dans un sens comme dans l'autre. */
interface Packet {
  /** Descente (un paquet d'un autre duel est ignoré). */
  r: number;
  /** Pas où en est l'expéditeur, et son ping (ms) : pour se caler l'un sur l'autre. */
  t: number;
  p: number;
  /** Dernier pas des commandes du destinataire que l'expéditeur a reçues sans trou. */
  a: number;
  /** Premier pas des commandes jointes, puis les commandes. */
  f: number;
  i: Packed[];
  /** Invité : l'empreinte de son monde à un pas donné. */
  h?: [number, number];
}

export class DuelNet {
  readonly view: WorldView;
  private readonly copier: Copier;
  private readonly other: number;
  /** Pas déjà calculés : le monde est l'état après `tick` pas. */
  private tick = 0;
  /** En deçà, les pas sont sûrs (les deux commandes connues et jouées). */
  private verified = 0;
  private readonly saves = new Map<number, Saved>();
  private readonly mine = new Map<number, Packed>();
  private readonly theirs = new Map<number, Packed>();
  /** Commande de l'adversaire utilisée à chaque pas (devinée ou reçue). */
  private readonly used = new Map<number, Packed>();
  /** Prochain pas de nos commandes à fixer, et dernier pas de celles de l'autre reçu sans trou. */
  private nextMine = INPUT_DELAY;
  private theirLast = -1;
  /** Dernier pas de nos commandes que l'autre a reçu. */
  private theirAck = -1;
  /** Événements déjà montrés, par pas (pour ne pas les rejouer), et ceux qui attendent que leur pas soit sûr. */
  private readonly shown = new Map<number, Map<string, number>>();
  private readonly logic = new Map<number, GameEvent[]>();
  private pending: GameEvent[] = [];
  private accumulator = 0;
  /** Où en est l'adversaire : son dernier pas annoncé, et quand on l'a appris. */
  private theirTick = { tick: 0, at: 0, ping: 0 };
  private dirty = false;
  /** Hôte : nos empreintes ; invité : la dernière à envoyer. */
  private readonly hashes = new Map<number, number>();
  private hashToSend: [number, number] | null = null;
  /** Hôte : dernier pas pour lequel on a déjà renvoyé le monde (l'invité répète son empreinte jusqu'à la suivante). */
  private resyncedAt = -1;
  /** Renvois du monde (hôte : envoyés ; invité : reçus), pour le journal de la console. */
  resyncs = 0;
  /** On attend l'adversaire (il ne répond plus, ou décroche). */
  stalled = false;
  /** Écart d'affichage de l'adversaire après un rejeu, qui se résorbe en douceur. */
  private offset = { x: 0, z: 0 };
  /** Les héros tels qu'on les montre à cette image (l'adversaire décalé de `offset`). */
  private shownPlayers: HeroView[] = [];
  /** Pas calculés à la dernière image (les appuis lus ne sont consommés que s'il y en a eu). */
  steps = 0;

  constructor(
    readonly world: World,
    /** La place de ce joueur (0 : l'hôte du salon). */
    readonly seat: number,
    readonly run: number,
    private readonly send: (packet: Json) => void,
    private readonly sendState: (state: Json) => void,
  ) {
    this.copier = new Copier(world);
    this.other = 1 - seat;
    const idle = pack(idleFrame(world.players[seat].pos));
    for (let t = 0; t < INPUT_DELAY; t++) this.mine.set(t, idle);
    // Le rendu et le HUD lisent « le héros du joueur » : le nôtre, pas le premier du monde.
    this.view = new Proxy(world, {
      get: (target, key) => {
        if (key === 'player') return target.players[seat];
        if (key === 'players') return this.shownPlayers.length ? this.shownPlayers : target.players;
        return Reflect.get(target, key, target);
      },
    }) as unknown as WorldView;
  }

  /** Ping vers l'adversaire (ms) : le nôtre, ou celui qu'il annonce faute de mieux. */
  get ping(): number {
    return this.theirTick.ping;
  }

  /**
   * Une image : rejoue ce qu'il faut si des commandes de l'autre sont arrivées, puis avance du temps écoulé, une
   * commande locale (`read`) par pas. Renvoie les événements à montrer.
   */
  update(dt: number, read: () => InputFrame, ping: number, now: number): GameEvent[] {
    if (this.dirty) this.reconcile();
    const fade = 0.5 ** (dt / HALF_LIFE);
    this.offset = { x: this.offset.x * fade, z: this.offset.z * fade };
    this.accumulator = Math.min(this.accumulator + dt, MAX_STEPS * STEP);
    // Trop en avance sur l'autre (il a commencé plus tard, ou son ordinateur rame) : on lui laisse un pas.
    const theirs = this.theirTick.at ? this.theirTick.tick + (now - this.theirTick.at + this.theirTick.ping / 2) / STEP_MS : this.tick;
    if (this.tick - theirs > 1.5 && this.accumulator >= STEP) this.accumulator -= STEP;
    this.stalled = false;
    let steps = 0;
    while (this.accumulator >= STEP && steps < MAX_STEPS) {
      if (this.tick - (this.theirLast + 1) >= MAX_AHEAD) {
        this.stalled = true;
        this.accumulator = Math.min(this.accumulator, STEP);
        break;
      }
      this.mine.set(this.nextMine++, pack(read()));
      this.simulate(this.tick);
      this.tick++;
      this.accumulator -= STEP;
      steps++;
    }
    this.steps = steps;
    this.showPlayers();
    // Les pas déjà sûrs n'ont pas besoin de rejeu (l'autre avait de l'avance) : on les valide tout de suite.
    this.advanceVerified();
    this.forget();
    this.post(ping);
    const events = this.pending;
    this.pending = [];
    return events;
  }

  /** Des commandes de l'adversaire. */
  receive(data: unknown, now: number): void {
    const packet = data as Packet;
    if (!packet || packet.r !== this.run || !Array.isArray(packet.i)) return;
    if (packet.t >= this.theirTick.tick) this.theirTick = { tick: packet.t, at: now, ping: packet.p || this.theirTick.ping };
    this.theirAck = Math.max(this.theirAck, packet.a);
    packet.i.forEach((p, k) => {
      const t = packet.f + k;
      if (t > this.theirLast && !this.theirs.has(t)) this.theirs.set(t, p);
    });
    while (this.theirs.has(this.theirLast + 1)) this.theirLast++;
    this.dirty = true;
    if (packet.h && this.seat === 0) {
      const [t, hash] = packet.h;
      const ours = this.hashes.get(t);
      if (ours !== undefined && ours !== hash && t > this.resyncedAt) {
        this.resyncedAt = t;
        this.resync();
      }
    }
  }

  /** Invité : le monde de l'hôte, après une divergence. */
  receiveState(data: unknown): void {
    const message = data as { r: number; t: number; s: string };
    if (!message || message.r !== this.run || typeof message.s !== 'string') return;
    const saved = deserialize(this.copier, this.world, message.s);
    if (!saved) return;
    this.resyncs++;
    const from = message.t;
    this.copier.restore(this.world, saved);
    this.saves.clear();
    this.hashToSend = null;
    this.tick = from;
    this.verified = from;
    const idle = pack(idleFrame(this.world.players[this.seat].pos));
    while (this.nextMine < from + INPUT_DELAY) this.mine.set(this.nextMine++, idle);
    // On rejoue nos pas déjà calculés au-delà, avec les commandes connues.
    const target = Math.max(from, this.nextMine - INPUT_DELAY);
    while (this.tick < target && this.mine.has(this.tick)) {
      this.simulate(this.tick);
      this.tick++;
    }
  }

  /** Les commandes de l'autre sont arrivées : si on avait mal deviné, on revient au premier pas faux et on rejoue. */
  private reconcile(): void {
    this.dirty = false;
    const known = Math.min(this.theirLast + 1, this.tick);
    let wrong = -1;
    for (let t = this.verified; t < known; t++) {
      if (!samePacked(this.used.get(t), this.theirs.get(t))) {
        wrong = t;
        break;
      }
    }
    if (wrong >= 0) {
      const saved = this.saves.get(wrong);
      if (saved) {
        const before = this.world.players[this.other].pos;
        const was = { x: before.x + this.offset.x, z: before.z + this.offset.z };
        this.copier.restore(this.world, saved);
        for (let t = wrong; t < this.tick; t++) this.simulate(t);
        const now = this.world.players[this.other].pos;
        const gap = { x: was.x - now.x, z: was.z - now.z };
        this.offset = Math.hypot(gap.x, gap.z) > SNAP_DISTANCE ? { x: 0, z: 0 } : gap;
      }
    }
    this.advanceVerified();
  }

  /** Les héros à montrer : l'adversaire glisse encore vers sa place si un rejeu l'a déplacé. */
  private showPlayers(): void {
    const players = this.world.players;
    const { x, z } = this.offset;
    if (Math.abs(x) + Math.abs(z) < 0.005) {
      this.shownPlayers = [];
      return;
    }
    this.shownPlayers = players.map((hero) =>
      hero.id !== this.other
        ? hero
        : (new Proxy(hero, { get: (target, key) => (key === 'pos' ? { x: target.pos.x + x, z: target.pos.z + z } : Reflect.get(target, key, target)) }) as HeroView),
    );
  }

  /** Calcule le pas `t` (l'état est celui d'après `t` pas), en gardant l'état d'avant. */
  private simulate(t: number): void {
    this.saves.set(t, this.copier.save(this.world));
    const known = this.theirs.get(t);
    const theirs = known ?? this.guess();
    this.used.set(t, theirs);
    const inputs: InputFrame[] = [];
    inputs[this.seat] = unpack(this.mine.get(t) as Packed);
    inputs[this.other] = unpack(theirs);
    this.world.update(STEP, inputs);
    const events = this.world.drainEvents();
    // Sons et effets : une seule fois par pas, même s'il est rejoué ; ce que le rejeu découvre se joue maintenant.
    const shown = this.shown.get(t) ?? new Map<string, number>();
    this.shown.set(t, shown);
    const seen = new Map<string, number>();
    const logic: GameEvent[] = [];
    for (const event of events) {
      if (LOGIC.has(event.type)) {
        logic.push(event);
        continue;
      }
      const key = eventKey(event);
      const n = (seen.get(key) ?? 0) + 1;
      seen.set(key, n);
      if ((shown.get(key) ?? 0) >= n) continue;
      shown.set(key, n);
      this.pending.push(event);
    }
    this.logic.set(t, logic);
  }

  /** Commande devinée de l'adversaire : il continue ce qu'il faisait, sans nouvel appui. */
  private guess(): Packed {
    const last = this.theirs.get(this.theirLast);
    if (!last) return pack(idleFrame(this.world.players[this.other].pos));
    const flags = PRESSES.reduce((f, _, i) => f & ~(1 << (i + 2)), last[6]);
    return [...last.slice(0, 6), flags];
  }

  /** Les pas dont les deux commandes sont connues et jouées deviennent sûrs : leur score, leur fin comptent. */
  private advanceVerified(): void {
    const known = Math.min(this.theirLast + 1, this.tick);
    while (this.verified < known && samePacked(this.used.get(this.verified), this.theirs.get(this.verified))) {
      const t = this.verified;
      this.pending.push(...(this.logic.get(t) ?? []));
      this.verified++;
      if (this.verified % HASH_EVERY === 0) {
        const saved = this.verified === this.tick ? null : this.saves.get(this.verified);
        const hash = saved ? fingerprint(saved.world, saved.random) : fingerprint(this.world, randomState());
        if (this.seat === 0) this.hashes.set(this.verified, hash);
        else this.hashToSend = [this.verified, hash];
      }
    }
  }

  /** Oublie ce qui ne servira plus : les états d'avant les pas sûrs, les vieilles commandes. */
  private forget(): void {
    for (const t of this.saves.keys()) if (t < this.verified) this.saves.delete(t);
    for (const map of [this.shown, this.logic, this.used]) for (const t of map.keys()) if (t < this.verified) map.delete(t);
    const old = this.tick - HISTORY;
    for (const map of [this.mine, this.theirs]) for (const t of map.keys()) if (t < old) map.delete(t);
    for (const t of this.hashes.keys()) if (t < old) this.hashes.delete(t);
  }

  /** Nos commandes que l'autre n'a pas encore, à chaque image (les paquets perdus sont couverts par les suivants). */
  private post(ping: number): void {
    const first = Math.max(this.theirAck + 1, this.nextMine - MAX_SENT);
    const inputs: Packed[] = [];
    for (let t = first; t < this.nextMine; t++) {
      const p = this.mine.get(t);
      if (!p) break;
      inputs.push(p);
    }
    const packet: Packet = { r: this.run, t: this.tick, p: Math.round(ping), a: this.theirLast, f: first, i: inputs };
    if (this.hashToSend) packet.h = this.hashToSend;
    this.send(packet as unknown as Json);
  }

  /** Hôte : les deux mondes divergent ; on envoie le nôtre, au dernier pas sûr. */
  private resync(): void {
    const at = this.verified;
    const saved = at === this.tick ? this.copier.save(this.world) : this.saves.get(at);
    if (!saved) return;
    this.resyncs++;
    this.sendState({ r: this.run, t: at, s: serialize(this.copier, saved) });
  }
}

/** Ce qui distingue un événement d'un autre du même pas, sans les positions (qui bougent un peu d'un rejeu à l'autre). */
function eventKey(event: GameEvent): string {
  const e = event as { type: string; hero?: number; owner?: number; id?: number };
  return `${e.type}:${e.hero ?? ''}:${e.owner ?? ''}:${e.id ?? ''}`;
}
