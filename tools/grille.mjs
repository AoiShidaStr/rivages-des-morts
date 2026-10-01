// Découpe des planches peintes : sépare les images rangées en grille sur fond gris et trouve leurs repères
// (ligne des pieds, axe du corps). Partagé par `npm run planches` et `npm run poses`.
import sharp from 'sharp';
import { alphaMask, components } from './decoupe.mjs';

/**
 * Détoure la planche source et renvoie ses images dans l'ordre de lecture.
 * Les images sont rangées en grille (`layout` : nombre d'images par ligne ; avec `count`, deux lignes égales ;
 * sans l'un ni l'autre, la grille est lue sur la planche, voir `detectLayout`).
 * La lame d'une image passe souvent au-dessus de la cape de la voisine : aucune coupe droite ne les
 * sépare. Entre deux images, on coupe donc le long d'un chemin qui serpente dans le fond (voir `seam`).
 */
export async function splitFrames(input, options) {
  // `crop` : [x0, y0, x1, y1] en fractions de l’image, pour retirer avant le détourage un bandeau que Nano Banana a ajouté
  // (titre sur fond sombre) : il fausserait la couleur du fond, lue sur les bords.
  const image = sharp(input).removeAlpha();
  if (options.crop) {
    const { width, height } = await image.metadata();
    const [x0, y0, x1, y1] = options.crop;
    image.extract({ left: Math.round(x0 * width), top: Math.round(y0 * height), width: Math.round((x1 - x0) * width), height: Math.round((y1 - y0) * height) });
  }
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const alpha = alphaMask(data, w, h, options);
  const layout =
    options.layout ??
    (options.count === undefined
      ? detectLayout(alpha, w, h)
      : options.count % 2 === 0 && options.count > 2
        ? [options.count / 2, options.count / 2]
        : [options.count]);

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

/**
 * Nombre de poses par ligne, lu sur la planche. Les pieds d'une ligne descendent souvent au niveau des armes
 * levées de la suivante, et une lame passe parfois chez la voisine : on ne cherche pas des bandes vides, mais
 * les creux du profil (peu de sujet), entre des bosses (les poses).
 */
export function detectLayout(alpha, w, h) {
  const rows = humps(profile(alpha, w, h, { x0: 0, x1: w, y0: 0, y1: h }, 'rows'), 0.2);
  return rows.map(([y0, y1]) => humps(profile(alpha, w, h, { x0: 0, x1: w, y0, y1 }, 'columns'), 0.15).length);
}

/**
 * Bosses d'un profil : plages où le profil lissé dépasse `threshold` fois son maximum. Une bosse beaucoup plus
 * légère que la plus grosse (flèche en vol, tête d'un bâton, bout de cape) n'est pas une pose.
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
  const largest = Math.max(...found.map((f) => f.mass));
  return found.filter((f) => f.mass >= largest * 0.3).map((f) => [f.from, f.to]);
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
export function profile(alpha, w, h, box, along) {
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
export function registerOnFirst(frames) {
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
export function referenceHeight(found, picked, ref) {
  if (ref !== undefined) return found[ref].bodyHeight;
  return Math.max(...picked.map((f) => f.bodyHeight));
}

export function scaleFrame(frame, scale) {
  return {
    source: frame,
    scale,
    width: Math.max(1, Math.round(frame.width * scale)),
    height: Math.max(1, Math.round(frame.height * scale)),
    anchorX: frame.anchorX * scale,
    baseline: frame.baseline * scale,
  };
}
