// Découpe les icônes peintes des objets (planche de Nano Banana, voir « Prompt objets.md ») en PNG carrés
// transparents pour l'interface : public/sprites/icones/<id>.png.
//
// Usage : npm run icones
// Réglages : tools/icones.json (planches sources, objet de chaque case, retouches par icône).
//
// Chaque morceau détouré revient à la case de la grille qui contient son centre. Autour de l'objet,
// on retire le gris du fond au lieu de couper net (le « couleur vers alpha » de GIMP) : les halos peints
// (magatama, braise, sève…) et les bords adoucis restent en demi-transparence sur le papier de l'interface.
import { access, mkdir, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { borderMedian, components, floodBackground } from './decoupe.mjs';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await readFile(path.join(projectDir, 'tools', 'icones.json'), 'utf8'));
const sourceDir = config.sourceDir.replace(/^~(?=$|[\\/])/, os.homedir());
const outDir = path.join(projectDir, config.outDir);
const exists = (file) => access(file).then(() => true, () => false);

await mkdir(outDir, { recursive: true });
const icons = [];
for (const sheet of config.sheets) {
  const input = path.join(sourceDir, sheet.source);
  // Une planche pas encore générée ne bloque pas les autres : l'interface garde une case vide.
  if (!(await exists(input))) {
    console.warn(`${sheet.source} introuvable, ignoré`);
    continue;
  }
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const image = { data, w: info.width, h: info.height };
  const background = floodBackground(data, image.w, image.h, config.defaults);
  const subject = background.map((b) => (b ? 0 : 1));
  const { labels, parts } = components(subject, image.w, image.h);
  const bg = borderMedian(data, image.w, image.h);
  const cellW = image.w / sheet.columns;
  const cellH = image.h / sheet.rows;

  for (const [index, id] of sheet.ids.entries()) {
    if (!id) continue;
    const options = { ...config.defaults, ...config.icons[id] };
    const left = (index % sheet.columns) * cellW;
    const top = Math.floor(index / sheet.columns) * cellH;
    const inCell = parts.filter((p) => {
      const cx = (p.minX + p.maxX) / 2;
      const cy = (p.minY + p.maxY) / 2;
      return cx >= left && cx < left + cellW && cy >= top && cy < top + cellH;
    });
    const largest = Math.max(0, ...inCell.map((p) => p.size));
    const kept = inCell.filter((p) => p.size >= largest * options.minPartRatio);
    if (!kept.length) {
      console.warn(`${id.padEnd(18)} case ${index + 1} vide, ignoré`);
      continue;
    }
    const cell = { left, top, width: cellW, height: cellH };
    const icon = await cutIcon(image, { labels, background, bg }, kept, cell, options);
    const output = path.join(outDir, `${id}.png`);
    await icon.png({ compressionLevel: 9 }).toFile(output);
    icons.push({ id, file: output });
    console.log(`${id.padEnd(18)} ${sheet.source} case ${index + 1} → ${path.relative(projectDir, output)}`);
  }
}

if (config.previewDir && icons.length) await preview(icons);

/** Découpe un objet : ses morceaux opaques, plus le halo et les bords en couleur vers alpha. */
async function cutIcon(image, { labels, background, bg }, kept, cell, options) {
  const { data, w, h } = image;
  const reach = options.glowReach;
  // Zone de travail : l'objet et de quoi garder son halo.
  const x0 = Math.max(0, Math.min(...kept.map((p) => p.minX)) - reach);
  const y0 = Math.max(0, Math.min(...kept.map((p) => p.minY)) - reach);
  const x1 = Math.min(w, Math.max(...kept.map((p) => p.maxX)) + reach + 1);
  const y1 = Math.min(h, Math.max(...kept.map((p) => p.maxY)) + reach + 1);
  const rw = x1 - x0;
  const rh = y1 - y0;
  const n = rw * rh;
  const keptLabels = new Set(kept.map((p) => p.label));
  const rgb = Buffer.alloc(n * 3);
  const own = new Uint8Array(n);
  const isBackground = new Uint8Array(n);
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const g = (y + y0) * w + x + x0;
      const i = y * rw + x;
      data.copy(rgb, i * 3, g * 3, g * 3 + 3);
      own[i] = keptLabels.has(labels[g]) ? 1 : 0;
      isBackground[i] = background[g] ? 1 : 0;
    }
  }
  // Fond enfermé par l'objet (entre les fils d'un écheveau, dans le trou des pièces). Quand l'objet a des
  // ombres du même gris que le fond (le masque blanc), `holes` désigne les poches à vider par un point
  // de la case, en fractions de sa largeur et de sa hauteur.
  if (options.fillHoles) {
    const filled = floodBackground(rgb, rw, rh, { ...options, fillHoles: true });
    const pocket = filled.map((b, i) => (b && own[i] ? 1 : 0));
    let chosen = () => true;
    if (options.holes) {
      const { labels: pockets } = components(pocket, rw, rh);
      const wanted = new Set(
        options.holes.map(([fx, fy]) => pockets[Math.round(cell.top + fy * cell.height - y0) * rw + Math.round(cell.left + fx * cell.width - x0)]),
      );
      chosen = (i) => wanted.has(pockets[i]);
    }
    for (let i = 0; i < n; i++) {
      if (pocket[i] && chosen(i)) {
        own[i] = 0;
        isBackground[i] = 1;
      }
    }
  }

  // Zone douce : depuis le fond qui touche l'objet, on s'étend dans le fond (jusqu'à `glowReach`)
  // et dans l'objet tant que la couleur varie en douceur (un halo, pas un contour peint).
  const soft = new Uint8Array(n);
  const depth = new Uint16Array(n);
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;
  const neighbours = (i) => {
    const x = i % rw;
    return [x > 0 ? i - 1 : -1, x < rw - 1 ? i + 1 : -1, i >= rw ? i - rw : -1, i < n - rw ? i + rw : -1];
  };
  for (let i = 0; i < n; i++) {
    if (isBackground[i] && neighbours(i).some((j) => j >= 0 && own[j])) {
      soft[i] = 1;
      queue[tail++] = i;
    }
  }
  const step = (i, j) =>
    Math.abs(rgb[i * 3] - rgb[j * 3]) + Math.abs(rgb[i * 3 + 1] - rgb[j * 3 + 1]) + Math.abs(rgb[i * 3 + 2] - rgb[j * 3 + 2]);
  while (head < tail) {
    const i = queue[head++];
    for (const j of neighbours(i)) {
      if (j < 0 || soft[j]) continue;
      const into = isBackground[j] ? depth[i] < reach : own[j] && step(i, j) <= options.glowStep;
      if (!into) continue;
      soft[j] = 1;
      depth[j] = depth[i] + 1;
      queue[tail++] = j;
    }
  }

  const rgba = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    if (soft[i]) colorToAlpha(rgb, i, bg, options.alphaFloor, rgba);
    else if (own[i]) {
      rgb.copy(rgba, i * 4, i * 3, i * 3 + 3);
      rgba[i * 4 + 3] = 255;
    }
  }

  // Cadre carré autour de ce qui reste visible, avec une petite marge.
  let minX = rw;
  let minY = rh;
  let maxX = -1;
  let maxY = -1;
  for (let i = 0; i < n; i++) {
    if (rgba[i * 4 + 3] < 12) continue;
    const x = i % rw;
    const y = (i - x) / rw;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const side = Math.round(Math.max(bw, bh) * (1 + 2 * config.margin));
  const padX = side - bw;
  const padY = side - bh;
  const clear = { r: 0, g: 0, b: 0, alpha: 0 };
  // Deux passes : dans une même chaîne, sharp redimensionne avant d'agrandir le cadre.
  const square = await sharp(rgba, { raw: { width: rw, height: rh, channels: 4 } })
    .extract({ left: minX, top: minY, width: bw, height: bh })
    .extend({ left: padX >> 1, right: padX - (padX >> 1), top: padY >> 1, bottom: padY - (padY >> 1), background: clear })
    .raw()
    .toBuffer();
  return sharp(square, { raw: { width: side, height: side, channels: 4 } }).resize(config.size, config.size, { kernel: 'lanczos3' });
}

/**
 * Le plus petit alpha qui, posé sur le gris du fond, redonne ce pixel ; la couleur est éclaircie d'autant.
 * `floor` efface le grain du JPEG (un fond à 2 niveaux près du gris de référence).
 */
function colorToAlpha(rgb, i, bg, floor, out) {
  let raw = 0;
  for (let c = 0; c < 3; c++) {
    const d = rgb[i * 3 + c] - bg[c];
    raw = Math.max(raw, d > 0 ? d / (255 - bg[c]) : -d / bg[c]);
  }
  const alpha = Math.min(1, (raw - floor) / (1 - floor));
  if (alpha <= 0) return;
  for (let c = 0; c < 3; c++) {
    out[i * 4 + c] = Math.max(0, Math.min(255, Math.round(bg[c] + (rgb[i * 3 + c] - bg[c]) / alpha)));
  }
  out[i * 4 + 3] = Math.round(alpha * 255);
}

/** Aperçu (dossier ignoré par git) : toutes les icônes sur le papier de l'interface et sur l'encre. */
async function preview(list) {
  const cell = config.size + 16;
  const columns = 8;
  const rows = Math.ceil(list.length / columns);
  const band = rows * cell;
  const composites = [];
  for (const [k, { file }] of list.entries()) {
    const left = (k % columns) * cell + 8;
    const top = Math.floor(k / columns) * cell + 8;
    composites.push({ input: file, left, top }, { input: file, left, top: top + band });
  }
  const paper = Buffer.from(`<svg width="${columns * cell}" height="${band * 2}"><rect width="100%" height="${band}" fill="#ece3cf"/><rect y="${band}" width="100%" height="${band}" fill="#1d2226"/></svg>`);
  const dir = path.join(projectDir, config.previewDir);
  await mkdir(dir, { recursive: true });
  const output = path.join(dir, 'apercu-icones.png');
  await sharp(paper).composite(composites).png().toFile(output);
  console.log(`aperçu → ${path.relative(projectDir, output)}`);
}
