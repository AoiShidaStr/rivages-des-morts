// Une partie en coop tenue par le serveur du jeu (server/serveur.ts), sans joueur à elle : elle fait tourner le combat
// et tous les joueurs y sont des invités, comme chez un hôte ordinaire (src/net/session.ts). Le combat ne dépend
// plus de l'ordinateur d'un joueur : celui qui part ne coupe pas la descente des autres.
//
// Le premier arrivé mène le salon : il choisit le donjon et son niveau, et lance la descente quand les autres sont
// prêts. S'il part, le suivant prend sa place. La partie se ferme quand le dernier joueur s'en va.
//
// Ce fichier tourne dans Node, avec le serveur (`npm run build` le réunit avec le moteur du jeu dans
// dist-server/serveur.js).
import { content } from '../content';
import enemies from '../data/enemies.json';
import player from '../data/player.json';
import type { GameConfig } from '../game/config';
import { clampLevel, dungeonDifficultyFor } from '../game/difficulty';
import type { GameEvent } from '../game/types';
import { World } from '../game/world';
import { RemoteInput, idleFrame } from './frames';
import {
  MAX_PLAYERS,
  PROTOCOL,
  SNAPSHOT_EVERY,
  packSnapshot,
  shareSnapshot,
  type InputPacket,
  type Lobby,
  type LobbyPlayer,
  type Member,
  type Start,
} from './protocol';
import type { Json, Room } from './transport';

const STEP = 1 / 60;
const MAX_STEPS = 5;
/** Le serveur avance le combat à ce rythme (ms) ; chaque passage rattrape les pas en retard. */
const TICK_MS = 5;
/** Après la fin d'une descente, le salon rouvre au bout de ce délai (les derniers événements partent d'abord). */
const LOBBY_AFTER = 1_000;
const ANNOUNCE_EVERY = 3_000;
/**
 * Le combat attend que chaque joueur ait chargé la descente (les planches des yokai), au plus ce délai : sinon les
 * premiers ennemis frapperaient des héros encore sur l'écran de chargement.
 */
const LOAD_TIMEOUT = 30_000;

/** Les donjons qu'une partie du serveur peut lancer (le Yomi sans fond et l'entraînement restent hors du serveur). */
const DUNGEONS = new Set(Object.keys(content.dungeons).filter((id) => id !== 'entrainement'));

const BASE: GameConfig = {
  ...content.dungeons.rizieres.arena,
  player: player as GameConfig['player'],
  enemies: enemies as GameConfig['enemies'],
};

type Hello = { version: number; member: Member };

export class DedicatedHost {
  readonly lobby: Lobby;
  private readonly members = new Map<string, Member>();
  private seats = new Map<string, number>();
  private world: World | null = null;
  private readonly remote = new Map<number, RemoteInput>();
  private run = 0;
  private tick = 0;
  private sentTick = 0;
  private outbox: GameEvent[] = [];
  private accumulator = 0;
  private last = 0;
  private readonly timer: ReturnType<typeof setInterval>;
  private readonly announcer: ReturnType<typeof setInterval>;
  private closed = false;
  /** Joueurs dont la descente se charge encore ; le combat attend qu'il n'y en ait plus. */
  private loading = new Set<string>();
  private loadTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly room: Room,
    private readonly board: Room,
    code: string,
    options: { open: boolean },
    private readonly onEmpty: () => void,
  ) {
    this.lobby = { code, players: [], dungeon: 'rizieres', level: 1, open: options.open, inGame: false, dedicated: true, leader: '' };
    this.listen();
    this.timer = setInterval(() => this.step(), TICK_MS);
    this.announcer = setInterval(() => this.announce(), ANNOUNCE_EVERY);
  }

  get size(): number {
    return this.lobby.players.length;
  }

  private listen(): void {
    const room = this.room;
    room.on('hello', (data, from) => {
      const hello = data as unknown as Hello;
      if (!hello || hello.version !== PROTOCOL) return room.send('refuse', 'Vous n’avez pas la même version du jeu que le serveur : rechargez la page (Ctrl+F5).', from);
      if (this.lobby.inGame) return room.send('refuse', 'La descente a déjà commencé.', from);
      if (this.members.has(from)) return this.broadcast();
      if (this.size >= MAX_PLAYERS) return room.send('refuse', `La partie est pleine (${MAX_PLAYERS} joueurs).`, from);
      this.members.set(from, hello.member);
      this.lobby.players.push(this.entry(from, hello.member));
      if (!this.lobby.leader) this.lobby.leader = from;
      this.broadcast();
    });
    room.on('ready', (data, from) => {
      const player = this.lobby.players.find((p) => p.peer === from);
      if (!player || !data || typeof data !== 'object') return;
      const { ready, member } = data as unknown as { ready: boolean; member?: Member };
      player.ready = Boolean(ready);
      if (member) this.update(from, member);
      this.broadcast();
    });
    // Le meneur choisit le donjon, le niveau, et si la partie paraît dans la liste publique.
    room.on('choose', (data, from) => {
      if (from !== this.lobby.leader || this.lobby.inGame || !data || typeof data !== 'object') return;
      const { dungeon, level, open } = data as { dungeon?: unknown; level?: unknown; open?: unknown };
      if (typeof dungeon === 'string' && DUNGEONS.has(dungeon)) this.lobby.dungeon = dungeon;
      if (typeof level === 'number') this.lobby.level = clampLevel(content.difficulty, level);
      if (typeof open === 'boolean') this.lobby.open = open;
      this.broadcast();
    });
    room.on('launch', (data, from) => {
      if (from !== this.lobby.leader || this.lobby.inGame) return;
      const member = (data as { member?: Member } | null)?.member;
      if (member) this.update(from, member);
      if (this.lobby.players.every((p) => p.peer === from || p.ready)) this.start();
    });
    room.on('in', (data, from) => {
      const seat = this.seats.get(from);
      if (seat !== undefined && data && typeof data === 'object') this.remote.get(seat)?.receive(data as unknown as InputPacket, performance.now());
    });
    room.on('ping', (data, from) => room.sendFast('pong', data, from));
    room.on('charge', (data, from) => {
      if (data === this.run && this.loading.delete(from) && !this.loading.size) this.begin();
    });
    room.onPeerLeave((peer) => {
      if (!this.members.delete(peer)) return;
      this.lobby.players = this.lobby.players.filter((p) => p.peer !== peer);
      const seat = this.seats.get(peer);
      // En pleine descente, son héros quitte le combat ; les autres continuent.
      if (seat !== undefined && this.world) this.world.retire(seat);
      if (this.loading.delete(peer) && !this.loading.size) this.begin();
      if (this.lobby.leader === peer) this.lobby.leader = this.lobby.players[0]?.peer ?? '';
      if (!this.size) {
        this.close();
        return;
      }
      this.broadcast();
    });
  }

  private entry(peer: string, member: Member): LobbyPlayer {
    return { peer, name: member.name, race: member.race, cls: member.cls, level: member.level, ready: false, host: false };
  }

  /** Le héros a pu changer d'équipement depuis son arrivée : on garde le plus récent. */
  private update(peer: string, member: Member): void {
    this.members.set(peer, member);
    const player = this.lobby.players.find((p) => p.peer === peer);
    if (player) Object.assign(player, { name: member.name, race: member.race, cls: member.cls, level: member.level });
  }

  private broadcast(): void {
    this.room.send('lobby', this.lobby as unknown as Json);
    this.announce();
  }

  private announce(): void {
    const { lobby } = this;
    const leader = this.members.get(lobby.leader ?? '');
    if (!lobby.open || lobby.inGame || !leader || this.size >= MAX_PLAYERS) return;
    this.board.send('annonce', { code: lobby.code, host: leader.name, cls: leader.cls, level: leader.level, dungeon: lobby.dungeon, dungeonLevel: lobby.level, players: this.size });
  }

  private start(): void {
    const peers = this.lobby.players.map((p) => p.peer);
    const heroes = peers.map((peer) => {
      const member = this.members.get(peer)!;
      return { name: member.name, sprite: member.sprite, config: member.config };
    });
    const dungeon = content.dungeons[this.lobby.dungeon] ?? content.dungeons.rizieres;
    const level = this.lobby.level;
    const configs = heroes.map((hero) => hero.config);
    const difficulty = dungeonDifficultyFor(content.difficulty, level, configs.length, dungeon.strength);
    this.world = new World({ ...BASE, ...dungeon.arena, player: configs[0], allies: configs.slice(1), difficulty });
    const run = ++this.run;
    this.seats = new Map(peers.map((peer, seat) => [peer, seat]));
    this.remote.clear();
    for (let seat = 0; seat < configs.length; seat++) this.remote.set(seat, new RemoteInput(run));
    this.tick = 0;
    this.sentTick = 0;
    this.outbox = [];
    this.accumulator = 0;
    this.last = performance.now();
    this.lobby.inGame = true;
    this.loading = new Set(peers);
    if (this.loadTimer) clearTimeout(this.loadTimer);
    this.loadTimer = setTimeout(() => this.begin(), LOAD_TIMEOUT);
    this.broadcast();
    for (const [peer, seat] of this.seats) {
      const start: Start = { run, dungeon: dungeon.id, level, seat, heroes };
      this.room.send('start', start as unknown as Json, peer);
    }
  }

  /** Tout le monde a chargé (ou on a assez attendu) : le combat commence. */
  private begin(): void {
    if (this.loadTimer) clearTimeout(this.loadTimer);
    this.loadTimer = null;
    this.loading.clear();
    this.last = performance.now();
    this.accumulator = 0;
  }

  /** Fait avancer le combat d'autant de pas que le temps écoulé en demande, puis envoie l'état aux joueurs. */
  private step(): void {
    const world = this.world;
    if (!world || this.loading.size) return;
    const now = performance.now();
    this.accumulator += Math.min(0.25, (now - this.last) / 1000);
    this.last = now;
    let steps = 0;
    while (this.accumulator >= STEP && steps < MAX_STEPS) {
      // Blocage parfait : la garde d'un joueur arrive en retard d'un demi-aller-retour, sa fenêtre s'élargit d'autant.
      for (const hero of world.players) hero.latency = (this.remote.get(hero.id)?.ping ?? 0) / 2000;
      world.update(STEP, world.players.map((hero) => this.remote.get(hero.id)?.frame(hero.pos, now) ?? idleFrame(hero.pos)));
      this.tick++;
      this.accumulator -= STEP;
      steps++;
    }
    if (steps === MAX_STEPS) this.accumulator = 0;
    const events = world.drainEvents();
    this.outbox.push(...events);
    const ended = events.some((e) => e.type === 'end');
    if (this.tick - this.sentTick >= SNAPSHOT_EVERY || ended) {
      if (this.outbox.length) this.room.send('evts', { run: this.run, tick: this.tick, events: this.outbox } as unknown as Json);
      const shared = shareSnapshot(world, this.tick);
      for (const [peer, seat] of this.seats) {
        if (this.members.has(peer)) this.room.sendFast('snap', packSnapshot(shared, this.run, seat, this.remote.get(seat)?.applied ?? 0), peer);
      }
      this.outbox = [];
      this.sentTick = this.tick;
    }
    if (ended) {
      this.world = null;
      setTimeout(() => this.backToLobby(), LOBBY_AFTER);
    }
  }

  /** La descente est finie : retour au salon, chacun doit se redire prêt. */
  private backToLobby(): void {
    if (this.closed) return;
    this.lobby.inGame = false;
    for (const player of this.lobby.players) player.ready = false;
    this.broadcast();
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this.timer);
    clearInterval(this.announcer);
    if (this.loadTimer) clearTimeout(this.loadTimer);
    this.world = null;
    this.room.leave();
    this.board.leave();
    this.onEmpty();
  }
}
