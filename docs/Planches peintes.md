# Sprites peints (Nano Banana)

Les images peintes générées par Nano Banana arrivent dans `~/Pictures/game visual`, sur un fond gris uni. Quatre commandes les préparent pour le jeu ; deux autres préparent les animations des héros (voir [Prompts des héros](Prompts%20h%C3%A9ros.md)).

| Commande | Entrée | Sortie | Réglages |
| --- | --- | --- | --- |
| `npm run sprites` | une image fixe (PNJ, décor) | `public/sprites/<nom>.png`, détourée | `tools/sprites.json` |
| `npm run planches` | une planche d'animation (plusieurs images en grille) | `public/sprites/anim/<nom>.webp` + `.json` | `tools/planches.json`, et `tools/planches-heros.mjs` pour les héros |
| `npm run sols` | `sol_ile.jpg`, `sol_rizieres.jpg` (vus de dessus) | `public/sprites/sols/` | `tools/sols.mjs` |
| `npm run icones` | `objets_planche.jpg` (tous les objets en grille) | `public/sprites/icones/<id>.png`, 128 × 128 | `tools/icones.json` |
| `npm run poses -- <planche>` | une planche de poses clés (Nano Banana 2) | `poses/<planche>/pose-<n>.png`, une pose par image carrée | voir [Prompts des héros](Prompts%20h%C3%A9ros.md) |
| `npm run kit-heros` | `~/Pictures/game visual/heros/<race>-<classe>/profil.jpg`, `face.jpg` | un dossier par animation : la pose à joindre et le prompt | `tools/prompts-heros.mjs` |

> **Essai en cours :** pour les héros, une piste de squelette 2D à pièces séparées (équipement visible, genre) pourrait remplacer ces planches complètes. Voir la [section 11 de la Charte 2D](Charte%202D.md#11-héros-modulaire-paper-doll-piste-en-essai). Les ennemis et les boss restent en planches.

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

## Sol de l'île

Nano Banana ne garde pas l'échelle du tracé : `npm run sols` retrouve l'échelle et le décalage qui posent les terres peintes sur les cercles praticables de `src/data/island.json` (ce sont eux qui font les collisions), puis fond les bords de l'image dans la brume. La commande affiche le recouvrement obtenu ; en dessous de 80 %, le tracé peint s'écarte trop du jeu.

## Icônes des objets

`npm run objets` dessine en pixel art la planche de référence de tous les objets et matériaux (dans l'ordre de `src/data/items.json`), à donner à Nano Banana avec le prompt de `public/sprites/sprites/objets/Prompt objets.md`. Le résultat peint, `objets_planche.jpg`, est découpé par `npm run icones` : chaque morceau revient à la case de la grille qui contient son centre, et `tools/icones.json` dit quel objet occupe chaque case.

Autour de l'objet, le gris du fond est retiré en demi-transparence (« couleur vers alpha ») : les halos peints restent doux sur le papier de l'interface. Réglages par icône dans `icons` :

| Champ | Rôle |
| --- | --- |
| `fillHoles`, `minHole` | vide le fond enfermé par l'objet (boucle d'un cordon, trou des pièces), en poches d'au moins `minHole` pixels |
| `holes` | ne vide que les poches qui contiennent ces points (fractions de la case) : pour un objet dont les ombres ont le gris du fond, comme le masque blanc |

L'aperçu `public/sprites/sprites/objets/apercu-icones.png` montre toutes les icônes sur le papier et sur l'encre. Pour un nouvel objet : l'ajouter à `items.json`, dessiner son icône pixel dans `tools/pixel/objets.mjs`, régénérer la planche, puis ajouter une planche (ou une case) dans `tools/icones.json`. En attendant sa version peinte, `npm run icones-pixel` écrit l'icône en pixel art (32 × 32 agrandi quatre fois) pour chaque objet qui n'a pas encore d'icône ; il n'écrase jamais une icône peinte (`npm run icones-pixel -- <id>` force une icône précise).
