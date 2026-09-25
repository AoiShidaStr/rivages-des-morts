// Prépare les sols peints (vus de dessus) pour le jeu, dans public/sprites/sols.
//
// Nano Banana redessine le tracé du sol, mais pas toujours à la même échelle : l'île sort souvent
// plus grande que le dessin de départ. Or ce sont les cercles praticables de src/data/island.json qui font
// les collisions. On retrouve donc l'échelle et le décalage qui posent au mieux les terres peintes
// sur ces cercles, et on recadre l'image en conséquence.
//
// Usage : npm run sols
import { mkdir, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(os.homedir(), 'Pictures', 'game visual');
const outDir = path.join(projectDir, 'public', 'sprites', 'sols');
const OUT_SIZE = 2048;
/** Résolution des masques comparés. */
const GRID = 256;
/** Couleur de la brume autour de l'île (fond de la scène dans src/render/islandRenderer.ts). */
const MIST = { r: 0xc3, g: 0xcb, b: 0xcf };
/** Largeur du fondu entre le bord de l'image peinte et la brume, en part de sa taille. */
const FEATHER = 0.1;

await mkdir(outDir, { recursive: true });

// Rizières du donjon : le cadrage du dessin de départ est respecté, il suffit de redimensionner.
await sharp(path.join(sourceDir, 'sol_rizieres.jpg')).resize(OUT_SIZE, OUT_SIZE).jpeg({ quality: 88 }).toFile(path.join(outDir, 'rizieres.jpg'));
console.log('sols/rizieres.jpg');

// Île : recalage sur les cercles praticables.
const island = JSON.parse(await readFile(path.join(projectDir, 'src', 'data', 'island.json'), 'utf8'));
const WORLD_SIZE = 84; // src/render/islandRenderer.ts
/** Les terres peintes débordent des zones praticables (plage, bord de l'eau). */
const SHORE = 0.9;
const reference = referenceMask(island.walkable);
const source = path.join(sourceDir, 'sol_ile.jpg');
const painted = await landMask(source);
const fit = register(reference, painted);
console.log(`sols/ile.jpg : échelle ${fit.scale.toFixed(3)}, décalage (${fit.tx.toFixed(2)}, ${fit.tz.toFixed(2)}), recouvrement ${(fit.iou * 100).toFixed(1)} %`);
await warp(source, fit, path.join(outDir, 'ile.jpg'));

/** Case (i, j) de la grille → point du monde. Comme CreateGround : x vers la droite, z vers le haut de l'image. */
function cellToWorld(i, j) {
  return { x: ((i + 0.5) / GRID - 0.5) * WORLD_SIZE, z: (0.5 - (j + 0.5) / GRID) * WORLD_SIZE };
}

function referenceMask(walkable) {
  const mask = new Uint8Array(GRID * GRID);
  // Coordonnées d'écran (u, v) → monde, comme toWorld dans src/game/island.ts.
  const circles = walkable.map((c) => ({ x: (c.u + c.v) / Math.SQRT2, z: (c.v - c.u) / Math.SQRT2, r: c.r + SHORE }));
  for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) {
      const p = cellToWorld(i, j);
      if (circles.some((c) => Math.hypot(p.x - c.x, p.z - c.z) <= c.r)) mask[j * GRID + i] = 1;
    }
  }
  return mask;
}

/** Terres de l'image peinte : tout ce qui n'est ni l'eau sombre ni la brume (plus rouges que bleues). */
async function landMask(file) {
  const { data } = await sharp(file).resize(GRID, GRID).blur(1.2).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const mask = new Uint8Array(GRID * GRID);
  for (let k = 0; k < GRID * GRID; k++) {
    const [r, g, b] = [data[k * 3], data[k * 3 + 1], data[k * 3 + 2]];
    mask[k] = r > b + 10 || g > b + 25 ? 1 : 0;
  }
  // Les traînées orangées de la brume sont de petits îlots : on ne garde que la plus grande terre.
  return largestComponent(mask);
}

function largestComponent(mask) {
  const labels = new Int32Array(mask.length).fill(-1);
  let best = -1;
  let bestSize = 0;
  const stack = [];
  for (let s = 0; s < mask.length; s++) {
    if (!mask[s] || labels[s] >= 0) continue;
    let size = 0;
    stack.push(s);
    labels[s] = s;
    while (stack.length) {
      const k = stack.pop();
      size++;
      const i = k % GRID;
      for (const n of [i > 0 ? k - 1 : -1, i < GRID - 1 ? k + 1 : -1, k - GRID, k + GRID]) {
        if (n >= 0 && n < mask.length && mask[n] && labels[n] < 0) {
          labels[n] = s;
          stack.push(n);
        }
      }
    }
    if (size > bestSize) {
      bestSize = size;
      best = s;
    }
  }
  return mask.map((_, k) => (labels[k] === best ? 1 : 0));
}

/**
 * Cherche l'échelle `scale` et le décalage (tx, tz) tels que le point peint p (en unités du monde, l'image
 * peinte couvrant tout le sol) se pose en scale·p + t. Départ : aires et centres de gravité égaux ; puis on
 * affine en maximisant le recouvrement (intersection sur union) des deux masques.
 */
function register(ref, paint) {
  const stats = (mask) => {
    let n = 0;
    let sx = 0;
    let sz = 0;
    for (let k = 0; k < mask.length; k++) {
      if (!mask[k]) continue;
      const p = cellToWorld(k % GRID, Math.floor(k / GRID));
      n++;
      sx += p.x;
      sz += p.z;
    }
    return { n, x: sx / n, z: sz / n };
  };
  const a = stats(ref);
  const b = stats(paint);
  const s0 = Math.sqrt(a.n / b.n);
  const iou = (scale, tx, tz) => {
    let inter = 0;
    let union = 0;
    for (let k = 0; k < ref.length; k++) {
      const p = cellToWorld(k % GRID, Math.floor(k / GRID));
      // Point du monde → point de l'image peinte.
      const px = (p.x - tx) / scale;
      const pz = (p.z - tz) / scale;
      const i = Math.floor((px / WORLD_SIZE + 0.5) * GRID);
      const j = Math.floor((0.5 - pz / WORLD_SIZE) * GRID);
      const painted = i >= 0 && i < GRID && j >= 0 && j < GRID ? paint[j * GRID + i] : 0;
      if (painted && ref[k]) inter++;
      if (painted || ref[k]) union++;
    }
    return inter / union;
  };
  let best = { scale: s0, tx: a.x - s0 * b.x, tz: a.z - s0 * b.z };
  best.iou = iou(best.scale, best.tx, best.tz);
  // Descente par pas décroissants sur les trois paramètres.
  for (const [ds, dt] of [[0.04, 1], [0.02, 0.5], [0.01, 0.25], [0.005, 0.1]]) {
    let improved = true;
    while (improved) {
      improved = false;
      for (const [s, x, z] of [[ds, 0, 0], [-ds, 0, 0], [0, dt, 0], [0, -dt, 0], [0, 0, dt], [0, 0, -dt]]) {
        const cand = { scale: best.scale + s, tx: best.tx + x, tz: best.tz + z };
        cand.iou = iou(cand.scale, cand.tx, cand.tz);
        if (cand.iou > best.iou) {
          best = cand;
          improved = true;
        }
      }
    }
  }
  return best;
}

/**
 * Réduit (ou agrandit) l'image peinte et la replace sur un fond de brume. Ses bords se fondent dans la brume :
 * un remplissage en miroir recopierait l'île, visible depuis le ponton.
 */
async function warp(file, { scale, tx, tz }, output) {
  const size = Math.round(OUT_SIZE * scale);
  // Coin haut gauche de l'image peinte (x = -42, z = +42) une fois posé dans le monde, en pixels de sortie.
  const left = Math.round(((scale * -WORLD_SIZE) / 2 + tx) / WORLD_SIZE * OUT_SIZE + OUT_SIZE / 2);
  const top = Math.round(OUT_SIZE / 2 - ((scale * WORLD_SIZE) / 2 + tz) / WORLD_SIZE * OUT_SIZE);

  const feather = Math.max(1, Math.round(size * FEATHER));
  const alpha = Buffer.alloc(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const edge = Math.min(x, y, size - 1 - x, size - 1 - y);
      const t = Math.min(1, edge / feather);
      alpha[y * size + x] = Math.round(255 * t * t * (3 - 2 * t));
    }
  }
  // (La source est un JPEG, sans transparence : le canal ajouté devient l'alpha.)
  let overlay = await sharp(file)
    .resize(size, size)
    .joinChannel(alpha, { raw: { width: size, height: size, channels: 1 } })
    .png()
    .toBuffer();
  // Partie de l'image peinte qui tombe dans le cadre de sortie.
  const cropLeft = Math.max(0, -left);
  const cropTop = Math.max(0, -top);
  const width = Math.min(size - cropLeft, OUT_SIZE - Math.max(0, left));
  const height = Math.min(size - cropTop, OUT_SIZE - Math.max(0, top));
  overlay = await sharp(overlay).extract({ left: cropLeft, top: cropTop, width, height }).toBuffer();
  await sharp({ create: { width: OUT_SIZE, height: OUT_SIZE, channels: 3, background: MIST } })
    .composite([{ input: overlay, left: Math.max(0, left), top: Math.max(0, top) }])
    .jpeg({ quality: 88 })
    .toFile(output);
}
