import { Color3, Color4, MeshBuilder, StandardMaterial, Texture, type Mesh, type Scene } from '@babylonjs/core';
import arenesJson from '../data/arenes.json';
import { toWorld, type ScreenPoint } from '../game/island';
import type { Vec2 } from '../game/math';
import { DecorSprites, type DecorSpot } from './decorSprites';
import { spriteMaterial } from './renderer';

/**
 * Arènes des donjons en pixel art, dans le style de la carte v3 (tools/ile-v3/arenes.py) : le sol est une seule image,
 * peinte vue par la caméra du jeu comme la carte de l'île, posée au sol et alignée sur l'écran ; les arbres, rochers,
 * torii et lanternes autour sont des décors debout, triés avec les personnages (decorSprites.ts). Au-delà de l'image,
 * le fond uni de sa couleur (l'image s'y fond déjà).
 * - Yomi sans fond : une salle souterraine noyée, l'eau sur les dalles, la paroi de la caverne au fond, des rochers.
 * - Rizières noyées (la Jorōgumo) : rizières inondées et diguettes, terrasses et saules dans la brume.
 * - Mont Fujikasane (le gardien errant) : la clairière du sommet, la nuit, la forêt tout autour.
 */

interface PixelArenaData {
  image: string;
  /** Taille de l'image dans le monde : largeur (u) et profondeur (v), comme la carte de l'île. */
  width: number;
  height: number;
  /** Centre de l'image dans le repère du jeu ; l'arène est autour de l'origine. */
  center: ScreenPoint;
  background: string;
  /** Sprite des obstacles (les « souches » de la vague), dans sprites.json. */
  obstacle: string;
  /** Teinte des décors debout et des obstacles, la même que celle du sol (la nuit, la caverne). */
  tint: [number, number, number];
  decor: { sprite: string; u: number; v: number; height: number; below: number; flip?: boolean }[];
}

const ARENAS = arenesJson as unknown as Record<string, PixelArenaData | string>;

function arenaData(kind: string): PixelArenaData | null {
  const data = ARENAS[kind];
  return typeof data === 'object' ? data : null;
}

export class ArenaPixel {
  private constructor(
    private readonly mesh: Mesh,
    private readonly material: StandardMaterial,
    private readonly texture: Texture,
    private readonly decor: DecorSprites | null,
  ) {}

  /** `rich` : les décors debout ; sans lui (graphismes allégés), le sol seul. */
  static async build(scene: Scene, kind: string, forward: Vec2, rich: boolean): Promise<ArenaPixel> {
    const data = arenaData(kind);
    if (!data) throw new Error(`Arène en pixel art inconnue : ${kind}`);
    const url = `${import.meta.env.BASE_URL}sprites/${data.image}`;
    const texture = await new Promise<Texture>((resolve, reject) => {
      const t: Texture = new Texture(url, scene, true, true, Texture.NEAREST_SAMPLINGMODE, () => resolve(t), (message) => reject(new Error(message ?? url)));
    });
    texture.wrapU = Texture.CLAMP_ADDRESSMODE;
    texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    // Plan au sol aligné sur l'écran (comme la carte de l'île) : son axe x suit u, son axe z suit v.
    const mesh = MeshBuilder.CreateGround(`arena-${kind}`, { width: data.width, height: data.height }, scene);
    mesh.rotation.y = Math.PI / 4;
    const center = toWorld(data.center);
    mesh.position.set(center.x, -0.01, center.z);
    mesh.isPickable = false;
    mesh.freezeWorldMatrix();
    const material = new StandardMaterial(`arena-${kind}`, scene);
    material.disableLighting = true;
    material.specularColor = Color3.Black();
    material.diffuseTexture = texture;
    material.emissiveColor = Color3.White();
    mesh.material = material;
    scene.clearColor = Color4.FromHexString(`${data.background}ff`);
    const spots = data.decor.map((d): DecorSpot => ({
      file: `decor/${d.sprite}.webp`,
      ...toWorld(d),
      height: d.height,
      flip: !!d.flip,
      below: d.below,
    }));
    const tint = new Color3(...data.tint);
    const decor = rich
      ? await DecorSprites.build(scene, spots, forward, new Set(), (name, tex) => {
          const m = spriteMaterial(scene, name, tex);
          m.setColor3('tint', tint);
          return m;
        })
      : null;
    return new ArenaPixel(mesh, material, texture, decor);
  }

  update(_dt: number): void {}

  dispose(): void {
    this.decor?.dispose();
    this.mesh.dispose();
    this.material.dispose();
    this.texture.dispose();
  }
}
