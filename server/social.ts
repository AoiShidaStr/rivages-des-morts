// Le menu social, sur le WebSocket du relais : amis, groupes, chat. Il faut un compte (comptes.ts) : la page s'y
// identifie avec son jeton de connexion.
//
// - Amis : une demande, puis l'autre accepte (ou refuse). Gardés dans la base, avec les demandes en attente, même
//   quand l'autre n'est pas connecté.
// - Groupe : jusqu'à trois joueurs (autant qu'une partie en coop). Le chef invite, l'invité accepte. Le groupe ne
//   dure que le temps du serveur, et on y reste en se déconnectant (les autres peuvent exclure un absent).
// - Chat : général (tous les joueurs connectés, avec les derniers messages pour qui arrive), groupe, privé (un joueur
//   connecté). Un joueur du groupe peut y inviter les autres dans sa partie en coop (le code de la partie).
//
// Messages de la page vers le serveur :
//   { t: 'auth', jeton }
//   { t: 'chat', canal: 'general' | 'groupe' | 'prive', texte, a? }
//   { t: 'ami', faire: 'demander' | 'accepter' | 'refuser' | 'retirer', pseudo }
//   { t: 'groupe', faire: 'inviter' | 'accepter' | 'refuser' | 'quitter' | 'exclure', pseudo? }
//   { t: 'partie', code }
// Du serveur vers la page :
//   { t: 'etat', moi, amis: [{ pseudo, enLigne, ile }], recues, envoyees, groupe: { chef, membres } | null, invitations }
//   { t: 'chat', canal, de, a?, texte, quand }
//   { t: 'avis', texte }
//   { t: 'partie', de, code }
import type { DatabaseSync } from 'node:sqlite';
import type { Comptes } from './comptes.ts';

/** Autant de joueurs qu'une partie en coop (MAX_PLAYERS, src/net/session.ts). */
const TAILLE_GROUPE = 3;
const MAX_TEXTE = 200;
/** Messages gardés pour qui se connecte au chat général. */
const HISTORIQUE = 50;
/** Messages de chat par joueur, sur `FENETRE_CHAT` ms. */
const CHAT_MAX = 6;
const FENETRE_CHAT = 10_000;
const CODE = /^[A-Z0-9]{4}$/;

export type Canal = 'general' | 'groupe' | 'prive';

/** Une page connectée au relais. */
export interface Page {
  compte: { id: number; pseudo: string } | null;
  envoyer(message: unknown): void;
  /** La page est sur l'île partagée (dans le salon « ile » du relais). */
  surIle(): boolean;
}

interface Groupe {
  chef: number;
  membres: number[];
}

interface Message {
  t: 'chat';
  canal: Canal;
  de: string;
  a?: string;
  texte: string;
  quand: number;
}

type Ligne = Record<string, unknown>;

export class Social {
  private readonly db: DatabaseSync;
  /** Les pages connectées de chaque compte (un joueur peut avoir deux onglets). */
  private readonly pages = new Map<number, Set<Page>>();
  /** Le groupe de chaque compte qui en a un. */
  private readonly groupes = new Map<number, Groupe>();
  /** Invitations de groupe en attente : l'invité, puis le chef qui l'invite. */
  private readonly invitations = new Map<number, Set<number>>();
  private readonly historique: Message[] = [];
  private readonly bavards = new Map<number, number[]>();

  private readonly comptes: Comptes;

  constructor(comptes: Comptes) {
    this.comptes = comptes;
    this.db = comptes.db;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS amis (
        de INTEGER NOT NULL REFERENCES comptes(id) ON DELETE CASCADE,
        a INTEGER NOT NULL REFERENCES comptes(id) ON DELETE CASCADE,
        accepte INTEGER NOT NULL DEFAULT 0,
        cree INTEGER NOT NULL,
        PRIMARY KEY (de, a)
      );
    `);
  }

  /** Un message de la page qui ne concerne pas un salon. */
  recevoir(page: Page, message: Record<string, unknown>): void {
    if (message.t === 'auth') {
      this.identifier(page, message.jeton);
      return;
    }
    const moi = page.compte;
    if (!moi) {
      if (['chat', 'ami', 'groupe', 'partie'].includes(String(message.t))) page.envoyer({ t: 'avis', texte: 'Connecte-toi à un compte pour discuter et ajouter des amis.' });
      return;
    }
    const pseudo = typeof message.pseudo === 'string' ? message.pseudo.trim() : '';
    if (message.t === 'chat') this.chat(page, moi, message.canal, message.texte, message.a);
    else if (message.t === 'ami') this.ami(page, moi, String(message.faire), pseudo);
    else if (message.t === 'groupe') this.groupe(page, moi, String(message.faire), pseudo);
    else if (message.t === 'partie') this.partie(page, moi, message.code);
  }

  /** La page part (onglet fermé, coupure). */
  quitter(page: Page): void {
    const moi = page.compte;
    if (!moi) return;
    const miennes = this.pages.get(moi.id);
    miennes?.delete(page);
    if (miennes && !miennes.size) {
      this.pages.delete(moi.id);
      this.prevenir(moi.id);
    }
  }

  /** La page entre sur l'île ou en sort : ses amis et son groupe le voient. */
  bouger(page: Page): void {
    if (page.compte) this.prevenir(page.compte.id);
  }

  get connectes(): number {
    return this.pages.size;
  }

  // --- Compte -------------------------------------------------------------------------

  private identifier(page: Page, jeton: unknown): void {
    const compte = typeof jeton === 'string' ? this.comptes.parJeton(jeton) : null;
    if (!compte) {
      page.envoyer({ t: 'avis', texte: 'Ta connexion au compte a expiré : reconnecte-toi depuis l’écran titre.' });
      return;
    }
    if (page.compte?.id === compte.id) return;
    this.quitter(page);
    page.compte = compte;
    let miennes = this.pages.get(compte.id);
    if (!miennes) this.pages.set(compte.id, (miennes = new Set()));
    miennes.add(page);
    for (const message of this.historique) page.envoyer(message);
    this.prevenir(compte.id);
  }

  private enLigne(id: number): boolean {
    return this.pages.has(id);
  }

  private surIle(id: number): boolean {
    return [...(this.pages.get(id) ?? [])].some((p) => p.surIle());
  }

  private envoyerA(id: number, message: unknown): void {
    for (const page of this.pages.get(id) ?? []) page.envoyer(message);
  }

  /** Renvoie son état à un joueur, et à ceux qui le voient (amis, groupe, invitations). */
  private prevenir(id: number): void {
    const proches = new Set<number>([id, ...this.amisDe(id), ...this.demandes(id).recues, ...(this.groupes.get(id)?.membres ?? [])]);
    for (const [invite, chefs] of this.invitations) if (chefs.has(id) || invite === id) proches.add(invite);
    for (const proche of proches) this.envoyerEtat(proche);
  }

  private envoyerEtat(id: number): void {
    if (!this.enLigne(id)) return;
    const qui = (autre: number) => ({ pseudo: this.comptes.pseudo(autre), enLigne: this.enLigne(autre), ile: this.surIle(autre) });
    const { recues, envoyees } = this.demandes(id);
    const groupe = this.groupes.get(id);
    this.envoyerA(id, {
      t: 'etat',
      moi: this.comptes.pseudo(id),
      amis: this.amisDe(id).map(qui),
      recues: recues.map((a) => this.comptes.pseudo(a)),
      envoyees: envoyees.map((a) => this.comptes.pseudo(a)),
      groupe: groupe ? { chef: this.comptes.pseudo(groupe.chef), membres: groupe.membres.map(qui) } : null,
      invitations: [...(this.invitations.get(id) ?? [])].map((chef) => this.comptes.pseudo(chef)),
    });
  }

  // --- Amis -----------------------------------------------------------------------------

  private amisDe(id: number): number[] {
    return (this.db.prepare('SELECT a FROM amis WHERE de = ? AND accepte = 1').all(id) as Ligne[]).map((l) => Number(l.a));
  }

  private demandes(id: number): { recues: number[]; envoyees: number[] } {
    const recues = (this.db.prepare('SELECT de FROM amis WHERE a = ? AND accepte = 0').all(id) as Ligne[]).map((l) => Number(l.de));
    const envoyees = (this.db.prepare('SELECT a FROM amis WHERE de = ? AND accepte = 0').all(id) as Ligne[]).map((l) => Number(l.a));
    return { recues, envoyees };
  }

  private ami(page: Page, moi: { id: number; pseudo: string }, faire: string, pseudo: string): void {
    const autre = this.comptes.parPseudo(pseudo);
    if (!autre || autre.id === moi.id) {
      page.envoyer({ t: 'avis', texte: autre ? 'C’est toi !' : `Aucun joueur ne s’appelle « ${pseudo.slice(0, 16)} ».` });
      return;
    }
    const lien = (de: number, a: number) => this.db.prepare('SELECT accepte FROM amis WHERE de = ? AND a = ?').get(de, a) as Ligne | undefined;
    const effacer = () => this.db.prepare('DELETE FROM amis WHERE (de = ? AND a = ?) OR (de = ? AND a = ?)').run(moi.id, autre.id, autre.id, moi.id);
    if (faire === 'demander') {
      if (lien(moi.id, autre.id)) return;
      // Il nous l'avait déjà demandé : c'est accepté des deux côtés.
      if (lien(autre.id, moi.id)) {
        this.accepter(moi.id, autre.id);
      } else {
        this.db.prepare('INSERT INTO amis (de, a, accepte, cree) VALUES (?, ?, 0, ?)').run(moi.id, autre.id, Date.now());
        this.envoyerA(autre.id, { t: 'avis', texte: `${moi.pseudo} veut devenir ton ami (menu social).` });
      }
    } else if (faire === 'accepter') {
      if (!lien(autre.id, moi.id)) return;
      this.accepter(moi.id, autre.id);
      this.envoyerA(autre.id, { t: 'avis', texte: `${moi.pseudo} a accepté ta demande d’ami.` });
    } else if (faire === 'refuser' || faire === 'retirer') {
      effacer();
    } else {
      return;
    }
    this.prevenir(moi.id);
    this.prevenir(autre.id);
  }

  private accepter(moi: number, autre: number): void {
    const maintenant = Date.now();
    const ecrire = this.db.prepare('INSERT INTO amis (de, a, accepte, cree) VALUES (?, ?, 1, ?) ON CONFLICT (de, a) DO UPDATE SET accepte = 1');
    ecrire.run(moi, autre, maintenant);
    ecrire.run(autre, moi, maintenant);
  }

  // --- Groupe -----------------------------------------------------------------------------

  private groupe(page: Page, moi: { id: number; pseudo: string }, faire: string, pseudo: string): void {
    const mien = this.groupes.get(moi.id);
    if (faire === 'quitter') {
      if (mien) this.retirer(mien, moi.id);
      return;
    }
    const autre = this.comptes.parPseudo(pseudo);
    if (!autre || autre.id === moi.id) {
      page.envoyer({ t: 'avis', texte: autre ? 'C’est toi !' : `Aucun joueur ne s’appelle « ${pseudo.slice(0, 16)} ».` });
      return;
    }
    if (faire === 'inviter') {
      if (mien && mien.chef !== moi.id) return void page.envoyer({ t: 'avis', texte: 'Seul le chef du groupe peut inviter.' });
      if (mien && mien.membres.length >= TAILLE_GROUPE) return void page.envoyer({ t: 'avis', texte: `Un groupe compte au plus ${TAILLE_GROUPE} joueurs.` });
      if (this.groupes.has(autre.id)) return void page.envoyer({ t: 'avis', texte: `${autre.pseudo} est déjà dans un groupe.` });
      if (!this.enLigne(autre.id)) return void page.envoyer({ t: 'avis', texte: `${autre.pseudo} n’est pas connecté.` });
      let chefs = this.invitations.get(autre.id);
      if (!chefs) this.invitations.set(autre.id, (chefs = new Set()));
      chefs.add(moi.id);
      this.envoyerA(autre.id, { t: 'avis', texte: `${moi.pseudo} t’invite dans son groupe (menu social).` });
      page.envoyer({ t: 'avis', texte: `Invitation envoyée à ${autre.pseudo}.` });
      this.prevenir(autre.id);
    } else if (faire === 'accepter' || faire === 'refuser') {
      const chefs = this.invitations.get(moi.id);
      if (!chefs?.delete(autre.id)) return;
      if (!chefs.size) this.invitations.delete(moi.id);
      if (faire === 'accepter') {
        if (mien) this.retirer(mien, moi.id);
        let groupe = this.groupes.get(autre.id);
        if (!groupe) {
          groupe = { chef: autre.id, membres: [autre.id] };
          this.groupes.set(autre.id, groupe);
        }
        if (groupe.chef !== autre.id || groupe.membres.length >= TAILLE_GROUPE) {
          page.envoyer({ t: 'avis', texte: 'Ce groupe est déjà complet.' });
        } else {
          groupe.membres.push(moi.id);
          this.groupes.set(moi.id, groupe);
          this.direGroupe(groupe, `${moi.pseudo} rejoint le groupe.`);
        }
      }
      this.prevenir(moi.id);
      this.prevenir(autre.id);
    } else if (faire === 'exclure') {
      if (!mien || mien.chef !== moi.id || !mien.membres.includes(autre.id)) return;
      this.retirer(mien, autre.id);
      this.envoyerA(autre.id, { t: 'avis', texte: `${moi.pseudo} t’a retiré du groupe.` });
    }
  }

  /** Retire un joueur de son groupe ; le suivant devient chef, et un groupe d'un seul joueur se dissout. */
  private retirer(groupe: Groupe, id: number): void {
    groupe.membres = groupe.membres.filter((m) => m !== id);
    this.groupes.delete(id);
    // Le chef s'en va : un membre connecté prend sa place (à défaut, le suivant).
    if (groupe.chef === id && groupe.membres.length) groupe.chef = groupe.membres.find((m) => this.enLigne(m)) ?? groupe.membres[0];
    this.direGroupe(groupe, `${this.comptes.pseudo(id)} quitte le groupe.`);
    if (groupe.membres.length <= 1) {
      for (const m of groupe.membres) this.groupes.delete(m);
      groupe.membres = [];
    }
    this.prevenir(id);
    for (const m of [...groupe.membres, groupe.chef]) this.prevenir(m);
  }

  private direGroupe(groupe: Groupe, texte: string): void {
    for (const m of groupe.membres) this.envoyerA(m, { t: 'avis', texte });
  }

  /** Un joueur du groupe y invite les autres dans sa partie en coop. */
  private partie(page: Page, moi: { id: number; pseudo: string }, code: unknown): void {
    const groupe = this.groupes.get(moi.id);
    if (!groupe) return void page.envoyer({ t: 'avis', texte: 'Tu n’es pas dans un groupe.' });
    if (typeof code !== 'string' || !CODE.test(code)) return;
    for (const m of groupe.membres) if (m !== moi.id) this.envoyerA(m, { t: 'partie', de: moi.pseudo, code });
    page.envoyer({ t: 'avis', texte: 'Ton groupe est invité dans ta partie.' });
  }

  // --- Chat --------------------------------------------------------------------------------

  private chat(page: Page, moi: { id: number; pseudo: string }, canal: unknown, brut: unknown, a: unknown): void {
    if (canal !== 'general' && canal !== 'groupe' && canal !== 'prive') return;
    // Sans caractères de contrôle, et sans espaces en trop.
    const texte = typeof brut === 'string' ? brut.replace(/[\p{Cc}\p{Cf}]/gu, '').replace(/\s+/g, ' ').trim().slice(0, MAX_TEXTE) : '';
    if (!texte) return;
    const maintenant = Date.now();
    const recents = (this.bavards.get(moi.id) ?? []).filter((t) => maintenant - t < FENETRE_CHAT);
    if (recents.length >= CHAT_MAX) return void page.envoyer({ t: 'avis', texte: 'Doucement : attends un peu avant d’écrire à nouveau.' });
    recents.push(maintenant);
    this.bavards.set(moi.id, recents);
    const message: Message = { t: 'chat', canal, de: moi.pseudo, texte, quand: maintenant };
    if (canal === 'general') {
      this.historique.push(message);
      if (this.historique.length > HISTORIQUE) this.historique.shift();
      for (const id of this.pages.keys()) this.envoyerA(id, message);
    } else if (canal === 'groupe') {
      const groupe = this.groupes.get(moi.id);
      if (!groupe) return void page.envoyer({ t: 'avis', texte: 'Tu n’es pas dans un groupe.' });
      for (const m of groupe.membres) this.envoyerA(m, message);
    } else {
      const autre = typeof a === 'string' ? this.comptes.parPseudo(a.trim()) : null;
      if (!autre) return void page.envoyer({ t: 'avis', texte: `Aucun joueur ne s’appelle « ${String(a ?? '').slice(0, 16)} ».` });
      if (!this.enLigne(autre.id)) return void page.envoyer({ t: 'avis', texte: `${autre.pseudo} n’est pas connecté.` });
      message.a = autre.pseudo;
      this.envoyerA(autre.id, message);
      if (autre.id !== moi.id) this.envoyerA(moi.id, message);
    }
  }
}
