import { h, icon, obole } from './dom';

const FADE_MS = 450;
const HOLD_MS = 700;
const TOAST_MS = 3200;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface MenuOption {
  label: string;
  action: () => void;
  primary?: boolean;
}

/** Écran titre, menu pause, transitions, notifications et interface de l'île. */
export class Screens {
  private readonly title: HTMLDivElement;
  private readonly pause: HTMLDivElement;
  private readonly result: HTMLDivElement;
  private readonly fade: HTMLDivElement;
  private readonly fadeTitle: HTMLDivElement;
  private readonly fadeSub: HTMLDivElement;
  private readonly toasts: HTMLDivElement;
  private readonly islandHud: HTMLDivElement;
  private readonly area: HTMLDivElement;
  private readonly purse: HTMLDivElement;
  private readonly level: HTMLDivElement;
  private readonly tracker: HTMLDivElement;
  private readonly prompt: HTMLDivElement;
  private readonly areaToast: HTMLDivElement;
  private areaTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(parent: HTMLElement) {
    this.title = h('div', { class: 'screen title-screen' });
    this.pause = h('div', { class: 'screen pause-screen' });
    this.result = h('div', { class: 'screen result-screen' });
    this.fadeTitle = h('div', { class: 'fade-title' });
    this.fadeSub = h('div', { class: 'fade-sub' });
    this.fade = h('div', { class: 'fade' }, this.fadeSub, this.fadeTitle);
    this.toasts = h('div', { class: 'toasts' });
    this.area = h('div', { class: 'area-name' });
    this.purse = h('div', { class: 'purse' });
    this.level = h('div', { class: 'level' });
    this.tracker = h('div', { class: 'tracker' });
    this.prompt = h('div', { class: 'prompt' });
    this.areaToast = h('div', { class: 'area-toast' });
    this.islandHud = h(
      'div',
      { class: 'island-hud' },
      h('div', { class: 'top-left' }, this.area, h('div', { class: 'row-pills' }, this.level, this.purse)),
      this.tracker,
      this.areaToast,
      this.prompt,
      h(
        'div',
        { class: 'keys' },
        h('kbd', {}, 'ZQSD'),
        ' marcher · ',
        h('kbd', {}, 'E'),
        ' interagir · ',
        h('kbd', {}, 'I'),
        ' équipement · ',
        h('kbd', {}, 'J'),
        ' quêtes · ',
        h('kbd', {}, 'K'),
        ' compétences · ',
        h('kbd', {}, 'Échap'),
        ' menu',
      ),
    );
    parent.append(this.islandHud, this.toasts, this.title, this.pause, this.result, this.fade);
  }

  // --- Écran titre ------------------------------------------------------------

  showTitle(options: MenuOption[]): void {
    this.title.replaceChildren(
      h(
        'div',
        { class: 'title-card' },
        h('div', { class: 'title-seal' }, '黄泉'),
        h('h1', {}, 'Rivages des Morts'),
        h('p', { class: 'tagline' }, 'Les au-delà se sont effondrés. Les âmes ne trouvent plus leur chemin.'),
        this.menu(options),
        h('p', { class: 'footnote' }, 'Prototype · île du Yomi · graphismes provisoires'),
      ),
    );
    this.title.classList.add('visible');
  }

  hideTitle(): void {
    this.title.classList.remove('visible');
  }

  // --- Menu pause -------------------------------------------------------------

  get paused(): boolean {
    return this.pause.classList.contains('visible');
  }

  /** `skills` : les compétences de la classe du héros, [touche, ce qu'elle fait] ; `ranged` : le clic gauche tire. */
  showPause(options: MenuOption[], skills: [string, string][], ranged = false): void {
    this.pause.replaceChildren(
      h(
        'div',
        { class: 'pause-card' },
        h('h2', {}, 'Pause'),
        this.menu(options),
        h(
          'div',
          { class: 'controls-help' },
          h('h3', {}, 'Commandes'),
          h(
            'dl',
            {},
            h('dt', {}, 'ZQSD'),
            h('dd', {}, 'se déplacer'),
            h('dt', {}, 'E'),
            h('dd', {}, 'parler, fouiller (sur l’île)'),
            h('dt', {}, 'Souris'),
            h('dd', {}, 'viser (au combat)'),
            h('dt', {}, 'Clic gauche'),
            h('dd', {}, ranged ? 'tirer une flèche' : 'frapper'),
            h('dt', {}, 'Espace'),
            h('dd', {}, 'esquiver'),
            ...skills.flatMap(([key, label]) => [h('dt', {}, key), h('dd', {}, label)]),
            h('dt', {}, 'I / J / K'),
            h('dd', {}, 'équipement / quêtes / compétences'),
          ),
        ),
      ),
    );
    this.pause.classList.add('visible');
  }

  hidePause(): void {
    this.pause.classList.remove('visible');
  }

  // --- Fin de donjon ------------------------------------------------------------

  showResult(
    victory: boolean,
    loot: {
      /** Nom du donjon, et le titre et le texte de sa victoire. */
      place: string;
      victory: { title: string; text: string };
      level: number;
      oboles: number;
      xp: number;
      materials: (string | Node)[];
      chests: number;
      unlocked?: number;
    },
    options: MenuOption[],
  ): void {
    this.result.replaceChildren(
      h(
        'div',
        { class: `result-card ${victory ? 'victory' : 'defeat'}` },
        h('div', { class: 'title-seal' }, victory ? '勝' : '魂'),
        h('h1', {}, victory ? loot.victory.title : 'Ton âme vacille…'),
        h('div', { class: 'result-level' }, `${loot.place} · niveau ${loot.level}`),
        loot.unlocked ? h('div', { class: 'result-unlock' }, `Niveau ${loot.unlocked} débloqué`) : null,
        h(
          'p',
          { class: 'tagline' },
          victory ? loot.victory.text : 'Tu te réveilles sur la rive. Tu gardes ce que tu as ramassé, mais le donjon est à recommencer.',
        ),
        h(
          'ul',
          { class: 'loot' },
          h('li', {}, obole(`+${loot.oboles}`), ' oboles'),
          h('li', {}, `+${loot.xp} XP`),
          h('li', {}, `${loot.chests} coffre${loot.chests > 1 ? 's' : ''} à ouvrir sur la barque`),
          ...loot.materials.map((m) => h('li', {}, m)),
        ),
        this.menu(options),
      ),
    );
    this.result.classList.add('visible');
  }

  hideResult(): void {
    this.result.classList.remove('visible');
  }

  // --- Transitions ----------------------------------------------------------------

  /** Fondu au noir d'encre, avec le nom du lieu, pendant lequel on change de scène. */
  async transition(title: string, subtitle: string, during: () => void | Promise<void>): Promise<void> {
    this.fadeTitle.textContent = title;
    this.fadeSub.textContent = subtitle;
    this.fade.classList.add('visible');
    await wait(FADE_MS);
    await during();
    await wait(HOLD_MS);
    this.fade.classList.remove('visible');
    await wait(FADE_MS);
  }

  // --- Notifications ----------------------------------------------------------------

  /** `item` : l'objet ou le matériau dont l'icône accompagne le texte. */
  toast(text: string, tone: 'quest' | 'loot' | 'info' = 'info', item?: string): void {
    const el = h('div', { class: `toast ${tone}${item ? ' with-icon' : ''}` }, item ? icon(item, 'small') : null, text);
    this.toasts.append(el);
    setTimeout(() => el.classList.add('leaving'), TOAST_MS);
    setTimeout(() => el.remove(), TOAST_MS + 500);
  }

  // --- Interface de l'île ---------------------------------------------------------

  showIslandHud(visible: boolean): void {
    this.islandHud.classList.toggle('visible', visible);
  }

  updateIslandHud(state: {
    area: string;
    oboles: number;
    xp: { level: number; into: number; needed: number };
    points: number;
    quest: { name: string; objective: string } | null;
    prompt: { verb: string; name: string } | null;
  }): void {
    if (this.area.textContent !== state.area) this.area.textContent = state.area;
    const purse = String(state.oboles);
    if (this.purse.dataset.value !== purse) {
      this.purse.dataset.value = purse;
      this.purse.replaceChildren(obole(state.oboles));
    }
    const level = `${state.xp.level}|${state.xp.into}|${state.points}`;
    if (this.level.dataset.value !== level) {
      this.level.dataset.value = level;
      const ratio = state.xp.needed ? state.xp.into / state.xp.needed : 1;
      this.level.replaceChildren(
        h('span', {}, `Niv. ${state.xp.level}`),
        h('span', { class: 'xp-bar' }, h('span', { class: 'xp-fill', style: `width:${Math.round(ratio * 100)}%` })),
      );
      if (state.points) this.level.append(h('span', { class: 'points-badge', title: 'Points de compétence (touche K)' }, `+${state.points}`));
    }
    const tracker = state.quest ? `${state.quest.name}|${state.quest.objective}` : '';
    if (this.tracker.dataset.value !== tracker) {
      this.tracker.dataset.value = tracker;
      this.tracker.replaceChildren(
        ...(state.quest ? [h('div', { class: 'tracker-label' }, 'Quête'), h('strong', {}, state.quest.name), h('p', {}, state.quest.objective)] : []),
      );
      this.tracker.hidden = !state.quest;
    }
    const prompt = state.prompt ? `${state.prompt.verb} ${state.prompt.name}` : '';
    if (this.prompt.dataset.value !== prompt) {
      this.prompt.dataset.value = prompt;
      this.prompt.replaceChildren(...(state.prompt ? [h('kbd', {}, 'E'), ` ${state.prompt.verb} · `, h('strong', {}, state.prompt.name)] : []));
      this.prompt.classList.toggle('visible', Boolean(state.prompt));
    }
  }

  /** Grand nom du lieu, affiché quelques secondes quand on y entre. */
  announceArea(name: string): void {
    this.areaToast.textContent = name;
    this.areaToast.classList.add('visible');
    if (this.areaTimer) clearTimeout(this.areaTimer);
    this.areaTimer = setTimeout(() => this.areaToast.classList.remove('visible'), 2200);
  }

  private menu(options: MenuOption[]): HTMLElement {
    return h(
      'div',
      { class: 'menu' },
      ...options.map((o) => h('button', { class: `btn${o.primary ? ' primary' : ''}`, onclick: () => o.action() }, o.label)),
    );
  }
}
