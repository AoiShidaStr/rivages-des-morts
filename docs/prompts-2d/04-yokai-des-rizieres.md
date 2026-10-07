# Lot 4 : yokai des Rizières (déjà peints, à refaire pour l'harmonie)

Ces ennemis ont déjà des planches peintes dans le jeu. À refaire en dernier, pour que tout le bestiaire ait le même rendu que les nouveaux.

**Format de toutes les planches : image carrée 1 024 × 1 024 px, 16 images en grille 4 × 4 (cases de 256 px)**, fond gris uni (magenta pour l'Oublié). **Aide de style (facultatif) :** joindre aussi une image de référence déjà réussie et ajouter au début du prompt : « Match the painting style of the second attached image. »

## Hitodama

### Hitodama — fiche profil

**Générer 2 ou 3 variantes** et garder la meilleure. **Enregistrer :** `2d/hitodama/fiche-profil.png`

```text
Character reference sheet for a 2D action RPG in which dead souls from every mythology fight across an archipelago of collapsed afterlives. One single character, shown once, full body, in three-quarter side view facing right. The character is a Hitodama (will-o-the-wisp): a small floating flame spirit shaped like a teardrop with a curling tail, a cold cyan-white body with a paler core, a simple dark face with two small eyes and a small mouth; it hovers above the ground. Drawn as a solid flat painted shape with a thin outline, not a glowing light. Neutral calm idle stance.
Follow the natural shape of this creature, drawn in the same semi-realistic painted style as the heroes. A strong readable silhouette from far away; the character is drawn filling the full image height of its figure, with a clean outline.
The figure is large, about 85% of the image height, centered, with a wide empty margin around it.
Portrait 3:4 image at the highest resolution available.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Hitodama — profil — Attente

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/hitodama/profil-idle.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is a Hitodama (will-o-the-wisp): a small floating flame spirit shaped like a teardrop with a curling tail, a cold cyan-white body with a paler core, a simple dark face with two small eyes and a small mouth; it hovers above the ground. Drawn as a solid flat painted shape with a thin outline, not a glowing light. Draw a 2D sprite animation sheet of this exact character performing a slow idle loop: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 2: the neutral pose of the reference figure, then it starts to breathe: hovering and bobbing gently, the tail curling slowly, the body breathing in size.
Frames 3 to 4: breathing in: the body swells and rises slightly.
Frames 5 to 6: top of the breath: the body at its highest, secondary parts (hair, cloth, limbs, tail) lifted.
Frames 7 to 8: a tiny pause, then breathing out begins.
Frames 9 to 10: breathing out: the body sinks, the secondary parts sway the other way.
Frames 11 to 12: bottom of the breath: the body at its lowest, the weight shifted.
Frames 13 to 14: the weight shifts back, the head or gaze moves a little, everything settles.
Frames 15 to 16: rising smoothly back toward frame 1; frame 16 is almost identical to frame 1.
The motion is subtle but clearly visible over the loop.
It is a seamless loop: frame 16 leads smoothly back to frame 1.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Hitodama — profil — Déplacement

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/hitodama/profil-move.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is a Hitodama (will-o-the-wisp): a small floating flame spirit shaped like a teardrop with a curling tail, a cold cyan-white body with a paler core, a simple dark face with two small eyes and a small mouth; it hovers above the ground. Drawn as a solid flat painted shape with a thin outline, not a glowing light. Draw a 2D sprite animation sheet of this exact character performing a locomotion cycle on the spot: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 4: locomotion cycle, first beat: darting forward in short floating surges, the tail streaming behind, the body stretching then squashing; the body at its lowest position.
Frames 5 to 8: second beat: the body rising, the limbs or parts passing each other.
Frames 9 to 12: third beat: the mirror of the first beat (the opposite side or phase), the body at its lowest.
Frames 13 to 16: fourth beat: the body rising again, leading back to the start of the cycle.
The character stays in place (no travelling across the cell).
It is a seamless loop: frame 16 leads smoothly back to frame 1.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Hitodama — profil — Anticipation

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/hitodama/profil-windup.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is a Hitodama (will-o-the-wisp): a small floating flame spirit shaped like a teardrop with a curling tail, a cold cyan-white body with a paler core, a simple dark face with two small eyes and a small mouth; it hovers above the ground. Drawn as a solid flat painted shape with a thin outline, not a glowing light. Draw a 2D sprite animation sheet of this exact character performing the wind-up that telegraphs an attack: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 4: from the idle pose, the body starts to build tension: shrinks and draws back, the tail coiling tight, the face angry, first third of the movement.
Frames 5 to 10: shrinks and draws back, the tail coiling tight, the face angry, growing more and more tense.
Frames 11 to 14: maximum tension: the pose fully reached, the body trembling slightly, the eyes or head fixed on the target.
Frames 15 to 16: frozen at maximum tension; frames 15 and 16 are nearly identical.
The body moves a little more in every frame toward the final tense pose.
It plays once, from frame 1 to frame 16.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Hitodama — profil — Attaque

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/hitodama/profil-attack.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is a Hitodama (will-o-the-wisp): a small floating flame spirit shaped like a teardrop with a curling tail, a cold cyan-white body with a paler core, a simple dark face with two small eyes and a small mouth; it hovers above the ground. Drawn as a solid flat painted shape with a thin outline, not a glowing light. Draw a 2D sprite animation sheet of this exact character performing a single attack: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 2: starts from the pose of maximum tension.
Frames 3 to 5: the strike launches, very fast, the body at a clearly different place in every frame: lunges forward stretched long and thin, the tail trailing, the mouth open, on its way.
Frame 6: IMPACT, the key frame of the attack: lunges forward stretched long and thin, the tail trailing, the mouth open, at full extension.
Frames 7 to 10: follow-through: the momentum carries the body past the impact, then slows down.
Frames 11 to 16: recovery: back to the idle pose of the reference figure; frame 16 is close to the idle pose.
The body is at a clearly different place in every frame, following one continuous path.
It plays once, from frame 1 to frame 16.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Hitodama — profil — Touché

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/hitodama/profil-hit.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is a Hitodama (will-o-the-wisp): a small floating flame spirit shaped like a teardrop with a curling tail, a cold cyan-white body with a paler core, a simple dark face with two small eyes and a small mouth; it hovers above the ground. Drawn as a solid flat painted shape with a thin outline, not a glowing light. Draw a 2D sprite animation sheet of this exact character performing being hit and recovering: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 2: hit: flattens and is knocked back, the face in a wince.
Frames 3 to 5: maximum recoil, the body thrown off balance.
Frames 6 to 9: staggering, fighting to recover.
Frames 10 to 13: recovering, regaining the normal shape.
Frames 14 to 16: back to the idle pose of the reference figure; frame 16 is close to frame 1.
The body is at a clearly different place and shape in every frame.
It plays once, from frame 1 to frame 16.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Hitodama — profil — Mort

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/hitodama/profil-death.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is a Hitodama (will-o-the-wisp): a small floating flame spirit shaped like a teardrop with a curling tail, a cold cyan-white body with a paler core, a simple dark face with two small eyes and a small mouth; it hovers above the ground. Drawn as a solid flat painted shape with a thin outline, not a glowing light. Draw a 2D sprite animation sheet of this exact character performing a death animation: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 2: the fatal hit: the body recoils.
Frames 3 to 6: staggers, the strength draining.
Frames 7 to 10: the collapse: shrinks, flickers smaller and smaller, the face fading into a tiny dot.
Frames 11 to 14: the body hits the ground and settles, a small bounce, secondary parts settling.
Frames 15 to 16: lies completely still; frames 15 and 16 are identical. Do not draw any dissolving or fading: the body stays solid.
The body is at a clearly different place and shape in every frame until it lies still.
It plays once, from frame 1 to frame 16.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

## Kodama

### Kodama — fiche profil

**Générer 2 ou 3 variantes** et garder la meilleure. **Enregistrer :** `2d/kodama/fiche-profil.png`

```text
Character reference sheet for a 2D action RPG in which dead souls from every mythology fight across an archipelago of collapsed afterlives. One single character, shown once, full body, in three-quarter side view facing right. The character is a Kodama (tree spirit): a small rounded pale-cream body with a big round head, hollow dark oval eyes and mouth, a tiny trunk-like body with small twig arms, soft moss-green patches and a small leaf on top of the head, child-sized and gentle. Neutral calm idle stance.
Follow the natural shape of this creature, drawn in the same semi-realistic painted style as the heroes. A strong readable silhouette from far away; the character is drawn filling the full image height of its figure, with a clean outline.
The figure is large, about 85% of the image height, centered, with a wide empty margin around it.
Portrait 3:4 image at the highest resolution available.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Kodama — profil — Attente

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/kodama/profil-idle.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is a Kodama (tree spirit): a small rounded pale-cream body with a big round head, hollow dark oval eyes and mouth, a tiny trunk-like body with small twig arms, soft moss-green patches and a small leaf on top of the head, child-sized and gentle. Draw a 2D sprite animation sheet of this exact character performing a slow idle loop: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 2: the neutral pose of the reference figure, then it starts to breathe: standing still and gently rocking side to side, the head tilting, the leaf on top trembling.
Frames 3 to 4: breathing in: the body swells and rises slightly.
Frames 5 to 6: top of the breath: the body at its highest, secondary parts (hair, cloth, limbs, tail) lifted.
Frames 7 to 8: a tiny pause, then breathing out begins.
Frames 9 to 10: breathing out: the body sinks, the secondary parts sway the other way.
Frames 11 to 12: bottom of the breath: the body at its lowest, the weight shifted.
Frames 13 to 14: the weight shifts back, the head or gaze moves a little, everything settles.
Frames 15 to 16: rising smoothly back toward frame 1; frame 16 is almost identical to frame 1.
The motion is subtle but clearly visible over the loop.
It is a seamless loop: frame 16 leads smoothly back to frame 1.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Kodama — profil — Déplacement

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/kodama/profil-move.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is a Kodama (tree spirit): a small rounded pale-cream body with a big round head, hollow dark oval eyes and mouth, a tiny trunk-like body with small twig arms, soft moss-green patches and a small leaf on top of the head, child-sized and gentle. Draw a 2D sprite animation sheet of this exact character performing a locomotion cycle on the spot: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 4: locomotion cycle, first beat: a small hop-and-shuffle backward, keeping away: little hops with the arms swinging; the body at its lowest position.
Frames 5 to 8: second beat: the body rising, the limbs or parts passing each other.
Frames 9 to 12: third beat: the mirror of the first beat (the opposite side or phase), the body at its lowest.
Frames 13 to 16: fourth beat: the body rising again, leading back to the start of the cycle.
The character stays in place (no travelling across the cell).
It is a seamless loop: frame 16 leads smoothly back to frame 1.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Kodama — profil — Anticipation

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/kodama/profil-windup.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is a Kodama (tree spirit): a small rounded pale-cream body with a big round head, hollow dark oval eyes and mouth, a tiny trunk-like body with small twig arms, soft moss-green patches and a small leaf on top of the head, child-sized and gentle. Draw a 2D sprite animation sheet of this exact character performing the wind-up that telegraphs an attack: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 4: from the idle pose, the body starts to build tension: both twig arms raised, the head tipped back, swaying, ready to sing a healing chant, first third of the movement.
Frames 5 to 10: both twig arms raised, the head tipped back, swaying, ready to sing a healing chant, growing more and more tense.
Frames 11 to 14: maximum tension: the pose fully reached, the body trembling slightly, the eyes or head fixed on the target.
Frames 15 to 16: frozen at maximum tension; frames 15 and 16 are nearly identical.
The body moves a little more in every frame toward the final tense pose.
It plays once, from frame 1 to frame 16.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Kodama — profil — Attaque

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/kodama/profil-attack.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is a Kodama (tree spirit): a small rounded pale-cream body with a big round head, hollow dark oval eyes and mouth, a tiny trunk-like body with small twig arms, soft moss-green patches and a small leaf on top of the head, child-sized and gentle. Draw a 2D sprite animation sheet of this exact character performing a single attack: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 2: starts from the pose of maximum tension.
Frames 3 to 5: the strike launches, very fast, the body at a clearly different place in every frame: the arms swept forward and down, the head nodding, the body bowing, on its way.
Frame 6: IMPACT, the key frame of the attack: the arms swept forward and down, the head nodding, the body bowing, at full extension.
Frames 7 to 10: follow-through: the momentum carries the body past the impact, then slows down.
Frames 11 to 16: recovery: back to the idle pose of the reference figure; frame 16 is close to the idle pose.
The body is at a clearly different place in every frame, following one continuous path.
It plays once, from frame 1 to frame 16.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Kodama — profil — Touché

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/kodama/profil-hit.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is a Kodama (tree spirit): a small rounded pale-cream body with a big round head, hollow dark oval eyes and mouth, a tiny trunk-like body with small twig arms, soft moss-green patches and a small leaf on top of the head, child-sized and gentle. Draw a 2D sprite animation sheet of this exact character performing being hit and recovering: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 2: hit: tumbles backward with the head rattling, the arms flung.
Frames 3 to 5: maximum recoil, the body thrown off balance.
Frames 6 to 9: staggering, fighting to recover.
Frames 10 to 13: recovering, regaining the normal shape.
Frames 14 to 16: back to the idle pose of the reference figure; frame 16 is close to frame 1.
The body is at a clearly different place and shape in every frame.
It plays once, from frame 1 to frame 16.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Kodama — profil — Mort

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/kodama/profil-death.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is a Kodama (tree spirit): a small rounded pale-cream body with a big round head, hollow dark oval eyes and mouth, a tiny trunk-like body with small twig arms, soft moss-green patches and a small leaf on top of the head, child-sized and gentle. Draw a 2D sprite animation sheet of this exact character performing a death animation: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 2: the fatal hit: the body recoils.
Frames 3 to 6: staggers, the strength draining.
Frames 7 to 10: the collapse: the head rolls side to side, the body wilts, then crumbles into a small pile.
Frames 11 to 14: the body hits the ground and settles, a small bounce, secondary parts settling.
Frames 15 to 16: lies completely still; frames 15 and 16 are identical. Do not draw any dissolving or fading: the body stays solid.
The body is at a clearly different place and shape in every frame until it lies still.
It plays once, from frame 1 to frame 16.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Kodama — profil — soin (heal channel)

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/kodama/profil-special.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is a Kodama (tree spirit): a small rounded pale-cream body with a big round head, hollow dark oval eyes and mouth, a tiny trunk-like body with small twig arms, soft moss-green patches and a small leaf on top of the head, child-sized and gentle. Draw a 2D sprite animation sheet of this exact character performing a special pose (soin (heal channel)): same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 4: the movement builds up: arms raised and swaying, the head tilted back and rocking, the body gently pulsing in size, a calm chanting pose, first third.
Frames 5 to 12: arms raised and swaying, the head tilted back and rocking, the body gently pulsing in size, a calm chanting pose, fully reached and sustained, with only small rhythmic movements.
Frames 13 to 16: easing back toward the first frame of this sheet, a seamless loop.
The body is at a clearly different place in every frame.
It is a seamless loop: frame 16 leads smoothly back to frame 1.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

## Kappa

### Kappa — fiche profil

**Générer 2 ou 3 variantes** et garder la meilleure. **Enregistrer :** `2d/kappa/fiche-profil.png`

```text
Character reference sheet for a 2D action RPG in which dead souls from every mythology fight across an archipelago of collapsed afterlives. One single character, shown once, full body, in three-quarter side view facing right. The character is a Kappa (river yokai): a stocky green amphibian humanoid, a turtle-like shell on the back, a beak-like mouth, webbed hands and feet, a hollow water dish on top of the head with a small puddle of water (painted flat), wide shoulders and a squat body, cheerful but dangerous. Neutral calm idle stance.
Follow the natural shape of this creature, drawn in the same semi-realistic painted style as the heroes. A strong readable silhouette from far away; the character is drawn filling the full image height of its figure, with a clean outline.
The figure is large, about 85% of the image height, centered, with a wide empty margin around it.
Portrait 3:4 image at the highest resolution available.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Kappa — profil — Attente

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/kappa/profil-idle.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is a Kappa (river yokai): a stocky green amphibian humanoid, a turtle-like shell on the back, a beak-like mouth, webbed hands and feet, a hollow water dish on top of the head with a small puddle of water (painted flat), wide shoulders and a squat body, cheerful but dangerous. Draw a 2D sprite animation sheet of this exact character performing a slow idle loop: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 2: the neutral pose of the reference figure, then it starts to breathe: standing braced, the shell hunched, the arms hanging, the head tilting, the water dish steady.
Frames 3 to 4: breathing in: the body swells and rises slightly.
Frames 5 to 6: top of the breath: the body at its highest, secondary parts (hair, cloth, limbs, tail) lifted.
Frames 7 to 8: a tiny pause, then breathing out begins.
Frames 9 to 10: breathing out: the body sinks, the secondary parts sway the other way.
Frames 11 to 12: bottom of the breath: the body at its lowest, the weight shifted.
Frames 13 to 14: the weight shifts back, the head or gaze moves a little, everything settles.
Frames 15 to 16: rising smoothly back toward frame 1; frame 16 is almost identical to frame 1.
The motion is subtle but clearly visible over the loop.
It is a seamless loop: frame 16 leads smoothly back to frame 1.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Kappa — profil — Déplacement

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/kappa/profil-move.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is a Kappa (river yokai): a stocky green amphibian humanoid, a turtle-like shell on the back, a beak-like mouth, webbed hands and feet, a hollow water dish on top of the head with a small puddle of water (painted flat), wide shoulders and a squat body, cheerful but dangerous. Draw a 2D sprite animation sheet of this exact character performing a locomotion cycle on the spot: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 4: locomotion cycle, first beat: a heavy waddling march, a wide stance, the shell rocking, the arms swinging; the body at its lowest position.
Frames 5 to 8: second beat: the body rising, the limbs or parts passing each other.
Frames 9 to 12: third beat: the mirror of the first beat (the opposite side or phase), the body at its lowest.
Frames 13 to 16: fourth beat: the body rising again, leading back to the start of the cycle.
The character stays in place (no travelling across the cell).
It is a seamless loop: frame 16 leads smoothly back to frame 1.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Kappa — profil — Anticipation

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/kappa/profil-windup.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is a Kappa (river yokai): a stocky green amphibian humanoid, a turtle-like shell on the back, a beak-like mouth, webbed hands and feet, a hollow water dish on top of the head with a small puddle of water (painted flat), wide shoulders and a squat body, cheerful but dangerous. Draw a 2D sprite animation sheet of this exact character performing the wind-up that telegraphs an attack: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 4: from the idle pose, the body starts to build tension: lowers the head and shoulders like a bull, the shell tilted forward, the arms back, the feet digging in, first third of the movement.
Frames 5 to 10: lowers the head and shoulders like a bull, the shell tilted forward, the arms back, the feet digging in, growing more and more tense.
Frames 11 to 14: maximum tension: the pose fully reached, the body trembling slightly, the eyes or head fixed on the target.
Frames 15 to 16: frozen at maximum tension; frames 15 and 16 are nearly identical.
The body moves a little more in every frame toward the final tense pose.
It plays once, from frame 1 to frame 16.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Kappa — profil — Attaque

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/kappa/profil-attack.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is a Kappa (river yokai): a stocky green amphibian humanoid, a turtle-like shell on the back, a beak-like mouth, webbed hands and feet, a hollow water dish on top of the head with a small puddle of water (painted flat), wide shoulders and a squat body, cheerful but dangerous. Draw a 2D sprite animation sheet of this exact character performing a single attack: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 2: starts from the pose of maximum tension.
Frames 3 to 5: the strike launches, very fast, the body at a clearly different place in every frame: a full shoulder charge: the body stretched forward, head down, arms swept back, the shell high, on its way.
Frame 6: IMPACT, the key frame of the attack: a full shoulder charge: the body stretched forward, head down, arms swept back, the shell high, at full extension.
Frames 7 to 10: follow-through: the momentum carries the body past the impact, then slows down.
Frames 11 to 16: recovery: back to the idle pose of the reference figure; frame 16 is close to the idle pose.
The body is at a clearly different place in every frame, following one continuous path.
It plays once, from frame 1 to frame 16.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Kappa — profil — Touché

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/kappa/profil-hit.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is a Kappa (river yokai): a stocky green amphibian humanoid, a turtle-like shell on the back, a beak-like mouth, webbed hands and feet, a hollow water dish on top of the head with a small puddle of water (painted flat), wide shoulders and a squat body, cheerful but dangerous. Draw a 2D sprite animation sheet of this exact character performing being hit and recovering: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 2: hit: rocked back on the heels, the head snapping up, the water in the dish sloshing.
Frames 3 to 5: maximum recoil, the body thrown off balance.
Frames 6 to 9: staggering, fighting to recover.
Frames 10 to 13: recovering, regaining the normal shape.
Frames 14 to 16: back to the idle pose of the reference figure; frame 16 is close to frame 1.
The body is at a clearly different place and shape in every frame.
It plays once, from frame 1 to frame 16.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Kappa — profil — Mort

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/kappa/profil-death.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is a Kappa (river yokai): a stocky green amphibian humanoid, a turtle-like shell on the back, a beak-like mouth, webbed hands and feet, a hollow water dish on top of the head with a small puddle of water (painted flat), wide shoulders and a squat body, cheerful but dangerous. Draw a 2D sprite animation sheet of this exact character performing a death animation: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 2: the fatal hit: the body recoils.
Frames 3 to 6: staggers, the strength draining.
Frames 7 to 10: the collapse: the dish tips over and spills, the body tips, then tumbles onto the shell, the limbs curling up.
Frames 11 to 14: the body hits the ground and settles, a small bounce, secondary parts settling.
Frames 15 to 16: lies completely still; frames 15 and 16 are identical. Do not draw any dissolving or fading: the body stays solid.
The body is at a clearly different place and shape in every frame until it lies still.
It plays once, from frame 1 to frame 16.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Kappa — profil — étourdi (stunned)

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/kappa/profil-special.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is a Kappa (river yokai): a stocky green amphibian humanoid, a turtle-like shell on the back, a beak-like mouth, webbed hands and feet, a hollow water dish on top of the head with a small puddle of water (painted flat), wide shoulders and a squat body, cheerful but dangerous. Draw a 2D sprite animation sheet of this exact character performing a special pose (étourdi (stunned)): same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 4: the movement builds up: dazed: the dish tipped and empty, swaying on the spot with the knees wobbling, the arms dangling, the eyes crossed, first third.
Frames 5 to 12: dazed: the dish tipped and empty, swaying on the spot with the knees wobbling, the arms dangling, the eyes crossed, fully reached and sustained, with only small rhythmic movements.
Frames 13 to 16: easing back toward the first frame of this sheet, a seamless loop.
The body is at a clearly different place in every frame.
It is a seamless loop: frame 16 leads smoothly back to frame 1.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

## Kappa renforcé

### Kappa renforcé — fiche profil

**Générer 2 ou 3 variantes** et garder la meilleure. **Enregistrer :** `2d/kappaRenforce/fiche-profil.png`

```text
Character reference sheet for a 2D action RPG in which dead souls from every mythology fight across an archipelago of collapsed afterlives. One single character, shown once, full body, in three-quarter side view facing right. The character is an armored elite Kappa: the same stocky green amphibian humanoid as a regular kappa but bigger and darker, wearing lacquered armor plates over the shell and shoulders, a battle scar, a spiked bracer, a hollow water dish with a puddle painted flat, heavier and angrier. Neutral calm idle stance.
Follow the natural shape of this creature, drawn in the same semi-realistic painted style as the heroes. A strong readable silhouette from far away; the character is drawn filling the full image height of its figure, with a clean outline.
The figure is large, about 85% of the image height, centered, with a wide empty margin around it.
Portrait 3:4 image at the highest resolution available.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Kappa renforcé — profil — Attente

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/kappaRenforce/profil-idle.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is an armored elite Kappa: the same stocky green amphibian humanoid as a regular kappa but bigger and darker, wearing lacquered armor plates over the shell and shoulders, a battle scar, a spiked bracer, a hollow water dish with a puddle painted flat, heavier and angrier. Draw a 2D sprite animation sheet of this exact character performing a slow idle loop: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 2: the neutral pose of the reference figure, then it starts to breathe: braced with arms spread a little, the shell hunched, the chest heaving, the head swinging side to side.
Frames 3 to 4: breathing in: the body swells and rises slightly.
Frames 5 to 6: top of the breath: the body at its highest, secondary parts (hair, cloth, limbs, tail) lifted.
Frames 7 to 8: a tiny pause, then breathing out begins.
Frames 9 to 10: breathing out: the body sinks, the secondary parts sway the other way.
Frames 11 to 12: bottom of the breath: the body at its lowest, the weight shifted.
Frames 13 to 14: the weight shifts back, the head or gaze moves a little, everything settles.
Frames 15 to 16: rising smoothly back toward frame 1; frame 16 is almost identical to frame 1.
The motion is subtle but clearly visible over the loop.
It is a seamless loop: frame 16 leads smoothly back to frame 1.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Kappa renforcé — profil — Déplacement

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/kappaRenforce/profil-move.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is an armored elite Kappa: the same stocky green amphibian humanoid as a regular kappa but bigger and darker, wearing lacquered armor plates over the shell and shoulders, a battle scar, a spiked bracer, a hollow water dish with a puddle painted flat, heavier and angrier. Draw a 2D sprite animation sheet of this exact character performing a locomotion cycle on the spot: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 4: locomotion cycle, first beat: a heavy stamping march, a wide stance, the armor plates rattling, the arms swinging; the body at its lowest position.
Frames 5 to 8: second beat: the body rising, the limbs or parts passing each other.
Frames 9 to 12: third beat: the mirror of the first beat (the opposite side or phase), the body at its lowest.
Frames 13 to 16: fourth beat: the body rising again, leading back to the start of the cycle.
The character stays in place (no travelling across the cell).
It is a seamless loop: frame 16 leads smoothly back to frame 1.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Kappa renforcé — profil — Anticipation

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/kappaRenforce/profil-windup.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is an armored elite Kappa: the same stocky green amphibian humanoid as a regular kappa but bigger and darker, wearing lacquered armor plates over the shell and shoulders, a battle scar, a spiked bracer, a hollow water dish with a puddle painted flat, heavier and angrier. Draw a 2D sprite animation sheet of this exact character performing the wind-up that telegraphs an attack: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 4: from the idle pose, the body starts to build tension: digs in and lowers the head like a bull, the armored shell tilted forward, the arms drawn back and fists clenched, first third of the movement.
Frames 5 to 10: digs in and lowers the head like a bull, the armored shell tilted forward, the arms drawn back and fists clenched, growing more and more tense.
Frames 11 to 14: maximum tension: the pose fully reached, the body trembling slightly, the eyes or head fixed on the target.
Frames 15 to 16: frozen at maximum tension; frames 15 and 16 are nearly identical.
The body moves a little more in every frame toward the final tense pose.
It plays once, from frame 1 to frame 16.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Kappa renforcé — profil — Attaque

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/kappaRenforce/profil-attack.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is an armored elite Kappa: the same stocky green amphibian humanoid as a regular kappa but bigger and darker, wearing lacquered armor plates over the shell and shoulders, a battle scar, a spiked bracer, a hollow water dish with a puddle painted flat, heavier and angrier. Draw a 2D sprite animation sheet of this exact character performing a single attack: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 2: starts from the pose of maximum tension.
Frames 3 to 5: the strike launches, very fast, the body at a clearly different place in every frame: a chain of charges seen as one full charge pose: the body stretched forward, head down, the arms swept back, the shell high, on its way.
Frame 6: IMPACT, the key frame of the attack: a chain of charges seen as one full charge pose: the body stretched forward, head down, the arms swept back, the shell high, at full extension.
Frames 7 to 10: follow-through: the momentum carries the body past the impact, then slows down.
Frames 11 to 16: recovery: back to the idle pose of the reference figure; frame 16 is close to the idle pose.
The body is at a clearly different place in every frame, following one continuous path.
It plays once, from frame 1 to frame 16.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Kappa renforcé — profil — Touché

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/kappaRenforce/profil-hit.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is an armored elite Kappa: the same stocky green amphibian humanoid as a regular kappa but bigger and darker, wearing lacquered armor plates over the shell and shoulders, a battle scar, a spiked bracer, a hollow water dish with a puddle painted flat, heavier and angrier. Draw a 2D sprite animation sheet of this exact character performing being hit and recovering: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 2: hit: rocked back on the heels, the armor plates flashing with a dull shine, the head snapping up.
Frames 3 to 5: maximum recoil, the body thrown off balance.
Frames 6 to 9: staggering, fighting to recover.
Frames 10 to 13: recovering, regaining the normal shape.
Frames 14 to 16: back to the idle pose of the reference figure; frame 16 is close to frame 1.
The body is at a clearly different place and shape in every frame.
It plays once, from frame 1 to frame 16.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Kappa renforcé — profil — Mort

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/kappaRenforce/profil-death.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is an armored elite Kappa: the same stocky green amphibian humanoid as a regular kappa but bigger and darker, wearing lacquered armor plates over the shell and shoulders, a battle scar, a spiked bracer, a hollow water dish with a puddle painted flat, heavier and angrier. Draw a 2D sprite animation sheet of this exact character performing a death animation: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 2: the fatal hit: the body recoils.
Frames 3 to 6: staggers, the strength draining.
Frames 7 to 10: the collapse: the dish tips and spills, the armored body sways, then falls flat on the shell with the limbs spread.
Frames 11 to 14: the body hits the ground and settles, a small bounce, secondary parts settling.
Frames 15 to 16: lies completely still; frames 15 and 16 are identical. Do not draw any dissolving or fading: the body stays solid.
The body is at a clearly different place and shape in every frame until it lies still.
It plays once, from frame 1 to frame 16.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Kappa renforcé — profil — étourdi (stunned)

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/kappaRenforce/profil-special.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is an armored elite Kappa: the same stocky green amphibian humanoid as a regular kappa but bigger and darker, wearing lacquered armor plates over the shell and shoulders, a battle scar, a spiked bracer, a hollow water dish with a puddle painted flat, heavier and angrier. Draw a 2D sprite animation sheet of this exact character performing a special pose (étourdi (stunned)): same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 4: the movement builds up: dazed: the dish tipped and empty, swaying on the spot with the knees wobbling, the arms dangling, the eyes crossed, first third.
Frames 5 to 12: dazed: the dish tipped and empty, swaying on the spot with the knees wobbling, the arms dangling, the eyes crossed, fully reached and sustained, with only small rhythmic movements.
Frames 13 to 16: easing back toward the first frame of this sheet, a seamless loop.
The body is at a clearly different place in every frame.
It is a seamless loop: frame 16 leads smoothly back to frame 1.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

## Kasa-obake

### Kasa-obake — fiche profil

**Générer 2 ou 3 variantes** et garder la meilleure. **Enregistrer :** `2d/kasaObake/fiche-profil.png`

```text
Character reference sheet for a 2D action RPG in which dead souls from every mythology fight across an archipelago of collapsed afterlives. One single character, shown once, full body, in three-quarter side view facing right. The character is a Kasa-obake (haunted umbrella): an old paper-and-bamboo umbrella closed around a single large eye, with one thin leg ending in a wooden geta sandal, two thin arms, a long lolling tongue, worn patched paper in dull violet and cream. Neutral calm idle stance.
Follow the natural shape of this creature, drawn in the same semi-realistic painted style as the heroes. A strong readable silhouette from far away; the character is drawn filling the full image height of its figure, with a clean outline.
The figure is large, about 85% of the image height, centered, with a wide empty margin around it.
Portrait 3:4 image at the highest resolution available.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Kasa-obake — profil — Attente

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/kasaObake/profil-idle.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is a Kasa-obake (haunted umbrella): an old paper-and-bamboo umbrella closed around a single large eye, with one thin leg ending in a wooden geta sandal, two thin arms, a long lolling tongue, worn patched paper in dull violet and cream. Draw a 2D sprite animation sheet of this exact character performing a slow idle loop: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 2: the neutral pose of the reference figure, then it starts to breathe: hopping in place on its single leg, the umbrella top swaying, the eye rolling, the tongue flapping.
Frames 3 to 4: breathing in: the body swells and rises slightly.
Frames 5 to 6: top of the breath: the body at its highest, secondary parts (hair, cloth, limbs, tail) lifted.
Frames 7 to 8: a tiny pause, then breathing out begins.
Frames 9 to 10: breathing out: the body sinks, the secondary parts sway the other way.
Frames 11 to 12: bottom of the breath: the body at its lowest, the weight shifted.
Frames 13 to 14: the weight shifts back, the head or gaze moves a little, everything settles.
Frames 15 to 16: rising smoothly back toward frame 1; frame 16 is almost identical to frame 1.
The motion is subtle but clearly visible over the loop.
It is a seamless loop: frame 16 leads smoothly back to frame 1.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Kasa-obake — profil — Déplacement

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/kasaObake/profil-move.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is a Kasa-obake (haunted umbrella): an old paper-and-bamboo umbrella closed around a single large eye, with one thin leg ending in a wooden geta sandal, two thin arms, a long lolling tongue, worn patched paper in dull violet and cream. Draw a 2D sprite animation sheet of this exact character performing a locomotion cycle on the spot: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 4: locomotion cycle, first beat: a bouncy hop on the single geta, the arms flailing for balance, the umbrella top tilting with each hop; the body at its lowest position.
Frames 5 to 8: second beat: the body rising, the limbs or parts passing each other.
Frames 9 to 12: third beat: the mirror of the first beat (the opposite side or phase), the body at its lowest.
Frames 13 to 16: fourth beat: the body rising again, leading back to the start of the cycle.
The character stays in place (no travelling across the cell).
It is a seamless loop: frame 16 leads smoothly back to frame 1.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Kasa-obake — profil — Anticipation

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/kasaObake/profil-windup.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is a Kasa-obake (haunted umbrella): an old paper-and-bamboo umbrella closed around a single large eye, with one thin leg ending in a wooden geta sandal, two thin arms, a long lolling tongue, worn patched paper in dull violet and cream. Draw a 2D sprite animation sheet of this exact character performing the wind-up that telegraphs an attack: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 4: from the idle pose, the body starts to build tension: crouches down on the single leg, the umbrella top pulled back and folded, the eye wide open and fixed on the target, first third of the movement.
Frames 5 to 10: crouches down on the single leg, the umbrella top pulled back and folded, the eye wide open and fixed on the target, growing more and more tense.
Frames 11 to 14: maximum tension: the pose fully reached, the body trembling slightly, the eyes or head fixed on the target.
Frames 15 to 16: frozen at maximum tension; frames 15 and 16 are nearly identical.
The body moves a little more in every frame toward the final tense pose.
It plays once, from frame 1 to frame 16.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Kasa-obake — profil — Attaque

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/kasaObake/profil-attack.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is a Kasa-obake (haunted umbrella): an old paper-and-bamboo umbrella closed around a single large eye, with one thin leg ending in a wooden geta sandal, two thin arms, a long lolling tongue, worn patched paper in dull violet and cream. Draw a 2D sprite animation sheet of this exact character performing a single attack: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 2: starts from the pose of maximum tension.
Frames 3 to 5: the strike launches, very fast, the body at a clearly different place in every frame: leaps high: the whole body stretched up then coming down with the umbrella top spread wide and the leg kicking out, the tongue lashing, on its way.
Frame 6: IMPACT, the key frame of the attack: leaps high: the whole body stretched up then coming down with the umbrella top spread wide and the leg kicking out, the tongue lashing, at full extension.
Frames 7 to 10: follow-through: the momentum carries the body past the impact, then slows down.
Frames 11 to 16: recovery: back to the idle pose of the reference figure; frame 16 is close to the idle pose.
The body is at a clearly different place in every frame, following one continuous path.
It plays once, from frame 1 to frame 16.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Kasa-obake — profil — Touché

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/kasaObake/profil-hit.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is a Kasa-obake (haunted umbrella): an old paper-and-bamboo umbrella closed around a single large eye, with one thin leg ending in a wooden geta sandal, two thin arms, a long lolling tongue, worn patched paper in dull violet and cream. Draw a 2D sprite animation sheet of this exact character performing being hit and recovering: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 2: hit: knocked sideways, the umbrella top flapping open, the eye squeezed shut.
Frames 3 to 5: maximum recoil, the body thrown off balance.
Frames 6 to 9: staggering, fighting to recover.
Frames 10 to 13: recovering, regaining the normal shape.
Frames 14 to 16: back to the idle pose of the reference figure; frame 16 is close to frame 1.
The body is at a clearly different place and shape in every frame.
It plays once, from frame 1 to frame 16.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Kasa-obake — profil — Mort

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/kasaObake/profil-death.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is a Kasa-obake (haunted umbrella): an old paper-and-bamboo umbrella closed around a single large eye, with one thin leg ending in a wooden geta sandal, two thin arms, a long lolling tongue, worn patched paper in dull violet and cream. Draw a 2D sprite animation sheet of this exact character performing a death animation: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 2: the fatal hit: the body recoils.
Frames 3 to 6: staggers, the strength draining.
Frames 7 to 10: the collapse: the umbrella snaps shut and slumps, the leg folds, then the body falls flat, torn and still, the tongue hanging.
Frames 11 to 14: the body hits the ground and settles, a small bounce, secondary parts settling.
Frames 15 to 16: lies completely still; frames 15 and 16 are identical. Do not draw any dissolving or fading: the body stays solid.
The body is at a clearly different place and shape in every frame until it lies still.
It plays once, from frame 1 to frame 16.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Kasa-obake — profil — bond (airborne)

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/kasaObake/profil-special.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is a Kasa-obake (haunted umbrella): an old paper-and-bamboo umbrella closed around a single large eye, with one thin leg ending in a wooden geta sandal, two thin arms, a long lolling tongue, worn patched paper in dull violet and cream. Draw a 2D sprite animation sheet of this exact character performing a special pose (bond (airborne)): same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 4: the movement builds up: in mid-air: the umbrella top half open and trembling, the leg tucked, the arms out, the eye looking down, first third.
Frames 5 to 12: in mid-air: the umbrella top half open and trembling, the leg tucked, the arms out, the eye looking down, fully reached and sustained, with only small rhythmic movements.
Frames 13 to 16: easing back toward the first frame of this sheet, a seamless loop.
The body is at a clearly different place in every frame.
It is a seamless loop: frame 16 leads smoothly back to frame 1.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

## Oublié

### Oublié — fiche profil

**Générer 2 ou 3 variantes** et garder la meilleure. **Enregistrer :** `2d/oublie/fiche-profil.png`

```text
Character reference sheet for a 2D action RPG in which dead souls from every mythology fight across an archipelago of collapsed afterlives. One single character, shown once, full body, in three-quarter side view facing right. The character is an Oublié (Forgotten One): a tall thin figure in ragged grey-blue robes and a torn hood, a blank featureless white mask for a face with no eyes and no mouth, long thin arms and pale bony hands, a slightly bent posture, empty and sorrowful. Neutral calm idle stance.
Follow the natural shape of this creature, drawn in the same semi-realistic painted style as the heroes. A strong readable silhouette from far away; the character is drawn filling the full image height of its figure, with a clean outline.
The figure is large, about 85% of the image height, centered, with a wide empty margin around it.
Portrait 3:4 image at the highest resolution available.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform pure magenta background (#ff00ff), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Oublié — profil — Attente

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/oublie/profil-idle.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is an Oublié (Forgotten One): a tall thin figure in ragged grey-blue robes and a torn hood, a blank featureless white mask for a face with no eyes and no mouth, long thin arms and pale bony hands, a slightly bent posture, empty and sorrowful. Draw a 2D sprite animation sheet of this exact character performing a slow idle loop: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 2: the neutral pose of the reference figure, then it starts to breathe: standing slouched, the arms hanging, the head tilting slowly, the rags swaying.
Frames 3 to 4: breathing in: the body swells and rises slightly.
Frames 5 to 6: top of the breath: the body at its highest, secondary parts (hair, cloth, limbs, tail) lifted.
Frames 7 to 8: a tiny pause, then breathing out begins.
Frames 9 to 10: breathing out: the body sinks, the secondary parts sway the other way.
Frames 11 to 12: bottom of the breath: the body at its lowest, the weight shifted.
Frames 13 to 14: the weight shifts back, the head or gaze moves a little, everything settles.
Frames 15 to 16: rising smoothly back toward frame 1; frame 16 is almost identical to frame 1.
The motion is subtle but clearly visible over the loop.
It is a seamless loop: frame 16 leads smoothly back to frame 1.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform pure magenta background (#ff00ff), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Oublié — profil — Déplacement

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/oublie/profil-move.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is an Oublié (Forgotten One): a tall thin figure in ragged grey-blue robes and a torn hood, a blank featureless white mask for a face with no eyes and no mouth, long thin arms and pale bony hands, a slightly bent posture, empty and sorrowful. Draw a 2D sprite animation sheet of this exact character performing a locomotion cycle on the spot: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 4: locomotion cycle, first beat: a slow dragging shuffle forward, the arms swinging loosely, the head drooping, the rags trailing; the body at its lowest position.
Frames 5 to 8: second beat: the body rising, the limbs or parts passing each other.
Frames 9 to 12: third beat: the mirror of the first beat (the opposite side or phase), the body at its lowest.
Frames 13 to 16: fourth beat: the body rising again, leading back to the start of the cycle.
The character stays in place (no travelling across the cell).
It is a seamless loop: frame 16 leads smoothly back to frame 1.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform pure magenta background (#ff00ff), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Oublié — profil — Anticipation

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/oublie/profil-windup.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is an Oublié (Forgotten One): a tall thin figure in ragged grey-blue robes and a torn hood, a blank featureless white mask for a face with no eyes and no mouth, long thin arms and pale bony hands, a slightly bent posture, empty and sorrowful. Draw a 2D sprite animation sheet of this exact character performing the wind-up that telegraphs an attack: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 4: from the idle pose, the body starts to build tension: the arms rise slowly forward and up, the fingers spread, the back arching, the head tilted back, first third of the movement.
Frames 5 to 10: the arms rise slowly forward and up, the fingers spread, the back arching, the head tilted back, growing more and more tense.
Frames 11 to 14: maximum tension: the pose fully reached, the body trembling slightly, the eyes or head fixed on the target.
Frames 15 to 16: frozen at maximum tension; frames 15 and 16 are nearly identical.
The body moves a little more in every frame toward the final tense pose.
It plays once, from frame 1 to frame 16.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform pure magenta background (#ff00ff), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Oublié — profil — Attaque

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/oublie/profil-attack.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is an Oublié (Forgotten One): a tall thin figure in ragged grey-blue robes and a torn hood, a blank featureless white mask for a face with no eyes and no mouth, long thin arms and pale bony hands, a slightly bent posture, empty and sorrowful. Draw a 2D sprite animation sheet of this exact character performing a single attack: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 2: starts from the pose of maximum tension.
Frames 3 to 5: the strike launches, very fast, the body at a clearly different place in every frame: both arms swing down and forward in a heavy grab-and-slam, the body falling into it, on its way.
Frame 6: IMPACT, the key frame of the attack: both arms swing down and forward in a heavy grab-and-slam, the body falling into it, at full extension.
Frames 7 to 10: follow-through: the momentum carries the body past the impact, then slows down.
Frames 11 to 16: recovery: back to the idle pose of the reference figure; frame 16 is close to the idle pose.
The body is at a clearly different place in every frame, following one continuous path.
It plays once, from frame 1 to frame 16.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform pure magenta background (#ff00ff), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Oublié — profil — Touché

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/oublie/profil-hit.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is an Oublié (Forgotten One): a tall thin figure in ragged grey-blue robes and a torn hood, a blank featureless white mask for a face with no eyes and no mouth, long thin arms and pale bony hands, a slightly bent posture, empty and sorrowful. Draw a 2D sprite animation sheet of this exact character performing being hit and recovering: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 2: hit: the head snaps to the side, the hood flaps, the body staggering back.
Frames 3 to 5: maximum recoil, the body thrown off balance.
Frames 6 to 9: staggering, fighting to recover.
Frames 10 to 13: recovering, regaining the normal shape.
Frames 14 to 16: back to the idle pose of the reference figure; frame 16 is close to frame 1.
The body is at a clearly different place and shape in every frame.
It plays once, from frame 1 to frame 16.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform pure magenta background (#ff00ff), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Oublié — profil — Mort

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/oublie/profil-death.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is an Oublié (Forgotten One): a tall thin figure in ragged grey-blue robes and a torn hood, a blank featureless white mask for a face with no eyes and no mouth, long thin arms and pale bony hands, a slightly bent posture, empty and sorrowful. Draw a 2D sprite animation sheet of this exact character performing a death animation: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 2: the fatal hit: the body recoils.
Frames 3 to 6: staggers, the strength draining.
Frames 7 to 10: the collapse: the body goes limp, the knees fold, the robe collapses over the body on the ground and the mask drops aside.
Frames 11 to 14: the body hits the ground and settles, a small bounce, secondary parts settling.
Frames 15 to 16: lies completely still; frames 15 and 16 are identical. Do not draw any dissolving or fading: the body stays solid.
The body is at a clearly different place and shape in every frame until it lies still.
It plays once, from frame 1 to frame 16.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform pure magenta background (#ff00ff), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

## Petite araignée

### Petite araignée — fiche profil

**Générer 2 ou 3 variantes** et garder la meilleure. **Enregistrer :** `2d/araignee/fiche-profil.png`

```text
Character reference sheet for a 2D action RPG in which dead souls from every mythology fight across an archipelago of collapsed afterlives. One single character, shown once, full body, in three-quarter side view facing right. The character is a small spider, one of the Jorōgumo's brood: a round pale-violet body with a cream hourglass-like pattern on the back, eight thin jointed legs, a cluster of small red-black eyes, fangs, sized to fit under the character's feet, seen slightly from above. Neutral calm idle stance.
Follow the natural shape of this creature, drawn in the same semi-realistic painted style as the heroes. A strong readable silhouette from far away; the character is drawn filling the full image height of its figure, with a clean outline.
The figure is large, about 85% of the image height, centered, with a wide empty margin around it.
Landscape 16:9 image at the highest resolution available.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Petite araignée — profil — Attente

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/araignee/profil-idle.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is a small spider, one of the Jorōgumo's brood: a round pale-violet body with a cream hourglass-like pattern on the back, eight thin jointed legs, a cluster of small red-black eyes, fangs, sized to fit under the character's feet, seen slightly from above. Draw a 2D sprite animation sheet of this exact character performing a slow idle loop: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 2: the neutral pose of the reference figure, then it starts to breathe: standing on all eight legs, the body bobbing gently, the front legs raised and waving.
Frames 3 to 4: breathing in: the body swells and rises slightly.
Frames 5 to 6: top of the breath: the body at its highest, secondary parts (hair, cloth, limbs, tail) lifted.
Frames 7 to 8: a tiny pause, then breathing out begins.
Frames 9 to 10: breathing out: the body sinks, the secondary parts sway the other way.
Frames 11 to 12: bottom of the breath: the body at its lowest, the weight shifted.
Frames 13 to 14: the weight shifts back, the head or gaze moves a little, everything settles.
Frames 15 to 16: rising smoothly back toward frame 1; frame 16 is almost identical to frame 1.
The motion is subtle but clearly visible over the loop.
It is a seamless loop: frame 16 leads smoothly back to frame 1.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Petite araignée — profil — Déplacement

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/araignee/profil-move.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is a small spider, one of the Jorōgumo's brood: a round pale-violet body with a cream hourglass-like pattern on the back, eight thin jointed legs, a cluster of small red-black eyes, fangs, sized to fit under the character's feet, seen slightly from above. Draw a 2D sprite animation sheet of this exact character performing a locomotion cycle on the spot: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 4: locomotion cycle, first beat: a fast skittering scuttle, the legs moving in alternating groups of four, the body low; the body at its lowest position.
Frames 5 to 8: second beat: the body rising, the limbs or parts passing each other.
Frames 9 to 12: third beat: the mirror of the first beat (the opposite side or phase), the body at its lowest.
Frames 13 to 16: fourth beat: the body rising again, leading back to the start of the cycle.
The character stays in place (no travelling across the cell).
It is a seamless loop: frame 16 leads smoothly back to frame 1.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Petite araignée — profil — Anticipation

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/araignee/profil-windup.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is a small spider, one of the Jorōgumo's brood: a round pale-violet body with a cream hourglass-like pattern on the back, eight thin jointed legs, a cluster of small red-black eyes, fangs, sized to fit under the character's feet, seen slightly from above. Draw a 2D sprite animation sheet of this exact character performing the wind-up that telegraphs an attack: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 4: from the idle pose, the body starts to build tension: rears up on the back legs, the front legs raised high and spread, the fangs open, the body trembling, first third of the movement.
Frames 5 to 10: rears up on the back legs, the front legs raised high and spread, the fangs open, the body trembling, growing more and more tense.
Frames 11 to 14: maximum tension: the pose fully reached, the body trembling slightly, the eyes or head fixed on the target.
Frames 15 to 16: frozen at maximum tension; frames 15 and 16 are nearly identical.
The body moves a little more in every frame toward the final tense pose.
It plays once, from frame 1 to frame 16.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Petite araignée — profil — Attaque

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/araignee/profil-attack.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is a small spider, one of the Jorōgumo's brood: a round pale-violet body with a cream hourglass-like pattern on the back, eight thin jointed legs, a cluster of small red-black eyes, fangs, sized to fit under the character's feet, seen slightly from above. Draw a 2D sprite animation sheet of this exact character performing a single attack: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 2: starts from the pose of maximum tension.
Frames 3 to 5: the strike launches, very fast, the body at a clearly different place in every frame: pounces forward: the body stretched low, the front legs thrust out, the fangs wide, on its way.
Frame 6: IMPACT, the key frame of the attack: pounces forward: the body stretched low, the front legs thrust out, the fangs wide, at full extension.
Frames 7 to 10: follow-through: the momentum carries the body past the impact, then slows down.
Frames 11 to 16: recovery: back to the idle pose of the reference figure; frame 16 is close to the idle pose.
The body is at a clearly different place in every frame, following one continuous path.
It plays once, from frame 1 to frame 16.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Petite araignée — profil — Touché

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/araignee/profil-hit.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is a small spider, one of the Jorōgumo's brood: a round pale-violet body with a cream hourglass-like pattern on the back, eight thin jointed legs, a cluster of small red-black eyes, fangs, sized to fit under the character's feet, seen slightly from above. Draw a 2D sprite animation sheet of this exact character performing being hit and recovering: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 2: hit: flipped sideways and knocked back, the legs flailing.
Frames 3 to 5: maximum recoil, the body thrown off balance.
Frames 6 to 9: staggering, fighting to recover.
Frames 10 to 13: recovering, regaining the normal shape.
Frames 14 to 16: back to the idle pose of the reference figure; frame 16 is close to frame 1.
The body is at a clearly different place and shape in every frame.
It plays once, from frame 1 to frame 16.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```

### Petite araignée — profil — Mort

**Joindre :** `fiche-profil.png`. **Enregistrer :** `2d/araignee/profil-death.png`

```text
The attached image is the reference sheet of our game character: a single figure seen in three-quarter side view facing right. The character is a small spider, one of the Jorōgumo's brood: a round pale-violet body with a cream hourglass-like pattern on the back, eight thin jointed legs, a cluster of small red-black eyes, fangs, sized to fit under the character's feet, seen slightly from above. Draw a 2D sprite animation sheet of this exact character performing a death animation: same design, proportions, colors, nothing added or removed. Every frame is drawn in that same view and camera angle, exactly like the reference figure.
Output a square 1:1 image of 1024 x 1024 px. The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells).
The 16 frames are read left to right, then top to bottom: frames 1 to 4 on the top row, 5 to 8 on the second row, 9 to 12 on the third row, 13 to 16 on the bottom row.
Frames 1 to 2: the fatal hit: the body recoils.
Frames 3 to 6: staggers, the strength draining.
Frames 7 to 10: the collapse: rolls onto its back, the legs curling inward, then still.
Frames 11 to 14: the body hits the ground and settles, a small bounce, secondary parts settling.
Frames 15 to 16: lies completely still; frames 15 and 16 are identical. Do not draw any dissolving or fading: the body stays solid.
The body is at a clearly different place and shape in every frame until it lies still.
It plays once, from frame 1 to frame 16.
Each figure is centered in its own cell and drawn at the same scale in every cell: the standing character is about 78% of the cell height, with its feet on the same baseline at about 89% of the cell height in every cell. The whole figure, weapon, hair and cloth included, stays inside its cell with an empty margin; nothing touches or crosses a neighbouring cell. If a pose is wide, keep the scale and let the pose use the width; never enlarge the character.
The character stays exactly the same in all frames: same proportions, same head size, same face, same outfit, same colors, same weapon; only the pose changes.
DO NOT draw the same pose twice in a row: every frame must be clearly different from its neighbours, even if the motion looks slightly exaggerated.
DO NOT simply copy the reference figure into every cell.
DO NOT change the camera angle, the facing direction or the design from one frame to the next.
DO NOT move the character across the sheet: each frame stays centered in its own cell.
Painted 2D action-RPG character illustration in a semi-realistic anime style (not cartoon): realistic proportions, soft painted gradients, clothing folds, embroidered motifs and accessories drawn clearly, a crisp dark ink-blue outline (about 1 to 2 px when the character is about 200 px tall, thinner on inner details), two-tone cel shading where the shadow is the base color darkened and tinted toward blue-violet (never black), a soft cool light coming from the upper left, character colors more saturated and lighter than a muted, desaturated world around them, metal painted with a single sharp white highlight. No photorealism, no noise, no fine texture, no 3D-render look, no realistic skin pores. Seen from a slightly raised camera, about 35 degrees above the horizon, like an isometric action RPG.
Flat uniform medium grey background (#8f8f8f), exactly the same color everywhere, no gradient, no vignette.
No effects of any kind: no magic, no glow, no light rays, no motion trails or blur, no smoke, no sparks, no speed lines, no cast shadow, no ground, no text, no numbers, no labels, no drawn grid lines, no frame borders.
```
