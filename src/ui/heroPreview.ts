import { heroSheet, type HeroLook } from '../render/pixelHero';
import { h } from './dom';

/**
 * Aperçu animé du héros en pixel art (race, classe, équipement), agrandi sans lissage : écran de création,
 * inventaire. `cycle` fait défiler plusieurs postures pour montrer l'arme en action.
 */
export class HeroPreview {
  readonly el: HTMLDivElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private look: HeroLook | null = null;
  private start = 0;
  private running = false;

  constructor(
    private readonly scale: number,
    private readonly cycle: string[] = ['idle'],
    /** Durée de chaque posture du cycle, en secondes. */
    private readonly hold = 1.6,
  ) {
    this.canvas = h('canvas', { class: 'hero-preview-canvas' });
    this.ctx = this.canvas.getContext('2d')!;
    this.el = h('div', { class: 'hero-preview' }, this.canvas);
  }

  /** Change l'apparence montrée ; l'animation repart du début si elle a changé. */
  show(look: HeroLook): void {
    const same = this.look && JSON.stringify(this.look) === JSON.stringify(look);
    this.look = look;
    if (!same) this.start = performance.now();
    if (!this.running) {
      this.running = true;
      requestAnimationFrame(this.tick);
    }
  }

  private readonly tick = (now: number): void => {
    // L'aperçu s'arrête tout seul quand il quitte la page (panneau fermé, écran suivant).
    if (!this.el.isConnected || !this.look) {
      this.running = false;
      return;
    }
    this.draw((now - this.start) / 1000);
    requestAnimationFrame(this.tick);
  };

  private draw(time: number): void {
    const { canvas: sheet, sheet: data } = heroSheet(this.look!);
    const tagName = this.cycle[Math.floor(time / this.hold) % this.cycle.length];
    const tag = data.meta.frameTags?.find((t) => t.name === tagName) ?? data.meta.frameTags?.[0];
    const frames = data.frames.slice(tag?.from ?? 0, (tag?.to ?? 0) + 1);
    // Temps écoulé dans la posture : une animation qui ne boucle pas reste sur sa dernière image.
    let t = (time % this.hold) * 1000;
    let frame = frames[frames.length - 1];
    const loops = tag?.repeat !== '1';
    const total = frames.reduce((sum, f) => sum + f.duration, 0);
    if (loops) t %= Math.max(1, total);
    for (const f of frames) {
      if (t < f.duration) {
        frame = f;
        break;
      }
      t -= f.duration;
    }
    const { x, y, w, h: height } = frame.frame;
    if (this.canvas.width !== w * this.scale) {
      this.canvas.width = w * this.scale;
      this.canvas.height = height * this.scale;
    }
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(sheet, x, y, w, height, 0, 0, w * this.scale, height * this.scale);
  }
}
