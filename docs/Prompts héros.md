# Prompts des héros (Nano Banana 2 puis Kling)

Chaque héros (4 races × 5 classes) a besoin de planches d'animation peintes, vues de profil, de face et de dos. Les 16 images par animation fabriquées par AI Studio sont des fondus entre 5 poses : les poses sont bonnes, les mouvements entre elles ne le sont pas. Le plan :

1. **Nano Banana 2** dessine les **poses clés** : une planche de profil, puis une planche face et dos.
2. **Kling** anime chaque mouvement **entre deux poses clés** (image de début, image de fin).
3. On **découpe les vidéos en images**, que `npm run planches` aligne et range en planche.

Les images à joindre sont dans `src/assets/images/` (fiches et planches déjà faites) et `~/Pictures/game visual/sprites/` (le guerrier d'origine). On range ce qui sort dans `~/Pictures/game visual/heros/` :

| Fichier | Contenu |
| --- | --- |
| `<race>-<classe>_fiche.jpg` | fiche du héros (étape 0, Einherjar seulement) |
| `<race>-<classe>_profil.jpg` | planche de profil, 6 poses (étape 1) |
| `<race>-<classe>_face-dos.jpg` | planche face et dos, 2 × 4 poses (étape 2) |
| `<race>-<classe>_<vue>_<anim>.mp4` | vidéo Kling : vue `profil`, `face` ou `dos` ; anim `attente`, `course`, `attaque`, `garde` ou `esquive` (étape 3) |

`<race>` : `einherjar`, `oushebti`, `demi-dieu`, `hanyo`. `<classe>` : `guerrier`, `invocateur`, `lame`, `paladin`, `rodeur`.

## Les 20 héros

**Image 1** : la fiche du personnage, qui fixe son apparence. **Image 2** : la planche de poses de sa classe, qui fixe les poses.

| Héros | Image 1 (fiche) | Image 2 (poses) | Profil |
| --- | --- | --- | --- |
| Einherjar guerrier | `public/sprites/heros.png` | – | ✅ planche d'origine, à garder |
| Einherjar invocateur | `einherjar-invocateur_fiche.jpg` (étape 0) | `anim_heros_invocateur_….jpg` | à refaire en Einherjar |
| Einherjar lame | `einherjar-lame_fiche.jpg` (étape 0) | `anim_heros_lame_….jpg` | à refaire en Einherjar |
| Einherjar paladin | `einherjar-paladin_fiche.jpg` (étape 0) | `anim_heros_paladin_….jpg` | à refaire en Einherjar |
| Einherjar rôdeur | `einherjar-rodeur_fiche.jpg` (étape 0) | `anim_heros_rodeur_….jpg` | à refaire en Einherjar |
| Oushebti guerrier | `race_oushebti_….jpg` | `anim_race_oushebti_….jpg` | ✅ à garder |
| Oushebti invocateur | `oushebti_invocateur_….jpg` | `anim_heros_invocateur_….jpg` | à faire |
| Oushebti lame | `oushebti_lame_….jpg` | `anim_heros_lame_….jpg` | à faire |
| Oushebti paladin | `oushebti_paladin_….jpg` | `anim_heros_paladin_….jpg` | à faire |
| Oushebti rôdeur | `oushebti_rodeur_….jpg` | `anim_heros_rodeur_….jpg` | à faire |
| Demi-dieu guerrier | `race_demidieu_….jpg` | `anim_race_demidieu_….jpg` | ✅ à garder |
| Demi-dieu invocateur | `demidieu_invocateur_….jpg` | `anim_heros_invocateur_….jpg` | à faire |
| Demi-dieu lame | `demidieu_lame_….jpg` | `anim_heros_lame_….jpg` | à faire |
| Demi-dieu paladin | `demidieu_paladin_….jpg` | `anim_heros_paladin_….jpg` | à faire |
| Demi-dieu rôdeur | `demidieu_rodeur_….jpg` | `anim_heros_rodeur_….jpg` | à faire |
| Hanyō guerrier | `race_hanyo_….jpg` | `anim_race_hanyo_….jpg` | à refaire : la planche porte un kimono bleu, la fiche une armure noire |
| Hanyō invocateur | `hanyo_invocateur_….jpg` | `anim_heros_invocateur_….jpg` | à faire |
| Hanyō lame | `hanyo_lame_….jpg` | `anim_heros_lame_….jpg` | à faire |
| Hanyō paladin | `hanyo_paladin_….jpg` | `anim_heros_paladin_….jpg` | à faire |
| Hanyō rôdeur | `hanyo_rodeur_….jpg` | `anim_heros_rodeur_….jpg` | à faire |

Les planches `anim_heros_<classe>` montrent un humain, pas un Einherjar : dans le jeu, l'Einherjar lame est aujourd'hui ce ninja humain teinté en bleu. D'où l'étape 0.

La description à coller à la place de `[CHARACTER]` dans les prompts :

| Héros | `[CHARACTER]` |
| --- | --- |
| Einherjar guerrier | `a spectral Einherjar, a dead viking warrior: pale ice-blue ghostly skin, a long white braided beard, a round iron helmet with a nose guard, a thick grey fur mantle, a long grey cloak, a brown leather tunic and boots, a long nodachi` |
| Einherjar invocateur | `a spectral Einherjar (pale ice-blue ghostly skin, long white braided beard, round iron helmet, grey fur mantle) wearing a wide-sleeved white and indigo onmyoji robe with paper ofuda talismans tucked into the belt, holding a short dark wooden staff topped with small golden bells and white zigzag paper streamers` |
| Einherjar lame | `a spectral Einherjar (pale ice-blue ghostly skin, long white braided beard, round iron helmet, grey fur mantle) wearing a dark close-fitting shinobi outfit with wrapped forearms and shins, holding two blackened iron kunai in a reverse grip tied together by a long red cord` |
| Einherjar paladin | `a spectral Einherjar (pale ice-blue ghostly skin, long white braided beard, round iron helmet, grey fur mantle) wearing a red lacquered chest plate with a golden sun emblem, round shoulder guards and a string of big prayer beads, holding a naginata and a small round wooden shield painted with a red sun` |
| Einherjar rôdeur | `a spectral Einherjar (pale ice-blue ghostly skin, long white braided beard, round iron helmet, grey fur mantle) wearing a short straw raincoat (mino) and wrapped leggings, a leather quiver of white-feathered arrows on the back, holding a tall asymmetric yumi longbow of lacquered bamboo` |
| Oushebti guerrier | `an animated Egyptian funerary statuette: a body of glazed turquoise faience with fine cracks, a striped blue and gold nemes headdress, hieroglyphs down the chest and legs, a bronze khopesh` |
| Oushebti invocateur | `an animated Egyptian funerary statuette with a turquoise faience body and a blue and gold nemes, wearing a long white and gold priest robe with hieroglyph bands, holding a golden ankh staff hung with small bells` |
| Oushebti lame | `an animated Egyptian funerary statuette with a turquoise faience body and a blue and gold nemes, wearing a short linen kilt and linen-wrapped forearms and shins, holding two small bronze khopesh daggers linked by a chain of blue beads` |
| Oushebti paladin | `an animated Egyptian funerary statuette with a turquoise faience body and a blue and gold nemes, wearing golden pectoral armor and a golden belt, holding a bronze-tipped spear and a round golden shield with a flaming sun` |
| Oushebti rôdeur | `an animated Egyptian funerary statuette with a turquoise faience body and a blue and gold nemes, wearing a beige linen shawl, a leather quiver of white arrows, holding a golden recurve bow` |
| Demi-dieu guerrier | `a Greek demigod hoplite: a bronze Corinthian helmet with a tall horsehair crest, a bronze muscle cuirass, a white pleated chiton, a long red cape, bronze greaves and sandals, a short bronze sword` |
| Demi-dieu invocateur | `a young Greek demigod priest: a laurel wreath, a white chiton, a red cape over one shoulder, bronze bracers and greaves, sandals, a tall staff topped with a golden sun` |
| Demi-dieu lame | `a Greek demigod assassin: a dark red hood, a dark leather cuirass and short black skirt, bronze bracers and greaves, sandals, two short bronze daggers` |
| Demi-dieu paladin | `a Greek demigod hoplite: a golden Corinthian helmet with a red crest, a bronze muscle cuirass, a red skirt of leather strips, a long spear and a round bronze shield with a golden sun` |
| Demi-dieu rôdeur | `a Greek demigod hunter: a bronze helmet, a green hooded cloak over a green tunic, bronze bracers, sandals, a leather quiver of golden arrows, a golden recurve bow` |
| Hanyō guerrier | `a half-human half-yokai samurai: long silver hair, two small dark horns, one red eye, a white fox mask pushed to the side of the head, black and red lacquered samurai armor, one dark clawed hand, a katana` |
| Hanyō invocateur | `a half-human half-yokai onmyoji: long silver hair, two small dark horns, a white fox mask pushed to the side of the head, a dark indigo kimono with cloud patterns and a purple sash, a dark wooden staff with red tassels, paper talismans in the other hand` |
| Hanyō lame | `a half-human half-yokai shinobi: a high silver ponytail, two small dark horns, one red eye, a white fox mask pushed to the side of the head, a black and purple shinobi outfit with purple wrappings, one dark clawed hand, two kunai tied together by a red cord` |
| Hanyō paladin | `a half-human half-yokai samurai: long silver hair, a white fox mask pushed to the side of the head, red and black samurai armor with a horned kabuto, a naginata and a round black shield with a golden oni face` |
| Hanyō rôdeur | `a half-human half-yokai hunter: a silver ponytail, two small dark horns, a white fox mask pushed to the side of the head, a straw mino raincoat over dark green clothes, a quiver of arrows, a longbow` |

## Style commun

À coller à la fin de chaque prompt Nano Banana, à la place de `[STYLE]` :

```
2D hand-painted game character sprite art in the exact style of the attached images: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no frames, no painted effects (no motion trails, no smoke, no sparks, no glow, no speed lines). Every figure fully visible with a wide empty margin around it, all figures at the same scale, feet on the same invisible baseline, evenly spaced and not touching. Landscape 16:9, highest resolution.
```

Pas d'effets peints : le détourage garde tout ce qui n'est pas du fond gris, et les effets (traînées, fumée) gêneraient Kling puis le jeu.

## Étape 0 : fiches des Einherjar (4 images)

Joindre `public/sprites/heros.png` (image 1) et `heros_<classe>_….jpg` (image 2, la tenue de la classe).

```
Image 1 is our hero, a spectral Einherjar: a dead viking warrior with pale ice-blue ghostly skin, a long white braided beard, a round iron helmet with a nose guard and a thick grey fur mantle. Image 2 shows the outfit and weapon of a character class. Redraw the character of image 1 (same face, beard, helmet, skin color, build and art style) wearing the outfit and holding the weapon of image 2, keeping the grey fur mantle over it. One single figure, full body, three-quarter view facing right, relaxed standing pose. [STYLE]
```

Enregistrer sous `einherjar-<classe>_fiche.jpg`, puis `npm run sprites -- heros-einherjar-<classe>` : la fiche remplace l'image de l'écran de création.

## Étape 1 : planche de profil (16 héros)

Joindre la fiche (image 1) et la planche de poses de la classe (image 2), coller le prompt puis les deux lignes de la classe.

```
Image 1 shows the character: [CHARACTER]. Image 2 is an animation key-pose sheet of another character of the same class: use it only for the poses and the art style. Draw a new key-pose sheet of the character from image 1 (exact same face, body, outfit, colors and weapon) performing six poses in one single row, left to right, every figure in three-quarter view facing right:
[POSES]
[STYLE]
```

| Classe | `[POSES]` |
| --- | --- |
| Guerrier | `1. idle: calm guard stance, weapon held low in both hands. 2. running: mid-stride, leaning forward, weapon held low at the side. 3. wind-up: weapon raised high above the head with both hands, body coiled. 4. strike: the end of a wide horizontal slash, weapon fully extended forward, front knee bent. 5. guard: weapon held upright in front of the body, braced, feet planted. 6. dash: a low fast lunge forward, body almost horizontal, weapon trailing behind.` |
| Invocateur | `1. idle: standing calmly, staff held upright at the side. 2. running: mid-stride, sleeves streaming back, staff held diagonally. 3. wind-up: staff raised high overhead to cast, the other hand drawing a paper talisman. 4. strike: staff thrust forward, the paper talisman flying from the fingertips. 5. guard: staff held horizontally in front with both hands. 6. dash: a quick gliding step forward, leaning low, robe flaring.` |
| Lame | `1. idle: low crouch, both kunai held in a reverse grip. 2. running: a low sprint, leaning forward, kunai held back along the forearms. 3. wind-up: both kunai raised crossed above the head. 4. strike: the end of a wide slashing sweep, one arm extended, the red cord whipping. 5. guard: crouched, both kunai crossed in front of the face. 6. dash: a low forward slide on one knee, one hand touching the ground.` |
| Paladin | `1. idle: standing tall, naginata upright, shield at the side. 2. running: mid-stride, shield forward, naginata held diagonally behind. 3. wind-up: naginata drawn back over the shoulder, shield raised. 4. strike: a long lunging thrust, naginata fully extended forward. 5. guard: shield raised in front of the body, braced, naginata behind it. 6. dash: a shield charge forward, shoulder first, body low.` |
| Rôdeur | `1. idle: alert stance, bow held low in one hand, an arrow in the other. 2. running: a swift stalking run, bow held low. 3. wind-up: arrow nocked, bowstring drawn back to the cheek. 4. strike: the arrow just released, bowstring snapped forward, bow arm extended. 5. guard: crouched, bow held across the body. 6. dash: an agile leap backward, knees tucked, bow in hand.` |

Pour les guerriers, garder l'arme de la fiche : nodachi (Einherjar), khopesh (Oushebti), épée courte (Demi-dieu), katana (Hanyō).

Si une pose sort mal, demander dans la même conversation : `Redraw only pose 4, same everything else.`

## Étape 2 : planche face et dos (20 héros)

Joindre la planche de profil de l'étape 1, ou celle qui existe déjà pour les trois guerriers « à garder » :

| Guerrier | Image à joindre |
| --- | --- |
| Einherjar | `~/Pictures/game visual/sprites/heros_reference.jpg` et `heros_windup.jpg` |
| Oushebti | `anim_race_oushebti_….jpg` |
| Demi-dieu | `anim_race_demidieu_….jpg` |

```
The attached image is the key-pose sheet of this character, seen in three-quarter view facing right: [CHARACTER]. Draw a new sheet of the exact same character (same design, colors, weapon, proportions and scale) in two rows of four poses: 1. idle, 2. running, 3. wind-up, 4. strike (the same poses as poses 1 to 4 of the attached sheet).
Top row: three-quarter FRONT view. The character faces the viewer and the bottom-right corner of the image: we see the face, the chest and the front of the outfit.
Bottom row: three-quarter BACK view. The character turns away from the viewer and faces the top-right corner of the image: we see the back of the head, the back of the outfit and the weapon from behind; the face is hidden.
Invent back details that stay consistent with the front (hair, cloak, straps, sheaths, quiver).
[STYLE]
```

La vue de face regarde vers le bas à droite de l'écran, la vue de dos vers le haut à droite. Le jeu les retournera pour la gauche, comme il le fait déjà pour le profil.

## Étape 3 : vidéos Kling

Dans Kling : **Image vers vidéo**, option **Images de début et de fin** (Start & End Frames), **5 secondes**. Chaque pose est découpée de sa planche et centrée dans une image carrée sur le même fond gris. Kling anime alors le vrai mouvement entre deux poses, au lieu d'un fondu.

| Vidéo | Image de début | Image de fin | Vues |
| --- | --- | --- | --- |
| `attente` | pose 1 | pose 1 (la même, pour boucler) | profil, face, dos |
| `course` | pose 2 | pose 2 (la même, pour boucler) | profil, face, dos |
| `attaque` | pose 1 | pose 4 | profil, face, dos |
| `garde` | pose 1 | pose 5 | profil |
| `esquive` | pose 1 | pose 6 | profil |

C'est jusqu'à 11 vidéos par héros. Les crédits gratuits de Kling n'en couvrent que quelques-unes par jour, donc dans l'ordre :
1. `course` puis `attente`, dans les trois vues : ce sont elles qu'on voit le plus, et le fondu y est le plus visible.
2. `attaque`.
3. `garde` et `esquive` : ce sont des gestes courts, donc les poses clés seules passent.

Si Kling fige le personnage quand l'image de début et celle de fin sont identiques, ne donner que l'image de début.

**Prompt négatif** (champ « Negative prompt ») pour toutes les vidéos :

```
camera movement, zoom, pan, tracking shot, camera shake, background change, scenery, floor, ground shadow, motion blur, speed lines, particles, smoke, glow, text, extra limbs, extra weapons, morphing, changing face, changing outfit, cut, transition
```

**Prompts.** Remplacer `[CHARACTER]` par le nom court du héros (`the spectral viking warrior`, `the turquoise Egyptian statuette`…) et `[FACING]` selon la vue :
- profil : `in three-quarter view facing right` ;
- face : `in three-quarter front view, facing the viewer and the bottom-right` ;
- dos : `in three-quarter back view, back to the viewer, facing the top-right`.

`attente` :

```
[CHARACTER], [FACING], stands in place in a calm idle stance and breathes slowly: the chest rises and falls, the clothes and hair sway gently, a small shift of weight from one foot to the other. Static locked-off camera, the character stays exactly centered, plain flat light grey background that never changes. Seamless loop: the last frame matches the first.
```

`course` :

```
[CHARACTER], [FACING], runs in place on the spot as if on a treadmill: a full running cycle, arms and legs swinging, clothes bouncing with each step. The character never moves across the frame and the camera never follows or moves. Plain flat light grey background that never changes. Seamless loop: the last frame matches the first.
```

`attaque` (la phrase de la classe à la place de `[ATTACK]`) :

```
[CHARACTER], [FACING], [ATTACK], with a fast and powerful motion, then holds the final pose. The character stays in place, static locked-off camera, plain flat light grey background that never changes.
```

| Classe | `[ATTACK]` |
| --- | --- |
| Guerrier | `raises the weapon high above the head with both hands, then slashes it down and across in a wide arc` |
| Invocateur | `lifts the staff overhead, the bells shaking, then thrusts it forward and flicks a paper talisman from the other hand` |
| Lame | `raises both kunai crossed above the head, then slashes them down and to the side, the red cord whipping behind` |
| Paladin | `draws the naginata back over the shoulder behind the shield, then lunges forward with a long thrust` |
| Rôdeur | `nocks an arrow and draws the bowstring back to the cheek, then releases; the bowstring snaps forward and the arrow leaves the frame at once` |

`garde` :

```
[CHARACTER], in three-quarter view facing right, quickly raises the weapon (or the shield) into a defensive guard and braces, feet planted. The character stays in place, static locked-off camera, plain flat light grey background that never changes.
```

`esquive` :

```
[CHARACTER], in three-quarter view facing right, makes a quick evasive dash, low and fast, and lands in the final pose. Static locked-off camera that never follows, plain flat light grey background that never changes.
```

## Étape 4 : des vidéos à la planche

**Outils à écrire.** Ni le découpage des poses pour Kling, ni l'extraction des images des vidéos n'existent encore :
- `npm run poses` : découper chaque pose d'une planche et la centrer dans une image carrée sur le fond gris, prête pour Kling ;
- `npm run videos` : extraire 8 à 16 images par vidéo (avec ffmpeg, installé par npm, gratuit), puis les passer à `npm run planches`, qui aligne déjà les pieds et l'axe du corps d'une image à l'autre.

**Code du jeu.** Le jeu n'affiche aujourd'hui que le profil. Il faudra une animation par vue (`idle`, `idle-face`, `idle-dos`…) et le choix de la vue selon la direction du déplacement.
