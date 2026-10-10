import { insidePolygon, onWalk, toWorld, type DecorItem, type IslandData, type Polygon, type ScreenPoint } from '../game/island';
import type { Vec2 } from '../game/math';
import { fbm, rng } from './noise';

/**
 * Les décors de l'île (carte peinte, voir islandMap.ts), sans rien du rendu : l'éditeur de carte (editeur.html) les
 * lit aussi. Ils sont posés à la main dans island.json (`decor`, avec l'éditeur) ou, à défaut, par le code selon ce
 * qui est peint (eau, herbe) et les zones de marche.
 */

/** Hauteur à l'écran d'une unité de sol en profondeur (sin 35,26°, l'inclinaison de la caméra). */
export const SIN = 1 / Math.sqrt(3);
/** Résolution de la copie de la carte lue par le code (eau, herbe). */
const SAMPLE = 512;

type Biome = 'ponton' | 'village' | 'rizieres' | 'cascade' | 'rocher' | 'donjon' | 'prairie';
interface Flora {
  /** Arbres : bosquets et lisières, derrière les zones de marche. */
  trees: string[];
  /** Sous-bois : buissons, herbes et pierres. */
  under: string[];
  shore: string[];
  /** Touffes sur les zones de marche, qui se traversent. */
  sprinkles: string[];
}

/**
 * Chaque coin de l'île a sa végétation, comme un vrai paysage : pins et rochers battus par la mer au ponton, jardin
 * soigné au village, saules et hautes herbes autour des rizières, sous-bois humide et moussu à la cascade, pins, ginkgo
 * et pierres autour du Grand Rocher, arbres morts et lys rouges au cratère, érables et fleurs dans la grande prairie.
 * Chaque coin est une zone (`areas`) de island.json. Les listes se lisent par massifs (voir `clustered`) : une même
 * plante sur des mètres plutôt qu'un mélange au hasard.
 */
const FLORA: Record<Biome, Flora> = {
  ponton: {
    trees: ['pin-tordu', 'pin-tordu', 'pin-sur-rocher'],
    under: ['herbes-de-rive', 'herbe-haute', 'buisson-bas', 'rocher-moyen', 'rochers-de-rive'],
    shore: ['rochers-de-rive', 'galets', 'herbes-de-rive', 'rocher-plat'],
    sprinkles: ['herbe-courte', 'galets'],
  },
  village: {
    trees: ['erable-rouge', 'pin-tordu', 'bambous-hauts'],
    under: ['hortensias', 'azalee', 'buisson-rond', 'jeune-erable', 'bambous', 'petit-pin'],
    shore: ['galets', 'herbes-de-rive', 'rocher-plat'],
    sprinkles: ['herbe-courte'],
  },
  rizieres: {
    trees: ['saule', 'saule', 'bambous-hauts'],
    under: ['herbe-haute', 'roseaux', 'buisson-bas', 'bambous'],
    shore: ['roseaux', 'herbes-de-rive', 'galets'],
    sprinkles: ['herbe-courte'],
  },
  cascade: {
    trees: ['cedre', 'cedre', 'erable-rouge'],
    under: ['fougere', 'rocher-moussu', 'souche-moussue', 'tronc-couche', 'hortensias'],
    shore: ['rocher-algues', 'rochers-de-rive', 'eboulis'],
    sprinkles: ['herbe-courte', 'rocher-petit'],
  },
  rocher: {
    trees: ['pin-tordu', 'pin-tordu', 'ginkgo'],
    under: ['petit-pin', 'buisson-rond', 'rocher-moussu', 'fougere'],
    shore: ['rochers-de-rive', 'rocher-grand', 'eboulis', 'rocher-algues'],
    sprinkles: ['herbe-courte'],
  },
  donjon: {
    trees: ['arbre-mort'],
    under: ['higanbana', 'herbe-haute', 'souche-moussue', 'sotoba', 'higanbana'],
    shore: ['eboulis', 'rochers-de-rive'],
    sprinkles: ['higanbana'],
  },
  prairie: {
    trees: ['erable-rouge', 'ginkgo', 'pin-tordu'],
    under: ['azalee', 'hortensias', 'jeune-erable', 'buisson-rond', 'higanbana'],
    shore: ['rochers-de-rive', 'rocher-algues', 'eboulis'],
    sprinkles: ['herbe-courte', 'higanbana', 'herbe-courte'],
  },
};

/** Hauteur dans le monde de chaque décor (le héros mesure 1,75), à l'échelle de la carte : ses dalles et ses marches sont larges. */
export const HEIGHTS: Record<string, number> = {
  'pin-tordu': 4.4, 'erable-rouge': 4.6, saule: 4.9, 'cerisier-pale': 4.9, 'bambous-hauts': 5.4, cedre: 6.2, ginkgo: 4.9,
  'arbre-mort': 4.4, 'pin-sur-rocher': 3.4,
  'buisson-rond': 1, 'buisson-bas': 0.7, 'herbe-haute': 0.9, 'herbe-courte': 0.35, fougere: 0.8, roseaux: 1.3, bambous: 1.6,
  higanbana: 0.7, hortensias: 0.8, 'jeune-erable': 1.4, 'petit-pin': 1.2, azalee: 0.8, 'souche-moussue': 0.8,
  'tronc-couche': 0.6, nenuphars: 0.35, 'herbes-de-rive': 1.1,
  'rocher-grand': 1.6, 'rocher-moyen': 1, 'rocher-petit': 0.35, galets: 0.4, 'rocher-moussu': 1, 'rocher-plat': 0.45,
  'rocher-pointu': 1.6, cairn: 0.8, 'rochers-de-rive': 0.9, 'pierre-dressee': 1.8, 'rocher-fendu': 1, eboulis: 0.6,
  'rocher-algues': 1.1, 'pas-japonais': 0.4, 'bloc-de-falaise': 2.4, 'pierre-du-jardin': 1.5,
  'petite-lanterne': 1.3, 'cloture-bambou': 1.1, shimenawa: 1.3, panneau: 1.5, 'sacs-de-riz': 0.9, 'tas-de-bois': 0.8,
  jarres: 0.9, kitsune: 1, steles: 0.8, sotoba: 1.4, 'lanterne-papier': 2.2, banc: 0.6, offrandes: 0.8, puits: 2.2,
  etendoir: 2.1, 'barque-echouee': 0.8, riz: 0.55,
};

/**
 * Rayon de collision des décors qu'on ne traverse pas, quand ils sont posés près d'une zone de marche : le tronc
 * d'un arbre, le pied d'un rocher. Les herbes, fleurs et petites pierres se traversent.
 */
export const SOLID: Record<string, number> = {
  'pin-tordu': 0.35, 'erable-rouge': 0.35, saule: 0.35, 'cerisier-pale': 0.35, 'bambous-hauts': 0.45, cedre: 0.4, ginkgo: 0.4,
  'arbre-mort': 0.35, 'pin-sur-rocher': 0.6, 'buisson-rond': 0.45, 'jeune-erable': 0.2, 'petit-pin': 0.35, 'souche-moussue': 0.4,
  'tronc-couche': 0.45, 'rocher-grand': 0.75, 'rocher-moyen': 0.5, 'rocher-moussu': 0.5, 'rocher-pointu': 0.55, cairn: 0.35,
  'rochers-de-rive': 0.5, 'pierre-dressee': 0.4, 'rocher-fendu': 0.5, 'rocher-algues': 0.5, 'bloc-de-falaise': 0.9,
  'pierre-du-jardin': 0.45, 'petite-lanterne': 0.25, 'cloture-bambou': 0.45, shimenawa: 0.3, panneau: 0.2, 'sacs-de-riz': 0.45,
  'tas-de-bois': 0.45, jarres: 0.45, kitsune: 0.3, steles: 0.45, sotoba: 0.3, 'lanterne-papier': 0.2, banc: 0.4, offrandes: 0.35,
  puits: 0.6, etendoir: 0.35, 'barque-echouee': 0.6,
};

/** Petits décors au ras du sol : regroupés en un seul maillage par image, dessinés avant les personnages. */
export const LOW_DECOR = new Set(['riz', 'galets', 'eboulis', 'rocher-plat', 'rocher-petit', 'herbe-courte', 'nenuphars', 'pas-japonais']);

/** Copie réduite de la carte, lue par le code : où est l'eau, où est l'herbe. */
export class MapImage {
  private constructor(
    private readonly pixels: Uint8ClampedArray,
    readonly width: number,
    readonly height: number,
  ) {}

  static async load(url: string, width: number): Promise<MapImage> {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = SAMPLE;
    canvas.height = SAMPLE;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas 2D indisponible');
    ctx.drawImage(image, 0, 0, SAMPLE, SAMPLE);
    return new MapImage(ctx.getImageData(0, 0, SAMPLE, SAMPLE).data, width, width / SIN);
  }

  /** Couleur de la carte en (u, v), ou null hors de l'image. */
  rgb(s: ScreenPoint): [number, number, number] | null {
    const x = Math.floor((s.u / this.width + 0.5) * SAMPLE);
    const y = Math.floor((0.5 - s.v / this.height) * SAMPLE);
    if (x < 0 || y < 0 || x >= SAMPLE || y >= SAMPLE) return null;
    const i = (y * SAMPLE + x) * 4;
    return [this.pixels[i], this.pixels[i + 1], this.pixels[i + 2]];
  }

  /** Mer, rivière, bassin : bleu-gris ou vert d'eau, toujours plus bleu que rouge. Hors de l'image, c'est la mer. */
  water(s: ScreenPoint): boolean {
    const c = this.rgb(s);
    return !c || c[2] > c[0] + 6;
  }

  /** Herbe : un vert franchement jaune (l'écume vert d'eau a presque autant de bleu que de vert). */
  green(s: ScreenPoint): boolean {
    const c = this.rgb(s);
    return !!c && c[1] > c[0] + 6 && c[1] > c[2] + 15 && c[2] <= c[0] + 6;
  }

  /** Eau grise et claire des rizières (les diguettes, elles, sont vertes). */
  paddyWater(s: ScreenPoint): boolean {
    const c = this.rgb(s);
    return !!c && Math.max(...c) - Math.min(...c) < 26 && (c[0] + c[1] + c[2]) / 3 > 105;
  }

  /** Couleur de la mer, lue dans un coin de l'image (fondu dans la mer par npm run sols). */
  sea(): [number, number, number] {
    return [this.pixels[0], this.pixels[1], this.pixels[2]];
  }
}

/** Distance signée au bord des zones de marche (positive dedans), sur une grille en coordonnées d'écran. */
export class WalkField {
  private static readonly CELL = 0.25;
  private readonly nu: number;
  private readonly nv: number;
  private readonly dist: Float32Array;

  constructor(
    data: IslandData,
    private readonly width: number,
    private readonly height: number,
  ) {
    const cell = WalkField.CELL;
    this.nu = Math.ceil(width / cell);
    this.nv = Math.ceil(height / cell);
    const inside = new Uint8Array(this.nu * this.nv);
    for (let j = 0; j < this.nv; j++) {
      for (let i = 0; i < this.nu; i++) inside[j * this.nu + i] = onWalk(data, this.point(i, j)) ? 1 : 0;
    }
    const toOutside = chamfer(inside, this.nu, this.nv, 1);
    const toInside = chamfer(inside, this.nu, this.nv, 0);
    this.dist = new Float32Array(this.nu * this.nv);
    for (let k = 0; k < this.dist.length; k++) this.dist[k] = (inside[k] ? toOutside[k] : -toInside[k]) * cell;
  }

  private point(i: number, j: number): ScreenPoint {
    return { u: -this.width / 2 + (i + 0.5) * WalkField.CELL, v: -this.height / 2 + (j + 0.5) * WalkField.CELL };
  }

  at(s: ScreenPoint): number {
    const i = Math.floor((s.u + this.width / 2) / WalkField.CELL);
    const j = Math.floor((s.v + this.height / 2) / WalkField.CELL);
    if (i < 0 || j < 0 || i >= this.nu || j >= this.nv) return -99;
    return this.dist[j * this.nu + i];
  }
}

/** Distance (en cases) de chaque case marquée `from` à la plus proche case qui ne l'est pas, en deux passes. */
function chamfer(mask: Uint8Array, w: number, h: number, from: number): Float32Array {
  const d = new Float32Array(w * h);
  for (let k = 0; k < d.length; k++) d[k] = mask[k] === from ? 1e6 : 0;
  const D = Math.SQRT2;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const k = j * w + i;
      if (!d[k]) continue;
      if (i > 0) d[k] = Math.min(d[k], d[k - 1] + 1);
      if (j > 0) d[k] = Math.min(d[k], d[k - w] + 1);
      if (i > 0 && j > 0) d[k] = Math.min(d[k], d[k - w - 1] + D);
      if (i < w - 1 && j > 0) d[k] = Math.min(d[k], d[k - w + 1] + D);
    }
  }
  for (let j = h - 1; j >= 0; j--) {
    for (let i = w - 1; i >= 0; i--) {
      const k = j * w + i;
      if (!d[k]) continue;
      if (i < w - 1) d[k] = Math.min(d[k], d[k + 1] + 1);
      if (j < h - 1) d[k] = Math.min(d[k], d[k + w] + 1);
      if (i < w - 1 && j < h - 1) d[k] = Math.min(d[k], d[k + w + 1] + D);
      if (i > 0 && j < h - 1) d[k] = Math.min(d[k], d[k + w - 1] + D);
    }
  }
  return d;
}

/** Les décors posés à la main (island.json, `decor`), ou à défaut ceux que pose le code. */
export function islandDecor(data: IslandData, map: MapImage, field: WalkField): DecorItem[] {
  return data.decor ?? autoDecor(data, map, field);
}

/** Collisions des décors qu'on ne traverse pas, posés dans une zone de marche ou à son bord (Island.addSolids). */
export function decorSolids(decor: readonly DecorItem[], field: WalkField): { pos: Vec2; r: number }[] {
  return decor.flatMap((d) => {
    const r = solidRadius(d);
    return r && field.at(d) > -r - 0.4 ? [{ pos: toWorld(d), r }] : [];
  });
}

/** Rayon d'obstacle d'un décor, à sa taille (0 : il se traverse). */
export function solidRadius(d: DecorItem): number {
  const name = decorName(d.sprite);
  return SOLID[name] ? SOLID[name] * (d.height / (HEIGHTS[name] ?? d.height)) : 0;
}

/** Nom du décor : `ile/riz` → `riz`. */
export function decorName(sprite: string): string {
  return sprite.split('/').pop() ?? sprite;
}

/** Le placement automatique : par biome, selon ce qui est peint et les zones de marche. */
export function autoDecor(data: IslandData, map: MapImage, field: WalkField): DecorItem[] {
  const random = rng(17);
  const spots: DecorItem[] = [];
  const { scenery } = data;
  // Ce qu'il ne faut pas couvrir : personnages, objets à fouiller, bâtiments, arrivées.
  const keepClear: { s: ScreenPoint; r: number }[] = [
    ...data.interactables.map((it) => ({ s: it as ScreenPoint, r: 1.4 })),
    ...data.props.map((p) => ({ s: p as ScreenPoint, r: (p.solid ?? 0.8) + 1.2 })),
    { s: data.spawn, r: 2 },
    { s: data.dungeonExit, r: 2 },
  ];
  const clear = (s: ScreenPoint, r = 0) =>
    keepClear.every((c) => Math.hypot(c.s.u - s.u, c.s.v - s.v) > c.r + r) && spots.every((d) => Math.hypot(d.u - s.u, d.v - s.v) > 0.8);
  // Un décor haut cache ce qui est derrière lui à l'écran (vers +v) : jamais devant une zone de marche.
  const hides = (s: ScreenPoint, height: number) => {
    for (let k = 0.4; k <= height * 1.2; k += 0.4) if (field.at({ u: s.u, v: s.v + k }) > -0.3) return true;
    return false;
  };
  // Passages étroits (escaliers, pont, ponton, chemin le long de la rivière) : jamais d'obstacle dessus ni à leurs abords.
  const narrow = data.walk.filter((p) => polygonArea(p) / polygonPerimeter(p) < 2.3);
  const blocksPassage = (name: string, s: ScreenPoint) =>
    !!SOLID[name] && field.at(s) > -SOLID[name] - 0.4 && narrow.some((p) => insidePolygon(s, p) || distToPolygon(s, p) < SOLID[name] + 0.9);
  /** Pose un décor ; refuse (faux) un obstacle qui fermerait un passage étroit. */
  const add = (name: string, s: ScreenPoint, height = HEIGHTS[name] * (0.88 + random() * 0.24)) => {
    if (blocksPassage(name, s)) return false;
    const folder = name === 'riz' ? 'rizieres' : 'ile';
    const flip = random() < 0.5;
    spots.push({ sprite: `${folder}/${name}`, u: round(s.u), v: round(s.v), height: round(height), ...(flip ? { flip } : {}) });
    return true;
  };
  const pick = (list: readonly string[]) => list[Math.floor(random() * list.length)];
  // Par massifs : la plante suit un bruit lent, les voisins se ressemblent ; un peu de hasard pour le naturel.
  const clustered = (list: readonly string[], s: ScreenPoint, salt: number) => {
    if (random() < 0.12) return pick(list);
    const t = (fbm(s.u * 0.18 + salt, s.v * 0.18 - salt) - 0.3) / 0.4;
    return list[Math.min(list.length - 1, Math.max(0, Math.floor(t * list.length)))];
  };
  const flora = (s: ScreenPoint): Flora => {
    const warp = (fbm(s.u * 0.2 + 11, s.v * 0.2 + 2) - 0.5) * 0.5;
    let best: Flora = FLORA.village;
    let bestD = Infinity;
    for (const a of data.areas) {
      const d = Math.hypot(s.u - a.u, s.v - a.v) / a.r + warp;
      if (d < bestD && a.id in FLORA) {
        bestD = d;
        best = FLORA[a.id as Biome];
      }
    }
    return best;
  };
  // Assez de place autour pour qu'un obstacle ne ferme pas le passage : loin d'un chemin étroit, d'un escalier, du pont.
  const roomy = (s: ScreenPoint) =>
    Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4).some((a) => field.at({ u: s.u + Math.cos(a) * 2.5, v: s.v + Math.sin(a) * 2.5 }) > 2.2);
  const nearWater = (s: ScreenPoint, r: number) =>
    [[r, 0], [-r, 0], [0, r], [0, -r]].some(([du, dv]) => map.water({ u: s.u + du, v: s.v + dv }));

  // Accents : des objets choisis près d'un repère, à la première place libre autour, dans une zone de marche assez
  // large (pas sur un escalier, le pont ou le ponton).
  const near = (name: string, at: ScreenPoint, radius = 3.5, where = (s: ScreenPoint) => field.at(s) > 0.9 && roomy(s)) => {
    for (let ring = 0; ring <= radius; ring += 0.35) {
      for (let a = 0; a < 12; a++) {
        const angle = (a / 12) * Math.PI * 2 + ring;
        const s = { u: at.u + Math.cos(angle) * ring, v: at.v + Math.sin(angle) * ring };
        if (where(s) && !map.water(s) && clear(s, 0.2) && add(name, s)) return;
      }
    }
  };
  const prop = (sprite: string) => data.props.find((p) => p.sprite === sprite);
  const thing = (id: string) => data.interactables.find((it) => it.id === id);
  const offset = (p: ScreenPoint | undefined, du: number, dv: number) => (p ? { u: p.u + du, v: p.v + dv } : null);
  const accents: [string, ScreenPoint | null, number?][] = [
    ['puits', offset(prop('maisonThe'), -2.6, -2.4)],
    ['etendoir', offset(prop('maisonThe'), 2.6, 3)],
    ['jarres', offset(prop('maisonThe'), 2.4, -1.6)],
    ['sacs-de-riz', offset(prop('maisonThe'), -2.6, -0.4)],
    ['lanterne-papier', offset(prop('maisonThe'), 3, -2.8)],
    ['tas-de-bois', offset(prop('forge'), 2.4, 0.4)],
    ['banc', offset(prop('forge'), -2.8, -1.8)],
    ['kitsune', offset(prop('torii'), -1.9, 0.2), 2],
    ['kitsune', offset(prop('torii'), 1.9, -0.2), 2],
    ['panneau', offset(prop('torii'), -3.2, 2.4)],
    ['shimenawa', offset(prop('rocher'), -4, -1.5)],
    ['pierre-dressee', offset(prop('rocher'), 4.5, -2)],
    ['cairn', offset(prop('rocher'), -5, -4)],
    ['offrandes', offset(thing('jizo-1'), -1.1, -0.4), 1.5],
    ['offrandes', offset(thing('jizo-6'), 1.1, -0.4), 1.5],
    ['petite-lanterne', offset(thing('moine'), -1.8, -1)],
    ['sacs-de-riz', offset(thing('kawataro'), 1.5, -2.5)],
    ['etendoir', offset(thing('ema'), -1.8, -2)],
    ['banc', offset(thing('nanashi'), 2.2, -1)],
    ['petite-lanterne', offset(thing('nanashi'), -2, 1.5)],
    ['petite-lanterne', offset(thing('nanashi'), 2.4, 1.8)],
  ];
  for (const [name, at, radius] of accents) if (at) near(name, at, radius);
  // Autour du torii noir, sur les pentes du cratère : stèles et sotoba, là où ils ne cachent rien.
  const portail = prop('portail');
  if (portail) {
    const slope = (s: ScreenPoint) => field.at(s) < -0.4 && !map.water(s) && !hides(s, 1.5);
    near('sotoba', { u: portail.u + 2.4, v: portail.v + 1 }, 3, slope);
    near('steles', { u: portail.u - 2.6, v: portail.v + 0.6 }, 3, slope);
    near('sotoba', { u: portail.u - 1.6, v: portail.v + 2.6 }, 3, slope);
  }
  // Clôture de bambou au bord des rizières, côté chemin.
  for (const [pu, pv] of scenery.paddies.filter((_, i) => i % 3 === 0)) {
    near('cloture-bambou', { u: pu - 1.2, v: pv }, 2, (s) => field.at(s) > 0.6 && !insidePolygon(s, scenery.paddies));
  }
  // Barque échouée sur une plage où l'on ne va pas.
  for (const beach of scenery.beaches) {
    const c = beach.reduce((m, [u, v]) => ({ u: m.u + u / beach.length, v: m.v + v / beach.length }), { u: 0, v: 0 });
    near('barque-echouee', c, 4, (s) => insidePolygon(s, beach) && !nearWater(s, 0.6));
  }
  // Nénuphars dans le bassin de la cascade.
  for (let i = 0; i < 40 && spots.filter((d) => decorName(d.sprite) === 'nenuphars').length < 4; i++) {
    const [a, b] = [scenery.pool[Math.floor(random() * scenery.pool.length)], scenery.pool[Math.floor(random() * scenery.pool.length)]];
    const s = { u: (a[0] + b[0]) / 2 + (random() - 0.5) * 3, v: (a[1] + b[1]) / 2 + (random() - 0.5) * 3 };
    if (insidePolygon(s, scenery.pool) && map.water(s) && clear(s)) add('nenuphars', s);
  }
  // Riz dans l'eau des rizières.
  const box = bounds([scenery.paddies]);
  for (let u = box.u0; u < box.u1; u += 0.8) {
    for (let v = box.v0; v < box.v1; v += 0.8) {
      const s = { u: u + (random() - 0.5) * 0.3, v: v + (random() - 0.5) * 0.3 };
      if (insidePolygon(s, scenery.paddies) && map.paddyWater(s) && random() < 0.7) add('riz', s);
    }
  }

  // Végétation : bosquets sur les terrasses où l'on ne va pas, lisières autour des zones de marche, haies basses à
  // leur bord, touffes dedans, rochers au rivage. Densités et essences suivent des bruits lents : des massifs et des
  // clairières plutôt qu'un semis régulier.
  const all = bounds(data.walk.concat(scenery.groves));
  for (let u = all.u0 - 4; u < all.u1 + 4; u += 1.15) {
    for (let v = all.v0 - 4; v < all.v1 + 4; v += 1.15) {
      const s = { u: u + (random() - 0.5) * 0.9, v: v + (random() - 0.5) * 0.9 };
      if (map.water(s) || insidePolygon(s, scenery.paddies) || insidePolygon(s, scenery.pool) || !clear(s)) continue;
      const d = field.at(s);
      const f = flora(s);
      const density = fbm(s.u * 0.16 + 7, s.v * 0.16 + 1);
      const grove = fbm(s.u * 0.12 + 30, s.v * 0.12 - 4);
      if (scenery.beaches.some((p) => insidePolygon(s, p))) {
        // Quelques rochers à la ligne d'eau seulement : une plage reste une plage.
        if (nearWater(s, 1.5) && random() < 0.1) add(clustered(f.shore, s, 17), s);
        continue;
      }
      if (scenery.groves.some((p) => insidePolygon(s, p))) {
        if (random() > 0.35 + density * 0.6) continue;
        const tree = clustered(f.trees, s, 3);
        if (grove > 0.42 && !hides(s, HEIGHTS[tree])) add(tree, s);
        else {
          const name = clustered(f.under, s, 9);
          if (!hides(s, HEIGHTS[name])) add(name, s);
        }
        continue;
      }
      if (d < 0) {
        // Hors des zones de marche : la terre ferme entre elles et le rivage ou le pied des falaises.
        // Le liseré d'écume vert d'eau du rivage n'est pas de l'herbe : rien de haut au bord de l'eau.
        if (d < -5 || !map.green(s) || nearWater(s, 1)) {
          if (d > -3 && nearWater(s, 0.9) && random() < 0.3 && !hides(s, 1)) add(clustered(f.shore, s, 17), s);
          continue;
        }
        if (density < 0.36 || random() > 0.3 + density) continue;
        const tree = clustered(f.trees, s, 3);
        if (d < -1.4 && grove > 0.48 && !hides(s, HEIGHTS[tree])) add(tree, s);
        else {
          const name = clustered(f.under, s, 9);
          if (!hides(s, HEIGHTS[name])) add(name, s);
        }
        continue;
      }
      if (!map.green(s)) continue;
      if (d < 1) {
        // Haie basse au bord, là où elle ne cache rien : la limite se voit au lieu de se heurter.
        if (random() < 0.3) {
          const name = clustered(f.under.filter((n) => HEIGHTS[n] <= 1.4), s, 9);
          if (name && roomy(s) && !hides(s, HEIGHTS[name])) add(name, s);
        }
      } else if (d > 2.5 && grove > 0.6 && random() < 0.35) {
        // Bosquets au milieu des grandes étendues (la prairie, les terrasses) : on en fait le tour.
        add(random() < 0.7 ? clustered(f.trees, s, 3) : pick(f.under), s);
      } else if (d > 1.6 && fbm(s.u * 0.3 + 50, s.v * 0.3) > 0.55 && random() < 0.35) {
        add(clustered(f.sprinkles, s, 23), s);
      }
    }
  }

  return spots;
}

const round = (n: number) => Math.round(n * 100) / 100;

function polygonArea(poly: Polygon): number {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1]);
  return Math.abs(a / 2);
}

function polygonPerimeter(poly: Polygon): number {
  let p = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) p += Math.hypot(poly[i][0] - poly[j][0], poly[i][1] - poly[j][1]);
  return p;
}

function distToPolygon(s: ScreenPoint, poly: Polygon): number {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[j];
    const [bx, by] = poly[i];
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((s.u - ax) * dx + (s.v - ay) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(s.u - (ax + dx * t), s.v - (ay + dy * t)));
  }
  return best;
}

function bounds(polygons: Polygon[]): { u0: number; u1: number; v0: number; v1: number } {
  const points = polygons.flat();
  return {
    u0: Math.min(...points.map((p) => p[0])),
    u1: Math.max(...points.map((p) => p[0])),
    v0: Math.min(...points.map((p) => p[1])),
    v1: Math.max(...points.map((p) => p[1])),
  };
}
