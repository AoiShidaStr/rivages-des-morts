// Décors en pixel art de l'île et du donjon, à l'échelle du jeu (PPU = 18 pixels par unité, src/style.ts).
// Chaque décor est posé sur la dernière rangée de sa case (le sol) ; les décors animés bouclent sur `idle`.
import { arc, box, column, hash, mix, noise, poly, rope, shide } from './draw.mjs';

const OUTLINE = '#1a1e2b';
const STONE = ['#5d6365', '#848a8c', '#a9afb0', '#c7cccd'];
const MOSS = ['#4f6e3e', '#6f8f4e', '#8fb060'];
const VERMILION = ['#8e2c1f', '#c8412f', '#e0634a'];
const BLACK_LACQUER = '#2a2226';
const WOOD = ['#3d2d22', '#5a4332', '#7a5c44', '#9c7a58'];
const PAPER = '#f1ece0';
const PAPER_SHADE = '#cfc6ad';

/** Décor fixe : une seule image. */
const still = (width, height, draw) => ({ width, height, outline: OUTLINE, draw, animations: { idle: { duration: 1, poses: [{}] } } });
/** Décor animé : `frames` images de `duration` secondes ; `draw` reçoit le numéro de l'image. */
const looping = (width, height, frames, duration, draw) => ({
  width,
  height,
  outline: OUTLINE,
  draw: (c, pose) => draw(c, pose.frame, frames),
  animations: { idle: { duration, poses: Array.from({ length: frames }, (_, frame) => ({ frame })) } },
});

/** Pierre ombrée : chaque pixel du polygone reçoit une teinte selon sa hauteur et un peu de grain. */
function stoneFill(c, points, colors, seed = 1) {
  const ys = points.map((p) => p[1]);
  const xs = points.map((p) => p[0]);
  const top = Math.min(...ys);
  const height = Math.max(...ys) - top || 1;
  const left = Math.min(...xs);
  const width = Math.max(...xs) - left || 1;
  const mask = { set: () => {} };
  const cells = [];
  mask.set = (x, y) => cells.push([x, y]);
  poly(mask, points, '#000000');
  for (const [x, y] of cells) {
    const light = 1 - (y - top) / height * 0.55 - (x - left) / width * 0.35 + (noise(x, y, 3, seed) - 0.5) * 0.35;
    c.set(x, y, colors[Math.max(0, Math.min(colors.length - 1, Math.floor(light * colors.length)))]);
  }
}

// --- Donjon -------------------------------------------------------------------------------------------

/** Souche des rizières, racines étalées, mousse sur le rebord, une bande de papier clouée. */
export const souche = still(32, 28, (c) => {
  // Racines, derrière le tronc.
  poly(c, [[9, 19], [12, 22], [5, 27], [1, 27]], WOOD[1]);
  poly(c, [[21, 19], [24, 20], [31, 27], [26, 27]], WOOD[0]);
  poly(c, [[14, 22], [18, 22], [17, 27], [13, 27]], WOOD[1]);
  // Tronc : écorce en stries verticales, éclairé par la gauche.
  for (let x = 8; x <= 24; x++) {
    const t = (x - 8) / 16;
    for (let y = 9; y <= 24 + (x > 11 && x < 21 ? 1 : 0); y++) {
      const stripe = (x + Math.floor(y / 4)) % 3 === 0;
      const base = t < 0.2 ? WOOD[2] : t > 0.75 ? WOOD[0] : WOOD[1];
      c.set(x, y, stripe ? mix(base, '#000000', 0.25) : base);
    }
  }
  // Coupe du dessus : cernes clairs.
  c.ellipse(16, 9, 8, 3, ['#a8865a', '#c9a878', '#e0c496']);
  for (const r of [5.5, 3]) arc(c, 16, 9, r, 0, 360, '#a07a4e');
  c.set(16, 9, '#8a6a44');
  // Mousse sur le rebord et au pied.
  for (let x = 8; x <= 24; x++) if (hash(x, 3) > 0.45) c.set(x, 11 + (hash(x, 5) > 0.7 ? 1 : 0), MOSS[1 + (x % 2)]);
  for (let x = 4; x <= 28; x++) if (hash(x, 9) > 0.55) c.set(x, 26, MOSS[x % 2]);
  // Ofuda cloué : papier blanc, sceau vermillon.
  box(c, 18, 14, 20, 19, PAPER);
  c.set(19, 16, VERMILION[1]);
  c.set(19, 17, VERMILION[1]);
  c.set(20, 19, PAPER_SHADE);
});

/** Jizō de pierre : bonnet et bavoir rouges, mains jointes, socle moussu. */
export const jizo = still(14, 21, (c) => {
  box(c, 2, 18, 11, 20, STONE[1]);
  box(c, 2, 18, 11, 18, STONE[2]);
  c.ellipse(7, 13, 4, 5, [STONE[0], STONE[1], STONE[2]]);
  c.ellipse(7, 6, 3.5, 3.5, [STONE[1], STONE[2], STONE[3]]);
  // Bonnet tricoté et bavoir.
  c.ellipse(7, 3, 3.5, 2, [VERMILION[0], VERMILION[1], VERMILION[2]]);
  poly(c, [[3, 9], [12, 9], [7, 15]], VERMILION[1]);
  c.line([4, 10], [7, 13], 0, VERMILION[2]);
  // Yeux clos et sourire.
  c.set(5, 6, STONE[0]);
  c.set(8, 6, STONE[0]);
  c.set(6, 8, STONE[0]);
  c.set(7, 8, STONE[0]);
  box(c, 6, 15, 8, 16, STONE[3]);
  c.set(3, 19, MOSS[1]);
  c.set(10, 19, MOSS[0]);
});

/**
 * Torii vermillon délavé : kasagi noir relevé aux extrémités, nuki, plaque centrale, shimenawa et shide.
 * Sert au ponton de l'île comme au bord de l'arène.
 */
export const torii = still(78, 88, (c) => {
  const pillar = (x) => {
    column(c, x, x + 6, 20, 86, VERMILION);
    // Usure : taches sombres et coulures.
    for (let y = 24; y < 80; y++) if (hash(x, y) > 0.93) c.set(x + 1 + Math.floor(hash(y, x) * 5), y, VERMILION[0]);
    box(c, x - 1, 81, x + 7, 87, BLACK_LACQUER);
    box(c, x - 1, 81, x + 7, 81, '#4a4046');
    for (let xx = x - 1; xx <= x + 7; xx++) if (hash(xx, 2) > 0.5) c.set(xx, 87, MOSS[1]);
  };
  pillar(17);
  pillar(54);
  // Kasagi : poutre noire aux extrémités relevées, et shimaki vermillon dessous.
  for (let x = 1; x <= 77; x++) {
    const lift = Math.round(((x - 39) / 38) ** 2 * 5);
    for (let y = 9 - lift; y <= 13 - Math.max(0, lift - 3); y++) c.set(x, y, y === 9 - lift ? '#4a4046' : BLACK_LACQUER);
  }
  column(c, 6, 72, 14, 18, VERMILION);
  box(c, 6, 14, 72, 14, VERMILION[2]);
  box(c, 6, 18, 72, 18, VERMILION[0]);
  // Nuki, qui dépasse des piliers.
  box(c, 9, 29, 69, 32, VERMILION[1]);
  box(c, 9, 29, 69, 29, VERMILION[2]);
  box(c, 9, 32, 69, 32, VERMILION[0]);
  // Gakuzuka et plaque noire cerclée d'or.
  box(c, 36, 18, 42, 29, VERMILION[1]);
  box(c, 33, 16, 45, 27, BLACK_LACQUER);
  for (let x = 33; x <= 45; x++) {
    c.set(x, 16, '#c9973f');
    c.set(x, 27, '#8a6a2a');
  }
  for (let y = 16; y <= 27; y++) {
    c.set(33, y, '#c9973f');
    c.set(45, y, '#8a6a2a');
  }
  for (const [x, y] of [[38, 19], [39, 19], [40, 19], [39, 20], [38, 22], [40, 22], [39, 23], [39, 24], [38, 25], [40, 25]]) c.set(x, y, '#e3b85a');
  // Shimenawa tendue sous le nuki, papiers shide.
  const sag = (x) => 36 + Math.round(Math.sin(((x - 24) / 30) * Math.PI) * 4);
  const points = [];
  for (let x = 24; x <= 54; x += 3) points.push([x, sag(x)]);
  rope(c, points, 1.3, ['#8a7440', '#d9c38a', '#efe0ae']);
  for (const x of [29, 38, 47]) shide(c, x, sag(x) + 2, 8);
});

// --- Île : bâtiments ---------------------------------------------------------------------------------

/** Toit de tuiles sombres à larges avant-toits, tuiles en rangées, faîtière et ornements. */
function tiledRoof(c, cx, top, bottom, topWidth, bottomWidth, colors = ['#2b2f38', '#3a3f4a', '#4d5463', '#5f6778']) {
  for (let y = top; y <= bottom; y++) {
    const t = (y - top) / Math.max(1, bottom - top);
    const w = topWidth + (bottomWidth - topWidth) * t;
    // Avant-toits relevés : les bords descendent moins vite que le milieu.
    const left = Math.round(cx - w / 2);
    const right = Math.round(cx + w / 2);
    for (let x = left; x <= right; x++) {
      const row = (y - top) % 3 === 2;
      const tileEdge = (x + (Math.floor((y - top) / 3) % 2) * 2) % 4 === 0;
      const lit = x < cx - w * 0.2 ? 1 : 0;
      c.set(x, y, row ? colors[0] : tileEdge ? colors[1] : colors[2 + lit]);
    }
  }
  // Bordure claire des avant-toits et coins relevés.
  const w = bottomWidth;
  for (let x = Math.round(cx - w / 2); x <= Math.round(cx + w / 2); x++) c.set(x, bottom, colors[3]);
  c.set(Math.round(cx - w / 2) - 1, bottom - 1, colors[3]);
  c.set(Math.round(cx + w / 2) + 1, bottom - 1, colors[3]);
  // Faîtière et onigawara aux deux bouts.
  const ridgeLeft = Math.round(cx - topWidth / 2) - 1;
  const ridgeRight = Math.round(cx + topWidth / 2) + 1;
  box(c, ridgeLeft, top - 2, ridgeRight, top - 1, colors[0]);
  box(c, ridgeLeft, top - 2, ridgeRight, top - 2, colors[2]);
  box(c, ridgeLeft - 1, top - 4, ridgeLeft + 1, top - 1, colors[1]);
  box(c, ridgeRight - 1, top - 4, ridgeRight + 1, top - 1, colors[1]);
}

/** Maison de thé d'Obaa Kiku : shōji, noren, lanterne rouge, banc au feutre rouge sous une ombrelle. */
export const maisonThe = still(84, 62, (c) => {
  // Soubassement de pierre et véranda de planches.
  box(c, 8, 55, 76, 61, STONE[1]);
  for (let x = 8; x <= 76; x += 6) box(c, x, 55, x, 61, STONE[0]);
  box(c, 8, 55, 76, 55, STONE[2]);
  box(c, 6, 51, 78, 54, WOOD[2]);
  for (let x = 6; x <= 78; x += 4) c.set(x, 52 + (x % 8 ? 0 : 1), WOOD[1]);
  box(c, 6, 51, 78, 51, WOOD[3]);
  // Murs : poteaux sombres, shōji à gauche, porte à noren au milieu, fenêtre à croisillons à droite.
  box(c, 10, 28, 74, 50, '#8a6a48');
  for (const x of [10, 30, 52, 74]) column(c, x - 1, x + 1, 26, 50, WOOD);
  box(c, 12, 30, 28, 48, PAPER);
  for (let x = 12; x <= 28; x += 4) box(c, x, 30, x, 48, PAPER_SHADE);
  for (let y = 30; y <= 48; y += 5) box(c, 12, y, 28, y, PAPER_SHADE);
  box(c, 33, 30, 49, 50, '#2a2220');
  box(c, 32, 29, 50, 38, VERMILION[1]);
  for (let x = 32; x <= 50; x += 6) box(c, x, 29, x, 38, VERMILION[0]);
  c.ellipse(41, 33, 2, 2, ['#e8e2d0', '#f4f0e6', '#ffffff']);
  box(c, 55, 32, 71, 44, '#3a2e24');
  for (let x = 55; x <= 71; x += 3) box(c, x, 32, x, 44, WOOD[2]);
  for (let y = 32; y <= 44; y += 3) box(c, 55, y, 71, y, WOOD[2]);
  box(c, 56, 33, 70, 43, mix('#ffcf6b', '#3a2e24', 0.55));
  // Toit.
  tiledRoof(c, 42, 9, 27, 50, 84);
  // Lanterne rouge suspendue à l'avant-toit.
  c.line([73, 28], [73, 31], 0, WOOD[0]);
  c.ellipse(73, 35, 3, 4, [VERMILION[0], VERMILION[1], '#ff8a6a']);
  box(c, 71, 31, 75, 31, BLACK_LACQUER);
  box(c, 71, 39, 75, 39, BLACK_LACQUER);
  c.set(73, 35, '#ffd27a');
  // Banc au feutre rouge et ombrelle, devant la maison.
  box(c, 1, 48, 22, 50, VERMILION[1]);
  box(c, 1, 48, 22, 48, VERMILION[2]);
  box(c, 2, 51, 3, 55, WOOD[0]);
  box(c, 20, 51, 21, 55, WOOD[0]);
  c.line([12, 47], [12, 22], 0, WOOD[1]);
  for (let y = 16; y <= 23; y++) {
    const half = Math.round((y - 15) * 1.6);
    for (let x = 12 - half; x <= 12 + half; x++) c.set(x, y, (x - 12 + 40) % 5 === 0 ? VERMILION[0] : y < 18 ? VERMILION[2] : VERMILION[1]);
  }
  c.set(12, 15, WOOD[0]);
});

/** Forge de Tetsu : murs de pierre, feu qui danse dans la gueule, enclume, fumée qui monte. */
export const forge = looping(74, 60, 4, 0.14, (c, frame) => {
  // Cheminée et fumée qui monte (derrière le toit).
  column(c, 50, 57, 12, 24, [STONE[0], STONE[1], STONE[2]]);
  for (let y = 13; y <= 24; y += 3) for (let x = 50; x <= 57; x++) if ((x + y) % 4 === 0) c.set(x, y, STONE[0]);
  box(c, 49, 11, 58, 12, STONE[0]);
  for (let k = 0; k < 3; k++) {
    const rise = (frame * 2 + k * 3) % 9;
    const x = 53 + Math.round(Math.sin(rise * 0.7 + k) * 1.5);
    c.ellipse(x, 9 - rise, 1.5 + rise / 5, 1.2 + rise / 8, ['#b9bfc4', '#d8dde0', '#eef1f2']);
  }
  // Toit de bardeaux.
  tiledRoof(c, 37, 17, 32, 46, 74, [WOOD[0], WOOD[1], WOOD[2], WOOD[3]]);
  // Murs de pierre appareillée.
  for (let y = 33; y <= 59; y++) {
    for (let x = 6; x <= 68; x++) {
      const row = Math.floor((y - 33) / 4);
      const mortar = (y - 33) % 4 === 3 || (x + row * 3) % 7 === 0;
      const lit = x < 20 ? 2 : x > 58 ? 0 : 1;
      c.set(x, y, mortar ? '#4f4a47' : ['#5d5854', '#6f6a66', '#858079'][lit]);
    }
  }
  // Gueule de la forge, et le feu qui danse.
  for (let y = 40; y <= 59; y++) {
    const half = y < 44 ? Math.round(Math.sqrt(Math.max(0, 16 - (44 - y) ** 2)) * 2.5) : 10;
    for (let x = 34 - half; x <= 34 + half; x++) c.set(x, y, '#2a1d17');
  }
  for (let y = 46; y <= 59; y++) {
    for (let x = 26; x <= 42; x++) {
      const flame = noise(x * 1.3, y * 1.1 + frame * 3, 4, 3) + (y - 46) / 14 - Math.abs(x - 34) / 12;
      if (flame > 0.95) c.set(x, y, '#fff2c0');
      else if (flame > 0.75) c.set(x, y, '#ffc36b');
      else if (flame > 0.55) c.set(x, y, '#ff8a3a');
      else if (flame > 0.4) c.set(x, y, '#b8401f');
    }
  }
  // Tonneau d'eau à gauche, enclume à droite.
  column(c, 8, 15, 49, 59, WOOD);
  for (const y of [51, 56]) box(c, 8, y, 15, y, '#3a3d44');
  box(c, 9, 49, 14, 49, '#5f8fa0');
  poly(c, [[52, 52], [66, 52], [64, 55], [54, 55]], '#3a3d44');
  box(c, 52, 52, 66, 52, '#8a909b');
  box(c, 57, 55, 61, 59, '#2e3036');
  // Pinces et marteau accrochés au mur.
  c.line([20, 36], [22, 45], 0, '#2e3036');
  c.line([23, 36], [22, 45], 0, '#2e3036');
  c.line([46, 36], [46, 44], 0, WOOD[1]);
  box(c, 44, 35, 48, 37, '#3a3d44');
});

/** Pin tortueux aux coussins d'aiguilles, avec deux feux follets posés dans ses branches. */
export const arbre = still(66, 68, (c) => {
  // Tronc sinueux et branches.
  const trunk = [[34, 67], [33, 58], [30, 50], [28, 42], [30, 34], [27, 26], [24, 18]];
  for (let i = 0; i < trunk.length - 1; i++) {
    const r = 3.6 - i * 0.45;
    c.line(trunk[i], trunk[i + 1], r, WOOD[1]);
    c.line([trunk[i][0] - r * 0.6, trunk[i][1]], [trunk[i + 1][0] - r * 0.6, trunk[i + 1][1]], 0, WOOD[2]);
    c.line([trunk[i][0] + r * 0.7, trunk[i][1]], [trunk[i + 1][0] + r * 0.7, trunk[i + 1][1]], 0, WOOD[0]);
  }
  c.line([29, 38], [45, 30], 1.4, WOOD[1]);
  c.line([30, 46], [16, 38], 1.2, WOOD[1]);
  c.line([27, 26], [40, 18], 1, WOOD[1]);
  // Racines.
  c.line([33, 64], [26, 67], 1, WOOD[0]);
  c.line([35, 64], [42, 67], 1, WOOD[0]);
  // Coussins d'aiguilles : ellipses aplaties, dessus éclairé, grain d'aiguilles.
  const pads = [[22, 13, 15, 7], [45, 25, 15, 6], [14, 34, 12, 5], [40, 12, 11, 5], [52, 36, 10, 4], [26, 28, 9, 4]];
  for (const [cx, cy, rx, ry] of pads) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x - cx) / rx;
        const ny = (y - cy) / ry;
        const edge = nx * nx + ny * ny + (noise(x, y, 3, 5) - 0.5) * 0.5;
        if (edge > 1) continue;
        const lit = -ny * 0.8 - nx * 0.3 + (hash(x, y) - 0.5) * 0.6;
        c.set(x, y, lit > 0.5 ? '#6f9f5f' : lit > 0 ? '#4f7f4e' : lit > -0.55 ? '#3a613f' : '#2a4a35');
      }
    }
  }
  // Feux follets bleu esprit.
  for (const [x, y] of [[18, 22], [50, 31]]) {
    c.disc(x, y, 1.2, '#9ff3ff');
    c.set(x, y, '#ffffff');
    c.set(x - 1, y + 2, '#5fd0e0');
  }
});

/**
 * Portail du donjon : torii noir et rouge sang, fils de soie, et un tourbillon violet qui tourne entre ses piliers.
 */
export const portail = looping(74, 82, 6, 0.1, (c, frame, frames) => {
  const cx = 37;
  const cy = 55;
  // Tourbillon, derrière les piliers.
  for (let y = 24; y <= 81; y++) {
    for (let x = 18; x <= 56; x++) {
      const dx = (x - cx) / 18;
      const dy = (y - cy) / 27;
      const d = Math.hypot(dx, dy);
      if (d > 1) continue;
      const angle = Math.atan2(dy, dx);
      const swirl = (angle / (Math.PI * 2) + d * 1.6 - frame / frames + 10) % 1;
      const band = Math.floor(swirl * 4);
      const colors = d < 0.25 ? ['#8e2c3a', '#c8412f', '#8e2c3a', '#e0634a'] : ['#2b1d3a', '#4a2f5f', '#2b1d3a', '#8e2c3a'];
      if (d > 0.88 && hash(x, y + frame) > 0.5) continue;
      c.set(x, y, colors[band]);
    }
  }
  // Piliers et poutres, noirs veinés de rouge.
  const dark = ['#2a1417', '#5a2328', '#7a3036'];
  column(c, 13, 19, 20, 81, dark);
  column(c, 55, 61, 20, 81, dark);
  for (let x = 1; x <= 73; x++) {
    const lift = Math.round(((x - 37) / 36) ** 2 * 5);
    for (let y = 9 - lift; y <= 13; y++) c.set(x, y, '#1d1417');
  }
  box(c, 5, 14, 69, 17, dark[1]);
  box(c, 8, 26, 66, 29, dark[1]);
  box(c, 8, 26, 66, 26, dark[2]);
  // Shimenawa déchirée et fils de soie tendus d'un pilier à l'autre.
  rope(c, [[20, 32], [28, 36], [34, 37]], 1.1, ['#6a5a3a', '#a8904f', '#c9b278']);
  shide(c, 27, 38, 6);
  for (const [a, b] of [[[19, 40], [30, 30]], [[55, 36], [44, 27]], [[19, 60], [55, 48]]]) c.line(a, b, 0, '#d9dde6');
});

/** Petite cascade : rochers moussus, eau qui tombe en traînées, écume au pied. */
export const cascade = looping(62, 60, 4, 0.1, (c, frame) => {
  // Rochers de part et d'autre.
  stoneFill(c, [[2, 59], [4, 30], [12, 16], [24, 10], [26, 44], [22, 59]], STONE, 2);
  stoneFill(c, [[36, 59], [36, 10], [48, 14], [58, 28], [60, 59]], STONE, 3);
  for (let x = 4; x <= 58; x++) {
    const y = x < 30 ? 30 - Math.round((x - 4) * 0.8) : 10 + Math.round((x - 36) * 0.7);
    if (hash(x, 1) > 0.3 && (x < 25 || x > 36)) c.set(x, Math.max(9, y), MOSS[1 + (x % 2)]);
  }
  // Eau qui tombe : traînées claires qui descendent d'une image à l'autre.
  for (let y = 8; y <= 50; y++) {
    const half = 5 + Math.floor((y - 8) / 14);
    for (let x = 31 - half; x <= 31 + half; x++) {
      const streak = (y - frame * 3 + (x % 3) * 5 + 40) % 9;
      c.set(x, y, streak < 2 ? '#e8f6f8' : streak < 4 ? '#a9d4dc' : x % 2 ? '#7fb2bf' : '#8cbfcb');
    }
  }
  // Bassin et écume.
  c.ellipse(31, 53, 20, 5, ['#4f7f8a', '#6f9ea8', '#8cbfcb']);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + frame * 0.4;
    c.set(31 + Math.cos(a) * (10 + (i % 3)), 52 + Math.sin(a) * 2.5, '#f4fbfc');
  }
  for (let x = 24; x <= 38; x++) if ((x + frame) % 2) c.set(x, 50, '#ffffff');
});

// --- Île : petits décors ------------------------------------------------------------------------------

/** Présentoir d'ema : planchettes votives pendues sous un petit toit. */
export const ema = still(26, 23, (c) => {
  poly(c, [[1, 6], [4, 2], [22, 2], [25, 6]], '#4a3a2c');
  box(c, 1, 5, 25, 6, '#2e241c');
  box(c, 4, 2, 22, 2, '#6a5440');
  column(c, 3, 4, 6, 22, WOOD);
  column(c, 21, 22, 6, 22, WOOD);
  box(c, 3, 8, 22, 8, WOOD[1]);
  box(c, 3, 15, 22, 15, WOOD[1]);
  const plaque = (x, y) => {
    poly(c, [[x, y + 1], [x + 2, y - 1], [x + 4, y + 1], [x + 4, y + 5], [x, y + 5]], '#c9a36a');
    box(c, x + 3, y + 1, x + 4, y + 5, '#9c7a48');
    c.set(x + 1, y + 2, '#3a2a1c');
    c.set(x + 2, y + 3, '#3a2a1c');
    c.set(x + 2, y - 1, VERMILION[1]);
  };
  for (const x of [5, 10, 15]) plaque(x, 9);
  for (const x of [7, 13]) plaque(x, 16);
});

/** Coffre de bois cerclé de fer, serrure d'or. */
export const coffre = still(18, 16, (c) => {
  for (let y = 2; y <= 6; y++) {
    const inset = y === 2 ? 3 : y === 3 ? 1 : 0;
    box(c, 2 + inset, y, 15 - inset, y, y < 4 ? WOOD[3] : WOOD[2]);
  }
  box(c, 2, 7, 15, 15, WOOD[1]);
  for (let x = 2; x <= 15; x += 4) box(c, x, 8, x, 15, WOOD[0]);
  box(c, 2, 7, 15, 7, '#2e241c');
  for (const x of [4, 12]) box(c, x, 2, x + 1, 15, '#3a3d44');
  box(c, 7, 8, 10, 11, '#e3b85a');
  c.set(8, 10, '#6b4a1a');
  c.set(7, 8, '#fff2b0');
});

/** Lanterne de pierre (tōrō) ; `lit` : la fenêtre du foyer brûle. */
function toro(c, lit, frame = 0) {
  box(c, 2, 23, 11, 26, STONE[1]);
  box(c, 2, 23, 11, 23, STONE[2]);
  column(c, 5, 8, 15, 22, [STONE[0], STONE[1], STONE[2]]);
  box(c, 3, 13, 10, 15, STONE[2]);
  box(c, 3, 15, 10, 15, STONE[0]);
  column(c, 4, 9, 8, 12, [STONE[0], STONE[1], STONE[2]]);
  if (lit) {
    const flicker = [['#ffcf6b', '#ff8a3a'], ['#ffe39a', '#ffab4a'], ['#ffcf6b', '#ff9a3a'], ['#fff2c0', '#ffbf5a']][frame % 4];
    box(c, 5, 9, 8, 11, flicker[1]);
    box(c, 6, 9 + (frame % 2), 7, 11, flicker[0]);
  } else {
    box(c, 5, 9, 8, 11, '#2e3033');
  }
  // Toit aux coins relevés et joyau au sommet.
  for (let y = 4; y <= 7; y++) box(c, 6 - (y - 3) * 1.5, y, 7 + (y - 3) * 1.5, y, y === 7 ? STONE[0] : STONE[2]);
  c.set(0, 6, STONE[2]);
  c.set(13, 6, STONE[2]);
  c.ellipse(6.5, 2, 1.5, 1.5, [STONE[1], STONE[2], STONE[3]]);
  c.set(2, 25, MOSS[1]);
  c.set(10, 24, MOSS[0]);
}

export const lanterne = still(14, 27, (c) => toro(c, false));
export const lanterneAllumee = looping(14, 27, 4, 0.12, (c, frame) => toro(c, true, frame));

/** Sutra égaré : rouleau déplié sur une pierre plate, sceau rouge, une lueur d'esprit. */
export const sutra = still(16, 11, (c) => {
  poly(c, [[1, 7], [14, 6], [15, 10], [0, 10]], STONE[1]);
  box(c, 1, 7, 14, 7, STONE[2]);
  box(c, 3, 3, 12, 6, PAPER);
  box(c, 3, 6, 12, 6, PAPER_SHADE);
  for (let x = 4; x <= 11; x += 2) box(c, x, 4, x, 5, '#3a2a1c');
  c.set(11, 3, VERMILION[1]);
  c.ellipse(2, 4.5, 1.2, 1.8, [WOOD[1], WOOD[2], WOOD[3]]);
  c.ellipse(13, 4.5, 1.2, 1.8, [WOOD[1], WOOD[2], WOOD[3]]);
  c.set(8, 1, '#9ff3ff');
});

/** Voyageur d'argile : haniwa de terre cuite, yeux et bouche creux, chapeau de paille et bâton de marche. */
export const argile = still(24, 36, (c) => {
  const clay = ['#9c5a33', '#c8784a', '#e0955f'];
  // Socle cylindrique et corps.
  column(c, 6, 17, 22, 35, clay);
  box(c, 6, 22, 17, 22, clay[2]);
  column(c, 7, 16, 12, 22, clay);
  c.ellipse(11.5, 12, 5, 2, clay);
  // Bras levé qui salue, bras le long du corps.
  c.line([16, 16], [20, 11], 1.3, clay[1]);
  c.line([7, 16], [4, 22], 1.2, clay[0]);
  // Visage : trois trous sombres.
  c.ellipse(11.5, 8, 4.2, 4.5, clay);
  c.set(10, 7, '#3a2218');
  c.set(13, 7, '#3a2218');
  box(c, 11, 10, 12, 10, '#3a2218');
  // Chapeau de paille et bâton.
  for (let y = 2; y <= 4; y++) box(c, 11 - (y - 1) * 3, y, 12 + (y - 1) * 3, y, y === 4 ? '#b38b45' : '#e3c27a');
  c.line([21, 6], [21, 35], 0, WOOD[1]);
  c.set(20, 10, clay[2]);
  // Craquelures.
  c.set(8, 26, clay[0]);
  c.set(9, 27, clay[0]);
  c.set(15, 30, clay[0]);
});

/** Barque de Charon : longue coque de bois sombre, lanterne pendue à la perche de proue. */
export const barque = still(76, 36, (c) => {
  // Perche et lanterne à la proue (à gauche : la barque regarde vers la gauche).
  c.line([10, 24], [7, 2], 0.6, WOOD[1]);
  c.line([7, 2], [3, 3], 0, WOOD[0]);
  c.line([3, 3], [3, 6], 0, '#2e241c');
  c.ellipse(3, 9, 2.2, 3, ['#c8412f', '#ffab4a', '#ffe39a']);
  box(c, 1, 6, 5, 6, BLACK_LACQUER);
  box(c, 1, 12, 5, 12, BLACK_LACQUER);
  // Coque : proue relevée à gauche, poupe basse à droite.
  for (let x = 4; x <= 74; x++) {
    const t = (x - 4) / 70;
    const top = Math.round(22 - Math.max(0, 1 - t * 5) * 8 + Math.max(0, t - 0.85) * 12);
    const bottom = Math.round(30 + Math.sin(t * Math.PI) * 3 - Math.max(0, 1 - t * 6) * 4);
    for (let y = top; y <= bottom; y++) {
      const plank = (y - top) % 3 === 2;
      c.set(x, y, y === top ? WOOD[3] : plank ? WOOD[0] : y > bottom - 2 ? '#2e241c' : WOOD[1]);
    }
  }
  // Bancs et rame à la poupe.
  for (const x of [30, 48]) box(c, x, 21, x + 3, 22, WOOD[2]);
  c.line([66, 18], [74, 34], 0.6, WOOD[2]);
  c.line([72, 31], [75, 35], 1, WOOD[1]);
});

/** Grand rocher scellé : shimenawa épaisse, shide, et des fissures dont la lueur rouge bat lentement. */
export const rocher = looping(78, 82, 6, 0.18, (c, frame, frames) => {
  const pulse = 0.5 + 0.5 * Math.sin((frame / frames) * Math.PI * 2);
  // Masse du rocher, ombrée et grenue.
  for (let y = 4; y <= 81; y++) {
    for (let x = 2; x <= 76; x++) {
      const nx = (x - 39) / 37;
      const ny = (y - 46) / 40;
      const bump = (noise(x, y, 9, 11) - 0.5) * 0.35;
      if (nx * nx + ny * ny * (y > 60 ? 0.6 : 1) + bump > 1) continue;
      const lit = -nx * 0.55 - ny * 0.75 + (noise(x, y, 4, 12) - 0.5) * 0.5;
      c.set(x, y, lit > 0.55 ? '#a3a9ac' : lit > 0.15 ? '#848a8e' : lit > -0.35 ? '#666c70' : '#4a5054');
    }
  }
  // Mousse sur le dessus.
  for (let x = 16; x <= 62; x++) {
    const top = 46 - Math.round(Math.sqrt(Math.max(0, 1 - ((x - 39) / 37) ** 2)) * 40);
    if (noise(x, 0, 5, 4) > 0.45) for (let k = 0; k < 2 + Math.floor(hash(x, 4) * 3); k++) c.set(x, top + 1 + k, MOSS[k % 3]);
  }
  // Fissures : un trait sombre au cœur rouge qui s'allume et s'éteint.
  const glow = mix('#8e2c1f', '#ff6a4a', pulse);
  const cracks = [
    [[22, 58], [28, 50], [26, 42], [33, 34]],
    [[52, 62], [48, 54], [55, 46], [51, 38]],
    [[38, 72], [40, 64], [36, 58]],
  ];
  for (const crack of cracks) {
    for (let i = 0; i < crack.length - 1; i++) {
      c.line(crack[i], crack[i + 1], 0.6, '#2e2426');
      c.line(crack[i], crack[i + 1], 0, glow);
    }
  }
  // Shimenawa autour du rocher, et ses papiers.
  const ropeY = (x) => 40 + Math.round(((x - 39) / 37) ** 2 * 10);
  const points = [];
  for (let x = 5; x <= 73; x += 4) points.push([x, ropeY(x)]);
  rope(c, points, 2.2, ['#8a7440', '#d9c38a', '#efe0ae']);
  for (const x of [17, 31, 47, 61]) shide(c, x, ropeY(x) + 3, 10);
});
