// Le héros en pixel art, dessiné dans le jeu d'après sa race, sa classe et son équipement : le même
// générateur que `npm run pixel` (tools/pixel/heros.mjs), qui sait dessiner chaque arme, casque, plastron,
// jambières, bottes et amulette sur le personnage.
import { hero } from '../../tools/pixel/heros.mjs';
import { drawSheet } from '../../tools/pixel/sheet.mjs';
import type { AsepriteSheet } from './sheets';

/** Apparence du héros : race, classe et objets portés par emplacement. */
export interface HeroLook {
  race: string;
  class: string;
  gear: Partial<Record<string, string>>;
}

/** Emplacements dessinés sur le personnage (les reliques ne se voient pas). */
const WORN = ['arme', 'casque', 'plastron', 'jambieres', 'bottes', 'amulette'];

export function lookKey(look: HeroLook): string {
  return [look.race, look.class, ...WORN.map((slot) => look.gear[slot] ?? '')].join('|');
}

export interface HeroSheet {
  canvas: HTMLCanvasElement;
  sheet: AsepriteSheet;
}

const cache = new Map<string, HeroSheet>();
const CACHE_SIZE = 12;

/** Planche complète du héros (toutes ses animations), gardée en mémoire pour les dernières apparences. */
export function heroSheet(look: HeroLook): HeroSheet {
  const key = lookKey(look);
  const cached = cache.get(key);
  if (cached) return cached;
  const gear = Object.fromEntries(WORN.filter((slot) => look.gear[slot]).map((slot) => [slot, look.gear[slot]]));
  const { sheet: pixels, json } = drawSheet('heros', hero(look.race, look.class, gear));
  const canvas = document.createElement('canvas');
  canvas.width = pixels.width;
  canvas.height = pixels.height;
  canvas.getContext('2d')!.putImageData(new ImageData(pixels.data, pixels.width, pixels.height), 0, 0);
  const result = { canvas, sheet: json as AsepriteSheet };
  cache.set(key, result);
  if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value!);
  return result;
}

/** Cadrage du visage dans la première image de la planche (x, y, côté), et agrandissement du portrait. */
const FACE = [13, 7, 18];
const PORTRAIT_SCALE = 6;
const portraits = new Map<string, string>();

/** Portrait de dialogue du héros, tiré de sa planche : l'image (data URL) change avec la race et le casque. */
export function heroPortrait(look: HeroLook): string {
  const key = lookKey(look);
  const cached = portraits.get(key);
  if (cached) return cached;
  const [x, y, side] = FACE;
  const canvas = document.createElement('canvas');
  canvas.width = side * PORTRAIT_SCALE;
  canvas.height = side * PORTRAIT_SCALE;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(heroSheet(look).canvas, x, y, side, side, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL();
  portraits.set(key, url);
  return url;
}
