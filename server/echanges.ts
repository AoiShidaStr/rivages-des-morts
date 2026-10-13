// Les échanges entre joueurs, façon Wakfu, sur le WebSocket du menu social (social.ts). Il faut un compte.
//
// - Échange direct : l'un propose, l'autre accepte ; chacun pose son lot (équipement, matériaux, oboles), puis
//   valide. Changer son lot retire les deux validations. Quand les deux ont validé, le serveur annonce l'échange
//   conclu, et chaque jeu retire ce qu'il donne et range ce qu'il reçoit (src/game/trade.ts).
// - Hôtel des ventes : on y met un lot en vente à son prix ; il quitte le personnage et le serveur le garde. Qui
//   l'achète paie le prix ; le vendeur reçoit le prix moins la taxe (TAXE), à encaisser à son retour.
// - Mode marchand : une vente « en boutique » ne paraît pas dans l'hôtel des ventes, seulement dans la boutique du
//   vendeur, que les autres ouvrent depuis le menu social, même quand il n'est pas là. Elle n'est pas taxée.
//
// Le serveur garde les lots en vente et les oboles à encaisser, mais il ne connaît pas le contenu des personnages :
// il croit chaque jeu sur ce qu'il possède. Ça suffit entre amis.
//
// Messages de la page vers le serveur :
//   { t: 'echange', faire: 'proposer' | 'accepter' | 'refuser' | 'annuler' | 'valider', pseudo? }
//   { t: 'echange', faire: 'offre', lot }
//   { t: 'hdv', faire: 'lister' | 'encaisser' }
//   { t: 'hdv', faire: 'boutique', pseudo }
//   { t: 'hdv', faire: 'vendre', lot, prix, boutique? }
//   { t: 'hdv', faire: 'acheter' | 'retirer', id }
// Du serveur vers la page :
//   { t: 'echange', avec, mien: { lot, valide }, sien: { lot, valide } }   (l'échange en cours)
//   { t: 'echange', fini: 'conclu' | 'annule', donne?, recoit? }
//   { t: 'echange', propositions: [pseudo] }
//   { t: 'hdv', ventes, miennes, caisse }   ou   { t: 'hdv', boutique: pseudo, ventes }
//   { t: 'hdv', achat: { id, lot, prix } } · { t: 'hdv', rendu: { id, lot } } · { t: 'hdv', encaisse: n }
import type { DatabaseSync } from 'node:sqlite';

/** Part du prix que garde l'hôtel des ventes (les ventes en boutique n'en paient pas). */
export const TAXE = 0.05;
/** Ventes en cours par joueur, hôtel et boutique compris. */
const MAX_VENTES = 20;
const MAX_PRIX = 10_000_000;
const MAX_LOT = 20;
const ID = /^[\w-]{1,48}$/;

export interface Lot {
  items: { item: string; level: number; gravure?: unknown }[];
  materials: Record<string, number>;
  oboles: number;
}

/** Ce que les échanges demandent au menu social. */
export interface Liens {
  envoyerA(id: number, message: unknown): void;
  enLigne(id: number): boolean;
  pseudo(id: number): string;
  parPseudo(pseudo: string): { id: number; pseudo: string } | null;
  avis(id: number, texte: string): void;
}

interface Echange {
  a: number;
  b: number;
  lots: Map<number, Lot>;
  valides: Set<number>;
}

type Ligne = Record<string, unknown>;

/** Un lot reçu d'une page : on ne garde que ce qui a la forme d'un lot, dans des limites raisonnables. */
export function lireLot(brut: unknown): Lot | null {
  if (!brut || typeof brut !== 'object') return null;
  const { items, materials, oboles } = brut as Record<string, unknown>;
  const entier = (n: unknown, max: number) => (typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= max ? n : null);
  const lot: Lot = { items: [], materials: {}, oboles: entier(oboles ?? 0, MAX_PRIX) ?? -1 };
  if (lot.oboles < 0) return null;
  if (!Array.isArray(items) || items.length > MAX_LOT) return null;
  const vus = new Set<string>();
  for (const i of items) {
    if (!i || typeof i !== 'object') return null;
    const { item, level, gravure } = i as Record<string, unknown>;
    if (typeof item !== 'string' || !ID.test(item) || vus.has(item)) return null;
    const niveau = entier(level, 999);
    if (!niveau) return null;
    if (gravure !== undefined && JSON.stringify(gravure).length > 2048) return null;
    vus.add(item);
    lot.items.push(gravure === undefined ? { item, level: niveau } : { item, level: niveau, gravure });
  }
  if (!materials || typeof materials !== 'object' || Array.isArray(materials)) return null;
  const entrees = Object.entries(materials as Record<string, unknown>);
  if (entrees.length > MAX_LOT) return null;
  for (const [id, n] of entrees) {
    const count = entier(n, 1_000_000);
    if (!ID.test(id) || count === null) return null;
    if (count > 0) lot.materials[id] = count;
  }
  return lot;
}

const vide = (lot: Lot) => !lot.items.length && !Object.keys(lot.materials).length && lot.oboles <= 0;

export class Echanges {
  private readonly db: DatabaseSync;
  private readonly liens: Liens;
  /** L'échange en cours de chaque joueur. */
  private readonly enCours = new Map<number, Echange>();
  /** Propositions d'échange en attente : celui qui est invité, puis ceux qui l'invitent. */
  private readonly propositions = new Map<number, Set<number>>();

  constructor(db: DatabaseSync, liens: Liens) {
    this.db = db;
    this.liens = liens;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ventes (
        id INTEGER PRIMARY KEY AUTOINCREMENT, -- un numéro ne resert pas : un achat vise toujours le bon lot
        vendeur INTEGER NOT NULL REFERENCES comptes(id) ON DELETE CASCADE,
        lot TEXT NOT NULL,
        prix INTEGER NOT NULL,
        boutique INTEGER NOT NULL DEFAULT 0,
        cree INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS caisses (
        compte INTEGER PRIMARY KEY REFERENCES comptes(id) ON DELETE CASCADE,
        oboles INTEGER NOT NULL DEFAULT 0
      );
    `);
  }

  recevoir(moi: { id: number; pseudo: string }, message: Record<string, unknown>): void {
    if (message.t === 'echange') this.echange(moi, String(message.faire), message);
    else if (message.t === 'hdv') this.hdv(moi, String(message.faire), message);
  }

  /** Le joueur n'a plus de page ouverte : son échange en cours s'annule, ses propositions aussi. */
  quitter(id: number): void {
    const echange = this.enCours.get(id);
    if (echange) this.finir(echange, 'annule');
    this.propositions.delete(id);
    for (const [invite, de] of this.propositions) if (de.delete(id)) this.envoyerPropositions(invite);
  }

  /** À la connexion : les propositions en attente, et l'échange en cours (autre onglet). */
  connecter(id: number): void {
    this.envoyerPropositions(id);
    const echange = this.enCours.get(id);
    if (echange) this.envoyerEchange(echange, id);
  }

  // --- Échange direct ---------------------------------------------------------------------

  private echange(moi: { id: number; pseudo: string }, faire: string, message: Record<string, unknown>): void {
    const mien = this.enCours.get(moi.id);
    if (faire === 'offre' || faire === 'valider' || faire === 'annuler') {
      if (!mien) return;
      if (faire === 'annuler') return this.finir(mien, 'annule');
      if (faire === 'offre') {
        const lot = lireLot(message.lot);
        if (!lot) return this.liens.avis(moi.id, 'Ce lot ne peut pas s’échanger.');
        mien.lots.set(moi.id, lot);
        // Un lot qui change : chacun doit revoir l'échange avant de valider.
        mien.valides.clear();
      } else {
        mien.valides.add(moi.id);
        if (mien.valides.size === 2) return this.finir(mien, 'conclu');
      }
      this.envoyerEchange(mien);
      return;
    }
    const pseudo = typeof message.pseudo === 'string' ? message.pseudo.trim() : '';
    const autre = this.liens.parPseudo(pseudo);
    if (!autre || autre.id === moi.id) return this.liens.avis(moi.id, autre ? 'C’est toi !' : `Aucun joueur ne s’appelle « ${pseudo.slice(0, 16)} ».`);
    if (faire === 'proposer') {
      if (!this.liens.enLigne(autre.id)) return this.liens.avis(moi.id, `${autre.pseudo} n’est pas connecté.`);
      if (mien) return this.liens.avis(moi.id, 'Termine d’abord ton échange en cours.');
      let de = this.propositions.get(autre.id);
      if (!de) this.propositions.set(autre.id, (de = new Set()));
      de.add(moi.id);
      this.liens.avis(autre.id, `${moi.pseudo} te propose un échange (menu social).`);
      this.liens.avis(moi.id, `Échange proposé à ${autre.pseudo}.`);
      this.envoyerPropositions(autre.id);
    } else if (faire === 'accepter' || faire === 'refuser') {
      const de = this.propositions.get(moi.id);
      if (!de?.delete(autre.id)) return;
      this.envoyerPropositions(moi.id);
      if (faire === 'refuser') return this.liens.avis(autre.id, `${moi.pseudo} refuse l’échange.`);
      if (mien || this.enCours.has(autre.id)) return this.liens.avis(moi.id, `${autre.pseudo} échange déjà avec quelqu’un.`);
      if (!this.liens.enLigne(autre.id)) return this.liens.avis(moi.id, `${autre.pseudo} n’est plus connecté.`);
      const echange: Echange = { a: autre.id, b: moi.id, lots: new Map([[autre.id, { items: [], materials: {}, oboles: 0 }], [moi.id, { items: [], materials: {}, oboles: 0 }]]), valides: new Set() };
      this.enCours.set(autre.id, echange);
      this.enCours.set(moi.id, echange);
      this.envoyerEchange(echange);
    }
  }

  private envoyerEchange(echange: Echange, seulement?: number): void {
    for (const id of [echange.a, echange.b]) {
      if (seulement !== undefined && id !== seulement) continue;
      const autre = id === echange.a ? echange.b : echange.a;
      this.liens.envoyerA(id, {
        t: 'echange',
        avec: this.liens.pseudo(autre),
        mien: { lot: echange.lots.get(id), valide: echange.valides.has(id) },
        sien: { lot: echange.lots.get(autre), valide: echange.valides.has(autre) },
      });
    }
  }

  private finir(echange: Echange, fin: 'conclu' | 'annule'): void {
    this.enCours.delete(echange.a);
    this.enCours.delete(echange.b);
    for (const id of [echange.a, echange.b]) {
      const autre = id === echange.a ? echange.b : echange.a;
      if (fin === 'conclu') this.liens.envoyerA(id, { t: 'echange', fini: 'conclu', avec: this.liens.pseudo(autre), donne: echange.lots.get(id), recoit: echange.lots.get(autre) });
      else this.liens.envoyerA(id, { t: 'echange', fini: 'annule', avec: this.liens.pseudo(autre) });
    }
  }

  private envoyerPropositions(id: number): void {
    this.liens.envoyerA(id, { t: 'echange', propositions: [...(this.propositions.get(id) ?? [])].map((de) => this.liens.pseudo(de)) });
  }

  // --- Hôtel des ventes et boutiques ---------------------------------------------------------

  private hdv(moi: { id: number; pseudo: string }, faire: string, message: Record<string, unknown>): void {
    if (faire === 'lister') return this.lister(moi.id);
    if (faire === 'boutique') {
      const vendeur = this.liens.parPseudo(typeof message.pseudo === 'string' ? message.pseudo.trim() : '');
      if (!vendeur) return this.liens.avis(moi.id, 'Ce joueur n’existe pas.');
      const ventes = (this.db.prepare('SELECT id, lot, prix FROM ventes WHERE vendeur = ? AND boutique = 1 ORDER BY id DESC').all(vendeur.id) as Ligne[]).map((l) => ({
        id: Number(l.id),
        vendeur: vendeur.pseudo,
        lot: JSON.parse(String(l.lot)),
        prix: Number(l.prix),
      }));
      return this.liens.envoyerA(moi.id, { t: 'hdv', boutique: vendeur.pseudo, ventes });
    }
    if (faire === 'vendre') {
      const lot = lireLot(message.lot);
      const prix = message.prix;
      if (!lot || vide(lot) || lot.oboles > 0) return this.liens.avis(moi.id, 'Ce lot ne peut pas se vendre.');
      if (typeof prix !== 'number' || !Number.isInteger(prix) || prix < 1 || prix > MAX_PRIX) return this.liens.avis(moi.id, 'Prix invalide.');
      const n = Number((this.db.prepare('SELECT COUNT(*) AS n FROM ventes WHERE vendeur = ?').get(moi.id) as Ligne).n);
      if (n >= MAX_VENTES) return this.liens.avis(moi.id, `Tu as déjà ${MAX_VENTES} lots en vente.`);
      const boutique = message.boutique === true;
      const r = this.db.prepare('INSERT INTO ventes (vendeur, lot, prix, boutique, cree) VALUES (?, ?, ?, ?, ?)').run(moi.id, JSON.stringify(lot), prix, boutique ? 1 : 0, Date.now());
      this.liens.envoyerA(moi.id, { t: 'hdv', mis: { id: Number(r.lastInsertRowid), lot } });
      return this.lister(moi.id);
    }
    if (faire === 'acheter' || faire === 'retirer') {
      const id = message.id;
      if (typeof id !== 'number') return;
      const vente = this.db.prepare('SELECT id, vendeur, lot, prix, boutique FROM ventes WHERE id = ?').get(id) as Ligne | undefined;
      if (!vente) {
        this.liens.avis(moi.id, 'Ce lot n’est plus en vente.');
        return this.lister(moi.id);
      }
      const vendeur = Number(vente.vendeur);
      const lot = JSON.parse(String(vente.lot)) as Lot;
      const prix = Number(vente.prix);
      if (faire === 'retirer') {
        if (vendeur !== moi.id) return;
        this.db.prepare('DELETE FROM ventes WHERE id = ?').run(id);
        this.liens.envoyerA(moi.id, { t: 'hdv', rendu: { id, lot } });
        return this.lister(moi.id);
      }
      if (vendeur === moi.id) return this.liens.avis(moi.id, 'C’est ton propre lot : retire-le plutôt.');
      // La vente part d'abord de la base : deux acheteurs en même temps, un seul l'emporte.
      if (!Number(this.db.prepare('DELETE FROM ventes WHERE id = ?').run(id).changes)) return this.lister(moi.id);
      const gain = Number(vente.boutique) ? prix : prix - Math.ceil(prix * TAXE);
      this.db.prepare('INSERT INTO caisses (compte, oboles) VALUES (?, ?) ON CONFLICT (compte) DO UPDATE SET oboles = oboles + excluded.oboles').run(vendeur, gain);
      this.liens.envoyerA(moi.id, { t: 'hdv', achat: { id, lot, prix } });
      this.liens.avis(vendeur, `${moi.pseudo} a acheté ton lot pour ${prix} oboles : ${gain} t’attendent à l’hôtel des ventes.`);
      this.lister(moi.id);
      if (this.liens.enLigne(vendeur)) this.lister(vendeur);
      return;
    }
    if (faire === 'encaisser') {
      const caisse = this.caisse(moi.id);
      if (caisse <= 0) return;
      this.db.prepare('UPDATE caisses SET oboles = 0 WHERE compte = ?').run(moi.id);
      this.liens.envoyerA(moi.id, { t: 'hdv', encaisse: caisse });
      this.lister(moi.id);
    }
  }

  private caisse(id: number): number {
    return Number((this.db.prepare('SELECT oboles FROM caisses WHERE compte = ?').get(id) as Ligne | undefined)?.oboles ?? 0);
  }

  /** L'hôtel des ventes vu par un joueur : les lots des autres (hors boutiques), les siens, et sa caisse. */
  private lister(id: number): void {
    const vente = (l: Ligne) => ({ id: Number(l.id), vendeur: this.liens.pseudo(Number(l.vendeur)), lot: JSON.parse(String(l.lot)), prix: Number(l.prix), boutique: Boolean(l.boutique) });
    const ventes = (this.db.prepare('SELECT id, vendeur, lot, prix, boutique FROM ventes WHERE vendeur != ? AND boutique = 0 ORDER BY id DESC LIMIT 200').all(id) as Ligne[]).map(vente);
    const miennes = (this.db.prepare('SELECT id, vendeur, lot, prix, boutique FROM ventes WHERE vendeur = ? ORDER BY id DESC').all(id) as Ligne[]).map(vente);
    this.liens.envoyerA(id, { t: 'hdv', ventes, miennes, caisse: this.caisse(id), taxe: TAXE });
  }
}
