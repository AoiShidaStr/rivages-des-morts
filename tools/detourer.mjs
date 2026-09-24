// Détoure les images générées par Nano Banana (fond gris presque uni) et les enregistre
// en PNG transparents dans public/sprites, recadrées au plus près du sujet.
//
// Usage : npm run sprites            → toutes les entrées de tools/sprites.json
//         npm run sprites -- kappa   → seulement « kappa »
//
// Limite : un sujet gris peu saturé (l'Oublié, par exemple) se confond avec le fond.
// Pour ceux-là, détourer à la main (Paint : « Supprimer l'arrière-plan ») et déposer le PNG dans public/sprites.
import { mkdir, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await readFile(path.join(projectDir, 'tools', 'sprites.json'), 'utf8'));
const sourceDir = config.sourceDir.replace(/^~(?=$|[\\/])/, os.homedir());
const outDir = path.join(projectDir, config.outDir);
const only = process.argv.slice(2);

await mkdir(outDir, { recursive: true });
for (const sprite of config.sprites) {
  if (only.length > 0 && !only.includes(sprite.name)) continue;
  const input = path.join(sourceDir, sprite.source);
  const output = path.join(outDir, `${sprite.name}.png`);
  const { width, height } = await cutOut(input, output, { ...config.defaults, ...sprite });
  console.log(`${sprite.name.padEnd(10)} ${sprite.source} → ${path.relative(projectDir, output)} (${width}×${height})`);
}

async function cutOut(input, output, options) {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const background = floodBackground(data, w, h, options);

  const alpha = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) alpha[i] = background[i] ? 0 : 255;
  removeSmallParts(alpha, w, h, options.minPartRatio);
  softenEdges(alpha, w, h);

  const box = boundingBox(alpha, w, h, options.padding);
  if (!box) throw new Error(`${input} : aucun sujet trouvé, le fond n'a pas été reconnu`);

  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    rgba[i * 4] = data[i * 3];
    rgba[i * 4 + 1] = data[i * 3 + 1];
    rgba[i * 4 + 2] = data[i * 3 + 2];
    rgba[i * 4 + 3] = alpha[i];
  }
  return sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .extract(box)
    .resize({ width: options.maxSize, height: options.maxSize, fit: 'inside', withoutEnlargement: true })
    .png()
    .toFile(output);
}

/**
 * Remplit le fond depuis les bords de l'image. Un pixel est du fond s'il est gris,
 * proche de la couleur des bords, et proche du pixel voisin déjà reconnu (le fond a un léger dégradé).
 */
function floodBackground(data, w, h, options) {
  const { tolerance, localTolerance, maxSaturation, fillHoles, holeTolerance = 8, minHole = 300 } = options;
  const background = new Uint8Array(w * h);
  const ref = borderMedian(data, w, h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;

  const greyWithin = (i, maxGap, maxSat) => {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    const saturation = Math.max(r, g, b) - Math.min(r, g, b);
    const gap = Math.abs(r - ref[0]) + Math.abs(g - ref[1]) + Math.abs(b - ref[2]);
    return saturation <= maxSat && gap <= maxGap * 3;
  };
  const close = (i, j) =>
    Math.abs(data[i * 3] - data[j * 3]) +
      Math.abs(data[i * 3 + 1] - data[j * 3 + 1]) +
      Math.abs(data[i * 3 + 2] - data[j * 3 + 2]) <=
    localTolerance;
  let accepts = (i) => greyWithin(i, tolerance, maxSaturation);

  const seed = (i) => {
    if (!background[i] && accepts(i)) {
      background[i] = 1;
      queue[tail++] = i;
    }
  };
  const visit = (from, to) => {
    if (!background[to] && accepts(to) && close(from, to)) {
      background[to] = 1;
      queue[tail++] = to;
    }
  };
  const spread = () => {
    while (head < tail) {
      const i = queue[head++];
      const x = i % w;
      if (x > 0) visit(i, i - 1);
      if (x < w - 1) visit(i, i + 1);
      if (i >= w) visit(i, i - w);
      if (i < (h - 1) * w) visit(i, i + w);
    }
  };

  for (let x = 0; x < w; x++) {
    seed(x);
    seed((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    seed(y * w);
    seed(y * w + w - 1);
  }
  spread();

  // Fond enfermé par le sujet (entre les poutres d'un torii, par exemple). On n'accepte ici que le gris
  // presque exact du fond, et seulement en grandes poches, pour ne pas percer les parties grises du sujet.
  if (fillHoles) {
    accepts = (i) => greyWithin(i, holeTolerance, maxSaturation / 2);
    for (let start = 0; start < w * h; start++) {
      if (background[start] || !accepts(start)) continue;
      const first = tail;
      seed(start);
      spread();
      // Poche trop petite : c'est un détail du sujet. Marquée 2 pour ne pas être revisitée, puis rendue.
      if (tail - first < minHole) for (let k = first; k < tail; k++) background[queue[k]] = 2;
    }
    for (let i = 0; i < w * h; i++) if (background[i] === 2) background[i] = 0;
  }
  return background;
}

function borderMedian(data, w, h) {
  const channels = [[], [], []];
  const take = (i) => channels.forEach((values, c) => values.push(data[i * 3 + c]));
  for (let x = 0; x < w; x += 4) {
    take(x);
    take((h - 1) * w + x);
  }
  for (let y = 0; y < h; y += 4) {
    take(y * w);
    take(y * w + w - 1);
  }
  return channels.map((values) => values.sort((a, b) => a - b)[values.length >> 1]);
}

/** Supprime les petits îlots détachés du sujet (gouttes d'eau, étincelles, poussière). */
function removeSmallParts(alpha, w, h, minRatio) {
  const labels = new Int32Array(w * h).fill(-1);
  const sizes = [];
  const stack = new Int32Array(w * h);
  for (let start = 0; start < w * h; start++) {
    if (!alpha[start] || labels[start] !== -1) continue;
    const label = sizes.length;
    let top = 0;
    let size = 0;
    stack[top++] = start;
    labels[start] = label;
    while (top > 0) {
      const i = stack[--top];
      size++;
      const x = i % w;
      const neighbours = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i >= w ? i - w : -1, i < (h - 1) * w ? i + w : -1];
      for (const j of neighbours) {
        if (j >= 0 && alpha[j] && labels[j] === -1) {
          labels[j] = label;
          stack[top++] = j;
        }
      }
    }
    sizes.push(size);
  }
  const largest = sizes.reduce((max, size) => Math.max(max, size), 0);
  for (let i = 0; i < w * h; i++) {
    if (labels[i] >= 0 && sizes[labels[i]] < largest * minRatio) alpha[i] = 0;
  }
}

/** Adoucit le contour d'un pixel pour éviter l'effet d'escalier. */
function softenEdges(alpha, w, h) {
  const edges = [];
  for (let i = 0; i < w * h; i++) {
    if (!alpha[i]) continue;
    const x = i % w;
    const touchesBackground =
      (x > 0 && !alpha[i - 1]) || (x < w - 1 && !alpha[i + 1]) || (i >= w && !alpha[i - w]) || (i < (h - 1) * w && !alpha[i + w]);
    if (touchesBackground) edges.push(i);
  }
  for (const i of edges) alpha[i] = 150;
}

function boundingBox(alpha, w, h, padding) {
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!alpha[y * w + x]) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  const left = Math.max(0, minX - padding);
  const top = Math.max(0, minY - padding);
  return {
    left,
    top,
    width: Math.min(w, maxX + padding + 1) - left,
    height: Math.min(h, maxY + padding + 1) - top,
  };
}
