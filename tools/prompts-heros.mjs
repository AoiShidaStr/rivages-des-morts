// Prompts des animations des héros, écrits par `npm run kit-heros` dans le dossier de chaque animation :
//   - prompt-planche.txt : Nano Banana 2 dessine toute l'animation en une planche (image jointe : debut.png) ;
//   - prompt-video.txt : Kling, Dreamina ou PixVerse animent de debut.png à fin.png.
// Les prompts ne nomment pas l'arme exacte : l'image jointe la montre, le même prompt sert aux quatre races.

/** Vues du héros, et animations faites dans chacune. */
export const VIEWS = {
  profil: { facing: 'in three-quarter view facing right', animations: ['attente', 'course', 'attaque', 'garde', 'esquive'] },
  face: { facing: 'in three-quarter front view, facing the viewer and the bottom-right corner of the image', animations: ['attente', 'course', 'attaque'] },
  dos: {
    facing: 'in three-quarter back view, turned away from the viewer and facing the top-right corner of the image, the face hidden',
    animations: ['attente', 'course', 'attaque'],
  },
};

/** Poses de début et de fin de chaque vidéo, dans la planche de la vue (dos : 1 à 4 = poses de la ligne du bas). */
export const DEFAULT_POSES = {
  profil: { attente: [1, 1], course: [2, 2], attaque: [1, 4], garde: [1, 5], esquive: [1, 6] },
  face: { attente: [1, 1], course: [2, 2], attaque: [1, 4] },
  dos: { attente: [1, 1], course: [2, 2], attaque: [1, 4] },
};

/** Gestes propres à chaque classe. */
const CLASSES = {
  guerrier: {
    windup: 'the weapon rises from the guard stance to high above the head, the body coiling',
    strike: 'the weapon slashes down and across in a wide arc, ending extended forward, front knee bent',
    attack: 'raises the weapon high above the head, then slashes it down and across in a wide powerful arc',
    guard: 'brings the weapon upright in front of the body into a braced guard, feet planted',
    dodge: 'makes a low fast lunge forward, the body almost horizontal and the weapon trailing behind, then lands',
  },
  invocateur: {
    windup: 'the staff rises high overhead to cast a spell, the other hand open',
    strike: 'the staff thrusts forward to release the spell, the other arm swept back, no visible magic',
    attack: 'lifts the staff high overhead, then thrusts it forward to cast a spell, with no visible magic',
    guard: 'holds the staff horizontally in front of the body with both hands into a defensive guard',
    dodge: 'makes a quick gliding step forward, leaning low with the clothes flaring, then lands',
  },
  lame: {
    windup: 'both blades rise and cross above the head',
    strike: 'the blades slash down and to the side in a wide sweep, ending with one arm extended forward',
    attack: 'raises both blades crossed above the head, then slashes them down and to the side in a wide sweep',
    guard: 'crouches and crosses both blades in front of the face into a defensive guard',
    dodge: 'drops low and slides forward on one knee, one hand touching the ground',
  },
  paladin: {
    windup: 'the polearm draws back over the shoulder while the shield rises',
    strike: 'a long lunging thrust, the polearm reaching full extension forward',
    attack: 'draws the polearm back over the shoulder behind the shield, then lunges forward with a long powerful thrust',
    guard: 'raises the shield in front of the body and braces behind it, feet planted, the polearm held back',
    dodge: 'charges forward shield first, shoulder low, then stops',
  },
  rodeur: {
    windup: 'an arrow is nocked and the bowstring drawn back to the cheek',
    strike: 'the arrow is released and the bowstring snaps forward, the bow arm staying extended, no arrow in flight',
    attack: 'nocks an arrow and draws the bowstring back to the cheek, then releases; the bowstring snaps forward and the arrow leaves the frame at once',
    guard: 'crouches and holds the bow across the body into a defensive guard',
    dodge: 'makes an agile leap backward, knees tucked, bow in hand, then lands',
  },
};

/** Style et mise en page communs ; `unit` : « frame » (planche d'animation) ou « figure » (planche de poses). */
const style = (unit) =>
  '2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. ' +
  'Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). ' +
  `Each ${unit} stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. ` +
  `Nothing overlaps or touches a neighbouring ${unit}: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. ` +
  `All ${unit}s at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.`;

/** Option 1 : toute l'animation dessinée par Nano Banana 2, l'image jointe étant debut.png. */
export function sheetPrompt(cls, view, anim) {
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

/** Option 2 : vidéo de debut.png à fin.png. La pose jointe montre déjà la vue : le prompt ne la répète pas. */
export function videoPrompt(cls, anim) {
  const c = CLASSES[cls];
  const still = 'The character stays in place and keeps facing the same direction. Static locked-off camera, plain flat light grey background that never changes.';
  const prompts = {
    attente:
      'The character stands in place in a calm idle stance and breathes slowly: the chest rises and falls, the clothes and hair sway gently, a small shift of weight from one foot to the other. The character keeps facing the same direction. Static locked-off camera, the character stays exactly centered, plain flat light grey background that never changes. Seamless loop: the last frame matches the first.',
    course:
      'The character runs in place on the spot as if on a treadmill, keeping the same facing direction: a full running cycle, arms and legs swinging, clothes and hair bouncing with each step. The character never moves across the frame and the camera never follows or moves. Plain flat light grey background that never changes. Seamless loop: the last frame matches the first.',
    attaque: `The character ${c.attack}, with a fast and powerful motion, then holds the final pose. ${still}`,
    garde: `The character quickly ${c.guard}. ${still}`,
    esquive: `The character ${c.dodge}, ending in the final pose. Fast motion, static locked-off camera that never follows, plain flat light grey background that never changes.`,
  };
  return prompts[anim];
}

export const NEGATIVE_PROMPT =
  'camera movement, zoom, pan, tracking shot, camera shake, background change, scenery, floor, ground shadow, motion blur, speed lines, particles, smoke, glow, magic effects, text, extra limbs, extra weapons, morphing, changing face, changing outfit, cut, transition';

export const CLASS_NAMES = Object.keys(CLASSES);

/** Planches de poses clés (Nano Banana 2, image jointe : la fiche du héros), d'où sont découpées debut.png et fin.png. */
const KEY_POSES = {
  guerrier: {
    gear: 'weapon',
    profil: [
      'idle: calm guard stance, weapon held low in both hands.',
      'running: mid-stride, leaning forward, weapon held low at the side.',
      'wind-up: weapon raised high above the head, body coiled.',
      'strike: the end of a wide horizontal slash, weapon fully extended forward, front knee bent.',
      'guard: weapon held upright in front of the body, braced, feet planted.',
      'dash: a low fast lunge forward, body almost horizontal, weapon trailing behind.',
    ],
    views: 'idle, calm guard stance, weapon held low. 2. running, mid-stride. 3. wind-up, weapon raised high above the head. 4. strike, the end of a wide slash, weapon extended forward.',
    back: 'we see the back of the head, the back of the outfit and the weapon from behind; the face is hidden. Back details stay consistent with the front (hair, cloak, straps, sheath).',
  },
  invocateur: {
    gear: 'staff',
    profil: [
      'idle: standing calmly, staff held upright at the side.',
      'running: mid-stride, sleeves and clothes streaming back, staff held diagonally.',
      'wind-up: staff raised high overhead to cast a spell, the other hand open.',
      'strike: staff thrust forward to release the spell, the other arm swept back.',
      'guard: staff held horizontally in front of the body with both hands.',
      'dash: a quick gliding step forward, leaning low, clothes flaring.',
    ],
    views: 'idle, standing calmly, staff upright at the side. 2. running, mid-stride. 3. wind-up, staff raised high overhead to cast. 4. strike, staff thrust forward.',
    back: 'we see the back of the head, the back of the outfit and the staff from behind; the face is hidden. Back details stay consistent with the front (hair, sleeves, sash, belt).',
  },
  lame: {
    gear: 'twin blades',
    profil: [
      'idle: low crouch, both blades held in a reverse grip.',
      'running: a low sprint, leaning forward, blades held back along the forearms.',
      'wind-up: both blades raised crossed above the head.',
      'strike: the end of a wide slashing sweep, one arm extended forward, the other swept back.',
      'guard: crouched, both blades crossed in front of the face.',
      'dash: a low forward slide on one knee, one hand touching the ground.',
    ],
    views: 'idle, low crouch, blades in a reverse grip. 2. running, a low sprint. 3. wind-up, both blades raised crossed above the head. 4. strike, the end of a wide slashing sweep.',
    back: 'we see the back of the head, the back of the outfit and the blades from behind; the face is hidden. Back details stay consistent with the front (hair, mask, wrappings, belt).',
  },
  paladin: {
    gear: 'polearm and shield',
    profil: [
      'idle: standing tall, polearm upright, shield at the side.',
      'running: mid-stride, shield forward, polearm held diagonally behind.',
      'wind-up: polearm drawn back over the shoulder, shield raised.',
      'strike: a long lunging thrust, polearm fully extended forward.',
      'guard: shield raised in front of the body, braced, polearm behind it.',
      'dash: a shield charge forward, shoulder first, body low.',
    ],
    views: 'idle, standing tall, polearm upright, shield at the side. 2. running, mid-stride, shield forward. 3. wind-up, polearm drawn back over the shoulder. 4. strike, a long lunging thrust.',
    back: 'we see the back of the head or helmet, the back of the armor and the back of the shield; the face is hidden. Back details stay consistent with the front (helmet, cape, straps).',
  },
  rodeur: {
    gear: 'bow and quiver',
    profil: [
      'idle: alert stance, bow held low in one hand.',
      'running: a swift stalking run, bow held low.',
      'wind-up: arrow nocked, bowstring drawn back to the cheek.',
      'strike: the arrow just released, bowstring snapped forward, bow arm extended.',
      'guard: crouched, bow held across the body.',
      'dash: an agile leap backward, knees tucked, bow in hand.',
    ],
    views: 'idle, alert stance, bow held low. 2. running, a swift stalking run. 3. wind-up, bowstring drawn back to the cheek. 4. strike, the arrow just released, bow arm extended.',
    back: 'we see the back of the head, the quiver on the back and the back of the outfit; the face is hidden. Back details stay consistent with the front (hair, cloak, quiver straps).',
  },
};

/** Planche de profil : six poses sur 3 colonnes et 2 lignes. */
export function profilePrompt(cls) {
  const k = KEY_POSES[cls];
  return [
    `The attached image is our game hero. Draw an animation key-pose sheet of this exact character: same face, body, outfit, colors and ${k.gear}, nothing added or removed. Six poses on a grid of 3 columns and 2 rows (poses 1 to 3 on the top row, poses 4 to 6 on the bottom row, left to right), every figure in three-quarter view facing right:`,
    ...k.profil.map((pose, i) => `${i + 1}. ${pose}`),
    style('figure'),
  ].join('\n');
}

/** Planche face et dos : les quatre premières poses, de face (ligne du haut) et de dos (ligne du bas). */
export function faceBackPrompt(cls) {
  const k = KEY_POSES[cls];
  return [
    `The attached image is our game hero. Draw a sheet of this exact character: same face, body, outfit, colors, proportions, ${k.gear}, nothing added or removed. A grid of 4 columns and 2 rows, the same four poses on each row, left to right: 1. ${k.views}`,
    'Top row: three-quarter FRONT view. The character faces the viewer and the bottom-right corner of the image: we see the face, the chest and the front of the outfit.',
    `Bottom row: three-quarter BACK view. The character turns away from the viewer and faces the top-right corner of the image: ${k.back}`,
    style('figure'),
  ].join('\n');
}
