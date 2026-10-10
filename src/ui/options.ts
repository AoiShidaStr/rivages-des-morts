import type { Music } from '../audio/music';
import { LOW_GRAPHICS, lowGraphics, setLowGraphics } from '../render/flags';
import { MIN_SCALE, type AdaptiveResolution } from '../render/resolution';
import { fullTextures, setFullTextures } from '../render/textureBudget';
import { h } from './dom';
import type { PanelHost } from './panels';

/** Lu au chargement : changer l'option demande de recharger. */
const FULL_TEXTURES = fullTextures();

/** Réglages du joueur, depuis l'écran titre ou la pause : la musique et l'affichage. */
export function openOptions(host: PanelHost, music: Music, resolution: AdaptiveResolution, onClose?: () => void): void {
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

  // Netteté : automatique (elle baisse si la carte graphique peine), ou fixée par le joueur.
  const auto = h('input', { type: 'checkbox' });
  const sharpness = h('input', { type: 'range', min: String(MIN_SCALE * 100), max: '100', step: '5', 'aria-label': "Netteté de l'image" });
  const sharpnessValue = h('strong', { class: 'volume-value' });
  const syncSharpness = () => {
    const fixed = resolution.fixedScale;
    auto.checked = fixed === null;
    sharpness.value = String(Math.round((fixed ?? resolution.scale) * 100));
    sharpnessValue.textContent = fixed === null ? `auto (${Math.round(resolution.scale * 100)} %)` : `${sharpness.value} %`;
  };
  auto.addEventListener('change', () => {
    resolution.setFixed(auto.checked ? null : Number(sharpness.value) / 100);
    syncSharpness();
  });
  sharpness.addEventListener('input', () => {
    resolution.setFixed(Number(sharpness.value) / 100);
    syncSharpness();
  });
  syncSharpness();

  // La carte se construit au chargement : le mode léger garde les cartes peintes, sans décors ajoutés ni eau animée.
  const low = h('input', { type: 'checkbox' });
  low.checked = lowGraphics();
  // Les planches sont réduites à la taille de l'écran au chargement ; pleines, elles restent telles que peintes.
  const full = h('input', { type: 'checkbox' });
  full.checked = FULL_TEXTURES;
  const reload = h('button', { class: 'btn small', type: 'button', onclick: () => location.reload() }, 'Recharger le jeu maintenant');
  const pending = h('p', { class: 'note' }, "S'applique au prochain chargement du jeu. Une descente en cours serait perdue en rechargeant.");
  const syncGraphics = () => {
    const changed = low.checked !== LOW_GRAPHICS || full.checked !== FULL_TEXTURES;
    pending.hidden = !changed;
    reload.hidden = !changed;
  };
  low.addEventListener('change', () => {
    setLowGraphics(low.checked);
    syncGraphics();
  });
  full.addEventListener('change', () => {
    setFullTextures(full.checked);
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
      h('div', { class: 'option-row' }, h('span', {}, 'Netteté'), sharpness, sharpnessValue),
      h('label', { class: 'option-row' }, auto, h('span', {}, 'Netteté automatique : baisse seulement si la carte graphique ralentit le jeu')),
      h('label', { class: 'option-row' }, full, h('span', {}, 'Textures en pleine définition : plus nettes, plus lourdes en mémoire graphique')),
      h('label', { class: 'option-row' }, low, h('span', {}, 'Graphismes allégés : cartes sans décors ajoutés ni eau animée (pour les petites cartes graphiques)')),
      pending,
      reload,
    ),
    { onClose },
  );
}
