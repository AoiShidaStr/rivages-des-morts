// Où vivent les sauvegardes : un personnage par emplacement.
// Le jeu ne parle qu'à `SaveStore`. Sans compte, tout est dans le navigateur (localStorage). Avec un compte sur le
// serveur du jeu (`AccountSaveStore`, src/net/account.ts), le navigateur reste la copie de travail, recopiée depuis le
// compte à l'ouverture et renvoyée vers lui à chaque écriture.

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
 * échouent sans bruit, la partie continue sans sauvegarde. `space` sépare les copies de travail de chaque compte de
 * celles du navigateur sans compte (l'espace par défaut).
 */
export class LocalSaveStore implements SaveStore {
  private readonly prefix: string;
  private readonly indexKey: string;

  constructor(space?: string) {
    this.prefix = space ? `rivages-des-morts:${space}:perso:` : PREFIX;
    this.indexKey = space ? `rivages-des-morts:${space}:persos` : INDEX_KEY;
    if (!space) this.adoptLegacy();
  }

  list(): SlotInfo[] {
    return Object.entries(this.index())
      .map(([id, savedAt]) => ({ id, savedAt }))
      .sort((a, b) => b.savedAt - a.savedAt);
  }

  read(id: string): unknown {
    try {
      const raw = localStorage.getItem(this.prefix + id);
      return raw ? (JSON.parse(raw) as unknown) : null;
    } catch {
      return null;
    }
  }

  write(id: string, data: unknown, savedAt = Date.now()): void {
    try {
      localStorage.setItem(this.prefix + id, JSON.stringify(data));
      this.setIndex({ ...this.index(), [id]: savedAt });
    } catch {
      // Stockage indisponible : on continue sans sauvegarde.
    }
  }

  /** Heure de la dernière écriture de cet emplacement, ou 0 s'il est vide. */
  savedAt(id: string): number {
    return this.index()[id] ?? 0;
  }

  remove(id: string): void {
    try {
      localStorage.removeItem(this.prefix + id);
      const index = this.index();
      delete index[id];
      this.setIndex(index);
    } catch {
      // Rien à effacer.
    }
  }

  private index(): Index {
    try {
      const raw = localStorage.getItem(this.indexKey);
      return raw ? (JSON.parse(raw) as Index) : {};
    } catch {
      return {};
    }
  }

  private setIndex(index: Index): void {
    localStorage.setItem(this.indexKey, JSON.stringify(index));
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
