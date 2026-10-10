import '@babylonjs/loaders/glTF';
import {
  Camera,
  Color3,
  Color4,
  Constants,
  DirectionalLight,
  DynamicTexture,
  FreeCamera,
  HemisphericLight,
  ImageProcessingConfiguration,
  LoadAssetContainerAsync,
  Matrix,
  Mesh,
  MeshBuilder,
  PointLight,
  Quaternion,
  RenderTargetTexture,
  ShadowGenerator,
  StandardMaterial,
  Texture,
  Vector3,
  type Scene,
} from '@babylonjs/core';
import { drawRadial } from './textures';

/**
 * Prototype « HD-2D » : l'arène est construite en vraie 3D (modèles KayKit Dungeon, CC0, dans public/models)
 * autour des personnages peints, qui restent des images tournées vers la caméra. Lumières et ombres portées donnent
 * la profondeur. La logique du jeu ne change pas : l'arène reste un carré de `arenaHalfSize`, le décor 3D est
 * purement visuel.
 *
 * Le sol couvre presque tout l'écran : l'éclairer à chaque image (lumières, ombres) coûtait trop cher aux petites
 * cartes graphiques. Il est donc éclairé une seule fois, vu de dessus, dans une texture (« cuisson ») ; les flammes
 * y ajoutent ensuite un halo qui vacille. Murs et accessoires, qui couvrent peu de pixels, restent éclairés en direct.
 */

const MODELS = `${import.meta.env.BASE_URL}models/kaykit-dungeon/`;

/** Les modèles KayKit sont à l'échelle de personnages de 2,5 m : à 0,5, une grande dalle fait 2 unités. */
const KIT_SCALE = 0.5;
/** Les murs sont un peu étirés en hauteur pour dominer les héros (1,75 unité). */
const WALL_HEIGHT_SCALE = 1.1;
const TILE = 4 * KIT_SCALE;
/** Demi-côté de la plateforme : l'arène (9) et une bordure où se dressent les lanternes. */
const PLATFORM_HALF = 12;
/** Taille de la texture où cuit l'éclairage du sol (environ 85 pixels par unité). */
const BAKE_SIZE = 2048;

/** Arènes construites en 3D : le Palais ici, les Rizières dans rizieres3d.ts. */
export type Arena3dKind = 'palais' | 'rizieres' | 'yomi';

/** Teinte de chaque famille de pièces : dallage, murs, accessoires, et fondations du bas, presque dans le noir. */
type Finish = 'floor' | 'wall' | 'prop' | 'deep';

const FINISHES: Record<Finish, Color3> = {
  floor: new Color3(0.78, 0.7, 0.92),
  wall: new Color3(0.72, 0.66, 0.88),
  prop: new Color3(1, 0.95, 1),
  deep: new Color3(0.32, 0.27, 0.42),
};

interface Placement {
  model: string;
  finish?: Finish;
  x: number;
  y?: number;
  z: number;
  /** Rotation autour de la verticale, en quarts de tour. */
  turn?: number;
  scale?: [number, number, number];
  shadow?: boolean;
}

interface Flicker {
  light: PointLight;
  base: number;
  phase: number;
  /** Halo posé sur le sol cuit, qui vacille avec la flamme. */
  glow: StandardMaterial;
}

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x1_0000_0000;
  };
}

export class Arena3d {
  private readonly meshes: Mesh[] = [];
  private readonly flickers: Flicker[] = [];
  /** Dallage en modèles 3D : il ne sert qu'à la cuisson, puis il est masqué. */
  private readonly floor: Mesh[] = [];
  private readonly disposables: { dispose(): void }[] = [];
  private shadows: ShadowGenerator | null;
  private time = 0;

  private constructor(
    private readonly scene: Scene,
    private readonly lights: (HemisphericLight | DirectionalLight | PointLight)[],
    shadows: ShadowGenerator,
    private readonly materials: Record<Finish, StandardMaterial>,
    private readonly glowTexture: DynamicTexture,
  ) {
    this.shadows = shadows;
  }

  static async build(scene: Scene, lanterns: { x: number; z: number }[]): Promise<Arena3d> {
    const sky = Color3.FromHexString('#2e2733');
    scene.clearColor = Color4.FromColor3(sky.scale(0.7), 1);

    // Lumière du Yomi : un ciel violet sombre, une lune froide venue du côté de la caméra, qui éclaire les murs du fond
    // et le flanc de la plateforme, et jette les ombres vers le fond de l'arène.
    const ambient = new HemisphericLight('arena3d-ambient', new Vector3(0, 1, 0), scene);
    ambient.intensity = 0.42;
    ambient.diffuse = new Color3(0.72, 0.66, 0.92);
    ambient.groundColor = new Color3(0.22, 0.18, 0.3);
    ambient.specular = Color3.Black();

    const moon = new DirectionalLight('arena3d-moon', new Vector3(0.5, -1, 0.3).normalize(), scene);
    moon.position = new Vector3(-20, 30, -12);
    moon.intensity = 0.8;
    moon.diffuse = new Color3(0.78, 0.8, 1);
    moon.specular = Color3.Black();

    // Les ombres ne servent qu'à la cuisson du sol : le générateur est libéré ensuite.
    const shadows = new ShadowGenerator(2048, moon);
    shadows.usePercentageCloserFiltering = true;
    shadows.filteringQuality = ShadowGenerator.QUALITY_HIGH;
    shadows.bias = 0.004;
    shadows.normalBias = 0.02;
    shadows.darkness = 0.15;

    const atlas = new Texture(`${MODELS}dungeon_texture.png`, scene, false, false);
    const materials = Object.fromEntries(
      (Object.keys(FINISHES) as Finish[]).map((finish) => {
        const material = new StandardMaterial(`arena3d-${finish}`, scene);
        material.diffuseTexture = atlas;
        material.diffuseColor = FINISHES[finish];
        material.specularColor = Color3.Black();
        material.maxSimultaneousLights = 8;
        return [finish, material];
      }),
    ) as Record<Finish, StandardMaterial>;

    const glowTexture = new DynamicTexture('arena3d-glow', drawRadial(), scene, true);
    glowTexture.hasAlpha = true;
    glowTexture.update();

    const arena = new Arena3d(scene, [ambient, moon], shadows, materials, glowTexture);
    await arena.buildPalais(lanterns);
    await arena.bakeFloor();
    // Vignettage calculé dans les matériaux 3D eux-mêmes : aucune passe d'écran en plus.
    const processing = scene.imageProcessingConfiguration;
    processing.vignetteEnabled = true;
    processing.vignetteWeight = 1.6;
    processing.vignetteColor = new Color4(0.12, 0.06, 0.18, 1);
    processing.vignetteBlendMode = ImageProcessingConfiguration.VIGNETTEMODE_MULTIPLY;
    return arena;
  }

  update(dt: number): void {
    this.time += dt;
    for (const f of this.flickers) {
      const t = this.time * 7 + f.phase;
      const wave = 0.08 * Math.sin(t) + 0.06 * Math.sin(t * 2.7 + 1.3);
      f.light.intensity = f.base * (0.86 + wave);
      f.glow.alpha = 0.16 + wave * 1.4;
    }
  }

  dispose(): void {
    this.scene.imageProcessingConfiguration.vignetteEnabled = false;
    this.shadows?.dispose();
    for (const light of this.lights) light.dispose();
    for (const mesh of this.meshes) mesh.dispose();
    for (const item of this.disposables) item.dispose();
    for (const f of this.flickers) f.glow.dispose();
    this.glowTexture.dispose();
    const [first, ...others] = Object.values(this.materials);
    for (const material of others) material.dispose();
    first.dispose(true, true);
  }

  /**
   * Éclaire le dallage une fois, vu de dessus, dans une texture ; le remplace par un seul plan qui affiche cette
   * texture sans calcul de lumière. Les ombres portées des murs et des colonnes y restent, figées.
   */
  private async bakeFloor(): Promise<void> {
    const half = PLATFORM_HALF;
    const camera = new FreeCamera('arena3d-bake-camera', new Vector3(0, 30, 0), this.scene);
    camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
    camera.orthoLeft = -half;
    camera.orthoRight = half;
    camera.orthoTop = half;
    camera.orthoBottom = -half;
    camera.minZ = 1;
    camera.maxZ = 60;
    camera.upVector = new Vector3(0, 0, 1);
    camera.setTarget(Vector3.Zero());

    const bake = new RenderTargetTexture('arena3d-floor-bake', BAKE_SIZE, this.scene, { generateMipMaps: true });
    bake.activeCamera = camera;
    bake.renderList = this.floor;
    bake.clearColor = new Color4(0, 0, 0, 1);
    bake.wrapU = Texture.CLAMP_ADDRESSMODE;
    bake.wrapV = Texture.CLAMP_ADDRESSMODE;
    // On cuit sur quelques images, une fois les shaders compilés (sinon les dalles manquent) ; la carte des ombres se
    // calcule avant les textures de la scène, elle est donc prête à chaque fois. La texture garde la dernière image.
    await this.scene.whenReadyAsync();
    this.scene.customRenderTargets.push(bake);
    for (let i = 0; i < 3; i++) await new Promise<void>((resolve) => bake.onAfterRenderObservable.addOnce(() => resolve()));
    this.scene.customRenderTargets.splice(this.scene.customRenderTargets.indexOf(bake), 1);
    camera.dispose();

    for (const mesh of this.floor) mesh.setEnabled(false);
    this.shadows?.dispose();
    this.shadows = null;

    const plane = MeshBuilder.CreateGround('arena3d-floor', { width: half * 2, height: half * 2 }, this.scene);
    const material = new StandardMaterial('arena3d-floor-baked', this.scene);
    material.disableLighting = true;
    material.emissiveTexture = bake;
    material.diffuseColor = Color3.Black();
    material.specularColor = Color3.Black();
    plane.material = material;
    plane.isPickable = false;
    this.disposables.push(plane, material, bake);
  }

  // --- Construction -----------------------------------------------------------

  private async buildPalais(lanterns: { x: number; z: number }[]): Promise<void> {
    const random = rng(7);
    const placements: Placement[] = [];
    const edge = PLATFORM_HALF - TILE / 2;

    // Dallage : grandes dalles, quelques carrés de petites dalles abîmées pour casser la répétition.
    const smalls = ['floor_tile_small', 'floor_tile_small', 'floor_tile_small_broken_A', 'floor_tile_small_broken_B'];
    for (let x = -edge; x <= edge; x += TILE) {
      for (let z = -edge; z <= edge; z += TILE) {
        if (random() < 0.12) {
          for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
            placements.push({ model: smalls[Math.floor(random() * smalls.length)], x: x + (dx * TILE) / 4, z: z + (dz * TILE) / 4, turn: Math.floor(random() * 4) });
          }
        } else {
          placements.push({ model: 'floor_tile_large', x, z, turn: Math.floor(random() * 4) });
        }
      }
    }

    // Fondations sous les bords proches de la caméra (côtés -x et -z) : la plateforme flotte au-dessus du vide.
    // Leur dessus passe juste sous le sol : à la même hauteur, les deux surfaces se disputaient l'affichage.
    const sunk = (depth: number) => -2 * depth - 0.1;
    for (let i = -edge; i <= edge; i += TILE) {
      for (const depth of [1, 2]) {
        const y = sunk(depth);
        if (i > -edge) {
          const finish = depth === 1 ? 'wall' : 'deep';
          placements.push({ model: 'floor_foundation_front', finish, x: i, y, z: -edge, turn: 2, scale: [1, 1, 1] });
          placements.push({ model: 'floor_foundation_front', finish, x: -edge, y, z: i, turn: 1, scale: [1, 1, 1] });
        }
      }
    }
    for (const depth of [1, 2]) placements.push({ model: 'floor_foundation_corner', finish: depth === 1 ? 'wall' : 'deep', x: -edge, y: sunk(depth), z: -edge, turn: 1, scale: [1, 1, 1] });

    // Murs du fond (côtés +x et +z), avec un pilier sculpté tous les deux pans.
    const wallLine = PLATFORM_HALF + 0.25;
    const walls = ['wall', 'wall_arched', 'wall', 'wall_window_open', 'wall_cracked', 'wall', 'wall_arched', 'wall_broken', 'wall', 'wall_window_open', 'wall_arched', 'wall'];
    const wallScale: [number, number, number] = [KIT_SCALE, KIT_SCALE * WALL_HEIGHT_SCALE, KIT_SCALE];
    walls.forEach((model, k) => {
      const along = -edge + k * TILE;
      placements.push({ model, x: along, z: wallLine, turn: 0, scale: wallScale, shadow: true });
      placements.push({ model: walls[(k + 5) % walls.length], x: wallLine, z: along, turn: 1, scale: wallScale, shadow: true });
    });
    for (let k = 0; k <= walls.length; k += 2) {
      const along = -PLATFORM_HALF + k * TILE;
      placements.push({ model: 'pillar_decorated', x: along, z: wallLine, scale: wallScale, shadow: true });
      if (along < PLATFORM_HALF) placements.push({ model: 'pillar_decorated', x: wallLine, z: along, turn: 1, scale: wallScale, shadow: true });
    }

    // Torches sur les murs, entre les piliers.
    const torchY = 1.7;
    const torches: { x: number; z: number }[] = [];
    for (const along of [-7, 1, 9]) {
      placements.push({ model: 'torch_mounted', x: along, y: torchY, z: wallLine - 0.25, turn: 2, shadow: true });
      placements.push({ model: 'torch_mounted', x: wallLine - 0.25, y: torchY, z: along, turn: 3, shadow: true });
      torches.push({ x: along, z: wallLine - 0.6 }, { x: wallLine - 0.6, z: along });
    }

    // Bordure hors de l'arène : colonnes brisées, éboulis et bougies, côté proche et dans les coins.
    for (const [x, z] of [[-10.6, -6], [-10.6, 3], [-4, -10.6], [5, -10.6], [-10.6, -10.6]]) {
      placements.push({ model: 'column', x, z, scale: [0.7, 0.55 + random() * 0.35, 0.7], shadow: true });
    }
    placements.push({ model: 'rubble_half', x: 8.5, z: 10.8, turn: 0, scale: [0.4, 0.3, 0.4], shadow: true });
    placements.push({ model: 'rubble_half', x: 10.8, z: -9.5, turn: 1, scale: [0.4, 0.3, 0.4], shadow: true });
    for (const [x, z] of [[-10.2, 7.5], [7.5, -10.2], [10.4, 10.4], [-7.5, 10.6], [10.6, -7.5]]) {
      placements.push({ model: 'candle_triple', x, z, turn: Math.floor(random() * 4), scale: [0.9, 0.9, 0.9] });
    }

    await this.instantiate(placements);

    // Lumières chaudes : torches et lanternes du décor peint (src/data/dungeons.json).
    for (const t of torches) this.addFlame(t.x, torchY + 0.3, t.z, 1.2, 7, new Color3(1, 0.55, 0.25));
    for (const l of lanterns) this.addFlame(l.x, 1.1, l.z, 2, 9, new Color3(1, 0.62, 0.32));
  }

  private addFlame(x: number, y: number, z: number, intensity: number, range: number, color: Color3): void {
    const name = `arena3d-flame-${this.lights.length}`;
    const light = new PointLight(name, new Vector3(x, y, z), this.scene);
    light.diffuse = color;
    light.specular = Color3.Black();
    light.intensity = intensity;
    light.range = range;
    this.lights.push(light);

    const size = range * 0.55;
    const glowMesh = MeshBuilder.CreateGround(`${name}-glow`, { width: size, height: size }, this.scene);
    glowMesh.position.set(x, 0.01, z);
    glowMesh.isPickable = false;
    const glow = new StandardMaterial(`${name}-glow`, this.scene);
    glow.disableLighting = true;
    glow.emissiveColor = color;
    glow.opacityTexture = this.glowTexture;
    // Addition : le halo éclaircit le sol sans le recouvrir.
    glow.alphaMode = Constants.ALPHA_ADD;
    glow.disableDepthWrite = true;
    glowMesh.material = glow;
    this.meshes.push(glowMesh);
    this.flickers.push({ light, base: intensity, phase: Math.random() * 10, glow });
  }

  /** Une géométrie par modèle et par teinte, posée en instances légères (thin instances) : quelques appels de dessin pour toute l'arène. */
  private async instantiate(placements: Placement[]): Promise<void> {
    const groups = new Map<string, { model: string; finish: Finish; list: Placement[] }>();
    for (const p of placements) {
      const finish = p.finish ?? (p.model.startsWith('floor_tile') ? 'floor' : /^(wall|pillar|floor_foundation)/.test(p.model) ? 'wall' : 'prop');
      const key = `${p.model}|${finish}`;
      const group = groups.get(key) ?? { model: p.model, finish, list: [] };
      group.list.push(p);
      groups.set(key, group);
    }
    await Promise.all(
      [...groups.values()].map(async ({ model, finish, list }) => {
        const mesh = await this.loadModel(model, this.materials[finish]);
        const floor = model.startsWith('floor_tile');
        for (const p of list) {
          const scale = new Vector3(...(p.scale ?? [KIT_SCALE, KIT_SCALE, KIT_SCALE]));
          // Le dessus des dalles (0,05 au-dessus de l'origine du modèle) tombe à y = 0, sous les marques au sol.
          const y = (p.y ?? 0) - (floor ? 0.05 * scale.y : 0);
          const matrix = Matrix.Compose(scale, Quaternion.RotationAxis(Vector3.Up(), ((p.turn ?? 0) * Math.PI) / 2), new Vector3(p.x, y, p.z));
          mesh.thinInstanceAdd(matrix, false);
        }
        mesh.thinInstanceBufferUpdated('matrix');
        mesh.thinInstanceRefreshBoundingInfo(true);
        // Seul le dallage reçoit les ombres, et seulement pendant la cuisson.
        if (floor) {
          mesh.receiveShadows = true;
          this.floor.push(mesh);
        }
        if (list.some((p) => p.shadow)) this.shadows?.addShadowCaster(mesh);
      }),
    );
  }

  private async loadModel(model: string, material: StandardMaterial): Promise<Mesh> {
    const container = await LoadAssetContainerAsync(`${MODELS}${model}.gltf`, this.scene);
    container.addAllToScene();
    const mesh = container.meshes.find((m): m is Mesh => m instanceof Mesh && m.getTotalVertices() > 0);
    if (!mesh) throw new Error(`Modèle vide : ${model}`);
    // On garde la géométrie dans le repère du monde (le nœud racine du glTF corrige l'orientation), sans parent.
    mesh.setParent(null);
    mesh.bakeCurrentTransformIntoVertices();
    for (const node of container.meshes) if (node !== mesh) node.dispose();
    for (const mat of container.materials) mat.dispose(true, true);
    for (const tex of container.textures) tex.dispose();
    mesh.material = material;
    mesh.isPickable = false;
    mesh.alwaysSelectAsActiveMesh = true;
    this.meshes.push(mesh);
    return mesh;
  }
}
