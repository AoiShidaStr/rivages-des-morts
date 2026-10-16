import type { ScreenPoint } from '../game/island';
import type { SfxSettings } from './sfx';

/**
 * Les ambiances de l'île, en boucle (public/audio/ambiance) : la forêt partout, la cascade près du bassin, la mer près
 * du ponton de Charon. Elles suivent le volume des sons courts et se taisent hors de l'île.
 */
interface Source {
  audio: HTMLAudioElement;
  /** Volume voulu, de 0 à 1, avant le réglage des sons. */
  target: number;
  level: number;
  /** Une lecture demandée et pas encore acceptée (avant le premier geste, le navigateur la refuse). */
  pending: boolean;
}

/** Une source : pleine à `near` unités, muette à `far`, en coordonnées d'écran de l'île. */
interface Spot extends ScreenPoint {
  near: number;
  far: number;
}

const CASCADE: Spot[] = [{ u: 17, v: 38, near: 6, far: 28 }];
const MER: Spot[] = [
  { u: -22.9, v: -27.6, near: 8, far: 30 },
  { u: -31, v: -44, near: 8, far: 30 },
];
/** Les ambiances restent en fond, sous les pas et la musique. */
const GAIN = 0.55;
/** Fondu des volumes (par seconde) : on entre et l'on sort d'une ambiance sans à-coup. */
const FONDU = 1.2;

function proximity(pos: ScreenPoint, spots: Spot[]): number {
  let best = 0;
  for (const s of spots) {
    const d = Math.hypot(pos.u - s.u, pos.v - s.v);
    best = Math.max(best, Math.min(1, Math.max(0, (s.far - d) / (s.far - s.near))));
  }
  return best;
}

export class Ambiance {
  private readonly sources = new Map<'foret' | 'cascade' | 'mer', Source>();

  constructor(private readonly settings: SfxSettings) {}

  /** À chaque image : la position du héros sur l'île, ou rien hors de l'île. */
  update(pos: ScreenPoint | null, dt: number): void {
    const cascade = pos ? proximity(pos, CASCADE) : 0;
    const mer = pos ? proximity(pos, MER) : 0;
    this.set('cascade', cascade);
    this.set('mer', mer);
    this.set('foret', pos ? 0.5 * (1 - 0.7 * Math.max(cascade, mer)) : 0);
    const master = this.settings.muted ? 0 : this.settings.volume * GAIN;
    for (const s of this.sources.values()) {
      s.level += Math.max(-FONDU * dt, Math.min(FONDU * dt, s.target - s.level));
      const volume = s.level * master;
      s.audio.volume = Math.max(0, Math.min(1, volume));
      if (volume > 0.001 && s.audio.paused && !s.pending) {
        s.pending = true;
        const source = s;
        void s.audio.play().catch(() => undefined).finally(() => (source.pending = false));
      } else if (volume <= 0.001 && !s.audio.paused) s.audio.pause();
    }
  }

  private set(id: 'foret' | 'cascade' | 'mer', target: number): void {
    let s = this.sources.get(id);
    if (!s) {
      if (target <= 0) return;
      const audio = new Audio(`${import.meta.env.BASE_URL}audio/ambiance/${id}.mp3`);
      audio.loop = true;
      audio.preload = 'auto';
      audio.volume = 0;
      s = { audio, target: 0, level: 0, pending: false };
      this.sources.set(id, s);
    }
    s.target = target;
  }
}
