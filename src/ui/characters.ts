import { content } from '../content';
import { heroLabel, heroRace } from '../game/loadout';
import { MAX_CHARACTERS, type CharacterSummary } from '../game/progress';
import { heroImage } from '../render/heroes';
import { h, obole } from './dom';
import type { PanelHost, UiContext } from './panels';

export interface CharacterActions {
  play(id: string): void;
  create(): void;
}

/**
 * Les personnages sauvegardés dans ce navigateur, depuis l'écran titre : en reprendre un, en créer un autre,
 * exporter un fichier (copie de secours, autre ordinateur), importer un fichier, supprimer.
 */
export function openCharacters(host: PanelHost, ctx: UiContext, actions: CharacterActions, onClose: () => void): void {
  const { progress } = ctx;
  /** Personnage dont on demande la confirmation de suppression. */
  let confirming: string | null = null;

  const row = (c: CharacterSummary): HTMLElement => {
    const race = heroRace(content.skills, c.hero);
    const parent = c.hero.parent ? race.parents?.[c.hero.parent]?.name : undefined;
    const buttons =
      confirming === c.id
        ? [
            h('span', { class: 'note danger' }, 'Supprimer pour de bon ?'),
            h(
              'button',
              {
                class: 'btn small danger',
                onclick: () => {
                  progress.remove(c.id);
                  confirming = null;
                  ctx.toast(`${heroLabel(content.skills, c.hero)} a été supprimé.`);
                  render();
                },
              },
              'Oui, supprimer',
            ),
            h(
              'button',
              {
                class: 'btn small',
                onclick: () => {
                  confirming = null;
                  render();
                },
              },
              'Annuler',
            ),
          ]
        : [
            h('button', { class: 'btn small primary', onclick: () => actions.play(c.id) }, 'Jouer'),
            h('button', { class: 'btn small', title: 'Télécharger un fichier de sauvegarde', onclick: () => exportCharacter(c) }, 'Exporter'),
            h(
              'button',
              {
                class: 'btn small',
                onclick: () => {
                  confirming = c.id;
                  render();
                },
              },
              'Supprimer',
            ),
          ];
    return h(
      'div',
      { class: `row character${c.id === progress.slot ? ' current' : ''}` },
      h('img', { class: 'character-portrait', src: `${import.meta.env.BASE_URL}sprites/${heroImage(c.hero)}`, alt: '' }),
      h(
        'div',
        { class: 'character-body' },
        h('strong', {}, heroLabel(content.skills, c.hero)),
        parent ? h('small', {}, `Enfant de ${parent}`) : null,
        h('small', {}, `Niveau ${c.level} · `, obole(c.oboles), `${c.endless ? ` · Yomi sans fond : palier ${c.endless}` : ''} · joué le ${playedOn(c.savedAt)}`),
      ),
      h('div', { class: 'character-actions' }, ...buttons),
    );
  };

  const exportCharacter = (c: CharacterSummary) => {
    const text = progress.exportSlot(c.id);
    if (!text) return;
    download(`rivages-des-morts_${c.hero.race}-${c.hero.class}_niv${c.level}.json`, text);
  };

  const importFile = () => {
    const input = h('input', { type: 'file', accept: '.json,application/json' });
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      void file.text().then((text) => {
        try {
          const id = progress.importSave(text);
          const added = progress.characters().find((c) => c.id === id);
          ctx.toast(added ? `Personnage importé : ${heroLabel(content.skills, added.hero)}, niveau ${added.level}` : 'Personnage importé.', 'quest');
        } catch (error) {
          ctx.toast(error instanceof Error ? error.message : String(error));
        }
        render();
      });
    });
    input.click();
  };

  const render = () => {
    const characters = progress.characters();
    host.show(
      'Personnages',
      `${characters.length} sur ${MAX_CHARACTERS} · sauvegardés dans ce navigateur`,
      h(
        'div',
        { class: 'list' },
        characters.length ? null : h('p', { class: 'note' }, 'Aucun personnage pour le moment. Crées-en un, ou importe un fichier de sauvegarde.'),
        ...characters.map(row),
        h(
          'div',
          { class: 'character-footer' },
          h('button', { class: 'btn primary', disabled: !progress.canCreate, onclick: () => actions.create() }, 'Nouveau personnage'),
          h('button', { class: 'btn', onclick: importFile }, 'Importer un fichier'),
        ),
        h(
          'p',
          { class: 'note' },
          progress.canCreate ? '' : `${MAX_CHARACTERS} personnages au plus : supprimes-en un pour en créer un autre. `,
          'Tes personnages restent dans ce navigateur : exporte-les pour en garder une copie ou changer d’ordinateur.',
        ),
      ),
      { onClose },
    );
  };
  render();
}

/** « 27 septembre à 14:03 ». */
function playedOn(savedAt: number): string {
  const date = new Date(savedAt);
  const day = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${day} à ${time}`;
}

/** Fait télécharger `text` au navigateur, sous le nom `filename`. */
function download(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = h('a', { href: url, download: filename });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
