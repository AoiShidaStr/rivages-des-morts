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

## Icônes des objets de la 0.11.0 (faites, dans le jeu)

Les 52 objets ajoutés par la 0.11.0 (équipement spécialisé par classe) ont leur icône depuis le 8 octobre 2026 (sur la planche 4, Gemini a ajouté une breloque en trop : la case 18 est ignorée et les suivantes décalées d'une case dans `tools/icones.json`). Ils tiennent sur deux planches de 8 × 4, rangées par classe. Comme pour la planche 2, Gemini **retouche** une planche d'icônes réussie en changeant les objets, ce qui garde la grille, le fond et le style des 51 icônes déjà en jeu. La correspondance des cases est déjà dans `tools/icones.json` : une fois les images enregistrées, lancer `npm run icones`.

Si un objet ressort mal (deux objets dans une case, objet coupé), relancer la même retouche en ne demandant que les cases ratées : leur numéro ne change pas.

### Planche 3 : Guerrier, Sorcier, Lame (32 objets)

**Joindre :** `Pictures\game visual\objets_planche_2.jpg`. **Enregistrer sous :** `Pictures\game visual\objets_planche_3.jpg`

> Cases 1 à 9 : Guerrier · 10 à 22 : Sorcier · 23 à 32 : Lame. Les 32 cases sont remplies.

```text
Edit the attached image.

Keep exactly the same grid of 8 columns and 4 rows, the same cell size, the same flat light grey background, lighting and hand-painted icon style. Replace all the objects: the 32 cells, read left to right then top to bottom, get these new objects, one per cell, centered, the same size as the old ones, each one clearly readable as a small inventory icon. Paired items (sandals, boots, greaves) are drawn as a pair in their single cell.

1. a massive dark iron kabuto helmet with thick riveted plates, a wide neck guard and two short iron horns
2. a samurai do chest armor made of dark green scaly yokai leather, stitched with bone toggles and dark brown-red cords
3. a battered black and gold samurai general's chest armor with a broken crest and torn dark red silk lacing
4. a pair of iron suneate shin guards with short forward spikes on the knee plates, tied with dark red cords
5. a pair of huge heavy iron greaves, dented and scarred, with massive rounded knee plates
6. a pair of light straw waraji sandals with red cords and small wing-shaped straw tufts at the heels
7. a pair of heavy armored boots covered in thick iron plates, with wide flat soles
8. a large brown bear claw hanging from a leather cord with one carved wooden bead
9. a deep blue magatama jewel with a tiny storm cloud swirling inside it and small lightning sparks around it
10. folded ash-grey hakama trousers, their hem charred black and dotted with dying embers
11. a pair of red lacquered geta sandals with flame-shaped wooden teeth and small glowing embers on the straps
12. a faceted orange crystal hanging from a thin gold chain, a small flame burning inside it
13. a long staff of black storm-wood wrapped in a vermilion rope, its top a blazing orb of fire held in twisted branches
14. a simple hooded cowl of rough undyed hemp with one white paper talisman pinned at the brow
15. a folded vermilion and black onmyoji robe with flame patterns along its wide sleeves
16. a cape of crimson and gold phoenix feathers, its hem ending in feather-shaped flames
17. folded crimson hakama trousers with a black sash
18. pale translucent white-blue spirit trousers, the legs fading into soft wisps
19. a pair of black split-toe tabi boots trailing faint violet shadow wisps
20. a pair of golden geta sandals with a radiant sun disc carved on each, a soft golden glow
21. a heart-shaped dark red stone with black veins and a drop of blood on its surface
22. a charred black heart-shaped stone cracked open, glowing orange embers inside
23. a long pale grey headband with fluttering ends and a small swirling wind crest embroidered on it
24. a white kitsune fox mask with pointed ears and red and violet markings
25. a folded dark violet and black shinobi jacket with a cross-tied sash
26. a black hooded cloak whose hem dissolves into dark violet smoke
27. haidate thigh guards made of dark green snake-scale plates, closed by a small viper-head clasp
28. black leg guards patterned with a silver spider web, with small spider-leg spikes on the knees
29. a pair of tall red lacquered tengu geta with a single high wooden tooth, small black crow feathers on the straps
30. a black paper talisman covered in violet brush strokes, tied with a violet cord
31. a broken tanto dagger with a cracked blade, a dark stain on the steel and a hilt wrapped in frayed black cord
32. a small heart-shaped violet glass vial filled with bright green poison

No text, no numbers, no letters, no grid lines.
```

### Planche 4 : Paladin, Rôdeur (20 objets)

**Joindre :** `Pictures\game visual\objets_planche_2.jpg`. **Enregistrer sous :** `Pictures\game visual\objets_planche_4.jpg`

> Cases 1 à 9 : Paladin · 10 à 20 : Rôdeur. Les 12 dernières cases restent vides.

```text
Edit the attached image.

Keep exactly the same grid of 8 columns and 4 rows, the same cell size, the same flat light grey background, lighting and hand-painted icon style. Replace the objects: the first 20 cells, read left to right then top to bottom, get these new objects, one per cell, centered, the same size as the old ones, each one clearly readable as a small inventory icon. Paired items (sandals, greaves) are drawn as a pair in their single cell. All the other cells become empty background.

1. a golden crown-like headpiece with a sun disc at the front, a red jewel and short silk tassels
2. a white and gold temple chest armor laced with red cords, white zigzag paper streamers hanging from the waist
3. a pair of white lacquered greaves with gold trim and a small hammer emblem on each knee
4. a pair of pale gold geta sandals with a rising sun painted on each, in soft dawn pink and gold
5. a pair of heavy geta sandals with thick iron-banded teeth and gold straps
6. a pair of gold geta sandals with a small hexagonal shield emblem on each, a faint golden shimmer
7. a prayer rosary of green jade beads with a gold tassel
8. a miniature golden war hammer with a sun emblem on its head and a short red-wrapped handle
9. a single large shining golden dragon scale
10. a green hunter's hood covered in leaves and small twigs for camouflage
11. a dark wooden half-mask shaped like a wolf muzzle, with green painted markings
12. a light green lacquered archer's chest armor with a leather chest strap
13. a cloak made of brown and green hawk feathers with a feathered collar
14. rugged leg wraps of hemp and leather with a small pouch and a coiled rope tied on
15. light green leg guards with swirling wind patterns and fluttering cloth strips
16. a pair of light straw waraji sandals with green cords
17. a large wolf fang on a leather cord with two green beads
18. a small wooden charm carved like a leaf, tied with a green cord, a tiny green sprout growing from it
19. a heart-shaped knot of living wood covered in moss and small green leaves, a faint green glow
20. a quiver of green lacquered bamboo full of white-fletched arrows, a spiral of wind swirling around it

No text, no numbers, no letters, no grid lines.
```

## Icônes peintes à la place du pixel art (faites, dans le jeu)

Les 37 objets qui n'avaient qu'une icône en pixel art ont leur icône peinte depuis le 8 octobre 2026 (planche 6 : Gemini a doublé le mino et la tsuba, les cases 4 et 5 sont ignorées). Même méthode que les planches 3 et 4 : Gemini retouche une planche d'icônes réussie. Les cases sont déjà dans `tools/icones.json` ; une fois les images enregistrées, `npm run icones` écrit les icônes peintes par-dessus celles en pixel art. (`objets_planche_2.jpg` n'étant plus dans le dossier, on joint la planche 3 ; ses 17 objets passent sur la planche 7, plus bas.)

Trois icônes en pixel art restent sans objet (`geta-braise`, `geta-temple`, `pinceau-seimei` : objets retirés par la 0.11.0) : inutile de les repeindre.

### Planche 5 : objets de classe (32 objets)

**Joindre :** `Pictures\game visual\objets_planche_3.jpg`. **Enregistrer sous :** `Pictures\game visual\objets_planche_5.jpg`

> Cases 1 à 4 : Guerrier · 5 et 6 : Sorcier · 7 à 14 : Lame · 15 à 23 : Paladin · 24 à 31 : Rôdeur · 32 : Corne d'oni (toutes classes). Les 32 cases sont remplies.

```text
Edit the attached image.

Keep exactly the same grid of 8 columns and 4 rows, the same cell size, the same flat light grey background, lighting and hand-painted icon style. Replace all the objects: the 32 cells, read left to right then top to bottom, get these new objects, exactly one per cell, centered, the same size as the old ones, each one clearly readable as a small inventory icon. Paired items (sandals, socks, gaiters, thigh guards) are drawn as a pair in their single cell. Do not add, repeat or skip any object.

1. a large sea-green dragon scale with a pearly sheen, small drops of sea water and a faint wisp of flame along its edge
2. a heavy iron heart-shaped amulet bound with a thick braided white sumo rope, battered and scratched
3. a red hannya demon mask with golden eyes, two sharp horns and a wide fanged grin
4. a very long rusty nodachi greatsword in a cracked dark brown lacquered scabbard, its hilt wrapped in tattered cord, laid diagonally
5. a folded dark grey haori jacket woven with shimmering silver fire-resistant threads, small scorch marks on the sleeves
6. a red paper ofuda talisman painted with a black flame sigil, its corner smouldering with a small flame
7. a samurai do chest armor made of pale ivory bone lamellae laced with violet cords
8. a small black ink pot shaped like a skull, a thin brush resting across it, black ink dripping down its side
9. a pair of ragged thigh guards of grey-green hide edged with small hooked claws
10. a small round black smoke bomb with a short lit fuse and a violet paper seal
11. a dark iron menpo face mask with a wide grinning mouth of crooked fangs
12. a pair of black split-toe tabi socks with dark violet laces
13. a chipped round iron sword guard (tsuba) with a crack across it and a violet cord through its center hole
14. a pair of straw waraji sandals trimmed with grey wolf fur
15. a large bronze temple bell with moss and small stones grown onto it
16. a tall black eboshi court hat with a golden sun disc on the front
17. a small bronze hanging incense burner with a curl of pale smoke rising from it
18. a pair of white and gold lacquered haidate thigh guards
19. a folded saffron-brown kesa monk's robe draped over a white under-robe, with a gold ring clasp
20. a pair of leg wraps braided from thick straw shimenawa rope, hung with white zigzag paper streamers
21. a small red taiko temple drum with brass studs and two wooden drumsticks crossed in front
22. a long iron tetsubo war club covered in heavy studs, with a red-wrapped grip
23. a white warrior-monk hood wrapped around an invisible head, leaving an opening for the face
24. a dark violet longbow crackling with small yellow lightning sparks, a tiny red-and-gold drum hanging from its grip
25. a black leather samurai do chest armor with dark green stitching
26. two long arrows with white heavenly feathers and gleaming golden arrowheads
27. a flat conical jingasa hat of glossy green lacquer with a gold crest
28. a pair of beige cloth kyahan gaiters with green cords
29. a long black crow feather with a golden sheen, three small golden marks at its base
30. a pair of light tabi socks with a small winged crest embroidered on each
31. a pair of straw waraji sandals with small iron cleats and a tiny green poison vial tied to the cords
32. a broken red oni horn, cracked at its base, with a few tufts of black hair

No text, no numbers, no letters, no grid lines.
```

### Planche 6 : objets communs (5 objets)

**Joindre :** `Pictures\game visual\objets_planche_3.jpg`. **Enregistrer sous :** `Pictures\game visual\objets_planche_6.jpg`

> Cases 1 à 5 ; les 27 autres cases restent vides.

```text
Edit the attached image.

Keep exactly the same grid of 8 columns and 4 rows, the same cell size, the same flat light grey background, lighting and hand-painted icon style. Replace the objects: the first 5 cells of the top row, read left to right, get these new objects, exactly one per cell, centered, the same size as the old ones, each one clearly readable as a small inventory icon. All the other cells become plain empty background, the same color as the rest of the image (no darker squares). Do not add, repeat or skip any object.

1. a small clay dogu figurine of the Jomon era with large closed slit eyes, a round body and engraved patterns
2. a gohei: a short wooden Shinto wand with white zigzag paper streamers
3. a mino straw raincoat, thick layers of straw hanging down
4. a rusted iron sword guard (tsuba) with dried dark blood in its engravings, hanging from a frayed cord
5. a small black lacquered bowl of dark steaming rice and pickled food from the underworld, a pair of chopsticks across it, a faint violet mist rising

No text, no numbers, no letters, no grid lines.
```

## Icônes peintes des objets de l'ancienne planche 2 (faites, dans le jeu)

Ces 17 objets ont leur icône peinte depuis le 8 octobre 2026 (Gemini a doublé l'éclat de foudre : la case 18 est ignorée ; l'image est en `.png`). Leur version peinte devait venir de `objets_planche_2.jpg`, qui n'est plus dans le dossier. On les refait sur une planche 7, avec la même méthode que les planches 5 et 6 : Gemini retouche la planche 3. Les cases sont déjà dans `tools/icones.json` ; une fois l'image enregistrée, `npm run icones` écrit les icônes peintes par-dessus celles en pixel art.

### Planche 7 : armes de départ, objets d'Izanami et matériaux (17 objets)

**Joindre :** `Pictures\game visual\objets_planche_3.jpg`. **Enregistrer sous :** `Pictures\game visual\objets_planche_7.png`

> Cases 1 à 3 : Sorcier · 4 à 7 : Lame · 8 à 10 : Paladin · 11 à 13 : Rôdeur · 14 et 15 : toutes classes · 16 et 17 : matériaux. Les deux premières lignes sont pleines, la troisième n'a que sa première case ; les 15 autres cases restent vides. Si Gemini dessine un objet deux fois (comme sur la planche 6), dites-moi quelles cases ignorer.

```text
Edit the attached image.

Keep exactly the same grid of 8 columns and 4 rows, the same cell size, the same flat light grey background, lighting and hand-painted icon style. Replace the objects: the first 17 cells, read left to right then top to bottom (the two top rows, then only the first cell of the third row), get these new objects, exactly one per cell, centered, the same size as the old ones, each one clearly readable as a small inventory icon. All the other cells become plain empty background, the same color as the rest of the image (no darker squares). Do not add, repeat or skip any object.

1. a short black lacquered onmyoji staff topped with a cluster of small golden bells, tiny blue-white fox-fire flames dancing around the bells
2. an open folding fan of pale silk painted with a black and yellow spider, fine silk threads trailing from its edge
3. a long white funeral veil, folded and draped, its lower edge slightly charred and faintly smoking
4. two blackened iron kunai crossed, their ring pommels tied together with a red cord
5. a rice farmer's sickle on a wooden handle, a long rusty chain coiled around it and ending in an iron weight
6. two curved pale spider fangs mounted on handles wrapped in white silk, a drop of green venom at each tip
7. a small dagger in a black lacquered sheath tied with a white funeral cord, a few drops of dark blood beneath it
8. a naginata polearm laid diagonally behind a small round wooden shield bearing a golden sun emblem
9. an octagonal bronze mirror with a polished shining face, a red and white cord tied to its back knob, a soft golden glow
10. a samurai do chest armor of bone lamellae lacquered black, laced with dark red cords, a thin layer of frost on its edges
11. a tall asymmetrical Japanese yumi longbow of lacquered bamboo with its grip placed low and its string drawn straight
12. a short horseman's hankyu bow of dark wood with a leather-wrapped grip and a taut string
13. a longbow of pinkish peach-tree wood with a few small pink peach blossoms and green leaves growing along it
14. a single perfect golden-pink peach with two green leaves, a soft warm glow around it
15. a dark wooden Japanese comb whose teeth sprout into small green bamboo shoots
16. a weathered yellowish bone with a chip of black lacquer stuck to it and a faint cold blue mist
17. a jagged shard of crystallised yellow-white lightning crackling with small sparks

No text, no numbers, no letters, no grid lines.
```

## À faire : carte peinte, planches de décors

La carte peinte redevient l'affichage par défaut. La 3D reste disponible dans les options (« Scènes en 3D »).

Pour que la carte ne fasse plus « image collée », la méthode change sur trois points :

- **Le sol n'est plus une seule grande image.** Peinte en une fois, l'île n'avait qu'environ 24 pixels par mètre, et devenait floue et plate une fois agrandie à l'écran.
  - Le jeu assemblera le sol à partir de **9 textures peintes qui se répètent** (herbe, chemin, sable…), en suivant le tracé de `island.json`.
  - Le sol restera net à toutes les distances et toujours calé sur les zones où l'on marche.
  - L'eau sera animée par le jeu.
- **Beaucoup plus de décors sont posés dessus**, debout comme les personnages : arbres, buissons, rochers, objets du village. Ce sont eux qui donnent le volume.
- **Plusieurs décors tiennent dans une même image**, comme les icônes des objets. Chaque planche est une grille, et `npm run decors` découpe et détoure chaque case sous son nom (`tools/decors.json`).

**Méthode :**

1. Coller le prompt dans Gemini (Nano Banana 2) et joindre l'image indiquée.
2. Enregistrer le résultat dans `Pictures\game visual\` sous le nom donné (`.png` ou `.jpg`).
3. Lancer `npm run decors -- <nom de la planche>`, ou `npm run decors` pour toutes les planches.

Si une case ressort mal (deux objets dans une case, objet coupé, case vide) : retoucher la planche en ne redemandant que cette case. Les numéros des cases ne changent pas.

| Ordre | Planche | Joindre | Enregistrer sous | Ce qu'elle donne |
| --- | --- | --- | --- | --- |
| 1 | Décors sans leur socle (2 × 2, retouche) | `decors_sans-socle_reference.png` | `decors_sans-socle` | maison de thé, coffre, ema et jizō des Rizières, qui remplacent les actuels |
| 2 | Textures de sol (3 × 3) | `sol_ile.jpg` | `decors_textures` | `sols/textures/*.jpg`, 1024 × 1024, raccordées sans couture par l'outil |
| 3 | Arbres (3 × 3) | `decors_sans-socle.png` (le résultat de la planche 1) | `decors_arbres` | `decor/ile/*.png` |
| 4 | Végétation (4 × 4) | `decors_sans-socle.png` | `decors_vegetation` | `decor/ile/*.png` |
| 5 | Rochers (4 × 4) | `decors_sans-socle.png` | `decors_rochers` | `decor/ile/*.png` |
| 6 | Objets du village (4 × 4) | `decors_sans-socle.png` | `decors_objets` | `decor/ile/*.png` |
| 7 | Rizières de la Jorōgumo (4 × 4) | `decors_sans-socle.png` | `decors_rizieres` | `decor/rizieres/*.png` |

L'image à joindre pour la planche 1 est déjà prête : ce sont les quatre décors actuels, rangés dans la grille. `npm run decors -- --reference` la refait.

Pour les planches 3 à 7, la planche 1 réussie sert de **référence de style** : mêmes contours, même lumière, même palette.

Une fois les planches découpées, il reste à brancher le nouveau sol et à placer les décors sur l'île et dans l'arène des Rizières.

### 1. Décors sans leur socle (2 × 2, retouche)

**Joindre :** `Pictures\game visual\decors_sans-socle_reference.png`.

**Enregistrer sous :** `Pictures\game visual\decors_sans-socle.png`.

**Commande :** `npm run decors -- decors_sans-socle`. Elle remplace `decor/maison-the.png`, `decor/coffre.png`, `decor/ema.png` et `jizo.png`.

```text
Edit the attached image.

It is a sheet of 4 decor sprites in a grid of 2 columns and 2 rows. Keep exactly the same grid, the same 4 objects in the same cells, the same flat grey background, the same camera angle, size, position and hand-painted style. Remove everything at their feet, so that each object stands on nothing, as if on an invisible floor:

1. the tea house: remove the pool of water and the cloud-like base; keep the house, its roof, its red noren curtain and its red paper lantern; the house ends on a low, flat stone foundation.
2. the treasure chest: remove the white cloud under it; the bottom of the chest is visible and clean.
3. the wooden ema stand: remove the glowing blue puddle under it; the feet of the stand end cleanly.
4. the stone jizo statue: remove the swirling white mist around it; keep the statue, its ropes and its square stone pedestal.

Nothing else changes. No shadow on the ground, no text, no numbers, no letters, no grid lines.
```

### 2. Textures de sol (3 × 3)

**Joindre :** `Pictures\game visual\sol_ile.jpg`, pour la palette.

**Enregistrer sous :** `Pictures\game visual\decors_textures.png`.

**Commande :** `npm run decors -- decors_textures`.

Chaque case doit être une matière uniforme, sans objet ni motif central, car le jeu la répète des dizaines de fois. L'outil ignore le bord de chaque case et rend la texture raccordable. Un motif trop marqué (un caillou isolé, une tache) se verrait quand même se répéter : dans ce cas, relancer la case.

```text
Use the attached image only as a reference for the colours and the painting style of the ground; do not copy its layout.

A sheet of 9 hand-painted ground textures for a 2D isometric action RPG set in the Japanese land of the dead, in a grid of 3 columns and 3 rows of equal square cells. Each cell is filled edge to edge with one single ground material, seen straight from above, evenly lit: no perspective, no horizon, no cast shadows, no objects, no focal point, no vignette. Each texture is a uniform repeating surface with the same density of detail everywhere in its cell, so that it can be tiled. Soft painted brush strokes, slightly desaturated and muted, so that the characters stand out on it.

Cells, read left to right then top to bottom:
1. short soft green grass, small painted blades in two or three tones of green
2. dark moss and thick grass of a forest edge, a darker and bluer green
3. trodden earth path, light warm brown, with a few tiny pebbles
4. fine pale beach sand with faint wind ripples
5. pale grey raked gravel of a zen garden, with fine parallel rake lines running horizontally across the whole cell
6. old grey stone paving slabs of irregular sizes, with thin moss in the joints
7. cursed dark red-brown earth, dry and cracked by a network of thin dark cracks
8. wet grey-brown mud of a flooded rice paddy, with shiny wet patches
9. grey cliff rock with pale lichen, a flat cracked rock surface

No text, no numbers, no letters, no borders, no frames, no grid lines.
```

### 3. Arbres (3 × 3)

**Joindre :** `Pictures\game visual\decors_sans-socle.png`.

**Enregistrer sous :** `Pictures\game visual\decors_arbres.png`.

**Commande :** `npm run decors -- decors_arbres`.

```text
Use the attached image only as a style reference: the same hand-painted style, outline, lighting, camera angle and muted palette. Do not copy its objects.

A sheet of 9 separate decor sprites for the same game: trees of the Japanese land of the dead, in a grid of 3 columns and 3 rows of equal cells. Each sprite is one single tree, whole from its roots to the top of its crown, centered in its cell with an empty margin around it, never touching the cell borders or another tree. All seen from the same raised camera (about 35 degrees above the horizon), lit from the upper left. Each tree stands on nothing: no patch of ground, no grass at its foot, no water, no mist and no shadow under it; the trunk ends cleanly at the bottom, as if planted in an invisible floor.

Cells, read left to right then top to bottom:
1. a Japanese black pine with a twisted trunk and flat, layered, cloud-shaped foliage
2. a red Japanese maple with a slim dark trunk and a rounded crown of crimson leaves
3. a weeping willow with long drooping pale green branches
4. a pale ghostly cherry tree in bloom, its white-pink blossoms fading to a bluish white
5. a tall clump of green bamboo, a dozen thin stalks with leaves at the top
6. a tall Japanese cedar with a straight reddish trunk and a dark green conical crown
7. a ginkgo tree with golden yellow fan-shaped leaves
8. a dead grey tree with bare twisted branches
9. a small twisted pine growing out of a mossy boulder

Flat uniform medium grey background (#8f8f8f), no gradient. No text, no numbers, no letters, no grid lines.
```

### 4. Végétation (4 × 4)

**Joindre :** `Pictures\game visual\decors_sans-socle.png`.

**Enregistrer sous :** `Pictures\game visual\decors_vegetation.png`.

**Commande :** `npm run decors -- decors_vegetation`.

```text
Use the attached image only as a style reference: the same hand-painted style, outline, lighting, camera angle and muted palette. Do not copy its objects.

A sheet of 16 separate decor sprites for the same game: small plants of the Japanese land of the dead, in a grid of 4 columns and 4 rows of equal cells. Each sprite is one single plant or group, whole, centered in its cell with an empty margin around it, never touching the cell borders or another sprite. All seen from the same raised camera (about 35 degrees above the horizon), lit from the upper left. Each plant stands on nothing: no patch of ground or soil under it, no water, no mist and no shadow; its bottom ends cleanly, as if planted in an invisible floor.

Cells, read left to right then top to bottom:
1. a round bush of dense green leaves
2. a low spreading bush, much wider than tall
3. a tall tuft of wild grass
4. a short small tuft of grass
5. a fern with arching fronds
6. a clump of reeds with brown cattail heads
7. a small clump of three young bamboo stalks
8. a cluster of red spider lilies (higanbana) on bare green stems
9. a blue hydrangea bush with round flower heads
10. a young red maple sapling
11. a small dwarf pine, shaped like a bonsai
12. a pink azalea bush trimmed into a rounded shape
13. an old moss-covered tree stump
14. a fallen mossy log
15. a group of lily pads with one white lotus flower, lying flat as if floating
16. tall grasses of a riverbank, thin and swaying

Flat uniform medium grey background (#8f8f8f), no gradient. No text, no numbers, no letters, no grid lines.
```

### 5. Rochers (4 × 4)

**Joindre :** `Pictures\game visual\decors_sans-socle.png`.

**Enregistrer sous :** `Pictures\game visual\decors_rochers.png`.

**Commande :** `npm run decors -- decors_rochers`.

```text
Use the attached image only as a style reference: the same hand-painted style, outline, lighting, camera angle and muted palette. Do not copy its objects.

A sheet of 16 separate decor sprites for the same game: rocks and stones, in a grid of 4 columns and 4 rows of equal cells. Each sprite is one single rock or group, whole, centered in its cell with an empty margin around it, never touching the cell borders or another sprite. All seen from the same raised camera (about 35 degrees above the horizon), lit from the upper left, soft grey-blue stone with touches of moss. Each rock stands on nothing: no patch of ground or grass under it, no water, no mist and no shadow; its bottom ends cleanly, as if resting on an invisible floor.

Cells, read left to right then top to bottom:
1. a large grey boulder with a rounded top
2. a medium grey rock
3. a small rock
4. a group of smooth river pebbles
5. a rock covered with thick green moss on top
6. a wide flat rock, low to the ground
7. a pointed jagged rock
8. a small cairn of three stacked flat stones
9. a group of dark wet shore rocks
10. a tall standing stone with a small straw shimenawa rope tied around it
11. a rock split in two by a crack, with a little grass growing in the crack
12. a small pile of broken rocks and scree
13. a dark rock with green seaweed hanging from its lower half
14. three flat round stepping stones in a row, lying flat
15. a tall block of grey cliff rock with flat sides
16. a weathered upright zen garden stone with pale lichen

Flat uniform medium grey background (#8f8f8f), no gradient. No text, no numbers, no letters, no grid lines.
```

### 6. Objets du village (4 × 4)

**Joindre :** `Pictures\game visual\decors_sans-socle.png`.

**Enregistrer sous :** `Pictures\game visual\decors_objets.png`.

**Commande :** `npm run decors -- decors_objets`.

```text
Use the attached image only as a style reference: the same hand-painted style, outline, lighting, camera angle and muted palette. Do not copy its objects.

A sheet of 16 separate decor sprites for the same game: small objects of a quiet village on an island of the Japanese land of the dead, in a grid of 4 columns and 4 rows of equal cells. Each sprite is one single object or group, whole, centered in its cell with an empty margin around it, never touching the cell borders or another sprite. All seen from the same raised camera (about 35 degrees above the horizon), lit from the upper left. Each object stands on nothing: no patch of ground or grass under it, no water, no mist and no shadow; its bottom ends cleanly, as if standing on an invisible floor.

Cells, read left to right then top to bottom:
1. a small unlit stone lantern (toro)
2. a short section of bamboo fence tied with black cord
3. a straw shimenawa rope with white zigzag paper streamers, stretched between two short wooden posts
4. a weathered wooden signpost with a blank board
5. a stack of straw rice bags
6. a neat pile of firewood logs
7. three brown clay jars of different sizes
8. a small stone kitsune fox statue wearing a red bib
9. a row of three small weathered stone grave steles, blank
10. three tall thin blank wooden grave tablets (sotoba) leaning slightly
11. a red paper lantern hanging from a short wooden post
12. a simple wooden bench
13. a small offering stand with a bowl of rice, two oranges and a sake cup
14. an old stone well with a wooden frame and a bucket
15. a bamboo drying rack with a few white cloths hanging from it
16. a small old wooden boat pulled up on land, empty

Flat uniform medium grey background (#8f8f8f), no gradient. No text, no numbers, no letters, no writing on any object, no grid lines.
```

### 7. Rizières de la Jorōgumo (4 × 4)

**Joindre :** `Pictures\game visual\decors_sans-socle.png`.

**Enregistrer sous :** `Pictures\game visual\decors_rizieres.png`.

**Commande :** `npm run decors -- decors_rizieres`.

```text
Use the attached image only as a style reference: the same hand-painted style, outline, lighting and camera angle. Do not copy its objects.

A sheet of 16 separate decor sprites for the same game: the drowned rice paddies where the spider demon Jorogumo lives, a misty, grey-green and violet place, in a grid of 4 columns and 4 rows of equal cells. Each sprite is one single object or group, whole, centered in its cell with an empty margin around it, never touching the cell borders or another sprite. All seen from the same raised camera (about 35 degrees above the horizon), lit from the upper left. Each object stands on nothing: no patch of ground, no mud, no water, no mist and no shadow under it; its bottom ends cleanly, as if standing on an invisible floor.

Cells, read left to right then top to bottom:
1. a dead twisted tree with grey-violet bark and bare branches
2. the same kind of dead tree wrapped in thin white spider silk threads
3. a rotten tree stump
4. a clump of dry pale reeds
5. a tuft of green rice plants
6. a tuft of yellowing rice plants, bent and flattened
7. a large spider web stretched between two leaning wooden stakes
8. a white silk cocoon hanging from a short broken branch
9. a torn straw scarecrow with a straw hat
10. a few leaning wooden stakes tied with old rope
11. a small unlit stone lantern covered in moss and spider silk
12. a dark rock, wet and muddy
13. a few scattered old bones
14. withered brown lily pads lying flat
15. a tiny jizo statue with a red bib, wrapped in a few silk threads
16. a pair of abandoned straw sandals

Flat uniform medium grey background (#8f8f8f), no gradient. No text, no numbers, no letters, no grid lines.
```

## À faire : planches animées sans socle

Quatre décors animés ont aussi un bout de sol peint sous eux (flaque, nuage, brume). Ce sont des planches d'animation : elles se retouchent une par une.

**Méthode :**

1. Joindre l'image d'origine et coller le prompt.
2. Renommer l'ancienne image en `…_avec-socle.jpg` pour la garder.
3. Enregistrer le résultat **sous le même nom** que l'image d'origine.
4. Lancer la commande indiquée.

Si Gemini change la taille, la pose ou le nombre d'images, relancer la retouche.

| Décor | Image à joindre et à remplacer (`Pictures\game visual\`) | Commande ensuite |
| --- | --- | --- |
| Torii du ponton (planche de 6) | `sprites\decor_ile_torii.jpg` | `npm run planches -- torii` |
| Barque de Charon (planche de 6) | `sprites\decor_ile_barque.jpg` | `npm run planches -- barque` |
| Lanterne allumée (planche de 6) | `decor_ile_lanterne-allumee.jpg` | `npm run planches -- lanterne-allumee` |
| Portail du donjon (planche de 8) | `decor_ile_portail.jpg` | `npm run planches -- portail` |

Les autres décors n'ont pas de socle : le Grand Rocher, la forge, la cascade, la lanterne éteinte, le sutra et le jizō de l'île. La cascade garde son bassin de pierre, qui fait partie de l'objet.

### Torii du ponton (planche de 6)

```text
Edit the attached image.

It is an animation sheet of 6 frames (2 rows of 3) of the same torii gate. Keep exactly the same grid, the same 6 frames, the same flat light grey background, the same camera angle, size, position and hand-painted style. In every frame, keep only the red torii gate with its rope and white paper streamers, and its two support posts. Remove everything at its feet: the pool of water, the cloud-like base, the reeds, the pebbles, the wooden walkway and the lantern post. The bottoms of the pillars now simply end on nothing, straight and clean, as if standing on an invisible floor. Nothing else changes: the small differences between the frames (the swaying streamers) stay as they are.

No text, no numbers, no letters, no grid lines, no shadow on the ground.
```

### Barque de Charon (planche de 6)

```text
Edit the attached image.

It is an animation sheet of 6 frames (2 rows of 3) of the same wooden boat. Keep exactly the same grid, the same 6 frames, the same flat light grey background, the same camera angle, size, position and hand-painted style. In every frame, remove the swirling cloud and mist under and around the boat: keep only the boat itself, with its oars, ropes and hanging lantern. The bottom of the hull is fully visible and clean, as if floating above nothing. Nothing else changes: the small differences between the frames (the swinging lantern, the rocking of the boat) stay as they are.

No text, no numbers, no letters, no grid lines, no water, no shadow.
```

### Lanterne allumée (planche de 6)

```text
Edit the attached image.

It is an animation sheet of 6 frames (2 rows of 3) of the same stone lantern with a blue flame. Keep exactly the same grid, the same 6 frames, the same flat light grey background, the same camera angle, size, position and hand-painted style. In every frame, remove only the ring of white mist around the base of the lantern: keep the lantern, its red rope, its blue flame and the soft blue glow around the flame. The square stone base ends cleanly, as if standing on an invisible floor. Nothing else changes: the flickering of the flame between the frames stays as it is.

No text, no numbers, no letters, no grid lines, no mist, no shadow on the ground.
```

### Portail du donjon (planche de 8)

```text
Edit the attached image.

It is an animation sheet of 8 frames of the same dark torii gate with a red swirling portal. Keep exactly the same grid, the same 8 frames, the same flat light grey background, the same camera angle, size, position and hand-painted style. In every frame, remove only the white mist wisps and the small rocks at the feet of the gate: keep the gate and its portal. The bottoms of the pillars end cleanly, as if standing on an invisible floor. Nothing else changes: the swirling of the portal between the frames stays as it is.

No text, no numbers, no letters, no grid lines, no mist, no shadow on the ground.
```
