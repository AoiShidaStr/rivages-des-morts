# Île v3 (pixel art) : génération de la carte et export vers le jeu

La carte de l'île en pixel art (style Forgotten Memories + Resurrected RPG) est **générée par ces scripts** à partir
d'un plan (`plan.py`), puis exportée vers le jeu : la carte sans ses décors, son relief (normales et hauteurs) pour
l'éclairage, les décors un par un, les zones de marche, les lumières, et les PNJ replacés.

Le jeu l'éclaire avec `src/render/islandLighting.ts` (heure du jour, ombres portées, lanternes, torche du héros, eau,
brume) et la pose avec `src/render/islandMap.ts`.

## Prérequis

- Python 3 avec `numpy`, `scipy`, `opencv-python`, `Pillow`.
- Les packs de tuiles achetés par Meven, **qui ne sont pas dans le dépôt** (licence : pas de redistribution) :
  `packs/ForgottenMemories/` et `packs/Resurrected RPG 1.1/`, ou bien la variable d'environnement `PACKS` qui pointe
  vers le dossier qui les contient.
- `jeu/rocher.png` : le Grand Rocher du jeu, redessiné dans le style de la carte (gardé ici).

## Étapes (dans ce dossier)

```sh
python3 rendu.py 4224              # la carte sans décors : ile-4224.png (aperçu)
python3 decorer.py                 # aperçu avec les décors : ile-decors-4224.png
python3 eclairage.py               # textures de la démo d'éclairage, et lumieres.json (lanternes, forge, lave…)
python3 geo_cache.py               # rend la carte une fois et garde sa géométrie : export/geo.npz, export/plan.pkl
git show 4c2cba1^:src/data/island.json > export/island-origine.json   # l'île d'avant la v3 : positions de départ
python3 export_jeu.py ../.. textures donnees    # public/sprites/ile/v3 et public/sprites/decor/v3
python3 export_positions.py ../..               # src/data/island.json (+ export/positions.png pour vérifier)
python3 arenes.py ../.. [yomi rizieres fujikasane]   # arènes des donjons : public/sprites/arenes, src/data/arenes.json
```

`arenes.py` dessine les arènes des donjons avec le même rendu que l'île : un petit plan autour du carré de combat
(±6 unités du plan, l'arenaHalfSize 9 du jeu), rendu à la même échelle, recadré sur ce que la caméra du combat peut
montrer, teinté (la nuit du Mont Fujikasane, la caverne du Yomi, la brume des rizières) et fondu dans la couleur du
fond. Les arbres, rochers, torii et lanternes sont des décors debout posés par le jeu (src/render/arenaPixel.ts) ;
devant l'arène, rien de haut, qui cacherait le combat. Les rochers et la souche (les obstacles) viennent des packs.
Aperçus avec les décors : /tmp/claude-0/arene-*.png.

`export_jeu.py` :

- `sol.webp` : la carte sans ses décors ; alpha = 1 - émissif / 2 (lave, portail, flammes).
- `relief.webp` : R, G la normale (x, y), B la hauteur / 12, alpha = 1 - 0,75 × eau (0 sec, 64 décor, 128 rizière,
  192 eau, 255 cascade). Les décors sont marqués pour que leurs ombres ne soient qu'une coque.
- `hauteur.webp` : la hauteur du sol seul, en petit (où se tiennent le héros et les PNJ).
- `halo.webp` : la lumière colorée de la lave et du portail, étalée (sans les lanternes de pierre : le jeu les allume
  selon la quête).
- `decor/v3/*.webp` : un sprite par décor, pied au milieu, avec ce qui dépasse sous le pied (`below`).
- Zones de marche : tout le sol sauf l'eau, la lave, les parois et les sauts de plus de 0,7 de haut ; les escaliers
  et les ponts relient les niveaux.

`export_positions.py` replace les PNJ, objets et zones de l'île d'origine sur la nouvelle carte (repères à la main,
le reste par interpolation, puis posé sur la zone de marche la plus proche) et relie chaque lumière de lanterne de
pierre à son objet (`lamp`) : elle n'éclaire qu'une fois allumée.

## Repères

Image de 4224 px pour 120 × 120·√3 unités du monde. Un point du plan (u, v) à la hauteur h tombe dans l'image en
(1,5·u, 1,5·v + √2·h) : le jeu marche « sur l'image » ; la lumière, elle, travaille au sol (v - √2·h).
