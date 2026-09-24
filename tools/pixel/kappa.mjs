// Kappa en pixel art : yokai-tortue trapu, carapace brune sur le dos, bec, coupelle d'eau sur la tête.
// `kappa(true)` donne le kappa renforcé : plus massif, plaques laquées rouges, coupelle cerclée d'or.

const base = {
  skin: '#6fbf4e',
  skinLight: '#9ade6c',
  skinShade: '#468a34',
  belly: '#d9d98c',
  shell: '#8a5a32',
  shellLight: '#b07a45',
  shellShade: '#5e3b20',
  plate: '#5e3b20',
  beak: '#f0b43c',
  beakShade: '#c0842a',
  eye: '#1b1d22',
  water: '#8fe0ff',
  waterLight: '#e0f8ff',
  dish: '#cfd6c6',
};

const elite = {
  ...base,
  skin: '#5aa648',
  skinShade: '#3b7433',
  shell: '#6d4a2c',
  plate: '#b8322b',
  dish: '#e3b85a',
  eye: '#ff5a3a',
};

export default function kappa(isElite = false) {
  const pal = isElite ? elite : base;
  const k = isElite ? 1.25 : 1;
  const S = (v) => Math.round(v * k);
  const width = S(46);
  const height = S(40);

  return {
    width,
    height,
    outline: '#1a2418',

    draw(c, pose) {
      const cx = Math.round(width / 2) + (pose.lean ?? 0);
      const ground = height - 2;
      const bob = pose.bob ?? 0;
      const bodyY = ground - S(11) + bob;

      // Jambes courtes et larges pieds palmés.
      const step = pose.step ?? 0;
      for (const [dx, s, shade] of [[-S(5), -step, true], [S(4), step, false]]) {
        const hip = [cx + dx, bodyY + S(5)];
        const foot = [cx + dx + s, ground - 1];
        c.line(hip, foot, S(1.5), shade ? pal.skinShade : pal.skin);
        c.line([foot[0] - 1, ground], [foot[0] + S(3), ground], 0.6, shade ? pal.skinShade : pal.skin);
      }

      // Carapace dans le dos (à gauche), puis le corps et le ventre.
      const shellX = cx - S(5) + (pose.shellShift ?? 0);
      c.ellipse(shellX, bodyY - S(1), S(10), S(10), [pal.shellShade, pal.shell, pal.shellLight]);
      for (const [x0, y0, x1, y1] of [[-6, -5, 0, -8], [0, -8, 5, -4], [-7, 2, -1, 5], [-1, 5, 5, 1], [0, -8, -1, 5]]) {
        c.line([shellX + S(x0), bodyY + S(y0)], [shellX + S(x1), bodyY + S(y1)], 0, pal.plate);
      }
      if (isElite) {
        c.rect(shellX - S(6), bodyY - S(3), S(3), S(3), pal.plate);
        c.rect(shellX + S(1), bodyY - S(6), S(3), S(2), pal.plate);
      }
      c.ellipse(cx + S(2), bodyY + S(1), S(7), S(8), [pal.skinShade, pal.skin, pal.skinLight]);
      c.ellipse(cx + S(4), bodyY + S(3), S(4), S(5), pal.belly);

      // Tête en avant, avec bec et coupelle.
      const head = [cx + S(6) + (pose.headX ?? 0), bodyY - S(10) + (pose.headY ?? 0)];
      c.ellipse(head[0], head[1], S(6), S(5), [pal.skinShade, pal.skin, pal.skinLight]);
      c.rect(head[0] + S(4), head[1] + 1, S(4), S(2), pal.beak);
      c.rect(head[0] + S(4), head[1] + 1 + S(2), S(3), 1, pal.beakShade);
      if (pose.dazed) {
        c.line([head[0], head[1] - 1], [head[0] + 2, head[1] + 1], 0, pal.eye);
        c.line([head[0], head[1] + 1], [head[0] + 2, head[1] - 1], 0, pal.eye);
      } else {
        c.rect(head[0] + 1, head[1] - 2, 2, 2, pal.eye);
      }
      if (isElite) c.line([head[0] - S(3), head[1] - S(3)], [head[0] - 1, head[1] + 1], 0, pal.skinShade);
      // Coupelle : pleine d'eau, ou renversée quand il est sonné.
      const tip = pose.dazed ? 3 : 0;
      c.line([head[0] - S(4), head[1] - S(5) + tip], [head[0] + S(3), head[1] - S(5) - tip], 1, pal.dish);
      if (!pose.dazed) {
        c.line([head[0] - S(3), head[1] - S(6)], [head[0] + S(2), head[1] - S(6)], 0, pal.water);
        c.set(head[0] - 1, head[1] - S(6), pal.waterLight);
      } else {
        for (let i = 0; i < 4; i++) c.set(head[0] + S(5) + i, head[1] - S(3) + i * 2, pal.water);
      }

      // Bras musclés et mains palmées.
      const arm = pose.arm ?? [S(6), S(2)];
      const shoulder = [cx + S(4), bodyY - S(3)];
      const hand = [shoulder[0] + arm[0], shoulder[1] + arm[1]];
      c.line(shoulder, hand, S(1.6), pal.skin);
      c.ellipse(hand[0], hand[1], S(2), S(2), [pal.skinShade, pal.skin, pal.skinLight]);
    },

    animations: {
      idle: { duration: 0.3, poses: [0, 1].map((bob) => ({ bob })) },
      move: {
        duration: 0.14,
        poses: [
          { step: 2, bob: 0 },
          { step: 0, bob: -1 },
          { step: -2, bob: 0 },
          { step: 0, bob: -1 },
        ],
      },
      windup: {
        duration: 0.12,
        poses: [
          { lean: -2, bob: 1, headY: 2, arm: [S(2), S(5)], step: -1 },
          { lean: -3, bob: 2, headY: 3, arm: [S(1), S(6)], step: -2 },
        ],
      },
      dash: {
        duration: 0.07,
        poses: [
          { lean: 3, bob: 1, headX: 2, headY: 3, arm: [S(7), S(4)], step: 3, shellShift: 1 },
          { lean: 3, bob: 2, headX: 2, headY: 4, arm: [S(7), S(5)], step: -3, shellShift: 1 },
        ],
      },
      stunned: {
        duration: 0.2,
        poses: [
          { dazed: true, bob: 1, lean: -1, arm: [S(4), S(6)] },
          { dazed: true, bob: 1, lean: 0, arm: [S(4), S(6)] },
        ],
      },
    },
  };
}
