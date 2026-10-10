import { Texture, type Scene } from '@babylonjs/core';
import { MAX_PIXEL_RATIO } from './resolution';

/**
 * Les planches sont peintes pour de grands écrans : un héros y mesure 256 pixels de haut. Sur un écran plus petit,
 * la carte graphique n'en lirait que des mipmaps réduites, et le reste occuperait la mémoire pour rien. On les réduit
 * donc dès le chargement à la plus grande taille où le jeu peut les montrer sur cet écran : l'image à l'écran est la
 * même, la mémoire graphique fond (÷3 environ sur un écran 1366 × 768, rien ne change sur un écran 4K).
 */

/** Demi-hauteur de la vue au combat, en unités du monde (renderer.ts) : la caméra la plus rapprochée du jeu. */
const COMBAT_VIEW_HALF_HEIGHT = 6;
/** Marge pour les sprites agrandis (élites, apparition, écrasement des coups). */
const MARGIN = 1.3;
/** En deçà de cette réduction, l'image reste telle quelle : le gain ne vaudrait pas le rééchantillonnage. */
const MIN_GAIN = 0.85;
const FULL_TEXTURES_KEY = 'rivages-textures';

/** Textures en pleine définition (Options) : plus nettes de près, plus lourdes en mémoire graphique. */
export function fullTextures(): boolean {
  try {
    return localStorage.getItem(FULL_TEXTURES_KEY) === 'pleines';
  } catch {
    return false;
  }
}

export function setFullTextures(full: boolean): void {
  try {
    if (full) localStorage.setItem(FULL_TEXTURES_KEY, 'pleines');
    else localStorage.removeItem(FULL_TEXTURES_KEY);
  } catch {
    // Stockage indisponible : le réglage ne survit pas au rechargement.
  }
}

/** Lu une fois au chargement : les planches déjà chargées gardent leur taille. */
const FULL = fullTextures();

/** Pixels d'écran par unité du monde au combat, en plein écran (densité comprise, plafonnée comme le rendu). */
export function screenPixelsPerUnit(): number {
  const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
  const height = Math.max(screen.height || 0, window.innerHeight) * ratio;
  return height / (2 * COMBAT_VIEW_HALF_HEIGHT);
}

/** Facteur de réduction d'une image peinte à `texelsPerUnit` pixels par unité du monde (1 : telle quelle). */
export function textureScale(texelsPerUnit: number): number {
  if (FULL || !(texelsPerUnit > 0)) return 1;
  const scale = (screenPixelsPerUnit() * MARGIN) / texelsPerUnit;
  return scale < MIN_GAIN ? scale : 1;
}

/**
 * Charge une image lissée (avec mipmaps), réduite selon `texelsPerUnit(largeur, hauteur)` de l'image d'origine.
 * Sans réduction, c'est un chargement ordinaire, partagé entre les scènes par le cache de Babylon.
 */
export async function loadFittedTexture(scene: Scene, url: string, texelsPerUnit: (width: number, height: number) => number): Promise<Texture> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(url);
  const full = await createImageBitmap(await response.blob(), { premultiplyAlpha: 'none' });
  const scale = textureScale(texelsPerUnit(full.width, full.height));
  const width = Math.max(1, Math.round(full.width * scale));
  const height = Math.max(1, Math.round(full.height * scale));
  // WebGL ne retourne pas une ImageBitmap à l'envoi : elle doit arriver déjà retournée (comme le fait Babylon).
  const bitmap = await createImageBitmap(full, {
    resizeWidth: width,
    resizeHeight: height,
    resizeQuality: 'high',
    imageOrientation: 'flipY',
    premultiplyAlpha: 'none',
  });
  full.close();
  return new Promise((resolve, reject) => {
    // L'échelle dans l'adresse (en millièmes : Babylon prendrait un point pour une extension de fichier) : une même
    // image réduite différemment n'est pas confondue dans le cache.
    const texture: Texture = new Texture(
      `${url}?echelle=${Math.round(scale * 1000)}`,
      scene,
      false,
      true,
      Texture.TRILINEAR_SAMPLINGMODE,
      // Image déjà décodée : Babylon peut annoncer le chargement avant même la fin du constructeur.
      () => queueMicrotask(() => resolve(texture)),
      (message, exception) => reject(exception instanceof Error ? exception : new Error(message ?? url)),
      bitmap,
    );
    texture.hasAlpha = true;
    texture.wrapU = Texture.CLAMP_ADDRESSMODE;
    texture.wrapV = Texture.CLAMP_ADDRESSMODE;
  });
}
