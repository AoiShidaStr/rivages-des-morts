import type { UpgradeRules } from './forge';
import type { ItemDef } from './loadout';

/**
 * Doublons (items.json → duplicates) : un objet déjà possédé qui tombe à nouveau n'est pas perdu,
 * Tetsu le fond en oboles et en matériaux de son emplacement, selon sa rareté.
 */
export interface DuplicateRules {
  oboles: Record<string, number>;
  materials: Record<string, number>;
  /** Les reliques ne passent pas à la forge : elles donnent ce matériau (celui du boss). */
  relicMaterial: string;
}

export interface Salvage {
  oboles: number;
  material?: string;
  count: number;
}

/** Ce que rapporte un doublon fondu. */
export function salvage(rules: DuplicateRules, upgrade: UpgradeRules, def: ItemDef): Salvage {
  const material = def.slot === 'relique' ? rules.relicMaterial : def.slot ? upgrade.materials[def.slot] : undefined;
  return { oboles: rules.oboles[def.rarity] ?? 0, material, count: material ? (rules.materials[def.rarity] ?? 0) : 0 };
}

/** Une offre de boutique : un objet, ou un lot de matériaux. */
export type ShopOffer = { item: string; price: number; material?: undefined } | { material: string; count: number; price: number; item?: undefined };

/** Offre tirée à la fin d'un donjon : `sold` marque un lot déjà acheté (il ne se rachète pas). */
export type RolledOffer = ShopOffer & { sold?: boolean };

/** Tire au plus `count` entrées différentes, chacune avec une chance proportionnelle à son poids (1 par défaut). */
export function drawWeighted<T extends { weight?: number }>(pool: readonly T[], count: number, random: () => number = Math.random): T[] {
  const left = [...pool];
  const picked: T[] = [];
  while (picked.length < count && left.length > 0) {
    let r = random() * left.reduce((sum, e) => sum + (e.weight ?? 1), 0);
    let k = 0;
    for (; k < left.length - 1; k++) {
      r -= left[k].weight ?? 1;
      if (r < 0) break;
    }
    picked.push(left.splice(k, 1)[0]);
  }
  return picked;
}
