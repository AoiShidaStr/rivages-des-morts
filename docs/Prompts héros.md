# Prompts des héros (Nano Banana 2)

Chaque prompt se colle tel quel dans Gemini, avec une seule image jointe. L'image donne la race, la classe, la tenue et l'arme : le même prompt sert aux quatre races d'une classe. Les vues de profil et de face sont prévues, la vue de dos viendra plus tard.

1. **Poses clés :** joindre la fiche du héros, coller le prompt « Profil » de sa classe, puis le prompt « Face ».
2. **Animations :** joindre une pose découpée dans ces planches, coller le prompt de l'animation. Nano Banana dessine toute l'animation en une planche.

`npm run kit-heros` range tout cela dans `~/Pictures/game visual/heros/<race>-<classe>/` : la fiche, les planches de poses clés déposées, et pour chaque animation la pose déjà découpée (`pose.png`) avec son prompt. Les prompts viennent de `tools/prompts-heros.mjs` ; après une modification, `npm run doc-heros` réécrit ce fichier.

## Fiche à joindre

Les fiches sont dans `src/assets/images/`, sauf celle de l'Einherjar guerrier.

| Race | Guerrier | Invocateur | Lame | Paladin | Rôdeur |
| --- | --- | --- | --- | --- | --- |
| Einherjar | `public/sprites/heros.png` | `heros_invocateur_….jpg` | `heros_lame_….jpg` | `heros_paladin_….jpg` | `heros_rodeur_….jpg` |
| Oushebti | `race_oushebti_….jpg` | `oushebti_invocateur_….jpg` | `oushebti_lame_….jpg` | `oushebti_paladin_….jpg` | `oushebti_rodeur_….jpg` |
| Demi-dieu | `race_demidieu_….jpg` | `demidieu_invocateur_….jpg` | `demidieu_lame_….jpg` | `demidieu_paladin_….jpg` | `demidieu_rodeur_….jpg` |
| Hanyō | `race_hanyo_….jpg` | `hanyo_invocateur_….jpg` | `hanyo_lame_….jpg` | `hanyo_paladin_….jpg` | `hanyo_rodeur_….jpg` |

L'Einherjar guerrier a déjà ses animations de profil dans le jeu : pour lui, seulement la face. Les planches de profil des autres guerriers, faites par AI Studio, portent des légendes écrites et sont à refaire.

## Pose à joindre pour chaque animation

| Animation | Pose jointe | Images |
| --- | --- | --- |
| Attente | pose 1 (repos) | 6, en boucle |
| Course | pose 2 (course) | 8, en boucle |
| Attaque | pose 1 (repos) | 6 : 3 d'élan, 3 de coup |
| Garde (profil) | pose 1 (repos) | 4 |
| Esquive (profil) | pose 1 (repos) | 6 |

Prendre la pose dans la planche de la même vue : de profil pour les animations de profil, de face pour celles de face.

## Si ça sort mal

Demander dans la même conversation :

- des images presque identiques : `The frames are almost identical. Redraw the sheet following the frame list exactly: every frame must show a clearly different pose, exaggerate the motion if needed.`
- une image ratée : `Redraw only frame 4, keep everything else identical.`
- des figures qui se chevauchent : `Some figures overlap. Redraw the same sheet with more space: every figure, weapon included, must stay inside its own cell with empty grey background all around it, even if the figures get smaller.`

## Toutes les classes : attente et course

**Attente, profil** (joindre la pose 1 de profil)

```
The attached image shows our game hero in three-quarter view facing right. Draw a sprite animation sheet of this exact character performing an idle breathing loop, clearly visible like the idle animation of a fighting game: same face, body, outfit, colors, weapon and proportions, every frame in three-quarter view facing right, exactly like the attached image.
6 frames on a grid of 3 columns and 2 rows, read left to right, then top to bottom:
Frame 1, neutral: exactly the pose of the attached image.
Frame 2, breathing in: the chest swells, the shoulders and head rise, the hair and cloth start to lift.
Frame 3, top of the breath: the shoulders and head at their HIGHEST, the chest fully expanded, the weapon raised slightly with the body, the knees straight.
Frame 4, breathing out: the shoulders drop, the knees start to bend, the hair and cloth swing the other way.
Frame 5, bottom of the breath: the shoulders and head at their LOWEST, the knees slightly bent, the head dipped a little, the weapon lowered slightly.
Frame 6, rising again, halfway between frame 5 and frame 1.
Between frame 3 and frame 5, the top of the head moves down by about a quarter of the head height; the shoulders, hands, weapon, hair and cloth move with it. Put the moving parts at visibly different positions in each frame.
It is a seamless loop: frame 6 leads smoothly back to frame 1.
DO NOT draw the same pose twice: every frame must be clearly different from the frames next to it, even if the motion looks exaggerated.
DO NOT simply copy the attached image into every frame.
DO NOT change the camera angle, the facing direction, the design, the colors or the weapon from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
DO NOT add anything that is not the character: no effects, no props, no ground, no text, no numbers, no frame labels, no grid lines.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Course, profil** (joindre la pose 2 de profil)

```
The attached image shows our game hero in three-quarter view facing right. Draw a sprite animation sheet of this exact character performing a running cycle on the spot: same face, body, outfit, colors, weapon and proportions, every frame in three-quarter view facing right, exactly like the attached image.
8 frames on a grid of 4 columns and 2 rows, read left to right, then top to bottom:
Frame 1, contact: the right leg reaches forward and the heel touches the ground, the left leg stretched behind, the left arm forward.
Frame 2, down: the right leg bends under the weight, the body at its lowest.
Frame 3, passing: the left leg swings forward past the right leg, the body rising.
Frame 4, up: pushing off the right foot, the body at its highest, both feet almost off the ground.
Frame 5, contact: the left leg reaches forward and the heel touches the ground, the right leg stretched behind, the right arm forward.
Frame 6, down: the left leg bends under the weight, the body at its lowest.
Frame 7, passing: the right leg swings forward past the left leg, the body rising.
Frame 8, up: pushing off the left foot, the body at its highest, both feet almost off the ground.
The legs and arms are in a different position in every frame, the arms swinging opposite to the legs; the hair and cloth bounce with each step.
It is a seamless loop: frame 8 leads smoothly back to frame 1.
DO NOT draw the same pose twice: every frame must be clearly different from the frames next to it, even if the motion looks exaggerated.
DO NOT simply copy the attached image into every frame.
DO NOT change the camera angle, the facing direction, the design, the colors or the weapon from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
DO NOT add anything that is not the character: no effects, no props, no ground, no text, no numbers, no frame labels, no grid lines.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Attente, face** (joindre la pose 1 de face)

```
The attached image shows our game hero in three-quarter front view, facing the viewer and the bottom-right corner of the image. Draw a sprite animation sheet of this exact character performing an idle breathing loop, clearly visible like the idle animation of a fighting game: same face, body, outfit, colors, weapon and proportions, every frame in three-quarter front view, facing the viewer and the bottom-right corner of the image, exactly like the attached image.
6 frames on a grid of 3 columns and 2 rows, read left to right, then top to bottom:
Frame 1, neutral: exactly the pose of the attached image.
Frame 2, breathing in: the chest swells, the shoulders and head rise, the hair and cloth start to lift.
Frame 3, top of the breath: the shoulders and head at their HIGHEST, the chest fully expanded, the weapon raised slightly with the body, the knees straight.
Frame 4, breathing out: the shoulders drop, the knees start to bend, the hair and cloth swing the other way.
Frame 5, bottom of the breath: the shoulders and head at their LOWEST, the knees slightly bent, the head dipped a little, the weapon lowered slightly.
Frame 6, rising again, halfway between frame 5 and frame 1.
Between frame 3 and frame 5, the top of the head moves down by about a quarter of the head height; the shoulders, hands, weapon, hair and cloth move with it. Put the moving parts at visibly different positions in each frame.
It is a seamless loop: frame 6 leads smoothly back to frame 1.
DO NOT draw the same pose twice: every frame must be clearly different from the frames next to it, even if the motion looks exaggerated.
DO NOT simply copy the attached image into every frame.
DO NOT change the camera angle, the facing direction, the design, the colors or the weapon from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
DO NOT add anything that is not the character: no effects, no props, no ground, no text, no numbers, no frame labels, no grid lines.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Course, face** (joindre la pose 2 de face)

```
The attached image shows our game hero in three-quarter front view, facing the viewer and the bottom-right corner of the image. Draw a sprite animation sheet of this exact character performing a running cycle on the spot: same face, body, outfit, colors, weapon and proportions, every frame in three-quarter front view, facing the viewer and the bottom-right corner of the image, exactly like the attached image.
8 frames on a grid of 4 columns and 2 rows, read left to right, then top to bottom:
Frame 1, contact: the right leg reaches forward and the heel touches the ground, the left leg stretched behind, the left arm forward.
Frame 2, down: the right leg bends under the weight, the body at its lowest.
Frame 3, passing: the left leg swings forward past the right leg, the body rising.
Frame 4, up: pushing off the right foot, the body at its highest, both feet almost off the ground.
Frame 5, contact: the left leg reaches forward and the heel touches the ground, the right leg stretched behind, the right arm forward.
Frame 6, down: the left leg bends under the weight, the body at its lowest.
Frame 7, passing: the right leg swings forward past the left leg, the body rising.
Frame 8, up: pushing off the left foot, the body at its highest, both feet almost off the ground.
The legs and arms are in a different position in every frame, the arms swinging opposite to the legs; the hair and cloth bounce with each step.
It is a seamless loop: frame 8 leads smoothly back to frame 1.
DO NOT draw the same pose twice: every frame must be clearly different from the frames next to it, even if the motion looks exaggerated.
DO NOT simply copy the attached image into every frame.
DO NOT change the camera angle, the facing direction, the design, the colors or the weapon from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
DO NOT add anything that is not the character: no effects, no props, no ground, no text, no numbers, no frame labels, no grid lines.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

## Guerrier

### Poses clés (joindre la fiche)

**Profil**

```
The attached image is our game hero. Draw an animation key-pose sheet of this exact character: same face, body, outfit, colors and weapon, nothing added or removed. Six poses on a grid of 3 columns and 2 rows (poses 1 to 3 on the top row, poses 4 to 6 on the bottom row, left to right), every figure in three-quarter view facing right:
1. idle: calm guard stance, weapon held low in both hands.
2. running: mid-stride, leaning forward, weapon held low at the side.
3. wind-up: weapon raised high above the head, body coiled.
4. strike: the end of a wide horizontal slash, weapon fully extended forward, front knee bent.
5. guard: weapon held upright in front of the body, braced, feet planted.
6. dash: a low fast lunge forward, body almost horizontal, weapon trailing behind.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each figure stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring figure: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All figures at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Face**

```
The attached image is our game hero. Draw an animation key-pose sheet of this exact character: same face, body, outfit, colors, proportions and weapon, nothing added or removed. Four poses on a grid of 2 columns and 2 rows (poses 1 and 2 on the top row, poses 3 and 4 on the bottom row, left to right), every figure in three-quarter FRONT view: the character faces the viewer and the bottom-right corner of the image, we see the face, the chest and the front of the outfit.
1. idle: calm guard stance, weapon held low in both hands.
2. running: mid-stride, leaning forward, weapon held low at the side.
3. wind-up: weapon raised high above the head, body coiled.
4. strike: the end of a wide horizontal slash, weapon fully extended forward, front knee bent.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each figure stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring figure: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All figures at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

### Animations

**Attaque, profil** (joindre la pose 1 de profil)

```
The attached image shows our game hero in three-quarter view facing right. Draw a sprite animation sheet of this exact character performing an attack: same face, body, outfit, colors, weapon and proportions, every frame in three-quarter view facing right, exactly like the attached image.
6 frames on a grid of 3 columns and 2 rows, read left to right, then top to bottom:
Frame 1, start: the pose of the attached image, the weight shifting back.
Frame 2, wind-up, halfway: the weapon rises from the guard stance to high above the head, the body coiling, halfway there.
Frame 3, wind-up at its peak: the weapon rises from the guard stance to high above the head, the body coiling, fully, the body coiled like a spring.
Frame 4, strike, the fastest moment: the weapon slashes down and across in a wide arc, ending extended forward, front knee bent, halfway there.
Frame 5, strike at full extension: the weapon slashes down and across in a wide arc, ending extended forward, front knee bent.
Frame 6, follow-through: the body recovers balance and starts to return toward the starting pose.
The weapon and the arms are at a clearly different place in every frame, following one continuous path.
It plays once, from frame 1 to the last frame.
DO NOT draw the same pose twice: every frame must be clearly different from the frames next to it, even if the motion looks exaggerated.
DO NOT simply copy the attached image into every frame.
DO NOT change the camera angle, the facing direction, the design, the colors or the weapon from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
DO NOT add anything that is not the character: no effects, no props, no ground, no text, no numbers, no frame labels, no grid lines.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Garde, profil** (joindre la pose 1 de profil)

```
The attached image shows our game hero in three-quarter view facing right. Draw a sprite animation sheet of this exact character performing going into a guard: same face, body, outfit, colors, weapon and proportions, every frame in three-quarter view facing right, exactly like the attached image.
4 frames on a grid of 2 columns and 2 rows, read left to right, then top to bottom:
Frame 1, start: the pose of the attached image.
Frame 2, starting to move: the character brings the weapon upright in front of the body into a braced guard, feet planted, one third of the way.
Frame 3, almost in guard, two thirds of the way.
Frame 4, full guard, braced and still: the character brings the weapon upright in front of the body into a braced guard, feet planted.
The weapon, the arms and the stance change a little more in every frame.
It plays once, from frame 1 to the last frame.
DO NOT draw the same pose twice: every frame must be clearly different from the frames next to it, even if the motion looks exaggerated.
DO NOT simply copy the attached image into every frame.
DO NOT change the camera angle, the facing direction, the design, the colors or the weapon from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
DO NOT add anything that is not the character: no effects, no props, no ground, no text, no numbers, no frame labels, no grid lines.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Esquive, profil** (joindre la pose 1 de profil)

```
The attached image shows our game hero in three-quarter view facing right. Draw a sprite animation sheet of this exact character performing a dodge: the character makes a low fast lunge forward, the body almost horizontal and the weapon trailing behind, then lands: same face, body, outfit, colors, weapon and proportions, every frame in three-quarter view facing right, exactly like the attached image.
6 frames on a grid of 3 columns and 2 rows, read left to right, then top to bottom:
Frame 1, anticipation: the character crouches slightly, loading the weight.
Frame 2, push-off: the dodge begins, the body launching.
Frame 3, mid-dodge: the body at full stretch, the fastest moment.
Frame 4, end of the movement: still in motion, about to land.
Frame 5, landing: the knees bend to absorb the impact.
Frame 6, recovery: back on balance, rising toward the starting pose.
The body is at a clearly different place and shape in every frame.
It plays once, from frame 1 to the last frame.
DO NOT draw the same pose twice: every frame must be clearly different from the frames next to it, even if the motion looks exaggerated.
DO NOT simply copy the attached image into every frame.
DO NOT change the camera angle, the facing direction, the design, the colors or the weapon from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
DO NOT add anything that is not the character: no effects, no props, no ground, no text, no numbers, no frame labels, no grid lines.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Attaque, face** (joindre la pose 1 de face)

```
The attached image shows our game hero in three-quarter front view, facing the viewer and the bottom-right corner of the image. Draw a sprite animation sheet of this exact character performing an attack: same face, body, outfit, colors, weapon and proportions, every frame in three-quarter front view, facing the viewer and the bottom-right corner of the image, exactly like the attached image.
6 frames on a grid of 3 columns and 2 rows, read left to right, then top to bottom:
Frame 1, start: the pose of the attached image, the weight shifting back.
Frame 2, wind-up, halfway: the weapon rises from the guard stance to high above the head, the body coiling, halfway there.
Frame 3, wind-up at its peak: the weapon rises from the guard stance to high above the head, the body coiling, fully, the body coiled like a spring.
Frame 4, strike, the fastest moment: the weapon slashes down and across in a wide arc, ending extended forward, front knee bent, halfway there.
Frame 5, strike at full extension: the weapon slashes down and across in a wide arc, ending extended forward, front knee bent.
Frame 6, follow-through: the body recovers balance and starts to return toward the starting pose.
The weapon and the arms are at a clearly different place in every frame, following one continuous path.
It plays once, from frame 1 to the last frame.
DO NOT draw the same pose twice: every frame must be clearly different from the frames next to it, even if the motion looks exaggerated.
DO NOT simply copy the attached image into every frame.
DO NOT change the camera angle, the facing direction, the design, the colors or the weapon from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
DO NOT add anything that is not the character: no effects, no props, no ground, no text, no numbers, no frame labels, no grid lines.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

## Invocateur

### Poses clés (joindre la fiche)

**Profil**

```
The attached image is our game hero. Draw an animation key-pose sheet of this exact character: same face, body, outfit, colors and staff, nothing added or removed. Six poses on a grid of 3 columns and 2 rows (poses 1 to 3 on the top row, poses 4 to 6 on the bottom row, left to right), every figure in three-quarter view facing right:
1. idle: standing calmly, staff held upright at the side.
2. running: mid-stride, sleeves and clothes streaming back, staff held diagonally.
3. wind-up: staff raised high overhead to cast a spell, the other hand open.
4. strike: staff thrust forward to release the spell, the other arm swept back.
5. guard: staff held horizontally in front of the body with both hands.
6. dash: a quick gliding step forward, leaning low, clothes flaring.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each figure stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring figure: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All figures at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Face**

```
The attached image is our game hero. Draw an animation key-pose sheet of this exact character: same face, body, outfit, colors, proportions and staff, nothing added or removed. Four poses on a grid of 2 columns and 2 rows (poses 1 and 2 on the top row, poses 3 and 4 on the bottom row, left to right), every figure in three-quarter FRONT view: the character faces the viewer and the bottom-right corner of the image, we see the face, the chest and the front of the outfit.
1. idle: standing calmly, staff held upright at the side.
2. running: mid-stride, sleeves and clothes streaming back, staff held diagonally.
3. wind-up: staff raised high overhead to cast a spell, the other hand open.
4. strike: staff thrust forward to release the spell, the other arm swept back.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each figure stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring figure: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All figures at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

### Animations

**Attaque, profil** (joindre la pose 1 de profil)

```
The attached image shows our game hero in three-quarter view facing right. Draw a sprite animation sheet of this exact character performing an attack: same face, body, outfit, colors, weapon and proportions, every frame in three-quarter view facing right, exactly like the attached image.
6 frames on a grid of 3 columns and 2 rows, read left to right, then top to bottom:
Frame 1, start: the pose of the attached image, the weight shifting back.
Frame 2, wind-up, halfway: the staff rises high overhead to cast a spell, the other hand open, halfway there.
Frame 3, wind-up at its peak: the staff rises high overhead to cast a spell, the other hand open, fully, the body coiled like a spring.
Frame 4, strike, the fastest moment: the staff thrusts forward to release the spell, the other arm swept back, no visible magic, halfway there.
Frame 5, strike at full extension: the staff thrusts forward to release the spell, the other arm swept back, no visible magic.
Frame 6, follow-through: the body recovers balance and starts to return toward the starting pose.
The weapon and the arms are at a clearly different place in every frame, following one continuous path.
It plays once, from frame 1 to the last frame.
DO NOT draw the same pose twice: every frame must be clearly different from the frames next to it, even if the motion looks exaggerated.
DO NOT simply copy the attached image into every frame.
DO NOT change the camera angle, the facing direction, the design, the colors or the weapon from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
DO NOT add anything that is not the character: no effects, no props, no ground, no text, no numbers, no frame labels, no grid lines.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Garde, profil** (joindre la pose 1 de profil)

```
The attached image shows our game hero in three-quarter view facing right. Draw a sprite animation sheet of this exact character performing going into a guard: same face, body, outfit, colors, weapon and proportions, every frame in three-quarter view facing right, exactly like the attached image.
4 frames on a grid of 2 columns and 2 rows, read left to right, then top to bottom:
Frame 1, start: the pose of the attached image.
Frame 2, starting to move: the character holds the staff horizontally in front of the body with both hands into a defensive guard, one third of the way.
Frame 3, almost in guard, two thirds of the way.
Frame 4, full guard, braced and still: the character holds the staff horizontally in front of the body with both hands into a defensive guard.
The weapon, the arms and the stance change a little more in every frame.
It plays once, from frame 1 to the last frame.
DO NOT draw the same pose twice: every frame must be clearly different from the frames next to it, even if the motion looks exaggerated.
DO NOT simply copy the attached image into every frame.
DO NOT change the camera angle, the facing direction, the design, the colors or the weapon from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
DO NOT add anything that is not the character: no effects, no props, no ground, no text, no numbers, no frame labels, no grid lines.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Esquive, profil** (joindre la pose 1 de profil)

```
The attached image shows our game hero in three-quarter view facing right. Draw a sprite animation sheet of this exact character performing a dodge: the character makes a quick gliding step forward, leaning low with the clothes flaring, then lands: same face, body, outfit, colors, weapon and proportions, every frame in three-quarter view facing right, exactly like the attached image.
6 frames on a grid of 3 columns and 2 rows, read left to right, then top to bottom:
Frame 1, anticipation: the character crouches slightly, loading the weight.
Frame 2, push-off: the dodge begins, the body launching.
Frame 3, mid-dodge: the body at full stretch, the fastest moment.
Frame 4, end of the movement: still in motion, about to land.
Frame 5, landing: the knees bend to absorb the impact.
Frame 6, recovery: back on balance, rising toward the starting pose.
The body is at a clearly different place and shape in every frame.
It plays once, from frame 1 to the last frame.
DO NOT draw the same pose twice: every frame must be clearly different from the frames next to it, even if the motion looks exaggerated.
DO NOT simply copy the attached image into every frame.
DO NOT change the camera angle, the facing direction, the design, the colors or the weapon from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
DO NOT add anything that is not the character: no effects, no props, no ground, no text, no numbers, no frame labels, no grid lines.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Attaque, face** (joindre la pose 1 de face)

```
The attached image shows our game hero in three-quarter front view, facing the viewer and the bottom-right corner of the image. Draw a sprite animation sheet of this exact character performing an attack: same face, body, outfit, colors, weapon and proportions, every frame in three-quarter front view, facing the viewer and the bottom-right corner of the image, exactly like the attached image.
6 frames on a grid of 3 columns and 2 rows, read left to right, then top to bottom:
Frame 1, start: the pose of the attached image, the weight shifting back.
Frame 2, wind-up, halfway: the staff rises high overhead to cast a spell, the other hand open, halfway there.
Frame 3, wind-up at its peak: the staff rises high overhead to cast a spell, the other hand open, fully, the body coiled like a spring.
Frame 4, strike, the fastest moment: the staff thrusts forward to release the spell, the other arm swept back, no visible magic, halfway there.
Frame 5, strike at full extension: the staff thrusts forward to release the spell, the other arm swept back, no visible magic.
Frame 6, follow-through: the body recovers balance and starts to return toward the starting pose.
The weapon and the arms are at a clearly different place in every frame, following one continuous path.
It plays once, from frame 1 to the last frame.
DO NOT draw the same pose twice: every frame must be clearly different from the frames next to it, even if the motion looks exaggerated.
DO NOT simply copy the attached image into every frame.
DO NOT change the camera angle, the facing direction, the design, the colors or the weapon from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
DO NOT add anything that is not the character: no effects, no props, no ground, no text, no numbers, no frame labels, no grid lines.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

## Lame

### Poses clés (joindre la fiche)

**Profil**

```
The attached image is our game hero. Draw an animation key-pose sheet of this exact character: same face, body, outfit, colors and twin blades, nothing added or removed. Six poses on a grid of 3 columns and 2 rows (poses 1 to 3 on the top row, poses 4 to 6 on the bottom row, left to right), every figure in three-quarter view facing right:
1. idle: low crouch, both blades held in a reverse grip.
2. running: a low sprint, leaning forward, blades held back along the forearms.
3. wind-up: both blades raised crossed above the head.
4. strike: the end of a wide slashing sweep, one arm extended forward, the other swept back.
5. guard: crouched, both blades crossed in front of the face.
6. dash: a low forward slide on one knee, one hand touching the ground.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each figure stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring figure: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All figures at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Face**

```
The attached image is our game hero. Draw an animation key-pose sheet of this exact character: same face, body, outfit, colors, proportions and twin blades, nothing added or removed. Four poses on a grid of 2 columns and 2 rows (poses 1 and 2 on the top row, poses 3 and 4 on the bottom row, left to right), every figure in three-quarter FRONT view: the character faces the viewer and the bottom-right corner of the image, we see the face, the chest and the front of the outfit.
1. idle: low crouch, both blades held in a reverse grip.
2. running: a low sprint, leaning forward, blades held back along the forearms.
3. wind-up: both blades raised crossed above the head.
4. strike: the end of a wide slashing sweep, one arm extended forward, the other swept back.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each figure stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring figure: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All figures at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

### Animations

**Attaque, profil** (joindre la pose 1 de profil)

```
The attached image shows our game hero in three-quarter view facing right. Draw a sprite animation sheet of this exact character performing an attack: same face, body, outfit, colors, weapon and proportions, every frame in three-quarter view facing right, exactly like the attached image.
6 frames on a grid of 3 columns and 2 rows, read left to right, then top to bottom:
Frame 1, start: the pose of the attached image, the weight shifting back.
Frame 2, wind-up, halfway: both blades rise and cross above the head, halfway there.
Frame 3, wind-up at its peak: both blades rise and cross above the head, fully, the body coiled like a spring.
Frame 4, strike, the fastest moment: the blades slash down and to the side in a wide sweep, ending with one arm extended forward, halfway there.
Frame 5, strike at full extension: the blades slash down and to the side in a wide sweep, ending with one arm extended forward.
Frame 6, follow-through: the body recovers balance and starts to return toward the starting pose.
The weapon and the arms are at a clearly different place in every frame, following one continuous path.
It plays once, from frame 1 to the last frame.
DO NOT draw the same pose twice: every frame must be clearly different from the frames next to it, even if the motion looks exaggerated.
DO NOT simply copy the attached image into every frame.
DO NOT change the camera angle, the facing direction, the design, the colors or the weapon from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
DO NOT add anything that is not the character: no effects, no props, no ground, no text, no numbers, no frame labels, no grid lines.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Garde, profil** (joindre la pose 1 de profil)

```
The attached image shows our game hero in three-quarter view facing right. Draw a sprite animation sheet of this exact character performing going into a guard: same face, body, outfit, colors, weapon and proportions, every frame in three-quarter view facing right, exactly like the attached image.
4 frames on a grid of 2 columns and 2 rows, read left to right, then top to bottom:
Frame 1, start: the pose of the attached image.
Frame 2, starting to move: the character crouches and crosses both blades in front of the face into a defensive guard, one third of the way.
Frame 3, almost in guard, two thirds of the way.
Frame 4, full guard, braced and still: the character crouches and crosses both blades in front of the face into a defensive guard.
The weapon, the arms and the stance change a little more in every frame.
It plays once, from frame 1 to the last frame.
DO NOT draw the same pose twice: every frame must be clearly different from the frames next to it, even if the motion looks exaggerated.
DO NOT simply copy the attached image into every frame.
DO NOT change the camera angle, the facing direction, the design, the colors or the weapon from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
DO NOT add anything that is not the character: no effects, no props, no ground, no text, no numbers, no frame labels, no grid lines.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Esquive, profil** (joindre la pose 1 de profil)

```
The attached image shows our game hero in three-quarter view facing right. Draw a sprite animation sheet of this exact character performing a dodge: the character drops low and slides forward on one knee, one hand touching the ground: same face, body, outfit, colors, weapon and proportions, every frame in three-quarter view facing right, exactly like the attached image.
6 frames on a grid of 3 columns and 2 rows, read left to right, then top to bottom:
Frame 1, anticipation: the character crouches slightly, loading the weight.
Frame 2, push-off: the dodge begins, the body launching.
Frame 3, mid-dodge: the body at full stretch, the fastest moment.
Frame 4, end of the movement: still in motion, about to land.
Frame 5, landing: the knees bend to absorb the impact.
Frame 6, recovery: back on balance, rising toward the starting pose.
The body is at a clearly different place and shape in every frame.
It plays once, from frame 1 to the last frame.
DO NOT draw the same pose twice: every frame must be clearly different from the frames next to it, even if the motion looks exaggerated.
DO NOT simply copy the attached image into every frame.
DO NOT change the camera angle, the facing direction, the design, the colors or the weapon from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
DO NOT add anything that is not the character: no effects, no props, no ground, no text, no numbers, no frame labels, no grid lines.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Attaque, face** (joindre la pose 1 de face)

```
The attached image shows our game hero in three-quarter front view, facing the viewer and the bottom-right corner of the image. Draw a sprite animation sheet of this exact character performing an attack: same face, body, outfit, colors, weapon and proportions, every frame in three-quarter front view, facing the viewer and the bottom-right corner of the image, exactly like the attached image.
6 frames on a grid of 3 columns and 2 rows, read left to right, then top to bottom:
Frame 1, start: the pose of the attached image, the weight shifting back.
Frame 2, wind-up, halfway: both blades rise and cross above the head, halfway there.
Frame 3, wind-up at its peak: both blades rise and cross above the head, fully, the body coiled like a spring.
Frame 4, strike, the fastest moment: the blades slash down and to the side in a wide sweep, ending with one arm extended forward, halfway there.
Frame 5, strike at full extension: the blades slash down and to the side in a wide sweep, ending with one arm extended forward.
Frame 6, follow-through: the body recovers balance and starts to return toward the starting pose.
The weapon and the arms are at a clearly different place in every frame, following one continuous path.
It plays once, from frame 1 to the last frame.
DO NOT draw the same pose twice: every frame must be clearly different from the frames next to it, even if the motion looks exaggerated.
DO NOT simply copy the attached image into every frame.
DO NOT change the camera angle, the facing direction, the design, the colors or the weapon from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
DO NOT add anything that is not the character: no effects, no props, no ground, no text, no numbers, no frame labels, no grid lines.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

## Paladin

### Poses clés (joindre la fiche)

**Profil**

```
The attached image is our game hero. Draw an animation key-pose sheet of this exact character: same face, body, outfit, colors and polearm and shield, nothing added or removed. Six poses on a grid of 3 columns and 2 rows (poses 1 to 3 on the top row, poses 4 to 6 on the bottom row, left to right), every figure in three-quarter view facing right:
1. idle: standing tall, polearm upright, shield at the side.
2. running: mid-stride, shield forward, polearm held diagonally behind.
3. wind-up: polearm drawn back over the shoulder, shield raised.
4. strike: a long lunging thrust, polearm fully extended forward.
5. guard: shield raised in front of the body, braced, polearm behind it.
6. dash: a shield charge forward, shoulder first, body low.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each figure stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring figure: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All figures at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Face**

```
The attached image is our game hero. Draw an animation key-pose sheet of this exact character: same face, body, outfit, colors, proportions and polearm and shield, nothing added or removed. Four poses on a grid of 2 columns and 2 rows (poses 1 and 2 on the top row, poses 3 and 4 on the bottom row, left to right), every figure in three-quarter FRONT view: the character faces the viewer and the bottom-right corner of the image, we see the face, the chest and the front of the outfit.
1. idle: standing tall, polearm upright, shield at the side.
2. running: mid-stride, shield forward, polearm held diagonally behind.
3. wind-up: polearm drawn back over the shoulder, shield raised.
4. strike: a long lunging thrust, polearm fully extended forward.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each figure stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring figure: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All figures at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

### Animations

**Attaque, profil** (joindre la pose 1 de profil)

```
The attached image shows our game hero in three-quarter view facing right. Draw a sprite animation sheet of this exact character performing an attack: same face, body, outfit, colors, weapon and proportions, every frame in three-quarter view facing right, exactly like the attached image.
6 frames on a grid of 3 columns and 2 rows, read left to right, then top to bottom:
Frame 1, start: the pose of the attached image, the weight shifting back.
Frame 2, wind-up, halfway: the polearm draws back over the shoulder while the shield rises, halfway there.
Frame 3, wind-up at its peak: the polearm draws back over the shoulder while the shield rises, fully, the body coiled like a spring.
Frame 4, strike, the fastest moment: a long lunging thrust, the polearm reaching full extension forward, halfway there.
Frame 5, strike at full extension: a long lunging thrust, the polearm reaching full extension forward.
Frame 6, follow-through: the body recovers balance and starts to return toward the starting pose.
The weapon and the arms are at a clearly different place in every frame, following one continuous path.
It plays once, from frame 1 to the last frame.
DO NOT draw the same pose twice: every frame must be clearly different from the frames next to it, even if the motion looks exaggerated.
DO NOT simply copy the attached image into every frame.
DO NOT change the camera angle, the facing direction, the design, the colors or the weapon from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
DO NOT add anything that is not the character: no effects, no props, no ground, no text, no numbers, no frame labels, no grid lines.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Garde, profil** (joindre la pose 1 de profil)

```
The attached image shows our game hero in three-quarter view facing right. Draw a sprite animation sheet of this exact character performing going into a guard: same face, body, outfit, colors, weapon and proportions, every frame in three-quarter view facing right, exactly like the attached image.
4 frames on a grid of 2 columns and 2 rows, read left to right, then top to bottom:
Frame 1, start: the pose of the attached image.
Frame 2, starting to move: the character raises the shield in front of the body and braces behind it, feet planted, the polearm held back, one third of the way.
Frame 3, almost in guard, two thirds of the way.
Frame 4, full guard, braced and still: the character raises the shield in front of the body and braces behind it, feet planted, the polearm held back.
The weapon, the arms and the stance change a little more in every frame.
It plays once, from frame 1 to the last frame.
DO NOT draw the same pose twice: every frame must be clearly different from the frames next to it, even if the motion looks exaggerated.
DO NOT simply copy the attached image into every frame.
DO NOT change the camera angle, the facing direction, the design, the colors or the weapon from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
DO NOT add anything that is not the character: no effects, no props, no ground, no text, no numbers, no frame labels, no grid lines.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Esquive, profil** (joindre la pose 1 de profil)

```
The attached image shows our game hero in three-quarter view facing right. Draw a sprite animation sheet of this exact character performing a dodge: the character charges forward shield first, shoulder low, then stops: same face, body, outfit, colors, weapon and proportions, every frame in three-quarter view facing right, exactly like the attached image.
6 frames on a grid of 3 columns and 2 rows, read left to right, then top to bottom:
Frame 1, anticipation: the character crouches slightly, loading the weight.
Frame 2, push-off: the dodge begins, the body launching.
Frame 3, mid-dodge: the body at full stretch, the fastest moment.
Frame 4, end of the movement: still in motion, about to land.
Frame 5, landing: the knees bend to absorb the impact.
Frame 6, recovery: back on balance, rising toward the starting pose.
The body is at a clearly different place and shape in every frame.
It plays once, from frame 1 to the last frame.
DO NOT draw the same pose twice: every frame must be clearly different from the frames next to it, even if the motion looks exaggerated.
DO NOT simply copy the attached image into every frame.
DO NOT change the camera angle, the facing direction, the design, the colors or the weapon from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
DO NOT add anything that is not the character: no effects, no props, no ground, no text, no numbers, no frame labels, no grid lines.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Attaque, face** (joindre la pose 1 de face)

```
The attached image shows our game hero in three-quarter front view, facing the viewer and the bottom-right corner of the image. Draw a sprite animation sheet of this exact character performing an attack: same face, body, outfit, colors, weapon and proportions, every frame in three-quarter front view, facing the viewer and the bottom-right corner of the image, exactly like the attached image.
6 frames on a grid of 3 columns and 2 rows, read left to right, then top to bottom:
Frame 1, start: the pose of the attached image, the weight shifting back.
Frame 2, wind-up, halfway: the polearm draws back over the shoulder while the shield rises, halfway there.
Frame 3, wind-up at its peak: the polearm draws back over the shoulder while the shield rises, fully, the body coiled like a spring.
Frame 4, strike, the fastest moment: a long lunging thrust, the polearm reaching full extension forward, halfway there.
Frame 5, strike at full extension: a long lunging thrust, the polearm reaching full extension forward.
Frame 6, follow-through: the body recovers balance and starts to return toward the starting pose.
The weapon and the arms are at a clearly different place in every frame, following one continuous path.
It plays once, from frame 1 to the last frame.
DO NOT draw the same pose twice: every frame must be clearly different from the frames next to it, even if the motion looks exaggerated.
DO NOT simply copy the attached image into every frame.
DO NOT change the camera angle, the facing direction, the design, the colors or the weapon from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
DO NOT add anything that is not the character: no effects, no props, no ground, no text, no numbers, no frame labels, no grid lines.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

## Rôdeur

### Poses clés (joindre la fiche)

**Profil**

```
The attached image is our game hero. Draw an animation key-pose sheet of this exact character: same face, body, outfit, colors and bow and quiver, nothing added or removed. Six poses on a grid of 3 columns and 2 rows (poses 1 to 3 on the top row, poses 4 to 6 on the bottom row, left to right), every figure in three-quarter view facing right:
1. idle: alert stance, bow held low in one hand.
2. running: a swift stalking run, bow held low.
3. wind-up: arrow nocked, bowstring drawn back to the cheek.
4. strike: the arrow just released, bowstring snapped forward, bow arm extended.
5. guard: crouched, bow held across the body.
6. dash: an agile leap backward, knees tucked, bow in hand.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each figure stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring figure: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All figures at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Face**

```
The attached image is our game hero. Draw an animation key-pose sheet of this exact character: same face, body, outfit, colors, proportions and bow and quiver, nothing added or removed. Four poses on a grid of 2 columns and 2 rows (poses 1 and 2 on the top row, poses 3 and 4 on the bottom row, left to right), every figure in three-quarter FRONT view: the character faces the viewer and the bottom-right corner of the image, we see the face, the chest and the front of the outfit.
1. idle: alert stance, bow held low in one hand.
2. running: a swift stalking run, bow held low.
3. wind-up: arrow nocked, bowstring drawn back to the cheek.
4. strike: the arrow just released, bowstring snapped forward, bow arm extended.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each figure stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring figure: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All figures at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

### Animations

**Attaque, profil** (joindre la pose 1 de profil)

```
The attached image shows our game hero in three-quarter view facing right. Draw a sprite animation sheet of this exact character performing an attack: same face, body, outfit, colors, weapon and proportions, every frame in three-quarter view facing right, exactly like the attached image.
6 frames on a grid of 3 columns and 2 rows, read left to right, then top to bottom:
Frame 1, start: the pose of the attached image, the weight shifting back.
Frame 2, wind-up, halfway: an arrow is nocked and the bowstring drawn back to the cheek, halfway there.
Frame 3, wind-up at its peak: an arrow is nocked and the bowstring drawn back to the cheek, fully, the body coiled like a spring.
Frame 4, strike, the fastest moment: the arrow is released and the bowstring snaps forward, the bow arm staying extended, no arrow in flight, halfway there.
Frame 5, strike at full extension: the arrow is released and the bowstring snaps forward, the bow arm staying extended, no arrow in flight.
Frame 6, follow-through: the body recovers balance and starts to return toward the starting pose.
The weapon and the arms are at a clearly different place in every frame, following one continuous path.
It plays once, from frame 1 to the last frame.
DO NOT draw the same pose twice: every frame must be clearly different from the frames next to it, even if the motion looks exaggerated.
DO NOT simply copy the attached image into every frame.
DO NOT change the camera angle, the facing direction, the design, the colors or the weapon from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
DO NOT add anything that is not the character: no effects, no props, no ground, no text, no numbers, no frame labels, no grid lines.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Garde, profil** (joindre la pose 1 de profil)

```
The attached image shows our game hero in three-quarter view facing right. Draw a sprite animation sheet of this exact character performing going into a guard: same face, body, outfit, colors, weapon and proportions, every frame in three-quarter view facing right, exactly like the attached image.
4 frames on a grid of 2 columns and 2 rows, read left to right, then top to bottom:
Frame 1, start: the pose of the attached image.
Frame 2, starting to move: the character crouches and holds the bow across the body into a defensive guard, one third of the way.
Frame 3, almost in guard, two thirds of the way.
Frame 4, full guard, braced and still: the character crouches and holds the bow across the body into a defensive guard.
The weapon, the arms and the stance change a little more in every frame.
It plays once, from frame 1 to the last frame.
DO NOT draw the same pose twice: every frame must be clearly different from the frames next to it, even if the motion looks exaggerated.
DO NOT simply copy the attached image into every frame.
DO NOT change the camera angle, the facing direction, the design, the colors or the weapon from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
DO NOT add anything that is not the character: no effects, no props, no ground, no text, no numbers, no frame labels, no grid lines.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Esquive, profil** (joindre la pose 1 de profil)

```
The attached image shows our game hero in three-quarter view facing right. Draw a sprite animation sheet of this exact character performing a dodge: the character makes an agile leap backward, knees tucked, bow in hand, then lands: same face, body, outfit, colors, weapon and proportions, every frame in three-quarter view facing right, exactly like the attached image.
6 frames on a grid of 3 columns and 2 rows, read left to right, then top to bottom:
Frame 1, anticipation: the character crouches slightly, loading the weight.
Frame 2, push-off: the dodge begins, the body launching.
Frame 3, mid-dodge: the body at full stretch, the fastest moment.
Frame 4, end of the movement: still in motion, about to land.
Frame 5, landing: the knees bend to absorb the impact.
Frame 6, recovery: back on balance, rising toward the starting pose.
The body is at a clearly different place and shape in every frame.
It plays once, from frame 1 to the last frame.
DO NOT draw the same pose twice: every frame must be clearly different from the frames next to it, even if the motion looks exaggerated.
DO NOT simply copy the attached image into every frame.
DO NOT change the camera angle, the facing direction, the design, the colors or the weapon from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
DO NOT add anything that is not the character: no effects, no props, no ground, no text, no numbers, no frame labels, no grid lines.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Attaque, face** (joindre la pose 1 de face)

```
The attached image shows our game hero in three-quarter front view, facing the viewer and the bottom-right corner of the image. Draw a sprite animation sheet of this exact character performing an attack: same face, body, outfit, colors, weapon and proportions, every frame in three-quarter front view, facing the viewer and the bottom-right corner of the image, exactly like the attached image.
6 frames on a grid of 3 columns and 2 rows, read left to right, then top to bottom:
Frame 1, start: the pose of the attached image, the weight shifting back.
Frame 2, wind-up, halfway: an arrow is nocked and the bowstring drawn back to the cheek, halfway there.
Frame 3, wind-up at its peak: an arrow is nocked and the bowstring drawn back to the cheek, fully, the body coiled like a spring.
Frame 4, strike, the fastest moment: the arrow is released and the bowstring snaps forward, the bow arm staying extended, no arrow in flight, halfway there.
Frame 5, strike at full extension: the arrow is released and the bowstring snaps forward, the bow arm staying extended, no arrow in flight.
Frame 6, follow-through: the body recovers balance and starts to return toward the starting pose.
The weapon and the arms are at a clearly different place in every frame, following one continuous path.
It plays once, from frame 1 to the last frame.
DO NOT draw the same pose twice: every frame must be clearly different from the frames next to it, even if the motion looks exaggerated.
DO NOT simply copy the attached image into every frame.
DO NOT change the camera angle, the facing direction, the design, the colors or the weapon from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
DO NOT add anything that is not the character: no effects, no props, no ground, no text, no numbers, no frame labels, no grid lines.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

## Outils

- **`npm run kit-heros` :** prépare les dossiers des 20 héros (`npm run kit-heros -- <race>-<classe>` pour un seul). Il découpe les planches de poses clés déposées (`profil.jpg`, `face.jpg`) et ne touche jamais aux planches d'animation déposées (`planche.jpg`). Si les poses sont dans un autre ordre, `poses.json` dit laquelle joindre, par exemple `{ "profil": { "course": 3 } }`.
- **`npm run poses -- <planche>` :** découpe une planche isolée dans `poses/<planche>/` ; `--grille 3x2` force le nombre de colonnes et de lignes si la détection se trompe.
- **`npm run doc-heros` :** réécrit ce fichier depuis `tools/prompts-heros.mjs`.
- **`npm run planches` :** monte les planches d'animation de profil déposées (`profil/<animation>/planche.jpg`) en planche de jeu `anim/heros-<race>-<classe>`, dès que le héros a sa course (`npm run planches -- heros-<race>-<classe>` pour un seul). Sans attente, le héros se tient immobile dans sa pose de repos ; sans garde ni esquive, le jeu prend l'attente et la course.
- **À écrire :** l'affichage de la vue de face selon la direction du déplacement.
