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

/**
 * Planche d'animation complète, l'image jointe étant la pose de départ (pose.png). Nano Banana a tendance à
 * recopier la pose jointe dans chaque case : chaque image est donc décrite une par une, avec ce qui doit
 * bouger, et une liste de « DO NOT ».
 */
export function animationPrompt(cls, view, anim) {
  const c = CLASSES[cls];
  const sheets = {
    attente: {
      name: 'an idle breathing loop, clearly visible like the idle animation of a fighting game',
      grid: [3, 2],
      loop: true,
      frames: [
        'neutral: exactly the pose of the attached image.',
        'breathing in: the chest swells, the shoulders and head rise, the hair and cloth start to lift.',
        'top of the breath: the shoulders and head at their HIGHEST, the chest fully expanded, the weapon raised slightly with the body, the knees straight.',
        'breathing out: the shoulders drop, the knees start to bend, the hair and cloth swing the other way.',
        'bottom of the breath: the shoulders and head at their LOWEST, the knees slightly bent, the head dipped a little, the weapon lowered slightly.',
        'rising again, halfway between frame 5 and frame 1.',
      ],
      moves: 'Between frame 3 and frame 5, the top of the head moves down by about a quarter of the head height; the shoulders, hands, weapon, hair and cloth move with it. Put the moving parts at visibly different positions in each frame.',
    },
    course: {
      name: 'a running cycle on the spot',
      grid: [4, 2],
      loop: true,
      frames: [
        'contact: the right leg reaches forward and the heel touches the ground, the left leg stretched behind, the left arm forward.',
        'down: the right leg bends under the weight, the body at its lowest.',
        'passing: the left leg swings forward past the right leg, the body rising.',
        'up: pushing off the right foot, the body at its highest, both feet almost off the ground.',
        'contact: the left leg reaches forward and the heel touches the ground, the right leg stretched behind, the right arm forward.',
        'down: the left leg bends under the weight, the body at its lowest.',
        'passing: the right leg swings forward past the left leg, the body rising.',
        'up: pushing off the left foot, the body at its highest, both feet almost off the ground.',
      ],
      moves: 'The legs and arms are in a different position in every frame, the arms swinging opposite to the legs; the hair and cloth bounce with each step.',
    },
    attaque: {
      name: 'an attack',
      grid: [3, 2],
      loop: false,
      frames: [
        'start: the pose of the attached image, the weight shifting back.',
        `wind-up, halfway: ${c.windup}, halfway there.`,
        `wind-up at its peak: ${c.windup}, fully, the body coiled like a spring.`,
        `strike, the fastest moment: ${c.strike}, halfway there.`,
        `strike at full extension: ${c.strike}.`,
        'follow-through: the body recovers balance and starts to return toward the starting pose.',
      ],
      moves: 'The weapon and the arms are at a clearly different place in every frame, following one continuous path.',
    },
    garde: {
      name: 'going into a guard',
      grid: [2, 2],
      loop: false,
      frames: [
        'start: the pose of the attached image.',
        `starting to move: the character ${c.guard}, one third of the way.`,
        'almost in guard, two thirds of the way.',
        `full guard, braced and still: the character ${c.guard}.`,
      ],
      moves: 'The weapon, the arms and the stance change a little more in every frame.',
    },
    esquive: {
      name: `a dodge: the character ${c.dodge}`,
      grid: [3, 2],
      loop: false,
      frames: [
        'anticipation: the character crouches slightly, loading the weight.',
        'push-off: the dodge begins, the body launching.',
        'mid-dodge: the body at full stretch, the fastest moment.',
        'end of the movement: still in motion, about to land.',
        'landing: the knees bend to absorb the impact.',
        'recovery: back on balance, rising toward the starting pose.',
      ],
      moves: 'The body is at a clearly different place and shape in every frame.',
    },
  };
  const s = sheets[anim];
  const facing = VIEWS[view].facing;
  const count = s.frames.length;
  return [
    `The attached image shows our game hero ${facing}. Draw a sprite animation sheet of this exact character performing ${s.name}: same face, body, outfit, colors, weapon and proportions, every frame ${facing}, exactly like the attached image.`,
    `${count} frames on a grid of ${s.grid[0]} columns and ${s.grid[1]} rows, read left to right, then top to bottom:`,
    ...s.frames.map((frame, i) => `Frame ${i + 1}, ${frame}`),
    s.moves,
    s.loop ? `It is a seamless loop: frame ${count} leads smoothly back to frame 1.` : 'It plays once, from frame 1 to the last frame.',
    'DO NOT draw the same pose twice: every frame must be clearly different from the frames next to it, even if the motion looks exaggerated.',
    'DO NOT simply copy the attached image into every frame.',
    'DO NOT change the camera angle, the facing direction, the design, the colors or the weapon from one frame to the next.',
    'DO NOT move the character across the sheet: each frame stays centered in its own cell.',
    'DO NOT add anything that is not the character: no effects, no props, no ground, no text, no numbers, no frame labels, no grid lines.',
    style('frame'),
  ].join('\n');
}
