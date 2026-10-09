import type { Music } from '../audio/music';
import { LOW_GRAPHICS, lowGraphics, setLowGraphics } from '../render/flags';
import { h } from './dom';
import type { PanelHost } from './panels';

/** Réglages du joueur, depuis l'écran titre ou la pause : la musique. */
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

  // La carte se construit au chargement : le mode léger revient aux anciennes images fixes, sans décors ajoutés.
  const low = h('input', { type: 'checkbox' });
  low.checked = lowGraphics();
  const reload = h('button', { class: 'btn small', type: 'button', onclick: () => location.reload() }, 'Recharger le jeu maintenant');
  const pending = h('p', { class: 'note' }, "S'applique au prochain chargement du jeu. Une descente en cours serait perdue en rechargeant.");
  const syncGraphics = () => {
    const changed = low.checked !== LOW_GRAPHICS;
    pending.hidden = !changed;
    reload.hidden = !changed;
  };
  low.addEventListener('change', () => {
    setLowGraphics(low.checked);
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
      h('label', { class: 'option-row' }, low, h('span', {}, 'Low graphics : anciennes cartes en images fixes, sans décors ajoutés')),
      pending,
      reload,
    ),
    { onClose },
  );
}
