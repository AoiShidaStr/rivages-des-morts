/** Vecteur au sol : le jeu se déroule sur le plan XZ, Y étant la hauteur. */
export interface Vec2 {
  x: number;
  z: number;
}

export const vec = (x = 0, z = 0): Vec2 => ({ x, z });
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, z: a.z + b.z });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, z: a.z - b.z });
export const scale = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, z: a.z * s });
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.z * b.z;
export const length = (a: Vec2): number => Math.hypot(a.x, a.z);
export const distance = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.z - b.z);
export const angleOf = (a: Vec2): number => Math.atan2(a.z, a.x);
export const fromAngle = (angle: number): Vec2 => ({ x: Math.cos(angle), z: Math.sin(angle) });
export const degToRad = (deg: number): number => (deg * Math.PI) / 180;

export function normalize(a: Vec2, fallback: Vec2 = { x: 1, z: 0 }): Vec2 {
  const l = length(a);
  return l > 1e-6 ? { x: a.x / l, z: a.z / l } : { ...fallback };
}

/** Vrai si la direction `dir` est dans le cône de demi-angle `halfArc` centré sur `facing` (vecteurs normalisés). */
export const inCone = (facing: Vec2, dir: Vec2, halfArc: number): boolean => dot(facing, dir) >= Math.cos(halfArc);

/** Tourne `from` vers `to` d'au plus `maxAngle` radians. */
export function rotateTowards(from: Vec2, to: Vec2, maxAngle: number): Vec2 {
  const start = angleOf(from);
  let delta = angleOf(to) - start;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  return fromAngle(start + Math.max(-maxAngle, Math.min(maxAngle, delta)));
}
