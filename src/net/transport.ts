// Liaison entre navigateurs. En ligne, Trystero relie les joueurs en WebRTC, sans serveur à nous : la mise en
// relation passe par des relais Nostr publics et gratuits, puis les données vont directement d'un navigateur à
// l'autre. Quand le jeu est servi par son propre serveur (server/serveur.ts, `docker compose up`), tout passe par lui
// en WebSocket : ça marche aussi sur les réseaux qui bloquent le WebRTC. Pour les tests (`?reseau=local`), un
// BroadcastChannel relie les onglets d'un même navigateur.
//
// Deux sortes de messages. Les messages sûrs (salon, événements du combat) arrivent tous et dans l'ordre : un paquet
// perdu est renvoyé, et ceux qui le suivent l'attendent. Les messages rapides (instantanés, commandes) partent sur un
// second canal, sans ordre ni renvoi : un paquet perdu est simplement remplacé par le suivant, sans rien bloquer.
import { joinRoom, selfId, type MessageAction } from 'trystero';

/** Identifiant de l'application chez Trystero : seuls les joueurs de Rivages des Morts se voient. */
const APP_ID = 'rivages-des-morts';

export type Json = null | string | number | boolean | Json[] | { [key: string]: Json };

/** Un salon : des pairs, et des messages nommés (au plus 12 caractères) qu'on s'envoie. */
export interface Room {
  readonly selfId: string;
  /** Message sûr. `to` : un seul pair ; sinon tout le salon. */
  send(action: string, data: Json, to?: string): void;
  /** Message rapide : il peut se perdre ou doubler le précédent. Sûr, faute de canal rapide avec ce pair. */
  sendFast(action: string, data: Json, to?: string): void;
  on(action: string, handler: (data: Json, from: string) => void): void;
  onPeerJoin(handler: (peer: string) => void): void;
  onPeerLeave(handler: (peer: string) => void): void;
  leave(): void;
}

export type Network = 'trystero' | 'serveur' | 'local';

/** Octets envoyés et reçus depuis l'ouverture de la page (messages rapides et, en test, tous les messages). */
export const traffic = { up: 0, down: 0 };

export function openRoom(network: Network, name: string): Room {
  if (network === 'local') return localRoom(name);
  return network === 'serveur' ? serverRoom(name) : trysteroRoom(name);
}

/**
 * Le réseau à utiliser : `?reseau=local|serveur|trystero` d'abord, sinon celui choisi à la construction du jeu
 * (`VITE_RESEAU=serveur` dans l'image Docker), sinon Trystero (la version GitHub Pages n'a pas de serveur).
 */
export function chooseNetwork(params: URLSearchParams): Network {
  const asked = params.get('reseau') ?? import.meta.env.VITE_RESEAU;
  return asked === 'local' || asked === 'serveur' ? asked : 'trystero';
}

// --- En ligne ---------------------------------------------------------------------

/**
 * Le canal rapide : sans ordre ni renvoi. Il se déclare des deux côtés avec le même numéro, sans nouvelle négociation.
 * Trystero garde une seule connexion par pair pour tous les salons : on garde de même un seul canal par connexion.
 */
const FAST_CHANNEL_ID = 100;
/** Au-delà de ce qui attend encore d'être envoyé, un message rapide est abandonné : le suivant sera plus frais. */
const FAST_BACKLOG = 64 * 1024;
const fastChannels = new WeakMap<RTCPeerConnection, RTCDataChannel>();
/** Qui écoute les messages rapides, par salon. */
const fastRooms = new Map<string, (action: string, data: Json, from: string) => void>();
type FastPacket = { r: string; a: string; d: Json };

/** Relais Nostr à utiliser à la place des relais publics (`?relais=ws://localhost:7777`, pour les tests). */
function relayUrls(): string[] | undefined {
  const relay = new URLSearchParams(location.search).get('relais');
  return relay ? [relay] : undefined;
}

function fastChannel(pc: RTCPeerConnection, peer: string): RTCDataChannel | null {
  const known = fastChannels.get(pc);
  if (known && (known.readyState === 'open' || known.readyState === 'connecting')) return known;
  let channel: RTCDataChannel;
  try {
    channel = pc.createDataChannel('rapide', { negotiated: true, id: FAST_CHANNEL_ID, ordered: false, maxRetransmits: 0 });
  } catch {
    return null;
  }
  channel.onmessage = (e: MessageEvent) => {
    if (typeof e.data !== 'string') return;
    traffic.down += e.data.length;
    let packet: FastPacket;
    try {
      packet = JSON.parse(e.data) as FastPacket;
    } catch {
      return;
    }
    fastRooms.get(packet.r)?.(packet.a, packet.d, peer);
  };
  fastChannels.set(pc, channel);
  return channel;
}

function trysteroRoom(name: string): Room {
  const urls = relayUrls();
  const room = joinRoom(urls ? { appId: APP_ID, relayConfig: { urls } } : { appId: APP_ID }, name);
  const actions = new Map<string, MessageAction<Json>>();
  const handlers = new Map<string, ((data: Json, from: string) => void)[]>();
  const dispatch = (key: string, data: Json, from: string) => {
    for (const handler of handlers.get(key) ?? []) handler(data, from);
  };
  const action = (key: string): MessageAction<Json> => {
    let act = actions.get(key);
    if (!act) {
      act = room.makeAction<Json>(key, { onMessage: (data, context) => dispatch(key, data, context.peerId) });
      actions.set(key, act);
    }
    return act;
  };
  const send = (key: string, data: Json, to?: string) => void action(key).send(data, to ? { target: to } : undefined);

  // Les pairs dont le canal rapide est ouvert des deux côtés : chacun prévient l'autre quand le sien s'ouvre.
  const fast = new Map<string, RTCDataChannel>();
  const openFast = (peer: string) => {
    const pc = room.getPeers()[peer];
    const channel = pc ? fastChannel(pc, peer) : null;
    if (!channel) return;
    const ready = () => send('$rapide', null, peer);
    if (channel.readyState === 'open') ready();
    else channel.addEventListener('open', ready, { once: true });
  };
  action('$rapide');
  handlers.set('$rapide', [
    (_data, from) => {
      // Le pair reçoit déjà sur son canal rapide : on s'en sert dès que le nôtre est ouvert aussi.
      const pc = room.getPeers()[from];
      const channel = pc ? fastChannel(pc, from) : null;
      if (channel) fast.set(from, channel);
    },
  ]);
  fastRooms.set(name, dispatch);

  const joins: ((peer: string) => void)[] = [];
  const leaves: ((peer: string) => void)[] = [];
  room.onPeerJoin = (peer) => {
    openFast(peer);
    joins.forEach((f) => f(peer));
  };
  room.onPeerLeave = (peer) => {
    fast.delete(peer);
    leaves.forEach((f) => f(peer));
  };
  return {
    selfId,
    send,
    sendFast: (key, data, to) => {
      const text = JSON.stringify({ r: name, a: key, d: data } satisfies FastPacket);
      for (const peer of to ? [to] : Object.keys(room.getPeers())) {
        const channel = fast.get(peer);
        if (!channel || channel.readyState !== 'open') {
          send(key, data, peer);
          continue;
        }
        if (channel.bufferedAmount > FAST_BACKLOG) continue;
        try {
          channel.send(text);
          traffic.up += text.length;
        } catch {
          fast.delete(peer);
          send(key, data, peer);
        }
      }
    },
    on: (key, handler) => {
      action(key);
      handlers.set(key, [...(handlers.get(key) ?? []), handler]);
    },
    onPeerJoin: (f) => joins.push(f),
    onPeerLeave: (f) => leaves.push(f),
    leave: () => {
      if (fastRooms.get(name) === dispatch) fastRooms.delete(name);
      void room.leave();
    },
  };
}

// --- Par le serveur ----------------------------------------------------------------------

/**
 * Une seule connexion WebSocket par page, partagée par tous ses salons et par le menu social. Le serveur relaie les
 * messages d'un salon à ses autres membres. Tout y arrive dans l'ordre : les messages rapides passent par le même
 * chemin, mais on les abandonne quand la connexion prend du retard, pour que le suivant arrive plus frais.
 *
 * Connexion perdue : les autres membres des salons partent d'un coup, puis la page se reconnecte d'elle-même et
 * rentre dans les salons qu'elle avait ouverts (le menu social s'y présente à nouveau).
 */
interface ServerLink {
  post(message: Json): void;
  /** Octets qui attendent encore de partir. */
  backlog(): number;
}

interface RoomListener {
  join(peer: string): void;
  leave(peer: string): void;
  message(action: string, data: Json, from: string): void;
}

/** Ce qui n'est pas un message de salon : le menu social (src/net/social.ts). */
export interface ServerListener {
  /** La connexion vient de s'ouvrir (la première fois, ou après une coupure). */
  open(): void;
  message(message: { t: string } & Record<string, Json>): void;
  /** La connexion est coupée ; la page va se reconnecter. */
  closed(): void;
}

/** Identifiant de la page auprès du serveur : le même d'une connexion à l'autre. */
const serverSelf = Math.random().toString(36).slice(2, 12);
/** Les salons ouverts par cette page, avec leurs membres (hors soi) et ceux qui les écoutent. */
const serverRooms = new Map<string, { peers: Set<string>; listeners: Set<RoomListener> }>();
const serverListeners = new Set<ServerListener>();
/** Délai avant de se reconnecter, qui s'allonge tant que le serveur ne répond pas. */
const RECONNECT_MIN = 1_000;
const RECONNECT_MAX = 15_000;
let link: ServerLink | null = null;
let reconnectDelay = RECONNECT_MIN;

/** Adresse du serveur : `?serveur=ws://…` pour les tests, sinon `ws` à côté de la page (wss:// en HTTPS). */
function serverUrl(): string {
  const asked = new URLSearchParams(location.search).get('serveur');
  if (asked) return asked;
  const url = new URL('ws', location.href);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.search = '';
  return url.href;
}

function serverLink(): ServerLink {
  if (link) return link;
  const socket = new WebSocket(serverUrl());
  /** Messages écrits avant l'ouverture de la connexion. */
  const waiting: string[] = [JSON.stringify({ t: 'hi', id: serverSelf }), ...[...serverRooms.keys()].map((r) => JSON.stringify({ t: 'join', r }))];
  const current: ServerLink = {
    post: (message) => {
      const text = JSON.stringify(message);
      traffic.up += text.length;
      if (socket.readyState === WebSocket.OPEN) socket.send(text);
      else if (socket.readyState === WebSocket.CONNECTING) waiting.push(text);
    },
    backlog: () => socket.bufferedAmount,
  };
  socket.onopen = () => {
    reconnectDelay = RECONNECT_MIN;
    for (const text of waiting.splice(0)) socket.send(text);
    serverListeners.forEach((l) => l.open());
  };
  socket.onmessage = (e: MessageEvent) => {
    if (typeof e.data !== 'string') return;
    traffic.down += e.data.length;
    let m: { t: string; r?: string; id?: string; ids?: string[]; a?: string; d?: Json; from?: string };
    try {
      m = JSON.parse(e.data);
    } catch {
      return;
    }
    if (!m || typeof m.t !== 'string') return;
    if (typeof m.r !== 'string') {
      serverListeners.forEach((l) => l.message(m as { t: string } & Record<string, Json>));
      return;
    }
    const room = serverRooms.get(m.r);
    if (!room) return;
    if (m.t === 'peers' || m.t === 'join') {
      for (const peer of m.ids ?? (m.id ? [m.id] : [])) {
        if (room.peers.has(peer)) continue;
        room.peers.add(peer);
        room.listeners.forEach((l) => l.join(peer));
      }
    } else if (m.t === 'leave' && m.id) {
      if (room.peers.delete(m.id)) room.listeners.forEach((l) => l.leave(m.id!));
    } else if (m.t === 'msg' && m.a && m.from) {
      room.listeners.forEach((l) => l.message(m.a!, m.d ?? null, m.from!));
    }
  };
  socket.onclose = () => {
    if (link !== current) return;
    link = null;
    for (const room of serverRooms.values()) {
      for (const peer of [...room.peers]) {
        room.peers.delete(peer);
        room.listeners.forEach((l) => l.leave(peer));
      }
    }
    serverListeners.forEach((l) => l.closed());
    // Quelqu'un attend encore le serveur (un salon ouvert, le menu social) : on se reconnecte.
    if (serverRooms.size || serverListeners.size) {
      window.setTimeout(() => {
        if (!link && (serverRooms.size || serverListeners.size)) serverLink();
      }, reconnectDelay);
      reconnectDelay = Math.min(RECONNECT_MAX, reconnectDelay * 2);
    }
  };
  link = current;
  return current;
}

/** Le menu social : écoute ce que le serveur dit hors des salons, et lui écrit. */
export function serverChannel(listener: ServerListener): { post(message: Json): void; close(): void } {
  serverListeners.add(listener);
  serverLink();
  return {
    post: (message) => serverLink().post(message),
    close: () => void serverListeners.delete(listener),
  };
}

function serverRoom(name: string): Room {
  const handlers = new Map<string, ((data: Json, from: string) => void)[]>();
  const joins: ((peer: string) => void)[] = [];
  const leaves: ((peer: string) => void)[] = [];
  const listener: RoomListener = {
    // Les écouteurs se branchent juste après l'ouverture du salon : on les laisse s'installer.
    join: (peer) => setTimeout(() => joins.forEach((f) => f(peer)), 0),
    leave: (peer) => leaves.forEach((f) => f(peer)),
    message: (action, data, from) => handlers.get(action)?.forEach((handler) => handler(data, from)),
  };
  const net = serverLink();
  let room = serverRooms.get(name);
  if (!room) {
    room = { peers: new Set(), listeners: new Set() };
    serverRooms.set(name, room);
    net.post({ t: 'join', r: name });
  }
  room.listeners.add(listener);
  // Le même salon déjà ouvert par cette page (la liste des parties publiques, par exemple) : on connaît ses membres.
  for (const peer of room.peers) listener.join(peer);
  const send = (action: string, data: Json, to?: string) =>
    serverLink().post(to ? { t: 'msg', r: name, a: action, d: data, to } : { t: 'msg', r: name, a: action, d: data });
  return {
    selfId: serverSelf,
    send,
    sendFast: (action, data, to) => {
      if (serverLink().backlog() <= FAST_BACKLOG) send(action, data, to);
    },
    on: (action, handler) => handlers.set(action, [...(handlers.get(action) ?? []), handler]),
    onPeerJoin: (f) => joins.push(f),
    onPeerLeave: (f) => leaves.push(f),
    leave: () => {
      const known = serverRooms.get(name);
      if (!known?.listeners.delete(listener) || known.listeners.size) return;
      serverRooms.delete(name);
      link?.post({ t: 'leave', r: name });
    },
  };
}

// --- Test entre onglets ------------------------------------------------------------

/**
 * Réseau simulé, pour voir le jeu comme au travers d'Internet :
 * `?reseau=local&ping=120&gigue=40&perte=2&debit=1000` (aller-retour en ms, écart aléatoire en ms, paquets perdus
 * en %, débit montant en kbit/s).
 */
interface Conditions {
  /** Trajet aller, en ms. */
  lag: number;
  jitter: number;
  loss: number;
  /** Octets par ms (0 : sans limite). */
  rate: number;
}

function conditions(): Conditions {
  const p = new URLSearchParams(location.search);
  const num = (key: string) => Math.max(0, Number(p.get(key)) || 0);
  return { lag: num('ping') / 2, jitter: num('gigue'), loss: Math.min(0.9, num('perte') / 100), rate: num('debit') / 8 };
}

/** Taille d'un paquet réseau : un message plus gros est découpé, et il suffit d'un morceau perdu pour le perdre. */
const MTU = 1200;

/** Salon de test entre onglets du même navigateur : même interface, à travers un réseau simulé. */
function localRoom(name: string): Room {
  const self = Math.random().toString(36).slice(2, 10);
  const channel = new BroadcastChannel(`rdm-${name}`);
  const peers = new Set<string>();
  const handlers = new Map<string, ((data: Json, from: string) => void)[]>();
  const joins: ((peer: string) => void)[] = [];
  const leaves: ((peer: string) => void)[] = [];
  const net = conditions();
  type Packet = { from: string; to?: string; action: string; data: Json };
  /** Heure (ms) à laquelle le lien montant se libère, et celle du dernier message sûr livré (ils restent dans l'ordre). */
  let busyUntil = 0;
  let lastSure = 0;
  const post = (packet: Packet, fast = false) => {
    const size = JSON.stringify(packet).length;
    traffic.up += size;
    if (!net.lag && !net.jitter && !net.loss && !net.rate) {
      channel.postMessage(packet);
      return;
    }
    const now = performance.now();
    // Le débit : le message attend que les précédents soient partis.
    busyUntil = Math.max(now, busyUntil) + (net.rate ? size / net.rate : 0);
    let at = busyUntil + net.lag + Math.random() * net.jitter;
    const lost = Math.random() < 1 - (1 - net.loss) ** Math.ceil(size / MTU);
    if (fast) {
      if (lost) return;
    } else {
      // Perdu : renvoyé après un aller-retour et un délai de garde ; ceux qui suivent l'attendent.
      if (lost) at += 2 * net.lag + 120;
      at = Math.max(at, lastSure);
      lastSure = at;
    }
    setTimeout(() => channel.postMessage(packet), at - now);
  };
  const meet = (peer: string) => {
    if (peers.has(peer)) return;
    peers.add(peer);
    // Les écouteurs se branchent juste après l'ouverture du salon : on les laisse s'installer.
    setTimeout(() => joins.forEach((f) => f(peer)), 0);
  };
  channel.onmessage = (e: MessageEvent<Packet>) => {
    const packet = e.data;
    if (packet.from === self || (packet.to && packet.to !== self)) return;
    if (packet.action === '$hi') {
      if (!peers.has(packet.from)) channel.postMessage({ from: self, to: packet.from, action: '$hi', data: null });
      meet(packet.from);
    } else if (packet.action === '$bye') {
      if (peers.delete(packet.from)) leaves.forEach((f) => f(packet.from));
    } else {
      traffic.down += JSON.stringify(packet).length;
      meet(packet.from);
      for (const handler of handlers.get(packet.action) ?? []) handler(packet.data, packet.from);
    }
  };
  setTimeout(() => channel.postMessage({ from: self, action: '$hi', data: null }), 0);
  const bye = () => channel.postMessage({ from: self, action: '$bye', data: null });
  window.addEventListener('pagehide', bye);
  return {
    selfId: self,
    send: (action, data, to) => post({ from: self, to, action, data }),
    sendFast: (action, data, to) => post({ from: self, to, action, data }, true),
    on: (action, handler) => handlers.set(action, [...(handlers.get(action) ?? []), handler]),
    onPeerJoin: (f) => joins.push(f),
    onPeerLeave: (f) => leaves.push(f),
    leave: () => {
      bye();
      window.removeEventListener('pagehide', bye);
      channel.close();
    },
  };
}
