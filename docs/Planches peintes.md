# Sprites peints (Nano Banana)

Les images peintes générées par Nano Banana arrivent dans `~/Pictures/game visual`, sur un fond gris uni. Trois commandes les préparent pour le jeu.

| Commande | Entrée | Sortie | Réglages |
| --- | --- | --- | --- |
| `npm run sprites` | une image fixe (PNJ, décor) | `public/sprites/<nom>.png`, détourée | `tools/sprites.json` |
| `npm run planches` | une planche d'animation (plusieurs images en grille) | `public/sprites/anim/<nom>.webp` + `.json` | `tools/planches.json` |
| `npm run sols` | `sol_ile.jpg`, `sol_rizieres.jpg` (vus de dessus) | `public/sprites/sols/` | `tools/sols.mjs` |

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

L'outil retire le fond, coupe la grille là où il y a le moins de sujet (les images peuvent se toucher), met toutes les images à la même taille de corps (`bodyHeight`), aligne les pieds et l'axe du corps, et range tout dans des cases de même taille. Pour un décor animé (`"anchor": "box"`), chaque image est recalée sur la première.

`npm run planches -- heros --apercu <dossier>` écrit aussi une bande par animation avec la ligne des pieds (rouge) et l'axe du corps (bleu), pour vérifier l'alignement.

Dans `src/data/sprites.json` (donjon) ou `src/data/islandSprites.json` (île), la planche se branche par `"sheet": { "file": "anim/heros.json" }` ; `height` reste la taille du personnage dans le monde.

## Sol de l'île

Nano Banana ne garde pas l'échelle du tracé : `npm run sols` retrouve l'échelle et le décalage qui posent les terres peintes sur les cercles praticables de `src/data/island.json` (ce sont eux qui font les collisions), puis fond les bords de l'image dans la brume. La commande affiche le recouvrement obtenu ; en dessous de 80 %, le tracé peint s'écarte trop du jeu.
