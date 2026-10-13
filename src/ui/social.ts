// Le chat et le menu social (amis, groupe, invitations), sur un jeu hébergé avec un compte (src/net/social.ts).
//
// Le chat reste en bas à gauche sur l'île et en donjon : Entrée pour écrire, Échap pour refermer. Il écrit sur
// l'onglet choisi (Général, Groupe, Privé). Raccourcis : « /m pseudo texte » (privé), « /g texte » (groupe),
// « /r texte » (répondre au dernier message privé). Un clic sur un nom prépare un message privé.
import type { Canal, ChatLine, SocialClient } from '../net/social';
import { keyName } from '../keys';
import { h } from './dom';
import type { PanelHost } from './panels';

type Tab = 'tout' | Canal;

const TABS: [Tab, string][] = [
  ['tout', 'Tout'],
  ['general', 'Général'],
  ['groupe', 'Groupe'],
  ['prive', 'Privé'],
];

/** Lignes affichées dans le chat (les plus récentes). */
const SHOWN = 40;

export interface ChatDeps {
  /** Rejoindre la partie en coop d'un joueur du groupe. */
  joinGame(code: string): void;
  /** Ouvrir le menu social. */
  openSocial(): void;
}

export class ChatBox {
  private readonly root: HTMLDivElement;
  private readonly list: HTMLDivElement;
  private readonly input: HTMLInputElement;
  private readonly tabs = new Map<Tab, HTMLButtonElement>();
  private tab: Tab = 'tout';
  /** Le dernier joueur avec qui l'on a échangé un message privé (pour « /r » et l'onglet Privé). */
  private lastPrivate = '';
  private shown = false;

  constructor(
    parent: HTMLElement,
    private readonly social: SocialClient,
    private readonly deps: ChatDeps,
  ) {
    this.list = h('div', { class: 'chat-lines', 'data-scroll': 'chat' });
    this.input = h('input', { type: 'text', maxlength: '200', class: 'chat-input', 'aria-label': 'Message', placeholder: 'Écrire… (Entrée pour envoyer, Échap pour fermer)' });
    const header = h(
      'div',
      { class: 'chat-tabs' },
      ...TABS.map(([tab, label]) => {
        const button = h('button', { class: 'chat-tab', onclick: () => this.select(tab) }, label);
        this.tabs.set(tab, button);
        return button;
      }),
      h('button', { class: 'chat-tab social', title: `Menu social (${keyName('O')})`, onclick: () => deps.openSocial() }, `Social (${keyName('O')})`),
    );
    this.root = h('div', { class: 'chat' }, header, this.list, this.input);
    parent.append(this.root);
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.send(this.input.value);
        this.input.value = '';
        this.input.blur();
      } else if (e.key === 'Escape') {
        this.input.value = '';
        this.input.blur();
      }
      e.stopPropagation();
    });
    social.onChange = () => this.render();
    social.onLine = (line) => {
      if (line.canal === 'prive') this.lastPrivate = line.de === social.state?.moi ? (line.a ?? '') : line.de;
    };
    this.select('tout');
  }

  /** Le chat se montre sur l'île et en donjon. */
  show(visible: boolean): void {
    this.shown = visible;
    this.root.classList.toggle('visible', visible);
    if (!visible) this.input.blur();
  }

  /** Entrée : on écrit. */
  focus(prefill = ''): void {
    if (!this.shown) return;
    if (prefill) this.input.value = prefill;
    this.input.focus();
  }

  private select(tab: Tab): void {
    this.tab = tab;
    for (const [key, button] of this.tabs) button.classList.toggle('active', key === tab);
    this.render();
  }

  private send(raw: string): void {
    const text = raw.trim();
    if (!text) return;
    const command = /^\/(\w+)\s*(.*)$/s.exec(text);
    if (command) {
      const [, name, rest] = command;
      if (name === 'm' || name === 'w') {
        const [, to, body] = /^(\S+)\s+(.+)$/s.exec(rest) ?? [];
        if (to && body) this.social.say('prive', body, to);
        else this.note('Pour un message privé : /m pseudo message');
      } else if (name === 'g') {
        if (rest) this.social.say('groupe', rest);
      } else if (name === 'r') {
        if (this.lastPrivate && rest) this.social.say('prive', rest, this.lastPrivate);
        else this.note('Personne à qui répondre pour l’instant.');
      } else {
        this.note('Commandes : /m pseudo message (privé), /g message (groupe), /r message (répondre).');
      }
      return;
    }
    if (this.tab === 'prive') {
      if (this.lastPrivate) this.social.say('prive', text, this.lastPrivate);
      else this.note('Pour un message privé : /m pseudo message, ou clique sur un nom.');
    } else {
      this.social.say(this.tab === 'groupe' ? 'groupe' : 'general', text);
    }
  }

  private note(texte: string): void {
    this.social.lines.push({ canal: 'avis', de: '', texte, quand: Date.now() });
    this.render();
  }

  private render(): void {
    const moi = this.social.state?.moi ?? '';
    const lines = this.social.lines.filter((l) => this.tab === 'tout' || l.canal === this.tab || l.canal === 'avis').slice(-SHOWN);
    const atBottom = this.list.scrollHeight - this.list.scrollTop - this.list.clientHeight < 24;
    this.list.replaceChildren(
      ...(this.social.connected ? [] : [h('div', { class: 'chat-line avis' }, 'Connexion au serveur…')]),
      ...lines.map((line) => this.line(line, moi)),
    );
    if (atBottom) this.list.scrollTop = this.list.scrollHeight;
    const group = Boolean(this.social.state?.groupe);
    this.tabs.get('groupe')?.classList.toggle('dim', !group);
  }

  private line(line: ChatLine, moi: string): HTMLElement {
    if (line.canal === 'avis') {
      return h(
        'div',
        { class: 'chat-line avis' },
        line.texte,
        line.code ? h('button', { class: 'btn small', onclick: () => this.deps.joinGame(line.code!) }, 'Rejoindre') : null,
      );
    }
    const name = (pseudo: string) =>
      pseudo === moi ? h('span', { class: 'chat-name' }, pseudo) : h('button', { class: 'chat-name', title: 'Message privé', onclick: () => this.focus(`/m ${pseudo} `) }, pseudo);
    const who =
      line.canal === 'prive'
        ? line.de === moi
          ? [h('span', { class: 'chat-name' }, `À ${line.a ?? ''}`)]
          : [h('span', {}, 'De '), name(line.de)]
        : [line.canal === 'groupe' ? h('span', { class: 'chat-tag' }, '[Groupe] ') : null, name(line.de)];
    return h('div', { class: `chat-line ${line.canal}` }, ...who, ' : ', line.texte);
  }
}

export interface SocialDeps {
  social: SocialClient | null;
  /** Les autres joueurs présents sur l'île partagée (leur pseudo). */
  visitors(): string[];
  /** Le code de sa partie en coop, s'il y en a une. */
  gameCode(): string | null;
  /** Prépare un message privé dans le chat. */
  whisper(pseudo: string): void;
  /** Ouvre la boutique d'un joueur. */
  shop(pseudo: string): void;
  /** Ouvre l'hôtel des ventes. */
  market(): void;
}

/** Le menu social : groupe, amis, joueurs de l'île. Il se redessine quand le serveur annonce un changement. */
export function openSocial(host: PanelHost, deps: SocialDeps): void {
  const { social } = deps;
  if (!social) {
    host.show(
      'Social',
      'Amis, groupe et chat',
      h('div', { class: 'list coop' }, h('p', { class: 'note' }, 'Le menu social demande un compte : connecte-toi depuis l’écran titre.')),
    );
    return;
  }
  const pseudo = h('input', { type: 'text', maxlength: '16', class: 'coop-input', 'aria-label': 'Pseudo', placeholder: 'Pseudo' });
  const add = () => {
    const name = pseudo.value.trim();
    if (!name) return;
    social.friend('demander', name);
    pseudo.value = '';
  };
  pseudo.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') add();
  });
  livePanel(host, social, () => {
    const state = social.state;
    const moi = state?.moi ?? '';
    const friends = new Set(state?.amis.map((f) => f.pseudo.toLowerCase()));
    const pending = new Set([...(state?.envoyees ?? []), ...(state?.recues ?? [])].map((p) => p.toLowerCase()));
    const groupe = state?.groupe ?? null;
    const lead = groupe?.chef === moi;
    const inGroup = new Set(groupe?.membres.map((m) => m.pseudo.toLowerCase()));
    const canInvite = (p: string) => (!groupe || (lead && groupe.membres.length < 3)) && !inGroup.has(p.toLowerCase());
    const status = (f: { enLigne: boolean; ile: boolean }) => h('small', { class: f.enLigne ? 'online' : 'offline' }, f.enLigne ? (f.ile ? 'Sur l’île' : 'Connecté') : 'Hors ligne');
    const row = (label: Node, ...actions: (HTMLElement | null | false)[]) => h('div', { class: 'social-row' }, label, h('div', { class: 'social-actions' }, ...actions));
    const button = (text: string, onclick: () => void, primary = false) => h('button', { class: `btn small${primary ? ' primary' : ''}`, onclick }, text);
    const trade = (p: string) => !social.trade && button('Échanger', () => social.tradeAction('proposer', p));
    const code = deps.gameCode();
    const visitors = deps.visitors().filter((v) => v.toLowerCase() !== moi.toLowerCase());

    const body = h(
      'div',
      { class: 'list coop social' },
      social.connected ? null : h('p', { class: 'note danger' }, 'Connexion au serveur…'),
      h('div', { class: 'entry-actions' }, button('Hôtel des ventes', () => deps.market(), true)),
      ...(social.tradeOffers.length
        ? [
            h('h3', {}, 'Propositions d’échange'),
            ...social.tradeOffers.map((p) =>
              row(h('div', {}, h('strong', {}, p), h('small', {}, ' te propose un échange')), button('Accepter', () => social.tradeAction('accepter', p), true), button('Refuser', () => social.tradeAction('refuser', p))),
            ),
          ]
        : []),
      h('h3', {}, 'Groupe'),
      ...(state?.invitations ?? []).map((chef) =>
        row(h('div', {}, h('strong', {}, chef), h('small', {}, ' t’invite dans son groupe')), button('Accepter', () => social.group('accepter', chef), true), button('Refuser', () => social.group('refuser', chef))),
      ),
      ...(groupe
        ? [
            ...groupe.membres.map((m) =>
              row(
                h('div', {}, h('strong', {}, m.pseudo), m.pseudo === groupe.chef ? h('small', {}, ' · chef ') : ' ', status(m)),
                m.pseudo !== moi && button('Message', () => deps.whisper(m.pseudo)),
                m.pseudo !== moi && m.enLigne && trade(m.pseudo),
                lead && m.pseudo !== moi && button('Exclure', () => social.group('exclure', m.pseudo)),
              ),
            ),
            h(
              'div',
              { class: 'entry-actions' },
              code ? button('Inviter le groupe dans ma partie', () => social.inviteToGame(code), true) : null,
              button('Quitter le groupe', () => social.group('quitter')),
            ),
            code ? null : h('p', { class: 'note' }, 'Pour descendre ensemble : crée une partie en coop, puis invite le groupe d’ici.'),
          ]
        : [h('p', { class: 'note' }, 'Invite jusqu’à deux joueurs, parmi tes amis ou les joueurs de l’île, pour descendre ensemble.')]),
      h('h3', {}, 'Amis'),
      h('div', { class: 'coop-join' }, pseudo, h('button', { class: 'btn', onclick: add }, 'Demander en ami')),
      ...(state?.recues ?? []).map((p) =>
        row(h('div', {}, h('strong', {}, p), h('small', {}, ' veut devenir ton ami')), button('Accepter', () => social.friend('accepter', p), true), button('Refuser', () => social.friend('refuser', p))),
      ),
      ...(state?.amis ?? []).map((f) =>
        row(
          h('div', {}, h('strong', {}, f.pseudo), ' ', status(f)),
          f.enLigne && button('Message', () => deps.whisper(f.pseudo)),
          f.enLigne && trade(f.pseudo),
          button('Boutique', () => deps.shop(f.pseudo)),
          f.enLigne && canInvite(f.pseudo) && button('Inviter', () => social.group('inviter', f.pseudo)),
          button('Retirer', () => social.friend('retirer', f.pseudo)),
        ),
      ),
      ...(state?.envoyees ?? []).map((p) => row(h('div', {}, h('strong', {}, p), h('small', {}, ' · demande envoyée')), button('Annuler', () => social.friend('retirer', p)))),
      state && !state.amis.length && !state.recues.length && !state.envoyees.length ? h('p', { class: 'note' }, 'Pas encore d’amis : ajoute-les avec leur pseudo de compte.') : null,
      h('h3', {}, 'Sur l’île'),
      ...(visitors.length
        ? visitors.map((v) =>
            row(
              h('strong', {}, v),
              button('Message', () => deps.whisper(v)),
              trade(v),
              button('Boutique', () => deps.shop(v)),
              !friends.has(v.toLowerCase()) && !pending.has(v.toLowerCase()) && button('Ajouter en ami', () => social.friend('demander', v)),
              canInvite(v) && button('Inviter', () => social.group('inviter', v)),
            ),
          )
        : [h('p', { class: 'note' }, 'Personne d’autre sur l’île pour l’instant.')]),
    );
    return { title: 'Social', subtitle: `Connecté : ${moi || '…'}`, body };
  });
}

/**
 * Une fenêtre qui se redessine à chaque nouvelle du serveur, tant qu'elle est affichée (une autre fenêtre qui prend
 * sa place l'arrête).
 */
export function livePanel(
  host: PanelHost,
  social: SocialClient,
  build: () => { title: string; subtitle: string; body: HTMLElement; wide?: boolean },
  onClose?: () => void,
): void {
  let shown: HTMLElement | null = null;
  const render = () => {
    if (shown && !host.root.contains(shown)) {
      stop();
      return;
    }
    // On n'efface pas un champ en cours de saisie : la fenêtre se redessine quand on le quitte.
    const typing = document.activeElement;
    if (shown && typing instanceof HTMLInputElement && typing.type !== 'checkbox' && shown.contains(typing)) {
      typing.addEventListener('blur', () => setTimeout(render), { once: true });
      return;
    }
    const { title, subtitle, body, wide } = build();
    shown = body;
    host.show(title, subtitle, body, {
      wide,
      onClose: () => {
        stop();
        onClose?.();
      },
    });
  };
  const stop = social.listen(render);
  render();
}
