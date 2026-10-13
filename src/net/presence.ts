// L'île partagée : sur un jeu servi par son serveur, les joueurs qui se promènent sur l'île se voient. Chacun garde la
// main sur son héros (on ne combat pas sur l'île) et annonce sa position aux autres plusieurs fois par seconde, par le
// salon « ile » du serveur. En entrant dans un donjon, on quitte le salon : les autres ne nous voient plus.
//
// La version GitHub Pages n'a pas d'île partagée : en WebRTC, un salon unique pour tous les joueurs n'aurait pas de
// sens. Pour les tests, `?reseau=local` la fait marcher entre onglets du même navigateur.
import { add, distance, length, scale, sub, vec, type Vec2 } from '../game/math';
import { openRoom, type Json, type Network, type Room } from './transport';

const ROOM = 'ile';
/** Rythme des annonces de position : assez pour un mouvement fluide, peu pour le serveur (10 joueurs, ~1 Ko/s chacun). */
const SEND_EVERY = 0.1;
/** Sans bouger, on se rappelle quand même au salon de temps en temps (un message rapide a pu se perdre). */
const IDLE_EVERY = 2;
/** Un héros distant rattrape sa position annoncée à ce rythme (par seconde) ; plus loin que TELEPORT, il y saute. */
const FOLLOW = 12;
const TELEPORT = 4;

/** Ce qu'on montre de soi aux autres : nom, apparence, niveau. */
export interface Profile {
  name: string;
  sprite: string;
  level: number;
}

/** Un autre joueur sur l'île, tel qu'on l'affiche. */
export interface Visitor extends Profile {
  id: string;
  pos: Vec2;
  facing: Vec2;
  moving: boolean;
}

interface Remote extends Visitor {
  /** Dernière position annoncée : `pos` la rejoint en douceur. */
  target: Vec2;
  /** Faux tant que le profil n'est pas arrivé : on ne sait pas encore à quoi il ressemble. */
  known: boolean;
  placed: boolean;
}

/** Le héros local, tel que l'île le décrit. */
export interface Walker {
  pos: Vec2;
  facing: Vec2;
  moving: boolean;
}

export function sharedIsland(network: Network): boolean {
  return network === 'serveur' || network === 'local';
}

export class IslandPresence {
  private room: Room | null = null;
  private readonly remotes = new Map<string, Remote>();
  private clock = 0;
  private lastSent = -Infinity;
  private sentMoving = false;
  private profile: Profile | null = null;

  constructor(private readonly network: Network) {}

  /** Arrive sur l'île (les autres nous voient, on les voit), ou y met à jour son profil. */
  enter(profile: Profile): void {
    if (this.room) {
      // Déjà sur l'île : on ne prévient les autres que d'un changement (niveau gagné, autre héros).
      const was = this.profile;
      this.profile = profile;
      if (!was || was.name !== profile.name || was.sprite !== profile.sprite || was.level !== profile.level) this.room.send('qui', profileJson(profile));
      return;
    }
    this.profile = profile;
    const room = openRoom(this.network, ROOM);
    this.room = room;
    this.lastSent = -Infinity;
    room.on('qui', (data, from) => {
      const p = readProfile(data);
      if (!p) return;
      const remote = this.remote(from);
      Object.assign(remote, p, { known: true });
    });
    room.on('pos', (data, from) => {
      if (!Array.isArray(data) || data.length < 5 || !data.every((n) => typeof n === 'number')) return;
      const [x, z, fx, fz, moving] = data as number[];
      const remote = this.remote(from);
      remote.target = vec(x, z);
      remote.facing = length(vec(fx, fz)) > 0.01 ? vec(fx, fz) : remote.facing;
      remote.moving = moving === 1;
      if (!remote.placed) {
        remote.pos = remote.target;
        remote.placed = true;
      }
    });
    // Un nouveau venu : on se présente à lui, et il saura où nous sommes à la prochaine annonce.
    room.onPeerJoin((peer) => {
      if (this.profile) room.send('qui', profileJson(this.profile), peer);
      this.lastSent = -Infinity;
    });
    room.onPeerLeave((peer) => this.remotes.delete(peer));
    room.send('qui', profileJson(profile));
  }

  /** Quitte l'île (donjon, écran titre) : on disparaît chez les autres. */
  leave(): void {
    this.room?.leave();
    this.room = null;
    this.remotes.clear();
  }

  /** Annonce sa position et fait avancer les autres vers la leur. */
  update(dt: number, me: Walker): void {
    if (!this.room) return;
    this.clock += dt;
    const since = this.clock - this.lastSent;
    // On annonce tout de suite l'arrêt, pour que le héros ne glisse pas chez les autres.
    if ((me.moving && since >= SEND_EVERY) || me.moving !== this.sentMoving || since >= IDLE_EVERY) {
      this.room.sendFast('pos', [round(me.pos.x), round(me.pos.z), round(me.facing.x), round(me.facing.z), me.moving ? 1 : 0]);
      this.lastSent = this.clock;
      this.sentMoving = me.moving;
    }
    const follow = 1 - Math.exp(-FOLLOW * dt);
    for (const remote of this.remotes.values()) {
      if (distance(remote.pos, remote.target) > TELEPORT) remote.pos = remote.target;
      else remote.pos = add(remote.pos, scale(sub(remote.target, remote.pos), follow));
    }
  }

  /** Les autres joueurs présents sur l'île (ceux qu'on a déjà vus se présenter et se placer). */
  visitors(): Visitor[] {
    return [...this.remotes.values()].filter((r) => r.known && r.placed);
  }

  private remote(id: string): Remote {
    let remote = this.remotes.get(id);
    if (!remote) {
      remote = { id, name: '', sprite: 'heros', level: 1, pos: vec(), target: vec(), facing: vec(1, 0), moving: false, known: false, placed: false };
      this.remotes.set(id, remote);
    }
    return remote;
  }
}

const round = (n: number) => Math.round(n * 100) / 100;

function profileJson(p: Profile): Json {
  return { n: p.name, s: p.sprite, l: p.level };
}

/** Un profil reçu : on ne garde que ce qui ressemble à un nom, un sprite de héros et un niveau. */
function readProfile(data: Json): Profile | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const { n, s, l } = data;
  if (typeof n !== 'string' || typeof s !== 'string' || typeof l !== 'number') return null;
  const sprite = /^heros(-[a-z-]+)?$/.test(s) ? s : 'heros';
  return { name: n.trim().slice(0, 24) || 'Âme errante', sprite, level: Math.max(1, Math.min(999, Math.floor(l))) };
}
