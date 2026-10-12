# 01 — Guerrier : effets

Dans l'ordre : le premier effet sert ensuite de référence de style (à joindre) pour les suivants. Une conversation neuve par prompt.

## Attaque (coup d'épée en arc)

Clic gauche : un coup d'épée en arc devant le héros. — au sol (vu de dessus), jouée une fois.

**Joindre :** rien. **Enregistrer :** `vfx-2d/guerrier/light-slash-guerrier-150.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Warrior: a heavy sword and a shield, brute strength, stone and dust.
The effect: a heavy sword swing: a thick crescent-shaped slash trail sweeping a 150-degree arc in front of the hero (the arc is centered on the right side of the cell, the hero at the center), thick at the head, tapering to a thin tail, a white core along the cutting edge, amber body, small stone chips and dust flung outward at the end.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
Played once, fast: frames 1 to 2 the effect appears (small, very bright, the anticipation); frames 3 to 6 the burst at its peak (largest, most saturated); frames 7 to 12 it breaks apart into shards, sparks or wisps and loses its color; frames 13 to 16 the last particles fade out; frame 16 is almost empty.
Seen from DIRECTLY ABOVE (top-down, orthographic view, no perspective): the effect lies flat on the ground, exactly like a decal seen from the sky, because the game engine projects it on the floor of the isometric arena itself. Circles are perfect circles, not ellipses.
The effect is centered on the hero, who stands at the exact center of the cell (the hero is NOT drawn).
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white core, warm amber accent (#ffbf5e), deep orange shadows of light (#e0782f). Strength, impact, dust, stone.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## Garde parfaite

Clic droit levé juste avant un coup : blocage parfait. — debout (vue du jeu), jouée une fois.

**Joindre :** `vfx-2d/guerrier/light-slash-guerrier-150.png`. **Enregistrer :** `vfx-2d/guerrier/voie-garde-guerrier.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Warrior: a heavy sword and a shield, brute strength, stone and dust.
The effect: a perfect block: a bright flash where a blow hits the raised shield, a short starburst of white and amber sparks, a half-ring shockwave that bursts outward from the impact point at chest height (center of the cell).
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
Played once, fast: frames 1 to 2 the effect appears (small, very bright, the anticipation); frames 3 to 6 the burst at its peak (largest, most saturated); frames 7 to 12 it breaks apart into shards, sparks or wisps and loses its color; frames 13 to 16 the last particles fade out; frame 16 is almost empty.
Seen from the game camera: a slightly raised viewpoint about 35 degrees above the horizon, the effect standing upright and facing the viewer, like an effect that rises from the ground in an isometric action RPG. The base of the effect is at the bottom of the cell (about 90% of the cell height).
The effect is centered on the hero, who stands at the exact center of the cell (the hero is NOT drawn).
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white core, warm amber accent (#ffbf5e), deep orange shadows of light (#e0782f). Strength, impact, dust, stone.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## A — Frappe fracassante

A : gros coup de zone qui étourdit. — au sol (vu de dessus), jouée une fois.

**Joindre :** `vfx-2d/guerrier/light-slash-guerrier-150.png`. **Enregistrer :** `vfx-2d/guerrier/voie-fracas-guerrier.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Warrior: a heavy sword and a shield, brute strength, stone and dust.
The effect: the sword slammed into the ground: a cracked crater, jagged glowing amber cracks radiating outward, rock fragments thrown out, a ring of dust rolling outward close to the ground.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
Played once, fast: frames 1 to 2 the effect appears (small, very bright, the anticipation); frames 3 to 6 the burst at its peak (largest, most saturated); frames 7 to 12 it breaks apart into shards, sparks or wisps and loses its color; frames 13 to 16 the last particles fade out; frame 16 is almost empty.
Seen from DIRECTLY ABOVE (top-down, orthographic view, no perspective): the effect lies flat on the ground, exactly like a decal seen from the sky, because the game engine projects it on the floor of the isometric arena itself. Circles are perfect circles, not ellipses.
The effect is centered on the hero, who stands at the exact center of the cell (the hero is NOT drawn).
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white core, warm amber accent (#ffbf5e), deep orange shadows of light (#e0782f). Strength, impact, dust, stone.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## E — Bond (atterrissage)

E : le héros saute sur la zone visée et frappe en retombant. — au sol (vu de dessus), jouée une fois.

**Joindre :** `vfx-2d/guerrier/light-slash-guerrier-150.png`. **Enregistrer :** `vfx-2d/guerrier/voie-bond-guerrier.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Warrior: a heavy sword and a shield, brute strength, stone and dust.
The effect: a heavy landing: a round shockwave ring of dust and amber light expanding from the landing point, a few short cracks, small debris bouncing outward.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
Played once, fast: frames 1 to 2 the effect appears (small, very bright, the anticipation); frames 3 to 6 the burst at its peak (largest, most saturated); frames 7 to 12 it breaks apart into shards, sparks or wisps and loses its color; frames 13 to 16 the last particles fade out; frame 16 is almost empty.
Seen from DIRECTLY ABOVE (top-down, orthographic view, no perspective): the effect lies flat on the ground, exactly like a decal seen from the sky, because the game engine projects it on the floor of the isometric arena itself. Circles are perfect circles, not ellipses.
The effect is centered on the hero, who stands at the exact center of the cell (the hero is NOT drawn).
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white core, warm amber accent (#ffbf5e), deep orange shadows of light (#e0782f). Strength, impact, dust, stone.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## R — Frénésie (aura, boucle)

R : 6 s de coups bien plus rapides ; l'aura entoure le héros. — debout (vue du jeu), boucle.

**Joindre :** `vfx-2d/guerrier/light-slash-guerrier-150.png`. **Enregistrer :** `vfx-2d/guerrier/aura-state-rage.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Warrior: a heavy sword and a shield, brute strength, stone and dust.
The effect: a battle-frenzy aura around a standing hero (the hero is not drawn: leave his silhouette empty, about 40% of the cell width and 70% of its height, centered on the bottom): tongues of hot red-orange energy licking upward along the body, small sparks rising, a faint heat ring on the ground. Use deep red (#d9262c) and orange-red (#ff6a4a) instead of amber for this one.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
A seamless loop: frame 16 leads back to frame 1 without a jump. The effect keeps the same size and position in every frame; only its inner motion changes (rotation, flicker, drifting particles), so it can be played over and over.
Seen from the game camera: a slightly raised viewpoint about 35 degrees above the horizon, the effect standing upright and facing the viewer, like an effect that rises from the ground in an isometric action RPG. The base of the effect is at the bottom of the cell (about 90% of the cell height).
The effect is centered on the hero, who stands at the exact center of the cell (the hero is NOT drawn).
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white core, warm amber accent (#ffbf5e), deep orange shadows of light (#e0782f). Strength, impact, dust, stone.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## Voie de la Fureur — Cri de guerre

F : un cri qui renforce le héros 6 s. — au sol (vu de dessus), jouée une fois.

**Joindre :** `vfx-2d/guerrier/light-slash-guerrier-150.png`. **Enregistrer :** `vfx-2d/guerrier/voie-cri-guerrier.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Warrior: a heavy sword and a shield, brute strength, stone and dust.
The effect: a war cry: three concentric rings of jagged energy burst out from the hero one after the other, sharp spikes on the first ring, short radial speed lines, the rings widening and thinning as they fade.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
Played once, fast: frames 1 to 2 the effect appears (small, very bright, the anticipation); frames 3 to 6 the burst at its peak (largest, most saturated); frames 7 to 12 it breaks apart into shards, sparks or wisps and loses its color; frames 13 to 16 the last particles fade out; frame 16 is almost empty.
Seen from DIRECTLY ABOVE (top-down, orthographic view, no perspective): the effect lies flat on the ground, exactly like a decal seen from the sky, because the game engine projects it on the floor of the isometric arena itself. Circles are perfect circles, not ellipses.
The effect is centered on the hero, who stands at the exact center of the cell (the hero is NOT drawn).
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white core, warm amber accent (#ffbf5e), deep orange shadows of light (#e0782f). Strength, impact, dust, stone.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## Voie du Démuni / du Cratère — Ruée, Vague de bouclier

F : onde autour du héros qui projette et étourdit. — au sol (vu de dessus), jouée une fois.

**Joindre :** `vfx-2d/guerrier/light-slash-guerrier-150.png`. **Enregistrer :** `vfx-2d/guerrier/voie-seisme-guerrier.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Warrior: a heavy sword and a shield, brute strength, stone and dust.
The effect: a shield slammed on the ground: the floor splits in a star of glowing amber cracks around the hero, chunks of rock jump out, a low ring of dust races outward to the edge of the cell.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
Played once, fast: frames 1 to 2 the effect appears (small, very bright, the anticipation); frames 3 to 6 the burst at its peak (largest, most saturated); frames 7 to 12 it breaks apart into shards, sparks or wisps and loses its color; frames 13 to 16 the last particles fade out; frame 16 is almost empty.
Seen from DIRECTLY ABOVE (top-down, orthographic view, no perspective): the effect lies flat on the ground, exactly like a decal seen from the sky, because the game engine projects it on the floor of the isometric arena itself. Circles are perfect circles, not ellipses.
The effect is centered on the hero, who stands at the exact center of the cell (the hero is NOT drawn).
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white core, warm amber accent (#ffbf5e), deep orange shadows of light (#e0782f). Strength, impact, dust, stone.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## Voie de la Réplique — Spirale

F : le héros pivote, bouclier tendu, et fauche tout autour. — au sol (vu de dessus), jouée une fois.

**Joindre :** `vfx-2d/guerrier/light-slash-guerrier-150.png`. **Enregistrer :** `vfx-2d/guerrier/voie-tourbillon-guerrier.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Warrior: a heavy sword and a shield, brute strength, stone and dust.
The effect: a spinning sweep: one long thick crescent trail turning a full circle and a half around the hero, widening as it spins, a white edge and amber body, a faint motion veil following it, breaking into shards at the end.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
Played once, fast: frames 1 to 2 the effect appears (small, very bright, the anticipation); frames 3 to 6 the burst at its peak (largest, most saturated); frames 7 to 12 it breaks apart into shards, sparks or wisps and loses its color; frames 13 to 16 the last particles fade out; frame 16 is almost empty.
Seen from DIRECTLY ABOVE (top-down, orthographic view, no perspective): the effect lies flat on the ground, exactly like a decal seen from the sky, because the game engine projects it on the floor of the isometric arena itself. Circles are perfect circles, not ellipses.
The effect is centered on the hero, who stands at the exact center of the cell (the hero is NOT drawn).
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white core, warm amber accent (#ffbf5e), deep orange shadows of light (#e0782f). Strength, impact, dust, stone.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

