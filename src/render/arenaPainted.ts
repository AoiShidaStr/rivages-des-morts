import { Color3, type Scene } from '@babylonjs/core';
import type { Vec2 } from '../game/math';
import { DecorSprites, type DecorSpot } from './decorSprites';
import { fbm, noise, rng, smoothstep } from './noise';
import { Grid, PaintedGround, PaintedWater, loadImage, type GroundLayer, type GroundShadow } from './paintedGround';

/**
 * Arènes des donjons en carte peinte : le sol est assemblé à partir des textures de sols/textures
 * (paintedGround.ts), et entouré de décors peints posés par le code.
 * - Rizières noyées (la Jorōgumo) : rizières inondées coupées de diguettes, talus d'herbe sombre, arbres morts et
 *   toiles autour, qui se perdent dans la brume.
 * - Palais d'Izanami : dallage de pierre sombre bordé de roche, eau noire et violette tout autour.
 * - Yomi sans fond : une dalle de roche brûlée, fendue de braises, au-dessus du gouffre ; un champ de lys rouges, de
 *   stèles et d'ossements tout autour, puis le noir et sa brume rouge.
 * L'arène reste le carré de `arenaHalfSize` à y = 0. Sa limite se voit (voir `arenaEdge`) : une bordure de pierre claire
 * exactement là où le joueur s'arrête, et tout ce qui est au-delà assombri.
 */

export type ArenaKind = 'rizieres' | 'palais' | 'yomi';

const SPRITES = `${import.meta.env.BASE_URL}sprites/`;
const TEXTURES = `${SPRITES}sols/textures/`;
/** Le sol peint couvre ce demi-côté (comme l'ancien sol, GROUND_SIZE de renderer.ts). */
const HALF = 22;
/** Deux images de 1024 de côté sur toute la largeur. */
const PAINT_PPU = 2048 / (HALF * 2);
const GRID_PPU = 8;
/** Côté d'une rizière, comme l'ancien sol (renderer.ts, PADDY_SIZE). */
const PADDY = 3;

const HEIGHTS: Record<string, number> = {
  'arbre-mort': 3.2, 'arbre-mort-soie': 3.2, souche: 0.9, roseaux: 1.1, riz: 0.5, 'riz-couche': 0.45, 'toile-piquets': 1.8,
  cocon: 1.3, epouvantail: 1.9, piquets: 1.6, 'lanterne-eteinte': 1.2, 'rocher-vase': 0.7, ossements: 0.3,
  'nenuphars-fanes': 0.3, 'petit-jizo': 0.8, sandales: 0.25,
  higanbana: 0.7, offrandes: 0.7, 'arbre-mort-ile': 3.4,
  steles: 0.9, sotoba: 1.5, 'pierre-dressee': 1.9, 'rocher-pointu': 1.7, eboulis: 0.6, 'rocher-grand': 1.6, 'petite-lanterne': 1.3,
};
/** Petits décors au ras du sol, regroupés et dessinés avant les personnages (decorSprites.ts). */
export const ARENA_LOW_DECOR = new Set(['riz', 'riz-couche', 'ossements', 'sandales', 'nenuphars-fanes', 'eboulis']);

/** Distance « carrée » au centre, arrondie aux coins. */
function squareDistance(x: number, z: number, edge: number): number {
  const ax = Math.abs(x);
  const az = Math.abs(z);
  return Math.max(ax, az) + 0.15 * Math.min(ax, az) * smoothstep(edge - 3, edge + 3, Math.max(ax, az));
}

export class ArenaPainted {
  private constructor(
    private readonly ground: PaintedGround,
    private readonly water: PaintedWater,
    private readonly decor: DecorSprites,
  ) {}

  /** `props` : les décors de dungeons.json (torii, jizō…), sous lesquels le sol reste dégagé. */
  static async build(
    scene: Scene,
    kind: ArenaKind,
    arenaHalfSize: number,
    props: readonly { sprite: string; x: number; z: number }[],
    forward: Vec2,
  ): Promise<ArenaPainted> {
    const names = ['herbe', 'mousse', 'chemin', 'dalles', 'vase', 'roche'] as const;
    const images = await Promise.all(names.map((n) => loadImage(`${TEXTURES}${n}.jpg`)));
    const tex = Object.fromEntries(names.map((n, i) => [n, images[i]])) as Record<(typeof names)[number], HTMLImageElement>;
    const grid = new Grid(-HALF, HALF, -HALF, HALF, GRID_PPU);
    const paint = kind === 'palais' ? palais(grid, arenaHalfSize, tex) : kind === 'yomi' ? yomi(grid, arenaHalfSize, tex) : rizieres(grid, arenaHalfSize, props, tex);
    const decor =
      kind === 'palais' ? palaisDecor(arenaHalfSize, props, forward) : kind === 'yomi' ? yomiDecor(arenaHalfSize, props, forward) : rizieresDecor(arenaHalfSize, props, forward);
    const shadows: GroundShadow[] = decor.map((d) => {
      const r = Math.min(1.3, Math.max(0.2, d.height * 0.3));
      return { x: d.x + 0.12 * r, z: d.z - 0.2 * r, rx: r, rz: r, alpha: kind === 'rizieres' ? 0.3 : 0.4 };
    });
    const ground = PaintedGround.build(scene, `arena-${kind}`, { grid, base: paint.base, layers: paint.layers, shadows, outside: paint.mist, ppu: PAINT_PPU });
    const water = new PaintedWater(scene, `arena-${kind}-water`, grid, paint.water, paint.glint, paint.shade);
    const sprites = await DecorSprites.build(scene, decor, forward, ARENA_LOW_DECOR);
    return new ArenaPainted(ground, water, sprites);
  }

  update(dt: number): void {
    this.water.update(dt);
  }

  dispose(): void {
    this.ground.dispose();
    this.water.dispose();
    this.decor.dispose();
  }
}

/** Largeur de la bordure de pierre, posée juste au-delà de la limite de l'arène. */
const CURB = 0.8;

/**
 * Bordure de l'arène, sur le carré exact où le combat est retenu (World.clampToArena) : ombre au pied côté intérieur,
 * bordure de pierre claire, puis le dehors assombri.
 */
function arenaEdge(grid: Grid, arena: number, tex: HTMLImageElement, stone: string, dim: string, dimAlpha: number): GroundLayer[] {
  const shadow = grid.layer();
  const curb = grid.layer();
  const outline = grid.layer();
  const outside = grid.layer();
  const band = (sq: number, from: number, to: number) => smoothstep(from - 0.03, from + 0.03, sq) * (1 - smoothstep(to - 0.03, to + 0.03, sq));
  for (let j = 0; j < grid.h; j++) {
    for (let i = 0; i < grid.w; i++) {
      const k = j * grid.w + i;
      const sq = Math.max(Math.abs(grid.x(i)), Math.abs(grid.z(j)));
      curb[k] = band(sq, arena, arena + CURB);
      // Liseré sombre des deux côtés de la bordure : elle se détache sur l'eau claire comme sur l'herbe.
      outline[k] = Math.max(band(sq, arena - 0.1, arena + 0.04), band(sq, arena + CURB - 0.04, arena + CURB + 0.1));
      shadow[k] = smoothstep(arena - 0.5, arena - 0.1, sq) * (sq < arena - 0.1 ? 1 : 0);
      outside[k] = smoothstep(arena + CURB, arena + CURB + 0.8, sq);
    }
  }
  return [
    { weight: outside, color: dim, alpha: dimAlpha },
    { weight: shadow, color: '#1c1a1f', alpha: 0.4 },
    { weight: curb, texture: tex, tile: 1.6, tint: stone },
    { weight: curb, color: stone, alpha: 0.45 },
    { weight: outline, color: '#211d1a', alpha: 0.85 },
  ];
}

/**
 * Bornes plantées juste derrière la bordure, sur les côtés du fond (vers le haut de l'écran) : elles ne cachent rien de
 * l'arène et rendent sa limite lisible de loin.
 */
function edgePosts(arena: number, forward: Vec2, file: (name: string) => string, names: readonly string[], heights: Record<string, number>): DecorSpot[] {
  const spots: DecorSpot[] = [];
  const at = arena + CURB + 0.35;
  let n = 0;
  for (let t = -at; t <= at + 0.01; t += 3) {
    for (const [x, z] of [[t, at], [t, -at], [at, t], [-at, t]] as const) {
      const name = names[n++ % names.length];
      if (hidesArena(x, z, heights[name], arena, forward)) continue;
      spots.push({ file: file(name), x, z, height: heights[name], flip: n % 2 === 0 });
    }
  }
  return spots;
}

interface ArenaPaint {
  base: Uint8ClampedArray;
  layers: GroundLayer[];
  water: Float32Array;
  mist: string;
  glint: Color3;
  shade: Color3;
}

function hexRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

/** Fond : une couleur près de l'arène, fondue dans la brume au loin. */
function baseColors(grid: Grid, near: string, mist: string, from: number, to: number, edge: number): Uint8ClampedArray {
  const a = hexRgb(near);
  const b = hexRgb(mist);
  const base = new Uint8ClampedArray(grid.w * grid.h * 3);
  for (let j = 0; j < grid.h; j++) {
    for (let i = 0; i < grid.w; i++) {
      const t = smoothstep(from, to, squareDistance(grid.x(i), grid.z(j), edge));
      for (let c = 0; c < 3; c++) base[(j * grid.w + i) * 3 + c] = a[c] + (b[c] - a[c]) * t;
    }
  }
  return base;
}

function rizieres(
  grid: Grid,
  arena: number,
  props: readonly { sprite: string; x: number; z: number }[],
  tex: Record<'herbe' | 'mousse' | 'chemin' | 'dalles' | 'vase' | 'roche', HTMLImageElement>,
): ArenaPaint {
  const paddies = arena + 2.5;
  const mist = '#c3cbcf';
  const w = {
    mud: grid.layer(),
    paddyWater: grid.layer(),
    sprouts: grid.layer(),
    dike: grid.layer(),
    bank: grid.layer(),
    bankVar: grid.layer(),
    rock: grid.layer(),
    path: grid.layer(),
    fog: grid.layer(),
    water: grid.layer(),
  };
  const jizos = props.filter((p) => p.sprite === 'jizo');
  const torii = props.find((p) => p.sprite === 'torii');
  for (let j = 0; j < grid.h; j++) {
    for (let i = 0; i < grid.w; i++) {
      const k = j * grid.w + i;
      const x = grid.x(i);
      const z = grid.z(j);
      const sq = squareDistance(x, z, paddies);
      const ragged = noise(x * 1.1, z * 1.1) - 0.5;
      const mud = 1 - smoothstep(paddies - 0.3, paddies + 0.3, sq + ragged * 0.8);
      const gx = Math.abs((((x + PADDY / 2) % PADDY) + PADDY) % PADDY - PADDY / 2);
      const gz = Math.abs((((z + PADDY / 2) % PADDY) + PADDY) % PADDY - PADDY / 2);
      // Diguette : le bord de chaque casier (distance au plus proche bord de case).
      const dike = mud * smoothstep(PADDY / 2 - 0.2, PADDY / 2 - 0.1, Math.max(gx, gz));
      w.mud[k] = mud;
      w.dike[k] = dike;
      w.paddyWater[k] = mud * (1 - dike);
      // Chaque casier a sa teinte : certains encore verts de jeunes pousses, d'autres d'eau grise.
      const cell = noise(Math.floor((x + PADDY / 2) / PADDY) * 3.7 + 0.5, Math.floor((z + PADDY / 2) / PADDY) * 5.3 + 0.5);
      w.sprouts[k] = mud * (1 - dike) * smoothstep(0.35, 0.75, cell) * (0.6 + 0.4 * fbm(x * 0.9, z * 0.9));
      const bank = 1 - mud;
      w.bank[k] = bank;
      w.bankVar[k] = bank * smoothstep(0.45, 0.7, fbm(x * 0.2 + 3, z * 0.2 + 9)) * 0.6;
      w.rock[k] = bank * smoothstep(0.62, 0.75, fbm(x * 0.15 + 30, z * 0.15 + 2)) * smoothstep(paddies + 1, paddies + 3, sq);
      let path = 0;
      if (jizos.length) {
        const xs = jizos.map((p) => p.x);
        const zRow = jizos[0].z;
        const along = Math.max(Math.min(...xs) - 1.2 - x, x - Math.max(...xs) - 1.2, 0);
        path = 1 - smoothstep(0.55, 0.85, Math.hypot(along, z - zRow) + ragged * 0.3);
      }
      if (torii) path = Math.max(path, 1 - smoothstep(2, 2.6, Math.hypot(x - torii.x, z - torii.z) + ragged * 0.5));
      w.path[k] = path;
      w.fog[k] = smoothstep(15, 21, sq);
      w.water[k] = w.paddyWater[k] * 0.75 * (1 - path);
    }
  }
  return {
    base: baseColors(grid, '#5d6a5f', mist, 15, 21, paddies),
    layers: [
      { weight: w.mud, texture: tex.vase, tile: 3 },
      { weight: w.paddyWater, color: '#a9c1b8', alpha: 0.55 },
      { weight: w.sprouts, texture: tex.herbe, tile: 2.5, tint: '#c8d6b4', alpha: 0.45 },
      { weight: w.dike, texture: tex.herbe, tile: 2.5, tint: '#c9ceb0' },
      { weight: w.bank, texture: tex.herbe, tile: 5, tint: '#b9c1a8' },
      { weight: w.bankVar, texture: tex.mousse, tile: 4, tint: '#c6ccbd', alpha: 0.7 },
      { weight: w.rock, texture: tex.roche, tile: 4 },
      { weight: w.path, texture: tex.chemin, tile: 3.5 },
      ...arenaEdge(grid, arena, tex.dalles, '#f1e7cc', '#1f2822', 0.5),
      { weight: w.fog, color: mist },
    ],
    water: w.water,
    mist,
    glint: new Color3(0.92, 0.96, 1),
    shade: new Color3(0.2, 0.25, 0.24),
  };
}

function palais(grid: Grid, arena: number, tex: Record<'herbe' | 'mousse' | 'chemin' | 'dalles' | 'vase' | 'roche', HTMLImageElement>): ArenaPaint {
  const floor = arena + 1.6;
  const mist = '#2e2733';
  const w = { floor: grid.layer(), rim: grid.layer(), fog: grid.layer(), water: grid.layer() };
  for (let j = 0; j < grid.h; j++) {
    for (let i = 0; i < grid.w; i++) {
      const k = j * grid.w + i;
      const x = grid.x(i);
      const z = grid.z(j);
      const sq = squareDistance(x, z, floor);
      const ragged = noise(x * 0.9, z * 0.9) - 0.5;
      w.floor[k] = 1 - smoothstep(floor - 0.15, floor + 0.15, sq);
      w.rim[k] = 1 - smoothstep(floor + 1.2, floor + 2, sq + ragged * 1.4);
      w.fog[k] = smoothstep(15, 21, sq);
      w.water[k] = smoothstep(floor + 1.4, floor + 2.2, sq + ragged * 1.4) * (1 - w.fog[k]);
    }
  }
  return {
    base: baseColors(grid, '#3a3046', mist, 15, 21, floor),
    layers: [
      { weight: w.rim, texture: tex.roche, tile: 4, tint: '#6f6579' },
      { weight: w.floor, texture: tex.dalles, tile: 5.5, tint: '#8e8499' },
      ...arenaEdge(grid, arena, tex.dalles, '#e6dcf2', '#0d0912', 0.6),
      { weight: w.fog, color: mist },
    ],
    water: w.water,
    mist,
    glint: new Color3(0.82, 0.72, 1),
    shade: new Color3(0.08, 0.05, 0.12),
  };
}

/**
 * Le Yomi sans fond : une dalle de roche brûlée, fendue de veines de braise, posée au-dessus du gouffre ; autour, une
 * lande de cendre où poussent les lys rouges des morts, puis le noir, où luisent des reflets rouges.
 */
function yomi(grid: Grid, arena: number, tex: Record<'herbe' | 'mousse' | 'chemin' | 'dalles' | 'vase' | 'roche', HTMLImageElement>): ArenaPaint {
  const floor = arena + 1.6;
  const ash = floor + 4.5;
  const mist = '#160b0e';
  const w = { floor: grid.layer(), cracks: grid.layer(), embers: grid.layer(), ash: grid.layer(), lilies: grid.layer(), rim: grid.layer(), fog: grid.layer(), water: grid.layer() };
  for (let j = 0; j < grid.h; j++) {
    for (let i = 0; i < grid.w; i++) {
      const k = j * grid.w + i;
      const x = grid.x(i);
      const z = grid.z(j);
      const sq = squareDistance(x, z, floor);
      const ragged = noise(x * 0.8, z * 0.8) - 0.5;
      const slab = 1 - smoothstep(floor - 0.15, floor + 0.15, sq);
      w.floor[k] = slab;
      // Veines : là où le bruit passe par sa valeur moyenne, un trait fin ; la braise autour, plus large et plus pâle.
      const vein = Math.abs(fbm(x * 0.22 + 7, z * 0.22 + 3) - 0.5);
      w.cracks[k] = slab * (1 - smoothstep(0.005, 0.012, vein));
      w.embers[k] = slab * (1 - smoothstep(0.012, 0.045, vein)) * 0.6;
      const land = 1 - smoothstep(ash - 0.6, ash + 0.6, sq + ragged * 2.2);
      w.ash[k] = land * (1 - slab);
      w.lilies[k] = w.ash[k] * smoothstep(0.55, 0.72, fbm(x * 0.45 + 11, z * 0.45 + 5));
      w.rim[k] = w.ash[k] * smoothstep(floor + 0.2, floor + 1.2, sq) * (1 - smoothstep(floor + 1.2, floor + 2.4, sq)) * 0.7;
      w.fog[k] = smoothstep(15, 21, sq);
      w.water[k] = (1 - land) * (1 - w.fog[k]) * 0.8;
    }
  }
  return {
    base: baseColors(grid, '#24151a', mist, 15, 21, floor),
    layers: [
      { weight: w.ash, texture: tex.vase, tile: 4, tint: '#7a6466' },
      { weight: w.rim, texture: tex.roche, tile: 3, tint: '#6e5a58' },
      { weight: w.lilies, color: '#9e1f1c', alpha: 0.55 },
      { weight: w.floor, texture: tex.roche, tile: 5, tint: '#8a7470' },
      { weight: w.embers, color: '#a3321c', alpha: 0.4 },
      { weight: w.cracks, color: '#ff8a3c', alpha: 0.85 },
      ...arenaEdge(grid, arena, tex.dalles, '#e2d2c8', '#0b0507', 0.55),
      { weight: w.fog, color: mist },
    ],
    water: w.water,
    mist,
    glint: new Color3(1, 0.45, 0.3),
    shade: new Color3(0.06, 0.02, 0.03),
  };
}

function yomiDecor(arena: number, props: readonly { sprite: string; x: number; z: number }[], forward: Vec2): DecorSpot[] {
  const random = rng(53);
  const floor = arena + 1.6;
  const ash = floor + 4.5;
  const spots: DecorSpot[] = [];
  const folder: Record<string, string> = { ossements: 'rizieres', 'petit-jizo': 'rizieres', 'lanterne-eteinte': 'rizieres', 'arbre-mort-soie': 'rizieres' };
  const add = (name: string, x: number, z: number) => {
    const file = name === 'arbre-mort-ile' ? 'decor/ile/arbre-mort.webp' : `decor/${folder[name] ?? 'ile'}/${name}.webp`;
    spots.push({ file, x, z, height: HEIGHTS[name] * (0.85 + random() * 0.3), flip: random() < 0.5 });
  };
  const clear = (x: number, z: number, room: number) =>
    props.every((p) => Math.hypot(p.x - x, p.z - z) > 2) && spots.every((s) => Math.hypot(s.x - x, s.z - z) > room);
  spots.push(...edgePosts(arena, forward, (n) => `decor/rizieres/${n}.webp`, ['lanterne-eteinte'], HEIGHTS));
  // Le champ des morts : stèles, sotoba, jizō et offrandes, quelques arbres morts au loin.
  for (let tries = 0; tries < 900 && spots.length < 60; tries++) {
    const x = (random() * 2 - 1) * ash;
    const z = (random() * 2 - 1) * ash;
    const sq = squareDistance(x, z, floor);
    if (sq < floor + 0.7 || sq > ash - 0.4) continue;
    const tree = sq > floor + 2.5 && random() < 0.25;
    const name = tree
      ? random() < 0.5
        ? 'arbre-mort-ile'
        : 'arbre-mort-soie'
      : ['steles', 'sotoba', 'petit-jizo', 'offrandes', 'ossements', 'rocher-pointu', 'pierre-dressee', 'eboulis'][Math.floor(random() * 8)];
    if (!clear(x, z, tree ? 2.2 : 1.1) || hidesArena(x, z, HEIGHTS[name], arena, forward)) continue;
    add(name, x, z);
  }
  // Les lys rouges, en touffes serrées.
  for (let tries = 0; tries < 1400; tries++) {
    const x = (random() * 2 - 1) * ash;
    const z = (random() * 2 - 1) * ash;
    const sq = squareDistance(x, z, floor);
    if (sq < floor + 0.5 || sq > ash || fbm(x * 0.45 + 11, z * 0.45 + 5) < 0.55 || !clear(x, z, 0.45)) continue;
    add('higanbana', x, z);
  }
  return spots;
}

/** Un décor haut cache ce qui est derrière lui à l'écran : pas devant l'arène. */
function hidesArena(x: number, z: number, height: number, arena: number, forward: Vec2): boolean {
  for (let k = 0.4; k <= height * 1.15; k += 0.4) {
    if (squareDistance(x + forward.x * k, z + forward.z * k, arena) < arena + 0.6) return true;
  }
  return false;
}

function rizieresDecor(arena: number, props: readonly { sprite: string; x: number; z: number }[], forward: Vec2): DecorSpot[] {
  const random = rng(29);
  const paddies = arena + 2.5;
  const spots: DecorSpot[] = [];
  const clear = (x: number, z: number) =>
    props.every((p) => Math.hypot(p.x - x, p.z - z) > (p.sprite === 'torii' ? 2.8 : 1.2)) && spots.every((s) => Math.hypot(s.x - x, s.z - z) > 0.8);
  const add = (name: string, x: number, z: number) =>
    spots.push({ file: `decor/rizieres/${name}.webp`, x, z, height: HEIGHTS[name] * (0.85 + random() * 0.3), flip: random() < 0.5 });
  const pick = (list: readonly string[]) => list[Math.floor(random() * list.length)];

  // Talus autour des rizières : arbres morts derrière, petits décors ailleurs.
  for (let x = -HALF + 1; x < HALF - 1; x += 1.3) {
    for (let z = -HALF + 1; z < HALF - 1; z += 1.3) {
      const px = x + (random() - 0.5);
      const pz = z + (random() - 0.5);
      const sq = squareDistance(px, pz, paddies);
      if (sq < paddies + 0.8 || sq > 18.5 || !clear(px, pz)) continue;
      const r = random();
      if (r < 0.2 * (0.5 + fbm(px * 0.2, pz * 0.2))) {
        const tree = random() < 0.4 ? 'arbre-mort-soie' : 'arbre-mort';
        if (!hidesArena(px, pz, HEIGHTS[tree], arena, forward)) add(tree, px, pz);
      } else if (r < 0.42) {
        const name = pick(['roseaux', 'roseaux', 'souche', 'rocher-vase', 'piquets', 'toile-piquets', 'lanterne-eteinte', 'epouvantail', 'cocon', 'petit-jizo', 'ossements', 'sandales']);
        if (!hidesArena(px, pz, HEIGHTS[name], arena, forward)) add(name, px, pz);
      }
    }
  }
  spots.push(...edgePosts(arena, forward, (n) => `decor/rizieres/${n}.webp`, ['piquets', 'lanterne-eteinte'], HEIGHTS));
  // Riz encore debout au bord des rizières, hors de l'arène de combat.
  for (let x = -paddies; x <= paddies; x += 0.75) {
    for (let z = -paddies; z <= paddies; z += 0.75) {
      const px = x + (random() - 0.5) * 0.4;
      const pz = z + (random() - 0.5) * 0.4;
      const sq = squareDistance(px, pz, paddies);
      const inArena = sq < arena + 0.7;
      if (sq > paddies - 0.4 || random() < (inArena ? 0.8 : 0.35) || !clear(px, pz)) continue;
      const gx = Math.abs((((px + PADDY / 2) % PADDY) + PADDY) % PADDY - PADDY / 2);
      const gz = Math.abs((((pz + PADDY / 2) % PADDY) + PADDY) % PADDY - PADDY / 2);
      if (Math.max(gx, gz) > PADDY / 2 - 0.35) continue;
      // Rien sur la bordure de l'arène : elle doit rester nette.
      const exact = Math.max(Math.abs(px), Math.abs(pz));
      if (exact > arena - 0.3 && exact < arena + CURB + 0.3) continue;
      add(inArena || random() < 0.75 ? 'riz' : random() < 0.5 ? 'riz-couche' : 'nenuphars-fanes', px, pz);
    }
  }
  return spots;
}

function palaisDecor(arena: number, props: readonly { sprite: string; x: number; z: number }[], forward: Vec2): DecorSpot[] {
  const random = rng(41);
  const floor = arena + 1.6;
  const spots: DecorSpot[] = [];
  const clear = (x: number, z: number) =>
    props.every((p) => Math.hypot(p.x - x, p.z - z) > 2) && spots.every((s) => Math.hypot(s.x - x, s.z - z) > 1);
  spots.push(...edgePosts(arena, forward, (n) => `decor/ile/${n}.webp`, ['petite-lanterne'], HEIGHTS));
  // Sur la bordure de roche : stèles, pierres dressées et lanternes éteintes.
  for (let tries = 0; tries < 400 && spots.length < 26; tries++) {
    const x = (random() * 2 - 1) * (floor + 2);
    const z = (random() * 2 - 1) * (floor + 2);
    const sq = squareDistance(x, z, floor);
    if (sq < floor + 0.7 || sq > floor + 1.8 || !clear(x, z)) continue;
    const name = ['steles', 'sotoba', 'pierre-dressee', 'rocher-pointu', 'eboulis', 'rocher-grand', 'petite-lanterne'][Math.floor(random() * 7)];
    if (hidesArena(x, z, HEIGHTS[name], arena, forward)) continue;
    spots.push({ file: `decor/ile/${name}.webp`, x, z, height: HEIGHTS[name] * (0.85 + random() * 0.3), flip: random() < 0.5 });
  }
  return spots;
}
