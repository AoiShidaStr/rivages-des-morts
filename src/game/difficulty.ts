// Niveau du donjon, choisi à l'entrée : il renforce les yokai, ajoute des malédictions et améliore le butin.
// Les valeurs sont dans src/data/difficulty.json.

export type CurseId = 'hate' | 'elites' | 'feux' | 'seve' | 'ecorce' | 'rancune' | 'izanami';

export interface CurseDef {
  id: CurseId;
  from: number;
  value: number;
  name: string;
  description: string;
}

export interface DifficultyData {
  maxLevel: number;
  enemy: { hpPerLevel: number; damagePerLevel: number };
  rewards: { obolesPerLevel: number; xpPerLevel: number; rareChancePerLevel: number; extraMaterialEvery: number };
  elite: { hp: number; damage: number };
  curses: CurseDef[];
}

/** Ce que le combat doit savoir d'un niveau de donjon. */
export interface Difficulty {
  level: number;
  /** Multiplicateurs des PV et des dégâts des yokai. */
  hp: number;
  damage: number;
  /** Valeur de chaque malédiction active (absente = inactive). */
  curses: Partial<Record<CurseId, number>>;
  elite: { hp: number; damage: number };
}

/** Multiplicateurs du butin : oboles, expérience, chance des objets rares, matériaux en plus par drop. */
export interface Rewards {
  oboles: number;
  xp: number;
  rareChance: number;
  extraMaterials: number;
}

export const clampLevel = (data: DifficultyData, level: number): number => Math.max(1, Math.min(data.maxLevel, Math.round(level)));

/** Malédictions actives : pour chaque id, la plus forte déjà atteinte (Hâte II remplace Hâte). */
export function activeCurses(data: DifficultyData, level: number): CurseDef[] {
  const byId = new Map<CurseId, CurseDef>();
  for (const curse of data.curses) {
    if (curse.from > level) continue;
    const current = byId.get(curse.id);
    if (!current || curse.from > current.from) byId.set(curse.id, curse);
  }
  return [...byId.values()].sort((a, b) => a.from - b.from);
}

/** Prochaine malédiction qui s'ajoutera en montant de niveau, s'il en reste une. */
export function nextCurse(data: DifficultyData, level: number): CurseDef | undefined {
  return data.curses.filter((c) => c.from > level).sort((a, b) => a.from - b.from)[0];
}

export function difficultyFor(data: DifficultyData, level: number): Difficulty {
  const n = clampLevel(data, level) - 1;
  const curses: Difficulty['curses'] = {};
  for (const curse of activeCurses(data, n + 1)) curses[curse.id] = curse.value;
  return {
    level: n + 1,
    hp: 1 + data.enemy.hpPerLevel * n,
    damage: 1 + data.enemy.damagePerLevel * n,
    curses,
    elite: data.elite,
  };
}

export function rewardsFor(data: DifficultyData, level: number): Rewards {
  const n = clampLevel(data, level) - 1;
  const r = data.rewards;
  return {
    oboles: 1 + r.obolesPerLevel * n,
    xp: 1 + r.xpPerLevel * n,
    rareChance: 1 + r.rareChancePerLevel * n,
    extraMaterials: Math.floor((n + 1) / r.extraMaterialEvery),
  };
}
