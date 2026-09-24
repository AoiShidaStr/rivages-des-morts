// Du côté de l'île vers le combat : équipement, niveau, talents, race et tags de classe
// deviennent les réglages du Guerrier pour une descente au donjon.
import type { PlayerConfig } from './config';
import type { ProgressState, Slot } from './progress';

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
  description: string;
}

export interface WeaponForge {
  maxLevel: number;
  damagePerLevel: number;
  obolesPerLevel: number;
  material: string;
}

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  ultimate?: boolean;
  effects: ConfigEffect[];
}

export interface SkillsDef {
  levels: { max: number; xpBase: number; xpPerLevel: number; hpPerLevel: number; pointsFrom: number };
  race: { name: string; origin: string; passives: { name: string; description: string; effects: ConfigEffect[] }[] };
  class: { name: string; subtitle: string; actives: { key: string; name: string; description: string }[] };
  tag: { name: string; tiers: { count: number; description: string; effects: ConfigEffect[] }[] };
  branches: { id: string; name: string; subtitle: string; lore: string; nodes: SkillNode[] }[];
}

export interface LoadoutData {
  items: Record<string, ItemDef>;
  weapon: WeaponForge;
  skills: SkillsDef;
}

export interface Loadout {
  config: PlayerConfig;
  level: number;
  /** Somme des bonus simples de l'équipement (affichage, oboles). */
  bonus: Required<Bonus>;
  /** Nombre d'objets portés avec le tag de la classe. */
  tagCount: number;
  /** Palier de tag atteint (index dans skills.tag.tiers), ou -1. */
  tier: number;
}

/** PV max offerts par la bénédiction des six Jizō. */
const JIZO_BLESSING = 10;
const ANY_CLASS = 'Tous';

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
  for (const branch of skills.branches) {
    const index = branch.nodes.findIndex((n) => n.id === nodeId);
    if (index >= 0) return branch.nodes.slice(0, index).every((n) => state.talents.includes(n.id));
  }
  return false;
}

export function buildLoadout(base: PlayerConfig, state: ProgressState, data: LoadoutData, level: number): Loadout {
  const config = structuredClone(base);
  const bonus: Required<Bonus> = { maxHp: 0, damage: 0, speed: 0, dodge: 0, armor: 0, oboles: 0 };
  let tagCount = 0;
  const className = data.skills.tag.name;

  for (const id of Object.values(state.equipped)) {
    const item = id ? data.items[id] : undefined;
    if (!item) continue;
    for (const [key, value] of Object.entries(item.bonus ?? {}) as [BonusKind, number][]) bonus[key] += value;
    for (const effect of item.effects ?? []) applyEffect(config, effect);
    if (item.tags?.some((t) => t === className || t === ANY_CLASS)) tagCount++;
  }

  // Arme : ses effets fixent les dégâts de base, la forge les augmente.
  const weaponId = state.equipped.arme;
  const weaponLevel = weaponId ? (state.weaponLevels[weaponId] ?? 1) : 1;
  bonus.damage += (weaponLevel - 1) * data.weapon.damagePerLevel;

  if (state.flags.benediction_jizo) bonus.maxHp += JIZO_BLESSING;
  bonus.maxHp += (level - 1) * data.skills.levels.hpPerLevel;

  for (const passive of data.skills.race.passives) for (const effect of passive.effects) applyEffect(config, effect);
  for (const branch of data.skills.branches) {
    for (const node of branch.nodes) if (state.talents.includes(node.id)) for (const effect of node.effects) applyEffect(config, effect);
  }
  let tier = -1;
  data.skills.tag.tiers.forEach((t, i) => {
    if (tagCount >= t.count) tier = i;
  });
  if (tier >= 0) for (const effect of data.skills.tag.tiers[tier].effects) applyEffect(config, effect);

  config.maxHp += bonus.maxHp;
  config.moveSpeed *= 1 + bonus.speed;
  config.damageTakenFactor = (config.damageTakenFactor ?? 1) * (1 - bonus.armor);
  config.attack.damage += bonus.damage;
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
