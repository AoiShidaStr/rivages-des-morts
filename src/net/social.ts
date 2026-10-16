// Le menu social, côté jeu (le serveur : server/social.ts) : amis, groupe, chat. Il passe par la connexion WebSocket
// du jeu à son serveur, et ne sert donc que sur un jeu hébergé, avec un compte.
import type { Lot } from '../game/trade';
import { serverChannel, type Json } from './transport';

export type Canal = 'general' | 'groupe' | 'prive';

export interface Friend {
  pseudo: string;
  enLigne: boolean;
  /** En promenade sur l'île partagée (sinon en donjon, ou sur un écran du jeu). */
  ile: boolean;
}

export interface SocialState {
  moi: string;
  amis: Friend[];
  /** Demandes d'ami reçues, et envoyées (en attente). */
  recues: string[];
  envoyees: string[];
  groupe: { chef: string; membres: Friend[] } | null;
  /** Chefs de groupe qui nous invitent. */
  invitations: string[];
}

export interface ChatLine {
  canal: Canal | 'avis';
  de: string;
  /** Message privé : son destinataire. */
  a?: string;
  texte: string;
  quand: number;
  /** Invitation dans une partie en coop : son code. */
  code?: string;
}

/** L'échange direct en cours : son lot et celui de l'autre, et qui a validé. */
export interface Trade {
  avec: string;
  mien: { lot: Lot; valide: boolean };
  sien: { lot: Lot; valide: boolean };
}

/** Un lot en vente (hôtel des ventes ou boutique). */
export interface Sale {
  id: number;
  vendeur: string;
  lot: Lot;
  prix: number;
  boutique?: boolean;
}

export interface Market {
  ventes: Sale[];
  miennes: Sale[];
  caisse: number;
  taxe: number;
}

/** Une ligne de la stèle des records partagée (server/records.ts). */
export interface ServerRecord {
  pseudo: string;
  heros: string;
  palier: number;
  quand: number;
}

/** Ce que le jeu doit ranger dans le personnage, ou en retirer, quand le serveur le dit. */
export type Goods =
  | { kind: 'echange'; avec: string; donne: Lot; recoit: Lot }
  | { kind: 'mis'; lot: Lot }
  | { kind: 'achat'; lot: Lot; prix: number }
  | { kind: 'rendu'; lot: Lot }
  | { kind: 'encaisse'; oboles: number };

/** Lignes de chat gardées en mémoire. */
const MAX_LINES = 150;

export class SocialClient {
  state: SocialState | null = null;
  readonly lines: ChatLine[] = [];
  connected = false;
  trade: Trade | null = null;
  /** Joueurs qui nous proposent un échange. */
  tradeOffers: string[] = [];
  market: Market | null = null;
  /** La dernière boutique ouverte. */
  shop: { pseudo: string; ventes: Sale[] } | null = null;
  /** Le classement de la stèle partagée, une fois demandé (null avant la réponse du serveur). */
  records: ServerRecord[] | null = null;
  /** Le serveur dit de ranger ou de retirer quelque chose du personnage. */
  onGoods: ((goods: Goods) => void) | null = null;
  /** Un échange vient de commencer : le jeu ouvre sa fenêtre. */
  onTradeStart: (() => void) | null = null;
  /** Quelque chose a changé (état, nouvelle ligne) : l'interface se redessine. */
  onChange: (() => void) | null = null;
  /** Une nouvelle ligne de chat. */
  onLine: ((line: ChatLine) => void) | null = null;
  private readonly channel: { post(message: Json): void; close(): void };
  private readonly listeners = new Set<() => void>();

  constructor(jeton: string) {
    this.channel = serverChannel({
      // À chaque connexion (la première, puis après une coupure), on se présente avec son compte.
      open: () => {
        this.connected = true;
        // Le serveur renvoie l'historique du chat général : on repart de zéro pour ne pas le doubler.
        this.lines.splice(0, this.lines.length, ...this.lines.filter((l) => l.canal !== 'general'));
        this.channel.post({ t: 'auth', jeton });
        this.changed();
      },
      closed: () => {
        this.connected = false;
        this.changed();
      },
      message: (m) => this.receive(m),
    });
  }

  say(canal: Canal, texte: string, a?: string): void {
    this.channel.post(a ? { t: 'chat', canal, texte, a } : { t: 'chat', canal, texte });
  }

  friend(faire: 'demander' | 'accepter' | 'refuser' | 'retirer', pseudo: string): void {
    this.channel.post({ t: 'ami', faire, pseudo });
  }

  group(faire: 'inviter' | 'accepter' | 'refuser' | 'quitter' | 'exclure', pseudo = ''): void {
    this.channel.post({ t: 'groupe', faire, pseudo });
  }

  tradeAction(faire: 'proposer' | 'accepter' | 'refuser' | 'annuler' | 'valider', pseudo = ''): void {
    this.channel.post({ t: 'echange', faire, pseudo });
  }

  offer(lot: Lot): void {
    this.channel.post({ t: 'echange', faire: 'offre', lot: lot as unknown as Json });
  }

  marketAction(faire: 'lister' | 'encaisser'): void {
    this.channel.post({ t: 'hdv', faire });
  }

  openShop(pseudo: string): void {
    this.channel.post({ t: 'hdv', faire: 'boutique', pseudo });
  }

  sell(lot: Lot, prix: number, boutique: boolean): void {
    this.channel.post({ t: 'hdv', faire: 'vendre', lot: lot as unknown as Json, prix, boutique });
  }

  buy(id: number): void {
    this.channel.post({ t: 'hdv', faire: 'acheter', id });
  }

  withdraw(id: number): void {
    this.channel.post({ t: 'hdv', faire: 'retirer', id });
  }

  /** Grave un palier du Yomi sans fond sur la stèle partagée (le serveur garde le meilleur de chaque héros). */
  submitRecord(heros: string, palier: number): void {
    this.channel.post({ t: 'record', heros, palier });
  }

  /** Journal des duels du serveur (server/duels.ts) : l'équipement de duel de ce joueur, au début d'un duel en ligne. */
  reportDuelEquipment(classe: string, voie: string, race: string, arme: string, objets: string[]): void {
    this.channel.post({ t: 'duel', faire: 'equipement', classe, voie, race, arme, objets });
  }

  /** Journal des duels : le résultat d'un duel en ligne, envoyé par son hôte. `gagnant` : la place du vainqueur. */
  reportDuelResult(classes: string[], voies: string[], manches: { duree: number; gagnant: number }[], forfait: number | null): void {
    this.channel.post({ t: 'duel', faire: 'resultat', classes, voies, manches, forfait });
  }

  /** Demande le classement de la stèle partagée ; il arrive dans `records`. */
  requestRecords(): void {
    this.channel.post({ t: 'records' });
  }

  /** Invite son groupe dans sa partie en coop. */
  inviteToGame(code: string): void {
    this.channel.post({ t: 'partie', code });
  }

  close(): void {
    this.channel.close();
  }

  /** Écoute les changements (une fenêtre ouverte) ; renvoie de quoi arrêter d'écouter. */
  listen(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  }

  private receive(m: { t: string } & Record<string, Json>): void {
    if (m.t === 'etat') {
      this.state = m as unknown as SocialState;
      this.changed();
    } else if (m.t === 'chat' && typeof m.texte === 'string' && typeof m.de === 'string') {
      const canal = m.canal === 'groupe' || m.canal === 'prive' ? m.canal : 'general';
      this.push({ canal, de: m.de, a: typeof m.a === 'string' ? m.a : undefined, texte: m.texte, quand: Number(m.quand) || Date.now() });
    } else if (m.t === 'avis' && typeof m.texte === 'string') {
      this.push({ canal: 'avis', de: '', texte: m.texte, quand: Date.now() });
    } else if (m.t === 'echange') {
      this.receiveTrade(m);
    } else if (m.t === 'hdv') {
      this.receiveMarket(m);
    } else if (m.t === 'records' && Array.isArray(m.liste)) {
      this.records = m.liste as unknown as ServerRecord[];
      this.changed();
    } else if (m.t === 'partie' && typeof m.code === 'string' && typeof m.de === 'string') {
      this.push({ canal: 'avis', de: m.de, texte: `${m.de} invite le groupe dans sa partie.`, quand: Date.now(), code: m.code });
    }
  }

  private receiveTrade(m: Record<string, Json>): void {
    if (Array.isArray(m.propositions)) {
      this.tradeOffers = m.propositions.filter((p): p is string => typeof p === 'string');
    } else if (typeof m.fini === 'string') {
      const avec = String(m.avec ?? '');
      this.trade = null;
      if (m.fini === 'conclu' && m.donne && m.recoit) this.onGoods?.({ kind: 'echange', avec, donne: m.donne as unknown as Lot, recoit: m.recoit as unknown as Lot });
      else this.push({ canal: 'avis', de: '', texte: `Échange avec ${avec} annulé.`, quand: Date.now() });
    } else if (typeof m.avec === 'string') {
      const started = !this.trade;
      this.trade = m as unknown as Trade;
      if (started) this.onTradeStart?.();
    }
    this.changed();
  }

  private receiveMarket(m: Record<string, Json>): void {
    if (Array.isArray(m.ventes) && typeof m.boutique === 'string') this.shop = { pseudo: m.boutique, ventes: m.ventes as unknown as Sale[] };
    else if (Array.isArray(m.ventes)) this.market = m as unknown as Market;
    const lot = (key: string) => (m[key] as { lot?: Lot } | undefined)?.lot;
    if (m.mis) this.onGoods?.({ kind: 'mis', lot: lot('mis')! });
    if (m.achat) this.onGoods?.({ kind: 'achat', lot: lot('achat')!, prix: Number((m.achat as { prix?: number }).prix) || 0 });
    if (m.rendu) this.onGoods?.({ kind: 'rendu', lot: lot('rendu')! });
    if (typeof m.encaisse === 'number') this.onGoods?.({ kind: 'encaisse', oboles: m.encaisse });
    this.changed();
  }

  private push(line: ChatLine): void {
    this.lines.push(line);
    if (this.lines.length > MAX_LINES) this.lines.shift();
    this.onLine?.(line);
    this.changed();
  }

  private changed(): void {
    this.onChange?.();
    for (const listener of [...this.listeners]) listener();
  }
}
