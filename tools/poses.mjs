// Découpe des planches de poses clés (Nano Banana 2) en images séparées, prêtes pour Kling (voir coupe-poses.mjs).
//
// Usage : npm run poses -- <planche ou dossier>...
//         --grille 3x2    colonnes × lignes, si la détection automatique se trompe (figures qui se touchent)
//         --taille 1024   côté des images carrées
//         --sortie <dossier>   par défaut, le dossier poses/ à côté de la planche
//
// Sortie : poses/<planche>/pose-1.png, pose-2.png… dans l'ordre de lecture, et poses/<planche>/apercu.jpg avec
// les numéros. Une planche nommée *face-dos* sur deux lignes donne face-1…, dos-1… à la place.
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { cutPoses, poseNames, writeOverview } from './coupe-poses.mjs';

const args = process.argv.slice(2);
const option = (name) => {
  const at = args.indexOf(name);
  return at >= 0 ? args.splice(at, 2)[1] : undefined;
};
const grid = option('--grille');
const size = Number(option('--taille') ?? 1024);
const outRoot = option('--sortie');
if (args.length === 0) {
  console.error('Usage : npm run poses -- <planche ou dossier>... [--grille 3x2] [--taille 1024] [--sortie dossier]');
  process.exit(1);
}

for (const input of await sheets(args)) {
  const name = path.basename(input, path.extname(input));
  const outDir = path.join(outRoot ?? path.join(path.dirname(input), 'poses'), name);
  const { layout, scale, images } = await cutPoses(input, { grid, size });
  const names = poseNames(name, layout);
  await mkdir(outDir, { recursive: true });
  for (const [i, image] of images.entries()) await writeFile(path.join(outDir, `${names[i]}.png`), image);
  await writeOverview(images, names, layout, path.join(outDir, 'apercu.jpg'));
  console.log(`${path.basename(input)} : ${layout.join(' + ')} poses (${Math.round(scale * 100)} %) → ${outDir}`);
}

/** Les planches à traiter : les images données, et celles des dossiers donnés (sans descendre dans poses/). */
async function sheets(paths) {
  const found = [];
  for (const p of paths) {
    if ((await stat(p)).isDirectory()) {
      for (const entry of (await readdir(p)).sort()) if (/\.(jpe?g|png|webp)$/i.test(entry)) found.push(path.join(p, entry));
    } else {
      found.push(p);
    }
  }
  return found;
}
