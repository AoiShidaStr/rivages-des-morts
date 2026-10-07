// Dessine les effets animés du combat (planches d'images, dans public/sprites/fx) : `npm run vfx`.
//
// Chaque effet est dessiné image par image en SVG, puis rastérisé par sharp et rangé en une bande, avec son
// découpage au format « Array » d'Aseprite (un tag par animation), comme les planches des personnages. Les effets
// se posent au sol (décalques vus de dessus) : dans l'image, l'axe des x est la direction du coup ou de la course.
//
// Style (docs/Charte 2D.md, docs/Charte 3D.md §9) : traits de pinceau, éclaboussures d'encre, aplats or pâle et
// blanc, contour encre bleu-noir, jamais de flou lumineux ; le vermillon reste réservé au danger ennemi.
//
// Usage : npm run vfx            → tous les effets
//         npm run vfx -- impact  → seulement les effets dont le nom commence par « impact »
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'sprites', 'fx');
const only = process.argv.slice(2);

const INK = '#1f2638';
const PAPER = '#fffaf0';
const GOLD = '#e0c27a';
const GOLD_DEEP = '#c99a4a';
const DUST = '#cfd6de';
const FLAME = { outer: '#e8742a', mid: '#f4b942', core: '#fff3c4' };
const STORM = { edge: '#9fc0f0', core: '#f4f8ff' };
const JADE = { mid: '#6fcf8e', light: '#d8f5df' };

// --- Outils de dessin --------------------------------------------------------------------------------------------

/** Générateur pseudo-aléatoire reproductible : les effets sont les mêmes à chaque `npm run vfx`. */
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const deg = (a) => (a * Math.PI) / 180;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const easeOut = (x) => 1 - (1 - clamp01(x)) ** 3;
const lerp = (a, b, t) => a + (b - a) * t;
const pts = (list) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
const polygon = (list, fill, stroke = 'none', width = 0, opacity = 1) =>
  `<polygon points="${pts(list)}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round" opacity="${opacity.toFixed(3)}"/>`;

/** Bande d'un trait de pinceau le long d'un arc de cercle : largeur `width(u)` de la queue (u = 0) à la tête (u = 1). */
function arcBand(cx, cy, radius, from, to, width, steps = 40) {
  const outer = [];
  const inner = [];
  for (let k = 0; k <= steps; k++) {
    const u = k / steps;
    const a = deg(lerp(from, to, u));
    const w = width(u);
    outer.push([cx + Math.cos(a) * radius, cy + Math.sin(a) * radius]);
    inner.push([cx + Math.cos(a) * (radius - w), cy + Math.sin(a) * (radius - w)]);
  }
  return [...outer, ...inner.reverse()];
}

/** Langue de flamme : une goutte allongée de (x0, y0) vers (x1, y1), ondulée. */
function tongue(x0, y0, x1, y1, width, wobble, phase) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  const left = [];
  const right = [];
  const steps = 14;
  for (let k = 0; k <= steps; k++) {
    const u = k / steps;
    const half = width * Math.sin(Math.PI * Math.min(1, u * 1.15)) * (1 - u) ** 0.35 * (u < 0.15 ? 0.6 + u * 2.6 : 1);
    const wave = wobble * Math.sin(phase + u * 5) * u;
    const x = x0 + dx * u + nx * wave;
    const y = y0 + dy * u + ny * wave;
    left.push([x + nx * half, y + ny * half]);
    right.push([x - nx * half, y - ny * half]);
  }
  return [...left, ...right.reverse()];
}

/** Tache d'encre irrégulière (éclaboussure) : `spikes` pointes entre les rayons `inner` et `outer`. */
function splat(cx, cy, inner, outer, spikes, rand, rotation = 0) {
  const list = [];
  for (let k = 0; k < spikes * 2; k++) {
    const a = rotation + (k / (spikes * 2)) * Math.PI * 2 + (rand() - 0.5) * 0.25;
    const r = k % 2 === 0 ? outer * (0.75 + rand() * 0.4) : inner * (0.8 + rand() * 0.35);
    list.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return list;
}

const drop = (x, y, r, fill, opacity = 1) =>
  `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${r.toFixed(1)}" ry="${(r * 0.8).toFixed(1)}" fill="${fill}" stroke="${INK}" stroke-width="1.5" opacity="${opacity.toFixed(3)}"/>`;

// --- Effets ------------------------------------------------------------------------------------------------------

/** Coup d'arme en arc : un trait de pinceau balaie l'arc de l'arme, puis s'effiloche en poils secs. */
function slash(arcDeg) {
  const S = 256;
  const c = S / 2;
  const R = 118;
  const full = arcDeg >= 360;
  const a0 = full ? -180 : -arcDeg / 2;
  const a1 = full ? 180 : arcDeg / 2;
  const N = 8;
  const rand = seeded(arcDeg);
  const flecks = [...Array(5)].map(() => ({ off: rand(), r: 2 + rand() * 3, out: 6 + rand() * 18 }));
  return [...Array(N)].map((_, i) => {
    const p = i / (N - 1);
    const head = lerp(a0, a1, easeOut(p / 0.5));
    const tail = lerp(a0, a1, clamp01((p - 0.3) / 0.7) ** 1.4);
    const fade = 1 - clamp01((p - 0.7) / 0.3);
    const W = 46 * (1 - 0.45 * clamp01((p - 0.45) / 0.55));
    let body = '';
    if (head - tail > 2) {
      const width = (u) => W * (0.12 + 0.88 * u ** 0.6);
      body += polygon(arcBand(c, c, R, tail, head, width), PAPER, INK, 2.5, fade);
      // Liseré or pâle au bord intérieur du trait.
      body += polygon(arcBand(c, c, R - W * 0.55, tail, head, (u) => W * 0.32 * u ** 0.7), GOLD, 'none', 0, fade);
      // Poils secs : de fins traits qui traînent derrière la queue.
      for (let k = 0; k < 4; k++) {
        const r = R - 4 - k * (W / 4);
        const len = (head - tail) * (0.35 + 0.15 * k);
        const from = Math.max(a0, tail - len * 0.4);
        body += polygon(arcBand(c, c, r, from, tail + len * 0.25, () => 2.2), PAPER, 'none', 0, fade * 0.85);
      }
    }
    // Gouttes projetées depuis la tête à la fin du coup.
    if (p > 0.3) {
      const q = clamp01((p - 0.3) / 0.7);
      for (const f of flecks) {
        const a = deg(lerp(a0, a1, 0.55 + f.off * 0.45));
        const r = R + f.out * q * 1.6;
        body += drop(c + Math.cos(a) * r, c + Math.sin(a) * r, f.r * (1 - q * 0.5), GOLD, fade);
      }
    }
    return svg(S, S, body);
  });
}

/** Estoc : une lance de pinceau jaillit droit devant, puis sa queue la rattrape. */
function thrust() {
  const W = 256;
  const H = 96;
  const N = 7;
  const cy = H / 2;
  return [...Array(N)].map((_, i) => {
    const p = i / (N - 1);
    const tip = lerp(30, W - 6, easeOut(p / 0.45));
    const tail = lerp(4, W - 40, clamp01((p - 0.3) / 0.7) ** 1.3);
    const fade = 1 - clamp01((p - 0.7) / 0.3);
    const half = 15 * (1 - 0.4 * clamp01((p - 0.4) / 0.6));
    let body = '';
    if (tip - tail > 6) {
      const shape = [
        [tail, cy - half * 0.15],
        [lerp(tail, tip, 0.7), cy - half],
        [tip, cy],
        [lerp(tail, tip, 0.7), cy + half],
        [tail, cy + half * 0.15],
      ];
      body += polygon(shape, PAPER, INK, 2.5, fade);
      body += polygon([[lerp(tail, tip, 0.25), cy], [lerp(tail, tip, 0.72), cy - half * 0.35], [tip - 6, cy], [lerp(tail, tip, 0.72), cy + half * 0.35]], GOLD, 'none', 0, fade);
      // Traits de vitesse au-dessus et en dessous.
      for (const [dy, k] of [[-half - 10, 0.55], [half + 10, 0.45], [-half - 22, 0.3]]) {
        const x1 = lerp(tail, tip, 0.85);
        const x0 = lerp(tail, x1, 1 - k);
        body += `<line x1="${x0.toFixed(1)}" y1="${(cy + dy).toFixed(1)}" x2="${x1.toFixed(1)}" y2="${(cy + dy).toFixed(1)}" stroke="${PAPER}" stroke-width="3" stroke-linecap="round" opacity="${(fade * 0.8).toFixed(3)}"/>`;
      }
    }
    return svg(W, H, body);
  });
}

/** Impact sur un ennemi : une éclaboussure d'encre or pâle qui éclate en gouttes. */
function impact() {
  const S = 192;
  const c = S / 2;
  const N = 7;
  const rand = seeded(7);
  const shape = { rot: rand() * Math.PI };
  const drops = [...Array(9)].map((_, k) => ({ a: (k / 9) * Math.PI * 2 + rand() * 0.5, d: 0.7 + rand() * 0.5, r: 3 + rand() * 5 }));
  return [...Array(N)].map((_, i) => {
    const p = i / (N - 1);
    const grow = easeOut(p / 0.4);
    const fade = 1 - clamp01((p - 0.55) / 0.45);
    const outer = 22 + 52 * grow;
    const r2 = seeded(11);
    let body = '';
    if (p < 0.85) {
      body += polygon(splat(c, c, outer * 0.45, outer, 8, r2, shape.rot), PAPER, INK, 2.5, fade);
      body += polygon(splat(c, c, outer * 0.22, outer * 0.55, 8, seeded(13), shape.rot + 0.2), GOLD, 'none', 0, fade);
      body += `<circle cx="${c}" cy="${c}" r="${(outer * 0.18).toFixed(1)}" fill="${PAPER}" opacity="${fade.toFixed(3)}"/>`;
    }
    for (const d of drops) {
      const r = outer * d.d + 40 * clamp01((p - 0.2) / 0.8);
      body += drop(c + Math.cos(d.a) * r, c + Math.sin(d.a) * r, d.r * (1 - 0.4 * p), d.r > 5 ? GOLD : PAPER, fade);
    }
    return svg(S, S, body);
  });
}

/** Esquive : traits de vitesse et bouffées de poussière laissés derrière le héros (le héros file vers +x). */
function dodge() {
  const W = 256;
  const H = 128;
  const N = 8;
  const cy = H / 2;
  const rand = seeded(3);
  const puffs = [...Array(6)].map((_, k) => ({ x: 70 + k * 18 + rand() * 10, y: cy + (rand() - 0.5) * 50, r: 9 + rand() * 9, delay: k * 0.06 }));
  return [...Array(N)].map((_, i) => {
    const p = i / (N - 1);
    const fade = 1 - clamp01((p - 0.4) / 0.6);
    let body = '';
    for (const pf of puffs) {
      const q = clamp01((p - pf.delay) / 0.8);
      if (q <= 0 || q >= 1) continue;
      const r = pf.r * (0.6 + 0.9 * easeOut(q));
      const x = pf.x - 25 * q;
      body += `<circle cx="${x.toFixed(1)}" cy="${pf.y.toFixed(1)}" r="${r.toFixed(1)}" fill="${DUST}" stroke="${INK}" stroke-width="1.5" opacity="${((1 - q) * 0.9).toFixed(3)}"/>`;
    }
    // Traits de vitesse : partent du héros (à droite) et raccourcissent.
    for (const [dy, len] of [[-22, 1], [-6, 0.75], [12, 0.9], [28, 0.6]]) {
      const x1 = W - 40 - 30 * p;
      const x0 = x1 - 150 * len * (1 - 0.7 * p);
      body += `<line x1="${x0.toFixed(1)}" y1="${(cy + dy).toFixed(1)}" x2="${x1.toFixed(1)}" y2="${(cy + dy).toFixed(1)}" stroke="${PAPER}" stroke-width="${(4 - 2 * p).toFixed(1)}" stroke-linecap="round" opacity="${(fade * 0.85).toFixed(3)}"/>`;
    }
    return svg(W, H, body);
  });
}

/** Boule de feu du Sorcier : une comète de flammes en aplats, qui vole vers +x (boucle). */
function fireball() {
  const W = 256;
  const H = 128;
  const N = 8;
  const hx = 182;
  const cy = H / 2;
  const rand = seeded(5);
  const embers = [...Array(6)].map(() => ({ x: 40 + rand() * 90, y: (rand() - 0.5) * 44, s: 2.5 + rand() * 3, v: 0.5 + rand() }));
  return [...Array(N)].map((_, i) => {
    const ph = (i / N) * Math.PI * 2;
    let body = '';
    for (const e of embers) {
      const x = ((e.x - (i / N) * 60 * e.v) % 140 + 140) % 140 + 20;
      const y = cy + e.y + Math.sin(ph + e.x) * 3;
      const s = e.s;
      body += polygon([[x, y - s], [x + s, y], [x, y + s], [x - s, y]], FLAME.mid, INK, 1, 0.9);
    }
    const layers = [
      { color: FLAME.outer, len: 150, w: 30, stroke: true },
      { color: FLAME.mid, len: 105, w: 21, stroke: false },
      { color: FLAME.core, len: 60, w: 13, stroke: false },
    ];
    for (const L of layers) {
      for (const [dy, k, off] of [[-12, 0.75, 0], [12, 0.8, 2], [0, 1, 4]]) {
        const x1 = hx - L.len * k * (0.92 + 0.08 * Math.sin(ph * 2 + off));
        body += polygon(tongue(hx + 6, cy + dy * 0.4, x1, cy + dy + Math.sin(ph + off) * 6, L.w * (k === 1 ? 1 : 0.7), 7, ph + off), L.color, L.stroke ? INK : 'none', L.stroke ? 2.5 : 0);
      }
    }
    body += `<circle cx="${hx}" cy="${cy}" r="24" fill="${FLAME.mid}" stroke="${INK}" stroke-width="2.5"/>`;
    body += `<circle cx="${hx + 3}" cy="${cy}" r="${(15 + Math.sin(ph * 2)).toFixed(1)}" fill="${FLAME.core}"/>`;
    body += `<circle cx="${hx + 9}" cy="${cy - 6}" r="5" fill="#ffffff"/>`;
    return svg(W, H, body);
  });
}

/** Explosion du météore : une couronne de flammes s'ouvre depuis le centre, puis retombe en braises. */
function fireBurst() {
  const S = 512;
  const c = S / 2;
  const N = 9;
  const tongues = 18;
  const rand = seeded(9);
  const offs = [...Array(tongues)].map(() => ({ da: (rand() - 0.5) * 0.12, k: 0.75 + rand() * 0.5 }));
  const embers = [...Array(16)].map(() => ({ a: rand() * Math.PI * 2, d: 0.6 + rand() * 0.5, s: 4 + rand() * 4 }));
  return [...Array(N)].map((_, i) => {
    const p = i / (N - 1);
    const ring = 50 + 170 * easeOut(p / 0.55);
    const height = 115 * (1 - clamp01((p - 0.35) / 0.65)) + 8;
    const fade = 1 - clamp01((p - 0.65) / 0.35);
    let body = '';
    // Éclair central, très bref.
    if (p < 0.35) {
      const r = 40 + 140 * easeOut(p / 0.35);
      body += `<circle cx="${c}" cy="${c}" r="${r.toFixed(1)}" fill="${FLAME.core}" opacity="${(1 - p / 0.35).toFixed(3)}"/>`;
    }
    for (const [color, scale, stroke] of [[FLAME.outer, 1, true], [FLAME.mid, 0.62, false], [FLAME.core, 0.32, false]]) {
      for (let k = 0; k < tongues; k++) {
        const o = offs[k];
        const a = (k / tongues) * Math.PI * 2 + o.da + p * 0.3;
        const x0 = c + Math.cos(a) * (ring - 10);
        const y0 = c + Math.sin(a) * (ring - 10);
        const h = height * o.k * scale;
        const x1 = c + Math.cos(a) * (ring + h);
        const y1 = c + Math.sin(a) * (ring + h);
        body += polygon(tongue(x0, y0, x1, y1, 34 * scale + 8, 7, a * 3 + p * 6), color, stroke ? INK : 'none', stroke ? 2.5 : 0, fade);
      }
    }
    if (p > 0.4) {
      const q = clamp01((p - 0.4) / 0.6);
      for (const e of embers) {
        const r = ring * e.d + 60 * q;
        const x = c + Math.cos(e.a) * r;
        const y = c + Math.sin(e.a) * r;
        const s = e.s * (1 - q * 0.6);
        body += polygon([[x, y - s], [x + s, y], [x, y + s], [x - s, y]], GOLD_DEEP, INK, 1, 1 - q);
      }
    }
    return svg(S, S, body);
  });
}

/** Ligne brisée d'un éclair, de (x0, y0) à (x1, y1) : `steps` segments décalés au hasard sur le côté. */
function zigzag(x0, y0, x1, y1, steps, jitter, rand) {
  const list = [[x0, y0]];
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  for (let k = 1; k < steps; k++) {
    const u = k / steps;
    const side = (rand() - 0.5) * 2 * jitter * Math.sin(Math.PI * u) ** 0.5;
    list.push([x0 + dx * u + nx * side, y0 + dy * u + ny * side]);
  }
  list.push([x1, y1]);
  return list;
}

/** Trait d'éclair à trois couches : contour encre, bleu orage, cœur blanc. */
function boltStroke(list, width, opacity) {
  const line = (color, w) =>
    `<polyline points="${pts(list)}" fill="none" stroke="${color}" stroke-width="${w.toFixed(1)}" stroke-linejoin="miter" stroke-miterlimit="3" stroke-linecap="round" opacity="${opacity.toFixed(3)}"/>`;
  return line(INK, width + 5) + line(STORM.edge, width) + line(STORM.core, Math.max(1.5, width * 0.4));
}

/** Petite étoile à quatre branches (étincelle, éclat de lumière). */
const sparkle = (x, y, r, fill, opacity = 1, stroke = INK) =>
  polygon([[x, y - r], [x + r * 0.28, y - r * 0.28], [x + r, y], [x + r * 0.28, y + r * 0.28], [x, y + r], [x - r * 0.28, y + r * 0.28], [x - r, y], [x - r * 0.28, y - r * 0.28]], fill, stroke, 1.2, opacity);

/** Foudre, partie debout : l'éclair tombe du ciel, s'éteint, frappe une seconde fois, puis s'efface. */
function lightningBolt() {
  const W = 160;
  const H = 512;
  const c = W / 2;
  const ground = H - 18;
  // Intensité de chaque image : deux coups de tonnerre, le second plus bref.
  const beats = [1, 0.95, 0.3, 1, 0.85, 0.5, 0.25, 0.08];
  const paths = [seeded(21), seeded(22)].map((rand) => {
    const main = zigzag(c + (rand() - 0.5) * 30, 0, c, ground, 11, 26, rand);
    const branches = [3, 6].map((k) => {
      const [bx, by] = main[k];
      const side = rand() < 0.5 ? -1 : 1;
      return zigzag(bx, by, bx + side * (35 + rand() * 25), by + 70 + rand() * 50, 4, 10, rand);
    });
    return { main, branches };
  });
  return beats.map((power, i) => {
    const { main, branches } = paths[i < 3 ? 0 : 1];
    const width = 7 + 10 * power;
    let body = '';
    // Éclat au point d'impact, à plat sur le sol (l'ellipse donne la perspective).
    body += `<ellipse cx="${c}" cy="${ground}" rx="${(22 + 50 * power).toFixed(1)}" ry="${(7 + 12 * power).toFixed(1)}" fill="${STORM.core}" stroke="${INK}" stroke-width="2" opacity="${(0.9 * power).toFixed(3)}"/>`;
    for (const b of branches) body += boltStroke(b, width * 0.45, power);
    body += boltStroke(main, width, Math.min(1, power + 0.1));
    if (power > 0.8) for (const [x, y, r] of [[c - 30, ground - 30, 9], [c + 34, ground - 18, 7], [c + 12, ground - 52, 6]]) body += sparkle(x, y, r * power, STORM.core);
    return svg(W, H, body);
  });
}

/** Foudre, partie au sol : un éclat blanc, des fissures en étoile et une brûlure d'encre qui s'efface. */
function lightningGround() {
  const S = 256;
  const c = S / 2;
  const N = 8;
  const rand = seeded(23);
  const cracks = [...Array(7)].map((_, k) => {
    const a = (k / 7) * Math.PI * 2 + (rand() - 0.5) * 0.5;
    const len = 70 + rand() * 45;
    return zigzag(c, c, c + Math.cos(a) * len, c + Math.sin(a) * len, 5, 9, rand);
  });
  const sparks = [...Array(8)].map(() => ({ a: rand() * Math.PI * 2, d: 30 + rand() * 30, r: 4 + rand() * 4 }));
  return [...Array(N)].map((_, i) => {
    const p = i / (N - 1);
    const grow = easeOut(p / 0.3);
    const fade = 1 - clamp01((p - 0.35) / 0.65);
    let body = '';
    body += polygon(splat(c, c, 26, 48, 9, seeded(24)), INK, 'none', 0, 0.45 * fade);
    for (const crack of cracks) {
      const part = crack.slice(0, Math.max(2, Math.round(grow * crack.length)));
      body += boltStroke(part, 5 * (1 - 0.5 * p), fade);
    }
    if (p < 0.3) body += `<circle cx="${c}" cy="${c}" r="${(30 + 60 * easeOut(p / 0.3)).toFixed(1)}" fill="${STORM.core}" opacity="${(1 - p / 0.3).toFixed(3)}"/>`;
    for (const s of sparks) {
      const d = s.d + 70 * easeOut(p);
      body += sparkle(c + Math.cos(s.a) * d, c + Math.sin(s.a) * d, s.r * (1 - 0.6 * p), STORM.core, fade);
    }
    return svg(S, S, body);
  });
}

/** Soin, partie debout : des pétales de jade et des éclats montent autour du héros, puis s'effacent. */
function healRise() {
  const W = 160;
  const H = 320;
  const N = 10;
  const rand = seeded(31);
  const motes = [...Array(9)].map((_, k) => ({
    x: 30 + rand() * 100,
    delay: (k / 9) * 0.45,
    rise: 140 + rand() * 120,
    r: 8 + rand() * 7,
    turn: rand() * Math.PI * 2,
    petal: k % 3 !== 2,
  }));
  return [...Array(N)].map((_, i) => {
    const p = i / (N - 1);
    let body = '';
    for (const m of motes) {
      const q = clamp01((p - m.delay) / 0.55);
      if (q <= 0 || q >= 1) continue;
      const y = H - 30 - m.rise * easeOut(q);
      const x = m.x + Math.sin(m.turn + q * 4) * 8;
      const s = m.r * Math.sin(Math.PI * Math.min(1, q * 1.4)) + 1;
      const o = 1 - clamp01((q - 0.6) / 0.4);
      if (m.petal) {
        const a = m.turn + q * 2;
        const ax = Math.cos(a) * s * 1.6;
        const ay = Math.sin(a) * s * 1.6;
        body += `<path d="M ${(x - ax).toFixed(1)} ${(y - ay).toFixed(1)} Q ${(x - ay * 0.7).toFixed(1)} ${(y + ax * 0.7).toFixed(1)} ${(x + ax).toFixed(1)} ${(y + ay).toFixed(1)} Q ${(x + ay * 0.7).toFixed(1)} ${(y - ax * 0.7).toFixed(1)} ${(x - ax).toFixed(1)} ${(y - ay).toFixed(1)} Z" fill="${JADE.mid}" stroke="${INK}" stroke-width="1.5" opacity="${o.toFixed(3)}"/>`;
        body += `<circle cx="${(x - ax * 0.25).toFixed(1)}" cy="${(y - ay * 0.25).toFixed(1)}" r="${(s * 0.35).toFixed(1)}" fill="${JADE.light}" opacity="${o.toFixed(3)}"/>`;
      } else {
        body += sparkle(x, y, s * 1.3, PAPER, o);
      }
    }
    return svg(W, H, body);
  });
}

/** Soin, partie au sol : un cercle de pinceau (ensō) jade se trace autour du héros, puis pâlit. */
function healRing() {
  const S = 256;
  const c = S / 2;
  const N = 9;
  return [...Array(N)].map((_, i) => {
    const p = i / (N - 1);
    const head = -100 + 330 * easeOut(p / 0.55);
    const fade = 1 - clamp01((p - 0.55) / 0.45);
    let body = '';
    if (head > -95) {
      body += polygon(arcBand(c, c, 112, -100, head, (u) => 16 * (0.25 + 0.75 * Math.sin(Math.PI * Math.min(1, u * 0.9 + 0.1)))), JADE.mid, INK, 2.2, fade);
      body += polygon(arcBand(c, c, 106, -96, head - 6, (u) => 4 * u), JADE.light, 'none', 0, fade);
    }
    return svg(S, S, body);
  });
}

/**
 * Aura de lumière du Paladin (boucle) : un cercle de pinceau or en trois arcs qui tournent lentement, des rayons
 * qui respirent et un voile doré sur la zone. Trois arcs : un tiers de tour par boucle suffit à la refermer.
 */
function auraLoop() {
  const S = 512;
  const c = S / 2;
  const N = 12;
  const R = 236;
  return [...Array(N)].map((_, i) => {
    const t = i / N;
    const spin = t * 120;
    const breath = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
    let body = `<circle cx="${c}" cy="${c}" r="${R - 8}" fill="${GOLD}" opacity="0.12"/>`;
    body += `<circle cx="${c}" cy="${c}" r="${R - 30}" fill="none" stroke="${PAPER}" stroke-width="2" stroke-dasharray="6 14" opacity="0.55" transform="rotate(${(-spin * 0.5).toFixed(1)} ${c} ${c})"/>`;
    for (let k = 0; k < 3; k++) {
      const from = spin + k * 120;
      body += polygon(arcBand(c, c, R, from, from + 92, (u) => 18 * (0.2 + 0.8 * Math.sin(Math.PI * u))), GOLD, INK, 2.2);
      body += polygon(arcBand(c, c, R - 5, from + 10, from + 80, (u) => 5 * Math.sin(Math.PI * u)), PAPER, 'none', 0, 0.9);
    }
    // Rayons courts dans les creux entre les arcs, qui s'allongent et raccourcissent.
    for (let k = 0; k < 12; k++) {
      const a = deg(spin + k * 30 + 15);
      const r0 = R - 34;
      const r1 = r0 + 14 + 16 * (k % 2 ? breath : 1 - breath);
      const side = deg(2.2);
      body += polygon(
        [[c + Math.cos(a - side) * r0, c + Math.sin(a - side) * r0], [c + Math.cos(a) * r1, c + Math.sin(a) * r1], [c + Math.cos(a + side) * r0, c + Math.sin(a + side) * r0]],
        PAPER, INK, 1.2, 0.8,
      );
    }
    return svg(S, S, body);
  });
}

/** Aura de lumière, lancement : des rayons or jaillissent du héros, puis un anneau de lumière s'ouvre jusqu'au bord. */
function auraBurst() {
  const S = 512;
  const c = S / 2;
  const N = 9;
  const rand = seeded(41);
  const rays = [...Array(16)].map((_, k) => ({ a: (k / 16) * Math.PI * 2 + (rand() - 0.5) * 0.15, len: 0.7 + rand() * 0.3, w: k % 2 ? 7 : 11 }));
  return [...Array(N)].map((_, i) => {
    const p = i / (N - 1);
    const reach = easeOut(p / 0.5);
    const fade = 1 - clamp01((p - 0.5) / 0.5);
    let body = '';
    if (p < 0.3) body += `<circle cx="${c}" cy="${c}" r="${(40 + 80 * (p / 0.3)).toFixed(1)}" fill="${PAPER}" opacity="${(1 - p / 0.3).toFixed(3)}"/>`;
    for (const ray of rays) {
      const r1 = 30 + 210 * reach * ray.len;
      const r0 = Math.max(24, r1 - 120);
      const w = deg(ray.w * (1 - 0.5 * p)) / 2;
      const tri = [[c + Math.cos(ray.a - w) * r0, c + Math.sin(ray.a - w) * r0], [c + Math.cos(ray.a) * r1, c + Math.sin(ray.a) * r1], [c + Math.cos(ray.a + w) * r0, c + Math.sin(ray.a + w) * r0]];
      body += polygon(tri, ray.w > 8 ? GOLD : PAPER, INK, 1.8, fade);
    }
    const ring = 60 + 180 * easeOut(p);
    body += polygon(arcBand(c, c, ring, 0, 360, () => 14 * (1 - p) + 3, 72), GOLD, INK, 2, fade);
    return svg(S, S, body);
  });
}

/** Marteau du Paladin en vol (boucle) : vu de dessus, il fait un tour complet, sa tête laisse un trait de pinceau. */
function hammerSpin() {
  const S = 192;
  const c = S / 2;
  const N = 8;
  return [...Array(N)].map((_, i) => {
    const turn = (i / N) * 360;
    let body = '';
    // Trait laissé par la tête (le marteau tourne dans le sens des aiguilles d'une montre dans l'image).
    body += polygon(arcBand(c, c, 66, turn - 150, turn - 6, (u) => 30 * u ** 1.5), PAPER, 'none', 0, 0.75);
    body += polygon(arcBand(c, c, 66, turn - 70, turn - 6, (u) => 16 * u), GOLD, 'none', 0, 0.8);
    const handle = `<rect x="${c - 46}" y="${c - 5}" width="76" height="10" rx="4" fill="${GOLD_DEEP}" stroke="${INK}" stroke-width="2.5"/>`;
    const grip = `<rect x="${c - 46}" y="${c - 6}" width="16" height="12" rx="3" fill="${INK}"/>`;
    const head = `<rect x="${c + 26}" y="${c - 24}" width="36" height="48" rx="6" fill="${GOLD}" stroke="${INK}" stroke-width="3"/>`
      + `<rect x="${c + 32}" y="${c - 18}" width="10" height="36" rx="3" fill="${PAPER}" opacity="0.85"/>`
      + `<line x1="${c + 52}" y1="${c - 24}" x2="${c + 52}" y2="${c + 24}" stroke="${INK}" stroke-width="2"/>`;
    body += `<g transform="rotate(${turn.toFixed(1)} ${c} ${c})">${handle}${grip}${head}</g>`;
    return svg(S, S, body);
  });
}

// --- Style « lumière » (essai sur le Guerrier, octobre 2026) -----------------------------------------------------
//
// Inspiré des effets de Merakintsugi : pas de contour, un cœur blanc et une seule couleur d'accent par classe,
// des traits très fins effilés en pointe, un pic très bref sur l'impact, puis la dissolution en éclats.

/** Couleurs de lumière par classe : cœur, accent, accent sombre (jamais le vermillon, réservé au danger). */
const LIGHT = {
  guerrier: { core: '#fffaf0', main: '#ffbf5e', deep: '#e0782f' },
};

/** Croissant effilé aux deux bouts, plus épais vers la tête (u = 1). */
const needle = (maxW, peak = 0.78) => (u) => {
  const a = u < peak ? (u / peak) ** 1.4 : ((1 - u) / (1 - peak)) ** 0.6;
  return Math.max(0.6, maxW * a);
};

/** Éclat : un losange très allongé, orienté selon `angle`. */
function sliver(x, y, length, width, angle, fill, opacity) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const p = (along, across) => [x + c * along - s * across, y + s * along + c * across];
  return polygon([p(-length / 2, 0), p(0, -width / 2), p(length / 2, 0), p(0, width / 2)], fill, 'none', 0, opacity);
}

/** Coup d'arme en arc, style lumière : une traînée fine et nette balaie l'arc, puis éclate en éclats. */
function slashLight(arcDeg, color) {
  const S = 256;
  const c = S / 2;
  const R = 116;
  const full = arcDeg >= 360;
  const a0 = full ? -180 : -arcDeg / 2;
  const a1 = full ? 180 : arcDeg / 2;
  const span = a1 - a0;
  const N = 6;
  const rand = seeded(arcDeg + 101);
  const shards = [...Array(9)].map(() => ({ u: 0.35 + rand() * 0.65, out: 4 + rand() * 22, len: 8 + rand() * 14, w: 1.6 + rand() * 1.6, drift: 0.6 + rand() * 0.8, white: rand() < 0.35 }));
  // Tête et queue de la traînée à chaque image : départ, pic sur l'impact (image 2), retrait, éclats.
  const head = [0.18, 0.72, 1, 1, 1, 1];
  const tail = [0, 0.05, 0.25, 0.62, 0.92, 1];
  const thick = [0.35, 0.85, 1, 0.55, 0.2, 0];
  return [...Array(N)].map((_, i) => {
    const h = lerp(a0, a1, head[i]);
    const t = lerp(a0, a1, tail[i]);
    const W = 20 * thick[i];
    let body = '';
    if (h - t > 2 && W > 0.5) {
      // Corps de la traînée en accent, cœur blanc sur le bord d'attaque (extérieur), filets fins à l'intérieur.
      // Voile de mouvement : une bande plus large et translucide, qui donne sa masse au geste.
      body += polygon(arcBand(c, c, R - 2, t, h, needle(W * 2.1, 0.7)), color.main, 'none', 0, 0.28);
      body += polygon(arcBand(c, c, R, t, h, needle(W)), color.main, 'none', 0, 0.95);
      body += polygon(arcBand(c, c, R, t + (h - t) * 0.25, h, needle(W * 0.42)), color.core, 'none', 0, 1);
      for (const [dr, k, w] of [[W + 6, 0.55, 1.6], [W + 13, 0.35, 1.1]]) {
        const from = h - (h - t) * k;
        body += polygon(arcBand(c, c, R - dr, from, h - 3, needle(w, 0.7)), color.deep, 'none', 0, 0.8 * thick[i]);
      }
      // Fines lignes de vitesse à l'extérieur, qui précèdent la tête au pic.
      if (i <= 2) body += polygon(arcBand(c, c, R + 7, h - span * 0.3, h + 2, needle(1.3, 0.85)), color.core, 'none', 0, 0.7);
    }
    // Éclats projetés depuis le chemin de la lame, qui filent dans le sens du coup puis s'éteignent.
    if (i >= 3) {
      const q = (i - 2) / (N - 3);
      for (const s of shards) {
        const a = deg(lerp(a0, a1, s.u) + span * 0.06 * q * s.drift);
        const r = R - 6 + s.out * q * 1.4;
        const x = c + Math.cos(a) * r;
        const y = c + Math.sin(a) * r;
        body += sliver(x, y, s.len * (1 - q * 0.55), s.w, a + Math.PI / 2, s.white ? color.core : color.main, 1 - q * 0.7);
      }
    }
    return svg(S, S, body);
  });
}

/** Impact, style lumière : une étoile blanche sèche, un trait, des éclats d'accent ; dressé face à la caméra. */
function impactLight(color) {
  const S = 160;
  const c = S / 2;
  const N = 5;
  const rand = seeded(55);
  const tilt = deg(-18);
  const shards = [...Array(7)].map((_, k) => ({ a: tilt + (k / 7) * Math.PI * 2 + (rand() - 0.5) * 0.5, len: 10 + rand() * 12, w: 2 + rand() * 1.5, d: 0.8 + rand() * 0.5 }));
  const star = (r, w, fill, opacity) =>
    [0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((a, k) => sliver(c + Math.cos(tilt + a) * r * (k % 2 ? 0.32 : 0.5), c + Math.sin(tilt + a) * r * (k % 2 ? 0.32 : 0.5), r * (k % 2 ? 0.64 : 1), w, tilt + a, fill, opacity)).join('');
  const size = [44, 62, 40, 0, 0];
  return [...Array(N)].map((_, i) => {
    const q = i / (N - 1);
    let body = '';
    if (size[i]) {
      body += star(size[i] * 1.25, 9 - i * 2, color.main, 0.9);
      body += star(size[i], 5 - i, color.core, 1);
      body += `<circle cx="${c}" cy="${c}" r="${(7 - i * 2.5).toFixed(1)}" fill="${color.core}"/>`;
    }
    // Trait horizontal très fin, le « clac » du coup.
    if (i <= 1) body += sliver(c, c, 120 + 30 * i, 2.2, tilt * 0.3, color.core, 0.9);
    if (i >= 1) {
      for (const s of shards) {
        const r = (16 + 40 * easeOut(q)) * s.d;
        body += sliver(c + Math.cos(s.a) * r, c + Math.sin(s.a) * r, s.len * (1 - q * 0.6), s.w, s.a, i % 2 ? color.main : color.core, 1 - q * 0.8);
      }
    }
    return svg(S, S, body);
  });
}

/** Poussière d'esquive, style lumière : des volutes claires, juste esquissées, qui traînent derrière (héros vers +x). */
function dustLight() {
  const W = 256;
  const H = 128;
  const N = 8;
  const rand = seeded(77);
  const base = H - 22;
  const curls = [...Array(5)].map((k, i) => ({ x: 150 - i * 26 + rand() * 10, r: 9 + rand() * 9 + i * 1.5, delay: i * 0.06, rise: 10 + rand() * 18 }));
  return [...Array(N)].map((_, i) => {
    const p = i / (N - 1);
    let body = '';
    for (const cu of curls) {
      const q = clamp01((p - cu.delay) / 0.85);
      if (q <= 0 || q >= 1) continue;
      const r = cu.r * (0.5 + 0.8 * easeOut(q));
      const x = cu.x - 30 * easeOut(q);
      const y = base - cu.rise * easeOut(q) - r * 0.5;
      const o = (1 - q) ** 1.3;
      // Volute : un arc ouvert qui s'enroule, et un voile très léger.
      body += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${DUST}" opacity="${(0.28 * o).toFixed(3)}"/>`;
      body += `<path d="M ${(x - r).toFixed(1)} ${y.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 1 1 ${(x + r * 0.2).toFixed(1)} ${(y + r * 0.95).toFixed(1)} A ${(r * 0.45).toFixed(1)} ${(r * 0.45).toFixed(1)} 0 0 1 ${(x + r * 0.05).toFixed(1)} ${(y + r * 0.1).toFixed(1)}" fill="none" stroke="#f4f6f8" stroke-width="${(2.6 * (1 - q * 0.5)).toFixed(1)}" stroke-linecap="round" opacity="${(0.9 * o).toFixed(3)}"/>`;
    }
    // Deux traits de vitesse au ras du sol, très fins.
    if (p < 0.6) {
      for (const [dy, len] of [[-4, 120], [6, 80]]) {
        const x1 = W - 50;
        body += sliver(x1 - len / 2, base + dy, len * (1 - p), 2, 0, '#f4f6f8', 0.8 * (1 - p / 0.6));
      }
    }
    return svg(W, H, body);
  });
}

// --- Écriture des planches ---------------------------------------------------------------------------------------

/** name : fichier (sans extension) ; tag : nom de l'animation ; once : jouée une fois ; duration : ms par image. */
const EFFECTS = [
  ...[120, 150, 180, 200, 360].map((a) => ({ name: `slash-${a}`, tag: 'slash', once: true, duration: 22, frames: () => slash(a) })),
  { name: 'thrust', tag: 'slash', once: true, duration: 22, frames: thrust },
  { name: 'impact', tag: 'impact', once: true, duration: 35, frames: impact },
  { name: 'dodge', tag: 'dodge', once: true, duration: 40, frames: dodge },
  { name: 'lightning-bolt', tag: 'bolt', once: true, duration: 45, frames: lightningBolt },
  { name: 'lightning-ground', tag: 'bolt', once: true, duration: 50, frames: lightningGround },
  { name: 'heal-rise', tag: 'heal', once: true, duration: 70, frames: healRise },
  { name: 'heal-ring', tag: 'heal', once: true, duration: 55, frames: healRing },
  { name: 'aura-loop', tag: 'aura', once: false, duration: 90, frames: auraLoop },
  { name: 'aura-burst', tag: 'aura', once: true, duration: 50, frames: auraBurst },
  { name: 'hammer', tag: 'flight', once: false, duration: 45, frames: hammerSpin },
  // Style lumière, essai sur le Guerrier.
  ...[120, 150, 180, 200, 360].map((a) => ({ name: `light-slash-guerrier-${a}`, tag: 'slash', once: true, duration: 25, frames: () => slashLight(a, LIGHT.guerrier) })),
  { name: 'light-impact-guerrier', tag: 'impact', once: true, duration: 30, frames: () => impactLight(LIGHT.guerrier) },
  { name: 'light-dust', tag: 'dust', once: true, duration: 45, frames: dustLight },
  // Remplacent les effets du Sorcier : mêmes fichiers et mêmes tags, déjà branchés dans le rendu.
  { name: 'fireball-sorcier', tag: 'flight', once: false, duration: 60, frames: fireball },
  { name: 'fire-wrath-sorcier', tag: 'wrath', once: true, duration: 45, frames: fireBurst },
];

await mkdir(outDir, { recursive: true });
for (const effect of EFFECTS) {
  if (only.length && !only.some((o) => effect.name.startsWith(o))) continue;
  const images = effect.frames();
  const buffers = await Promise.all(images.map((s) => sharp(Buffer.from(s)).png().toBuffer()));
  const { width, height } = await sharp(buffers[0]).metadata();
  await sharp({ create: { width: width * buffers.length, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(buffers.map((input, i) => ({ input, left: i * width, top: 0 })))
    .webp({ quality: 92, alphaQuality: 100 })
    .toFile(path.join(outDir, `${effect.name}.webp`));
  const sheet = {
    frames: buffers.map((_, i) => ({ filename: `${effect.tag} ${i}`, frame: { x: i * width, y: 0, w: width, h: height }, duration: effect.duration })),
    meta: {
      app: 'tools/vfx.mjs',
      image: `${effect.name}.webp`,
      size: { w: width * buffers.length, h: height },
      smooth: true,
      frameTags: [{ name: effect.tag, from: 0, to: buffers.length - 1, direction: 'forward', ...(effect.once ? { repeat: '1' } : {}) }],
    },
  };
  await writeFile(path.join(outDir, `${effect.name}.json`), JSON.stringify(sheet, null, 1) + '\n');
  console.log(`${effect.name.padEnd(20)} ${buffers.length} images de ${width}×${height}`);
}
