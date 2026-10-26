// Entrée du Yomi sans fond (donjon infini) : les règles, les records et la montée de la difficulté.
import { ENDLESS_RECORD, content } from '../content';
import { gravureSealText, sealPaliers } from '../game/gravure';
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
  const marks = [10, 20, 30, 40].map((n) => start + n);
  host.show(
    data.name,
    `Record : palier ${mine}${global ? ` · record de tous tes personnages : palier ${global.palier} (${global.hero})` : ''}`,
    h(
      'div',
      { class: 'list' },
      h(
        'ul',
        { class: 'rules' },
        h('li', {}, `On entre directement au palier ${start} (niveau ${levelAt(data, start)}) : Izanami et la Jorōgumo t’attendent ensemble dès le premier combat.${data.modifiers[0] ? ` ${data.modifiers[0].description}` : ''}`),
        h('li', {}, `Ensuite, des blocs de ${step} paliers (${start + 1} à ${lastPalier(data, 1)}, puis ${lastPalier(data, 1) + 1} à ${lastPalier(data, 2)}…) : chaque salle mêle au hasard les yokai des Rizières et du Palais, et les deux reines reviennent au bout de chaque bloc.`),
        h('li', {}, `La difficulté monte en ligne droite : chaque palier ajoute la même part de PV et de dégâts aux yokai, et les malédictions se resserrent peu à peu.`),
        h('li', {}, `À la fin de chaque bloc : encaisse ton butin et remonte, ou continue. Si tu tombes, tu perds tout ce que tu n’as pas encaissé.`),
        h('li', {}, `Chaque bloc franchi rapporte un objet rare, épique ou légendaire.`),
        h('li', {}, `Aux paliers ${sealPaliers(content.gravures.sceau)}, le sceau du Yomi marque une de tes armes au hasard. ${gravureSealText(content.gravures.sceau).split(' : ')[0]}.`),
      ),
      h('h3', {}, 'La montée'),
      h(
        'div',
        { class: 'curses' },
        ...(prog
          ? [
              h('div', { class: 'curse' }, h('strong', {}, `À chaque palier`), h('small', {}, `+${pct(prog.hpPerPalier)} de PV et +${pct(prog.damagePerPalier)} de dégâts pour les yokai ; une bête de plus par vague tous les ${prog.spawnsEvery} paliers.`)),
              ...marks.map((palier) => {
                const d = at(palier);
                const extra = (d.soloExtra ?? 0) > 0 ? ` · +${d.soloExtra} yokai par vague` : '';
                return h(
                  'div',
                  { class: 'curse' },
                  h('strong', {}, `Palier ${palier}`),
                  h('small', {}, `PV ×${(d.hp / base.hp).toFixed(2)}, dégâts ×${(d.damage / base.damage).toFixed(2)}, hâte ${pct(d.curses.hate ?? 0)}, rancune ${pct(d.curses.rancune ?? 0)}${extra}`),
                );
              }),
            ]
          : []),
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
