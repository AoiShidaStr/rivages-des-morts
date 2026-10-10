// Prépare les sols peints pour le jeu, dans public/sprites/sols.
//   - sols/rizieres.jpg : sol de secours de l'arène des Rizières, redimensionné ;
//   - sols/ile-fond.webp : la carte de l'île (~/Pictures/game visual/ile_fond.png), en 4096 de côté, ses bords fondus
//     dans la couleur de la mer pour qu'elle se prolonge sans couture au-delà de l'image (src/render/islandMap.ts) ;
//   - sols/ile-fond-512.webp : la même en 512, que le jeu lit pour savoir où sont l'eau et l'herbe (sans décoder la
//     grande au démarrage).
//
// Les zones de marche et les positions de src/data/island.json se tracent sur cette carte : npm run carte la
// redessine avec elles par-dessus.
//
// Usage : npm run sols
import { mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(os.homedir(), 'Pictures', 'game visual');
const outDir = path.join(projectDir, 'public', 'sprites', 'sols');
const ISLAND_SIZE = 4096;
/** Largeur du fondu entre l'image et la mer unie, en part de sa taille. */
const FEATHER = 0.05;

await mkdir(outDir, { recursive: true });

await sharp(path.join(sourceDir, 'sol_rizieres.jpg')).resize(2048, 2048).jpeg({ quality: 88 }).toFile(path.join(outDir, 'rizieres.jpg'));
console.log('sols/rizieres.jpg');

const { data, info } = await sharp(path.join(sourceDir, 'ile_fond.png'))
  .resize(ISLAND_SIZE, ISLAND_SIZE, { kernel: 'lanczos3' })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const sea = borderMedian(data, info.width, info.height);
const band = FEATHER * ISLAND_SIZE;
for (let y = 0; y < ISLAND_SIZE; y++) {
  for (let x = 0; x < ISLAND_SIZE; x++) {
    const edge = Math.min(x, y, ISLAND_SIZE - 1 - x, ISLAND_SIZE - 1 - y);
    if (edge >= band) continue;
    const t = edge / band;
    const keep = t * t * (3 - 2 * t);
    const i = (y * ISLAND_SIZE + x) * 3;
    for (let c = 0; c < 3; c++) data[i + c] = Math.round(sea[c] + (data[i + c] - sea[c]) * keep);
  }
}
await sharp(data, { raw: { width: ISLAND_SIZE, height: ISLAND_SIZE, channels: 3 } })
  .webp({ quality: 86 })
  .toFile(path.join(outDir, 'ile-fond.webp'));
console.log(`sols/ile-fond.webp (mer #${sea.map((c) => c.toString(16).padStart(2, '0')).join('')})`);
await sharp(data, { raw: { width: ISLAND_SIZE, height: ISLAND_SIZE, channels: 3 } })
  .resize(512, 512, { kernel: 'lanczos3' })
  .webp({ quality: 92 })
  .toFile(path.join(outDir, 'ile-fond-512.webp'));
console.log('sols/ile-fond-512.webp');

/** Couleur médiane du bord de l'image : la mer. */
function borderMedian(rgb, w, h) {
  const channels = [[], [], []];
  const take = (i) => channels.forEach((values, c) => values.push(rgb[i * 3 + c]));
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
