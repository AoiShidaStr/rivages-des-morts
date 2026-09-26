// PNJ de l'île en pixel art, à l'échelle du jeu (PPU = 18) : une animation d'attente chacun, et le cadrage
// de leur portrait de dialogue (`portrait` : x, y et côté du carré, en pixels de la case).
// Ils sont dessinés tournés vers la droite ; `mirror` les retourne pour ceux que le jeu attend tournés vers la gauche.
import { box, poly } from './draw.mjs';
import { quad } from './rig.mjs';

const OUTLINE = '#1a1e2b';

/** PNJ : `frames` poses d'attente de `duration` secondes, `draw(c, frame)`. */
const npc = ({ width, height, frames = 4, duration = 0.28, mirror = false, portrait, draw }) => ({
  width,
  height,
  outline: OUTLINE,
  mirror,
  portrait,
  draw: (c, pose) => draw(c, pose.frame),
  animations: { idle: { duration, poses: Array.from({ length: frames }, (_, frame) => ({ frame })) } },
});

/** Respiration : le haut du corps monte d'un pixel à la moitié du cycle. */
const breath = (frame) => (frame === 1 || frame === 2 ? 1 : 0);

// --- Charon -------------------------------------------------------------------------------------------

const CHARON_HOOD = [
  '....hhhh....',
  '..hhHHHHhh..',
  '.hHHHHHHHHh.',
  'hHHHHHHHHHHh',
  'hHHHddddddHh',
  'hHHddddddeHh',
  'hHHddddddddh',
  'hHHdBBBBBddh',
  '.hHdBBBBBBBh',
  '.hHHBBBbBBB.',
  '..hHBBBBBh..',
  '...hBBbBB...',
];
const CHARON_KEYS = { h: '#1d1c28', H: '#2e2d40', d: '#141320', e: '#cfe8ff', B: '#c9ccd0', b: '#9aa0a8' };

/** Charon, le passeur : grand manteau à capuche, longue barbe grise, perche, lanterne à la ceinture. */
export const charon = npc({
  width: 32,
  height: 46,
  portrait: [6, 1, 20],
  draw(c, frame) {
    const up = breath(frame);
    const sway = [-1, 0, 1, 0][frame];
    // Perche, derrière le passeur.
    c.line([25, 1], [22, 45], 0.6, '#6b4a2c');
    c.line([24, 1], [21, 45], 0, '#8a6a44');
    // Manteau : large en bas, bord déchiré.
    quad(c, [[11, 13 - up], [21, 13 - up]], [[7, 44], [24, 44]], '#2e2d40', '#1d1c28');
    for (let x = 7; x <= 24; x++) if ((x + frame) % 3 === 0) c.set(x, 45, '#1d1c28');
    box(c, 15, 16 - up, 15, 38, '#3f3d52');
    // Barbe qui descend sur la poitrine.
    c.line([16, 14 - up], [16, 24 - up], 1, '#c9ccd0');
    c.set(15, 25 - up, '#9aa0a8');
    c.set(17, 25 - up, '#9aa0a8');
    // Lanterne à la ceinture.
    c.line([13, 26], [13 + sway, 28], 0, '#2e241c');
    box(c, 11 + sway, 28, 15 + sway, 28, '#1d1a1c');
    box(c, 11 + sway, 29, 15 + sway, 32, '#ff9a3a');
    box(c, 12 + sway, 29, 14 + sway, 31, '#ffcf6b');
    box(c, 11 + sway, 33, 15 + sway, 33, '#1d1a1c');
    // Bras qui tient la perche, main osseuse.
    c.line([19, 17 - up], [22, 21], 1, '#2e2d40');
    c.disc(22, 21, 1.1, '#b9b3a5');
    c.stamp(CHARON_HOOD, CHARON_KEYS, 16, 13 - up, [6, 11]);
  },
});

// --- Obaa Kiku -----------------------------------------------------------------------------------------

const KIKU_HEAD = [
  '...WW.....',
  '..WWWW....',
  '.WWwWWWW..',
  'WWWWWWWWW.',
  'WWWSSSSSS.',
  'WwSSSSSkSS',
  'WWSSSSSSSS',
  '.WSSSSrSS.',
  '..sSSSSSs.',
  '...ssss...',
];
const KIKU_KEYS = { W: '#dfe2ec', w: '#aab0c4', S: '#eef2f2', s: '#b9c4cc', k: '#3a3f4a', r: '#e8a0a0' };

/** Obaa Kiku : petite grand-mère fantôme en kimono indigo, chignon blanc, plateau de thé. */
export const obaaKiku = npc({
  width: 26,
  height: 30,
  mirror: true,
  portrait: [4, 1, 16],
  draw(c, frame) {
    const up = breath(frame);
    // Kimono : le bas se défait en volutes de brume.
    quad(c, [[8, 12 - up], [16, 12 - up]], [[6, 26], [18, 26]], '#3a3f6a', '#2a2d4f');
    for (let y = 26; y <= 29; y++) for (let x = 6; x <= 18; x++) if ((x + y + frame) % 2 === 0 || y < 28) c.set(x, y, y > 27 ? '#cfe0e8' : '#5a6090');
    for (const [x, y] of [[9, 16], [13, 19], [10, 22], [15, 23], [12, 14]]) c.set(x, y - up, '#8a90c8');
    box(c, 7, 18 - up, 17, 19 - up, '#c9a55a');
    // Bras tendus et plateau laqué : deux tasses et une théière.
    const tray = 16 - up + (frame === 3 ? -1 : 0);
    c.line([14, 14 - up], [20, tray], 0.8, '#3a3f6a');
    c.disc(20, tray, 0.9, '#e8eef0');
    box(c, 14, tray - 1, 25, tray - 1, '#5a2a1f');
    box(c, 14, tray, 25, tray, '#3a1a14');
    box(c, 16, tray - 3, 17, tray - 2, '#f4f0e6');
    box(c, 22, tray - 3, 23, tray - 2, '#f4f0e6');
    box(c, 19, tray - 5, 21, tray - 2, '#6b8a7a');
    c.set(22, tray - 4, '#6b8a7a');
    c.stamp(KIKU_HEAD, KIKU_KEYS, 12, 12 - up, [4, 9]);
  },
});

// --- Tetsu ---------------------------------------------------------------------------------------------

const TETSU_HEAD = [
  '...kKKKk...',
  '..kKKKKKk..',
  '.kKKKKKKKk.',
  '.KKWWSSSSK.',
  '.KWWWSSeS..',
  '.KWWWSSSSS.',
  '.KWlWSSSm..',
  '..WWWSSSS..',
  '...WWSSS...',
  '....SSS....',
];
const TETSU_KEYS = { k: '#1d1a1c', K: '#2e2a30', W: '#f4f2ec', l: '#c9c6bd', S: '#d9a47a', e: '#2a1d14', m: '#8a4a3a' };

/** Tetsu, le forgeron : costaud, bras nus, tablier de cuir, marteau ; la moitié du visage est un masque blanc. */
export const tetsu = npc({
  width: 34,
  height: 42,
  portrait: [6, 2, 20],
  draw(c, frame) {
    const up = breath(frame);
    const skin = '#d9a47a';
    const skinShade = '#a8764e';
    // Jambes : hakama indigo ample, sandales.
    c.line([15, 30], [12, 40], 1.8, '#252b48');
    c.line([19, 30], [22, 40], 1.8, '#2e3558');
    box(c, 10, 41, 14, 41, '#5a3a22');
    box(c, 20, 41, 24, 41, '#5a3a22');
    // Torse large : kimono de travail ouvert sur la poitrine, tablier de cuir.
    quad(c, [[10, 14 - up], [23, 14 - up]], [[11, 31], [23, 31]], '#2e3558', '#252b48');
    poly(c, [[15, 14 - up], [19, 14 - up], [17, 20 - up]], skin);
    quad(c, [[12, 20], [22, 20]], [[11, 36], [23, 36]], '#8a5a38', '#654026');
    box(c, 11, 20, 23, 20, '#3d2b1f');
    c.set(17, 27, '#e3b85a');
    // Bras arrière, paume ouverte devant le ventre : c'est là que tape le marteau.
    c.line([12, 16 - up], [14, 25], 1.5, skinShade);
    c.disc(16, 26, 1.4, skinShade);
    // Marteau qui tapote la paume ouverte : la main avant le lève puis le laisse retomber.
    const lift = [0, 2, 3, 1][frame];
    const hand = [24, 25 - lift];
    const head = [17, 23 - Math.round(lift * 1.5)];
    // (la tête du marteau se pose sur la paume quand `lift` vaut 0)
    c.line([22, 16 - up], hand, 1.7, skin);
    c.disc(hand[0], hand[1], 1.5, skin);
    c.line(hand, head, 0.5, '#7a5a34');
    box(c, head[0] - 2, head[1] - 2, head[0] + 1, head[1] + 1, '#3a3d44');
    box(c, head[0] - 2, head[1] - 2, head[0] + 1, head[1] - 2, '#8a909b');
    c.stamp(TETSU_HEAD, TETSU_KEYS, 17, 13 - up, [5, 9]);
  },
});

// --- Yuki ----------------------------------------------------------------------------------------------

const YUKI_HEAD = [
  '..hHHHH..',
  '.hHHHHHH.',
  'hHHHHHHHH',
  'hHHHSSSSH',
  'hHHSSSeSS',
  'hHHSSSSSS',
  'hHHSSSrS.',
  '.hHsSSSS.',
  '..h.sss..',
];
const YUKI_KEYS = { h: '#141218', H: '#26222c', S: '#f4eef0', s: '#cfc4cc', e: '#3a3044', r: '#e8a0b0' };

/** Yuki : petite fille fantôme en kimono pâle, pieds nus, lanterne de papier éteinte. */
export const yuki = npc({
  width: 22,
  height: 28,
  portrait: [3, 2, 14],
  draw(c, frame) {
    const up = breath(frame);
    const swing = [0, 1, 0, -1][frame];
    c.line([9, 22], [8, 26], 0.8, '#f4eef0');
    c.line([12, 22], [13, 26], 0.8, '#f4eef0');
    quad(c, [[7, 12 - up], [13, 12 - up]], [[6, 24], [15, 24]], '#e8e2ee', '#c4bccc');
    box(c, 7, 17 - up, 13, 18 - up, '#e8a0b0');
    for (const [x, y] of [[8, 20], [12, 22], [10, 14]]) c.set(x, y, '#c9b8e0');
    // Lanterne de papier tenue par son anse.
    c.line([12, 15 - up], [16, 17], 0.7, '#e8e2ee');
    c.disc(16, 17, 0.8, '#f4eef0');
    const lx = 17 + swing;
    c.line([16, 17], [lx, 19], 0, '#2e241c');
    c.ellipse(lx, 22, 2.5, 3, ['#c9c3b2', '#f4f0e6', '#ffffff']);
    box(c, lx - 2, 19, lx + 2, 19, '#2e241c');
    box(c, lx - 2, 25, lx + 2, 25, '#2e241c');
    c.set(lx, 21, '#c9c3b2');
    c.set(lx, 23, '#c9c3b2');
    c.stamp(YUKI_HEAD, YUKI_KEYS, 10, 12 - up, [4, 8]);
  },
});

// --- Le tanuki -----------------------------------------------------------------------------------------

/** Le tanuki marchand : ventre rond, masque sombre, chapeau de paille, flasque de saké, énorme hotte de babioles. */
export const tanuki = npc({
  width: 34,
  height: 34,
  mirror: true,
  portrait: [9, 0, 20],
  draw(c, frame) {
    const bounce = [0, 1, 0, 1][frame];
    // Queue rayée derrière.
    for (let i = 0; i < 6; i++) c.disc(8 - i * 0.6, 26 + i * 0.8, 1.6, i % 2 ? '#3a2a22' : '#8a6a4a');
    // Hotte de bois chargée de babioles.
    box(c, 5, 6, 14, 24, '#7a5a34');
    for (let y = 6; y <= 24; y += 4) box(c, 5, y, 14, y, '#54391f');
    box(c, 5, 6, 5, 24, '#9c7a58');
    for (const [x, y, color] of [[7, 4, '#c8412f'], [10, 3, '#e3b85a'], [12, 5, '#4fbf8f'], [8, 9, '#e3b85a'], [11, 13, '#c8412f'], [7, 17, '#f4efe2'], [12, 20, '#3f5f9f']]) {
      box(c, x, y, x + 1, y + 1, color);
    }
    c.ellipse(9, 3, 4, 1.5, ['#8a7440', '#c9b278', '#e3c27a']);
    // Pattes courtes.
    c.line([15, 29], [14, 33], 1.2, '#5f4632');
    c.line([21, 29], [22, 33], 1.2, '#5f4632');
    // Corps rond et ventre clair qui sautille quand il rit.
    c.ellipse(18, 23 - bounce, 8, 8, ['#5f4632', '#8a6a4a', '#a8865a']);
    c.ellipse(20, 25 - bounce, 5, 5.5, ['#c9b690', '#e8d8b8', '#f4eadb']);
    // Flasque de saké à la ceinture.
    c.ellipse(12, 26, 2, 2.5, ['#b8b2a2', '#e8e2d0', '#ffffff']);
    box(c, 11, 25, 13, 25, '#3f5f9f');
    box(c, 12, 22, 12, 23, '#e8e2d0');
    // Bras qui tient le ventre.
    c.line([22, 19 - bounce], [25, 24 - bounce], 1.2, '#5f4632');
    // Tête : oreilles, masque sombre autour des yeux, museau clair.
    c.ellipse(21, 12 - bounce, 6, 5, ['#5f4632', '#8a6a4a', '#a8865a']);
    c.disc(17, 8 - bounce, 1.3, '#3a2a22');
    c.disc(24, 8 - bounce, 1.3, '#3a2a22');
    box(c, 19, 11 - bounce, 25, 13 - bounce, '#3a2a22');
    c.set(23, 12 - bounce, frame === 1 || frame === 3 ? '#3a2a22' : '#f4efe2');
    c.set(20, 12 - bounce, frame === 1 || frame === 3 ? '#3a2a22' : '#f4efe2');
    c.ellipse(26, 14 - bounce, 2.2, 1.6, ['#c9b690', '#e8d8b8', '#f4eadb']);
    c.set(28, 13 - bounce, '#1d1a1c');
    // Chapeau de paille conique.
    for (let y = 2; y <= 6; y++) box(c, 21 - (y - 1) * 2.2, y - bounce, 21 + (y - 1) * 2.2, y - bounce, y === 6 ? '#b38b45' : '#e3c27a');
    c.set(21, 1 - bounce, '#b38b45');
  },
});

// --- Le moine ------------------------------------------------------------------------------------------

const MONK_HEAD = [
  '...sSSSs..',
  '..sSSSSSS.',
  '.sSSSSSSSS',
  '.sSSSSwwS.',
  '.sSSSSSeS.',
  '.sSSSSSSSs',
  '..sSSSSmS.',
  '..sSWWWWs.',
  '...sWWWW..',
  '....WWw...',
];
const MONK_KEYS = { S: '#d9b48a', s: '#a8845e', w: '#f4f2ec', W: '#e8e6e0', e: '#3a2a1c', m: '#8a5a3a' };

/** Le moine du Rocher : crâne rasé, sourcils et barbe blancs, robe grise, kesa orange, chapelet et shakujō. */
export const moine = npc({
  width: 30,
  height: 40,
  mirror: true,
  portrait: [6, 0, 18],
  draw(c, frame) {
    const up = breath(frame);
    // Shakujō : bâton à anneaux, tenu dans la main arrière.
    c.line([8, 6], [9, 39], 0.5, '#7a5a34');
    for (let a = 0; a < 360; a += 45) c.set(8 + Math.cos((a * Math.PI) / 180) * 2, 4 + Math.sin((a * Math.PI) / 180) * 2, '#c9973f');
    c.set(6, 6, '#e3b85a');
    c.set(10, 6, '#e3b85a');
    c.line([12, 16 - up], [9, 21], 1, '#6f7477');
    c.disc(9, 21, 1.1, '#d9b48a');
    // Robe grise jusqu'aux pieds, kesa orange en écharpe.
    quad(c, [[11, 13 - up], [20, 13 - up]], [[9, 38], [22, 38]], '#6f7477', '#555a5d');
    poly(c, [[12, 13 - up], [16, 13 - up], [22, 30], [22, 36], [18, 36]], '#d9772f');
    for (let y = 16; y <= 34; y += 4) c.set(16 + Math.round((y - 14) * 0.3), y, '#a8561f');
    box(c, 11, 39, 14, 39, '#3a2a1c');
    box(c, 17, 39, 20, 39, '#3a2a1c');
    // Chapelet égrené : une perle claire avance d'une image à l'autre.
    c.line([19, 16 - up], [21, 22], 1, '#6f7477');
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      c.set(22 + Math.cos(a) * 2, 25 + Math.sin(a) * 2, i === frame ? '#c9973f' : '#4a2f1f');
    }
    c.disc(21, 22, 1.1, '#d9b48a');
    c.stamp(MONK_HEAD, MONK_KEYS, 16, 13 - up, [5, 9]);
  },
});
