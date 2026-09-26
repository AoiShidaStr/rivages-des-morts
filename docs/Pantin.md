# Pantin articulé (façon Wakfu)

Au lieu d'une planche par animation, le héros est un **pantin** : des morceaux peints (tête, torse, bras, jambes…) accrochés à des os et animés par rotation. Une seule image peinte par personnage, des animations écrites une fois pour tous les humanoïdes, et l'équipement porté se voit en jeu.

## Voir le prototype

- `npm run dev`, puis ouvrir `http://localhost:5173/?pantin` : le héros est dessiné en morceaux provisoires (dessinés au canvas), avec l'arme équipée dans la main et le casque sur la tête.
- Sans `?pantin`, le jeu garde la planche peinte du héros tant que les morceaux peints n'existent pas.

## Morceaux peints

1. Générer la planche de morceaux avec Gemini (prompt « Pantin du héros » dans `public/sprites/sprites/Prompts remplis.md`), l'enregistrer sous `Pictures\game visual\sprites\heros_pieces.jpg`.
2. `npm run pieces` : découpe la grille 4 × 3 (cases dans `tools/pieces.json`) en `public/sprites/pieces/heros/<morceau>.png`, en gardant les proportions de chaque morceau.
3. Dès que ces fichiers existent, le pantin remplace la planche, même sans `?pantin`. Un morceau manquant reste dessiné à la main.

Les morceaux attendus, dans le sens du repos : tête tournée vers la droite, bras et jambes verticaux avec l'articulation du corps en haut, pied pointé vers la droite.

## Réglages (`src/data/pantin.json`)

- `pieces` : hauteur de chaque morceau dans le pantin (`taille[1]`, en pixels du canvas ; la largeur suit l'image) et son `pivot`, le point d'accroche en fractions de l'image (0,0 en haut à gauche).
- `os` : squelette ; `pos` est le pivot de l'os dans le repère de son parent.
- `ordre` : ordre de dessin, de l'arrière vers l'avant. Les membres du côté caché sont `sombre`.
- `equipements` : où poser l'icône de l'objet équipé (`taille`, point tenu `prise`, `angle`), avec des retouches par objet dans `objets`.
- `animations` : une par posture du jeu (idle, move, windup, strike, guard, dash, airborne, channel, stunned). Angles en degrés, sens horaire à l'écran pour un personnage tourné vers la droite : un bras qui pend part vers l'avant en négatif, un genou se plie en positif. `y` abaisse le bassin.

## Suite prévue

- Retoucher les pivots une fois les vrais morceaux découpés.
- Montrer plastron, jambières et bottes : chaque objet devient une petite planche de morceaux (le plastron sur le torse, etc.) au lieu d'une icône.
- Races et classes : même squelette, autres morceaux (tête et teinte pour la race, tenue pour la classe).
