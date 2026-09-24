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

/** Toile d'araignée vue de dessus, blanche pour être teintée : rayons et spirale irrégulière. */
export function drawWeb(size = 256): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(size, size);
  const rand = seeded(13);
  const c = size / 2;
  const spokes = 9;
  const angles = Array.from({ length: spokes }, (_, i) => (i / spokes) * Math.PI * 2 + (rand() - 0.5) * 0.3);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineCap = 'round';
  ctx.lineWidth = 3;
  for (const a of angles) {
    ctx.beginPath();
    ctx.moveTo(c, c);
    ctx.lineTo(c + Math.cos(a) * c * 0.97, c + Math.sin(a) * c * 0.97);
    ctx.stroke();
  }
  ctx.lineWidth = 2;
  for (let ring = 1; ring <= 6; ring++) {
    const r = (ring / 6.4) * c;
    ctx.globalAlpha = 1 - ring * 0.08;
    ctx.beginPath();
    angles.forEach((a, i) => {
      const rr = r * (0.9 + rand() * 0.15);
      const x = c + Math.cos(a) * rr;
      const y = c + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.quadraticCurveTo(c + Math.cos(a - 0.35) * rr * 0.9, c + Math.sin(a - 0.35) * rr * 0.9, x, y);
    });
    ctx.closePath();
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const glow = ctx.createRadialGradient(c, c, 0, c, c, c);
  glow.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
  glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

/** Pattes d'araignée : paires de segments articulés partant de (x, y), vers la droite puis la gauche. */
function drawLegs(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  span: number,
  rise: number,
  pairs: number,
  width: number,
): void {
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < pairs; i++) {
    const spread = (i - (pairs - 1) / 2) / pairs;
    for (const side of [1, -1]) {
      const kneeX = x + side * span * (0.45 + Math.abs(spread) * 0.3);
      const kneeY = y - rise * (0.8 - Math.abs(spread) * 0.4);
      const footX = x + side * span * (0.75 + spread * side * 0.5);
      ctx.beginPath();
      ctx.moveTo(x + side * span * 0.08, y + spread * rise * 0.3);
      ctx.lineTo(kneeX, kneeY);
      ctx.lineTo(footX, y + rise * 0.55);
      ctx.stroke();
    }
  }
}

/** Jorōgumo, forme humaine provisoire : kimono noir et cramoisi, longs cheveux, éventail, pattes cachées. */
export function drawJorogumo(): HTMLCanvasElement {
  const w = 256;
  const h = 416;
  const [canvas, ctx] = makeCanvas(w, h);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = PALETTE.ink;

  // Pattes qui dépassent du kimono
  ctx.strokeStyle = '#2a1016';
  drawLegs(ctx, w * 0.5, h * 0.62, w * 0.62, h * 0.12, 3, 7);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 6;

  // Cheveux dans le dos
  ctx.fillStyle = '#121014';
  ctx.beginPath();
  ctx.moveTo(w * 0.42, h * 0.1);
  ctx.bezierCurveTo(w * 0.2, h * 0.2, w * 0.24, h * 0.55, w * 0.3, h * 0.7);
  ctx.lineTo(w * 0.52, h * 0.66);
  ctx.bezierCurveTo(w * 0.5, h * 0.4, w * 0.62, h * 0.2, w * 0.56, h * 0.1);
  ctx.closePath();
  ctx.fill();

  // Kimono
  const robe = ctx.createLinearGradient(0, h * 0.2, 0, h);
  robe.addColorStop(0, '#2a1a22');
  robe.addColorStop(1, '#0f0b10');
  ctx.fillStyle = robe;
  ctx.beginPath();
  ctx.moveTo(w * 0.42, h * 0.24);
  ctx.lineTo(w * 0.64, h * 0.24);
  ctx.bezierCurveTo(w * 0.72, h * 0.45, w * 0.74, h * 0.75, w * 0.82, h * 0.97);
  ctx.lineTo(w * 0.2, h * 0.97);
  ctx.bezierCurveTo(w * 0.28, h * 0.75, w * 0.32, h * 0.45, w * 0.42, h * 0.24);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Motif de toile sur le kimono
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(200, 65, 47, 0.55)';
  ctx.lineWidth = 2;
  for (let r = 20; r < 160; r += 22) {
    ctx.beginPath();
    ctx.arc(w * 0.3, h * 0.92, r, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }
  for (let a = 1.1; a < 1.95; a += 0.17) {
    ctx.beginPath();
    ctx.moveTo(w * 0.3, h * 0.92);
    ctx.lineTo(w * 0.3 + Math.cos(a * Math.PI) * 170, h * 0.92 + Math.sin(a * Math.PI) * 170);
    ctx.stroke();
  }
  ctx.restore();

  // Obi cramoisi
  ctx.fillStyle = '#9e1f2b';
  ctx.fillRect(w * 0.33, h * 0.44, w * 0.38, h * 0.07);
  ctx.strokeRect(w * 0.33, h * 0.44, w * 0.38, h * 0.07);

  // Col croisé
  ctx.strokeStyle = '#c8412f';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(w * 0.45, h * 0.24);
  ctx.lineTo(w * 0.56, h * 0.4);
  ctx.lineTo(w * 0.63, h * 0.24);
  ctx.stroke();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 6;

  // Visage pâle, tourné vers la droite
  ctx.fillStyle = '#efe6e2';
  ctx.beginPath();
  ctx.ellipse(w * 0.55, h * 0.16, w * 0.1, h * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#121014';
  ctx.beginPath();
  ctx.ellipse(w * 0.52, h * 0.115, w * 0.12, h * 0.04, -0.2, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c8412f';
  ctx.shadowColor = '#ff3b30';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(w * 0.6, h * 0.16, 4, 0, Math.PI * 2);
  ctx.arc(w * 0.52, h * 0.16, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Éventail ouvert dans la main droite
  ctx.save();
  ctx.translate(w * 0.76, h * 0.4);
  ctx.rotate(-0.5);
  ctx.fillStyle = '#1a1216';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, w * 0.2, -Math.PI * 0.95, -Math.PI * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#c8412f';
  ctx.lineWidth = 2;
  for (let a = -0.9; a <= -0.1; a += 0.16) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a * Math.PI) * w * 0.2, Math.sin(a * Math.PI) * w * 0.2);
    ctx.stroke();
  }
  ctx.restore();
  return canvas;
}

/** Jorōgumo, vraie forme provisoire : grande araignée noire et cramoisie d'où sort un buste de femme. */
export function drawJorogumoSpider(): HTMLCanvasElement {
  const w = 448;
  const h = 384;
  const [canvas, ctx] = makeCanvas(w, h);
  ctx.lineJoin = 'round';

  ctx.strokeStyle = '#1a0c10';
  drawLegs(ctx, w * 0.45, h * 0.66, w * 0.5, h * 0.3, 4, 12);
  ctx.strokeStyle = '#9e1f2b';
  drawLegs(ctx, w * 0.45, h * 0.66, w * 0.5, h * 0.3, 4, 3);

  // Abdomen
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 6;
  const belly = ctx.createRadialGradient(w * 0.3, h * 0.6, 10, w * 0.32, h * 0.64, w * 0.24);
  belly.addColorStop(0, '#3a1a24');
  belly.addColorStop(1, '#0e080b');
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.ellipse(w * 0.32, h * 0.64, w * 0.22, h * 0.19, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Motif de kimono sur la carapace
  ctx.strokeStyle = '#c8412f';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(w * 0.18, h * 0.6);
  ctx.lineTo(w * 0.3, h * 0.52);
  ctx.lineTo(w * 0.42, h * 0.6);
  ctx.lineTo(w * 0.3, h * 0.74);
  ctx.closePath();
  ctx.stroke();

  // Céphalothorax
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 6;
  ctx.fillStyle = '#1c0f14';
  ctx.beginPath();
  ctx.ellipse(w * 0.56, h * 0.64, w * 0.12, h * 0.11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Buste de femme
  ctx.fillStyle = '#2a1a22';
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h * 0.58);
  ctx.lineTo(w * 0.52, h * 0.3);
  ctx.lineTo(w * 0.64, h * 0.3);
  ctx.lineTo(w * 0.64, h * 0.58);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#121014';
  ctx.beginPath();
  ctx.moveTo(w * 0.53, h * 0.14);
  ctx.bezierCurveTo(w * 0.42, h * 0.2, w * 0.44, h * 0.4, w * 0.47, h * 0.52);
  ctx.lineTo(w * 0.55, h * 0.45);
  ctx.lineTo(w * 0.6, h * 0.14);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#efe6e2';
  ctx.beginPath();
  ctx.ellipse(w * 0.6, h * 0.21, w * 0.055, h * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ff3b30';
  ctx.shadowColor = '#ff3b30';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(w * 0.62, h * 0.21, 4, 0, Math.PI * 2);
  ctx.arc(w * 0.585, h * 0.21, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Fils qui pendent
  ctx.strokeStyle = 'rgba(235, 240, 245, 0.7)';
  ctx.lineWidth = 2;
  for (const x of [0.2, 0.3, 0.4]) {
    ctx.beginPath();
    ctx.moveTo(w * x, h * 0.78);
    ctx.lineTo(w * x + 4, h * 0.95);
    ctx.stroke();
  }
  return canvas;
}

/** Petite araignée provisoire, tournée vers la droite. */
export function drawSpider(): HTMLCanvasElement {
  const w = 192;
  const h = 128;
  const [canvas, ctx] = makeCanvas(w, h);
  ctx.strokeStyle = '#140a0d';
  drawLegs(ctx, w * 0.5, h * 0.6, w * 0.5, h * 0.35, 4, 6);
  ctx.lineWidth = 4;
  ctx.strokeStyle = PALETTE.ink;
  ctx.fillStyle = '#1e0f14';
  ctx.beginPath();
  ctx.ellipse(w * 0.4, h * 0.58, w * 0.18, h * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#9e1f2b';
  ctx.beginPath();
  ctx.ellipse(w * 0.4, h * 0.55, w * 0.06, h * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1e0f14';
  ctx.beginPath();
  ctx.ellipse(w * 0.62, h * 0.6, w * 0.09, h * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ff3b30';
  ctx.shadowColor = '#ff3b30';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(w * 0.67, h * 0.55, 3, 0, Math.PI * 2);
  ctx.arc(w * 0.64, h * 0.52, 3, 0, Math.PI * 2);
  ctx.fill();
  return canvas;
}

/** Vieille souche humide provisoire, entourée de quelques fils. */
export function drawStump(): HTMLCanvasElement {
  const w = 224;
  const h = 192;
  const [canvas, ctx] = makeCanvas(w, h);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 6;
  const bark = ctx.createLinearGradient(w * 0.2, 0, w * 0.8, 0);
  bark.addColorStop(0, '#3b2a1c');
  bark.addColorStop(0.5, '#5a4128');
  bark.addColorStop(1, '#2e2016');
  ctx.fillStyle = bark;
  ctx.beginPath();
  ctx.moveTo(w * 0.04, h * 0.96);
  ctx.quadraticCurveTo(w * 0.2, h * 0.86, w * 0.26, h * 0.62);
  ctx.lineTo(w * 0.28, h * 0.22);
  ctx.lineTo(w * 0.72, h * 0.22);
  ctx.lineTo(w * 0.74, h * 0.62);
  ctx.quadraticCurveTo(w * 0.8, h * 0.86, w * 0.96, h * 0.96);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#8a6b45';
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.22, w * 0.22, h * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#6b5234';
  ctx.lineWidth = 2;
  for (const r of [0.14, 0.08]) {
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.22, w * r, h * r * 0.36, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(235, 240, 245, 0.75)';
  ctx.lineWidth = 2;
  for (const y of [0.4, 0.5, 0.62]) {
    ctx.beginPath();
    ctx.moveTo(w * 0.27, h * y);
    ctx.quadraticCurveTo(w * 0.5, h * (y + 0.07), w * 0.73, h * (y - 0.03));
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(111, 125, 74, 0.8)';
  for (const [x, y] of [[0.3, 0.8], [0.66, 0.72], [0.45, 0.9]]) {
    ctx.beginPath();
    ctx.arc(w * x, h * y, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}
