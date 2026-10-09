// Journal des descentes, gardé dans le navigateur du joueur : il sert à comparer les victoires réelles aux mesures du bot
// (`npm run equilibrage`). Rien n'en sort de l'ordinateur ; `rdmJournal()` dans la console en affiche le bilan par classe.
const KEY = 'rdm.journal';
const MAX = 300;

export interface RunEntry {
  date: string;
  /** Classe du héros et niveau du héros. */
  hero: string;
  level: number;
  /** Donjon ('infini' pour le donjon infini) et son niveau (palier pour l'infini). */
  dungeon: string;
  dungeonLevel: number;
  victory: boolean;
  /** Combats gagnés pendant la descente. */
  waves: number;
  /** Nombre de héros (coop). */
  players: number;
}

export function readJournal(): RunEntry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function logRun(entry: Omit<RunEntry, 'date'>): void {
  try {
    const list = [...readJournal(), { date: new Date().toISOString(), ...entry }].slice(-MAX);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Stockage indisponible (navigation privée, quota) : le jeu continue sans journal.
  }
}

/** Victoires par classe, en part des descentes. */
export function journalSummary(): Record<string, { runs: number; wins: number; rate: string }> {
  const out: Record<string, { runs: number; wins: number; rate: string }> = {};
  for (const e of readJournal()) {
    const row = (out[e.hero] ??= { runs: 0, wins: 0, rate: '0 %' });
    row.runs += 1;
    if (e.victory) row.wins += 1;
    row.rate = `${Math.round((row.wins / row.runs) * 100)} %`;
  }
  return out;
}

if (typeof window !== 'undefined') (window as unknown as { rdmJournal: () => unknown }).rdmJournal = () => ({ bilan: journalSummary(), descentes: readJournal() });
