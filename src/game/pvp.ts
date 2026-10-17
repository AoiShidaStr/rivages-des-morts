// Duel (PVP) : le héros tel qu'il entre dans l'arène. Tout y est égalisé (choix de Meven, 15/10/2026) : le même
// niveau pour tous, et seuls comptent la race, la classe, la voie, les talents (jamais plus que le niveau commun n'en
// donne) et ce que les objets changent au jeu. L'équipement vient du build Duel (src/game/builds.ts) s'il est de la
// classe du héros : l'arme et au plus 4 des 6 autres emplacements, sinon l'arme de départ de la classe seule.
//
// Règle des objets en duel (plan PvP, étape 2, 16/10/2026) : un objet vaut par ce qu'il change à la façon de jouer,
// jamais par ses chiffres. Ses stats (`bonus` : PV, dégâts, vitesse, esquive, armure, oboles) sont ignorées ; ses effets
// restent. Une arme garde sa forme (portée, arc, cadence) mais a les stats et les dégâts par seconde de l'arme de départ
// de sa classe, et tout est forgé au niveau du duel. Dans items.json, `"pvp": false` sort un objet du duel (il ne
// sert que contre des yokai) et `"pvp": { "effects": [...] }` le remplace par sa version de duel ; `"pvp": { "damage": 0.8 }`
// fait frapper une arme 20 % moins fort en duel, quand sa forme (portée, arc) y pèse trop. Les effets cumulés
// sont plafonnés (pvp.json, `items`) : recharges, invulnérabilité.
import type { PlayerConfig } from './config';
import { buildTalents, DUEL_SLOTS, fitsHero } from './builds';
import { applyEffect, buildLoadout, equipBlock, talentPointsAt, type ConfigEffect, type ItemDef, type Loadout, type LoadoutData } from './loadout';
import type { ProgressState, Slot } from './progress';

/** Plafonds des effets d'objets cumulés en duel (src/data/pvp.json, `items`). */
export interface DuelItemRules {
  /** Part des recharges que les objets peuvent retirer au plus (0,4 : une recharge garde au moins 60 % de sa durée). */
  cooldownCut: number;
  /** Invulnérabilité la plus longue que les objets peuvent donner à une esquive ou à la Frappe fantôme (s). */
  invulnerable: number;
}

/** Le duel tel que pvp.json le règle côté héros : plafonds des objets, et réglages propres à chaque classe. */
export interface DuelRules {
  items: DuelItemRules;
  /** Effets posés sur le héros d'une classe en duel seulement (même syntaxe que items.json), après tout le reste. */
  classes?: Partial<Record<string, ConfigEffect[]>>;
}

/** Les temps d'un coup d'arme qui comptent pour sa cadence. */
type Timing = { windup: number; active: number; recovery: number };

/** Ce que pose l'effet `set attack.<key>` d'une arme, s'il y en a un. */
const setOf = (def: ItemDef | undefined, key: string): number | undefined => {
  const value = def?.effects?.find((e) => e.op === 'set' && e.path === `attack.${key}`)?.value;
  return typeof value === 'number' ? value : undefined;
};

/** Durée d'un coup de l'arme (amorce, coup, reprise), ce qu'elle ne pose pas venant de `fallback`. */
const cycleOf = (def: ItemDef | undefined, fallback: Timing): number =>
  (setOf(def, 'windup') ?? fallback.windup) + (setOf(def, 'active') ?? fallback.active) + (setOf(def, 'recovery') ?? fallback.recovery);

/**
 * Un objet de duel : ses effets (sa version PvP s'il en a une), sans stats ni éveil. Une arme prend les stats de
 * l'arme de départ de sa classe, et ses dégâts par coup suivent sa cadence : une arme deux fois plus rapide frappe
 * deux fois moins fort, pour les mêmes dégâts par seconde. Seule sa forme la distingue (portée, arc, effets). Les
 * paliers de forge restent, puisque tout est forgé au niveau du duel.
 */
function duelItem(def: ItemDef, reference: ItemDef | undefined, base: Timing): ItemDef {
  const pvp = def.pvp;
  const own = (pvp ? pvp.effects : undefined) ?? def.effects ?? [];
  const weapon = def.slot === 'arme' && reference !== undefined;
  const refDamage = setOf(reference, 'damage');
  const refTiming = { windup: setOf(reference, 'windup') ?? base.windup, active: setOf(reference, 'active') ?? base.active, recovery: setOf(reference, 'recovery') ?? base.recovery };
  // `pvp.damage` : une arme dont la forme (portée, arc) pèse trop en duel y frappe d'autant moins fort (ou plus).
  const scale = (pvp ? pvp.damage : undefined) ?? 1;
  const damage = refDamage === undefined ? undefined : (scale * refDamage * cycleOf(def, refTiming)) / Math.max(0.01, cycleOf(reference, base));
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
function duelData(data: LoadoutData, cls: string, base: Timing): LoadoutData {
  let byClass = duelItems.get(data);
  if (!byClass) duelItems.set(data, (byClass = new Map()));
  let out = byClass.get(cls);
  if (!out) {
    const weapon = data.skills.classes[cls]?.weapon;
    const reference = weapon ? data.items[weapon] : undefined;
    const items = Object.fromEntries(Object.entries(data.items).filter(([, def]) => allowedInDuel(def)).map(([id, def]) => [id, duelItem(def, reference, base)]));
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
export function duelLoadout(base: PlayerConfig, state: ProgressState, data: LoadoutData, level: number, pvp?: DuelRules): Loadout {
  const duel = duelState(state, data, level);
  const view = duelData(data, duel.hero.class, base.attack);
  const loadout = buildLoadout(base, duel, view, level);
  if (!pvp) return loadout;
  const rules = pvp.items;
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
  // Réglages de classe du duel (étape 3 du plan PvP) : ils passent en dernier, sur le héros déjà monté.
  for (const effect of pvp.classes?.[duel.hero.class] ?? []) applyEffect(config, effect);
  return loadout;
}
