// Ce qui passe d'un joueur à l'autre (échange direct, hôtel des ventes) : un lot d'équipement, de matériaux et
// d'oboles. Une pièce d'équipement part avec son niveau de forge et sa gravure. Le serveur fait le passeur
// (server/echanges.ts) ; chaque joueur retire de son personnage ce qu'il donne, et y range ce qu'il reçoit.
import { content } from '../content';
import type { Gravure } from './gravure';
import type { Progress } from './progress';
import { stockItem } from './reserve';

export interface LotItem {
  item: string;
  /** Niveau de forge. */
  level: number;
  gravure?: Gravure;
  /** Sceau du Yomi pas encore brisé : l'acheteur découvre la gravure en l'ouvrant. */
  sceau?: boolean;
  /** Un exemplaire de la réserve (son identifiant chez celui qui le donne) ; absent : l'objet de l'équipement. */
  uid?: string;
}

export interface Lot {
  items: LotItem[];
  materials: Record<string, number>;
  oboles: number;
}

export const emptyLot = (): Lot => ({ items: [], materials: {}, oboles: 0 });

export const isEmptyLot = (lot: Lot): boolean => !lot.items.length && !Object.values(lot.materials).some((n) => n > 0) && lot.oboles <= 0;

/** Les pièces d'équipement qu'on peut céder : possédées, et pas portées sur soi. */
export function tradableItems(progress: Progress): string[] {
  const worn = new Set(Object.values(progress.state.equipped));
  return progress.state.items.filter((id) => content.items[id]?.slot && !worn.has(id));
}

/** La clé d'une pièce dans un lot : l'identifiant de l'exemplaire de la réserve, ou celui de l'objet. */
export const lotKey = (i: LotItem): string => i.uid ?? i.item;

/**
 * Tout ce qu'on peut céder, avec sa clé : l'équipement qu'on ne porte pas, puis chaque exemplaire de la réserve.
 */
export function tradableLots(progress: Progress): LotItem[] {
  return [...tradableItems(progress).map((id) => lotItem(progress, id)), ...progress.state.stock.map((e) => lotItem(progress, e.uid))];
}

/** La pièce telle qu'elle partirait : son niveau de forge, sa gravure (`key` : objet ou exemplaire de la réserve). */
export function lotItem(progress: Progress, key: string): LotItem {
  const entry = progress.state.stock.find((e) => e.uid === key);
  if (entry) {
    return { item: entry.item, level: entry.level, uid: entry.uid, ...(entry.gravure ? { gravure: entry.gravure } : {}), ...(entry.sceau ? { sceau: true } : {}) };
  }
  const gravure = progress.state.gravures[key];
  return { item: key, level: progress.state.itemLevels[key] ?? 1, ...(gravure ? { gravure } : {}) };
}

/** Pourquoi ce lot ne peut pas partir (il manque quelque chose), ou null. */
export function cannotGive(progress: Progress, lot: Lot): string | null {
  const tradable = new Set(tradableItems(progress));
  const stocked = new Set(progress.state.stock.map((e) => e.uid));
  const missing = lot.items.find((i) => (i.uid ? !stocked.has(i.uid) : !tradable.has(i.item)));
  if (missing) return `Tu n’as plus ${content.items[missing.item]?.name ?? missing.item} (ou tu le portes).`;
  for (const [id, count] of Object.entries(lot.materials)) {
    if (progress.material(id) < count) return `Il te manque ${content.materials[id] ?? id}.`;
  }
  if (progress.state.oboles < lot.oboles) return 'Il te manque des oboles.';
  return null;
}

/** Retire du personnage ce qu'il donne. */
export function give(progress: Progress, lot: Lot): void {
  const state = progress.state;
  for (const i of lot.items) if (i.uid) progress.takeStock(i.uid);
  const gone = new Set(lot.items.filter((i) => !i.uid).map((i) => i.item));
  state.items = state.items.filter((id) => !gone.has(id));
  for (const id of gone) {
    delete state.itemLevels[id];
    delete state.gravures[id];
  }
  for (const [id, count] of Object.entries(lot.materials)) progress.gainMaterial(id, -count);
  progress.gainOboles(-lot.oboles);
}

/**
 * Range dans le personnage ce qu'il reçoit. Une pièce qu'il possède déjà, ou encore scellée, va dans sa réserve avec
 * son niveau et sa gravure. Renvoie ce qu'il faut lui dire.
 */
export function receive(progress: Progress, lot: Lot): string[] {
  const state = progress.state;
  const notes: string[] = [];
  for (const { item, level, gravure, sceau } of lot.items) {
    const def = content.items[item];
    if (!def) continue;
    if (progress.has(item) || sceau) {
      notes.push(stockItem(progress, item, level, gravure, Boolean(sceau)).text);
      continue;
    }
    state.items.push(item);
    state.itemLevels[item] = Math.max(1, Math.floor(level));
    if (gravure) state.gravures[item] = gravure;
    notes.push(`${def.name} rejoint ton inventaire.`);
  }
  for (const [id, count] of Object.entries(lot.materials)) if (count > 0) progress.gainMaterial(id, count);
  if (lot.oboles > 0) progress.gainOboles(lot.oboles);
  return notes;
}

/** Le lot en quelques mots : « Katana du rōnin (niv. 3), 4 fer, 120 oboles ». */
export function describeLot(lot: Lot): string {
  const parts = [
    ...lot.items.map((i) => `${content.items[i.item]?.name ?? i.item}${i.level > 1 ? ` (niv. ${i.level})` : ''}${i.sceau ? ' (scellé)' : i.gravure ? ' (gravé)' : ''}`),
    ...Object.entries(lot.materials)
      .filter(([, n]) => n > 0)
      .map(([id, n]) => `${n} ${content.materials[id] ?? id}`),
    ...(lot.oboles > 0 ? [`${lot.oboles} oboles`] : []),
  ];
  return parts.length ? parts.join(', ') : 'rien';
}
