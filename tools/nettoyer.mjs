// Nettoie des images déjà détourées (public/sprites) où il reste du gris du fond de Nano Banana :
//   - les poches de fond enfermées par le sujet (entre le bâton et la robe de Charon) deviennent transparentes ;
//   - le liseré et les halos peints sur le gris (lanterne, aura) sont « dé-mélangés » du gris (voir `defringe`).
// Les réglages sont dans tools/nettoyage.json : `ref`, le gris du fond de la planche d'origine ; `band`, la largeur
// du bord traité (pixels) ; `minHole`, la taille minimale d'une poche de fond enfermée.
//
// À lancer une seule fois sur une image fraîchement découpée : une seconde passe rognerait encore le bord.
//
// Usage : npm run nettoyer             → toutes les entrées
//         npm run nettoyer -- charon   → seulement les fichiers dont le nom contient « charon »
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { defringe } from './decoupe.mjs';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await readFile(path.join(projectDir, 'tools', 'nettoyage.json'), 'utf8'));
const only = process.argv.slice(2);

for (const entry of config.images) {
  if (only.length > 0 && !only.some((o) => entry.file.includes(o))) continue;
  const options = { ...config.defaults, ...entry };
  const file = path.join(projectDir, 'public', 'sprites', entry.file);
  const { data: rgba, info } = await sharp(await readFile(file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const rgb = Buffer.alloc(w * h * 3);
  const alpha = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    rgb[i * 3] = rgba[i * 4];
    rgb[i * 3 + 1] = rgba[i * 4 + 1];
    rgb[i * 3 + 2] = rgba[i * 4 + 2];
    alpha[i] = rgba[i * 4 + 3] < 8 ? 0 : rgba[i * 4 + 3];
  }
  const holes = options.minHole ? clearHoles(rgb, alpha, w, h, options) : 0;
  defringe(rgb, alpha, w, h, options.band, options.ref);
  const out = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    out[i * 4] = rgb[i * 3];
    out[i * 4 + 1] = rgb[i * 3 + 1];
    out[i * 4 + 2] = rgb[i * 3 + 2];
    out[i * 4 + 3] = alpha[i];
  }
  const image = sharp(out, { raw: { width: w, height: h, channels: 4 } });
  const buffer = await (file.endsWith('.webp') ? image.webp({ quality: 90, alphaQuality: 100 }) : image.png()).toBuffer();
  await writeFile(file, buffer);
  console.log(`${entry.file.padEnd(32)} ${holes} px de fond enfermé retirés, bord de ${options.band} px nettoyé`);
}

/** Vide les poches du gris du fond enfermées par le sujet, assez grandes pour ne pas être un détail gris du sujet. */
function clearHoles(rgb, alpha, w, h, { ref, holeTolerance, minHole }) {
  const grey = (i) => {
    const r = rgb[i * 3];
    const g = rgb[i * 3 + 1];
    const b = rgb[i * 3 + 2];
    return Math.max(r, g, b) - Math.min(r, g, b) <= 8 && Math.abs(r - ref[0]) + Math.abs(g - ref[1]) + Math.abs(b - ref[2]) <= holeTolerance * 3;
  };
  const seen = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let cleared = 0;
  for (let start = 0; start < w * h; start++) {
    if (seen[start] || !alpha[start] || !grey(start)) continue;
    const pocket = [];
    let top = 0;
    stack[top++] = start;
    seen[start] = 1;
    while (top > 0) {
      const i = stack[--top];
      pocket.push(i);
      const x = i % w;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i >= w ? i - w : -1, i < (h - 1) * w ? i + w : -1]) {
        if (j >= 0 && !seen[j] && alpha[j] && grey(j)) {
          seen[j] = 1;
          stack[top++] = j;
        }
      }
    }
    if (pocket.length < minHole) continue;
    for (const i of pocket) alpha[i] = 0;
    cleared += pocket.length;
  }
  return cleared;
}
