// Aperçu des planches en pixel art (outil de mise au point) : node tools/pixel/apercu.mjs <module> <sortie.png> [échelle]
// Chaque ligne montre toutes les images d'un personnage ou d'un décor, sur un fond gris de brume.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { Canvas } from './canvas.mjs';
import { drawSheet } from './sheet.mjs';

const [, , modulePath, output, scaleArg] = process.argv;
const mod = await import(pathToFileURL(path.resolve(modulePath)).href);
const entries = Object.entries(mod).filter(([, v]) => v && typeof v === 'object' && v.draw && v.animations);
const rows = entries.map(([name, ch]) => ({ name, ...drawSheet(name, ch), ch }));
const width = Math.max(...rows.map((r) => r.sheet.width)) + 8;
const height = rows.reduce((sum, r) => sum + r.sheet.height + 6, 6);
const board = new Canvas(width, height);
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) board.set(x, y, (Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? '#c3cbcf' : '#bcc4c8');
let y = 6;
for (const r of rows) {
  for (let j = 0; j < r.sheet.height; j++) {
    for (let i = 0; i < r.sheet.width; i++) {
      const k = (j * r.sheet.width + i) * 4;
      if (r.sheet.data[k + 3]) board.data.set(r.sheet.data.subarray(k, k + 4), ((y + j) * width + 4 + i) * 4);
    }
  }
  y += r.sheet.height + 6;
}
const scale = Number(scaleArg ?? 3);
await sharp(board.data, { raw: { width, height, channels: 4 } }).resize(width * scale, height * scale, { kernel: 'nearest' }).png().toFile(output);
console.log(rows.map((r) => `${r.name} ${r.count}`).join(', '));
