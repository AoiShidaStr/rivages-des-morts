// Redessine la carte de l'île avec ce que décrit src/data/island.json par-dessus, pour le retoucher à l'œil :
//   - en vert, les zones où l'on marche ; en rouge, les obstacles ;
//   - en bleu, l'eau des rizières et le bassin ; en jaune, les bosquets et plages où poser des décors ;
//   - en cercles blancs, les zones nommées ; en points, les objets et les PNJ ;
//   - une grille tous les 64 pixels (sur une image de 1024 de côté) pour lire les positions.
// Écrit ~/Pictures/game visual/ile_fond_carte.png. Les positions du fichier sont en coordonnées d'écran (u, v) ;
// px = 512 + u / largeur × 1024, py = 512 − v × sin(35,26°) / largeur × 1024 (largeur : map.width).
//
// Usage : npm run carte
import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(os.homedir(), 'Pictures', 'game visual');
const island = JSON.parse(await readFile(path.join(projectDir, 'src', 'data', 'island.json'), 'utf8'));
const SIZE = 2048;
const SIN = 1 / Math.sqrt(3);
const width = island.map.width;
const px = (u, v) => [((512 + (u / width) * 1024) * SIZE) / 1024, ((512 - ((v * SIN) / width) * 1024) * SIZE) / 1024];
const poly = (points, fill, stroke) =>
  `<polygon points="${points.map(([u, v]) => px(u, v).map((n) => n.toFixed(1)).join(',')).join(' ')}" fill="${fill}" fill-opacity="0.3" stroke="${stroke}" stroke-width="3"/>`;

let svg = `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">`;
for (let g = 64; g < 1024; g += 64) {
  const p = (g * SIZE) / 1024;
  svg += `<line x1="${p}" y1="0" x2="${p}" y2="${SIZE}" stroke="#fff" stroke-opacity="0.25"/><line x1="0" y1="${p}" x2="${SIZE}" y2="${p}" stroke="#fff" stroke-opacity="0.25"/>`;
  svg += `<text x="${p + 3}" y="16" font-size="14" fill="#fff">${g}</text><text x="3" y="${p - 3}" font-size="14" fill="#fff">${g}</text>`;
}
for (const p of island.walk) svg += poly(p, '#00ff66', '#00ff66');
for (const p of island.blocks) svg += poly(p, '#ff0033', '#ff0033');
for (const p of [island.scenery.paddies, island.scenery.pool]) svg += poly(p, '#33aaff', '#33aaff');
for (const p of [...island.scenery.groves, ...island.scenery.beaches]) svg += poly(p, '#ffdd00', '#ffdd00');
for (const a of island.areas) {
  const [x, y] = px(a.u, a.v);
  const rx = ((a.r / width) * 1024 * SIZE) / 1024;
  svg += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${rx * SIN}" fill="none" stroke="#fff" stroke-dasharray="8 6" stroke-width="2"/>`;
  svg += `<text x="${x}" y="${y - rx * SIN - 6}" font-size="22" fill="#fff" text-anchor="middle" stroke="#000" stroke-width="0.8">${a.name}</text>`;
}
const dot = (u, v, label, color) => {
  const [x, y] = px(u, v);
  svg += `<circle cx="${x}" cy="${y}" r="7" fill="${color}" stroke="#000" stroke-width="2"/><text x="${x + 10}" y="${y + 5}" font-size="16" fill="#fff" stroke="#000" stroke-width="0.6">${label}</text>`;
};
for (const p of island.props) dot(p.u, p.v, p.sprite, '#ffaa00');
for (const it of island.interactables) dot(it.u, it.v, it.id, '#ff00ff');
dot(island.spawn.u, island.spawn.v, 'départ', '#00ffff');
svg += '</svg>';

const output = path.join(sourceDir, 'ile_fond_carte.png');
await sharp(path.join(sourceDir, 'ile_fond.png'))
  .resize(SIZE, SIZE)
  .composite([{ input: Buffer.from(svg) }])
  .png()
  .toFile(output);
console.log(output);
