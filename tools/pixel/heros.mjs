// Le héros en pixel art, décliné par race (tête, peau, tenue) et par classe (arme, cape, animations).
// Proportions trapues (grosse tête, grosses mains) pour rester dans la DA des yokai.
// `hero()` sans argument donne l'Einherjar guerrier historique : fantôme de viking, nodachi à deux mains.
import { add, blade, dir, limb, quad, smear } from './rig.mjs';

// --- Races : tête, torse et couleurs du corps ---------------------------------

const RACES = {
  // Fantôme de viking : peau d'esprit cyan, casque rond à nasal, barbe tressée, mantelet de fourrure.
  einherjar: {
    pal: {
      skin: '#9fe6ec',
      skinShade: '#63b9c6',
      pants: '#4e5b68',
      pantsShade: '#3a4550',
      boot: '#3d2f27',
      bracer: '#6b4a30',
    },
    keys: {
      I: '#c1cbd1',
      H: '#7f8c96',
      h: '#56616b',
      S: '#9fe6ec',
      s: '#63b9c6',
      e: '#ffffff',
      p: '#1d2a3a',
      B: '#f1f7f6',
      b: '#b9ced3',
      F: '#b3b6b1',
      f: '#80867f',
      J: '#8a5a38',
      j: '#654026',
      L: '#3d2b1f',
      G: '#e3b85a',
      T: '#4e5b68',
    },
    head: [
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
    ],
    torso: [
      '.FFFFFFFFF.',
      'FFfFFFFfFFF',
      'fFFfFFFfFFf',
      '.fJJJJJJJf.',
      '..JJJjJJJ..',
      '..JJJjJJJ..',
      '..LLLGLLL..',
      '..JJjJjJJ..',
      '..TTTTTTT..',
    ],
  },
  // Statuette funéraire animée : argile cuite, némès rayé bleu et or, fausse barbe, collier ousekh, pagne blanc.
  oushebti: {
    pal: {
      skin: '#cf8352',
      skinShade: '#9c5a33',
      pants: '#cf8352',
      pantsShade: '#9c5a33',
      boot: '#6b4a2c',
      bracer: '#e3b85a',
    },
    keys: {
      N: '#2f5fa8',
      n: '#e3b85a',
      d: '#1f3f73',
      S: '#cf8352',
      s: '#9c5a33',
      k: '#1a1414',
      e: '#ffffff',
      p: '#1d2a3a',
      D: '#2a2a44',
      C: '#3fb5a8',
      c: '#e3b85a',
      G: '#e3b85a',
      K: '#efe9d8',
      w: '#cfc6ad',
    },
    head: [
      '...NnNnNn...',
      '..NnNnNnNn..',
      '.NnNnNnNnNN.',
      '.dNnNnNccccc',
      '.dNnNnsSSSS.',
      'dNnNnNsSkkS.',
      'dNnNnNsSeeS.',
      'dNnNnNsSepSS',
      'dNnNnNsSSSS.',
      'dNnNn.sSSSs.',
      'dNnN...sSDD.',
      'dNn.....DD..',
      'dN......D...',
    ],
    torso: [
      '.CcCcCcCcC.',
      'cCcCcCcCcCc',
      '.cCcCcCcCc.',
      '..SSSSSSS..',
      '..SSSsSSS..',
      '..sSSsSSs..',
      '..GGGGGGG..',
      '..KKwKKwK..',
      '..KKKKKKK..',
    ],
  },
  // Enfant d'un dieu : peau hâlée, boucles brunes ceintes de laurier, chiton blanc et écharpe pourpre.
  'demi-dieu': {
    pal: {
      skin: '#e3ae7c',
      skinShade: '#b27c52',
      pants: '#e3ae7c',
      pantsShade: '#b27c52',
      boot: '#b8863b',
      bracer: '#c9973f',
    },
    keys: {
      C: '#4a3223',
      c: '#2f1f16',
      L: '#7fae4a',
      l: '#4f7a2c',
      g: '#e3c05a',
      S: '#e3ae7c',
      s: '#b27c52',
      e: '#ffffff',
      p: '#2a1d14',
      W: '#f1ece0',
      w: '#cfc7b3',
      R: '#a8302a',
      B: '#b8863b',
      G: '#e3c05a',
    },
    head: [
      '...cCcCc....',
      '..cCCcCCcc..',
      '.cCcCcCcCCc.',
      '.LgLlLgLlLg.',
      '.cCcCsSSSSS.',
      '.cCcsSSSSSS.',
      '.cCcsSSSSeeS',
      '.cCcsSSSSepS',
      '..cCsSSSSSSS',
      '...csSSSSSS.',
      '....sSSSSSs.',
      '.....sSSSs..',
      '......sss...',
    ],
    torso: [
      '.WWWWWRRWW.',
      'WWWWWRRWWWW',
      'wWWWRRWWWWw',
      '.wWRRWWWWw.',
      '..RRWWwWW..',
      '..WWWwWWW..',
      '..BBBGBBB..',
      '..WWwWwWW..',
      '..WWWWWWW..',
    ],
  },
  // Mi-humain, mi-yokai : peau pâle et mauve, longs cheveux blancs, petites cornes d'oni rouges, kimono indigo.
  hanyo: {
    pal: {
      skin: '#eadff2',
      skinShade: '#b7a6cf',
      pants: '#4a3a66',
      pantsShade: '#352a4a',
      boot: '#e8e2d0',
      bracer: '#2e3558',
    },
    keys: {
      A: '#c8412f',
      a: '#f0c89a',
      W: '#f6f6fa',
      w: '#c4c4d8',
      S: '#eadff2',
      s: '#b7a6cf',
      e: '#ffffff',
      p: '#b0202e',
      m: '#c8412f',
      K: '#2e3558',
      k: '#1f2440',
      Z: '#f1ece0',
      R: '#c8412f',
      H: '#4a3a66',
    },
    head: [
      '......a..a..',
      '..wWWWWAWA..',
      '.wWWWWWWWWW.',
      '.wWWWWWWWWWW',
      'wWWWWWsSSSSW',
      'wWWWWsSSmSS.',
      'wWWWWsSSeeS.',
      'wWWWwsSSepSS',
      'wWWWwsSSSSS.',
      'wWWw.sSSSSs.',
      'wWWw..sSSs..',
      'wWw....ss...',
      'ww..........',
    ],
    torso: [
      '.KKKKKKKKK.',
      'KKKkZZkKKKK',
      'kKKKKZZKKKk',
      '.kKKKKZKKk.',
      '..KKKKZKK..',
      '..KKKkKKK..',
      '..RRRRRRR..',
      '..KKkKkKK..',
      '..HHHHHHH..',
    ],
  },
};
const HEAD_ANCHOR = [6, 12]; // bas de la tête, au niveau du cou
const TORSO_ANCHOR = [5, 8]; // milieu du bas, aux hanches

// --- Armes --------------------------------------------------------------------

const STEEL = { blade: '#eef4f7', bladeShade: '#9eacb6', guard: '#d9ad4a', wrap: '#8e2f2a' };
const WOOD = '#7a5a34';
const WOOD_DARK = '#54391f';
const GOLD = '#e3b85a';

/** Bâton à anneaux de l'onmyōji (shakujō), tenu d'une main : grelots au bout. */
function staff(c, hand, deg) {
  const [ux, uy] = dir(deg);
  c.line([hand[0] - ux * 7, hand[1] - uy * 7], [hand[0] + ux * 12, hand[1] + uy * 12], 0, WOOD);
  const top = [hand[0] + ux * 14, hand[1] + uy * 14];
  // L'anneau : un cercle d'or ouvert, et deux grelots qui pendent de part et d'autre.
  for (let a = 0; a < 360; a += 30) c.set(top[0] + Math.cos((a * Math.PI) / 180) * 2.2, top[1] + Math.sin((a * Math.PI) / 180) * 2.2, GOLD);
  c.set(top[0] - uy * 2.5, top[1] + ux * 2.5 + 1, '#fff2b0');
  c.set(top[0] + uy * 2.5, top[1] - ux * 2.5 + 1, '#fff2b0');
  // Une bande de papier ofuda nouée sous l'anneau.
  c.line([hand[0] + ux * 10, hand[1] + uy * 10], [hand[0] + ux * 10 - uy * 0.5, hand[1] + uy * 10 + 3], 0, '#f4efe2');
}

/** Kunai : anneau au pommeau, poignée gainée de rouge, lame en losange épaisse de deux pixels à la base. */
function kunai(c, hand, deg) {
  const [ux, uy] = dir(deg);
  c.set(hand[0] - ux * 3, hand[1] - uy * 3, GOLD);
  c.line([hand[0] - ux * 2, hand[1] - uy * 2], hand, 0, STEEL.wrap);
  c.line([hand[0] + ux, hand[1] + uy], [hand[0] + ux * 8, hand[1] + uy * 8], 0, STEEL.blade);
  c.line([hand[0] + ux - uy, hand[1] + uy + ux], [hand[0] + ux * 5 - uy, hand[1] + uy * 5 + ux], 0, STEEL.bladeShade);
}

/** Écharpe nouée au cou, dont le pan flotte derrière (Lame). */
function scarf(c, [x, y], sway) {
  c.line([x - 3, y], [x + 3, y], 0.6, '#8e2f3a');
  c.line([x - 3, y], [x - 7 - sway, y + 2 + Math.floor(sway / 2)], 0.6, '#5e1f28');
}

/** Naginata : long manche laqué, lame courbe au bout. */
function naginata(c, hand, deg) {
  const [ux, uy] = dir(deg);
  c.line([hand[0] - ux * 8, hand[1] - uy * 8], [hand[0] + ux * 13, hand[1] + uy * 13], 0, '#7a2a22');
  c.set(hand[0] + ux * 13, hand[1] + uy * 13, STEEL.guard);
  // La lame se cambre vers le dos : son milieu est décalé d'un pixel.
  const base = [hand[0] + ux * 14, hand[1] + uy * 14];
  const mid = [hand[0] + ux * 17 - uy, hand[1] + uy * 17 + ux];
  const tip = [hand[0] + ux * 20 - uy * 0.5, hand[1] + uy * 20 + ux * 0.5];
  c.line(base, mid, 0, STEEL.blade);
  c.line(mid, tip, 0, STEEL.blade);
  c.line([base[0] + uy, base[1] - ux], [mid[0] + uy * 0.5, mid[1] - ux * 0.5], 0, STEEL.bladeShade);
}

/** Bouclier rond du temple : cerclage de bronze sombre, face dorée, soleil rouge au centre. */
function shield(c, [x, y]) {
  c.disc(x, y, 4, '#7a5a26');
  c.disc(x, y, 3, '#d9a93f');
  c.disc(x, y, 1.2, '#c8412f');
  c.set(x - 1, y - 2, '#fff2b0');
  c.set(x - 2, y - 1, '#f3d88a');
}

/**
 * Arc (yumi) tenu à `hand`, tiré vers `deg` : ses branches se courbent vers l'avant, la corde va de
 * bout en bout, ou jusqu'à la main arrière quand on bande l'arc (`nock`).
 */
function bow(c, hand, deg, nock) {
  const [ux, uy] = dir(deg);
  const [px, py] = [-uy, ux];
  const half = 9;
  const tipA = [hand[0] - px * half, hand[1] - py * half];
  const tipB = [hand[0] + px * half * 0.8, hand[1] + py * half * 0.8];
  let prev = tipA;
  for (let i = 1; i <= 12; i++) {
    const t = -1 + (i / 12) * 1.8;
    const bulge = 2.2 * (1 - t * t);
    const pt = [hand[0] + px * half * t + ux * bulge, hand[1] + py * half * t + uy * bulge];
    c.line(prev, pt, 0, i === 6 ? '#2b1d12' : WOOD);
    prev = pt;
  }
  const string = '#f4efe2';
  if (nock) {
    c.line(tipA, nock, 0, string);
    c.line(tipB, nock, 0, string);
    // La flèche encochée, de la main arrière jusqu'au-delà de l'arc.
    c.line(nock, [hand[0] + ux * 4, hand[1] + uy * 4], 0, '#c9a36a');
    c.set(hand[0] + ux * 5, hand[1] + uy * 5, '#d9dde0');
  } else {
    c.line(tipA, tipB, 0, string);
  }
}

/** Carquois dans le dos, les empennages dépassant de l'épaule. */
function quiver(c, [x, y]) {
  c.line([x, y], [x - 3, y + 7], 1, '#6b4a2c');
  c.set(x + 1, y - 2, '#f4efe2');
  c.set(x - 1, y - 2, '#c8412f');
  c.set(x, y - 3, '#f4efe2');
}

// --- Classes : cape, arme, prise en main et animations -------------------------

/** Animations d'arme de mêlée : celles du nodachi historique. `blade` est l'angle de l'arme. */
const MELEE = {
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
    poses: [{ lean: -1, body: [0, 1], footF: [4, 9], footB: [-5, 9], hand: [4, 1], blade: -85, cape: 1 }],
  },
  dash: {
    duration: 0.09,
    poses: [
      { lean: 3, body: [0, 1], footF: [5, 8], footB: [-7, 8], hand: [3, 5], blade: 160, cape: 5 },
      { lean: 3, body: [0, 0], footF: [3, 9], footB: [-6, 7], hand: [3, 5], blade: 165, cape: 6 },
    ],
  },
};

/** Remplace des champs dans toutes les poses d'une animation. */
const withPoses = (anim, extra) => ({ ...anim, poses: anim.poses.map((p, i) => ({ ...p, ...(typeof extra === 'function' ? extra(p, i) : extra) })) });

/** Le Rôdeur ne frappe pas : il bande l'arc (windup, channel pour le tir chargé) et lâche la flèche (strike). */
const RANGED = {
  idle: withPoses(MELEE.idle, (p) => ({ hand: [4, 3], blade: 5 + (p.blade + 40), handB: [0, 6] })),
  move: withPoses(MELEE.move, { hand: [4, 2], blade: 10, handB: [0, 6] }),
  windup: {
    duration: 0.05,
    once: true,
    poses: [
      { lean: -1, footF: [4, 10], footB: [-4, 10], hand: [6, 0], blade: 0, handB: [1, 1], draw: true, cape: 1 },
      { lean: -1, body: [0, 1], footF: [4, 9], footB: [-5, 9], hand: [7, 0], blade: 0, handB: [-1, 0], draw: true, cape: 1 },
    ],
  },
  strike: {
    once: true,
    poses: [
      { duration: 0.06, lean: 1, footF: [5, 10], footB: [-4, 10], hand: [7, 0], blade: 0, handB: [-2, 1], cape: 2 },
      { duration: 0.2, lean: 0, footF: [5, 10], footB: [-4, 10], hand: [6, 1], blade: 0, handB: [0, 3], cape: 2 },
    ],
  },
  channel: {
    duration: 0.12,
    poses: [0, 1].map((i) => ({ lean: -1, body: [0, 1], footF: [4, 9], footB: [-5, 9], hand: [7, 0], blade: -2 + i, handB: [-2, 0], draw: true, cape: 1 })),
  },
  dash: withPoses(MELEE.dash, { hand: [2, 5], blade: 40, handB: [0, 6] }),
};

const KITS = {
  // Nodachi à deux mains : la main arrière tient la poignée derrière la main avant.
  guerrier: {
    cloak: ['#5f6f78', '#45535c'],
    twoHanded: true,
    weapon: (c, hand, pose) => blade(c, hand, pose.blade, 19, STEEL),
    smear: 19,
    animations: MELEE,
  },
  // Shakujō d'une main, cape bleu esprit.
  invocateur: {
    cloak: ['#8fa3d9', '#62739f'],
    restHandB: [0, 6],
    weapon: (c, hand, pose) => staff(c, hand, pose.blade),
    smear: 14,
    animations: MELEE,
  },
  // Deux kunai : un dans chaque main, celui de derrière tenu à l'envers. Cape d'ombre, écharpe rouge.
  lame: {
    cloak: ['#3b2f4d', '#271f33'],
    restHandB: [-2, 6],
    scarf: true,
    back: (c, hand) => kunai(c, hand, 115),
    weapon: (c, hand, pose) => kunai(c, hand, pose.blade),
    smear: 7,
    animations: MELEE,
  },
  // Naginata d'une main, bouclier au bras arrière : levé devant soi en garde. Cape blanche du temple.
  paladin: {
    cloak: ['#eee6d0', '#c4b690'],
    restHandB: [3, 4],
    shield: true,
    weapon: (c, hand, pose) => naginata(c, hand, pose.blade),
    smear: 19,
    animations: { ...MELEE, guard: { duration: 0.3, poses: [{ lean: -1, body: [0, 1], footF: [4, 9], footB: [-5, 9], hand: [1, 3], handB: [6, -1], blade: -100, cape: 1 }] } },
  },
  // Arc et carquois, cape verte de chasseur.
  rodeur: {
    cloak: ['#4f6b3a', '#3a4f2a'],
    restHandB: [0, 6],
    quiver: true,
    weapon: (c, hand, pose, handB) => bow(c, hand, pose.blade, pose.draw ? handB : null),
    animations: RANGED,
  },
};

export const RACE_IDS = Object.keys(RACES);
export const KIT_IDS = Object.keys(KITS);

const THIGH = 5;
const SHIN = 5;
const UPPER_ARM = 4;
const FOREARM = 4;

export function hero(raceId = 'einherjar', kitId = 'guerrier') {
  const race = RACES[raceId];
  const kit = KITS[kitId];
  if (!race || !kit) throw new Error(`Héros inconnu : ${raceId} ${kitId}`);
  const pal = race.pal;
  const [cloak, cloakShade] = kit.cloak;
  return {
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
      // À deux mains, la main arrière est juste derrière la main avant, sur la poignée.
      const [bx, by] = dir(pose.blade);
      const handB = pose.handB
        ? add(shoulderB, pose.handB)
        : kit.twoHanded
          ? [handF[0] - bx * 2.5, handF[1] - by * 2.5]
          : add(shoulderB, kit.restHandB);

      // Cape, derrière tout le reste ; `cape` la fait flotter vers l'arrière.
      const sway = pose.cape ?? 0;
      quad(
        c,
        [[chest[0] - 5, chest[1] - 1], [chest[0] + 1, chest[1] - 1]],
        [[hip[0] - 7 - sway, hip[1] + 6 - Math.floor(sway / 2)], [hip[0] - 1, hip[1] + 6]],
        cloak,
        cloakShade,
      );
      if (kit.quiver) quiver(c, [chest[0] - 3, chest[1] - 1]);

      // Bras et jambe arrière, plus sombres pour la profondeur.
      limb(c, shoulderB, handB, [UPPER_ARM, FOREARM], -1, 1, [pal.skinShade, pal.skinShade]);
      c.disc(handB[0], handB[1], 1.2, pal.skinShade);
      kit.back?.(c, handB);
      const footB = add(hip, pose.footB);
      limb(c, [hip[0] - 1, hip[1]], footB, [THIGH, SHIN], 1, 1.2, [pal.pantsShade, pal.boot]);
      foot(c, footB, pal.boot);

      const footF = add(hip, pose.footF);
      limb(c, [hip[0] + 1, hip[1]], footF, [THIGH, SHIN], 1, 1.2, [pal.pants, pal.boot]);
      foot(c, footF, pal.boot);

      c.stamp(race.torso, race.keys, chest[0], hip[1], TORSO_ANCHOR);
      c.stamp(race.head, race.keys, chest[0] + 1 + (pose.head ?? 0), chest[1] + 1, HEAD_ANCHOR);
      if (kit.scarf) scarf(c, [chest[0] + 1, chest[1] + 1], sway);
      if (kit.shield) shield(c, handB);

      // La traînée du coup suit le bout de l'arme.
      if (pose.smear && kit.smear) {
        const [from, to] = pose.smear;
        smear(c, shoulderF, kit.smear + 2, from, to, '#cdf6ff', '#ffffff');
      }
      kit.weapon(c, handF, pose, handB);
      limb(c, shoulderF, handF, [UPPER_ARM, FOREARM], -1, 1, [pal.skin, pal.bracer]);
      c.disc(handF[0], handF[1], 1.3, pal.skin);
    },

    // Les noms d'animation sont ceux des postures du jeu (src/game/types.ts, type Pose).
    animations: kit.animations,
  };
}

export default hero();

/** Pied tourné vers la droite, posé au sol. */
function foot(c, [x, y], color) {
  c.line([x - 1, y], [x + 2, y], 0, color);
}
