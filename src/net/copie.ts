// Copie de l'état d'un combat, pour le rollback (src/net/rollback.ts) : on garde le monde tel qu'il était à chaque
// pas, et on y revient quand une commande arrive en retard. La copie suit tout le graphe d'objets (héros, yokai,
// projectiles, Map, Set, références croisées) en gardant les classes, et partage ce qui ne change jamais pendant le
// combat : les réglages (`cfg` du monde et des héros), lus par tous mais jamais modifiés.
import { randomState, setRandomState } from '../game/rng';
import type { World } from '../game/world';

/** Le monde à un pas donné, et l'état du hasard à ce moment. */
export interface Saved {
  world: World;
  random: number;
}

export class Copier {
  private readonly shared = new Set<object>();
  /** Les réglages dans l'ordre où on les a parcourus : le même dans les deux navigateurs. */
  private readonly order: object[] = [];

  constructor(world: World) {
    // Les réglages : la configuration du monde et celle de chaque héros (le duel les recopie en les ajustant).
    const roots: unknown[] = [world.cfg, ...world.players.map((hero) => hero.cfg)];
    const heroConfigs = (world as unknown as { heroConfigs?: unknown }).heroConfigs;
    if (heroConfigs) roots.push(heroConfigs);
    for (const root of roots) this.share(root);
  }

  /** Garde l'état du monde tel qu'il est maintenant. */
  save(world: World): Saved {
    return { world: this.copy(world, new Map()), random: randomState() };
  }

  /** Remet le monde (le même objet, que le rendu continue de lire) dans l'état gardé. */
  restore(world: World, saved: Saved): void {
    const map = new Map<unknown, unknown>([[saved.world, world]]);
    const target = world as unknown as Record<string, unknown>;
    const source = saved.world as unknown as Record<string, unknown>;
    for (const key of Object.keys(target)) if (!(key in source)) delete target[key];
    for (const key of Object.keys(source)) target[key] = this.copy(source[key], map);
    setRandomState(saved.random);
  }

  sharedIndex(): Map<object, number> {
    return new Map(this.order.map((o, i) => [o, i]));
  }

  sharedList(): readonly object[] {
    return this.order;
  }

  private share(value: unknown): void {
    if (value === null || typeof value !== 'object' || this.shared.has(value)) return;
    this.shared.add(value);
    this.order.push(value);
    if (value instanceof Map) {
      for (const [k, v] of value) {
        this.share(k);
        this.share(v);
      }
    } else if (value instanceof Set) {
      for (const v of value) this.share(v);
    } else {
      for (const v of Object.values(value)) this.share(v);
    }
  }

  private copy<T>(value: T, map: Map<unknown, unknown>): T {
    if (value === null || typeof value !== 'object' || this.shared.has(value)) return value;
    const seen = map.get(value);
    if (seen !== undefined) return seen as T;
    if (Array.isArray(value)) {
      const out: unknown[] = new Array(value.length);
      map.set(value, out);
      for (let i = 0; i < value.length; i++) out[i] = this.copy(value[i], map);
      return out as T;
    }
    if (value instanceof Map) {
      const out = new Map();
      map.set(value, out);
      for (const [k, v] of value) out.set(this.copy(k, map), this.copy(v, map));
      return out as T;
    }
    if (value instanceof Set) {
      const out = new Set();
      map.set(value, out);
      for (const v of value) out.add(this.copy(v, map));
      return out as T;
    }
    const out = Object.create(Object.getPrototypeOf(value)) as Record<string, unknown>;
    map.set(value, out);
    const source = value as Record<string, unknown>;
    for (const key of Object.keys(source)) out[key] = this.copy(source[key], map);
    return out as T;
  }
}

// --- Envoi de l'état par le réseau ------------------------------------------------------------------------------
//
// Quand les deux navigateurs d'un duel ne sont plus d'accord (calculs flottants qui diffèrent d'un navigateur à
// l'autre), l'hôte envoie son monde entier à l'invité. Chaque objet devient une ligne d'une table ; une référence à un
// autre objet devient son rang dans la table, une référence aux réglages devient son rang parmi les réglages (les
// deux navigateurs les ont dans le même ordre, construits à partir des mêmes données). Les classes (World, Player,
// Rival…) sont retrouvées par leur nom dans le monde de celui qui reçoit.

type Encoded = number | string | boolean | null | { o: number } | { s: number } | { n: string };
type Row = { k: string; v: Encoded[] | [Encoded, Encoded][] | Record<string, Encoded> };

export function serialize(copier: Copier, saved: Saved): string {
  const shared = copier.sharedIndex();
  const index = new Map<object, number>();
  const rows: Row[] = [];
  const encode = (value: unknown): Encoded => {
    if (value === null) return null;
    if (value === undefined) return { n: 'u' };
    if (typeof value === 'number') return Number.isFinite(value) ? value : { n: String(value) };
    if (typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value !== 'object') return null;
    const s = shared.get(value);
    if (s !== undefined) return { s };
    const known = index.get(value);
    if (known !== undefined) return { o: known };
    const at = rows.length;
    index.set(value, at);
    const row: Row = { k: '', v: [] };
    rows.push(row);
    if (Array.isArray(value)) {
      row.k = 'A';
      row.v = value.map(encode);
    } else if (value instanceof Map) {
      row.k = 'M';
      row.v = [...value].map(([k, v]) => [encode(k), encode(v)] as [Encoded, Encoded]);
    } else if (value instanceof Set) {
      row.k = 'S';
      row.v = [...value].map(encode);
    } else {
      const proto = Object.getPrototypeOf(value) as { constructor?: { name?: string } } | null;
      row.k = proto === Object.prototype || !proto ? 'O' : `C${proto.constructor?.name ?? ''}`;
      const fields: Record<string, Encoded> = {};
      for (const [key, v] of Object.entries(value)) fields[key] = encode(v);
      row.v = fields;
    }
    return { o: at };
  };
  encode(saved.world);
  return JSON.stringify({ random: saved.random, rows });
}

/** L'état reçu, prêt à remettre dans `world` ; `null` s'il est illisible (classes inconnues, autre version). */
export function deserialize(copier: Copier, world: World, text: string): Saved | null {
  let data: { random: number; rows: Row[] };
  try {
    data = JSON.parse(text) as { random: number; rows: Row[] };
  } catch {
    return null;
  }
  const shared = copier.sharedList();
  const classes = classesOf(world);
  const objects: unknown[] = data.rows.map((row) => {
    if (row.k === 'A') return [];
    if (row.k === 'M') return new Map();
    if (row.k === 'S') return new Set();
    if (row.k === 'O') return {};
    const proto = classes.get(row.k.slice(1));
    return proto ? Object.create(proto) : null;
  });
  if (objects.some((o) => o === null)) return null;
  const decode = (value: Encoded): unknown => {
    if (value === null || typeof value !== 'object') return value;
    if ('o' in value) return objects[value.o];
    if ('s' in value) return shared[value.s];
    return value.n === 'u' ? undefined : Number(value.n);
  };
  data.rows.forEach((row, i) => {
    const target = objects[i];
    if (row.k === 'A') for (const v of row.v as Encoded[]) (target as unknown[]).push(decode(v));
    else if (row.k === 'M') for (const [k, v] of row.v as [Encoded, Encoded][]) (target as Map<unknown, unknown>).set(decode(k), decode(v));
    else if (row.k === 'S') for (const v of row.v as Encoded[]) (target as Set<unknown>).add(decode(v));
    else for (const [key, v] of Object.entries(row.v as Record<string, Encoded>)) (target as Record<string, unknown>)[key] = decode(v);
  });
  return { world: objects[0] as World, random: data.random };
}

/** Les classes présentes dans le monde, par nom. */
function classesOf(world: World): Map<string, object> {
  const classes = new Map<string, object>();
  const seen = new Set<object>();
  const walk = (value: unknown): void => {
    if (value === null || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    const proto = Object.getPrototypeOf(value) as { constructor?: { name?: string } } | null;
    if (proto && proto !== Object.prototype && proto.constructor?.name) classes.set(proto.constructor.name, proto);
    const values = value instanceof Map ? [...value.keys(), ...value.values()] : value instanceof Set ? [...value] : Object.values(value);
    for (const v of values) walk(v);
  };
  walk(world);
  return classes;
}
