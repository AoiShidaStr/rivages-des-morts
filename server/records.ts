// La stèle des records partagée : le meilleur palier du Yomi sans fond de chaque héros de chaque compte, gardé dans
// la base du serveur. Le jeu l'annonce après chaque bloc gagné ; la stèle du ponton demande le classement.
//
// Messages de la page vers le serveur :
//   { t: 'record', heros, palier }   (un bloc du Yomi sans fond gagné)
//   { t: 'records' }                 (la stèle demande le classement)
// Du serveur vers la page :
//   { t: 'records', liste: [{ pseudo, heros, palier, quand }] }
//
// Le palier vient du jeu du joueur : comme le reste de la progression, il n'est pas vérifié par le serveur.
import type { DatabaseSync } from 'node:sqlite';

/** Lignes du classement envoyées à la stèle. */
const TOP = 20;
const MAX_PALIER = 100_000;
const MAX_HEROS = 48;

export interface RecordLine {
  pseudo: string;
  heros: string;
  palier: number;
  quand: number;
}

export class Records {
  private readonly db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS records (
        compte INTEGER NOT NULL REFERENCES comptes(id) ON DELETE CASCADE,
        heros TEXT NOT NULL,
        palier INTEGER NOT NULL,
        quand INTEGER NOT NULL,
        PRIMARY KEY (compte, heros)
      );
    `);
  }

  /** Retient le palier s'il bat le record de ce héros pour ce compte. Faux si le message n'a pas la bonne forme. */
  soumettre(compte: number, heros: unknown, palier: unknown): boolean {
    if (typeof heros !== 'string' || !heros.trim() || heros.length > MAX_HEROS) return false;
    if (typeof palier !== 'number' || !Number.isInteger(palier) || palier < 1 || palier > MAX_PALIER) return false;
    this.db
      .prepare(
        `INSERT INTO records (compte, heros, palier, quand) VALUES (?, ?, ?, ?)
         ON CONFLICT (compte, heros) DO UPDATE SET palier = excluded.palier, quand = excluded.quand WHERE excluded.palier > records.palier`,
      )
      .run(compte, heros.trim(), palier, Date.now());
    return true;
  }

  /** Les meilleurs paliers du serveur, du plus profond au moins profond. */
  classement(): RecordLine[] {
    const lignes = this.db
      .prepare(
        `SELECT c.pseudo AS pseudo, r.heros AS heros, r.palier AS palier, r.quand AS quand
         FROM records r JOIN comptes c ON c.id = r.compte ORDER BY r.palier DESC, r.quand ASC LIMIT ?`,
      )
      .all(TOP) as unknown as RecordLine[];
    return lignes.map((l) => ({ pseudo: String(l.pseudo), heros: String(l.heros), palier: Number(l.palier), quand: Number(l.quand) }));
  }
}
