// Les comptes, quand le jeu est servi par son propre serveur (server/comptes.ts) : se connecter, et garder ses
// personnages sur le compte. La version GitHub Pages n'a pas de serveur : elle reste sur les sauvegardes du navigateur.
//
// Avec un compte, le navigateur garde une copie de travail des personnages, à part de ceux d'avant la connexion. À
// l'ouverture du jeu, on recopie depuis le compte ce qui y est plus récent, et on lui renvoie ce qui est plus récent
// ici. Chaque sauvegarde part ensuite vers le compte un instant après (les sauvegardes se suivent de près). Sans
// réseau, on joue sur la copie de travail : elle repartira à la prochaine ouverture.
import { LocalSaveStore, type SaveStore, type SlotInfo } from '../game/saves';
import type { Json } from './transport';

const SESSION_KEY = 'rivages-des-morts:compte';
/** Message à montrer après le rechargement de la page (connexion, déconnexion). */
const NOTICE_KEY = 'rivages-des-morts:avis';
/** Délai avant d'envoyer une sauvegarde au compte : les suivantes de la même seconde partent avec elle. */
const UPLOAD_DELAY = 1_500;

export interface AccountSession {
  pseudo: string;
  jeton: string;
}

/** Le serveur a refusé la requête ; `status` 401 : le jeton ne vaut plus rien (déconnecté ailleurs). */
export class AccountError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Le compte connecté dans ce navigateur, s'il y en a un. */
export function savedSession(): AccountSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    const session = raw ? (JSON.parse(raw) as AccountSession) : null;
    return session && typeof session.pseudo === 'string' && typeof session.jeton === 'string' ? session : null;
  } catch {
    return null;
  }
}

function keepSession(session: AccountSession | null): void {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // Stockage indisponible : il faudra se reconnecter.
  }
}

async function api<T>(path: string, options: { method?: string; body?: Json; jeton?: string; keepalive?: boolean } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(new URL(`api/${path}`, location.href), {
      method: options.method ?? 'GET',
      headers: { 'Content-Type': 'application/json', ...(options.jeton ? { Authorization: `Bearer ${options.jeton}` } : {}) },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      keepalive: options.keepalive,
    });
  } catch {
    throw new AccountError(0, 'Le serveur du jeu ne répond pas.');
  }
  const data = (await response.json().catch(() => ({}))) as T & { erreur?: string };
  if (!response.ok) throw new AccountError(response.status, data.erreur ?? `Le serveur a répondu ${response.status}.`);
  return data;
}

/** Crée un compte, ou s'y connecte ; le compte reste connecté dans ce navigateur. */
export async function signIn(kind: 'inscription' | 'connexion', pseudo: string, motDePasse: string): Promise<AccountSession> {
  const session = await api<AccountSession>(`compte/${kind}`, { method: 'POST', body: { pseudo, motDePasse } });
  keepSession({ pseudo: session.pseudo, jeton: session.jeton });
  return session;
}

/** Se déconnecte. La copie de travail des personnages reste dans le navigateur, pour la prochaine connexion. */
export async function signOut(session: AccountSession): Promise<void> {
  keepSession(null);
  await api('compte/deconnexion', { method: 'POST', jeton: session.jeton }).catch(() => undefined);
}

type Remote = { id: string; sauve: number; efface: boolean };

/** Les personnages d'un compte : une copie de travail dans le navigateur, recopiée vers le compte. */
export class AccountSaveStore implements SaveStore {
  private readonly local: LocalSaveStore;
  private readonly timers = new Map<string, number>();
  /** Effacements pas encore reçus par le compte (hors ligne), avec leur heure. */
  private readonly erasedKey: string;
  /** Faux tant que le compte n'a pas répondu (serveur injoignable) : on joue sur la copie de travail. */
  online = false;

  constructor(readonly session: AccountSession) {
    const space = `compte:${session.pseudo.toLowerCase()}`;
    this.local = new LocalSaveStore(space);
    this.erasedKey = `rivages-des-morts:${space}:effaces`;
    window.addEventListener('pagehide', () => this.flush());
  }

  list(): SlotInfo[] {
    return this.local.list();
  }

  read(id: string): unknown {
    return this.local.read(id);
  }

  write(id: string, data: unknown): void {
    this.local.write(id, data);
    window.clearTimeout(this.timers.get(id));
    this.timers.set(id, window.setTimeout(() => void this.upload(id), UPLOAD_DELAY));
  }

  remove(id: string): void {
    this.local.remove(id);
    window.clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    const erased = { ...this.erased(), [id]: Date.now() };
    this.setErased(erased);
    void this.erase(id, erased[id]);
  }

  /**
   * Met la copie de travail et le compte d'accord : la copie la plus récente de chaque personnage gagne. Lève
   * `AccountError` (status 401) si le compte ne reconnaît plus ce navigateur.
   */
  async sync(): Promise<void> {
    const remote = await api<Remote[]>('personnages', { jeton: this.session.jeton });
    this.online = true;
    const known = new Map(remote.map((r) => [r.id, r]));
    const erased = this.erased();
    for (const r of remote) {
      const mine = Math.max(this.local.savedAt(r.id), erased[r.id] ?? 0);
      if (r.sauve <= mine) continue;
      if (r.efface) {
        this.local.remove(r.id);
        continue;
      }
      const slot = await api<{ donnees: unknown; sauve: number }>(`personnages/${r.id}`, { jeton: this.session.jeton });
      this.local.write(r.id, slot.donnees, slot.sauve);
      delete erased[r.id];
    }
    for (const [id, at] of Object.entries(erased)) {
      if ((known.get(id)?.sauve ?? 0) < at) await this.erase(id, at);
      else delete erased[id];
    }
    this.setErased(erased);
    for (const { id, savedAt } of this.local.list()) {
      if (savedAt > (known.get(id)?.sauve ?? 0)) await this.upload(id);
    }
  }

  /** Recopie sur le compte les personnages de ce navigateur d'avant la connexion (ils restent aussi dans le navigateur). */
  adopt(from: LocalSaveStore, max: number): number {
    let added = 0;
    for (const { id, savedAt } of from.list()) {
      if (this.local.list().length >= max) break;
      if (this.local.savedAt(id)) continue;
      this.local.write(id, from.read(id), savedAt);
      void this.upload(id);
      added++;
    }
    return added;
  }

  private async upload(id: string, keepalive = false): Promise<void> {
    this.timers.delete(id);
    const data = this.local.read(id);
    if (data === null) return;
    try {
      await api(`personnages/${id}`, { method: 'PUT', body: { sauve: this.local.savedAt(id), donnees: data as Json }, jeton: this.session.jeton, keepalive });
      this.online = true;
    } catch {
      // Hors ligne ou refusé : la copie de travail est plus récente que le compte, elle repartira à la prochaine synchro.
      this.online = false;
    }
  }

  private async erase(id: string, at: number): Promise<void> {
    try {
      await api(`personnages/${id}`, { method: 'DELETE', body: { sauve: at }, jeton: this.session.jeton });
      const erased = this.erased();
      delete erased[id];
      this.setErased(erased);
    } catch {
      // L'effacement repartira à la prochaine synchro.
    }
  }

  /** La page se ferme : ce qui attendait part tout de suite. */
  private flush(): void {
    for (const id of [...this.timers.keys()]) {
      window.clearTimeout(this.timers.get(id));
      void this.upload(id, true);
    }
  }

  private erased(): Record<string, number> {
    try {
      return JSON.parse(localStorage.getItem(this.erasedKey) ?? '{}') as Record<string, number>;
    } catch {
      return {};
    }
  }

  private setErased(erased: Record<string, number>): void {
    try {
      if (Object.keys(erased).length) localStorage.setItem(this.erasedKey, JSON.stringify(erased));
      else localStorage.removeItem(this.erasedKey);
    } catch {
      // Stockage indisponible.
    }
  }
}

/** Recharge le jeu (le compte a changé) ; `notice` s'affichera au retour. */
export function restartWith(notice?: string): void {
  try {
    if (notice) sessionStorage.setItem(NOTICE_KEY, notice);
  } catch {
    // Tant pis pour le message.
  }
  location.reload();
}

/** Le message laissé par `restartWith`, une seule fois. */
export function takeNotice(): string | null {
  try {
    const notice = sessionStorage.getItem(NOTICE_KEY);
    sessionStorage.removeItem(NOTICE_KEY);
    return notice;
  } catch {
    return null;
  }
}

/**
 * Les sauvegardes à utiliser au démarrage : celles du compte connecté (synchronisées si le serveur répond), sinon
 * celles du navigateur. `warn` : un message pour le joueur quand le compte n'a pas pu être joint.
 */
export async function openSaves(accounts: boolean, warn: (text: string) => void): Promise<{ store: SaveStore; account: AccountSaveStore | null }> {
  const session = accounts ? savedSession() : null;
  if (!session) return { store: new LocalSaveStore(), account: null };
  const account = new AccountSaveStore(session);
  try {
    await account.sync();
  } catch (error) {
    if (error instanceof AccountError && error.status === 401) {
      keepSession(null);
      warn('Ta connexion au compte a expiré : reconnecte-toi depuis l’écran titre.');
      return { store: new LocalSaveStore(), account: null };
    }
    warn('Le serveur du jeu ne répond pas : tu joues sur la copie de tes personnages gardée dans ce navigateur.');
  }
  return { store: account, account };
}
