import { Vector4, type Scene, type ShaderMaterial, type Texture } from '@babylonjs/core';
import { loadTexture } from './renderer';

/** Planche découpée : rectangle de chaque image (en UV) et plages d'images par posture. */
export interface SheetAnimation {
  frames: { rect: [number, number, number, number]; duration: number }[];
  tags: Map<string, { from: number; to: number; once: boolean }>;
}

/**
 * Ce que l'on lit dans un export JSON d'Aseprite (format « Array »). Les planches montées par
 * `npm run planches` ajoutent `smooth` (image peinte, filtrée sans pixels nets), `bodyHeight`
 * (hauteur du corps en pixels) et `anchor` (position des pieds dans une case).
 */
interface AsepriteSheet {
  frames: { frame: { x: number; y: number; w: number; h: number }; duration: number }[];
  meta: {
    image: string;
    size: { w: number; h: number };
    frameTags?: { name: string; from: number; to: number; repeat?: string }[];
    smooth?: boolean;
    bodyHeight?: number;
    anchor?: { x: number; y: number };
  };
}

export interface LoadedSheet {
  texture: Texture;
  aspect: number;
  /** Hauteur d'une case entière dans le monde. */
  height: number;
  /** Hauteur de la case sous les pieds, dans le monde : le sprite descend d'autant. */
  below: number;
  anim: SheetAnimation;
}

/**
 * Charge une planche et son découpage. `bodyHeight` est la taille du personnage dans le monde : pour une
 * planche qui connaît la hauteur du corps et la place des pieds, la case est dimensionnée d'après elle.
 * Sinon (planches en pixel art), `cellHeight` donne directement la hauteur d'une case.
 */
export async function loadSheet(scene: Scene, jsonPath: string, bodyHeight: number, cellHeight?: number): Promise<LoadedSheet> {
  const base = `${import.meta.env.BASE_URL}sprites/`;
  const response = await fetch(`${base}${jsonPath}`);
  if (!response.ok) throw new Error(jsonPath);
  const sheet = (await response.json()) as AsepriteSheet;
  const dir = jsonPath.includes('/') ? jsonPath.slice(0, jsonPath.lastIndexOf('/') + 1) : '';
  const texture = await loadTexture(scene, `${base}${dir}${sheet.meta.image}`, !sheet.meta.smooth);
  const { w: W, h: H } = sheet.meta.size;
  // L'image est retournée à la lecture (v = 0 en bas) : la rangée du haut a le plus grand v.
  const frames = sheet.frames.map(({ frame: f, duration }) => ({
    rect: [f.x / W, 1 - (f.y + f.h) / H, f.w / W, f.h / H] as [number, number, number, number],
    duration: duration / 1000,
  }));
  const tags = new Map((sheet.meta.frameTags ?? []).map((t) => [t.name, { from: t.from, to: t.to, once: t.repeat === '1' }]));
  const first = sheet.frames[0].frame;
  const { bodyHeight: bodyPx, anchor } = sheet.meta;
  const height = bodyPx ? (bodyHeight * first.h) / bodyPx : (cellHeight ?? bodyHeight);
  const below = bodyPx && anchor ? (height * (first.h - anchor.y)) / first.h : 0;
  return { texture, aspect: first.w / first.h, height, below, anim: { frames, tags } };
}

/** Image de l'animation `tag` à jouer `time` secondes après son début (la dernière si elle ne boucle pas). */
export function frameAt(anim: SheetAnimation, tagName: string, time: number): number {
  const tag = anim.tags.get(tagName);
  if (!tag) return 0;
  const total = anim.frames.slice(tag.from, tag.to + 1).reduce((sum, f) => sum + f.duration, 0);
  let t = tag.once ? Math.min(time, total - 1e-6) : time % Math.max(1e-6, total);
  let frame = tag.from;
  while (frame < tag.to && t >= anim.frames[frame].duration) {
    t -= anim.frames[frame].duration;
    frame++;
  }
  return frame;
}

/** Affiche l'image `frame` de la planche sur un matériau de sprite. */
export function showFrame(material: ShaderMaterial, anim: SheetAnimation, frame: number): void {
  const [u, v, w, h] = anim.frames[frame].rect;
  material.setVector4('frameRect', new Vector4(u, v, w, h));
}
