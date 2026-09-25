// Détoure les images générées par Nano Banana (fond gris presque uni) et les enregistre
// en PNG transparents dans public/sprites, recadrées au plus près du sujet.
//
// Usage : npm run sprites            → toutes les entrées de tools/sprites.json
//         npm run sprites -- kappa   → seulement « kappa »
//
// Limite : un sujet gris peu saturé (l'Oublié, par exemple) se confond avec le fond.
// Pour ceux-là, détourer à la main (Paint : « Supprimer l'arrière-plan ») et déposer le PNG dans public/sprites.
import { access, mkdir, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { alphaMask, boundingBox } from './decoupe.mjs';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await readFile(path.join(projectDir, 'tools', 'sprites.json'), 'utf8'));
const sourceDir = config.sourceDir.replace(/^~(?=$|[\\/])/, os.homedir());
const outDir = path.join(projectDir, config.outDir);
const only = process.argv.slice(2);

await mkdir(outDir, { recursive: true });
for (const sprite of config.sprites) {
  if (only.length > 0 && !only.includes(sprite.name)) continue;
  const input = path.join(sourceDir, sprite.source);
  const output = path.join(outDir, `${sprite.name}.png`);
  // Une image pas encore générée ne bloque pas les autres : le jeu garde son dessin provisoire.
  if (!(await access(input).then(() => true, () => false))) {
    console.warn(`${sprite.name.padEnd(10)} ${sprite.source} introuvable, ignoré`);
    continue;
  }
  await mkdir(path.dirname(output), { recursive: true });
  const { width, height } = await cutOut(input, output, { ...config.defaults, ...sprite });
  console.log(`${sprite.name.padEnd(10)} ${sprite.source} → ${path.relative(projectDir, output)} (${width}×${height})`);
}

async function cutOut(input, output, options) {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const alpha = alphaMask(data, w, h, options);
  // `lumaKey: [sombre, clair]` : seuls les traits clairs restent opaques (fils d'une toile peints sur un voile sombre).
  if (options.lumaKey) {
    const [dark, light] = options.lumaKey;
    for (let i = 0; i < w * h; i++) {
      const luma = 0.299 * data[i * 3] + 0.587 * data[i * 3 + 1] + 0.114 * data[i * 3 + 2];
      const keep = Math.min(1, Math.max(0, (luma - dark) / (light - dark)));
      alpha[i] = Math.round(alpha[i] * keep);
    }
  }

  const box = boundingBox(alpha, w, h, options.padding);
  if (!box) throw new Error(`${input} : aucun sujet trouvé, le fond n'a pas été reconnu`);

  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    rgba[i * 4] = data[i * 3];
    rgba[i * 4 + 1] = data[i * 3 + 1];
    rgba[i * 4 + 2] = data[i * 3 + 2];
    rgba[i * 4 + 3] = alpha[i];
  }
  // `square` : image posée à plat sur un carré (la toile au sol), on complète le cadre en carré transparent.
  const side = Math.max(box.width, box.height);
  const extend = options.square
    ? {
        left: Math.floor((side - box.width) / 2),
        right: Math.ceil((side - box.width) / 2),
        top: Math.floor((side - box.height) / 2),
        bottom: Math.ceil((side - box.height) / 2),
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      }
    : { left: 0, right: 0, top: 0, bottom: 0 };
  const cropped = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).extract(box).extend(extend).png().toBuffer();
  return sharp(cropped)
    .resize({ width: options.maxSize, height: options.maxSize, fit: 'inside', withoutEnlargement: true })
    .png()
    .toFile(output);
}
