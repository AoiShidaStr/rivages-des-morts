# 03 — Paladin : effets

Dans l'ordre : le premier effet sert ensuite de référence de style (à joindre) pour les suivants. Une conversation neuve par prompt.

## Attaque (coup de marteau)

Clic gauche : un coup de marteau en arc. — au sol (vu de dessus), jouée une fois.

**Joindre :** rien. **Enregistrer :** `vfx-2d/paladin/light-slash-paladin-150.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Paladin: a war hammer and a large shield, sacred golden light, protection and healing.
The effect: a heavy hammer swing: a wide thick crescent trail sweeping a 150-degree arc in front of the hero (arc centered on the right side of the cell), white edge, pale gold body, small golden motes at the end.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
Played once, fast: frames 1 to 2 the effect appears (small, very bright, the anticipation); frames 3 to 6 the burst at its peak (largest, most saturated); frames 7 to 12 it breaks apart into shards, sparks or wisps and loses its color; frames 13 to 16 the last particles fade out; frame 16 is almost empty.
Seen from DIRECTLY ABOVE (top-down, orthographic view, no perspective): the effect lies flat on the ground, exactly like a decal seen from the sky, because the game engine projects it on the floor of the isometric arena itself. Circles are perfect circles, not ellipses.
The effect is centered on the hero, who stands at the exact center of the cell (the hero is NOT drawn).
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: pure white core, pale gold accent (#ffe28f), deep gold light (#d6a73c). Sacred, solemn, protective light.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## Clic droit — Bouclier levé (coup bloqué)

Clic droit tenu : chaque coup bloqué fait jaillir la lumière du bouclier. — debout (vue du jeu), jouée une fois.

**Joindre :** `vfx-2d/paladin/light-slash-paladin-150.png`. **Enregistrer :** `vfx-2d/paladin/voie-blocage-paladin.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Paladin: a war hammer and a large shield, sacred golden light, protection and healing.
The effect: a blow stopped by a holy shield: a flash of white and gold light shaped like a curved shield surface at chest height, a burst of golden sparks and a small hexagonal light pattern rippling across it.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
Played once, fast: frames 1 to 2 the effect appears (small, very bright, the anticipation); frames 3 to 6 the burst at its peak (largest, most saturated); frames 7 to 12 it breaks apart into shards, sparks or wisps and loses its color; frames 13 to 16 the last particles fade out; frame 16 is almost empty.
Seen from the game camera: a slightly raised viewpoint about 35 degrees above the horizon, the effect standing upright and facing the viewer, like an effect that rises from the ground in an isometric action RPG. The base of the effect is at the bottom of the cell (about 90% of the cell height).
The effect is centered on the hero, who stands at the exact center of the cell (the hero is NOT drawn).
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: pure white core, pale gold accent (#ffe28f), deep gold light (#d6a73c). Sacred, solemn, protective light.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## Jugement (onde sacrée)

Passif : ferveur pleine, le coup suivant libère une onde sacrée. — au sol (vu de dessus), jouée une fois.

**Joindre :** `vfx-2d/paladin/light-slash-paladin-150.png`. **Enregistrer :** `vfx-2d/paladin/voie-jugement-paladin.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Paladin: a war hammer and a large shield, sacred golden light, protection and healing.
The effect: a sacred shockwave: a perfect golden ring of light racing outward from the hero, with thin rays and a few small floating sacred glyphs on the ring, a white flash at the start.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
Played once, fast: frames 1 to 2 the effect appears (small, very bright, the anticipation); frames 3 to 6 the burst at its peak (largest, most saturated); frames 7 to 12 it breaks apart into shards, sparks or wisps and loses its color; frames 13 to 16 the last particles fade out; frame 16 is almost empty.
Seen from DIRECTLY ABOVE (top-down, orthographic view, no perspective): the effect lies flat on the ground, exactly like a decal seen from the sky, because the game engine projects it on the floor of the isometric arena itself. Circles are perfect circles, not ellipses.
The effect is centered on the hero, who stands at the exact center of the cell (the hero is NOT drawn).
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: pure white core, pale gold accent (#ffe28f), deep gold light (#d6a73c). Sacred, solemn, protective light.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## A — Aura de lumière (boucle)

A : 6 s, une aura suit le héros et soigne les alliés proches. — au sol (vu de dessus), boucle.

**Joindre :** `vfx-2d/paladin/light-slash-paladin-150.png`. **Enregistrer :** `vfx-2d/paladin/aura-loop.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Paladin: a war hammer and a large shield, sacred golden light, protection and healing.
The effect: a healing aura around the hero: a thin bright golden circle on the ground with three bright sparks running along it, a very light golden veil inside, small motes of light rising.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
A seamless loop: frame 16 leads back to frame 1 without a jump. The effect keeps the same size and position in every frame; only its inner motion changes (rotation, flicker, drifting particles), so it can be played over and over.
Seen from DIRECTLY ABOVE (top-down, orthographic view, no perspective): the effect lies flat on the ground, exactly like a decal seen from the sky, because the game engine projects it on the floor of the isometric arena itself. Circles are perfect circles, not ellipses.
The effect is centered on the hero, who stands at the exact center of the cell (the hero is NOT drawn).
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: pure white core, pale gold accent (#ffe28f), deep gold light (#d6a73c). Sacred, solemn, protective light.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## E — Marteau lancé (en vol, boucle)

E : le marteau part vers la souris et revient. — au sol (vu de dessus), boucle.

**Joindre :** `vfx-2d/paladin/light-slash-paladin-150.png`. **Enregistrer :** `vfx-2d/paladin/hammer.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Paladin: a war hammer and a large shield, sacred golden light, protection and healing.
The effect: a spinning thrown war hammer seen from above, glowing with sacred light: the hammer itself painted (steel head, golden runes) turning a full turn over the 16 frames, a circular golden motion blur ring around it. The hammer is the only object allowed here.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
A seamless loop: frame 16 leads back to frame 1 without a jump. The effect keeps the same size and position in every frame; only its inner motion changes (rotation, flicker, drifting particles), so it can be played over and over.
Seen from DIRECTLY ABOVE (top-down, orthographic view, no perspective): the effect lies flat on the ground, exactly like a decal seen from the sky, because the game engine projects it on the floor of the isometric arena itself. Circles are perfect circles, not ellipses.
The effect is centered on the hero, who stands at the exact center of the cell (the hero is NOT drawn).
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: pure white core, pale gold accent (#ffe28f), deep gold light (#d6a73c). Sacred, solemn, protective light.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## R — Égide (dôme)

R : l'Égide se pose sur un allié et retire 60 % de ses dégâts. — debout (vue du jeu), monte, tient, éclate.

**Joindre :** `vfx-2d/paladin/light-slash-paladin-150.png`. **Enregistrer :** `vfx-2d/paladin/dome-aegis.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Paladin: a war hammer and a large shield, sacred golden light, protection and healing.
The effect: a protective dome appearing over an ally (not drawn): a translucent half-sphere of golden light built from thin hexagonal panels, forming from the ground up, a bright rim, a sacred sigil glowing on the ground under it.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
Played once, then held: frames 1 to 4 the effect builds up; frames 5 to 12 it holds at full strength with small pulses; frames 13 to 16 it bursts and fades out.
Seen from the game camera: a slightly raised viewpoint about 35 degrees above the horizon, the effect standing upright and facing the viewer, like an effect that rises from the ground in an isometric action RPG. The base of the effect is at the bottom of the cell (about 90% of the cell height).
The effect is centered on the hero, who stands at the exact center of the cell (the hero is NOT drawn).
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: pure white core, pale gold accent (#ffe28f), deep gold light (#d6a73c). Sacred, solemn, protective light.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## Voies du Serment / du Chantre — Onde du serment, Chant

F : un serment ou un chant qui renforce le héros. — au sol (vu de dessus), jouée une fois.

**Joindre :** `vfx-2d/paladin/light-slash-paladin-150.png`. **Enregistrer :** `vfx-2d/paladin/voie-cri-paladin.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Paladin: a war hammer and a large shield, sacred golden light, protection and healing.
The effect: an oath of light: three thin golden rings expanding one after the other from the hero, twelve thin rays of light between them, a white flash at the center.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
Played once, fast: frames 1 to 2 the effect appears (small, very bright, the anticipation); frames 3 to 6 the burst at its peak (largest, most saturated); frames 7 to 12 it breaks apart into shards, sparks or wisps and loses its color; frames 13 to 16 the last particles fade out; frame 16 is almost empty.
Seen from DIRECTLY ABOVE (top-down, orthographic view, no perspective): the effect lies flat on the ground, exactly like a decal seen from the sky, because the game engine projects it on the floor of the isometric arena itself. Circles are perfect circles, not ellipses.
The effect is centered on the hero, who stands at the exact center of the cell (the hero is NOT drawn).
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: pure white core, pale gold accent (#ffe28f), deep gold light (#d6a73c). Sacred, solemn, protective light.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

## Voies du Parjure / de l'Évêque — Rupture, Jugement d'armes

F : une onde sacrée fauche tout autour du héros. — au sol (vu de dessus), jouée une fois.

**Joindre :** `vfx-2d/paladin/light-slash-paladin-150.png`. **Enregistrer :** `vfx-2d/paladin/voie-nova-paladin.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The Paladin: a war hammer and a large shield, sacred golden light, protection and healing.
The effect: a breaking oath: a golden ring expands and cracks into six arcs, while twelve swords of light fall from outside the ring and plant themselves on it, pointing outward, then everything fades.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
Played once, fast: frames 1 to 2 the effect appears (small, very bright, the anticipation); frames 3 to 6 the burst at its peak (largest, most saturated); frames 7 to 12 it breaks apart into shards, sparks or wisps and loses its color; frames 13 to 16 the last particles fade out; frame 16 is almost empty.
Seen from DIRECTLY ABOVE (top-down, orthographic view, no perspective): the effect lies flat on the ground, exactly like a decal seen from the sky, because the game engine projects it on the floor of the isometric arena itself. Circles are perfect circles, not ellipses.
The effect is centered on the hero, who stands at the exact center of the cell (the hero is NOT drawn).
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: pure white core, pale gold accent (#ffe28f), deep gold light (#d6a73c). Sacred, solemn, protective light.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
The attached image is another effect of the same class: keep exactly the same art style, colors, level of detail and brightness, but draw the new effect described here.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

