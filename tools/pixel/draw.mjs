// Outils de dessin partagés par les décors, les PNJ et les sols en pixel art.
export { poly } from './objets.mjs';

/** Petit hachage déterministe (0 à 1) pour semer détails et variations sans aléatoire. */
export function hash(x, y, seed = 0) {
  const h = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return h - Math.floor(h);
}

/** Bruit doux (0 à 1) : valeurs hachées sur une grille de `cell` pixels, interpolées. */
export function noise(x, y, cell, seed = 0) {
  const gx = Math.floor(x / cell);
  const gy = Math.floor(y / cell);
  const fx = x / cell - gx;
  const fy = y / cell - gy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash(gx, gy, seed);
  const b = hash(gx + 1, gy, seed);
  const c = hash(gx, gy + 1, seed);
  const d = hash(gx + 1, gy + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

const toRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = ([r, g, b]) => `#${((Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).padStart(6, '0')}`;

/** Mélange de deux couleurs '#rrggbb' (t = 0 : a, t = 1 : b). */
export function mix(a, b, t) {
  const key = `${a}${b}${t}`;
  let result = mixes.get(key);
  if (!result) {
    const [ar, ag, ab] = toRgb(a);
    const [br, bg, bb] = toRgb(b);
    result = toHex([ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t]);
    mixes.set(key, result);
  }
  return result;
}
const mixes = new Map();

/** Choisit une teinte d'une rampe (de la plus sombre à la plus claire) pour une valeur de 0 à 1. */
export function ramp(colors, t) {
  const i = Math.max(0, Math.min(colors.length - 1, Math.floor(t * colors.length)));
  return colors[i];
}

/**
 * Cylindre vertical éclairé par la gauche (piliers, troncs, poteaux) : colonnes de `x0` à `x1`,
 * rangées de `y0` à `y1`, rampe `[ombre, base, lumière]`.
 */
export function column(c, x0, x1, y0, y1, [dark, base, light]) {
  const w = Math.max(1, x1 - x0);
  for (let x = x0; x <= x1; x++) {
    const t = (x - x0) / w;
    const color = t < 0.25 ? light : t > 0.72 ? dark : base;
    for (let y = y0; y <= y1; y++) c.set(x, y, color);
  }
}

/** Rectangle plein, bords inclus. */
export function box(c, x0, y0, x1, y1, color) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) c.set(x, y, color);
}

/** Corde de paille torsadée (shimenawa) le long d'une suite de points, épaisse de `r`. */
export function rope(c, points, r, [dark, base, light]) {
  let k = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[i + 1];
    const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
    for (let s = 0; s <= steps; s++, k++) {
      const x = ax + ((bx - ax) * s) / steps;
      const y = ay + ((by - ay) * s) / steps;
      c.disc(x, y, r, base);
      // Torsade : un trait sombre en biais tous les trois pixels, un reflet au-dessus.
      if (k % 3 === 0) c.line([x - r * 0.6, y - r], [x + r * 0.6, y + r], 0, dark);
      c.set(x, y - Math.round(r), light);
    }
  }
}

/** Papier plié en zigzag (shide) qui pend de (x, y). */
export function shide(c, x, y, length, color = '#f4f2ec', shadow = '#c9c6bd') {
  for (let i = 0; i < length; i++) {
    const dx = Math.floor(i / 2) % 2 ? 1 : 0;
    c.set(x + dx, y + i, i % 2 ? shadow : color);
    c.set(x + dx + 1, y + i, color);
  }
}

/** Arc de cercle `from` → `to` (degrés, 0 = droite, 90 = bas) de rayon `r`. */
export function arc(c, cx, cy, r, from, to, color) {
  const steps = Math.ceil((Math.abs(to - from) * r) / 40) + 2;
  for (let i = 0; i <= steps; i++) {
    const a = ((from + ((to - from) * i) / steps) * Math.PI) / 180;
    c.set(cx + Math.cos(a) * r, cy + Math.sin(a) * r, color);
  }
}
