import { Color3, Mesh, MeshBuilder, Vector3, type Scene } from '@babylonjs/core';
import { toScreen, toWorld, type Circle, type IslandData, type ScreenPoint } from '../game/island';
import {
  ModelKit,
  Water,
  buildTerrain,
  distToPolyline,
  fbm,
  hidesWalkable,
  noise,
  plainMaterial,
  rng,
  smoothstep,
  type Lighting,
  type Placement,
} from './world3d';

/**
 * L'île en 3D : un relief généré à partir de island.json. Les cercles praticables restent un plateau plat à y = 0
 * (les personnages y marchent), entouré de collines boisées qui finissent en falaises ou en plages sur la mer ;
 * le ruisseau, le bassin et les rizières sont creusés et remplis d'eau. Ponton et pont sont construits ici ;
 * arbres, buissons et rochers viennent du pack KayKit Forest (CC0, palette repeinte par tools/palette-foret.mjs).
 */

const FOREST = `${import.meta.env.BASE_URL}models/kaykit-forest/`;
const SEA = -0.3;
const STREAM_LEVEL = -0.12;
const PADDY_LEVEL = -0.03;
/** Demi-côté du relief détaillé (l'île et ses abords) ; au-delà, un fond marin plat jusqu'au bord de l'eau. */
const HALF = 30;
/** Demi-côté de la mer : assez loin pour que la brume en cache le bord. */
const SEA_HALF = 44;
const SEA_FLOOR = SEA - 2.6;

const LIGHT: Lighting = {
  sun: new Vector3(-0.5, 1, -0.3),
  sunColor: new Color3(0.52, 0.49, 0.43),
  sky: new Color3(0.68, 0.72, 0.76),
  ground: new Color3(0.36, 0.34, 0.36),
  fog: Color3.FromHexString('#c3cbcf'),
  fogCenter: [0, -1],
  fogRange: [24, 38],
};

const COLORS = {
  grass: Color3.FromHexString('#7e9a6c'),
  grassDark: Color3.FromHexString('#5e7c58'),
  moss: Color3.FromHexString('#6f8a5c'),
  sand: Color3.FromHexString('#bfb293'),
  seabed: Color3.FromHexString('#8f9d93'),
  deep: Color3.FromHexString('#3f5a5e'),
  rock: Color3.FromHexString('#8d918b'),
  path: Color3.FromHexString('#b29a78'),
  plaza: Color3.FromHexString('#a8a69c'),
  plazaLine: Color3.FromHexString('#8c8a82'),
  gravel: Color3.FromHexString('#bdbbb2'),
  rake: Color3.FromHexString('#a5a39a'),
  cursed: Color3.FromHexString('#5d4a66'),
  vein: Color3.FromHexString('#8d3f5a'),
  mud: Color3.FromHexString('#6e6550'),
  dike: Color3.FromHexString('#7d8a5c'),
  bed: Color3.FromHexString('#7d7a6c'),
};

function mixColor(a: Color3, b: Color3, t: number): Color3 {
  return Color3.Lerp(a, b, Math.min(1, Math.max(0, t)));
}

function inside(s: ScreenPoint, c: Circle, margin = 0): boolean {
  return Math.hypot(s.u - c.u, s.v - c.v) <= c.r + margin;
}

type Line = [number, number][];

/** Forme de l'île : hauteur du sol, nature du terrain et niveau de l'eau en chaque point. */
class IslandShape {
  private readonly land: Circle[];
  private readonly pier: Line;
  private readonly stream: Line;
  private readonly paths: Line[];

  constructor(readonly data: IslandData) {
    this.pier = data.zones.pier;
    // Les deux cercles du ponton avancent sur la mer : ce ne sont pas des terres.
    this.land = data.walkable.filter((c) => distToPolyline(c.u, c.v, this.pier) > 0.6);
    this.stream = data.zones.stream;
    this.paths = data.paths;
  }

  /** Distance signée au bord praticable, positive sur le plateau. */
  plateau(s: ScreenPoint): number {
    let best = -Infinity;
    for (const c of this.land) best = Math.max(best, c.r - Math.hypot(s.u - c.u, s.v - c.v));
    return best;
  }

  /** Largeur de la bande de collines avant la mer : étroite au ponton (la plage), large ailleurs. */
  private margin(s: ScreenPoint): number {
    const [pu, pv] = this.pier[0];
    const nearPier = Math.exp(-((s.u - pu) ** 2 + (s.v - pv) ** 2) / 30);
    return (1.4 + 3.6 * fbm(s.u * 0.16, s.v * 0.16)) * (1 - 0.95 * nearPier);
  }

  /** Hauteur des collines : plus hautes derrière la cascade, pour qu'elle tombe d'une falaise. */
  private hills(s: ScreenPoint, margin: number): number {
    const cascade = Math.exp(-((s.u - 16) ** 2 + (s.v - 8.8) ** 2) / 10);
    const rocher = Math.exp(-((s.u - 3.5) ** 2 + (s.v - 18) ** 2) / 14);
    return (0.4 + 1.7 * fbm(s.u * 0.11 + 3, s.v * 0.11 + 7)) * smoothstep(0.4, 2.4, margin) + 3.4 * cascade + 2 * rocher;
  }

  height(x: number, z: number): number {
    const s = toScreen({ x, z });
    const p = this.plateau(s);
    let h = 0;
    if (p < -0.25) {
      const t = -p - 0.25;
      const margin = this.margin(s);
      // Pente limitée : entre deux zones praticables, une butte douce plutôt qu'un pic.
      const rise = this.hills(s, margin) * smoothstep(0, 1.8, t) * (0.8 + 0.2 * noise(x * 0.9, z * 0.9));
      const land = Math.min(rise, 0.2 + t * 0.55);
      const seabed = SEA - 0.25 - (SEA - 0.25 - SEA_FLOOR) * smoothstep(margin, margin + 6, t);
      const k = smoothstep(margin - 0.5, margin + 0.6, t);
      h = land * (1 - k) + seabed * k;
    }
    // Ruisseau et bassin creusés, y compris à travers les collines.
    const ds = distToPolyline(s.u, s.v, this.stream);
    if (ds < 1) h = Math.min(h, -0.38 + (h + 0.38) * smoothstep(0.3, 1, ds));
    const pool = this.data.zones.pool;
    const dp = Math.hypot(s.u - pool.u, s.v - pool.v) - pool.r;
    if (dp < 0.6) h = Math.min(h, -0.5 + (h + 0.5) * smoothstep(-0.8, 0.6, dp));
    // Rizières : bassins peu profonds séparés par des diguettes.
    if (this.data.zones.paddies.some((c) => inside(s, c))) h = this.isDike(x, z) ? 0.04 : -0.12;
    return h;
  }

  isDike(x: number, z: number): boolean {
    const cell = 1.6;
    const gx = ((x % cell) + cell) % cell;
    const gz = ((z % cell) + cell) % cell;
    return gx < 0.24 || gz < 0.24;
  }

  waterLevel(x: number, z: number): number | null {
    const s = toScreen({ x, z });
    if (this.data.zones.paddies.some((c) => inside(s, c, 0.3))) return PADDY_LEVEL;
    if (distToPolyline(s.u, s.v, this.stream) < 1.1) return STREAM_LEVEL;
    const pool = this.data.zones.pool;
    if (Math.hypot(s.u - pool.u, s.v - pool.v) < pool.r + 0.8) return STREAM_LEVEL;
    return this.plateau(s) < -0.2 ? SEA : null;
  }

  onPath(s: ScreenPoint): number {
    let best = Infinity;
    for (const path of this.paths) best = Math.min(best, distToPolyline(s.u, s.v, path));
    return best;
  }

  color(x: number, z: number, y: number, slope: number): Color3 {
    const s = toScreen({ x, z });
    const zones = this.data.zones;
    const grain = noise(x * 1.7, z * 1.7);
    if (y < SEA - 0.02) return mixColor(COLORS.seabed, COLORS.deep, (SEA - y) / 2.2);
    if (zones.paddies.some((c) => inside(s, c))) return this.isDike(x, z) ? COLORS.dike : COLORS.mud;
    if (y < -0.05) return mixColor(COLORS.bed, COLORS.deep, 0.25 + grain * 0.2);
    if (slope > 0.42) return mixColor(COLORS.rock, COLORS.moss, grain * 0.35);
    if (inside(s, zones.cursed)) return grain > 0.82 ? COLORS.vein : mixColor(COLORS.cursed, COLORS.grassDark, noise(x * 0.7, z * 0.7) * 0.5);
    if (inside(s, zones.gravel)) return mixColor(COLORS.gravel, COLORS.rake, grain * 0.6);
    const path = this.onPath(s);
    if (path < 0.75 && y < 0.1) return mixColor(COLORS.path, COLORS.grass, smoothstep(0.45, 0.75, path) + grain * 0.15);
    if (inside(s, zones.plaza)) return mixColor(COLORS.plaza, COLORS.plazaLine, grain * 0.5);
    const p = this.plateau(s);
    // Plage : le bas des pentes près de la mer.
    if (p < 0 && y < 0.3 && this.margin(s) < 1.6) return mixColor(COLORS.sand, COLORS.grass, smoothstep(0.1, 0.3, y));
    const lush = fbm(x * 0.25 + 11, z * 0.25 + 4);
    return mixColor(COLORS.grass, COLORS.grassDark, lush * 1.2 - 0.1 + grain * 0.08 + smoothstep(0.6, 3, y) * 0.3);
  }
}

interface Caster {
  x: number;
  z: number;
  r: number;
  h: number;
}

/** Ombres portées (arbres, bâtiments peints), cuites dans le sol. */
function shading(casters: Caster[], sun: Vector3): (x: number, z: number) => number {
  const dir = sun.normalizeToNew();
  const ox = -dir.x / dir.y;
  const oz = -dir.z / dir.y;
  return (x, z) => {
    let shade = 0;
    for (const c of casters) {
      const dx = x - (c.x + ox * c.h * 0.6);
      const dz = z - (c.z + oz * c.h * 0.6);
      const d2 = dx * dx + dz * dz;
      if (d2 > c.r * c.r) continue;
      shade = Math.max(shade, 1 - smoothstep(c.r * 0.45, c.r, Math.sqrt(d2)));
    }
    return shade;
  };
}

export class IslandScene3d {
  private constructor(
    private readonly meshes: { dispose(): void }[],
    private readonly kit: ModelKit,
    private readonly water: Water,
  ) {}

  /** Noms des décors peints que l'île en 3D remplace par des modèles. */
  static readonly replaces = new Set(['arbre']);

  static async build(scene: Scene, data: IslandData): Promise<IslandScene3d> {
    const shape = new IslandShape(data);
    const random = rng(11);
    const meshes: { dispose(): void }[] = [];

    // --- Végétation et rochers (positions d'abord : leurs ombres cuisent dans le sol) ---
    const trees: (Placement & { kind: string })[] = [];
    const bushes: Placement[] = [];
    const rocks: Placement[] = [];
    const grass: Placement[] = [];
    const casters: Caster[] = [];
    const occupied: ScreenPoint[] = [
      ...data.interactables,
      ...data.props.filter((p) => !IslandScene3d.replaces.has(p.sprite)),
    ];
    const clear = (s: ScreenPoint, r: number) => occupied.every((o) => Math.hypot(o.u - s.u, o.v - s.v) > r);

    // Les arbres peints de island.json deviennent des pins en 3D, à la même place (leur collision ne change pas).
    for (const prop of data.props.filter((p) => p.sprite === 'arbre')) {
      const w = toWorld(prop);
      const scale = (prop.height ?? 3.6) / 3.6;
      trees.push({ kind: 'Tree_3_A', model: 'Tree_3_A', x: w.x, z: w.z, angle: random() * Math.PI * 2, scale: 0.85 * scale });
      casters.push({ x: w.x, z: w.z, r: 1.4, h: 2.5 });
    }

    // Forêt sur les collines, hors du plateau praticable.
    const conifers = ['Tree_4_A', 'Tree_4_B', 'Tree_4_C'];
    const broad = ['Tree_3_A', 'Tree_3_B', 'Tree_3_C', 'Tree_2_A', 'Tree_2_B', 'Tree_1_A', 'Tree_1_C'];
    for (let x = -HALF + 2; x < HALF - 2; x += 1.6) {
      for (let z = -HALF + 2; z < HALF - 2; z += 1.6) {
        const px = x + (random() - 0.5) * 1.3;
        const pz = z + (random() - 0.5) * 1.3;
        const s = toScreen({ x: px, z: pz });
        const p = shape.plateau(s);
        const y = shape.height(px, pz);
        if (p > -1.4 || y < 0.15) continue;
        if (distToPolyline(s.u, s.v, data.zones.stream) < 1.4) continue;
        const density = fbm(px * 0.2 + 2, pz * 0.2 + 9);
        const r = random();
        const onPlateau = (wx: number, wz: number) => shape.plateau(toScreen({ x: wx, z: wz })) > 0;
        if (r < density * 0.6 && !hidesWalkable(px, pz, 3.2, onPlateau)) {
          const cursed = inside(s, data.zones.cursed, 4);
          const model = cursed ? (random() < 0.5 ? 'Tree_Bare_1_A' : 'Tree_Bare_2_B') : random() < 0.45 ? conifers[Math.floor(random() * 3)] : broad[Math.floor(random() * broad.length)];
          const scale = 0.55 + random() * 0.3;
          trees.push({ kind: cursed ? 'bare' : model, model, x: px, y: y - 0.1, z: pz, angle: random() * Math.PI * 2, scale });
          casters.push({ x: px, z: pz, r: 1.5 * scale, h: 3 * scale + y });
        } else if (r < density * 0.6 + 0.22) {
          bushes.push({ model: random() < 0.5 ? 'Bush_2_A' : 'Bush_4_C', x: px, y: y - 0.05, z: pz, angle: random() * 6.3, scale: 1.4 + random() * 1.2 });
        }
      }
    }

    // Rochers : au pied des falaises, dans l'eau près du rivage, et trois pierres dans le jardin de gravier.
    for (let i = 0; i < 180; i++) {
      const x = (random() * 2 - 1) * (HALF - 4);
      const z = (random() * 2 - 1) * (HALF - 4);
      const s = toScreen({ x, z });
      const y = shape.height(x, z);
      const p = shape.plateau(s);
      if (p > -1.2 || y > 0.4 || y < SEA - 1.2) continue;
      if (distToPolyline(s.u, s.v, data.zones.pier) < 3.5) continue;
      const big = random() < 0.15;
      rocks.push({ model: big ? 'Rock_3_A' : random() < 0.5 ? 'Rock_1_C' : 'Rock_1_H', x, y: y - 0.1, z, angle: random() * 6.3, scale: big ? 0.6 + random() * 0.4 : 0.9 + random() * 1.1 });
    }
    const gravel = data.zones.gravel;
    for (const [du, dv, s] of [[-1.4, 0.6, 1.6], [1.2, -0.8, 1.2], [0.6, 1.5, 0.9]] as const) {
      const w = toWorld({ u: gravel.u + du, v: gravel.v + dv });
      rocks.push({ model: 'Rock_3_F', x: w.x, z: w.z, angle: du * 2, scale: s });
    }

    // Touffes d'herbe sur le plateau, loin des chemins et des personnages ; riz dans les rizières.
    for (let i = 0; i < 1400; i++) {
      const x = (random() * 2 - 1) * 26;
      const z = (random() * 2 - 1) * 26;
      const s = toScreen({ x, z });
      if (shape.plateau(s) < 0.2 || shape.onPath(s) < 1 || !clear(s, 1)) continue;
      const zones = data.zones;
      if (inside(s, zones.plaza, 0.5) || inside(s, zones.gravel, 0.3) || inside(s, zones.cursed)) continue;
      if (zones.paddies.some((c) => inside(s, c, 0.4)) || distToPolyline(s.u, s.v, zones.stream) < 1.2) continue;
      if (random() > fbm(x * 0.3, z * 0.3) * 1.3) continue;
      grass.push({ model: random() < 0.5 ? 'Grass_1_A' : 'Grass_1_C', x, z, angle: random() * 6.3, scale: 0.9 + random() * 0.6 });
    }
    const rice: Placement[] = [];
    for (const c of data.zones.paddies) {
      const center = toWorld(c);
      for (let x = center.x - c.r; x < center.x + c.r; x += 0.4) {
        for (let z = center.z - c.r; z < center.z + c.r; z += 0.4) {
          const s = toScreen({ x, z });
          if (!inside(s, c, -0.2) || shape.isDike(x, z) || !clear(s, 0.8)) continue;
          rice.push({ model: 'Grass_2_A', x, y: -0.12, z, angle: random() * 6.3, scale: [0.7, 0.5 + random() * 0.15, 0.7] });
        }
      }
    }

    // Ombres des bâtiments et décors peints.
    for (const prop of data.props) {
      if (IslandScene3d.replaces.has(prop.sprite) || !prop.solid) continue;
      const w = toWorld(prop);
      casters.push({ x: w.x, z: w.z, r: prop.solid * 1.3, h: (prop.height ?? 3) * 0.6 });
    }

    // --- Sol et eau ---
    const terrain = buildTerrain(
      scene,
      'island3d-terrain',
      {
        minX: -HALF,
        maxX: HALF,
        minZ: -HALF,
        maxZ: HALF,
        step: 0.45,
        height: (x, z) => shape.height(x, z),
        color: (x, z, y, slope) => shape.color(x, z, y, slope),
        shade: shading(casters, LIGHT.sun),
      },
      LIGHT,
    );
    meshes.push(terrain);
    const seabed = buildTerrain(
      scene,
      'island3d-seabed',
      {
        minX: -SEA_HALF,
        maxX: SEA_HALF,
        minZ: -SEA_HALF,
        maxZ: SEA_HALF,
        step: SEA_HALF,
        height: () => SEA_FLOOR - 0.05,
        color: () => COLORS.deep,
      },
      LIGHT,
    );
    meshes.push(seabed);
    const water = new Water(
      scene,
      'island3d-water',
      {
        minX: -SEA_HALF,
        maxX: SEA_HALF,
        minZ: -SEA_HALF,
        maxZ: SEA_HALF,
        step: 0.5,
        level: (x, z) => (Math.max(Math.abs(x), Math.abs(z)) > HALF ? SEA : shape.waterLevel(x, z)),
        bottom: (x, z) => (Math.max(Math.abs(x), Math.abs(z)) > HALF ? SEA_FLOOR : shape.height(x, z)),
        shallow: Color3.FromHexString('#8fb7b6'),
        deep: Color3.FromHexString('#3d5d66'),
        depth: 1.6,
        minAlpha: 0.6,
      },
      LIGHT,
    );

    // --- Ouvrages : ponton et pont ---
    meshes.push(...buildPier(scene, data), ...buildBridge(scene, data));

    // --- Modèles ---
    const kit = new ModelKit(scene, FOREST, 'forest_yomi.png', LIGHT);
    const byModel = new Map<string, Placement[]>();
    for (const p of [...trees, ...bushes, ...rocks, ...grass, ...rice]) byModel.set(p.model, [...(byModel.get(p.model) ?? []), p]);
    const tints: Record<string, Color3> = {
      Grass_2_A: new Color3(1.15, 1.12, 0.75),
      Tree_Bare_1_A: new Color3(0.8, 0.7, 0.9),
      Tree_Bare_2_B: new Color3(0.8, 0.7, 0.9),
    };
    await Promise.all([...byModel].map(([model, list]) => kit.place(`${model}_Color1`, list, tints[model])));
    return new IslandScene3d(meshes, kit, water);
  }

  update(dt: number): void {
    this.water.update(dt);
  }

  dispose(): void {
    for (const mesh of this.meshes) mesh.dispose();
    this.kit.dispose();
    this.water.dispose();
  }
}

/** Ponton de bois sur pilotis, le long de `zones.pier`, jusqu'à la barque de Charon. */
function buildPier(scene: Scene, data: IslandData): { dispose(): void }[] {
  const [a, b] = data.zones.pier.map(([u, v]) => toWorld({ u, v }));
  // Il part du rivage : on le prolonge d'un pas vers la terre.
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const length = Math.hypot(dx, dz);
  const ux = dx / length;
  const uz = dz / length;
  const start = { x: a.x - ux * 1.2, z: a.z - uz * 1.2 };
  const total = length + 2.2;
  const angle = Math.atan2(ux, uz);
  const parts: Mesh[] = [];
  const width = 1.5;
  for (let d = 0; d < total; d += 0.34) {
    const plank = MeshBuilder.CreateBox('pier-plank', { width, height: 0.07, depth: 0.3 }, scene);
    plank.rotation.y = angle;
    plank.position.set(start.x + ux * d, -0.02 + (Math.sin(d * 7.3) * 0.01), start.z + uz * d);
    parts.push(plank);
  }
  for (let d = 0.4; d < total; d += 1.25) {
    for (const side of [-1, 1]) {
      const post = MeshBuilder.CreateCylinder('pier-post', { height: 1.6, diameter: 0.16, tessellation: 6 }, scene);
      post.position.set(start.x + ux * d + uz * side * (width / 2 - 0.05), -0.55, start.z + uz * d - ux * side * (width / 2 - 0.05));
      parts.push(post);
    }
  }
  const pier = Mesh.MergeMeshes(parts, true, true);
  if (!pier) return [];
  const material = plainMaterial(scene, 'island3d-pier', Color3.FromHexString('#7a6048'), LIGHT);
  pier.material = material;
  pier.isPickable = false;
  return [pier, material];
}

/** Pont de bois rouge laqué là où le chemin franchit le ruisseau (`zones.bridge`). */
function buildBridge(scene: Scene, data: IslandData): { dispose(): void }[] {
  const bridge = data.zones.bridge;
  const center = toWorld(bridge);
  // Le pont suit le chemin : perpendiculaire au ruisseau à cet endroit.
  const stream = data.zones.stream;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i + 1 < stream.length; i++) {
    const d = distToPolyline(bridge.u, bridge.v, [stream[i], stream[i + 1]]);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  const s0 = toWorld({ u: stream[best][0], v: stream[best][1] });
  const s1 = toWorld({ u: stream[best + 1][0], v: stream[best + 1][1] });
  const along = Math.atan2(s1.x - s0.x, s1.z - s0.z);
  const angle = along + Math.PI / 2;
  const planks: Mesh[] = [];
  const rails: Mesh[] = [];
  const length = 2.8;
  const width = 1.4;
  const ux = Math.sin(angle);
  const uz = Math.cos(angle);
  for (let d = -length / 2; d <= length / 2; d += 0.3) {
    const plank = MeshBuilder.CreateBox('bridge-plank', { width, height: 0.08, depth: 0.27 }, scene);
    plank.rotation.y = angle;
    plank.position.set(center.x + ux * d, 0.0, center.z + uz * d);
    planks.push(plank);
  }
  for (const side of [-1, 1]) {
    const ox = uz * side * (width / 2);
    const oz = -ux * side * (width / 2);
    const rail = MeshBuilder.CreateBox('bridge-rail', { width: 0.1, height: 0.08, depth: length + 0.3 }, scene);
    rail.rotation.y = angle;
    rail.position.set(center.x + ox, 0.62, center.z + oz);
    rails.push(rail);
    for (const d of [-length / 2, 0, length / 2]) {
      const post = MeshBuilder.CreateBox('bridge-post', { width: 0.13, height: 0.75, depth: 0.13 }, scene);
      post.position.set(center.x + ox + ux * d, 0.3, center.z + oz + uz * d);
      rails.push(post);
    }
  }
  const out: { dispose(): void }[] = [];
  const deck = Mesh.MergeMeshes(planks, true, true);
  const railing = Mesh.MergeMeshes(rails, true, true);
  if (deck) {
    const wood = plainMaterial(scene, 'island3d-bridge-wood', Color3.FromHexString('#86684c'), LIGHT);
    deck.material = wood;
    deck.isPickable = false;
    out.push(deck, wood);
  }
  if (railing) {
    const lacquer = plainMaterial(scene, 'island3d-bridge-rail', Color3.FromHexString('#a8443a'), LIGHT);
    railing.material = lacquer;
    railing.isPickable = false;
    out.push(railing, lacquer);
  }
  return out;
}
