// Planche de tous les objets et matériaux du jeu en pixel art, à donner à Nano Banana pour qu'il repeigne
// les icônes (voir « Prompt objets.md » à côté de la planche).
//
// Usage : node tools/collection-objets.mjs
// Sortie (dossier ignoré par git) : public/sprites/sprites/objets/
//   - collection-objets.png : la planche seule, sans texte, pour Gemini ;
//   - collection-objets-legende.png : la même avec le nom de chaque objet, pour s'y retrouver.
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { Canvas } from './pixel/canvas.mjs';
import { ICONS, OUTLINE, SIZE } from './pixel/objets.mjs';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(projectDir, 'public', 'sprites', 'sprites', 'objets');
const items = JSON.parse(await readFile(path.join(projectDir, 'src', 'data', 'items.json'), 'utf8'));

/** Dans l'ordre de items.json : objets (armes, équipement, reliques, quête), puis matériaux. */
const ORDER =[...Object.keys(items.items), ...Object.keys(items.materials)];
const COLUMNS = 8;
const PAD = 4;
const CELL = SIZE + PAD * 2;
const SCALE = 8;
const BACKGROUND = '#d4d4d4';
const LABEL = 56;

const missing = ORDER.filter((id) => !ICONS[id]);
if (missing.length) throw new Error(`Icône manquante : ${missing.join(', ')}`);

await mkdir(outDir, { recursive: true });
const rows = Math.ceil(ORDER.length / COLUMNS);
const icons = await Promise.all(
  ORDER.map(async (id) => {
    const c = new Canvas(SIZE, SIZE);
    ICONS[id](c);
    c.outline(OUTLINE);
    return sharp(c.data, { raw: { width: SIZE, height: SIZE, channels: 4 } })
      .resize(SIZE * SCALE, SIZE * SCALE, { kernel: 'nearest' })
      .png()
      .toBuffer();
  }),
);

const name = (id) => items.items[id]?.name ?? items.materials[id];
const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;');

async function sheet(file, withLabels) {
  const cellW = CELL * SCALE;
  const cellH = CELL * SCALE + (withLabels ? LABEL : 0);
  const composites = icons.map((input, i) => ({
    input,
    left: (i % COLUMNS) * cellW + PAD * SCALE,
    top: Math.floor(i / COLUMNS) * cellH + PAD * SCALE,
  }));
  if (withLabels) {
    const texts = ORDER.map((id, i) => {
      const x = (i % COLUMNS) * cellW + cellW / 2;
      const y = Math.floor(i / COLUMNS) * cellH + CELL * SCALE + 30;
      return `<text x="${x}" y="${y}" text-anchor="middle" font-family="Arial" font-size="24" fill="#1d2226">${i + 1}. ${escape(name(id))}</text>`;
    });
    composites.push({ input: Buffer.from(`<svg width="${COLUMNS * cellW}" height="${rows * cellH}">${texts.join('')}</svg>`), left: 0, top: 0 });
  }
  await sharp({ create: { width: COLUMNS * cellW, height: rows * cellH, channels: 3, background: BACKGROUND } })
    .composite(composites)
    .png()
    .toFile(path.join(outDir, file));
  console.log(`${file} (${COLUMNS * cellW}×${rows * cellH}, ${ORDER.length} icônes)`);
}

await sheet('collection-objets.png', false);
await sheet('collection-objets-legende.png', true);
