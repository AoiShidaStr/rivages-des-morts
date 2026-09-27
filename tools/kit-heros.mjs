// Prépare, pour chaque héros (race × classe), un dossier avec tout ce qu'il faut pour générer ses animations :
// sa fiche et les prompts de ses planches de poses clés, puis, une fois les planches déposées, un dossier par
// animation avec les poses de début et de fin découpées et les deux prompts (planche complète par
// Nano Banana 2, ou vidéo par Kling / Dreamina / PixVerse).
//
// Usage : npm run kit-heros                    → les 20 héros, dans ~/Pictures/game visual/heros
//         npm run kit-heros -- demi-dieu-lame  → seulement ce héros
//
// Dans ~/Pictures/game visual/heros/<race>-<classe>/, l'outil écrit fiche.<ext>, prompt-profil.txt et
// prompt-face-dos.txt ; on y dépose :
//   profil.jpg     planche de poses clés de profil (Nano Banana 2)
//   face-dos.jpg   planche face (ligne du haut) et dos (ligne du bas)
//   poses.json     facultatif : poses de début et de fin quand la planche n'a pas les poses attendues,
//                  par exemple { "profil": { "garde": [1, 6], "esquive": [1, 8] } }
// L'outil écrit alors apercu-profil.jpg, apercu-face-dos.jpg et <vue>/<animation>/ : debut.png, fin.png,
// prompt-planche.txt, prompt-video.txt. Il ne touche pas aux planche.jpg et video.mp4 déposés à côté.
import { access, copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cutPoses, poseNames, writeOverview } from './coupe-poses.mjs';
import { CLASS_NAMES, DEFAULT_POSES, NEGATIVE_PROMPT, VIEWS, faceBackPrompt, profilePrompt, sheetPrompt, videoPrompt } from './prompts-heros.mjs';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { sourceDir } = JSON.parse(await readFile(path.join(projectDir, 'tools', 'sprites.json'), 'utf8'));
const root = path.join(sourceDir.replace(/^~(?=$|[\\/])/, os.homedir()), 'heros');
const only = process.argv.slice(2);
const RACES = ['einherjar', 'oushebti', 'demi-dieu', 'hanyo'];

await mkdir(root, { recursive: true });
await writeFile(path.join(root, 'prompt-negatif.txt'), `${NEGATIVE_PROMPT}\n`);
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
    await writeFile(path.join(dir, 'prompt-face-dos.txt'), `${faceBackPrompt(cls)}\n`);
    const overrides = JSON.parse((await read(path.join(dir, 'poses.json'))) ?? '{}');

    const profil = await sheet(dir, 'profil');
    if (profil) {
      const { layout, images } = await cutPoses(profil);
      await writeOverview(images, poseNames('profil', layout), layout, path.join(dir, 'apercu-profil.jpg'));
      await writeView(dir, cls, 'profil', images, overrides.profil);
      console.log(`${hero} profil : ${layout.join(' + ')} poses`);
    }
    const faceDos = await sheet(dir, 'face-dos');
    if (faceDos) {
      const { layout, images } = await cutPoses(faceDos);
      await writeOverview(images, poseNames('face-dos', layout), layout, path.join(dir, 'apercu-face-dos.jpg'));
      if (layout.length !== 2) {
        console.warn(`${hero} face-dos : ${layout.join(' + ')} poses, attendu deux lignes (face en haut, dos en bas)`);
      } else {
        await writeView(dir, cls, 'face', images.slice(0, layout[0]), overrides.face);
        await writeView(dir, cls, 'dos', images.slice(layout[0]), overrides.dos);
        console.log(`${hero} face-dos : ${layout.join(' + ')} poses`);
      }
    }
    if (!profil && !faceDos) waiting.push(hero);
  }
}
if (waiting.length > 0) console.log(`En attente de planches (profil.jpg, face-dos.jpg) : ${waiting.join(', ')}`);

/** Écrit le dossier de chaque animation d'une vue : poses de début et de fin, prompts. */
async function writeView(dir, cls, view, images, overrides = {}) {
  for (const anim of VIEWS[view].animations) {
    if (overrides[anim] === null) continue;
    const [start, end] = overrides[anim] ?? DEFAULT_POSES[view][anim];
    if (!images[start - 1] || !images[end - 1]) {
      console.warn(`${path.basename(dir)} ${view} ${anim} : pose ${images[start - 1] ? end : start} absente de la planche (${images.length} poses), voir poses.json`);
      continue;
    }
    const out = path.join(dir, view, anim);
    await mkdir(out, { recursive: true });
    await writeFile(path.join(out, 'debut.png'), images[start - 1]);
    await writeFile(path.join(out, 'fin.png'), images[end - 1]);
    await writeFile(path.join(out, 'prompt-planche.txt'), `${sheetPrompt(cls, view, anim)}\n`);
    await writeFile(path.join(out, 'prompt-video.txt'), `${videoPrompt(cls, anim)}\n`);
  }
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
  return `Animations des héros : un dossier par héros, un dossier par animation.

heros/
  prompt-negatif.txt          le prompt négatif des vidéos (champ « Negative prompt »)
  <race>-<classe>/            par exemple demi-dieu-invocateur
    fiche.jpg                 l'image du héros, à joindre aux deux prompts suivants
    prompt-profil.txt         étape 1, Nano Banana 2 : la planche de poses clés de profil
    prompt-face-dos.txt       étape 1, Nano Banana 2 : la planche face (en haut) et dos (en bas)
    profil.jpg                à déposer : le résultat de prompt-profil.txt
    face-dos.jpg              à déposer : le résultat de prompt-face-dos.txt
    poses.json                facultatif : autres numéros de poses, voir plus bas
    apercu-profil.jpg         les poses découpées, numérotées
    apercu-face-dos.jpg
    profil/  attente, course, attaque, garde, esquive
    face/    attente, course, attaque
    dos/     attente, course, attaque
      <animation>/            étape 2
        debut.png             pose de départ
        fin.png               pose d'arrivée (la même que debut.png pour attente et course, qui bouclent)
        prompt-planche.txt    option 1, Nano Banana 2 : joindre debut.png, coller le prompt
        prompt-video.txt      option 2, Kling / Dreamina / PixVerse : image de début = debut.png,
                              image de fin = fin.png, coller le prompt et prompt-negatif.txt, 5 secondes
        planche.jpg           à déposer : le résultat de l'option 1
        video.mp4             à déposer : le résultat de l'option 2

Après avoir déposé profil.jpg ou face-dos.jpg : npm run kit-heros (ou npm run kit-heros -- <race>-<classe>).
Les planches et vidéos déposées ne sont jamais écrasées.

L'Einherjar guerrier a déjà ses animations de profil dans le jeu : pour lui, seulement face-dos.jpg.

poses.json : quand Nano Banana a dessiné plus ou moins de poses que demandé, dire lesquelles prendre
(numéros de apercu-*.jpg ; pour le dos, 1 à 4 = poses de la ligne du bas ; null = pas d'animation). Par défaut :
  profil : attente [1, 1], course [2, 2], attaque [1, 4], garde [1, 5], esquive [1, 6]
  face et dos : attente [1, 1], course [2, 2], attaque [1, 4]
Exemple : { "profil": { "garde": [1, 6], "esquive": [1, 8] } }
`;
}
