# Prompts des héros (Nano Banana 2, Kling)

Chaque héros (4 races × 5 classes) a besoin d'animations peintes vues de profil, de face et de dos. Tout se prépare dans un seul dossier, `~/Pictures/game visual/heros/`, rempli par :

```bash
npm run kit-heros
```

Chaque prompt se colle tel quel, avec une seule image jointe. Les prompts sont écrits par `tools/prompts-heros.mjs` : c'est là qu'on les modifie, puis on relance la commande.

## Architecture

```
heros/
  LISEZMOI.txt                mode d'emploi
  prompt-negatif.txt          prompt négatif des vidéos
  <race>-<classe>/            les 20 héros, par exemple demi-dieu-invocateur
    fiche.jpg                 l'image du héros (src/assets/images, heros.png pour l'Einherjar guerrier)
    prompt-profil.txt         étape 1 : planche de 6 poses clés de profil
    prompt-face-dos.txt       étape 1 : planche de 4 poses de face et 4 de dos
    profil.jpg, face-dos.jpg  à déposer : les résultats de l'étape 1
    poses.json                facultatif : quelles poses prendre, si la planche n'a pas celles attendues
    apercu-profil.jpg         les poses découpées, numérotées
    apercu-face-dos.jpg
    profil/  attente, course, attaque, garde, esquive
    face/    attente, course, attaque
    dos/     attente, course, attaque
      <animation>/            étape 2
        debut.png, fin.png    poses de début et de fin, découpées dans la planche
        prompt-planche.txt    option 1 : Nano Banana 2 dessine toute l'animation (joindre debut.png)
        prompt-video.txt      option 2 : Kling, Dreamina ou PixVerse anime de debut.png à fin.png
        planche.jpg           à déposer : le résultat de l'option 1
        video.mp4             à déposer : le résultat de l'option 2
```

## Étape 1 : planches de poses clés

Dans Gemini (Nano Banana 2), joindre `fiche.jpg`, coller `prompt-profil.txt`, enregistrer le résultat sous `profil.jpg`. Même chose avec `prompt-face-dos.txt` pour `face-dos.jpg`. Puis relancer `npm run kit-heros` : les poses sont découpées et rangées dans les dossiers d'animation.

- **Planches de profil déjà faites :** l'Einherjar guerrier a déjà ses animations de profil dans le jeu, donc pour lui seulement `face-dos.jpg`. Les autres planches de profil faites par AI Studio portent des légendes écrites et ne suivent pas la fiche : elles sont à refaire.
- **Si ça sort mal**, demander dans la même conversation :
  - une pose ratée : `Redraw only pose 4, keep everything else identical.`
  - des figures qui se chevauchent : `Some figures overlap. Redraw the same sheet with more space: every figure, weapon included, must stay inside its own cell with empty grey background all around it, even if the figures get smaller.`
- **Plus ou moins de 6 poses :** si Nano Banana en dessine un autre nombre, regarder `apercu-profil.jpg` et dire dans `poses.json` lesquelles prendre, par exemple `{ "profil": { "garde": [1, 6], "esquive": [1, 8] } }`. Pour le dos, 1 à 4 sont les poses de la ligne du bas. `null` supprime une animation.

## Étape 2 : animations

Pour chaque animation, deux options, à comparer :

1. **Nano Banana 2, planche complète (0 €) :** joindre `debut.png` et coller `prompt-planche.txt`. On obtient 4 à 8 images dessinées : attente 6, course 8, attaque 6, garde 4, esquive 6. Enregistrer sous `planche.jpg`.
2. **Vidéo (crédits gratuits quotidiens de Kling, Dreamina ou PixVerse) :**
   - mode **image vers vidéo** avec **image de début et de fin**, 5 secondes ;
   - image de début `debut.png`, image de fin `fin.png` ;
   - prompt `prompt-video.txt`, prompt négatif `prompt-negatif.txt` ;
   - enregistrer sous `video.mp4`.

   Pour attente et course, `fin.png` est la même image que `debut.png` pour que la vidéo boucle. Si le site fige le personnage, ne donner que l'image de début.

Par où commencer : course puis attente, dans les trois vues. Ce sont les animations qu'on voit le plus.

## Outils

- **`npm run kit-heros` :** prépare les 20 dossiers (`npm run kit-heros -- <race>-<classe>` pour un seul). Les planches et vidéos déposées ne sont jamais écrasées.
- **`npm run poses -- <planche>` :** découpe une planche isolée, n'importe où, dans `poses/<planche>/`. `--grille 3x2` force le nombre de colonnes et de lignes si la détection se trompe.
- **Découpe des poses :** toutes les poses d'une planche gardent la même échelle, les pieds à la même hauteur et le corps sur le même axe. Prises comme début et fin d'une vidéo, elles ne font pas sauter le personnage.
- **À écrire :** le montage des `planche.jpg` et `video.mp4` en planches de jeu, et l'affichage des vues de face et de dos selon la direction du déplacement.
