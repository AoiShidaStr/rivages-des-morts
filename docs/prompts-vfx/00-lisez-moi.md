# Prompts des effets (VFX)

Écrits par `npm run prompts-vfx` (tools/prompts-vfx.mjs) : ne pas modifier à la main, changer le générateur.

## Le format

- **Une planche = un effet** : 16 images en grille **4 × 4**, image carrée **2 048 px** si possible (cases de 512 px), lue de gauche à droite puis de haut en bas.
- **Fond noir pur** : l'effet est dessiné comme de la lumière. L'import transformera le noir en transparence : tout ce qui est sombre dans l'effet disparaît, donc ni contour noir ni fumée noire (fumée et ombres en lumière colorée sombre).
- **Au sol ou debout** :
  - au sol (vu de dessus) : les effets posés par terre (arcs d'attaque, ondes, cercles, projectiles) — le moteur les projette lui-même sur le sol en perspective ;
  - debout (vue du jeu, caméra à 35°) : ce qui monte du sol (explosions, colonnes, auras, marques au-dessus des ennemis).
- **Sens** : un effet dirigé part vers la **droite** de l'image (le jeu le tourne vers la souris) ; un projectile a sa tête à droite.
- **Une couleur par classe**, blanc au cœur (les mêmes que les effets actuels) ; le vermillon reste réservé aux ennemis (le portail de Jorōgumo y a droit).
- **Noms** : chaque planche porte le nom de l'effet du jeu qu'elle remplace (`public/sprites/fx/<nom>.webp`), ou un nom neuf (`voie-…`) quand le jeu n'a encore qu'un effet générique.

## Où ranger

`~/Pictures/game visual/vfx-2d/<classe>/<nom>.png` (et `vfx-2d/jorogumo/portail-vortex.png`).

## Conseils Gemini

- Une conversation neuve par prompt ; joindre le premier effet de la classe pour garder le même style.
- Si Gemini dessine un personnage, une arme, un sol ou du texte : régénérer en rappelant « only the effect, on pure black ».
- Si les 16 images se ressemblent trop : redemander en insistant sur « every frame clearly different ».

## Fichiers

- `01-guerrier.md` : Guerrier (8 effets)
- `02-lame.md` : Lame (9 effets)
- `03-paladin.md` : Paladin (8 effets)
- `04-rodeur.md` : Rôdeur (9 effets)
- `05-sorcier.md` : Sorcier (14 effets)
- `06-portail-jorogumo.md` : le vortex du portail de Jorōgumo
