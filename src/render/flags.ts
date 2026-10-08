/**
 * Carte peinte (par défaut) ou scènes en 3D (île, arènes). Le réglage « scènes en 3D » des options est gardé dans
 * ce navigateur et s'applique au chargement : la 3D est plus gourmande et reste expérimentale.
 * Dans l'adresse, `?2d` ou `?3d` forcent l'un ou l'autre, pour comparer.
 */
const GRAPHICS_KEY = 'rivages-graphismes';

export function scenes3dChosen(): boolean {
  try {
    return localStorage.getItem(GRAPHICS_KEY) === '3d';
  } catch {
    return false;
  }
}

export function setScenes3d(on: boolean): void {
  try {
    if (on) localStorage.setItem(GRAPHICS_KEY, '3d');
    else localStorage.removeItem(GRAPHICS_KEY);
  } catch {
    // Stockage indisponible : le réglage ne survit pas au rechargement.
  }
}

const params = typeof location === 'undefined' ? new URLSearchParams() : new URLSearchParams(location.search);

export const SCENES_3D = params.has('3d') || (!params.has('2d') && scenes3dChosen());
