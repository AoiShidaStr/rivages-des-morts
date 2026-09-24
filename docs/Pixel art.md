# Pixel art et animations

Les personnages sont affichés en pixel art animé : une planche d'images (PNG) et sa description (JSON), une animation par posture du jeu. Tout le bestiaire du Yomi en a une :

| Sprite | Fichier du générateur | Animations |
| --- | --- | --- |
| `heros` | `tools/pixel/heros.mjs` | idle, move, windup, strike, guard, dash |
| `oublie` | `tools/pixel/oublie.mjs` | idle, move, windup, strike, stunned |
| `hitodama` | `tools/pixel/hitodama.mjs` | move |
| `kodama` | `tools/pixel/kodama.mjs` | idle, move, channel, stunned |
| `kappa`, `kappaRenforce` | `tools/pixel/kappa.mjs` (`kappa(true)` pour l'élite) | idle, move, windup, dash, stunned |
| `kasaObake` | `tools/pixel/kasa-obake.mjs` | idle, move, airborne, stunned |
| `araignee` | `tools/pixel/araignee.mjs` | idle, move, windup, strike, stunned |
| `jorogumo`, `jorogumoAraignee` | `tools/pixel/jorogumo.mjs` | idle, move, windup, strike, channel, stunned (+ dash, airborne pour l'araignée) |

Les souches, les Jizō et le torii restent des images fixes.

`?pixel=0` dans l'adresse du jeu revient aux images peintes, pour comparer.

## Postures

Le jeu choisit l'animation d'après la posture du personnage. Chaque tag de la planche porte le nom d'une posture :

| Tag | Quand | Boucle |
| --- | --- | --- |
| `idle` | à l'arrêt | oui |
| `move` | en déplacement | oui |
| `windup` | armement d'un coup (le rouge qui clignote) | non |
| `strike` | le coup part | non |
| `guard` | blocage (héros) | oui |
| `dash` | esquive, charge | oui |
| `stunned` | étourdi | oui |
| `channel` | concentration (soin du kodama) | oui |
| `airborne` | en l'air (kasa-obake) | oui |

Une posture sans animation retombe sur la plus proche (`dash` → `move`, `stunned` → `idle`…), puis sur `idle`. Une animation « non » en boucle s'arrête sur sa dernière image.

## Méthode 1 : le générateur (`npm run pixel`)

Chaque personnage est un pantin décrit dans `tools/pixel/<nom>.mjs` :

- des **pièces** dessinées en texte, un caractère par pixel (tête, torse) ;
- des **membres** tracés entre des articulations (hanche → genou → pied, épaule → coude → main), le coude et le genou se plaçant tout seuls ;
- des **animations** : pour chaque image, une pose.

Les créatures qui ne sont pas humanoïdes (kappa, kasa-obake, araignées…) sont dessinées avec des formes simples (ellipses ombrées, traits, rectangles) et leurs poses ont des champs propres à chacune : voir le haut de leur fichier.

Une pose du héros ressemble à ceci :

```js
{ lean: 2, body: [1, 1], footF: [6, 9], footB: [-5, 9], hand: [6, 3], blade: 15, smear: [-110, 15], cape: 3 }
```

| Champ | Rôle |
| --- | --- |
| `body` | décalage des hanches, en pixels (rebond, accroupi) |
| `lean` | penche le buste et la tête vers l'avant (+) ou l'arrière (−) |
| `footF`, `footB` | pied avant et arrière, par rapport aux hanches |
| `hand` | main avant, par rapport à l'épaule |
| `blade` | angle du sabre en degrés (0 = devant, −90 = vers le haut) |
| `smear` | traînée du coup, de l'angle de départ à l'angle d'arrivée |
| `cape` | la cape flotte vers l'arrière |
| `duration` | durée de l'image en secondes (sinon celle de l'animation) |

Pour ajouter une animation : ajouter une entrée dans `animations`, avec le nom d'une posture, puis `npm run pixel`. Le résultat est écrit dans `public/sprites/pixel/`.

## Méthode 2 : dessiner dans Aseprite ou LibreSprite

1. Dessiner le personnage tourné vers la droite, les pieds en bas de l'image, centré horizontalement.
2. Créer un tag par posture, nommé comme dans le tableau ci-dessus. Pour `windup` et `strike`, régler la répétition du tag sur 1.
3. Exporter la planche : *File → Export Sprite Sheet*, *Output → JSON Data* au format **Array**, avec les tags.
4. Déposer le PNG et le JSON dans `public/sprites/pixel/`, puis dans `src/data/sprites.json` :

```json
"kappa": { "file": "kappa.png", "sheet": { "file": "pixel/kappa.json", "height": 2 }, "height": 1.45, "facesRight": true }
```

`sheet.height` est la hauteur d'une image entière de la planche dans le jeu, marges comprises.

On peut aussi partir des planches générées : les ouvrir dans Aseprite (*File → Import Sprite Sheet*) et retoucher les images à la main. Attention, `npm run pixel` les écrase ; retirer alors le personnage du générateur.
