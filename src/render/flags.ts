/**
 * Scènes en 3D (île, arènes) ou ancienne carte peinte. Le réglage « graphismes allégés » des options rend la carte
 * peinte, plus légère pour les ordinateurs modestes ; il est gardé dans ce navigateur et s'applique au chargement.
 * Dans l'adresse, `?2d` ou `?3d` forcent l'un ou l'autre, pour comparer.
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

export const SCENES_3D = params.has('3d') || (!params.has('2d') && !lowGraphics());
