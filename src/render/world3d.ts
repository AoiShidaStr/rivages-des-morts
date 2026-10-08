import '@babylonjs/loaders/glTF';
import '@babylonjs/core/Shaders/ShadersInclude/instancesDeclaration';
import '@babylonjs/core/Shaders/ShadersInclude/instancesVertex';
import {
  Color3,
  DynamicTexture,
  Effect,
  LoadAssetContainerAsync,
  Matrix,
  Mesh,
  Quaternion,
  ShaderMaterial,
  Texture,
  Vector3,
  Vector4,
  VertexData,
  type Scene,
} from '@babylonjs/core';

/**
 * Socle commun des scènes en 3D (île, arènes) : relief généré par le code, eau, modèles posés en instances.
 *
 * Tout est éclairé « par sommet » : le terrain une seule fois, à la construction (couleurs des sommets), les modèles
 * dans le shader de sommets. Les pixels ne font presque aucun calcul, ce qui tient la cadence sur les petites cartes
 * graphiques (le sol couvre tout l'écran). Pas de lumières Babylon : un soleil et un ciel décrits par `Lighting`.
 */

export interface Lighting {
  /** Direction vers le soleil (normalisée à la construction). */
  sun: Vector3;
  sunColor: Color3;
  sky: Color3;
  ground: Color3;
  /** Brume : couleur, centre (x, z) et distances où elle commence et recouvre tout. */
  fog: Color3;
  fogCenter: [number, number];
  fogRange: [number, number];
}

// --- Bruit -------------------------------------------------------------------

function hash2(x: number, z: number): number {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Bruit de valeur lissé, entre 0 et 1. */
export function noise(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const u = fx * fx * (3 - 2 * fx);
  const v = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Trois octaves de bruit, entre 0 et 1. */
export function fbm(x: number, z: number): number {
  return (noise(x, z) * 4 + noise(x * 2.1 + 5.2, z * 2.1 + 1.3) * 2 + noise(x * 4.3 + 9.1, z * 4.3 + 7.7)) / 7;
}

export function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Direction « haut de l'écran » au sol : un objet haut posé avant un point, dans cette direction, le cache. */
const SCREEN_UP = { x: Math.SQRT1_2, z: Math.SQRT1_2 };

/**
 * Vrai si un objet de cette hauteur, posé en (x, z), masquerait une zone où l'on marche ou combat
 * (`walkable`) : vue de la caméra, il se dresse par-dessus ce qui est juste derrière lui.
 */
export function hidesWalkable(x: number, z: number, height: number, walkable: (x: number, z: number) => boolean): boolean {
  for (let k = 0.8; k <= height * 0.85; k += 0.6) {
    if (walkable(x + SCREEN_UP.x * k, z + SCREEN_UP.z * k)) return true;
  }
  return false;
}

export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x1_0000_0000;
  };
}

/** Distance d'un point à une ligne brisée. */
export function distToPolyline(x: number, z: number, line: readonly (readonly [number, number])[]): number {
  let best = Infinity;
  for (let i = 0; i + 1 < line.length; i++) {
    const [ax, az] = line[i];
    const [bx, bz] = line[i + 1];
    const dx = bx - ax;
    const dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}

// --- Shaders -----------------------------------------------------------------

/** Brume calculée par sommet : sa part (0 à 1) selon la distance au centre de la scène. */
const FOG_VERTEX = `
  uniform vec4 fogParams;
  float fogAmount(vec3 world) {
    return smoothstep(fogParams.z, fogParams.w, length(world.xz - fogParams.xy));
  }`;

function registerShaders(): void {
  if (Effect.ShadersStore.world3dTerrainVertexShader) return;

  // Terrain : la couleur éclairée est déjà dans les sommets ; les pixels ne font que la recopier.
  Effect.ShadersStore.world3dTerrainVertexShader = `
    precision highp float;
    attribute vec3 position;
    attribute vec4 color;
    uniform mat4 world;
    uniform mat4 viewProjection;
    uniform vec3 fogColor;
    ${FOG_VERTEX}
    varying vec3 vColor;
    void main(void) {
      vec4 p = world * vec4(position, 1.0);
      vColor = mix(color.rgb, fogColor, fogAmount(p.xyz));
      gl_Position = viewProjection * p;
    }`;
  Effect.ShadersStore.world3dTerrainFragmentShader = `
    precision highp float;
    varying vec3 vColor;
    void main(void) {
      gl_FragColor = vec4(vColor, 1.0);
    }`;

  // Modèles : texture de dégradés KayKit, éclairage ciel + soleil et brume calculés par sommet, instances.
  Effect.ShadersStore.world3dModelVertexShader = `
    precision highp float;
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec2 uv;
    #include<instancesDeclaration>
    uniform mat4 viewProjection;
    uniform vec3 sunDir;
    uniform vec3 sunColor;
    uniform vec3 skyColor;
    uniform vec3 groundColor;
    uniform vec3 tint;
    ${FOG_VERTEX}
    varying vec2 vUV;
    varying vec3 vLight;
    varying float vFog;
    void main(void) {
      #include<instancesVertex>
      vec4 p = finalWorld * vec4(position, 1.0);
      vec3 n = normalize(mat3(finalWorld) * normal);
      vec3 hemi = mix(groundColor, skyColor, n.y * 0.5 + 0.5);
      vLight = (hemi + sunColor * max(dot(n, sunDir), 0.0)) * tint;
      vUV = uv;
      vFog = fogAmount(p.xyz);
      gl_Position = viewProjection * p;
    }`;
  Effect.ShadersStore.world3dModelFragmentShader = `
    precision highp float;
    varying vec2 vUV;
    varying vec3 vLight;
    varying float vFog;
    uniform sampler2D albedo;
    uniform vec3 fogColor;
    void main(void) {
      gl_FragColor = vec4(mix(texture2D(albedo, vUV).rgb * vLight, fogColor, vFog), 1.0);
    }`;

  // Eau : couleur et transparence selon la profondeur (dans les sommets), houle et reflets calculés par sommet
  // (l'eau couvre parfois tout l'écran : le calcul par pixel coûtait trop cher aux petites cartes graphiques).
  Effect.ShadersStore.world3dWaterVertexShader = `
    precision highp float;
    attribute vec3 position;
    attribute vec4 color;
    uniform mat4 world;
    uniform mat4 viewProjection;
    uniform float time;
    uniform vec3 glint;
    uniform vec3 fogColor;
    uniform vec4 fogParams;
    varying vec4 vColor;
    void main(void) {
      vec4 p = world * vec4(position, 1.0);
      float a = sin(p.x * 0.9 + time * 0.6 + sin(p.z * 0.7 + time * 0.4) * 1.6);
      float b = sin(p.z * 1.1 - time * 0.5 + sin(p.x * 0.5 - time * 0.3) * 1.9);
      float swell = a * b;
      vec3 c = color.rgb * (0.94 + 0.06 * swell) + glint * smoothstep(0.6, 1.0, swell) * 0.08;
      float f = smoothstep(fogParams.z, fogParams.w, length(p.xz - fogParams.xy));
      vColor = vec4(mix(c, fogColor, f), color.a);
      gl_Position = viewProjection * p;
    }`;
  Effect.ShadersStore.world3dWaterFragmentShader = `
    precision highp float;
    varying vec4 vColor;
    void main(void) {
      if (vColor.a < 0.01) discard;
      gl_FragColor = vColor;
    }`;
}

function setLighting(material: ShaderMaterial, light: Lighting): void {
  material.setVector3('sunDir', light.sun.normalizeToNew());
  material.setColor3('sunColor', light.sunColor);
  material.setColor3('skyColor', light.sky);
  material.setColor3('groundColor', light.ground);
}

function setFog(material: ShaderMaterial, light: Lighting): void {
  material.setColor3('fogColor', light.fog);
  material.setVector4('fogParams', new Vector4(light.fogCenter[0], light.fogCenter[1], light.fogRange[0], light.fogRange[1]));
}

// --- Terrain -----------------------------------------------------------------

export interface TerrainSpec {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  step: number;
  height(x: number, z: number): number;
  /** Couleur du sol à cet endroit (avant éclairage). */
  color(x: number, z: number, y: number, slope: number): Color3;
  /** Ombre portée (0 : plein soleil, 1 : à l'ombre), facultative. */
  shade?(x: number, z: number): number;
}

/** Taille des morceaux de terrain et d'eau (en cases) : ceux hors du champ de la caméra ne sont pas dessinés. */
const CHUNK = 24;

/** Plusieurs maillages qui partagent un matériau, libérés ensemble. */
export class MeshGroup {
  constructor(
    readonly meshes: Mesh[],
    readonly material: ShaderMaterial,
  ) {}

  dispose(): void {
    for (const mesh of this.meshes) mesh.dispose();
    this.material.dispose();
  }
}

/**
 * Relief à facettes : chaque triangle a sa couleur, éclairée une fois pour toutes (ciel, soleil, ombres).
 * Découpé en morceaux pour que la caméra n'en dessine que la partie visible.
 */
export function buildTerrain(scene: Scene, name: string, spec: TerrainSpec, light: Lighting): MeshGroup {
  registerShaders();
  const nx = Math.ceil((spec.maxX - spec.minX) / spec.step);
  const nz = Math.ceil((spec.maxZ - spec.minZ) / spec.step);
  const heights = new Float32Array((nx + 1) * (nz + 1));
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) heights[j * (nx + 1) + i] = spec.height(spec.minX + i * spec.step, spec.minZ + j * spec.step);
  }
  const sun = light.sun.normalizeToNew();
  const material = new ShaderMaterial(`${name}-material`, scene, { vertex: 'world3dTerrain', fragment: 'world3dTerrain' }, {
    attributes: ['position', 'color'],
    uniforms: ['world', 'viewProjection', 'fogColor', 'fogParams'],
  });
  setFog(material, light);
  material.backFaceCulling = false;
  // Tous les maillages de ce matériau sont pareils : inutile de revérifier sa configuration à chaque image.
  material.checkReadyOnlyOnce = true;

  const corner = (i: number, j: number) => new Vector3(spec.minX + i * spec.step, heights[j * (nx + 1) + i], spec.minZ + j * spec.step);
  const meshes: Mesh[] = [];
  for (let cj = 0; cj < nz; cj += CHUNK) {
    for (let ci = 0; ci < nx; ci += CHUNK) {
      const wi = Math.min(CHUNK, nx - ci);
      const wj = Math.min(CHUNK, nz - cj);
      const positions = new Float32Array(wi * wj * 18);
      const colors = new Float32Array(wi * wj * 24);
      let p = 0;
      let c = 0;
      const face = (a: Vector3, b: Vector3, d: Vector3) => {
        const n = Vector3.Cross(d.subtract(a), b.subtract(a)).normalize();
        if (n.y < 0) n.scaleInPlace(-1);
        const cx = (a.x + b.x + d.x) / 3;
        const cz = (a.z + b.z + d.z) / 3;
        const cy = (a.y + b.y + d.y) / 3;
        const albedo = spec.color(cx, cz, cy, 1 - n.y);
        const shade = spec.shade ? spec.shade(cx, cz) : 0;
        const direct = Math.max(0, Vector3.Dot(n, sun)) * (1 - 0.75 * shade);
        const hemi = n.y * 0.5 + 0.5;
        const r = albedo.r * (light.ground.r + (light.sky.r - light.ground.r) * hemi + light.sunColor.r * direct);
        const g = albedo.g * (light.ground.g + (light.sky.g - light.ground.g) * hemi + light.sunColor.g * direct);
        const bl = albedo.b * (light.ground.b + (light.sky.b - light.ground.b) * hemi + light.sunColor.b * direct);
        for (const v of [a, b, d]) {
          positions[p++] = v.x;
          positions[p++] = v.y;
          positions[p++] = v.z;
          colors[c++] = r;
          colors[c++] = g;
          colors[c++] = bl;
          colors[c++] = 1;
        }
      };
      for (let j = cj; j < cj + wj; j++) {
        for (let i = ci; i < ci + wi; i++) {
          const a = corner(i, j);
          const b = corner(i + 1, j);
          const d = corner(i, j + 1);
          const e = corner(i + 1, j + 1);
          // Diagonale alternée : les facettes ne s'alignent pas toutes dans le même sens.
          if ((i + j) % 2 === 0) {
            face(a, b, e);
            face(a, e, d);
          } else {
            face(a, b, d);
            face(b, e, d);
          }
        }
      }
      const mesh = new Mesh(`${name}-${ci}-${cj}`, scene);
      const data = new VertexData();
      data.positions = positions;
      data.colors = colors;
      data.indices = Array.from({ length: positions.length / 3 }, (_, k) => k);
      data.applyToMesh(mesh);
      mesh.material = material;
      mesh.isPickable = false;
      mesh.freezeWorldMatrix();
      meshes.push(mesh);
    }
  }
  return new MeshGroup(meshes, material);
}

// --- Eau ---------------------------------------------------------------------

export interface WaterSpec {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  step: number;
  /** Niveau de l'eau à cet endroit, ou null s'il n'y en a pas. */
  level(x: number, z: number): number | null;
  /** Hauteur du fond, pour la profondeur. */
  bottom(x: number, z: number): number;
  shallow: Color3;
  deep: Color3;
  /** Profondeur à laquelle l'eau devient sombre et opaque. */
  depth: number;
  /** Opacité de l'eau la moins profonde (les flaques des rizières restent visibles). */
  minAlpha?: number;
}

export class Water {
  private readonly group: MeshGroup;
  private readonly material: ShaderMaterial;
  private time = 0;

  constructor(scene: Scene, name: string, spec: WaterSpec, light: Lighting) {
    registerShaders();
    const nx = Math.ceil((spec.maxX - spec.minX) / spec.step);
    const nz = Math.ceil((spec.maxZ - spec.minZ) / spec.step);
    const minAlpha = spec.minAlpha ?? 0.35;
    const levels: (number | null)[] = [];
    for (let j = 0; j <= nz; j++) {
      for (let i = 0; i <= nx; i++) levels.push(spec.level(spec.minX + i * spec.step, spec.minZ + j * spec.step));
    }
    // Couleur et opacité de chaque sommet de la grille, calculées une fois.
    const vertexColor = new Map<number, [number, number, number, number]>();
    const colorOf = (i: number, j: number): [number, number, number, number] => {
      const k = j * (nx + 1) + i;
      let color = vertexColor.get(k);
      if (!color) {
        const level = levels[k] ?? 0;
        const depth = level - spec.bottom(spec.minX + i * spec.step, spec.minZ + j * spec.step);
        const t = smoothstep(0, spec.depth, depth);
        color = [
          spec.shallow.r + (spec.deep.r - spec.shallow.r) * t,
          spec.shallow.g + (spec.deep.g - spec.shallow.g) * t,
          spec.shallow.b + (spec.deep.b - spec.shallow.b) * t,
          depth <= 0 ? 0 : minAlpha + (0.95 - minAlpha) * t,
        ];
        vertexColor.set(k, color);
      }
      return color;
    };

    this.material = new ShaderMaterial(`${name}-material`, scene, { vertex: 'world3dWater', fragment: 'world3dWater' }, {
      attributes: ['position', 'color'],
      uniforms: ['world', 'viewProjection', 'time', 'glint', 'fogColor', 'fogParams'],
      needAlphaBlending: true,
    });
    this.material.setColor3('glint', light.sky.add(light.sunColor));
    this.material.setFloat('time', 0);
    setFog(this.material, light);
    this.material.backFaceCulling = false;
    this.material.disableDepthWrite = true;
    this.material.checkReadyOnlyOnce = true;

    const meshes: Mesh[] = [];
    for (let cj = 0; cj < nz; cj += CHUNK) {
      for (let ci = 0; ci < nx; ci += CHUNK) {
        const positions: number[] = [];
        const colors: number[] = [];
        const indices: number[] = [];
        const local = new Map<number, number>();
        const vertex = (i: number, j: number): number => {
          const k = j * (nx + 1) + i;
          const known = local.get(k);
          if (known !== undefined) return known;
          positions.push(spec.minX + i * spec.step, levels[k] ?? 0, spec.minZ + j * spec.step);
          colors.push(...colorOf(i, j));
          local.set(k, positions.length / 3 - 1);
          return positions.length / 3 - 1;
        };
        for (let j = cj; j < Math.min(nz, cj + CHUNK); j++) {
          for (let i = ci; i < Math.min(nx, ci + CHUNK); i++) {
            const corners = [j * (nx + 1) + i, j * (nx + 1) + i + 1, (j + 1) * (nx + 1) + i, (j + 1) * (nx + 1) + i + 1];
            if (corners.every((k) => levels[k] === null)) continue;
            // Une case entièrement à sec ne sert à rien.
            const cells = [colorOf(i, j), colorOf(i + 1, j), colorOf(i, j + 1), colorOf(i + 1, j + 1)];
            if (cells.every((color) => color[3] === 0)) continue;
            const a = vertex(i, j);
            const b = vertex(i + 1, j);
            const d = vertex(i, j + 1);
            const e = vertex(i + 1, j + 1);
            indices.push(a, e, b, a, d, e);
          }
        }
        if (indices.length === 0) continue;
        const mesh = new Mesh(`${name}-${ci}-${cj}`, scene);
        const data = new VertexData();
        data.positions = positions;
        data.colors = colors;
        data.indices = indices;
        data.applyToMesh(mesh);
        mesh.material = this.material;
        mesh.isPickable = false;
        // Dessinée avant les personnages et les décors peints, qui se trient entre eux par profondeur.
        mesh.alphaIndex = -200_000;
        mesh.hasVertexAlpha = true;
        mesh.freezeWorldMatrix();
        meshes.push(mesh);
      }
    }
    this.group = new MeshGroup(meshes, this.material);
  }

  update(dt: number): void {
    this.time += dt;
    this.material.setFloat('time', this.time);
  }

  dispose(): void {
    this.group.dispose();
  }
}

// --- Modèles ------------------------------------------------------------------

/** Côté des carrés qui regroupent les instances d'un modèle. */
const MODEL_CHUNK = 12;

export interface Placement {
  model: string;
  x: number;
  y?: number;
  z: number;
  /** Rotation autour de la verticale, en radians. */
  angle?: number;
  scale?: number | [number, number, number];
}

/**
 * Bibliothèque de modèles d'un pack KayKit (glTF + une texture de dégradés) : chaque modèle est chargé une fois,
 * puis posé en instances légères. Une teinte par modèle permet de les accorder à la scène.
 */
export class ModelKit {
  private readonly meshes: Mesh[] = [];
  private readonly materials: ShaderMaterial[] = [];
  private readonly atlas: Texture;

  constructor(
    private readonly scene: Scene,
    private readonly root: string,
    atlasFile: string,
    private readonly light: Lighting,
  ) {
    registerShaders();
    this.atlas = new Texture(`${root}${atlasFile}`, scene, false, false);
  }

  /** Pose toutes les instances d'un modèle, avec sa teinte. */
  async place(model: string, placements: readonly Placement[], tint = Color3.White()): Promise<void> {
    if (placements.length === 0) return;
    const container = await LoadAssetContainerAsync(`${this.root}${model}.gltf`, this.scene);
    container.addAllToScene();
    const parts = container.meshes.filter((m): m is Mesh => m instanceof Mesh && m.getTotalVertices() > 0);
    if (parts.length === 0) throw new Error(`Modèle vide : ${model}`);
    for (const part of parts) {
      part.setParent(null);
      part.bakeCurrentTransformIntoVertices();
    }
    const mesh = parts.length > 1 ? Mesh.MergeMeshes(parts, true, true) : parts[0];
    if (!mesh) throw new Error(`Modèle illisible : ${model}`);
    for (const node of container.meshes) if (node !== mesh && !node.isDisposed()) node.dispose();
    for (const mat of container.materials) mat.dispose(true, true);
    for (const tex of container.textures) tex.dispose();

    const material = new ShaderMaterial(`world3d-${model}`, this.scene, { vertex: 'world3dModel', fragment: 'world3dModel' }, {
      attributes: ['position', 'normal', 'uv'],
      uniforms: ['world', 'viewProjection', 'sunDir', 'sunColor', 'skyColor', 'groundColor', 'tint', 'fogColor', 'fogParams'],
      samplers: ['albedo'],
    });
    material.setTexture('albedo', this.atlas);
    material.setColor3('tint', tint);
    setLighting(material, this.light);
    setFog(material, this.light);
    material.backFaceCulling = false;
    material.checkReadyOnlyOnce = true;
    mesh.material = material;
    mesh.isPickable = false;
    this.materials.push(material);

    // Une copie du modèle par carré de terrain : la caméra ne dessine que les carrés visibles.
    const groups = new Map<string, Placement[]>();
    for (const p of placements) {
      const key = `${Math.floor(p.x / MODEL_CHUNK)},${Math.floor(p.z / MODEL_CHUNK)}`;
      groups.set(key, [...(groups.get(key) ?? []), p]);
    }
    // Chaque copie a sa propre géométrie : les positions des instances y sont rangées (une copie qui partage
    // la géométrie dessinerait les instances d'un autre carré).
    const copies = [...groups].map(([key, list], i) => {
      const target = i === 0 ? mesh : mesh.clone(`${model}-${key}`);
      if (i > 0) target.makeGeometryUnique();
      return { target, list };
    });
    for (const { target, list } of copies) {
      for (const p of list) {
        const s = p.scale ?? 1;
        const scale = typeof s === 'number' ? new Vector3(s, s, s) : new Vector3(...s);
        const matrix = Matrix.Compose(scale, Quaternion.RotationAxis(Vector3.Up(), p.angle ?? 0), new Vector3(p.x, p.y ?? 0, p.z));
        target.thinInstanceAdd(matrix, false);
      }
      target.thinInstanceBufferUpdated('matrix');
      target.thinInstanceRefreshBoundingInfo(true);
      this.meshes.push(target);
    }
  }

  dispose(): void {
    for (const mesh of this.meshes) mesh.dispose();
    for (const material of this.materials) material.dispose();
    this.atlas.dispose();
  }
}

/** Matériau simple éclairé par sommet, pour les pièces construites par le code (planches, pieux). */
export function plainMaterial(scene: Scene, name: string, color: Color3, light: Lighting): ShaderMaterial {
  registerShaders();
  const material = new ShaderMaterial(name, scene, { vertex: 'world3dModel', fragment: 'world3dModel' }, {
    attributes: ['position', 'normal', 'uv'],
    uniforms: ['world', 'viewProjection', 'sunDir', 'sunColor', 'skyColor', 'groundColor', 'tint', 'fogColor', 'fogParams'],
    samplers: ['albedo'],
  });
  const white = new DynamicTexture(`${name}-white`, { width: 1, height: 1 }, scene, false);
  const ctx = white.getContext();
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, 1, 1);
  white.update();
  material.setTexture('albedo', white);
  material.setColor3('tint', color);
  setLighting(material, light);
  setFog(material, light);
  material.checkReadyOnlyOnce = true;
  material.onDisposeObservable.addOnce(() => white.dispose());
  return material;
}
