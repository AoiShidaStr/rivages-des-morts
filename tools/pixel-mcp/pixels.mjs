// Opérations de pixels du serveur MCP : une toile est { width, height, data: Buffer RGBA }.

export const creer = (width, height) => ({ width, height, data: Buffer.alloc(width * height * 4) });
export const copie = (t) => ({ width: t.width, height: t.height, data: Buffer.from(t.data) });
const dedans = (t, x, y) => x >= 0 && y >= 0 && x < t.width && y < t.height;
export const lire = (t, x, y) => {
  const o = (y * t.width + x) * 4;
  return [t.data[o], t.data[o + 1], t.data[o + 2], t.data[o + 3]];
};
export function poser(t, x, y, c) {
  if (dedans(t, x, y)) t.data.set(c, (y * t.width + x) * 4);
}

const NOMS = { transparent: '#0000', noir: '#000', blanc: '#fff', magenta: '#f0f', vert: '#0f0', black: '#000', white: '#fff' };
export function couleur(s) {
  let h = (NOMS[s] ?? s).replace('#', '');
  if (h.length <= 4) h = [...h].map((c) => c + c).join('');
  if (h.length === 6) h += 'ff';
  const n = parseInt(h, 16);
  if (Number.isNaN(n) || h.length !== 8) throw new Error(`couleur illisible : ${s}`);
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
}
export const hex = (c, alpha = false) =>
  '#' + c.slice(0, alpha ? 4 : 3).map((v) => v.toString(16).padStart(2, '0')).join('');

export function stats(t) {
  const n = new Map();
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = 0; y < t.height; y++)
    for (let x = 0; x < t.width; x++) {
      const o = (y * t.width + x) * 4;
      if (t.data[o + 3] === 0) continue;
      const k = hex([t.data[o], t.data[o + 1], t.data[o + 2]]);
      n.set(k, (n.get(k) ?? 0) + 1);
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  return {
    couleurs: n.size,
    bbox: x1 < 0 ? null : [x0, y0, x1 + 1, y1 + 1],
    frequentes: [...n].sort((a, b) => b[1] - a[1]).slice(0, 8),
  };
}

/** Taille de bloc d'une image « fausse basse résolution » : on cherche la période des changements de couleur. */
export function detecterGrille(t) {
  const axe = (horiz) => {
    const L = horiz ? t.width : t.height;
    const M = horiz ? t.height : t.width;
    const bords = new Float64Array(L);
    for (let j = 0; j < M; j++)
      for (let i = 1; i < L; i++) {
        const a = horiz ? lire(t, i - 1, j) : lire(t, j, i - 1);
        const b = horiz ? lire(t, i, j) : lire(t, j, i);
        if (a[3] === 0 && b[3] === 0) continue;
        bords[i] += Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) + Math.abs(a[3] - b[3]);
      }
    const total = bords.reduce((a, b) => a + b, 0) || 1;
    // score(p) : énergie des bords tombant sur la grille, rapportée au hasard. La vraie période p
    // et ses multiples (2p, 3p…) ont le même score : on garde donc la plus petite proche du maximum.
    const res = [];
    for (let p = 2; p <= Math.min(12, L / 6); p += 0.05) {
      let best = { p, d: 0, score: 0 };
      for (let d = 0; d < Math.ceil(p); d++) {
        let s = 0;
        for (let k = d; k < L; k += p) {
          const i = Math.round(k);
          if (i < L) s += bords[i];
        }
        const score = s / (total / p);
        if (score > best.score) best = { p, d, score };
      }
      res.push(best);
    }
    // Les images IA ont beaucoup de bords hors grille : on cherche un pic net (score bien au-dessus
    // de ses voisins), pas le score le plus haut ; puis on préfère la moitié si elle forme aussi un pic.
    const nette = res.map((r, i) => {
      const autour = res.filter((_, j) => Math.abs(j - i) >= 4 && Math.abs(j - i) <= 10);
      return r.score - autour.reduce((a, b) => a + b.score, 0) / Math.max(1, autour.length);
    });
    let iBest = 0;
    nette.forEach((v, i) => { if (v > nette[iBest]) iBest = i; });
    let meilleur = { ...res[iBest], nettete: nette[iBest] };
    for (let div = 4; div >= 2; div--) {
      const j = res.findIndex((r) => Math.abs(r.p - meilleur.p / div) < 0.03);
      if (j >= 0 && nette[j] >= meilleur.nettete * 0.6) { meilleur = { ...res[j], nettete: nette[j] }; break; }
    }
    return meilleur;
  };
  const gx = axe(true);
  const gy = axe(false);
  const taille = Math.round(((gx.p + gy.p) / 2) * 100) / 100;
  const confiance = Math.min(gx.nettete, gy.nettete);
  if (Math.min(gx.nettete, gy.nettete) < 0.3 || Math.abs(gx.p - gy.p) > 1) return { taille: 1, tx: 1, ty: 1, dx: 0, dy: 0, confiance: 0 };
  return { taille, tx: gx.p, ty: gy.p, dx: gx.d, dy: gy.d, confiance };
}

/** Chaque bloc de `taille` px devient un pixel : couleur la plus fréquente (pixels opaques), transparent si le bloc l'est surtout. */
export function recaler(t, taille, dx = 0, dy = 0) {
  const W = Math.max(1, Math.floor((t.width - dx) / taille));
  const H = Math.max(1, Math.floor((t.height - dy) / taille));
  const r = creer(W, H);
  for (let by = 0; by < H; by++)
    for (let bx = 0; bx < W; bx++) {
      const xa = Math.round(dx + bx * taille), xb = Math.max(xa + 1, Math.round(dx + (bx + 1) * taille));
      const ya = Math.round(dy + by * taille), yb = Math.max(ya + 1, Math.round(dy + (by + 1) * taille));
      // on lit le cœur du bloc pour éviter les bords baveux des images IA
      const m = taille >= 3 ? 1 : 0;
      const votes = new Map();
      let vides = 0, n = 0;
      for (let y = ya + m; y < yb - m || (y === ya + m && y < yb); y++)
        for (let x = xa + m; x < xb - m || (x === xa + m && x < xb); x++) {
          if (!dedans(t, x, y)) continue;
          n++;
          const c = lire(t, x, y);
          if (c[3] < 128) { vides++; continue; }
          const k = ((c[0] >> 3) << 10) | ((c[1] >> 3) << 5) | (c[2] >> 3);
          const v = votes.get(k);
          if (v) { v.n++; v.r += c[0]; v.g += c[1]; v.b += c[2]; } else votes.set(k, { n: 1, r: c[0], g: c[1], b: c[2] });
        }
      if (!n || vides * 2 > n) continue;
      let best = null;
      for (const v of votes.values()) if (!best || v.n > best.n) best = v;
      poser(r, bx, by, [Math.round(best.r / best.n), Math.round(best.g / best.n), Math.round(best.b / best.n), 255]);
    }
  return r;
}

export function plusProcheVoisin(t, w, h) {
  const r = creer(w, h);
  for (let y = 0; y < h; y++) {
    const sy = Math.min(t.height - 1, Math.floor((y * t.height) / h));
    for (let x = 0; x < w; x++) {
      const sx = Math.min(t.width - 1, Math.floor((x * t.width) / w));
      t.data.copy(r.data, (y * w + x) * 4, (sy * t.width + sx) * 4, (sy * t.width + sx) * 4 + 4);
    }
  }
  return r;
}

/** Palette par coupe médiane sur les pixels opaques de plusieurs toiles. */
export function medianCut(ts, n) {
  const px = [];
  // chaque couleur distincte compte une fois : une grande zone d'herbe ne doit pas avaler la palette
  const vues = new Set();
  for (const t of ts)
    for (let i = 0; i < t.data.length; i += 4) {
      if (t.data[i + 3] <= 127) continue;
      const k = (t.data[i] << 16) | (t.data[i + 1] << 8) | t.data[i + 2];
      if (vues.has(k)) continue;
      vues.add(k);
      px.push([t.data[i], t.data[i + 1], t.data[i + 2]]);
    }
  if (!px.length) throw new Error('aucun pixel opaque');
  let boites = [px];
  while (boites.length < n) {
    let idx = -1, ecart = -1, canal = 0;
    boites.forEach((b, i) => {
      if (b.length < 2) return;
      for (let c = 0; c < 3; c++) {
        let lo = 255, hi = 0;
        for (const p of b) { if (p[c] < lo) lo = p[c]; if (p[c] > hi) hi = p[c]; }
        if (hi - lo > ecart) { ecart = hi - lo; idx = i; canal = c; }
      }
    });
    if (idx < 0 || ecart <= 0) break;
    const b = boites[idx].sort((a, z) => a[canal] - z[canal]);
    boites.splice(idx, 1, b.slice(0, b.length >> 1), b.slice(b.length >> 1));
  }
  const pal = boites.map((b) => [0, 1, 2].map((c) => Math.round(b.reduce((s, p) => s + p[c], 0) / b.length)));
  return [...new Map(pal.map((c) => [hex(c), c])).values()];
}

// distance « redmean », proche de la perception sans passer en Lab
function distance(a, b) {
  const rm = (a[0] + b[0]) / 2;
  const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
  return (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
}
const proche = (c, pal) => {
  let best = pal[0], d = Infinity;
  for (const p of pal) { const e = distance(c, p); if (e < d) { d = e; best = p; } }
  return best;
};

export function appliquerPalette(t, pal, tramage) {
  const r = copie(t);
  const err = tramage ? new Float32Array(t.width * t.height * 3) : null;
  for (let y = 0; y < t.height; y++)
    for (let x = 0; x < t.width; x++) {
      const i = y * t.width + x, o = i * 4;
      if (r.data[o + 3] === 0) continue;
      const c = [0, 1, 2].map((k) => Math.max(0, Math.min(255, r.data[o + k] + (err ? err[i * 3 + k] : 0))));
      const p = proche(c, pal);
      r.data[o] = p[0]; r.data[o + 1] = p[1]; r.data[o + 2] = p[2];
      if (err) {
        const e = [0, 1, 2].map((k) => c[k] - p[k]);
        const diffuser = (xx, yy, f) => {
          if (!dedans(t, xx, yy)) return;
          const j = (yy * t.width + xx) * 3;
          for (let k = 0; k < 3; k++) err[j + k] += e[k] * f;
        };
        diffuser(x + 1, y, 7 / 16); diffuser(x - 1, y + 1, 3 / 16); diffuser(x, y + 1, 5 / 16); diffuser(x + 1, y + 1, 1 / 16);
      }
    }
  return r;
}

export function ajuster(t, { luminosite = 0, contraste = 0, saturation = 0, chaleur = 0 }) {
  const r = copie(t);
  const kc = 1 + contraste, ks = 1 + saturation;
  for (let o = 0; o < r.data.length; o += 4) {
    if (r.data[o + 3] === 0) continue;
    let [R, G, B] = [r.data[o], r.data[o + 1], r.data[o + 2]];
    const gris = 0.299 * R + 0.587 * G + 0.114 * B;
    [R, G, B] = [R, G, B].map((v) => gris + (v - gris) * ks);
    [R, G, B] = [R, G, B].map((v) => (v - 128) * kc + 128 + luminosite * 128);
    R += chaleur * 20; B -= chaleur * 20;
    r.data[o] = Math.max(0, Math.min(255, Math.round(R)));
    r.data[o + 1] = Math.max(0, Math.min(255, Math.round(G)));
    r.data[o + 2] = Math.max(0, Math.min(255, Math.round(B)));
  }
  return r;
}

export function detourer(t, fond, tol) {
  const r = copie(t);
  if (!fond) fond = lire(t, 0, 0);
  const t2 = tol * tol;
  for (let o = 0; o < r.data.length; o += 4) {
    const d = (r.data[o] - fond[0]) ** 2 + (r.data[o + 1] - fond[1]) ** 2 + (r.data[o + 2] - fond[2]) ** 2;
    if (d <= t2) r.data[o + 3] = 0;
  }
  return r;
}

export function nettoyerAlpha(t, seuil, isoles) {
  const r = copie(t);
  for (let o = 3; o < r.data.length; o += 4) r.data[o] = r.data[o] >= seuil ? 255 : 0;
  if (isoles) {
    const a = (x, y) => dedans(r, x, y) && r.data[(y * r.width + x) * 4 + 3] > 0;
    const vider = [];
    for (let y = 0; y < r.height; y++)
      for (let x = 0; x < r.width; x++)
        if (a(x, y) && !a(x - 1, y) && !a(x + 1, y) && !a(x, y - 1) && !a(x, y + 1)) vider.push([x, y]);
    for (const [x, y] of vider) r.data[(y * r.width + x) * 4 + 3] = 0;
  }
  return r;
}

/** Contour de `ep` px (passes successives d'un pixel), à l'extérieur du contenu ou sur son bord intérieur. */
export function contour(t, c, interieur, diag, ep = 1) {
  const voisins = diag ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
  // masque de départ : le contenu d'origine, qui grandit (ou rétrécit) d'un pixel à chaque passe
  let plein = new Uint8Array(t.width * t.height);
  for (let i = 0; i < plein.length; i++) plein[i] = t.data[i * 4 + 3] > 0 ? 1 : 0;
  const r = copie(t);
  for (let pass = 0; pass < ep; pass++) {
    const a = (x, y) => dedans(t, x, y) && plein[y * t.width + x] === 1;
    const suivant = Uint8Array.from(plein);
    for (let y = 0; y < t.height; y++)
      for (let x = 0; x < t.width; x++) {
        if (interieur ? !a(x, y) : a(x, y)) continue;
        if (voisins.some(([dx, dy]) => (interieur ? !a(x + dx, y + dy) : a(x + dx, y + dy)))) {
          poser(r, x, y, c);
          suivant[y * t.width + x] = interieur ? 0 : 1;
        }
      }
    plein = suivant;
  }
  return r;
}

export function recadrer(t, [x0, y0, x1, y1]) {
  const r = creer(x1 - x0, y1 - y0);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (dedans(t, x, y)) poser(r, x - x0, y - y0, lire(t, x, y));
  return r;
}

export function miroir(t, vertical) {
  const r = creer(t.width, t.height);
  for (let y = 0; y < t.height; y++)
    for (let x = 0; x < t.width; x++) poser(r, vertical ? x : t.width - 1 - x, vertical ? t.height - 1 - y : y, lire(t, x, y));
  return r;
}

export function coller(d, s, ox, oy) {
  for (let y = 0; y < s.height; y++)
    for (let x = 0; x < s.width; x++) {
      const c = lire(s, x, y);
      if (c[3] === 0 || !dedans(d, x + ox, y + oy)) continue;
      if (c[3] === 255) { poser(d, x + ox, y + oy, c); continue; }
      const b = lire(d, x + ox, y + oy), a = c[3] / 255;
      poser(d, x + ox, y + oy, [0, 1, 2].map((k) => Math.round(c[k] * a + b[k] * (1 - a))).concat(Math.max(c[3], b[3])));
    }
}

export function rectangle(t, x, y, w, h, c) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) poser(t, xx, yy, c);
}

export function ligne(t, x1, y1, x2, y2, c) {
  let dx = Math.abs(x2 - x1), dy = -Math.abs(y2 - y1), err = dx + dy;
  const sx = x1 < x2 ? 1 : -1, sy = y1 < y2 ? 1 : -1;
  for (;;) {
    poser(t, x1, y1, c);
    if (x1 === x2 && y1 === y2) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x1 += sx; }
    if (e2 <= dx) { err += dx; y1 += sy; }
  }
}
