// Hitodama (feu follet) en pixel art : petite flamme d'esprit bleu-blanc, queue ondulante, deux yeux noirs.
const pal = {
  core: '#ffffff',
  inner: '#bff8ff',
  flame: '#6fe6ff',
  edge: '#2fa9d6',
  eye: '#123040',
};

export default {
  width: 30,
  height: 22,
  outline: '#16304a',

  draw(c, pose) {
    const { wave, squash } = pose;
    const cx = 19;
    const cy = 11;
    // Queue : une traînée de disques qui rétrécissent vers l'arrière (la gauche) en ondulant.
    for (let i = 10; i >= 1; i--) {
      const x = cx - 4 - i;
      const y = cy + 1 + Math.round(Math.sin(i * 0.7 + wave) * (i / 5));
      const r = Math.max(0, 3 - i * 0.3);
      c.disc(x, y, r, i > 6 ? pal.edge : pal.flame);
    }
    c.ellipse(cx, cy, 6 + squash, 5 - squash, [pal.edge, pal.flame, pal.inner]);
    c.ellipse(cx - 1, cy - 1, 3, 2, pal.inner);
    c.rect(cx - 3, cy - 3, 2, 2, pal.core);
    // Deux petits yeux, du côté où il fonce.
    c.set(cx + 2, cy, pal.eye);
    c.set(cx + 2, cy + 1, pal.eye);
    c.set(cx + 4, cy, pal.eye);
    c.set(cx + 4, cy + 1, pal.eye);
  },

  animations: {
    move: {
      duration: 0.1,
      poses: [0, 1, 2, 3].map((i) => ({ wave: i * 1.6, squash: i % 2 })),
    },
  },
};
