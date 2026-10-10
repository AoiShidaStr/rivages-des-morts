import { Matrix, Mesh, MeshBuilder, type Scene, type ShaderMaterial, type Texture } from '@babylonjs/core';
import { dot, type Vec2 } from '../game/math';
import { PITCH, spriteMaterial, YAW } from './renderer';
import { loadFittedTexture } from './textureBudget';

/** Un décor peint posé par le code (carte peinte de l'île, arènes). */
export interface DecorSpot {
  /** Image, depuis public/sprites. */
  file: string;
  x: number;
  z: number;
  height: number;
  flip: boolean;
}

/** Ordre de dessin des images debout, comme dans les deux rendus : le plus loin d'abord. */
const SPRITE_ORDER = 10_000;

/** Nom du décor dans son image : `decor/ile/riz.webp` → `riz`. */
export function decorName(file: string): string {
  return file.split('/').pop()?.replace(/\.(png|webp)$/, '') ?? file;
}

/**
 * Décors peints : des images fixes tournées vers la caméra, sans ombre propre (elle est peinte dans le sol), triées
 * avec les personnages. Un matériau par image, partagé par tous les exemplaires. Les petits décors au ras du sol
 * (`low`) sont regroupés en un seul maillage par image, dessiné avant les personnages : des dizaines de touffes
 * pour un seul dessin.
 */
export class DecorSprites {
  private constructor(
    private readonly meshes: Mesh[],
    private readonly materials: ShaderMaterial[],
    private readonly textures: Texture[],
  ) {}

  static async build(scene: Scene, spots: readonly DecorSpot[], forward: Vec2, low: ReadonlySet<string>): Promise<DecorSprites> {
    // Chaque image à la taille de son plus grand exemplaire à l'écran (textureBudget.ts).
    const tallest = new Map<string, number>();
    for (const s of spots) tallest.set(s.file, Math.max(s.height, tallest.get(s.file) ?? 0));
    const textures = new Map<string, Texture>();
    await Promise.all(
      [...tallest].map(([file, height]) =>
        loadFittedTexture(scene, `${import.meta.env.BASE_URL}sprites/${file}`, (_w, h) => h / height).then(
          (texture) => void textures.set(file, texture),
          () => console.warn(`Décor introuvable : ${file}`),
        ),
      ),
    );
    const meshes: Mesh[] = [];
    const materials = new Map<string, ShaderMaterial>();
    const materialFor = (file: string, texture: Texture) => {
      let material = materials.get(file);
      if (!material) {
        material = spriteMaterial(scene, `decor-${file}`, texture);
        material.checkReadyOnlyOnce = true;
        materials.set(file, material);
      }
      return material;
    };
    const plane = (spot: DecorSpot, texture: Texture, name: string) => {
      const { width, height } = texture.getSize();
      const mesh = MeshBuilder.CreatePlane(name, { width: spot.height * (width / height), height: spot.height }, scene);
      // Les images gardent une petite marge sous le pied du décor.
      mesh.bakeTransformIntoVertices(Matrix.Translation(0, spot.height / 2 - spot.height * 0.02, 0));
      if (spot.flip) mesh.bakeTransformIntoVertices(Matrix.Scaling(-1, 1, 1));
      // Tournée face à la caméra une fois pour toutes : la caméra ne tourne jamais. Un billboard figé au chargement
      // prendrait l'orientation de la caméra avant sa mise en place, et les décors paraîtraient écrasés.
      mesh.rotation.set(PITCH, YAW, 0);
      mesh.isPickable = false;
      mesh.position.set(spot.x, 0, spot.z);
      return mesh;
    };

    const grouped = new Map<string, DecorSpot[]>();
    for (const spot of spots) {
      if (low.has(decorName(spot.file))) grouped.set(spot.file, [...(grouped.get(spot.file) ?? []), spot]);
    }
    for (const [file, list] of grouped) {
      const texture = textures.get(file);
      if (!texture) continue;
      // Du plus loin au plus proche : la caméra ne tourne jamais, cet ordre reste juste.
      const sorted = [...list].sort((a, b) => dot(b, forward) - dot(a, forward));
      const planes = sorted.map((spot, i) => {
        const mesh = plane(spot, texture, `decor-low-${i}`);
        mesh.computeWorldMatrix(true);
        return mesh;
      });
      const merged = Mesh.MergeMeshes(planes, true, true);
      if (!merged) continue;
      merged.name = `decor-${file}`;
      merged.isPickable = false;
      merged.alphaIndex = -50_000;
      merged.material = materialFor(file, texture);
      merged.freezeWorldMatrix();
      meshes.push(merged);
    }

    spots.forEach((spot, i) => {
      const texture = textures.get(spot.file);
      if (!texture || grouped.has(spot.file)) return;
      const mesh = plane(spot, texture, `decor-${i}`);
      mesh.alphaIndex = SPRITE_ORDER - Math.round(dot(spot, forward) * 100);
      mesh.material = materialFor(spot.file, texture);
      mesh.freezeWorldMatrix();
      meshes.push(mesh);
    });
    return new DecorSprites(meshes, [...materials.values()], [...textures.values()]);
  }

  dispose(): void {
    for (const mesh of this.meshes) mesh.dispose();
    for (const material of this.materials) material.dispose();
    for (const texture of this.textures) texture.dispose();
  }
}
