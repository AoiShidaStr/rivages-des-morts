// Sons courts (SFX) d'interface et de combat : un identifiant par événement, deux ou trois variantes de fichier
// audio pour couper la répétition, et une vitesse de lecture tirée au hasard à chaque joue. Comme pour la musique,
// le navigateur interdit le son avant le premier geste du joueur : les appels d'avant restent silencieux.
// Les Pistes longues (menu, île, combats) restent dans src/audio/music.ts : ici, on ne touche pas aux musiques des
// amis musicologues. Un fichier absent ne casse rien : la variante est écartée, le jeu continue sans ce son.
// Conventions : public/audio/sfx/<id>-1.mp3, -2.mp3, -3.mp3 (deux ou trois variantes, une suffit) — le cahier de
// production de chaque id est dans docs/sons-a-produire.md.

import data from '../data/sfx.json';
import type { GameEvent } from '../game/types';

export type SfxId = keyof typeof data.sons;

/** Les événements du combat qui sonnent un fichier court ; le coup critique choisit « crit », le coup ordinaire « coup ». */
export const SFX_DES_EVENTS: Partial<Record<GameEvent['type'], SfxId>> = {
  wave: 'vague',
  enemyHit: 'coup',
  playerHit: 'recu',
  guard: 'garde',
  parry: 'parade',
  heroDown: 'a-terre',
  heroRevived: 'releve',
};

export interface SfxSettings {
  /** De 0 à 1, indépendant du réglage des musiques. */
  volume: number;
  muted: boolean;
}

const SETTINGS_KEY = 'rivages-des-morts:sfx';
/** Les variantes attendues par son : -1, -2 et -3. Une qui manque est simplement ignorée. */
const VARIANTES = [1, 2, 3];
/** Pas entre deux joues du même son : les coups partent en rafale, on ne les empile pas l'un sur l'autre. */
const MÊME_PAS_MS = 90;

export class Sfx {
  readonly settings: SfxSettings;
  private unlocked = false;
  /** Cache des variantes valides par identifiant : les fichiers absents sont retirés dès leur erreur de chargement. */
  private readonly pools = new Map<SfxId, HTMLAudioElement[]>();
  /** La dernière variante jouée par son, pour ne jamais répéter la même derrière elle-même. */
  private readonly dernière = new Map<SfxId, number>();
  private dernierJeu = 0;

  constructor() {
    this.settings = loadSettings();
    const débloque = () => {
      this.unlocked = true;
      window.removeEventListener('pointerdown', débloque, true);
      window.removeEventListener('keydown', débloque, true);
    };
    window.addEventListener('pointerdown', débloque, true);
    window.addEventListener('keydown', débloque, true);
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

  /** Joue ce son, si le navigateur le permet et que le fichier existe. Silencieux sans lui. */
  play(id: SfxId): void {
    if (!this.unlocked || this.settings.muted) return;
    const maintenant = Date.now();
    // Le même son à 90 ms près s'efface devant lui-même : les rafales de coups restent lisibles.
    if (this.dernierJeu && maintenant - this.dernierJeu < MÊME_PAS_MS) return;
    const variantes = this.pool(id);
    if (variantes.length === 0) return;
    const dernière = this.dernière.get(id) ?? -1;
    const dispo = variantes.length > 1 ? variantes.filter((_, i) => i !== dernière) : variantes;
    const audio = dispo[Math.floor(Math.random() * dispo.length)];
    audio.currentTime = 0;
    // Un peu de vitesse au hasard : même une seule variante ne colle pas l'oreille.
    audio.playbackRate = 0.92 + Math.random() * 0.14;
    audio.volume = this.settings.volume;
    this.dernière.set(id, variantes.indexOf(audio));
    this.dernierJeu = maintenant;
    void audio.play().catch(() => {
      // Lecture refusée (fichier absent, onglet en arrière-plan) : le jeu continue en silence.
    });
  }

  private pool(id: SfxId): HTMLAudioElement[] {
    let variantes = this.pools.get(id);
    if (!variantes) {
      variantes = [];
      this.pools.set(id, variantes);
      for (const n of VARIANTES) {
        const audio = new Audio(`${import.meta.env.BASE_URL}audio/sfx/${id}-${n}.mp3`);
        audio.preload = 'auto';
        audio.onerror = () => {
          // Fichier absent : on retire la variante de la réserve.
          const list = this.pools.get(id);
          if (!list) return;
          const idx = list.indexOf(audio);
          if (idx >= 0) list.splice(idx, 1);
        };
        audio.load();
        variantes.push(audio);
      }
    }
    return variantes;
  }

  private changed(): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch {
      // Stockage indisponible : le réglage vaut pour cette session seulement.
    }
  }
}

function loadSettings(): SfxSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<SfxSettings>) : {};
    return {
      volume: typeof saved.volume === 'number' ? Math.max(0, Math.min(1, saved.volume)) : 0.8,
      muted: saved.muted === true,
    };
  } catch {
    return { volume: 0.8, muted: false };
  }
}
