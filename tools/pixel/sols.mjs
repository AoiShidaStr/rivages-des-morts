// Sols en pixel art, vus de dessus, à l'échelle du jeu (`ppu` pixels par unité) : l'île d'après ses zones
// (src/data/island.json) et les rizières de l'arène. Dessinés dans le jeu au chargement (textures sans lissage).
// Un pixel (px, py) couvre le point du monde x = (px + ½)/ppu − taille/2, z = taille/2 − (py + ½)/ppu,
// comme la texture d'un CreateGround de Babylon.
import { Canvas } from './canvas.mjs';
import { hash, mix, noise } from './draw.mjs';

const MIST = '#c3cbcf';

/** Distance d'un point (u, v) à une ligne brisée, et direction du segment le plus proche. */
function nearLine(u, v, line) {
  let best = Infinity;
  let dir = [1, 0];
  let along = 0;
  let walked = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, ay] = line[i];
    const [bx, by] = line[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const t = Math.max(0, Math.min(1, ((u - ax) * dx + (v - ay) * dy) / (len * len)));
    const d = Math.hypot(u - (ax + dx * t), v - (ay + dy * t));
    if (d < best) {
      best = d;
      dir = [dx / len, dy / len];
      along = walked + t * len;
    }
    walked += len;
  }
  return { d: best, dir, along };
}

const inCircle = (s, c, margin = 0) => Math.hypot(s.u - c.u, s.v - c.v) <= c.r + margin;

/**
 * Sol de l'île : mer qui se fond dans la brume, écume, sable, herbe semée de lycoris rouges, chemins de terre,
 * place dallée, rizières, ruisseau, bassin, jardin de gravier ratissé, terre maudite et ponton.
 * `toScreen` convertit un point du monde en coordonnées de l'île (u, v).
 */
export function islandGround(data, worldSize, ppu, toScreen) {
  const size = Math.round(worldSize * ppu);
  const c = new Canvas(size, size);
  const z = data.zones;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const world = { x: (px + 0.5) / ppu - worldSize / 2, z: worldSize / 2 - (py + 0.5) / ppu };
      const s = toScreen(world);
      // Distance signée au rivage : positive sur la terre.
      let land = -Infinity;
      for (const circle of data.walkable) land = Math.max(land, circle.r - Math.hypot(s.u - circle.u, s.v - circle.v));
      const pier = nearLine(s.u, s.v, z.pier);
      const onPier = pier.d < 0.7;
      c.set(px, py, land <= 0 && !onPier ? water(px, py, land) : landColor(px, py, world, s, land, pier, onPier, data));
    }
  }
  return c;
}

/** Trame ordonnée 4 × 4 (Bayer) : des dégradés en pixels alternés plutôt qu'en bandes. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bayer = (px, py) => (BAYER[(py % 4) * 4 + (px % 4)] + 0.5) / 16;

/** Teinte vers la brume, par paliers tramés. */
function toMist(color, px, py, t, steps = 4) {
  const level = Math.min(steps, Math.floor(t * steps + bayer(px, py)));
  return level <= 0 ? color : level >= steps ? MIST : mix(color, MIST, level / steps);
}

function water(px, py, land) {
  // Au loin, la mer se fond dans la brume.
  const far = Math.min(1, Math.max(0, (-land - 2.5) / 7));
  if (far >= 1) return MIST;
  const deep = land < -1.2;
  let color = deep ? (noise(px, py, 11, 1) > 0.55 ? '#34565f' : '#2f4f5a') : noise(px, py, 7, 2) > 0.5 ? '#58848b' : '#4f7a82';
  // Petites vagues : des traits clairs horizontaux.
  if ((py + Math.floor(noise(px, py, 23, 3) * 6)) % 7 === 0 && noise(px * 0.5, py, 5, 4) > 0.72) color = deep ? '#4f7a82' : '#8fb8bc';
  // Écume au bord du rivage.
  if (land > -0.12) color = '#e3eeec';
  else if (land > -0.22 && hash(px, py) > 0.45) color = '#b8d4d2';
  return far > 0 ? toMist(color, px, py, far) : color;
}

/** Boîtes englobantes des chemins (élargies d'une unité) : on ne mesure la distance qu'aux chemins proches. */
const boxes = new WeakMap();
function pathBoxes(paths) {
  let list = boxes.get(paths);
  if (!list) {
    list = paths.map((line) => {
      const us = line.map((p) => p[0]);
      const vs = line.map((p) => p[1]);
      return [Math.min(...us) - 1, Math.max(...us) + 1, Math.min(...vs) - 1, Math.max(...vs) + 1];
    });
    boxes.set(paths, list);
  }
  return list;
}

function landColor(px, py, world, s, land, pier, onPier, data) {
  const z = data.zones;
  const dither = (px + py) % 2;
  const near = pathBoxes(data.paths);
  let path = Infinity;
  data.paths.forEach((line, i) => {
    const [u0, u1, v0, v1] = near[i];
    if (s.u >= u0 && s.u <= u1 && s.v >= v0 && s.v <= v1) path = Math.min(path, nearLine(s.u, s.v, line).d);
  });
  const stream = nearLine(s.u, s.v, z.stream);
  const onStream = stream.d < 0.55;
  const onPath = path < 0.7;

  if (onPier || (onStream && onPath)) {
    // Planches : ponton, et pont là où un chemin croise le ruisseau (posées en travers).
    const dir = onPier ? pier.dir : stream.dir;
    const across = (s.u * dir[0] + s.v * dir[1]) / 0.17;
    if (((across % 1) + 1) % 1 < 0.22) return '#4a3322';
    return hash(Math.floor(across), 7) > 0.5 ? '#83613f' : '#7b5a3a';
  }
  if (onStream || inCircle(s, z.pool)) {
    // Eau claire qui coule : reflets en tirets dans le sens du courant.
    if (inCircle(s, z.pool, -0.3) && noise(px, py, 5, 21) > 0.78) return noise(px, py, 2, 22) > 0.6 ? '#e38aa0' : '#5f8f4e';
    const edge = onStream ? stream.d > 0.4 : Math.hypot(s.u - z.pool.u, s.v - z.pool.v) > z.pool.r - 0.15;
    if (edge) return '#5d8a90';
    const streak = Math.floor(stream.along * 4 + noise(px, py, 6, 23) * 3) % 5 === 0;
    return streak ? '#c8e4ea' : dither ? '#88bac6' : '#7fb2bf';
  }
  if (inCircle(s, z.cursed)) {
    // Terre maudite : sombre, veinée de rouge, quelques fils de soie.
    const d = Math.hypot(s.u - z.cursed.u, s.v - z.cursed.v) / z.cursed.r;
    const vein = Math.abs(noise(px, py, 9, 31) - 0.5) < 0.035;
    if (vein) return d < 0.7 ? '#c8412f' : '#8a2a2a';
    if (Math.abs(((Math.atan2(s.v - z.cursed.v, s.u - z.cursed.u) * 8) / Math.PI) % 1) < 0.04 && d < 0.9) return '#8a8e98';
    return noise(px, py, 4, 32) > 0.5 ? '#4b3437' : '#3a2628';
  }
  if (inCircle(s, z.gravel)) {
    // Jardin sec : gravier clair ratissé en cercles autour d'une pierre.
    const r = Math.hypot(s.u - z.gravel.u, s.v - z.gravel.v);
    if (r < 0.7) return noise(px, py, 3, 41) > 0.5 ? '#6a7074' : '#848a8e';
    if (r < 0.8) return '#a8a69c';
    const groove = (r * 3.2) % 1 < 0.2;
    return groove ? '#a8a69c' : hash(px, py) > 0.9 ? '#d8d6cc' : '#c4c2b8';
  }
  if (z.paddies.some((p) => inCircle(s, p))) {
    // Rizières : diguettes suivant les axes du monde (en losanges à l'écran), eau et pousses en rangées.
    const cell = 1.6;
    const gx = ((world.x % cell) + cell) % cell;
    const gz = ((world.z % cell) + cell) % cell;
    if (gx < 0.2 || gz < 0.2) return gx < 0.07 || gz < 0.07 ? '#8a9a5a' : '#6d5a40';
    const row = Math.round(gz * 10) % 3 === 0 && Math.round(gx * 10) % 2 === 0;
    if (row) return hash(px, py) > 0.5 ? '#8fbf5f' : '#6f9f4f';
    return noise(px, py, 8, 51) > 0.6 ? '#86aeb4' : dither ? '#76a0a8' : '#6f98a0';
  }
  if (onPath) {
    // Chemin de terre battue, cailloux, bords qui se mêlent à l'herbe.
    if (path > 0.55 && hash(px, py) > 0.5) return grass(px, py);
    const n = noise(px, py, 4, 61);
    return hash(px, py) > 0.97 ? '#c2ae84' : n > 0.62 ? '#a8905f' : n < 0.3 ? '#8a744c' : '#9b8358';
  }
  if (inCircle(s, z.plaza)) {
    // Place dallée : grandes dalles alignées sur le monde, joints sombres.
    const tile = 1.1;
    const tx = Math.floor(world.x / tile + (Math.floor(world.z / tile) % 2) * 0.5);
    const tz = Math.floor(world.z / tile);
    const fx = ((world.x / tile + (Math.floor(world.z / tile) % 2) * 0.5) % 1 + 1) % 1;
    const fz = ((world.z / tile) % 1 + 1) % 1;
    if (fx < 0.07 || fz < 0.07) return '#7d6a4c';
    const shade = hash(tx, tz);
    if (Math.hypot(s.u - z.plaza.u, s.v - z.plaza.v) > z.plaza.r - 0.4 && hash(px, py) > 0.55) return grass(px, py);
    return shade > 0.66 ? '#b8a27a' : shade > 0.33 ? '#a8926c' : '#9c8662';
  }
  if (land < 0.5) {
    // Sable, plus sombre là où la vague l'a mouillé.
    if (land < 0.12) return dither ? '#9c8a66' : '#a08d68';
    if (land > 0.38 && hash(px, py) > 0.6) return grass(px, py);
    return hash(px, py) > 0.93 ? '#a8946c' : noise(px, py, 5, 71) > 0.55 ? '#cdb98e' : '#c2ae84';
  }
  return grass(px, py);
}

/** Herbe en taches de teintes voisines, touffes claires et sombres, lycoris rouges et petites fleurs blanches. */
function grass(px, py) {
  const n = noise(px, py, 8, 81) * 0.72 + noise(px, py, 2.5, 82) * 0.28 + (bayer(px, py) - 0.5) * 0.14;
  let color = n > 0.66 ? '#6f9258' : n > 0.5 ? '#648650' : n > 0.33 ? '#5a7a46' : '#4f6e3e';
  const tuft = hash(Math.floor(px / 2), Math.floor(py / 2));
  if (tuft > 0.985) color = '#86a866';
  else if (tuft < 0.015) color = '#3f5a32';
  // Lycoris (higanbana) : des taches de deux ou trois pixels rouges, par bouquets.
  const bloom = noise(px, py, 30, 83) > 0.72 && hash(px, py) > 0.94;
  if (bloom) color = hash(py, px) > 0.4 ? '#c8412f' : '#e0634a';
  else if (hash(px * 3, py * 7) > 0.997) color = '#f1ece0';
  return color;
}

/**
 * Rizières de l'arène : parcelles carrées de `cell` unités (eau, reflets, pousses en rangées), diguettes
 * herbeuses, diguette plus haute autour de l'arène, et brume au-delà.
 */
export function paddyGround(worldSize, arenaHalf, cell, ppu) {
  const size = Math.round(worldSize * ppu);
  const c = new Canvas(size, size);
  const dike = 0.36;
  const spacing = (cell * ppu) / 5;
  // Touffe de riz : pied sombre, deux feuilles, pointe claire.
  const clump = { '0,0': '#4f7f3a', '-1,-1': '#6f9f4f', '1,-1': '#6f9f4f', '0,-1': '#8fbf5f', '0,-2': '#b0d878', '-1,0': '#5f8f44' };
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const x = (px + 0.5) / ppu - worldSize / 2;
      const zz = worldSize / 2 - (py + 0.5) / ppu;
      const gx = ((x % cell) + cell) % cell;
      const gz = ((zz % cell) + cell) % cell;
      const edge = Math.min(gx, gz, cell - gx, cell - gz);
      const border = Math.abs(Math.max(Math.abs(x), Math.abs(zz)) - arenaHalf);
      let color;
      if (border < 0.3) {
        // Diguette haute autour de l'arène : terre, dessus herbeux éclairé.
        color = border < 0.1 ? '#9aab66' : border < 0.18 ? '#7a8a4e' : '#5f4c36';
      } else if (edge < dike / 2) {
        // Diguette de terre : herbe sur les bords, terre au milieu.
        const n = noise(px, py, 3, 91) + (bayer(px, py) - 0.5) * 0.3;
        color = edge > dike / 2 - 0.07 ? (hash(px, py) > 0.35 ? '#7a8a4e' : '#8a9a5a') : n > 0.55 ? '#735f44' : '#6d5a40';
        if (hash(px, py) > 0.94) color = '#9aab66';
      } else {
        // Eau de la parcelle : teinte propre à chaque parcelle, taches de vase, reflets du ciel, touffes en rangées.
        const plot = hash(Math.floor(x / cell), Math.floor(zz / cell), 5);
        color = plot > 0.66 ? '#6f98a0' : plot > 0.33 ? '#6a939b' : '#739ca4';
        const mud = noise(px, py, 10, 94) + (bayer(px, py) - 0.5) * 0.2;
        if (mud > 0.7) color = '#648a8c';
        if ((py + Math.floor(noise(px, py, 17, 92) * 5)) % 11 === 0 && noise(px * 0.4, py, 6, 93) > 0.72) color = '#a9c9cc';
        const lx = gx * ppu;
        const ly = (cell - gz) * ppu;
        const col = Math.floor(lx / spacing);
        const row = Math.floor(ly / spacing);
        const jitter = Math.round((hash(col, row, 95) - 0.5) * 3);
        const dx = Math.floor(lx) - Math.floor((col + 0.5) * spacing) - jitter;
        const dy = Math.floor(ly) - Math.floor((row + 0.5) * spacing);
        const leaf = clump[`${dx},${dy}`];
        if (leaf && edge > dike / 2 + 0.15) color = leaf;
      }
      // Brume au-delà de l'arène.
      const beyond = Math.max(Math.abs(x), Math.abs(zz)) - arenaHalf - 1;
      if (beyond > 0) color = toMist(color, px, py, Math.min(1, beyond / 6));
      c.set(px, py, color);
    }
  }
  return c;
}
