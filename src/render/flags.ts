/**
 * Graphismes allégés : la carte de l'île sans eau animée, ombres ni décors, et les arènes sans leurs décors.
 * Le choix est gardé dans ce navigateur et s'applique au prochain chargement. `?3d` (arènes en 3D) garde priorité pour comparer.
 */
const LOW_GRAPHICS_KEY = 'rivages-graphismes';

export function lowGraphics(): boolean {
  try {
    return localStorage.getItem(LOW_GRAPHICS_KEY) === 'bas';
  } catch {
    return false;
  }
}

export function setLowGraphics(low: boolean): void {
  try {
    if (low) localStorage.setItem(LOW_GRAPHICS_KEY, 'bas');
    else localStorage.removeItem(LOW_GRAPHICS_KEY);
  } catch {
    // Stockage indisponible : le réglage ne survit pas au rechargement.
  }
}

const params = typeof location === 'undefined' ? new URLSearchParams() : new URLSearchParams(location.search);

export const LOW_GRAPHICS = !params.has('3d') && lowGraphics();
export const SCENES_3D = params.has('3d');