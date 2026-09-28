// Monte les planches d'animation peintes (Nano Banana) en planches pour le jeu.
//
// Chaque image source contient les images d'une animation sur fond gris, rangées en lignes.
// L'outil détoure le fond, sépare les images, les met toutes à la même échelle, les aligne
// (pieds sur la même ligne, corps au centre), puis écrit dans public/sprites/anim :
//   - <nom>.webp : toutes les images, dans des cases de même taille ;
//   - <nom>.json : le découpage au format « Array » d'Aseprite, un tag par posture,
//     plus `meta.anchor` (position des pieds dans une case) et `meta.bodyHeight`.
//
// Les héros par race et par classe s'y ajoutent, lus dans ~/Pictures/game visual/heros (voir planches-heros.mjs).
//
// Usage : npm run planches               → toutes les entrées de tools/planches.json et tous les héros
//         npm run planches -- heros      → seulement « heros »
//         npm run planches -- heros-demi-dieu-lame   → seulement ce héros
//         npm run planches -- --apercu dossier   → écrit aussi une bande par animation, avec les repères
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { referenceHeight, registerOnFirst, scaleFrame, splitFrames } from './grille.mjs';
import { heroPlanches } from './planches-heros.mjs';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await readFile(path.join(projectDir, 'tools', 'planches.json'), 'utf8'));
const sourceDir = config.sourceDir.replace(/^~(?=$|[\\/])/, os.homedir());
const outDir = path.join(projectDir, config.outDir);
const args = process.argv.slice(2);
const previewAt = args.indexOf('--apercu');
const previewDir = previewAt >= 0 ? args.splice(previewAt, 2)[1] : null;
const only = args;

/** Largeur maximale de la planche : les cases passent à la ligne au-delà. */
const MAX_SHEET_WIDTH = 4096;
/** Marge transparente autour de chaque case, contre les débordements du filtrage. */
const CELL_PADDING = 8;

await mkdir(outDir, { recursive: true });
for (const planche of [...config.planches, ...(await heroPlanches(sourceDir))]) {
  if (only.length > 0 && !only.includes(planche.name)) continue;
  const frames = [];
  const tags = [];
  let missing = false;
  for (const anim of planche.animations) {
    const input = path.join(sourceDir, anim.source);
    if (!(await access(input).then(() => true, () => false))) {
      console.warn(`${planche.name} ${anim.tag} : ${anim.source} introuvable`);
      missing = true;
      continue;
    }
    const options = { ...config.defaults, ...planche, ...anim };
    const found = await splitFrames(input, options);
    // `part` : la première ou la seconde moitié des images (élan puis coup d'une même planche d'attaque).
    const half = Math.floor(found.length / 2);
    const all = anim.part === 'first' ? found.slice(0, half) : anim.part === 'second' ? found.slice(half) : found;
    const picked = anim.frames ? anim.frames.map((i) => found[i]) : all;
    if (options.anchor === 'box') registerOnFirst(picked);
    const scale = planche.bodyHeight / referenceHeight(found, picked, anim.ref);
    const from = frames.length;
    picked.forEach((frame, i) => {
      frames.push({ ...scaleFrame(frame, scale), duration: anim.durations?.[i] ?? anim.duration ?? 100, tag: anim.tag });
    });
    tags.push({ name: anim.tag, from, to: frames.length - 1, direction: 'forward', ...(anim.once ? { repeat: '1' } : {}) });
    console.log(`${planche.name.padEnd(26)} ${anim.tag.padEnd(9)} ${picked.length}/${found.length} images, échelle ${scale.toFixed(3)}`);
  }
  if (missing && frames.length === 0) continue;
  await writeSheet(planche, frames, tags);
}

async function writeSheet(planche, frames, tags) {
  // Case commune : assez large des deux côtés de l'axe, assez haute au-dessus et en dessous des pieds.
  const half = Math.ceil(Math.max(...frames.map((f) => Math.max(f.anchorX, f.width - f.anchorX))));
  const above = Math.ceil(Math.max(...frames.map((f) => f.baseline)));
  const below = Math.ceil(Math.max(0, ...frames.map((f) => f.height - f.baseline)));
  const cellW = 2 * half + 2 * CELL_PADDING;
  const cellH = above + below + 2 * CELL_PADDING;
  const anchor = { x: CELL_PADDING + half, y: CELL_PADDING + above };
  const columns = Math.max(1, Math.floor(MAX_SHEET_WIDTH / cellW));
  const sheetW = Math.min(frames.length, columns) * cellW;
  const sheetH = Math.ceil(frames.length / columns) * cellH;

  const composites = [];
  const jsonFrames = [];
  for (const [i, f] of frames.entries()) {
    const cx = (i % columns) * cellW;
    const cy = Math.floor(i / columns) * cellH;
    const input = await sharp(f.source.rgba, { raw: { width: f.source.width, height: f.source.height, channels: 4 } })
      .resize(f.width, f.height, { kernel: 'lanczos3' })
      .png()
      .toBuffer();
    composites.push({ input, left: Math.round(cx + anchor.x - f.anchorX), top: Math.round(cy + anchor.y - f.baseline) });
    jsonFrames.push({ filename: `${f.tag} ${i}`, frame: { x: cx, y: cy, w: cellW, h: cellH }, duration: f.duration });
  }
  const image = `${planche.name}.webp`;
  await sharp({ create: { width: sheetW, height: sheetH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(composites)
    .webp({ quality: 90, alphaQuality: 100, effort: 6 })
    .toFile(path.join(outDir, image));
  const json = {
    frames: jsonFrames,
    meta: {
      app: 'tools/planches.mjs',
      image,
      size: { w: sheetW, h: sheetH },
      smooth: true,
      bodyHeight: planche.bodyHeight,
      anchor,
      frameTags: tags,
    },
  };
  await writeFile(path.join(outDir, `${planche.name}.json`), `${JSON.stringify(json, null, 1)}\n`);
  console.log(`→ ${path.relative(projectDir, path.join(outDir, image))} (${sheetW}×${sheetH}, cases ${cellW}×${cellH}, ${frames.length} images)`);

  if (previewDir) await writePreview(planche, frames, tags, cellW, cellH, anchor);
}

/** Une bande par animation, avec la ligne des pieds et l'axe du corps, pour vérifier l'alignement. */
async function writePreview(planche, frames, tags, cellW, cellH, anchor) {
  await mkdir(previewDir, { recursive: true });
  for (const tag of tags) {
    const count = tag.to - tag.from + 1;
    const composites = [];
    for (let k = 0; k < count; k++) {
      const f = frames[tag.from + k];
      const input = await sharp(f.source.rgba, { raw: { width: f.source.width, height: f.source.height, channels: 4 } })
        .resize(f.width, f.height)
        .png()
        .toBuffer();
      composites.push({ input, left: Math.round(k * cellW + anchor.x - f.anchorX), top: Math.round(anchor.y - f.baseline) });
    }
    const lines = Buffer.from(
      `<svg width="${count * cellW}" height="${cellH}"><line x1="0" y1="${anchor.y}" x2="${count * cellW}" y2="${anchor.y}" stroke="red" stroke-width="2"/>` +
        Array.from({ length: count }, (_, k) => `<line x1="${k * cellW + anchor.x}" y1="0" x2="${k * cellW + anchor.x}" y2="${cellH}" stroke="blue" stroke-width="2"/>`).join('') +
        '</svg>',
    );
    composites.push({ input: lines, left: 0, top: 0 });
    await sharp({ create: { width: count * cellW, height: cellH, channels: 3, background: '#d8d8d8' } })
      .composite(composites)
      .png()
      .toFile(path.join(previewDir, `${planche.name}_${tag.name}.png`));
  }
}
