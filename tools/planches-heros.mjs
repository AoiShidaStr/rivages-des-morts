// Entrées de `npm run planches` pour les héros, lues dans ~/Pictures/game visual/heros (voir `npm run kit-heros`) :
// une planche de jeu anim/heros-<race>-<classe> par héros qui a ses planches d'animation de profil
// (<race>-<classe>/profil/<animation>/planche.jpg), au moins la course.
//
// Chaque planche Nano Banana devient une posture du jeu. Le nombre d'images est lu sur la planche : Nano Banana
// n'en dessine pas toujours autant que demandé. Un options.json à côté d'une planche ajoute des réglages de
// tools/planches.json pour elle seule, par exemple { "eraseLines": { "length": 0.6 } } pour une grille dessinée.
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

function exists(file) {
  return access(file).then(() => true, () => false);
}
