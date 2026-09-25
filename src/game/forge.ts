// Forge de Tetsu : chaque pièce d'équipement monte jusqu'au niveau 50, sans dépasser le niveau du joueur (GDD).
// Les règles sont dans src/data/items.json (forge.upgrade) ; les paliers propres à une arme sont dans l'arme.
import type { Bonus, BonusKind, ConfigEffect, ItemDef } from './loadout';
import type { Slot } from './progress';

export interface Palier {
  level: number;
  name: string;
  summary: string;
  /** Réglages du Guerrier modifiés (paliers d'arme). */
  effects?: ConfigEffect[];
  /** Paliers communs aux pièces d'équipement : compte double pour les tags, ou gagne le tag « Tous ». */
  id?: 'double' | 'tous';
}

export interface UpgradeRules {
  maxLevel: number;
  slots: Slot[];
  /** Part de dégâts en plus par niveau d'arme. */
  weaponPerLevel: number;
  hpPerLevel: number;
  damagePerLevel: number;
  armorPerLevel: number;
  /** Réduction des dégâts subis que l'équipement ne peut pas dépasser. */
  armorCap: number;
  oboles: { base: number; exponent: number };
  materials: Partial<Record<Slot, string>>;
  materialEvery: number;
  bossMaterial: { id: string; from: number };
  paliers: Palier[];
}

export const isUpgradable = (rules: UpgradeRules, def: ItemDef | undefined): boolean => Boolean(def?.slot && rules.slots.includes(def.slot));

/** Niveau le plus haut que la forge accepte : celui du joueur, dans la limite du maximum. */
export const upgradeCap = (rules: UpgradeRules, playerLevel: number): number => Math.min(rules.maxLevel, playerLevel);

/** Prix pour passer du niveau `level` au suivant. */
export function upgradeCost(rules: UpgradeRules, def: ItemDef, level: number): { oboles: number; materials: Record<string, number> } {
  const materials: Record<string, number> = {};
  const material = def.slot ? rules.materials[def.slot] : undefined;
  if (material) materials[material] = 1 + Math.floor(level / rules.materialEvery);
  if (level >= rules.bossMaterial.from) materials[rules.bossMaterial.id] = (materials[rules.bossMaterial.id] ?? 0) + 1;
  return { oboles: Math.round(rules.oboles.base * level ** rules.oboles.exponent), materials };
}

/** Multiplicateur des dégâts d'une arme à ce niveau. */
export const weaponPower = (rules: UpgradeRules, level: number): number => 1 + rules.weaponPerLevel * (level - 1);

/** Bonus d'une pièce à ce niveau : PV, dégâts et armure montent ; vitesse, esquive et oboles restent. */
export function scaledBonus(rules: UpgradeRules, bonus: Bonus | undefined, level: number): Bonus {
  const n = level - 1;
  const factor: Partial<Record<BonusKind, number>> = {
    maxHp: 1 + rules.hpPerLevel * n,
    damage: 1 + rules.damagePerLevel * n,
    armor: 1 + rules.armorPerLevel * n,
  };
  const out: Bonus = {};
  for (const [key, value] of Object.entries(bonus ?? {}) as [BonusKind, number][]) {
    const scaled = value * (factor[key] ?? 1);
    // PV et dégâts restent des nombres ronds ; les pourcentages gardent leur précision.
    out[key] = key === 'maxHp' || key === 'damage' ? Math.round(scaled) : scaled;
  }
  return out;
}

/** Paliers d'un objet : ceux de l'arme, ou ceux communs aux pièces d'équipement. */
export function paliersOf(rules: UpgradeRules, def: ItemDef): Palier[] {
  if (def.slot === 'arme') return def.paliers ?? [];
  return isUpgradable(rules, def) ? rules.paliers : [];
}

export const reachedPaliers = (rules: UpgradeRules, def: ItemDef, level: number): Palier[] => paliersOf(rules, def).filter((p) => p.level <= level);

export const nextPalier = (rules: UpgradeRules, def: ItemDef, level: number): Palier | undefined =>
  paliersOf(rules, def).find((p) => p.level > level);
