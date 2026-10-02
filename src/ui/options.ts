import type { Music } from '../audio/music';
import { h } from './dom';
import type { PanelHost } from './panels';

/** Réglages du joueur, depuis l'écran titre ou la pause : pour l'instant, la musique. */
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
  host.show(
    'Options',
    'Réglages gardés dans ce navigateur',
    h(
      'div',
      { class: 'list options' },
      h('h3', {}, 'Musique'),
      h('div', { class: 'option-row' }, h('span', {}, 'Volume'), slider, value),
      h('label', { class: 'option-row' }, mute, h('span', {}, 'Couper la musique (touche M)')),
    ),
    { onClose },
  );
}
