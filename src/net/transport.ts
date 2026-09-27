// Liaison entre navigateurs. En ligne, Trystero relie les joueurs en WebRTC, sans serveur à nous : la mise en
// relation passe par des relais Nostr publics et gratuits, puis les données vont directement d'un navigateur à
// l'autre. Pour les tests (`?reseau=local`), un BroadcastChannel relie les onglets d'un même navigateur.
import { joinRoom, selfId, type MessageAction } from 'trystero';

/** Identifiant de l'application chez Trystero : seuls les joueurs de Rivages des Morts se voient. */
const APP_ID = 'rivages-des-morts';

export type Json = null | string | number | boolean | Json[] | { [key: string]: Json };

/** Un salon : des pairs, et des messages nommés (au plus 12 caractères) qu'on s'envoie. */
export interface Room {
  readonly selfId: string;
  /** `to` : un seul pair ; sinon tout le salon. */
  send(action: string, data: Json, to?: string): void;
  on(action: string, handler: (data: Json, from: string) => void): void;
  onPeerJoin(handler: (peer: string) => void): void;
  onPeerLeave(handler: (peer: string) => void): void;
  leave(): void;
}

export type Network = 'trystero' | 'local';

export function openRoom(network: Network, name: string): Room {
  return network === 'local' ? localRoom(name) : trysteroRoom(name);
}

function trysteroRoom(name: string): Room {
  const room = joinRoom({ appId: APP_ID }, name);
  const actions = new Map<string, MessageAction<Json>>();
  const handlers = new Map<string, ((data: Json, from: string) => void)[]>();
  const action = (key: string): MessageAction<Json> => {
    let act = actions.get(key);
    if (!act) {
      act = room.makeAction<Json>(key, {
        onMessage: (data, context) => {
          for (const handler of handlers.get(key) ?? []) handler(data, context.peerId);
        },
      });
      actions.set(key, act);
    }
    return act;
  };
  const joins: ((peer: string) => void)[] = [];
  const leaves: ((peer: string) => void)[] = [];
  room.onPeerJoin = (peer) => joins.forEach((f) => f(peer));
  room.onPeerLeave = (peer) => leaves.forEach((f) => f(peer));
  return {
    selfId,
    send: (key, data, to) => void action(key).send(data, to ? { target: to } : undefined),
    on: (key, handler) => {
      action(key);
      handlers.set(key, [...(handlers.get(key) ?? []), handler]);
    },
    onPeerJoin: (f) => joins.push(f),
    onPeerLeave: (f) => leaves.push(f),
    leave: () => void room.leave(),
  };
}

/** Salon de test entre onglets du même navigateur : même interface, sans réseau. */
function localRoom(name: string): Room {
  const self = Math.random().toString(36).slice(2, 10);
  const channel = new BroadcastChannel(`rdm-${name}`);
  const peers = new Set<string>();
  const handlers = new Map<string, ((data: Json, from: string) => void)[]>();
  const joins: ((peer: string) => void)[] = [];
  const leaves: ((peer: string) => void)[] = [];
  type Packet = { from: string; to?: string; action: string; data: Json };
  const post = (packet: Packet) => channel.postMessage(packet);
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
      if (!peers.has(packet.from)) post({ from: self, to: packet.from, action: '$hi', data: null });
      meet(packet.from);
    } else if (packet.action === '$bye') {
      if (peers.delete(packet.from)) leaves.forEach((f) => f(packet.from));
    } else {
      meet(packet.from);
      for (const handler of handlers.get(packet.action) ?? []) handler(packet.data, packet.from);
    }
  };
  setTimeout(() => post({ from: self, action: '$hi', data: null }), 0);
  const bye = () => post({ from: self, action: '$bye', data: null });
  window.addEventListener('pagehide', bye);
  return {
    selfId: self,
    send: (action, data, to) => post({ from: self, to, action, data }),
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
