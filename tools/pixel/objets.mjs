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
};
