// Outils communs aux images en pixel art (direction artistique depuis le 18 octobre 2026, version 0.21) :
//   - `pixelize` : ramène une image détourée à sa grille de pixels (réduction, opacité tout ou rien, palette réduite) ;
//   - `markPixelArt` : inscrit les images dans src/data/pixelArt.json, la liste que le jeu lit pour les afficher
//     sans lissage (pixels nets). Les images peintes qui restent gardent le lissage.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const registry = path.join(projectDir, 'src', 'data', 'pixelArt.json');

/**
 * Image RGBA brute → image sharp en pixel art : réduite de `scale` (le générateur dessine chaque pixel sur 2 à 3 pixels
 * de l'image), l'opacité devient tout ou rien et la palette est réduite à `colours` couleurs, sans tramage.
 */
export async function pixelize(rgba, width, height, { scale = 0.5, colours = 48 } = {}) {
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const data = await sharp(rgba, { raw: { width, height, channels: 4 } })
    .resize(w, h, { kernel: 'linear' })
    .raw()
    .toBuffer();
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] >= 128) data[i] = 255;
    else data[i] = data[i - 1] = data[i - 2] = data[i - 3] = 0;
  }
  const png = await sharp(data, { raw: { width: w, height: h, channels: 4 } }).png({ palette: true, colours, dither: 0 }).toBuffer();
  return sharp(png);
}

/** Inscrit des images (chemins depuis public/sprites) dans la liste des images en pixel art du jeu. */
export async function markPixelArt(files) {
  const list = new Set(JSON.parse(await readFile(registry, 'utf8').catch(() => '[]')));
  for (const file of files) list.add(file.split(path.sep).join('/'));
  await writeFile(registry, `${JSON.stringify([...list].sort(), null, 1)}\n`);
}
