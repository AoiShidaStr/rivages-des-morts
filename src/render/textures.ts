// Textures dessinées au canvas : sol, ombres, effets, et un héros provisoire en attendant son image.

export const PALETTE = {
  mist: '#c3cbcf',
  water: [92, 132, 136] as const,
  dirt: '#6e5c42',
  dike: '#5b4a33',
  sprout: '#86b25a',
  vermilion: '#c8412f',
  spirit: '#6ff3ff',
  ink: '#1d2226',
};

function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponible');
  return [canvas, ctx];
}

/** Générateur pseudo-aléatoire déterministe (mulberry32) : le sol est identique à chaque partie. */
function seeded(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Rizières inondées vues de dessus, alignées sur une grille de `cell` unités,
 * avec une diguette plus épaisse autour de l'arène et de la brume au-delà.
 */
export function drawGround(size: number, worldSize: number, arenaHalf: number, cell: number): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(size, size);
  const rand = seeded(7);
  const px = size / worldSize;
  const toPx = (u: number) => (u + worldSize / 2) * px;
  const border = 0.32 * px;

  ctx.fillStyle = PALETTE.dirt;
  ctx.fillRect(0, 0, size, size);

  const first = -Math.ceil(worldSize / 2 / cell) * cell;
  for (let gx = first; gx < worldSize / 2; gx += cell) {
    for (let gz = first; gz < worldSize / 2; gz += cell) {
      const x0 = toPx(gx) + border / 2;
      const z0 = toPx(gz) + border / 2;
      const side = cell * px - border;
      const shade = (rand() - 0.5) * 14;
      const [r, g, b] = PALETTE.water;
      ctx.fillStyle = `rgb(${r + shade}, ${g + shade}, ${b + shade})`;
      ctx.beginPath();
      ctx.roundRect(x0, z0, side, side, border * 0.8);
      ctx.fill();

      // Reflets de ciel sur l'eau
      ctx.strokeStyle = 'rgba(225, 238, 238, 0.2)';
      ctx.lineWidth = 2;
      for (let k = 0; k < 3; k++) {
        const y = z0 + side * (0.15 + rand() * 0.7);
        const x = x0 + side * (0.1 + rand() * 0.4);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + side * (0.15 + rand() * 0.3), y);
        ctx.stroke();
      }

      // Jeunes pousses plantées en rangées
      ctx.strokeStyle = PALETTE.sprout;
      ctx.lineWidth = 2;
      const rows = 4;
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < rows; j++) {
          const cx = x0 + (side * (i + 0.5)) / rows + (rand() - 0.5) * 4;
          const cy = z0 + (side * (j + 0.5)) / rows + (rand() - 0.5) * 4;
          for (let t = -1; t <= 1; t++) {
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + t * 4, cy - 7 - rand() * 3);
            ctx.stroke();
          }
        }
      }
    }
  }

  // Mousse sur les diguettes
  ctx.fillStyle = 'rgba(111, 125, 74, 0.35)';
  for (let k = 0; k < 900; k++) {
    ctx.beginPath();
    ctx.arc(rand() * size, rand() * size, 2 + rand() * 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Diguette qui borde l'arène
  ctx.strokeStyle = PALETTE.dike;
  ctx.lineWidth = border * 1.8;
  ctx.strokeRect(toPx(-arenaHalf), toPx(-arenaHalf), arenaHalf * 2 * px, arenaHalf * 2 * px);

  // Brume au-delà de l'arène
  const c = size / 2;
  const mist = ctx.createRadialGradient(c, c, (arenaHalf + 1.5) * px, c, c, (worldSize / 2) * px);
  mist.addColorStop(0, 'rgba(195, 203, 207, 0)');
  mist.addColorStop(1, 'rgba(195, 203, 207, 1)');
  ctx.fillStyle = mist;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

/** Tache douce, pour les ombres portées. */
export function drawRadial(size = 128): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(size, size);
  const c = size / 2;
  const gradient = ctx.createRadialGradient(c, c, 0, c, c, c);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.55, 'rgba(255, 255, 255, 0.6)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

/** Croissant ouvert vers +X : traînée d'un coup d'arme, ou garde levée. */
export function drawCrescent(size = 256, arcDeg = 120): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(size, size);
  const c = size / 2;
  const half = (arcDeg * Math.PI) / 360;
  const gradient = ctx.createRadialGradient(c, c, c * 0.45, c, c, c);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
  gradient.addColorStop(0.72, 'rgba(255, 255, 255, 0.95)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(c, c, c * 0.98, -half, half);
  ctx.arc(c, c, c * 0.45, half, -half, true);
  ctx.closePath();
  ctx.fill();
  return canvas;
}

/** Anneau lumineux, pour les impacts de zone. */
export function drawRing(size = 256): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(size, size);
  const c = size / 2;
  const gradient = ctx.createRadialGradient(c, c, c * 0.55, c, c, c);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
  gradient.addColorStop(0.75, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

/** Couloir fléché orienté vers +X : trajectoire annoncée d'une charge. */
export function drawTelegraph(width = 512, height = 96): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(width, height);
  const band = ctx.createLinearGradient(0, 0, 0, height);
  band.addColorStop(0, 'rgba(255, 255, 255, 0)');
  band.addColorStop(0.2, 'rgba(255, 255, 255, 0.7)');
  band.addColorStop(0.8, 'rgba(255, 255, 255, 0.7)');
  band.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = height * 0.12;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (let x = height * 0.6; x < width - height * 0.3; x += height * 0.9) {
    ctx.beginPath();
    ctx.moveTo(x, height * 0.28);
    ctx.lineTo(x + height * 0.28, height / 2);
    ctx.lineTo(x, height * 0.72);
    ctx.stroke();
  }
  return canvas;
}

/** Héros provisoire : une âme passeuse encapuchonnée, tournée vers la droite, un nodachi dans le dos. */
export function drawHeroPlaceholder(): HTMLCanvasElement {
  const w = 256;
  const h = 384;
  const [canvas, ctx] = makeCanvas(w, h);
  ctx.lineJoin = 'round';
  ctx.lineWidth = 7;
  ctx.strokeStyle = PALETTE.ink;

  const halo = ctx.createRadialGradient(w / 2, h * 0.45, 10, w / 2, h * 0.45, w * 0.5);
  halo.addColorStop(0, 'rgba(111, 243, 255, 0.35)');
  halo.addColorStop(1, 'rgba(111, 243, 255, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);

  // Nodachi porté dans le dos
  ctx.save();
  ctx.translate(w * 0.5, h * 0.48);
  ctx.rotate(-0.6);
  ctx.fillStyle = '#d9dde0';
  ctx.fillRect(-8, -h * 0.44, 16, h * 0.58);
  ctx.strokeRect(-8, -h * 0.44, 16, h * 0.58);
  ctx.fillStyle = '#7a3b2a';
  ctx.fillRect(-9, h * 0.14, 18, 62);
  ctx.strokeRect(-9, h * 0.14, 18, 62);
  ctx.restore();

  // Cape
  const cloak = ctx.createLinearGradient(0, h * 0.2, 0, h);
  cloak.addColorStop(0, '#eef2f1');
  cloak.addColorStop(1, '#9fb2bd');
  ctx.fillStyle = cloak;
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h * 0.1);
  ctx.bezierCurveTo(w * 0.8, h * 0.12, w * 0.8, h * 0.5, w * 0.86, h * 0.97);
  ctx.lineTo(w * 0.72, h * 0.93);
  ctx.lineTo(w * 0.62, h * 0.98);
  ctx.lineTo(w * 0.5, h * 0.93);
  ctx.lineTo(w * 0.38, h * 0.98);
  ctx.lineTo(w * 0.27, h * 0.93);
  ctx.lineTo(w * 0.14, h * 0.97);
  ctx.bezierCurveTo(w * 0.2, h * 0.5, w * 0.2, h * 0.12, w * 0.5, h * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Ceinture vermillon
  ctx.fillStyle = PALETTE.vermilion;
  ctx.beginPath();
  ctx.moveTo(w * 0.21, h * 0.56);
  ctx.lineTo(w * 0.79, h * 0.56);
  ctx.lineTo(w * 0.8, h * 0.62);
  ctx.lineTo(w * 0.2, h * 0.62);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Ouverture de la capuche et yeux d'âme
  ctx.fillStyle = '#1b2329';
  ctx.beginPath();
  ctx.ellipse(w * 0.57, h * 0.26, w * 0.17, h * 0.085, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.spirit;
  ctx.shadowColor = PALETTE.spirit;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(w * 0.55, h * 0.265, 7, 0, Math.PI * 2);
  ctx.arc(w * 0.67, h * 0.265, 7, 0, Math.PI * 2);
  ctx.fill();
  return canvas;
}

/** Remplaçant visible quand une image de sprite manque. */
export function drawMissing(label: string): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = 'rgba(200, 65, 47, 0.85)';
  ctx.beginPath();
  ctx.arc(128, 128, 110, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 128, 128);
  return canvas;
}
