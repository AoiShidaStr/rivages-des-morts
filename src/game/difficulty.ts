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
  /** Une victoire ouvre les niveaux jusqu'au prochain multiple de `unlockStep` (1 → 5, 5 → 10…). */
  unlockStep: number;
  /**
   * `base` : force des yokai dès le niveau 1, `bossBase` celle du boss (plus douce : une première victoire doit rester
   * à portée) ; puis ce qui s'ajoute à chaque niveau, pour tous.
   */
  enemy: {
    base: { hp: number; damage: number };
    bossBase: { hp: number; damage: number };
    hpPerLevel: number;
    damagePerLevel: number;
    /**
     * Supplément propre aux donjons ordinaires (Rizières, Palais) : la descente choisie à l'entrée est le curseur de
     * difficulté du joueur expérimenté. Le Yomi sans fond, lui, ne le reçoit pas : c'est l'épreuve, elle garde ses
     * propres chiffres (donjon-infini.json) et l'on ne veut pas la durcir en même temps.
     */
    dungeons?: { hp: number; damage: number; from?: number };
  };
  rewards: { obolesPerLevel: number; xpPerLevel: number; rareChancePerLevel: number; extraMaterialEvery: number };
  elite: { hp: number; damage: number };
  curses: CurseDef[];
  /**
   * Coop : PV des yokai (`hp`) et du boss (`bossHp`) selon le nombre de héros (1er élément : seul),
   * et yokai en plus par vague pour chaque héros au-delà du premier.
   */
  party: { hp: number[]; bossHp: number[]; extraSpawns: number };
}

/** Ce que le combat doit savoir d'un niveau de donjon. */
export interface Difficulty {
  level: number;
  /** Multiplicateurs des PV et des dégâts des yokai, et ceux du boss. */
  hp: number;
  damage: number;
  boss: { hp: number; damage: number };
  /** Valeur de chaque malédiction active (absente = inactive). */
  curses: Partial<Record<CurseId, number>>;
  elite: { hp: number; damage: number };
  /** Coop : yokai en plus par vague pour chaque héros au-delà du premier. */
  extraSpawns: number;
  /** Donjon infini (Marée des morts) : yokai en plus par vague, même en solo. */
  soloExtra?: number;
  /**
   * Plafond de « la marée monte » propre à ce palier (0,3 par défaut). Le Yomi sans fond l'abaisse à 0,15 à partir
   * du palier 40 : la marée punit les classes de soutien plus que les autres, et la descente doit rester faisable.
   */
  tideMax?: number;
}

/** Multiplicateurs du butin : oboles, expérience, chance des objets rares, matériaux en plus par drop. */
export interface Rewards {
  oboles: number;
  xp: number;
  rareChance: number;
  extraMaterials: number;
}

export const clampLevel = (data: DifficultyData, level: number): number => Math.max(1, Math.min(data.maxLevel, Math.round(level)));

/** Niveau ouvert par une victoire au niveau `level` : le prochain palier de `unlockStep` (1 → 5, 7 → 10, 10 → 15). */
export const unlockAfter = (data: DifficultyData, level: number): number =>
  clampLevel(data, (Math.floor(level / data.unlockStep) + 1) * data.unlockStep);

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

/** Force des yokai et du boss au niveau 1 d'un donjon, à la place de celle de difficulty.json (le premier donjon est plus doux). */
export interface EnemyStrength {
  base?: { hp: number; damage: number };
  bossBase?: { hp: number; damage: number };
}

/** `heroes` : nombre de héros dans la partie (1 en solo, jusqu'à 3 en coop) ; `strength` : la force propre au donjon. */
export function difficultyFor(data: DifficultyData, level: number, heroes = 1, strength: EnemyStrength = {}): Difficulty {
  const n = clampLevel(data, level) - 1;
  const curses: Difficulty['curses'] = {};
  for (const curse of activeCurses(data, n + 1)) curses[curse.id] = curse.value;
  const party = (list: number[]) => list[Math.max(0, Math.min(list.length, heroes) - 1)] ?? 1;
  const base = strength.base ?? data.enemy.base;
  const bossBase = strength.bossBase ?? data.enemy.bossBase;
  return {
    level: n + 1,
    hp: base.hp * (1 + data.enemy.hpPerLevel * n) * party(data.party.hp),
    damage: base.damage * (1 + data.enemy.damagePerLevel * n),
    extraSpawns: heroes > 1 ? data.party.extraSpawns : 0,
    boss: {
      hp: bossBase.hp * (1 + data.enemy.hpPerLevel * n) * party(data.party.bossHp),
      damage: bossBase.damage * (1 + data.enemy.damagePerLevel * n),
    },
    curses,
    elite: data.elite,
  };
}

/**
 * Difficulté d'un donjon ordinaire : celle de `difficultyFor`, plus le supplément `enemy.dungeons` (0.16.0 : ×1,5) à partir
 * de son niveau `from`, appliqué aux yokai comme au boss. Le Yomi sans fond n'y touche pas : il appelle `difficultyFor` directement.
 */
export function dungeonDifficultyFor(data: DifficultyData, level: number, heroes = 1, strength: EnemyStrength = {}): Difficulty {
  const diff = difficultyFor(data, level, heroes, strength);
  const extra = data.enemy.dungeons;
  // Sous `from` (niveau 5) : le donjon d'apprentissage reste abordable pour les classes sans garde (diagnostic 0.16.0, § 6).
  if (!extra || diff.level < (extra.from ?? 1)) return diff;
  return {
    ...diff,
    hp: diff.hp * extra.hp,
    damage: diff.damage * extra.damage,
    boss: { hp: diff.boss.hp * extra.hp, damage: diff.boss.damage * extra.damage },
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
