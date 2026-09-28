// Prompts Nano Banana 2 des héros, écrits par `npm run kit-heros` :
//   - prompt-profil.txt, prompt-face.txt : planches de poses clés (image jointe : la fiche du héros) ;
//   - <vue>/<animation>/prompt.txt : toute l'animation en une planche (image jointe : pose.png, découpée
//     dans la planche de poses clés).
// Les prompts ne nomment pas l'arme exacte : l'image jointe la montre, le même prompt sert aux quatre races.

/** Vues du héros, et animations faites dans chacune. */
export const VIEWS = {
  profil: { facing: 'in three-quarter view facing right', animations: ['attente', 'course', 'attaque', 'garde', 'esquive'] },
  face: { facing: 'in three-quarter front view, facing the viewer and the bottom-right corner of the image', animations: ['attente', 'course', 'attaque'] },
};

/** Pose jointe au prompt de chaque animation, par son numéro dans la planche de poses clés de la vue. */
export const DEFAULT_POSES = {
  profil: { attente: 1, course: 2, attaque: 1, garde: 1, esquive: 1 },
  face: { attente: 1, course: 2, attaque: 1 },
};

/** Gestes propres à chaque classe. */
const CLASSES = {
  guerrier: {
    gear: 'weapon',
    poses: [
      'idle: calm guard stance, weapon held low in both hands.',
      'running: mid-stride, leaning forward, weapon held low at the side.',
      'wind-up: weapon raised high above the head, body coiled.',
      'strike: the end of a wide horizontal slash, weapon fully extended forward, front knee bent.',
      'guard: weapon held upright in front of the body, braced, feet planted.',
      'dash: a low fast lunge forward, body almost horizontal, weapon trailing behind.',
    ],
    windup: 'the weapon rises from the guard stance to high above the head, the body coiling',
    strike: 'the weapon slashes down and across in a wide arc, ending extended forward, front knee bent',
    guard: 'brings the weapon upright in front of the body into a braced guard, feet planted',
    dodge: 'makes a low fast lunge forward, the body almost horizontal and the weapon trailing behind, then lands',
  },
  invocateur: {
    gear: 'staff',
    poses: [
      'idle: standing calmly, staff held upright at the side.',
      'running: mid-stride, sleeves and clothes streaming back, staff held diagonally.',
      'wind-up: staff raised high overhead to cast a spell, the other hand open.',
      'strike: staff thrust forward to release the spell, the other arm swept back.',
      'guard: staff held horizontally in front of the body with both hands.',
      'dash: a quick gliding step forward, leaning low, clothes flaring.',
    ],
    windup: 'the staff rises high overhead to cast a spell, the other hand open',
    strike: 'the staff thrusts forward to release the spell, the other arm swept back, no visible magic',
    guard: 'holds the staff horizontally in front of the body with both hands into a defensive guard',
    dodge: 'makes a quick gliding step forward, leaning low with the clothes flaring, then lands',
  },
  lame: {
    gear: 'twin blades',
    poses: [
      'idle: low crouch, both blades held in a reverse grip.',
      'running: a low sprint, leaning forward, blades held back along the forearms.',
      'wind-up: both blades raised crossed above the head.',
      'strike: the end of a wide slashing sweep, one arm extended forward, the other swept back.',
      'guard: crouched, both blades crossed in front of the face.',
      'dash: a low forward slide on one knee, one hand touching the ground.',
    ],
    windup: 'both blades rise and cross above the head',
    strike: 'the blades slash down and to the side in a wide sweep, ending with one arm extended forward',
    guard: 'crouches and crosses both blades in front of the face into a defensive guard',
    dodge: 'drops low and slides forward on one knee, one hand touching the ground',
  },
  paladin: {
    gear: 'polearm and shield',
    poses: [
      'idle: standing tall, polearm upright, shield at the side.',
      'running: mid-stride, shield forward, polearm held diagonally behind.',
      'wind-up: polearm drawn back over the shoulder, shield raised.',
      'strike: a long lunging thrust, polearm fully extended forward.',
      'guard: shield raised in front of the body, braced, polearm behind it.',
      'dash: a shield charge forward, shoulder first, body low.',
    ],
    windup: 'the polearm draws back over the shoulder while the shield rises',
    strike: 'a long lunging thrust, the polearm reaching full extension forward',
    guard: 'raises the shield in front of the body and braces behind it, feet planted, the polearm held back',
    dodge: 'charges forward shield first, shoulder low, then stops',
  },
  rodeur: {
    gear: 'bow and quiver',
    poses: [
      'idle: alert stance, bow held low in one hand.',
      'running: a swift stalking run, bow held low.',
      'wind-up: arrow nocked, bowstring drawn back to the cheek.',
      'strike: the arrow just released, bowstring snapped forward, bow arm extended.',
      'guard: crouched, bow held across the body.',
      'dash: an agile leap backward, knees tucked, bow in hand.',
    ],
    windup: 'an arrow is nocked and the bowstring drawn back to the cheek',
    strike: 'the arrow is released and the bowstring snaps forward, the bow arm staying extended, no arrow in flight',
    guard: 'crouches and holds the bow across the body into a defensive guard',
    dodge: 'makes an agile leap backward, knees tucked, bow in hand, then lands',
  },
};

export const CLASS_NAMES = Object.keys(CLASSES);

/** Style et mise en page communs ; `unit` : « frame » (planche d'animation) ou « figure » (planche de poses). */
const style = (unit) =>
  '2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. ' +
  'Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). ' +
  `Each ${unit} stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. ` +
  `Nothing overlaps or touches a neighbouring ${unit}: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. ` +
  `All ${unit}s at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.`;

/** Planche de poses clés de profil : six poses sur 3 colonnes et 2 lignes. */
export function profilePrompt(cls) {
  const c = CLASSES[cls];
  return [
    `The attached image is our game hero. Draw an animation key-pose sheet of this exact character: same face, body, outfit, colors and ${c.gear}, nothing added or removed. Six poses on a grid of 3 columns and 2 rows (poses 1 to 3 on the top row, poses 4 to 6 on the bottom row, left to right), every figure ${VIEWS.profil.facing}:`,
    ...c.poses.map((pose, i) => `${i + 1}. ${pose}`),
    style('figure'),
  ].join('\n');
}

/** Planche de poses clés de face : les quatre premières poses, sur 2 colonnes et 2 lignes. */
export function facePrompt(cls) {
  const c = CLASSES[cls];
  return [
    `The attached image is our game hero. Draw an animation key-pose sheet of this exact character: same face, body, outfit, colors, proportions and ${c.gear}, nothing added or removed. Four poses on a grid of 2 columns and 2 rows (poses 1 and 2 on the top row, poses 3 and 4 on the bottom row, left to right), every figure in three-quarter FRONT view: the character faces the viewer and the bottom-right corner of the image, we see the face, the chest and the front of the outfit.`,
    ...c.poses.slice(0, 4).map((pose, i) => `${i + 1}. ${pose}`),
    style('figure'),
  ].join('\n');
}

/** Planche d'animation complète, l'image jointe étant la pose de départ (pose.png). */
export function animationPrompt(cls, view, anim) {
  const c = CLASSES[cls];
  const sheets = {
    attente: { frames: 6, grid: [3, 2], loop: true, motion: 'a calm idle breathing loop: the chest slowly rises and falls, the clothes and hair sway gently, a slight shift of weight, the weapon held as in the attached image' },
    course: { frames: 8, grid: [4, 2], loop: true, motion: 'a full running cycle on the spot: for each leg the contact, down, passing and up positions, the arms swinging opposite to the legs, the clothes bouncing' },
    attaque: { frames: 6, grid: [3, 2], loop: false, motion: `an attack. Frames 1 to 3, the wind-up: ${c.windup}. Frames 4 to 6, the strike: ${c.strike}` },
    garde: { frames: 4, grid: [2, 2], loop: false, motion: `going from the idle stance of the attached image into a guard: the character ${c.guard}` },
    esquive: { frames: 6, grid: [3, 2], loop: false, motion: `a dodge: the character ${c.dodge}` },
  };
  const s = sheets[anim];
  const facing = VIEWS[view].facing;
  return [
    `The attached image shows our game hero ${facing}. Draw a sprite animation sheet of this exact character: same face, body, outfit, colors, weapon and proportions, nothing added or removed, every frame ${facing}, exactly like the attached image.`,
    `The animation: ${s.motion}.`,
    `${s.frames} frames on a grid of ${s.grid[0]} columns and ${s.grid[1]} rows, read left to right, then top to bottom. Consecutive frames change only a little, like the in-between frames of a hand-drawn animation, so the motion is smooth when played at 10 frames per second.${s.loop ? ' The last frame leads smoothly back to the first: it is a seamless loop.' : ''}`,
    style('frame'),
  ].join('\n');
}
