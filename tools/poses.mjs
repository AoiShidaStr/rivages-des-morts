// Découpe les planches de poses clés (Nano Banana 2) en images séparées, prêtes pour Kling.
//
// Chaque pose est posée seule au centre d'une image carrée, sur le gris du fond de la planche. Toutes les poses
// d'une planche gardent la même échelle, les pieds sur la même ligne et le corps sur le même axe : prises
// comme image de début et image de fin d'une vidéo, elles ne font pas sauter le personnage.
//
// Usage : npm run poses -- <planche ou dossier>...
//         --grille 3x2    colonnes × lignes, si la détection automatique se trompe (figures qui se touchent)
//         --taille 1024   côté des images carrées
//         --sortie <dossier>   par défaut, le dossier poses/ à côté de la planche
//
// Sortie : poses/<planche>/pose-1.png, pose-2.png… dans l'ordre de lecture (lignes de haut en bas, poses de
// gauche à droite), et poses/<planche>/apercu.jpg avec les numéros. Une planche nommée *face-dos* sur deux
// lignes donne face-1…, dos-1… à la place.
import { mkdir, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { alphaMask, borderMedian } from './decoupe.mjs';
import { profile, splitFrames } from './grille.mjs';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { defaults } = JSON.parse(await readFile(path.join(projectDir, 'tools', 'planches.json'), 'utf8'));

const args = process.argv.slice(2);
const option = (name) => {
  const at = args.indexOf(name);
  return at >= 0 ? args.splice(at, 2)[1] : undefined;
};
const grid = option('--grille');
const size = Number(option('--taille') ?? 1024);
const outRoot = option('--sortie');
if (args.length === 0) {
  console.error('Usage : npm run poses -- <planche ou dossier>... [--grille 3x2] [--taille 1024] [--sortie dossier]');
  process.exit(1);
}

/** Ligne des pieds dans l'image carrée (fraction de la hauteur) : de la place au-dessus pour les sauts et les armes levées. */
const BASELINE = 0.86;
/** Marge minimale entre le sujet et le bord de l'image carrée (fraction du côté). */
const MARGIN = 0.05;

for (const input of await sheets(args)) {
  const name = path.basename(input, path.extname(input));
  const outDir = path.join(outRoot ?? path.join(path.dirname(input), 'poses'), name);
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const layout = grid ? gridLayout(grid) : detectLayout(alphaMask(data, info.width, info.height, defaults), info.width, info.height);
  const frames = await splitFrames(input, { ...defaults, layout });
  const [r, g, b] = borderMedian(data, info.width, info.height);
  const names = poseNames(name, layout);

  // Même échelle pour toutes les poses : la plus grande tient dans le carré, de part et d'autre de l'axe.
  const half = Math.max(...frames.map((f) => Math.max(f.anchorX, f.width - f.anchorX)));
  const above = Math.max(...frames.map((f) => f.baseline));
  const below = Math.max(...frames.map((f) => f.height - f.baseline));
  const scale = Math.min((size * (0.5 - MARGIN)) / half, (size * (BASELINE - MARGIN)) / above, (size * (1 - BASELINE - MARGIN)) / Math.max(1, below));

  await mkdir(outDir, { recursive: true });
  const thumbs = [];
  for (const [i, f] of frames.entries()) {
    const width = Math.max(1, Math.round(f.width * scale));
    const height = Math.max(1, Math.round(f.height * scale));
    const figure = await sharp(f.rgba, { raw: { width: f.width, height: f.height, channels: 4 } })
      .resize(width, height, { kernel: 'lanczos3' })
      .png()
      .toBuffer();
    const file = path.join(outDir, `${names[i]}.png`);
    await sharp({ create: { width: size, height: size, channels: 3, background: { r, g, b } } })
      .composite([{ input: figure, left: Math.round(size / 2 - f.anchorX * scale), top: Math.round(size * BASELINE - f.baseline * scale) }])
      .png()
      .toFile(file);
    thumbs.push({ file, label: names[i] });
  }
  await writeOverview(thumbs, layout, path.join(outDir, 'apercu.jpg'));
  console.log(`${path.basename(input)} : ${layout.join(' + ')} poses (${Math.round(scale * 100)} %) → ${outDir}`);
}

/** Les planches à traiter : les images données, et celles des dossiers donnés (sans descendre dans poses/). */
async function sheets(paths) {
  const found = [];
  for (const p of paths) {
    if ((await stat(p)).isDirectory()) {
      for (const entry of (await readdir(p)).sort()) if (/\.(jpe?g|png|webp)$/i.test(entry)) found.push(path.join(p, entry));
    } else {
      found.push(p);
    }
  }
  return found;
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

function poseNames(sheet, layout) {
  if (/face-dos/i.test(sheet) && layout.length === 2) {
    return [...Array.from({ length: layout[0] }, (_, i) => `face-${i + 1}`), ...Array.from({ length: layout[1] }, (_, i) => `dos-${i + 1}`)];
  }
  return layout.flatMap((_, r) => Array.from({ length: layout[r] }, (__, c) => `pose-${layout.slice(0, r).reduce((a, n) => a + n, 0) + c + 1}`));
}

/** Toutes les poses en vignettes numérotées, rangées comme sur la planche. */
async function writeOverview(thumbs, layout, file) {
  const cell = 256;
  const columns = Math.max(...layout);
  const composites = [];
  let i = 0;
  for (const [r, count] of layout.entries()) {
    for (let c = 0; c < count; c++, i++) {
      const input = await sharp(thumbs[i].file).resize(cell, cell).toBuffer();
      const label = Buffer.from(
        `<svg width="${cell}" height="30"><rect width="${cell}" height="30" fill="#000" fill-opacity="0.55"/><text x="8" y="21" font-family="sans-serif" font-size="18" fill="#fff">${thumbs[i].label}</text></svg>`,
      );
      composites.push({ input, left: c * cell, top: r * cell }, { input: label, left: c * cell, top: r * cell });
    }
  }
  await sharp({ create: { width: columns * cell, height: layout.length * cell, channels: 3, background: '#888' } })
    .composite(composites)
    .jpeg({ quality: 85 })
    .toFile(file);
}
