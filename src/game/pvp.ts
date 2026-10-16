// Duel (PVP) : le héros tel qu'il entre dans l'arène. Tout y est égalisé (choix de Meven, 15/10/2026) : le même
// niveau pour tous, et seuls comptent la race, la classe, la voie, les talents (jamais plus que le niveau commun n'en
// donne) et ce que les objets changent au jeu. L'équipement vient du build Duel (src/game/builds.ts) s'il est de la
// classe du héros : l'arme et au plus 4 des 6 autres emplacements, sinon l'arme de départ de la classe seule.
//
// Règle des objets en duel (plan PvP, étape 2, 16/10/2026) : un objet vaut par ce qu'il change à la façon de jouer,
// jamais par ses chiffres. Ses stats (`bonus` : PV, dégâts, vitesse, esquive, armure, oboles) sont ignorées ; ses effets
// restent. Une arme garde sa forme (portée, arc, cadence) mais a les dégâts et les stats de l'arme de départ de sa
// classe, et tout est forgé au niveau du duel. Dans items.json, `"pvp": false` sort un objet du duel (il ne
// sert que contre des yokai) et `"pvp": { "effects": [...] }` le remplace par sa version de duel. Les effets cumulés
// sont plafonnés (pvp.json, `items`) : recharges, invulnérabilité.
import type { PlayerConfig } from './config';
import { buildTalents, DUEL_SLOTS, fitsHero } from './builds';
import { buildLoadout, equipBlock, talentPointsAt, type ItemDef, type Loadout, type LoadoutData } from './loadout';
import type { ProgressState, Slot } from './progress';

/** Plafonds des effets d'objets cumulés en duel (src/data/pvp.json, `items`). */
export interface DuelItemRules {
  /** Part des recharges que les objets peuvent retirer au plus (0,4 : une recharge garde au moins 60 % de sa durée). */
  cooldownCut: number;
  /** Invulnérabilité la plus longue que les objets peuvent donner à une esquive ou à la Frappe fantôme (s). */
  invulnerable: number;
}

/**
 * Un objet de duel : ses effets (sa version PvP s'il en a une), sans stats ni éveil. Une arme frappe comme l'arme de
 * départ de sa classe et en prend les stats : seule sa forme la distingue. Les paliers de forge restent, puisque tout
 * est forgé au niveau du duel.
 */
function duelItem(def: ItemDef, reference: ItemDef | undefined): ItemDef {
  const pvp = def.pvp;
  const own = pvp ? pvp.effects : (def.effects ?? []);
  const damage = reference?.effects?.find((e) => e.op === 'set' && e.path === 'attack.damage')?.value;
  const weapon = def.slot === 'arme' && reference !== undefined;
  const effects = weapon && damage !== undefined ? own.map((e) => (e.path === 'attack.damage' && e.op === 'set' ? { ...e, value: damage } : e)) : own;
  const { bonus: _bonus, eveil: _eveil, pvp: _pvp, conditional, ...rest } = def;
  return {
    ...rest,
    effects,
    ...(weapon && reference.bonus ? { bonus: reference.bonus } : {}),
    ...(conditional ? { conditional: conditional.map(({ bonus: _b, ...c }) => c) } : {}),
  };
}

/** Vrai si l'objet a une place en duel (`"pvp": false` dans items.json l'en sort). */
export function allowedInDuel(def: ItemDef | undefined): boolean {
  return Boolean(def) && def?.pvp !== false;
}

const duelItems = new WeakMap<LoadoutData, Map<string, LoadoutData>>();

/** Les données de jeu vues du duel, pour une classe : chaque objet ramené à sa version de duel. */
function duelData(data: LoadoutData, cls: string): LoadoutData {
  let byClass = duelItems.get(data);
  if (!byClass) duelItems.set(data, (byClass = new Map()));
  let out = byClass.get(cls);
  if (!out) {
    const weapon = data.skills.classes[cls]?.weapon;
    const reference = weapon ? data.items[weapon] : undefined;
    const items = Object.fromEntries(Object.entries(data.items).filter(([, def]) => allowedInDuel(def)).map(([id, def]) => [id, duelItem(def, reference)]));
    out = { ...data, items };
    byClass.set(cls, out);
  }
  return out;
}

/**
 * La progression d'un héros ramenée à celle du duel : ses choix gardés, ses bonus retirés, et pour équipement celui
 * du build Duel (objets encore possédés, portables, admis en duel), sinon l'arme de départ.
 */
export function duelState(state: ProgressState, data: LoadoutData, level: number): ProgressState {
  const weapon = data.skills.classes[state.hero.class]?.weapon;
  const build = state.duelBuild && fitsHero(state.duelBuild, state.hero) ? state.duelBuild : null;
  const voie = build ? build.subclass : state.hero.subclass;
  const { subclass: _subclass, ...hero } = state.hero;
  const equipped: Partial<Record<Slot, string>> = {};
  let extra = 0;
  for (const [slot, id] of Object.entries(build?.equipped ?? {}) as [Slot, string][]) {
    const def = id ? data.items[id] : undefined;
    if (!def || def.slot !== slot || !allowedInDuel(def) || !state.items.includes(id) || equipBlock(def, hero, data.skills)) continue;
    if (slot !== 'arme' && extra >= DUEL_SLOTS) continue;
    if (slot !== 'arme') extra++;
    equipped[slot] = id;
  }
  if (!equipped.arme && weapon) equipped.arme = weapon;
  const items = Object.values(equipped).filter((id): id is string => Boolean(id));
  return {
    ...state,
    hero: voie && data.subclasses?.[hero.class]?.[voie] ? { ...hero, subclass: voie } : hero,
    talents: build ? buildTalents(data, build, level) : state.talents.slice(0, talentPointsAt(data.skills, level)),
    items,
    equipped,
    itemLevels: Object.fromEntries(items.map((id) => [id, level])),
    eveils: {},
    gravures: {},
    flags: {},
    stock: [],
    builds: [],
    duelBuild: null,
  };
}

/** Chaque nombre `cooldown` de la config, avec son chemin. */
function cooldowns(node: unknown, path: string[] = [], out: string[][] = []): string[][] {
  if (!node || typeof node !== 'object') return out;
  for (const [key, value] of Object.entries(node)) {
    if (key === 'cooldown' && typeof value === 'number') out.push([...path, key]);
    else if (typeof value === 'object') cooldowns(value, [...path, key], out);
  }
  return out;
}

const read = (node: unknown, path: string[]): unknown => path.reduce<unknown>((n, k) => (n && typeof n === 'object' ? (n as Record<string, unknown>)[k] : undefined), node);

function write(node: unknown, path: string[], value: number): void {
  const parent = read(node, path.slice(0, -1));
  if (parent && typeof parent === 'object') (parent as Record<string, unknown>)[path[path.length - 1]] = value;
}

/** Les réglages d'un héros en duel, au niveau commun `level`, objets ramenés à leur version de duel et plafonnés. */
export function duelLoadout(base: PlayerConfig, state: ProgressState, data: LoadoutData, level: number, rules?: DuelItemRules): Loadout {
  const duel = duelState(state, data, level);
  const view = duelData(data, duel.hero.class);
  const loadout = buildLoadout(base, duel, view, level);
  if (!rules) return loadout;
  // Plafonds : on compare au même héros avec sa seule arme, pour ne borner que ce que les autres objets ajoutent.
  const bare = buildLoadout(base, { ...duel, equipped: { arme: duel.equipped.arme }, items: duel.equipped.arme ? [duel.equipped.arme] : [] }, view, level).config;
  const config = loadout.config;
  for (const path of cooldowns(bare)) {
    const floor = (read(bare, path) as number) * (1 - rules.cooldownCut);
    const now = read(config, path);
    if (typeof now === 'number' && now < floor) write(config, path, floor);
  }
  for (const path of [['dodge', 'invulnerable'], ['blade', 'ghost', 'invulnerable']]) {
    const was = read(bare, path);
    const now = read(config, path);
    if (typeof was === 'number' && typeof now === 'number') write(config, path, Math.min(now, Math.max(was, rules.invulnerable)));
  }
  return loadout;
}
