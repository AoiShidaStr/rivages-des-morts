# 05 — Sorcier : effets

Dans l'ordre : le premier effet sert ensuite de référence de style (à joindre) pour les suivants. Une conversation neuve par prompt.

## Boule de feu (en vol, boucle)

Clic gauche : une salve de trois boules de feu guidées. — au sol (vu de dessus), boucle.

**Joindre :** rien. **Enregistrer :** `vfx-2d/sorcier/brand-fireball.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Sorcerer: an onmyoji fire mage, paper talismans (ofuda), seals and meteors.
The effect: a fireball in flight seen from above: a bright white-hot head, flames whipping backward into a comet tail, embers and a little dark-red smoke at the end of the tail.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
A seamless loop: frame 16 leads back to frame 1 without a jump. The effect keeps the same size and position in every frame; only its inner motion changes (rotation, flicker, drifting particles), so it can be played over and over.
Seen from DIRECTLY ABOVE (top-down, orthographic view, no perspective): the effect lies flat on the ground, exactly like a decal seen from the sky, because the game engine projects it on the floor of the isometric arena itself. Circles are perfect circles, not ellipses.
This is a projectile flying toward the RIGHT of the image: its head is on the right, its trail streams to the left. Keep the head at the same place in every frame (about 65% of the cell width, at mid-height): only the flames, trail and sparks move.
Every frame is drawn at the same scale with the same head position in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white-hot core, yellow (#ffe066), orange (#ff9a2e), deep red edges (#e2481c). Onmyoji fire magic.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
Fire is the signature of this class and may be richer than the other effects: thick stylised layered flames (dark red at the edges, then orange, yellow and a white-hot core), bright glowing embers, a warm glow, like the fire mage of a MOBA, but still clean painted shapes, not a photographic fire.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## Voie de l'Orbe — l'orbe (en vol, boucle)

Clic gauche (voie de l'Orbe) : un seul orbe, lent à revenir, qui efface ce qu'il touche. — au sol (vu de dessus), boucle.

**Joindre :** `vfx-2d/sorcier/brand-fireball.png`. **Enregistrer :** `vfx-2d/sorcier/brand-orb.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Sorcerer: an onmyoji fire mage, paper talismans (ofuda), seals and meteors.
The effect: a small sun in flight seen from above, the sun of Amaterasu: a round dense white-gold sphere with two plasma arcs turning inside, a thin bright ring around it like a sacred mirror, a crown of short flames turning around the sphere, only a very short trail of embers. Round and compact: it must look completely different from a comet-like fireball.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
A seamless loop: frame 16 leads back to frame 1 without a jump. The effect keeps the same size and position in every frame; only its inner motion changes (rotation, flicker, drifting particles), so it can be played over and over.
Seen from DIRECTLY ABOVE (top-down, orthographic view, no perspective): the effect lies flat on the ground, exactly like a decal seen from the sky, because the game engine projects it on the floor of the isometric arena itself. Circles are perfect circles, not ellipses.
This is a projectile flying toward the RIGHT of the image: its head is on the right, its trail streams to the left. Keep the head at the same place in every frame (about 65% of the cell width, at mid-height): only the flames, trail and sparks move.
Every frame is drawn at the same scale with the same head position in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white-hot core, yellow (#ffe066), orange (#ff9a2e), deep red edges (#e2481c). Onmyoji fire magic.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
Fire is the signature of this class and may be richer than the other effects: thick stylised layered flames (dark red at the edges, then orange, yellow and a white-hot core), bright glowing embers, a warm glow, like the fire mage of a MOBA, but still clean painted shapes, not a photographic fire.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## Explosion au contact

La boule de feu éclate au contact. — debout (vue du jeu), jouée une fois.

**Joindre :** `vfx-2d/sorcier/brand-fireball.png`. **Enregistrer :** `vfx-2d/sorcier/brand-pop.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Sorcerer: an onmyoji fire mage, paper talismans (ofuda), seals and meteors.
The effect: a small fire explosion at chest height: a hot white flash, tongues of flame bursting in all directions, embers flying, a puff of dark-red smoke rising at the end.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
Played once, fast: frames 1 to 2 the effect appears (small, very bright, the anticipation); frames 3 to 6 the burst at its peak (largest, most saturated); frames 7 to 12 it breaks apart into shards, sparks or wisps and loses its color; frames 13 to 16 the last particles fade out; frame 16 is almost empty.
Seen from the game camera: a slightly raised viewpoint about 35 degrees above the horizon, the effect standing upright and facing the viewer, like an effect that rises from the ground in an isometric action RPG. The base of the effect is at the bottom of the cell (about 90% of the cell height).
The effect is centered on the hero, who stands at the exact center of the cell (the hero is NOT drawn).
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white-hot core, yellow (#ffe066), orange (#ff9a2e), deep red edges (#e2481c). Onmyoji fire magic.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
Fire is the signature of this class and may be richer than the other effects: thick stylised layered flames (dark red at the edges, then orange, yellow and a white-hot core), bright glowing embers, a warm glow, like the fire mage of a MOBA, but still clean painted shapes, not a photographic fire.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## Clic droit — Sceau (cercle qui se trace)

Clic droit : un sceau sous la souris explose au bout d'1 s. — au sol (vu de dessus), monte, tient, éclate.

**Joindre :** `vfx-2d/sorcier/brand-fireball.png`. **Enregistrer :** `vfx-2d/sorcier/brand-rune.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Sorcerer: an onmyoji fire mage, paper talismans (ofuda), seals and meteors.
The effect: an onmyoji fire seal drawn on the ground: a circle of fire with a five-pointed star (seiman) and small talisman glyphs being traced line by line during frames 1 to 9, then the whole seal pulses brightly during frames 10 to 16.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
Played once, then held: frames 1 to 4 the effect builds up; frames 5 to 12 it holds at full strength with small pulses; frames 13 to 16 it bursts and fades out.
Seen from DIRECTLY ABOVE (top-down, orthographic view, no perspective): the effect lies flat on the ground, exactly like a decal seen from the sky, because the game engine projects it on the floor of the isometric arena itself. Circles are perfect circles, not ellipses.
The effect is centered on the aimed point, at the exact center of the cell.
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white-hot core, yellow (#ffe066), orange (#ff9a2e), deep red edges (#e2481c). Onmyoji fire magic.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
Fire is the signature of this class and may be richer than the other effects: thick stylised layered flames (dark red at the edges, then orange, yellow and a white-hot core), bright glowing embers, a warm glow, like the fire mage of a MOBA, but still clean painted shapes, not a photographic fire.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## Sceau — colonne de feu

L'explosion du sceau. — debout (vue du jeu), jouée une fois.

**Joindre :** `vfx-2d/sorcier/brand-fireball.png`. **Enregistrer :** `vfx-2d/sorcier/brand-pillar.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Sorcerer: an onmyoji fire mage, paper talismans (ofuda), seals and meteors.
The effect: a pillar of fire erupting from the ground: a column of flames shooting up to the top of the cell, spiralling, then collapsing into embers and smoke.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
Played once, fast: frames 1 to 2 the effect appears (small, very bright, the anticipation); frames 3 to 6 the burst at its peak (largest, most saturated); frames 7 to 12 it breaks apart into shards, sparks or wisps and loses its color; frames 13 to 16 the last particles fade out; frame 16 is almost empty.
Seen from the game camera: a slightly raised viewpoint about 35 degrees above the horizon, the effect standing upright and facing the viewer, like an effect that rises from the ground in an isometric action RPG. The base of the effect is at the bottom of the cell (about 90% of the cell height).
The effect is centered on the hero, who stands at the exact center of the cell (the hero is NOT drawn).
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white-hot core, yellow (#ffe066), orange (#ff9a2e), deep red edges (#e2481c). Onmyoji fire magic.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
Fire is the signature of this class and may be richer than the other effects: thick stylised layered flames (dark red at the edges, then orange, yellow and a white-hot core), bright glowing embers, a warm glow, like the fire mage of a MOBA, but still clean painted shapes, not a photographic fire.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## A — Bouclier de flammes (boucle)

A : un bouclier de feu autour du héros, qui brûle les yokai. — au sol (vu de dessus), boucle.

**Joindre :** `vfx-2d/sorcier/brand-fireball.png`. **Enregistrer :** `vfx-2d/sorcier/brand-ring.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Sorcerer: an onmyoji fire mage, paper talismans (ofuda), seals and meteors.
The effect: a ring of fire around the hero seen from above: a circle of flame tongues standing all around, turning slowly, a hot white rim, a faint warm glow inside.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
A seamless loop: frame 16 leads back to frame 1 without a jump. The effect keeps the same size and position in every frame; only its inner motion changes (rotation, flicker, drifting particles), so it can be played over and over.
Seen from DIRECTLY ABOVE (top-down, orthographic view, no perspective): the effect lies flat on the ground, exactly like a decal seen from the sky, because the game engine projects it on the floor of the isometric arena itself. Circles are perfect circles, not ellipses.
The effect is centered on the hero, who stands at the exact center of the cell (the hero is NOT drawn).
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white-hot core, yellow (#ffe066), orange (#ff9a2e), deep red edges (#e2481c). Onmyoji fire magic.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
Fire is the signature of this class and may be richer than the other effects: thick stylised layered flames (dark red at the edges, then orange, yellow and a white-hot core), bright glowing embers, a warm glow, like the fire mage of a MOBA, but still clean painted shapes, not a photographic fire.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## E — Fuite de feu (traînée)

E : le héros bondit en laissant une traînée qui brûle. — au sol (vu de dessus), jouée une fois.

**Joindre :** `vfx-2d/sorcier/brand-fireball.png`. **Enregistrer :** `vfx-2d/sorcier/brand-trail.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Sorcerer: an onmyoji fire mage, paper talismans (ofuda), seals and meteors.
The effect: a dash of fire: a long streak of flames from the left edge to the right edge, the flames rising behind the dash, embers scattering.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
Played once, fast: frames 1 to 2 the effect appears (small, very bright, the anticipation); frames 3 to 6 the burst at its peak (largest, most saturated); frames 7 to 12 it breaks apart into shards, sparks or wisps and loses its color; frames 13 to 16 the last particles fade out; frame 16 is almost empty.
Seen from DIRECTLY ABOVE (top-down, orthographic view, no perspective): the effect lies flat on the ground, exactly like a decal seen from the sky, because the game engine projects it on the floor of the isometric arena itself. Circles are perfect circles, not ellipses.
The effect is directional: it points or travels toward the RIGHT of the image. The hero (not drawn) stands at the middle of the LEFT edge of the cell; the attack goes to the right.
Every frame is drawn at the same scale with the same origin on the left edge in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white-hot core, yellow (#ffe066), orange (#ff9a2e), deep red edges (#e2481c). Onmyoji fire magic.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
Fire is the signature of this class and may be richer than the other effects: thick stylised layered flames (dark red at the edges, then orange, yellow and a white-hot core), bright glowing embers, a warm glow, like the fire mage of a MOBA, but still clean painted shapes, not a photographic fire.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## Sol brûlant (boucle)

La traînée et la Colonne ardente laissent un sol brûlant. — au sol (vu de dessus), boucle.

**Joindre :** `vfx-2d/sorcier/brand-fireball.png`. **Enregistrer :** `vfx-2d/sorcier/brand-embers.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Sorcerer: an onmyoji fire mage, paper talismans (ofuda), seals and meteors.
The effect: a patch of burning ground seen from above: glowing molten cracks that pulse, small flames licking up here and there, sparks.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
A seamless loop: frame 16 leads back to frame 1 without a jump. The effect keeps the same size and position in every frame; only its inner motion changes (rotation, flicker, drifting particles), so it can be played over and over.
Seen from DIRECTLY ABOVE (top-down, orthographic view, no perspective): the effect lies flat on the ground, exactly like a decal seen from the sky, because the game engine projects it on the floor of the isometric arena itself. Circles are perfect circles, not ellipses.
The effect is centered on the hero, who stands at the exact center of the cell (the hero is NOT drawn).
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white-hot core, yellow (#ffe066), orange (#ff9a2e), deep red edges (#e2481c). Onmyoji fire magic.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
Fire is the signature of this class and may be richer than the other effects: thick stylised layered flames (dark red at the edges, then orange, yellow and a white-hot core), bright glowing embers, a warm glow, like the fire mage of a MOBA, but still clean painted shapes, not a photographic fire.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## R — Grand météore (chute)

R : un météore s'écrase sous la souris au bout de 2 s. — debout (vue du jeu), jouée une fois.

**Joindre :** `vfx-2d/sorcier/brand-fireball.png`. **Enregistrer :** `vfx-2d/sorcier/brand-comet.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Sorcerer: an onmyoji fire mage, paper talismans (ofuda), seals and meteors.
The effect: a meteor falling from the sky: a burning rock with a huge flaming tail coming down from the top of the cell to the bottom, slightly diagonal, hitting the ground in the last frames with a white flash.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
Played once, fast: frames 1 to 2 the effect appears (small, very bright, the anticipation); frames 3 to 6 the burst at its peak (largest, most saturated); frames 7 to 12 it breaks apart into shards, sparks or wisps and loses its color; frames 13 to 16 the last particles fade out; frame 16 is almost empty.
Seen from the game camera: a slightly raised viewpoint about 35 degrees above the horizon, the effect standing upright and facing the viewer, like an effect that rises from the ground in an isometric action RPG. The base of the effect is at the bottom of the cell (about 90% of the cell height).
The effect is centered on the hero, who stands at the exact center of the cell (the hero is NOT drawn).
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white-hot core, yellow (#ffe066), orange (#ff9a2e), deep red edges (#e2481c). Onmyoji fire magic.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
Fire is the signature of this class and may be richer than the other effects: thick stylised layered flames (dark red at the edges, then orange, yellow and a white-hot core), bright glowing embers, a warm glow, like the fire mage of a MOBA, but still clean painted shapes, not a photographic fire.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## Grand météore — impact au sol

L'impact du météore. — au sol (vu de dessus), jouée une fois.

**Joindre :** `vfx-2d/sorcier/brand-fireball.png`. **Enregistrer :** `vfx-2d/sorcier/brand-scorch.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Sorcerer: an onmyoji fire mage, paper talismans (ofuda), seals and meteors.
The effect: a meteor impact seen from above: a white-hot blast, a scorched crater with molten cracks, a ring of fire and smoke rushing outward, embers.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
Played once, fast: frames 1 to 2 the effect appears (small, very bright, the anticipation); frames 3 to 6 the burst at its peak (largest, most saturated); frames 7 to 12 it breaks apart into shards, sparks or wisps and loses its color; frames 13 to 16 the last particles fade out; frame 16 is almost empty.
Seen from DIRECTLY ABOVE (top-down, orthographic view, no perspective): the effect lies flat on the ground, exactly like a decal seen from the sky, because the game engine projects it on the floor of the isometric arena itself. Circles are perfect circles, not ellipses.
The effect is centered on the hero, who stands at the exact center of the cell (the hero is NOT drawn).
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white-hot core, yellow (#ffe066), orange (#ff9a2e), deep red edges (#e2481c). Onmyoji fire magic.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
Fire is the signature of this class and may be richer than the other effects: thick stylised layered flames (dark red at the edges, then orange, yellow and a white-hot core), bright glowing embers, a warm glow, like the fire mage of a MOBA, but still clean painted shapes, not a photographic fire.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## Voie de l'Orbe — Déflagration

F : l'orbe éclate autour du héros. — au sol (vu de dessus), jouée une fois.

**Joindre :** `vfx-2d/sorcier/brand-fireball.png`. **Enregistrer :** `vfx-2d/sorcier/voie-nova-sorcier.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Sorcerer: an onmyoji fire mage, paper talismans (ofuda), seals and meteors.
The effect: a fire nova: a crown of flames bursting outward from the hero in a perfect ring, a white-hot flash at the start, embers scattering, the ring fading as it widens.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
Played once, fast: frames 1 to 2 the effect appears (small, very bright, the anticipation); frames 3 to 6 the burst at its peak (largest, most saturated); frames 7 to 12 it breaks apart into shards, sparks or wisps and loses its color; frames 13 to 16 the last particles fade out; frame 16 is almost empty.
Seen from DIRECTLY ABOVE (top-down, orthographic view, no perspective): the effect lies flat on the ground, exactly like a decal seen from the sky, because the game engine projects it on the floor of the isometric arena itself. Circles are perfect circles, not ellipses.
The effect is centered on the hero, who stands at the exact center of the cell (the hero is NOT drawn).
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white-hot core, yellow (#ffe066), orange (#ff9a2e), deep red edges (#e2481c). Onmyoji fire magic.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
Fire is the signature of this class and may be richer than the other effects: thick stylised layered flames (dark red at the edges, then orange, yellow and a white-hot core), bright glowing embers, a warm glow, like the fire mage of a MOBA, but still clean painted shapes, not a photographic fire.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## Voie de l'Embrasement — Colonne ardente

F : une colonne de feu s'abat sous la souris, sol brûlant 3 s. — debout (vue du jeu), jouée une fois.

**Joindre :** `vfx-2d/sorcier/brand-fireball.png`. **Enregistrer :** `vfx-2d/sorcier/voie-colonne-sorcier.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Sorcerer: an onmyoji fire mage, paper talismans (ofuda), seals and meteors.
The effect: a column of fire falling from the sky onto the ground: a thick vertical beam of flame crashing down, a burst of fire spreading at its base, then the column breaks into rising embers.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
Played once, fast: frames 1 to 2 the effect appears (small, very bright, the anticipation); frames 3 to 6 the burst at its peak (largest, most saturated); frames 7 to 12 it breaks apart into shards, sparks or wisps and loses its color; frames 13 to 16 the last particles fade out; frame 16 is almost empty.
Seen from the game camera: a slightly raised viewpoint about 35 degrees above the horizon, the effect standing upright and facing the viewer, like an effect that rises from the ground in an isometric action RPG. The base of the effect is at the bottom of the cell (about 90% of the cell height).
The effect is centered on the hero, who stands at the exact center of the cell (the hero is NOT drawn).
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white-hot core, yellow (#ffe066), orange (#ff9a2e), deep red edges (#e2481c). Onmyoji fire magic.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
Fire is the signature of this class and may be richer than the other effects: thick stylised layered flames (dark red at the edges, then orange, yellow and a white-hot core), bright glowing embers, a warm glow, like the fire mage of a MOBA, but still clean painted shapes, not a photographic fire.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## Voie du Lampion — Lampion

F : une lanterne posée sous la souris explose au bout d'1 s. — debout (vue du jeu), monte, tient, éclate.

**Joindre :** `vfx-2d/sorcier/brand-fireball.png`. **Enregistrer :** `vfx-2d/sorcier/voie-lanterne-sorcier.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Sorcerer: an onmyoji fire mage, paper talismans (ofuda), seals and meteors.
The effect: a paper lantern (chochin) that drops into place, glows brighter and brighter from the inside with fire, swells and shakes, and bursts into flames in the last frames. The lantern itself is painted (pale paper, dark ribs drawn in dim brown light, the kanji 火 on it), the only object allowed here.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
Played once, then held: frames 1 to 4 the effect builds up; frames 5 to 12 it holds at full strength with small pulses; frames 13 to 16 it bursts and fades out.
Seen from the game camera: a slightly raised viewpoint about 35 degrees above the horizon, the effect standing upright and facing the viewer, like an effect that rises from the ground in an isometric action RPG. The base of the effect is at the bottom of the cell (about 90% of the cell height).
The effect is centered on the hero, who stands at the exact center of the cell (the hero is NOT drawn).
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white-hot core, yellow (#ffe066), orange (#ff9a2e), deep red edges (#e2481c). Onmyoji fire magic.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
Fire is the signature of this class and may be richer than the other effects: thick stylised layered flames (dark red at the edges, then orange, yellow and a white-hot core), bright glowing embers, a warm glow, like the fire mage of a MOBA, but still clean painted shapes, not a photographic fire.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## Voie de la Dryade — Sceau de vigueur

F : un cercle de vigueur qui soigne les héros et brûle les yokai. — au sol (vu de dessus), monte, tient, éclate.

**Joindre :** `vfx-2d/sorcier/brand-fireball.png`. **Enregistrer :** `vfx-2d/sorcier/voie-feuillage-sorcier.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Sorcerer: an onmyoji fire mage, paper talismans (ofuda), seals and meteors.
The effect: a circle of vigour seen from above: a vine of jade light tracing a circle, leaves of light sprouting along it, small warm embers mixed with pale green petals rising. Use jade green (#6fcf8e) with a warm orange core for this one.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
Played once, then held: frames 1 to 4 the effect builds up; frames 5 to 12 it holds at full strength with small pulses; frames 13 to 16 it bursts and fades out.
Seen from DIRECTLY ABOVE (top-down, orthographic view, no perspective): the effect lies flat on the ground, exactly like a decal seen from the sky, because the game engine projects it on the floor of the isometric arena itself. Circles are perfect circles, not ellipses.
The effect is centered on the aimed point, at the exact center of the cell.
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: white-hot core, yellow (#ffe066), orange (#ff9a2e), deep red edges (#e2481c). Onmyoji fire magic.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
Fire is the signature of this class and may be richer than the other effects: thick stylised layered flames (dark red at the edges, then orange, yellow and a white-hot core), bright glowing embers, a warm glow, like the fire mage of a MOBA, but still clean painted shapes, not a photographic fire.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

