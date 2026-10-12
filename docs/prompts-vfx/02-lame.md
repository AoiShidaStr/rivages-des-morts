# 02 — Lame : effets

Dans l'ordre : le premier effet sert ensuite de référence de style (à joindre) pour les suivants. Une conversation neuve par prompt.

## Attaque (double coup de lames)

Clic gauche : un enchaînement rapide des deux lames. — au sol (vu de dessus), jouée une fois.

**Joindre :** rien. **Enregistrer :** `vfx-2d/lame/light-slash-lame-180.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Blade: two short blades, speed, shadows, poison and critical strikes.
The effect: a fast double slash: two thin razor crescent trails crossing a 180-degree arc in front of the hero (arc centered on the right side of the cell), very thin and sharp, white edge and violet body, tiny violet shards.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
Played once, fast: frames 1 to 2 the effect appears (small, very bright, the anticipation); frames 3 to 6 the burst at its peak (largest, most saturated); frames 7 to 12 it breaks apart into shards, sparks or wisps and loses its color; frames 13 to 16 the last particles fade out; frame 16 is almost empty.
Seen from DIRECTLY ABOVE (top-down, orthographic view, no perspective): the effect lies flat on the ground, exactly like a decal seen from the sky, because the game engine projects it on the floor of the isometric arena itself. Circles are perfect circles, not ellipses.
The effect is centered on the hero, who stands at the exact center of the cell (the hero is NOT drawn).
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white core, violet accent (#b796ff), deep indigo light (#6c4fd6). Fast, sharp, silent, shadow and poison.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## Clic droit — Frappe fantôme

Clic droit : le héros disparaît et réapparaît derrière l'ennemi pour le frapper. — debout (vue du jeu), jouée une fois.

**Joindre :** `vfx-2d/lame/light-slash-lame-180.png`. **Enregistrer :** `vfx-2d/lame/voie-fantome-lame.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Blade: two short blades, speed, shadows, poison and critical strikes.
The effect: a shadow step: a burst of violet shadow wisps and shards where the hero vanishes and reappears, a vertical tear of light that opens and snaps shut, then a quick sharp X-shaped cut flash.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
Played once, fast: frames 1 to 2 the effect appears (small, very bright, the anticipation); frames 3 to 6 the burst at its peak (largest, most saturated); frames 7 to 12 it breaks apart into shards, sparks or wisps and loses its color; frames 13 to 16 the last particles fade out; frame 16 is almost empty.
Seen from the game camera: a slightly raised viewpoint about 35 degrees above the horizon, the effect standing upright and facing the viewer, like an effect that rises from the ground in an isometric action RPG. The base of the effect is at the bottom of the cell (about 90% of the cell height).
The effect is centered on the hero, who stands at the exact center of the cell (the hero is NOT drawn).
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white core, violet accent (#b796ff), deep indigo light (#6c4fd6). Fast, sharp, silent, shadow and poison.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## A — Marque de mort (boucle)

A : 5 s, tous les coups sur l'ennemi marqué sont critiques. Flotte au-dessus de l'ennemi. — debout (vue du jeu), boucle.

**Joindre :** `vfx-2d/lame/light-slash-lame-180.png`. **Enregistrer :** `vfx-2d/lame/voie-marque-lame.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Blade: two short blades, speed, shadows, poison and critical strikes.
The effect: a death mark floating above an enemy: a small sharp violet sigil shaped like a crossed pair of blades inside a thin ring, slowly turning and pulsing, a few drifting violet sparks.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
A seamless loop: frame 16 leads back to frame 1 without a jump. The effect keeps the same size and position in every frame; only its inner motion changes (rotation, flicker, drifting particles), so it can be played over and over.
Seen from the game camera: a slightly raised viewpoint about 35 degrees above the horizon, the effect standing upright and facing the viewer, like an effect that rises from the ground in an isometric action RPG. The base of the effect is at the bottom of the cell (about 90% of the cell height).
The effect is centered on the hero, who stands at the exact center of the cell (the hero is NOT drawn).
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white core, violet accent (#b796ff), deep indigo light (#6c4fd6). Fast, sharp, silent, shadow and poison.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## E — Écran de fumée (boucle)

E : un nuage où le héros disparaît 2,5 s ; les yokai attaquent la fumée. — au sol (vu de dessus), boucle.

**Joindre :** `vfx-2d/lame/light-slash-lame-180.png`. **Enregistrer :** `vfx-2d/lame/voie-fumee-lame.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Blade: two short blades, speed, shadows, poison and critical strikes.
The effect: a round cloud of thick swirling smoke seen from above, painted in dim violet and grey-blue light (never black), slowly rolling and curling on itself, a few faint violet sparks inside.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
A seamless loop: frame 16 leads back to frame 1 without a jump. The effect keeps the same size and position in every frame; only its inner motion changes (rotation, flicker, drifting particles), so it can be played over and over.
Seen from DIRECTLY ABOVE (top-down, orthographic view, no perspective): the effect lies flat on the ground, exactly like a decal seen from the sky, because the game engine projects it on the floor of the isometric arena itself. Circles are perfect circles, not ellipses.
The effect is centered on the hero, who stands at the exact center of the cell (the hero is NOT drawn).
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white core, violet accent (#b796ff), deep indigo light (#6c4fd6). Fast, sharp, silent, shadow and poison.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## Nuées toxiques (nuage de poison, boucle)

Passif : l'esquive laisse un nuage de poison. — au sol (vu de dessus), boucle.

**Joindre :** `vfx-2d/lame/light-slash-lame-180.png`. **Enregistrer :** `vfx-2d/lame/voie-nuee-lame.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Blade: two short blades, speed, shadows, poison and critical strikes.
The effect: a round cloud of poison seen from above: sickly green mist (#8fd65a with dim dark-green light) with a violet tint at the edges, slowly churning, tiny bubbles and droplets of venom glinting.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
A seamless loop: frame 16 leads back to frame 1 without a jump. The effect keeps the same size and position in every frame; only its inner motion changes (rotation, flicker, drifting particles), so it can be played over and over.
Seen from DIRECTLY ABOVE (top-down, orthographic view, no perspective): the effect lies flat on the ground, exactly like a decal seen from the sky, because the game engine projects it on the floor of the isometric arena itself. Circles are perfect circles, not ellipses.
The effect is centered on the hero, who stands at the exact center of the cell (the hero is NOT drawn).
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white core, violet accent (#b796ff), deep indigo light (#6c4fd6). Fast, sharp, silent, shadow and poison.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## R — Danse des lames (bond)

R : le héros bondit d'ennemi en ennemi en frappant chacun. — au sol (vu de dessus), jouée une fois.

**Joindre :** `vfx-2d/lame/light-slash-lame-180.png`. **Enregistrer :** `vfx-2d/lame/voie-danse-lame.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Blade: two short blades, speed, shadows, poison and critical strikes.
The effect: a lightning-fast dash between two enemies: a long thin straight streak of violet light from the left edge to the right edge of the cell, with afterimage echoes, ending in a sharp cross-shaped cut flash on the right.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
Played once, fast: frames 1 to 2 the effect appears (small, very bright, the anticipation); frames 3 to 6 the burst at its peak (largest, most saturated); frames 7 to 12 it breaks apart into shards, sparks or wisps and loses its color; frames 13 to 16 the last particles fade out; frame 16 is almost empty.
Seen from DIRECTLY ABOVE (top-down, orthographic view, no perspective): the effect lies flat on the ground, exactly like a decal seen from the sky, because the game engine projects it on the floor of the isometric arena itself. Circles are perfect circles, not ellipses.
The effect is directional: it points or travels toward the RIGHT of the image. The hero (not drawn) stands at the middle of the LEFT edge of the cell; the attack goes to the right.
Every frame is drawn at the same scale with the same origin on the left edge in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white core, violet accent (#b796ff), deep indigo light (#6c4fd6). Fast, sharp, silent, shadow and poison.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## Voies de l'Ombre / de la Chair — Déferlante d'ombres, Cercle de lames

F : les lames tournent autour du héros et coupent tout. — au sol (vu de dessus), jouée une fois.

**Joindre :** `vfx-2d/lame/light-slash-lame-180.png`. **Enregistrer :** `vfx-2d/lame/voie-tourbillon-lame.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Blade: two short blades, speed, shadows, poison and critical strikes.
The effect: a whirlwind of blades: two thin sharp crescent trails orbiting the hero for a turn and a half while spreading outward, white edges and violet bodies, a thin violet motion veil, ending in a ring of flying shards.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
Played once, fast: frames 1 to 2 the effect appears (small, very bright, the anticipation); frames 3 to 6 the burst at its peak (largest, most saturated); frames 7 to 12 it breaks apart into shards, sparks or wisps and loses its color; frames 13 to 16 the last particles fade out; frame 16 is almost empty.
Seen from DIRECTLY ABOVE (top-down, orthographic view, no perspective): the effect lies flat on the ground, exactly like a decal seen from the sky, because the game engine projects it on the floor of the isometric arena itself. Circles are perfect circles, not ellipses.
The effect is centered on the hero, who stands at the exact center of the cell (the hero is NOT drawn).
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white core, violet accent (#b796ff), deep indigo light (#6c4fd6). Fast, sharp, silent, shadow and poison.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## Voie de la Saignée — Croc lente

F : les lames balaient et ralentissent (venin). — au sol (vu de dessus), jouée une fois.

**Joindre :** `vfx-2d/lame/light-slash-lame-180.png`. **Enregistrer :** `vfx-2d/lame/voie-croc-lame.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Blade: two short blades, speed, shadows, poison and critical strikes.
The effect: a venomous sweep: two crescent trails orbiting the hero, their outer edge lined with small sharp fang shapes, green venom droplets flung outward. Use venom green (#8fd65a) with a violet core.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
Played once, fast: frames 1 to 2 the effect appears (small, very bright, the anticipation); frames 3 to 6 the burst at its peak (largest, most saturated); frames 7 to 12 it breaks apart into shards, sparks or wisps and loses its color; frames 13 to 16 the last particles fade out; frame 16 is almost empty.
Seen from DIRECTLY ABOVE (top-down, orthographic view, no perspective): the effect lies flat on the ground, exactly like a decal seen from the sky, because the game engine projects it on the floor of the isometric arena itself. Circles are perfect circles, not ellipses.
The effect is centered on the hero, who stands at the exact center of the cell (the hero is NOT drawn).
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white core, violet accent (#b796ff), deep indigo light (#6c4fd6). Fast, sharp, silent, shadow and poison.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## Voie du Voile — Frappe rouge

F : les lames s'ouvrent en croix. — au sol (vu de dessus), jouée une fois.

**Joindre :** `vfx-2d/lame/light-slash-lame-180.png`. **Enregistrer :** `vfx-2d/lame/voie-croix-lame.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Blade: two short blades, speed, shadows, poison and critical strikes.
The effect: two huge diagonal cuts crossing in an X over the hero, drawn one after the other, then four shorter cuts in a star, a sharp flash at the crossing, shards flying. Use a violet-carmine (#d8649a) with a white core, never orange-red.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
Played once, fast: frames 1 to 2 the effect appears (small, very bright, the anticipation); frames 3 to 6 the burst at its peak (largest, most saturated); frames 7 to 12 it breaks apart into shards, sparks or wisps and loses its color; frames 13 to 16 the last particles fade out; frame 16 is almost empty.
Seen from DIRECTLY ABOVE (top-down, orthographic view, no perspective): the effect lies flat on the ground, exactly like a decal seen from the sky, because the game engine projects it on the floor of the isometric arena itself. Circles are perfect circles, not ellipses.
The effect is centered on the hero, who stands at the exact center of the cell (the hero is NOT drawn).
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white core, violet accent (#b796ff), deep indigo light (#6c4fd6). Fast, sharp, silent, shadow and poison.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

