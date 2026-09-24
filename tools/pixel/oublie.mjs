// Oublié en pixel art : haute silhouette en robe grise déchirée, masque blanc sans visage, longs bras griffus.
import { add, limb, quad, smear } from './rig.mjs';

const pal = {
  robe: '#8a8f96',
  robeShade: '#62676f',
  robeDark: '#4a4e56',
  hood: '#6d727a',
  hoodShade: '#50545c',
  mask: '#f4f1ea',
  maskShade: '#c9c4b8',
  arm: '#454951',
  armShade: '#34373e',
  hand: '#d9d4c7',
  smear: '#3a3050',
  smearLight: '#6a5a8a',
};

const P = { O: pal.hood, o: pal.hoodShade, M: pal.mask, m: pal.maskShade };

// Capuche et masque lisse, tournés vers la droite.
const HEAD = [
  '...oOOOo...',
  '..oOOOOOOo.',
  '.oOOOMMMOO.',
  '.oOOMMMMMO.',
  '.oOMMMMMMO.',
  '.oOMMMMMmO.',
  '.ooOMMMMmO.',
  '..ooOMMmOo.',
  '...oooOOo..',
];
const HEAD_ANCHOR = [5, 8];

const UPPER_ARM = 6;
const FOREARM = 6;

export default {
  width: 44,
  height: 46,
  outline: '#1c1b24',

  draw(c, pose, index) {
    const base = add([22, 44], pose.body ?? [0, 0]);
    const lean = pose.lean ?? 0;
    const chest = [base[0] + lean, base[1] - 26];
    const shoulderF = [chest[0] + 3, chest[1] + 1];
    const shoulderB = [chest[0] - 3, chest[1] + 1];

    // Bras arrière, derrière la robe.
    const handB = add(shoulderB, pose.handB);
    limb(c, shoulderB, handB, [UPPER_ARM, FOREARM], -1, 1, [pal.armShade, pal.armShade]);
    claws(c, handB, pose.clawB ?? 60, pal.armShade);

    // Robe : large en bas, l'ourlet déchiré ondule d'une image à l'autre.
    const sway = pose.sway ?? 0;
    const hemY = base[1] - 1;
    quad(c, [[chest[0] - 4, chest[1]], [chest[0] + 4, chest[1]]], [[base[0] - 8 - sway, hemY], [base[0] + 7 - sway, hemY]], pal.robe, pal.robeShade);
    for (let x = base[0] - 8 - sway; x <= base[0] + 7 - sway; x++) {
      // Lambeaux : des dents irrégulières sous l'ourlet.
      const tooth = (x * 7 + index * 3) % 5;
      if (tooth < 2) c.set(x, hemY + 1, pal.robeDark);
      if (tooth === 0) c.set(x, hemY + 2, pal.robeDark);
    }
    // Pli central de la robe.
    c.line([chest[0] + 1, chest[1] + 6], [base[0] - 1 - sway, hemY - 2], 0, pal.robeShade);

    c.stamp(HEAD, P, chest[0] + 1 + (pose.head?.[0] ?? 0), chest[1] + 1 + (pose.head?.[1] ?? 0), HEAD_ANCHOR);

    if (pose.smear) smear(c, shoulderF, UPPER_ARM + FOREARM + 1, pose.smear[0], pose.smear[1], pal.smear, pal.smearLight);
    const handF = add(shoulderF, pose.handF);
    limb(c, shoulderF, handF, [UPPER_ARM, FOREARM], -1, 1.2, [pal.arm, pal.arm]);
    claws(c, handF, pose.clawF ?? 60, pal.hand);
  },

  animations: {
    idle: {
      duration: 0.25,
      poses: [0, 1, 1, 0].map((dy, i) => ({ body: [0, dy - 1], handF: [2, 10 + dy], handB: [-1, 10 + dy], sway: i % 2 })),
    },
    move: {
      duration: 0.14,
      poses: [0, 1, 2, 1].map((s, i) => ({
        lean: 1,
        body: [0, -1 - (i % 2)],
        handF: [3, 9],
        handB: [-3, 9],
        sway: s,
      })),
    },
    windup: {
      duration: 0.25,
      once: true,
      poses: [
        { lean: -1, handF: [-2, -6], handB: [-4, 6], clawF: -120, sway: -1 },
        { lean: -2, handF: [-4, -9], handB: [-5, 5], clawF: -140, sway: -1 },
      ],
    },
    strike: {
      once: true,
      poses: [
        { duration: 0.08, lean: 2, handF: [9, 3], handB: [-4, 8], clawF: 20, smear: [-120, 20], sway: 1 },
        { duration: 0.3, lean: 2, handF: [8, 8], handB: [-4, 8], clawF: 60, sway: 1 },
      ],
    },
    stunned: {
      duration: 0.3,
      poses: [
        { lean: -1, body: [0, 1], head: [-1, 1], handF: [1, 11], handB: [-2, 11], sway: 0 },
        { lean: -1, body: [0, 1], head: [-1, 2], handF: [1, 12], handB: [-2, 12], sway: 1 },
      ],
    },
  },
};

/** Main osseuse : une paume et trois longs doigts en éventail dans la direction `deg`. */
function claws(c, [x, y], deg, color) {
  for (const spread of [-35, 0, 35]) {
    const a = ((deg + spread) * Math.PI) / 180;
    c.line([x, y], [x + Math.cos(a) * 3.5, y + Math.sin(a) * 3.5], 0, color);
  }
  c.disc(x, y, 1.2, color);
}
