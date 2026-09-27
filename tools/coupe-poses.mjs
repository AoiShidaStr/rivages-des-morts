// Découpe d'une planche de poses clés (Nano Banana 2) en images séparées : partagé par `npm run poses`
// et `npm run kit-heros`.
//
// Chaque pose est posée seule au centre d'une image carrée, sur le gris du fond de la planche. Toutes les poses
// d'une planche gardent la même échelle, les pieds sur la même ligne et le corps sur le même axe : prises
// comme image de début et image de fin d'une vidéo, elles ne font pas sauter le personnage.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { alphaMask, borderMedian } from './decoupe.mjs';
import { profile, splitFrames } from './grille.mjs';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { defaults } = JSON.parse(await readFile(path.join(projectDir, 'tools', 'planches.json'), 'utf8'));

/** Ligne des pieds dans l'image carrée (fraction de la hauteur) : de la place au-dessus pour les sauts et les armes levées. */
const BASELINE = 0.86;
/** Marge minimale entre le sujet et le bord de l'image carrée (fraction du côté). */
const MARGIN = 0.05;

/**
 * Renvoie les poses de la planche, dans l'ordre de lecture (lignes de haut en bas, poses de gauche à droite) :
 * `{ layout, scale, images }`, `images` étant des PNG carrés de `size` pixels de côté.
 * `grid` (« 3x2 », colonnes × lignes) remplace la détection automatique.
 */
export async function cutPoses(input, { grid, size = 1024 } = {}) {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const layout = grid ? gridLayout(grid) : detectLayout(alphaMask(data, info.width, info.height, defaults), info.width, info.height);
  const frames = await splitFrames(input, { ...defaults, layout });
  const [r, g, b] = borderMedian(data, info.width, info.height);

  // Même échelle pour toutes les poses : la plus grande tient dans le carré, de part et d'autre de l'axe.
  const half = Math.max(...frames.map((f) => Math.max(f.anchorX, f.width - f.anchorX)));
  const above = Math.max(...frames.map((f) => f.baseline));
  const below = Math.max(...frames.map((f) => f.height - f.baseline));
  const scale = Math.min((size * (0.5 - MARGIN)) / half, (size * (BASELINE - MARGIN)) / above, (size * (1 - BASELINE - MARGIN)) / Math.max(1, below));

  const images = [];
  for (const f of frames) {
    const width = Math.max(1, Math.round(f.width * scale));
    const height = Math.max(1, Math.round(f.height * scale));
    const figure = await sharp(f.rgba, { raw: { width: f.width, height: f.height, channels: 4 } })
      .resize(width, height, { kernel: 'lanczos3' })
      .png()
      .toBuffer();
    images.push(
      await sharp({ create: { width: size, height: size, channels: 3, background: { r, g, b } } })
        .composite([{ input: figure, left: Math.round(size / 2 - f.anchorX * scale), top: Math.round(size * BASELINE - f.baseline * scale) }])
        .png()
        .toBuffer(),
    );
  }
  return { layout, scale, images };
}

function gridLayout(text) {
  const [columns, rows] = text.split('x').map(Number);
  if (!columns || !rows) throw new Error(`--grille ${text} : attendu colonnes x lignes, par exemple 3x2`);
  return Array(rows).fill(columns);
}

/**
 * Nombre de poses par ligne, lu sur la planche. Les pieds d'une ligne descendent souvent au niveau des armes
 * levées de la suivante, et une lame passe parfois chez la voisine : on ne cherche pas des bandes vides, mais
 * les creux du profil (peu de sujet), entre des bosses (les poses).
 */
function detectLayout(alpha, w, h) {
  const rows = humps(profile(alpha, w, h, { x0: 0, x1: w, y0: 0, y1: h }, 'rows'), 0.2);
  return rows.map(([y0, y1]) => humps(profile(alpha, w, h, { x0: 0, x1: w, y0, y1 }, 'columns'), 0.15).length);
}

/**
 * Bosses d'un profil : plages où le profil lissé dépasse `threshold` fois son maximum. Une bosse beaucoup plus
 * légère que les autres (flèche en vol, bout de cape) n'est pas une pose.
 */
function humps({ values, offset }, threshold) {
  const radius = Math.max(2, Math.round(values.length * 0.008));
  const prefix = new Float64Array(values.length + 1);
  values.forEach((v, k) => (prefix[k + 1] = prefix[k] + v));
  const smooth = Array.from(values, (_, k) => {
    const a = Math.max(0, k - radius);
    const b = Math.min(values.length, k + radius + 1);
    return (prefix[b] - prefix[a]) / (b - a);
  });
  const limit = Math.max(...smooth) * threshold;
  const found = [];
  let start = -1;
  for (let k = 0; k <= smooth.length; k++) {
    const above = k < smooth.length && smooth[k] > limit;
    if (above && start < 0) start = k;
    if (!above && start >= 0) {
      found.push({ from: offset + start, to: offset + k, mass: prefix[k] - prefix[start] });
      start = -1;
    }
  }
  const masses = found.map((f) => f.mass).sort((a, b) => a - b);
  const typical = masses[masses.length >> 1];
  return found.filter((f) => f.mass >= typical * 0.25).map((f) => [f.from, f.to]);
}

/** Nom de chaque pose : face-1…, dos-1… pour une planche face et dos sur deux lignes, sinon pose-1, pose-2… */
export function poseNames(sheet, layout) {
  if (/face-dos/i.test(sheet) && layout.length === 2) {
    return [...Array.from({ length: layout[0] }, (_, i) => `face-${i + 1}`), ...Array.from({ length: layout[1] }, (_, i) => `dos-${i + 1}`)];
  }
  let n = 0;
  return layout.flatMap((count) => Array.from({ length: count }, () => `pose-${++n}`));
}

/** Toutes les poses en vignettes numérotées, rangées comme sur la planche. */
export async function writeOverview(images, names, layout, file) {
  const cell = 256;
  const columns = Math.max(...layout);
  const composites = [];
  let i = 0;
  for (const [r, count] of layout.entries()) {
    for (let c = 0; c < count; c++, i++) {
      const input = await sharp(images[i]).resize(cell, cell).toBuffer();
      const label = Buffer.from(
        `<svg width="${cell}" height="30"><rect width="${cell}" height="30" fill="#000" fill-opacity="0.55"/><text x="8" y="21" font-family="sans-serif" font-size="18" fill="#fff">${names[i]}</text></svg>`,
      );
      composites.push({ input, left: c * cell, top: r * cell }, { input: label, left: c * cell, top: r * cell });
    }
  }
  await sharp({ create: { width: columns * cell, height: layout.length * cell, channels: 3, background: '#888' } })
    .composite(composites)
    .jpeg({ quality: 85 })
    .toFile(file);
}
