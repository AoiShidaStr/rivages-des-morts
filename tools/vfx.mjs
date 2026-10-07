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

// --- Écriture des planches ---------------------------------------------------------------------------------------

/** name : fichier (sans extension) ; tag : nom de l'animation ; once : jouée une fois ; duration : ms par image. */
const EFFECTS = [
  ...[120, 150, 180, 200, 360].map((a) => ({ name: `slash-${a}`, tag: 'slash', once: true, duration: 22, frames: () => slash(a) })),
  { name: 'thrust', tag: 'slash', once: true, duration: 22, frames: thrust },
  { name: 'impact', tag: 'impact', once: true, duration: 35, frames: impact },
  { name: 'dodge', tag: 'dodge', once: true, duration: 40, frames: dodge },
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
