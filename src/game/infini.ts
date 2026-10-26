// Le Yomi sans fond (donjon infini) : on entre directement au palier 30, face à Izanami et la Jorōgumo ensemble ; puis
// des blocs de 5 paliers, quatre salles tirées au hasard parmi les yokai des donjons et les deux reines au bout. La
// difficulté monte en ligne droite d'un palier à l'autre (0.25.0). Les règles chiffrées sont dans
// src/data/donjon-infini.json ; ici, ce qu'on en tire pour un palier.
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
  /** Premier palier de la descente : le bloc 0 n'est que ce palier, le combat des deux reines (0.25.0 : 30). */
  startPalier?: number;
  modifiers: EndlessModifier[];
  /** Ancienne montée par paliers (l'Abîme qui se répète) ; remplacée par `progression` depuis la 0.25.0. */
  beyond?: Omit<EndlessModifier, 'from'>;
  progression?: EndlessProgression;
  /** Les salles tirées au hasard (0.25.0) : à la place des salles fixes des donjons. */
  salles?: EndlessRooms;
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

/**
 * La montée en ligne droite : à chaque palier au-delà de `from`, les yokai gagnent `hpPerPalier` de PV et
 * `damagePerPalier` de dégâts (de leur force au palier `from`, sans intérêts composés), une bête de plus par vague tous
 * les `spawnsEvery` paliers, et certaines malédictions montent d'un cran fixe par palier jusqu'à leur plafond.
 */
export interface EndlessProgression {
  from: number;
  hpPerPalier: number;
  damagePerPalier: number;
  spawnsEvery: number;
  spawnsMax: number;
  curses?: Partial<Record<CurseId, { perPalier: number; max: number }>>;
}

/** Un yokai que les salles tirées peuvent amener : son poids dans le budget, combien au plus, et son rôle. */
export interface EndlessRoomYokai {
  cost: number;
  max: number;
  /** Un rôle n'est tiré qu'une fois par salle (`roles`) : jamais deux sortes de lourds, ni deux soigneurs. */
  role: string;
  name: string;
}

/**
 * Les salles tirées : un budget par salle du bloc (la 1re plus légère que la 4e), un peu de hasard autour, deux ou
 * trois sortes de yokai par salle, et pas plus d'une sorte par rôle limité. C'est ce qui les garde équilibrées :
 * le budget est calé sur le poids des anciennes salles fixes du Palais.
 */
export interface EndlessRooms {
  budget: number[];
  jitter: number;
  maxEnemies: number;
  kinds: { min: number; max: number };
  roles: Record<string, number>;
  yokai: Record<string, EndlessRoomYokai>;
}

/** Ce qu'il faut savoir d'un donjon normal pour en tirer un bloc : ses vagues, et sa force au niveau 1. */
export interface ArenaSource {
  id: string;
  waves: WaveConfig[];
  strength?: EnemyStrength;
}

/** Premier palier de la descente (30 depuis la 0.25.0). */
export const startPalier = (data: EndlessData): number => data.startPalier ?? 1;

/** Numéro du bloc : 0 pour le palier d'entrée (le combat des deux reines), 1 pour les 5 suivants (31 à 35), etc. */
export const blocOf = (data: EndlessData, palier: number): number => Math.max(0, Math.ceil((palier - startPalier(data)) / data.palierStep));
/** Premier et dernier palier d'un bloc : le bloc 0 n'a que le palier d'entrée. */
export const firstPalier = (data: EndlessData, bloc: number): number => (bloc <= 0 ? startPalier(data) : startPalier(data) + (bloc - 1) * data.palierStep + 1);
export const lastPalier = (data: EndlessData, bloc: number): number => startPalier(data) + Math.max(0, bloc) * data.palierStep;

/** Niveau des yokai au palier `palier` : 50 + 10 tous les 5 paliers, plafonné à 100 (atteint au 25, donc partout depuis l'entrée au 30). */
export const levelAt = (data: EndlessData, palier: number): number =>
  Math.min(data.maxLevel, data.baseLevel + data.levelStep * Math.floor(palier / data.palierStep));

/** Arène d'un bloc : Rizières, Palais, Rizières… */
export const arenaOf = (data: EndlessData, bloc: number): string => data.arenas[bloc % data.arenas.length];

/** Vrai pour un palier de boss (le dernier de chaque bloc). */
export const isBossPalier = (data: EndlessData, palier: number): boolean => palier >= startPalier(data) && (palier - startPalier(data)) % data.palierStep === 0;

/** Modificateurs actifs au palier `palier` : ceux de la liste déjà atteints, puis l'Abîme qui se répète. */
export function modifiersAt(data: EndlessData, palier: number): EndlessModifier[] {
  const active = data.modifiers.filter((m) => m.from <= palier);
  const last = data.modifiers.reduce((max, m) => Math.max(max, m.from), 0);
  if (!data.beyond) return active;
  const beyond = data.beyond;
  for (let from = last + data.palierStep; from <= palier; from += data.palierStep) active.push({ ...beyond, name: `${beyond.name} ${(from - last) / data.palierStep}`, from });
  return active;
}

/** Difficulté d'un palier : le niveau du donjon, puis les modificateurs de l'infini par-dessus. */
export function difficultyAt(data: EndlessData, difficulty: DifficultyData, palier: number, heroes: number, strength?: EnemyStrength, pactes: EndlessModifierSeed[] = []): Difficulty {
  const base = difficultyFor(difficulty, levelAt(data, palier), heroes, strength);
  const curses = { ...base.curses };
  let hp = 1;
  let damage = 1;
  let extraSpawns = 0;
  // La montée en ligne droite : la même marche à chaque palier, sans paliers de rupture.
  const prog = data.progression;
  if (prog) {
    const n = Math.max(0, palier - prog.from);
    hp *= 1 + prog.hpPerPalier * n;
    damage *= 1 + prog.damagePerPalier * n;
    extraSpawns += Math.min(prog.spawnsMax, Math.floor(n / prog.spawnsEvery));
    for (const [id, c] of Object.entries(prog.curses ?? {}) as [CurseId, { perPalier: number; max: number }][]) {
      const value = Math.min(c.max, (curses[id] ?? 0) + c.perPalier * n);
      if (value > 0) curses[id] = Math.max(curses[id] ?? 0, Number(value.toFixed(3)));
    }
  }
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
 * Les vagues d'un bloc : le bloc 0 n'est que le combat d'entrée (les deux reines) ; les suivants ont une salle tirée
 * par palier (`roomWave`), puis le boss au dernier. À partir de `doubleBossFrom`, la Jorōgumo et Izanami ensemble,
 * avec les souches de l'une et les pêchers de l'autre. Chaque vague porte la difficulté de son palier. Sans `salles`,
 * on retombe sur l'ancienne règle : des salles fixes de l'arène du bloc.
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
  // Les salles tirées mêlent les yokai des deux donjons : elles prennent la force commune (celle du Palais), pas la
  // force plus douce des Rizières — c'est aussi celle du combat du palier 30 d'avant la 0.25.0.
  const strength = data.salles ? undefined : arena.strength;
  const first = firstPalier(data, bloc);
  const last = lastPalier(data, bloc);
  const count = last - first;
  let rooms: WaveConfig[];
  if (data.salles) rooms = Array.from({ length: count }, (_, i) => roomWave(data.salles!, i, random));
  else {
    const pool = arena.waves.slice(1, -1).map((wave, i) => ({ wave, i, roll: random() }));
    rooms = pool.sort((a, b) => a.roll - b.roll).slice(0, count).sort((a, b) => a.i - b.i).map((p) => p.wave);
  }
  const waves = rooms.map((wave, i) => palierWave(data, difficulty, wave, first + i, heroes, strength, pactes));
  const bossWave = arena.waves[arena.waves.length - 1];
  const boss = last >= data.doubleBossFrom ? doubleBoss(arenas) : bossWave;
  waves.push(palierWave(data, difficulty, boss, last, heroes, strength, pactes));
  return waves;
}

/**
 * Une salle tirée au hasard : deux ou trois sortes de yokai (au plus une par rôle limité : un lourd, un soigneur, un
 * tireur), au moins un de chaque, puis on remplit le budget de la salle (`budget[index]`, à ±`jitter` près) en tirant
 * dans ces sortes tant qu'il en reste qui rentrent. Le budget pèse les yokai (un feu follet 1, un kappa renforcé 7) :
 * deux salles du même rang se valent sans se ressembler.
 */
export function roomWave(salles: EndlessRooms, index: number, random: () => number = Math.random): WaveConfig {
  const base = salles.budget[Math.min(index, salles.budget.length - 1)];
  let budget = base * (1 + salles.jitter * (2 * random() - 1));
  const want = salles.kinds.min + Math.floor(random() * (salles.kinds.max - salles.kinds.min + 1));
  const roles: Record<string, number> = {};
  const kinds: string[] = [];
  for (const { id } of Object.keys(salles.yokai).map((id) => ({ id, roll: random() })).sort((a, b) => a.roll - b.roll)) {
    if (kinds.length >= want) break;
    const y = salles.yokai[id];
    if ((roles[y.role] ?? 0) >= (salles.roles[y.role] ?? Infinity)) continue;
    roles[y.role] = (roles[y.role] ?? 0) + 1;
    kinds.push(id);
  }
  const counts: Record<string, number> = {};
  let total = 0;
  const add = (id: string) => {
    counts[id] = (counts[id] ?? 0) + 1;
    budget -= salles.yokai[id].cost;
    total++;
  };
  // Un de chaque sorte d'abord, les plus lourds en premier pour qu'ils rentrent.
  for (const id of [...kinds].sort((a, b) => salles.yokai[b].cost - salles.yokai[a].cost)) if (salles.yokai[id].cost <= budget + 0.5) add(id);
  for (;;) {
    if (total >= salles.maxEnemies) break;
    const fits = kinds.filter((id) => (counts[id] ?? 0) < salles.yokai[id].max && salles.yokai[id].cost <= budget + 0.5);
    if (!fits.length) break;
    add(fits[Math.floor(random() * fits.length)]);
  }
  const present = kinds.filter((id) => counts[id]);
  const names = present.map((id) => salles.yokai[id].name);
  const label = names.length > 1 ? `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}` : (names[0] ?? 'Le vide');
  return {
    label: label.charAt(0).toUpperCase() + label.slice(1),
    spawns: present.map((id) => ({ kind: id as EnemyKind, count: counts[id] })),
  };
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
