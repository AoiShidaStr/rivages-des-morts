// Liaison entre navigateurs. En ligne, Trystero relie les joueurs en WebRTC, sans serveur à nous : la mise en
// relation passe par des relais Nostr publics et gratuits, puis les données vont directement d'un navigateur à
// l'autre. Pour les tests (`?reseau=local`), un BroadcastChannel relie les onglets d'un même navigateur.
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

export type Network = 'trystero' | 'local';

/** Octets envoyés et reçus depuis l'ouverture de la page (messages rapides et, en test, tous les messages). */
export const traffic = { up: 0, down: 0 };

export function openRoom(network: Network, name: string): Room {
  return network === 'local' ? localRoom(name) : trysteroRoom(name);
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
