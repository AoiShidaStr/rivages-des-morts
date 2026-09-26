import type { Engine } from '@babylonjs/core';

/**
 * Style graphique du jeu. « pixel » (par défaut) : tout est en pixel art, rendu en basse résolution puis
 * agrandi sans lissage. « peint » : les images peintes (Nano Banana), pour comparer. Le choix se fait dans
 * l'adresse (`?style=peint`, ou l'ancien `?pixel=0`) ou depuis l'écran titre, et reste en mémoire.
 */
export type ArtStyle = 'pixel' | 'peint';

const STORAGE_KEY = 'rivages-des-morts-style';

function readStyle(): ArtStyle {
  const params = new URLSearchParams(location.search);
  const asked = params.get('style');
  if (asked === 'pixel' || asked === 'peint') return asked;
  if (params.get('pixel') === '0') return 'peint';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'pixel' || saved === 'peint') return saved;
  } catch {
    // Stockage indisponible (navigation privée) : on garde le style par défaut.
  }
  return 'pixel';
}

export const ART_STYLE: ArtStyle = readStyle();
export const PIXEL = ART_STYLE === 'pixel';

/** Change de style : le jeu se recharge pour tout redessiner. */
export function switchStyle(style: ArtStyle): void {
  try {
    localStorage.setItem(STORAGE_KEY, style);
  } catch {
    // Sans stockage, l'adresse suffit.
  }
  const url = new URL(location.href);
  url.searchParams.delete('pixel');
  url.searchParams.set('style', style);
  location.href = url.toString();
}

/**
 * Densité du pixel art : pixels par unité du monde. Toutes les planches en pixel art (personnages, décors,
 * sols) sont dessinées à cette échelle, et l'écran est rendu à cette résolution.
 */
export const PPU = 18;

/**
 * En pixel art, rend la scène en basse résolution (un pixel de sprite = un pixel rendu), agrandie d'un facteur
 * entier à l'écran ; renvoie la demi-hauteur de vue en unités du monde, au plus près de `halfHeight`.
 * En style peint, rien ne change.
 */
export function pixelView(engine: Engine, canvas: HTMLCanvasElement, halfHeight: number): number {
  if (!PIXEL) return halfHeight;
  const dpr = window.devicePixelRatio || 1;
  const physical = Math.max(1, canvas.clientHeight * dpr);
  const factor = Math.max(1, Math.floor(physical / (2 * halfHeight * PPU)));
  const level = factor / dpr;
  if (Math.abs(engine.getHardwareScalingLevel() - level) > 1e-6) engine.setHardwareScalingLevel(level);
  return engine.getRenderHeight() / (2 * PPU);
}
