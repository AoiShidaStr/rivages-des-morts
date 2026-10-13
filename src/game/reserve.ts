// La réserve : les exemplaires en plus d'un objet déjà possédé. Un doublon trouvé en donjon, un sceau du Yomi, un
// objet reçu en échange qu'on a déjà : tout y entre avec son niveau et sa gravure, au lieu d'être fondu d'office.
// De là, on le fond chez Tetsu (oboles et matériaux, comme avant), on brise un sceau, on pose sa gravure sur son
// arme (l'ancienne gravure prend sa place sur l'exemplaire : une seule gravure active par arme, jamais cumulées),
// ou on le revend (échange direct, hôtel des ventes, boutique : src/game/trade.ts).
import { content } from '../content';
import { salvage } from './loot';
import type { Gravure } from './gravure';
import type { Progress, Slot, StockEntry } from './progress';

export interface StockNote {
  /** Ce qu'il faut dire au joueur. */
  text: string;
  /** Vrai quand l'exemplaire a été fondu faute de place. */
  melted: boolean;
}

/** Fond un objet comme un doublon : ses oboles et ses matériaux vont au personnage. Renvoie le gain en clair. */
export function meltItem(progress: Progress, item: string): string {
  const def = content.items[item];
  if (!def) return '';
  const s = salvage(content.duplicates, content.upgrade, def);
  progress.gainOboles(s.oboles);
  if (s.material) progress.gainMaterial(s.material, s.count);
  return [`+${s.oboles} oboles`, s.material ? `+${s.count} ${content.materials[s.material] ?? s.material}` : null].filter(Boolean).join(', ');
}

/** Range un exemplaire dans la réserve ; pleine, elle le fond à la place. */
export function stockItem(progress: Progress, item: string, level = 1, gravure?: Gravure, sceau = false): StockNote {
  const name = content.items[item]?.name ?? item;
  const entry = { item, level, ...(gravure ? { gravure } : {}), ...(sceau ? { sceau: true } : {}) };
  if (progress.addStock(entry)) return { text: `${name} : rangé dans la réserve.`, melted: false };
  return { text: `${name} : réserve pleine, fondu par Tetsu (${meltItem(progress, item)}).`, melted: true };
}

/** Fond un exemplaire de la réserve. */
export function meltStock(progress: Progress, uid: string): string | null {
  const entry = progress.takeStock(uid);
  if (!entry) return null;
  const gain = meltItem(progress, entry.item);
  progress.save();
  return `${content.items[entry.item]?.name ?? entry.item} fondu : ${gain}.`;
}

/** Brise le sceau d'un exemplaire : sa gravure, tirée au sceau, devient lisible. */
export function breakSeal(progress: Progress, uid: string): StockEntry | null {
  const entry = progress.state.stock.find((e) => e.uid === uid);
  if (!entry?.sceau) return null;
  delete entry.sceau;
  progress.save();
  return entry;
}

/**
 * Pose la gravure d'un exemplaire sur l'arme possédée du même type. L'ancienne gravure de l'arme passe sur
 * l'exemplaire (rien ne se perd, rien ne se cumule) ; une arme jamais gravée s'ouvre ainsi à la relance chez Tetsu.
 */
export function poseGravure(progress: Progress, uid: string): boolean {
  const entry = progress.state.stock.find((e) => e.uid === uid);
  if (!entry?.gravure || entry.sceau || !progress.has(entry.item)) return false;
  const state = progress.state;
  const previous = state.gravures[entry.item];
  state.gravures[entry.item] = entry.gravure;
  if (previous) entry.gravure = previous;
  else delete entry.gravure;
  state.flags[`gravure_${entry.item}`] = Math.max(1, progress.gravureRolls(entry.item));
  progress.save();
  return true;
}

/** Sort un exemplaire de la réserve vers l'équipement, quand on ne possède pas (plus) cet objet. */
export function takeOut(progress: Progress, uid: string): boolean {
  const entry = progress.state.stock.find((e) => e.uid === uid);
  if (!entry || entry.sceau || progress.has(entry.item)) return false;
  progress.takeStock(uid);
  const state = progress.state;
  progress.acquire(entry.item, content.items[entry.item]?.slot as Slot | undefined);
  state.itemLevels[entry.item] = entry.level;
  if (entry.gravure) {
    state.gravures[entry.item] = entry.gravure;
    state.flags[`gravure_${entry.item}`] = Math.max(1, progress.gravureRolls(entry.item));
  }
  progress.save();
  return true;
}
