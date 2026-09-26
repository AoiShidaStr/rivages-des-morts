// Génère les planches de sprites en pixel art des personnages, avec leurs animations.
//
// Usage : npm run pixel            → tous les personnages
//         npm run pixel -- heros   → seulement « heros »
//
// Chaque personnage est un petit pantin : des pièces dessinées pixel par pixel (tête, torse, cape…)
// et des membres tracés entre des articulations. Une animation est une liste de poses, c'est-à-dire
// la position des hanches, genoux, pieds, coudes, mains et l'angle de l'arme à chaque image.
// Ajouter une animation revient à ajouter une liste de poses dans tools/pixel/<personnage>.mjs.
//
// Sortie : public/sprites/pixel/<nom>.png et <nom>.json, au format « Array » qu'exporte Aseprite.
// On peut donc aussi dessiner une planche à la main dans Aseprite ou LibreSprite et l'exporter
// au même endroit : le jeu la lit de la même façon (les tags portent le nom des postures du jeu).
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { Canvas } from './pixel/canvas.mjs';
import araignee from './pixel/araignee.mjs';
import heros, { hero, KIT_IDS, RACE_IDS } from './pixel/heros.mjs';
import hitodama from './pixel/hitodama.mjs';
import ikazuchi from './pixel/ikazuchi.mjs';
import ikusa from './pixel/ikusa.mjs';
import { revealed as izanamiRevelee, veiled as izanami } from './pixel/izanami.mjs';
import { human as jorogumo, spider as jorogumoAraignee } from './pixel/jorogumo.mjs';
import kappa from './pixel/kappa.mjs';
import kasaObake from './pixel/kasa-obake.mjs';
import kodama from './pixel/kodama.mjs';
import oublie from './pixel/oublie.mjs';
import shikome from './pixel/shikome.mjs';

// Les clés sont les noms des sprites du jeu (src/data/sprites.json). Le héros existe pour chaque race et
// chaque classe : heros-<race>-<classe> (src/render/heroes.ts) ; l'Einherjar guerrier, lui, est `heros`.
const heroes = Object.fromEntries(
  RACE_IDS.flatMap((race) => KIT_IDS.map((kit) => [`heros-${race}-${kit}`, hero(race, kit)])).filter(([name]) => name !== 'heros-einherjar-guerrier'),
);
const characters = {
  heros,
  ...heroes,
  oublie,
  hitodama,
  kodama,
  kappa: kappa(),
  kappaRenforce: kappa(true),
  kasaObake,
  araignee,
  jorogumo,
  jorogumoAraignee,
  shikome,
  ikazuchi,
  ikusa,
  izanami,
  izanamiRevelee,
};
const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(projectDir, 'public', 'sprites', 'pixel');
const only = process.argv.slice(2);

await mkdir(outDir, { recursive: true });
for (const [name, character] of Object.entries(characters)) {
  if (only.length > 0 && !only.includes(name)) continue;
  const { png, json, count } = await buildSheet(name, character);
  await writeFile(path.join(outDir, `${name}.png`), png);
  await writeFile(path.join(outDir, `${name}.json`), `${JSON.stringify(json, null, 2)}\n`);
  console.log(`${name.padEnd(24)} ${count} images → public/sprites/pixel/${name}.png`);
}

/** Dessine toutes les poses de toutes les animations sur une seule ligne d'images. */
async function buildSheet(name, character) {
  const { width, height, animations } = character;
  const frames = [];
  const tags = [];
  for (const [tag, anim] of Object.entries(animations)) {
    const from = frames.length;
    anim.poses.forEach((pose, i) => {
      const canvas = new Canvas(width, height);
      character.draw(canvas, pose, i);
      canvas.outline(character.outline);
      frames.push({ canvas, duration: pose.duration ?? anim.duration });
    });
    tags.push({ name: tag, from, to: frames.length - 1, direction: 'forward', ...(anim.once ? { repeat: '1' } : {}) });
  }

  const sheet = new Canvas(width * frames.length, height);
  frames.forEach((f, i) => sheet.blit(f.canvas, i * width, 0));
  const png = await sharp(sheet.data, { raw: { width: sheet.width, height: sheet.height, channels: 4 } }).png().toBuffer();
  const json = {
    frames: frames.map((f, i) => ({
      filename: `${name} ${i}`,
      frame: { x: i * width, y: 0, w: width, h: height },
      duration: Math.round(f.duration * 1000),
    })),
    meta: {
      app: 'tools/pixel.mjs',
      image: `${name}.png`,
      size: { w: sheet.width, h: sheet.height },
      frameTags: tags,
    },
  };
  return { png, json, count: frames.length };
}
