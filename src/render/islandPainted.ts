import type { Scene } from '@babylonjs/core';
import { toScreen, toWorld, type Circle, type IslandData, type ScreenPoint } from '../game/island';
import { distToPolyline, fbm, noise, rng, smoothstep } from './noise';
import type { DecorSpot } from './decorSprites';
import { Grid, PaintedGround, PaintedWater, loadImage, type GroundLayer, type GroundShadow } from './paintedGround';

/**
 * L'île en carte peinte : le sol est assemblé à partir des textures de sols/textures (planche « decors_textures »,
 * npm run decors) en suivant island.json, et couvert de décors peints (planches de décors) posés par le code.
 *
 * Les terres peintes dépassent les zones où l'on marche d'une bande de sous-bois (mousse, arbres, buissons) avant
 * la plage ou les rochers du rivage : c'est elle qui donne à l'île son épaisseur. Les grands décors ne se posent
 * que là où ils ne cachent aucune zone praticable (derrière elles, vu de la caméra).
 */

const SPRITES = `${import.meta.env.BASE_URL}sprites/`;
const TEXTURES = `${SPRITES}sols/textures/`;
/** Pixels des images peintes par unité du monde. */
const PAINT_PPU = 48;
/** Cases de calcul des masques par unité du monde. */
const GRID_PPU = 8;
/** Mer peinte au-delà des terres : assez pour qu'elle se fonde dans la brume avant le bord des images. */
const SEA_MARGIN = 9;
/** Côté d'une rizière (les diguettes). */
const PADDY_CELL = 1.6;

const COLORS = {
  sand: [201, 182, 143],
  shallow: [111, 156, 154],
  deep: [47, 76, 87],
  mist: [195, 203, 207],
};

/** Hauteur dans le monde de chaque décor de la planche (le héros mesure 1,75). */
const HEIGHTS: Record<string, number> = {
  'pin-tordu': 3.4, 'erable-rouge': 3.6, saule: 3.8, 'cerisier-pale': 3.8, 'bambous-hauts': 4.2, cedre: 4.8, ginkgo: 3.8,
  'arbre-mort': 3.4, 'pin-sur-rocher': 2.6,
  'buisson-rond': 1, 'buisson-bas': 0.7, 'herbe-haute': 0.9, 'herbe-courte': 0.35, fougere: 0.8, roseaux: 1.3, bambous: 1.6,
  higanbana: 0.7, hortensias: 0.8, 'jeune-erable': 1.4, 'petit-pin': 1.2, azalee: 0.8, 'souche-moussue': 0.8,
  'tronc-couche': 0.6, nenuphars: 0.35, 'herbes-de-rive': 1.1,
  'rocher-grand': 1.6, 'rocher-moyen': 1, 'rocher-petit': 0.35, galets: 0.4, 'rocher-moussu': 1, 'rocher-plat': 0.45,
  'rocher-pointu': 1.6, cairn: 0.8, 'rochers-de-rive': 0.9, 'pierre-dressee': 1.8, 'rocher-fendu': 1, eboulis: 0.6,
  'rocher-algues': 1.1, 'pas-japonais': 0.4, 'bloc-de-falaise': 2.4, 'pierre-du-jardin': 1.5,
  'petite-lanterne': 1.3, 'cloture-bambou': 1.1, shimenawa: 1.3, panneau: 1.5, 'sacs-de-riz': 0.9, 'tas-de-bois': 0.8,
  jarres: 0.9, kitsune: 1, steles: 0.8, sotoba: 1.4, 'lanterne-papier': 1.8, banc: 0.6, offrandes: 0.8, puits: 1.8,
  etendoir: 1.7, 'barque-echouee': 0.8,
};

/** Les arbres peints de island.json, chacun d'une essence, à la même place (leur collision ne change pas). */
const PROP_TREES = ['pin-tordu', 'erable-rouge', 'ginkgo', 'cedre', 'saule', 'pin-tordu', 'cerisier-pale', 'erable-rouge', 'bambous-hauts', 'ginkgo'];
const FOREST_TREES = ['pin-tordu', 'pin-tordu', 'erable-rouge', 'cedre', 'cedre', 'ginkgo', 'saule', 'bambous-hauts', 'pin-sur-rocher'];
const UNDERGROWTH = [
  'buisson-rond', 'buisson-rond', 'buisson-bas', 'fougere', 'fougere', 'herbe-haute', 'herbe-haute', 'hortensias', 'azalee',
  'bambous', 'petit-pin', 'jeune-erable', 'souche-moussue', 'tronc-couche', 'rocher-moussu', 'rocher-moyen', 'rocher-fendu',
];
const CURSED_GROWTH = ['arbre-mort', 'higanbana', 'higanbana', 'herbe-haute', 'sotoba', 'souche-moussue'];
const SHORE = ['rochers-de-rive', 'rochers-de-rive', 'rocher-algues', 'galets', 'herbes-de-rive', 'rocher-plat', 'rocher-grand', 'eboulis'];
const BANKS = ['roseaux', 'roseaux', 'herbes-de-rive', 'fougere', 'galets', 'rocher-petit'];
const SPRINKLES = ['herbe-courte', 'herbe-courte', 'herbe-courte', 'galets', 'rocher-petit', 'higanbana'];

/** Petits décors au ras du sol : regroupés en un seul maillage par image, dessinés avant les personnages. */
export const LOW_DECOR = new Set(['riz', 'galets', 'eboulis', 'rocher-plat', 'rocher-petit', 'herbe-courte', 'nenuphars', 'pas-japonais']);

/** Tracé de l'île en coordonnées d'écran (u, v), comme island.json. */
class Layout {
  private readonly land: Circle[];
  private readonly pier: [number, number][];

  constructor(readonly data: IslandData) {
    const [a, b] = data.zones.pier;
    // Le ponton part un peu dans les terres, pour que ses planches rejoignent le rivage.
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    this.pier = [[a[0] - ((b[0] - a[0]) / len) * 1.4, a[1] - ((b[1] - a[1]) / len) * 1.4], b];
    // Les deux cercles du ponton avancent sur la mer : ce ne sont pas des terres.
    this.land = data.walkable.filter((c) => distToPolyline(c.u, c.v, data.zones.pier) > 0.6);
  }

  /** Distance signée au bord des terres praticables, positive dedans. */
  walk(s: ScreenPoint): number {
    let best = -Infinity;
    for (const c of this.land) best = Math.max(best, c.r - Math.hypot(s.u - c.u, s.v - c.v));
    return best;
  }

  /** Comme `walk`, ponton compris : là où le héros peut aller. */
  reachable(s: ScreenPoint): number {
    let best = -Infinity;
    for (const c of this.data.walkable) best = Math.max(best, c.r - Math.hypot(s.u - c.u, s.v - c.v));
    return best;
  }

  nearPier(s: ScreenPoint): number {
    const [pu, pv] = this.data.zones.pier[0];
    return Math.exp(-((s.u - pu) ** 2 + (s.v - pv) ** 2) / 22);
  }

  /** Largeur de la bande de sous-bois au-delà des zones praticables : presque nulle à la plage du ponton. */
  band(s: ScreenPoint): number {
    return (1.6 + 2.4 * fbm(s.u * 0.17 + 3, s.v * 0.17 + 8)) * (1 - 0.88 * this.nearPier(s));
  }

  /** Distance signée au rivage, positive sur les terres peintes. */
  edge(s: ScreenPoint): number {
    return this.walk(s) + this.band(s);
  }

  pierDist(s: ScreenPoint): number {
    return distToPolyline(s.u, s.v, this.pier);
  }

  pathDist(s: ScreenPoint): number {
    let best = Infinity;
    for (const path of this.data.paths) best = Math.min(best, distToPolyline(s.u, s.v, path));
    return best;
  }

  streamDist(s: ScreenPoint): number {
    return distToPolyline(s.u, s.v, this.data.zones.stream);
  }

  /** Distance signée au bord d'un cercle, négative dedans. */
  static circle(s: ScreenPoint, c: Circle): number {
    return Math.hypot(s.u - c.u, s.v - c.v) - c.r;
  }

  paddyDist(s: ScreenPoint): number {
    return Math.min(...this.data.zones.paddies.map((c) => Layout.circle(s, c)));
  }
}

export class IslandPainted {
  /** Décors peints de island.json que la carte remplace par les siens. */
  static readonly replaces = new Set(['arbre']);

  private constructor(
    private readonly ground: PaintedGround,
    private readonly water: PaintedWater,
    readonly decor: DecorSpot[],
  ) {}

  static async build(scene: Scene, data: IslandData): Promise<IslandPainted> {
    const layout = new Layout(data);
    const names = ['herbe', 'mousse', 'chemin', 'sable', 'gravier', 'dalles', 'terre-maudite', 'vase', 'roche'] as const;
    const images = await Promise.all(names.map((n) => loadImage(`${TEXTURES}${n}.jpg`)));
    const tex = Object.fromEntries(names.map((n, i) => [n, images[i]])) as Record<(typeof names)[number], HTMLImageElement>;

    // Étendue : les terres et assez de mer autour pour qu'elle se fonde dans la brume.
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const c of data.walkable) {
      const w = toWorld(c);
      minX = Math.min(minX, w.x - c.r);
      maxX = Math.max(maxX, w.x + c.r);
      minZ = Math.min(minZ, w.z - c.r);
      maxZ = Math.max(maxZ, w.z + c.r);
    }
    const grid = new Grid(Math.floor(minX - SEA_MARGIN), Math.ceil(maxX + SEA_MARGIN), Math.floor(minZ - SEA_MARGIN), Math.ceil(maxZ + SEA_MARGIN), GRID_PPU);

    const decor = placeDecor(layout, data);
    const shadows: GroundShadow[] = decor.map((d) => {
      const r = Math.min(1.5, Math.max(0.25, d.height * 0.32));
      // Lumière en haut à gauche de l'écran : l'ombre glisse vers le bas à droite.
      return { x: d.x + 0.12 * r, z: d.z - 0.2 * r, rx: r, rz: r, alpha: 0.3 };
    });

    const n = grid.w * grid.h;
    const base = new Uint8ClampedArray(n * 3);
    const w = {
      sand: grid.layer(),
      rock: grid.layer(),
      moss: grid.layer(),
      grass: grid.layer(),
      grassVar: grid.layer(),
      path: grid.layer(),
      plaza: grid.layer(),
      gravel: grid.layer(),
      cursed: grid.layer(),
      mud: grid.layer(),
      paddyWater: grid.layer(),
      dike: grid.layer(),
      bank: grid.layer(),
      stream: grid.layer(),
      planks: grid.layer(),
      pier: grid.layer(),
      foam: grid.layer(),
      water: grid.layer(),
    };
    const zones = data.zones;
    for (let j = 0; j < grid.h; j++) {
      for (let i = 0; i < grid.w; i++) {
        const k = j * grid.w + i;
        const x = grid.x(i);
        const z = grid.z(j);
        const s = toScreen({ x, z });
        const ragged = noise(x * 1.3, z * 1.3) - 0.5;
        const walk = layout.walk(s);
        const edge = layout.edge(s);
        const pierD = layout.pierDist(s);

        // Mer : claire au rivage, sombre au large, puis fondue dans la brume.
        const deep = smoothstep(0, 3.5, -edge);
        const mist = smoothstep(3, 8.5, -edge);
        for (let c = 0; c < 3; c++) {
          const sea = COLORS.shallow[c] + (COLORS.deep[c] - COLORS.shallow[c]) * deep;
          base[k * 3 + c] = edge > 0 ? COLORS.sand[c] : sea + (COLORS.mist[c] - sea) * mist;
        }
        const landW = smoothstep(-0.45, 0, edge + ragged * 0.3);
        w.sand[k] = landW;
        const rocky = smoothstep(0.5, 0.66, fbm(s.u * 0.12 + 20, s.v * 0.12 + 4)) * (1 - layout.nearPier(s));
        w.rock[k] = rocky * smoothstep(-0.25, 0.15, edge) * (1 - smoothstep(0.9, 1.6, edge));
        w.moss[k] = smoothstep(0.45, 1.1, edge + ragged * 0.5) * (1 - smoothstep(-0.7, 0, walk));
        const grass = smoothstep(-0.55, -0.05, walk + ragged * 0.5);
        w.grass[k] = grass;
        w.grassVar[k] = grass * smoothstep(0.5, 0.72, fbm(x * 0.18 + 40, z * 0.18)) * 0.45;
        w.path[k] = (1 - smoothstep(0.5, 0.85, layout.pathDist(s) + ragged * 0.35)) * landW;
        w.plaza[k] = 1 - smoothstep(-0.2, 0.2, Layout.circle(s, zones.plaza) + ragged * 0.4);
        w.gravel[k] = 1 - smoothstep(-0.12, 0.12, Layout.circle(s, zones.gravel));
        w.cursed[k] = (1 - smoothstep(-0.4, 0.3, Layout.circle(s, zones.cursed) + (fbm(x * 0.6, z * 0.6) - 0.5) * 1.6)) * landW;
        const paddy = 1 - smoothstep(-0.15, 0.15, layout.paddyDist(s));
        w.mud[k] = paddy;
        const gx = Math.abs((((x % PADDY_CELL) + PADDY_CELL) % PADDY_CELL) - PADDY_CELL / 2);
        const gz = Math.abs((((z % PADDY_CELL) + PADDY_CELL) % PADDY_CELL) - PADDY_CELL / 2);
        const dike = paddy * smoothstep(PADDY_CELL / 2 - 0.2, PADDY_CELL / 2 - 0.1, Math.max(gx, gz));
        w.dike[k] = dike;
        w.paddyWater[k] = paddy * (1 - dike);
        const streamD = layout.streamDist(s);
        const poolD = Layout.circle(s, zones.pool);
        w.bank[k] = Math.max(1 - smoothstep(0.7, 1.0, streamD + ragged * 0.2), 1 - smoothstep(0.15, 0.45, poolD + ragged * 0.2)) * landW;
        const stream = Math.max(1 - smoothstep(0.42, 0.58, streamD), 1 - smoothstep(-0.15, 0.08, poolD));
        w.stream[k] = stream;
        w.planks[k] = (1 - smoothstep(0.55, 0.68, layout.pathDist(s))) * (1 - smoothstep(0.62, 0.8, streamD));
        w.pier[k] = 1 - smoothstep(0.62, 0.72, pierD);
        w.foam[k] = (1 - smoothstep(0, 0.2, Math.abs(edge + 0.1))) * (0.5 + 0.5 * noise(x * 2.2, z * 2.2)) * (1 - w.pier[k]);
        w.water[k] = Math.max(smoothstep(0, 0.35, -edge) * (1 - mist), stream * (1 - w.planks[k]), w.paddyWater[k] * 0.6) * (1 - w.pier[k]);
      }
    }

    const layers: GroundLayer[] = [
      { weight: w.sand, texture: tex.sable, tile: 4 },
      { weight: w.rock, texture: tex.roche, tile: 4.5 },
      { weight: w.moss, texture: tex.mousse, tile: 3.5, tint: '#c8d0c4' },
      { weight: w.grass, texture: tex.herbe, tile: 5 },
      { weight: w.grassVar, texture: tex.mousse, tile: 4, alpha: 0.5 },
      { weight: w.path, texture: tex.chemin, tile: 3.5 },
      { weight: w.plaza, texture: tex.dalles, tile: 4.5, rotate: Math.PI / 4 },
      { weight: w.gravel, texture: tex.gravier, tile: 3, rotate: Math.PI / 4 },
      { weight: w.cursed, texture: tex['terre-maudite'], tile: 4 },
      { weight: w.mud, texture: tex.vase, tile: 3 },
      { weight: w.paddyWater, color: '#86a7a0', alpha: 0.5 },
      { weight: w.dike, texture: tex.mousse, tile: 2.5, tint: '#d8dcc0' },
      { weight: w.bank, texture: tex.roche, tile: 3 },
      { weight: w.stream, color: '#5a858b' },
      { weight: w.planks, texture: planks(), tile: 1.6, rotate: streamAngle(data) },
      { weight: w.pier, texture: planks(), tile: 1.6, rotate: pierAngle(data) },
      { weight: w.foam, color: '#eef3f2', alpha: 0.7 },
    ];
    const ground = PaintedGround.build(scene, 'islandPainted', { grid, base, layers, shadows, outside: '#c3cbcf', ppu: PAINT_PPU });
    const water = new PaintedWater(scene, 'islandWater', grid, w.water);
    return new IslandPainted(ground, water, decor);
  }

  update(dt: number): void {
    this.water.update(dt);
  }

  dispose(): void {
    this.ground.dispose();
    this.water.dispose();
  }
}

/** Planches de bois vues de dessus, qui se répètent : ponton et pont. */
function planks(): HTMLCanvasElement {
  const el = document.createElement('canvas');
  el.width = el.height = 128;
  const ctx = el.getContext('2d');
  if (!ctx) return el;
  const random = rng(5);
  for (let y = 0; y < 128; y += 32) {
    const shade = 110 + Math.round(random() * 22);
    ctx.fillStyle = `rgb(${shade + 12}, ${shade - 12}, ${shade - 38})`;
    ctx.fillRect(0, y, 128, 32);
    ctx.fillStyle = 'rgba(255, 235, 200, 0.12)';
    ctx.fillRect(0, y + 3, 128, 5);
    ctx.strokeStyle = 'rgba(60, 40, 25, 0.25)';
    for (let g = 0; g < 3; g++) {
      ctx.beginPath();
      ctx.moveTo(0, y + 10 + g * 7 + random() * 3);
      ctx.bezierCurveTo(40, y + 8 + g * 7, 90, y + 14 + g * 6, 128, y + 10 + g * 7 + random() * 3);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgb(58, 42, 30)';
    ctx.fillRect(0, y + 29, 128, 3);
  }
  return el;
}

/** Les planches traversent le ponton ; sur le pont, elles suivent le ruisseau. Angle dans l'image peinte. */
function canvasAngle(du: number, dv: number): number {
  const w = toWorld({ u: du, v: dv });
  // Dans l'image, x suit le monde et y descend quand z monte.
  return Math.atan2(-w.z, w.x);
}

function pierAngle(data: IslandData): number {
  const [a, b] = data.zones.pier;
  return canvasAngle(b[0] - a[0], b[1] - a[1]) + Math.PI / 2;
}

function streamAngle(data: IslandData): number {
  const { stream, bridge } = data.zones;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i + 1 < stream.length; i++) {
    const d = distToPolyline(bridge.u, bridge.v, [stream[i], stream[i + 1]]);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return canvasAngle(stream[best + 1][0] - stream[best][0], stream[best + 1][1] - stream[best][1]);
}

// --- Décors ---------------------------------------------------------------------

function placeDecor(layout: Layout, data: IslandData): DecorSpot[] {
  const random = rng(17);
  const spots: (DecorSpot & { s: ScreenPoint })[] = [];
  const zones = data.zones;
  // Ce qu'il ne faut pas couvrir : personnages, objets à fouiller, bâtiments, arrivées.
  const keepClear: { s: ScreenPoint; r: number }[] = [
    ...data.interactables.map((it) => ({ s: it as ScreenPoint, r: 1.3 })),
    ...data.props.filter((p) => !IslandPainted.replaces.has(p.sprite)).map((p) => ({ s: p as ScreenPoint, r: (p.solid ?? 0.5) + 1 })),
    { s: data.spawn, r: 1.8 },
    { s: data.dungeonExit, r: 1.8 },
  ];
  const clear = (s: ScreenPoint, r = 0) =>
    keepClear.every((c) => Math.hypot(c.s.u - s.u, c.s.v - s.v) > c.r + r) && spots.every((d) => Math.hypot(d.s.u - s.u, d.s.v - s.v) > 0.75);
  // Un décor haut cache ce qui est derrière lui à l'écran (vers +v) : pas devant une zone où l'on marche.
  const hides = (s: ScreenPoint, height: number) => {
    for (let k = 0.4; k <= height * 1.15; k += 0.4) if (layout.reachable({ u: s.u, v: s.v + k }) > -0.3) return true;
    return false;
  };
  const add = (name: string, s: ScreenPoint, height = HEIGHTS[name]) => {
    const w = toWorld(s);
    spots.push({ file: `decor/ile/${name}.webp`, x: w.x, z: w.z, height, flip: random() < 0.5, s });
  };
  const pick = (list: readonly string[]) => list[Math.floor(random() * list.length)];

  // Les arbres de island.json, chacun d'une essence.
  data.props
    .filter((p) => p.sprite === 'arbre')
    .forEach((p, i) => add(PROP_TREES[i % PROP_TREES.length], p, p.height ?? 3.6));

  // Accents : quelques objets choisis près d'un repère, à la première place libre autour.
  const near = (name: string, at: ScreenPoint, where: (s: ScreenPoint) => boolean, radius = 3) => {
    for (let ring = 0; ring <= radius; ring += 0.35) {
      for (let a = 0; a < 12; a++) {
        const angle = (a / 12) * Math.PI * 2 + ring;
        const s = { u: at.u + Math.cos(angle) * ring, v: at.v + Math.sin(angle) * ring };
        // Sur les zones praticables, le décor se trie avec les personnages : il peut cacher ce qui est derrière lui.
        if (where(s) && clear(s, 0.2) && (layout.reachable(s) > 0 || !hides(s, HEIGHTS[name] * 0.6))) {
          add(name, s);
          return;
        }
      }
    }
  };
  const inBand = (s: ScreenPoint) => layout.walk(s) < -0.35 && layout.edge(s) > 0.5 && layout.streamDist(s) > 1.1;
  const atEdge = (s: ScreenPoint) => layout.walk(s) > 0.15 && layout.walk(s) < 1.2 && layout.pathDist(s) > 1;
  const offPath = (s: ScreenPoint) => layout.reachable(s) > 0.2 && layout.pathDist(s) > 1 && Layout.circle(s, zones.plaza) > -0.2;
  const house = data.props.find((p) => p.sprite === 'maisonThe');
  const forge = data.props.find((p) => p.sprite === 'forge');
  const torii = data.props.find((p) => p.sprite === 'torii');
  const portail = data.props.find((p) => p.sprite === 'portail');
  const rocher = data.props.find((p) => p.sprite === 'rocher');
  if (house) {
    near('puits', { u: house.u - 1.5, v: house.v + 2.6 }, inBand);
    near('etendoir', { u: house.u + 1.8, v: house.v + 2.2 }, (s) => inBand(s) || atEdge(s));
    near('jarres', { u: house.u + 2.1, v: house.v - 1.2 }, atEdge);
    near('sacs-de-riz', { u: house.u - 2.2, v: house.v - 1 }, (s) => atEdge(s) || inBand(s));
    near('lanterne-papier', { u: house.u + 2.4, v: house.v - 2 }, offPath);
  }
  if (forge) {
    near('tas-de-bois', { u: forge.u + 2, v: forge.v + 0.2 }, offPath);
    near('banc', { u: forge.u - 2, v: forge.v - 1.2 }, offPath);
  }
  if (torii) {
    near('kitsune', { u: torii.u - 1.8, v: torii.v + 0.2 }, offPath, 2);
    near('kitsune', { u: torii.u + 1.8, v: torii.v - 0.2 }, offPath, 2);
  }
  if (portail) {
    near('steles', { u: portail.u - 2.2, v: portail.v + 1.2 }, (s) => inBand(s) || offPath(s));
    near('sotoba', { u: portail.u + 2.2, v: portail.v + 1.4 }, (s) => inBand(s) || offPath(s));
    near('arbre-mort', { u: portail.u - 3.4, v: portail.v + 2.6 }, inBand);
  }
  if (rocher) near('shimenawa', { u: rocher.u - 3, v: rocher.v + 1.2 }, (s) => inBand(s) || offPath(s));
  const jizos = data.interactables.filter((it) => it.sprite === 'jizo');
  if (jizos.length) {
    const first = jizos[0];
    const last = jizos[jizos.length - 1];
    near('offrandes', { u: first.u - 1, v: first.v - 0.4 }, offPath, 1.5);
    near('offrandes', { u: last.u + 1, v: last.v + 0.4 }, offPath, 1.5);
  }
  near('panneau', { u: data.paths[1][0][0] + 0.6, v: data.paths[1][0][1] - 1.6 }, offPath, 2);
  near('cairn', { u: zones.pool.u - 1.8, v: zones.pool.v + 1.4 }, (s) => inBand(s) || offPath(s));
  near('pin-sur-rocher', { u: zones.pool.u + 2.2, v: zones.pool.v + 3 }, inBand);
  near('bloc-de-falaise', { u: zones.pool.u + 3.4, v: zones.pool.v + 1.6 }, inBand);
  near('barque-echouee', { u: zones.pier[0][0] - 2.6, v: zones.pier[0][1] + 2.4 }, (s) => layout.edge(s) > 0 && layout.walk(s) < -0.2 && layout.pierDist(s) > 1.4);
  for (const [du, dv, name] of [[-1.8, -0.4, 'pierre-du-jardin'], [1.6, -1.4, 'rocher-moussu']] as const) {
    near(name, { u: zones.gravel.u + du, v: zones.gravel.v + dv }, (s) => Layout.circle(s, zones.gravel) < -0.6, 1.5);
  }
  // Clôture de bambou au bord des rizières, côté sous-bois.
  for (const c of zones.paddies) {
    for (const a of [0.6, 2.2]) near('cloture-bambou', { u: c.u + Math.cos(a) * (c.r + 0.7), v: c.v + Math.sin(a) * (c.r + 0.7) }, (s) => layout.pathDist(s) > 1 && layout.paddyDist(s) > 0.3, 1.5);
  }

  // Riz dans les rizières, au milieu des casiers.
  for (const c of zones.paddies) {
    const center = toWorld(c);
    for (let x = Math.floor((center.x - c.r) / PADDY_CELL) * PADDY_CELL + PADDY_CELL / 2; x < center.x + c.r; x += PADDY_CELL) {
      for (let z = Math.floor((center.z - c.r) / PADDY_CELL) * PADDY_CELL + PADDY_CELL / 2; z < center.z + c.r; z += PADDY_CELL) {
        const s = toScreen({ x, z });
        if (Layout.circle(s, c) > -0.5 || !keepClear.every((k) => Math.hypot(k.s.u - s.u, k.s.v - s.v) > 1)) continue;
        for (const [ox, oz] of [[-0.35, -0.3], [0.3, 0.25]]) spots.push({ file: 'decor/rizieres/riz.webp', x: x + ox, z: z + oz, height: 0.55, flip: random() < 0.5, s: toScreen({ x: x + ox, z: z + oz }) });
      }
    }
  }

  // Sous-bois : arbres derrière les zones praticables, buissons et rochers ailleurs.
  const [u0, u1, v0, v1] = bounds(data);
  for (let u = u0; u < u1; u += 1.15) {
    for (let v = v0; v < v1; v += 1.15) {
      const s = { u: u + (random() - 0.5) * 0.9, v: v + (random() - 0.5) * 0.9 };
      if (!inBand(s) || layout.pierDist(s) < 1.5 || Layout.circle(s, zones.pool) < 0.8) continue;
      const density = 0.35 + 0.65 * fbm(s.u * 0.2 + 7, s.v * 0.2 + 1);
      if (random() > density * 0.85 || !clear(s)) continue;
      const cursed = Layout.circle(s, zones.cursed) < 3;
      const tree = cursed ? 'arbre-mort' : pick(FOREST_TREES);
      if (layout.edge(s) > 1 && random() < 0.4 && !hides(s, HEIGHTS[tree])) {
        add(tree, s, HEIGHTS[tree] * (0.85 + random() * 0.3));
        continue;
      }
      const name = pick(cursed ? CURSED_GROWTH : UNDERGROWTH);
      if (!hides(s, HEIGHTS[name])) add(name, s, HEIGHTS[name] * (0.85 + random() * 0.3));
    }
  }

  // Rivage, berges du ruisseau, puis quelques touffes sur les zones praticables, loin des chemins.
  scatter(70, (s) => {
    const edge = layout.edge(s);
    return edge > -0.3 && edge < 0.35 && layout.pierDist(s) > 2 ? pick(SHORE) : null;
  });
  scatter(40, (s) => {
    const d = layout.streamDist(s);
    return d > 0.6 && d < 1.05 && layout.pathDist(s) > 1.1 ? pick(BANKS) : null;
  });
  for (let i = 0; i < 2; i++) near('nenuphars', { u: zones.pool.u + (i ? 0.5 : -0.4), v: zones.pool.v - 0.3 }, (s) => Layout.circle(s, zones.pool) < -0.6, 1);
  scatter(60, (s) => {
    if (layout.walk(s) < 0.4 || layout.pathDist(s) < 1.2 || layout.streamDist(s) < 1.1) return null;
    if (Layout.circle(s, zones.plaza) < 0.5 || Layout.circle(s, zones.gravel) < 0.4 || layout.paddyDist(s) < 0.4) return null;
    return Layout.circle(s, zones.cursed) < 0 ? 'higanbana' : pick(SPRINKLES);
  });

  function scatter(count: number, choose: (s: ScreenPoint) => string | null): void {
    let placed = 0;
    for (let tries = 0; tries < count * 40 && placed < count; tries++) {
      const s = { u: u0 + random() * (u1 - u0), v: v0 + random() * (v1 - v0) };
      const name = choose(s);
      if (!name || !clear(s, 0.3) || hides(s, HEIGHTS[name])) continue;
      add(name, s, HEIGHTS[name] * (0.85 + random() * 0.3));
      placed++;
    }
  }

  return spots.map(({ s: _s, ...spot }) => spot);
}

/** Étendue des terres, en coordonnées d'écran. */
function bounds(data: IslandData): [number, number, number, number] {
  let u0 = Infinity;
  let u1 = -Infinity;
  let v0 = Infinity;
  let v1 = -Infinity;
  for (const c of data.walkable) {
    u0 = Math.min(u0, c.u - c.r - 5);
    u1 = Math.max(u1, c.u + c.r + 5);
    v0 = Math.min(v0, c.v - c.r - 5);
    v1 = Math.max(v1, c.v + c.r + 5);
  }
  return [u0, u1, v0, v1];
}
