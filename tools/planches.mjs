// Monte les planches d'animation peintes (Nano Banana) en planches pour le jeu.
//
// Chaque image source contient les images d'une animation sur fond gris, rangées en lignes.
// L'outil détoure le fond, sépare les images, les met toutes à la même échelle, les aligne
// (pieds sur la même ligne, corps au centre), puis écrit dans public/sprites/anim :
//   - <nom>.webp : toutes les images, dans des cases de même taille ;
//   - <nom>.json : le découpage au format « Array » d'Aseprite, un tag par posture,
//     plus `meta.anchor` (position des pieds dans une case) et `meta.bodyHeight`.
//
// Usage : npm run planches               → toutes les entrées de tools/planches.json
//         npm run planches -- heros      → seulement « heros »
//         npm run planches -- --apercu dossier   → écrit aussi une bande par animation, avec les repères
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { alphaMask, components } from './decoupe.mjs';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await readFile(path.join(projectDir, 'tools', 'planches.json'), 'utf8'));
const sourceDir = config.sourceDir.replace(/^~(?=$|[\\/])/, os.homedir());
const outDir = path.join(projectDir, config.outDir);
const args = process.argv.slice(2);
const previewAt = args.indexOf('--apercu');
const previewDir = previewAt >= 0 ? args.splice(previewAt, 2)[1] : null;
const only = args;

/** Largeur maximale de la planche : les cases passent à la ligne au-delà. */
const MAX_SHEET_WIDTH = 4096;
/** Marge transparente autour de chaque case, contre les débordements du filtrage. */
const CELL_PADDING = 8;

await mkdir(outDir, { recursive: true });
for (const planche of config.planches) {
  if (only.length > 0 && !only.includes(planche.name)) continue;
  const frames = [];
  const tags = [];
  let missing = false;
  for (const anim of planche.animations) {
    const input = path.join(sourceDir, anim.source);
    if (!(await access(input).then(() => true, () => false))) {
      console.warn(`${planche.name} ${anim.tag} : ${anim.source} introuvable`);
      missing = true;
      continue;
    }
    const options = { ...config.defaults, ...planche, ...anim };
    const found = await splitFrames(input, options);
    const picked = (anim.frames ?? found.map((_, i) => i)).map((i) => found[i]);
    if (options.anchor === 'box') registerOnFirst(picked);
    const scale = planche.bodyHeight / referenceHeight(found, picked, anim.ref);
    const from = frames.length;
    picked.forEach((frame, i) => {
      frames.push({ ...scaleFrame(frame, scale), duration: anim.durations?.[i] ?? anim.duration ?? 100, tag: anim.tag });
    });
    tags.push({ name: anim.tag, from, to: frames.length - 1, direction: 'forward', ...(anim.once ? { repeat: '1' } : {}) });
    console.log(`${planche.name.padEnd(16)} ${anim.tag.padEnd(9)} ${picked.length}/${found.length} images, échelle ${scale.toFixed(3)}`);
  }
  if (missing && frames.length === 0) continue;
  await writeSheet(planche, frames, tags);
}

/**
 * Détoure la planche source et renvoie ses images dans l'ordre de lecture.
 * Les images sont rangées en grille (`layout` : nombre d'images par ligne, deux lignes égales par défaut).
 * La lame d'une image passe souvent au-dessus de la cape de la voisine : aucune coupe droite ne les
 * sépare. Entre deux images, on coupe donc le long d'un chemin qui serpente dans le fond (voir `seam`).
 */
async function splitFrames(input, options) {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const alpha = alphaMask(data, w, h, options);
  const layout = options.layout ?? (options.count % 2 === 0 && options.count > 2 ? [options.count / 2, options.count / 2] : [options.count]);

  const rowCuts = cuts(profile(alpha, w, h, { x0: 0, x1: w, y0: 0, y1: h }, 'rows'), layout.length);
  const frames = [];
  layout.forEach((columns, r) => {
    const band = { x0: 0, x1: w, y0: rowCuts[r], y1: rowCuts[r + 1] };
    const rows = band.y1 - band.y0;
    const seams = expectedCuts(profile(alpha, w, h, band, 'columns'), columns).map(({ at, radius }) => seam(alpha, w, band, at, radius));
    for (let c = 0; c < columns; c++) {
      const left = c === 0 ? new Int32Array(rows).fill(band.x0) : seams[c - 1];
      const right = c === columns - 1 ? new Int32Array(rows).fill(band.x1) : seams[c];
      const frame = extractFrame(data, alpha, w, { y0: band.y0, y1: band.y1, left, right }, options);
      if (!frame) throw new Error(`${input} : case vide en ligne ${r + 1}, colonne ${c + 1} (vérifier « layout »)`);
      frames.push(frame);
    }
  });
  return frames;
}

/** Positions régulières des coupes entre `n` images, entre le premier et le dernier pixel de sujet. */
function expectedCuts({ values, offset }, n) {
  let first = values.findIndex((v) => v > 0);
  let last = values.length - 1;
  while (last > 0 && values[last] === 0) last--;
  if (first < 0) first = 0;
  const span = last - first + 1;
  return Array.from({ length: n - 1 }, (_, k) => ({ at: offset + first + (span * (k + 1)) / n, radius: (span / n) * 0.35 }));
}

/**
 * Coupe verticale entre deux images voisines : le chemin de haut en bas de la bande qui traverse le moins
 * de sujet, en se décalant d'au plus un pixel par ligne, à moins de `radius` de la position attendue.
 * Renvoie, pour chaque ligne, la première colonne de l'image de droite.
 */
function seam(alpha, w, band, expected, radius) {
  const x0 = Math.max(band.x0 + 1, Math.round(expected - radius));
  const x1 = Math.min(band.x1 - 1, Math.round(expected + radius));
  const cols = x1 - x0 + 1;
  const rows = band.y1 - band.y0;
  const cost = new Float64Array(rows * cols);
  const step = new Int8Array(rows * cols);
  for (let y = 0; y < rows; y++) {
    for (let c = 0; c < cols; c++) {
      // Un pixel de sujet coûte 1 ; à coût égal, on reste près de la position attendue et on va droit.
      const here = (alpha[(band.y0 + y) * w + x0 + c] ? 1 : 0) + Math.abs(x0 + c - expected) * 1e-4;
      if (y === 0) {
        cost[c] = here;
        continue;
      }
      let best = Infinity;
      for (const d of [0, -1, 1]) {
        const p = c + d;
        if (p < 0 || p >= cols) continue;
        const value = cost[(y - 1) * cols + p] + (d ? 1e-5 : 0);
        if (value < best) {
          best = value;
          step[y * cols + c] = d;
        }
      }
      cost[y * cols + c] = best + here;
    }
  }
  const xs = new Int32Array(rows);
  let c = 0;
  for (let k = 1; k < cols; k++) if (cost[(rows - 1) * cols + k] < cost[(rows - 1) * cols + c]) c = k;
  for (let y = rows - 1; y >= 0; y--) {
    xs[y] = x0 + c;
    c += step[y * cols + c];
  }
  return xs;
}

/** Quantité de sujet par ligne (ou par colonne) de pixels dans une zone. */
function profile(alpha, w, h, box, along) {
  const len = along === 'rows' ? box.y1 - box.y0 : box.x1 - box.x0;
  const values = new Float64Array(len);
  for (let y = box.y0; y < box.y1; y++) {
    for (let x = box.x0; x < box.x1; x++) {
      if (alpha[y * w + x]) values[along === 'rows' ? y - box.y0 : x - box.x0]++;
    }
  }
  return { values, offset: along === 'rows' ? box.y0 : box.x0 };
}

/**
 * Coupe un profil en `n` morceaux : les coupes sont cherchées autour des positions régulières
 * (entre le premier et le dernier pixel de sujet), là où le profil est le plus creux.
 */
function cuts({ values, offset }, n) {
  let first = values.findIndex((v) => v > 0);
  let last = values.length - 1;
  while (last > 0 && values[last] === 0) last--;
  if (first < 0) first = 0;
  const span = last - first + 1;
  const result = [offset];
  for (let k = 1; k < n; k++) {
    const expected = first + (span * k) / n;
    const radius = (span / n) * 0.35;
    let best = Math.round(expected);
    let bestValue = Infinity;
    for (let p = Math.max(first, Math.round(expected - radius)); p <= Math.min(last, Math.round(expected + radius)); p++) {
      // À creux égal, on préfère la coupe la plus proche de la position attendue.
      const value = values[p] + Math.abs(p - expected) * 1e-3;
      if (value < bestValue) {
        bestValue = value;
        best = p;
      }
    }
    result.push(offset + best);
  }
  result.push(offset + values.length);
  return result;
}

/**
 * Découpe une case, bornée ligne par ligne par les coupes `left` et `right` : pixels RGBA du sujet, et ses repères.
 * Les petits morceaux collés à une coupe viennent de l'image voisine : on les retire.
 * Le « corps » est le sujet sans ses parties fines (lame, traînée, pans de cape) : c'est lui qui
 * donne la hauteur de référence, la ligne des pieds et l'axe vertical du personnage.
 */
function extractFrame(data, alpha, w, region, options) {
  const { left, right } = region;
  const cell = { x0: Math.min(...left), y0: region.y0 };
  const cw = Math.max(...right) - cell.x0;
  const ch = region.y1 - region.y0;
  const local = new Uint8Array(cw * ch);
  for (let y = 0; y < ch; y++) {
    for (let x = left[y]; x < right[y]; x++) local[y * cw + x - cell.x0] = alpha[(cell.y0 + y) * w + x];
  }
  const { labels, parts } = components(local, cw, ch);
  const largest = parts.reduce((max, p) => Math.max(max, p.size), 0);
  if (!largest) return null;
  const onSide = new Set();
  for (let y = 0; y < ch; y++) {
    for (const x of [left[y], right[y] - 1]) {
      const label = labels[y * cw + x - cell.x0];
      if (label >= 0) onSide.add(label);
    }
  }
  const kept = new Set(
    parts.filter((p) => p.size >= largest * (onSide.has(p.label) ? 0.15 : options.minPartRatio)).map((p) => p.label),
  );
  let minX = cw;
  let minY = ch;
  let maxX = -1;
  let maxY = -1;
  for (const p of parts) {
    if (!kept.has(p.label)) continue;
    minX = Math.min(minX, p.minX);
    minY = Math.min(minY, p.minY);
    maxX = Math.max(maxX, p.maxX);
    maxY = Math.max(maxY, p.maxY);
  }
  const fw = maxX - minX + 1;
  const fh = maxY - minY + 1;
  const rgba = Buffer.alloc(fw * fh * 4);
  const solid = new Uint8Array(fw * fh);
  for (let y = 0; y < fh; y++) {
    for (let x = 0; x < fw; x++) {
      const l = (minY + y) * cw + minX + x;
      if (labels[l] < 0 || !kept.has(labels[l])) continue;
      const i = (cell.y0 + minY + y) * w + cell.x0 + minX + x;
      const o = y * fw + x;
      rgba.set([data[i * 3], data[i * 3 + 1], data[i * 3 + 2], alpha[i]], o * 4);
      solid[o] = 1;
    }
  }
  let anchorX;
  let baseline;
  let bodyTop;
  if (options.anchor === 'box') {
    // Décor : ancré au milieu du bas de son cadre, puis recalé sur la première image (registerOnFirst).
    anchorX = fw / 2;
    baseline = fh;
    bodyTop = 0;
  } else {
    const body = opening(solid, fw, fh, Math.max(3, Math.round(fh * (options.bodyThinning ?? 0.02))));
    let top = fh;
    let bottom = -1;
    for (let o = 0; o < fw * fh; o++) {
      if (!body[o]) continue;
      const y = Math.floor(o / fw);
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
    if (bottom < 0) throw new Error('image sans corps reconnaissable');
    // Axe du personnage : médiane des pixels du corps au niveau du buste.
    const xs = [];
    const from = top + Math.round((bottom - top) * 0.25);
    const to = top + Math.round((bottom - top) * 0.6);
    for (let y = from; y <= to; y++) for (let x = 0; x < fw; x++) if (body[y * fw + x]) xs.push(x);
    xs.sort((a, b) => a - b);
    anchorX = xs[xs.length >> 1] + 0.5;
    baseline = bottom + 1;
    bodyTop = top;
  }
  return { rgba, width: fw, height: fh, solid, anchorX, baseline, bodyHeight: baseline - bodyTop };
}

/**
 * Décor animé : la brume ou l'écume changent le cadre d'une image à l'autre, donc son milieu bouge.
 * On cherche plutôt le décalage qui superpose le mieux chaque silhouette à celle de la première image,
 * et on reporte l'ancre de la première.
 */
function registerOnFirst(frames) {
  const STEP = 4;
  const small = frames.map((f) => shrinkMask(f.solid, f.width, f.height, STEP));
  const [ref] = small;
  const first = frames[0];
  for (let k = 1; k < frames.length; k++) {
    const cur = small[k];
    // Point de départ : bas et milieu des cadres alignés. Décalage `s` : le pixel x de l'image k est le pixel x + s de la première.
    const sx0 = Math.round((ref.w - cur.w) / 2);
    const sy0 = ref.h - cur.h;
    const range = Math.ceil(Math.max(ref.w, ref.h) * 0.08);
    let best = { sx: sx0, sy: sy0, score: -1 };
    for (let sy = sy0 - range; sy <= sy0 + range; sy++) {
      for (let sx = sx0 - range; sx <= sx0 + range; sx++) {
        let score = 0;
        for (let y = 0; y < cur.h; y++) {
          const ry = y + sy;
          if (ry < 0 || ry >= ref.h) continue;
          for (let x = 0; x < cur.w; x++) {
            const rx = x + sx;
            if (rx >= 0 && rx < ref.w) score += cur.v[y * cur.w + x] * ref.v[ry * ref.w + rx];
          }
        }
        if (score > best.score) best = { sx, sy, score };
      }
    }
    frames[k].anchorX = first.anchorX - best.sx * STEP;
    frames[k].baseline = first.baseline - best.sy * STEP;
  }
}

/** Masque réduit d'un facteur `step` : part de sujet dans chaque bloc. */
function shrinkMask(mask, w, h, step) {
  const sw = Math.ceil(w / step);
  const sh = Math.ceil(h / step);
  const v = new Float32Array(sw * sh);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mask[y * w + x]) v[Math.floor(y / step) * sw + Math.floor(x / step)] += 1 / (step * step);
  return { v, w: sw, h: sh };
}

/** Ouverture morphologique (érosion puis dilatation, élément carré) : efface les parties plus fines que 2r+1. */
function opening(mask, w, h, r) {
  return dilate(erode(mask, w, h, r), w, h, r);
}

function erode(mask, w, h, r) {
  return filter(mask, w, h, r, (count, size) => count === size);
}

function dilate(mask, w, h, r) {
  return filter(mask, w, h, r, (count) => count > 0);
}

/** Filtre séparable sur une fenêtre carrée, par sommes cumulées (hors image = vide). */
function filter(mask, w, h, r, keep) {
  const size = 2 * r + 1;
  const pass = (src, horizontal) => {
    const out = new Uint8Array(w * h);
    const lines = horizontal ? h : w;
    const len = horizontal ? w : h;
    const prefix = new Int32Array(len + 1);
    for (let line = 0; line < lines; line++) {
      const at = (k) => (horizontal ? line * w + k : k * w + line);
      for (let k = 0; k < len; k++) prefix[k + 1] = prefix[k] + src[at(k)];
      for (let k = 0; k < len; k++) {
        const count = prefix[Math.min(len, k + r + 1)] - prefix[Math.max(0, k - r)];
        out[at(k)] = keep(count, size) ? 1 : 0;
      }
    }
    return out;
  };
  return pass(pass(mask, true), false);
}

/**
 * Hauteur du corps qui sert d'étalon : celle de l'image `ref` de la planche source (une pose debout),
 * sinon la plus grande des images retenues.
 */
function referenceHeight(found, picked, ref) {
  if (ref !== undefined) return found[ref].bodyHeight;
  return Math.max(...picked.map((f) => f.bodyHeight));
}

function scaleFrame(frame, scale) {
  return {
    source: frame,
    scale,
    width: Math.max(1, Math.round(frame.width * scale)),
    height: Math.max(1, Math.round(frame.height * scale)),
    anchorX: frame.anchorX * scale,
    baseline: frame.baseline * scale,
  };
}

async function writeSheet(planche, frames, tags) {
  // Case commune : assez large des deux côtés de l'axe, assez haute au-dessus et en dessous des pieds.
  const half = Math.ceil(Math.max(...frames.map((f) => Math.max(f.anchorX, f.width - f.anchorX))));
  const above = Math.ceil(Math.max(...frames.map((f) => f.baseline)));
  const below = Math.ceil(Math.max(0, ...frames.map((f) => f.height - f.baseline)));
  const cellW = 2 * half + 2 * CELL_PADDING;
  const cellH = above + below + 2 * CELL_PADDING;
  const anchor = { x: CELL_PADDING + half, y: CELL_PADDING + above };
  const columns = Math.max(1, Math.floor(MAX_SHEET_WIDTH / cellW));
  const sheetW = Math.min(frames.length, columns) * cellW;
  const sheetH = Math.ceil(frames.length / columns) * cellH;

  const composites = [];
  const jsonFrames = [];
  for (const [i, f] of frames.entries()) {
    const cx = (i % columns) * cellW;
    const cy = Math.floor(i / columns) * cellH;
    const input = await sharp(f.source.rgba, { raw: { width: f.source.width, height: f.source.height, channels: 4 } })
      .resize(f.width, f.height, { kernel: 'lanczos3' })
      .png()
      .toBuffer();
    composites.push({ input, left: Math.round(cx + anchor.x - f.anchorX), top: Math.round(cy + anchor.y - f.baseline) });
    jsonFrames.push({ filename: `${f.tag} ${i}`, frame: { x: cx, y: cy, w: cellW, h: cellH }, duration: f.duration });
  }
  const image = `${planche.name}.webp`;
  await sharp({ create: { width: sheetW, height: sheetH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(composites)
    .webp({ quality: 90, alphaQuality: 100, effort: 6 })
    .toFile(path.join(outDir, image));
  const json = {
    frames: jsonFrames,
    meta: {
      app: 'tools/planches.mjs',
      image,
      size: { w: sheetW, h: sheetH },
      smooth: true,
      bodyHeight: planche.bodyHeight,
      anchor,
      frameTags: tags,
    },
  };
  await writeFile(path.join(outDir, `${planche.name}.json`), `${JSON.stringify(json, null, 1)}\n`);
  console.log(`→ ${path.relative(projectDir, path.join(outDir, image))} (${sheetW}×${sheetH}, cases ${cellW}×${cellH}, ${frames.length} images)`);

  if (previewDir) await writePreview(planche, frames, tags, cellW, cellH, anchor);
}

/** Une bande par animation, avec la ligne des pieds et l'axe du corps, pour vérifier l'alignement. */
async function writePreview(planche, frames, tags, cellW, cellH, anchor) {
  await mkdir(previewDir, { recursive: true });
  for (const tag of tags) {
    const count = tag.to - tag.from + 1;
    const composites = [];
    for (let k = 0; k < count; k++) {
      const f = frames[tag.from + k];
      const input = await sharp(f.source.rgba, { raw: { width: f.source.width, height: f.source.height, channels: 4 } })
        .resize(f.width, f.height)
        .png()
        .toBuffer();
      composites.push({ input, left: Math.round(k * cellW + anchor.x - f.anchorX), top: Math.round(anchor.y - f.baseline) });
    }
    const lines = Buffer.from(
      `<svg width="${count * cellW}" height="${cellH}"><line x1="0" y1="${anchor.y}" x2="${count * cellW}" y2="${anchor.y}" stroke="red" stroke-width="2"/>` +
        Array.from({ length: count }, (_, k) => `<line x1="${k * cellW + anchor.x}" y1="0" x2="${k * cellW + anchor.x}" y2="${cellH}" stroke="blue" stroke-width="2"/>`).join('') +
        '</svg>',
    );
    composites.push({ input: lines, left: 0, top: 0 });
    await sharp({ create: { width: count * cellW, height: cellH, channels: 3, background: '#d8d8d8' } })
      .composite(composites)
      .png()
      .toFile(path.join(previewDir, `${planche.name}_${tag.name}.png`));
  }
}
