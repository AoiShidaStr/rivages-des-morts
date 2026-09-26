// Le héros en pixel art, décliné par race (tête, peau, tenue), par classe (cape, animations) et selon
// l'équipement porté (arme, casque, plastron, jambières, bottes, amulette), comme un personnage de Wakfu.
// Proportions trapues (grosse tête, grosses mains) pour rester dans la DA des yokai.
// `hero()` sans argument donne l'Einherjar guerrier historique : fantôme de viking, nodachi à deux mains.
// Le jeu le dessine à la volée (src/render/pixelHero.ts) ; `npm run pixel` en garde une planche de référence.
import ANIMATIONS from './heros-animations.json' with { type: 'json' };
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


// --- Armes : une par objet de l'emplacement « arme » (src/data/items.json) ------------------------

const STEEL = { blade: '#eef4f7', bladeShade: '#9eacb6', guard: '#d9ad4a', wrap: '#8e2f2a' };
const WOOD = '#7a5a34';
const WOOD_DARK = '#54391f';
const GOLD = '#e3b85a';
const IRON = '#4a4e5a';
const IRON_LIGHT = '#b8c0c6';
const BRONZE = '#8a6a2a';
const BRONZE_LIGHT = '#c9973f';

/** Point à `d` pixels de `hand` dans la direction `deg`, décalé de `side` pixels sur le côté. */
function at(hand, deg, d, side = 0) {
  const [ux, uy] = dir(deg);
  return [hand[0] + ux * d - uy * side, hand[1] + uy * d + ux * side];
}

/** Bâton à anneaux de l'onmyōji (shakujō), tenu d'une main : grelots au bout. */
function staff(c, hand, deg) {
  c.line(at(hand, deg, -7), at(hand, deg, 12), 0, WOOD);
  const top = at(hand, deg, 14);
  const [ux, uy] = dir(deg);
  // L'anneau : un cercle d'or ouvert, et deux grelots qui pendent de part et d'autre.
  for (let a = 0; a < 360; a += 30) c.set(top[0] + Math.cos((a * Math.PI) / 180) * 2.2, top[1] + Math.sin((a * Math.PI) / 180) * 2.2, GOLD);
  c.set(top[0] - uy * 2.5, top[1] + ux * 2.5 + 1, '#fff2b0');
  c.set(top[0] + uy * 2.5, top[1] - ux * 2.5 + 1, '#fff2b0');
  // Une bande de papier ofuda nouée sous l'anneau.
  const paper = at(hand, deg, 10);
  c.line(paper, [paper[0] - uy * 0.5, paper[1] + 3], 0, '#f4efe2');
}

/** Éventail de soie de la Jorōgumo, ouvert en demi-cercle autour de la main, nervures claires. */
function fan(c, hand, deg) {
  for (let r = 2; r <= 7; r++) {
    for (let a = -60; a <= 60; a += 6) {
      const band = Math.floor((a + 60) / 20) % 2;
      c.set(...at(hand, deg + a, r), r === 7 ? '#e0554a' : band ? '#3a2230' : '#5a2a3a');
    }
  }
  for (let a = -60; a <= 60; a += 20) c.line(hand, at(hand, deg + a, 7), 0, '#d9dde6');
  c.set(hand[0], hand[1], GOLD);
}

/** Kunai : anneau au pommeau, poignée gainée de rouge, lame en losange. */
function kunai(c, hand, deg) {
  c.set(...at(hand, deg, -3), GOLD);
  c.line(at(hand, deg, -2), hand, 0, STEEL.wrap);
  c.line(at(hand, deg, 1), at(hand, deg, 8), 0, STEEL.blade);
  c.line(at(hand, deg, 1, 1), at(hand, deg, 5, 1), 0, STEEL.bladeShade);
}

/** Croc de la Jorōgumo : poignée de soie blanche, croc d'ivoire recourbé à la pointe violette de venin. */
function fang(c, hand, deg) {
  c.line(at(hand, deg, -2), hand, 0, '#dfe6ee');
  for (let i = 1; i <= 8; i++) {
    const t = i / 8;
    const p = at(hand, deg, i, -Math.sin(t * 2.2) * 2);
    c.set(p[0], p[1], t > 0.7 ? '#8b3fa8' : '#efe6d2');
    if (t < 0.6) c.set(...at(hand, deg, i, -Math.sin(t * 2.2) * 2 + 1), '#c9bfa6');
  }
}

/** Kusarigama : manche court, faucille perpendiculaire au bout ; la chaîne rejoint le poids dans l'autre main. */
function kusarigama(c, hand, deg, handB) {
  c.line(at(hand, deg, -2), at(hand, deg, 5), 0, WOOD);
  const top = at(hand, deg, 5);
  for (let i = 0; i <= 5; i++) c.set(...at(top, deg + 90 + i * 8, i, 0), i < 2 ? STEEL.bladeShade : STEEL.blade);
  if (handB) {
    const from = at(hand, deg, -2);
    const steps = Math.ceil(Math.hypot(handB[0] - from[0], handB[1] - from[1]));
    // La chaîne pend un peu entre les deux mains.
    for (let i = 1; i < steps; i += 2) {
      const t = i / steps;
      c.set(from[0] + (handB[0] - from[0]) * t, from[1] + (handB[1] - from[1]) * t + Math.sin(t * Math.PI) * 3, '#8a8f96');
    }
    c.disc(handB[0], handB[1] + 1, 1, '#3a3d44');
  }
}

/** Kanabō : grosse massue de fer cloutée, poignée gainée de rouge. */
function kanabo(c, hand, deg) {
  c.line(at(hand, deg, -3), at(hand, deg, 1), 0, STEEL.wrap);
  c.line(at(hand, deg, 2), at(hand, deg, 15), 1, IRON);
  c.line(at(hand, deg, 3, -1), at(hand, deg, 14, -1), 0, '#6b707c');
  for (let d = 5; d <= 14; d += 3) c.set(...at(hand, deg, d, d % 2 ? 1.5 : -1.5), IRON_LIGHT);
}

/** Tetsubō : longue barre de fer cloutée, tenue d'une main. */
function tetsubo(c, hand, deg) {
  c.line(at(hand, deg, -5), at(hand, deg, 16), 0.6, IRON);
  for (let d = 4; d <= 16; d += 3) c.set(...at(hand, deg, d, d % 2 ? 1 : -1), IRON_LIGHT);
}

/** Naginata : long manche laqué, lame courbe au bout. */
function naginata(c, hand, deg) {
  c.line(at(hand, deg, -8), at(hand, deg, 13), 0, '#7a2a22');
  c.set(...at(hand, deg, 13), STEEL.guard);
  // La lame se cambre vers le dos : son milieu est décalé d'un pixel.
  const base = at(hand, deg, 14);
  const mid = at(hand, deg, 17, -1);
  const tip = at(hand, deg, 20, -0.5);
  c.line(base, mid, 0, STEEL.blade);
  c.line(mid, tip, 0, STEEL.blade);
  c.line(at(hand, deg, 14, 1), at(hand, deg, 17, -0.5), 0, STEEL.bladeShade);
}

/** Miroir de Yata : miroir octogonal de bronze à la face claire, tenu devant soi. */
function mirror(c, hand, deg) {
  const center = at(hand, deg, 3);
  c.disc(center[0], center[1], 3.4, BRONZE);
  c.disc(center[0], center[1], 2.4, '#dfe9ef');
  c.disc(center[0], center[1], 1.2, '#f4fbff');
  c.set(center[0] - 1, center[1] - 1, '#ffffff');
  c.line(hand, at(hand, deg, 1), 0, '#c8412f');
}

/** Bouclier rond du temple : cerclage de bronze sombre, face dorée, soleil rouge au centre. */
function roundShield(c, [x, y]) {
  c.disc(x, y, 4, '#7a5a26');
  c.disc(x, y, 3, '#d9a93f');
  c.disc(x, y, 1.2, '#c8412f');
  c.set(x - 1, y - 2, '#fff2b0');
  c.set(x - 2, y - 1, '#f3d88a');
}

/** Cloche de temple fendue, portée au bras comme un bouclier. */
function bellShield(c, [x, y]) {
  quad(c, [[x - 2, y - 4], [x + 2, y - 4]], [[x - 4, y + 4], [x + 4, y + 4]], BRONZE_LIGHT, BRONZE);
  c.line([x - 4, y + 4], [x + 4, y + 4], 0, BRONZE);
  c.line([x - 1, y - 5], [x + 1, y - 5], 0, '#5a4a20');
  c.line([x + 1, y - 3], [x - 1, y + 3], 0, '#5a4a20');
  c.set(x + 2, y - 1, '#f3d88a');
}

/**
 * Arc tenu à `hand`, tiré vers `deg` : ses branches se courbent vers l'avant, la corde va de bout en bout,
 * ou jusqu'à la main arrière quand on bande l'arc (`nock`).
 */
function bow(c, hand, deg, nock, { half = 9, wood = WOOD, grip = '#2b1d12', string = '#f4efe2', silk = false } = {}) {
  const [ux, uy] = dir(deg);
  const [px, py] = [-uy, ux];
  const tipA = [hand[0] - px * half, hand[1] - py * half];
  const tipB = [hand[0] + px * half * 0.8, hand[1] + py * half * 0.8];
  let prev = tipA;
  for (let i = 1; i <= 12; i++) {
    const t = -1 + (i / 12) * 1.8;
    const bulge = (half / 4) * (1 - t * t);
    const pt = [hand[0] + px * half * t + ux * bulge, hand[1] + py * half * t + uy * bulge];
    c.line(prev, pt, 0, i === 6 ? grip : wood);
    prev = pt;
  }
  if (nock) {
    c.line(tipA, nock, 0, string);
    c.line(tipB, nock, 0, string);
    // La flèche encochée, de la main arrière jusqu'au-delà de l'arc.
    c.line(nock, [hand[0] + ux * 4, hand[1] + uy * 4], 0, '#c9a36a');
    c.set(hand[0] + ux * 5, hand[1] + uy * 5, '#d9dde0');
  } else {
    c.line(tipA, tipB, 0, string);
  }
  // Fils de soie qui collent encore à l'arc de la Jorōgumo.
  if (silk) {
    c.set(hand[0] - px * 3 + ux, hand[1] - py * 3 + uy, '#ffffff');
    c.set(hand[0] + px * 3 + ux * 2, hand[1] + py * 3 + uy * 2, '#c9d2dc');
  }
}

/** Carquois dans le dos, les empennages dépassant de l'épaule. */
function quiver(c, [x, y]) {
  c.line([x, y], [x - 3, y + 7], 1, '#6b4a2c');
  c.set(x + 1, y - 2, '#f4efe2');
  c.set(x - 1, y - 2, '#c8412f');
  c.set(x, y - 3, '#f4efe2');
}

/**
 * Dessin de chaque arme. `draw` la dessine dans la main avant ; `back` dans la main arrière (seconde lame),
 * `shield` au bras arrière. `twoHanded` : la main arrière tient la poignée derrière la main avant.
 * `smear` : longueur de la traînée du coup (0 : pas de traînée, pour les arcs).
 */
export const WEAPONS = {
  nodachi: { twoHanded: true, smear: 19, draw: (c, hand, pose) => blade(c, hand, pose.blade, 19, STEEL) },
  'katana-ronin': {
    twoHanded: true,
    smear: 15,
    draw: (c, hand, pose) => {
      blade(c, hand, pose.blade, 15, { ...STEEL, guard: '#3a3440', wrap: '#1d1a1c' });
      c.set(...at(hand, pose.blade, -3, 1), '#c8412f');
    },
  },
  kanabo: { twoHanded: true, smear: 16, draw: (c, hand, pose) => kanabo(c, hand, pose.blade) },
  'grelots-onmyoji': { smear: 14, draw: (c, hand, pose) => staff(c, hand, pose.blade) },
  'eventail-jorogumo': { smear: 9, draw: (c, hand, pose) => fan(c, hand, pose.blade) },
  'kunai-jumeaux': { smear: 7, draw: (c, hand, pose) => kunai(c, hand, pose.blade), back: (c, hand) => kunai(c, hand, 115) },
  'crocs-jorogumo': { smear: 8, draw: (c, hand, pose) => fang(c, hand, pose.blade), back: (c, hand) => fang(c, hand, 115) },
  kusarigama: { smear: 8, draw: (c, hand, pose, handB) => kusarigama(c, hand, pose.blade, handB) },
  'naginata-temple': { smear: 19, shield: roundShield, draw: (c, hand, pose) => naginata(c, hand, pose.blade) },
  'tetsubo-cloche': { smear: 16, shield: bellShield, draw: (c, hand, pose) => tetsubo(c, hand, pose.blade) },
  'miroir-yata': { smear: 8, draw: (c, hand, pose) => mirror(c, hand, pose.blade) },
  'yumi-bambou': { smear: 0, draw: (c, hand, pose, handB) => bow(c, hand, pose.blade, pose.draw ? handB : null) },
  hankyu: {
    smear: 0,
    draw: (c, hand, pose, handB) => bow(c, hand, pose.blade, pose.draw ? handB : null, { half: 7, wood: WOOD_DARK, grip: '#c8412f' }),
  },
  'arc-soie': {
    smear: 0,
    draw: (c, hand, pose, handB) =>
      bow(c, hand, pose.blade, pose.draw ? handB : null, { wood: '#2b2330', grip: '#5a2a3a', string: '#ffffff', silk: true }),
  },
};

// --- Équipement porté : casque, plastron, jambières, bottes, amulette -----------------------------

/**
 * Casques : une pièce posée sur la tête. `at` place le coin haut gauche de la pièce par rapport à celui
 * de la tête (12 × 13 pixels, visage vers la droite).
 */
const HELMETS = {
  // Chapeau conique de paille, plus large que la tête.
  'chapeau-paille': {
    at: [-2, -2],
    keys: { Y: '#e3c27a', y: '#b38b45', r: '#8e2f2a' },
    rows: [
      '.......Yy.......',
      '.....YYYYyy.....',
      '...YYYYYYYYyy...',
      '.YYYYYYYYYYYYyy.',
      'yYYYrrrrrrrrYYYy',
      '.yyyyyyyyyyyyyy.',
    ],
  },
  // Kabuto de fer fendu, cornes d'or (kuwagata) et couvre-nuque.
  'kabuto-fendu': {
    at: [-1, -3],
    keys: { K: '#5a5f6b', k: '#34373f', g: '#e3b85a', l: '#8a909b' },
    rows: [
      '..g........g..',
      '...g......g...',
      '....kKKKKk....',
      '...kKlKKKKk...',
      '..kKlKKkKKKk..',
      '.kKKKKKkKKKKk.',
      'kkkkkkkkkkkkkk',
      'k.kKKKKKK.....',
    ],
  },
  // Masque blanc sans traits des Oubliés, sur le visage.
  'masque-oublie': {
    at: [6, 4],
    keys: { W: '#f4f2ec', w: '#c9c6bd' },
    rows: ['.WWWW', 'WWWWW', 'WWWWw', 'WWWWw', 'WWWww', '.Www.'],
  },
};

/**
 * Plastrons : `rows` remplace le haut du torse (11 pixels de large), `sleeve` colore le haut des bras,
 * `behind` dessine ce qui dépasse dans le dos (la carapace).
 */
const CHESTS = {
  // Tenue blanche de pèlerin, col croisé.
  shiroshozoku: {
    keys: { W: '#f1ede2', w: '#c9c3b2' },
    sleeve: ['#f1ede2', '#c9c3b2'],
    rows: [
      '.WWWWWWWWW.',
      'WWWWWwWWWWW',
      'wWWWWwWWWWw',
      '.wWWWWwWWw.',
      '..WWWWwWW..',
      '..WWWwWWW..',
    ],
  },
  // Carapace de kappa : la coque verte dans le dos, les plaques du ventre devant.
  'carapace-kappa': {
    keys: { G: '#5fa04e', g: '#3f7a3a', Y: '#d9c66a', y: '#b3a04a' },
    sleeve: ['#5fa04e', '#3f7a3a'],
    behind: (c, chest) => {
      c.ellipse(chest[0] - 4, chest[1] + 4, 3, 5, ['#2f5f2c', '#4f8a42', '#8cc46a']);
      c.set(chest[0] - 5, chest[1] + 2, '#2f5f2c');
      c.set(chest[0] - 4, chest[1] + 5, '#2f5f2c');
    },
    rows: [
      '.gGGGGGGGg.',
      'gGGGYYYGGGg',
      '.gGYyYyYGg.',
      '..gYyYyYg..',
      '..gYYYYYg..',
      '..gGYYYGg..',
    ],
  },
};

/** Jambières : couleurs des cuisses et des tibias, `wide` pour les hakama amples, `hips` pour le bas du torse. */
const LEGS = {
  // Hakama noir brodé de fils d'araignée argentés : ample jusqu'aux chevilles.
  'hakama-soie': {
    pants: ['#2b2733', '#1d1a24'],
    shin: '#2b2733',
    wide: true,
    stitch: '#c9d2dc',
    hips: { keys: { H: '#2b2733', h: '#1d1a24', s: '#c9d2dc' }, rows: ['..HHsHHHH..', '..HhHHhHH..'] },
  },
  // Suneate d'écailles de kappa sur les tibias.
  'suneate-ecailles': { shin: '#5f8a7a', scale: '#9cc2ae' },
};

/** Bottes : couleur du bas de la jambe (`shin`) et dessin du pied. */
const BOOTS = {
  // Hautes sandales de bois (geta) sur chaussettes blanches.
  'geta-kasa': {
    shin: '#e8e2d0',
    foot: (c, [x, y]) => {
      c.line([x - 1, y - 1], [x + 2, y - 1], 0, '#eeeae0');
      c.line([x - 1, y], [x + 2, y], 0, '#8a5a34');
      c.set(x - 1, y + 1, '#5a3a22');
      c.set(x + 2, y + 1, '#5a3a22');
    },
  },
  // Sandales de paille de pèlerin, jambes bandées de blanc.
  'waraji-pelerin': {
    shin: '#e8e2d0',
    foot: (c, [x, y], skin) => {
      c.line([x - 1, y], [x + 2, y], 0, '#d9b56a');
      c.set(x + 2, y - 1, skin);
    },
  },
};

/** Amulettes : une petite breloque au cou. */
const AMULETS = {
  'lanterne-braise': (c, [x, y]) => {
    c.rect(x, y, 2, 2, '#ff8a3a');
    c.set(x, y, '#ffd27a');
  },
  'magatama-fele': (c, [x, y]) => {
    c.rect(x, y, 2, 2, '#4fbf8f');
    c.set(x + 1, y + 2, '#2f7a5a');
  },
  'omamori-temple': (c, [x, y]) => {
    c.rect(x, y, 2, 3, '#c8412f');
    c.set(x, y, GOLD);
  },
  rokumonsen: (c, [x, y]) => {
    c.set(x, y, GOLD);
    c.set(x + 1, y + 1, GOLD);
    c.set(x, y + 2, '#b8863b');
  },
  'talisman-douteux': (c, [x, y]) => {
    c.rect(x, y, 2, 3, '#f4efe2');
    c.set(x, y + 1, '#c8412f');
  },
  'dent-kappa': (c, [x, y]) => {
    c.set(x, y, '#f4f2ec');
    c.set(x + 1, y + 1, '#f4f2ec');
    c.set(x + 1, y + 2, '#c9c6bd');
  },
};

// --- Classes : cape, prise en main, arme de départ et animations -----------------------------------

/** Animations : tools/pixel/heros-animations.json (mêlée, distance, et retouches par classe). */
const MELEE = ANIMATIONS.melee;
const RANGED = ANIMATIONS.ranged;

const KITS = {
  guerrier: { cloak: ['#5f6f78', '#45535c'], restHandB: [0, 6], weapon: 'nodachi', animations: MELEE },
  invocateur: { cloak: ['#8fa3d9', '#62739f'], restHandB: [0, 6], weapon: 'grelots-onmyoji', animations: MELEE },
  // Cape d'ombre, écharpe rouge.
  lame: { cloak: ['#3b2f4d', '#271f33'], restHandB: [-2, 6], scarf: true, weapon: 'kunai-jumeaux', animations: MELEE },
  // Cape blanche du temple ; le bouclier se lève en garde.
  paladin: {
    cloak: ['#eee6d0', '#c4b690'],
    restHandB: [3, 4],
    weapon: 'naginata-temple',
    animations: { ...MELEE, ...ANIMATIONS.paladin },
  },
  // Carquois, cape verte de chasseur.
  rodeur: { cloak: ['#4f6b3a', '#3a4f2a'], restHandB: [0, 6], quiver: true, weapon: 'yumi-bambou', animations: RANGED },
};

export const RACE_IDS = Object.keys(RACES);
export const KIT_IDS = Object.keys(KITS);

const THIGH = 5;
const SHIN = 5;
const UPPER_ARM = 4;
const FOREARM = 4;

/** Écharpe nouée au cou, dont le pan flotte derrière (Lame). */
function scarf(c, [x, y], sway) {
  c.line([x - 3, y], [x + 3, y], 0.6, '#8e2f3a');
  c.line([x - 3, y], [x - 7 - sway, y + 2 + Math.floor(sway / 2)], 0.6, '#5e1f28');
}

/** Pied tourné vers la droite, posé au sol. */
function foot(c, [x, y], color) {
  c.line([x - 1, y], [x + 2, y], 0, color);
}

/**
 * Le héros d'une race et d'une classe, avec son équipement : `gear` associe un emplacement (arme, casque,
 * plastron, jambieres, bottes, amulette) à l'identifiant de l'objet porté. Sans arme, il tient celle de
 * départ de sa classe.
 */
export function hero(raceId = 'einherjar', kitId = 'guerrier', gear = {}) {
  const race = RACES[raceId];
  const kit = KITS[kitId];
  if (!race || !kit) throw new Error(`Héros inconnu : ${raceId} ${kitId}`);
  const pal = race.pal;
  const [cloak, cloakShade] = kit.cloak;
  const weapon = WEAPONS[gear.arme] ?? WEAPONS[kit.weapon];
  const helmet = HELMETS[gear.casque];
  const chest = CHESTS[gear.plastron];
  const legs = LEGS[gear.jambieres];
  const boots = BOOTS[gear.bottes];
  const amulet = AMULETS[gear.amulette];
  const [pants, pantsShade] = legs?.pants ?? [pal.pants, pal.pantsShade];
  const shin = boots?.shin ?? legs?.shin ?? pal.boot;
  const shinBack = boots || legs ? shade(shin) : pal.boot;
  const [sleeve, sleeveShade] = chest?.sleeve ?? [pal.skin, pal.skinShade];
  const legWidth = legs?.wide ? 1.6 : 1.2;
  const drawFoot = (c, at, back) => (boots ? boots.foot(c, at, back ? pal.skinShade : pal.skin) : foot(c, at, pal.boot));

  return {
    width: 56,
    height: 42,
    outline: '#1a1e2b',

    draw(c, pose) {
      const hip = add([28, 29], pose.body ?? [0, 0]);
      const lean = pose.lean ?? 0;
      const neck = [hip[0] + lean, hip[1] - 8];
      const shoulderF = [neck[0] + 3, neck[1] + 1];
      const shoulderB = [neck[0] - 3, neck[1] + 1];
      const handF = add(shoulderF, pose.hand);
      // À deux mains, la main arrière est juste derrière la main avant, sur la poignée.
      const [bx, by] = dir(pose.blade);
      const handB = pose.handB
        ? add(shoulderB, pose.handB)
        : weapon.twoHanded
          ? [handF[0] - bx * 2.5, handF[1] - by * 2.5]
          : add(shoulderB, kit.restHandB);

      // Cape, derrière tout le reste ; `cape` la fait flotter vers l'arrière.
      const sway = pose.cape ?? 0;
      quad(
        c,
        [[neck[0] - 5, neck[1] - 1], [neck[0] + 1, neck[1] - 1]],
        [[hip[0] - 7 - sway, hip[1] + 6 - Math.floor(sway / 2)], [hip[0] - 1, hip[1] + 6]],
        cloak,
        cloakShade,
      );
      if (kit.quiver) quiver(c, [neck[0] - 3, neck[1] - 1]);
      chest?.behind?.(c, neck);

      // Bras et jambe arrière, plus sombres pour la profondeur.
      limb(c, shoulderB, handB, [UPPER_ARM, FOREARM], -1, 1, [shade(sleeve, sleeveShade), pal.skinShade]);
      c.disc(handB[0], handB[1], 1.2, pal.skinShade);
      weapon.back?.(c, handB);
      const footB = add(hip, pose.footB);
      limb(c, [hip[0] - 1, hip[1]], footB, [THIGH, SHIN], 1, legWidth, [pantsShade, shinBack]);
      drawFoot(c, footB, true);

      const footF = add(hip, pose.footF);
      const knee = limb(c, [hip[0] + 1, hip[1]], footF, [THIGH, SHIN], 1, legWidth, [pants, shin]);
      drawFoot(c, footF, false);
      if (legs?.scale) c.set((knee[0] + footF[0]) / 2, (knee[1] + footF[1]) / 2, legs.scale);
      if (legs?.stitch) c.set(hip[0] + 2, hip[1] + 3, legs.stitch);

      c.stamp(race.torso, race.keys, neck[0], hip[1], TORSO_ANCHOR);
      if (chest) c.stamp(chest.rows, chest.keys, neck[0], hip[1] - 8, [TORSO_ANCHOR[0], 0]);
      if (legs?.hips) c.stamp(legs.hips.rows, legs.hips.keys, neck[0], hip[1] - 1, [TORSO_ANCHOR[0], 0]);
      const head = [neck[0] + 1 + (pose.head ?? 0), neck[1] + 1];
      c.stamp(race.head, race.keys, head[0], head[1], HEAD_ANCHOR);
      if (helmet) c.stamp(helmet.rows, helmet.keys, head[0] - HEAD_ANCHOR[0] + helmet.at[0], head[1] - HEAD_ANCHOR[1] + helmet.at[1]);
      amulet?.(c, [neck[0] + 1, neck[1] + 2]);
      if (kit.scarf) scarf(c, [neck[0] + 1, neck[1] + 1], sway);
      weapon.shield?.(c, handB);

      // La traînée du coup suit le bout de l'arme.
      if (pose.smear && weapon.smear) {
        const [from, to] = pose.smear;
        smear(c, shoulderF, weapon.smear + 2, from, to, '#cdf6ff', '#ffffff');
      }
      weapon.draw(c, handF, pose, handB);
      limb(c, shoulderF, handF, [UPPER_ARM, FOREARM], -1, 1, [sleeve, pal.bracer]);
      c.disc(handF[0], handF[1], 1.3, pal.skin);
    },

    // Les noms d'animation sont ceux des postures du jeu (src/game/types.ts, type Pose).
    animations: kit.animations,
  };
}

export default hero();

/** Teinte plus sombre d'une couleur (membres du côté caché), sauf si elle est donnée. */
function shade(color, given) {
  if (given) return given;
  const n = parseInt(color.slice(1), 16);
  const k = 0.72;
  const r = Math.round(((n >> 16) & 255) * k);
  const g = Math.round(((n >> 8) & 255) * k);
  const b = Math.round((n & 255) * k);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
