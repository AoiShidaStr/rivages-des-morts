// Images fixes des personnages en pixel art (portraits de dialogue, écran des personnages, image de secours) :
// la première image d'attente de leur planche, à la place de l'ancienne image peinte.
//
// Usage : npm run images-fixes (après npm run planches)
// Concerne chaque `public/sprites/<nom>.png` cité par sprites.json ou islandSprites.json, ou image d'un héros
// (`heros-<race>-<classe>.png`), pas encore en pixel art, dont la planche `anim/<…>.json` est en pixel art (`smooth: false`).
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { markPixelArt } from './images.mjs';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const spritesDir = path.join(projectDir, 'public', 'sprites');
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const exists = (file) => access(file).then(() => true, () => false);

// Image fixe → planche. Une image déjà en pixel art (découpée d'une page de décors) reste telle quelle.
const already = new Set(await readJson(path.join(projectDir, 'src', 'data', 'pixelArt.json')).catch(() => []));
const pairs = new Map();
for (const manifest of ['sprites.json', 'islandSprites.json']) {
  for (const def of Object.values(await readJson(path.join(projectDir, 'src', 'data', manifest)))) {
    if (def?.file && def.sheet?.file) pairs.set(def.file, def.sheet.file);
  }
}
const skills = await readJson(path.join(projectDir, 'src', 'data', 'skills.json'));
for (const race of Object.keys(skills.races)) {
  for (const cls of Object.keys(skills.classes)) pairs.set(`heros-${race}-${cls}.png`, `anim/heros-${race}-${cls}.json`);
}

const written = [];
for (const [file, sheetFile] of pairs) {
  if (already.has(file)) continue;
  const sheetPath = path.join(spritesDir, sheetFile);
  if (!(await exists(sheetPath))) continue;
  const sheet = await readJson(sheetPath);
  if (sheet.meta?.smooth !== false) continue;
  const frames = Array.isArray(sheet.frames) ? sheet.frames : Object.values(sheet.frames);
  const idle = sheet.meta.frameTags?.find((t) => t.name === 'idle') ?? sheet.meta.frameTags?.[0];
  const { frame } = frames[idle?.from ?? 0];
  const image = path.join(path.dirname(sheetPath), sheet.meta.image);
  // Deux passes : dans une même chaîne, sharp rognerait avant de découper.
  const cell = await sharp(image).extract({ left: frame.x, top: frame.y, width: frame.w, height: frame.h }).png().toBuffer();
  await sharp(cell)
    .trim({ threshold: 0 })
    .png({ compressionLevel: 9 })
    .toFile(path.join(spritesDir, file));
  written.push(file);
  console.log(`${file.padEnd(36)} ← ${sheetFile}`);
}
await markPixelArt(written);
