# 04 — Rôdeur : effets

Dans l'ordre : le premier effet sert ensuite de référence de style (à joindre) pour les suivants. Une conversation neuve par prompt.

## Flèche (en vol, boucle)

Clic gauche : une flèche. — au sol (vu de dessus), boucle.

**Joindre :** rien. **Enregistrer :** `vfx-2d/rodeur/projectile-rodeur.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Ranger: a longbow, arrows, nets, wind and the hunt.
The effect: an arrow in flight seen from above: a thin painted arrow (shaft, small leaf-green fletching, sharp tip) with a very thin green-white wind streak trailing behind it. The arrow is the only object allowed here.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
A seamless loop: frame 16 leads back to frame 1 without a jump. The effect keeps the same size and position in every frame; only its inner motion changes (rotation, flicker, drifting particles), so it can be played over and over.
Seen from DIRECTLY ABOVE (top-down, orthographic view, no perspective): the effect lies flat on the ground, exactly like a decal seen from the sky, because the game engine projects it on the floor of the isometric arena itself. Circles are perfect circles, not ellipses.
This is a projectile flying toward the RIGHT of the image: its head is on the right, its trail streams to the left. Keep the head at the same place in every frame (about 65% of the cell width, at mid-height): only the flames, trail and sparks move.
Every frame is drawn at the same scale with the same head position in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white core, fresh leaf-green accent (#95e28c), deep forest-green light (#3f9a5a). Wind, precision, hunting.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## Tir chargé (en vol, boucle)

Clic droit tenu puis relâché : une flèche chargée, plus forte et plus loin. — au sol (vu de dessus), boucle.

**Joindre :** `vfx-2d/rodeur/projectile-rodeur.png`. **Enregistrer :** `vfx-2d/rodeur/projectile-rodeur-charge.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Ranger: a longbow, arrows, nets, wind and the hunt.
The effect: a fully charged arrow in flight seen from above: the same arrow wrapped in a spiral of bright green wind, a longer white-green streak, small leaves of light peeling off the trail.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
A seamless loop: frame 16 leads back to frame 1 without a jump. The effect keeps the same size and position in every frame; only its inner motion changes (rotation, flicker, drifting particles), so it can be played over and over.
Seen from DIRECTLY ABOVE (top-down, orthographic view, no perspective): the effect lies flat on the ground, exactly like a decal seen from the sky, because the game engine projects it on the floor of the isometric arena itself. Circles are perfect circles, not ellipses.
This is a projectile flying toward the RIGHT of the image: its head is on the right, its trail streams to the left. Keep the head at the same place in every frame (about 65% of the cell width, at mid-height): only the flames, trail and sparks move.
Every frame is drawn at the same scale with the same head position in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white core, fresh leaf-green accent (#95e28c), deep forest-green light (#3f9a5a). Wind, precision, hunting.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## A — Flèche-filet

A : un filet s'ouvre sur l'ennemi touché et immobilise ceux autour. — au sol (vu de dessus), jouée une fois.

**Joindre :** `vfx-2d/rodeur/projectile-rodeur.png`. **Enregistrer :** `vfx-2d/rodeur/voie-filet-rodeur.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Ranger: a longbow, arrows, nets, wind and the hunt.
The effect: a hunting net bursting open seen from above: a round web of glowing pale green-white threads unfolding from the center in a fraction of a second, knots shining at the crossings, then the threads tighten.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
Played once, fast: frames 1 to 2 the effect appears (small, very bright, the anticipation); frames 3 to 6 the burst at its peak (largest, most saturated); frames 7 to 12 it breaks apart into shards, sparks or wisps and loses its color; frames 13 to 16 the last particles fade out; frame 16 is almost empty.
Seen from DIRECTLY ABOVE (top-down, orthographic view, no perspective): the effect lies flat on the ground, exactly like a decal seen from the sky, because the game engine projects it on the floor of the isometric arena itself. Circles are perfect circles, not ellipses.
The effect is centered on the aimed point, at the exact center of the cell.
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white core, fresh leaf-green accent (#95e28c), deep forest-green light (#3f9a5a). Wind, precision, hunting.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## E — Marque du chasseur (boucle)

E : l'ennemi marqué prend 30 % de dégâts en plus ; flotte au-dessus de lui. — debout (vue du jeu), boucle.

**Joindre :** `vfx-2d/rodeur/projectile-rodeur.png`. **Enregistrer :** `vfx-2d/rodeur/voie-chasse-rodeur.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Ranger: a longbow, arrows, nets, wind and the hunt.
The effect: a hunter's mark floating above an enemy: a green crosshair made of four arrowheads pointing to the center inside a thin ring, slowly turning and closing in, pulsing.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
A seamless loop: frame 16 leads back to frame 1 without a jump. The effect keeps the same size and position in every frame; only its inner motion changes (rotation, flicker, drifting particles), so it can be played over and over.
Seen from the game camera: a slightly raised viewpoint about 35 degrees above the horizon, the effect standing upright and facing the viewer, like an effect that rises from the ground in an isometric action RPG. The base of the effect is at the bottom of the cell (about 90% of the cell height).
The effect is centered on the hero, who stands at the exact center of the cell (the hero is NOT drawn).
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white core, fresh leaf-green accent (#95e28c), deep forest-green light (#3f9a5a). Wind, precision, hunting.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## R — Recul

R : bond en arrière en tirant trois flèches. — au sol (vu de dessus), jouée une fois.

**Joindre :** `vfx-2d/rodeur/projectile-rodeur.png`. **Enregistrer :** `vfx-2d/rodeur/voie-recul-rodeur.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Ranger: a longbow, arrows, nets, wind and the hunt.
The effect: a backflip escape: a swirl of green wind and leaves at the left where the hero jumps away, and three thin bright arrow streaks fanning out toward the right.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
Played once, fast: frames 1 to 2 the effect appears (small, very bright, the anticipation); frames 3 to 6 the burst at its peak (largest, most saturated); frames 7 to 12 it breaks apart into shards, sparks or wisps and loses its color; frames 13 to 16 the last particles fade out; frame 16 is almost empty.
Seen from DIRECTLY ABOVE (top-down, orthographic view, no perspective): the effect lies flat on the ground, exactly like a decal seen from the sky, because the game engine projects it on the floor of the isometric arena itself. Circles are perfect circles, not ellipses.
The effect is directional: it points or travels toward the RIGHT of the image. The hero (not drawn) stands at the middle of the LEFT edge of the cell; the attack goes to the right.
Every frame is drawn at the same scale with the same origin on the left edge in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white core, fresh leaf-green accent (#95e28c), deep forest-green light (#3f9a5a). Wind, precision, hunting.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## Voie du Tireur — Volée perçante

F : six traits en éventail qui traversent tout. — au sol (vu de dessus), jouée une fois.

**Joindre :** `vfx-2d/rodeur/projectile-rodeur.png`. **Enregistrer :** `vfx-2d/rodeur/voie-volee-rodeur.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Ranger: a longbow, arrows, nets, wind and the hunt.
The effect: a piercing volley: six thin bright streaks fanning out from the left edge toward the right in a narrow fan, a burst of wind at the bow (left), the streaks stretching long and thin.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
Played once, fast: frames 1 to 2 the effect appears (small, very bright, the anticipation); frames 3 to 6 the burst at its peak (largest, most saturated); frames 7 to 12 it breaks apart into shards, sparks or wisps and loses its color; frames 13 to 16 the last particles fade out; frame 16 is almost empty.
Seen from DIRECTLY ABOVE (top-down, orthographic view, no perspective): the effect lies flat on the ground, exactly like a decal seen from the sky, because the game engine projects it on the floor of the isometric arena itself. Circles are perfect circles, not ellipses.
The effect is directional: it points or travels toward the RIGHT of the image. The hero (not drawn) stands at the middle of the LEFT edge of the cell; the attack goes to the right.
Every frame is drawn at the same scale with the same origin on the left edge in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white core, fresh leaf-green accent (#95e28c), deep forest-green light (#3f9a5a). Wind, precision, hunting.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## Voie de la Cuirasse — Souffle du chasseur

F : le héros inspire, +40 % de dégâts 6 s. — au sol (vu de dessus), jouée une fois.

**Joindre :** `vfx-2d/rodeur/projectile-rodeur.png`. **Enregistrer :** `vfx-2d/rodeur/voie-cri-rodeur.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Ranger: a longbow, arrows, nets, wind and the hunt.
The effect: a hunter's breath: curved gusts of green wind spiralling outward from the hero, a few leaves of light carried by them, a thin calm ring at the end.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
Played once, fast: frames 1 to 2 the effect appears (small, very bright, the anticipation); frames 3 to 6 the burst at its peak (largest, most saturated); frames 7 to 12 it breaks apart into shards, sparks or wisps and loses its color; frames 13 to 16 the last particles fade out; frame 16 is almost empty.
Seen from DIRECTLY ABOVE (top-down, orthographic view, no perspective): the effect lies flat on the ground, exactly like a decal seen from the sky, because the game engine projects it on the floor of the isometric arena itself. Circles are perfect circles, not ellipses.
The effect is centered on the hero, who stands at the exact center of the cell (the hero is NOT drawn).
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white core, fresh leaf-green accent (#95e28c), deep forest-green light (#3f9a5a). Wind, precision, hunting.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## Voie de l'Éclaireur — Le Couloir

F : un couloir posé au sol cloue les yokai 2 s et accélère les alliés. — au sol (vu de dessus), monte, tient, éclate.

**Joindre :** `vfx-2d/rodeur/projectile-rodeur.png`. **Enregistrer :** `vfx-2d/rodeur/voie-couloir-rodeur.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Ranger: a longbow, arrows, nets, wind and the hunt.
The effect: a hunting ground trap seen from above: a circle of glowing green threads pinned by four small stakes of light, wind lines running across it, the threads pulsing while it holds.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
Played once, then held: frames 1 to 4 the effect builds up; frames 5 to 12 it holds at full strength with small pulses; frames 13 to 16 it bursts and fades out.
Seen from DIRECTLY ABOVE (top-down, orthographic view, no perspective): the effect lies flat on the ground, exactly like a decal seen from the sky, because the game engine projects it on the floor of the isometric arena itself. Circles are perfect circles, not ellipses.
The effect is centered on the aimed point, at the exact center of the cell.
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white core, fresh leaf-green accent (#95e28c), deep forest-green light (#3f9a5a). Wind, precision, hunting.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## Voie de la Vigie — Volée d'argile

F : six traits d'argile en éventail. — au sol (vu de dessus), jouée une fois.

**Joindre :** `vfx-2d/rodeur/projectile-rodeur.png`. **Enregistrer :** `vfx-2d/rodeur/voie-argile-rodeur.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Ranger: a longbow, arrows, nets, wind and the hunt.
The effect: a volley of clay: six streaks of baked clay light (#d29a62) fanning out from the left edge toward the right, small fragments of clay breaking off, a puff of ochre dust at the bow. Use clay ochre instead of green.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
Played once, fast: frames 1 to 2 the effect appears (small, very bright, the anticipation); frames 3 to 6 the burst at its peak (largest, most saturated); frames 7 to 12 it breaks apart into shards, sparks or wisps and loses its color; frames 13 to 16 the last particles fade out; frame 16 is almost empty.
Seen from DIRECTLY ABOVE (top-down, orthographic view, no perspective): the effect lies flat on the ground, exactly like a decal seen from the sky, because the game engine projects it on the floor of the isometric arena itself. Circles are perfect circles, not ellipses.
The effect is directional: it points or travels toward the RIGHT of the image. The hero (not drawn) stands at the middle of the LEFT edge of the cell; the attack goes to the right.
Every frame is drawn at the same scale with the same origin on the left edge in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white core, fresh leaf-green accent (#95e28c), deep forest-green light (#3f9a5a). Wind, precision, hunting.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

