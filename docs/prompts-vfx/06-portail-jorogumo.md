# 06 — Portail de Jorōgumo : effets

Dans l'ordre : le premier effet sert ensuite de référence de style (à joindre) pour les suivants. Une conversation neuve par prompt.

## Vortex du portail (boucle)

Le vortex rouge qui tourne au milieu du torii du portail, sur l'île. Seul le vortex : le torii reste celui de la planche actuelle. — debout (vue du jeu), boucle.

**Joindre :** `decor_ile_portail.jpg`. **Enregistrer :** `vfx-2d/jorogumo/portail-vortex.png`

```text
A 2D game visual effect sprite sheet for our isometric action RPG set in the Japanese underworld (Yomi). The portal to the lair of Jorogumo, the spider-woman yokai boss, inside a dark torii gate.
The effect: ONLY the swirling vortex that fills the opening of a torii gate (do not draw the gate): an upright oval portal, taller than wide (width about 75% of its height), facing the viewer, a spiral of crimson and blood-red energy turning around a dark glowing heart (deep red light, never black), thin pale silver spider-silk threads caught in the spiral and stretched across it like a web, a few red motes drifting toward the center. The oval fills about 85% of the cell height, centered. It turns one full turn over the 16 frames.
Output a square 1:1 image at the highest resolution available (2048 x 2048 px if possible). The image is divided into an invisible grid of 4 columns x 4 rows (16 equal square cells). The 16 cells are the 16 frames of ONE animation, read left to right, then top to bottom (frame 1 top-left, frame 16 bottom-right).
A seamless loop: frame 16 leads back to frame 1 without a jump. The effect keeps the same size and position in every frame; only its inner motion changes (rotation, flicker, drifting particles), so it can be played over and over.
Seen from the game camera: a slightly raised viewpoint about 35 degrees above the horizon, the effect standing upright and facing the viewer, like an effect that rises from the ground in an isometric action RPG. The base of the effect is at the bottom of the cell (about 90% of the cell height).
The effect is centered on the hero, who stands at the exact center of the cell (the hero is NOT drawn).
Every frame is drawn at the same scale with the same center point in every cell, so the frames line up perfectly when played. The whole effect stays inside its own cell with an empty black margin around it; nothing touches or crosses a neighbouring cell. Every frame must be clearly different from its neighbours (the animation must move), and no cell is left empty unless asked.
Palette: crimson and vermilion (#e2481c), deep blood red (#7a1d0e), a few thin pale silver threads (#d8dde6). This is an enemy: red is reserved for enemy danger.
Hand-painted anime action-RPG visual effect, in the style of modern 2D action games: clean graphic shapes, a bright white-hot core and one strong accent color, thin sharp tapered streaks, crisp shards and sparks, a short soft glow only around the brightest parts, high contrast, readable at a small size (in the game the whole effect is only 100 to 300 px wide). No outline, no photorealism, no 3D-render look, no noise or film grain, no lens flare, no chromatic aberration.
Attach the current portal sheet (decor_ile_portail.jpg) as a color and size reference: match the red of its vortex and the shape of the opening of the gate, but draw only the vortex.
Pure flat black background (#000000), exactly the same black everywhere, no gradient, no vignette, no stars, no ground, no scenery. The effect is drawn as light over black: the game turns the black into transparency, so anything dark in the effect disappears. Draw smoke, shadows and ink with dim colored light (deep violet, deep blue, dark green…), never with black or near-black, and never add a dark outline.
Only the effect itself: no character, no hand, no weapon, no enemy, no ground texture, no text, no numbers, no letters, no labels, no drawn grid lines, no frame borders, no watermark.
```

