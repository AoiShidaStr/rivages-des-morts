import type { Engine } from '@babylonjs/core';

/**
 * Résolution adaptative : la définition du rendu suit ce que la carte graphique tient. Sur une petite carte, ou un
 * écran très dense (portable 4K, zoom Windows), le jeu dessine moins de pixels plutôt que de ralentir ; l'interface
 * (HTML) reste nette, seule la scène est un peu plus douce. La définition atteinte est gardée pour la prochaine fois.
 *
 * On ne baisse que si c'est la carte graphique qui peine : si c'est le calcul (le processeur) qui prend tout le temps
 * d'une image, moins de pixels n'y changerait rien.
 */

/** Au-delà de 1,5 pixel par pixel CSS, la différence ne se voit plus sur des images peintes ; le coût, si. */
export const MAX_PIXEL_RATIO = 1.5;
/** Plancher : en deçà, la scène deviendrait floue. */
const MIN_PIXEL_RATIO = 0.6;
/** Durée d'une mesure, en secondes d'images. */
const WINDOW = 1.5;
/** Images plus lentes que ça (moins de 50 par seconde) : on baisse. */
const SLOW_MS = 20;
/** Images au rythme de l'écran : on peut tenter de remonter, de temps en temps. */
const FAST_MS = 17.5;
const STORAGE_KEY = 'rivages-resolution';

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

  constructor(private readonly engine: Engine) {
    this.max = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    let saved = NaN;
    try {
      saved = Number(localStorage.getItem(STORAGE_KEY));
    } catch {
      // Sans stockage, on repart de la plus haute définition.
    }
    this.ratio = saved > 0 ? Math.min(this.max, Math.max(MIN_PIXEL_RATIO, saved)) : this.max;
    this.apply();
    // Zoom du navigateur, fenêtre passée sur un autre écran : la densité change, le plafond aussi.
    window.addEventListener('resize', () => {
      const max = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      if (max === this.max) return;
      this.ratio = Math.min(max, this.ratio * (max / this.max));
      this.max = max;
      this.apply();
    });
  }

  /** Une image : `frameMs` depuis la précédente, `cpuMs` de calcul et de préparation du rendu. */
  sample(frameMs: number, cpuMs: number): void {
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
        this.ratio = Math.max(MIN_PIXEL_RATIO, this.ratio * 0.85);
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
    try {
      localStorage.setItem(STORAGE_KEY, this.ratio.toFixed(3));
    } catch {
      // Tant pis : on retrouvera la bonne définition en quelques secondes.
    }
  }
}
