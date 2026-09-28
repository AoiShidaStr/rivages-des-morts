// Du côté de l'île vers le combat : race, classe, équipement, niveau, talents et tags de classe
// deviennent les réglages du héros pour une descente au donjon.
import type { Kit, PlayerConfig } from './config';
import { isUpgradable, reachedPaliers, scaledBonus, weaponPower, type Palier, type UpgradeRules } from './forge';
import type { Hero, ProgressState, Slot } from './progress';
import type { EnemyKind } from './types';

export type BonusKind = 'maxHp' | 'damage' | 'speed' | 'dodge' | 'armor' | 'oboles';
export type Bonus = Partial<Record<BonusKind, number>>;

/** Modifie un réglage du Guerrier : « attack.damage », « perks.storm »… */
export interface ConfigEffect {
  op: 'set' | 'add' | 'mul';
  path: string;
  value: unknown;
}

export interface ItemDef {
  name: string;
  slot?: Slot;
  rarity: string;
  tags?: string[];
  bonus?: Bonus;
  effects?: ConfigEffect[];
  /** Résumé lisible des effets (armes, reliques). */
  summary?: string;
  /** Passifs débloqués à certains niveaux de forge (armes). */
  paliers?: Palier[];
  description: string;
}

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  ultimate?: boolean;
  effects: ConfigEffect[];
}

export interface Passive {
  name: string;
  description: string;
  effects: ConfigEffect[];
}

/** Héritage mythologique du héros : des passifs, et pour le Demi-dieu le choix du parent divin. */
export interface RaceDef {
  name: string;
  origin: string;
  /** Style de jeu favorisé, sans être imposé. */
  style: string;
  passives: Passive[];
  parents?: Record<string, Passive>;
  /** Affinité de la race avec chaque classe : un passif de plus, propre à la classe du héros. */
  affinities?: Record<string, Passive>;
}

/** Un yokai que l'Invocateur peut prendre pour compagnon. */
export interface CompanionKind {
  name: string;
  description: string;
  damage: number;
  hp: number;
  speed: number;
  rate: number;
}

export interface CompanionDef {
  default: string;
  respawn: number;
  kinds: Record<string, CompanionKind>;
}

export interface ClassDef {
  name: string;
  subtitle: string;
  role: string;
  /** Difficulté de prise en main, de 1 à 3 étoiles, affichée à la création du héros. */
  difficulty: number;
  /** Le style de jeu en une phrase, pour choisir sa classe en connaissance de cause. */
  playstyle: string;
  kit: Kit;
  /** Arme de départ. */
  weapon: string;
  /** Réglages de base de la classe, appliqués avant l'équipement. */
  effects?: ConfigEffect[];
  /** Invocateur : les compagnons au choix. */
  companion?: CompanionDef;
  actives: { key: string; name: string; description: string }[];
  tag: { name: string; tiers: { count: number; description: string; effects: ConfigEffect[] }[] };
  branches: { id: string; name: string; subtitle: string; lore: string; nodes: SkillNode[] }[];
}

export interface SkillsDef {
  levels: { max: number; xpBase: number; xpPerLevel: number; hpPerLevel: number; pointsFrom: number; pointsUntil: number };
  races: Record<string, RaceDef>;
  classes: Record<string, ClassDef>;
  /** Classes prévues par le GDD, montrées à la création sans être jouables. */
  upcomingClasses: { name: string; subtitle: string; role: string }[];
}

export interface LoadoutData {
  items: Record<string, ItemDef>;
  upgrade: UpgradeRules;
  skills: SkillsDef;
}

export interface Loadout {
  config: PlayerConfig;
  level: number;
  /** Somme des bonus simples de l'équipement (affichage, oboles). */
  bonus: Required<Bonus>;
  /** Nombre d'objets portés avec le tag de la classe. */
  tagCount: number;
  /** Palier de tag atteint (index dans les paliers du tag de la classe), ou -1. */
  tier: number;
}

/** PV max offerts par la bénédiction des six Jizō. */
const JIZO_BLESSING = 10;
const ANY_CLASS = 'Tous';

export const heroRace = (skills: SkillsDef, hero: Hero): RaceDef => skills.races[hero.race] ?? Object.values(skills.races)[0];
export const heroClass = (skills: SkillsDef, hero: Hero): ClassDef => skills.classes[hero.class] ?? Object.values(skills.classes)[0];

/** « Rôdeur Hanyō » : la classe puis la race, comme à la création. */
export const heroLabel = (skills: SkillsDef, hero: Hero): string => `${heroClass(skills, hero).name} ${heroRace(skills, hero).name}`;

/** Passifs de la race : parent divin, passifs communs, puis l'affinité avec la classe du héros. */
export function racePassives(skills: SkillsDef, hero: Hero): Passive[] {
  const race = heroRace(skills, hero);
  const parent = hero.parent ? race.parents?.[hero.parent] : undefined;
  const affinity = race.affinities?.[hero.class];
  return [...(parent ? [parent] : []), ...race.passives, ...(affinity ? [affinity] : [])];
}

/** Le compagnon choisi, s'il existe encore, sinon celui par défaut de la classe. */
export function companionOf(def: CompanionDef, state: Pick<ProgressState, 'companion'>): string {
  return state.companion && def.kinds[state.companion] ? state.companion : def.default;
}

const pick = (k: CompanionKind) => ({ damage: k.damage, hp: k.hp, speed: k.speed, rate: k.rate });

/** Une arme ne se manie que par sa classe (son tag, ou « Tous ») ; les autres pièces vont à tout le monde. */
export function canWield(def: ItemDef, cls: ClassDef): boolean {
  return def.slot !== 'arme' || !def.tags?.length || def.tags.some((t) => t === cls.tag.name || t === ANY_CLASS);
}

/** Arme prise en changeant de classe : la plus forgée de celles qu'on possède pour elle, sinon son arme de départ. */
export function classWeapon(items: Record<string, ItemDef>, state: ProgressState, cls: ClassDef): string {
  const owned = state.items.filter((id) => items[id]?.slot === 'arme' && canWield(items[id], cls));
  owned.sort((a, b) => itemLevel(state, b) - itemLevel(state, a));
  return owned[0] ?? cls.weapon;
}

/** Niveau de forge d'un objet (1 tant qu'il n'a pas été amélioré). */
export const itemLevel = (state: ProgressState, id: string): number => state.itemLevels[id] ?? 1;

/** Points de talent gagnés à ce niveau : un par niveau, de `pointsFrom` à `pointsUntil`. */
export function talentPointsAt(skills: SkillsDef, level: number): number {
  const { pointsFrom, pointsUntil } = skills.levels;
  return Math.max(0, Math.min(level, pointsUntil) - pointsFrom + 1);
}

/** Expérience à gagner pour passer du niveau `level` au suivant. */
export function xpToNext(skills: SkillsDef, level: number): number {
  return skills.levels.xpBase + skills.levels.xpPerLevel * level;
}

export function levelFor(skills: SkillsDef, xp: number): number {
  let level = 1;
  let remaining = xp;
  while (level < skills.levels.max && remaining >= xpToNext(skills, level)) {
    remaining -= xpToNext(skills, level);
    level++;
  }
  return level;
}

/** Progression dans le niveau en cours, pour la barre d'expérience. */
export function levelProgress(skills: SkillsDef, xp: number): { level: number; into: number; needed: number } {
  const level = levelFor(skills, xp);
  let spent = 0;
  for (let l = 1; l < level; l++) spent += xpToNext(skills, l);
  const needed = level >= skills.levels.max ? 0 : xpToNext(skills, level);
  return { level, into: xp - spent, needed };
}

/** Un nœud peut être appris si le précédent de sa branche l'est déjà (l'ultime demande les trois autres). */
export function canLearn(skills: SkillsDef, state: ProgressState, nodeId: string, points: number): boolean {
  if (points <= 0 || state.talents.includes(nodeId)) return false;
  for (const branch of heroClass(skills, state.hero).branches) {
    const index = branch.nodes.findIndex((n) => n.id === nodeId);
    if (index >= 0) return branch.nodes.slice(0, index).every((n) => state.talents.includes(n.id));
  }
  return false;
}

export function buildLoadout(base: PlayerConfig, state: ProgressState, data: LoadoutData, level: number): Loadout {
  const config = structuredClone(base);
  const cls = heroClass(data.skills, state.hero);
  for (const effect of cls.effects ?? []) applyEffect(config, effect);
  if (cls.companion) {
    const kind = companionOf(cls.companion, state);
    config.summon.companion = { kind: kind as EnemyKind, respawn: cls.companion.respawn, ...pick(cls.companion.kinds[kind]) };
  }
  const bonus: Required<Bonus> = { maxHp: 0, damage: 0, speed: 0, dodge: 0, armor: 0, oboles: 0 };
  let tagCount = 0;
  const className = cls.tag.name;
  const rules = data.upgrade;
  const paliers: Palier[] = [];

  for (const id of Object.values(state.equipped)) {
    const item = id ? data.items[id] : undefined;
    if (!id || !item || !canWield(item, cls)) continue;
    const upgradable = isUpgradable(rules, item);
    const lvl = itemLevel(state, id);
    const itemBonus = upgradable ? scaledBonus(rules, item.bonus, lvl) : (item.bonus ?? {});
    for (const [key, value] of Object.entries(itemBonus) as [BonusKind, number][]) bonus[key] += value;
    for (const effect of item.effects ?? []) applyEffect(config, effect);
    // Paliers de forge : « Âme liée » donne le tag « Tous », « Forgé par Tetsu » fait compter l'objet double.
    const reached = upgradable ? reachedPaliers(rules, item, lvl) : [];
    paliers.push(...reached);
    const tagged = item.tags?.some((t) => t === className || t === ANY_CLASS) || reached.some((p) => p.id === 'tous');
    if (tagged) tagCount += reached.some((p) => p.id === 'double') ? 2 : 1;
  }

  // Arme : ses effets fixent les dégâts de base ; son niveau multiplie tous les dégâts du héros, âmes comprises.
  const weaponId = state.equipped.arme;
  const power = weaponId ? weaponPower(rules, itemLevel(state, weaponId)) : 1;
  config.attack.damage *= power;
  config.smash.damage *= power;
  config.bond.damage *= power;
  config.summon.damage *= power;
  config.summon.hp *= power;
  config.summon.sacrifice.damage *= power;
  config.blade.dance.damage *= power;
  config.paladin.hammer.damage *= power;
  // Les soins du Paladin suivent aussi son arme : ils gardent leur poids quand les PV montent avec les niveaux.
  config.paladin.aura.heal *= power;
  for (const palier of paliers) for (const effect of palier.effects ?? []) applyEffect(config, effect);

  if (state.flags.benediction_jizo) bonus.maxHp += JIZO_BLESSING;
  bonus.maxHp += (level - 1) * data.skills.levels.hpPerLevel;

  for (const passive of racePassives(data.skills, state.hero)) for (const effect of passive.effects) applyEffect(config, effect);
  for (const branch of cls.branches) {
    for (const node of branch.nodes) if (state.talents.includes(node.id)) for (const effect of node.effects) applyEffect(config, effect);
  }
  let tier = -1;
  cls.tag.tiers.forEach((t, i) => {
    if (tagCount >= t.count) tier = i;
  });
  if (tier >= 0) for (const effect of cls.tag.tiers[tier].effects) applyEffect(config, effect);

  config.maxHp += bonus.maxHp;
  config.moveSpeed *= 1 + bonus.speed;
  config.damageTakenFactor = (config.damageTakenFactor ?? 1) * (1 - Math.min(rules.armorCap, bonus.armor));
  config.attack.damage = Math.round(config.attack.damage + bonus.damage);
  // Les dégâts fixes des talents (foudre de Susanoo, Croissant, Riposte, Chaleur) suivent la puissance de l'arme.
  const perks = config.perks ?? {};
  for (const key of ['storm', 'dashDamage', 'riposte', 'auraBurn', 'yokaiAuraBurn'] as const) {
    const value = perks[key];
    if (value) perks[key] = value * power;
  }
  if (perks.shieldHeal) perks.shieldHeal = { ...perks.shieldHeal, amount: perks.shieldHeal.amount * power };
  config.dodge.distance *= 1 + bonus.dodge;
  return { config, level, bonus, tagCount, tier };
}

function applyEffect(target: object, effect: ConfigEffect): void {
  const keys = effect.path.split('.');
  let node = target as Record<string, unknown>;
  for (const key of keys.slice(0, -1)) {
    node[key] ??= {};
    node = node[key] as Record<string, unknown>;
  }
  const last = keys[keys.length - 1];
  const current = node[last];
  if (effect.op === 'set') node[last] = structuredClone(effect.value);
  else if (effect.op === 'add') node[last] = Number(current ?? 0) + Number(effect.value);
  else node[last] = Number(current ?? 1) * Number(effect.value);
}
