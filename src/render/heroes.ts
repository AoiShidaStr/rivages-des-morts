// Apparence du héros selon sa race et sa classe : une planche en pixel art par combinaison
// (tools/pixel/heros.mjs, `npm run pixel`), rangée dans public/sprites/pixel/heros-<race>-<classe>.json.
import type { Hero } from '../game/progress';
import type { SpriteDef, SpriteManifest } from './renderer';

/** Nom du sprite du héros selon sa race et sa classe. */
export function heroSprite(hero: Hero): string {
  const race = hero.race || 'einherjar';
  const cls = hero.class || 'guerrier';
  return `heros-${race}-${cls}`;
}

/**
 * Ajoute au manifeste une entrée par race et par classe :
 * - Planche d'animation peinte par défaut (anim/heros-<classe>.json et anim/heros.json pour guerrier)
 * - Planche en pixel art avec ?pixel=1 (pixel/heros-<race>-<classe>.json)
 */
export function withHeroSprites(manifest: SpriteManifest, races: string[], classes: string[]): SpriteManifest {
  const base = manifest.heros ?? { file: 'heros.png', height: 1.75, facesRight: true };
  const usePixel = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('pixel') === '1';

  const entries: [string, SpriteDef][] = races.flatMap((race) =>
    classes.map((cls) => {
      const name = `heros-${race}-${cls}`;
      const paintedSheet = `anim/${name}.json`;
      const sheetFile = usePixel ? `pixel/${name}.json` : paintedSheet;
      return [name, { ...base, file: `${name}.png`, sheet: { file: sheetFile, height: 2.35 } }];
    }),
  );
  return {
    ...manifest,
    heros: { ...base, file: 'heros.png', sheet: { file: usePixel ? 'pixel/heros.json' : 'anim/heros.json', height: 2.35 } },
    ...Object.fromEntries(entries),
  };
}
