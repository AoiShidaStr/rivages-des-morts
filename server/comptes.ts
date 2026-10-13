// Les comptes des joueurs et leurs personnages, dans une base SQLite (donnees/rivages.db).
//
// Un compte : un pseudo unique et un mot de passe (haché avec scrypt, jamais gardé en clair). Se connecter donne un
// jeton, que le navigateur garde et renvoie à chaque requête (`Authorization: Bearer …`) ; la base n'en garde que
// l'empreinte. Chaque personnage est rangé tel que le jeu le sauvegarde (le JSON de `ProgressState`), avec l'heure de
// sa dernière écriture : entre deux copies, la plus récente gagne. Un personnage supprimé laisse une trace (sans
// contenu), pour qu'un autre ordinateur resté hors ligne ne le fasse pas revenir.
//
// L'API, sous /api :
//   POST   /api/compte/inscription  { pseudo, motDePasse, code? }  → { pseudo, jeton }
//          (code : le code d'invitation, si le serveur en a un, CODE_INVITATION)
//   POST   /api/compte/connexion    { pseudo, motDePasse }  → { pseudo, jeton }
//   POST   /api/compte/deconnexion                          → { ok }
//   GET    /api/compte                                      → { pseudo }
//   GET    /api/reglages                                    → { invitation, adresse }
//   GET    /api/personnages                                 → [{ id, sauve, efface }]
//   GET    /api/personnages/:id                             → { id, sauve, donnees }
//   PUT    /api/personnages/:id     { sauve, donnees }      → { sauve }
//   DELETE /api/personnages/:id     { sauve }               → { sauve }
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { adressePublique, adresseDe } from './adresse.ts';

/** Autant que le jeu en permet (`MAX_CHARACTERS`, src/game/progress.ts). */
const MAX_PERSONNAGES = 6;
/** Un personnage sauvegardé fait quelques Ko : au-delà, ce n'est pas une sauvegarde du jeu. */
const MAX_CORPS = 512 * 1024;
const PSEUDO = /^[\p{L}\p{N}_-]{3,16}$/u;
const SLOT = /^[a-z0-9]{1,32}$/;
const MOT_DE_PASSE_MIN = 8;
/** Essais de connexion ou d'inscription par adresse, sur `FENETRE` ms. */
const ESSAIS = 10;
/** Sur Internet, seuls ceux qui ont ce code créent un compte (vide : tout le monde). */
const CODE_INVITATION = process.env.CODE_INVITATION?.trim() ?? '';
const FENETRE = 10 * 60_000;

type Ligne = Record<string, unknown>;

export class Comptes {
  /** La base, partagée avec le menu social (social.ts : les amis). */
  readonly db: DatabaseSync;
  private readonly essais = new Map<string, number[]>();

  constructor(dossier: string) {
    mkdirSync(dossier, { recursive: true });
    this.db = new DatabaseSync(path.join(dossier, 'rivages.db'));
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS comptes (
        id INTEGER PRIMARY KEY,
        pseudo TEXT NOT NULL UNIQUE COLLATE NOCASE,
        sel BLOB NOT NULL,
        hache BLOB NOT NULL,
        cree INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS jetons (
        empreinte TEXT PRIMARY KEY,
        compte INTEGER NOT NULL REFERENCES comptes(id) ON DELETE CASCADE,
        cree INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS personnages (
        compte INTEGER NOT NULL REFERENCES comptes(id) ON DELETE CASCADE,
        id TEXT NOT NULL,
        donnees TEXT,
        sauve INTEGER NOT NULL,
        PRIMARY KEY (compte, id)
      );
    `);
  }

  /** Nombre de comptes, pour /sante. */
  get total(): number {
    return Number((this.db.prepare('SELECT COUNT(*) AS n FROM comptes').get() as Ligne).n);
  }

  /** Répond à une requête sous /api ; faux si l'adresse n'est pas la sienne. */
  async handle(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<boolean> {
    if (!pathname.startsWith('/api/')) return false;
    try {
      const reponse = await this.route(req, pathname);
      send(res, reponse.status, reponse.corps);
    } catch (error) {
      if (error instanceof Refus) send(res, error.status, { erreur: error.message });
      else {
        console.error(error);
        send(res, 500, { erreur: 'Le serveur a rencontré un problème.' });
      }
    }
    return true;
  }

  private async route(req: IncomingMessage, pathname: string): Promise<{ status: number; corps: unknown }> {
    const method = req.method ?? 'GET';
    const ok = (corps: unknown) => ({ status: 200, corps });
    if (pathname === '/api/reglages' && method === 'GET') return ok({ invitation: Boolean(CODE_INVITATION), adresse: adressePublique() });
    if (pathname === '/api/compte/inscription' && method === 'POST') return ok(await this.inscription(req));
    if (pathname === '/api/compte/connexion' && method === 'POST') return ok(await this.connexion(req));
    const compte = this.compte(req);
    if (pathname === '/api/compte/deconnexion' && method === 'POST') {
      this.db.prepare('DELETE FROM jetons WHERE empreinte = ?').run(empreinte(jeton(req) ?? ''));
      return ok({ ok: true });
    }
    if (pathname === '/api/compte' && method === 'GET') return ok({ pseudo: compte.pseudo });
    if (pathname === '/api/personnages' && method === 'GET') {
      const lignes = this.db.prepare('SELECT id, sauve, donnees IS NULL AS efface FROM personnages WHERE compte = ?').all(compte.id) as Ligne[];
      return ok(lignes.map((l) => ({ id: l.id, sauve: Number(l.sauve), efface: Boolean(l.efface) })));
    }
    const slot = /^\/api\/personnages\/([^/]+)$/.exec(pathname)?.[1];
    if (!slot) throw new Refus(404, 'Adresse inconnue.');
    if (!SLOT.test(slot)) throw new Refus(400, 'Emplacement invalide.');
    if (method === 'GET') {
      const ligne = this.db.prepare('SELECT sauve, donnees FROM personnages WHERE compte = ? AND id = ?').get(compte.id, slot) as Ligne | undefined;
      if (!ligne || ligne.donnees === null) throw new Refus(404, 'Ce personnage n’existe pas.');
      return ok({ id: slot, sauve: Number(ligne.sauve), donnees: JSON.parse(String(ligne.donnees)) });
    }
    if (method === 'PUT' || method === 'DELETE') {
      const corps = (await lire(req)) as { sauve?: unknown; donnees?: unknown };
      const sauve = typeof corps.sauve === 'number' && Number.isFinite(corps.sauve) ? Math.floor(corps.sauve) : Date.now();
      const donnees = method === 'PUT' ? corps.donnees : null;
      if (method === 'PUT' && (!donnees || typeof donnees !== 'object')) throw new Refus(400, 'Sauvegarde vide.');
      return ok({ sauve: this.ecrire(compte.id, slot, donnees === null ? null : JSON.stringify(donnees), sauve) });
    }
    throw new Refus(405, 'Méthode non prise en charge.');
  }

  /** Écrit un personnage (ou sa trace d'effacement), sauf si la base en a déjà une copie plus récente. */
  private ecrire(compte: number, slot: string, donnees: string | null, sauve: number): number {
    const actuel = this.db.prepare('SELECT sauve FROM personnages WHERE compte = ? AND id = ?').get(compte, slot) as Ligne | undefined;
    if (actuel && Number(actuel.sauve) >= sauve) return Number(actuel.sauve);
    if (!actuel && donnees !== null) {
      const n = Number((this.db.prepare('SELECT COUNT(*) AS n FROM personnages WHERE compte = ? AND donnees IS NOT NULL').get(compte) as Ligne).n);
      if (n >= MAX_PERSONNAGES) throw new Refus(409, `${MAX_PERSONNAGES} personnages au plus par compte.`);
    }
    this.db
      .prepare('INSERT INTO personnages (compte, id, donnees, sauve) VALUES (?, ?, ?, ?) ON CONFLICT (compte, id) DO UPDATE SET donnees = excluded.donnees, sauve = excluded.sauve')
      .run(compte, slot, donnees, sauve);
    return sauve;
  }

  private async inscription(req: IncomingMessage): Promise<{ pseudo: string; jeton: string }> {
    this.limiter(req);
    const corps = await lire(req);
    const { pseudo, motDePasse } = identifiants(corps);
    if (CODE_INVITATION && !memeTexte(String((corps as { code?: unknown } | null)?.code ?? '').trim(), CODE_INVITATION)) {
      throw new Refus(403, 'Code d’invitation incorrect : demande-le à celui qui héberge le jeu.');
    }
    if (!PSEUDO.test(pseudo)) throw new Refus(400, 'Le pseudo fait de 3 à 16 caractères : lettres, chiffres, _ ou -.');
    if (motDePasse.length < MOT_DE_PASSE_MIN) throw new Refus(400, `Le mot de passe fait au moins ${MOT_DE_PASSE_MIN} caractères.`);
    if (this.db.prepare('SELECT 1 FROM comptes WHERE pseudo = ?').get(pseudo)) throw new Refus(409, 'Ce pseudo est déjà pris.');
    const sel = randomBytes(16);
    const hache = await hacher(motDePasse, sel);
    const { lastInsertRowid } = this.db.prepare('INSERT INTO comptes (pseudo, sel, hache, cree) VALUES (?, ?, ?, ?)').run(pseudo, sel, hache, Date.now());
    return { pseudo, jeton: this.ouvrir(Number(lastInsertRowid)) };
  }

  private async connexion(req: IncomingMessage): Promise<{ pseudo: string; jeton: string }> {
    this.limiter(req);
    const { pseudo, motDePasse } = identifiants(await lire(req));
    const ligne = this.db.prepare('SELECT id, pseudo, sel, hache FROM comptes WHERE pseudo = ?').get(pseudo) as Ligne | undefined;
    // Même calcul que le compte existe ou non : la durée de la réponse ne dit pas quels pseudos sont pris.
    const hache = await hacher(motDePasse, ligne ? (ligne.sel as Uint8Array) : randomBytes(16));
    if (!ligne || !timingSafeEqual(hache, ligne.hache as Uint8Array)) throw new Refus(401, 'Pseudo ou mot de passe incorrect.');
    return { pseudo: String(ligne.pseudo), jeton: this.ouvrir(Number(ligne.id)) };
  }

  private ouvrir(compte: number): string {
    const valeur = randomBytes(32).toString('base64url');
    this.db.prepare('INSERT INTO jetons (empreinte, compte, cree) VALUES (?, ?, ?)').run(empreinte(valeur), compte, Date.now());
    return valeur;
  }

  private compte(req: IncomingMessage): { id: number; pseudo: string } {
    const valeur = jeton(req);
    const compte = valeur ? this.parJeton(valeur) : null;
    if (!compte) throw new Refus(401, 'Connecte-toi d’abord.');
    return compte;
  }

  /** Le compte d'un jeton de connexion (le menu social s'identifie ainsi sur le WebSocket). */
  parJeton(valeur: string): { id: number; pseudo: string } | null {
    const ligne = this.db.prepare('SELECT comptes.id, comptes.pseudo FROM jetons JOIN comptes ON comptes.id = jetons.compte WHERE empreinte = ?').get(empreinte(valeur)) as Ligne | undefined;
    return ligne ? { id: Number(ligne.id), pseudo: String(ligne.pseudo) } : null;
  }

  /** Un compte par son pseudo (sans tenir compte des majuscules). */
  parPseudo(pseudo: string): { id: number; pseudo: string } | null {
    const ligne = this.db.prepare('SELECT id, pseudo FROM comptes WHERE pseudo = ?').get(pseudo) as Ligne | undefined;
    return ligne ? { id: Number(ligne.id), pseudo: String(ligne.pseudo) } : null;
  }

  /** Le pseudo d'un compte. */
  pseudo(id: number): string {
    return String((this.db.prepare('SELECT pseudo FROM comptes WHERE id = ?').get(id) as Ligne | undefined)?.pseudo ?? '?');
  }

  /** Freine qui devine les mots de passe : `ESSAIS` tentatives par adresse toutes les dix minutes. */
  private limiter(req: IncomingMessage): void {
    const adresse = adresseDe(req);
    const maintenant = Date.now();
    const recents = (this.essais.get(adresse) ?? []).filter((t) => maintenant - t < FENETRE);
    if (recents.length >= ESSAIS) throw new Refus(429, 'Trop d’essais : réessaie dans quelques minutes.');
    recents.push(maintenant);
    this.essais.set(adresse, recents);
  }
}

/** Compare deux textes sans que la durée trahisse le nombre de caractères justes. */
function memeTexte(a: string, b: string): boolean {
  const [x, y] = [Buffer.from(a), Buffer.from(b)];
  return x.length === y.length && timingSafeEqual(x, y);
}

class Refus extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function send(res: ServerResponse, status: number, corps: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }).end(JSON.stringify(corps));
}

async function lire(req: IncomingMessage): Promise<unknown> {
  let taille = 0;
  const morceaux: Buffer[] = [];
  for await (const morceau of req as AsyncIterable<Buffer>) {
    taille += morceau.length;
    if (taille > MAX_CORPS) throw new Refus(413, 'Sauvegarde trop grosse.');
    morceaux.push(morceau);
  }
  if (!taille) return {};
  try {
    return JSON.parse(Buffer.concat(morceaux).toString('utf8')) as unknown;
  } catch {
    throw new Refus(400, 'Requête illisible.');
  }
}

function identifiants(corps: unknown): { pseudo: string; motDePasse: string } {
  const { pseudo, motDePasse } = (corps ?? {}) as { pseudo?: unknown; motDePasse?: unknown };
  if (typeof pseudo !== 'string' || typeof motDePasse !== 'string' || motDePasse.length > 200) throw new Refus(400, 'Pseudo et mot de passe requis.');
  return { pseudo: pseudo.trim(), motDePasse };
}

function jeton(req: IncomingMessage): string | null {
  const entete = req.headers.authorization ?? '';
  return entete.startsWith('Bearer ') ? entete.slice(7) : null;
}

const empreinte = (valeur: string) => createHash('sha256').update(valeur).digest('hex');

function hacher(motDePasse: string, sel: Uint8Array): Promise<Buffer> {
  return new Promise((ok, ko) => scrypt(motDePasse.normalize('NFC'), sel, 64, (error, cle) => (error ? ko(error) : ok(cle))));
}
