// Graphismes provisoires en pixel art, dessinés au canvas : le sol de l'île et les petits décors.
// Ils seront remplacés par de vrais assets ; ils doivent seulement rester lisibles.
import { toScreen, type Circle, type IslandData, type ScreenPoint } from '../game/island';

const C = {
  deep: ['#3f5f66', '#45666d'],
  shallow: ['#5d8288', '#648a90'],
  sand: ['#b9a67f', '#b09c74'],
  grass: ['#5f7d4e', '#668655'],
  path: ['#9b8358', '#a38b60'],
  plaza: ['#a8926c', '#ae9872'],
  paddyWater: ['#6f98a0', '#76a0a8'],
  dike: '#6d5a40',
  sprout: '#8fbf5f',
  stream: ['#7fb2bf', '#88bac6'],
  plank: ['#7b5a3a', '#83613f'],
  plankLine: '#5a3f27',
  gravel: ['#a3a39a', '#9a9a91'],
  rake: '#8c8c84',
  cursed: ['#4b3437', '#533a3d'],
  vein: '#8a2a2a',
  outline: '#2f3b3a',
  lily: '#c8412f',
  mist: [195, 203, 207] as const,
};

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const el = document.createElement('canvas');
  el.width = w;
  el.height = h;
  const ctx = el.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponible');
  ctx.imageSmoothingEnabled = false;
  return [el, ctx];
}

/** Petit hachage déterministe pour semer détails et variations sans aléatoire. */
function hash(x: number, y: number): number {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

function distToPolyline(s: ScreenPoint, line: [number, number][]): number {
  let best = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, ay] = line[i];
    const [bx, by] = line[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((s.u - ax) * dx + (s.v - ay) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(s.u - (ax + dx * t), s.v - (ay + dy * t)));
  }
  return best;
}

const inside = (s: ScreenPoint, c: Circle, margin = 0): boolean => Math.hypot(s.u - c.u, s.v - c.v) <= c.r + margin;

/**
 * Sol de l'île, vu de dessus. Un pixel du canvas couvre 1/ppu unité ; la texture est affichée
 * sans lissage, d'où l'aspect pixel art. La correspondance canvas → monde suit celle de CreateGround :
 * x croît vers la droite du canvas, z vers le haut.
 */
export function drawIslandGround(data: IslandData, worldSize: number, ppu: number): HTMLCanvasElement {
  const size = worldSize * ppu;
  const [el, ctx] = canvas(size, size);
  const image = ctx.createImageData(size, size);
  const z = data.zones;
  const put = (i: number, hex: string) => {
    image.data[i] = parseInt(hex.slice(1, 3), 16);
    image.data[i + 1] = parseInt(hex.slice(3, 5), 16);
    image.data[i + 2] = parseInt(hex.slice(5, 7), 16);
    image.data[i + 3] = 255;
  };

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const i = (py * size + px) * 4;
      const world = { x: (px + 0.5) / ppu - worldSize / 2, z: worldSize / 2 - (py + 0.5) / ppu };
      const s = toScreen(world);
      const dither = (px + py) % 2;
      // Distance signée au rivage : positive sur la terre.
      const land = Math.max(...data.walkable.map((c) => c.r - Math.hypot(s.u - c.u, s.v - c.v)));
      const onPier = distToPolyline(s, z.pier) < 0.7;

      if (land <= 0 && !onPier) {
        const deep = land < -1.4;
        put(i, (deep ? C.deep : C.shallow)[dither]);
        if (!deep && hash(px, py) > 0.985) put(i, '#a9c4c6');
        // La mer se fond dans la brume loin de l'île.
        const far = Math.min(1, Math.max(0, (-land - 3) / 6));
        if (far > 0) {
          for (let k = 0; k < 3; k++) image.data[i + k] = Math.round(image.data[i + k] * (1 - far) + C.mist[k] * far);
        }
        if (land > -0.18) put(i, C.outline);
        continue;
      }

      const onPath = data.paths.some((p) => distToPolyline(s, p) < 0.7);
      const onStream = distToPolyline(s, z.stream) < 0.55;
      let color: string;
      if (onPier || (onStream && onPath)) {
        // Planches : ponton et pont, là où un chemin croise le ruisseau.
        color = (px + (onPier ? 0 : py)) % 3 === 0 ? C.plankLine : C.plank[dither];
      } else if (onStream || inside(s, z.pool)) {
        color = hash(px, py) > 0.93 ? '#e8f3f4' : C.stream[dither];
      } else if (inside(s, z.cursed)) {
        color = hash(Math.floor(px / 2), Math.floor(py / 3)) > 0.9 ? C.vein : C.cursed[dither];
      } else if (inside(s, z.gravel)) {
        const ring = Math.hypot(s.u - z.gravel.u, s.v - z.gravel.v) * 2.2;
        color = ring % 1 < 0.18 ? C.rake : C.gravel[dither];
      } else if (z.paddies.some((c) => inside(s, c))) {
        const cell = 1.6;
        const gx = ((world.x % cell) + cell) % cell;
        const gz = ((world.z % cell) + cell) % cell;
        if (gx < 0.22 || gz < 0.22) color = C.dike;
        else color = hash(Math.floor(px / 2), Math.floor(py / 2)) > 0.8 ? C.sprout : C.paddyWater[dither];
      } else if (onPath) {
        color = C.path[dither];
      } else if (inside(s, z.plaza)) {
        color = C.plaza[dither];
      } else if (land < 0.55) {
        color = C.sand[dither];
      } else {
        const h = hash(px, py);
        color = h > 0.996 ? C.lily : h > 0.97 ? '#739660' : C.grass[dither];
      }
      put(i, color);
    }
  }
  ctx.putImageData(image, 0, 0);
  return el;
}

// --- Décors -----------------------------------------------------------------

type Painter = (ctx: CanvasRenderingContext2D) => void;

function sprite(w: number, h: number, paint: Painter): HTMLCanvasElement {
  const [el, ctx] = canvas(w, h);
  paint(ctx);
  return el;
}

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** Trapèze plein, ligne par ligne (toits, feuillages). */
function trapezoid(ctx: CanvasRenderingContext2D, cx: number, top: number, height: number, topW: number, bottomW: number, color: string): void {
  for (let row = 0; row < height; row++) {
    const w = Math.round(topW + ((bottomW - topW) * row) / Math.max(1, height - 1));
    rect(ctx, Math.round(cx - w / 2), top + row, w, 1, color);
  }
}

const PROPS: Record<string, () => HTMLCanvasElement> = {
  'maison-the': () =>
    sprite(48, 40, (ctx) => {
      rect(ctx, 6, 18, 36, 21, '#8a6a48');
      rect(ctx, 6, 18, 36, 2, '#6d5238');
      for (const x of [6, 23, 40]) rect(ctx, x, 18, 2, 21, '#4d3a2a');
      rect(ctx, 10, 23, 8, 6, '#e7dcc4');
      rect(ctx, 13, 23, 1, 6, '#4d3a2a');
      rect(ctx, 26, 22, 10, 17, '#2a2220');
      rect(ctx, 25, 21, 12, 6, '#c8412f');
      rect(ctx, 30, 21, 1, 6, '#8e2c1f');
      rect(ctx, 30, 23, 2, 2, '#f1ece2');
      trapezoid(ctx, 24, 6, 13, 26, 46, '#3a3f4a');
      rect(ctx, 1, 18, 46, 2, '#2b2f38');
      rect(ctx, 0, 16, 3, 2, '#2b2f38');
      rect(ctx, 45, 16, 3, 2, '#2b2f38');
      for (let x = 12; x < 38; x += 4) rect(ctx, x, 9, 1, 8, '#4a5060');
      rect(ctx, 40, 21, 4, 7, '#d14b35');
      rect(ctx, 41, 20, 2, 1, '#2a2220');
    }),
  forge: () =>
    sprite(44, 40, (ctx) => {
      rect(ctx, 33, 1, 6, 13, '#5b5552');
      rect(ctx, 30, 0, 4, 3, '#d8dcde');
      rect(ctx, 36, 0, 5, 2, '#e9ecee');
      rect(ctx, 5, 19, 34, 20, '#6f6a66');
      for (let y = 21; y < 39; y += 4) for (let x = 5 + ((y / 4) % 2) * 3; x < 39; x += 6) rect(ctx, x, y, 5, 1, '#5d5854');
      rect(ctx, 16, 25, 12, 14, '#2a1d17');
      rect(ctx, 18, 29, 8, 10, '#ff8a3a');
      rect(ctx, 20, 32, 4, 7, '#ffc36b');
      trapezoid(ctx, 22, 8, 12, 20, 42, '#4d3a2a');
      rect(ctx, 0, 19, 44, 2, '#3a2b20');
      rect(ctx, 30, 33, 10, 3, '#2c2c30');
      rect(ctx, 33, 36, 4, 3, '#2c2c30');
    }),
  jizo: () =>
    sprite(12, 16, (ctx) => {
      rect(ctx, 1, 13, 10, 3, '#7a7f80');
      rect(ctx, 2, 5, 8, 9, '#9ea3a4');
      rect(ctx, 3, 1, 6, 5, '#b3b8b9');
      rect(ctx, 3, 0, 6, 2, '#b33a2b');
      rect(ctx, 4, 3, 1, 1, '#5d6263');
      rect(ctx, 7, 3, 1, 1, '#5d6263');
      rect(ctx, 2, 6, 8, 4, '#c8412f');
      rect(ctx, 8, 8, 2, 5, '#7f8586');
    }),
  ema: () =>
    sprite(14, 18, (ctx) => {
      rect(ctx, 1, 4, 2, 14, '#5a3f27');
      rect(ctx, 11, 4, 2, 14, '#5a3f27');
      rect(ctx, 0, 3, 14, 2, '#4d3a2a');
      rect(ctx, 4, 7, 6, 6, '#d9b47a');
      rect(ctx, 5, 6, 4, 1, '#d9b47a');
      rect(ctx, 6, 5, 2, 1, '#c8412f');
      rect(ctx, 6, 9, 2, 2, '#4d3a2a');
    }),
  coffre: () =>
    sprite(14, 11, (ctx) => {
      rect(ctx, 1, 4, 12, 7, '#7b5230');
      rect(ctx, 1, 2, 12, 3, '#8f6138');
      rect(ctx, 2, 1, 10, 1, '#8f6138');
      rect(ctx, 1, 5, 12, 1, '#d9b45a');
      rect(ctx, 6, 5, 2, 3, '#f0d27a');
      rect(ctx, 0, 4, 1, 7, '#4d3420');
      rect(ctx, 13, 4, 1, 7, '#4d3420');
    }),
  portail: () =>
    sprite(40, 40, (ctx) => {
      const glow = ctx.createRadialGradient(20, 28, 2, 20, 28, 15);
      glow.addColorStop(0, 'rgba(200, 65, 47, 0.95)');
      glow.addColorStop(1, 'rgba(200, 65, 47, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(4, 12, 32, 28);
      for (let r = 3; r < 12; r += 3) {
        ctx.strokeStyle = 'rgba(40, 10, 12, 0.55)';
        ctx.beginPath();
        ctx.arc(20, 28, r, 0.3 * r, 0.3 * r + 4);
        ctx.stroke();
      }
      rect(ctx, 9, 8, 4, 32, '#1d1a1c');
      rect(ctx, 27, 8, 4, 32, '#1d1a1c');
      rect(ctx, 2, 4, 36, 4, '#1d1a1c');
      rect(ctx, 0, 3, 3, 2, '#1d1a1c');
      rect(ctx, 37, 3, 3, 2, '#1d1a1c');
      rect(ctx, 6, 11, 28, 3, '#241f22');
      rect(ctx, 18, 8, 4, 4, '#241f22');
    }),
  cascade: () =>
    sprite(40, 56, (ctx) => {
      trapezoid(ctx, 20, 4, 48, 30, 40, '#5b5e5a');
      for (let y = 8; y < 52; y += 5) for (let x = 2; x < 38; x += 7) rect(ctx, x + (y % 2), y, 4, 2, '#6c706b');
      rect(ctx, 5, 2, 30, 4, '#5f7d4e');
      rect(ctx, 8, 0, 24, 3, '#668655');
      for (let x = 14; x < 26; x++) {
        for (let y = 4; y < 50; y++) rect(ctx, x, y, 1, 1, (x + Math.floor(y / 3)) % 3 === 0 ? '#e8f3f4' : x % 2 ? '#9fcfdb' : '#b9dfe8');
      }
      rect(ctx, 10, 48, 20, 5, '#eef6f7');
      rect(ctx, 12, 52, 16, 4, '#cfe6ec');
    }),
  lanterne: () =>
    sprite(10, 18, (ctx) => {
      rect(ctx, 2, 15, 6, 3, '#7a7f80');
      rect(ctx, 4, 10, 2, 5, '#8d9293');
      rect(ctx, 1, 6, 8, 4, '#9ea3a4');
      rect(ctx, 3, 7, 4, 2, '#ffcf7a');
      rect(ctx, 0, 3, 10, 3, '#7f8586');
      rect(ctx, 3, 1, 4, 2, '#7f8586');
      rect(ctx, 4, 0, 2, 1, '#9ea3a4');
    }),
  'lanterne-allumee': () =>
    sprite(10, 18, (ctx) => {
      const glow = ctx.createRadialGradient(5, 8, 0, 5, 8, 6);
      glow.addColorStop(0, 'rgba(111, 243, 255, 0.9)');
      glow.addColorStop(1, 'rgba(111, 243, 255, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 2, 10, 12);
      rect(ctx, 2, 15, 6, 3, '#7a7f80');
      rect(ctx, 4, 10, 2, 5, '#8d9293');
      rect(ctx, 1, 6, 8, 4, '#9ea3a4');
      rect(ctx, 3, 7, 4, 2, '#6ff3ff');
      rect(ctx, 4, 7, 2, 1, '#e8fdff');
      rect(ctx, 0, 3, 10, 3, '#7f8586');
      rect(ctx, 3, 1, 4, 2, '#7f8586');
      rect(ctx, 4, 0, 2, 1, '#9ea3a4');
    }),
  sutra: () =>
    sprite(12, 8, (ctx) => {
      rect(ctx, 1, 2, 10, 6, '#efe6cf');
      rect(ctx, 0, 1, 12, 1, '#b99a63');
      rect(ctx, 0, 7, 12, 1, '#b99a63');
      for (let x = 2; x < 11; x += 2) for (let y = 3; y < 7; y += 2) rect(ctx, x, y, 1, 1, '#2b2f38');
      rect(ctx, 9, 3, 1, 2, '#c8412f');
    }),
  argile: () =>
    sprite(20, 32, (ctx) => {
      rect(ctx, 5, 26, 4, 6, '#8a6a4a');
      rect(ctx, 11, 26, 4, 6, '#8a6a4a');
      rect(ctx, 3, 11, 14, 16, '#a07a52');
      rect(ctx, 1, 12, 3, 11, '#8f6c48');
      rect(ctx, 16, 12, 3, 11, '#8f6c48');
      rect(ctx, 6, 2, 8, 9, '#ad875d');
      rect(ctx, 7, 5, 2, 1, '#3a2b20');
      rect(ctx, 11, 5, 2, 1, '#3a2b20');
      rect(ctx, 7, 8, 6, 3, '#6d5238');
      for (const [x, y] of [[5, 14], [12, 18], [8, 22], [14, 13], [9, 3]]) rect(ctx, x, y, 2, 1, '#5d4632');
      rect(ctx, 4, 15, 1, 3, '#5f7d4e');
      rect(ctx, 15, 20, 1, 3, '#5f7d4e');
      rect(ctx, 3, 10, 14, 1, '#c8412f');
    }),
  arbre: () =>
    sprite(24, 36, (ctx) => {
      rect(ctx, 10, 26, 4, 10, '#5a4030');
      trapezoid(ctx, 12, 18, 10, 10, 24, '#2f4a3a');
      trapezoid(ctx, 12, 9, 11, 6, 20, '#35523f');
      trapezoid(ctx, 12, 1, 10, 2, 14, '#3b5a45');
      for (const [x, y] of [[8, 12], [15, 16], [6, 22], [16, 24], [11, 5]]) rect(ctx, x, y, 3, 1, '#4d7258');
    }),
};

/** Canvas du décor `name` (sans le préfixe « px: »), ou null s'il n'existe pas. */
export function drawProp(name: string): HTMLCanvasElement | null {
  return PROPS[name]?.() ?? null;
}
