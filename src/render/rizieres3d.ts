import { Color3, Curve3, Mesh, MeshBuilder, Vector3, type Scene } from '@babylonjs/core';
import {
  ModelKit,
  Water,
  buildTerrain,
  fbm,
  hidesWalkable,
  noise,
  plainMaterial,
  rng,
  smoothstep,
  type Lighting,
  type MeshGroup,
  type Placement,
} from './world3d';

/**
 * Arène des Rizières noyées (la Jorōgumo) en 3D : des rizières inondées, coupées de diguettes, où l'on se bat dans
 * l'eau ; autour, des talus de terre plantés d'arbres morts, reliés par des fils de soie, qui se perdent dans la brume.
 * L'arène reste le carré de `arenaHalfSize` à y = 0 : l'eau affleure juste dessous.
 */

const FOREST = `${import.meta.env.BASE_URL}models/kaykit-forest/`;
const HALF = 24;
/** Demi-côté de l'arène de combat (dungeon.json, arenaHalfSize), avec un peu de marge. */
const ARENA = 9.5;
/** Bord des rizières : au-delà commencent les talus. */
const PADDIES = 11.5;
const WATER = -0.03;
/** Côté d'une rizière, comme sur le sol peint (renderer.ts, PADDY_SIZE). */
const PADDY = 3;
/** Pas du terrain : un huitième de rizière. */
const STEP = PADDY / 8;

const LIGHT: Lighting = {
  sun: new Vector3(-0.4, 1, -0.5),
  sunColor: new Color3(0.32, 0.31, 0.3),
  sky: new Color3(0.8, 0.82, 0.84),
  ground: new Color3(0.42, 0.42, 0.44),
  fog: Color3.FromHexString('#c3cbcf'),
  fogCenter: [0, 0],
  fogRange: [14, 34],
};

const COLORS = {
  mud: Color3.FromHexString('#5f5a49'),
  dike: Color3.FromHexString('#6a6f52'),
  bank: Color3.FromHexString('#7d8569'),
  bankDark: Color3.FromHexString('#5d6450'),
  path: Color3.FromHexString('#a49a82'),
  rock: Color3.FromHexString('#8c8f8a'),
};

/** Distance « carrée » au centre, arrondie aux coins. */
function squareDistance(x: number, z: number): number {
  const ax = Math.abs(x);
  const az = Math.abs(z);
  return Math.max(ax, az) + 0.15 * Math.min(ax, az) * smoothstep(PADDIES - 3, PADDIES + 3, Math.max(ax, az));
}

export class Rizieres3d {
  private constructor(
    private readonly parts: { dispose(): void }[],
    private readonly water: Water,
  ) {}

  /** `decor` : les décors peints de l'arène (jizō, torii), posés sur un sol plat à leur hauteur. */
  static async build(scene: Scene, decor: readonly { sprite: string; x: number; z: number }[]): Promise<Rizieres3d> {
    const random = rng(23);
    // Sol plat sous les décors peints : un chemin de terre sous la rangée de jizō, un tertre sous le torii.
    const flats = decor.map((d) => ({ x: d.x, z: d.z, r: d.sprite === 'torii' ? 2.6 : 0.9 }));

    // Les diguettes font une case de la grille du terrain (STEP), alignée sur les rizières : des bords nets.
    const isDike = (x: number, z: number, width = STEP) => {
      const gx = (((x + PADDY / 2) % PADDY) + PADDY) % PADDY;
      const gz = (((z + PADDY / 2) % PADDY) + PADDY) % PADDY;
      return gx < width || gz < width;
    };
    const flatness = (x: number, z: number) => {
      let best = 0;
      for (const f of flats) best = Math.max(best, 1 - smoothstep(f.r * 0.7, f.r + 0.8, Math.hypot(x - f.x, z - f.z)));
      return best;
    };
    const height = (x: number, z: number): number => {
      const d = squareDistance(x, z);
      const paddy = isDike(x, z, STEP * 1.05) ? 0.05 : -0.14;
      const bank = 0.25 + 1.4 * fbm(x * 0.12 + 4, z * 0.12 + 1) + 0.25 * noise(x * 0.8, z * 0.8);
      const t = smoothstep(PADDIES - 0.5, PADDIES + 2.5, d);
      const h = paddy * (1 - t) + bank * t;
      return h * (1 - flatness(x, z));
    };
    const color = (x: number, z: number, y: number, slope: number): Color3 => {
      const grain = noise(x * 1.6, z * 1.6);
      if (flatness(x, z) > 0.6) return Color3.Lerp(COLORS.path, COLORS.bank, grain * 0.3);
      if (y < -0.04) return Color3.Lerp(COLORS.mud, COLORS.bankDark, grain * 0.25);
      if (slope > 0.45) return Color3.Lerp(COLORS.rock, COLORS.bankDark, grain * 0.4);
      if (squareDistance(x, z) < PADDIES) return Color3.Lerp(COLORS.dike, COLORS.bankDark, grain * 0.3);
      return Color3.Lerp(COLORS.bank, COLORS.bankDark, fbm(x * 0.3, z * 0.3) + grain * 0.15);
    };

    // --- Végétation (avant le sol : les arbres y projettent leur ombre) ---
    const bare: Placement[] = [];
    const reeds: Placement[] = [];
    const rice: Placement[] = [];
    const rocks: Placement[] = [];
    const bushes: Placement[] = [];
    const tops: Vector3[] = [];
    for (let x = -HALF + 1; x < HALF - 1; x += 1.4) {
      for (let z = -HALF + 1; z < HALF - 1; z += 1.4) {
        const px = x + (random() - 0.5);
        const pz = z + (random() - 0.5);
        const d = squareDistance(px, pz);
        if (flatness(px, pz) > 0.05) continue;
        const y = height(px, pz);
        if (d > PADDIES + 1.5) {
          const r = random();
          const tall = random() < 0.15;
          const scale = tall ? 0.45 + random() * 0.15 : 0.7 + random() * 0.4;
          const treeHeight = (tall ? 9.5 : 5) * scale;
          if (r < 0.16 * (0.5 + fbm(px * 0.2, pz * 0.2)) && !hidesWalkable(px, pz, treeHeight, (x, z) => squareDistance(x, z) < ARENA)) {
            const model = tall ? 'Tree_Bare_2_C' : random() < 0.5 ? 'Tree_Bare_1_B' : 'Tree_Bare_2_A';
            bare.push({ model, x: px, y: y - 0.1, z: pz, angle: random() * 6.3, scale });
            tops.push(new Vector3(px, y + treeHeight * 0.45, pz));
          } else if (r < 0.32) {
            reeds.push({ model: random() < 0.5 ? 'Grass_2_C' : 'Grass_2_D', x: px, y: y - 0.05, z: pz, angle: random() * 6.3, scale: 0.9 + random() * 0.5 });
          } else if (r < 0.4) {
            rocks.push({ model: random() < 0.6 ? 'Rock_1_A' : 'Rock_1_E', x: px, y: y - 0.05, z: pz, angle: random() * 6.3, scale: 0.8 + random() * 0.9 });
          } else if (r < 0.46) {
            bushes.push({ model: 'Bush_1_C', x: px, y, z: pz, angle: random() * 6.3, scale: 0.8 + random() * 0.8 });
          }
        } else if (d > 9.6 && d < PADDIES && !isDike(px, pz)) {
          // Riz qui pousse encore au bord des rizières, hors de l'arène de combat.
          for (let k = 0; k < 4; k++) {
            rice.push({ model: 'Grass_2_A', x: px + (random() - 0.5) * 0.9, y: -0.14, z: pz + (random() - 0.5) * 0.9, angle: random() * 6.3, scale: [0.7, 0.45 + random() * 0.2, 0.7] });
          }
        }
      }
    }

    const sun = LIGHT.sun.normalizeToNew();
    const shade = (x: number, z: number) => {
      let s = 0;
      for (const top of tops) {
        const dx = x - (top.x - (sun.x / sun.y) * top.y * 0.7);
        const dz = z - (top.z - (sun.z / sun.y) * top.y * 0.7);
        s = Math.max(s, 1 - smoothstep(0.3, 1.1, Math.hypot(dx, dz)));
      }
      return s * 0.7;
    };

    const terrain: MeshGroup = buildTerrain(scene, 'rizieres3d-terrain', { minX: -HALF, maxX: HALF, minZ: -HALF, maxZ: HALF, step: STEP, height, color, shade }, LIGHT);
    const water = new Water(
      scene,
      'rizieres3d-water',
      {
        minX: -HALF,
        maxX: HALF,
        minZ: -HALF,
        maxZ: HALF,
        step: 0.5,
        level: (x, z) => (squareDistance(x, z) < PADDIES + 3 ? WATER : null),
        bottom: height,
        shallow: Color3.FromHexString('#a9b9b4'),
        deep: Color3.FromHexString('#56706c'),
        depth: 0.5,
        minAlpha: 0.7,
      },
      LIGHT,
    );

    // --- Fils de soie de la Jorōgumo, tendus entre les arbres morts voisins ---
    const silk: Mesh[] = [];
    for (let i = 0; i < tops.length; i++) {
      for (let j = i + 1; j < tops.length; j++) {
        const span = Vector3.Distance(tops[i], tops[j]);
        if (span < 2 || span > 4 || random() > 0.3) continue;
        const mid = tops[i].add(tops[j]).scale(0.5);
        mid.y -= span * 0.18;
        const curve = Curve3.CreateQuadraticBezier(tops[i], mid, tops[j], 12);
        silk.push(MeshBuilder.CreateTube('silk', { path: curve.getPoints(), radius: 0.012, tessellation: 3 }, scene));
      }
    }
    const parts: { dispose(): void }[] = [terrain];
    const thread = Mesh.MergeMeshes(silk, true, true);
    if (thread) {
      const material = plainMaterial(scene, 'rizieres3d-silk', new Color3(0.95, 0.95, 1), LIGHT);
      thread.material = material;
      thread.isPickable = false;
      parts.push(thread, material);
    }

    const kit = new ModelKit(scene, FOREST, 'forest_yomi.png', LIGHT);
    parts.push(kit);
    const groups = new Map<string, Placement[]>();
    for (const p of [...bare, ...reeds, ...rice, ...rocks, ...bushes]) groups.set(p.model, [...(groups.get(p.model) ?? []), p]);
    const tints: Record<string, Color3> = {
      Tree_Bare_1_B: new Color3(0.72, 0.68, 0.78),
      Tree_Bare_2_A: new Color3(0.72, 0.68, 0.78),
      Tree_Bare_2_C: new Color3(0.72, 0.68, 0.78),
      Grass_2_A: new Color3(1.1, 1.08, 0.72),
      Grass_2_C: new Color3(0.95, 0.92, 0.7),
      Grass_2_D: new Color3(0.95, 0.92, 0.7),
      Bush_1_C: new Color3(0.8, 0.8, 0.75),
    };
    await Promise.all([...groups].map(([model, list]) => kit.place(`${model}_Color1`, list, tints[model])));
    return new Rizieres3d(parts, water);
  }

  update(dt: number): void {
    this.water.update(dt);
  }

  dispose(): void {
    for (const part of this.parts) part.dispose();
    this.water.dispose();
  }
}
