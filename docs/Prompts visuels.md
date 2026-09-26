# Prompts visuels (Yomi, V1)

Un prompt prêt à l'emploi pour chaque élément du Yomi, écrit en anglais parce que les outils de génération répondent mieux ainsi.

## Outils et pipeline

**Base : Nano Banana** (inclus dans l'abonnement Google AI Plus étudiant, via l'application Gemini) pour toutes les images 2D. **Puis [Tripo AI](https://www.tripo3d.ai)** pour passer de l'image à la 3D : 300 crédits gratuits par mois, plan Pro à 19,90 $/mois pour l'usage commercial, rigging automatique et plugin Blender.

Nano Banana ne fait pas de 3D, mais c'est lui qui garantit la cohérence du style : il sait garder un même personnage d'une image à l'autre et retoucher une image existante. On valide le design en 2D, gratuitement et vite, avant de dépenser des crédits 3D.

| Outil | Quand l'utiliser |
| --- | --- |
| [Tripo AI](https://www.tripo3d.ai) | Outil principal : objets, ennemis, décors |
| [Meshy](https://www.meshy.ai) | Si on veut sa bibliothèque d'animations prêtes pour les ennemis |
| [Rodin (Hyper3D)](https://hyper3d.ai) | Pour un asset « vitrine » très soigné (boss) |

⚠️ Les sorties gratuites de Tripo et Meshy sont sous licence CC BY 4.0 : attribution obligatoire si on publie. Pour publier sans contrainte, passer au plan payant.

**Pipeline**

1. **Nano Banana, concept** : coller la bible de style puis le prompt de l'asset. Itérer jusqu'à ce que le design plaise.
2. **Nano Banana, planche de vues** : demander le même asset de face, de profil et de dos (suffixe « planche de vues » ci-dessous).
3. **Tripo, image vers 3D** : importer les vues (mode multi-vues), demander une version low-poly.
4. **Blender** : réduire à quelques milliers de triangles (Decimate), vérifier qu'il n'y a pas d'ombres peintes dans la texture.
5. **Rig et export** : rigger les ennemis dans Tripo, exporter en .glb pour Babylon.js.

**Nano Banana seul suffit pour tout ce qui reste en 2D** : icônes d'inventaire, portraits de dialogue des PNJ, écran titre, cartes des îles, illustrations de lore.

## Bible de style

À coller au début de chaque prompt, sans le modifier, pour garder un style cohérent.

```
Stylized low-poly 3D game asset, hand-painted texture, soft cel-shading, clean readable silhouette, vibrant but slightly muted colors, epic and colorful fantasy tone inspired by Japanese folklore and ukiyo-e, isometric game view, single object, centered, neutral grey background, no baked shadows, game-ready.
```

**Palette du Yomi** : brume blanche et gris-bleu, rouge vermillon (torii, laques), vert tendre des rizières, lueurs bleu-cyan pour les esprits.

À ajouter à la fin selon le cas :

- Personnage ou ennemi : `full body, T-pose, symmetrical, suitable for rigging`
- Objet ou arme : `isolated item, no hands, front three-quarter view`
- Décor : `modular environment piece, flat base`
- Planche de vues (pour Tripo) : `character turnaround sheet, same character shown front view, side view and back view, consistent design, white background`
- Icône d'inventaire : `2D game inventory icon, item centered, painted style, subtle dark vignette, square format`
- Portrait de dialogue : `2D character bust portrait for a dialogue box, painted style, expressive face, transparent-looking plain background`
- Sprite du prototype 2D (à détourer avec `npm run sprites`) : `flat uniform light grey background, no ground shadow, no glow, no particles, no mist, no outline, whole subject visible with margin around it`

**Pour le prototype 2D**, finir chaque prompt par le suffixe « Sprite » : un fond gris uni et aucun effet peint autour du sujet (étincelles, aura, brume, ombre au sol). Le détourage garde tout ce qui n'est pas du fond gris, donc un effet peint reste collé au sprite ; les effets sont ajoutés par le jeu.

**Noms de fichiers** : enregistrer l'image dans `~/Pictures/game visual` sous le nom indiqué dans `tools/sprites.json` (par exemple `decor_jizo.jpg`), puis lancer `npm run sprites -- jizo`. Une image absente est simplement ignorée : le jeu garde son dessin provisoire.

## Où en sont les images

Tout ce que décrivaient les anciens tableaux de cette page est fait et dans le jeu : le héros guerrier, les ennemis et le boss des Rizières (images fixes et animations), les PNJ, les décors de l'île et du donjon, les sols, les armes, l'équipement et les reliques du premier donjon. Leurs prompts ont été retirés.

Les prompts prêts à coller, avec l'image à joindre et le nom de fichier, sont dans `public/sprites/sprites/Prompts remplis.md` (dossier non versionné). Le montage des planches est décrit dans [Planches peintes](Planches%20peintes.md). Les descriptions ci-dessous sont celles qu'ils reprennent.

Les personnages humanoïdes vont vers un pantin articulé façon Wakfu (prototype sur la branche `claude/prompts-refonte-5fdb43`, voir `docs/Pantin.md`) : une fiche et une planche de morceaux au lieu de planches d'animation. En attendant, les planches d'animation des ennemis humanoïdes sont en pause.

## À faire : Palais d'Izanami

Shikome, guerrier du Yomi et Izanami : la fiche seulement, leurs animations attendent le pantin. L'ikazuchi et les pêchers se font entièrement.

| Asset | Description |
| --- | --- |
| Shikome | `Yomotsu-shikome, a hag-like fury of Yomi: hunched and wiry, grey-green skin, long wild white hair, glowing red eyes, a wide fanged mouth, tattered dark grey rags, very long clawed fingers` |
| Ikazuchi | `Ikazuchi, a small thunder god of Yomi: a floating storm-cloud body in dark violet with two golden horns, glowing golden eyes and a wide toothy grin, a ring of small red taiko drums circling its body, a zig-zag lightning tail instead of legs` |
| Guerrier du Yomi | `a skeleton warrior of the Yomi army in black lacquered samurai armor laced with red cords, a dark kabuto helmet with a golden crescent crest, glowing red eye sockets, a long yari spear held forward with both hands` |
| Izanami, voilée | `Izanami, queen of the dead, veiled form: a tall pale woman in a white burial kimono crossed right over left, a white triangular headband, very long straight black hair hiding her face, the hem fraying into thin white mist` |
| Izanami, vrai visage | La même, retouchée : `her body rotten by the Yomi, violet-grey skin, the white kimono torn and stained dark, burning red eyes between the strands of hair, eight small crackling thunder gods clinging to her body` |
| Pêcher (mûr, puis nu) | `a small old peach tree growing from a crack in dark violet stone, twisted dark trunk, a few pale pink blossoms, three big ripe golden-pink peaches` ; la version nue est une retouche sans les pêches |

## À faire : classes et races (après le pantin)

Avec le pantin, la classe donne la tenue, la race donne la tête et la peau, et l'arme vient de l'icône de l'objet équipé. Chacune demande une fiche (retouche de la référence du héros guerrier, pour garder le même personnage) et une planche de morceaux sur la grille du pantin : la tenue entière pour une classe, la tête et la main pour une race.

| Classe | Tenue et arme de la fiche |
| --- | --- |
| Invocateur | `a wide-sleeved white and indigo onmyoji robe over his armor, paper ofuda talismans tucked into his belt, a short dark wooden staff topped with a cluster of small golden bells and white zigzag paper streamers` |
| Lame | `a dark close-fitting shinobi outfit, a dark cloth scarf over his mouth and nose, wrapped forearms and shins, two blackened iron kunai daggers in a reverse grip tied together by a long red cord` |
| Paladin | `a red lacquered chest plate with a golden sun emblem, round shoulder guards, a string of big prayer beads across his chest, a naginata and a small round wooden shield painted with a red sun` |
| Rôdeur | `a short straw raincoat (mino) over his shoulders, wrapped leggings, a leather quiver of white-feathered arrows, a tall asymmetric yumi longbow of lacquered bamboo` |

L'Einherjar est le héros actuel. Les trois autres races sont des retouches de sa fiche, même pose et même nodachi.

| Race | Changement |
| --- | --- |
| Oushebti | `an animated Egyptian funerary statuette: a body of glazed blue-green faience clay with fine cracks, black and gold painted details, a striped blue and gold nemes headdress, calm painted almond eyes, hieroglyphs down the chest` |
| Demi-dieu | `a Greek demigod: bronze cuirass over a white chiton, a short red cape, a crested bronze helmet, sandals with greaves, golden eyes` |
| Hanyō | `half human and half yokai: dark lacquered samurai armor, a white fox mask pushed to the side of his head, two small horns, long silver hair, one clawed hand, one red eye` |

## À faire : icônes des nouveaux objets

Une seconde planche, retouchée à partir de la première (même grille de 8 × 4), déjà déclarée dans `tools/icones.json`. Les armes qui n'ont qu'une icône en pixel art (`npm run icones-pixel`) y sont aussi : l'icône peinte la remplacera.

| Objet | Description |
| --- | --- |
| Grelots d'onmyōji | `a short dark wooden staff topped with a cluster of small golden bells and white zigzag paper streamers` |
| Éventail de la Jorōgumo | `a black and crimson silk folding fan, half open, silver spider-web pattern, a few loose silk threads` |
| Kunai jumeaux | `two blackened iron kunai daggers crossed, their ring pommels tied together by a red cord` |
| Naginata et bouclier de temple | `a naginata with a curved blade lying across a small round wooden shield painted with a red sun` |
| Yumi en bambou | `a tall asymmetric yumi bow of lacquered bamboo, grip placed low, one white-fletched arrow` |
| Totsuka-no-tsurugi | `a long ancient straight double-edged bronze sword with a ring pommel, tiny lightning sparks along the blade` |
| Kaiken d'Izanami | `a small kaiken dagger in a white lacquered sheath with pale silver fittings, a dark stain seeping from the sheath mouth` |
| Arc du pêcher | `a curved bow carved from knotted peach wood, pink peach blossoms growing along it` |
| Voile d'Izanami | `a white burial veil of thin gauze with a white triangular headband, draped over an invisible head` |
| Dō de l'armée du Yomi | `a samurai do chest armor made of bone lamellae lacquered black, laced with red cords` |
| Pêche Ōkamuzumi | `a single perfect ripe peach with two green leaves, soft golden glow` |
| Peigne d'Izanagi | `a dark wooden Japanese comb with long teeth, small green bamboo shoots sprouting from the tips` |
| Os de guerrier du Yomi | `a small bundle of old bones tied with a black lacquered armor lace` |
| Éclat de foudre | `a jagged shard of solidified yellow lightning, crackling` |
| Kusarigama des Oubliés | `a kusarigama: a rice farmer's sickle at the end of a long rusty chain coiled around it` |
| Crocs de la Jorōgumo | `two curved black and crimson spider fangs mounted on handles wrapped in white silk, a drop of green venom` |
| Tetsubō et bouclier-cloche | `a studded iron tetsubo club crossed over a cracked bronze temple bell used as a shield` |
| Miroir de Yata | `a short spear crossed over the octagonal bronze Yata mirror, its polished face shining` |
| Hankyū de chasse | `a short hankyu hunting bow of dark wood with two arrows` |
| Arc de soie de la Jorōgumo | `a black wooden bow strung with a glistening white spider-silk string, a few sticky threads hanging` |
