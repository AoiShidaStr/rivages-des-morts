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
import { drawSheet } from './pixel/sheet.mjs';
import araignee from './pixel/araignee.mjs';
import heros from './pixel/heros.mjs';
import hitodama from './pixel/hitodama.mjs';
import ikazuchi from './pixel/ikazuchi.mjs';
import ikusa from './pixel/ikusa.mjs';
import { revealed as izanamiRevelee, veiled as izanami } from './pixel/izanami.mjs';
import { human as jorogumo, spider as jorogumoAraignee } from './pixel/jorogumo.mjs';
import kappa from './pixel/kappa.mjs';
import kasaObake from './pixel/kasa-obake.mjs';
import kodama from './pixel/kodama.mjs';
import oublie from './pixel/oublie.mjs';
import * as decors from './pixel/decors.mjs';
import * as pnj from './pixel/pnj.mjs';
import { islandGround, paddyGround } from './pixel/sols.mjs';
import { Canvas } from './pixel/canvas.mjs';
import { ICONS, OUTLINE as ICON_OUTLINE, SIZE as ICON_SIZE } from './pixel/objets.mjs';
import { readFile } from 'node:fs/promises';
import shikome from './pixel/shikome.mjs';

// Les clés sont les noms des sprites du jeu (src/data/sprites.json). Le héros, lui, est dessiné dans le jeu
// d'après sa race, sa classe et son équipement (src/render/pixelHero.ts) : `heros` n'est que la planche de
// référence de l'Einherjar guerrier, à ouvrir dans Aseprite.
const characters = {
  heros,
  oublie,
  hitodama,
  kodama,
  kappa: kappa(),
  kappaRenforce: kappa(true),
  kasaObake,
  araignee,
  jorogumo,
  jorogumoAraignee,
  // PNJ de l'île (tools/pixel/pnj.mjs) : leur portrait de dialogue est tiré de la première image.
  charon: pnj.charon,
  'obaa-kiku': pnj.obaaKiku,
  tetsu: pnj.tetsu,
  yuki: pnj.yuki,
  tanuki: pnj.tanuki,
  moine: pnj.moine,
  // Décors de l'île et du donjon (tools/pixel/decors.mjs).
  souche: decors.souche,
  jizo: decors.jizo,
  torii: decors.torii,
  'maison-the': decors.maisonThe,
  forge: decors.forge,
  arbre: decors.arbre,
  portail: decors.portail,
  cascade: decors.cascade,
  ema: decors.ema,
  coffre: decors.coffre,
  lanterne: decors.lanterne,
  'lanterne-allumee': decors.lanterneAllumee,
  sutra: decors.sutra,
  argile: decors.argile,
  barque: decors.barque,
  rocher: decors.rocher,
  pecher: decors.pecher,
  'pecher-nu': decors.pecherNu,
  shikome,
  ikazuchi,
  ikusa,
  izanami,
  izanamiRevelee,
};
/** Agrandissement des portraits de dialogue (sans lissage). */
const PORTRAIT_SCALE = 6;
/** Cadrage du portrait (x, y, côté) des yokai qui parlent sur l'île ; les PNJ portent le leur. */
const PORTRAITS = { kappa: [16, 6, 22], oublie: [3, 7, 18] };
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
  const portrait = character.portrait ?? PORTRAITS[name];
  if (portrait) await buildPortrait(name, { ...character, portrait }, png);
}

/** Portrait de dialogue : le haut de la première image, agrandi sans lissage (public/sprites/pixel/portraits). */
async function buildPortrait(name, character, png) {
  const [x, y, side] = character.portrait;
  // Le cadrage est donné pour le personnage tourné vers la droite : on le retourne avec lui.
  const left = character.mirror ? character.width - x - side : x;
  const dir = path.join(outDir, 'portraits');
  await mkdir(dir, { recursive: true });
  await sharp(png)
    .extract({ left, top: y, width: side, height: side })
    .resize(side * PORTRAIT_SCALE, side * PORTRAIT_SCALE, { kernel: 'nearest' })
    .png()
    .toFile(path.join(dir, `${name}.png`));
}

// Sols vus de dessus (tools/pixel/sols.mjs), à la même échelle : l'île d'après src/data/island.json, les
// rizières de l'arène d'après src/data/dungeon.json. Tailles du monde : WORLD_SIZE (islandRenderer.ts) et
// GROUND_SIZE, PADDY_SIZE (renderer.ts) ; PPU : src/style.ts.
const PPU = 18;
if (only.length === 0 || only.includes('sols')) {
  const dataDir = path.join(projectDir, 'src', 'data');
  const island = JSON.parse(await readFile(path.join(dataDir, 'island.json'), 'utf8'));
  const dungeon = JSON.parse(await readFile(path.join(dataDir, 'dungeon.json'), 'utf8'));
  // Mêmes axes que src/game/island.ts : FORWARD = (1, 1) normalisé, RIGHT = (FORWARD.z, −FORWARD.x).
  const k = Math.SQRT1_2;
  const toScreen = (p) => ({ u: p.x * k - p.z * k, v: p.x * k + p.z * k });
  const solsDir = path.join(outDir, 'sols');
  await mkdir(solsDir, { recursive: true });
  for (const [name, ground] of [
    ['ile', () => islandGround(island, 84, PPU, toScreen)],
    ['rizieres', () => paddyGround(44, dungeon.arenaHalfSize, 3, PPU)],
  ]) {
    const c = ground();
    await sharp(c.data, { raw: { width: c.width, height: c.height, channels: 4 } }).png({ compressionLevel: 9 }).toFile(path.join(solsDir, `${name}.png`));
    console.log(`${`sol ${name}`.padEnd(24)} ${c.width} × ${c.height} → public/sprites/pixel/sols/${name}.png`);
  }
}

// Icônes de tous les objets et matériaux (tools/pixel/objets.mjs), à leur taille native : l'interface les
// agrandit sans lissage en style pixel (src/ui/dom.ts).
if (only.length === 0 || only.includes('icones')) {
  const items = JSON.parse(await readFile(path.join(projectDir, 'src', 'data', 'items.json'), 'utf8'));
  const iconsDir = path.join(outDir, 'icones');
  await mkdir(iconsDir, { recursive: true });
  const ids = [...Object.keys(items.items), ...Object.keys(items.materials)].filter((id) => ICONS[id]);
  for (const id of ids) {
    const c = new Canvas(ICON_SIZE, ICON_SIZE);
    ICONS[id](c);
    c.outline(ICON_OUTLINE);
    await sharp(c.data, { raw: { width: ICON_SIZE, height: ICON_SIZE, channels: 4 } }).png({ compressionLevel: 9 }).toFile(path.join(iconsDir, `${id}.png`));
  }
  console.log(`${'icônes'.padEnd(24)} ${ids.length} → public/sprites/pixel/icones/`);
}

/** Planche du personnage, enregistrée en PNG. */
async function buildSheet(name, character) {
  const { sheet, json, count } = drawSheet(name, character);
  const png = await sharp(sheet.data, { raw: { width: sheet.width, height: sheet.height, channels: 4 } }).png().toBuffer();
  return { png, json, count };
}
