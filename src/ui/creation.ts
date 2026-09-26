import { racePassives, type ItemDef, type SkillsDef } from '../game/loadout';
import type { Hero } from '../game/progress';
import { heroImage, heroSprite } from '../render/heroes';
import type { AsepriteSheet } from '../render/sheets';
import { h } from './dom';

/**
 * Création du héros (GDD, multiclassage « à la création ») : une race, et pour le Demi-dieu son parent divin,
 * puis une classe. Tout tient sur un écran : on clique, le résumé en bas suit.
 */
export class CreationScreen {
  private readonly root: HTMLDivElement;

  constructor(parent: HTMLElement) {
    this.root = h('div', { class: 'screen creation-screen' });
    parent.append(this.root);
  }

  show(skills: SkillsDef, items: Record<string, ItemDef>, onDone: (hero: Hero) => void, onBack: () => void): void {
    const raceIds = Object.keys(skills.races);
    const classIds = Object.keys(skills.classes);
    const hero: Hero = { race: raceIds[0], class: classIds[0] };

    const render = () => {
      const race = skills.races[hero.race];
      const parents = race.parents ? Object.entries(race.parents) : [];
      if (parents.length && !hero.parent) hero.parent = parents[0][0];
      if (!parents.length) delete hero.parent;
      const cls = skills.classes[hero.class];
      const parent = hero.parent ? race.parents?.[hero.parent] : undefined;

      const raceCards = raceIds.map((id) => {
        const r = skills.races[id];
        return h(
          'button',
          {
            class: `choice-card${id === hero.race ? ' selected' : ''}`,
            onclick: () => {
              hero.race = id;
              delete hero.parent;
              render();
            },
          },
          h('strong', {}, r.name),
          h('small', { class: 'choice-origin' }, r.origin),
          h('span', { class: 'choice-style' }, r.style),
          ...r.passives.map((p) => h('small', { class: 'choice-line', title: p.description }, h('b', {}, p.name))),
          r.parents ? h('small', { class: 'choice-line' }, h('b', {}, 'Parent divin'), ' au choix') : null,
        );
      });

      const classCards = [
        ...classIds.map((id) => {
          const c = skills.classes[id];
          return h(
            'button',
            {
              class: `choice-card${id === hero.class ? ' selected' : ''}`,
              onclick: () => {
                hero.class = id;
                render();
              },
            },
            h('strong', {}, c.name),
            h('small', { class: 'choice-origin' }, c.subtitle),
            h('span', { class: 'choice-style' }, c.role),
            h('small', { class: 'choice-line' }, 'Arme : ', h('b', {}, items[c.weapon]?.name ?? c.weapon)),
          );
        }),
        ...skills.upcomingClasses.map((c) =>
          h(
            'button',
            { class: 'choice-card soon', disabled: true },
            h('strong', {}, c.name),
            h('small', { class: 'choice-origin' }, c.subtitle),
            h('span', { class: 'choice-style' }, c.role),
            h('small', { class: 'choice-line' }, 'Bientôt'),
          ),
        ),
      ];

      // Aperçu : la peinture du héros, et son animation d'attente telle qu'elle apparaît en jeu.
      const previewCanvas = h('canvas', { class: 'hero-preview-canvas' });
      playIdle(previewCanvas, heroSprite(hero));
      const paintedImg = h('img', {
        src: `${import.meta.env.BASE_URL}sprites/${heroImage(hero)}`,
        alt: `${race.name} ${cls.name}`,
        class: 'hero-painted-preview',
      });

      const previewBox = h(
        'div',
        { class: 'hero-preview-box' },
        h('div', { class: 'hero-preview-visuals' }, paintedImg, previewCanvas),
        h('span', { class: 'hero-preview-label' }, `${race.name} · ${cls.name}`),
      );

      const detail = h(
        'div',
        { class: 'creation-detail' },
        previewBox,
        h(
          'div',
          {},
          h('h3', {}, `${race.name}${parent ? `, enfant de ${parent.name}` : ''}`),
          ...racePassives(skills, hero).map((p) => h('p', {}, h('b', {}, p.name), ` : ${p.description}`)),
        ),
        h(
          'div',
          {},
          h('h3', {}, `${cls.name} · ${cls.subtitle}`),
          ...cls.actives.map((a) => h('p', {}, h('kbd', {}, a.key), ' ', h('b', {}, a.name), ` : ${a.description}`)),
        ),
      );

      this.root.replaceChildren(
        h(
          'div',
          { class: 'creation-card' },
          h('div', { class: 'title-seal' }, '魂'),
          h('h1', {}, 'Qui étais-tu ?'),
          h('p', { class: 'tagline' }, 'Ton âme a tout oublié, sauf ce qu’elle a été : un héritage, et une manière de se battre.'),
          h('h2', {}, 'Race'),
          h('div', { class: 'choices' }, ...raceCards),
          parents.length
            ? h(
                'div',
                { class: 'parents' },
                h('span', { class: 'note' }, 'Parent divin :'),
                ...parents.map(([id, p]) =>
                  h(
                    'button',
                    {
                      class: `btn small${id === hero.parent ? ' primary' : ''}`,
                      title: p.description,
                      onclick: () => {
                        hero.parent = id;
                        render();
                      },
                    },
                    p.name,
                  ),
                ),
              )
            : null,
          h('h2', {}, 'Classe'),
          h('div', { class: 'choices' }, ...classCards),
          detail,
          h(
            'div',
            { class: 'creation-actions' },
            h(
              'button',
              {
                class: 'btn',
                onclick: () => {
                  this.hide();
                  onBack();
                },
              },
              'Retour',
            ),
            h(
              'button',
              {
                class: 'btn primary',
                onclick: () => {
                  this.hide();
                  onDone({ ...hero });
                },
              },
              `Commencer : ${cls.name} ${race.name}`,
            ),
          ),
          h('p', { class: 'footnote' }, 'Chaque classe possède son design peint et ses animations de combat dédiées'),
        ),
      );
    };
    render();
    this.root.classList.add('visible');
  }

  hide(): void {
    this.root.classList.remove('visible');
  }
}

/** Planches déjà chargées pour l'aperçu : leur découpage et leur image. */
const sheets = new Map<string, Promise<{ sheet: AsepriteSheet; image: HTMLImageElement } | null>>();

function loadAnim(name: string): Promise<{ sheet: AsepriteSheet; image: HTMLImageElement } | null> {
  let pending = sheets.get(name);
  if (!pending) {
    const base = `${import.meta.env.BASE_URL}sprites/anim/`;
    pending = fetch(`${base}${name}.json`)
      .then((response) => (response.ok ? (response.json() as Promise<AsepriteSheet>) : Promise.reject(new Error(name))))
      .then(
        (sheet) =>
          new Promise<{ sheet: AsepriteSheet; image: HTMLImageElement } | null>((resolve) => {
            const image = new Image();
            image.onload = () => resolve({ sheet, image });
            image.onerror = () => resolve(null);
            image.src = `${base}${sheet.meta.image}`;
          }),
      )
      .catch(() => null);
    sheets.set(name, pending);
  }
  return pending;
}

/** Joue en boucle l'animation d'attente de la planche `name` dans `canvas`, tant qu'il est affiché. */
function playIdle(canvas: HTMLCanvasElement, name: string): void {
  void loadAnim(name).then((anim) => {
    if (!anim || !canvas.isConnected) return;
    const { sheet, image } = anim;
    const tag = sheet.meta.frameTags?.find((t) => t.name === 'idle');
    const frames = sheet.frames.slice(tag?.from ?? 0, (tag?.to ?? 0) + 1);
    const { w, h: height } = frames[0].frame;
    // Une case entière, réduite de moitié : les proportions de la planche sont gardées.
    canvas.width = Math.round(w / 2);
    canvas.height = Math.round(height / 2);
    const ctx = canvas.getContext('2d')!;
    const total = frames.reduce((sum, f) => sum + f.duration, 0);
    const start = performance.now();
    const tick = (now: number) => {
      if (!canvas.isConnected) return;
      let t = (now - start) % Math.max(1, total);
      let frame = frames[frames.length - 1];
      for (const f of frames) {
        if (t < f.duration) {
          frame = f;
          break;
        }
        t -= f.duration;
      }
      const { x, y, w: fw, h: fh } = frame.frame;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, x, y, fw, fh, 0, 0, canvas.width, canvas.height);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
