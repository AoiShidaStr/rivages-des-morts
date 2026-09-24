// Jorōgumo en pixel art, sous ses deux formes :
// - humaine : kimono noir et cramoisi à motif de toile, longs cheveux, éventail, pattes cachées sous l'ourlet ;
// - araignée : grande araignée noire et cramoisie d'où sort un buste de femme.
import { quad, smear } from './rig.mjs';

const pal = {
  kimono: '#2c1c26',
  kimonoLight: '#46303e',
  kimonoShade: '#1a1017',
  web: '#8a2a36',
  obi: '#b8323c',
  obiLight: '#e0604c',
  skin: '#f2e6e2',
  skinShade: '#cdbab6',
  hair: '#141016',
  hairLight: '#2e2632',
  eye: '#ff3b30',
  lips: '#c8303c',
  fan: '#1e1418',
  fanRib: '#c8303c',
  leg: '#231419',
  legJoint: '#8a2a36',
  body: '#2a1822',
  bodyLight: '#4a2c3a',
  bodyShade: '#150b11',
  mark: '#c8303c',
  silk: '#e8edf2',
  smear: '#c8303c',
  smearLight: '#ff8a70',
};

/** Tête de femme tournée vers la droite, cheveux tombant dans le dos. */
function head(c, x, y, hairLength) {
  c.line([x - 2, y - 2], [x - 5, y + hairLength], 2, pal.hair);
  c.ellipse(x, y, 4, 4, [pal.skinShade, pal.skin, pal.skin]);
  c.ellipse(x - 1, y - 3, 4, 2, [pal.hair, pal.hair, pal.hairLight]);
  c.rect(x - 4, y - 2, 2, 5, pal.hair);
  c.rect(x + 2, y - 1, 2, 1, pal.eye);
  c.set(x + 3, y + 2, pal.lips);
}

/** Éventail ouvert autour de `hand`, orienté vers `deg`. */
function fan(c, hand, deg) {
  for (let a = deg - 45; a <= deg + 45; a += 4) {
    const r = (a * Math.PI) / 180;
    c.line(hand, [hand[0] + Math.cos(r) * 7, hand[1] + Math.sin(r) * 7], 0, pal.fan);
  }
  for (const a of [deg - 40, deg, deg + 40]) {
    const r = (a * Math.PI) / 180;
    c.line(hand, [hand[0] + Math.cos(r) * 7, hand[1] + Math.sin(r) * 7], 0, pal.fanRib);
  }
}

export const human = {
  width: 48,
  height: 58,
  outline: '#0e080c',

  draw(c, pose, index) {
    const x = 22 + (pose.lean ?? 0);
    const ground = 56;
    const bob = pose.bob ?? 0;
    const chestY = 26 + bob;

    // Pattes d'araignée qui dépassent de l'ourlet, et bougent un peu.
    for (let i = 0; i < 3; i++) {
      const wiggle = (index + i) % 2;
      for (const side of [-1, 1]) {
        const root = [x + side * 4, ground - 4];
        c.line(root, [x + side * (9 + i * 3), ground - 8 - i * 2 + wiggle], 0.5, pal.leg);
        c.line([x + side * (9 + i * 3), ground - 8 - i * 2 + wiggle], [x + side * (12 + i * 3), ground], 0.5, pal.leg);
      }
    }
    // Kimono en cloche, motif de toile, obi cramoisi.
    const sway = pose.sway ?? 0;
    quad(c, [[x - 5, chestY], [x + 5, chestY]], [[x - 10 - sway, ground - 1], [x + 9 - sway, ground - 1]], pal.kimono, pal.kimonoShade);
    for (let r = 5; r < 22; r += 5) {
      for (let a = 200; a <= 340; a += 12) {
        const t = (a * Math.PI) / 180;
        const px = Math.round(x - 6 + Math.cos(t) * r);
        const py = Math.round(ground + Math.sin(t) * r);
        // Le motif ne sort pas du tissu.
        if (c.opaque(px, py)) c.set(px, py, pal.web);
      }
    }
    c.line([x - 6, ground], [x - 2, ground - 20], 0, pal.web);
    c.line([x - 6, ground], [x + 6, ground - 14], 0, pal.web);
    c.rect(x - 6, chestY + 7, 12, 3, pal.obi);
    c.line([x - 6, chestY + 7], [x + 5, chestY + 7], 0, pal.obiLight);
    c.line([x - 1, chestY], [x + 2, chestY + 6], 0, pal.obi);
    c.line([x + 4, chestY], [x + 2, chestY + 6], 0, pal.obi);

    head(c, x + 1 + (pose.headX ?? 0), chestY - 5 + (pose.headY ?? 0), 14);

    // Bras et éventail.
    const hand = [x + 4 + pose.hand[0], chestY + 3 + pose.hand[1]];
    if (pose.smear) smear(c, [x + 3, chestY + 2], 12, pose.smear[0], pose.smear[1], pal.smear, pal.smearLight);
    c.line([x + 3, chestY + 2], hand, 1, pal.kimonoLight);
    fan(c, hand, pose.fan);
    c.rect(hand[0] - 1, hand[1] - 1, 2, 2, pal.skin);
    if (pose.glow) {
      for (const [dx, dy] of [[-14, -6], [14, -8], [-12, 8], [15, 6]]) c.rect(x + dx, chestY + dy, 2, 2, pal.eye);
    }
  },

  animations: {
    idle: { duration: 0.3, poses: [0, 1, 1, 0].map((bob, i) => ({ bob, sway: i % 2, hand: [3, 2], fan: -60 })) },
    move: { duration: 0.14, poses: [0, 1, 2, 1].map((sway, i) => ({ lean: 1, bob: i % 2, sway, hand: [4, 2], fan: -50 })) },
    windup: {
      duration: 0.25,
      once: true,
      poses: [
        { lean: -1, hand: [-2, -8], fan: -120, sway: -1 },
        { lean: -2, hand: [-4, -10], fan: -140, sway: -1 },
      ],
    },
    strike: {
      once: true,
      poses: [
        { duration: 0.08, lean: 2, hand: [9, 0], fan: 0, smear: [-130, 0], sway: 1 },
        { duration: 0.4, lean: 2, hand: [8, 4], fan: 30, sway: 1 },
      ],
    },
    channel: {
      duration: 0.15,
      poses: [
        { hand: [2, -9], fan: -90, glow: true },
        { hand: [2, -10], fan: -95, glow: false, bob: -1 },
      ],
    },
    stunned: { duration: 0.3, poses: [{ lean: -1, bob: 2, headX: -1, headY: 2, hand: [2, 6], fan: 60 }, { lean: -1, bob: 2, headX: -1, headY: 3, hand: [2, 7], fan: 60 }] },
  },
};

export const spider = {
  width: 76,
  height: 56,
  outline: '#0e080c',

  draw(c, pose) {
    const x = 38 + (pose.lean ?? 0);
    const ground = 54;
    const bob = pose.bob ?? 0;
    const bodyY = 38 + bob;
    const gait = pose.gait ?? 0;
    const rear = pose.rear ?? 0;

    // Huit pattes : quatre par côté, les deux de devant peuvent se dresser.
    for (let i = 0; i < 4; i++) {
      const phase = (i % 2 === 0 ? 1 : -1) * gait;
      for (const side of [-1, 1]) {
        const front = side > 0 && i >= 2;
        const lift = front ? rear * (i - 1) : 0;
        const tuck = pose.tuck ? 0.5 : 1;
        const root = [x + side * 3, bodyY - 1];
        const knee = [x + side * (10 + i * 5) * tuck + phase, bodyY - 12 - (i === 1 || i === 2 ? 3 : 0) - lift];
        const foot = [x + side * (15 + i * 6) * tuck + phase, pose.tuck ? bodyY + 4 : ground - lift * 1.5];
        c.line(root, knee, 1, pal.leg);
        c.line(knee, foot, 0.6, pal.leg);
        c.set(knee[0], knee[1], pal.legJoint);
      }
    }
    // Abdomen dans le dos, marqué d'un losange cramoisi, et céphalothorax.
    const abdomen = [x - 11, bodyY - 3];
    c.ellipse(abdomen[0], abdomen[1], 12, 9, [pal.bodyShade, pal.body, pal.bodyLight]);
    c.line([abdomen[0] - 6, abdomen[1]], [abdomen[0], abdomen[1] - 5], 0, pal.mark);
    c.line([abdomen[0], abdomen[1] - 5], [abdomen[0] + 6, abdomen[1]], 0, pal.mark);
    c.line([abdomen[0] + 6, abdomen[1]], [abdomen[0], abdomen[1] + 5], 0, pal.mark);
    c.line([abdomen[0], abdomen[1] + 5], [abdomen[0] - 6, abdomen[1]], 0, pal.mark);
    for (const dx of [-6, -1, 4]) c.line([abdomen[0] + dx, abdomen[1] + 8], [abdomen[0] + dx + 1, abdomen[1] + 13], 0, pal.silk);
    c.ellipse(x + 3, bodyY, 7, 6, [pal.bodyShade, pal.body, pal.bodyLight]);

    // Buste de femme dressé sur le céphalothorax.
    const torso = [x + 5 + (pose.torsoX ?? 0), bodyY - 6 - rear];
    quad(c, [[torso[0] - 3, torso[1] - 10], [torso[0] + 3, torso[1] - 10]], [[torso[0] - 4, torso[1]], [torso[0] + 4, torso[1]]], pal.kimono, pal.kimonoShade);
    c.rect(torso[0] - 4, torso[1] - 4, 8, 2, pal.obi);
    head(c, torso[0] + 1, torso[1] - 14 + (pose.headY ?? 0), 12);
    if (pose.dazed) c.rect(torso[0] + 3, torso[1] - 15 + (pose.headY ?? 0), 2, 1, pal.skinShade);
    // Crochets pendant la morsure.
    if (pose.fangs) {
      c.line([x + 9, bodyY + 1], [x + 12, bodyY + 4], 0, pal.mark);
      c.line([x + 8, bodyY + 2], [x + 10, bodyY + 5], 0, pal.mark);
    }
    if (pose.smear) smear(c, [x + 6, bodyY - 2], 14, pose.smear[0], pose.smear[1], pal.smear, pal.smearLight);
  },

  animations: {
    idle: { duration: 0.3, poses: [{ bob: 0 }, { bob: 1 }] },
    move: { duration: 0.09, poses: [-2, 0, 2, 0].map((gait, i) => ({ gait, bob: i % 2 ? -1 : 0 })) },
    windup: { duration: 0.2, once: true, poses: [{ rear: 3, lean: -2, bob: 1 }, { rear: 5, lean: -3, bob: 1 }] },
    strike: {
      once: true,
      poses: [
        { duration: 0.08, lean: 4, rear: -1, fangs: true, smear: [-60, 60], torsoX: 2 },
        { duration: 0.45, lean: 2, fangs: true, torsoX: 1 },
      ],
    },
    dash: { duration: 0.06, poses: [-3, 3].map((gait) => ({ gait, lean: 3, bob: 1, torsoX: 2, rear: -1 })) },
    stunned: { duration: 0.3, poses: [{ dazed: true, bob: 3, headY: 2 }, { dazed: true, bob: 3, headY: 3, lean: 1 }] },
    airborne: { duration: 0.2, poses: [{ tuck: true, bob: -2 }, { tuck: true, bob: -3 }] },
  },
};
