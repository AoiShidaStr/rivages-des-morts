// Icônes en pixel art de tous les objets et matériaux (32 × 32), dessinées à la main dans le code.
// Elles servent de référence pour faire repeindre les icônes par Nano Banana (tools/collection-objets.mjs).

export const SIZE = 32;
export const OUTLINE = '#1d1a1c';

/** Polygone plein (remplissage par lignes). */
export function poly(c, points, color) {
  const ys = points.map((p) => p[1]);
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
    const xs = [];
    for (let i = 0; i < points.length; i++) {
      const [ax, ay] = points[i];
      const [bx, by] = points[(i + 1) % points.length];
      const yy = y + 0.5;
      if ((ay <= yy && by > yy) || (by <= yy && ay > yy)) xs.push(ax + ((yy - ay) * (bx - ax)) / (by - ay));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) c.set(x, y, color);
  }
}

const px = (c, list, color) => list.forEach(([x, y]) => c.set(x, y, color));

/** Magatama : une virgule de jade (grosse tête ronde, queue qui s'enroule). */
function magatama(c, cx, cy, r, [dark, base, light], cracked = false) {
  c.ellipse(cx, cy, r, r, [dark, base, light]);
  // Queue : disques de plus en plus petits qui descendent en s'enroulant vers la gauche.
  for (let i = 1; i <= 6; i++) {
    const t = i / 6;
    c.disc(cx + r * 0.55 - t * r * 1.1, cy + r * 0.6 + t * r * 0.9, r * (0.65 - t * 0.45), i > 3 ? dark : base);
  }
  c.disc(cx - 1, cy - 1, Math.max(1, r * 0.28), '#1d2a22');
  c.set(cx - Math.round(r / 2), cy - Math.round(r / 2), light);
  if (cracked) px(c, [[cx + 2, cy - r + 1], [cx + 2, cy - r + 2], [cx + 3, cy - r + 3], [cx + 3, cy - r + 4], [cx + 2, cy - r + 5]], '#2b3a2e');
}

/** Cordon qui pend en boucle. */
function cord(c, x0, y0, x1, y1, color) {
  c.line([x0, y0], [x1, y1], 0, color);
}

export const ICONS = {
  // --- Armes ---------------------------------------------------------------
  nodachi(c) {
    // Longue lame nue en diagonale, garde de bronze, poignée de tissu délavé.
    for (let i = 0; i <= 19; i++) {
      c.set(11 + i, 20 - i, '#eef2f5');
      c.set(12 + i, 20 - i, '#b9c2ca');
      c.set(12 + i, 21 - i, '#8f9aa3');
    }
    c.set(31, 0, '#eef2f5');
    px(c, [[17, 15], [22, 10], [25, 7]], '#b0703c');
    c.disc(10, 22, 1.6, '#7a6038');
    px(c, [[9, 21], [10, 21]], '#c9a55a');
    for (let i = 0; i <= 6; i++) {
      c.set(8 - i, 24 + i, i % 2 ? '#7d8fa0' : '#aebccb');
      c.set(9 - i, 24 + i, '#56646f');
      c.set(8 - i, 23 + i, '#56646f');
    }
    c.disc(1, 31, 1, '#7a6038');
  },
  kanabo(c) {
    // Massue de fer qui s'élargit vers le haut, clous clairs, poignée laquée rouge.
    poly(c, [[5, 27], [8, 30], [27, 9], [23, 3], [20, 4]], '#4a4d55');
    poly(c, [[6, 26], [8, 28], [24, 9], [22, 5]], '#686c76');
    c.line([9, 24], [22, 6], 0, '#8a909b');
    for (const [x, y] of [[11, 22], [14, 18], [17, 14], [20, 11], [23, 8], [16, 20], [19, 16], [22, 13], [25, 10], [13, 16], [18, 9]]) {
      c.set(x, y, '#dfe3ea');
      c.set(x + 1, y + 1, '#2b2d33');
    }
    poly(c, [[2, 28], [5, 31], [9, 27], [6, 24]], '#b3322a');
    px(c, [[4, 27], [5, 26], [6, 25]], '#e0554a');
    c.disc(2, 30, 1.2, '#6b6f78');
  },
  'katana-ronin'(c) {
    // Katana dans son fourreau noir usé, garde ébréchée, cordon rouge effiloché.
    for (let i = 0; i <= 17; i++) {
      c.set(12 + i, 19 - i, '#3a3940');
      c.set(13 + i, 19 - i, '#232228');
      c.set(13 + i, 20 - i, '#16151a');
    }
    px(c, [[16, 15], [20, 11], [24, 7]], '#5a5962');
    c.disc(10, 21, 2, '#8a6d2c');
    px(c, [[8, 21], [12, 20]], '#1d1a1c');
    for (let i = 0; i <= 7; i++) {
      c.set(8 - i, 23 + i, '#1d1c22');
      c.set(9 - i, 23 + i, i % 2 ? '#e8e2d4' : '#1d1c22');
      c.set(8 - i, 22 + i, '#2b2a30');
    }
    // Cordon rouge qui pend de la garde.
    c.line([11, 23], [13, 29], 0, '#c8412f');
    c.line([12, 23], [15, 28], 0, '#9b2f22');
    px(c, [[13, 30], [15, 29], [16, 29]], '#e0554a');
  },

  'grelots-onmyoji'(c) {
    // Shakujō : bâton de bois, anneau d'or en haut, grelots et bandes de papier ofuda.
    c.line([4, 29], [21, 12], 1, '#6b4a2c');
    c.line([5, 28], [21, 12], 0, '#9a7450');
    for (let a = 0; a < 360; a += 20) {
      const t = (a * Math.PI) / 180;
      c.set(24 + Math.round(Math.cos(t) * 5), 8 + Math.round(Math.sin(t) * 5), '#e3b85a');
    }
    for (const [x, y] of [[19, 13], [29, 11], [23, 15]]) {
      c.disc(x, y + 2, 1.5, '#e3b85a');
      c.set(x - 1, y + 1, '#fff2b0');
      c.set(x, y + 3, '#8a6d2c');
    }
    c.line([14, 19], [15, 25], 0, '#f4efe2');
    c.line([15, 19], [17, 24], 0, '#e8e2d4');
    px(c, [[15, 21], [16, 22]], '#c8412f');
  },
  'eventail-jorogumo'(c) {
    // Éventail ouvert de soie noire et rouge, nervures blanches comme une toile, rivet d'or.
    for (let r = 4; r <= 14; r++) {
      for (let a = -165; a <= -15; a += 2) {
        const t = (a * Math.PI) / 180;
        const band = Math.floor((a + 165) / 15) % 2;
        c.set(16 + Math.round(Math.cos(t) * r), 25 + Math.round(Math.sin(t) * r), r > 12 ? '#e0554a' : band ? '#3a2230' : '#5a2a3a');
      }
    }
    for (let a = -165; a <= -15; a += 15) {
      const t = (a * Math.PI) / 180;
      c.line([16, 25], [16 + Math.cos(t) * 14, 25 + Math.sin(t) * 14], 0, '#d9dde6');
    }
    for (const r of [8, 11]) {
      for (let a = -160; a <= -20; a += 4) {
        const t = (a * Math.PI) / 180;
        c.set(16 + Math.round(Math.cos(t) * r), 25 + Math.round(Math.sin(t) * r), '#c9d2dc');
      }
    }
    c.line([16, 25], [16, 30], 1, '#2b1d22');
    c.disc(16, 25, 1.2, '#e3b85a');
  },
  'kunai-jumeaux'(c) {
    // Deux kunai croisés, pointes en haut, anneaux au pommeau, noués d'un cordon rouge.
    const kunai = (x0, y0, dx, dy) => {
      c.disc(x0, y0, 1.6, '#e3b85a');
      c.disc(x0, y0, 0.5, '#1d1a1c');
      c.line([x0 + dx * 2, y0 + dy * 2], [x0 + dx * 7, y0 + dy * 7], 1, '#8e2f2a');
      poly(c, [[x0 + dx * 8 - dy * 2.5, y0 + dy * 8 + dx * 2.5], [x0 + dx * 8 + dy * 2.5, y0 + dy * 8 - dx * 2.5], [x0 + dx * 26, y0 + dy * 26]], '#dfe6ee');
      c.line([x0 + dx * 8, y0 + dy * 8], [x0 + dx * 25, y0 + dy * 25], 0, '#9eacb6');
    };
    kunai(4, 28, 0.707, -0.707);
    kunai(28, 28, -0.707, -0.707);
    c.line([12, 21], [20, 21], 0, '#c8412f');
    px(c, [[15, 22], [16, 23], [17, 22]], '#e0554a');
  },
  'naginata-temple'(c) {
    // Naginata en diagonale, lame courbe, et le petit bouclier rond du temple devant.
    c.line([2, 30], [21, 11], 0.6, '#7a2a22');
    c.line([3, 30], [21, 12], 0, '#a8433a');
    c.disc(21, 11, 1.2, '#e3b85a');
    poly(c, [[22, 9], [24, 11], [31, 2], [29, 1]], '#dfe6ee');
    c.line([23, 10], [30, 2], 0, '#9eacb6');
    c.set(31, 1, '#ffffff');
    c.disc(10, 22, 7, '#7a5a26');
    c.disc(10, 22, 5.6, '#d9a93f');
    c.disc(10, 22, 2.2, '#c8412f');
    for (const [x, y] of [[10, 17], [10, 27], [5, 22], [15, 22]]) c.set(x, y, '#fff2b0');
    px(c, [[7, 19], [8, 18]], '#f3d88a');
  },
  'yumi-bambou'(c) {
    // Grand arc asymétrique de bambou laqué : la poignée est placée bas, la corde tendue.
    const top = [9, 1];
    const bottom = [5, 30];
    let prev = top;
    for (let i = 1; i <= 20; i++) {
      const t = i / 20;
      const y = 1 + t * 29;
      const x = 9 - t * 4 + Math.sin(t * Math.PI) * 13 * (1 - 0.3 * t);
      c.line(prev, [x, y], 0.6, i % 5 === 0 ? '#2b1d12' : '#8a6a3e');
      prev = [x, y];
    }
    c.line(top, bottom, 0, '#f4efe2');
    c.rect(17, 19, 2, 4, '#c8412f');
    px(c, [[10, 2], [12, 4]], '#b8925a');
  },
  kusarigama(c) {
    // Faucille au manche de bois, chaîne qui pend en boucle jusqu'à un poids de fer.
    c.line([8, 22], [16, 12], 1, '#6b4a2c');
    poly(c, [[15, 12], [18, 9], [25, 7], [30, 10], [26, 9], [20, 11]], '#dfe6ee');
    c.line([17, 10], [27, 8], 0, '#9eacb6');
    c.set(30, 10, '#ffffff');
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      const x = 8 - t * 5 + Math.sin(t * Math.PI) * 3;
      const y = 22 + t * 6;
      c.set(x, y, i % 2 ? '#8f9aa3' : '#56646f');
    }
    c.disc(3, 29, 1.8, '#4a4d55');
    c.set(2, 28, '#8a909b');
  },
  'crocs-jorogumo'(c) {
    // Deux crocs d'araignée recourbés vers l'extérieur, pointes violettes de venin, poignées gainées de soie.
    const fang = (x, flip) => {
      for (let i = 0; i <= 24; i++) {
        const t = i / 24;
        const fx = x + flip * Math.sin(t * 2.4) * 6;
        const fy = 21 - t * 18;
        const r = 2.4 * (1 - t) + 0.3;
        c.disc(fx, fy, r, t > 0.72 ? '#8b3fa8' : '#efe6d2');
        c.set(fx - flip * r, fy, t > 0.72 ? '#5e2474' : '#c9bfa6');
      }
      c.rect(x - 2, 22, 5, 8, '#dfe6ee');
      for (let y = 23; y < 30; y += 2) c.line([x - 2, y], [x + 2, y], 0, '#aeb8c4');
    };
    fang(11, -1);
    fang(21, 1);
    px(c, [[14, 26], [16, 27], [18, 26]], '#c8412f');
  },
  'tetsubo-cloche'(c) {
    // Barre de fer cloutée en diagonale, et une cloche de temple fendue en guise de bouclier.
    poly(c, [[3, 26], [6, 29], [24, 9], [21, 6]], '#4a4d55');
    c.line([5, 26], [22, 8], 0, '#8a909b');
    for (const [x, y] of [[9, 22], [13, 18], [17, 14], [21, 10], [11, 22], [15, 18], [19, 14]]) c.set(x, y, '#dfe3ea');
    poly(c, [[16, 30], [30, 30], [28, 24], [27, 17], [23, 14], [19, 17], [18, 24]], '#8a6a2a');
    poly(c, [[18, 28], [28, 28], [26, 23], [25, 18], [23, 16], [21, 18], [20, 23]], '#c9973f');
    c.line([22, 17], [20, 25], 0, '#5a4a20');
    c.rect(22, 12, 3, 2, '#5a4a20');
    px(c, [[24, 19], [25, 21]], '#f3d88a');
  },
  'miroir-yata'(c) {
    // Miroir sacré octogonal de bronze : face claire qui reflète, cordon de soie rouge.
    const oct = [[11, 4], [21, 4], [28, 11], [28, 21], [21, 28], [11, 28], [4, 21], [4, 11]];
    poly(c, oct, '#8a6a2a');
    poly(c, oct.map(([x, y]) => [16 + (x - 16) * 0.8, 16 + (y - 16) * 0.8]), '#c9973f');
    c.disc(16, 16, 7.5, '#dfe9ef');
    c.disc(16, 16, 5, '#f4fbff');
    px(c, [[12, 12], [13, 11], [14, 12], [13, 13]], '#ffffff');
    px(c, [[18, 19], [20, 17]], '#b9d6e6');
    c.line([16, 1], [16, 4], 0, '#c8412f');
    c.line([14, 1], [18, 1], 0, '#e0554a');
  },
  hankyu(c) {
    // Arc court de cavalier, bien cambré, et deux flèches empennées de rouge.
    let prev = [8, 5];
    for (let i = 1; i <= 16; i++) {
      const t = i / 16;
      const pt = [8 + Math.sin(t * Math.PI) * 9, 5 + t * 22];
      c.line(prev, pt, 0.6, i === 8 ? '#2b1d12' : '#7a5230');
      prev = pt;
    }
    c.line([8, 5], [8, 27], 0, '#f4efe2');
    for (const dy of [0, 4]) {
      c.line([12, 14 + dy], [30, 10 + dy], 0, '#c9a36a');
      c.set(30, 10 + dy, '#dfe6ee');
      c.set(31, 10 + dy, '#dfe6ee');
      px(c, [[12, 13 + dy], [13, 15 + dy], [14, 13 + dy]], '#c8412f');
    }
  },
  'arc-soie'(c) {
    // Arc de bois noir, corde de soie blanche, une toile d'araignée tissée contre la poignée.
    let prev = [10, 2];
    for (let i = 1; i <= 20; i++) {
      const t = i / 20;
      const pt = [10 + Math.sin(t * Math.PI) * 12, 2 + t * 28];
      c.line(prev, pt, 0.6, i % 5 === 0 ? '#5a2a3a' : '#2b2330');
      prev = pt;
    }
    c.line([10, 2], [10, 30], 0, '#ffffff');
    // La toile : quatre rayons depuis la poignée et un fil qui les relie.
    const grip = [21, 16];
    for (const [x, y] of [[16, 10], [14, 16], [16, 22], [19, 25]]) c.line(grip, [x, y], 0, '#c9d2dc');
    for (const [x, y] of [[18, 12], [17, 16], [18, 20]]) c.set(x, y, '#ffffff');
    c.rect(20, 14, 3, 4, '#c8412f');
  },

  'totsuka-tsurugi'(c) {
    // Tsurugi droite à double tranchant, en bronze, pommeau en anneau ; la foudre crépite le long de la lame.
    for (let i = 0; i <= 20; i++) {
      c.set(9 + i, 22 - i, '#f0d890');
      c.set(10 + i, 22 - i, '#c9a55a');
      c.set(10 + i, 23 - i, '#8a6d2c');
      c.set(11 + i, 23 - i, '#b08a3e');
    }
    c.line([6, 20], [12, 26], 0, '#6b4a1c');
    for (let i = 0; i <= 3; i++) {
      c.set(7 - i, 25 + i, i % 2 ? '#5a3a1c' : '#7a5230');
      c.set(8 - i, 25 + i, '#3a2412');
    }
    for (let a = 0; a < 360; a += 30) {
      const t = (a * Math.PI) / 180;
      c.set(2 + Math.round(Math.cos(t) * 2), 29 + Math.round(Math.sin(t) * 2), '#c9a55a');
    }
    px(c, [[19, 7], [20, 6], [19, 5], [20, 4], [26, 10], [27, 11], [26, 12], [27, 13], [13, 12], [12, 13]], '#ffe066');
    px(c, [[20, 5], [27, 12]], '#fffbe0');
  },
  'kaiken-izanami'(c) {
    // Petit poignard dans un fourreau laqué blanc, bague d'argent ; une tache sombre suinte de l'embouchure.
    for (let i = 0; i <= 15; i++) {
      c.set(8 + i, 24 - i, '#ffffff');
      c.set(9 + i, 24 - i, '#e8e2d4');
      c.set(9 + i, 25 - i, '#bdb6a9');
      c.set(10 + i, 25 - i, '#a39c90');
    }
    c.disc(8, 25, 1.2, '#aeb8c4');
    c.line([23, 8], [25, 10], 0, '#dfe6ee');
    c.line([24, 8], [26, 10], 0, '#8f9aa3');
    for (let i = 0; i <= 5; i++) {
      c.set(25 + i, 8 - i, i % 2 ? '#2b2330' : '#3e3446');
      c.set(26 + i, 8 - i, '#1d1a1c');
    }
    px(c, [[22, 10], [21, 11], [22, 12], [20, 12], [21, 13], [19, 14], [20, 15]], '#4a1a26');
    px(c, [[23, 11], [20, 13], [19, 16]], '#2b0f16');
  },
  'arc-pecher'(c) {
    // Arc de pêcher noueux, corde pâle, fleurs roses qui poussent le long du bois.
    let prev = [9, 3];
    for (let i = 1; i <= 20; i++) {
      const t = i / 20;
      const pt = [9 + Math.sin(t * Math.PI) * 13, 3 + t * 26];
      c.line(prev, pt, 0.7, i % 4 === 0 ? '#4d2f1c' : '#7a4a2c');
      prev = pt;
    }
    c.line([9, 3], [9, 29], 0, '#efe6d0');
    for (const [x, y] of [[14, 6], [21, 13], [20, 21], [14, 26]]) {
      c.disc(x, y, 1.4, '#f4a6c0');
      c.set(x, y, '#ffd84a');
    }
    px(c, [[17, 9], [18, 9], [22, 17], [23, 17], [17, 24], [16, 24]], '#6fae4a');
  },

  // --- Reliques -------------------------------------------------------------
  'coupelle-kappa'(c) {
    // Coupelle de céramique pleine d'une eau qui ne déborde jamais.
    c.ellipse(16, 20, 12, 6, ['#9c917a', '#c9bfa6', '#e8e0cc']);
    c.ellipse(16, 17, 12, 4, ['#b8ad94', '#e8e0cc', '#f7f2e6']);
    c.ellipse(16, 17, 10, 3, ['#3e8a9a', '#5fb0c2', '#a8e6f0']);
    px(c, [[12, 16], [13, 16], [19, 17]], '#e8fdff');
    px(c, [[16, 9], [16, 11], [15, 10], [17, 10]], '#bfeef5');
    c.set(16, 10, '#ffffff');
  },
  'fil-joren'(c) {
    // Bobine de soie argentée entre deux flasques de bois, un fil qui flotte.
    c.ellipse(13, 25, 8, 3, ['#5a3f27', '#7b5a3a', '#9a7450']);
    c.rect(7, 12, 13, 13, '#c9d2dc');
    for (let y = 13; y < 25; y += 2) c.line([7, y], [19, y], 0, y % 4 === 1 ? '#e8eef4' : '#aeb8c4');
    c.rect(7, 12, 2, 13, '#9aa5b1');
    c.ellipse(13, 11, 8, 3, ['#5a3f27', '#7b5a3a', '#9a7450']);
    c.ellipse(13, 11, 3, 1, '#3a2b20');
    // Le fil s'élève en ondulant, lumineux.
    for (let i = 0; i < 14; i++) c.set(20 + Math.round(i * 0.7), 18 - i + Math.round(Math.sin(i * 0.8) * 1.5), i % 3 ? '#e8fbff' : '#8feaff');
  },
  'magatama-yasakani'(c) {
    // Grand magatama de jade profond, auréole dorée.
    for (let a = 0; a < 24; a++) {
      const t = (a / 24) * Math.PI * 2;
      if (a % 2) c.set(15 + Math.round(Math.cos(t) * 13), 15 + Math.round(Math.sin(t) * 13), '#f0d27a');
    }
    for (const [x, y] of [[4, 5], [27, 6], [26, 26], [5, 25]]) c.set(x, y, '#fff2b8');
    magatama(c, 14, 12, 7, ['#155c38', '#1f7a4d', '#7fdca8']);
  },

  'peigne-izanagi'(c) {
    // Peigne de bois sombre aux longues dents ; des pousses de bambou naissent au bout des dents.
    poly(c, [[5, 9], [9, 6], [23, 6], [27, 9], [26, 13], [6, 13]], '#4d2f1c');
    c.line([9, 7], [23, 7], 0, '#7a5230');
    for (let x = 7; x <= 25; x += 2) c.line([x, 13], [x, 21], 0, '#5a3a22');
    for (const x of [9, 15, 21, 25]) {
      c.line([x, 21], [x, 28], 0, '#6fae4a');
      c.set(x, 24, '#3e7a2c');
      poly(c, [[x, 26], [x + 3, 24], [x + 1, 27]], '#8fd060');
    }
  },

  // --- Casques --------------------------------------------------------------
  'chapeau-paille'(c) {
    // Sugegasa : chapeau conique de paille tressée, cordon rouge.
    poly(c, [[16, 6], [30, 21], [2, 21]], '#d9b45a');
    poly(c, [[16, 6], [30, 21], [18, 21]], '#c19a41');
    for (let i = 0; i < 6; i++) c.line([16, 7], [4 + i * 5, 20], 0, '#b08a3a');
    c.line([16, 6], [8, 14], 0, '#f0d27a');
    c.ellipse(16, 21, 14, 2, ['#9c7a30', '#c19a41', '#d9b45a']);
    cord(c, 11, 22, 14, 29, '#c8412f');
    cord(c, 21, 22, 18, 29, '#c8412f');
    c.set(16, 30, '#c8412f');
    px(c, [[15, 30], [17, 30]], '#9b2f22');
  },
  'kabuto-fendu'(c) {
    // Casque de samouraï fendu : bombe de fer, couvre-nuque à lamelles lacées.
    c.ellipse(16, 13, 10, 8, ['#3e424a', '#5a5f6a', '#8a909b']);
    c.rect(6, 13, 21, 3, '#2b2d33');
    for (let row = 0; row < 3; row++) {
      poly(c, [[5 - row, 16 + row * 4], [27 + row, 16 + row * 4], [28 + row, 20 + row * 4], [4 - row, 20 + row * 4]], row % 2 ? '#4a4d55' : '#5a5f6a');
      for (let x = 6 - row; x < 27 + row; x += 3) c.set(x, 18 + row * 4, '#9b2f22');
    }
    c.rect(15, 5, 2, 3, '#b8944f');
    // La fente.
    px(c, [[18, 6], [17, 8], [18, 9], [19, 11], [18, 13]], '#16151a');
    px(c, [[19, 7], [19, 9], [20, 11]], '#aab0ba');
  },
  'masque-oublie'(c) {
    // Masque blanc lisse, sans aucun trait, retenu par deux cordons ; bord fêlé, un peu de brume.
    c.line([1, 11], [8, 13], 0, '#3a3840');
    c.line([31, 11], [24, 13], 0, '#3a3840');
    poly(c, [[8, 5], [12, 2], [20, 2], [24, 5], [25, 14], [22, 23], [16, 26], [10, 23], [7, 14]], '#e8e2d4');
    poly(c, [[16, 2], [20, 2], [24, 5], [25, 14], [22, 23], [16, 26]], '#d2cbbb');
    // Arête du nez à peine marquée : c'est tout ce qui reste d'un visage.
    c.line([16, 8], [16, 16], 0, '#faf7f0');
    c.line([17, 9], [17, 16], 0, '#bfb8a8');
    c.line([10, 5], [13, 3], 0, '#faf7f0');
    px(c, [[23, 16], [22, 18], [23, 19], [21, 21]], '#6d6658');
    for (let x = 6; x < 27; x++) c.set(x, 29 + Math.round(Math.sin(x * 0.9)), x % 3 ? '#aeb8c4' : '#cfd6de');
  },

  'voile-izanami'(c) {
    // Voile blanc des morts, posé sur une tête invisible, avec le bandeau triangulaire (hitaikakushi).
    poly(c, [[16, 3], [24, 8], [27, 18], [29, 29], [3, 29], [5, 18], [8, 8]], '#d9d6e0');
    poly(c, [[16, 3], [24, 8], [27, 18], [29, 29], [18, 29], [19, 12]], '#c4c0cc');
    poly(c, [[15, 4], [9, 8], [6, 18], [5, 28], [10, 28], [11, 14]], '#f4f2f8');
    for (const x of [8, 13, 19, 24]) c.line([x, 17], [x + Math.round((x - 16) * 0.3), 29], 0, '#b3aebe');
    poly(c, [[11, 9], [21, 9], [16, 15]], '#ffffff');
    c.line([6, 9], [26, 9], 0, '#9c97a8');
  },

  // --- Plastrons --------------------------------------------------------------
  shiroshozoku(c) {
    // Kimono blanc des morts, croisé droite sur gauche, ceinture claire.
    poly(c, [[3, 7], [12, 4], [20, 4], [29, 7], [29, 16], [23, 15], [23, 29], [9, 29], [9, 15], [3, 16]], '#e8e2d4');
    poly(c, [[20, 4], [29, 7], [29, 16], [23, 15], [23, 29], [18, 29]], '#d2cbbb');
    c.line([12, 4], [19, 16], 0, '#b8b2a4');
    c.line([20, 4], [13, 16], 0, '#9c968a');
    c.rect(9, 17, 14, 3, '#b8b2a4');
    c.line([9, 18], [22, 18], 0, '#cfc8b8');
    c.line([16, 20], [16, 28], 0, '#cfc8b8');
  },
  'carapace-kappa'(c) {
    // Plastron taillé dans une carapace : plaques hexagonales moussues, sangles, boucles de bronze.
    c.ellipse(16, 16, 12, 13, ['#4d5a2a', '#6b7a3a', '#8fa252']);
    for (const [x, y] of [[16, 9], [10, 14], [22, 14], [16, 17], [10, 21], [22, 21], [16, 25]]) {
      poly(c, [[x - 3, y], [x - 1, y - 3], [x + 2, y - 3], [x + 4, y], [x + 2, y + 3], [x - 1, y + 3]], '#3f4a22');
      poly(c, [[x - 2, y], [x - 1, y - 2], [x + 2, y - 2], [x + 3, y], [x + 2, y + 2], [x - 1, y + 2]], (x + y) % 2 ? '#7c8c44' : '#6b7a3a');
    }
    px(c, [[9, 20], [10, 21], [21, 11]], '#9dba5a');
    c.rect(3, 12, 26, 2, '#6b4a2a');
    c.rect(3, 22, 26, 2, '#6b4a2a');
    c.rect(4, 11, 3, 4, '#c9a24a');
    c.rect(25, 21, 3, 4, '#c9a24a');
  },

  'do-yomi'(c) {
    // Cuirasse de lamelles d'os laquées de noir, lacées de rouge.
    poly(c, [[5, 6], [12, 4], [14, 8], [18, 8], [20, 4], [27, 6], [27, 13], [25, 28], [7, 28], [5, 13]], '#26242b');
    poly(c, [[18, 8], [20, 4], [27, 6], [27, 13], [25, 28], [18, 28]], '#1a191e');
    for (let y = 11; y <= 25; y += 4) {
      c.line([6, y], [26, y], 0, '#3e3b46');
      c.line([6, y + 1], [26, y + 1], 0, '#d8d0bd');
    }
    for (let x = 9; x <= 23; x += 4) {
      for (let y = 9; y <= 26; y += 4) {
        c.set(x, y, '#c8412f');
        c.set(x, y + 2, '#9b2f22');
      }
    }
    c.line([12, 4], [7, 6], 0, '#c8412f');
    c.line([20, 4], [25, 6], 0, '#c8412f');
  },

  // --- Jambières ----------------------------------------------------------------
  'hakama-soie'(c) {
    // Hakama de soie noire à larges plis, broderies de fils d'araignée argentés.
    poly(c, [[9, 5], [23, 5], [29, 29], [18, 29], [16, 17], [14, 29], [3, 29]], '#26242a');
    for (const x of [7, 11, 21, 25]) c.line([x + (x < 16 ? 3 : -3), 7], [x, 28], 0, '#3a3840');
    c.rect(8, 4, 16, 3, '#3a3840');
    c.line([6, 5], [26, 5], 0, '#c9d2dc');
    // Toile brodée sur une jambe.
    for (let a = 0; a < 6; a++) c.line([23, 20], [23 + Math.round(Math.cos(a) * 4), 20 + Math.round(Math.sin(a) * 4)], 0, '#aeb8c4');
    px(c, [[21, 18], [25, 19], [22, 23], [25, 22]], '#e8eef4');
  },
  'suneate-ecailles'(c) {
    // Deux jambières d'écailles de kappa, attachées au papier huilé.
    for (const ox of [4, 17]) {
      poly(c, [[ox, 4], [ox + 10, 4], [ox + 11, 28], [ox + 1, 28]], '#4e6a3c');
      for (let y = 6; y < 27; y += 3) for (let x = ox + 1 + ((y / 3) % 2); x < ox + 10; x += 3) {
        c.set(x, y, '#7c9a5a');
        c.set(x + 1, y + 1, '#3a4f2c');
      }
      c.rect(ox, 9, 11, 1, '#d9c9a0');
      c.rect(ox, 21, 11, 1, '#d9c9a0');
    }
  },

  // --- Bottes ---------------------------------------------------------------------
  'geta-kasa'(c) {
    // Deux hautes geta de bois vues de dessus : semelle, lanière rouge en V (ce qui les fait reconnaître),
    // l'épaisseur des dents en bas, un bout de papier huilé noué autour.
    for (const [ox, oy] of [[4, 3], [17, 6]]) {
      c.rect(ox + 1, oy + 21, 3, 3, '#4a2f18');
      c.rect(ox + 7, oy + 21, 3, 3, '#4a2f18');
      c.rect(ox, oy + 19, 11, 3, '#6b4424');
      poly(c, [[ox + 1, oy + 1], [ox + 10, oy + 1], [ox + 11, oy + 3], [ox + 11, oy + 19], [ox, oy + 19], [ox, oy + 3]], '#b07a48');
      c.rect(ox + 9, oy + 3, 2, 16, '#8a5a33');
      c.line([ox + 1, oy + 3], [ox + 1, oy + 17], 0, '#c99462');
      // Lanière : un point à l'avant, deux attaches sur les côtés.
      c.line([ox + 5, oy + 4], [ox + 1, oy + 11], 0, '#c8412f');
      c.line([ox + 5, oy + 4], [ox + 9, oy + 11], 0, '#c8412f');
      c.line([ox + 6, oy + 5], [ox + 9, oy + 10], 0, '#9b2f22');
      c.set(ox + 5, oy + 4, '#e0554a');
      poly(c, [[ox, oy + 14], [ox + 11, oy + 13], [ox + 11, oy + 16], [ox, oy + 17]], '#e8d9b0');
      px(c, [[ox + 3, oy + 17], [ox + 8, oy + 16]], '#e8d9b0');
    }
  },
  'waraji-pelerin'(c) {
    // Sandales de paille de pèlerin, cordons blancs croisés.
    for (const ox of [4, 17]) {
      c.ellipse(ox + 5, 17, 5, 12, ['#9c7a40', '#c9a860', '#e0c887']);
      for (let y = 7; y < 28; y += 2) c.line([ox + 1, y], [ox + 9, y], 0, y % 4 === 1 ? '#b08a48' : '#d9bd78');
      c.line([ox + 1, 10], [ox + 9, 16], 0, '#efe6cf');
      c.line([ox + 9, 10], [ox + 1, 16], 0, '#efe6cf');
      c.set(ox + 5, 6, '#efe6cf');
    }
  },

  // --- Amulettes ------------------------------------------------------------------
  'lanterne-braise'(c) {
    // Petite lanterne de papier où brûle la braise bleue d'un feu follet.
    cord(c, 16, 1, 16, 5, '#c8412f');
    c.rect(12, 5, 9, 2, '#3a2b20');
    c.ellipse(16, 15, 8, 9, ['#c9b98f', '#e8d9b0', '#f7ecd0']);
    for (let y = 9; y <= 21; y += 3) c.line([9, y], [23, y], 0, '#b8a67c');
    c.ellipse(16, 15, 3, 4, ['#3fc6d8', '#6ff3ff', '#e8fdff']);
    c.set(16, 13, '#ffffff');
    c.rect(12, 24, 9, 2, '#3a2b20');
    cord(c, 16, 26, 16, 30, '#c8412f');
  },
  'magatama-fele'(c) {
    // Magatama de jade fêlé sur un cordon rouge, lueur faible.
    c.line([6, 3], [13, 9], 0, '#c8412f');
    c.line([26, 3], [19, 9], 0, '#c8412f');
    magatama(c, 16, 14, 6, ['#3f7f5a', '#5fae7e', '#b6ecca'], true);
  },
  'omamori-temple'(c) {
    // Sachet de protection en brocart rouge, nœud blanc, emblème doré.
    poly(c, [[8, 10], [12, 6], [20, 6], [24, 10], [24, 29], [8, 29]], '#b3322a');
    poly(c, [[20, 6], [24, 10], [24, 29], [19, 29]], '#8e271f');
    for (let y = 12; y < 28; y += 4) for (let x = 10; x < 23; x += 4) c.set(x + ((y / 4) % 2) * 2, y, '#d9b45a');
    c.disc(16, 19, 2.5, '#d9b45a');
    c.disc(16, 19, 1, '#8e271f');
    c.line([13, 6], [16, 2], 0, '#efe6cf');
    c.line([19, 6], [16, 2], 0, '#efe6cf');
    c.disc(16, 3, 1, '#efe6cf');
  },
  rokumonsen(c) {
    // Les six pièces trouées du péage de la rivière Sanzu, enfilées sur une ficelle.
    c.line([2, 10], [30, 22], 0, '#8a6d4a');
    const coins = [[5, 9], [15, 8], [25, 9], [7, 21], [17, 22], [27, 21]];
    for (const [x, y] of coins) {
      c.ellipse(x, y, 4, 4, ['#8a6a2a', '#b08a3a', '#e0c070']);
      c.rect(x - 1, y - 1, 2, 2, '#2b2218');
    }
  },
  'talisman-douteux'(c) {
    // Un ofuda de papier froissé couvert de gribouillis rouges, une feuille de tanuki dessus.
    poly(c, [[10, 5], [22, 4], [23, 29], [11, 30]], '#efe6cf');
    poly(c, [[18, 4], [22, 4], [23, 29], [19, 29]], '#d9ceb4');
    for (let y = 9; y < 27; y += 4) c.line([13, y], [19, y + 1 + (y % 3)], 0, '#c8412f');
    px(c, [[14, 11], [18, 15], [15, 20], [17, 24]], '#9b2f22');
    // Feuille (celle qui aide les tanuki à se transformer).
    poly(c, [[17, 1], [24, 0], [27, 4], [21, 7]], '#5fa04e');
    c.line([18, 2], [26, 3], 0, '#3f7a3a');
  },
  'dent-kappa'(c) {
    // Une « dent » d'ivoire au bout d'un cordon. Les kappa n'ont pas de dents.
    c.line([8, 2], [16, 10], 0, '#6b4a2a');
    c.line([24, 2], [16, 10], 0, '#6b4a2a');
    poly(c, [[12, 10], [21, 10], [19, 20], [16, 29], [14, 20]], '#efe6cf');
    poly(c, [[17, 10], [21, 10], [19, 20], [16, 29]], '#d6cbb0');
    c.line([13, 11], [15, 19], 0, '#ffffff');
    c.rect(13, 9, 7, 2, '#8a6a4a');
  },

  'peche-okamuzumi'(c) {
    // La dernière pêche d'Izanagi : ronde, dorée et rose, deux feuilles, une lueur d'or.
    for (let a = 0; a < 24; a++) {
      if (a % 2) continue;
      const t = (a / 24) * Math.PI * 2;
      c.set(16 + Math.round(Math.cos(t) * 13), 18 + Math.round(Math.sin(t) * 12), '#f0d27a');
    }
    c.ellipse(16, 19, 9, 9, ['#c8506a', '#f08a78', '#ffd0a0']);
    c.line([16, 11], [14, 26], 0, '#d8667a');
    c.line([16, 10], [17, 6], 0, '#5a3a1c');
    poly(c, [[17, 8], [25, 4], [22, 10]], '#5fa040');
    poly(c, [[16, 9], [8, 5], [11, 11]], '#4a8a30');
    px(c, [[11, 15], [12, 14], [12, 16]], '#fff0d0');
  },

  // --- Objets du Yomi (0.3.0) ---------------------------------------------------
  'masque-hannya'(c) {
    // Masque de hannya : cornes, sourcils froncés, yeux d'or, grand sourire de crocs.
    poly(c, [[7, 9], [3, 1], [10, 6]], '#e8dcc0');
    poly(c, [[25, 9], [29, 1], [22, 6]], '#d2c4a4');
    c.ellipse(16, 16, 11, 13, ['#b89a6a', '#e8dcc0', '#fff6e0']);
    c.line([7, 11], [13, 13], 0.6, '#2b1d1c');
    c.line([25, 11], [19, 13], 0.6, '#2b1d1c');
    c.rect(10, 14, 3, 2, '#f0c040');
    c.rect(19, 14, 3, 2, '#f0c040');
    px(c, [[11, 14], [20, 14]], '#1d1a1c');
    poly(c, [[8, 20], [24, 20], [21, 27], [11, 27]], '#6a1a1a');
    for (let x = 9; x <= 23; x += 2) c.set(x, 20, '#fff6e0');
    px(c, [[11, 21], [21, 21], [12, 26], [20, 26]], '#fff6e0');
    px(c, [[6, 18], [26, 18], [7, 22], [25, 22]], '#c8412f');
  },
  'gourde-sake-oni'(c) {
    // Calebasse laquée de rouge, deux bulbes, bouchon de bois et cordon.
    c.ellipse(16, 22, 9, 8, ['#7a1a14', '#b3322a', '#e0554a']);
    c.ellipse(16, 10, 6, 5, ['#7a1a14', '#b3322a', '#e0554a']);
    c.rect(13, 14, 7, 2, '#d9b45a');
    c.rect(14, 3, 5, 3, '#8a6d4a');
    c.line([20, 15], [27, 20], 0, '#d9b45a');
    c.line([27, 20], [26, 27], 0, '#d9b45a');
    px(c, [[12, 19], [11, 21], [13, 8]], '#f7a898');
    px(c, [[16, 22], [15, 24], [17, 24]], '#f0c040');
  },
  'nodachi-ikusa'(c) {
    // Grand sabre noir-bleu ébréché, poignée d'os, cordon rouge d'un soldat du Yomi.
    for (let i = 0; i <= 20; i++) {
      c.set(10 + i, 21 - i, '#9aa8c0');
      c.set(11 + i, 21 - i, '#4a5468');
      c.set(11 + i, 22 - i, '#2b3040');
    }
    px(c, [[18, 13], [24, 7], [27, 4]], [0, 0, 0, 0]);
    c.disc(9, 23, 1.8, '#3a3840');
    for (let i = 0; i <= 6; i++) {
      c.set(7 - i, 25 + i, i % 2 ? '#d8d0bd' : '#b8b0a0');
      c.set(8 - i, 25 + i, '#8a8478');
    }
    c.line([8, 24], [12, 29], 0, '#c8412f');
  },
  'cloche-grand-rocher'(c) {
    // Cloche de bronze à anneau, bord évasé, battant, et une petite corde sacrée.
    c.disc(16, 4, 2, '#8a6a2a');
    c.disc(16, 4, 0.8, [0, 0, 0, 0]);
    poly(c, [[11, 7], [21, 7], [24, 22], [27, 25], [5, 25], [8, 22]], '#b08a3a');
    poly(c, [[17, 7], [21, 7], [24, 22], [27, 25], [18, 25]], '#8a6a2a');
    c.line([12, 9], [9, 23], 0, '#e0c070');
    c.rect(6, 16, 20, 2, '#6b4a2a');
    for (let x = 8; x < 25; x += 4) poly(c, [[x, 18], [x + 2, 18], [x + 1, 21]], '#efe6cf');
    c.disc(16, 27, 1.6, '#6b4a2a');
  },
  'encensoir-moine'(c) {
    // Brûle-encens de bronze suspendu à trois chaînes, fumée qui monte.
    for (const x of [9, 16, 23]) c.line([16, 2], [x, 13], 0, '#8a8478');
    c.ellipse(16, 20, 9, 7, ['#6b4a1c', '#9a7430', '#d0a860']);
    c.ellipse(16, 14, 9, 2, ['#4a3414', '#6b4a1c', '#8a6a2a']);
    for (let x = 10; x <= 22; x += 3) c.set(x, 19, '#3a2410');
    c.rect(11, 26, 2, 3, '#6b4a1c');
    c.rect(20, 26, 2, 3, '#6b4a1c');
    for (let i = 0; i < 9; i++) c.set(26 + Math.round(Math.sin(i) * 1.5), 12 - i, i % 2 ? '#cfd6de' : '#aeb8c4');
  },
  'shimenawa-tressee'(c) {
    // Corde de paille torsadée en baudrier, avec les éclairs de papier blanc (shide).
    for (let i = 0; i <= 26; i++) {
      const x = 3 + i;
      const y = 6 + Math.round(i * 0.7);
      c.disc(x, y, 2.5, i % 4 < 2 ? '#c9a860' : '#9c7a40');
    }
    for (let i = 0; i <= 26; i += 2) c.set(3 + i, 5 + Math.round(i * 0.7), '#e0c887');
    for (const [x, y] of [[8, 10], [16, 15], [24, 21]]) {
      c.line([x, y + 3], [x + 2, y + 6], 0, '#ffffff');
      c.line([x + 2, y + 6], [x, y + 8], 0, '#ffffff');
      c.line([x, y + 8], [x + 2, y + 11], 0, '#ffffff');
      c.line([x + 1, y + 3], [x + 3, y + 6], 0, '#d8dde2');
    }
  },
  'tabi-messager'(c) {
    // Tabi indigo au gros orteil séparé, lacets clairs, une plume au talon.
    for (const [ox, oy] of [[3, 4], [16, 7]]) {
      poly(c, [[ox + 2, oy], [ox + 9, oy], [ox + 9, oy + 14], [ox + 12, oy + 18], [ox + 12, oy + 22], [ox, oy + 22], [ox + 1, oy + 14]], '#2f4a7a');
      poly(c, [[ox + 7, oy], [ox + 9, oy], [ox + 9, oy + 14], [ox + 12, oy + 18], [ox + 12, oy + 22], [ox + 8, oy + 22]], '#223a60');
      c.line([ox + 8, oy + 18], [ox + 8, oy + 22], 0, '#16284a');
      for (let y = oy + 3; y < oy + 13; y += 3) c.set(ox + 8, y, '#d8d0bd');
    }
    poly(c, [[1, 20], [5, 13], [6, 15]], '#efe6cf');
    c.line([2, 19], [5, 14], 0, '#b8b0a0');
  },
  'arc-ikazuchi'(c) {
    // Arc noir, corde de foudre jaune qui crépite.
    let prev = [10, 2];
    for (let i = 1; i <= 20; i++) {
      const t = i / 20;
      const pt = [10 + Math.sin(t * Math.PI) * 12, 2 + t * 28];
      c.line(prev, pt, 0.6, i % 5 === 0 ? '#3a3a58' : '#1f1f30');
      prev = pt;
    }
    for (let y = 2; y <= 30; y++) c.set(10 + (Math.floor(y / 3) % 2 ? 1 : -1) * (y % 3 === 1 ? 1 : 0), y, '#ffe066');
    px(c, [[12, 8], [8, 14], [12, 20], [8, 25]], '#fffbe0');
    c.rect(20, 14, 3, 4, '#5a6aa8');
    px(c, [[26, 5], [27, 6], [26, 7], [27, 8]], '#ffe066');
  },
  'tabi-shinobi'(c) {
    // Tabi noirs de shinobi, semelle souple, bande de tissu sombre.
    for (const [ox, oy] of [[3, 4], [16, 7]]) {
      poly(c, [[ox + 2, oy], [ox + 9, oy], [ox + 9, oy + 14], [ox + 12, oy + 18], [ox + 12, oy + 22], [ox, oy + 22], [ox + 1, oy + 14]], '#2b2a30');
      poly(c, [[ox + 7, oy], [ox + 9, oy], [ox + 9, oy + 14], [ox + 12, oy + 18], [ox + 12, oy + 22], [ox + 8, oy + 22]], '#1c1b20');
      c.line([ox + 8, oy + 18], [ox + 8, oy + 22], 0, '#0f0e12');
      c.rect(ox + 1, oy + 4, 9, 2, '#46444e');
      c.rect(ox, oy + 21, 13, 1, '#5a5866');
    }
  },
  'tsuba-ebrechee'(c) {
    // Garde de sabre ronde en fer, fente de la lame au centre, un éclat manquant ; cordon noué.
    c.line([16, 1], [16, 5], 0, '#c8412f');
    c.ellipse(16, 17, 12, 12, ['#3a3c44', '#5a5f6a', '#8a909b']);
    c.ellipse(16, 17, 9, 9, ['#4a4d55', '#686c76', '#8a909b']);
    poly(c, [[14, 12], [18, 12], [17, 22], [15, 22]], '#1d1a1c');
    c.disc(10, 17, 1.2, '#1d1a1c');
    c.disc(22, 17, 1.2, '#1d1a1c');
    poly(c, [[24, 6], [29, 10], [26, 12]], [0, 0, 0, 0]);
    px(c, [[23, 9], [25, 12], [26, 11]], '#aab0ba');
  },
  'mino-paille'(c) {
    // Cape de paille en couches, nouée au cou.
    for (let row = 0; row < 4; row++) {
      const y = 6 + row * 6;
      const w = 7 + row * 3;
      poly(c, [[16 - w, y], [16 + w, y], [17 + w, y + 8], [15 - w, y + 8]], row % 2 ? '#b08a48' : '#c9a860');
      for (let x = 16 - w; x <= 16 + w; x += 2) c.line([x, y + 1], [x + (x < 16 ? -1 : 1), y + 7], 0, row % 2 ? '#8a6a34' : '#9c7a40');
    }
    c.rect(11, 3, 11, 3, '#6b4a2a');
    c.line([16, 6], [16, 9], 0, '#c8412f');
  },
  'yomotsu-hegui'(c) {
    // Bol noir de riz du Yomi, vapeur violette qui monte.
    c.ellipse(16, 21, 11, 7, ['#141218', '#26242b', '#3e3b46']);
    c.ellipse(16, 17, 11, 3, ['#d8d0e8', '#efeaf8', '#ffffff']);
    for (const [x, y] of [[10, 17], [14, 16], [19, 17], [22, 16], [16, 18]]) c.set(x, y, '#b8b0cc');
    c.rect(12, 27, 9, 2, '#26242b');
    for (let i = 0; i < 10; i++) {
      c.set(12 + Math.round(Math.sin(i * 0.8) * 1.5), 13 - i, '#9a6ad0');
      c.set(20 + Math.round(Math.cos(i * 0.8) * 1.5), 12 - i, '#7a4ab0');
    }
    px(c, [[24, 20], [25, 22]], '#c8412f');
  },
  'gohei-sanctuaire'(c) {
    // Bâton de bois et bandes de papier blanc en zigzag, comme des éclairs.
    c.line([6, 30], [22, 6], 0.6, '#8a6a4a');
    c.line([7, 30], [23, 6], 0, '#b08a60');
    c.rect(20, 5, 5, 3, '#6b4a2a');
    for (const [side, x0] of [[-1, 20], [1, 24]]) {
      let x = x0;
      let y = 8;
      for (let k = 0; k < 4; k++) {
        c.rect(x - 1, y, 3, 4, '#ffffff');
        c.set(x + side, y + 3, '#d8dde2');
        x += side * 2;
        y += 4;
      }
    }
    px(c, [[27, 3], [28, 4], [29, 3]], '#ffe066');
  },
  'corne-oni'(c) {
    // Corne rouge recourbée, cassée net à la base ; des veines sombres.
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const x = 8 + t * 16 + Math.sin(t * Math.PI) * 3;
      const y = 28 - t * 24;
      c.disc(x, y, 4.5 * (1 - t) + 0.6, i < 3 ? '#e8dcc0' : i % 5 === 0 ? '#8e1f1a' : '#c8412f');
    }
    for (let i = 4; i < 18; i += 3) c.set(10 + i * 0.8, 26 - i * 1.2, '#f07860');
    poly(c, [[3, 29], [13, 27], [11, 31], [5, 31]], '#b8a67c');
    px(c, [[6, 29], [9, 29]], '#6d5238');
  },
  'dogu-yeux-clos'(c) {
    // Statuette dogū en argile : grands yeux fermés (deux fentes), corps trapu décoré de spirales.
    c.ellipse(16, 9, 8, 6, ['#8a5a34', '#b07a48', '#d09a68']);
    c.ellipse(11, 9, 3, 3, ['#9a6a40', '#c08a58', '#e0b080']);
    c.ellipse(21, 9, 3, 3, ['#9a6a40', '#c08a58', '#e0b080']);
    c.line([9, 9], [13, 9], 0, '#3a2412');
    c.line([19, 9], [23, 9], 0, '#3a2412');
    poly(c, [[10, 15], [22, 15], [25, 26], [7, 26]], '#b07a48');
    poly(c, [[18, 15], [22, 15], [25, 26], [18, 26]], '#8a5a34');
    c.line([6, 17], [3, 22], 1, '#b07a48');
    c.line([26, 17], [29, 22], 1, '#8a5a34');
    for (const [x, y] of [[13, 19], [19, 19], [16, 23]]) {
      c.disc(x, y, 1.5, '#8a5a34');
      c.set(x, y, '#d09a68');
    }
    c.rect(9, 26, 5, 4, '#9a6a40');
    c.rect(18, 26, 5, 4, '#8a5a34');
  },
  'tsuba-ronin-mort'(c) {
    // Garde de sabre carrée aux coins arrondis, dorure usée, cordon rouge du rōnin.
    poly(c, [[7, 6], [25, 6], [28, 9], [28, 25], [25, 28], [7, 28], [4, 25], [4, 9]], '#8a6a2a');
    poly(c, [[8, 8], [24, 8], [26, 10], [26, 24], [24, 26], [8, 26], [6, 24], [6, 10]], '#c9a24a');
    c.line([8, 9], [23, 9], 0, '#f0d27a');
    poly(c, [[14, 12], [18, 12], [17, 22], [15, 22]], '#1d1a1c');
    for (const [x, y] of [[9, 12], [23, 12], [9, 22], [23, 22]]) c.set(x, y, '#6b4a1c');
    c.line([4, 17], [1, 24], 0, '#c8412f');
    c.line([1, 24], [4, 30], 0, '#9b2f22');
  },
  'menpo-shikome'(c) {
    // Demi-masque de combat en os : nez, joues, et la mâchoire aux dents de shikome.
    c.line([1, 9], [7, 11], 0, '#3a3840');
    c.line([31, 9], [25, 11], 0, '#3a3840');
    poly(c, [[7, 8], [14, 6], [16, 11], [18, 6], [25, 8], [26, 16], [22, 25], [16, 28], [10, 25], [6, 16]], '#e8e0cc');
    poly(c, [[18, 6], [25, 8], [26, 16], [22, 25], [16, 28], [16, 11]], '#cfc6b0');
    poly(c, [[9, 17], [23, 17], [21, 22], [11, 22]], '#3a1a1c');
    for (let x = 10; x <= 22; x += 2) {
      c.set(x, 17, '#fff6e0');
      c.set(x + 1, 21, '#fff6e0');
    }
    px(c, [[8, 12], [24, 12], [16, 8]], '#8a8070');
  },
  'do-lamelles-os'(c) {
    // Cuirasse de lamelles d'os pâle, liserés noirs, laçage rouge.
    poly(c, [[5, 6], [12, 4], [14, 8], [18, 8], [20, 4], [27, 6], [27, 13], [25, 28], [7, 28], [5, 13]], '#e8e0cc');
    poly(c, [[18, 8], [20, 4], [27, 6], [27, 13], [25, 28], [18, 28]], '#cfc6b0');
    for (let y = 11; y <= 25; y += 4) {
      c.line([6, y], [26, y], 0, '#26242b');
      c.line([6, y + 1], [26, y + 1], 0, '#b8ad94');
    }
    for (let x = 9; x <= 23; x += 4) for (let y = 9; y <= 26; y += 4) c.set(x, y, '#c8412f');
    c.line([12, 4], [7, 6], 0, '#26242b');
    c.line([20, 4], [25, 6], 0, '#26242b');
  },
  'haidate-shikome'(c) {
    // Tassettes d'os : deux pans de plaques pâles, ceinture noire.
    c.rect(4, 4, 24, 3, '#26242b');
    for (const ox of [4, 17]) {
      poly(c, [[ox, 7], [ox + 11, 7], [ox + 12, 28], [ox - 1, 28]], '#d8d0bd');
      for (let y = 10; y < 28; y += 3) c.line([ox, y], [ox + 11, y], 0, y % 2 ? '#b8ad94' : '#efe6cf');
      for (let y = 9; y < 27; y += 6) c.set(ox + 5, y, '#c8412f');
    }
  },
  'waraji-meute'(c) {
    // Sandales de paille sombre, renforcées de petites phalanges blanches.
    for (const ox of [4, 17]) {
      c.ellipse(ox + 5, 17, 5, 12, ['#6b5028', '#8a6a38', '#a8864e']);
      for (let y = 7; y < 28; y += 2) c.line([ox + 1, y], [ox + 9, y], 0, y % 4 === 1 ? '#7a5c30' : '#9a7a44');
      for (const y of [9, 14, 19, 24]) c.rect(ox + 1, y, 2, 1, '#efe6cf');
      c.line([ox + 1, 10], [ox + 9, 16], 0, '#26242b');
      c.line([ox + 9, 10], [ox + 1, 16], 0, '#26242b');
    }
  },
  'zukin-sohei'(c) {
    // Capuche blanche de moine-soldat, nouée sous les yeux ; bande de visage sombre.
    c.ellipse(16, 13, 11, 10, ['#b8b2a4', '#e8e2d4', '#faf7f0']);
    poly(c, [[5, 13], [27, 13], [29, 29], [3, 29]], '#e8e2d4');
    poly(c, [[18, 13], [27, 13], [29, 29], [18, 29]], '#d2cbbb');
    c.rect(8, 13, 16, 4, '#3a2b20');
    px(c, [[12, 14], [19, 14]], '#f0d27a');
    c.line([7, 20], [25, 20], 0, '#b8b2a4');
    c.line([24, 19], [28, 25], 0, '#c8412f');
  },
  'kesa-sohei'(c) {
    // Étole de moine en patchwork safran, portée en travers d'une cuirasse sombre.
    poly(c, [[5, 6], [12, 4], [20, 4], [27, 6], [27, 13], [25, 28], [7, 28], [5, 13]], '#3a3c44');
    poly(c, [[20, 4], [27, 6], [27, 13], [25, 28], [19, 28]], '#2b2d33');
    poly(c, [[7, 4], [13, 4], [27, 24], [26, 29], [20, 29], [5, 9]], '#d0892a');
    for (const [x, y] of [[10, 8], [15, 13], [20, 19]]) c.line([x - 2, y + 3], [x + 3, y - 1], 0, '#9a5a14');
    c.line([8, 5], [25, 27], 0, '#f0b050');
    c.disc(9, 7, 1.2, '#efe6cf');
  },
  'haidate-temple'(c) {
    // Jambières de fer frappées d'un petit soleil doré.
    c.rect(4, 4, 24, 3, '#6b4a2a');
    for (const ox of [4, 17]) {
      poly(c, [[ox, 7], [ox + 11, 7], [ox + 12, 28], [ox - 1, 28]], '#5a5f6a');
      poly(c, [[ox + 7, 7], [ox + 11, 7], [ox + 12, 28], [ox + 7, 28]], '#454a54');
      for (let y = 12; y < 28; y += 5) c.line([ox, y], [ox + 11, y], 0, '#8a909b');
      c.disc(ox + 5, 17, 2, '#e0b040');
      c.set(ox + 5, 17, '#fff2b8');
    }
  },
  'geta-temple'(c) {
    // Geta à une seule dent (ippon-ba), bois laqué noir, lanière blanche.
    for (const [ox, oy] of [[4, 3], [17, 6]]) {
      c.rect(ox + 4, oy + 21, 3, 4, '#3a2412');
      c.rect(ox, oy + 19, 11, 2, '#26242b');
      poly(c, [[ox + 1, oy + 1], [ox + 10, oy + 1], [ox + 11, oy + 3], [ox + 11, oy + 19], [ox, oy + 19], [ox, oy + 3]], '#3a3840');
      c.rect(ox + 9, oy + 3, 2, 16, '#26242b');
      c.line([ox + 5, oy + 4], [ox + 1, oy + 11], 0, '#efe6cf');
      c.line([ox + 5, oy + 4], [ox + 9, oy + 11], 0, '#efe6cf');
      c.set(ox + 5, oy + 4, '#ffffff');
    }
  },
  'jingasa-laque'(c) {
    // Chapeau plat de fantassin laqué de noir, emblème doré, cordons.
    poly(c, [[16, 9], [30, 20], [2, 20]], '#26242b');
    poly(c, [[16, 9], [30, 20], [18, 20]], '#1a191e');
    c.line([16, 9], [6, 17], 0, '#4a4852');
    c.ellipse(16, 20, 14, 2, ['#141218', '#26242b', '#3e3b46']);
    c.disc(16, 15, 2, '#d9b45a');
    c.set(16, 15, '#26242b');
    cord(c, 11, 21, 14, 29, '#efe6cf');
    cord(c, 21, 21, 18, 29, '#efe6cf');
  },
  'do-cuir-noir'(c) {
    // Cuirasse de cuir bouilli noir, coutures claires, boucles de bronze.
    poly(c, [[5, 6], [12, 4], [14, 8], [18, 8], [20, 4], [27, 6], [27, 13], [25, 28], [7, 28], [5, 13]], '#3a2e2a');
    poly(c, [[18, 8], [20, 4], [27, 6], [27, 13], [25, 28], [18, 28]], '#2b221f');
    c.line([16, 9], [16, 27], 0, '#8a7a6a');
    for (let y = 11; y < 27; y += 3) px(c, [[15, y], [17, y]], '#b8a890');
    c.rect(5, 18, 22, 2, '#5a4030');
    c.rect(14, 17, 4, 4, '#c9a24a');
    c.line([12, 4], [7, 6], 0, '#6b5040');
  },
  'kyahan-eclaireur'(c) {
    // Bandes de toile serrées autour des mollets, liens noués.
    for (const ox of [5, 18]) {
      poly(c, [[ox, 4], [ox + 9, 4], [ox + 8, 28], [ox + 1, 28]], '#6d6a58');
      for (let y = 6; y < 28; y += 3) c.line([ox, y], [ox + 9, y + 2], 0, '#8a8670');
      c.line([ox + 9, 9], [ox + 12, 12], 0, '#3a3024');
      c.line([ox + 9, 21], [ox + 12, 24], 0, '#3a3024');
    }
  },
  'waraji-eclaireur'(c) {
    // Sandales de paille tressée serré, cordons de cuir noir.
    for (const ox of [4, 17]) {
      c.ellipse(ox + 5, 17, 5, 12, ['#7a6438', '#9a8048', '#b89c60']);
      for (let y = 7; y < 28; y += 2) c.line([ox + 1, y], [ox + 9, y], 0, y % 4 === 1 ? '#86703e' : '#a88c52');
      c.line([ox + 1, 10], [ox + 9, 16], 0, '#2b221f');
      c.line([ox + 9, 10], [ox + 1, 16], 0, '#2b221f');
      c.set(ox + 5, 6, '#2b221f');
    }
  },

  // --- Styles de jeu par l'équipement (0.8.0) --------------------------------------
  'ecaille-ryujin'(c) {
    // Grande écaille de dragon des mers, bleu-vert nacré, stries en éventail et reflet d'écume.
    poly(c, [[16, 2], [27, 10], [28, 20], [16, 30], [4, 20], [5, 10]], '#1f5a5e');
    poly(c, [[16, 4], [25, 11], [26, 19], [16, 27], [6, 19], [7, 11]], '#2f8a88');
    for (const x of [10, 13, 16, 19, 22]) c.line([16, 27], [x, 7 + Math.abs(x - 16) / 2], 0, '#24706e');
    c.line([9, 12], [13, 8], 0, '#9fe0d4');
    px(c, [[8, 15], [10, 11], [21, 9]], '#e8fff8');
    c.line([6, 21], [16, 29], 0, '#174448');
  },
  'kemuri-dama'(c) {
    // Bombe de fumée en argile, mèche allumée, volutes grises.
    c.ellipse(14, 21, 9, 9, ['#5a3a24', '#8a5a36', '#b8845a']);
    c.rect(12, 10, 5, 3, '#c8b890');
    c.line([15, 10], [19, 6], 0, '#8a7a5a');
    px(c, [[19, 5], [20, 5], [20, 4]], '#ffb040');
    c.set(21, 4, '#fff0a0');
    for (const [x, y, r] of [[23, 8, 2.5], [26, 5, 2], [28, 9, 1.6], [24, 13, 1.6]]) c.disc(x, y, r, '#b8c0c8');
    px(c, [[22, 7], [25, 4]], '#e0e6ea');
    px(c, [[9, 17], [10, 16], [8, 19]], '#d8a878');
    c.line([6, 23], [22, 23], 0, '#4a2e1c');
  },
  'encre-shinigami'(c) {
    // Encrier noir à reflet violet, pinceau planté dedans, goutte qui perle.
    c.ellipse(16, 23, 11, 6, ['#121016', '#26222e', '#4a4058']);
    c.ellipse(16, 19, 9, 2, ['#060508', '#0e0c12', '#3a2e48']);
    c.line([20, 18], [27, 2], 0.6, '#8a6a3a');
    c.line([20, 18], [27, 2], 0, '#c09a5a');
    poly(c, [[18, 17], [21, 17], [20, 21]], '#0e0c12');
    c.disc(9, 29, 1.2, '#26222e');
    px(c, [[10, 21], [12, 22]], '#7a6890');
    px(c, [[24, 9], [25, 6]], '#e0c890');
  },
  'eboshi-amaterasu'(c) {
    // Haut bonnet laqué de vermillon, cordon blanc, soleil d'or sur le front.
    poly(c, [[9, 28], [23, 28], [24, 12], [19, 3], [12, 5], [8, 14]], '#9a2418');
    poly(c, [[17, 4], [19, 3], [24, 12], [23, 28], [18, 28]], '#701810');
    c.line([10, 8], [9, 22], 0, '#d0503c');
    c.disc(15, 17, 3.2, '#f0c040');
    for (let a = 0; a < 8; a++) c.set(15 + Math.round(Math.cos((a * Math.PI) / 4) * 5), 17 + Math.round(Math.sin((a * Math.PI) / 4) * 5), '#f8dc78');
    c.rect(8, 27, 17, 2, '#efe6cf');
    c.line([10, 29], [7, 31], 0, '#efe6cf');
    c.line([22, 29], [25, 31], 0, '#efe6cf');
  },
  'tambour-temple'(c) {
    // Taiko de cérémonie : fût de bois laqué, peau tendue, clous de fer, tomoe sur la peau.
    c.ellipse(16, 22, 13, 6, ['#4a2414', '#7a3a1c', '#a85a2a']);
    c.rect(3, 12, 27, 10, '#7a3a1c');
    c.rect(24, 12, 6, 10, '#5a2a14');
    c.ellipse(16, 12, 13, 6, ['#b8a07a', '#e8d8b0', '#fff6dc']);
    for (let x = 5; x <= 27; x += 4) c.set(x, 17, '#2b2a30');
    c.disc(14, 12, 1.6, '#b3322a');
    c.disc(18, 11, 1.2, '#2f4a7a');
    c.disc(16, 14, 1.2, '#2b2a30');
    c.line([25, 2], [20, 9], 0.6, '#8a6a3a');
    c.disc(20, 9, 1.4, '#c09a5a');
  },
  'plume-yatagarasu'(c) {
    // Longue plume noire du corbeau à trois pattes, reflets bleu nuit et pointe dorée.
    c.line([6, 29], [24, 4], 0, '#c09a5a');
    for (let i = 0; i <= 18; i++) {
      const x = 8 + i;
      const y = 26 - Math.round(i * 1.25);
      const w = Math.min(i, 18 - i, 5);
      c.line([x - w, y - w * 0.3], [x, y], 0, i % 3 ? '#1c1b26' : '#2c3058');
      c.line([x, y], [x + w * 0.4, y + w], 0, i % 3 ? '#26243a' : '#3a4478');
    }
    px(c, [[24, 4], [25, 3], [23, 5]], '#f0c040');
    px(c, [[12, 19], [16, 14], [19, 10]], '#5a6aa8');
  },
  'fleches-hahaya'(c) {
    // Carquois de laque noire à liseré d'or, trois flèches célestes aux pointes de lumière.
    for (const [x, tip] of [[11, 3], [16, 1], [21, 4]]) {
      c.line([x, tip + 4], [x, 18], 0, '#d9c48a');
      poly(c, [[x - 1, tip + 4], [x + 1, tip + 4], [x, tip]], '#fff6c0');
      c.set(x, tip + 1, '#ffffff');
      px(c, [[x - 1, 15], [x + 1, 15], [x - 1, 16], [x + 1, 16]], '#e8e0f0');
    }
    poly(c, [[8, 15], [24, 15], [22, 30], [10, 30]], '#1f1c24');
    poly(c, [[19, 15], [24, 15], [22, 30], [18, 30]], '#14121a');
    c.rect(8, 15, 17, 2, '#c09a3a');
    c.rect(9, 27, 14, 1, '#c09a3a');
    px(c, [[12, 20], [13, 22], [12, 24]], '#3a3448');
  },

  // --- Objets de quête ------------------------------------------------------------
  'ema-tetsu'(c) {
    // Plaque votive en bois, cordon rouge, nom du forgeron griffonné (illisible) et un marteau.
    cord(c, 11, 8, 16, 2, '#c8412f');
    cord(c, 21, 8, 16, 2, '#c8412f');
    poly(c, [[5, 10], [16, 5], [27, 10], [27, 27], [5, 27]], '#d9b47a');
    poly(c, [[16, 5], [27, 10], [27, 27], [22, 27]], '#c19a60');
    c.line([6, 11], [16, 6], 0, '#efd49a');
    for (const y of [13, 16, 19]) c.line([9, y], [14, y + 1], 0, '#4d3a2a');
    c.rect(18, 17, 6, 3, '#4d3a2a');
    c.rect(20, 20, 2, 5, '#6b4a2a');
  },
  'tasse-ebrechee'(c) {
    // Tasse à thé en grès, coulure d'émail bleu, ébréchure au bord.
    c.ellipse(16, 27, 9, 2, '#6d6252');
    poly(c, [[7, 9], [25, 9], [24, 27], [8, 27]], '#a8987f');
    poly(c, [[19, 9], [25, 9], [24, 27], [19, 27]], '#8a7d6a');
    poly(c, [[7, 9], [25, 9], [25, 14], [21, 16], [18, 13], [13, 17], [10, 14], [7, 15]], '#5d6a78');
    c.ellipse(16, 9, 9, 2, ['#3e4650', '#2b3038', '#5d6a78']);
    // L'ébréchure : un éclat manque au bord, le grès nu apparaît dessous.
    px(c, [[20, 7], [21, 7], [22, 7], [21, 8], [22, 8], [23, 8]], [0, 0, 0, 0]);
    poly(c, [[20, 9], [24, 9], [22, 12]], '#cfc2a8');
    px(c, [[9, 18], [10, 21]], '#bcae94');
  },
  concombre(c) {
    // Un concombre bien vert, fleur jaune au bout.
    for (let i = 0; i < 20; i++) {
      const x = 6 + i;
      const y = 24 - i;
      c.disc(x, y, 3.5, '#3f7a3a');
    }
    for (let i = 0; i < 20; i++) c.disc(5 + i, 23 - i, 1.5, '#5fa04e');
    for (let i = 2; i < 19; i += 3) px(c, [[8 + i, 24 - i], [5 + i, 21 - i]], '#8fc07a');
    c.line([5, 22], [22, 5], 0, '#7fb86a');
    px(c, [[27, 1], [28, 2], [26, 2], [27, 3], [28, 0]], '#f0d27a');
    c.set(27, 2, '#c9a24a');
  },
  'tablette-argile'(c) {
    // Fragment de tablette d'argile couvert de coins cunéiformes, fêlé, encore tiède.
    poly(c, [[5, 5], [27, 4], [28, 26], [17, 28], [15, 24], [6, 27]], '#b08a5a');
    poly(c, [[21, 4], [27, 4], [28, 26], [22, 27]], '#9a764a');
    c.line([6, 6], [26, 5], 0, '#c9a474');
    for (let y = 8; y < 25; y += 4) for (let x = 8; x < 25; x += 4) {
      c.set(x, y, '#6d5238');
      c.set(x + 1, y, '#6d5238');
      c.set(x, y + 1, '#6d5238');
    }
    px(c, [[15, 24], [14, 21], [16, 18], [15, 15]], '#4d3624');
    px(c, [[3, 14], [29, 10], [30, 18]], '#f0a860');
  },

  // --- Matériaux ------------------------------------------------------------------
  braise(c) {
    // Braise de hitodama : une flamme bleu-blanc à deux langues, sur un petit charbon.
    c.ellipse(16, 26, 7, 3, ['#1d2a3a', '#2b3a4c', '#3e5268']);
    poly(c, [[9, 25], [11, 14], [14, 18], [18, 3], [20, 13], [23, 9], [23, 25]], '#2aa6c0');
    poly(c, [[11, 25], [13, 17], [15, 20], [18, 8], [19, 17], [21, 14], [21, 25]], '#6ff3ff');
    poly(c, [[13, 25], [16, 16], [18, 19], [19, 25]], '#e8fdff');
    c.disc(16, 23, 1.5, '#ffffff');
  },
  seve(c) {
    // Sève de kodama : une goutte verte qui luit.
    c.ellipse(16, 20, 8, 8, ['#4f8a30', '#7fc050', '#c8f0a0']);
    poly(c, [[9, 18], [16, 4], [23, 18]], '#7fc050');
    poly(c, [[12, 16], [16, 7], [15, 16]], '#c8f0a0');
    px(c, [[12, 19], [13, 18]], '#e8ffd8');
  },
  ecaille(c) {
    // Écaille de kappa, bord arrondi, stries.
    poly(c, [[8, 6], [24, 6], [27, 18], [16, 28], [5, 18]], '#5e7a4a');
    poly(c, [[16, 6], [24, 6], [27, 18], [16, 28]], '#4a633a');
    for (let i = 0; i < 4; i++) c.line([10 + i * 4, 9], [16, 25], 0, '#7c9a5a');
    c.line([9, 7], [23, 7], 0, '#9dba7a');
  },
  papier(c) {
    // Feuille de papier huilé, translucide, un coin replié.
    poly(c, [[5, 6], [27, 5], [26, 27], [6, 27]], '#e8d9a0');
    poly(c, [[20, 5], [27, 5], [26, 27], [21, 27]], '#d9c888');
    for (let y = 9; y < 26; y += 5) c.line([7, y], [24, y - 1], 0, '#cdb878');
    poly(c, [[20, 27], [26, 21], [26, 27]], '#b8a468');
    poly(c, [[20, 27], [26, 21], [20, 21]], '#f5ecc4');
  },
  masque(c) {
    // Éclat de masque blanc, bords cassés.
    poly(c, [[6, 8], [18, 4], [27, 12], [22, 20], [24, 27], [12, 25], [9, 18]], '#e8e2d4');
    poly(c, [[18, 4], [27, 12], [22, 20], [24, 27], [18, 26]], '#cfc8b8');
    c.line([8, 9], [17, 5], 0, '#faf7f0');
    px(c, [[14, 12], [15, 14], [14, 16], [16, 18]], '#9c968a');
  },
  soie(c) {
    // Écheveau de soie de jorōgumo, fils argentés, un brin rouge.
    c.ellipse(16, 16, 11, 10, ['#aeb8c4', '#dfe6ee', '#ffffff']);
    for (let i = 0; i < 6; i++) c.line([6 + i * 4, 8], [10 + i * 3, 25], 0, i % 2 ? '#c9d2dc' : '#eef3f8');
    c.line([6, 12], [26, 21], 0, '#c8412f');
    c.line([26, 21], [30, 26], 0, '#c8412f');
  },
  os(c) {
    // Os de guerrier du Yomi : trois os croisés, liés d'un lacet d'armure laqué noir.
    const bone = (x0, y0, x1, y1) => {
      c.line([x0, y0], [x1, y1], 1, '#d8d0bd');
      c.disc(x0, y0, 2, '#e8e2d4');
      c.disc(x1, y1, 2, '#e8e2d4');
    };
    bone(6, 24, 26, 8);
    bone(6, 8, 26, 24);
    bone(5, 17, 27, 17);
    c.rect(14, 12, 4, 10, '#1d1a1c');
    px(c, [[15, 13], [16, 16], [15, 19], [16, 21]], '#c8412f');
  },
  foudre(c) {
    // Éclat de foudre figée : un zigzag jaune au cœur blanc, et quelques étincelles.
    poly(c, [[18, 2], [8, 17], [15, 17], [11, 30], [25, 12], [17, 12], [22, 2]], '#e0a020');
    poly(c, [[18, 4], [11, 16], [17, 16], [14, 26], [22, 13], [15, 13], [20, 4]], '#ffe066');
    c.line([18, 6], [13, 15], 0, '#fffbe0');
    px(c, [[6, 8], [27, 20], [25, 27], [5, 24]], '#fff4a8');
  },
};
