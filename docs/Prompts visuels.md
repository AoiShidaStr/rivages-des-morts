# Prompts visuels (2D, Nano Banana 2)

Comment écrire les prompts d'images du jeu. Les prompts sont en anglais, parce que Nano Banana les suit mieux ainsi. La référence artistique et technique est la [Charte 2D](Charte%202D.md) : en cas de doute, c'est elle qui fait foi.

## Outil et pipeline

**Un seul outil : Nano Banana 2**, dans l'application Gemini (abonnement Google AI Plus étudiant, sans API : on colle le prompt et on joint les images à la main). La 3D (Tripo, Meshy, Rodin, Blender, export .glb) est abandonnée, comme le pantin articulé et le pixel art : **tout le jeu est en sprites 2D peints, en personnages chibi de 3 têtes, sur des planches complètes de 64 images (8 × 8)**.

1. **Fiche** : un seul personnage, une seule vue (profil 3/4 tourné vers la droite), sur fond gris uni. Générer 2-3 variantes et garder la meilleure : elle fixe le design.
2. **Planche complète** : joindre la fiche, coller le prompt de planche. Une seule image carrée contient les 8 animations du personnage, une ligne de 8 images par animation.
3. **Import** : `npm run planches -- <nom>` découpe la planche (entrée `layout` et `rows` dans `tools/planches.json`), `npm run sprites -- <nom>` détoure la fiche, qui sert de portrait. Détails : [Charte 2D](Charte%202D.md), section 8, et [Planches peintes](Planches%20peintes.md).

Les prompts prêts à coller de chaque personnage (fiche et planche complète, avec le nom de fichier) sont générés dans [`prompts-2d/`](prompts-2d/) par `npm run prompts-2d` (`tools/prompts-2d.mjs`). Pour changer un prompt, modifier le générateur puis relancer la commande : ne pas éditer les fichiers générés.

## Bible de style

À coller au début de chaque prompt d'image qui n'est pas déjà dans `prompts-2d/` (icônes, portraits, décor, PNJ), sans la modifier :

```
Painted 2D chibi action-RPG sprite style: chibi proportions, soft painted gradients, clothing folds, motifs and accessories drawn clearly but simplified, a crisp dark ink-blue outline, two-tone cel shading where the shadow is tinted toward blue-violet (never black), a soft cool light coming from the upper left, characters more saturated and lighter than a muted world, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
```

**Palette du Yomi** (décor) : brume blanche et gris-bleu, rouge vermillon (torii, laques), vert tendre des rizières, lueurs bleu-cyan pour les esprits. Le vermillon vif signale le danger ennemi : jamais sur les héros, sauf la robe du Sorcier.

## Suffixes selon le cas

- **Personnage (fiche)** : `Chibi proportions: the character is exactly 3 heads tall. A large head with big expressive eyes, broad shoulders so that every pose reads clearly, a compact body with short sturdy limbs, and the weapon drawn oversized so that it stays readable in a small sprite. One single character, shown once, full body, in three-quarter side view facing right.`
- **Planche complète** : voir le modèle ci-dessous.
- **Sprite fixe** (PNJ immobile, décor, à détourer avec `npm run sprites`) : `Flat uniform medium grey background (#8f8f8f), no gradient, no ground shadow, no glow, no particles, no mist, whole subject visible with an empty margin around it.`
- **Icône d'inventaire** : `2D game inventory icon, item centered, painted chibi-game style, subtle dark vignette, square format.`
- **Portrait de dialogue** : `2D chibi character bust portrait for a dialogue box, painted style, big expressive eyes, plain flat background.`

Aucun effet dessiné autour d'un personnage (magie, lueur, traînée, fumée, étincelle, ombre au sol) : le détourage garderait l'effet collé au sprite. C'est le jeu qui dessine les effets (`npm run vfx`, Charte 2D section 11).

## Modèle de planche complète (8 × 8)

La structure de tous les prompts de planche de `prompts-2d/`. Les crochets se remplacent par le texte du personnage ; le générateur détaille en plus chaque image de chaque ligne (Charte 2D, section 7).

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. Draw the complete 2D sprite sheet of this exact character, all its animations on one image: same face, chibi proportions, outfit, colors, [weapon], nothing added or removed.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 8 columns x 8 rows (64 equal square cells).
Each row is one animation of 8 frames, read left to right. The 8 rows, from top to bottom, are always in this exact order:
ROW 1, IDLE, a seamless breathing loop.
ROW 2, RUN, a running cycle on the spot, a seamless loop.
ROW 3, MAIN ATTACK (left click): frame 1 ready, frames 2 to 3 wind-up, frame 4 the strike launches, frame 5 IMPACT, frame 6 follow-through, frames 7 to 8 recovery.
ROW 4, RIGHT-CLICK ACTION — [block / shadow step / charged shot / seal].
ROW 5, SKILL (A and E keys) — [the class skill].
ROW 6, HURT, being hit and recovering.
ROW 7, DEATH: frames 7 and 8 identical, lying still, the body stays solid (no dissolving).
ROW 8, ULTIMATE (R key) — [the class ultimate].
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, feet on the same baseline at about 89% of the cell height; nothing touches or crosses a neighbouring cell.
The character stays exactly the same in all 64 frames: same chibi proportions (3 heads tall), same head size, same face, same outfit, same colors, same oversized weapon; only the pose changes.
Every row has exactly 8 frames: no empty cell, no extra frame, no row with fewer frames.
[Bible de style]
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

**Ordre des lignes, strict** (le moteur les lit dans cet ordre) :

| Ligne | Héros | Ennemis et boss |
| --- | --- | --- |
| 1 | Attente (Idle) | Attente |
| 2 | Course (déplacement ZQSD) | Déplacement |
| 3 | Attaque principale (clic gauche) | Attaque |
| 4 | Action défensive (clic droit : Blocage, Pas de l'ombre, Tir chargé, Sceau) | Anticipation tenue (télégraphe) |
| 5 | Compétences A et E | Étourdi |
| 6 | Dégâts (Hurt) | Dégâts |
| 7 | Mort (Death) | Mort |
| 8 | Compétence ultime (touche R) | Geste propre, ou seconde attaque |

Ce que joue chaque ligne pour chaque classe, et les tags du moteur : Charte 2D, section 4.

## Noms de fichiers

- Planches et fiches des héros : `~/Pictures/game visual/2d/<race>-2D/<race>-<classe>-planchecomplete.jpg` et `<race>-<classe>-reference.jpg` (exemple : `2d/hanyo-2D/hanyo-paladin-planchecomplete.jpg`).
- Images fixes : le nom indiqué dans `tools/sprites.json` (par exemple `decor_jizo.jpg`), puis `npm run sprites -- jizo`. Une image absente est simplement ignorée : le jeu garde son dessin provisoire.

## Où en sont les images

- **Héros** : les cinq Hanyō et les cinq Demi-dieux ont leur planche complète chibi dans le jeu (octobre 2026) ; les Einherjar et les Oushebti n'ont que le Guerrier de jouable en attendant leurs planches (Charte 2D, section 9). L'ancienne méthode des poses clés puis Kling ([Prompts des héros](Prompts%20h%C3%A9ros.md), `npm run kit-heros`) est remplacée par la planche complète.
- **Ennemis et boss** : Izanami et les yokai du Palais sont dans le jeu en planches de 16 images par animation, les yokai des Rizières et la Jorōgumo en planches peintes plus anciennes ; tous sont à refaire en 8 × 8 chibi (lots de la Charte 2D, section 9).
- **PNJ, décors de l'île et du donjon, sols, armes, équipement et reliques du premier donjon** : faits et dans le jeu. Les prompts remplis, avec l'image à joindre, sont dans `public/sprites/sprites/Prompts remplis.md` (dossier non versionné).

## À faire : icônes des nouveaux objets

Une seconde planche, retouchée à partir de la première (même grille de 8 × 4), déjà déclarée dans `tools/icones.json`. Les armes qui n'ont qu'une icône en pixel art (`npm run icones-pixel`) y sont aussi : l'icône peinte la remplacera.

| Objet | Description |
| --- | --- |
| Grelots d'onmyōji | `a short dark wooden staff topped with a cluster of small golden bells and white zigzag paper streamers` |
| Éventail de la Jorōgumo | `a black and crimson silk folding fan, half open, silver spider-web pattern, a few loose silk threads` |
| Kunai jumeaux | `two blackened iron kunai daggers crossed, their ring pommels tied together by a red cord` |
| Naginata et bouclier de temple | `a naginata with a curved blade lying across a small round wooden shield painted with a red sun` |
| Yumi en bambou | `a tall asymmetric yumi bow of lacquered bamboo, grip placed low, one white-fletched arrow` |
| Totsuka-no-tsurugi | `a long ancient straight double-edged bronze sword with a ring pommel, tiny lightning sparks along the blade` |
| Kaiken d'Izanami | `a small kaiken dagger in a white lacquered sheath with pale silver fittings, a dark stain seeping from the sheath mouth` |
| Arc du pêcher | `a curved bow carved from knotted peach wood, pink peach blossoms growing along it` |
| Voile d'Izanami | `a white burial veil of thin gauze with a white triangular headband, draped over an invisible head` |
| Dō de l'armée du Yomi | `a samurai do chest armor made of bone lamellae lacquered black, laced with red cords` |
| Pêche Ōkamuzumi | `a single perfect ripe peach with two green leaves, soft golden glow` |
| Peigne d'Izanagi | `a dark wooden Japanese comb with long teeth, small green bamboo shoots sprouting from the tips` |
| Os de guerrier du Yomi | `a small bundle of old bones tied with a black lacquered armor lace` |
| Éclat de foudre | `a jagged shard of solidified yellow lightning, crackling` |
| Kusarigama des Oubliés | `a kusarigama: a rice farmer's sickle at the end of a long rusty chain coiled around it` |
| Crocs de la Jorōgumo | `two curved black and crimson spider fangs mounted on handles wrapped in white silk, a drop of green venom` |
| Tetsubō et bouclier-cloche | `a studded iron tetsubo club crossed over a cracked bronze temple bell used as a shield` |
| Miroir de Yata | `a short spear crossed over the octagonal bronze Yata mirror, its polished face shining` |
| Hankyū de chasse | `a short hankyu hunting bow of dark wood with two arrows` |
| Arc de soie de la Jorōgumo | `a black wooden bow strung with a glistening white spider-silk string, a few sticky threads hanging` |
