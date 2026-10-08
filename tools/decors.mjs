// Découpe les planches de décors peints (Nano Banana, voir docs/Prompts visuels.md) : plusieurs décors par image,
// comme les icônes des objets. Chaque décor devient un PNG détouré dans public/sprites ; les planches de textures
// (`"kind": "texture"`) donnent des carrés de sol qui se répètent sans couture (public/sprites/sols/textures).
//
// Usage : npm run decors                       → toutes les planches présentes
//         npm run decors -- decors_arbres      → une seule planche
//         npm run decors -- --reference        → images de référence à joindre pour les planches qui retouchent
//                                                 des décors existants (`reference` dans tools/decors.json)
// Réglages : tools/decors.json (planches, nom de chaque case, réglages de détourage par décor).
//
// Chaque morceau détouré revient à la case de la grille qui contient son centre : un décor qui déborde un peu de
// sa case reste entier.
import { access, mkdir, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { alphaMask, components } from './decoupe.mjs';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await readFile(path.join(projectDir, 'tools', 'decors.json'), 'utf8'));
const sourceDir = config.sourceDir.replace(/^~(?=$|[\\/])/, os.homedir());
const outDir = path.join(projectDir, config.outDir);
const args = process.argv.slice(2);
const only = args.filter((a) => !a.startsWith('--'));
const exists = (file) => access(file).then(() => true, () => false);
/** Gris du fond demandé dans les prompts. */
const GREY = { r: 0x8f, g: 0x8f, b: 0x8f };

for (const sheet of config.sheets) {
  if (only.length > 0 && !only.includes(sheet.source)) continue;
  if (args.includes('--reference')) {
    if (sheet.reference) await buildReference(sheet);
    continue;
  }
  const input = await findSource(sheet.source);
  // Une planche pas encore générée ne bloque pas les autres.
  if (!input) {
    console.warn(`${sheet.source} (.png ou .jpg) introuvable, ignoré`);
    continue;
  }
  if (sheet.kind === 'texture') await cutTextures(input, sheet);
  else await cutSprites(input, sheet);
}

async function findSource(name) {
  for (const ext of ['.png', '.jpg', '.jpeg', '.webp']) {
    const file = path.join(sourceDir, name + ext);
    if (await exists(file)) return file;
  }
  return null;
}

// --- Décors détourés ----------------------------------------------------------

async function cutSprites(input, sheet) {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const sheetOptions = { ...config.defaults, ...sheet.defaults };
  const alpha = alphaMask(data, w, h, sheetOptions);
  const { labels, parts } = components(alpha, w, h);
  const cellW = w / sheet.columns;
  const cellH = h / sheet.rows;

  for (const [index, name] of sheet.names.entries()) {
    if (!name) continue;
    const options = { ...sheetOptions, ...sheet.options?.[name] };
    const left = (index % sheet.columns) * cellW;
    const top = Math.floor(index / sheet.columns) * cellH;
    const inCell = parts.filter((p) => {
      const cx = (p.minX + p.maxX) / 2;
      const cy = (p.minY + p.maxY) / 2;
      return cx >= left && cx < left + cellW && cy >= top && cy < top + cellH;
    });
    const largest = Math.max(0, ...inCell.map((p) => p.size));
    const kept = inCell.filter((p) => p.size >= largest * options.cellPartRatio);
    if (!kept.length) {
      console.warn(`${name.padEnd(32)} case ${index + 1} vide, ignoré`);
      continue;
    }
    const pad = options.padding;
    const x0 = Math.max(0, Math.min(...kept.map((p) => p.minX)) - pad);
    const y0 = Math.max(0, Math.min(...kept.map((p) => p.minY)) - pad);
    const x1 = Math.min(w, Math.max(...kept.map((p) => p.maxX)) + pad + 1);
    const y1 = Math.min(h, Math.max(...kept.map((p) => p.maxY)) + pad + 1);
    const cw = x1 - x0;
    const ch = y1 - y0;
    const keptLabels = new Set(kept.map((p) => p.label));
    const rgb = Buffer.alloc(cw * ch * 3);
    const rgba = Buffer.alloc(cw * ch * 4);
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const g = (y + y0) * w + x + x0;
        const i = y * cw + x;
        data.copy(rgb, i * 3, g * 3, g * 3 + 3);
        data.copy(rgba, i * 4, g * 3, g * 3 + 3);
        rgba[i * 4 + 3] = keptLabels.has(labels[g]) ? alpha[g] : 0;
      }
    }
    // Fond enfermé par le décor (entre les montants de l'ema, sous une arche) : détouré à part, sur le décor seul.
    if (options.fillHoles) {
      const holes = alphaMask(rgb, cw, ch, { ...options, minPartRatio: 0 });
      for (let i = 0; i < cw * ch; i++) rgba[i * 4 + 3] = Math.min(rgba[i * 4 + 3], holes[i]);
    }
    // `"format": "webp"` : bien plus léger que le PNG pour les décors posés par dizaines (le jeu se charge en ligne).
    const webp = sheet.format === 'webp';
    const output = path.join(outDir, `${name}.${webp ? 'webp' : 'png'}`);
    await mkdir(path.dirname(output), { recursive: true });
    const resized = sharp(rgba, { raw: { width: cw, height: ch, channels: 4 } }).resize({ width: options.maxSize, height: options.maxSize, fit: 'inside', withoutEnlargement: true });
    const result = await (webp ? resized.webp({ quality: 88, alphaQuality: 95 }) : resized.png()).toFile(output);
    console.log(`${name.padEnd(32)} case ${index + 1} → ${path.relative(projectDir, output)} (${result.width}×${result.height})`);
  }
}

// --- Textures de sol ----------------------------------------------------------

async function cutTextures(input, sheet) {
  const meta = await sharp(input).metadata();
  const cellW = meta.width / sheet.columns;
  const cellH = meta.height / sheet.rows;
  // On laisse de côté le bord de chaque case : Nano Banana y peint souvent un liseré ou un joint.
  const inset = 0.06;
  const size = sheet.size ?? 1024;
  for (const [index, name] of sheet.names.entries()) {
    if (!name) continue;
    const col = index % sheet.columns;
    const row = Math.floor(index / sheet.columns);
    const region = {
      left: Math.round((col + inset) * cellW),
      top: Math.round((row + inset) * cellH),
      width: Math.round(cellW * (1 - 2 * inset)),
      height: Math.round(cellH * (1 - 2 * inset)),
    };
    const { data } = await sharp(input)
      .extract(region)
      .resize(size, size, { fit: 'fill', kernel: 'lanczos3' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const tiled = seamless(data, size);
    const output = path.join(outDir, `${name}.jpg`);
    await mkdir(path.dirname(output), { recursive: true });
    await sharp(tiled, { raw: { width: size, height: size, channels: 3 } }).jpeg({ quality: 88 }).toFile(output);
    console.log(`${name.padEnd(32)} case ${index + 1} → ${path.relative(projectDir, output)} (${size}×${size}, sans couture)`);
  }
}

/**
 * Rend une texture raccordable : fondu avec une copie décalée d'une demi-image, d'abord en largeur puis en hauteur.
 * La copie décalée prend le relais près des bords (là où l'original se raccorde mal) et laisse l'original au milieu.
 */
function seamless(src, size) {
  const pass = (img, horizontal) => {
    const out = Buffer.alloc(img.length);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const t = (horizontal ? x : y) / size;
        const w = Math.min(1, Math.max(0, (Math.abs(t - 0.5) * 2 - 0.4) / 0.5));
        const k = w * w * (3 - 2 * w);
        const sx = horizontal ? (x + size / 2) % size : x;
        const sy = horizontal ? y : (y + size / 2) % size;
        for (let c = 0; c < 3; c++) {
          out[(y * size + x) * 3 + c] = Math.round(img[(y * size + x) * 3 + c] * (1 - k) + img[(sy * size + sx) * 3 + c] * k);
        }
      }
    }
    return out;
  };
  return pass(pass(src, true), false);
}

// --- Références ---------------------------------------------------------------

/** Planche de référence : les décors actuels (déjà détourés) rangés dans la même grille, sur le gris du fond. */
async function buildReference(sheet) {
  const cell = 1024;
  const layers = [];
  for (const [index, file] of sheet.reference.entries()) {
    const sprite = path.join(outDir, file);
    if (!(await exists(sprite))) {
      console.warn(`${file} introuvable : case ${index + 1} laissée vide`);
      continue;
    }
    const fitted = await sharp(sprite)
      .resize({ width: Math.round(cell * 0.8), height: Math.round(cell * 0.8), fit: 'inside' })
      .png()
      .toBuffer({ resolveWithObject: true });
    layers.push({
      input: fitted.data,
      left: (index % sheet.columns) * cell + Math.round((cell - fitted.info.width) / 2),
      top: Math.floor(index / sheet.columns) * cell + Math.round((cell - fitted.info.height) / 2),
    });
  }
  const output = path.join(sourceDir, `${sheet.source}_reference.png`);
  await sharp({ create: { width: cell * sheet.columns, height: cell * sheet.rows, channels: 3, background: GREY } })
    .composite(layers)
    .png()
    .toFile(output);
  console.log(`référence à joindre : ${path.relative(os.homedir(), output)}`);
}
