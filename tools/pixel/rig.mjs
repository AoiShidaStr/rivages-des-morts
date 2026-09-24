// Outils du pantin : membres à deux segments, surfaces remplies, lame et traînée de coup.

const add = (a, b) => [a[0] + b[0], a[1] + b[1]];

/**
 * Place le coude (ou le genou) entre `root` et `end` pour deux segments de longueurs `l1` et `l2`.
 * `bend` choisit le côté du pli : +1 plie vers l'avant (vers la droite de l'image), -1 vers l'arrière.
 */
export function joint(root, end, l1, l2, bend) {
  const dx = end[0] - root[0];
  const dy = end[1] - root[1];
  const len = Math.hypot(dx, dy) || 0.01;
  const d = Math.min(len, l1 + l2 - 0.01);
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const ux = dx / len;
  const uy = dy / len;
  const mid = [root[0] + ux * a, root[1] + uy * a];
  // Perpendiculaire orientée pour que le pli parte du côté demandé.
  let px = -uy;
  let py = ux;
  if (Math.sign(px || 1) !== Math.sign(bend)) {
    px = -px;
    py = -py;
  }
  return [mid[0] + px * h, mid[1] + py * h];
}

/** Membre à deux segments ; `colors` donne la couleur du segment haut puis bas. */
export function limb(c, root, end, [l1, l2], bend, r, [upper, lower]) {
  const mid = joint(root, end, l1, l2, bend);
  c.line(root, mid, r, upper);
  c.line(mid, end, r, lower);
  return mid;
}

/** Remplit le quadrilatère dont les bords haut et bas vont de gauche à droite (cape, robe). */
export function quad(c, [tl, tr], [bl, br], color, shade) {
  const y0 = Math.round(Math.min(tl[1], tr[1]));
  const y1 = Math.round(Math.max(bl[1], br[1]));
  for (let y = y0; y <= y1; y++) {
    const t = (y - y0) / Math.max(1, y1 - y0);
    const left = tl[0] + (bl[0] - tl[0]) * t;
    const right = tr[0] + (br[0] - tr[0]) * t;
    for (let x = Math.round(left); x <= Math.round(right); x++) {
      // Une bande d'ombre sur le bord gauche donne du volume.
      c.set(x, y, shade && x < left + 2 ? shade : color);
    }
  }
}

/** Direction d'un angle en degrés (0 = droite, -90 = haut, l'axe y descend). */
export const dir = (deg) => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];

/**
 * Sabre tenu à `hand` : poignée derrière la main, garde, puis lame de `length` pixels.
 * La lame a un fil clair et un dos plus sombre.
 */
export function blade(c, hand, deg, length, pal) {
  const [ux, uy] = dir(deg);
  const back = [hand[0] - ux * 3, hand[1] - uy * 3];
  c.line(back, hand, 0.5, pal.wrap);
  const guard = [hand[0] + ux, hand[1] + uy];
  c.line([guard[0] - uy * 1.5, guard[1] + ux * 1.5], [guard[0] + uy * 1.5, guard[1] - ux * 1.5], 0, pal.guard);
  const start = [hand[0] + ux * 2, hand[1] + uy * 2];
  const tip = [hand[0] + ux * length, hand[1] + uy * length];
  // Le dos de la lame est décalé d'un pixel du côté opposé au tranchant.
  c.line([start[0] - uy, start[1] + ux], [tip[0] - uy * 0.6, tip[1] + ux * 0.6], 0, pal.bladeShade);
  c.line(start, tip, 0, pal.blade);
}

/** Traînée du coup : un arc de cercle autour de `center`, épais au bout et fin au début. */
export function smear(c, center, radius, fromDeg, toDeg, color, light) {
  const steps = Math.ceil(Math.abs(toDeg - fromDeg) / 3);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const [ux, uy] = dir(fromDeg + (toDeg - fromDeg) * t);
    const width = 1 + Math.round(t * 2.5);
    for (let w = 0; w < width; w++) {
      c.set(center[0] + ux * (radius - w), center[1] + uy * (radius - w), w === 0 ? light : color);
    }
  }
}

export { add };
