# PixelLab : les héros en pixel art animé

Les héros sont générés sur [PixelLab](https://pixellab.ai) (serveur MCP `https://api.pixellab.ai/mcp`), en 2 directions :
face (vers le bas à droite, `south-east`) et dos (vers le haut à droite, `north-east`). Le jeu fait les deux directions
de gauche en miroir. 4 animations par héros : déplacement, attaque, spéciale, mort ; l'attente est la 1re image du
déplacement.

- `persos.json` : le plan (les 20 héros, leur description, la méthode la moins chère pour chaque animation de chaque classe).
- `etat.json` : ce qui est fait (identifiants PixelLab, coût payé, statut de chaque animation). Pas de secret dedans.
- `routine.py` : la routine (voir plus bas).
- `cornes.py` : ajoute les cornes des Hanyō sur les 8 vues (PixelLab ne les dessine pas à cette taille).
- `sorties/` (non suivi) : les images téléchargées, les aperçus et les planches. `routine.py telecharger ID` les
  retélécharge.

## Le jeton

Jamais dans le dépôt ni dans la mémoire. `routine.py` le lit dans la variable `PIXELLAB_TOKEN`, ou dans le fichier
désigné par `PIXELLAB_TOKEN_FILE` (une ligne `PIXELLAB_TOKEN=...`).

## Coûts mesurés (essai gratuit, 22/10/2026)

| Étape | Méthode | Coût |
|---|---|---|
| Créer un héros (8 vues) | `create_character` standard, `size` 53 (toile 76 px, corps de 62 px) | 1 |
| Réimporter les 8 vues retouchées | `create_character` v3 avec les 8 images | 1 |
| Animation sur un modèle | `walking-8-frames`, `falling-back-death`, `throw-object`, `fireball`, `cross-punch` | 1 par direction |
| Animation libre | v3, 6 images, sur la toile de 76 px (générée en 96 px) | 1 par direction |
| Animation libre de 8 images | v3, 8 images | 2 par direction |
| À éviter | création « pro », états, `transfer_outfit` | 10 à 25 |

Un héros complet en 2 directions coûte donc 9 générations (10 pour un Hanyō, à cause de l'import des cornes).
L'essai gratuit donne 40 générations, puis un bonus de 5 par jour (cumulable jusqu'à 20).

## La routine

Une étape = créer un héros, ou une animation dans une direction. On ne paie qu'une étape à la fois, et la face
avant le dos : si la face est ratée, on ne paie pas le dos.

```sh
export PIXELLAB_TOKEN_FILE=/chemin/vers/.pixellab.env
python3 tools/pixellab/routine.py solde          # combien il reste
python3 tools/pixellab/routine.py plan           # ce qui reste à faire et son coût estimé
python3 tools/pixellab/routine.py lancer         # la prochaine étape, si le solde suffit
python3 tools/pixellab/routine.py apercu ID      # sorties/ID/apercu.png et un GIF par animation
python3 tools/pixellab/routine.py refaire ID ANIM DIR   # étape ratée : refaite au prochain `lancer`
python3 tools/pixellab/routine.py planche ID public/sprites/anim   # la planche du jeu, une fois le héros fini
```

`lancer --etapes N` en fait plusieurs, `--perso ID` et `--anim ANIM` choisissent lesquelles, `--budget N` plafonne la
dépense. La routine s'arrête d'elle-même quand le solde ne suffit plus.

Pour un Hanyō, après la création : `python3 tools/pixellab/cornes.py sorties/ID/rotations sorties/ID-cornes`
(positions des cornes à ajuster dans `CORNES` si la tête change), puis
`python3 tools/pixellab/routine.py importer ID tools/pixellab/sorties/ID-cornes`.

Chaque jour : `solde`, puis `lancer` jusqu'à épuiser le bonus, en regardant l'aperçu après chaque étape. Une étape
ratée se refait une fois au plus ; au-delà, on note le défaut dans `etat.json` et on passe à la suite.

## La planche du jeu

`planche` aligne toutes les images sur une même case (les animations libres sortent sur une toile plus grande, centrée
sur celle du héros) et écrit le JSON au format Aseprite lu par `src/render/sheets.ts` : tags `move`, `strike`,
`skill`, `ultimate`, `death`, `idle` pour la face, et les mêmes suivis de `-dos` pour le dos.
