// Monte la planche d'un personnage : toutes les poses de toutes ses animations sur une ligne d'images,
// et sa description au format « Array » d'Aseprite (tags = postures du jeu). Sans dépendance à Node :
// `npm run pixel` l'enregistre en PNG, le jeu s'en sert pour dessiner le héros avec son équipement.
import { Canvas } from './canvas.mjs';

export function drawSheet(name, character) {
  const { width, height, animations } = character;
  const frames = [];
  const tags = [];
  for (const [tag, anim] of Object.entries(animations)) {
    const from = frames.length;
    anim.poses.forEach((pose, i) => {
      const canvas = new Canvas(width, height);
      character.draw(canvas, pose, i);
      canvas.outline(character.outline);
      // Dessiné tourné vers la droite, retourné pour un personnage que le jeu attend tourné vers la gauche.
      if (character.mirror) mirror(canvas);
      frames.push({ canvas, duration: pose.duration ?? anim.duration });
    });
    tags.push({ name: tag, from, to: frames.length - 1, direction: 'forward', ...(anim.once ? { repeat: '1' } : {}) });
  }

  const sheet = new Canvas(width * frames.length, height);
  frames.forEach((f, i) => sheet.blit(f.canvas, i * width, 0));
  const json = {
    frames: frames.map((f, i) => ({
      filename: `${name} ${i}`,
      frame: { x: i * width, y: 0, w: width, h: height },
      duration: Math.round(f.duration * 1000),
    })),
    meta: {
      app: 'tools/pixel.mjs',
      image: `${name}.png`,
      size: { w: sheet.width, h: sheet.height },
      frameTags: tags,
    },
  };
  return { sheet, json, count: frames.length };
}

function mirror(canvas) {
  const { width, height, data } = canvas;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width >> 1; x++) {
      const a = (y * width + x) * 4;
      const b = (y * width + width - 1 - x) * 4;
      for (let k = 0; k < 4; k++) {
        const t = data[a + k];
        data[a + k] = data[b + k];
        data[b + k] = t;
      }
    }
  }
}
