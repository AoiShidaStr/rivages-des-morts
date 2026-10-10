// Du côté de l'île vers le combat : race, classe, équipement, niveau, talents et tags de classe
// deviennent les réglages du héros pour une descente au donjon.
import type { Kit, PlayerConfig, SubclassActiveConfig } from './config';
import { isUpgradable, reachedPaliers, scaledBonus, weaponPower, type Palier, type UpgradeRules } from './forge';
import { gravureEffects, type GravureData } from './gravure';
import type { Hero, ProgressState, Slot } from './progress';

export type BonusKind = 'maxHp' | 'damage' | 'speed' | 'dodge' | 'armor' | 'oboles';
export type Bonus = Partial<Record<BonusKind, number>>;

/** Modifie un réglage du Guerrier : « attack.damage », « perks.storm »… */
export interface ConfigEffect {
  op: 'set' | 'add' | 'mul';
  path: string;
  value: unknown;
}

/** Condition d'un effet d'objet : la classe du héros, sa race, son niveau (toutes les clés présentes doivent tenir). */
export interface ItemCondition {
  classes?: string[];
  races?: string[];
  minLevel?: number;
}

/** Effet d'objet qui ne vaut que sous condition : un objet hybride donne une chose au Guerrier, une autre au reste. */
export interface ConditionalEffect {
  if: ItemCondition;
  /** Ce que fait l'effet, en une ligne (« Guerrier : +10 % de vitesse de frappe »). */
  summary: string;
  bonus?: Bonus;
  effects?: ConfigEffect[];
}

export interface ItemDef {
  name: string;
  slot?: Slot;
  rarity: string;
  /** Tags de classe (« Guerrier », « Tous ») : ils comptent pour les paliers de classe. */
  tags?: string[];
  /**
   * Classes qui peuvent le porter (identifiants de skills.json). Absent : une arme se manie par la classe de ses tags,
   * toute autre pièce va à tout le monde.
   */
  classes?: string[];
  /** Races qui peuvent le porter ; absent : toutes. Les effets d'un objet de race s'ajoutent aux passifs de la race. */
  races?: string[];
  bonus?: Bonus;
  effects?: ConfigEffect[];
  /** Effets sous condition (classe, race, niveau). Les effets de combat (sous 30 % de PV…) passent par les perks. */
  conditional?: ConditionalEffect[];
  /** Rôle de l'objet pour sa classe : dégâts, survie, ou mécanique de boss (ne tombe que sur les boss). */
  spec?: 'dps' | 'survie' | 'boss';
  /** Résumé lisible des effets (armes, reliques). */
  summary?: string;
  /** Passifs débloqués à certains niveaux de forge (armes). */
  paliers?: Palier[];
  description: string;
}

/**
 * La compétence d'une voie (sous-classe) : un geste de plus, lancé avec F. `kind` dit ce que le moteur en fait
 * (une onde autour du héros, un sceau au sol, un sanctuaire, un filet, une salve de traits, un cri qui le renforce) ;
 * les autres champs sont ses réglages. Rien ici n'est propre à une classe : la même primitive sert à plusieurs voies,
 * avec des nombres et des effets différents.
 */
export type SubclassKind = SubclassActiveConfig['kind'];

/**
 * La compétence d'une voie : la forme jouée par le moteur (config.ts). Dans les données, `damage` et `burn` s'expriment
 * en part des dégâts d'une attaque de la classe ; `buildLoadout` les met à l'échelle au moment de la descente.
 */
export type SubclassActive = SubclassActiveConfig;

/** Une voie (sous-classe) : le second axe d'une classe, ouvert au niveau 25. */
export interface SubclassDef {
  name: string;
  subtitle: string;
  role: string;
  lore: string;
  /** Passif signature, affiché avec les compétences de la voie. */
  passive: Passive;
  /** Réglages de base de la voie, appliqués après ceux de la classe. */
  effects?: ConfigEffect[];
  active: SubclassActive;
}

/** Les voies de chaque classe : `content.subclasses[classe][voie]`. */
export type Subclasses = Record<string, Record<string, SubclassDef>>;

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
  /**
   * Croissance propre à la classe, à la place des valeurs communes : dégâts et PV par niveau du héros (`levels`), puissance
   * par niveau de forge de l'arme (`forge.upgrade`). Le Sorcier tire ses dégâts de son catalyseur, pas de son niveau.
   */
  growth?: { damagePerLevel?: number; hpPerLevel?: number; weaponPerLevel?: number };
  actives: { key: string; name: string; description: string }[];
  /** Passifs de la classe (Au bord du gouffre du Guerrier), affichés avec les compétences. */
  passives?: { name: string; description: string }[];
  tag: { name: string; tiers: { count: number; description: string; effects: ConfigEffect[] }[] };
  branches: { id: string; name: string; subtitle: string; lore: string; nodes: SkillNode[] }[];
}

export interface SkillsDef {
  /** `hpPerLevel` et `damagePerLevel` : ce que le niveau du héros apporte seul, la moitié de sa puissance (l'équipement fait l'autre). */
  levels: { max: number; xpBase: number; xpPerLevel: number; hpPerLevel: number; damagePerLevel: number; pointsFrom: number; pointsUntil: number };
  races: Record<string, RaceDef>;
  classes: Record<string, ClassDef>;
  /** Classes prévues par le GDD, montrées à la création sans être jouables. */
  upcomingClasses: { name: string; subtitle: string; role: string }[];
}

export interface LoadoutData {
  items: Record<string, ItemDef>;
  upgrade: UpgradeRules;
  skills: SkillsDef;
  /** Les voies (sous-classes), s'il y en a : sans elles, le héros se bat avec sa classe seule. */
  subclasses?: Subclasses;
  /** Les gravures (rivens) : sans elles, une arme gravée n'apporte rien de plus que ses propres effets. */
  gravures?: GravureData;
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

/** La voie du héros, ou null s'il n'en a pas choisi (avant le niveau 25) ou si elle n'existe plus. */
export function heroSubclass(subclasses: Subclasses | undefined, hero: Hero): SubclassDef | null {
  return (hero.subclass && subclasses?.[hero.class]?.[hero.subclass]) || null;
}

/** « Rôdeur Hanyō » : la classe puis la race, comme à la création. */
export const heroLabel = (skills: SkillsDef, hero: Hero): string => `${heroClass(skills, hero).name} ${heroRace(skills, hero).name}`;

/** Passifs de la race : parent divin, passifs communs, puis l'affinité avec la classe du héros. */
export function racePassives(skills: SkillsDef, hero: Hero): Passive[] {
  const race = heroRace(skills, hero);
  const parent = hero.parent ? race.parents?.[hero.parent] : undefined;
  const affinity = race.affinities?.[hero.class];
  return [...(parent ? [parent] : []), ...race.passives, ...(affinity ? [affinity] : [])];
}

/**
 * Pourquoi ce héros ne peut pas porter cet objet, ou null s'il le peut. Une arme ne se manie que par sa classe (ses
 * `classes`, sinon ses tags ou « Tous ») ; une pièce réservée (`classes`, `races`) ne va qu'aux héros cités.
 */
export function equipBlock(def: ItemDef, hero: Hero, skills: SkillsDef): string | null {
  const cls = heroClass(skills, hero);
  if (def.races?.length && !def.races.includes(hero.race)) {
    return `Réservé ${def.races.length > 1 ? 'aux races' : 'à la race'} ${def.races.map((r) => skills.races[r]?.name ?? r).join(', ')}.`;
  }
  const classes = def.classes ?? (def.slot === 'arme' && def.tags?.length && !def.tags.includes(ANY_CLASS) ? undefined : null);
  if (classes === null) return null;
  const allowed = classes ? classes.includes(hero.class) : def.tags?.includes(cls.tag.name);
  if (allowed) return null;
  const names = classes ? classes.map((c) => skills.classes[c]?.name ?? c).join(', ') : def.tags?.join(', ');
  return def.slot === 'arme' ? `Arme de ${names} : un ${cls.name} ne sait pas la manier.` : `Réservé : ${names}.`;
}

/** Vrai si l'effet sous condition vaut pour ce héros à ce niveau. */
export function conditionMet(cond: ItemCondition, hero: Hero, level: number): boolean {
  if (cond.classes && !cond.classes.includes(hero.class)) return false;
  if (cond.races && !cond.races.includes(hero.race)) return false;
  if (cond.minLevel !== undefined && level < cond.minLevel) return false;
  return true;
}

/** « aux Hanyō » : à qui un objet de race est réservé. */
export function raceNames(skills: SkillsDef, def: ItemDef): string {
  return (def.races ?? []).map((id) => skills.races[id]?.name ?? id).join(' et ');
}

/**
 * Parent divin renforcé (Gohei du sanctuaire) : l'écart qu'apporte l'effet grandit de `boost`. Appliqué par-dessus
 * l'effet d'origine : un réglage fixé est remplacé (seuls les dégâts d'un objet grandissent, pas sa fréquence), une
 * multiplication est complétée, une addition s'ajoute encore.
 */
function boostEffect(effect: ConfigEffect, boost: number): ConfigEffect {
  const v = effect.value;
  if (effect.op === 'mul') return { ...effect, value: (1 + (Number(v) - 1) * boost) / Number(v) };
  if (effect.op === 'add') return { ...effect, value: Number(v) * (boost - 1) };
  if (typeof v === 'number') return { ...effect, value: v * boost };
  if (v && typeof v === 'object' && 'damage' in v) return { ...effect, value: { ...v, damage: Number(v.damage) * boost } };
  return effect;
}

/** Arme prise en changeant de race ou de classe : la plus forgée de celles qu'on possède pour lui, sinon son arme de départ. */
export function classWeapon(items: Record<string, ItemDef>, state: ProgressState, hero: Hero, skills: SkillsDef): string {
  const owned = state.items.filter((id) => items[id]?.slot === 'arme' && !equipBlock(items[id], hero, skills));
  owned.sort((a, b) => itemLevel(state, b) - itemLevel(state, a));
  return owned[0] ?? heroClass(skills, hero).weapon;
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

/** Règles de forge de la classe : la puissance par niveau d'arme peut lui être propre (`growth.weaponPerLevel`). */
export function classUpgrade(rules: UpgradeRules, cls: ClassDef): UpgradeRules {
  const weaponPerLevel = cls.growth?.weaponPerLevel;
  return weaponPerLevel === undefined ? rules : { ...rules, weaponPerLevel };
}

export function buildLoadout(base: PlayerConfig, state: ProgressState, data: LoadoutData, level: number): Loadout {
  const config = structuredClone(base);
  const cls = heroClass(data.skills, state.hero);
  for (const effect of cls.effects ?? []) applyEffect(config, effect);
  // La voie (sous-classe) passe juste après la classe : c'est un réglage de base de plus, avant l'équipement.
  const voie = heroSubclass(data.subclasses, state.hero);
  for (const effect of [...(voie?.effects ?? []), ...(voie?.passive.effects ?? [])]) applyEffect(config, effect);
  const bonus: Required<Bonus> = { maxHp: 0, damage: 0, speed: 0, dodge: 0, armor: 0, oboles: 0 };
  let tagCount = 0;
  const className = cls.tag.name;
  const rules = data.upgrade;
  const paliers: Palier[] = [];
  /** Effets des objets de race : ils modifient les passifs de la race, donc passent après eux. */
  const raceEffects: ConfigEffect[] = [];

  for (const id of Object.values(state.equipped)) {
    const item = id ? data.items[id] : undefined;
    if (!id || !item || equipBlock(item, state.hero, data.skills)) continue;
    const upgradable = isUpgradable(rules, item);
    const lvl = itemLevel(state, id);
    const scaled = (b: Bonus | undefined) => (upgradable ? scaledBonus(rules, b, lvl) : (b ?? {}));
    const active = (item.conditional ?? []).filter((c) => conditionMet(c.if, state.hero, level));
    for (const b of [item.bonus, ...active.map((c) => c.bonus)]) {
      for (const [key, value] of Object.entries(scaled(b)) as [BonusKind, number][]) bonus[key] += value;
    }
    // Un objet de race, ou un effet réservé à une race, modifie les passifs de la race : il passe après eux.
    if (item.races?.length) raceEffects.push(...(item.effects ?? []));
    else for (const effect of item.effects ?? []) applyEffect(config, effect);
    for (const c of active) {
      if (item.races?.length || c.if.races?.length) raceEffects.push(...(c.effects ?? []));
      else for (const effect of c.effects ?? []) applyEffect(config, effect);
    }
    // La gravure de l'arme (src/data/gravures.json) se pose comme un effet de l'objet, donc avant les mises à
    // l'échelle : ses lignes de dégâts suivent la puissance du héros, comme celles de l'arme qui la porte.
    const gravure = item.slot === 'arme' ? state.gravures?.[id] : undefined;
    if (gravure && data.gravures) for (const effect of gravureEffects(gravure, data.gravures)) applyEffect(config, effect);
    // Paliers de forge : « Âme liée » donne le tag « Tous », « Forgé par Tetsu » fait compter l'objet double.
    const reached = upgradable ? reachedPaliers(rules, item, lvl) : [];
    paliers.push(...reached);
    const tagged = item.tags?.some((t) => t === className || t === ANY_CLASS) || reached.some((p) => p.id === 'tous');
    if (tagged) tagCount += reached.some((p) => p.id === 'double') ? 2 : 1;
  }

  // Puissance : le niveau du héros et celui de son arme multiplient chacun ses dégâts (moitié héros, moitié équipement) ;
  // les dégâts en % des pièces s'y ajoutent. Les soins suivent la puissance sans les pièces.
  const weaponId = state.equipped.arme;
  const growth = { ...data.skills.levels, ...cls.growth };
  const power = (weaponId ? weaponPower(classUpgrade(rules, cls), itemLevel(state, weaponId)) : 1) * (1 + growth.damagePerLevel * (level - 1));
  const damage = power * (1 + bonus.damage);
  config.attack.damage *= damage;
  config.smash.damage *= damage;
  config.bond.damage *= damage;
  config.blade.dance.damage *= damage;
  config.paladin.hammer.damage *= damage;
  config.paladin.judgement.damage *= damage;
  const sorcier = config.sorcier;
  sorcier.seal.damage *= damage;
  sorcier.meteor.damage *= damage;
  sorcier.ward.burn *= damage;
  sorcier.flight.burn *= damage;
  for (const palier of paliers) for (const effect of palier.effects ?? []) applyEffect(config, effect);

  if (state.flags.benediction_jizo) bonus.maxHp += JIZO_BLESSING;
  bonus.maxHp += (level - 1) * growth.hpPerLevel;

  for (const passive of racePassives(data.skills, state.hero)) for (const effect of passive.effects) applyEffect(config, effect);
  for (const effect of raceEffects) applyEffect(config, effect);
  const boost = config.perks?.parentBoost;
  const parent = state.hero.parent ? heroRace(data.skills, state.hero).parents?.[state.hero.parent] : undefined;
  if (boost && parent) for (const effect of parent.effects) applyEffect(config, boostEffect(effect, boost));
  for (const branch of cls.branches) {
    for (const node of branch.nodes) if (state.talents.includes(node.id)) for (const effect of node.effects) applyEffect(config, effect);
  }
  let tier = -1;
  cls.tag.tiers.forEach((t, i) => {
    if (tagCount >= t.count) tier = i;
  });
  if (tier >= 0) for (const effect of cls.tag.tiers[tier].effects) applyEffect(config, effect);

  config.maxHp += bonus.maxHp;
  config.maxHp *= config.perks?.maxHpFactor ?? 1;
  config.moveSpeed *= 1 + bonus.speed;
  config.damageTakenFactor = (config.damageTakenFactor ?? 1) * (1 - Math.min(rules.armorCap, bonus.armor));
  // Les dégâts fixes des talents et des objets (Riposte, Chaleur, foudre de Susanoo) suivent la puissance.
  const perks = config.perks ?? {};
  // Robe de feu : tout le feu du Sorcier brûle plus fort.
  const fire = 1 + (perks.fireDamage ?? 0);
  if (config.kit === 'sorcier') config.attack.damage *= fire;
  sorcier.seal.damage *= fire;
  sorcier.meteor.damage *= fire;
  sorcier.ward.burn *= fire;
  sorcier.flight.burn *= fire;
  for (const key of ['riposte', 'auraBurn', 'yokaiAuraBurn', 'smashBolt', 'auraFlash'] as const) {
    const value = perks[key];
    if (value) perks[key] = value * damage;
  }
  if (perks.shieldHeal) perks.shieldHeal = { ...perks.shieldHeal, amount: perks.shieldHeal.amount * power };
  if (perks.stanceBolt) perks.stanceBolt = { ...perks.stanceBolt, damage: perks.stanceBolt.damage * damage };
  if (perks.offenseBolt) perks.offenseBolt = { ...perks.offenseBolt, damage: perks.offenseBolt.damage * damage };
  if (perks.fireDome) perks.fireDome = { ...perks.fireDome, burn: perks.fireDome.burn * damage * fire };
  if (perks.dodgeEmbers) perks.dodgeEmbers = { ...perks.dodgeEmbers, burn: perks.dodgeEmbers.burn * damage * fire };
  if (perks.blockBurn) perks.blockBurn = { ...perks.blockBurn, damage: perks.blockBurn.damage * damage };
  if (perks.wardBreakBlast) perks.wardBreakBlast = { ...perks.wardBreakBlast, damage: perks.wardBreakBlast.damage * damage * fire };
  if (perks.huntBlast) perks.huntBlast = { ...perks.huntBlast, damage: perks.huntBlast.damage * damage };
  // Les soins fixes des objets suivent la puissance, comme le soin au blocage.
  if (perks.flightSanctuary) perks.flightSanctuary = { ...perks.flightSanctuary, heal: perks.flightSanctuary.heal * power };
  if (perks.hammerSanctuary) perks.hammerSanctuary = { ...perks.hammerSanctuary, heal: perks.hammerSanctuary.heal * power };
  if (perks.stillHeal) perks.stillHeal = { ...perks.stillHeal, heal: perks.stillHeal.heal * power };
  if (perks.pyroKill) perks.pyroKill = { ...perks.pyroKill, hp: perks.pyroKill.hp * power };
  if (perks.poisonHitHeal) perks.poisonHitHeal *= power;
  if (perks.chargedBolt) perks.chargedBolt = { ...perks.chargedBolt, damage: perks.chargedBolt.damage * damage };
  if (perks.sealBurn) perks.sealBurn = { ...perks.sealBurn, burn: perks.sealBurn.burn * damage };
  config.dodge.distance *= 1 + bonus.dodge;
  // La compétence de la voie suit la puissance du héros : ses dégâts (et sa brûlure) sont ceux d'une attaque, à la
  // même échelle que les coups d'arme. Les soins, eux, sont une part des PV max.
  if (voie) {
    const active = { ...voie.active };
    active.damage = (active.damage ?? 0) * config.attack.damage;
    if (active.burn) active.burn *= damage;
    config.sousClasse = active;
  }
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
