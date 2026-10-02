import type { Music } from '../audio/music';
import { playSound } from '../audio/sfx';
import { h } from './dom';
import type { PanelHost } from './panels';

/** Une ligne de réglage : un volume de 0 à 100 et sa case « couper ». */
function volumeRow(label: string, aria: string, get: () => { volume: number; muted: boolean }, set: (volume: number) => void, mute: (muted: boolean) => void, onChange?: () => void) {
  const value = h('strong', { class: 'volume-value' });
  const slider = h('input', { type: 'range', min: '0', max: '100', step: '5', 'aria-label': aria });
  const box = h('input', { type: 'checkbox' });
  const sync = () => {
    const { volume, muted } = get();
    slider.value = String(Math.round(volume * 100));
    box.checked = muted;
    value.textContent = muted ? 'coupé' : `${slider.value} %`;
  };
  slider.addEventListener('input', () => {
    set(Number(slider.value) / 100);
    sync();
  });
  slider.addEventListener('change', () => onChange?.());
  box.addEventListener('change', () => {
    mute(box.checked);
    sync();
  });
  sync();
  return { row: h('div', { class: 'option-row' }, h('span', {}, label), slider, value), mute: h('label', { class: 'option-row' }, box, h('span', {}, `Couper ${label.toLowerCase()}`)), sync };
}

/** Réglages du joueur, depuis l'écran titre ou la pause : la musique et les effets sonores. */
export function openOptions(host: PanelHost, music: Music, onClose?: () => void): void {
  const { settings } = music;
  const musicRow = volumeRow(
    'La musique',
    'Volume de la musique',
    () => ({ volume: settings.volume, muted: settings.muted }),
    (v) => music.setVolume(v),
    (m) => music.setMuted(m),
  );
  const sfxRow = volumeRow(
    'Les effets',
    'Volume des effets sonores',
    () => ({ volume: settings.sfxVolume, muted: settings.sfxMuted }),
    (v) => music.setSfxVolume(v),
    (m) => music.setSfxMuted(m),
    // On entend le nouveau volume en lâchant le curseur.
    () => playSound('ui.confirm'),
  );
  host.show(
    'Options',
    'Réglages gardés dans ce navigateur · M coupe tout le son',
    h('div', { class: 'list options' }, h('h3', {}, 'Musique'), musicRow.row, musicRow.mute, h('h3', {}, 'Effets sonores'), sfxRow.row, sfxRow.mute),
    { onClose },
  );
}
