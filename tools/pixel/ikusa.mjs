// Guerrier de l'armée du Yomi en pixel art : squelette en armure laquée noire lacée de rouge,
// kabuto à croissant doré, longue lance (yari) tenue à deux mains, pointée devant lui.
import { add, dir, limb, quad } from './rig.mjs';

const pal = {
  bone: '#d8d0bd',
  boneShade: '#a89f8a',
  armor: '#2b2a31',
  armorLight: '#46444f',
  armorShade: '#18171c',
  lace: '#a32a2a',
  helm: '#23222a',
  crest: '#e0b64a',
  eye: '#ff6a3d',
  shaft: '#5a3d26',
  blade: '#e6eaee',
  bladeShade: '#9aa3ab',
  smear: '#e6eaee',
};

const UPPER_ARM = 6;
const FOREARM = 6;

export default {
  width: 70,
  height: 50,
  outline: '#0f0e12',

  draw(c, pose) {
    const ground = 48;
    const lean = pose.lean ?? 0;
    const bob = pose.bob ?? 0;
    const hip = [24 + lean * 0.5, ground - 13 + bob];
    const chest = [hip[0] + 1 + lean, hip[1] - 12];
    const stride = pose.stride ?? 0;

    // Jambes d'os sous les tassets.
    limb(c, hip, [hip[0] - 4 - stride, ground], [7, 7], 1, 1, [pal.boneShade, pal.boneShade]);
    limb(c, [hip[0] + 1, hip[1]], [hip[0] + 4 + stride, ground], [7, 7], 1, 1.2, [pal.bone, pal.bone]);

    // Lance : du poing arrière vers l'avant, dans la direction `aim` (degrés).
    const aim = pose.aim ?? 0;
    const [ux, uy] = dir(aim);
    const reach = pose.reach ?? 0;
    const grip = add(chest, [2 + reach, 5]);
    const butt = [grip[0] - ux * 14, grip[1] - uy * 14];
    const tip = [grip[0] + ux * (22 + reach), grip[1] + uy * (22 + reach)];
    c.line(butt, tip, 0.5, pal.shaft);
    const blade0 = [tip[0] - ux * 5, tip[1] - uy * 5];
    c.line(blade0, tip, 1, pal.bladeShade);
    c.line(blade0, [tip[0] + ux * 2, tip[1] + uy * 2], 0, pal.blade);
    if (pose.thrust) {
      // Traînée droite de l'estoc.
      for (let k = 1; k <= 3; k++) c.line([tip[0] - ux * (8 + k * 4), tip[1] - uy * (8 + k * 4) - k], [tip[0] - ux * 4, tip[1] - uy * 4 - k], 0, pal.smear);
    }

    // Bras arrière (qui tient la hampe), cuirasse, tassets.
    limb(c, [chest[0] - 3, chest[1] + 1], [grip[0] - ux * 8, grip[1] - uy * 8], [UPPER_ARM, FOREARM], -1, 1, [pal.boneShade, pal.boneShade]);
    quad(c, [[chest[0] - 5, chest[1]], [chest[0] + 5, chest[1]]], [[hip[0] - 6, hip[1] + 1], [hip[0] + 6, hip[1] + 1]], pal.armor, pal.armorShade);
    for (let y = chest[1] + 2; y < hip[1]; y += 3) c.line([chest[0] - 4, y], [chest[0] + 4, y], 0, pal.lace);
    quad(c, [[hip[0] - 6, hip[1] + 1], [hip[0] + 6, hip[1] + 1]], [[hip[0] - 8, hip[1] + 6], [hip[0] + 7, hip[1] + 6]], pal.armorLight, pal.armorShade);
    c.line([hip[0] - 7, hip[1] + 4], [hip[0] + 6, hip[1] + 4], 0, pal.lace);
    // Épaulière.
    c.ellipse(chest[0] - 1, chest[1] + 1, 4, 2, [pal.armorShade, pal.armor, pal.armorLight]);

    // Tête : crâne sous le kabuto, croissant doré.
    const head = [chest[0] + 1 + (pose.headX ?? 0), chest[1] - 4 + (pose.headY ?? 0)];
    c.ellipse(head[0], head[1], 3.5, 3.5, [pal.boneShade, pal.bone, pal.bone]);
    c.rect(head[0] + 1, head[1] - 1, 2, 2, pal.armorShade);
    c.set(head[0] + 2, head[1], pal.eye);
    c.rect(head[0], head[1] + 2, 3, 1, pal.boneShade);
    c.ellipse(head[0] - 1, head[1] - 3, 5, 2.5, [pal.armorShade, pal.helm, pal.armorLight]);
    c.line([head[0] - 6, head[1] - 1], [head[0] + 3, head[1] - 1], 0, pal.helm);
    c.line([head[0] - 2, head[1] - 6], [head[0] - 5, head[1] - 9], 0, pal.crest);
    c.line([head[0] + 1, head[1] - 6], [head[0] + 4, head[1] - 9], 0, pal.crest);

    // Bras avant, sur la hampe.
    limb(c, [chest[0] + 3, chest[1] + 1], grip, [UPPER_ARM, FOREARM], -1, 1.2, [pal.bone, pal.bone]);
  },

  animations: {
    idle: { duration: 0.35, poses: [0, 1].map((bob) => ({ bob, aim: -8 })) },
    move: {
      duration: 0.16,
      poses: [-2, 0, 2, 0].map((stride, i) => ({ stride, bob: i % 2 ? -1 : 0, lean: 1, aim: -6 })),
    },
    windup: {
      duration: 0.3,
      once: true,
      poses: [
        { lean: -2, reach: -4, aim: -2 },
        { lean: -3, reach: -7, aim: 0 },
      ],
    },
    strike: {
      once: true,
      poses: [
        { duration: 0.1, lean: 3, stride: 3, reach: 9, aim: 0, thrust: true },
        { duration: 0.4, lean: 2, stride: 2, reach: 6, aim: 4 },
      ],
    },
    stunned: {
      duration: 0.3,
      poses: [
        { lean: -2, bob: 1, headX: -1, headY: 1, aim: 35, reach: -3 },
        { lean: -2, bob: 1, headX: -1, headY: 2, aim: 38, reach: -3 },
      ],
    },
  },
};
