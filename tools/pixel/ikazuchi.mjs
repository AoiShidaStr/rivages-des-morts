// Ikazuchi en pixel art : petit dieu du tonnerre, corps d'orage violet à deux cornes, yeux dorés,
// entouré d'un anneau de tambours taiko qui tourne ; une traîne d'éclair pend sous lui.
const pal = {
  body: '#4b3a6e',
  bodyLight: '#7a64a8',
  bodyShade: '#2c2242',
  horn: '#f2d36b',
  eye: '#ffe98a',
  drum: '#b8322f',
  drumLight: '#e0604c',
  drumSkin: '#f1e3c4',
  bolt: '#fff4a8',
  boltShade: '#e8b93a',
};

export default {
  width: 38,
  height: 34,
  outline: '#150f22',

  draw(c, pose) {
    const cx = 19;
    const cy = 15 + (pose.bob ?? 0);
    const spin = pose.spin ?? 0;
    const spark = pose.spark ?? 0;

    // Traîne d'éclair sous le corps.
    let p = [cx, cy + 5];
    for (let i = 0; i < 4; i++) {
      const next = [cx + (i % 2 ? 2 : -2) + (pose.sway ?? 0), cy + 8 + i * 3];
      c.line(p, next, i < 2 ? 1 : 0.5, i < 2 ? pal.bolt : pal.boltShade);
      p = next;
    }

    // Tambours de derrière (la moitié haute de l'anneau), puis le corps, puis ceux de devant.
    const drums = [];
    for (let i = 0; i < 6; i++) {
      const a = spin + (i / 6) * Math.PI * 2;
      drums.push({ x: cx + Math.cos(a) * 12, y: cy + Math.sin(a) * 5 - (pose.lift ?? 0), front: Math.sin(a) > 0 });
    }
    const drawDrum = (d) => {
      c.ellipse(d.x, d.y, 2.5, 2.5, [pal.drum, pal.drum, pal.drumLight]);
      c.set(d.x, d.y, pal.drumSkin);
    };
    for (const d of drums) if (!d.front) drawDrum(d);

    c.ellipse(cx, cy, 6.5, 6, [pal.bodyShade, pal.body, pal.bodyLight]);
    // Cornes et yeux.
    c.line([cx - 3, cy - 5], [cx - 5, cy - 9], 0.5, pal.horn);
    c.line([cx + 3, cy - 5], [cx + 5, cy - 9], 0.5, pal.horn);
    c.rect(cx + 1, cy - 2, 2, 2, pal.eye);
    c.rect(cx + 4, cy - 2, 1, 2, pal.eye);
    c.line([cx + 1, cy + 3], [cx + 4, cy + 3], 0, pal.bodyShade);

    for (const d of drums) if (d.front) drawDrum(d);

    // Éclairs quand il appelle la foudre.
    if (spark) {
      for (const [dx, dy, len] of [[-9, -9, 5], [9, -10, 5], [0, -13, 4]]) {
        c.line([cx + dx, cy + dy], [cx + dx + 2, cy + dy - len / 2], 0, pal.bolt);
        c.line([cx + dx + 2, cy + dy - len / 2], [cx + dx, cy + dy - len], 0, pal.bolt);
      }
    }
  },

  animations: {
    move: {
      duration: 0.1,
      poses: [0, 1, 2, 3].map((i) => ({ spin: (i * Math.PI) / 6, bob: i % 2, sway: i % 2 ? 1 : -1 })),
    },
    channel: {
      duration: 0.08,
      poses: [0, 1, 2, 3].map((i) => ({ spin: (i * Math.PI) / 3, lift: 2, spark: i % 2, bob: -1 })),
    },
    stunned: {
      duration: 0.3,
      poses: [
        { spin: 0.3, bob: 2, lift: -2 },
        { spin: 0.35, bob: 3, lift: -2 },
      ],
    },
  },
};
