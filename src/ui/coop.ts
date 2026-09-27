// Coop en ligne : créer une partie, la rejoindre avec un code ou depuis la liste des parties publiques, puis le
// salon où l'on attend ses amis avant de descendre ensemble.
import { content } from '../content';
import { clampLevel } from '../game/difficulty';
import { heroLabel } from '../game/loadout';
import type { Progress } from '../game/progress';
import { MAX_PLAYERS, type Announce, type Lobby, type Member } from '../net/protocol';
import { CODE_LENGTH, CoopSession, PublicBoard, cleanCode } from '../net/session';
import type { Network } from '../net/transport';
import { h } from './dom';
import type { PanelHost } from './panels';

const PSEUDO_KEY = 'rivages-des-morts:pseudo';
const PSEUDO_MAX = 16;

export interface CoopDeps {
  progress: Progress;
  network: Network;
  /** Qui l'on est : pseudo, héros, niveau et réglages de combat. */
  member(name: string): Member;
  /** Une session vient de s'ouvrir (créée ou rejointe). */
  opened(session: CoopSession): void;
  toast(text: string): void;
}

/** Pseudo retenu dans ce navigateur (le nom du héros par défaut). */
export function pseudo(progress: Progress): string {
  let saved = '';
  try {
    saved = localStorage.getItem(PSEUDO_KEY) ?? '';
  } catch {
    // Stockage indisponible (navigation privée) : on garde le nom du héros.
  }
  return saved.trim() || heroLabel(content.skills, progress.state.hero);
}

function savePseudo(name: string): void {
  try {
    localStorage.setItem(PSEUDO_KEY, name);
  } catch {
    // Pas grave : le pseudo sera redemandé.
  }
}

const className = (cls: string) => content.skills.classes[cls]?.name ?? cls;
const raceName = (race: string) => content.skills.races[race]?.name ?? race;
const dungeonName = (id: string) => content.dungeons[id]?.name ?? id;

/** Donjons que ce héros peut proposer : les Rizières, et le Palais une fois le sceau du Grand Rocher dénoué. */
export function openDungeons(progress: Progress): string[] {
  return Object.keys(content.dungeons).filter((id) => id !== 'palais' || progress.check([{ flag: 'sceau_ouvert' }]));
}

/** Premier écran : pseudo, créer une partie, rejoindre avec un code ou depuis la liste publique. */
export function openCoopMenu(host: PanelHost, deps: CoopDeps): void {
  const name = h('input', { type: 'text', maxlength: String(PSEUDO_MAX), value: pseudo(deps.progress), 'aria-label': 'Pseudo', class: 'coop-input' });
  const code = h('input', { type: 'text', maxlength: String(CODE_LENGTH), placeholder: 'CODE', 'aria-label': 'Code de la partie', class: 'coop-input coop-code-input' });
  const open = h('input', { type: 'checkbox', checked: true });
  const games = h('div', { class: 'coop-games' }, h('p', { class: 'note' }, 'Recherche des parties publiques…'));
  const board = new PublicBoard(deps.network);
  const who = () => {
    const value = name.value.trim().slice(0, PSEUDO_MAX) || pseudo(deps.progress);
    savePseudo(value);
    return value;
  };
  const join = (value: string) => {
    const clean = cleanCode(value);
    if (clean.length !== CODE_LENGTH) {
      deps.toast(`Le code d’une partie a ${CODE_LENGTH} caractères.`);
      return;
    }
    host.close();
    deps.opened(CoopSession.join(deps.network, clean, deps.member(who())));
  };
  code.addEventListener('input', () => (code.value = cleanCode(code.value)));
  code.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') join(code.value);
  });
  const render = (list: Announce[]) => {
    games.replaceChildren(
      ...(list.length
        ? list.map((g) =>
            h(
              'div',
              { class: 'coop-game' },
              h('div', {}, h('strong', {}, g.host), h('small', {}, `${className(g.cls)} niv. ${g.level} · ${dungeonName(g.dungeon)}, niveau ${g.dungeonLevel}`)),
              h('span', { class: 'coop-count' }, `${g.players} / ${MAX_PLAYERS}`),
              h('button', { class: 'btn small', onclick: () => join(g.code) }, 'Rejoindre'),
            ),
          )
        : [h('p', { class: 'note' }, 'Aucune partie publique pour l’instant. Crée la tienne, ou rejoins un ami avec son code.')]),
    );
  };
  board.onChange = render;
  // Laisse le temps aux premières annonces d'arriver avant de dire qu'il n'y a personne.
  window.setTimeout(() => render(board.list()), 4_000);

  host.show(
    'Coop en ligne',
    'Jusqu’à trois joueurs, chacun avec son héros. Le butin de chacun reste le sien.',
    h(
      'div',
      { class: 'list coop' },
      h('label', { class: 'coop-field' }, h('span', {}, 'Ton pseudo'), name),
      h('h3', {}, 'Créer une partie'),
      h('p', { class: 'note' }, 'Tu es l’hôte : le combat tourne sur ton ordinateur. Donne le code à tes amis.'),
      h('label', { class: 'coop-check' }, open, h('span', {}, 'Partie publique : elle apparaît dans la liste des autres joueurs')),
      h(
        'div',
        { class: 'entry-actions' },
        h(
          'button',
          {
            class: 'btn primary',
            onclick: () => {
              host.close();
              const record = deps.progress.dungeon('rizieres');
              deps.opened(CoopSession.host(deps.network, deps.member(who()), { open: open.checked, dungeon: 'rizieres', level: Math.max(1, Math.min(record.unlocked, deps.progress.level)) }));
            },
          },
          'Créer la partie',
        ),
      ),
      h('h3', {}, 'Rejoindre avec un code'),
      h('div', { class: 'coop-join' }, code, h('button', { class: 'btn', onclick: () => join(code.value) }, 'Rejoindre')),
      h('h3', {}, 'Parties publiques'),
      games,
    ),
    { onClose: () => board.close() },
  );
  name.focus();
}

/**
 * Le salon : le code à partager, les joueurs et s'ils sont prêts. L'hôte choisit le donjon et son niveau
 * (parmi ceux qu'il a ouverts) et lance la descente ; les invités se disent prêts.
 */
export function openLobby(
  host: PanelHost,
  session: CoopSession,
  progress: Progress,
  actions: { launch(): void; quit(): void; ready(ready: boolean): void; closed(): void },
): () => void {
  const body = h('div', { class: 'list coop' });
  const copy = () => {
    void navigator.clipboard?.writeText(session.code).catch(() => undefined);
  };
  const render = (lobby: Lobby) => {
    const me = lobby.players.find((p) => p.peer === session.selfId);
    const rows = lobby.players.map((p) =>
      h(
        'div',
        { class: `coop-player${p.peer === session.selfId ? ' me' : ''}` },
        h('div', {}, h('strong', {}, p.name), h('small', {}, `${raceName(p.race)} · ${className(p.cls)} · niv. ${p.level}`)),
        h('span', { class: `coop-status${p.ready ? ' ready' : ''}` }, p.host ? 'Hôte' : p.ready ? 'Prêt' : 'Pas prêt'),
      ),
    );
    for (let i = lobby.players.length; i < MAX_PLAYERS; i++) rows.push(h('div', { class: 'coop-player empty' }, h('small', {}, 'Place libre')));

    const settings: HTMLElement[] = [];
    if (session.isHost) {
      const dungeons = openDungeons(progress);
      const unlocked = clampLevel(content.difficulty, progress.dungeon(lobby.dungeon).unlocked);
      const set = (level: number) => session.choose(lobby.dungeon, Math.max(1, Math.min(unlocked, level)));
      settings.push(
        h(
          'div',
          { class: 'row-pills' },
          ...dungeons.map((id) =>
            h(
              'button',
              { class: `btn small${id === lobby.dungeon ? ' primary' : ''}`, onclick: () => session.choose(id, Math.min(lobby.level, progress.dungeon(id).unlocked)) },
              dungeonName(id),
            ),
          ),
        ),
        h(
          'div',
          { class: 'level-picker' },
          h('button', { class: 'btn small', onclick: () => set(lobby.level - content.difficulty.unlockStep) }, `−${content.difficulty.unlockStep}`),
          h('button', { class: 'btn small', onclick: () => set(lobby.level - 1) }, '−'),
          h('strong', { class: 'level-value' }, `Niveau ${lobby.level}`),
          h('button', { class: 'btn small', onclick: () => set(lobby.level + 1) }, '+'),
          h('button', { class: 'btn small', onclick: () => set(lobby.level + content.difficulty.unlockStep) }, `+${content.difficulty.unlockStep}`),
        ),
        h('p', { class: 'note' }, `Niveaux ouverts pour toi : 1 à ${unlocked}. Chacun garde son butin ; une victoire ouvre les niveaux suivants pour tous.`),
        h(
          'label',
          { class: 'coop-check' },
          h('input', { type: 'checkbox', checked: lobby.open, onchange: (e) => session.setOpen((e.target as HTMLInputElement).checked) }),
          h('span', {}, 'Partie publique'),
        ),
      );
    } else {
      settings.push(h('p', { class: 'note' }, `${dungeonName(lobby.dungeon)}, niveau ${lobby.level} : c’est l’hôte qui choisit.`));
    }

    const waiting = session.isHost && !session.allReady;
    const parts: (HTMLElement | null)[] = [
      h(
        'div',
        { class: 'coop-share' },
        h('small', {}, 'Code de la partie'),
        h('strong', { class: 'coop-code' }, session.code),
        h('button', { class: 'btn small', onclick: copy, title: 'Copier le code' }, 'Copier'),
      ),
      h('div', { class: 'coop-players' }, ...rows),
      ...settings,
      lobby.inGame ? h('p', { class: 'note' }, 'La descente est en cours.') : null,
      h(
        'div',
        { class: 'entry-actions' },
        h('button', { class: 'btn', onclick: () => actions.quit() }, session.isHost ? 'Fermer la partie' : 'Quitter la partie'),
        session.isHost
          ? h(
              'button',
              {
                class: 'btn primary',
                disabled: waiting || lobby.inGame,
                title: waiting ? (lobby.players.length < 2 ? 'Attends qu’un ami rejoigne la partie' : 'Attends que tout le monde soit prêt') : '',
                onclick: () => actions.launch(),
              },
              lobby.players.length < 2 ? 'En attente de joueurs…' : waiting ? 'En attente des joueurs prêts…' : 'Descendre ensemble',
            )
          : h(
              'button',
              { class: `btn${me?.ready ? '' : ' primary'}`, disabled: lobby.inGame, onclick: () => actions.ready(!me?.ready) },
              me?.ready ? 'Pas prêt' : 'Je suis prêt',
            ),
      ),
    ];
    body.replaceChildren(...parts.filter((part): part is HTMLElement => part !== null));
  };

  const subtitle = session.isHost ? 'Tu es l’hôte. Tes amis rejoignent avec le code.' : 'En attente de l’hôte…';
  host.show('Salon coop', subtitle, body, { onClose: () => actions.closed() });
  if (session.lobby.players.length) render(session.lobby);
  else body.replaceChildren(h('p', { class: 'note' }, `Connexion à la partie ${session.code}…`));
  return () => {
    if (host.open) render(session.lobby);
  };
}
