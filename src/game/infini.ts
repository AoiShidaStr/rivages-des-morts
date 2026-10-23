// Le Yomi sans fond (donjon infini) : des blocs de 5 paliers, Rizières puis Palais en alternance, un boss au bout de
// chaque bloc. Les règles chiffrées sont dans src/data/donjon-infini.json ; ici, ce qu'on en tire pour un palier.
import type { WaveConfig } from './config';
import { difficultyFor, type CurseId, type Difficulty, type DifficultyData, type EnemyStrength } from './difficulty';
import { equipBlock, type ItemDef, type SkillsDef } from './loadout';
import type { Hero } from './progress';
import type { EnemyKind } from './types';

export interface EndlessModifier {
  from: number;
  /** Les pactes en portent un : un pacte scellé ne se retire plus dans la même descente. */
  id?: string;
  name: string;
  description: string;
  curses?: Partial<Record<CurseId, number>>;
  extraSpawns?: number;
  hp?: number;
  damage?: number;
}

/** Un pacte est un modificateur sans palier d'entrée : on l'enchâsse au fil de la descente et il s'ajoute aux autres. */
export type EndlessModifierSeed = Omit<EndlessModifier, 'from'>;

export interface EndlessData {
  name: string;
  region: string;
  unlockLevel: number;
  baseLevel: number;
  levelStep: number;
  palierStep: number;
  maxLevel: number;
  arenas: string[];
  wavesPerBloc: number;
  doubleBossFrom: number;
  modifiers: EndlessModifier[];
  beyond: Omit<EndlessModifier, 'from'>;
  /** Les pactes du Yomi : à chaque bloc à partir de `from` (premier palier du bloc), l'hôte en scelle un parmi un tirage. */
  pactes?: { from: number; options: EndlessModifierSeed[] };
  rewards: {
    itemsFrom: number;
    rarity: { from: number; weights: Record<string, number> }[];
    /** L'Éclat des Tablettes que laisse le boss d'un bloc, dès le palier `from`. */
    eclat?: { from: number; material: string; count: number };
  };
  victory: { title: string; text: string };
  defeat: string;
  /** Point de retour sur l'île, devant la faille de la cascade. */
  exit: { u: number; v: number };
  /** Variantes de salle (les rochers de la caverne), à la place de celles du donjon dont le bloc reprend les vagues. */
  layouts?: { x: number; z: number }[][];
}

/** Ce qu'il faut savoir d'un donjon normal pour en tirer un bloc : ses vagues, et sa force au niveau 1. */
export interface ArenaSource {
  id: string;
  waves: WaveConfig[];
  strength?: EnemyStrength;
}

/** Numéro du bloc (0 pour les paliers 1 à 5) et premier palier d'un bloc. */
export const blocOf = (data: EndlessData, palier: number): number => Math.floor((Math.max(1, palier) - 1) / data.palierStep);
export const firstPalier = (data: EndlessData, bloc: number): number => bloc * data.palierStep + 1;

/** Niveau des yokai au palier `palier` : 50 au départ, +10 tous les 5 paliers (le 25 est au niveau 100). */
export const levelAt = (data: EndlessData, palier: number): number =>
  Math.min(data.maxLevel, data.baseLevel + data.levelStep * Math.floor(palier / data.palierStep));

/** Arène d'un bloc : Rizières, Palais, Rizières… */
export const arenaOf = (data: EndlessData, bloc: number): string => data.arenas[bloc % data.arenas.length];

/** Vrai pour un palier de boss (le dernier de chaque bloc). */
export const isBossPalier = (data: EndlessData, palier: number): boolean => palier % data.palierStep === 0;

/** Modificateurs actifs au palier `palier` : ceux de la liste déjà atteints, puis l'Abîme qui se répète. */
export function modifiersAt(data: EndlessData, palier: number): EndlessModifier[] {
  const active = data.modifiers.filter((m) => m.from <= palier);
  const last = data.modifiers.reduce((max, m) => Math.max(max, m.from), 0);
  for (let from = last + data.palierStep; from <= palier; from += data.palierStep) active.push({ ...data.beyond, name: `${data.beyond.name} ${(from - last) / data.palierStep}`, from });
  return active;
}

/** Difficulté d'un palier : le niveau du donjon, puis les modificateurs de l'infini par-dessus. */
export function difficultyAt(data: EndlessData, difficulty: DifficultyData, palier: number, heroes: number, strength?: EnemyStrength, pactes: EndlessModifierSeed[] = []): Difficulty {
  const base = difficultyFor(difficulty, levelAt(data, palier), heroes, strength);
  const curses = { ...base.curses };
  let hp = 1;
  let damage = 1;
  let extraSpawns = 0;
  const modifiers = modifiersAt(data, palier);
  for (const m of [...modifiers, ...pactes]) {
    // Les paliers montent les malédictions (on garde la plus forte) ; un pacte, lui, les fixe : le Pacte du créneau
    // ramène les élites à une seule par vague, même quand les paliers en demandent trois.
    const pacte = !modifiers.includes(m as EndlessModifier);
    for (const [id, value] of Object.entries(m.curses ?? {}) as [CurseId, number][]) curses[id] = pacte ? value : Math.max(curses[id] ?? 0, value);
    hp *= m.hp ?? 1;
    damage *= m.damage ?? 1;
    extraSpawns += m.extraSpawns ?? 0;
  }
  return {
    ...base,
    hp: base.hp * hp,
    damage: base.damage * damage,
    boss: { hp: base.boss.hp * hp, damage: base.boss.damage * damage },
    curses,
    extraSpawns: Math.max(0, base.extraSpawns + extraSpawns),
    // Les yokai en plus de la Marée des morts viennent même en solo.
    soloExtra: Math.max(0, extraSpawns),
    // 0.17.0 : au palier 40+, le plafond de la marée tombe de +30 % à +15 % — la marée punit les classes à soin
    // (Sorcier, Paladin) plus que les autres, et le palier 50 doit rester atteignable en solo.
    tideMax: palier >= 40 ? 0.15 : undefined,
  };
}

/**
 * Les vagues d'un bloc : `wavesPerBloc` vagues tirées parmi celles de l'arène (sans la première, qui apprend les
 * bases, ni le boss), puis le boss. À partir de `doubleBossFrom`, la Jorōgumo et Izanami ensemble, avec les souches
 * de l'une et les pêchers de l'autre. Chaque vague porte la difficulté de son palier.
 */
export function blocWaves(
  data: EndlessData,
  difficulty: DifficultyData,
  bloc: number,
  arenas: Record<string, ArenaSource>,
  heroes: number,
  random: () => number = Math.random,
  pactes: EndlessModifierSeed[] = [],
): WaveConfig[] {
  const arena = arenas[arenaOf(data, bloc)];
  const bossWave = arena.waves[arena.waves.length - 1];
  const pool = arena.waves.slice(1, -1).map((wave, i) => ({ wave, i, roll: random() }));
  const picked = pool.sort((a, b) => a.roll - b.roll).slice(0, data.wavesPerBloc).sort((a, b) => a.i - b.i).map((p) => p.wave);
  const first = firstPalier(data, bloc);
  const waves = picked.map((wave, i) => palierWave(data, difficulty, wave, first + i, heroes, arena.strength, pactes));
  const last = first + data.palierStep - 1;
  const boss = last >= data.doubleBossFrom ? doubleBoss(arenas) : bossWave;
  waves.push(palierWave(data, difficulty, boss, last, heroes, arena.strength, pactes));
  return waves;
}

function palierWave(data: EndlessData, difficulty: DifficultyData, wave: WaveConfig, palier: number, heroes: number, strength?: EnemyStrength, pactes: EndlessModifierSeed[] = []): WaveConfig {
  const level = levelAt(data, palier);
  // Les pactes scellés se lisent au pas de la vague : l'étiquette dit aussi qui a payé quoi.
  const notes = pactes.length ? ` · ${pactes.map((m) => m.name).join(' · ')}` : '';
  return {
    ...wave,
    step: `Palier ${palier} · Niveau ${level}${notes}`,
    palier,
    difficulty: difficultyAt(data, difficulty, palier, heroes, strength, pactes),
  };
}

/**
 * Les pactes du bloc : deux ou trois tirés sans doublon parmi les options, ou null avant le premier bloc pacté. Un
 * pacte déjà scellé dans la descente (`sealed`, par identifiant) ne revient pas : ils ne s'empilent pas sur eux-mêmes,
 * et quand tous sont scellés, la descente continue sans nouveau pacte.
 */
export function pacteDraft(data: EndlessData, bloc: number, random: () => number = Math.random, sealed: readonly string[] = []): EndlessModifierSeed[] | null {
  if (firstPalier(data, bloc) < (data.pactes?.from ?? Infinity)) return null;
  const pool = (data.pactes?.options ?? []).filter((p) => !p.id || !sealed.includes(p.id));
  if (pool.length === 0) return null;
  const shuffled = [...pool].sort(() => random() - 0.5);
  return shuffled.slice(0, Math.min(3, pool.length));
}

/** La Jorōgumo et Izanami ensemble : souches des Rizières (pour le fil de Jōren) et pêchers du Palais. */
function doubleBoss(arenas: Record<string, ArenaSource>): WaveConfig {
  const bossOf = (id: string) => arenas[id].waves[arenas[id].waves.length - 1];
  const rizieres = bossOf('rizieres');
  const palais = bossOf('palais');
  return {
    label: 'La reine et sa servante',
    hint: 'Izanami et la Jorōgumo ensemble. Les souches retiennent le fil de l’araignée, les pêchers repoussent la reine.',
    spawns: [...rizieres.spawns, ...palais.spawns],
    stumps: rizieres.stumps,
    peaches: palais.peaches,
  };
}

const BOSS_KINDS: readonly EnemyKind[] = ['jorogumo', 'izanami'];
export const isBoss = (kind: EnemyKind): boolean => BOSS_KINDS.includes(kind);

/**
 * Objet gagné en finissant le palier `palier` (à partir de `itemsFrom`), ou null. La rareté est tirée selon le palier ;
 * on préfère un objet que le héros peut porter et qu'il n'a pas encore.
 */
export function rollEndlessItem(
  data: EndlessData,
  palier: number,
  items: Record<string, ItemDef>,
  hero: Hero,
  skills: SkillsDef,
  owned: (id: string) => boolean,
  random: () => number = Math.random,
): string | null {
  if (palier < data.rewards.itemsFrom) return null;
  const tier = [...data.rewards.rarity].reverse().find((t) => t.from <= palier);
  if (!tier) return null;
  const entries = Object.entries(tier.weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = random() * total;
  let rarity = entries[0][0];
  for (const [r, w] of entries) {
    roll -= w;
    if (roll < 0) {
      rarity = r;
      break;
    }
  }
  // De la rareté tirée vers les plus communes, tant qu'aucun objet ne convient.
  const order = entries.map(([r]) => r);
  for (let i = order.indexOf(rarity); i >= 0; i--) {
    // Les objets de boss ne tombent que sur Jorōgumo et Izanami.
    const pool = Object.entries(items).filter(([, def]) => def.rarity === order[i] && def.slot && def.spec !== 'boss');
    const pick = (list: [string, ItemDef][]) => (list.length ? list[Math.floor(random() * list.length)][0] : null);
    const fresh = pool.filter(([id]) => !owned(id));
    const chosen = pick(fresh.filter(([, def]) => equipBlock(def, hero, skills) === null)) ?? pick(fresh) ?? (i === 0 ? pick(pool) : null);
    if (chosen) return chosen;
  }
  return null;
}

// --- Records ----------------------------------------------------------------------

/** Record de tous les personnages de ce navigateur. */
export interface GlobalRecord {
  palier: number;
  hero: string;
}

const RECORD_KEY = 'rivages-des-morts:record-infini';

export function globalRecord(): GlobalRecord | null {
  try {
    const raw = localStorage.getItem(RECORD_KEY);
    const record = raw ? (JSON.parse(raw) as Partial<GlobalRecord>) : null;
    return record && typeof record.palier === 'number' ? { palier: record.palier, hero: String(record.hero ?? '') } : null;
  } catch {
    return null;
  }
}

/** Retient le record s'il est battu ; vrai si c'est un nouveau record global. */
export function submitGlobalRecord(palier: number, hero: string): boolean {
  if (palier <= (globalRecord()?.palier ?? 0)) return false;
  try {
    localStorage.setItem(RECORD_KEY, JSON.stringify({ palier, hero }));
  } catch {
    // Stockage indisponible : le record ne vaut que pour cette session.
  }
  return true;
}
