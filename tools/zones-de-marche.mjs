// Retrace les zones de marche, le lit de la rivière et les obstacles de l'île d'après la carte peinte elle-même :
//   - chaque pixel de la carte (en 1024) est classé par sa couleur et son grain : herbe, sable, dallage (on y marche),
//     falaise, rocher, muret de pierre, volcan (relief : on n'y marche pas), eau ;
//   - les zones de marche sont les étendues d'herbe, de sable et de dallage reliées aux lieux du jeu (GRAINES), moins
//     les rizières ; les falaises et les murets les bordent donc exactement, au pixel près ;
//   - ce que les couleurs ne voient pas est tracé à la main ci-dessous : escaliers, quai, ponton, pont, et les coupures
//     là où une herbe en touche une autre plus bas (COUPURES) ;
//   - le lit de la rivière est l'eau et le sable de son couloir (du bassin de la cascade, jusque sous la chute, à la plage
//     du sud, sous le pont), tenu à quelques pixels des zones d'en haut : on n'y descend et n'en remonte que par les
//     marches du quai et la rive du bassin.
//
// Écrit walk, river et blocks dans src/data/island.json (le reste du fichier ne change pas). Attention : les
// retouches faites à la main dans l'éditeur sur ces trois calques sont remplacées.
// Positions ci-dessous en pixels de la carte en 1024 (celles de npm run carte, divisées par 2).
//
// Usage : npm run zones
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const islandFile = path.join(projectDir, 'src', 'data', 'island.json');
const mapFile = path.join(projectDir, 'public', 'sprites', 'sols', 'ile-fond.webp');
const island = JSON.parse(await readFile(islandFile, 'utf8'));

const N = 1024;
const SIN = 1 / Math.sqrt(3);
const WIDTH = island.map.width;
const toUV = ([x, y]) => [round(((x - 512) / N) * WIDTH), round((((512 - y) / N) * WIDTH) / SIN)];
const toPx = ([u, v]) => [512 + (u / WIDTH) * N, 512 - ((v * SIN) / WIDTH) * N];
const round = (n) => Math.round(n * 100) / 100;

/** Lieux du jeu : chaque étendue praticable qui en contient un est gardée. */
const SEEDS = [
  [350, 450], // place du village
  [520, 200], // Grand Rocher
  [640, 520], // chemin des rizières
  [800, 750], // grande prairie
  [500, 630], // plateau du coffre du pont
  [120, 600], // plage de l'ouest
  [250, 670], // quai
  [920, 260], // corniche du coffre de la cascade
  [100, 370], // terrasse de Yuki et corniche des jizōs
  [250, 262], // palier du portail, en haut du volcan
];
/** Herbe contre herbe plus basse : la peinture montre une marche, les couleurs non. */
const CUTS = [
  [[744, 598], [782, 582], [788, 596], [752, 616]], // bout de la faille sous les rizières : la prairie est en contrebas
];
/** Escaliers, quai et ponton : de la pierre et du bois, comme les murets ; on les trace. */
const STAIRS = [
  [[425, 296], [461, 318], [433, 358], [397, 335]], // place → Grand Rocher (les deux bouts débordent sur les sols)
  [[247, 276], [278, 254], [365, 356], [330, 383]], // place → portail du volcan
  [[166, 441], [201, 419], [217, 436], [181, 463]], // place → terrasse de Yuki
  [[318, 584], [354, 596], [332, 658], [289, 639]], // place → quai
  [[166, 682], [248, 615], [292, 635], [329, 651], [375, 659], [324, 706], [296, 731], [284, 735], [249, 723]], // dessus du quai
  [[293, 733], [324, 700], [350, 733], [322, 770]], // marches du quai, jusque dans l'eau
  [[652, 622], [700, 595], [727, 620], [678, 648]], // chemin → prairie
  [[858, 258], [894, 274], [874, 330], [824, 312]], // chemin → corniche de la cascade
  [[205, 700], [255, 722], [118, 858], [66, 826]], // ponton
  [[62, 318], [88, 322], [112, 345], [122, 368], [100, 372], [70, 365]], // herbe sombre derrière les jizōs, au pied du volcan
  [[750, 326], [792, 309], [802, 320], [760, 340]], // rive du bassin de la cascade, du chemin jusque dans l'eau
];
/** Le tablier du pont, prolongé sur les berges, sans les garde-corps. */
const BRIDGE_WALK = [[495.5, 480], [616.5, 524], [583.5, 563], [461.5, 512]];
/** Couloir de la rivière : de la sortie du bassin de la cascade à la plage du sud et aux marches du quai. */
const RIVER_CORRIDOR = [
  [650, 335], [712, 360], [665, 420], [628, 470], [615, 520], [600, 560], [560, 600], [545, 640], [530, 690], [560, 760],
  [600, 840], [600, 880], [470, 872], [380, 855], [330, 815], [300, 785], [315, 760], [338, 740], [345, 690], [360, 640],
  [395, 600], [430, 560], [455, 520], [470, 475], [520, 440], [575, 400], [610, 350],
];
/** Le bassin de la cascade, jusque sous la chute (on passe derrière l'eau qui tombe : src/data/island.json `falls`). */
const POOL = [
  [650, 335], [628, 300], [634, 262], [662, 245], [700, 238], [724, 230], [745, 226], [778, 228], [790, 250], [800, 290], [804, 312],
  [790, 330], [760, 345], [712, 360],
];
/** Sous le tablier, l'eau ne se voit pas : le lit y passe d'une berge à l'autre. */
const UNDER_BRIDGE = [[515, 465], [605, 475], [560, 565], [462, 550]];
/** Les seuls passages entre les deux niveaux : le bas des marches du quai et la rive du bassin (aussi dans STAIRS). */
const CROSSINGS = [
  [[309, 751], [337, 716], [356, 738], [326, 778]],
  [[742, 318], [785, 299], [802, 320], [760, 340]], // la rive, prolongée dans l'eau
];
const RIVER_SEEDS = [[470, 790], [560, 520], [620, 420]];
/** Écart (pixels) entre le lit et les zones d'en haut, hors du passage : on ne remonte pas par une berge. */
const RIVER_GAP = 3;
/** Tolérance de simplification des contours (pixels). */
const TOLERANCE = 1;

// --- Classement des pixels : couleur (floutée) et grain (écart type de la luminance sur 5 × 5) ---
const blurred = await sharp(mapFile).resize(N, N).blur(1.2).removeAlpha().raw().toBuffer();
const raw = await sharp(mapFile).resize(N, N).removeAlpha().raw().toBuffer();
const luma = new Float32Array(N * N);
for (let i = 0; i < N * N; i++) luma[i] = 0.3 * raw[3 * i] + 0.59 * raw[3 * i + 1] + 0.11 * raw[3 * i + 2];
const grain = new Float32Array(N * N);
for (let y = 2; y < N - 2; y++) {
  for (let x = 2; x < N - 2; x++) {
    let s = 0;
    let s2 = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const l = luma[(y + dy) * N + x + dx]; s += l; s2 += l * l; }
    grain[y * N + x] = Math.sqrt(Math.max(0, s2 / 25 - (s / 25) ** 2));
  }
}
const feature = (i) => [blurred[3 * i], blurred[3 * i + 1], blurred[3 * i + 2], grain[i] * 1.5];
// k-moyennes (16 familles de pixels), puis chaque famille rangée selon la famille de référence la plus proche.
const K = 16;
let centers = Array.from({ length: K }, (_, k) => feature(Math.floor(((k + 0.5) / K) * N * N * 0.9 + N * N * 0.05)));
const family = new Uint8Array(N * N);
for (let it = 0; it < 12; it++) {
  const sums = Array.from({ length: K }, () => [0, 0, 0, 0, 0]);
  for (let i = 0; i < N * N; i += it < 11 ? 3 : 1) {
    const f = feature(i);
    let best = 0;
    let bestD = Infinity;
    for (let k = 0; k < K; k++) {
      const c = centers[k];
      const d = (f[0] - c[0]) ** 2 + (f[1] - c[1]) ** 2 + (f[2] - c[2]) ** 2 + (f[3] - c[3]) ** 2;
      if (d < bestD) { bestD = d; best = k; }
    }
    family[i] = best;
    const s = sums[best];
    for (let c = 0; c < 4; c++) s[c] += f[c];
    s[4]++;
  }
  centers = sums.map((s, k) => (s[4] ? s.slice(0, 4).map((v) => v / s[4]) : centers[k]));
}
// Familles relevées sur la carte de l'île : [r, g, b, grain × 1,5].
const REFERENCES = [
  ['sol', [155, 155, 120, 9]], ['sol', [165, 162, 147, 38]], ['sol', [202, 185, 156, 9]], ['sol', [132, 140, 103, 7]], ['sol', [115, 118, 90, 8]],
  ['relief', [61, 38, 34, 12]], ['relief', [85, 80, 68, 58]], ['relief', [84, 72, 63, 17]], ['relief', [130, 126, 108, 58]], ['relief', [104, 98, 82, 40]], ['relief', [61, 56, 48, 41]],
  ['eau', [85, 100, 105, 5]], ['eau', [101, 118, 121, 7]], ['eau', [73, 87, 93, 3]], ['eau', [130, 142, 139, 9]], ['eau', [66, 77, 85, 1]],
];
const kind = centers.map((c) => {
  let best = REFERENCES[0];
  let bestD = Infinity;
  for (const ref of REFERENCES) { const d = ref[1].reduce((sum, v, i) => sum + (v - c[i]) ** 2, 0); if (d < bestD) { bestD = d; best = ref; } }
  return best[0];
});

// --- Masques ---
const blank = () => new Uint8Array(N * N);
const or = (a, b) => a.map((v, i) => v | b[i]);
const and = (a, b) => a.map((v, i) => v & b[i]);
const minus = (a, b) => a.map((v, i) => v & (1 - b[i]));
function dilate(m, r) {
  const out = blank();
  const offsets = [];
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r + r) offsets.push([dx, dy]);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (!m[y * N + x]) continue;
      for (const [dx, dy] of offsets) { const X = x + dx; const Y = y + dy; if (X >= 0 && Y >= 0 && X < N && Y < N) out[Y * N + X] = 1; }
    }
  }
  return out;
}
const invert = (m) => m.map((v) => 1 - v);
const erode = (m, r) => invert(dilate(invert(m), r));
const smooth = (m, r) => dilate(erode(erode(dilate(m, r), r), r), r); // fermeture puis ouverture
function components(m) {
  const id = new Int32Array(N * N).fill(-1);
  const sizes = [];
  const stack = [];
  for (let s = 0; s < N * N; s++) {
    if (!m[s] || id[s] >= 0) continue;
    const c = sizes.length;
    let n = 0;
    id[s] = c;
    stack.push(s);
    while (stack.length) {
      const i = stack.pop();
      n++;
      const x = i % N;
      const y = (i - x) / N;
      for (const [X, Y] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (X < 0 || Y < 0 || X >= N || Y >= N) continue;
        const j = Y * N + X;
        if (m[j] && id[j] < 0) { id[j] = c; stack.push(j); }
      }
    }
    sizes.push(n);
  }
  return { id, sizes };
}
function keepSeeds(m, seeds) {
  const { id } = components(m);
  for (const [x, y] of seeds) if (!m[y * N + x]) console.warn(`attention : le lieu ${x}, ${y} n'est pas sur un sol praticable`);
  const keep = new Set(seeds.map(([x, y]) => id[y * N + x]).filter((k) => k >= 0));
  return m.map((_, i) => (keep.has(id[i]) ? 1 : 0));
}
function fillHoles(m, maxSize) {
  const { id, sizes } = components(invert(m));
  const border = new Set();
  for (let i = 0; i < N; i++) for (const j of [i, (N - 1) * N + i, i * N, i * N + N - 1]) border.add(id[j]);
  return m.map((v, i) => (v || (!border.has(id[i]) && sizes[id[i]] < maxSize) ? 1 : 0));
}
/** Remplit un polygone (u, v) : même règle que insidePolygon, au centre des pixels. */
function fill(poly, m = blank()) {
  const P = poly.map(toPx);
  for (let y = 0; y < N; y++) {
    const yc = y + 0.5;
    const xs = [];
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const [xi, yi] = P[i];
      const [xj, yj] = P[j];
      if (yi > yc !== yj > yc) xs.push(xi + ((yc - yi) * (xj - xi)) / (yj - yi));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.max(0, Math.ceil(xs[k] - 0.5)); x <= Math.min(N - 1, Math.floor(xs[k + 1] - 0.5)); x++) m[y * N + x] = 1;
    }
  }
  return m;
}
const fillPx = (pixels) => fill(pixels.map(toUV));

// --- En haut : zones de marche ---
let ground = blank();
for (let i = 0; i < N * N; i++) ground[i] = kind[family[i]] === 'sol' ? 1 : 0;
ground = fillHoles(smooth(ground, 2), 250);
for (const cut of CUTS) ground = minus(ground, fillPx(cut));
ground = minus(ground, dilate(fill(island.scenery.paddies), 2)); // diguettes et eau des rizières
ground = keepSeeds(ground, SEEDS);
for (const stairs of STAIRS) ground = or(ground, fillPx(stairs));
const bridge = fillPx(BRIDGE_WALK);
const walk = fillHoles(or(ground, bridge), 700);
ground = minus(walk, minus(bridge, ground)); // tout sauf le tablier

// --- En bas : le lit de la rivière ---
const corridor = or(fillPx(RIVER_CORRIDOR), fillPx(POOL));
let river = corridor.map((v, i) => (v && kind[family[i]] !== 'relief' ? 1 : 0));
river = or(smooth(river, 2), fillPx(UNDER_BRIDGE));
river = minus(river, dilate(ground, RIVER_GAP));
for (const crossing of CROSSINGS) river = or(river, fillPx(crossing));
river = and(river, or(corridor, fillPx(CROSSINGS[1])));
river = fillHoles(keepSeeds(river, RIVER_SEEDS), 150);

// --- Contours (le long des bords de pixels), simplifiés ---
function contours(m) {
  const edges = new Map();
  const add = (x0, y0, x1, y1) => {
    const k = y0 * (N + 1) + x0;
    if (!edges.has(k)) edges.set(k, []);
    edges.get(k).push(y1 * (N + 1) + x1);
  };
  const at = (x, y) => (x >= 0 && y >= 0 && x < N && y < N ? m[y * N + x] : 0);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (!at(x, y)) continue;
      if (!at(x, y - 1)) add(x + 1, y, x, y);
      if (!at(x - 1, y)) add(x, y, x, y + 1);
      if (!at(x, y + 1)) add(x, y + 1, x + 1, y + 1);
      if (!at(x + 1, y)) add(x + 1, y + 1, x + 1, y);
    }
  }
  const xy = (k) => [k % (N + 1), Math.floor(k / (N + 1))];
  const loops = [];
  for (const [start] of edges) {
    while (edges.get(start)?.length) {
      const loop = [start];
      let prev = start;
      let cur = edges.get(start).pop();
      if (!edges.get(start).length) edges.delete(start);
      while (cur !== start) {
        loop.push(cur);
        const next = edges.get(cur);
        let to = next[0];
        if (next.length > 1) {
          // Deux pixels qui se touchent par un coin : on tourne à gauche, ils restent séparés.
          const [px, py] = xy(prev);
          const [cx, cy] = xy(cur);
          to = next.find((c) => { const [nx, ny] = xy(c); return nx - cx === cy - py && ny - cy === px - cx; }) ?? to;
        }
        next.splice(next.indexOf(to), 1);
        if (!next.length) edges.delete(cur);
        prev = cur;
        cur = to;
      }
      const points = loop.map(xy);
      let area = 0;
      for (let i = 0; i < points.length; i++) {
        const [x0, y0] = points[i];
        const [x1, y1] = points[(i + 1) % points.length];
        area += x0 * y1 - x1 * y0;
      }
      loops.push({ points, area: area / 2 });
    }
  }
  return loops;
}
function douglasPeucker(points, tolerance) {
  if (points.length < 3) return points;
  const [ax, ay] = points[0];
  const [bx, by] = points[points.length - 1];
  const length = Math.hypot(bx - ax, by - ay) || 1e-9;
  let far = -1;
  let farD = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i];
    const d = Math.abs((bx - ax) * (ay - y) - (ax - x) * (by - ay)) / length;
    if (d > farD) { farD = d; far = i; }
  }
  if (farD <= tolerance) return [points[0], points[points.length - 1]];
  return [...douglasPeucker(points.slice(0, far + 1), tolerance).slice(0, -1), ...douglasPeucker(points.slice(far), tolerance)];
}
function polygons(m) {
  const outer = [];
  const holes = [];
  for (const { points, area } of contours(m)) {
    if (Math.abs(area) < 60) continue;
    let far = 0;
    let farD = 0;
    points.forEach(([x, y], i) => { const d = (x - points[0][0]) ** 2 + (y - points[0][1]) ** 2; if (d > farD) { farD = d; far = i; } });
    const a = douglasPeucker(points.slice(0, far + 1), TOLERANCE);
    const b = douglasPeucker([...points.slice(far), points[0]], TOLERANCE);
    const poly = [...a.slice(0, -1), ...b.slice(0, -1)].map(toUV);
    (area < 0 ? outer : holes).push(poly);
  }
  return { outer, holes };
}
const up = polygons(walk);
const down = polygons(river);
island.walk = up.outer;
island.river = down.outer;
island.blocks = [...up.holes, ...down.holes];
await writeFile(islandFile, `${formatJson(island)}\n`);
console.log(
  `src/data/island.json : ${up.outer.length} zone(s) de marche (${up.outer.reduce((n, p) => n + p.length, 0)} sommets), ` +
    `${down.outer.length} lit(s) de rivière, ${island.blocks.length} obstacle(s)`,
);

// Même format compact que l'éditeur (vite.config.ts).
function formatJson(v, indent = '') {
  const isPolygon = (x) => Array.isArray(x) && x.length > 0 && x.every((p) => Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === 'number'));
  const isObject = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
  const flat = (x) =>
    isPolygon(x) ||
    (Array.isArray(x) && x.every((y) => y === null || typeof y !== 'object')) ||
    (isObject(x) && Object.values(x).every((y) => !(Array.isArray(y) && y.some(Array.isArray))));
  const inline = (x) =>
    Array.isArray(x)
      ? `[${x.map(inline).join(', ')}]`
      : isObject(x)
        ? `{ ${Object.entries(x).map(([k, y]) => `${JSON.stringify(k)}: ${inline(y)}`).join(', ')} }`
        : JSON.stringify(x);
  if (indent && flat(v)) return inline(v);
  const pad = `${indent}  `;
  if (Array.isArray(v)) return v.length ? `[\n${v.map((x) => pad + formatJson(x, pad)).join(',\n')}\n${indent}]` : '[]';
  if (isObject(v)) return `{\n${Object.entries(v).map(([k, x]) => `${pad}${JSON.stringify(k)}: ${formatJson(x, pad)}`).join(',\n')}\n${indent}}`;
  return JSON.stringify(v);
}
