// Icônes en pixel art des compétences du HUD de combat (32 × 32), dessinées à la main dans le code.
// Une icône par compétence de classe (`<classe>-<touche>`, touches a, e, r), plus l'esquive et la voie.
// Ce sont des symboles clairs, pensés pour se lire sur la case sombre de la barre de compétences.
import { poly } from './objets.mjs';

export const SIZE = 32;
export const OUTLINE = '#141016';

const FIRE = ['#8a2414', '#e0632c', '#ffd27a'];
const GOLD = ['#8a6420', '#e2b046', '#fff0b0'];
const VIOLET = ['#3c2a66', '#9a7fe0', '#e3d6ff'];

/** Flamme qui monte, la pointe en (x, y - h). */
function flame(c, x, y, w, h, [dark, base, light]) {
  poly(c, [[x - w, y], [x - w * 0.8, y - h * 0.45], [x - w * 0.2, y - h * 0.7], [x, y - h], [x + w * 0.3, y - h * 0.6], [x + w, y - h * 0.35], [x + w, y]], dark);
  poly(c, [[x - w * 0.65, y - 1], [x - w * 0.3, y - h * 0.55], [x, y - h * 0.8], [x + w * 0.25, y - h * 0.45], [x + w * 0.65, y - 1]], base);
  poly(c, [[x - w * 0.3, y - 1], [x, y - h * 0.45], [x + w * 0.3, y - 1]], light);
}

/** Pointe de flèche tournée vers (dx, dy). */
function arrowHead(c, x, y, dx, dy, size, color) {
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  poly(c, [[x + ux * size, y + uy * size], [x - uy * size * 0.8, y + ux * size * 0.8], [x + uy * size * 0.8, y - ux * size * 0.8]], color);
}

export const ICONS = {
  esquive(c) {
    // Une silhouette qui file : trois traînées et un pied de géta.
    for (const [y, x0] of [[9, 3], [16, 1], [23, 5]]) {
      c.line([x0, y], [x0 + 12, y], 1, '#5f8fb0');
      c.line([x0 + 4, y], [x0 + 12, y], 0, '#cfeaff');
    }
    poly(c, [[16, 6], [29, 10], [28, 24], [15, 27], [19, 16]], '#6fb7e0');
    poly(c, [[19, 9], [27, 12], [26, 21], [19, 23], [21, 16]], '#cfeaff');
  },
  voie(c) {
    // Un torii vermillon : la voie (sous-classe) du héros.
    c.rect(3, 6, 26, 3, '#c8412f');
    c.rect(2, 5, 3, 2, '#c8412f');
    c.rect(27, 5, 3, 2, '#c8412f');
    c.rect(3, 6, 26, 1, '#ff8a6a');
    c.rect(6, 12, 20, 2, '#a83222');
    c.rect(8, 9, 3, 21, '#c8412f');
    c.rect(21, 9, 3, 21, '#c8412f');
    c.rect(8, 9, 1, 21, '#ff8a6a');
    c.rect(21, 9, 1, 21, '#ff8a6a');
    c.rect(14, 9, 4, 3, '#2a2226');
  },

  // --- Guerrier --------------------------------------------------------------
  'guerrier-a'(c) {
    // Frappe fracassante : un kanabō qui s'abat, le sol qui se fend.
    poly(c, [[5, 5], [12, 1], [21, 16], [15, 20]], '#7d828d');
    poly(c, [[7, 5], [11, 3], [19, 16], [15, 18]], '#b9bec8');
    for (const [x, y] of [[9, 6], [12, 9], [15, 13], [12, 5], [16, 10]]) c.set(x, y, '#ffffff');
    c.line([16, 18], [20, 23], 1, '#b3322a');
    c.line([4, 27], [28, 27], 1, '#a08a64');
    c.line([20, 26], [15, 30], 0, '#ffae5a');
    c.line([20, 26], [27, 22], 0, '#ffae5a');
    c.line([20, 26], [24, 31], 0, '#ffae5a');
    c.line([20, 26], [10, 25], 0, '#ffd27a');
  },
  'guerrier-e'(c) {
    // Bond : un arc qui monte et retombe, poussière au départ.
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      c.disc(4 + t * 22, 26 - Math.sin(t * Math.PI) * 20, 1, i < 10 ? '#d8c89a' : '#fff6e0');
    }
    arrowHead(c, 26, 25, 0.35, 1, 5, '#fff6e0');
    c.disc(5, 28, 2, '#8a7a5c');
    c.disc(9, 29, 1.5, '#a8987a');
  },
  'guerrier-r'(c) {
    // Frénésie : un brasier rouge.
    flame(c, 16, 30, 12, 27, ['#7a1410', '#d8302a', '#ffae5a']);
    c.rect(11, 18, 3, 2, '#2a0d0b');
    c.rect(18, 18, 3, 2, '#2a0d0b');
  },

  // --- Sorcier ---------------------------------------------------------------
  'sorcier-a'(c) {
    // Bouclier de flammes : un anneau de feu autour d'un cœur clair.
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      flame(c, 16 + Math.cos(a) * 10, 18 + Math.sin(a) * 10, 3, 7, FIRE);
    }
    c.disc(16, 17, 3, '#ffe9b8');
  },
  'sorcier-e'(c) {
    // Fuite de feu : une traînée de flammes derrière une flèche.
    flame(c, 7, 27, 4, 10, FIRE);
    flame(c, 13, 24, 4, 12, FIRE);
    c.line([12, 16], [26, 6], 1.5, '#ffd27a');
    arrowHead(c, 26, 6, 1, -0.7, 7, '#fff0c0');
  },
  'sorcier-r'(c) {
    // Grand météore : une boule de feu qui tombe en diagonale.
    c.line([2, 2], [16, 16], 3, '#8a2414');
    c.line([4, 3], [16, 15], 1.5, '#e0632c');
    c.ellipse(20, 20, 9, 9, FIRE);
    c.disc(17, 17, 2.5, '#fff0c0');
  },

  // --- Lame ------------------------------------------------------------------
  'lame-a'(c) {
    // Marque de mort : une cible violette barrée.
    c.ellipse(16, 16, 13, 13, VIOLET[0]);
    c.ellipse(16, 16, 11, 11, '#1d1528');
    c.ellipse(16, 16, 6, 6, VIOLET[1]);
    c.ellipse(16, 16, 3, 3, '#1d1528');
    c.line([6, 6], [26, 26], 1, VIOLET[2]);
    c.line([26, 6], [6, 26], 1, VIOLET[2]);
  },
  'lame-e'(c) {
    // Écran de fumée : des volutes grises.
    c.ellipse(10, 20, 8, 7, ['#4c5258', '#8a9298', '#c8d0d4']);
    c.ellipse(21, 18, 9, 8, ['#4c5258', '#9aa2a8', '#dfe5e8']);
    c.ellipse(15, 11, 7, 6, ['#5c6268', '#aab2b8', '#eef2f4']);
    c.ellipse(16, 25, 10, 4, ['#3c4248', '#6c7478', '#9aa2a8']);
  },
  'lame-r'(c) {
    // Danse des lames : trois kunai en éventail.
    for (const a of [-0.9, 0, 0.9]) {
      const dx = Math.sin(a);
      const dy = -Math.cos(a);
      const x0 = 16 + dx * 2;
      const y0 = 26 + dy * 2;
      c.line([x0, y0], [x0 + dx * 7, y0 + dy * 7], 1, '#3a2a4a');
      poly(c, [[x0 + dx * 7 - dy * 3, y0 + dy * 7 + dx * 3], [x0 + dx * 22, y0 + dy * 22], [x0 + dx * 7 + dy * 3, y0 + dy * 7 - dx * 3]], '#c8d2dc');
      c.line([x0 + dx * 8, y0 + dy * 8], [x0 + dx * 20, y0 + dy * 20], 0, '#f4f8fc');
    }
    c.disc(16, 27, 2.5, VIOLET[1]);
  },

  // --- Paladin ---------------------------------------------------------------
  'paladin-a'(c) {
    // Aura de lumière : un soleil doré.
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      c.line([16 + Math.cos(a) * 9, 16 + Math.sin(a) * 9], [16 + Math.cos(a) * 14, 16 + Math.sin(a) * 14], i % 2 ? 0.5 : 1, GOLD[1]);
    }
    c.ellipse(16, 16, 7, 7, GOLD);
  },
  'paladin-e'(c) {
    // Marteau lancé : un marteau en vol, traits de vitesse.
    c.line([4, 28], [16, 16], 1, '#7a5a34');
    poly(c, [[12, 10], [18, 4], [28, 14], [22, 20]], '#8a8e98');
    poly(c, [[14, 10], [18, 6], [26, 14], [22, 18]], '#c4c8d0');
    c.line([17, 7], [25, 15], 0, '#eef0f4');
    c.line([2, 18], [8, 12], 0, GOLD[2]);
    c.line([8, 24], [12, 20], 0, GOLD[2]);
  },
  'paladin-r'(c) {
    // Égide : un écu doré.
    poly(c, [[5, 4], [27, 4], [27, 16], [16, 30], [5, 16]], GOLD[0]);
    poly(c, [[7, 6], [25, 6], [25, 15], [16, 27], [7, 15]], GOLD[1]);
    c.ellipse(16, 14, 5, 5, ['#b07a20', GOLD[2], '#ffffff']);
  },

  // --- Rôdeur ----------------------------------------------------------------
  'rodeur-a'(c) {
    // Flèche-filet : une flèche qui porte un filet.
    for (let i = 0; i <= 4; i++) {
      c.line([14 + i * 3, 14], [14 + i * 3, 28], 0, '#cfc3a2');
      c.line([14, 14 + i * 3.5], [28, 14 + i * 3.5], 0, '#cfc3a2');
    }
    c.line([3, 29], [16, 16], 0.5, '#8a6a44');
    arrowHead(c, 6, 26, -1, 1, 4, '#dfe3ea');
    poly(c, [[16, 16], [10, 10], [14, 8], [18, 12]], '#6f9a3a');
  },
  'rodeur-e'(c) {
    // Marque du chasseur : un réticule orange.
    c.ellipse(16, 16, 12, 12, '#b0562a');
    c.ellipse(16, 16, 10, 10, '#1d1a1c');
    c.rect(15, 1, 3, 9, '#ffb07a');
    c.rect(15, 23, 3, 9, '#ffb07a');
    c.rect(1, 15, 9, 3, '#ffb07a');
    c.rect(23, 15, 9, 3, '#ffb07a');
    c.disc(16, 16, 2, '#ffd8b8');
  },
  'rodeur-r'(c) {
    // Recul : un saut en arrière, la flèche tournée vers la gauche.
    for (let i = 0; i <= 18; i++) {
      const t = i / 18;
      c.disc(27 - t * 20, 24 - Math.sin(t * Math.PI) * 14, 1, '#cfe7a0');
    }
    arrowHead(c, 7, 24, -0.35, 1, 5, '#e8ffb0');
    c.line([20, 29], [30, 29], 0, '#6f9a3a');
  },
};
