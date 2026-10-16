// Le hasard du combat. Tiré d'une suite fixée par une graine plutôt que de Math.random : en duel, chaque navigateur
// fait tourner le même combat (netcode à rollback, src/net/rollback.ts), et les mêmes commandes doivent y donner
// exactement les mêmes coups critiques, les mêmes sauts de yokai. L'état tient dans un entier : le rollback le garde
// avec le reste du monde. Hors duel, la graine est tirée au hasard et rien ne change.

let state = Math.floor(Math.random() * 2 ** 32) >>> 0;

/** Un nombre entre 0 (compris) et 1 (exclu), comme Math.random (mulberry32). */
export function random(): number {
  state = (state + 0x6d2b79f5) | 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randomState(): number {
  return state;
}

export function setRandomState(next: number): void {
  state = next >>> 0;
}
