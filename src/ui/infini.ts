// Entrée du Yomi sans fond (donjon infini) : les règles, les records et les modificateurs à venir.
import { ENDLESS_RECORD, content } from '../content';
import { globalRecord, levelAt, modifiersAt } from '../game/infini';
import { h } from './dom';
import type { PanelHost, UiContext } from './panels';

export function openEndlessEntry(host: PanelHost, ctx: UiContext, onEnter: () => void): void {
  const data = content.endless;
  const mine = ctx.progress.state.flags[ENDLESS_RECORD] ?? 0;
  const global = globalRecord();
  const upcoming = [...data.modifiers.map((m) => m.from), data.modifiers.reduce((max, m) => Math.max(max, m.from), 0) + data.palierStep]
    .map((from) => modifiersAt(data, from).find((m) => m.from === from))
    .filter((m) => m !== undefined);
  const step = data.palierStep;
  host.show(
    data.name,
    `Record : palier ${mine}${global ? ` · record de tous tes personnages : palier ${global.palier} (${global.hero})` : ''}`,
    h(
      'div',
      { class: 'list' },
      h(
        'ul',
        { class: 'rules' },
        h('li', {}, `Des blocs de ${step} paliers, dans les Rizières puis dans le Palais : un boss attend au bout de chaque bloc.`),
        h('li', {}, `Les yokai partent au niveau ${data.baseLevel} et gagnent ${data.levelStep} niveaux tous les ${step} paliers (niveau ${levelAt(data, data.doubleBossFrom)} au palier ${data.doubleBossFrom}).`),
        h('li', {}, `Au palier ${data.doubleBossFrom}, Izanami et la Jorōgumo t’attendent ensemble.`),
        h('li', {}, `À la fin de chaque bloc : encaisse ton butin et remonte, ou continue. Si tu tombes, tu perds tout ce que tu n’as pas encaissé.`),
        h('li', {}, `À partir du palier ${data.rewards.itemsFrom}, chaque bloc franchi rapporte un objet rare, épique ou légendaire.`),
        h('li', {}, `Au palier ${content.gravures.sceau.palier}, le sceau du Yomi marque une de tes armes au hasard : c'est la seule façon d'obtenir la première gravure d'une arme, elle ne s'achète pas.`),
      ),
      h('h3', {}, `Après le palier ${data.doubleBossFrom}`),
      h(
        'div',
        { class: 'curses' },
        ...upcoming.map((m) => h('div', { class: 'curse' }, h('strong', {}, `Palier ${m.from} · ${m.name}`), h('small', {}, m.description))),
        h('div', { class: 'curse' }, h('strong', {}, 'Ensuite'), h('small', {}, `Tous les ${step} paliers : ${data.beyond.description.toLowerCase()}`)),
      ),
      h(
        'div',
        { class: 'entry-actions' },
        h(
          'button',
          {
            class: 'btn primary',
            onclick: () => {
              host.close();
              onEnter();
            },
          },
          'Descendre au palier 1',
        ),
      ),
    ),
  );
}
