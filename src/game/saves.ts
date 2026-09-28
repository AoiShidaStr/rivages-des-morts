// Où vivent les sauvegardes : un personnage par emplacement.
// Le jeu ne parle qu'à `SaveStore`. Aujourd'hui, tout est dans le navigateur (localStorage). Une sauvegarde en ligne
// (Supabase…) se branchera ici sans toucher au jeu : le navigateur restera la copie de travail, recopiée depuis le
// compte à la connexion et renvoyée vers lui à chaque écriture.

export interface SlotInfo {
  id: string;
  /** Dernière écriture, en millisecondes depuis 1970. */
  savedAt: number;
}

export interface SaveStore {
  /** Emplacements existants, du plus récemment joué au plus ancien. */
  list(): SlotInfo[];
  /** Contenu d'un emplacement, ou null s'il est vide ou illisible. */
  read(id: string): unknown;
  write(id: string, data: unknown): void;
  remove(id: string): void;
}

const PREFIX = 'rivages-des-morts:perso:';
const INDEX_KEY = 'rivages-des-morts:persos';
/** L'unique sauvegarde d'avant les emplacements : elle devient le premier personnage. */
const LEGACY_KEY = 'rivages-des-morts:sauvegarde';

type Index = Record<string, number>;

/**
 * Sauvegardes dans le navigateur. Navigation privée ou stockage plein : la liste reste vide et les écritures
 * échouent sans bruit, la partie continue sans sauvegarde.
 */
export class LocalSaveStore implements SaveStore {
  constructor() {
    this.adoptLegacy();
  }

  list(): SlotInfo[] {
    return Object.entries(this.index())
      .map(([id, savedAt]) => ({ id, savedAt }))
      .sort((a, b) => b.savedAt - a.savedAt);
  }

  read(id: string): unknown {
    try {
      const raw = localStorage.getItem(PREFIX + id);
      return raw ? (JSON.parse(raw) as unknown) : null;
    } catch {
      return null;
    }
  }

  write(id: string, data: unknown): void {
    try {
      localStorage.setItem(PREFIX + id, JSON.stringify(data));
      this.setIndex({ ...this.index(), [id]: Date.now() });
    } catch {
      // Stockage indisponible : on continue sans sauvegarde.
    }
  }

  remove(id: string): void {
    try {
      localStorage.removeItem(PREFIX + id);
      const index = this.index();
      delete index[id];
      this.setIndex(index);
    } catch {
      // Rien à effacer.
    }
  }

  private index(): Index {
    try {
      const raw = localStorage.getItem(INDEX_KEY);
      return raw ? (JSON.parse(raw) as Index) : {};
    } catch {
      return {};
    }
  }

  private setIndex(index: Index): void {
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  }

  private adoptLegacy(): void {
    try {
      const raw = localStorage.getItem(LEGACY_KEY);
      if (raw === null) return;
      // Recopiée d'abord, effacée ensuite : si la copie échoue, l'ancienne sauvegarde reste en place.
      const id = newSlotId();
      localStorage.setItem(PREFIX + id, raw);
      this.setIndex({ ...this.index(), [id]: Date.now() });
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      // Sauvegarde illisible : on la laisse où elle est.
    }
  }
}

export function newSlotId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
