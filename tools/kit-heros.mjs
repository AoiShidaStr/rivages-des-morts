// Prépare, pour chaque héros (race × classe), un dossier avec tout ce qu'il faut pour faire dessiner ses
// animations par Nano Banana 2 (Gemini) : sa fiche et les prompts de ses planches de poses clés, puis, une fois
// ces planches déposées, un dossier par animation avec la pose à joindre et le prompt de la planche complète.
//
// Usage : npm run kit-heros                    → les 20 héros, dans ~/Pictures/game visual/heros
//         npm run kit-heros -- demi-dieu-lame  → seulement ce héros
//
// Dans ~/Pictures/game visual/heros/<race>-<classe>/, l'outil écrit fiche.<ext>, prompt-profil.txt et
// prompt-face.txt ; on y dépose :
//   profil.jpg     planche de poses clés de profil
//   face.jpg       planche de poses clés de face (une ancienne face-dos.jpg sert aussi : sa ligne du haut)
//   poses.json     facultatif : quelle pose joindre quand la planche n'a pas les poses attendues,
//                  par exemple { "profil": { "course": 3 } }
// L'outil écrit alors apercu-profil.jpg, apercu-face.jpg et <vue>/<animation>/pose.png + prompt.txt.
// Il ne touche pas aux planche.jpg déposées à côté.
import { access, copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cutPoses, poseNames, writeOverview } from './coupe-poses.mjs';
import { CLASS_NAMES, DEFAULT_POSES, VIEWS, animationPrompt, facePrompt, profilePrompt } from './prompts-heros.mjs';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { sourceDir } = JSON.parse(await readFile(path.join(projectDir, 'tools', 'sprites.json'), 'utf8'));
const root = path.join(sourceDir.replace(/^~(?=$|[\\/])/, os.homedir()), 'heros');
const only = process.argv.slice(2);
const RACES = ['einherjar', 'oushebti', 'demi-dieu', 'hanyo'];

await mkdir(root, { recursive: true });
await writeFile(path.join(root, 'LISEZMOI.txt'), readme());

const waiting = [];
for (const race of RACES) {
  for (const cls of CLASS_NAMES) {
    const hero = `${race}-${cls}`;
    if (only.length > 0 && !only.includes(hero)) continue;
    const dir = path.join(root, hero);
    await mkdir(dir, { recursive: true });
    const fiche = await ficheOf(race, cls);
    const ficheCopy = path.join(dir, `fiche${path.extname(fiche)}`);
    if (!(await exists(ficheCopy))) await copyFile(fiche, ficheCopy);
    await writeFile(path.join(dir, 'prompt-profil.txt'), `${profilePrompt(cls)}\n`);
    await writeFile(path.join(dir, 'prompt-face.txt'), `${facePrompt(cls)}\n`);
    const overrides = JSON.parse((await read(path.join(dir, 'poses.json'))) ?? '{}');

    const profil = await sheet(dir, 'profil');
    if (profil) {
      const { layout, images } = await cutPoses(profil);
      await writeOverview(images, poseNames('profil', layout), layout, path.join(dir, 'apercu-profil.jpg'));
      await writeView(dir, cls, 'profil', images, overrides.profil);
      console.log(`${hero} profil : ${layout.join(' + ')} poses`);
    }
    const face = await faceSheet(dir);
    if (face) {
      const { layout, images } = face;
      await writeOverview(images, poseNames('face', layout), layout, path.join(dir, 'apercu-face.jpg'));
      await writeView(dir, cls, 'face', images, overrides.face);
      console.log(`${hero} face : ${layout.join(' + ')} poses`);
    }
    if (!profil && !face) waiting.push(hero);
  }
}
if (waiting.length > 0) console.log(`En attente de planches de poses clés (profil.jpg, face.jpg) : ${waiting.join(', ')}`);

/** Écrit le dossier de chaque animation d'une vue : la pose à joindre et le prompt. */
async function writeView(dir, cls, view, images, overrides = {}) {
  for (const anim of VIEWS[view].animations) {
    if (overrides[anim] === null) continue;
    const pose = overrides[anim] ?? DEFAULT_POSES[view][anim];
    if (!images[pose - 1]) {
      console.warn(`${path.basename(dir)} ${view} ${anim} : pose ${pose} absente de la planche (${images.length} poses), voir poses.json`);
      continue;
    }
    const out = path.join(dir, view, anim);
    await mkdir(out, { recursive: true });
    await writeFile(path.join(out, 'pose.png'), images[pose - 1]);
    await writeFile(path.join(out, 'prompt.txt'), `${animationPrompt(cls, view, anim)}\n`);
  }
}

/** Poses de face : face.jpg, sinon la ligne du haut d'une ancienne planche face-dos.jpg. */
async function faceSheet(dir) {
  const face = await sheet(dir, 'face');
  if (face) return cutPoses(face);
  const faceDos = await sheet(dir, 'face-dos');
  if (!faceDos) return null;
  const { layout, images } = await cutPoses(faceDos);
  return { layout: [layout[0]], images: images.slice(0, layout[0]) };
}

/** La fiche du héros : l'image qui fixe son apparence, jointe aux prompts des planches de poses clés. */
async function ficheOf(race, cls) {
  if (race === 'einherjar' && cls === 'guerrier') return path.join(projectDir, 'public', 'sprites', 'heros.png');
  const key = race.replace('-', '');
  const prefix = race === 'einherjar' ? `heros_${cls}_` : cls === 'guerrier' ? `race_${key}_` : `${key}_${cls}_`;
  const images = path.join(projectDir, 'src', 'assets', 'images');
  const file = (await readdir(images)).find((f) => f.startsWith(prefix));
  if (!file) throw new Error(`fiche de ${race}-${cls} introuvable (src/assets/images/${prefix}….jpg)`);
  return path.join(images, file);
}

async function sheet(dir, name) {
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    const file = path.join(dir, `${name}.${ext}`);
    if (await exists(file)) return file;
  }
  return null;
}

function exists(file) {
  return access(file).then(() => true, () => false);
}

async function read(file) {
  return readFile(file, 'utf8').catch(() => null);
}

function readme() {
  return `Animations des héros, dessinées par Nano Banana 2 (Gemini) : un dossier par héros, un dossier par animation.

heros/
  <race>-<classe>/            par exemple demi-dieu-invocateur
    fiche.jpg                 l'image du héros, à joindre aux deux prompts suivants
    prompt-profil.txt         étape 1 : planche de 6 poses clés de profil
    prompt-face.txt           étape 1 : planche de 4 poses clés de face
    profil.jpg                à déposer : le résultat de prompt-profil.txt
    face.jpg                  à déposer : le résultat de prompt-face.txt
    poses.json                facultatif : quelle pose joindre, voir plus bas
    apercu-profil.jpg         les poses découpées, numérotées
    apercu-face.jpg
    profil/  attente, course, attaque, garde, esquive
    face/    attente, course, attaque
      <animation>/            étape 2
        pose.png              la pose à joindre
        prompt.txt            le prompt à coller
        planche.jpg           à déposer : le résultat

Étape 1 : dans Gemini, joindre fiche.jpg et coller prompt-profil.txt, enregistrer sous profil.jpg ;
même chose avec prompt-face.txt pour face.jpg. Puis lancer npm run kit-heros (ou npm run kit-heros -- <race>-<classe>).
Étape 2 : dans chaque dossier d'animation, joindre pose.png et coller prompt.txt, enregistrer sous planche.jpg.
Les planches déposées ne sont jamais écrasées.

L'Einherjar guerrier a déjà ses animations de profil dans le jeu : pour lui, seulement face.jpg.

poses.json : quand Nano Banana a dessiné les poses dans un autre ordre, dire laquelle joindre pour chaque animation
(numéros de apercu-*.jpg ; null = pas d'animation). Par défaut : attente 1, course 2, attaque 1, garde 1, esquive 1.
Exemple : { "profil": { "course": 3 } }
`;
}
