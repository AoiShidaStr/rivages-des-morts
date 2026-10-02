// Musique : une piste par moment du jeu (menu, île, combat, boss), en fondu de l'une à l'autre.
// Le navigateur interdit le son avant le premier geste du joueur : la musique démarre à son premier clic ou sa
// première touche. Le volume et la coupure sont gardés dans le navigateur.
import data from '../data/musique.json';

export type Moment = keyof typeof data.tracks;

/** Réglages du son, gardés dans le navigateur : la musique, et les effets sonores (src/audio/sfx.ts). */
export interface MusicSettings {
  /** De 0 à 1. */
  volume: number;
  muted: boolean;
  sfxVolume: number;
  sfxMuted: boolean;
}

const SETTINGS_KEY = 'rivages-des-morts:audio';
/** Pas du fondu, en millisecondes : les minuteries continuent quand l'onglet est caché, pas l'animation. */
const FADE_STEP_MS = 50;

interface Playing {
  url: string;
  audio: HTMLAudioElement;
  /** Niveau du fondu, de 0 à 1, multiplié par le volume choisi. */
  level: number;
  /** Vers où va le fondu : 1 pour la piste qu'on veut entendre, 0 pour celle qui s'en va. */
  target: number;
}

export class Music {
  readonly settings: MusicSettings;
  private moment: Moment | null = null;
  private unlocked = false;
  private readonly playing: Playing[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.settings = loadSettings();
    const unlock = () => {
      this.unlocked = true;
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
      if (this.moment) this.start(this.moment);
    };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
  }

  /** Joue la musique de ce moment ; si c'est le même fichier que celui qui joue déjà, il continue sans coupure. */
  play(moment: Moment): void {
    if (moment === this.moment) return;
    this.moment = moment;
    if (this.unlocked) this.start(moment);
  }

  setVolume(volume: number): void {
    this.settings.volume = Math.max(0, Math.min(1, volume));
    this.settings.muted = false;
    this.changed();
  }

  setMuted(muted: boolean): void {
    this.settings.muted = muted;
    this.changed();
  }

  setSfxVolume(volume: number): void {
    this.settings.sfxVolume = Math.max(0, Math.min(1, volume));
    this.settings.sfxMuted = false;
    this.changed();
  }

  setSfxMuted(muted: boolean): void {
    this.settings.sfxMuted = muted;
    this.changed();
  }

  /** Touche M : coupe tout le son (musique et effets), ou le remet s'il était tout coupé. Renvoie vrai si coupé. */
  toggleAll(): boolean {
    const mute = !(this.settings.muted && this.settings.sfxMuted);
    this.settings.muted = mute;
    this.settings.sfxMuted = mute;
    this.changed();
    return mute;
  }

  private changed(): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch {
      // Stockage indisponible : le réglage vaut pour cette session seulement.
    }
    for (const p of this.playing) this.apply(p);
  }

  private start(moment: Moment): void {
    const url = data.tracks[moment];
    const current = this.playing.find((p) => p.target === 1);
    if (current?.url === url) return;
    if (current) current.target = 0;
    if (url) {
      // Une piste qui s'éteignait encore reprend là où elle en est.
      let next = this.playing.find((p) => p.url === url);
      if (!next) {
        const audio = new Audio(`${import.meta.env.BASE_URL}${url}`);
        audio.loop = true;
        next = { url, audio, level: 0, target: 1 };
        this.playing.push(next);
        this.apply(next);
        audio.play().catch(() => {
          // Fichier absent ou lecture refusée : le jeu continue en silence.
        });
      }
      next.target = 1;
    }
    this.fade();
  }

  private fade(): void {
    if (this.timer) return;
    const step = FADE_STEP_MS / 1000 / data.fadeSeconds;
    this.timer = setInterval(() => {
      for (const p of [...this.playing]) {
        p.level = p.target > p.level ? Math.min(p.target, p.level + step) : Math.max(p.target, p.level - step);
        this.apply(p);
        if (p.target === 0 && p.level === 0) {
          p.audio.pause();
          this.playing.splice(this.playing.indexOf(p), 1);
        }
      }
      if (this.playing.every((p) => p.level === p.target) && this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    }, FADE_STEP_MS);
  }

  private apply(p: Playing): void {
    const { volume, muted } = this.settings;
    p.audio.volume = muted ? 0 : volume * p.level;
  }
}

function loadSettings(): MusicSettings {
  const fallback: MusicSettings = { volume: data.defaultVolume, muted: false, sfxVolume: data.defaultSfxVolume, sfxMuted: false };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<MusicSettings>) : {};
    return {
      volume: typeof saved.volume === 'number' ? Math.max(0, Math.min(1, saved.volume)) : fallback.volume,
      muted: saved.muted === true,
      sfxVolume: typeof saved.sfxVolume === 'number' ? Math.max(0, Math.min(1, saved.sfxVolume)) : fallback.sfxVolume,
      sfxMuted: saved.sfxMuted === true,
    };
  } catch {
    return fallback;
  }
}
