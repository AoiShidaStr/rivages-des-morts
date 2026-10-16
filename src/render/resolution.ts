import type { Engine } from '@babylonjs/core';

/**
 * Résolution adaptative : la définition du rendu suit ce que la carte graphique tient. Sur une petite carte, ou un
 * écran très dense (portable 4K, zoom Windows), le jeu dessine moins de pixels plutôt que de ralentir ; l'interface
 * (HTML) reste nette, seule la scène est un peu plus douce. La définition atteinte est gardée pour la prochaine fois.
 *
 * On ne baisse que si c'est la carte graphique qui peine : si c'est le calcul (le processeur) qui prend tout le temps
 * d'une image, moins de pixels n'y changerait rien.
 *
 * Le joueur peut aussi fixer la netteté lui-même (Options) : la définition ne bouge plus.
 */

/** Au-delà de 1,5 pixel par pixel CSS, la différence ne se voit plus sur des images peintes ; le coût, si. */
export const MAX_PIXEL_RATIO = 1.5;
/** Plancher du mode automatique, en part de la définition de l'écran : en deçà, la scène devient floue. */
const AUTO_FLOOR = 0.75;
/** Netteté la plus basse qu'on puisse choisir soi-même. */
export const MIN_SCALE = 0.5;
/** Durée d'une mesure, en secondes d'images. */
const WINDOW = 1.5;
/** Images plus lentes que ça (moins de 50 par seconde) : on baisse. */
const SLOW_MS = 20;
/** Images au rythme de l'écran : on peut tenter de remonter, de temps en temps. */
const FAST_MS = 17.5;
const STORAGE_KEY = 'rivages-resolution';
/** Netteté choisie par le joueur (part de la définition de l'écran) ; absente : automatique. */
const FIXED_KEY = 'rivages-nettete';

export class AdaptiveResolution {
  private max: number;
  private ratio: number;
  private frames = 0;
  private time = 0;
  private cpu = 0;
  /** Secondes de bonnes mesures d'affilée avant de tenter de remonter ; doublé après chaque essai raté. */
  private patience = 6;
  private calm = 0;
  /** Définition d'avant le dernier essai de remontée : on y revient s'il ralentit. */
  private trial: number | null = null;
  /** Changement de définition en attente de la prochaine image. */
  private pending = false;
  /** Netteté fixée par le joueur, ou null : automatique. */
  private fixed: number | null = null;

  constructor(private readonly engine: Engine) {
    this.max = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    let saved = NaN;
    try {
      saved = Number(localStorage.getItem(STORAGE_KEY));
    } catch {
      // Sans stockage, on repart de la plus haute définition.
    }
    this.ratio = saved > 0 ? Math.min(this.max, Math.max(this.max * AUTO_FLOOR, saved)) : this.max;
    try {
      const fixed = Number(localStorage.getItem(FIXED_KEY));
      if (fixed > 0) this.fixed = Math.min(1, Math.max(MIN_SCALE, fixed));
    } catch {
      // Sans stockage : automatique.
    }
    if (this.fixed !== null) this.ratio = this.max * this.fixed;
    this.apply();
    // Zoom du navigateur, fenêtre passée sur un autre écran : la densité change, le plafond aussi.
    window.addEventListener('resize', () => {
      const max = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      if (max === this.max) return;
      this.ratio = this.fixed !== null ? max * this.fixed : Math.min(max, this.ratio * (max / this.max));
      this.max = max;
      this.apply();
    });
  }

  /** Netteté actuelle, en part de la définition de l'écran (1 : pleine définition). */
  get scale(): number {
    return this.ratio / this.max;
  }

  /** Netteté choisie par le joueur, ou null en automatique. */
  get fixedScale(): number | null {
    return this.fixed;
  }

  /** Fixe la netteté (`scale` : part de la définition de l'écran), ou la rend automatique (`null`). */
  setFixed(scale: number | null): void {
    this.fixed = scale === null ? null : Math.min(1, Math.max(MIN_SCALE, scale));
    try {
      if (this.fixed === null) localStorage.removeItem(FIXED_KEY);
      else localStorage.setItem(FIXED_KEY, this.fixed.toFixed(2));
    } catch {
      // Le réglage vaut pour cette session seulement.
    }
    this.frames = 0;
    this.time = 0;
    this.cpu = 0;
    this.trial = null;
    this.calm = 0;
    // Automatique : on repart de la pleine définition, elle ne baissera que si la carte graphique peine.
    this.ratio = this.max * (this.fixed ?? 1);
    this.apply();
  }

  /** Une image : `frameMs` depuis la précédente, `cpuMs` de calcul et de préparation du rendu. */
  sample(frameMs: number, cpuMs: number): void {
    if (this.fixed !== null) return;
    // Onglet caché, chargement, menu du navigateur : un trou n'est pas une mesure.
    if (frameMs > 100 || frameMs <= 0) return;
    this.frames++;
    this.time += frameMs;
    this.cpu += cpuMs;
    if (this.time < WINDOW * 1000) return;
    const frame = this.time / this.frames;
    const gpuBound = this.cpu / this.frames < frame * 0.7;
    this.frames = 0;
    this.time = 0;
    this.cpu = 0;

    if (frame > SLOW_MS && gpuBound) {
      if (this.trial !== null) {
        // L'essai de remontée était de trop : on revient, et on attendra deux fois plus avant le prochain.
        this.ratio = this.trial;
        this.patience = Math.min(120, this.patience * 2);
      } else {
        this.ratio = Math.max(this.max * AUTO_FLOOR, this.ratio * 0.85);
      }
      this.trial = null;
      this.calm = 0;
      this.apply();
      return;
    }
    this.trial = null;
    if (frame < FAST_MS && this.ratio < this.max) {
      this.calm += WINDOW;
      if (this.calm >= this.patience) {
        this.trial = this.ratio;
        this.ratio = Math.min(this.max, this.ratio * 1.12);
        this.calm = 0;
        this.apply();
      }
    } else {
      this.calm = 0;
    }
  }

  /**
   * Change la définition au début de l'image suivante, avant qu'elle soit dessinée : redimensionner le canevas
   * l'efface, et juste après le rendu l'écran montrait une image vide (un éclair du fond gris de la page).
   */
  private apply(): void {
    if (this.pending) return;
    this.pending = true;
    this.engine.onBeginFrameObservable.addOnce(() => {
      this.pending = false;
      // Babylon compte à l'envers : un niveau de 2 dessine un pixel pour deux pixels CSS.
      this.engine.setHardwareScalingLevel(1 / this.ratio);
    });
    if (this.fixed !== null) return;
    try {
      localStorage.setItem(STORAGE_KEY, this.ratio.toFixed(3));
    } catch {
      // Tant pis : on retrouvera la bonne définition en quelques secondes.
    }
  }
}
