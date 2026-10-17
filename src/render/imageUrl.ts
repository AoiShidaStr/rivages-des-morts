// Le build convertit chaque PNG de public/sprites en WebP à côté de lui (vite.config.ts, plugin `webpSprites`) : le
// jeu construit demande la version WebP, bien plus légère ; `npm run dev` garde les PNG d'origine.
const SPRITE_PNG = /(\/sprites\/[^?#]*)\.png(?=$|[?#])/;

export function imageUrl(url: string): string {
  return import.meta.env.PROD ? url.replace(SPRITE_PNG, '$1.webp') : url;
}
