// Importe les effets peints par Nano Banana (docs/prompts-vfx) dans le jeu : `npm run vfx-ia`.
//
// Chaque planche est une grille de 4 × 4 images sur fond noir pur (tools/vfx-ia.json dit où elle est et ce qu'on en
// garde). Le noir devient transparent : l'opacité d'un pixel est sa composante la plus vive (× `gain` pour les objets
// pleins), et sa couleur est « dé-multipliée » pour qu'il garde son éclat une fois posé sur le sol de l'arène.
// La sortie a le même format que tools/vfx.mjs (public/sprites/fx/<nom>.webp + .json, un tag) : une planche
// importée remplace la planche dessinée du même nom, sans rien changer d'autre.
//
// Usage : npm run vfx-ia            → toutes les planches présentes
//         npm run vfx-ia -- brand   → seulement celles dont le nom commence par « brand »
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await readFile(path.join(root, 'tools', 'vfx-ia.json'), 'utf8'));
const source = config.source.replace(/^~/, os.homedir());
const outDir = path.join(root, 'public', 'sprites', 'fx');
const only = process.argv.slice(2);
/** Taille de référence d'une case : `crop` et `inset` sont donnés dans une case de 256 px. */
const CELL = 256;
/** En dessous de ce niveau (sur 255), c'est du noir de fond : bruit de compression compris. */
const BLACK = 14;

/** Le noir devient transparent ; la couleur est divisée par l'opacité, pour rester vive sur le sol. */
function keyBlack(data, gain) {
  for (let i = 0; i < data.length; i += 4) {
    const peak = Math.max(data[i], data[i + 1], data[i + 2]);
    const alpha = Math.min(1, (Math.max(0, peak - BLACK) / (255 - BLACK)) * gain);
    const scale = alpha > 0 ? Math.min(255 / Math.max(1, peak), 1 / alpha) : 0;
    data[i] = Math.min(255, data[i] * scale);
    data[i + 1] = Math.min(255, data[i + 1] * scale);
    data[i + 2] = Math.min(255, data[i + 2] * scale);
    data[i + 3] = Math.round(alpha * 255);
  }
  return data;
}

for (const effect of config.effects) {
  if (only.length && !only.some((o) => effect.name.startsWith(o))) continue;
  const file = path.join(source, effect.file);
  if (!existsSync(file)) {
    console.log(`${effect.name.padEnd(24)} absent (${effect.file})`);
    continue;
  }
  const image = sharp(file);
  const { width, height } = await image.metadata();
  // `rotate` (degrés, sens horaire) : chaque case entière est tournée, puis toutes sont recadrées sur la même boîte
  // (l'union de ce qui n'est pas noir) et étirées à `size` — un vortex dessiné couché, à redresser dans une porte.
  // Les cases peuvent alors être rectangulaires (image non carrée).
  if (effect.rotate !== undefined) {
    const cw = Math.floor(width / 4);
    const chh = Math.floor(height / 4);
    const turned = [];
    for (const index of effect.frames ?? [...Array(16).keys()]) {
      const piece = await sharp(file).extract({ left: (index % 4) * cw, top: Math.floor(index / 4) * chh, width: cw, height: chh }).png().toBuffer();
      turned.push(await sharp(piece).rotate(effect.rotate, { background: { r: 0, g: 0, b: 0, alpha: 1 } }).removeAlpha().raw().toBuffer({ resolveWithObject: true }));
    }
    const box = [Infinity, Infinity, -1, -1];
    for (const { data, info } of turned) {
      for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
        const i = (y * info.width + x) * 3;
        if (Math.max(data[i], data[i + 1], data[i + 2]) <= 40) continue;
        box[0] = Math.min(box[0], x); box[1] = Math.min(box[1], y); box[2] = Math.max(box[2], x); box[3] = Math.max(box[3], y);
      }
    }
    effect.prepared = [];
    const [outW, outH] = effect.size;
    for (const { data, info } of turned) {
      const { data: px, info: o } = await sharp(data, { raw: info })
        .extract({ left: box[0], top: box[1], width: box[2] - box[0] + 1, height: box[3] - box[1] + 1 })
        .resize(outW, outH, { fit: 'fill' })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      keyBlack(px, effect.gain ?? 1);
      effect.prepared.push(await sharp(px, { raw: { width: o.width, height: o.height, channels: 4 } }).png().toBuffer());
    }
  }
  const cell = Math.floor(Math.min(width, height) / 4);
  const k = cell / CELL;
  const inset = Math.round((effect.inset ?? 0) * k);
  const [cx, cy, cw, ch] = (effect.crop ?? [0, 0, CELL, CELL]).map((v) => Math.round(v * k));
  // Fenêtre gardée dans chaque case : le recadrage, moins le bord rogné.
  const left = Math.max(cx, inset);
  const top = Math.max(cy, inset);
  const w = Math.min(cx + cw, cell - inset) - left;
  const h = Math.min(cy + ch, cell - inset) - top;
  // Sortie à l'échelle de la case de référence (256 px) : les grandes images ne pèsent pas plus lourd en jeu.
  const outW = effect.prepared ? effect.size[0] : Math.round(w / k);
  const outH = effect.prepared ? effect.size[1] : Math.round(h / k);
  const frames = effect.prepared ? [] : (effect.frames ?? [...Array(16).keys()]);
  const buffers = effect.prepared ?? [];
  for (const index of frames) {
    const x = (index % 4) * cell + left;
    const y = Math.floor(index / 4) * cell + top;
    const { data, info } = await sharp(file)
      .extract({ left: x, top: y, width: w, height: h })
      .resize(outW, outH)
      .flop(Boolean(effect.flip))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    keyBlack(data, effect.gain ?? 1);
    buffers.push(await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer());
  }
  // Une bande, ou une grille si la bande dépasserait 4 096 px (comme tools/vfx.mjs).
  const cols = Math.min(buffers.length, Math.max(1, Math.floor(4096 / outW)));
  const rows = Math.ceil(buffers.length / cols);
  const at = (i) => ({ x: (i % cols) * outW, y: Math.floor(i / cols) * outH });
  await sharp({ create: { width: outW * cols, height: outH * rows, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(buffers.map((input, i) => ({ input, left: at(i).x, top: at(i).y })))
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(path.join(outDir, `${effect.name}.webp`));
  const sheet = {
    frames: buffers.map((_, i) => ({ filename: `${effect.tag} ${i}`, frame: { ...at(i), w: outW, h: outH }, duration: effect.duration })),
    meta: {
      app: 'tools/vfx-ia.mjs',
      image: `${effect.name}.webp`,
      size: { w: outW * cols, h: outH * rows },
      smooth: true,
      frameTags: [{ name: effect.tag, from: 0, to: buffers.length - 1, direction: 'forward', ...(effect.loop ? {} : { repeat: '1' }) }],
    },
  };
  await writeFile(path.join(outDir, `${effect.name}.json`), JSON.stringify(sheet, null, 1) + '\n');
  console.log(`${effect.name.padEnd(24)} ${buffers.length} images de ${outW}×${outH}`);
}
