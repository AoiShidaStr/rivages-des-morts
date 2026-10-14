/**
 * Graphismes allégés : la carte de l'île sans eau animée, ombres ni décors, et les arènes sans leurs décors.
 * Le choix est gardé dans ce navigateur et s'applique au prochain chargement.
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

export const LOW_GRAPHICS = lowGraphics();

/** Secousses de l'écran : coupables dans les Options pour ceux qu'elles gênent. Le réglage s'applique tout de suite. */
const SHAKE_KEY = 'rivages-secousses';

function readShake(): boolean {
  try {
    return localStorage.getItem(SHAKE_KEY) !== 'non';
  } catch {
    return true;
  }
}

let shake = readShake();

export function shakeEnabled(): boolean {
  return shake;
}

export function setShakeEnabled(on: boolean): void {
  shake = on;
  try {
    if (on) localStorage.removeItem(SHAKE_KEY);
    else localStorage.setItem(SHAKE_KEY, 'non');
  } catch {
    // Stockage indisponible : le réglage ne survit pas au rechargement.
  }
}
