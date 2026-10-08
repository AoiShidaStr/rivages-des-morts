// Palette « Yomi » du pack KayKit Forest : les modèles ne lisent que trois bandes de dégradé (feuillage, tronc,
// roche) dans les 128 premiers pixels de forest_texture.png. On les repeint en tons sourds et brumeux.
// Usage : node tools/palette-foret.mjs  →  public/models/kaykit-forest/forest_yomi.png
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SIZE = 1024;
const BAND = 256;

/** Dégradé du haut vers le bas de chaque bande (le haut de la bande éclaire le haut des feuillages). */
const BANDS = [
  ['#7f9e7c', '#2c4a3d'], // feuillage : vert de pin, bleuté dans l'ombre
  ['#7a6250', '#2f2522'], // tronc : brun gris
  ['#b5bab4', '#5b6262'], // roche : gris de brume
  ['#d8d8d8', '#202020'], // inutilisée
];

function hex(c) {
  return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
}

const data = Buffer.alloc(SIZE * SIZE * 3);
for (let y = 0; y < SIZE; y++) {
  const [top, bottom] = BANDS[Math.floor(y / BAND)].map(hex);
  const t = (y % BAND) / (BAND - 1);
  for (let x = 0; x < SIZE; x++) {
    for (let k = 0; k < 3; k++) data[(y * SIZE + x) * 3 + k] = Math.round(top[k] + (bottom[k] - top[k]) * t);
  }
}
const out = path.join(root, 'public', 'models', 'kaykit-forest', 'forest_yomi.png');
await sharp(data, { raw: { width: SIZE, height: SIZE, channels: 3 } }).resize(128, 128).png().toFile(out);
console.log(`palette → ${path.relative(root, out)}`);
