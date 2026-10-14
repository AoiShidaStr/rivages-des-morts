// Icônes en pixel art pour les objets qui n'ont pas encore d'icône peinte (public/sprites/icones/<id>.png).
// Les dessins sont ceux de tools/pixel/objets.mjs (32 × 32), agrandis quatre fois sans lissage (128 × 128,
// la taille des icônes peintes). Une icône peinte déjà présente n'est jamais écrasée.
//
// Usage : npm run icones-pixel             → toutes les icônes manquantes
//         npm run icones-pixel -- kunai-jumeaux arc-soie   → refait ces icônes, même si elles existent
//
// Les icônes des compétences du HUD de combat (tools/pixel/competences.mjs) vont dans
// public/sprites/competences/<id>.png, avec la même règle (une icône peinte n'est jamais écrasée). La planche de
// référence de leurs cases (public/sprites/sprites/competences/reference-planche-1.png) accompagne le prompt
// docs/prompts-2d/07-icones-competences.md.
import { access, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { Canvas } from './pixel/canvas.mjs';
import * as SKILL_ICONS from './pixel/competences.mjs';
import { ICONS, OUTLINE, SIZE } from './pixel/objets.mjs';

const SCALE = 4;
const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(projectDir, 'public', 'sprites', 'icones');
const items = JSON.parse(await readFile(path.join(projectDir, 'src', 'data', 'items.json'), 'utf8'));
const exists = (file) => access(file).then(() => true, () => false);
const forced = process.argv.slice(2);

await mkdir(outDir, { recursive: true });
const ids = forced.length ? forced : [...Object.keys(items.items), ...Object.keys(items.materials)];
for (const id of ids) {
  const output = path.join(outDir, `${id}.png`);
  if (!forced.length && (await exists(output))) continue;
  if (!ICONS[id]) {
    console.warn(`${id.padEnd(20)} pas de dessin dans tools/pixel/objets.mjs, ignoré`);
    continue;
  }
  const c = new Canvas(SIZE, SIZE);
  ICONS[id](c);
  c.outline(OUTLINE);
  await sharp(c.data, { raw: { width: SIZE, height: SIZE, channels: 4 } })
    .resize(SIZE * SCALE, SIZE * SCALE, { kernel: 'nearest' })
    .png({ compressionLevel: 9 })
    .toFile(output);
  console.log(`${id.padEnd(20)} → public/sprites/icones/${id}.png`);
}

const skillDir = path.join(projectDir, 'public', 'sprites', 'competences');
await mkdir(skillDir, { recursive: true });
const skillIcons = {};
for (const [id, draw] of Object.entries(SKILL_ICONS.ICONS)) {
  const c = new Canvas(SKILL_ICONS.SIZE, SKILL_ICONS.SIZE);
  draw(c);
  c.outline(SKILL_ICONS.OUTLINE);
  skillIcons[id] = await sharp(c.data, { raw: { width: SKILL_ICONS.SIZE, height: SKILL_ICONS.SIZE, channels: 4 } })
    .resize(SKILL_ICONS.SIZE * SCALE, SKILL_ICONS.SIZE * SCALE, { kernel: 'nearest' })
    .png({ compressionLevel: 9 })
    .toBuffer();
  const output = path.join(skillDir, `${id}.png`);
  if (!forced.includes(id) && (await exists(output))) continue;
  await sharp(skillIcons[id]).toFile(output);
  console.log(`${id.padEnd(20)} → public/sprites/competences/${id}.png`);
}

// Planche de référence pour Nano Banana : les cases de la première planche (tools/icones.json), sur le gris du fond.
const sheet = JSON.parse(await readFile(path.join(projectDir, 'tools', 'icones.json'), 'utf8')).sheets.find((s) => s.source === 'competences_planche_1.png');
if (sheet) {
  const cell = SKILL_ICONS.SIZE * SCALE * 2;
  const refDir = path.join(projectDir, 'public', 'sprites', 'sprites', 'competences');
  await mkdir(refDir, { recursive: true });
  const composites = sheet.ids.flatMap((id, i) =>
    id && skillIcons[id]
      ? [{ input: skillIcons[id], left: (i % sheet.columns) * cell + cell / 4, top: Math.floor(i / sheet.columns) * cell + cell / 4 }]
      : [],
  );
  await sharp({ create: { width: sheet.columns * cell, height: sheet.rows * cell, channels: 3, background: '#d4d4d4' } })
    .composite(composites)
    .png()
    .toFile(path.join(refDir, 'reference-planche-1.png'));
  console.log('Planche de référence → public/sprites/sprites/competences/reference-planche-1.png');
}
