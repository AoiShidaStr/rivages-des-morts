// Morceaux provisoires du pantin, dessinés au canvas tant que la planche de morceaux peinte n'est pas
// découpée (npm run pieces). Palette du héros : peau d'esprit cyan, cuir brun, fourrure grise, fer.

const INK = '#27303b';
const SKIN = '#bfe9ee';
const SKIN_SHADE = '#8fc9d3';
const LEATHER = '#8a5a3b';
const LEATHER_DARK = '#5f3c28';
const FUR = '#9aa1a6';
const FUR_LIGHT = '#c5cacc';
const IRON = '#7d8890';
const IRON_LIGHT = '#aab4ba';
const CLOTH = '#4a5159';
const BOOT = '#3a3230';
const BEARD = '#eef1f0';

type Ctx = CanvasRenderingContext2D;

/** Dessine le morceau `piece` dans un canvas de `w` × `h` pixels, le pivot aux fractions `pivot`. */
export function drawPuppetPart(piece: string, w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  const draw = PARTS[piece];
  if (draw) draw(ctx, w, h);
  return canvas;
}

const PARTS: Record<string, (ctx: Ctx, w: number, h: number) => void> = {
  tete(ctx, w, h) {
    // Visage rond, grands yeux, barbe tressée, casque rond à nasal.
    const cx = w * 0.46;
    const cy = h * 0.52;
    const r = w * 0.36;
    shape(ctx, SKIN, () => ctx.ellipse(cx, cy, r, r * 0.95, 0, 0, Math.PI * 2));
    shape(ctx, BEARD, () => {
      ctx.moveTo(cx - r * 0.2, cy + r * 0.3);
      ctx.quadraticCurveTo(cx + r * 0.9, cy + r * 0.2, cx + r * 0.75, cy + r * 0.55);
      ctx.quadraticCurveTo(cx + r * 0.5, cy + r * 1.25, cx + r * 0.05, cy + r * 1.3);
      ctx.quadraticCurveTo(cx - r * 0.25, cy + r * 0.9, cx - r * 0.2, cy + r * 0.3);
    });
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(cx + r * 0.55, cy + r * 0.02, r * 0.11, r * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx + r * 0.58, cy - r * 0.05, r * 0.04, 0, Math.PI * 2);
    ctx.fill();
    shape(ctx, IRON, () => {
      ctx.moveTo(cx - r * 1.05, cy - r * 0.05);
      ctx.bezierCurveTo(cx - r * 1.05, cy - r * 1.35, cx + r * 1.05, cy - r * 1.35, cx + r * 1.05, cy - r * 0.15);
      ctx.lineTo(cx - r * 1.05, cy - r * 0.05);
    });
    shape(ctx, IRON_LIGHT, () => ctx.rect(cx + r * 0.78, cy - r * 0.25, r * 0.16, r * 0.55));
    shape(ctx, IRON_LIGHT, () => ctx.rect(cx - r * 1.1, cy - r * 0.2, r * 2.2, r * 0.18));
  },
  torse(ctx, w, h) {
    shape(ctx, LEATHER, () => roundRect(ctx, w * 0.12, h * 0.12, w * 0.76, h * 0.84, w * 0.2));
    shape(ctx, LEATHER_DARK, () => ctx.rect(w * 0.12, h * 0.7, w * 0.76, h * 0.1));
    shape(ctx, IRON_LIGHT, () => ctx.rect(w * 0.5, h * 0.69, w * 0.14, h * 0.12));
    // Mantelet de fourrure en quelques grosses touffes.
    for (const [x, y, r] of [[0.25, 0.14, 0.24], [0.55, 0.1, 0.28], [0.8, 0.16, 0.2]] as const) {
      shape(ctx, FUR, () => ctx.arc(w * x, h * y + w * r, w * r, 0, Math.PI * 2));
    }
    ctx.fillStyle = FUR_LIGHT;
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.14 + w * 0.2, w * 0.1, 0, Math.PI * 2);
    ctx.fill();
  },
  bassin(ctx, w, h) {
    shape(ctx, CLOTH, () => roundRect(ctx, w * 0.1, h * 0.05, w * 0.8, h * 0.85, w * 0.18));
    shape(ctx, LEATHER_DARK, () => ctx.rect(w * 0.1, h * 0.05, w * 0.8, h * 0.25));
  },
  cape(ctx, w, h) {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#5d646c');
    grad.addColorStop(1, '#3b4148');
    shape(ctx, grad, () => {
      ctx.moveTo(w * 0.3, h * 0.03);
      ctx.lineTo(w * 0.7, h * 0.03);
      ctx.quadraticCurveTo(w * 0.95, h * 0.6, w * 0.9, h * 0.96);
      ctx.lineTo(w * 0.68, h * 0.9);
      ctx.lineTo(w * 0.5, h * 0.97);
      ctx.lineTo(w * 0.3, h * 0.9);
      ctx.lineTo(w * 0.1, h * 0.96);
      ctx.quadraticCurveTo(w * 0.05, h * 0.6, w * 0.3, h * 0.03);
    });
  },
  bras(ctx, w, h) {
    shape(ctx, FUR, () => roundRect(ctx, w * 0.1, h * 0.04, w * 0.8, h * 0.9, w * 0.4));
    ctx.fillStyle = FUR_LIGHT;
    ctx.beginPath();
    ctx.arc(w * 0.4, h * 0.22, w * 0.18, 0, Math.PI * 2);
    ctx.fill();
  },
  'avant-bras'(ctx, w, h) {
    shape(ctx, SKIN, () => roundRect(ctx, w * 0.14, h * 0.04, w * 0.72, h * 0.9, w * 0.36));
    shape(ctx, LEATHER, () => roundRect(ctx, w * 0.1, h * 0.5, w * 0.8, h * 0.4, w * 0.2));
  },
  main(ctx, w, h) {
    shape(ctx, SKIN, () => ctx.arc(w * 0.5, h * 0.52, w * 0.4, 0, Math.PI * 2));
    ctx.strokeStyle = SKIN_SHADE;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.62, h * 0.3);
    ctx.lineTo(w * 0.62, h * 0.74);
    ctx.stroke();
  },
  cuisse(ctx, w, h) {
    shape(ctx, CLOTH, () => roundRect(ctx, w * 0.1, h * 0.03, w * 0.8, h * 0.92, w * 0.4));
  },
  tibia(ctx, w, h) {
    shape(ctx, CLOTH, () => roundRect(ctx, w * 0.14, h * 0.03, w * 0.72, h * 0.6, w * 0.34));
    shape(ctx, BOOT, () => roundRect(ctx, w * 0.1, h * 0.5, w * 0.8, h * 0.47, w * 0.26));
    shape(ctx, FUR, () => roundRect(ctx, w * 0.06, h * 0.46, w * 0.88, h * 0.12, w * 0.06));
  },
  pied(ctx, w, h) {
    shape(ctx, BOOT, () => {
      ctx.moveTo(w * 0.12, h * 0.1);
      ctx.lineTo(w * 0.5, h * 0.1);
      ctx.quadraticCurveTo(w * 0.95, h * 0.3, w * 0.94, h * 0.9);
      ctx.lineTo(w * 0.1, h * 0.9);
      ctx.closePath();
    });
  },
};

function shape(ctx: Ctx, fill: string | CanvasGradient, path: () => void): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  path();
  ctx.fill();
  ctx.stroke();
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
}
