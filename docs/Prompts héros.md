# Prompts des héros (Nano Banana 2 puis Kling)

Chaque prompt se colle tel quel, avec une seule pièce jointe : l'image du héros. Elle suffit à donner sa race, sa classe, sa tenue et son arme.

1. **Nano Banana 2** dessine les poses clés : une planche de profil, puis une planche face et dos.
2. **Kling** anime chaque mouvement entre deux poses clés.
3. Les vidéos sont découpées en images, que `npm run planches` range en planche.

## Image à joindre

Les images sont dans `src/assets/images/`, sauf celle de l'Einherjar guerrier. Choisir les prompts de la section de la classe.

| Race | Guerrier | Invocateur | Lame | Paladin | Rôdeur |
| --- | --- | --- | --- | --- | --- |
| Einherjar | `public/sprites/heros.png` | `heros_invocateur_….jpg` | `heros_lame_….jpg` | `heros_paladin_….jpg` | `heros_rodeur_….jpg` |
| Oushebti | `race_oushebti_….jpg` | `oushebti_invocateur_….jpg` | `oushebti_lame_….jpg` | `oushebti_paladin_….jpg` | `oushebti_rodeur_….jpg` |
| Demi-dieu | `race_demidieu_….jpg` | `demidieu_invocateur_….jpg` | `demidieu_lame_….jpg` | `demidieu_paladin_….jpg` | `demidieu_rodeur_….jpg` |
| Hanyō | `race_hanyo_….jpg` | `hanyo_invocateur_….jpg` | `hanyo_lame_….jpg` | `hanyo_paladin_….jpg` | `hanyo_rodeur_….jpg` |

Enregistrer les résultats dans `~/Pictures/game visual/heros/` :
- `<race>-<classe>_profil.jpg` pour la planche de profil ;
- `<race>-<classe>_face-dos.jpg` pour la planche face et dos ;
- `<race>-<classe>_<vue>_<anim>.mp4` pour les vidéos, avec la vue (`profil`, `face` ou `dos`) et l'animation (`attente`, `course`, `attaque`, `garde` ou `esquive`).

L'Einherjar, l'Oushebti et le Demi-dieu guerriers ont déjà leur planche de profil : pour eux, seulement la planche face et dos.

Si ça sort mal, demander dans la même conversation :
- une pose ratée : `Redraw only pose 4, keep everything else identical.`
- des figures qui se chevauchent : `Some figures overlap. Redraw the same sheet with more space: every figure, weapon included, must stay inside its own cell with empty grey background all around it, even if the figures get smaller.`

## Guerrier

**Profil**

```
The attached image is our game hero. Draw an animation key-pose sheet of this exact character: same face, body, outfit, colors and weapon, nothing added or removed. Six poses on a grid of 3 columns and 2 rows (poses 1 to 3 on the top row, poses 4 to 6 on the bottom row, left to right), every figure in three-quarter view facing right:
1. idle: calm guard stance, weapon held low in both hands.
2. running: mid-stride, leaning forward, weapon held low at the side.
3. wind-up: weapon raised high above the head, body coiled.
4. strike: the end of a wide horizontal slash, weapon fully extended forward, front knee bent.
5. guard: weapon held upright in front of the body, braced, feet planted.
6. dash: a low fast lunge forward, body almost horizontal, weapon trailing behind.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no frames, no painted effects (no motion trails, no smoke, no sparks, no glow, no speed lines). Each figure stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring figure: no weapon, cape or limb crosses into another cell; draw long weapons angled up or down, or draw the figures smaller, rather than let them overlap. No grid lines drawn. All figures at the same scale, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Face et dos**

```
The attached image is our game hero. Draw a sheet of this exact character: same face, body, outfit, colors, weapon and proportions, nothing added or removed. A grid of 4 columns and 2 rows, the same four poses on each row, left to right: 1. idle, calm guard stance, weapon held low. 2. running, mid-stride. 3. wind-up, weapon raised high above the head. 4. strike, the end of a wide slash, weapon extended forward.
Top row: three-quarter FRONT view. The character faces the viewer and the bottom-right corner of the image: we see the face, the chest and the front of the outfit.
Bottom row: three-quarter BACK view. The character turns away from the viewer and faces the top-right corner of the image: we see the back of the head, the back of the outfit and the weapon from behind; the face is hidden. Back details stay consistent with the front (hair, cloak, straps, sheath).
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no frames, no painted effects (no motion trails, no smoke, no sparks, no glow, no speed lines). Each figure stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring figure: no weapon, cape or limb crosses into another cell; draw long weapons angled up or down, or draw the figures smaller, rather than let them overlap. No grid lines drawn. All figures at the same scale, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

## Invocateur

**Profil**

```
The attached image is our game hero. Draw an animation key-pose sheet of this exact character: same face, body, outfit, colors and staff, nothing added or removed. Six poses on a grid of 3 columns and 2 rows (poses 1 to 3 on the top row, poses 4 to 6 on the bottom row, left to right), every figure in three-quarter view facing right:
1. idle: standing calmly, staff held upright at the side.
2. running: mid-stride, sleeves and clothes streaming back, staff held diagonally.
3. wind-up: staff raised high overhead to cast a spell, the other hand open.
4. strike: staff thrust forward to release the spell, the other arm swept back.
5. guard: staff held horizontally in front of the body with both hands.
6. dash: a quick gliding step forward, leaning low, clothes flaring.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no frames, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each figure stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring figure: no weapon, cape or limb crosses into another cell; draw long weapons angled up or down, or draw the figures smaller, rather than let them overlap. No grid lines drawn. All figures at the same scale, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Face et dos**

```
The attached image is our game hero. Draw a sheet of this exact character: same face, body, outfit, colors, staff and proportions, nothing added or removed. A grid of 4 columns and 2 rows, the same four poses on each row, left to right: 1. idle, standing calmly, staff upright at the side. 2. running, mid-stride. 3. wind-up, staff raised high overhead to cast. 4. strike, staff thrust forward.
Top row: three-quarter FRONT view. The character faces the viewer and the bottom-right corner of the image: we see the face, the chest and the front of the outfit.
Bottom row: three-quarter BACK view. The character turns away from the viewer and faces the top-right corner of the image: we see the back of the head, the back of the outfit and the staff from behind; the face is hidden. Back details stay consistent with the front (hair, sleeves, sash, belt).
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no frames, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each figure stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring figure: no weapon, cape or limb crosses into another cell; draw long weapons angled up or down, or draw the figures smaller, rather than let them overlap. No grid lines drawn. All figures at the same scale, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

## Lame

**Profil**

```
The attached image is our game hero. Draw an animation key-pose sheet of this exact character: same face, body, outfit, colors and twin blades, nothing added or removed. Six poses on a grid of 3 columns and 2 rows (poses 1 to 3 on the top row, poses 4 to 6 on the bottom row, left to right), every figure in three-quarter view facing right:
1. idle: low crouch, both blades held in a reverse grip.
2. running: a low sprint, leaning forward, blades held back along the forearms.
3. wind-up: both blades raised crossed above the head.
4. strike: the end of a wide slashing sweep, one arm extended forward, the other swept back.
5. guard: crouched, both blades crossed in front of the face.
6. dash: a low forward slide on one knee, one hand touching the ground.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no frames, no painted effects (no motion trails, no smoke, no sparks, no glow, no speed lines). Each figure stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring figure: no weapon, cape or limb crosses into another cell; draw long weapons angled up or down, or draw the figures smaller, rather than let them overlap. No grid lines drawn. All figures at the same scale, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Face et dos**

```
The attached image is our game hero. Draw a sheet of this exact character: same face, body, outfit, colors, twin blades and proportions, nothing added or removed. A grid of 4 columns and 2 rows, the same four poses on each row, left to right: 1. idle, low crouch, blades in a reverse grip. 2. running, a low sprint. 3. wind-up, both blades raised crossed above the head. 4. strike, the end of a wide slashing sweep.
Top row: three-quarter FRONT view. The character faces the viewer and the bottom-right corner of the image: we see the face, the chest and the front of the outfit.
Bottom row: three-quarter BACK view. The character turns away from the viewer and faces the top-right corner of the image: we see the back of the head, the back of the outfit and the blades from behind; the face is hidden. Back details stay consistent with the front (hair, mask, wrappings, belt).
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no frames, no painted effects (no motion trails, no smoke, no sparks, no glow, no speed lines). Each figure stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring figure: no weapon, cape or limb crosses into another cell; draw long weapons angled up or down, or draw the figures smaller, rather than let them overlap. No grid lines drawn. All figures at the same scale, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

## Paladin

**Profil**

```
The attached image is our game hero. Draw an animation key-pose sheet of this exact character: same face, body, armor, colors, polearm and shield, nothing added or removed. Six poses on a grid of 3 columns and 2 rows (poses 1 to 3 on the top row, poses 4 to 6 on the bottom row, left to right), every figure in three-quarter view facing right:
1. idle: standing tall, polearm upright, shield at the side.
2. running: mid-stride, shield forward, polearm held diagonally behind.
3. wind-up: polearm drawn back over the shoulder, shield raised.
4. strike: a long lunging thrust, polearm fully extended forward.
5. guard: shield raised in front of the body, braced, polearm behind it.
6. dash: a shield charge forward, shoulder first, body low.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no frames, no painted effects (no motion trails, no smoke, no sparks, no glow, no speed lines). Each figure stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring figure: no weapon, cape or limb crosses into another cell; draw long weapons angled up or down, or draw the figures smaller, rather than let them overlap. No grid lines drawn. All figures at the same scale, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Face et dos**

```
The attached image is our game hero. Draw a sheet of this exact character: same face, body, armor, colors, polearm, shield and proportions, nothing added or removed. A grid of 4 columns and 2 rows, the same four poses on each row, left to right: 1. idle, standing tall, polearm upright, shield at the side. 2. running, mid-stride, shield forward. 3. wind-up, polearm drawn back over the shoulder. 4. strike, a long lunging thrust.
Top row: three-quarter FRONT view. The character faces the viewer and the bottom-right corner of the image: we see the face, the chest and the front of the armor.
Bottom row: three-quarter BACK view. The character turns away from the viewer and faces the top-right corner of the image: we see the back of the head or helmet, the back of the armor and the back of the shield; the face is hidden. Back details stay consistent with the front (helmet, cape, straps).
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no frames, no painted effects (no motion trails, no smoke, no sparks, no glow, no speed lines). Each figure stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring figure: no weapon, cape or limb crosses into another cell; draw long weapons angled up or down, or draw the figures smaller, rather than let them overlap. No grid lines drawn. All figures at the same scale, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

## Rôdeur

**Profil**

```
The attached image is our game hero. Draw an animation key-pose sheet of this exact character: same face, body, outfit, colors, bow and quiver, nothing added or removed. Six poses on a grid of 3 columns and 2 rows (poses 1 to 3 on the top row, poses 4 to 6 on the bottom row, left to right), every figure in three-quarter view facing right:
1. idle: alert stance, bow held low in one hand.
2. running: a swift stalking run, bow held low.
3. wind-up: arrow nocked, bowstring drawn back to the cheek.
4. strike: the arrow just released, bowstring snapped forward, bow arm extended.
5. guard: crouched, bow held across the body.
6. dash: an agile leap backward, knees tucked, bow in hand.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no frames, no painted effects (no motion trails, no smoke, no sparks, no glow, no speed lines). Each figure stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring figure: no weapon, cape or limb crosses into another cell; draw long weapons angled up or down, or draw the figures smaller, rather than let them overlap. No grid lines drawn. All figures at the same scale, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Face et dos**

```
The attached image is our game hero. Draw a sheet of this exact character: same face, body, outfit, colors, bow, quiver and proportions, nothing added or removed. A grid of 4 columns and 2 rows, the same four poses on each row, left to right: 1. idle, alert stance, bow held low. 2. running, a swift stalking run. 3. wind-up, bowstring drawn back to the cheek. 4. strike, the arrow just released, bow arm extended.
Top row: three-quarter FRONT view. The character faces the viewer and the bottom-right corner of the image: we see the face, the chest and the front of the outfit.
Bottom row: three-quarter BACK view. The character turns away from the viewer and faces the top-right corner of the image: we see the back of the head, the quiver on the back and the back of the outfit; the face is hidden. Back details stay consistent with the front (hair, cloak, quiver straps).
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no frames, no painted effects (no motion trails, no smoke, no sparks, no glow, no speed lines). Each figure stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring figure: no weapon, cape or limb crosses into another cell; draw long weapons angled up or down, or draw the figures smaller, rather than let them overlap. No grid lines drawn. All figures at the same scale, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

## Kling

Dans Kling : **Image vers vidéo**, option **Images de début et de fin** (Start & End Frames), **5 secondes**. Les images sont les poses des planches, chacune seule sur le fond gris, découpées par `npm run poses` (voir plus bas). Les prompts valent pour les trois vues : la pose jointe montre déjà dans quel sens regarde le héros.

| Vidéo | Image de début | Image de fin | Vues |
| --- | --- | --- | --- |
| Attente | pose 1 | pose 1 | profil, face, dos |
| Course | pose 2 | pose 2 | profil, face, dos |
| Attaque | pose 1 | pose 4 | profil, face, dos |
| Garde | pose 1 | pose 5 | profil |
| Esquive | pose 1 | pose 6 | profil |

Les crédits gratuits ne couvrent que quelques vidéos par jour : d'abord course et attente (ce qu'on voit le plus), puis attaque. Garde et esquive sont des gestes courts, leurs poses clés seules passent. Si Kling fige le personnage quand les deux images sont identiques, ne donner que l'image de début.

**Prompt négatif**, le même pour toutes les vidéos :

```
camera movement, zoom, pan, tracking shot, camera shake, background change, scenery, floor, ground shadow, motion blur, speed lines, particles, smoke, glow, magic effects, text, extra limbs, extra weapons, morphing, changing face, changing outfit, cut, transition
```

### Toutes les classes

**Attente**

```
The character stands in place in a calm idle stance and breathes slowly: the chest rises and falls, the clothes and hair sway gently, a small shift of weight from one foot to the other. The character keeps facing the same direction. Static locked-off camera, the character stays exactly centered, plain flat light grey background that never changes. Seamless loop: the last frame matches the first.
```

**Course**

```
The character runs in place on the spot as if on a treadmill, keeping the same facing direction: a full running cycle, arms and legs swinging, clothes and hair bouncing with each step. The character never moves across the frame and the camera never follows or moves. Plain flat light grey background that never changes. Seamless loop: the last frame matches the first.
```

### Guerrier

**Attaque**

```
The character raises the weapon high above the head, then slashes it down and across in a wide powerful arc and holds the final pose. Fast and heavy motion, the character stays in place and keeps facing the same direction. Static locked-off camera, plain flat light grey background that never changes.
```

**Garde**

```
The character quickly brings the weapon upright in front of the body into a defensive guard and braces, feet planted. The character stays in place and keeps facing the same direction. Static locked-off camera, plain flat light grey background that never changes.
```

**Esquive**

```
The character makes a quick low lunge forward, the body almost horizontal and the weapon trailing behind, then lands in the final pose. Static locked-off camera that never follows, plain flat light grey background that never changes.
```

### Invocateur

**Attaque**

```
The character lifts the staff high overhead, then thrusts it forward to cast a spell and holds the final pose. Fast and graceful motion, no visible magic, the character stays in place and keeps facing the same direction. Static locked-off camera, plain flat light grey background that never changes.
```

**Garde**

```
The character quickly holds the staff horizontally in front of the body with both hands into a defensive guard and braces, feet planted. The character stays in place and keeps facing the same direction. Static locked-off camera, plain flat light grey background that never changes.
```

**Esquive**

```
The character makes a quick gliding step forward, leaning low with clothes flaring, then lands in the final pose. Static locked-off camera that never follows, plain flat light grey background that never changes.
```

### Lame

**Attaque**

```
The character raises both blades crossed above the head, then slashes them down and to the side in a wide sweep and holds the final pose. Very fast and sharp motion, the character stays in place and keeps facing the same direction. Static locked-off camera, plain flat light grey background that never changes.
```

**Garde**

```
The character quickly crouches and crosses both blades in front of the face into a defensive guard. The character stays in place and keeps facing the same direction. Static locked-off camera, plain flat light grey background that never changes.
```

**Esquive**

```
The character drops low and slides forward on one knee, one hand touching the ground, then holds the final pose. Very fast motion, static locked-off camera that never follows, plain flat light grey background that never changes.
```

### Paladin

**Attaque**

```
The character draws the polearm back over the shoulder behind the shield, then lunges forward with a long powerful thrust and holds the final pose. Fast and heavy motion, the character keeps facing the same direction. Static locked-off camera, plain flat light grey background that never changes.
```

**Garde**

```
The character quickly raises the shield in front of the body and braces behind it, feet planted, the polearm held back. The character stays in place and keeps facing the same direction. Static locked-off camera, plain flat light grey background that never changes.
```

**Esquive**

```
The character charges forward shield first, shoulder low, then stops in the final pose. Fast and heavy motion, static locked-off camera that never follows, plain flat light grey background that never changes.
```

### Rôdeur

**Attaque**

```
The character nocks an arrow and draws the bowstring back to the cheek, then releases: the bowstring snaps forward and the arrow leaves the frame at once. The character holds the final pose, stays in place and keeps facing the same direction. Static locked-off camera, plain flat light grey background that never changes.
```

**Garde**

```
The character quickly crouches and holds the bow across the body into a defensive guard. The character stays in place and keeps facing the same direction. Static locked-off camera, plain flat light grey background that never changes.
```

**Esquive**

```
The character makes an agile leap backward, knees tucked, bow in hand, then lands in the final pose. Fast motion, static locked-off camera that never follows, plain flat light grey background that never changes.
```

## Après Kling

**Découper les poses pour Kling :**

```bash
npm run poses -- "<planche ou dossier de planches>"
```

- **Résultat :** pour chaque planche, un dossier `poses/<planche>/` à côté d'elle, avec :
  - `pose-1.png`, `pose-2.png`… : chaque pose seule au centre d'une image carrée de 1024 pixels, dans l'ordre de lecture (lignes de haut en bas, poses de gauche à droite) ;
  - `apercu.jpg` : toutes les poses numérotées.
- **Planche face et dos :** poses 1 à 4 de face, 5 à 8 de dos. Si le nom de la planche contient `face-dos`, les fichiers s'appellent directement `face-1`… et `dos-1`….
- **Alignement :** toutes les poses d'une planche gardent la même échelle, les pieds à la même hauteur et le corps sur le même axe. Prises comme début et fin d'une vidéo, elles ne font donc pas sauter le personnage.
- **Nombre de poses :** détecté tout seul, même quand Nano Banana en a dessiné plus ou moins que demandé. Si des figures se touchent trop et que le compte est faux, le donner à la main : `--grille 3x2` (colonnes x lignes). Autres options : `--taille 1024`, `--sortie <dossier>`.

**Outil à écrire :** `npm run videos`, qui extraira 8 à 16 images par vidéo (ffmpeg installé par npm, gratuit) et les passera à `npm run planches`, qui aligne déjà les pieds et l'axe du corps.

**Code du jeu :** il n'affiche aujourd'hui que le profil. Il faudra une animation par vue et le choix de la vue selon la direction du déplacement.
