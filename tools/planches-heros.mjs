// Entrées de `npm run planches` pour les héros, lues dans ~/Pictures/game visual/heros :
// une planche de jeu anim/heros-<race>-<classe> par héros qui a ses planches d'animation de profil
// (<race>-<classe>/profil/<animation>/planche.jpg), au moins la course.
//
// Chaque planche Nano Banana devient une posture du jeu. Le nombre d'images est lu sur la planche : Nano Banana
// n'en dessine pas toujours autant que demandé. Un options.json à côté d'une planche ajoute des réglages de
// tools/planches.json pour elle seule, par exemple { "eraseLines": { "length": 0.6 } } pour une grille dessinée.
// Les héros en pixel art (direction artistique depuis le 18 octobre 2026) sont lus à part, dans
// ~/Pictures/gamevisual/pixel-art/accueil/heros : une planche <race>-<classe>.png de 4 lignes × 8 images (voir `pixelHeroPlanches`).
import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

/** Posture(s) du jeu tirées de chaque animation, avec la durée de chaque image (ms). */
const ANIMATIONS = {
  attente: [{ tag: 'idle', duration: 140 }],
  course: [{ tag: 'move', duration: 80 }],
  // L'attaque dessine l'élan puis le coup : la première moitié des images, puis la seconde, à la même échelle.
  attaque: [
    { tag: 'windup', part: 'first', ref: 0, duration: 80, once: true },
    { tag: 'strike', part: 'second', ref: 0, duration: 60, once: true },
  ],
  garde: [{ tag: 'guard', ref: 0, duration: 70, once: true }],
  esquive: [{ tag: 'dash', duration: 40, once: true }],
};

/** Taille du corps en pixels dans la planche de jeu, comme le héros d'origine. */
const BODY_HEIGHT = 256;

export async function heroPlanches(sourceDir) {
  const root = path.join(sourceDir, 'heros');
  const heroes = await readdir(root, { withFileTypes: true }).catch(() => []);
  const planches = [];
  for (const entry of heroes) {
    if (!entry.isDirectory()) continue;
    const hero = entry.name;
    const sheet = async (anim) => {
      for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
        const file = path.join('heros', hero, 'profil', anim, `planche.${ext}`);
        if (await exists(path.join(sourceDir, file))) return file;
      }
      return null;
    };
    const sources = Object.fromEntries(await Promise.all(Object.keys(ANIMATIONS).map(async (anim) => [anim, await sheet(anim)])));
    if (!sources.course) continue;

    const animations = [];
    for (const [anim, source] of Object.entries(sources)) {
      if (!source) continue;
      const options = JSON.parse((await readFile(path.join(sourceDir, path.dirname(source), 'options.json'), 'utf8').catch(() => null)) ?? '{}');
      for (const a of ANIMATIONS[anim]) animations.push({ source, ...options, ...a });
    }
    // Sans attente, le héros se tient immobile : pose de repos de la planche de poses clés, sinon première image de l'attaque.
    if (!sources.attente) {
      const keyPoses = path.join('heros', hero, 'profil.jpg');
      if (await exists(path.join(sourceDir, keyPoses))) animations.unshift({ tag: 'idle', source: keyPoses, frames: [0], duration: 1000 });
      else if (sources.attaque) animations.unshift({ tag: 'idle', source: sources.attaque, frames: [0], duration: 1000 });
    }
    // fillHoles : vide le fond enfermé entre l'arc et sa corde, sous un bras, dans une boucle de cordon.
    planches.push({ name: `heros-${hero}`, bodyHeight: BODY_HEIGHT, fillHoles: true, minHole: 150, animations });
  }
  return planches;
}

/** Classe du jeu d'après le nom du fichier : les héroïnes demi-déesses gardent leur nom au féminin. */
const CLASS_OF = { rodeuse: 'rodeur', sorciere: 'sorcier' };
const RACES = ['demi-dieu', 'einherjar', 'hanyo', 'oushebti'];
/** Hauteur du héros debout, en pixels du jeu, quand la planche générée est plus grande. */
const PIXEL_HEIGHT = 128;

/**
 * Planches pixel art des héros : une image par héros, 4 lignes de 8 images (déplacement, attaque, attaque
 * spéciale, mort). L'attente est la première image du déplacement ; l'attaque spéciale sert aux compétences
 * et à l'ultime. Les autres postures retombent sur les plus proches dans le jeu (FALLBACK_POSE).
 * Les planches de référence (`-reference`) sont ignorées. Un <race>-<classe>.options.json à côté ajoute des réglages
 * de tools/planches.json pour cette planche seule, par exemple { "eraseLines": { "length": 0.6 } } pour une grille dessinée.
 */
export async function pixelHeroPlanches(sourceDir) {
  const dir = path.join('..', 'gamevisual', 'pixel-art', 'accueil', 'heros');
  const files = await readdir(path.join(sourceDir, dir)).catch(() => []);
  const planches = [];
  for (const file of files) {
    const match = /^(.+)-([a-z]+)\.(png|jpe?g|webp)$/.exec(file);
    if (!match || !RACES.includes(match[1])) continue;
    const classe = CLASS_OF[match[2]] ?? match[2];
    const options = JSON.parse((await readFile(path.join(sourceDir, dir, `${match[1]}-${match[2]}.options.json`), 'utf8').catch(() => null)) ?? '{}');
    planches.push({
      name: `heros-${match[1]}-${classe}`,
      source: path.join(dir, file),
      layout: [8, 8, 8, 8],
      pixel: true,
      pixelHeight: PIXEL_HEIGHT,
      // Fond enfermé entre une arme et le corps, et liseré de la couleur du fond.
      fillHoles: true,
      minHole: 10,
      despill: true,
      rows: [
        { tag: 'idle', row: 0, frames: [0], duration: 1000 },
        { tag: 'move', row: 0, duration: 80 },
        { tag: 'windup', row: 1, frames: [0, 1, 2], duration: 80, once: true },
        { tag: 'strike', row: 1, frames: [3, 4, 5, 6, 7], duration: 60, once: true },
        { tag: 'skill', row: 2, duration: 70, once: true },
        { tag: 'ultimate', row: 2, duration: 90, once: true },
        { tag: 'death', row: 3, duration: 110, once: true },
      ],
      ...options,
    });
  }
  return planches;
}

function exists(file) {
  return access(file).then(() => true, () => false);
}
