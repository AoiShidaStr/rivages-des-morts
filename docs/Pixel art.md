# Pixel art et animations

Le jeu est entièrement en pixel art : personnages, PNJ, décors, sols, portraits et icônes. Les images peintes (Nano Banana) restent disponibles pour comparer : bouton « Graphismes » de l'écran titre, ou `?style=peint` dans l'adresse (`?style=pixel` pour revenir).

## Une seule échelle : 18 pixels par unité

Tout le pixel art est dessiné à la même densité, `PPU = 18` pixels par unité du monde (`src/style.ts`) : un héros de 1,75 unité fait environ 32 pixels de haut. En style pixel, l'écran est **rendu en basse résolution** (un pixel de sprite = un pixel rendu), puis agrandi d'un facteur entier sans lissage : les pixels restent des carrés nets, même pour les effets de coups. Une planche en pixel art n'est donc jamais agrandie ni réduite dans le monde : sa taille vient de son nombre de pixels.

## Ce que produit `npm run pixel`

| Quoi | Générateur | Sortie |
| --- | --- | --- |
| Ennemis et boss | `tools/pixel/<nom>.mjs` | `public/sprites/pixel/<nom>.png` + `.json` |
| PNJ de l'île, animés | `tools/pixel/pnj.mjs` | idem, et leur portrait dans `pixel/portraits/` |
| Décors de l'île et du donjon | `tools/pixel/decors.mjs` | idem (forge, portail, cascade, lanternes et rocher sont animés) |
| Sols de l'île et des rizières | `tools/pixel/sols.mjs` | `public/sprites/pixel/sols/` |
| Icônes des objets | `tools/pixel/objets.mjs` | `public/sprites/pixel/icones/` |
| Héros de référence (Einherjar guerrier) | `tools/pixel/heros.mjs` | `public/sprites/pixel/heros.png` |

`npm run pixel -- charon forge` ne refait que ces planches ; `npm run pixel -- sols` ou `-- icones` que les sols ou les icônes. Le sol de l'île suit `src/data/island.json` : le refaire après avoir déplacé un rivage, un chemin ou une zone.

Dans `src/data/sprites.json` (donjon) et `islandSprites.json` (île), le champ `pixel` d'un sprite donne sa planche en pixel art ; `file` et `sheet` sont les images peintes.

Pour voir une planche sans lancer le jeu : `node tools/pixel/apercu.mjs tools/pixel/decors.mjs apercu.png 3` (toutes les planches d'un fichier, agrandies trois fois).

## Le héros : race, classe et équipement

Le héros n'a pas de planche fixe : le jeu le dessine à la volée (`src/render/pixelHero.ts`) avec le générateur `tools/pixel/heros.mjs`, chaque fois que son apparence change. Comme un personnage de Wakfu, tout se voit :

- **race** (`RACES`) : tête, torse et couleurs du corps (Einherjar, Oushebti, Demi-dieu, Hanyō) ;
- **classe** (`KITS`) : cape, prise en main, arme de départ et animations (le Rôdeur bande l'arc au lieu de frapper) ;
- **arme** (`WEAPONS`) : une forme par arme de `items.json` (nodachi, kanabō, katana, grelots, éventail, kunai, crocs, kusarigama, naginata et bouclier, tetsubō et cloche, miroir, trois arcs) ;
- **casque** (`HELMETS`), **plastron** (`CHESTS`), **jambières** (`LEGS`), **bottes** (`BOOTS`), **amulette** (`AMULETS`) : posés sur la tête, le torse, les jambes, les pieds et le cou.

Pour qu'un nouvel objet se voie sur le héros, lui ajouter une entrée dans la table de son emplacement, avec le même identifiant que dans `items.json`. Un objet sans dessin ne change rien au personnage.

On voit le héros en grand sur l'écran de création (avec l'arme de départ de la classe) et dans l'inventaire, où survoler un objet le lui fait essayer.

## Éditeur d'animations

`npm run dev`, puis ouvrir `http://localhost:5173/editeur.html`.

- À gauche, les animations : **Mêlée** (toutes les classes sauf le Rôdeur), **Arc** (Rôdeur), et les retouches propres à une classe (la garde du Paladin, bouclier levé).
- Au centre, l'image en cours, très agrandie. On tire à la souris les ronds : hanches (jaune), pied avant et arrière (rouges), main avant (cyan), main arrière (bleue) et pointe de l'arme (blanc). Les flèches du clavier déplacent d'un pixel le dernier rond touché. L'image précédente apparaît en transparence.
- Sous l'image, les images de l'animation : dupliquer, supprimer, déplacer.
- À droite, l'aperçu animé, et les réglages de l'image : durée, buste penché, tête, cape, angle de l'arme, traînée du coup.
- En haut, la race, la classe et l'équipement du héros montré, pour vérifier une pose avec chaque arme.

**Enregistrer** (ou <kbd>Ctrl</kbd> + <kbd>S</kbd>) réécrit `tools/pixel/heros-animations.json` ; le jeu ouvert dans un autre onglet se recharge avec les nouvelles poses.

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
| `channel` | concentration (soin du kodama, tir chargé du Rôdeur) | oui |
| `airborne` | en l'air (bond, kasa-obake) | oui |

Une posture sans animation retombe sur la plus proche (`dash` → `move`, `stunned` → `idle`…), puis sur `idle`. Une animation « non » en boucle s'arrête sur sa dernière image.

## Poses du héros

Une pose ressemble à ceci :

```json
{ "lean": 2, "body": [1, 1], "footF": [6, 9], "footB": [-5, 9], "hand": [6, 3], "blade": 15, "smear": [-110, 15], "cape": 3 }
```

| Champ | Rôle |
| --- | --- |
| `body` | décalage des hanches, en pixels (rebond, accroupi) |
| `lean` | penche le buste et la tête vers l'avant (+) ou l'arrière (−) |
| `head` | décale la tête seule |
| `footF`, `footB` | pied avant et arrière, par rapport aux hanches |
| `hand`, `handB` | main avant et arrière, par rapport à l'épaule (sans `handB`, la main arrière suit l'arme) |
| `blade` | angle de l'arme en degrés (0 = devant, −90 = vers le haut) |
| `smear` | traînée du coup, de l'angle de départ à l'angle d'arrivée |
| `draw` | arc bandé : la corde va jusqu'à la main arrière (Rôdeur) |
| `cape` | la cape flotte vers l'arrière |
| `duration` | durée de l'image en secondes (sinon celle de l'animation) |

## Les autres personnages

Chaque ennemi est un petit pantin décrit dans `tools/pixel/<nom>.mjs` : des **pièces** dessinées en texte (un caractère par pixel), des **membres** tracés entre des articulations (le coude et le genou se placent tout seuls), et des **animations** (une pose par image). Les créatures qui ne sont pas humanoïdes (kappa, kasa-obake, araignées…) sont dessinées avec des formes simples ; leurs poses ont des champs propres à chacune, voir le haut de leur fichier.

| Sprite | Fichier du générateur | Animations |
| --- | --- | --- |
| `oublie` | `tools/pixel/oublie.mjs` | idle, move, windup, strike, stunned |
| `hitodama` | `tools/pixel/hitodama.mjs` | move |
| `kodama` | `tools/pixel/kodama.mjs` | idle, move, channel, stunned |
| `kappa`, `kappaRenforce` | `tools/pixel/kappa.mjs` (`kappa(true)` pour l'élite) | idle, move, windup, dash, stunned |
| `kasaObake` | `tools/pixel/kasa-obake.mjs` | idle, move, airborne, stunned |
| `araignee` | `tools/pixel/araignee.mjs` | idle, move, windup, strike, stunned |
| `jorogumo`, `jorogumoAraignee` | `tools/pixel/jorogumo.mjs` | idle, move, windup, strike, channel, stunned (+ dash, airborne pour l'araignée) |
| PNJ (`charon`, `obaa-kiku`, `tetsu`, `yuki`, `tanuki`, `moine`) | `tools/pixel/pnj.mjs` | idle |

## Dessiner à la main dans Aseprite ou LibreSprite

1. Dessiner le personnage tourné vers la droite, à l'échelle du jeu (18 pixels par unité), les pieds sur la dernière rangée de la case, centré horizontalement.
2. Créer un tag par posture, nommé comme dans le tableau ci-dessus. Pour `windup` et `strike`, régler la répétition du tag sur 1.
3. Exporter la planche : *File → Export Sprite Sheet*, *Output → JSON Data* au format **Array**, avec les tags.
4. Déposer le PNG et le JSON dans `public/sprites/pixel/`, et donner le JSON au champ `pixel` du sprite :

```json
"kappa": { "file": "kappa.png", "pixel": "pixel/kappa.json", "height": 1.45, "facesRight": true }
```

On peut aussi partir des planches générées : les ouvrir dans Aseprite (*File → Import Sprite Sheet*) et retoucher les images à la main. Attention, `npm run pixel` les écrase ; retirer alors le personnage du générateur.
