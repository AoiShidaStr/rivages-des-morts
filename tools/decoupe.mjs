// Détourage partagé par `npm run sprites` (images fixes) et `npm run planches` (animations) :
// reconnaît le fond gris presque uni des images de Nano Banana et en fait de la transparence.

/** Masque alpha du sujet (0 = fond, 255 = sujet, 150 = bord adouci). */
export function alphaMask(data, w, h, options) {
  const background = floodBackground(data, w, h, options);
  const alpha = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) alpha[i] = background[i] ? 0 : 255;
  if (options.erase) eraseBoxes(alpha, w, h, options.erase);
  if (options.eraseLines) eraseLines(alpha, w, h, options.eraseLines === true ? {} : options.eraseLines);
  removeSmallParts(alpha, w, h, options.minPartRatio);
  softenEdges(alpha, w, h);
  return alpha;
}

/** Vide des rectangles de l'image (en fractions de sa taille : [x0, y0, x1, y1]), là où Nano Banana a écrit du texte. */
export function eraseBoxes(alpha, w, h, boxes) {
  for (const [x0, y0, x1, y1] of boxes) {
    for (let y = Math.round(y0 * h); y < Math.round(y1 * h); y++) {
      for (let x = Math.round(x0 * w); x < Math.round(x1 * w); x++) alpha[y * w + x] = 0;
    }
  }
}

/**
 * Efface les traits droits que Nano Banana ajoute parfois : ligne de sol, grille, cadres des images.
 * Un trait est une suite d'au moins `length` pixels de sujet (en fraction de la largeur ou de la hauteur),
 * tous plus fins que `thickness` dans l'autre sens. Là où le trait passe sous un pied, le sujet est épais :
 * ces quelques pixels restent collés au personnage. `vertical: false` épargne les traits verticaux
 * (pattes d'araignée, bâtons) quand seule la ligne de sol est à effacer.
 */
export function eraseLines(alpha, w, h, { thickness, length = 0.1, vertical = true } = {}) {
  const thin = thickness ?? Math.max(3, Math.round(Math.min(w, h) * 0.008));
  const erase = new Uint8Array(w * h);
  // Épaisseur du sujet en chaque pixel, en travers du trait cherché.
  const across = (horizontal) => {
    const run = new Int32Array(w * h);
    const lines = horizontal ? w : h;
    const len = horizontal ? h : w;
    const at = (line, k) => (horizontal ? k * w + line : line * w + k);
    for (let line = 0; line < lines; line++) {
      let start = -1;
      for (let k = 0; k <= len; k++) {
        const on = k < len && alpha[at(line, k)];
        if (on && start < 0) start = k;
        if (!on && start >= 0) {
          for (let j = start; j < k; j++) run[at(line, j)] = k - start;
          start = -1;
        }
      }
    }
    return run;
  };
  for (const horizontal of vertical ? [true, false] : [true]) {
    const thickness = across(horizontal);
    const lines = horizontal ? h : w;
    const len = horizontal ? w : h;
    const min = Math.round(length * len);
    const at = (line, k) => (horizontal ? line * w + k : k * w + line);
    for (let line = 0; line < lines; line++) {
      let start = -1;
      for (let k = 0; k <= len; k++) {
        const i = k < len ? at(line, k) : -1;
        const on = i >= 0 && alpha[i] && thickness[i] <= thin;
        if (on && start < 0) start = k;
        if (!on && start >= 0) {
          if (k - start >= min) for (let j = start; j < k; j++) erase[at(line, j)] = 1;
          start = -1;
        }
      }
    }
  }
  for (let i = 0; i < w * h; i++) if (erase[i]) alpha[i] = 0;
}

/**
 * Remplit le fond depuis les bords de l'image. Un pixel est du fond s'il est gris,
 * proche de la couleur des bords, et proche du pixel voisin déjà reconnu (le fond a un léger dégradé).
 */
export function floodBackground(data, w, h, options) {
  const { tolerance, localTolerance, maxSaturation, fillHoles, holeTolerance = 8, minHole = 300 } = options;
  const background = new Uint8Array(w * h);
  const ref = borderMedian(data, w, h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;

  const greyNear = (i, color, maxGap, maxSat) => {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    const saturation = Math.max(r, g, b) - Math.min(r, g, b);
    const gap = Math.abs(r - color[0]) + Math.abs(g - color[1]) + Math.abs(b - color[2]);
    return saturation <= maxSat && gap <= maxGap * 3;
  };
  const greyWithin = (i, maxGap, maxSat) => greyNear(i, ref, maxGap, maxSat);

  // Aura peinte (ex. le halo vert du kodama) : ses pixels sont un mélange du fond et d'une couleur
  // `keyColor`. On les reconnaît à leur faible distance au segment fond → keyColor.
  const blendsWithKey = keyBlend(data, ref, options.keyColor, options.keyResidual ?? 18);
  const close = (i, j) =>
    Math.abs(data[i * 3] - data[j * 3]) +
      Math.abs(data[i * 3 + 1] - data[j * 3 + 1]) +
      Math.abs(data[i * 3 + 2] - data[j * 3 + 2]) <=
    localTolerance;
  let accepts = (i) => greyWithin(i, tolerance, maxSaturation) || blendsWithKey(i);

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

  // Fond d'un autre gris, fermé par un cadre (les cases que Nano Banana dessine parfois autour des images) :
  // on le remplit depuis les points `seeds` (en fractions de l'image), chacun comparé à sa propre couleur.
  for (const [fx, fy] of options.seeds ?? []) {
    const start = Math.round(fy * (h - 1)) * w + Math.round(fx * (w - 1));
    const color = [data[start * 3], data[start * 3 + 1], data[start * 3 + 2]];
    accepts = (i) => greyNear(i, color, tolerance, maxSaturation);
    seed(start);
    spread();
  }

  // Fond enfermé par le sujet (entre les poutres d'un torii, par exemple). On n'accepte ici que le gris
  // presque exact du fond, et seulement en grandes poches, pour ne pas percer les parties grises du sujet.
  if (fillHoles) {
    accepts = (i) => greyWithin(i, holeTolerance, maxSaturation / 2) || blendsWithKey(i);
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

/** Renvoie un test « ce pixel est-il un mélange du fond et de `keyColor` ? », ou un test toujours faux. */
function keyBlend(data, ref, keyColor, maxResidual) {
  if (!keyColor) return () => false;
  const d = keyColor.map((c, k) => c - ref[k]);
  const lengthSq = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
  return (i) => {
    const p = [data[i * 3] - ref[0], data[i * 3 + 1] - ref[1], data[i * 3 + 2] - ref[2]];
    const t = Math.min(1.1, Math.max(0, (p[0] * d[0] + p[1] * d[1] + p[2] * d[2]) / lengthSq));
    const residual = Math.hypot(p[0] - d[0] * t, p[1] - d[1] * t, p[2] - d[2] * t);
    return residual <= maxResidual;
  };
}

/** Couleur du fond : la médiane des pixels du bord de l'image. */
export function borderMedian(data, w, h) {
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

/**
 * Étiquette les zones de sujet d'un seul tenant. Renvoie l'étiquette de chaque pixel (-1 pour le fond)
 * et, pour chaque zone, sa taille et son cadre.
 */
export function components(alpha, w, h) {
  const labels = new Int32Array(w * h).fill(-1);
  const parts = [];
  const stack = new Int32Array(w * h);
  for (let start = 0; start < w * h; start++) {
    if (!alpha[start] || labels[start] !== -1) continue;
    const label = parts.length;
    const part = { label, size: 0, minX: w, minY: h, maxX: -1, maxY: -1 };
    let top = 0;
    stack[top++] = start;
    labels[start] = label;
    while (top > 0) {
      const i = stack[--top];
      const x = i % w;
      const y = (i - x) / w;
      part.size++;
      if (x < part.minX) part.minX = x;
      if (x > part.maxX) part.maxX = x;
      if (y < part.minY) part.minY = y;
      if (y > part.maxY) part.maxY = y;
      const neighbours = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i >= w ? i - w : -1, i < (h - 1) * w ? i + w : -1];
      for (const j of neighbours) {
        if (j >= 0 && alpha[j] && labels[j] === -1) {
          labels[j] = label;
          stack[top++] = j;
        }
      }
    }
    parts.push(part);
  }
  return { labels, parts };
}

/** Supprime les petits îlots détachés du sujet (gouttes d'eau, étincelles, poussière). */
export function removeSmallParts(alpha, w, h, minRatio) {
  const { labels, parts } = components(alpha, w, h);
  const largest = parts.reduce((max, part) => Math.max(max, part.size), 0);
  for (let i = 0; i < w * h; i++) {
    if (labels[i] >= 0 && parts[labels[i]].size < largest * minRatio) alpha[i] = 0;
  }
}

/** Adoucit le contour d'un pixel pour éviter l'effet d'escalier. */
export function softenEdges(alpha, w, h) {
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

export function boundingBox(alpha, w, h, padding) {
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
