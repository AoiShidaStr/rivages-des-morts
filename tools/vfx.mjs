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

/** Petite étoile à quatre branches (étincelle, éclat de lumière). */
const sparkle = (x, y, r, fill, opacity = 1, stroke = INK) =>
  polygon([[x, y - r], [x + r * 0.28, y - r * 0.28], [x + r, y], [x + r * 0.28, y + r * 0.28], [x, y + r], [x - r * 0.28, y + r * 0.28], [x - r, y], [x - r * 0.28, y - r * 0.28]], fill, stroke, 1.2, opacity);

/** Foudre, partie debout (style lumière) : un éclair fin et net tombe, s'éteint, frappe une seconde fois, s'efface. */
function lightningBolt() {
  const W = 160;
  const H = 512;
  const c = W / 2;
  const ground = H - 18;
  // Intensité de chaque image : deux coups de tonnerre, le second plus bref.
  const beats = [1, 0.85, 0.2, 0.9, 0.6, 0.3, 0.12, 0];
  const paths = [seeded(21), seeded(22)].map((rand) => {
    const main = zigzag(c + (rand() - 0.5) * 30, 0, c, ground, 13, 22, rand);
    const branches = [4, 7].map((k) => {
      const [bx, by] = main[k];
      const side = rand() < 0.5 ? -1 : 1;
      return zigzag(bx, by, bx + side * (30 + rand() * 20), by + 60 + rand() * 40, 4, 8, rand);
    });
    return { main, branches };
  });
  const line = (list, color, w, o) => `<polyline points="${pts(list)}" fill="none" stroke="${color}" stroke-width="${w.toFixed(1)}" stroke-linejoin="round" stroke-linecap="round" opacity="${o.toFixed(3)}"/>`;
  return beats.map((power, i) => {
    const { main, branches } = paths[i < 3 ? 0 : 1];
    let body = GLOW(6);
    if (power <= 0) return svg(W, H, body);
    body += glowGroup(line(main, STORM.edge, 9, 1) + branches.map((b) => line(b, STORM.edge, 5, 1)).join(''), 0.55 * power);
    body += glowGroup(`<ellipse cx="${c}" cy="${ground}" rx="${(18 + 24 * power).toFixed(1)}" ry="${(5 + 6 * power).toFixed(1)}" fill="${STORM.core}"/>`, 0.7 * power);
    for (const b of branches) body += line(b, STORM.core, 1.2, 0.8 * power);
    body += line(main, STORM.edge, 3.2, 0.8 * power) + line(main, STORM.core, 1.6, power);
    return svg(W, H, body);
  });
}

/** Foudre, partie au sol (style lumière) : un éclat bref, quelques fissures de lumière et des étincelles. */
function lightningGround() {
  const S = 256;
  const c = S / 2;
  const N = 8;
  const rand = seeded(23);
  const cracks = [...Array(5)].map((_, k) => {
    const a = (k / 5) * Math.PI * 2 + (rand() - 0.5) * 0.6;
    const len = 40 + rand() * 40;
    return zigzag(c, c, c + Math.cos(a) * len, c + Math.sin(a) * len, 4, 7, rand);
  });
  const sparks = [...Array(6)].map(() => ({ a: rand() * Math.PI * 2, d: 20 + rand() * 20 }));
  return [...Array(N)].map((_, i) => {
    const p = i / (N - 1);
    const fade = 1 - clamp01((p - 0.2) / 0.8);
    let body = GLOW(6);
    body += glowGroup(`<circle cx="${c}" cy="${c}" r="34" fill="${INK}"/>`, 0.18 * fade);
    if (p < 0.3) body += glowGroup(`<circle cx="${c}" cy="${c}" r="${(20 + 30 * (p / 0.3)).toFixed(1)}" fill="${STORM.core}"/>`, 0.8 * (1 - p / 0.3));
    const lines = cracks.map((cr) => `<polyline points="${pts(cr.slice(0, Math.max(2, Math.round(cr.length * Math.min(1, p * 4)))))}" fill="none" stroke="${STORM.core}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>`).join('');
    body += glowGroup(lines.replaceAll(STORM.core, STORM.edge).replaceAll('1.6', '4'), 0.6 * fade);
    body += `<g opacity="${fade.toFixed(3)}">${lines}</g>`;
    for (const s of sparks) {
      const d = s.d + 40 * easeOut(p);
      body += sliver(c + Math.cos(s.a) * d, c + Math.sin(s.a) * d, 8 * (1 - p * 0.6), 1.6, s.a, STORM.core, fade);
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
 * Aura de lumière du Paladin (boucle, style lumière) : un cercle d'or fin et lumineux, trois éclats qui courent
 * dessus (un tiers de tour par boucle), un voile doré très léger et des étincelles qui montent.
 */
function auraLoop() {
  const S = 512;
  const c = S / 2;
  const N = 12;
  const R = 236;
  const rand = seeded(43);
  const motes = [...Array(14)].map(() => ({ a: rand() * Math.PI * 2, d: 0.3 + rand() * 0.65, ph: rand(), r: 3 + rand() * 3 }));
  return [...Array(N)].map((_, i) => {
    const t = i / N;
    const spin = t * 120;
    let body = GLOW(8);
    body += `<circle cx="${c}" cy="${c}" r="${R}" fill="${GOLD}" opacity="0.05"/>`;
    body += glowGroup(`<circle cx="${c}" cy="${c}" r="${R}" fill="none" stroke="${GOLD}" stroke-width="10"/>`, 0.35);
    body += `<circle cx="${c}" cy="${c}" r="${R}" fill="none" stroke="#fff3cf" stroke-width="1.6" opacity="0.7"/>`;
    for (let k = 0; k < 3; k++) {
      const from = spin + k * 120;
      body += glowGroup(polygon(arcBand(c, c, R + 4, from, from + 40, (u) => 8 * Math.sin(Math.PI * u)), GOLD, 'none', 0, 1), 0.6);
      body += polygon(arcBand(c, c, R + 1.5, from + 5, from + 38, (u) => 3 * u ** 1.5), '#ffffff', 'none', 0, 0.9);
    }
    for (const m of motes) {
      const q = (m.ph + t) % 1;
      body += sparkle(c + Math.cos(m.a) * R * m.d, c + Math.sin(m.a) * R * m.d - q * 30, m.r, '#fff6d6', 0.7 * Math.sin(Math.PI * q), 'none');
    }
    return svg(S, S, body);
  });
}

/** Aura de lumière, lancement (style lumière) : un éclat doux, un anneau fin qui s'ouvre, de fins rayons. */
function auraBurst() {
  const S = 512;
  const c = S / 2;
  const N = 9;
  const rand = seeded(41);
  const rays = [...Array(12)].map((_, k) => ({ a: (k / 12) * Math.PI * 2 + (rand() - 0.5) * 0.2, len: 0.6 + rand() * 0.4 }));
  return [...Array(N)].map((_, i) => {
    const p = i / (N - 1);
    const fade = 1 - clamp01((p - 0.35) / 0.65);
    const ring = 40 + 196 * easeOut(p);
    let body = GLOW(8);
    if (p < 0.35) body += glowGroup(`<circle cx="${c}" cy="${c}" r="${(30 + 60 * (p / 0.35)).toFixed(1)}" fill="#fff6d6"/>`, 0.7 * (1 - p / 0.35));
    body += glowGroup(`<circle cx="${c}" cy="${c}" r="${ring.toFixed(1)}" fill="none" stroke="${GOLD}" stroke-width="10"/>`, 0.5 * fade);
    body += `<circle cx="${c}" cy="${c}" r="${ring.toFixed(1)}" fill="none" stroke="#ffffff" stroke-width="1.8" opacity="${(0.85 * fade).toFixed(3)}"/>`;
    for (const r of rays) {
      const r1 = 30 + 190 * easeOut(p / 0.6) * r.len;
      body += sliver(c + Math.cos(r.a) * r1 * 0.7, c + Math.sin(r.a) * r1 * 0.7, r1 * 0.5, 2.4, r.a, '#fff3cf', 0.8 * fade);
    }
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
  lame: { core: '#f7f2ff', main: '#b796ff', deep: '#6c4fd6' },
  paladin: { core: '#ffffff', main: '#ffe28f', deep: '#d6a73c' },
  rodeur: { core: '#f5fff2', main: '#95e28c', deep: '#3f9a5a' },
  sorcier: { core: '#fff6d8', main: '#ffa040', deep: '#c8501e' },
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
    const W = 14 * thick[i];
    let body = '';
    if (h - t > 2 && W > 0.5) {
      // Corps de la traînée en accent, cœur blanc sur le bord d'attaque (extérieur), filets fins à l'intérieur.
      // Voile de mouvement : une bande plus large et translucide, qui donne sa masse au geste.
      body += polygon(arcBand(c, c, R - 2, t, h, needle(W * 2, 0.7)), color.main, 'none', 0, 0.14);
      body += polygon(arcBand(c, c, R, t, h, needle(W)), color.main, 'none', 0, 0.7);
      body += polygon(arcBand(c, c, R, t + (h - t) * 0.25, h, needle(W * 0.42)), color.core, 'none', 0, 0.8);
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

/** Estoc, style lumière : une aiguille de lumière jaillit droit devant, puis se brise en éclats. */
function thrustLight(color) {
  const W = 256;
  const H = 96;
  const cy = H / 2;
  const N = 6;
  const rand = seeded(91);
  const shards = [...Array(6)].map(() => ({ x: 0.45 + rand() * 0.5, dy: (rand() - 0.5) * 30, len: 8 + rand() * 12 }));
  const tip = [0.35, 0.85, 1, 1, 1, 1];
  const tail = [0, 0.05, 0.3, 0.7, 0.95, 1];
  const thick = [0.5, 1, 0.8, 0.4, 0.15, 0];
  return [...Array(N)].map((_, i) => {
    const x1 = lerp(20, W - 8, tip[i]);
    const x0 = lerp(8, W - 30, tail[i]);
    const half = 7 * thick[i];
    let body = '';
    if (x1 - x0 > 4 && half > 0.4) {
      body += polygon([[x0, cy], [lerp(x0, x1, 0.75), cy - half * 2], [x1, cy], [lerp(x0, x1, 0.75), cy + half * 2]], color.main, 'none', 0, 0.14);
      body += polygon([[x0, cy], [lerp(x0, x1, 0.8), cy - half], [x1, cy], [lerp(x0, x1, 0.8), cy + half]], color.main, 'none', 0, 0.7);
      body += polygon([[lerp(x0, x1, 0.3), cy], [lerp(x0, x1, 0.85), cy - half * 0.4], [x1, cy], [lerp(x0, x1, 0.85), cy + half * 0.4]], color.core, 'none', 0, 0.85);
      for (const [dy, k] of [[-half - 7, 0.5], [half + 8, 0.35]]) body += sliver(lerp(x0, x1, 1 - k / 2), cy + dy, (x1 - x0) * k, 1.4, 0, color.deep, 0.7 * thick[i]);
    }
    if (i >= 3) {
      const q = (i - 2) / (N - 3);
      for (const sh of shards) body += sliver(W * sh.x + 20 * q, cy + sh.dy * q, sh.len * (1 - q * 0.5), 1.8, 0, color.main, 1 - q * 0.7);
    }
    return svg(W, H, body);
  });
}

// --- Feu du Sorcier, inspiré de Brand (League of Legends) --------------------------------------------------------
//
// Flammes en couches sans contour (rouge sombre, orange, jaune, cœur blanc), un halo flou sous chaque foyer, des
// braises vives et un peu de fumée sombre : le seul effet du jeu qui a droit au flou, pour sa chaleur.

const FIRE = { white: '#fffbe8', yellow: '#ffe066', orange: '#ff9a2e', red: '#e2481c', dark: '#7a1d0e', smoke: '#2e2220' };
const GLOW = (blur) => `<defs><filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${blur}"/></filter>`
  + `<radialGradient id="hot"><stop offset="0" stop-color="${FIRE.white}"/><stop offset="0.4" stop-color="${FIRE.yellow}"/><stop offset="0.75" stop-color="${FIRE.orange}" stop-opacity="0.85"/><stop offset="1" stop-color="${FIRE.red}" stop-opacity="0"/></radialGradient></defs>`;
const glowGroup = (inner, opacity = 1) => `<g filter="url(#glow)" opacity="${opacity.toFixed(3)}">${inner}</g>`;
const hotDisc = (x, y, r, opacity = 1) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${Math.max(0.5, r).toFixed(1)}" fill="url(#hot)" opacity="${opacity.toFixed(3)}"/>`;

/** Une flamme en quatre couches, de (x0, y0) vers sa pointe (x1, y1). */
function flame(x0, y0, x1, y1, width, wobble, phase, opacity = 1) {
  const layers = [
    [FIRE.red, 1, 1, 0.85],
    [FIRE.orange, 0.8, 0.72, 0.95],
    [FIRE.yellow, 0.55, 0.48, 1],
    [FIRE.white, 0.3, 0.26, 1],
  ];
  return layers
    .map(([color, len, wide, o]) => polygon(tongue(x0, y0, lerp(x0, x1, len), lerp(y0, y1, len), width * wide, wobble * len, phase), color, 'none', 0, o * opacity))
    .join('');
}

/** Braise : un petit éclat vif, avec son halo. */
const ember = (x, y, r, opacity) =>
  `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * 2.2).toFixed(1)}" fill="${FIRE.orange}" opacity="${(0.35 * opacity).toFixed(3)}"/>`
  + `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${FIRE.yellow}" opacity="${opacity.toFixed(3)}"/>`;

/** Boule de feu (boucle) : un cœur blanc brûlant, des flammes qui fouettent vers l'arrière, braises et fumée. */
function brandFireball() {
  const W = 288;
  const H = 128;
  const N = 8;
  const hx = 214;
  const cy = H / 2;
  const rand = seeded(201);
  const sparks = [...Array(10)].map(() => ({ x: rand(), y: (rand() - 0.5) * 50, r: 1.6 + rand() * 2, v: 0.6 + rand() * 0.8 }));
  const tongues = [...Array(6)].map((_, k) => ({ dy: (k - 2.5) * 7, len: 110 + rand() * 70, w: 16 + rand() * 8, ph: rand() * 6 }));
  return [...Array(N)].map((_, i) => {
    const ph = (i / N) * Math.PI * 2;
    let body = GLOW(9);
    body += glowGroup(`<ellipse cx="${hx - 50}" cy="${cy}" rx="95" ry="26" fill="${FIRE.orange}"/><circle cx="${hx}" cy="${cy}" r="34" fill="${FIRE.yellow}"/>`, 0.55);
    // Fumée sombre au bout de la traîne.
    for (let k = 0; k < 3; k++) {
      const x = 40 + k * 22 - ((i / N) * 22) % 22;
      body += glowGroup(`<circle cx="${x.toFixed(1)}" cy="${(cy + Math.sin(ph + k) * 8).toFixed(1)}" r="${(16 - k * 2).toFixed(1)}" fill="${FIRE.smoke}"/>`, 0.18 + k * 0.05);
    }
    for (const t of tongues) {
      const len = t.len * (0.85 + 0.15 * Math.sin(ph * 2 + t.ph));
      body += flame(hx + 8, cy + t.dy * 0.3, hx - len, cy + t.dy + Math.sin(ph + t.ph) * 9, t.w, 9, ph + t.ph, 0.9);
    }
    for (const sp of sparks) {
      const x = hx - 20 - ((sp.x * 170 + (i / N) * 70 * sp.v) % 170);
      body += ember(x, cy + sp.y + Math.sin(ph + sp.x * 9) * 3, sp.r, 0.9);
    }
    body += hotDisc(hx, cy, 30);
    body += `<circle cx="${hx + 2}" cy="${cy}" r="${(11 + Math.sin(ph * 2) * 1.5).toFixed(1)}" fill="${FIRE.white}"/>`;
    return svg(W, H, body);
  });
}

/** Explosion de la boule de feu au contact (debout) : éclair chaud, langues de feu, braises, bouffée de fumée. */
function brandPop() {
  const S = 192;
  const c = S / 2;
  const N = 7;
  const rand = seeded(203);
  const rays = [...Array(9)].map((_, k) => ({ a: (k / 9) * Math.PI * 2 + rand() * 0.4, len: 0.7 + rand() * 0.5, ph: rand() * 6 }));
  const sparks = [...Array(10)].map(() => ({ a: rand() * Math.PI * 2, d: 0.6 + rand() * 0.6, r: 1.5 + rand() * 2 }));
  return [...Array(N)].map((_, i) => {
    const p = i / (N - 1);
    const grow = easeOut(p / 0.45);
    const fade = 1 - clamp01((p - 0.4) / 0.6);
    let body = GLOW(8);
    body += glowGroup(`<circle cx="${c}" cy="${c}" r="${(20 + 40 * grow).toFixed(1)}" fill="${FIRE.orange}"/>`, 0.6 * fade);
    if (p > 0.45) body += glowGroup(`<circle cx="${c}" cy="${(c - 20 * p).toFixed(1)}" r="${(20 + 30 * p).toFixed(1)}" fill="${FIRE.smoke}"/>`, 0.3 * (1 - p));
    for (const r of rays) {
      const len = (24 + 50 * grow) * r.len;
      body += flame(c, c, c + Math.cos(r.a) * len, c + Math.sin(r.a) * len - 10 * p, 18 * (1 - 0.5 * p), 6, r.ph + p * 4, fade);
    }
    body += hotDisc(c, c, (28 + 20 * grow) * (1 - 0.6 * p), fade);
    for (const sp of sparks) {
      const d = (20 + 60 * easeOut(p)) * sp.d;
      body += ember(c + Math.cos(sp.a) * d, c + Math.sin(sp.a) * d - 14 * p, sp.r * (1 - 0.5 * p), fade);
    }
    return svg(S, S, body);
  });
}

/** Petite rune anguleuse (traits), dans un carré de côté `size` centré en (x, y). */
function glyph(x, y, size, rand) {
  const pts2 = [...Array(4)].map(() => [x + (rand() - 0.5) * size, y + (rand() - 0.5) * size]);
  return `M ${pts2.map(([a, b]) => `${a.toFixed(1)} ${b.toFixed(1)}`).join(' L ')} M ${(x - size / 2).toFixed(1)} ${y.toFixed(1)} L ${(x + size / 2).toFixed(1)} ${y.toFixed(1)}`;
}

/**
 * Cercle de runes (sol) : il se trace (images 0 à 8, jouées sur le délai de l'annonce), puis palpite (9 à 11).
 * Sert d'annonce au sceau (pilier de flammes) et au météore.
 */
function brandRune() {
  const S = 512;
  const c = S / 2;
  const N = 12;
  const R = 226;
  const rand = seeded(205);
  const glyphs = [...Array(10)].map((_, k) => ({ a: (k / 10) * Math.PI * 2, d: glyph(0, 0, 26, rand) }));
  return [...Array(N)].map((_, i) => {
    const draw = clamp01(i / 8);
    const pulse = i > 8 ? 0.75 + 0.25 * Math.sin(((i - 9) / 3) * Math.PI * 2) : 0.55 + 0.45 * draw;
    let body = GLOW(7);
    const ring = (r, w, color, o) => {
      const end = -90 + 360 * draw;
      if (draw >= 1) return `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${color}" stroke-width="${w}" opacity="${o.toFixed(3)}"/>`;
      return polygon(arcBand(c, c, r + w / 2, -90, end, () => w, 90), color, 'none', 0, o);
    };
    let lines = ring(R, 7, FIRE.orange, 0.9) + ring(R - 34, 3, FIRE.yellow, 0.8) + ring(R - 120, 2.5, FIRE.orange, 0.6);
    // Triangle inscrit, puis les runes entre les deux cercles extérieurs.
    if (draw > 0.4) {
      const tri = [0, 1, 2].map((k) => [c + Math.cos(deg(-90 + k * 120)) * (R - 34), c + Math.sin(deg(-90 + k * 120)) * (R - 34)]);
      lines += `<polygon points="${pts(tri)}" fill="none" stroke="${FIRE.orange}" stroke-width="2.5" opacity="${(0.7 * clamp01((draw - 0.4) / 0.4)).toFixed(3)}"/>`;
    }
    for (const g of glyphs) {
      if (g.a / (Math.PI * 2) > draw) continue;
      const x = c + Math.cos(g.a - Math.PI / 2) * (R - 17);
      const y = c + Math.sin(g.a - Math.PI / 2) * (R - 17);
      lines += `<path d="${g.d}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${((g.a * 180) / Math.PI).toFixed(1)})" fill="none" stroke="${FIRE.yellow}" stroke-width="3" stroke-linecap="round"/>`;
    }
    body += `<circle cx="${c}" cy="${c}" r="${R}" fill="${FIRE.red}" opacity="${(0.06 * pulse).toFixed(3)}"/>`;
    body += glowGroup(lines, 0.8 * pulse);
    body += `<g opacity="${pulse.toFixed(3)}">${lines}</g>`;
    return svg(S, S, body);
  });
}

/** Pilier de flammes (debout) : il jaillit du sol, rugit, puis s'arrache vers le haut en braises et fumée. */
function brandPillar() {
  const W = 224;
  const H = 480;
  const c = W / 2;
  const base = H - 30;
  const N = 11;
  const rand = seeded(207);
  const tongues = [...Array(11)].map(() => ({ x: (rand() - 0.5) * 70, len: 0.55 + rand() * 0.45, w: 22 + rand() * 18, ph: rand() * 6, drift: (rand() - 0.5) * 40 }));
  const sparks = [...Array(16)].map(() => ({ x: (rand() - 0.5) * 120, h: rand(), r: 1.6 + rand() * 2.4, v: 0.6 + rand() }));
  const height = [130, 380, 440, 430, 445, 420, 400, 330, 220, 120, 40];
  const width = [0.6, 1.1, 1, 0.95, 1, 0.9, 0.85, 0.7, 0.55, 0.4, 0.25];
  const lift = [0, 0, 0, 0, 0, 0, 10, 60, 130, 220, 300];
  return [...Array(N)].map((_, i) => {
    const p = i / (N - 1);
    const Hc = height[i];
    const fade = 1 - clamp01((p - 0.6) / 0.4);
    let body = GLOW(12);
    // Éclat au sol et halo de la colonne.
    body += `<ellipse cx="${c}" cy="${base}" rx="${(60 + 40 * Math.min(1, p * 3)).toFixed(1)}" ry="${(16 + 8 * Math.min(1, p * 3)).toFixed(1)}" fill="url(#hot)" opacity="${fade.toFixed(3)}"/>`;
    body += glowGroup(`<ellipse cx="${c}" cy="${(base - lift[i] - Hc / 2).toFixed(1)}" rx="${(46 * width[i]).toFixed(1)}" ry="${(Hc / 2).toFixed(1)}" fill="${FIRE.orange}"/>`, 0.6 * fade);
    if (p > 0.5) {
      for (let k = 0; k < 3; k++) body += glowGroup(`<circle cx="${(c + (k - 1) * 30).toFixed(1)}" cy="${(base - lift[i] - Hc - 20 - k * 10).toFixed(1)}" r="${(26 + 20 * p).toFixed(1)}" fill="${FIRE.smoke}"/>`, 0.28 * (1 - p));
    }
    for (const t of tongues) {
      const x0 = c + t.x * width[i];
      const y0 = base - lift[i];
      const len = Hc * t.len * (0.9 + 0.1 * Math.sin(i * 1.7 + t.ph));
      body += flame(x0, y0, x0 + t.drift * width[i] * 0.5, y0 - len, t.w * width[i], 12, t.ph + i * 1.3, fade);
    }
    // Cœur blanc au pied de la colonne tant qu'elle tient.
    if (lift[i] < 20) body += `<ellipse cx="${c}" cy="${(base - Hc * 0.25).toFixed(1)}" rx="${(16 * width[i]).toFixed(1)}" ry="${(Hc * 0.25).toFixed(1)}" fill="url(#hot)" opacity="${fade.toFixed(3)}"/>`;
    for (const sp of sparks) {
      const y = base - ((sp.h * 420 + p * 260 * sp.v) % 460);
      body += ember(c + sp.x * (0.5 + p * 0.6), y, sp.r, Math.min(1, p * 4) * (1 - p * 0.6));
    }
    return svg(W, H, body);
  });
}

/** Onde de feu au sol (sous le pilier et le météore) : une couronne de flammes s'ouvre, laisse des fissures en fusion. */
function brandScorch() {
  const S = 512;
  const c = S / 2;
  const N = 9;
  const rand = seeded(209);
  const tongues = [...Array(16)].map((_, k) => ({ a: (k / 16) * Math.PI * 2 + (rand() - 0.5) * 0.3, k: 0.35 + rand() * 1, ph: rand() * 6, w: 14 + rand() * 12 }));
  const cracks = [...Array(8)].map((_, k) => {
    const a = (k / 8) * Math.PI * 2 + rand() * 0.4;
    return zigzag(c, c, c + Math.cos(a) * (120 + rand() * 80), c + Math.sin(a) * (120 + rand() * 80), 6, 12, rand);
  });
  const sparks = [...Array(18)].map(() => ({ a: rand() * Math.PI * 2, d: 0.5 + rand() * 0.6, r: 2 + rand() * 2.5 }));
  return [...Array(N)].map((_, i) => {
    const p = i / (N - 1);
    const ring = 40 + 190 * easeOut(p / 0.6);
    const height = 70 * (1 - clamp01((p - 0.3) / 0.7)) + 6;
    const fade = 1 - clamp01((p - 0.55) / 0.45);
    let body = GLOW(10);
    body += glowGroup(`<circle cx="${c}" cy="${c}" r="${(70 + 60 * Math.min(1, p * 2)).toFixed(1)}" fill="${FIRE.smoke}"/>`, 0.32 * (0.4 + 0.6 * fade));
    const crackLines = cracks.map((cr) => `<polyline points="${pts(cr.slice(0, Math.max(2, Math.round(cr.length * Math.min(1, p * 2.5)))))}" fill="none" stroke="${FIRE.orange}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>`).join('');
    body += glowGroup(crackLines, 0.9 * fade);
    body += `<g opacity="${fade.toFixed(3)}">${crackLines.replaceAll(FIRE.orange, FIRE.yellow).replaceAll('stroke-width="5"', 'stroke-width="2"')}</g>`;
    if (p < 0.3) body += `<circle cx="${c}" cy="${c}" r="${(50 + 120 * (p / 0.3)).toFixed(1)}" fill="url(#hot)" opacity="${(1 - p / 0.3).toFixed(3)}"/>`;
    body += glowGroup(`<circle cx="${c}" cy="${c}" r="${ring.toFixed(1)}" fill="none" stroke="${FIRE.orange}" stroke-width="${(26 * fade + 4).toFixed(1)}"/>`, 0.55 * fade);
    for (const t of tongues) {
      const x0 = c + Math.cos(t.a) * (ring - 8);
      const y0 = c + Math.sin(t.a) * (ring - 8);
      const h = height * t.k;
      body += flame(x0, y0, c + Math.cos(t.a + 0.1) * (ring + h), c + Math.sin(t.a + 0.1) * (ring + h), t.w, 12, t.a * 3 + p * 6, fade);
    }
    for (const sp of sparks) {
      const d = ring * sp.d + 50 * p;
      body += ember(c + Math.cos(sp.a) * d, c + Math.sin(sp.a) * d, sp.r * (1 - 0.5 * p), Math.min(1, p * 3) * (1 - p * 0.7));
    }
    return svg(S, S, body);
  });
}

/** Comète du météore (debout) : elle tombe du ciel, sa traîne de feu derrière elle, jusqu'au sol. */
function brandComet() {
  const W = 192;
  const H = 512;
  const N = 6;
  const rand = seeded(211);
  const sparks = [...Array(10)].map(() => ({ t: rand(), dx: (rand() - 0.5) * 30, r: 1.5 + rand() * 2 }));
  return [...Array(N)].map((_, i) => {
    const p = i / (N - 1);
    const hy = lerp(30, H - 36, p ** 1.6);
    const hx = lerp(150, 96, p ** 1.6);
    const tail = Math.min(hy + 40, 300);
    let body = GLOW(10);
    body += glowGroup(`<ellipse cx="${(hx + 20).toFixed(1)}" cy="${(hy - tail / 2).toFixed(1)}" rx="30" ry="${(tail / 2).toFixed(1)}" fill="${FIRE.orange}" transform="rotate(10 ${hx.toFixed(1)} ${hy.toFixed(1)})"/>`, 0.55);
    for (let k = 0; k < 5; k++) body += flame(hx, hy, hx + 30 + (k - 2) * 12, hy - tail * (0.6 + 0.1 * k), 26 - k * 2, 10, k * 1.7 + p * 5, 0.95);
    for (const sp of sparks) body += ember(hx + 25 * sp.t + sp.dx, hy - tail * sp.t, sp.r, 0.9);
    body += hotDisc(hx, hy, 30);
    body += `<circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="12" fill="${FIRE.white}"/>`;
    return svg(W, H, body);
  });
}

/** Anneau de flammes (sol, boucle) : Bouclier de flammes et Dôme de feu. Les flammes tournent d'un cran par boucle. */
function brandRing() {
  const S = 512;
  const c = S / 2;
  const N = 12;
  const R = 150;
  const count = 26;
  const rand = seeded(213);
  const offs = [...Array(count)].map(() => ({ k: 0.5 + rand() * 1, ph: rand() * 6, w: 16 + rand() * 10 }));
  return [...Array(N)].map((_, i) => {
    const t = i / N;
    const spin = (t * 360) / count;
    let body = GLOW(9);
    body += `<circle cx="${c}" cy="${c}" r="${R - 6}" fill="${FIRE.red}" opacity="0.08"/>`;
    body += glowGroup(`<circle cx="${c}" cy="${c}" r="${R}" fill="none" stroke="${FIRE.orange}" stroke-width="22"/>`, 0.6);
    for (let k = 0; k < count; k++) {
      const o = offs[k];
      const a = deg(spin + (k * 360) / count);
      const h = 68 * o.k * (0.7 + 0.3 * Math.sin(t * Math.PI * 2 * 2 + o.ph));
      body += flame(c + Math.cos(a) * (R - 14), c + Math.sin(a) * (R - 14), c + Math.cos(a + 0.2) * (R + h), c + Math.sin(a + 0.2) * (R + h), o.w, 10, o.ph + t * Math.PI * 2, 0.92);
    }
    body += `<circle cx="${c}" cy="${c}" r="${R}" fill="none" stroke="${FIRE.white}" stroke-width="3" opacity="0.8"/>`;
    return svg(S, S, body);
  });
}

/** Sol brûlant (boucle) : une plaque de fissures en fusion qui palpite, de petites flammes qui lèchent, des étincelles. */
function brandEmbers() {
  const S = 256;
  const c = S / 2;
  const N = 10;
  const rand = seeded(215);
  const cracks = [...Array(6)].map((_, k) => {
    const a = (k / 6) * Math.PI * 2 + rand() * 0.6;
    return zigzag(c + Math.cos(a) * 10, c + Math.sin(a) * 10, c + Math.cos(a) * (70 + rand() * 40), c + Math.sin(a) * (70 + rand() * 40), 5, 9, rand);
  });
  const licks = [...Array(7)].map(() => ({ a: rand() * Math.PI * 2, d: 20 + rand() * 70, ph: rand() * 6, h: 22 + rand() * 18 }));
  return [...Array(N)].map((_, i) => {
    const t = (i / N) * Math.PI * 2;
    const pulse = 0.75 + 0.25 * Math.sin(t);
    let body = GLOW(7);
    body += glowGroup(`<circle cx="${c}" cy="${c}" r="96" fill="${FIRE.smoke}"/>`, 0.35);
    const lines = cracks.map((cr) => `<polyline points="${pts(cr)}" fill="none" stroke="${FIRE.orange}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>`).join('');
    body += glowGroup(lines, 0.8 * pulse);
    body += `<g opacity="${pulse.toFixed(3)}">${lines.replaceAll(FIRE.orange, FIRE.yellow).replaceAll('stroke-width="5"', 'stroke-width="2"')}</g>`;
    for (const l of licks) {
      const x = c + Math.cos(l.a) * l.d;
      const y = c + Math.sin(l.a) * l.d;
      const h = l.h * (0.6 + 0.4 * Math.abs(Math.sin(t + l.ph)));
      body += flame(x, y, x + Math.cos(l.a) * h * 0.4, y + Math.sin(l.a) * h * 0.4 - h, 12, 4, l.ph + t, 0.85);
    }
    return svg(S, S, body);
  });
}

/** Traînée de la Fuite de feu (sol) : un sillage de flammes le long de la course (héros vers +x), qui s'éteint. */
function brandTrail() {
  const W = 512;
  const H = 128;
  const cy = H / 2;
  const N = 8;
  const rand = seeded(217);
  const tongues = [...Array(12)].map((_, k) => ({ x: 40 + k * 38 + rand() * 10, dy: (rand() - 0.5) * 22, len: 70 + rand() * 50, ph: rand() * 6, w: 22 + rand() * 10 }));
  return [...Array(N)].map((_, i) => {
    const p = i / (N - 1);
    let body = GLOW(8);
    // Une bande de chaleur continue, puis le sillage qui s'éteint de la queue (gauche) vers la tête (droite).
    const reach = clamp01(1.4 - p * 1.6) * W;
    if (reach > 20) body += glowGroup(`<rect x="${(W - reach).toFixed(1)}" y="${cy - 16}" width="${reach.toFixed(1)}" height="32" rx="16" fill="${FIRE.orange}"/>`, 0.5);
    for (const t of tongues) {
      const life = clamp01(1 - p * 1.6 + (t.x / W) * 0.7);
      if (life <= 0) continue;
      body += glowGroup(`<circle cx="${t.x.toFixed(1)}" cy="${(cy + t.dy).toFixed(1)}" r="${(16 * life).toFixed(1)}" fill="${FIRE.orange}"/>`, 0.5 * life);
      body += flame(t.x, cy + t.dy, t.x - t.len * life, cy + t.dy - 8, t.w * life, 9, t.ph + p * 5, life);
      if (life < 0.6) body += ember(t.x - 10, cy + t.dy - 14 * (1 - life), 2, life);
    }
    return svg(W, H, body);
  });
}

// --- Auras d'état et lancements en dôme (Bouclier de flammes, Frénésie, Égide) -----------------------------------
//
// L'aura se dresse derrière le héros (le jeu la place juste derrière son image) : on n'en voit que ce qui dépasse de
// sa silhouette, des langues d'énergie qui montent et des particules. Le lancement est une sphère, dressée face à
// la caméra au centre du héros.

/** Couleurs des états : bord, milieu, intérieur, cœur (du plus sombre au plus clair). */
const STATE = {
  fire: { tones: [FIRE.red, FIRE.orange, FIRE.yellow, FIRE.white], glow: FIRE.orange, spark: FIRE.yellow },
  rage: { tones: ['#8f0f1a', '#d9262c', '#ff6a4a', '#ffd6c8'], glow: '#e0302e', spark: '#ff9a7a' },
  aegis: { tones: ['#c99a35', '#ffd877', '#fff0b8', '#ffffff'], glow: '#ffe28f', spark: '#ffffff' },
  // Sang yokai : une énergie violette et sombre d'oni, plus discrète que la Frénésie.
  yokai: { tones: ['#2e0f3f', '#6b2a8f', '#b46ad8', '#f0dcff'], glow: '#5a2378', spark: '#d6a2ff', quiet: true },
};

/** Flamme en quatre couches aux couleurs d'un état. */
function stateFlame(x0, y0, x1, y1, width, wobble, phase, opacity, tones) {
  return [[0, 1, 1, 0.8], [1, 0.8, 0.7, 0.9], [2, 0.55, 0.45, 1], [3, 0.3, 0.24, 1]]
    .map(([k, len, wide, o]) => polygon(tongue(x0, y0, lerp(x0, x1, len), lerp(y0, y1, len), width * wide, wobble * len, phase), tones[k], 'none', 0, o * opacity))
    .join('');
}

/** Aura d'état (debout, boucle) : halo, langues d'énergie qui montent le long du corps, particules qui s'élèvent. */
function stateAura(kind) {
  const W = 192;
  const H = 320;
  const c = W / 2;
  const feet = H - 34;
  const N = 10;
  const st = STATE[kind];
  const rand = seeded(kind.length * 31 + 7);
  const wisps = [...Array(st.quiet ? 5 : 8)].map((_, k) => ({ x: (k % 2 ? 1 : -1) * (26 + rand() * 34), base: feet - rand() * 120, len: 70 + rand() * 90, w: 10 + rand() * 8, ph: rand() * 6, lean: (rand() - 0.5) * 20 }));
  const motes = [...Array(st.quiet ? 6 : 12)].map(() => ({ x: (rand() - 0.5) * 120, y: rand(), r: 1.5 + rand() * 2, v: 0.7 + rand() * 0.6 }));
  return [...Array(N)].map((_, i) => {
    const t = i / N;
    const ph = t * Math.PI * 2;
    let body = GLOW(10);
    body += glowGroup(`<ellipse cx="${c}" cy="${feet - 120}" rx="${(58 + 4 * Math.sin(ph)).toFixed(1)}" ry="128" fill="${st.glow}"/>`, st.quiet ? 0.2 : 0.32);
    body += glowGroup(`<ellipse cx="${c}" cy="${feet}" rx="62" ry="14" fill="${st.glow}"/>`, st.quiet ? 0.3 : 0.5);
    for (const w of wisps) {
      const k = 0.75 + 0.25 * Math.sin(ph * 2 + w.ph);
      const x0 = c + w.x;
      if (kind === 'aegis') {
        // Égide : de fins traits de lumière qui montent, plutôt que des flammes.
        const y = w.base - ((t + w.ph / 6) % 1) * 60;
        body += sliver(x0, y - w.len * 0.4 * k, w.len * 0.8 * k, 3.2, Math.PI / 2, st.tones[1], 0.75);
        body += sliver(x0, y - w.len * 0.4 * k, w.len * 0.55 * k, 1.4, Math.PI / 2, st.tones[3], 0.95);
      } else {
        body += stateFlame(x0, w.base, x0 + w.lean, w.base - w.len * k * (st.quiet ? 0.8 : 1), w.w, 9, w.ph + ph, st.quiet ? 0.4 : 0.65, st.tones);
      }
    }
    for (const m of motes) {
      const y = feet - ((m.y + t * m.v) % 1) * 280;
      const o = 0.9 * Math.sin(Math.PI * ((m.y + t * m.v) % 1));
      body += kind === 'aegis' ? sparkle(c + m.x, y, m.r * 2.2, st.spark, o, 'none') : ember(c + m.x, y, m.r, o).replaceAll(FIRE.orange, st.glow).replaceAll(FIRE.yellow, st.spark);
    }
    return svg(W, H, body);
  });
}

/** Lancement en dôme de flammes (Bouclier de flammes, Frénésie) : une sphère de feu jaillit autour du héros. */
function flameDome(kind) {
  const S = 256;
  const c = S / 2;
  const N = 9;
  const st = STATE[kind];
  const rand = seeded(kind.length * 17 + 3);
  const tongues = [...Array(20)].map((_, k) => ({ a: (k / 20) * Math.PI * 2 + (rand() - 0.5) * 0.2, k: 0.6 + rand() * 0.6, ph: rand() * 6 }));
  return [...Array(N)].map((_, i) => {
    const p = i / (N - 1);
    const r = 30 + 78 * easeOut(p / 0.45);
    const fade = (1 - clamp01((p - 0.5) / 0.5)) * (st.quiet ? 0.6 : 1);
    let body = GLOW(9);
    if (p < 0.3) body += `<circle cx="${c}" cy="${c}" r="${(26 + 70 * (p / 0.3)).toFixed(1)}" fill="${st.tones[3]}" opacity="${(0.8 * (1 - p / 0.3)).toFixed(3)}"/>`;
    body += `<circle cx="${c}" cy="${c}" r="${r.toFixed(1)}" fill="${st.glow}" opacity="${(0.12 * fade).toFixed(3)}"/>`;
    body += glowGroup(`<circle cx="${c}" cy="${c}" r="${r.toFixed(1)}" fill="none" stroke="${st.glow}" stroke-width="16"/>`, 0.6 * fade);
    // Les langues suivent la sphère et montent : plus longues sur le dessus, comme un feu qui tire vers le haut.
    for (const t of tongues) {
      const x0 = c + Math.cos(t.a) * r;
      const y0 = c + Math.sin(t.a) * r;
      const up = 0.5 + 0.5 * -Math.sin(t.a);
      const len = (16 + 30 * up) * t.k * (1 - 0.4 * p);
      body += stateFlame(x0, y0, x0 + Math.cos(t.a) * len * 0.5, y0 + Math.sin(t.a) * len * 0.5 - len * 0.8, 15, 5, t.ph + p * 6, fade, st.tones);
    }
    body += `<circle cx="${c}" cy="${c}" r="${r.toFixed(1)}" fill="none" stroke="${st.tones[3]}" stroke-width="2" opacity="${(0.7 * fade).toFixed(3)}"/>`;
    return svg(S, S, body);
  });
}

/** Lancement de l'Égide : une bulle-bouclier dorée se referme autour du héros, scintille, puis s'efface. */
function aegisDome() {
  const S = 256;
  const c = S / 2;
  const N = 10;
  const st = STATE.aegis;
  const R = 108;
  // Treillis hexagonal discret à l'intérieur de la bulle.
  const hex = [];
  for (let row = -4; row <= 4; row++) {
    for (let col = -4; col <= 4; col++) {
      const x = c + col * 30 + (row % 2 ? 15 : 0);
      const y = c + row * 26;
      if (Math.hypot(x - c, y - c) > R - 12) continue;
      hex.push(`<polygon points="${pts([...Array(6)].map((_, k) => [x + Math.cos(deg(60 * k + 30)) * 15, y + Math.sin(deg(60 * k + 30)) * 15]))}"/>`);
    }
  }
  return [...Array(N)].map((_, i) => {
    const p = i / (N - 1);
    const scale = p < 0.35 ? easeOut(p / 0.35) * 1.08 : 1.08 - 0.08 * clamp01((p - 0.35) / 0.2);
    const r = R * scale;
    const fade = 1 - clamp01((p - 0.6) / 0.4);
    const shimmer = 0.6 + 0.4 * Math.sin(p * Math.PI * 4);
    let body = GLOW(7);
    body += `<circle cx="${c}" cy="${c}" r="${r.toFixed(1)}" fill="${st.glow}" opacity="${(0.14 * fade).toFixed(3)}"/>`;
    body += `<g fill="none" stroke="${st.tones[1]}" stroke-width="1.6" opacity="${(0.45 * fade * shimmer).toFixed(3)}" transform="translate(${c} ${c}) scale(${scale.toFixed(3)}) translate(${-c} ${-c})">${hex.join('')}</g>`;
    body += glowGroup(`<circle cx="${c}" cy="${c}" r="${r.toFixed(1)}" fill="none" stroke="${st.glow}" stroke-width="12"/>`, 0.7 * fade);
    body += `<circle cx="${c}" cy="${c}" r="${r.toFixed(1)}" fill="none" stroke="${st.tones[1]}" stroke-width="4" opacity="${fade.toFixed(3)}"/>`;
    // Reflet blanc en haut à gauche, la lumière du jeu.
    body += polygon(arcBand(c, c, r - 6, 200, 250, (u) => 7 * Math.sin(Math.PI * u)), st.tones[3], 'none', 0, 0.9 * fade);
    if (p < 0.4) for (let k = 0; k < 8; k++) body += sparkle(c + Math.cos(deg(k * 45)) * r, c + Math.sin(deg(k * 45)) * r, 7 * (1 - p / 0.4), st.spark, 1 - p / 0.4, 'none');
    return svg(S, S, body);
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
  // Style lumière : traînées de lame et estocs aux couleurs de chaque classe, poussière d'esquive.
  ...Object.entries(LIGHT).flatMap(([cls, color]) => [
    ...[120, 150, 180, 200, 360].map((a) => ({ name: `light-slash-${cls}-${a}`, tag: 'slash', once: true, duration: 25, frames: () => slashLight(a, color) })),
    { name: `light-thrust-${cls}`, tag: 'slash', once: true, duration: 24, frames: () => thrustLight(color) },
  ]),
  { name: 'light-dust', tag: 'dust', once: true, duration: 45, frames: dustLight },
  // Sorcier : feu inspiré de Brand (League of Legends).
  { name: 'brand-fireball', tag: 'flight', once: false, duration: 50, frames: brandFireball },
  { name: 'brand-pop', tag: 'pop', once: true, duration: 40, frames: brandPop },
  { name: 'brand-rune', tag: 'rune', once: true, duration: 60, frames: brandRune },
  { name: 'brand-pillar', tag: 'pillar', once: true, duration: 50, frames: brandPillar },
  { name: 'brand-scorch', tag: 'scorch', once: true, duration: 55, frames: brandScorch },
  { name: 'brand-comet', tag: 'comet', once: true, duration: 50, frames: brandComet },
  { name: 'brand-ring', tag: 'ring', once: false, duration: 60, frames: brandRing },
  { name: 'brand-embers', tag: 'embers', once: false, duration: 70, frames: brandEmbers },
  { name: 'brand-trail', tag: 'trail', once: true, duration: 50, frames: brandTrail },
  // Auras d'état et lancements en dôme.
  ...['fire', 'rage', 'aegis', 'yokai'].map((kind) => ({ name: `aura-state-${kind}`, tag: 'aura', once: false, duration: 75, frames: () => stateAura(kind) })),
  { name: 'dome-fire', tag: 'dome', once: true, duration: 50, frames: () => flameDome('fire') },
  { name: 'dome-rage', tag: 'dome', once: true, duration: 50, frames: () => flameDome('rage') },
  { name: 'dome-yokai', tag: 'dome', once: true, duration: 50, frames: () => flameDome('yokai') },
  { name: 'dome-aegis', tag: 'dome', once: true, duration: 50, frames: aegisDome },
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
  // Une bande, ou une grille si la bande dépasserait 4 096 px (taille de texture sûre sur toutes les cartes graphiques).
  const cols = Math.min(buffers.length, Math.max(1, Math.floor(4096 / width)));
  const rows = Math.ceil(buffers.length / cols);
  const at = (i) => ({ x: (i % cols) * width, y: Math.floor(i / cols) * height });
  await sharp({ create: { width: width * cols, height: height * rows, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(buffers.map((input, i) => ({ input, left: at(i).x, top: at(i).y })))
    .webp({ quality: 92, alphaQuality: 100 })
    .toFile(path.join(outDir, `${effect.name}.webp`));
  const sheet = {
    frames: buffers.map((_, i) => ({ filename: `${effect.tag} ${i}`, frame: { ...at(i), w: width, h: height }, duration: effect.duration })),
    meta: {
      app: 'tools/vfx.mjs',
      image: `${effect.name}.webp`,
      size: { w: width * cols, h: height * rows },
      smooth: true,
      frameTags: [{ name: effect.tag, from: 0, to: buffers.length - 1, direction: 'forward', ...(effect.once ? { repeat: '1' } : {}) }],
    },
  };
  await writeFile(path.join(outDir, `${effect.name}.json`), JSON.stringify(sheet, null, 1) + '\n');
  console.log(`${effect.name.padEnd(20)} ${buffers.length} images de ${width}×${height}`);
}
