// Einherjar guerrier en pixel art : fantôme de viking, peau d'esprit cyan, nodachi à deux mains.
// Proportions trapues (grosse tête, grosses mains) pour rester dans la DA des yokai.
import { add, blade, limb, quad, smear } from './rig.mjs';

const pal = {
  skin: '#9fe6ec',
  skinShade: '#63b9c6',
  eye: '#ffffff',
  pupil: '#1d2a3a',
  beard: '#f1f7f6',
  beardShade: '#b9ced3',
  helm: '#7f8c96',
  helmLight: '#c1cbd1',
  helmDark: '#56616b',
  fur: '#b3b6b1',
  furShade: '#80867f',
  cloak: '#5f6f78',
  cloakShade: '#45535c',
  jerkin: '#8a5a38',
  jerkinShade: '#654026',
  belt: '#3d2b1f',
  buckle: '#e3b85a',
  pants: '#4e5b68',
  pantsShade: '#3a4550',
  boot: '#3d2f27',
  bracer: '#6b4a30',
  wrap: '#8e2f2a',
  guard: '#d9ad4a',
  blade: '#eef4f7',
  bladeShade: '#9eacb6',
  smear: '#cdf6ff',
  smearLight: '#ffffff',
};

const P = {
  I: pal.helmLight,
  H: pal.helm,
  h: pal.helmDark,
  S: pal.skin,
  s: pal.skinShade,
  e: pal.eye,
  p: pal.pupil,
  B: pal.beard,
  b: pal.beardShade,
  F: pal.fur,
  f: pal.furShade,
  J: pal.jerkin,
  j: pal.jerkinShade,
  L: pal.belt,
  G: pal.buckle,
  T: pal.pants,
};

// Tête tournée vers la droite : casque rond à nasal, grands yeux, barbe tressée.
const HEAD = [
  '...hHHHHh...',
  '..hHHIIHHh..',
  '.hHHHIIHHHh.',
  '.hHHHHHHHHh.',
  '.hhhhhhhhhhh',
  '.sSSSSShSSS.',
  '.sSSSSSheeS.',
  '.sSSSSShepS.',
  '.sSSSBBBBBS.',
  '..sBBBBBBBB.',
  '...BBbBBbBB.',
  '....Bb.Bb.B.',
  '....b..b....',
];
const HEAD_ANCHOR = [6, 12]; // bas de la barbe, au niveau du cou

// Torse : mantelet de fourrure sur les épaules, veste de cuir, ceinture à boucle.
const TORSO = [
  '.FFFFFFFFF.',
  'FFfFFFFfFFF',
  'fFFfFFFfFFf',
  '.fJJJJJJJf.',
  '..JJJjJJJ..',
  '..JJJjJJJ..',
  '..LLLGLLL..',
  '..JJjJjJJ..',
  '..TTTTTTT..',
];
const TORSO_ANCHOR = [5, 8]; // milieu du bas, aux hanches

const THIGH = 5;
const SHIN = 5;
const UPPER_ARM = 4;
const FOREARM = 4;
const BLADE_LENGTH = 19;

export default {
  width: 56,
  height: 42,
  outline: '#1a1e2b',

  draw(c, pose) {
    const hip = add([28, 29], pose.body ?? [0, 0]);
    const lean = pose.lean ?? 0;
    const chest = [hip[0] + lean, hip[1] - 8];
    const shoulderF = [chest[0] + 3, chest[1] + 1];
    const shoulderB = [chest[0] - 3, chest[1] + 1];
    const handF = add(shoulderF, pose.hand);
    // Les deux mains tiennent la poignée : la main arrière est juste derrière la main avant.
    const [bx, by] = [Math.cos((pose.blade * Math.PI) / 180), Math.sin((pose.blade * Math.PI) / 180)];
    const handB = pose.handB ? add(shoulderB, pose.handB) : [handF[0] - bx * 2.5, handF[1] - by * 2.5];

    // Cape, derrière tout le reste ; `cape` la fait flotter vers l'arrière.
    const sway = pose.cape ?? 0;
    quad(
      c,
      [[chest[0] - 5, chest[1] - 1], [chest[0] + 1, chest[1] - 1]],
      [[hip[0] - 7 - sway, hip[1] + 6 - Math.floor(sway / 2)], [hip[0] - 1, hip[1] + 6]],
      pal.cloak,
      pal.cloakShade,
    );

    // Bras et jambe arrière, plus sombres pour la profondeur.
    limb(c, shoulderB, handB, [UPPER_ARM, FOREARM], -1, 1, [pal.skinShade, pal.skinShade]);
    c.disc(handB[0], handB[1], 1.2, pal.skinShade);
    const footB = add(hip, pose.footB);
    limb(c, [hip[0] - 1, hip[1]], footB, [THIGH, SHIN], 1, 1.2, [pal.pantsShade, pal.boot]);
    foot(c, footB);

    const footF = add(hip, pose.footF);
    limb(c, [hip[0] + 1, hip[1]], footF, [THIGH, SHIN], 1, 1.2, [pal.pants, pal.boot]);
    foot(c, footF);

    c.stamp(TORSO, P, chest[0], hip[1], TORSO_ANCHOR);
    c.stamp(HEAD, P, chest[0] + 1 + (pose.head ?? 0), chest[1] + 1, HEAD_ANCHOR);

    if (pose.smear) {
      const [from, to] = pose.smear;
      smear(c, shoulderF, BLADE_LENGTH + 2, from, to, pal.smear, pal.smearLight);
    }
    blade(c, handF, pose.blade, BLADE_LENGTH, pal);
    limb(c, shoulderF, handF, [UPPER_ARM, FOREARM], -1, 1, [pal.skin, pal.bracer]);
    c.disc(handF[0], handF[1], 1.3, pal.skin);
  },

  // Les noms d'animation sont ceux des postures du jeu (src/game/types.ts, type Pose).
  animations: {
    idle: {
      duration: 0.22,
      poses: [0, 0, 1, 1].map((dy, i) => ({
        body: [0, dy],
        footF: [3, 10 - dy],
        footB: [-3, 10 - dy],
        hand: [3, 5],
        blade: -40 + (i > 1 ? 3 : 0),
        cape: i % 2,
      })),
    },
    move: {
      duration: 0.09,
      poses: [
        { body: [0, 0], footF: [6, 9], footB: [-5, 9] },
        { body: [0, 1], footF: [3, 9], footB: [-3, 6] },
        { body: [0, -1], footF: [-1, 11], footB: [2, 6] },
        { body: [0, 0], footF: [-5, 9], footB: [6, 9] },
        { body: [0, 1], footF: [-3, 6], footB: [3, 9] },
        { body: [0, -1], footF: [2, 6], footB: [-1, 11] },
      ].map((p, i) => ({ ...p, lean: 1, hand: [3, 4 + (i % 3 === 1 ? 1 : 0)], blade: -25, cape: 2 + (i % 2) })),
    },
    windup: {
      duration: 0.05,
      once: true,
      poses: [
        { lean: -1, footF: [4, 10], footB: [-4, 10], hand: [0, -2], blade: -120, cape: 1 },
        { lean: -1, body: [0, 1], footF: [4, 9], footB: [-5, 9], hand: [-1, -4], blade: -150, cape: 1 },
      ],
    },
    strike: {
      once: true,
      poses: [
        { duration: 0.05, lean: 1, footF: [5, 10], footB: [-4, 10], hand: [3, -2], blade: -70, smear: [-150, -70], cape: 2 },
        { duration: 0.08, lean: 2, body: [1, 1], footF: [6, 9], footB: [-5, 9], hand: [6, 3], blade: 15, smear: [-110, 15], cape: 3 },
        { duration: 0.2, lean: 1, body: [1, 1], footF: [6, 9], footB: [-5, 9], hand: [5, 5], blade: 35, cape: 2 },
      ],
    },
    guard: {
      duration: 0.3,
      poses: [
        { lean: -1, body: [0, 1], footF: [4, 9], footB: [-5, 9], hand: [4, 1], blade: -85, cape: 1 },
      ],
    },
    dash: {
      duration: 0.09,
      poses: [
        { lean: 3, body: [0, 1], footF: [5, 8], footB: [-7, 8], hand: [3, 5], blade: 160, cape: 5 },
        { lean: 3, body: [0, 0], footF: [3, 9], footB: [-6, 7], hand: [3, 5], blade: 165, cape: 6 },
      ],
    },
  },
};

/** Botte tournée vers la droite, posée au sol. */
function foot(c, [x, y]) {
  c.line([x - 1, y], [x + 2, y], 0.6, pal.boot);
}
