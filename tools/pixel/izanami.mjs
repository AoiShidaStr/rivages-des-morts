// Izanami en pixel art, sous ses deux formes :
// - voilée : kimono blanc des morts croisé à droite, bandeau triangulaire, cheveux noirs qui cachent le visage,
//   l'ourlet qui se défait en brume ;
// - révélée : le même corps rongé par le Yomi, peau violacée, kimono déchiré et taché, yeux qui brûlent
//   sous les cheveux, et les huit dieux du tonnerre qui crépitent sur elle.
import { quad, smear } from './rig.mjs';

const pal = {
  kimono: '#ece7de',
  kimonoShade: '#bdb6a9',
  kimonoDark: '#8f887c',
  obi: '#8a93a8',
  obiLight: '#b7bfd0',
  skin: '#f1ebe6',
  skinShade: '#cfc4be',
  rot: '#8a7a96',
  rotShade: '#5e4f6b',
  stain: '#4a3a44',
  hair: '#141016',
  hairLight: '#2e2632',
  band: '#ffffff',
  eye: '#ffcf4a',
  mist: '#c9d2dc',
  bolt: '#fff4a8',
  boltShade: '#e8b93a',
  smear: '#8a93a8',
  smearLight: '#e8edf2',
};

/** Tête de face : cheveux longs tombant devant le visage ; révélée, deux yeux dorés percent au travers. */
function head(c, x, y, revealed) {
  c.line([x - 3, y - 2], [x - 6, y + 16], 2, pal.hair);
  c.line([x + 2, y], [x + 3, y + 14], 1.5, pal.hair);
  c.ellipse(x, y, 4, 4, revealed ? [pal.rotShade, pal.rot, pal.rot] : [pal.skinShade, pal.skin, pal.skin]);
  // Rideau de cheveux sur le visage, une mince fente entre les mèches.
  c.ellipse(x - 1, y - 2, 4.5, 3, [pal.hair, pal.hair, pal.hairLight]);
  c.rect(x - 4, y - 1, 3, 6, pal.hair);
  c.rect(x + 1, y - 1, 3, 6, pal.hair);
  if (revealed) {
    c.rect(x - 1, y, 1, 1, pal.eye);
    c.rect(x + 1, y + 1, 1, 1, pal.eye);
  } else {
    // Hitaikakushi : le petit triangle blanc des morts, sur le front.
    c.set(x, y - 4, pal.band);
    c.set(x - 1, y - 4, pal.band);
    c.set(x, y - 5, pal.band);
  }
}

/** Petit éclair en zigzag : l'un des huit dieux du tonnerre posés sur son corps. */
function bolt(c, x, y, flip) {
  const s = flip ? -1 : 1;
  c.line([x, y], [x + 2 * s, y + 2], 0, pal.bolt);
  c.line([x + 2 * s, y + 2], [x, y + 3], 0, pal.bolt);
  c.line([x, y + 3], [x + 2 * s, y + 5], 0, pal.boltShade);
}

function makeForm(revealed) {
  return {
    width: 52,
    height: 60,
    outline: '#120c14',

    draw(c, pose, index) {
      const x = 24 + (pose.lean ?? 0);
      const ground = 58;
      const bob = pose.bob ?? 0;
      const chestY = 26 + bob;
      const sway = pose.sway ?? 0;

      // Ourlet qui se défait en brume : elle ne marche pas, elle glisse.
      for (let i = 0; i < 7; i++) {
        const mx = x - 9 + i * 3 - sway;
        const my = ground - 1 + ((i + index) % 3);
        c.disc(mx, my, 1.5, pal.mist);
      }
      // Kimono des morts, croisé à droite (le pan droit par-dessus le gauche), en cloche.
      const cloth = revealed ? pal.kimonoShade : pal.kimono;
      quad(c, [[x - 5, chestY], [x + 5, chestY]], [[x - 10 - sway, ground - 2], [x + 9 - sway, ground - 2]], cloth, pal.kimonoDark);
      c.line([x + 4, chestY], [x - 3, chestY + 8], 0, pal.kimonoDark);
      c.line([x - 3, chestY + 8], [x - 5 - sway, ground - 3], 0, pal.kimonoDark);
      c.rect(x - 6, chestY + 8, 12, 3, pal.obi);
      c.line([x - 6, chestY + 8], [x + 5, chestY + 8], 0, pal.obiLight);
      if (revealed) {
        // Taches et déchirures : le Yomi a rongé le tissu.
        for (const [dx, dy, r] of [[-4, 16, 2], [3, 22, 1.5], [-6, 27, 1.5], [5, 13, 1]]) c.disc(x + dx - sway / 2, chestY + dy, r, pal.stain);
        for (let k = 0; k < 5; k++) c.set(x - 8 + k * 4 - sway, ground - 3 - (k % 2), pal.stain);
      }

      head(c, x + (pose.headX ?? 0), chestY - 5 + (pose.headY ?? 0), revealed);

      // Bras : longues manches, mains pâles (violacées une fois révélée).
      const hand = [x + 4 + pose.hand[0], chestY + 3 + pose.hand[1]];
      if (pose.smear) smear(c, [x + 3, chestY + 2], 13, pose.smear[0], pose.smear[1], pal.smear, pal.smearLight);
      c.line([x + 3, chestY + 2], hand, 1.5, cloth);
      c.disc(hand[0], hand[1], 1.2, revealed ? pal.rot : pal.skin);
      if (pose.hand2) {
        const hand2 = [x - 4 + pose.hand2[0], chestY + 3 + pose.hand2[1]];
        c.line([x - 3, chestY + 2], hand2, 1.5, pal.kimonoShade);
        c.disc(hand2[0], hand2[1], 1.2, revealed ? pal.rotShade : pal.skinShade);
      }

      // Révélée : les huit dieux du tonnerre (tête, poitrine, ventre, bras, jambes).
      if (revealed) {
        const flicker = (index + (pose.spark ?? 0)) % 2;
        const spots = [[1, -12], [-2, 4], [2, 12], [-5, 20], [4, 24], [-7, 30], [6, 30], [0, 18]];
        spots.forEach(([dx, dy], i) => {
          if ((i + flicker) % 2 === 0 || pose.spark) bolt(c, x + dx, chestY + dy, i % 2 === 0);
        });
      }
    },

    animations: {
      idle: { duration: 0.32, poses: [0, 1, 1, 0].map((bob, i) => ({ bob, sway: i % 2, hand: [2, 6], hand2: [-1, 6] })) },
      move: { duration: 0.16, poses: [0, 1, 2, 1].map((sway, i) => ({ lean: 1, bob: i % 2, sway, hand: [4, 3], hand2: [1, 5] })) },
      windup: {
        duration: 0.25,
        once: true,
        poses: [
          { lean: -1, hand: [-1, -9], hand2: [-3, -8], sway: -1, spark: 1 },
          { lean: -2, hand: [-2, -11], hand2: [-4, -10], sway: -1, spark: 1 },
        ],
      },
      strike: {
        once: true,
        poses: [
          { duration: 0.08, lean: 3, hand: [10, 1], hand2: [7, 3], smear: [-130, 10], sway: 1 },
          { duration: 0.4, lean: 2, hand: [9, 4], hand2: [6, 5], sway: 1 },
        ],
      },
      channel: {
        duration: 0.14,
        poses: [
          { hand: [1, -10], hand2: [-3, -10], spark: 1, bob: -1 },
          { hand: [1, -11], hand2: [-3, -11], bob: -2 },
        ],
      },
      dash: { duration: 0.07, poses: [2, 3].map((lean) => ({ lean, bob: -1, sway: 2, hand: [10, 0], hand2: [8, 2], spark: 1 })) },
      stunned: {
        duration: 0.3,
        poses: [
          { lean: -1, bob: 3, headX: -1, headY: 2, hand: [1, 8], hand2: [-2, 8] },
          { lean: -1, bob: 3, headX: -1, headY: 3, hand: [1, 9], hand2: [-2, 9] },
        ],
      },
    },
  };
}

export const veiled = makeForm(false);
export const revealed = makeForm(true);
