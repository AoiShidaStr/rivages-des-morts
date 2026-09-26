// Apparence du héros selon sa race et sa classe : une planche en pixel art par combinaison
// (tools/pixel/heros.mjs, `npm run pixel`), rangée dans public/sprites/pixel/heros-<race>-<classe>.json.
import type { Hero } from '../game/progress';
import type { SpriteDef, SpriteManifest } from './renderer';

/** L'Einherjar guerrier garde sa planche peinte (sprite « heros ») : c'est lui qu'elle représente. */
const PAINTED = { race: 'einherjar', class: 'guerrier' };

/** Nom du sprite du héros. */
export function heroSprite(hero: Hero): string {
  return hero.race === PAINTED.race && hero.class === PAINTED.class ? 'heros' : `heros-${hero.race}-${hero.class}`;
}

/**
 * Ajoute au manifeste une entrée par race et par classe, calquée sur celle du héros peint : même taille à l'écran,
 * l'image peinte en secours si la planche manque.
 */
export function withHeroSprites(manifest: SpriteManifest, races: string[], classes: string[]): SpriteManifest {
  const base = manifest.heros;
  const entries: [string, SpriteDef][] = races.flatMap((race) =>
    classes
      .map((cls) => heroSprite({ race, class: cls }))
      .filter((name) => name !== 'heros')
      .map((name): [string, SpriteDef] => [name, { ...base, sheet: { file: `pixel/${name}.json`, height: 2.35 } }]),
  );
  return { ...manifest, ...Object.fromEntries(entries) };
}
