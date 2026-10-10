import { Color3, DynamicTexture, MeshBuilder, StandardMaterial, Texture, type Mesh, type Scene } from '@babylonjs/core';
import { insidePolygon, toScreen, toWorld, type IslandData, type Polygon } from '../game/island';
import type { Vec2 } from '../game/math';
import type { DecorSpot } from './decorSprites';
import { decorSolids, islandDecor, MapImage, WalkField } from './islandDecor';
import { Grid, PaintedWater } from './paintedGround';

/**
 * L'île en carte peinte : une seule grande image (island.json, `map`), peinte vue par la caméra du jeu, posée au sol
 * et alignée sur l'écran. Elle est étirée en profondeur (÷ sin 35,26°) pour qu'à l'écran on la retrouve telle quelle.
 * Au-delà de l'image, une mer unie de la couleur de ses bords ; dessus, les reflets animés de l'eau, les ombres des
 * décors et les décors peints, posés par le code selon ce qui est peint (eau, herbe) et les zones de marche.
 */

const SPRITES = `${import.meta.env.BASE_URL}sprites/`;

/** Plan au sol aligné sur l'écran : son axe x suit u, son axe z suit v (comme toWorld). */
function screenPlane(scene: Scene, name: string, width: number, height: number, y: number): Mesh {
  const mesh = MeshBuilder.CreateGround(name, { width, height }, scene);
  mesh.rotation.y = Math.PI / 4;
  mesh.position.y = y;
  mesh.isPickable = false;
  mesh.freezeWorldMatrix();
  return mesh;
}

export class IslandMap {
  private constructor(
    private readonly meshes: Mesh[],
    private readonly materials: StandardMaterial[],
    private readonly textures: Texture[],
    private readonly water: PaintedWater | null,
    /** Tabliers des ponts, découpés dans la carte : montrés devant le héros qui passe dessous. */
    private readonly bridges: Mesh[],
    /** Chutes d'eau, découpées de même : montrées devant le héros qui passe derrière, un peu transparentes. */
    private readonly falls: Mesh[],
    /** Décors à poser (decorSprites.ts). */
    readonly decor: DecorSpot[],
    /** Collisions des décors posés dans les zones de marche, pour l'île (Island.addSolids). */
    readonly solids: { pos: Vec2; r: number }[],
  ) {}

  /** `rich` : eau animée, ombres et décors ; sans lui (graphismes allégés), la carte seule. */
  static async build(scene: Scene, data: IslandData, rich: boolean): Promise<IslandMap> {
    const url = `${SPRITES}${data.map.image}`;
    const map = await MapImage.load(data.map.sample ? `${SPRITES}${data.map.sample}` : url, data.map.width);
    const { width, height } = map;
    const sea = Color3.FromInts(...map.sea());
    scene.clearColor = sea.toColor4(1);

    const meshes: Mesh[] = [];
    const materials: StandardMaterial[] = [];
    const textures: Texture[] = [];
    const flat = (name: string, mesh: Mesh, texture: Texture | null, color: Color3) => {
      const material = new StandardMaterial(name, scene);
      // Sans éclairage, la couleur est (diffuse + émissive) × image : l'image seule, ou la couleur unie seule.
      material.disableLighting = true;
      material.specularColor = Color3.Black();
      if (texture) {
        material.diffuseTexture = texture;
        material.emissiveColor = Color3.White();
      } else {
        material.diffuseColor = Color3.Black();
        material.emissiveColor = color;
      }
      mesh.material = material;
      meshes.push(mesh);
      materials.push(material);
      return material;
    };

    const texture = new Texture(url, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE);
    texture.anisotropicFilteringLevel = 8;
    texture.wrapU = Texture.CLAMP_ADDRESSMODE;
    texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    // La mer unie, sous la carte et bien au-delà : le coin de la même image, étiré, pour un raccord sans couture.
    const corner = texture.clone();
    corner.uScale = 0;
    corner.vScale = 0;
    corner.uOffset = 0.002;
    corner.vOffset = 0.002;
    textures.push(texture, corner);
    flat('islandSea', screenPlane(scene, 'islandSea', width * 4, height * 4, -0.02), corner, sea);
    flat('islandMap', screenPlane(scene, 'islandMap', width, height, 0), texture, Color3.Black());
    const overlay = (name: string, poly: Polygon, alpha: number) => {
      const piece = mapPiece(scene, name, texture, poly, width, height, alpha);
      meshes.push(piece.mesh);
      materials.push(piece.material);
      textures.push(...piece.textures);
      return piece.mesh;
    };
    const bridges = (data.bridges ?? []).map((poly, i) => overlay(`islandBridge${i}`, poly, 1));
    // Assez d'eau pour qu'on la voie passer devant le héros, assez peu pour qu'on le devine derrière.
    const falls = (data.falls ?? []).map((poly, i) => overlay(`islandFall${i}`, poly, 0.75));
    if (!rich) return new IslandMap(meshes, materials, textures, null, bridges, falls, [], []);

    const field = new WalkField(data, width, height);
    const items = islandDecor(data, map, field);
    const decor = items.map((d): DecorSpot => ({ file: `decor/${d.sprite}.webp`, ...toWorld(d), height: d.height, flip: !!d.flip }));
    const solids = decorSolids(items, field);
    const shadows = shadowTexture(scene, decor, width, height);
    textures.push(shadows);
    const shade = flat('islandShadows', screenPlane(scene, 'islandShadows', width, height, 0.003), null, Color3.Black());
    shade.opacityTexture = shadows;
    shade.disableDepthWrite = true;
    meshes[meshes.length - 1].alphaIndex = -150_000;
    return new IslandMap(meshes, materials, textures, waterLayer(scene, data, map), bridges, falls, decor, solids);
  }

  update(dt: number): void {
    this.water?.update(dt);
  }

  /** Le héros passe sous un pont : son tablier se dessine devant lui. */
  showBridges(under: boolean): void {
    for (const mesh of this.bridges) mesh.isVisible = under;
  }

  /** Le héros passe derrière une chute d'eau : elle se dessine devant lui. */
  showFalls(behind: boolean): void {
    for (const mesh of this.falls) mesh.isVisible = behind;
  }

  dispose(): void {
    for (const mesh of this.meshes) mesh.dispose();
    for (const material of this.materials) material.dispose();
    for (const texture of this.textures) texture.dispose();
    this.water?.dispose();
  }
}

/**
 * Un morceau de la carte (le tablier d'un pont, une chute d'eau) : la même image, recadrée et découpée à sa forme (un
 * masque), posée au même endroit mais dessinée après tout le reste (groupe de rendu 1). Elle ne change rien à l'image,
 * sauf quand le héros est dessous ou derrière : alors le morceau passe devant lui (`alpha` < 1 : on le devine au travers).
 */
function mapPiece(scene: Scene, name: string, map: Texture, poly: Polygon, width: number, height: number, alpha: number) {
  const us = poly.map(([u]) => u);
  const vs = poly.map(([, v]) => v);
  const [u0, u1, v0, v1] = [Math.min(...us), Math.max(...us), Math.min(...vs), Math.max(...vs)];
  const crop = map.clone();
  crop.uScale = (u1 - u0) / width;
  crop.uOffset = (u0 + width / 2) / width;
  crop.vScale = (v1 - v0) / height;
  crop.vOffset = (v0 + height / 2) / height;
  const size = 256;
  const mask = new DynamicTexture(`${name}Mask`, { width: size, height: size }, scene, true);
  const ctx = mask.getContext() as CanvasRenderingContext2D;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  poly.forEach(([u, v], i) => {
    const x = ((u - u0) / (u1 - u0)) * size;
    const y = (1 - (v - v0) / (v1 - v0)) * size;
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  });
  ctx.closePath();
  ctx.fill();
  mask.update();
  mask.getAlphaFromRGB = true;
  const mesh = MeshBuilder.CreateGround(name, { width: u1 - u0, height: v1 - v0 }, scene);
  const center = toWorld({ u: (u0 + u1) / 2, v: (v0 + v1) / 2 });
  mesh.position.set(center.x, 0.01, center.z);
  mesh.rotation.y = Math.PI / 4;
  mesh.isPickable = false;
  mesh.renderingGroupId = 1;
  mesh.isVisible = false;
  mesh.freezeWorldMatrix();
  const material = new StandardMaterial(name, scene);
  material.disableLighting = true;
  material.specularColor = Color3.Black();
  material.diffuseTexture = crop;
  material.emissiveColor = Color3.White();
  material.opacityTexture = mask;
  material.alpha = alpha;
  material.disableDepthWrite = true;
  mesh.material = material;
  return { mesh, material, textures: [crop, mask] };
}

/** Reflets animés sur l'eau peinte : la mer, la rivière, le bassin, et plus légers sur les rizières. */
function waterLayer(scene: Scene, data: IslandData, map: MapImage): PaintedWater {
  // L'image, tournée de 45° dans le monde : sa boîte englobante en x et z.
  const half = (map.width + map.height) / 2 / Math.SQRT2;
  const grid = new Grid(-half, half, -half, half, 2);
  const weight = grid.layer();
  for (let j = 0; j < grid.h; j++) {
    for (let i = 0; i < grid.w; i++) {
      const s = toScreen({ x: grid.x(i), z: grid.z(j) });
      if (insidePolygon(s, data.scenery.paddies)) weight[j * grid.w + i] = map.paddyWater(s) ? 0.6 : 0;
      else weight[j * grid.w + i] = map.water(s) ? 1 : 0;
    }
  }
  return new PaintedWater(scene, 'islandWater', grid, weight);
}

/** Ombres douces des décors, dans une image posée sur la carte. Lumière en haut à gauche : elles glissent en bas à droite. */
function shadowTexture(scene: Scene, decor: readonly DecorSpot[], width: number, height: number): DynamicTexture {
  const size = 1024;
  const texture = new DynamicTexture('islandShadows', { width: size, height: size }, scene, true);
  const ctx = texture.getContext() as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, size, size);
  for (const d of decor) {
    const s = toScreen(d);
    const r = Math.min(1.5, Math.max(0.25, d.height * 0.32));
    const x = (s.u / width + 0.5) * size + ((0.12 * r) / width) * size;
    const y = (0.5 - s.v / height) * size + ((0.2 * r) / height) * size;
    const rx = (r / width) * size;
    const ry = (r / height) * size;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    gradient.addColorStop(0, 'rgba(0,0,0,0.3)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
    ctx.restore();
  }
  texture.hasAlpha = true;
  texture.update();
  return texture;
}

// --- Décors ---------------------------------------------------------------------

