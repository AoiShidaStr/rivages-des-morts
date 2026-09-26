// Yomotsu-shikome en pixel art : furie du Yomi voûtée, haillons sombres, longue chevelure blanche,
// peau grise, yeux rouges et longues griffes. Elle court penchée en avant et bondit griffes tendues.
import { add, limb, quad, smear } from './rig.mjs';

const pal = {
  rag: '#3b3438',
  ragShade: '#262126',
  ragLight: '#554b50',
  skin: '#8e9a8a',
  skinShade: '#66725f',
  hair: '#ece6da',
  hairShade: '#b7ae9f',
  eye: '#ff3b30',
  mouth: '#1a1015',
  claw: '#ddd6c6',
  smear: '#5a2330',
  smearLight: '#c8412f',
};

/** Longue main griffue : trois doigts en éventail dans la direction `deg`. */
function claws(c, [x, y], deg, color) {
  for (const spread of [-30, 0, 30]) {
    const a = ((deg + spread) * Math.PI) / 180;
    c.line([x, y], [x + Math.cos(a) * 4, y + Math.sin(a) * 4], 0, color);
  }
  c.disc(x, y, 1, pal.skin);
}

export default {
  width: 46,
  height: 40,
  outline: '#140f13',

  draw(c, pose, index) {
    const ground = 38;
    const lean = pose.lean ?? 0;
    const crouch = pose.crouch ?? 0;
    const bob = pose.bob ?? 0;
    const hip = [20 + lean * 0.4, ground - 11 + crouch * 4 + bob];
    // Dos voûté : la poitrine est loin devant les hanches.
    const chest = [hip[0] + 5 + lean, hip[1] - 8 + crouch * 2];
    const stride = pose.stride ?? 0;

    // Jambe arrière, bras arrière.
    limb(c, hip, [hip[0] - 3 - stride, ground], [6, 6], 1, 1, [pal.skinShade, pal.skinShade]);
    const handB = add(chest, pose.handB ?? [-2, 8]);
    limb(c, [chest[0] - 1, chest[1] + 1], handB, [5, 6], -1, 1, [pal.skinShade, pal.skinShade]);
    claws(c, handB, pose.clawB ?? 70, pal.hairShade);

    // Haillons : un sac de tissu déchiré entre les épaules et les genoux.
    quad(c, [[chest[0] - 7, chest[1] - 1], [chest[0] + 3, chest[1] - 2]], [[hip[0] - 8, hip[1] + 5], [hip[0] + 5, hip[1] + 4]], pal.rag, pal.ragShade);
    for (let x = hip[0] - 8; x <= hip[0] + 5; x++) {
      const tooth = (x * 5 + index * 2) % 4;
      if (tooth < 2) c.set(x, hip[1] + 6, pal.ragShade);
      if (tooth === 0) c.set(x, hip[1] + 7, pal.ragShade);
    }
    c.line([chest[0] - 4, chest[1] + 1], [hip[0] - 3, hip[1] + 3], 0, pal.ragLight);

    // Jambe avant.
    limb(c, [hip[0] + 1, hip[1]], [hip[0] + 4 + stride, ground], [6, 6], 1, 1.2, [pal.skin, pal.skin]);

    // Tête : crâne gris sous une chevelure blanche qui tombe dans le dos.
    const head = [chest[0] + 4 + (pose.headX ?? 0), chest[1] - 3 + (pose.headY ?? 0)];
    const flow = pose.flow ?? 0;
    for (let i = 0; i < 4; i++) {
      c.line([head[0] - 1, head[1] - 3 + i], [head[0] - 10 - flow - i, head[1] + 4 + i * 2], 1, i % 2 ? pal.hairShade : pal.hair);
    }
    c.ellipse(head[0], head[1], 3.5, 3.5, [pal.skinShade, pal.skin, pal.skin]);
    c.ellipse(head[0] - 1, head[1] - 2.5, 3.5, 2, [pal.hairShade, pal.hair, pal.hair]);
    c.rect(head[0] + 1, head[1] - 1, 2, 1, pal.eye);
    c.rect(head[0] + 2, head[1] + 2, 2, 1, pal.mouth);

    // Bras avant, tendu vers sa proie.
    if (pose.smear) smear(c, [chest[0] + 1, chest[1] + 1], 12, pose.smear[0], pose.smear[1], pal.smear, pal.smearLight);
    const handF = add(chest, pose.handF ?? [4, 7]);
    limb(c, [chest[0] + 1, chest[1] + 1], handF, [5, 6], -1, 1.1, [pal.skin, pal.skin]);
    claws(c, handF, pose.clawF ?? 40, pal.claw);
  },

  animations: {
    idle: {
      duration: 0.28,
      poses: [0, 1].map((bob) => ({ bob, handF: [4, 8 + bob], handB: [-2, 8 + bob], flow: bob })),
    },
    move: {
      duration: 0.1,
      poses: [-2, 0, 2, 0].map((stride, i) => ({
        lean: 2,
        bob: i % 2 ? -1 : 0,
        stride,
        handF: [6, 5 - (i % 2)],
        handB: [-4, 6],
        flow: 2 + (i % 2),
      })),
    },
    windup: {
      duration: 0.25,
      once: true,
      poses: [
        { crouch: 0.6, lean: -1, handF: [-1, 3], handB: [-5, 5], clawF: -60, flow: 1 },
        { crouch: 1, lean: -2, handF: [-3, 1], handB: [-6, 4], clawF: -90, flow: 1 },
      ],
    },
    dash: {
      duration: 0.06,
      poses: [
        { lean: 5, bob: -2, stride: 3, handF: [11, -1], handB: [9, 1], clawF: 0, clawB: 10, flow: 4, headX: 1 },
        { lean: 5, bob: -3, stride: -3, handF: [12, 0], handB: [9, 2], clawF: 5, clawB: 15, flow: 5, headX: 1 },
      ],
    },
    strike: {
      once: true,
      poses: [
        { duration: 0.08, lean: 3, handF: [11, 2], handB: [-3, 6], clawF: 20, smear: [-110, 30], flow: 3 },
        { duration: 0.35, lean: 2, handF: [9, 7], handB: [-3, 7], clawF: 60, flow: 2 },
      ],
    },
    stunned: {
      duration: 0.3,
      poses: [
        { crouch: 0.5, lean: -2, headX: -1, headY: 2, handF: [2, 10], handB: [-2, 10], flow: 0 },
        { crouch: 0.5, lean: -2, headX: -1, headY: 3, handF: [2, 11], handB: [-2, 11], flow: 1 },
      ],
    },
  },
};
