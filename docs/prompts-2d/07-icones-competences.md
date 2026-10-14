# Lot 7 : icônes des compétences du HUD (2 planches 5 × 4, 14 octobre 2026)

La barre de compétences du combat (en bas au centre) montre une icône par compétence. Pour l'instant ce sont des icônes en pixel art (`tools/pixel/competences.mjs`, `npm run icones-pixel`) ; ces deux planches les remplacent par des icônes peintes, dans le même style que celles des objets.

- **Planche 1** : les 15 compétences de classe (une colonne par classe : Guerrier, Sorcier, Lame, Paladin, Rôdeur ; une rangée par touche : A, E, R), puis l'Esquive et le torii générique de la voie. Trois cases restent vides.
- **Planche 2** : la compétence de chacune des 20 voies (une colonne par classe, ses quatre voies de haut en bas).

**Format : image 5:4 (2 560 × 2 048 px si possible), 5 colonnes × 4 rangées de cases carrées, une icône centrée par case**, fond gris clair uni #d4d4d4, comme les planches d'objets. **Joindre :** pour la planche 1, `public/sprites/sprites/competences/reference-planche-1.png` (écrite par `npm run icones-pixel`) : elle donne la place et l'idée de chaque icône. Pour l'aide de style, joindre aussi une planche d'objets déjà réussie et ajouter au début du prompt : « Match the painting style of the second attached image. »

**Enregistrer** dans le dossier des planches d'objets (`sourceDir` de `tools/icones.json`, `~/Pictures/game visual/`) sous `competences_planche_1.png` et `competences_planche_2.png`, puis lancer `npm run icones` : chaque case est découpée dans `public/sprites/competences/<id>.png` (l'ordre des cases est dans `tools/icones.json`). Une icône peinte n'est jamais écrasée par `npm run icones-pixel` ; une voie sans icône peinte garde le torii.

**Si Nano Banana dessine une grille, un cadre ou du texte**, refaire l'image : le découpage a besoin du fond gris uni entre les icônes. Une case vide qui reçoit un dessin n'est pas grave (elle est ignorée).

## Planche 1 — compétences de classe

**Enregistrer :** `competences_planche_1.png`

```text
The attached image is a rough pixel-art layout of a sheet of skill icons for our 2D action RPG, in which dead souls from every mythology fight in a Japanese afterlife (the Yomi). Repaint the whole sheet as finished painted game icons, keeping every icon in its exact cell, with the same idea and main colors as the rough version, but far richer and more readable.
Output a 5:4 landscape image at the highest resolution available (2560 x 2048 px if possible). The image is divided into an invisible grid of 5 columns x 4 rows (20 equal square cells). Each icon is centered in its cell, fills about 70% of the cell, and never touches or crosses the cell edges. Leave cells 18, 19 and 20 completely empty.
Cells are numbered left to right, top to bottom:
1. Shattering strike (warrior): a huge iron-studded kanabo club slamming down diagonally, the ground cracking open under it with orange sparks and flying stone chips.
2. Flame shield (sorcerer): a full ring of roaring orange flames around a bright white-gold core, like a burning protective circle.
3. Death mark (blade): a violet-and-black target sigil, two thin pale violet slashes crossing over it like an X, a faint purple glow.
4. Aura of light (paladin): a radiant golden sun disc with eight sharp rays, warm holy light.
5. Net arrow (ranger): a feathered arrow flying diagonally, a woven rope net unfolding from its head.
6. Leap (warrior): a high arc of dust and wind with a heavy armored boot landing at its end, a small shockwave on landing.
7. Flight of fire (sorcerer): a burst of speed toward the upper right, a trail of small flames left on the ground behind it, a bright flaming arrow shape at the front.
8. Smoke screen (blade): a thick rolling cloud of grey ninja smoke, a small black smoke bomb with a lit fuse half hidden in it.
9. Thrown hammer (paladin): a silver war hammer with a wooden haft spinning through the air, golden motion streaks behind it.
10. Hunter's mark (ranger): an orange hunting crosshair reticle, four sharp ticks around a dark circle, a small glowing center dot.
11. Frenzy (warrior): a roaring crimson flame shaped like a demon's face with two glowing eyes, berserk rage.
12. Great meteor (sorcerer): a blazing meteor falling diagonally from the upper left, a long fiery tail, molten cracks on the rock.
13. Dance of blades (blade): three steel kunai fanned out like a flower, their rings meeting at a small violet gem, gleaming edges.
14. Aegis (paladin): a golden heater shield with a bright round sun boss in its center, polished metal.
15. Recoil (ranger): a backward leap arc toward the lower left, green wind streaks, an arrow being loosed forward from the top of the arc.
16. Dodge: a fast pale-blue spectral after-image swooshing to the right, three motion streaks behind it.
17. Path (subclass): a small vermilion torii gate, crisp and iconic.
Painted 2D game icon style, the same rendering as our item icons: soft painted gradients, a crisp dark outline (about 3 px on a 256 px icon), two-tone cel shading where shadows are tinted toward blue-violet (never black), a soft light from the upper left, metal painted with a single sharp white highlight, saturated readable colors, a strong silhouette that stays readable at 48 px. Each icon is a single object or symbol with no background shape behind it: no circle, no frame, no tile, no plate. If a figure appears, its eyes always look in the direction its body faces.
Flat uniform light grey background (#d4d4d4), exactly the same color everywhere and between all icons, no gradient, no vignette, no cast shadow on the background.
No text, no numbers, no letters, no labels, no drawn grid lines, no cell borders, no frames.
```

## Planche 2 — compétences des voies

**Enregistrer :** `competences_planche_2.png`

```text
A sheet of 20 painted skill icons for our 2D action RPG, in which dead souls from every mythology fight in a Japanese afterlife (the Yomi). Each icon shows one special skill of a hero's chosen path.
Output a 5:4 landscape image at the highest resolution available (2560 x 2048 px if possible). The image is divided into an invisible grid of 5 columns x 4 rows (20 equal square cells). Each icon is centered in its cell, fills about 70% of the cell, and never touches or crosses the cell edges.
Column 1 is the warrior (steel, red and orange), column 2 the sorcerer (fire, orange and gold), column 3 the blade (violet, black and steel), column 4 the paladin (gold and white light), column 5 the ranger (green, wood and leather). Cells are numbered left to right, top to bottom:
1. War cry (warrior): an open-mouthed red oni war mask roaring, orange sound waves bursting out of it.
2. Pillar of fire (sorcerer): a narrow column of fire crashing down onto a glowing burning seal on the ground.
3. Wave of shadows (blade): two black-and-violet blades spinning in a circle, leaving a ring of dark violet smoke.
4. Oath wave (paladin): a raised gauntlet holding up a glowing golden oath scroll, a ring of light around it.
5. Piercing volley (ranger): six arrows fanned out in flight, each one with a bright piercing tip.
6. Rush (warrior): a charging armored shoulder bursting forward, a wide arc of wind and dust swept around it.
7. Blast (sorcerer): a fiery orb exploding outward, a round shockwave of flame.
8. Circle of blades (blade): two curved short swords forming a full circle, steel gleam.
9. Rupture (paladin): a cracked golden halo shattering, holy light bursting out of the cracks.
10. Hunter's breath (ranger): a calm green breath of wind curling around a single focused eye shape, very sharp.
11. Shield wave (warrior): a round iron shield slammed onto the ground, a heavy ring shockwave around it.
12. Seal of vigour (sorcerer): a glowing green-and-gold healing circle drawn on the ground, small leaves rising from it.
13. Slow fang (blade): a dripping venomous fang shaped like a blade, green poison drops.
14. Judgement of arms (paladin): a sword and a hammer crossed over a burst of golden light.
15. The corridor (ranger): a narrow corridor of wooden stakes and taut ropes, seen from above in perspective.
16. Spiral (warrior): a whirling spiral of wind around a shield, motion streaks.
17. Lantern (sorcerer): a paper chōchin lantern glowing red-orange, about to burst, small sparks around it.
18. Red strike (blade): two crimson slashes crossing as a red X, sharp and bright.
19. Song (paladin): a small bronze temple bell ringing, golden musical waves around it.
20. Clay volley (ranger): six clay-tipped arrows fanned out, earthy red-brown heads.
Painted 2D game icon style, the same rendering as our item icons: soft painted gradients, a crisp dark outline (about 3 px on a 256 px icon), two-tone cel shading where shadows are tinted toward blue-violet (never black), a soft light from the upper left, metal painted with a single sharp white highlight, saturated readable colors, a strong silhouette that stays readable at 48 px. Each icon is a single object or symbol with no background shape behind it: no circle, no frame, no tile, no plate. If a figure appears, its eyes always look in the direction its body faces.
Flat uniform light grey background (#d4d4d4), exactly the same color everywhere and between all icons, no gradient, no vignette, no cast shadow on the background.
No text, no numbers, no letters, no labels, no drawn grid lines, no cell borders, no frames.
```
