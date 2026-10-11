# Sprites peints (Nano Banana)

Les images peintes générées par Nano Banana arrivent dans `~/Pictures/game visual`, sur un fond gris uni. Cinq commandes les préparent pour le jeu ; deux autres préparent les animations des héros (voir [Prompts des héros](Prompts%20h%C3%A9ros.md)).

| Commande | Entrée | Sortie | Réglages |
| --- | --- | --- | --- |
| `npm run sprites` | une image fixe (PNJ, décor) | `public/sprites/<nom>.png`, détourée | `tools/sprites.json` |
| `npm run planches` | une planche d'animation (plusieurs images en grille) | `public/sprites/anim/<nom>.webp` + `.json` | `tools/planches.json`, et `tools/planches-heros.mjs` pour les héros |
| `npm run sols` | `ile_fond.png` (carte de l'île), `sol_rizieres.jpg` | `public/sprites/sols/` | `tools/sols.mjs` |
| `npm run carte` | `ile_fond.png` et `src/data/island.json` | `ile_fond_carte.png` (contrôle) | `tools/carte.mjs` |
| `npm run decors` | une planche de décors ou de textures de sol (grille) | `public/sprites/decor/…` détourés (`.webp` pour les planches de décors), `public/sprites/sols/textures/…` raccordées | `tools/decors.json`, prompts dans [Prompts visuels](Prompts%20visuels.md) |
| `npm run icones` | `objets_planche.jpg` (tous les objets en grille) | `public/sprites/icones/<id>.png`, 128 × 128 | `tools/icones.json` |
| `npm run poses -- <planche>` | une planche de poses clés (Nano Banana 2) | `poses/<planche>/pose-<n>.png`, une pose par image carrée | voir [Prompts des héros](Prompts%20h%C3%A9ros.md) |
| `npm run kit-heros` | `~/Pictures/game visual/heros/<race>-<classe>/profil.jpg`, `face.jpg` | un dossier par animation : la pose à joindre et le prompt | `tools/prompts-heros.mjs` |

> **Standard (octobre 2026) :** chaque personnage a une **planche complète** de 64 images, une grille 8 × 8 où chaque ligne est une animation, en personnages chibi de 3 têtes. Elle s'importe avec `layout` et `rows` (ordre des lignes et tags : [section 4 de la Charte 2D](Charte%202D.md#4-format-des-planches--une-grille-complète-de-64-images-8--8) ; import : section 8 ; modèle : l'entrée `heros-hanyo-paladin` de `tools/planches.json`). Les planches par animation décrites ci-dessous restent pour les personnages faits avant ce standard.

On peut ne traiter qu'une entrée : `npm run sprites -- decor/ema`, `npm run planches -- heros`.

## Planches d'animation

`tools/planches.json` décrit, pour chaque sprite, une animation par posture du jeu (idle, move, windup, strike, guard, dash, stunned, channel, airborne) :

```json
{ "tag": "windup", "source": "sprites/heros_windup.jpg", "layout": [3, 4], "frames": [3, 4, 5, 6], "ref": 0, "duration": 70, "once": true }
```

| Champ | Rôle |
| --- | --- |
| `count` | nombre d'images de la planche source (deux lignes égales si le nombre est pair) |
| `layout` | nombre d'images par ligne, quand les lignes ne sont pas égales |
| `frames` | images à garder, dans l'ordre (par défaut toutes) |
| `ref` | image debout qui sert d'étalon de taille (par défaut la plus grande) |
| `duration` / `durations` | durée de chaque image, en millisecondes |
| `once` | animation jouée une fois, qui s'arrête sur sa dernière image (coups) |

Une même planche source peut servir à deux animations : l'attaque des nouveaux prompts tient sur une planche de 6 images, l'élan (`"frames": [0, 1, 2]`) puis le coup (`[3, 4, 5]`).

Nano Banana ajoute parfois ce qu'on ne lui a pas demandé. Ces réglages le retirent, pour une animation ou pour toute la planche :

| Champ | Rôle |
| --- | --- |
| `eraseLines` | efface les traits droits : lignes de sol, grilles, cadres. `{ "length": 0.03, "vertical": false }` pour de courtes lignes de sol, sans toucher aux pattes et aux bâtons verticaux |
| `erase` | vide des rectangles, en fractions de l'image (`[x0, y0, x1, y1]`) : titres, numéros des images |
| `seeds` | points de départ d'un fond d'un autre gris (cases grises dessinées autour des images), un par case |
| `fillHoles`, `minHole`, `holeTolerance` | vident le fond enfermé par le sujet (entre les pattes et les fils de la Jorōgumo, sous le bâton du kappa) |
| `tolerance` | écart de couleur accepté pour le fond : plus haut pour effacer des ombres grises, plus bas sur fond noir |

L'outil retire le fond, coupe la grille là où il y a le moins de sujet (les images peuvent se toucher), met toutes les images à la même taille de corps (`bodyHeight`), aligne les pieds et l'axe du corps, et range tout dans des cases de même taille. Pour un décor animé (`"anchor": "box"`), chaque image est recalée sur la première.

`npm run planches -- heros --apercu <dossier>` écrit aussi une bande par animation avec la ligne des pieds (rouge) et l'axe du corps (bleu), pour vérifier l'alignement.

Dans `src/data/sprites.json` (donjon) ou `src/data/islandSprites.json` (île), la planche se branche par `"sheet": { "file": "anim/heros.json" }` ; `height` reste la taille du personnage dans le monde.

## Carte de l'île

L'île est une seule grande image peinte, vue par la caméra du jeu (isométrie, 35° de plongée) : `~/Pictures/game visual/ile_fond.png` (générée par Nano Banana à partir d'un schéma, agrandie ×2 par Real-ESRGAN). `npm run sols` en fait `public/sprites/sols/ile-fond.webp` (4096 de côté, bords fondus dans la couleur de la mer) et sa copie en 512, `ile-fond-512.webp`, où le jeu lit l'eau et l'herbe (`map.sample`) sans décoder la grande au démarrage. Le jeu la pose au sol, alignée sur l'écran et étirée en profondeur pour qu'on la retrouve telle quelle (`src/render/islandMap.ts`), avec la mer unie au-delà, les reflets animés sur l'eau peinte, les ombres et les décors des planches (`npm run decors`) posés par le code, par biome.

Tout ce qui fait le jeu se trace sur l'image, dans `src/data/island.json` (coordonnées d'écran u, v ; `map.width` = largeur de l'image dans le monde) :

| Champ | Rôle |
| --- | --- |
| `walk` | polygones des zones où l'on marche (terrasses, chemins, escaliers, pont, ponton) : ce sont les collisions |
| `blocks` | obstacles à l'intérieur des zones de marche ou du lit de la rivière (un muret, un rocher) |
| `river` | lit de la rivière : on y marche en contrebas ; on y descend et on en remonte seulement là où il chevauche une zone de marche (le bas des marches du quai), jamais depuis un pont ; partout ailleurs il reste à l'écart des zones de marche |
| `bridges` | tabliers des ponts tels qu'ils sont peints : ils passent devant le héros qui marche dessous (garder aussi une zone de marche dessus) |
| `scenery` | eau des rizières (riz), bassin (nénuphars), bosquets et plages où l'on ne va pas (décors) |
| `areas` | zones nommées ; chacune donne sa végétation aux décors autour |
| `props`, `interactables` | bâtiments, PNJ, objets |
| `decor` | décors posés à la main (facultatif) : sans lui, le code les pose lui-même par biome (`src/render/islandDecor.ts`) |

**Éditeur de carte** : `npm run editeur` ouvre `editeur.html` (seulement en développement). On y déplace à la souris les zones de marche et leurs sommets, les obstacles, les zones nommées, les bâtiments, les PNJ, le départ et chaque décor, dessinés à leur taille dans le jeu ; une palette pose de nouveaux décors et bâtiments. Ctrl+S enregistre dans `island.json` (même format compact) et le jeu ouvert se recharge seul. Modifier un décor fige tous les décors automatiques dans `decor` ; « Revenir au placement du jeu » les retire. Le bouton « ? Aide » liste les commandes.

**Zones tracées d'après la peinture** : `npm run zones` (`tools/zones-de-marche.mjs`) refait `walk`, `river` et `blocks` à partir de l'image : chaque pixel est classé par sa couleur et son grain (herbe, sable, dallage / falaise, rocher, muret / eau), les zones de marche suivent donc les bords des falaises et des murets au pixel près. Les escaliers, le quai, le ponton, le pont, le couloir de la rivière et les marches que les couleurs ne voient pas (herbe contre herbe plus basse) sont tracés à la main en tête du script, en pixels de la grille 1024. Il remplace les retouches faites dans l'éditeur sur ces trois calques.

`npm run carte` redessine l'image avec tout cela par-dessus (`ile_fond_carte.png`, grille tous les 64 pixels d'une image de 1024) pour retoucher à l'œil. Pour passer d'un pixel (px, py) de cette grille aux coordonnées du jeu : u = (px − 512) / 1024 × map.width, v = (512 − py) / 1024 × map.width / sin 35,26°.

> **Scènes en 3D (expérimental, octobre 2026) :** avec `?3d` dans l'adresse, les arènes sont construites en 3D (`src/render/world3d.ts`, `rizieres3d.ts`, `arena3d.ts`), modèles KayKit (CC0) dans `public/models/`. L'île n'a plus de version 3D : sa carte peinte l'a remplacée.

## Icônes des objets

`npm run objets` dessine en pixel art la planche de référence de tous les objets et matériaux (dans l'ordre de `src/data/items.json`), à donner à Nano Banana avec le prompt de `public/sprites/sprites/objets/Prompt objets.md`. Le résultat peint, `objets_planche.jpg`, est découpé par `npm run icones` : chaque morceau revient à la case de la grille qui contient son centre, et `tools/icones.json` dit quel objet occupe chaque case.

Autour de l'objet, le gris du fond est retiré en demi-transparence (« couleur vers alpha ») : les halos peints restent doux sur le papier de l'interface. Réglages par icône dans `icons` :

| Champ | Rôle |
| --- | --- |
| `fillHoles`, `minHole` | vide le fond enfermé par l'objet (boucle d'un cordon, trou des pièces), en poches d'au moins `minHole` pixels |
| `holes` | ne vide que les poches qui contiennent ces points (fractions de la case) : pour un objet dont les ombres ont le gris du fond, comme le masque blanc |

L'aperçu `public/sprites/sprites/objets/apercu-icones.png` montre toutes les icônes sur le papier et sur l'encre. Pour un nouvel objet : l'ajouter à `items.json`, dessiner son icône pixel dans `tools/pixel/objets.mjs`, régénérer la planche, puis ajouter une planche (ou une case) dans `tools/icones.json`. En attendant sa version peinte, `npm run icones-pixel` écrit l'icône en pixel art (32 × 32 agrandi quatre fois) pour chaque objet qui n'a pas encore d'icône ; il n'écrase jamais une icône peinte (`npm run icones-pixel -- <id>` force une icône précise).
