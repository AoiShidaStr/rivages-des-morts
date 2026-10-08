import type { Music } from '../audio/music';
import { SCENES_3D, scenes3dChosen, setScenes3d } from '../render/flags';
import { h } from './dom';
import type { PanelHost } from './panels';

/** Réglages du joueur, depuis l'écran titre ou la pause : la musique et les graphismes. */
export function openOptions(host: PanelHost, music: Music, onClose?: () => void): void {
  const { settings } = music;
  const value = h('strong', { class: 'volume-value' });
  const slider = h('input', { type: 'range', min: '0', max: '100', step: '5', 'aria-label': 'Volume de la musique' });
  const mute = h('input', { type: 'checkbox' });
  const sync = () => {
    slider.value = String(Math.round(settings.volume * 100));
    mute.checked = settings.muted;
    value.textContent = settings.muted ? 'coupée' : `${slider.value} %`;
  };
  slider.addEventListener('input', () => {
    music.setVolume(Number(slider.value) / 100);
    sync();
  });
  mute.addEventListener('change', () => {
    music.setMuted(mute.checked);
    sync();
  });
  sync();

  // Scènes en 3D au lieu de la carte peinte (expérimental). Les scènes se construisent au chargement de la page :
  // le changement s'applique en rechargeant le jeu.
  const scenes3d = h('input', { type: 'checkbox' });
  scenes3d.checked = scenes3dChosen();
  const reload = h('button', { class: 'btn small', type: 'button', onclick: () => location.reload() }, 'Recharger le jeu maintenant');
  const pending = h('p', { class: 'note' }, "S'applique au prochain chargement du jeu. Une descente en cours serait perdue en rechargeant.");
  const syncGraphics = () => {
    const changed = scenes3d.checked !== SCENES_3D;
    pending.hidden = !changed;
    reload.hidden = !changed;
  };
  scenes3d.addEventListener('change', () => {
    setScenes3d(scenes3d.checked);
    syncGraphics();
  });
  syncGraphics();

  host.show(
    'Options',
    'Réglages gardés dans ce navigateur',
    h(
      'div',
      { class: 'list options' },
      h('h3', {}, 'Musique'),
      h('div', { class: 'option-row' }, h('span', {}, 'Volume'), slider, value),
      h('label', { class: 'option-row' }, mute, h('span', {}, 'Couper la musique (touche M)')),
      h('h3', {}, 'Graphismes'),
      h('label', { class: 'option-row' }, scenes3d, h('span', {}, 'Scènes en 3D (expérimental, plus gourmand) au lieu de la carte peinte')),
      pending,
      reload,
    ),
    { onClose },
  );
}
