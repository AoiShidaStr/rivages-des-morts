# Prompts des héros (Nano Banana 2)

Chaque prompt se colle tel quel dans Gemini, avec une seule image jointe. L'image donne la race, la classe, la tenue et l'arme : le même prompt sert aux quatre races d'une classe. Les vues de profil et de face sont prévues, la vue de dos viendra plus tard.

1. **Poses clés :** joindre la fiche du héros, coller le prompt « Profil » de sa classe, puis le prompt « Face ».
2. **Animations :** joindre une pose découpée dans ces planches, coller le prompt de l'animation. Nano Banana dessine toute l'animation en une planche.

`npm run kit-heros` range tout cela dans `~/Pictures/game visual/heros/<race>-<classe>/` : la fiche, les planches de poses clés déposées, et pour chaque animation la pose déjà découpée (`pose.png`) avec son prompt. Les prompts viennent de `tools/prompts-heros.mjs`.

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

- une pose ou une image ratée : `Redraw only pose 4, keep everything else identical.`
- des figures qui se chevauchent : `Some figures overlap. Redraw the same sheet with more space: every figure, weapon included, must stay inside its own cell with empty grey background all around it, even if the figures get smaller.`

## Toutes les classes : attente et course

**Attente, profil** (joindre la pose 1 de profil)

```
The attached image shows our game hero in three-quarter view facing right. Draw a sprite animation sheet of this exact character: same face, body, outfit, colors, weapon and proportions, nothing added or removed, every frame in three-quarter view facing right, exactly like the attached image.
The animation: a calm idle breathing loop: the chest slowly rises and falls, the clothes and hair sway gently, a slight shift of weight, the weapon held as in the attached image.
6 frames on a grid of 3 columns and 2 rows, read left to right, then top to bottom. Consecutive frames change only a little, like the in-between frames of a hand-drawn animation, so the motion is smooth when played at 10 frames per second. The last frame leads smoothly back to the first: it is a seamless loop.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Course, profil** (joindre la pose 2 de profil)

```
The attached image shows our game hero in three-quarter view facing right. Draw a sprite animation sheet of this exact character: same face, body, outfit, colors, weapon and proportions, nothing added or removed, every frame in three-quarter view facing right, exactly like the attached image.
The animation: a full running cycle on the spot: for each leg the contact, down, passing and up positions, the arms swinging opposite to the legs, the clothes bouncing.
8 frames on a grid of 4 columns and 2 rows, read left to right, then top to bottom. Consecutive frames change only a little, like the in-between frames of a hand-drawn animation, so the motion is smooth when played at 10 frames per second. The last frame leads smoothly back to the first: it is a seamless loop.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Attente, face** (joindre la pose 1 de face)

```
The attached image shows our game hero in three-quarter front view, facing the viewer and the bottom-right corner of the image. Draw a sprite animation sheet of this exact character: same face, body, outfit, colors, weapon and proportions, nothing added or removed, every frame in three-quarter front view, facing the viewer and the bottom-right corner of the image, exactly like the attached image.
The animation: a calm idle breathing loop: the chest slowly rises and falls, the clothes and hair sway gently, a slight shift of weight, the weapon held as in the attached image.
6 frames on a grid of 3 columns and 2 rows, read left to right, then top to bottom. Consecutive frames change only a little, like the in-between frames of a hand-drawn animation, so the motion is smooth when played at 10 frames per second. The last frame leads smoothly back to the first: it is a seamless loop.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Course, face** (joindre la pose 2 de face)

```
The attached image shows our game hero in three-quarter front view, facing the viewer and the bottom-right corner of the image. Draw a sprite animation sheet of this exact character: same face, body, outfit, colors, weapon and proportions, nothing added or removed, every frame in three-quarter front view, facing the viewer and the bottom-right corner of the image, exactly like the attached image.
The animation: a full running cycle on the spot: for each leg the contact, down, passing and up positions, the arms swinging opposite to the legs, the clothes bouncing.
8 frames on a grid of 4 columns and 2 rows, read left to right, then top to bottom. Consecutive frames change only a little, like the in-between frames of a hand-drawn animation, so the motion is smooth when played at 10 frames per second. The last frame leads smoothly back to the first: it is a seamless loop.
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
The attached image shows our game hero in three-quarter view facing right. Draw a sprite animation sheet of this exact character: same face, body, outfit, colors, weapon and proportions, nothing added or removed, every frame in three-quarter view facing right, exactly like the attached image.
The animation: an attack. Frames 1 to 3, the wind-up: the weapon rises from the guard stance to high above the head, the body coiling. Frames 4 to 6, the strike: the weapon slashes down and across in a wide arc, ending extended forward, front knee bent.
6 frames on a grid of 3 columns and 2 rows, read left to right, then top to bottom. Consecutive frames change only a little, like the in-between frames of a hand-drawn animation, so the motion is smooth when played at 10 frames per second.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Garde, profil** (joindre la pose 1 de profil)

```
The attached image shows our game hero in three-quarter view facing right. Draw a sprite animation sheet of this exact character: same face, body, outfit, colors, weapon and proportions, nothing added or removed, every frame in three-quarter view facing right, exactly like the attached image.
The animation: going from the idle stance of the attached image into a guard: the character brings the weapon upright in front of the body into a braced guard, feet planted.
4 frames on a grid of 2 columns and 2 rows, read left to right, then top to bottom. Consecutive frames change only a little, like the in-between frames of a hand-drawn animation, so the motion is smooth when played at 10 frames per second.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Esquive, profil** (joindre la pose 1 de profil)

```
The attached image shows our game hero in three-quarter view facing right. Draw a sprite animation sheet of this exact character: same face, body, outfit, colors, weapon and proportions, nothing added or removed, every frame in three-quarter view facing right, exactly like the attached image.
The animation: a dodge: the character makes a low fast lunge forward, the body almost horizontal and the weapon trailing behind, then lands.
6 frames on a grid of 3 columns and 2 rows, read left to right, then top to bottom. Consecutive frames change only a little, like the in-between frames of a hand-drawn animation, so the motion is smooth when played at 10 frames per second.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Attaque, face** (joindre la pose 1 de face)

```
The attached image shows our game hero in three-quarter front view, facing the viewer and the bottom-right corner of the image. Draw a sprite animation sheet of this exact character: same face, body, outfit, colors, weapon and proportions, nothing added or removed, every frame in three-quarter front view, facing the viewer and the bottom-right corner of the image, exactly like the attached image.
The animation: an attack. Frames 1 to 3, the wind-up: the weapon rises from the guard stance to high above the head, the body coiling. Frames 4 to 6, the strike: the weapon slashes down and across in a wide arc, ending extended forward, front knee bent.
6 frames on a grid of 3 columns and 2 rows, read left to right, then top to bottom. Consecutive frames change only a little, like the in-between frames of a hand-drawn animation, so the motion is smooth when played at 10 frames per second.
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
The attached image shows our game hero in three-quarter view facing right. Draw a sprite animation sheet of this exact character: same face, body, outfit, colors, weapon and proportions, nothing added or removed, every frame in three-quarter view facing right, exactly like the attached image.
The animation: an attack. Frames 1 to 3, the wind-up: the staff rises high overhead to cast a spell, the other hand open. Frames 4 to 6, the strike: the staff thrusts forward to release the spell, the other arm swept back, no visible magic.
6 frames on a grid of 3 columns and 2 rows, read left to right, then top to bottom. Consecutive frames change only a little, like the in-between frames of a hand-drawn animation, so the motion is smooth when played at 10 frames per second.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Garde, profil** (joindre la pose 1 de profil)

```
The attached image shows our game hero in three-quarter view facing right. Draw a sprite animation sheet of this exact character: same face, body, outfit, colors, weapon and proportions, nothing added or removed, every frame in three-quarter view facing right, exactly like the attached image.
The animation: going from the idle stance of the attached image into a guard: the character holds the staff horizontally in front of the body with both hands into a defensive guard.
4 frames on a grid of 2 columns and 2 rows, read left to right, then top to bottom. Consecutive frames change only a little, like the in-between frames of a hand-drawn animation, so the motion is smooth when played at 10 frames per second.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Esquive, profil** (joindre la pose 1 de profil)

```
The attached image shows our game hero in three-quarter view facing right. Draw a sprite animation sheet of this exact character: same face, body, outfit, colors, weapon and proportions, nothing added or removed, every frame in three-quarter view facing right, exactly like the attached image.
The animation: a dodge: the character makes a quick gliding step forward, leaning low with the clothes flaring, then lands.
6 frames on a grid of 3 columns and 2 rows, read left to right, then top to bottom. Consecutive frames change only a little, like the in-between frames of a hand-drawn animation, so the motion is smooth when played at 10 frames per second.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Attaque, face** (joindre la pose 1 de face)

```
The attached image shows our game hero in three-quarter front view, facing the viewer and the bottom-right corner of the image. Draw a sprite animation sheet of this exact character: same face, body, outfit, colors, weapon and proportions, nothing added or removed, every frame in three-quarter front view, facing the viewer and the bottom-right corner of the image, exactly like the attached image.
The animation: an attack. Frames 1 to 3, the wind-up: the staff rises high overhead to cast a spell, the other hand open. Frames 4 to 6, the strike: the staff thrusts forward to release the spell, the other arm swept back, no visible magic.
6 frames on a grid of 3 columns and 2 rows, read left to right, then top to bottom. Consecutive frames change only a little, like the in-between frames of a hand-drawn animation, so the motion is smooth when played at 10 frames per second.
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
The attached image shows our game hero in three-quarter view facing right. Draw a sprite animation sheet of this exact character: same face, body, outfit, colors, weapon and proportions, nothing added or removed, every frame in three-quarter view facing right, exactly like the attached image.
The animation: an attack. Frames 1 to 3, the wind-up: both blades rise and cross above the head. Frames 4 to 6, the strike: the blades slash down and to the side in a wide sweep, ending with one arm extended forward.
6 frames on a grid of 3 columns and 2 rows, read left to right, then top to bottom. Consecutive frames change only a little, like the in-between frames of a hand-drawn animation, so the motion is smooth when played at 10 frames per second.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Garde, profil** (joindre la pose 1 de profil)

```
The attached image shows our game hero in three-quarter view facing right. Draw a sprite animation sheet of this exact character: same face, body, outfit, colors, weapon and proportions, nothing added or removed, every frame in three-quarter view facing right, exactly like the attached image.
The animation: going from the idle stance of the attached image into a guard: the character crouches and crosses both blades in front of the face into a defensive guard.
4 frames on a grid of 2 columns and 2 rows, read left to right, then top to bottom. Consecutive frames change only a little, like the in-between frames of a hand-drawn animation, so the motion is smooth when played at 10 frames per second.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Esquive, profil** (joindre la pose 1 de profil)

```
The attached image shows our game hero in three-quarter view facing right. Draw a sprite animation sheet of this exact character: same face, body, outfit, colors, weapon and proportions, nothing added or removed, every frame in three-quarter view facing right, exactly like the attached image.
The animation: a dodge: the character drops low and slides forward on one knee, one hand touching the ground.
6 frames on a grid of 3 columns and 2 rows, read left to right, then top to bottom. Consecutive frames change only a little, like the in-between frames of a hand-drawn animation, so the motion is smooth when played at 10 frames per second.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Attaque, face** (joindre la pose 1 de face)

```
The attached image shows our game hero in three-quarter front view, facing the viewer and the bottom-right corner of the image. Draw a sprite animation sheet of this exact character: same face, body, outfit, colors, weapon and proportions, nothing added or removed, every frame in three-quarter front view, facing the viewer and the bottom-right corner of the image, exactly like the attached image.
The animation: an attack. Frames 1 to 3, the wind-up: both blades rise and cross above the head. Frames 4 to 6, the strike: the blades slash down and to the side in a wide sweep, ending with one arm extended forward.
6 frames on a grid of 3 columns and 2 rows, read left to right, then top to bottom. Consecutive frames change only a little, like the in-between frames of a hand-drawn animation, so the motion is smooth when played at 10 frames per second.
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
The attached image shows our game hero in three-quarter view facing right. Draw a sprite animation sheet of this exact character: same face, body, outfit, colors, weapon and proportions, nothing added or removed, every frame in three-quarter view facing right, exactly like the attached image.
The animation: an attack. Frames 1 to 3, the wind-up: the polearm draws back over the shoulder while the shield rises. Frames 4 to 6, the strike: a long lunging thrust, the polearm reaching full extension forward.
6 frames on a grid of 3 columns and 2 rows, read left to right, then top to bottom. Consecutive frames change only a little, like the in-between frames of a hand-drawn animation, so the motion is smooth when played at 10 frames per second.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Garde, profil** (joindre la pose 1 de profil)

```
The attached image shows our game hero in three-quarter view facing right. Draw a sprite animation sheet of this exact character: same face, body, outfit, colors, weapon and proportions, nothing added or removed, every frame in three-quarter view facing right, exactly like the attached image.
The animation: going from the idle stance of the attached image into a guard: the character raises the shield in front of the body and braces behind it, feet planted, the polearm held back.
4 frames on a grid of 2 columns and 2 rows, read left to right, then top to bottom. Consecutive frames change only a little, like the in-between frames of a hand-drawn animation, so the motion is smooth when played at 10 frames per second.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Esquive, profil** (joindre la pose 1 de profil)

```
The attached image shows our game hero in three-quarter view facing right. Draw a sprite animation sheet of this exact character: same face, body, outfit, colors, weapon and proportions, nothing added or removed, every frame in three-quarter view facing right, exactly like the attached image.
The animation: a dodge: the character charges forward shield first, shoulder low, then stops.
6 frames on a grid of 3 columns and 2 rows, read left to right, then top to bottom. Consecutive frames change only a little, like the in-between frames of a hand-drawn animation, so the motion is smooth when played at 10 frames per second.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Attaque, face** (joindre la pose 1 de face)

```
The attached image shows our game hero in three-quarter front view, facing the viewer and the bottom-right corner of the image. Draw a sprite animation sheet of this exact character: same face, body, outfit, colors, weapon and proportions, nothing added or removed, every frame in three-quarter front view, facing the viewer and the bottom-right corner of the image, exactly like the attached image.
The animation: an attack. Frames 1 to 3, the wind-up: the polearm draws back over the shoulder while the shield rises. Frames 4 to 6, the strike: a long lunging thrust, the polearm reaching full extension forward.
6 frames on a grid of 3 columns and 2 rows, read left to right, then top to bottom. Consecutive frames change only a little, like the in-between frames of a hand-drawn animation, so the motion is smooth when played at 10 frames per second.
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
The attached image shows our game hero in three-quarter view facing right. Draw a sprite animation sheet of this exact character: same face, body, outfit, colors, weapon and proportions, nothing added or removed, every frame in three-quarter view facing right, exactly like the attached image.
The animation: an attack. Frames 1 to 3, the wind-up: an arrow is nocked and the bowstring drawn back to the cheek. Frames 4 to 6, the strike: the arrow is released and the bowstring snaps forward, the bow arm staying extended, no arrow in flight.
6 frames on a grid of 3 columns and 2 rows, read left to right, then top to bottom. Consecutive frames change only a little, like the in-between frames of a hand-drawn animation, so the motion is smooth when played at 10 frames per second.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Garde, profil** (joindre la pose 1 de profil)

```
The attached image shows our game hero in three-quarter view facing right. Draw a sprite animation sheet of this exact character: same face, body, outfit, colors, weapon and proportions, nothing added or removed, every frame in three-quarter view facing right, exactly like the attached image.
The animation: going from the idle stance of the attached image into a guard: the character crouches and holds the bow across the body into a defensive guard.
4 frames on a grid of 2 columns and 2 rows, read left to right, then top to bottom. Consecutive frames change only a little, like the in-between frames of a hand-drawn animation, so the motion is smooth when played at 10 frames per second.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Esquive, profil** (joindre la pose 1 de profil)

```
The attached image shows our game hero in three-quarter view facing right. Draw a sprite animation sheet of this exact character: same face, body, outfit, colors, weapon and proportions, nothing added or removed, every frame in three-quarter view facing right, exactly like the attached image.
The animation: a dodge: the character makes an agile leap backward, knees tucked, bow in hand, then lands.
6 frames on a grid of 3 columns and 2 rows, read left to right, then top to bottom. Consecutive frames change only a little, like the in-between frames of a hand-drawn animation, so the motion is smooth when played at 10 frames per second.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

**Attaque, face** (joindre la pose 1 de face)

```
The attached image shows our game hero in three-quarter front view, facing the viewer and the bottom-right corner of the image. Draw a sprite animation sheet of this exact character: same face, body, outfit, colors, weapon and proportions, nothing added or removed, every frame in three-quarter front view, facing the viewer and the bottom-right corner of the image, exactly like the attached image.
The animation: an attack. Frames 1 to 3, the wind-up: an arrow is nocked and the bowstring drawn back to the cheek. Frames 4 to 6, the strike: the arrow is released and the bowstring snaps forward, the bow arm staying extended, no arrow in flight.
6 frames on a grid of 3 columns and 2 rows, read left to right, then top to bottom. Consecutive frames change only a little, like the in-between frames of a hand-drawn animation, so the motion is smooth when played at 10 frames per second.
2D hand-painted game sprite art in the exact style of the attached image: clean dark outlines, soft cel shading, rich but slightly muted colors, seen slightly from above. Flat uniform light grey background, no ground, no ground shadow, no text, no numbers, no labels, no drawn borders, no painted effects (no magic, no motion trails, no smoke, no sparks, no glow, no speed lines). Each frame stands alone in its own invisible cell of the grid: the whole figure, weapon, cape and hair included, stays inside its cell with a wide empty margin of grey background on every side. Nothing overlaps or touches a neighbouring frame: no weapon, cape or limb crosses into another cell; draw the figures smaller rather than let them overlap. No grid lines drawn. All frames at the same scale as each other, feet on the same invisible baseline on each row. Landscape 16:9, highest resolution.
```

## Outils

- **`npm run kit-heros` :** prépare les dossiers des 20 héros (`npm run kit-heros -- <race>-<classe>` pour un seul). Il découpe les planches de poses clés déposées (`profil.jpg`, `face.jpg`) et ne touche jamais aux planches d'animation déposées (`planche.jpg`). Si les poses sont dans un autre ordre, `poses.json` dit laquelle joindre, par exemple `{ "profil": { "course": 3 } }`.
- **`npm run poses -- <planche>` :** découpe une planche isolée dans `poses/<planche>/` ; `--grille 3x2` force le nombre de colonnes et de lignes si la détection se trompe.
- **À écrire :** le montage des planches d'animation en planches de jeu, et l'affichage de la vue de face selon la direction du déplacement.
