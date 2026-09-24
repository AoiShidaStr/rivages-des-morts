// Kodama en pixel art : petit esprit des arbres, grosse tête blanche ronde, yeux et bouche en trous, corps de jeune pousse.
const pal = {
  skin: '#f1f0e6',
  skinLight: '#ffffff',
  skinShade: '#c7c9b8',
  hole: '#2a2f2a',
  leaf: '#7fc35a',
  leafLight: '#b5e57c',
  leafShade: '#4f8a3a',
  glow: '#c9ffb0',
};

export default {
  width: 28,
  height: 32,
  outline: '#26302a',

  draw(c, pose) {
    const x = 14 + (pose.lean ?? 0);
    const ground = 30;
    const bob = pose.bob ?? 0;
    const headY = 12 + bob + (pose.head ?? 0);

    // Deux petites jambes en brindilles.
    c.line([x - 2, ground - 6 + bob], [x - 2 + (pose.step ?? 0), ground], 0.6, pal.skinShade);
    c.line([x + 2, ground - 6 + bob], [x + 2 - (pose.step ?? 0), ground], 0.6, pal.skinShade);
    // Corps fin comme une jeune pousse.
    c.ellipse(x, ground - 9 + bob, 3, 5, [pal.skinShade, pal.skin, pal.skinLight]);
    // Bras : baissés en marchant, levés pour soigner.
    const arm = pose.arms ?? 0;
    c.line([x - 2, ground - 11 + bob], [x - 5, ground - 8 + bob - arm], 0.5, pal.skin);
    c.line([x + 2, ground - 11 + bob], [x + 5, ground - 8 + bob - arm], 0.5, pal.skin);

    // Tête ronde, penchée quand il est étourdi.
    c.ellipse(x + (pose.tilt ?? 0), headY, 7, 6, [pal.skinShade, pal.skin, pal.skinLight]);
    const hx = x + (pose.tilt ?? 0);
    c.rect(hx - 2, headY - 1, 2, 2, pal.hole);
    c.rect(hx + 2, headY - 1, 2, 2, pal.hole);
    c.set(hx + 1, headY + 3, pal.hole);
    c.set(hx + 2, headY + 3, pal.hole);

    // Feuilles sur la tête, qui brillent pendant le soin.
    const leaf = pose.glow ? pal.glow : pal.leaf;
    c.ellipse(hx - 2, headY - 7, 2, 1, [pal.leafShade, leaf, pal.leafLight]);
    c.ellipse(hx + 2, headY - 8, 2, 1, [pal.leafShade, leaf, pal.leafLight]);
    c.line([hx, headY - 6], [hx, headY - 8], 0, pal.leafShade);
  },

  animations: {
    idle: { duration: 0.3, poses: [0, 1].map((bob) => ({ bob })) },
    move: {
      duration: 0.12,
      poses: [
        { bob: 0, step: 2, lean: 1 },
        { bob: -1, step: 0, lean: 1 },
        { bob: 0, step: -2, lean: 1 },
        { bob: -1, step: 0, lean: 1 },
      ],
    },
    channel: {
      duration: 0.15,
      poses: [
        { arms: 6, glow: true, bob: -1 },
        { arms: 7, glow: false, bob: -2 },
      ],
    },
    stunned: {
      duration: 0.25,
      poses: [
        { tilt: -1, head: 1, arms: -1 },
        { tilt: 1, head: 1, arms: -1 },
      ],
    },
  },
};
