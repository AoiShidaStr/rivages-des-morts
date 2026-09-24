// Petite araignée de la Jorōgumo en pixel art : corps noir luisant, marque cramoisie, yeux rouges.
const pal = {
  body: '#2a1a22',
  bodyLight: '#4a2e3a',
  bodyShade: '#170d13',
  mark: '#c8303c',
  leg: '#6a3a4c',
  eye: '#ff4a3a',
};

export default {
  width: 34,
  height: 20,
  outline: '#0b0609',

  draw(c, pose) {
    const x = 17 + (pose.lean ?? 0);
    const y = 12 + (pose.bob ?? 0);
    const gait = pose.gait ?? 0;
    // Quatre paires de pattes articulées, qui alternent en marchant.
    // Les pattes sont plus claires que le corps pour ne pas se fondre dans le contour.
    for (let i = 0; i < 4; i++) {
      const phase = (i % 2 === 0 ? 1 : -1) * gait;
      const reach = 4 + i * 3;
      for (const side of [-1, 1]) {
        const knee = [x + side * reach + phase, y - 6 + (i === 0 || i === 3 ? 1 : 0)];
        const foot = [x + side * (reach + 3) + phase, 18];
        c.line([x + side, y], knee, 0, pal.leg);
        c.line(knee, foot, 0, pal.leg);
      }
    }
    c.ellipse(x - 3, y - 1, 5, 4, [pal.bodyShade, pal.body, pal.bodyLight]);
    c.rect(x - 4, y - 2, 2, 3, pal.mark);
    c.ellipse(x + 3, y, 3, 3, [pal.bodyShade, pal.body, pal.bodyLight]);
    c.rect(x + 4, y - 1, 2, 1, pose.dazed ? pal.bodyLight : pal.eye);
    // Crochets en avant pendant la morsure.
    if (pose.fangs) {
      c.set(x + 6, y + 1, pal.mark);
      c.set(x + 7, y + 2, pal.mark);
    }
  },

  animations: {
    idle: { duration: 0.3, poses: [{ bob: 0 }, { bob: 1 }] },
    move: { duration: 0.06, poses: [-1, 1].map((gait) => ({ gait, bob: gait > 0 ? 0 : -1 })) },
    windup: { duration: 0.35, once: true, poses: [{ lean: -2, bob: 1 }] },
    strike: {
      once: true,
      poses: [
        { duration: 0.1, lean: 3, bob: -1, fangs: true },
        { duration: 0.35, lean: 1, fangs: true },
      ],
    },
    stunned: { duration: 0.25, poses: [{ dazed: true, bob: 1 }, { dazed: true, bob: 1, lean: 1 }] },
  },
};
