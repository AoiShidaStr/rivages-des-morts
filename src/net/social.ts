// Le menu social, côté jeu (le serveur : server/social.ts) : amis, groupe, chat. Il passe par la connexion WebSocket
// du jeu à son serveur, et ne sert donc que sur un jeu hébergé, avec un compte.
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

/** Lignes de chat gardées en mémoire. */
const MAX_LINES = 150;

export class SocialClient {
  state: SocialState | null = null;
  readonly lines: ChatLine[] = [];
  connected = false;
  /** Quelque chose a changé (état, nouvelle ligne) : l'interface se redessine. */
  onChange: (() => void) | null = null;
  /** Une nouvelle ligne de chat. */
  onLine: ((line: ChatLine) => void) | null = null;
  private readonly channel: { post(message: Json): void; close(): void };

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

  /** Invite son groupe dans sa partie en coop. */
  inviteToGame(code: string): void {
    this.channel.post({ t: 'partie', code });
  }

  close(): void {
    this.channel.close();
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
    } else if (m.t === 'partie' && typeof m.code === 'string' && typeof m.de === 'string') {
      this.push({ canal: 'avis', de: m.de, texte: `${m.de} invite le groupe dans sa partie.`, quand: Date.now(), code: m.code });
    }
  }

  private push(line: ChatLine): void {
    this.lines.push(line);
    if (this.lines.length > MAX_LINES) this.lines.shift();
    this.onLine?.(line);
    this.changed();
  }

  private changed(): void {
    this.onChange?.();
  }
}
