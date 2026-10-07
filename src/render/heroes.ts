// Apparence du héros selon sa race et sa classe : une planche peinte par combinaison
// (public/sprites/anim/heros-<race>-<classe>.json, `npm run anims-heros`), ou en pixel art avec `?pixel=1`
// (public/sprites/pixel/heros-<race>-<classe>.json, `npm run pixel`).
import type { Hero } from '../game/progress';
import type { SpriteDef, SpriteManifest } from './renderer';

/** L'Einherjar guerrier garde sa planche peinte d'origine (sprite « heros ») : c'est lui qu'elle représente. */
const ORIGINAL = { race: 'einherjar', class: 'guerrier' };
/**
 * Classes qui portent encore les planches d'une autre : le Sorcier garde l'onmyōji de l'Invocateur, en attendant
 * les siennes, sauf pour les races qui ont déjà leur planche complète (`OWN`).
 */
const BORROWED: Record<string, string> = { sorcier: 'invocateur' };
const OWN: Record<string, readonly string[]> = { sorcier: ['hanyo', 'demi-dieu'] };

/** Nom du sprite du héros selon sa race et sa classe. */
export function heroSprite(hero: Hero): string {
  const race = hero.race || ORIGINAL.race;
  const own = OWN[hero.class]?.includes(race);
  const cls = (!own && BORROWED[hero.class]) || hero.class || ORIGINAL.class;
  return race === ORIGINAL.race && cls === ORIGINAL.class ? 'heros' : `heros-${race}-${cls}`;
}

/**
 * Un sprite de héros d'une autre race ou classe : sa planche est lourde (une par combinaison), le jeu ne la
 * charge qu'au moment où ce héros entre en scène.
 */
export function isHeroVariant(name: string): boolean {
  return name.startsWith('heros-');
}

/** Image fixe du héros (portraits de dialogue, écran de création). */
export function heroImage(hero: Hero): string {
  return `${heroSprite(hero)}.png`;
}

/**
 * Ajoute au manifeste une entrée par race et par classe :
 * - planche d'animation peinte par défaut (anim/heros-<race>-<classe>.json, anim/heros.json pour l'Einherjar guerrier) ;
 * - planche en pixel art avec ?pixel=1 (pixel/heros-<race>-<classe>.json).
 */
export function withHeroSprites(manifest: SpriteManifest, races: string[], classes: string[]): SpriteManifest {
  const base = manifest.heros ?? { file: 'heros.png', height: 1.75, facesRight: true };
  const usePixel = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('pixel') === '1';

  const entries: [string, SpriteDef][] = races.flatMap((race) =>
    classes
      .map((cls) => heroSprite({ race, class: cls }))
      .filter((name) => name !== 'heros')
      .map((name): [string, SpriteDef] => [name, { ...base, file: `${name}.png`, sheet: { file: `${usePixel ? 'pixel' : 'anim'}/${name}.json`, height: 2.35 } }]),
  );
  return {
    ...manifest,
    heros: { ...base, file: 'heros.png', sheet: { file: usePixel ? 'pixel/heros.json' : 'anim/heros.json', height: 2.35 } },
    ...Object.fromEntries(entries),
  };
}
