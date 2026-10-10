// Les gravures : le tirage qui fait le build. Une gravure se pose sur une arme, chez Tetsu, et se relance contre
// des oboles et de la soie de jorōgumo — donc derrière la première victoire des Rizières. Les règles et les chiffres
// sont dans src/data/gravures.json ; ici, le tirage, son prix, et les réglages qu'il pose sur le héros.
//
// Choix de conception, à lire avant de retoucher les chiffres :
//   · une gravure se pose sur un TYPE d'arme (comme un riven sur une arme de Warframe), pas sur une copie : le jeu
//     ne connaît qu'un niveau par objet (`itemLevels`), donc la même clé sert et aucune instance n'est à inventer ;
//   · les lignes de FORME changent la façon de frapper (portée, arc, recharge, rayon) et les lignes de MAÎTRISE
//     changent les chiffres — la forme d'abord, sinon le tirage n'est qu'un robinet de puissance de plus ;
//   · les lignes d'une gravure s'appliquent comme un effet d'objet de l'arme équipée (voir buildLoadout) : donc
//     avant les mises à l'échelle, comme si l'arme portait ces réglages d'origine ;
//   · rien ici ne crée d'état de combat : la gravure ne touche que le PlayerConfig, et ne demande donc aucune
//     montée de PROTOCOL en coop.
import { drawWeighted } from './loot';
import type { ConfigEffect, ItemDef } from './loadout';

/** Comment afficher la valeur tirée : telle quelle, en pourcentage de 1 (0,02 → 2 %), ou en écart à 1 (0,88 → −12 %). */
export type GravureShow = 'brut' | 'part' | 'ecart';
export type GravureKind = 'forme' | 'maitrise' | 'contrepartie';

/**
 * Une ligne possible d'une gravure. Une ligne simple borne une valeur entre `min` et `max`, arrondie à `step`, et
 * l'applique au chemin `path` ; une contrepartie (`effects`) est un paquet fixe : elle ne tire rien au sort.
 */
export interface GravureLineDef {
  id: string;
  name: string;
  kind: GravureKind;
  /** Le texte montré au joueur, avec `{v}` remplacé par la valeur tirée. */
  summary: string;
  /** Chance relative d'être tirée dans son paquet (1 par défaut). */
  weight?: number;
  /** Classes qui peuvent la tirer (« Tous » : tout le monde) ; absent : toutes les armes. */
  tags?: string[];
  op?: 'set' | 'add' | 'mul';
  path?: string;
  min?: number;
  max?: number;
  step?: number;
  show?: GravureShow;
  /** Contrepartie : le paquet fixe, gros renfort contre vraie perte. */
  effects?: ConfigEffect[];
}

/** Un rang de tirage : combien de lignes, jusqu'où elles montent, et si le tirage porte une contrepartie. */
export interface GravureRankDef {
  id: string;
  name: string;
  summary: string;
  /** Nombre de lignes de renfort tirées (formes et maîtrise) ; la contrepartie du rang s'ajoute par-dessus. */
  lines: number;
  /** Part basse de la plage : 0 laisse la valeur libre dans [min, max], 1 la met au maximum. */
  floor: number;
  contrepartie?: boolean;
  weight?: number;
}

export interface GravureCostDef {
  oboles: { base: number; perRoll: number };
  materials: Record<string, { base: number; perRoll: number }>;
}

/**
 * Le sceau du Yomi : la première gravure d'une arme se gagne (fin du bloc du palier `palier` du donjon infini), elle ne
 * s'achète pas. Le sceau désigne lui-même l'arme, au hasard, parmi celles qui n'ont jamais été gravées.
 */
export interface GravureSealDef {
  palier: number;
  name: string;
  /** Le texte montré au joueur, avec `{palier}` remplacé par le palier du sceau. */
  summary: string;
}

export interface GravureData {
  ranks: GravureRankDef[];
  lines: GravureLineDef[];
  cost: GravureCostDef;
  sceau: GravureSealDef;
}

/** Une ligne tirée : ce qu'elle vaut, figé au tirage (une relance remplace la gravure, elle ne la corrige pas). */
export interface GravureLine {
  id: string;
  value: number;
}

/** La gravure d'une arme : son rang, et ses lignes. */
export interface Gravure {
  rank: string;
  lines: GravureLine[];
}

export const gravureRank = (data: GravureData, gravure: Gravure): GravureRankDef | undefined =>
  data.ranks.find((r) => r.id === gravure.rank);

export const gravureLineDef = (data: GravureData, id: string): GravureLineDef | undefined => data.lines.find((l) => l.id === id);

/**
 * Ce que coûte le prochain tirage sur une arme, `rolls` étant le nombre de tirages déjà faits dessus.
 * Le prix monte à chaque relance : une gravure se mérite, la suivante se paie.
 */
export function gravureCost(data: GravureData, rolls: number): { oboles: number; materials: Record<string, number> } {
  const materials: Record<string, number> = {};
  for (const [id, rule] of Object.entries(data.cost.materials)) materials[id] = rule.base + rule.perRoll * rolls;
  return { oboles: data.cost.oboles.base + data.cost.oboles.perRoll * rolls, materials };
}

/**
 * Vrai tant qu'une arme n'a jamais été gravée : sa première gravure passe par le sceau du Yomi, et la bourse n'y peut
 * rien. Un tirage suffit à débloquer la relance, qui se paie comme avant.
 */
export const gravureNeedsSeal = (rolls: number): boolean => rolls === 0;

/**
 * L'arme que le sceau désigne : une arme du sac jamais gravée, tirée au hasard — `null` quand le sac n'en a plus aucune
 * à marquer. C'est le tirage qui fait la rareté : le sceau ne se choisit pas.
 */
export function rollSealTarget(weapons: readonly string[], rolls: (item: string) => number, random: () => number = Math.random): string | null {
  const free = weapons.filter((id) => gravureNeedsSeal(rolls(id)));
  return free.length > 0 ? free[Math.floor(random() * free.length)] : null;
}

/** Le texte du sceau, palier compris (« elle s'arrache au palier 50 du Yomi sans fond »). */
export const gravureSealText = (sceau: GravureSealDef): string => sceau.summary.replace('{palier}', String(sceau.palier));

/**
 * Le sceau gagné en finissant le bloc qui se termine au palier `palier` : il désigne une arme du sac jamais gravée, au
 * hasard, et renvoie son premier tirage. `null` si le palier n'est pas celui du sceau, ou si toutes les armes du sac
 * sont déjà gravées — le sceau n'a alors rien à marquer. Comme le butin du donjon infini, il reste en jeu jusqu'à
 * l'encaissement (voir `grantRun`, dans l'app).
 */
export function rollSeal(
  data: GravureData,
  palier: number,
  items: Record<string, ItemDef>,
  owned: readonly string[],
  rolls: (item: string) => number,
  random: () => number = Math.random,
): { item: string; gravure: Gravure } | null {
  if (palier !== data.sceau.palier) return null;
  const item = rollSealTarget(owned.filter((id) => items[id]?.slot === 'arme'), rolls, random);
  return item ? { item, gravure: rollGravure(data, items[item].tags ?? [], random) } : null;
}

/** Les lignes qu'une arme peut tirer : celles de sa classe, ou celles ouvertes à tout le monde. */
function pickable(data: GravureData, kind: GravureKind, tags: readonly string[]): GravureLineDef[] {
  return data.lines.filter((l) => l.kind === kind && (!l.tags || l.tags.some((t) => t === 'Tous' || tags.includes(t))));
}

/** Une valeur tirée dans [min, max], remontée par le rang (`floor`) puis arrondie à `step`. */
function rollValue(def: GravureLineDef, floor: number, random: () => number): number {
  const { min, max, step } = def;
  if (min === undefined || max === undefined) return 1;
  const raw = min + (max - min) * (floor + (1 - floor) * random());
  const unit = step ?? 0.01;
  const rounded = Math.round(raw / unit) * unit;
  return Number(Math.min(max, Math.max(min, rounded)).toFixed(4));
}

/**
 * Tire une gravure pour une arme : son rang, puis ses lignes — `lines - 1` de forme, une de maîtrise, et la
 * contrepartie du rang s'il en a une. Une même ligne ne tombe pas deux fois sur la même gravure.
 */
export function rollGravure(data: GravureData, tags: readonly string[], random: () => number = Math.random): Gravure {
  const rank = drawWeighted(data.ranks, 1, random)[0] ?? data.ranks[0];
  const lines: GravureLine[] = [];
  const take = (kind: GravureKind, count: number) => {
    const pool = pickable(data, kind, tags).filter((l) => !lines.some((line) => line.id === l.id));
    for (const def of drawWeighted(pool, count, random)) lines.push({ id: def.id, value: rollValue(def, rank.floor, random) });
  };
  take('forme', Math.max(1, rank.lines - 1));
  take('maitrise', 1);
  if (rank.contrepartie) take('contrepartie', 1);
  return { rank: rank.id, lines };
}

/** Les réglages qu'une gravure pose sur le héros, dans l'ordre de ses lignes. */
export function gravureEffects(gravure: Gravure, data: GravureData): ConfigEffect[] {
  const out: ConfigEffect[] = [];
  for (const line of gravure.lines) {
    const def = gravureLineDef(data, line.id);
    if (!def) continue;
    if (def.effects) out.push(...def.effects);
    else if (def.op && def.path) out.push({ op: def.op, path: def.path, value: line.value });
  }
  return out;
}

/**
 * La valeur d'une ligne, écrite pour le joueur : « +0,35 », « +2 % », « −12 % ».
 *
 * Le « % » est ajouté ici pour `part` et `ecart` — `show` dit déjà que c'est un pourcentage — et le sommaire de la
 * ligne ne doit donc PAS le répéter (sinon il s'affiche deux fois : « −11 % % », vu en jeu). Les autres unités
 * (le « m », les secondes, les degrés) n'ont pas de champ pour les dire : elles s'écrivent dans le sommaire.
 */
export function formatGravureValue(value: number, show: GravureShow = 'brut'): string {
  const num = (n: number, digits: number) => String(Math.abs(n).toFixed(digits).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')).replace('.', ',');
  // Le signe se lit sur ce qu'on montre : le multiplicateur lui-même en « part », son écart à 1 en « écart ».
  const signed = (n: number, shown: number, digits: number) => `${n < 0 ? '−' : '+'}${num(shown, digits)}`;
  if (show === 'part') return `${signed(value, value * 100, 1)} %`;
  if (show === 'ecart') return `${signed(value - 1, (value - 1) * 100, 1)} %`;
  return signed(value, value, 2);
}

/** Le texte d'une ligne, avec sa valeur (« Portée des coups +0,35 m »). */
export function gravureLineText(line: GravureLine, def: GravureLineDef): string {
  return def.summary.replace('{v}', formatGravureValue(line.value, def.show));
}

/** Les chances de chaque rang, telles qu'on les montre : du plus courant au plus rare. */
export function rankOdds(data: GravureData): { name: string; chance: number; summary: string }[] {
  const total = data.ranks.reduce((sum, r) => sum + (r.weight ?? 1), 0);
  return [...data.ranks]
    .sort((a, b) => (b.weight ?? 1) - (a.weight ?? 1))
    .map((r) => ({ name: r.name, chance: (r.weight ?? 1) / total, summary: r.summary }));
}
