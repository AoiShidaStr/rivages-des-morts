// Kasa-obake en pixel art : vieux parapluie de papier hanté, un grand œil, une langue rouge, une jambe sur une geta.
const pal = {
  paper: '#d7553b',
  paperLight: '#ef8a5d',
  paperShade: '#9d3326',
  rib: '#5a2a1e',
  handle: '#8a6a45',
  eyeWhite: '#fff7e8',
  pupil: '#1d1a20',
  tongue: '#e04a6a',
  tongueShade: '#a82e4c',
  leg: '#e2cdb0',
  legShade: '#b89f82',
  geta: '#7a5634',
  getaShade: '#553a22',
};

export default {
  width: 36,
  height: 42,
  outline: '#231619',

  draw(c, pose) {
    const lift = pose.lift ?? 0;
    const squash = pose.squash ?? 0;
    const x = 18 + (pose.lean ?? 0);
    const topY = 5 + lift + squash;
    const rimY = 22 + lift;
    const w = 13 + squash;

    // Jambe et geta : pliée quand il prend son élan, tendue en l'air.
    const legBend = pose.bend ?? 0;
    const foot = [x + legBend, 38 + Math.min(0, lift)];
    c.line([x, rimY], [x + legBend * 1.5, rimY + 8], 1, pal.leg);
    c.line([x + legBend * 1.5, rimY + 8], foot, 1, pal.legShade);
    c.line([foot[0] - 3, foot[1] + 1], [foot[0] + 3, foot[1] + 1], 0.6, pal.geta);
    c.set(foot[0] - 2, foot[1] + 2, pal.getaShade);
    c.set(foot[0] + 2, foot[1] + 2, pal.getaShade);

    // Toile en cône : chaque rangée s'élargit du sommet au bord, avec des bandes entre les baleines.
    for (let y = topY; y <= rimY; y++) {
      const t = (y - topY) / Math.max(1, rimY - topY);
      const half = Math.round(1 + t * w);
      for (let dx = -half; dx <= half; dx++) {
        const band = Math.floor(((dx + half) / (2 * half + 1)) * 5);
        const color = t < 0.2 ? pal.paperLight : band % 2 === 0 ? pal.paper : pal.paperShade;
        c.set(x + dx, y, color);
      }
    }
    // Bord déchiré.
    for (let dx = -w; dx <= w; dx += 3) c.set(x + dx, rimY + 1, pal.paperShade);
    for (let i = -2; i <= 2; i++) c.line([x, topY], [x + (i * w) / 2.2, rimY], 0, pal.rib);
    c.line([x, topY - 3], [x, topY], 0.5, pal.handle);

    // Grand œil unique, qui se ferme à demi quand il est sonné.
    const eyeY = topY + Math.round((rimY - topY) * 0.55);
    c.ellipse(x + 2, eyeY, 3, pose.dazed ? 1 : 2, pal.eyeWhite);
    if (!pose.dazed) c.rect(x + 3, eyeY - 1, 2, 2, pal.pupil);
    else c.line([x, eyeY], [x + 4, eyeY], 0, pal.pupil);

    // Langue pendante, qui s'agite.
    const lick = pose.lick ?? 0;
    c.line([x + 4, rimY - 2], [x + 6 + lick, rimY + 4], 1, pal.tongue);
    c.set(x + 6 + lick, rimY + 5, pal.tongueShade);
  },

  animations: {
    idle: { duration: 0.2, poses: [0, 1, 0, -1].map((lick) => ({ lick })) },
    move: {
      duration: 0.08,
      poses: [
        { squash: 2, bend: -1 },
        { lift: -3, bend: 0, lick: 1 },
        { lift: -5, bend: 1, lick: 2 },
        { lift: -2, bend: 0, lick: 1 },
      ],
    },
    airborne: { duration: 0.1, poses: [{ lift: -2, bend: 1, lick: 2 }, { lift: -3, bend: 1, lick: 3 }] },
    stunned: { duration: 0.25, poses: [{ squash: 2, dazed: true, lean: -1 }, { squash: 1, dazed: true, lean: 1 }] },
  },
};
