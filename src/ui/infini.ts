// Entrée du Yomi sans fond (donjon infini) : les règles, les records et la montée de la difficulté.
import { ENDLESS_RECORD, content } from '../content';
import { gravureSealText, sealCount, sealPaliers } from '../game/gravure';
import { difficultyAt, globalRecord, lastPalier, levelAt, startPalier } from '../game/infini';
import { h } from './dom';
import type { PanelHost, UiContext } from './panels';

const pct = (x: number) => `${Number((x * 100).toFixed(1)).toLocaleString('fr-FR')} %`;

export function openEndlessEntry(host: PanelHost, ctx: UiContext, onEnter: () => void): void {
  const data = content.endless;
  const mine = ctx.progress.state.flags[ENDLESS_RECORD] ?? 0;
  const global = globalRecord();
  const step = data.palierStep;
  const start = startPalier(data);
  const prog = data.progression;
  // Ce que la montée en ligne droite donne, palier après palier : un point tous les 10 paliers suffit à la lire.
  const at = (palier: number) => difficultyAt(data, content.difficulty, palier, 1);
  const base = at(start);
  const sceau = content.gravures.sceau;
  // Une ligne par marche : les paliers 11 à 20, 21 à 30… avec le sceau qui l'ouvre.
  const marks = prog ? [1, 2, 3, 4].map((n) => start - 1 + n * prog.every) : [];
  host.show(
    data.name,
    `Record : palier ${mine}${global ? ` · record de tous tes personnages : palier ${global.palier} (${global.hero})` : ''}`,
    h(
      'div',
      { class: 'list' },
      h(
        'ul',
        { class: 'rules' },
        h('li', {}, `Des blocs de ${step} paliers : quatre salles qui mêlent au hasard les yokai des Rizières et du Palais, puis Izanami et la Jorōgumo ensemble au ${step}e palier (${lastPalier(data, 0)}, ${lastPalier(data, 1)}, ${lastPalier(data, 2)}…).`),
        h('li', {}, `Dès le palier ${start}, les yokai sont au niveau ${levelAt(data, start)}.${data.modifiers[0] ? ` ${data.modifiers[0].description}` : ''}`),
        h('li', {}, `Aux paliers ${sealPaliers(sceau)}, tu gagnes des sceaux du Yomi : ${sealCount(sceau, sceau.palier)} au palier ${sceau.palier}, puis deux fois plus à chaque fois (${[1, 2, 3].map((i) => `${sealCount(sceau, sceau.palier + i * (sceau.every ?? 0))} au ${sceau.palier + i * (sceau.every ?? 0)}`).join(', ')}…). Chacun marque une de tes armes au hasard. ${gravureSealText(sceau).split(' : ')[0]}.`),
        h('li', {}, `À chaque sceau, la difficulté monte d’une même marche.`),
        h('li', {}, `À la fin de chaque bloc : encaisse ton butin et remonte, ou continue. Si tu tombes, tu perds tout ce que tu n’as pas encaissé.`),
        h('li', {}, `Chaque bloc franchi rapporte un objet rare, épique ou légendaire.`),
      ),
      h('h3', {}, 'La montée'),
      h(
        'div',
        { class: 'curses' },
        ...marks.map((palier) => {
          const d = at(palier + 1);
          const extra = (d.soloExtra ?? 0) > 0 ? ` · +${d.soloExtra} yokai par vague` : '';
          return h(
            'div',
            { class: 'curse' },
            h('strong', {}, `Après le palier ${palier} · ${sealCount(sceau, palier)} sceau${sealCount(sceau, palier) > 1 ? 'x' : ''}`),
            h('small', {}, `PV ×${(d.hp / base.hp).toFixed(2)}, dégâts ×${(d.damage / base.damage).toFixed(2)}, hâte ${pct(d.curses.hate ?? 0)}, rancune ${pct(d.curses.rancune ?? 0)}${extra}`),
          );
        }),
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
          `Descendre au palier ${start}`,
        ),
      ),
    ),
  );
}
