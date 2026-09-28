// Une partie en coop : le salon, puis les descentes. L'hôte garde la liste des joueurs et lance la descente ;
// pendant le combat, il reçoit les commandes des invités et leur renvoie l'état de la partie.
import {
  MAX_PLAYERS,
  PROTOCOL,
  packSnapshot,
  unpackSnapshot,
  type Announce,
  type EventPacket,
  type InputPacket,
  type Lobby,
  type LobbyPlayer,
  type Member,
  type SharedSnap,
  type Snapshot,
  type Start,
} from './protocol';
import { openRoom, type Json, type Network, type Room } from './transport';

/** Lettres des codes : ni 0 ni O, ni 1 ni I, pour qu'on ne les confonde pas en les dictant. */
const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 4;
/** Sans réponse d'un hôte au bout de ce temps, le code ne mène nulle part. */
const JOIN_TIMEOUT = 20_000;
/** Une partie publique s'annonce toutes les `ANNOUNCE_EVERY` ms, et disparaît de la liste sans nouvelle depuis `ANNOUNCE_TTL`. */
const ANNOUNCE_EVERY = 3_000;
const ANNOUNCE_TTL = 10_000;
/** Un invité mesure son ping toutes les `PING_EVERY` ms. */
const PING_EVERY = 1_000;

export const newCode = (): string =>
  Array.from({ length: CODE_LENGTH }, () => CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)]).join('');

export const cleanCode = (text: string): string =>
  text
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, CODE_LENGTH);

const roomOf = (code: string) => `partie-${code}`;

type Hello = { version: number; member: Member };

/** Ce qu'une session raconte à l'interface et au jeu. */
export interface SessionEvents {
  /** Le salon a changé (arrivée, départ, prêt, niveau). */
  lobby?(lobby: Lobby): void;
  /** La descente commence. */
  start?(start: Start): void;
  /** Invité : un instantané de la partie envoyé par l'hôte. */
  state?(snap: Snapshot): void;
  /** Invité : les événements du combat. */
  events?(packet: EventPacket): void;
  /** Hôte : les commandes d'un invité, à sa place. */
  input?(seat: number, packet: InputPacket): void;
  /** Hôte, en pleine descente : un invité est parti. */
  left?(seat: number): void;
  /** La session est finie : on l'a quittée, l'hôte est parti, ou il a refusé. */
  closed?(reason: string): void;
}

export class CoopSession {
  readonly lobby: Lobby;
  handlers: SessionEvents = {};
  private readonly members = new Map<string, Member>();
  /** Places des joueurs pendant la descente (0 : l'hôte). */
  private seats = new Map<string, number>();
  private hostPeer: string | null = null;
  private board: PublicBoard | null = null;
  private announcer = 0;
  private joinTimer = 0;
  private pinger = 0;
  private done = false;
  /** Numéro de la dernière descente lancée par l'hôte. */
  private run = 0;
  /** Invité : aller-retour jusqu'à l'hôte (ms), lissé. */
  ping = 0;

  private constructor(
    readonly role: 'host' | 'guest',
    readonly code: string,
    readonly network: Network,
    private readonly me: Member,
    private readonly room: Room,
  ) {
    this.lobby = { code, players: [], dungeon: 'rizieres', level: 1, open: false, inGame: false };
  }

  /** Ouvre une partie : on en est l'hôte, les autres la rejoignent avec son code. */
  static host(network: Network, me: Member, options: { open: boolean; dungeon: string; level: number }): CoopSession {
    const code = newCode();
    const session = new CoopSession('host', code, network, me, openRoom(network, roomOf(code)));
    Object.assign(session.lobby, options);
    session.lobby.players = [session.entry(session.room.selfId, me, true)];
    session.setupHost();
    if (options.open) session.setOpen(true);
    return session;
  }

  /** Rejoint la partie de ce code. */
  static join(network: Network, code: string, me: Member): CoopSession {
    const session = new CoopSession('guest', code, network, me, openRoom(network, roomOf(code)));
    session.setupGuest();
    return session;
  }

  get isHost(): boolean {
    return this.role === 'host';
  }

  get selfId(): string {
    return this.room.selfId;
  }

  /** Nombre de joueurs dans le salon, hôte compris. */
  get size(): number {
    return this.lobby.players.length;
  }

  /** Tous les invités sont prêts (et il y en a au moins un). */
  get allReady(): boolean {
    const guests = this.lobby.players.filter((p) => !p.host);
    return guests.length > 0 && guests.every((p) => p.ready);
  }

  private entry(peer: string, member: Member, host: boolean): LobbyPlayer {
    return { peer, name: member.name, race: member.race, cls: member.cls, level: member.level, ready: host, host };
  }

  // --- Hôte ----------------------------------------------------------------

  private setupHost(): void {
    const room = this.room;
    room.on('hello', (data, from) => {
      const hello = data as unknown as Hello;
      if (hello.version !== PROTOCOL) return room.send('refuse', 'Vous n’avez pas la même version du jeu : rechargez la page (Ctrl+F5).', from);
      if (this.lobby.inGame) return room.send('refuse', 'La descente a déjà commencé.', from);
      if (this.members.has(from)) return this.broadcastLobby();
      if (this.size >= MAX_PLAYERS) return room.send('refuse', `La partie est pleine (${MAX_PLAYERS} joueurs).`, from);
      this.members.set(from, hello.member);
      this.lobby.players.push(this.entry(from, hello.member, false));
      this.broadcastLobby();
    });
    room.on('ready', (data, from) => {
      const player = this.lobby.players.find((p) => p.peer === from);
      if (!player) return;
      const { ready, member } = data as unknown as { ready: boolean; member?: Member };
      player.ready = Boolean(ready);
      // Le héros a pu changer d'équipement depuis son arrivée : on garde le plus récent.
      if (member) {
        this.members.set(from, member);
        Object.assign(player, { name: member.name, race: member.race, cls: member.cls, level: member.level });
      }
      this.broadcastLobby();
    });
    room.on('in', (data, from) => {
      const seat = this.seats.get(from);
      if (seat !== undefined && data && typeof data === 'object') this.handlers.input?.(seat, data as unknown as InputPacket);
    });
    // L'invité mesure son ping : on lui renvoie aussitôt son message.
    room.on('ping', (data, from) => room.sendFast('pong', data, from));
    room.onPeerLeave((peer) => {
      if (!this.members.delete(peer)) return;
      this.lobby.players = this.lobby.players.filter((p) => p.peer !== peer);
      const seat = this.seats.get(peer);
      if (seat !== undefined && this.lobby.inGame) this.handlers.left?.(seat);
      this.broadcastLobby();
    });
  }

  private broadcastLobby(): void {
    this.room.send('lobby', this.lobby as unknown as Json);
    this.handlers.lobby?.(this.lobby);
    this.announce();
  }

  /** Hôte : donjon et niveau de la prochaine descente. */
  choose(dungeon: string, level: number): void {
    this.lobby.dungeon = dungeon;
    this.lobby.level = level;
    this.broadcastLobby();
  }

  /** Hôte : la partie paraît (ou non) dans la liste des parties publiques. */
  setOpen(open: boolean): void {
    this.lobby.open = open;
    window.clearInterval(this.announcer);
    if (open && !this.board) {
      this.board = new PublicBoard(this.network);
      this.board.onPeer = () => this.announce();
      this.announcer = window.setInterval(() => this.announce(), ANNOUNCE_EVERY);
    } else if (!open && this.board) {
      this.board.close();
      this.board = null;
    }
    this.broadcastLobby();
  }

  private announce(): void {
    if (!this.board || !this.lobby.open || this.lobby.inGame || this.size >= MAX_PLAYERS) return;
    const { lobby, me } = this;
    this.board.announce({ code: this.code, host: me.name, cls: me.cls, level: me.level, dungeon: lobby.dungeon, dungeonLevel: lobby.level, players: this.size });
  }

  /** Hôte : lance la descente avec les joueurs du salon ; `me` : son héros tel qu'il est maintenant. */
  start(me: Member): Start {
    Object.assign(this.me, me);
    const peers = this.lobby.players.map((p) => p.peer);
    this.seats = new Map(peers.map((peer, seat) => [peer, seat]));
    const heroes = peers.map((peer) => {
      const member = peer === this.room.selfId ? this.me : this.members.get(peer);
      if (!member) throw new Error(`Joueur inconnu : ${peer}`);
      return { name: member.name, sprite: member.sprite, config: member.config };
    });
    this.lobby.inGame = true;
    this.broadcastLobby();
    const run = ++this.run;
    const start = (seat: number): Start => ({ run, dungeon: this.lobby.dungeon, level: this.lobby.level, seat, heroes });
    for (const [peer, seat] of this.seats) if (seat > 0) this.room.send('start', start(seat) as unknown as Json, peer);
    return start(0);
  }

  /** Hôte : un instantané pour chaque invité, avec la dernière de ses commandes jouée. */
  sendSnapshots(shared: SharedSnap, run: number, ack: (seat: number) => number): void {
    for (const [peer, seat] of this.seats) {
      if (seat > 0 && this.members.has(peer)) this.room.sendFast('snap', packSnapshot(shared, run, seat, ack(seat)), peer);
    }
  }

  /** Hôte : les événements du combat, pour tous les invités (canal sûr). */
  sendEvents(packet: EventPacket): void {
    this.room.send('evts', packet as unknown as Json);
  }

  /** Hôte : la descente est finie, on revient au salon (les invités doivent se redire prêts). */
  backToLobby(): void {
    this.lobby.inGame = false;
    for (const player of this.lobby.players) player.ready = player.host;
    this.broadcastLobby();
  }

  // --- Invité ----------------------------------------------------------------

  private setupGuest(): void {
    const room = this.room;
    const hello = () => room.send('hello', { version: PROTOCOL, member: this.me } as unknown as Json);
    // On se présente à chaque pair qui arrive : seul l'hôte répond (les autres invités ignorent le message).
    room.onPeerJoin((peer) => {
      if (!this.hostPeer) room.send('hello', { version: PROTOCOL, member: this.me } as unknown as Json, peer);
    });
    hello();
    this.joinTimer = window.setTimeout(() => {
      if (!this.hostPeer) this.close('Aucune partie ouverte avec ce code. Vérifie-le, ou demande à l’hôte s’il est encore dans son salon.');
    }, JOIN_TIMEOUT);
    room.on('lobby', (data, from) => {
      this.hostPeer ??= from;
      if (from !== this.hostPeer) return;
      window.clearTimeout(this.joinTimer);
      Object.assign(this.lobby, data as unknown as Lobby);
      this.handlers.lobby?.(this.lobby);
    });
    room.on('refuse', (data, from) => {
      if (this.hostPeer && from !== this.hostPeer) return;
      this.close(String(data));
    });
    room.on('start', (data, from) => {
      if (from === this.hostPeer) this.handlers.start?.(data as unknown as Start);
    });
    room.on('snap', (data, from) => {
      if (from !== this.hostPeer) return;
      const snap = unpackSnapshot(data);
      if (snap) this.handlers.state?.(snap);
    });
    room.on('evts', (data, from) => {
      if (from === this.hostPeer) this.handlers.events?.(data as unknown as EventPacket);
    });
    room.on('pong', (data, from) => {
      if (from !== this.hostPeer || typeof data !== 'number') return;
      const rtt = performance.now() - data;
      this.ping = this.ping ? this.ping + (rtt - this.ping) * 0.3 : rtt;
    });
    this.pinger = window.setInterval(() => {
      if (this.hostPeer) room.sendFast('ping', performance.now(), this.hostPeer);
    }, PING_EVERY);
    room.onPeerLeave((peer) => {
      if (peer === this.hostPeer) this.close('L’hôte a quitté la partie.');
    });
  }

  /** Invité : prêt (ou non) pour la prochaine descente, avec son héros tel qu'il est maintenant. */
  setReady(ready: boolean, me?: Member): void {
    if (me) Object.assign(this.me, me);
    if (this.hostPeer) this.room.send('ready', { ready, member: this.me } as unknown as Json, this.hostPeer);
  }

  /** Invité : ses commandes de ce pas, pour l'hôte. */
  sendInput(packet: InputPacket): void {
    if (this.hostPeer) this.room.sendFast('in', packet as unknown as Json, this.hostPeer);
  }

  // --- Fin ---------------------------------------------------------------------

  /** Quitte la session (l'hôte ferme la partie pour tous). */
  leave(): void {
    this.close('');
  }

  private close(reason: string): void {
    if (this.done) return;
    this.done = true;
    window.clearTimeout(this.joinTimer);
    window.clearInterval(this.announcer);
    window.clearInterval(this.pinger);
    this.board?.close();
    this.room.leave();
    this.handlers.closed?.(reason);
  }
}

/** Liste des parties publiques : les hôtes s'y annoncent, ceux qui cherchent une partie l'écoutent. */
export class PublicBoard {
  private readonly room: Room;
  private readonly games = new Map<string, { game: Announce; seen: number }>();
  onPeer: (() => void) | null = null;
  onChange: ((games: Announce[]) => void) | null = null;
  private readonly sweeper: number;

  constructor(network: Network) {
    this.room = openRoom(network, 'annonces');
    this.room.onPeerJoin(() => this.onPeer?.());
    this.room.on('annonce', (data) => {
      const game = data as unknown as Announce;
      if (!game || typeof game.code !== 'string') return;
      this.games.set(game.code, { game, seen: performance.now() });
      this.onChange?.(this.list());
    });
    this.sweeper = window.setInterval(() => {
      const now = performance.now();
      let changed = false;
      for (const [code, { seen }] of this.games) {
        if (now - seen > ANNOUNCE_TTL) changed = this.games.delete(code);
      }
      if (changed) this.onChange?.(this.list());
    }, 1_000);
  }

  list(): Announce[] {
    return [...this.games.values()].map((g) => g.game).filter((g) => g.players < MAX_PLAYERS);
  }

  announce(game: Announce): void {
    this.room.send('annonce', game as unknown as Json);
  }

  close(): void {
    window.clearInterval(this.sweeper);
    this.room.leave();
  }
}
