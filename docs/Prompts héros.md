# Prompts des héros (Nano Banana 2)

Chaque héros (4 races × 5 classes) a besoin d'animations peintes vues de profil et de face, toutes dessinées par Nano Banana 2 dans Gemini. La vue de dos viendra plus tard. Tout se prépare dans un seul dossier, `~/Pictures/game visual/heros/`, rempli par :

```bash
npm run kit-heros
```

Chaque prompt se colle tel quel, avec une seule image jointe. Les prompts sont écrits par `tools/prompts-heros.mjs` : c'est là qu'on les modifie, puis on relance la commande.

## Architecture

```
heros/
  LISEZMOI.txt                mode d'emploi
  <race>-<classe>/            les 20 héros, par exemple demi-dieu-invocateur
    fiche.jpg                 l'image du héros (src/assets/images, heros.png pour l'Einherjar guerrier)
    prompt-profil.txt         étape 1 : planche de 6 poses clés de profil (joindre fiche.jpg)
    prompt-face.txt           étape 1 : planche de 4 poses clés de face (joindre fiche.jpg)
    profil.jpg, face.jpg      à déposer : les résultats de l'étape 1
    poses.json                facultatif : quelle pose joindre, si la planche n'a pas les poses attendues
    apercu-profil.jpg         les poses découpées, numérotées
    apercu-face.jpg
    profil/  attente, course, attaque, garde, esquive
    face/    attente, course, attaque
      <animation>/            étape 2
        pose.png              la pose à joindre, découpée dans la planche de poses clés
        prompt.txt            le prompt de la planche d'animation complète
        planche.jpg           à déposer : le résultat
```

## Étape 1 : planches de poses clés

Dans Gemini, joindre `fiche.jpg`, coller `prompt-profil.txt`, enregistrer le résultat sous `profil.jpg`. Même chose avec `prompt-face.txt` pour `face.jpg`. Puis relancer `npm run kit-heros` : les poses sont découpées et rangées dans les dossiers d'animation.

- **Einherjar guerrier :** il a déjà ses animations de profil dans le jeu, donc pour lui seulement `face.jpg`.
- **Guerriers des autres races :** les planches de profil faites par AI Studio portent des légendes écrites et ne suivent pas la fiche, elles sont à refaire.
- **Anciennes planches `face-dos.jpg` :** elles servent encore, l'outil prend leur ligne du haut (la face).
- **Si ça sort mal**, demander dans la même conversation :
  - une pose ratée : `Redraw only pose 4, keep everything else identical.`
  - des figures qui se chevauchent : `Some figures overlap. Redraw the same sheet with more space: every figure, weapon included, must stay inside its own cell with empty grey background all around it, even if the figures get smaller.`
- **Poses dans un autre ordre :** chaque animation joint une pose de la planche. Par défaut, c'est la course (pose 2) pour la course et l'attente (pose 1) pour tout le reste. Si Nano Banana les a rangées autrement, regarder `apercu-profil.jpg` et le dire dans `poses.json`, par exemple `{ "profil": { "course": 3 } }` ; `null` supprime une animation.

## Étape 2 : planches d'animation

Dans chaque dossier d'animation, joindre `pose.png`, coller `prompt.txt`, enregistrer le résultat sous `planche.jpg`. Nombre d'images par animation : attente 6, course 8, attaque 6 (3 d'élan puis 3 de coup), garde 4, esquive 6.

Par où commencer : course puis attente, de profil et de face. Ce sont les animations qu'on voit le plus.

## Outils

- **`npm run kit-heros` :** prépare les 20 dossiers (`npm run kit-heros -- <race>-<classe>` pour un seul). Les planches déposées ne sont jamais écrasées.
- **`npm run poses -- <planche>` :** découpe une planche isolée, n'importe où, dans `poses/<planche>/`. `--grille 3x2` force le nombre de colonnes et de lignes si la détection se trompe.
- **À écrire :** le montage des `planche.jpg` en planches de jeu, et l'affichage de la vue de face selon la direction du déplacement.
