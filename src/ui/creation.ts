import { racePassives, type ItemDef, type SkillsDef } from '../game/loadout';
import type { Hero } from '../game/progress';
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

      const previewCanvas = h('canvas', { width: '168', height: '126', class: 'hero-preview-canvas' }) as HTMLCanvasElement;
      const ctx = previewCanvas.getContext('2d');
      const comboName = hero.race === 'einherjar' && hero.class === 'guerrier' ? 'heros' : `heros-${hero.race}-${hero.class}`;
      const animImg = new Image();
      animImg.src = `${import.meta.env.BASE_URL}sprites/anim/${comboName}.webp`;
      let frame = 0;
      let animId: number | null = null;
      let lastTime = performance.now();
      const drawFrame = () => {
        if (!ctx) return;
        ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        ctx.imageSmoothingEnabled = true;
        if (animImg.complete && animImg.naturalWidth > 0) {
          const col = frame % 7;
          const row = Math.floor(frame / 7);
          ctx.drawImage(animImg, col * 536, row * 296, 536, 296, 0, 0, 168, 126);
        }
      };
      const loop = (now: number) => {
        if (!previewCanvas.isConnected) return;
        if (now - lastTime >= 75) {
          frame = (frame + 1) % 16;
          lastTime = now;
          drawFrame();
        }
        animId = requestAnimationFrame(loop);
      };
      animImg.onload = () => {
        drawFrame();
        if (animId !== null) cancelAnimationFrame(animId);
        animId = requestAnimationFrame(loop);
      };

      const paintedImg = h('img', {
        src: `${import.meta.env.BASE_URL}sprites/heros-${hero.race}-${hero.class}.png`,
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
