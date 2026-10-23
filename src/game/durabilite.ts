// La durabilité : les pièces portées s'usent à chaque descente, et une pièce à zéro est cassée — elle reste dans le
// sac, mais ne compte plus jusqu'à ce que Tetsu la répare. Rien ne se perd à la casse : c'est une taxe d'entretien
// en oboles, pas une punition. Les chiffres sont dans src/data/items.json (forge.durabilite).
//
// On compte l'USURE (les points perdus) plutôt que la durabilité restante : une pièce jamais usée n'a rien à écrire
// dans la sauvegarde, et un changement du maximum dans les données ne casse pas une vieille sauvegarde.
import type { ItemDef } from './loadout';

export interface DurabiliteRules {
  about?: string;
  /** Emplacements qui s'usent (les reliques non). */
  slots: string[];
  /** Durabilité maximale selon la rareté. */
  max: Record<string, number>;
  /** Points perdus par chaque pièce portée à la fin d'une descente. */
  usure: { victoire: number; defaite: number };
  /** Part de durabilité sous laquelle la pièce prévient. */
  alerte: number;
  /** Oboles par point réparé, selon la rareté. */
  reparation: Record<string, number>;
  /** Le prix monte avec le niveau de forge : × (1 + parNiveau × (niveau − 1)). */
  parNiveau: number;
}

export const hasDurability = (rules: DurabiliteRules | undefined, def: ItemDef | undefined): boolean =>
  Boolean(rules && def?.slot && rules.slots.includes(def.slot));

export const maxDurability = (rules: DurabiliteRules, def: ItemDef): number => rules.max[def.rarity] ?? rules.max.commune ?? 60;

/** Ce qu'il reste à une pièce, de 0 (cassée) à son maximum. */
export function durability(rules: DurabiliteRules, def: ItemDef, usure = 0): number {
  return Math.max(0, maxDurability(rules, def) - Math.max(0, usure));
}

/** Vrai si la pièce est cassée : elle ne compte plus dans l'équipement. */
export function isBroken(rules: DurabiliteRules | undefined, def: ItemDef | undefined, usure = 0): boolean {
  return Boolean(rules && def && hasDurability(rules, def) && durability(rules, def, usure) <= 0);
}

/** Vrai sous le seuil d'alerte (et pas encore cassée). */
export function isWorn(rules: DurabiliteRules, def: ItemDef, usure = 0): boolean {
  const left = durability(rules, def, usure);
  return hasDurability(rules, def) && left > 0 && left <= maxDurability(rules, def) * rules.alerte;
}

/** Le prix de la réparation complète d'une pièce, à son niveau de forge. */
export function repairCost(rules: DurabiliteRules, def: ItemDef, usure: number, level = 1): number {
  const missing = Math.min(Math.max(0, usure), maxDurability(rules, def));
  if (!missing) return 0;
  return Math.ceil(missing * (rules.reparation[def.rarity] ?? 1) * (1 + rules.parNiveau * (Math.max(1, level) - 1)));
}

export interface WearNote {
  item: string;
  /** La pièce vient de casser. */
  broken: boolean;
  /** La pièce vient de passer sous le seuil d'alerte. */
  worn: boolean;
}

/**
 * Use les pièces portées à la fin d'une descente. `usure` est modifié en place ; renvoie les pièces qui viennent de
 * casser ou de passer sous le seuil d'alerte, pour le dire au joueur.
 */
export function wearEquipped(
  rules: DurabiliteRules,
  items: Record<string, ItemDef>,
  equipped: readonly (string | undefined)[],
  usure: Record<string, number>,
  victory: boolean,
): WearNote[] {
  const notes: WearNote[] = [];
  const amount = victory ? rules.usure.victoire : rules.usure.defaite;
  for (const id of new Set(equipped)) {
    const def = id ? items[id] : undefined;
    if (!id || !def || !hasDurability(rules, def)) continue;
    const before = usure[id] ?? 0;
    const max = maxDurability(rules, def);
    if (before >= max) continue;
    const after = Math.min(max, before + amount);
    usure[id] = after;
    const broken = after >= max;
    const worn = !broken && !isWorn(rules, def, before) && isWorn(rules, def, after);
    if (broken || worn) notes.push({ item: id, broken, worn });
  }
  return notes;
}
