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

## Héros

Le premier héros (Einherjar guerrier) était trop réaliste par rapport aux yokai : proportions adultes, poils de fourrure et sangles détaillés, contour noir, halo. Le prompt ci-dessous vise les proportions et les formes simples du kappa.

**Astuce Nano Banana** : joindre l'image du kappa (`public/sprites/kappa.png`) avec la phrase `Match exactly the art style, proportions and rendering of the attached image.` C'est le moyen le plus sûr d'obtenir un style identique d'un personnage à l'autre.

| Asset | Prompt (après la bible de style) |
| --- | --- |
| Einherjar guerrier | `Einherjar warrior, the ghost of a viking who died in battle, stylized chunky proportions about 3.5 heads tall, big head, broad shoulders, oversized hands and boots, pale cyan spirit skin, large simple determined eyes, short thick braided white beard, simple round iron helmet with a nose guard, short grey fur mantle made of a few big clumps, plain brown leather jerkin with one belt, holding a long Japanese nodachi in both hands, blade pointing forward, dynamic ready stance, simple shapes and big readable color blocks, painted faceted planes, few details` (fichier `heros_guerrier.jpg`) |



| Asset | Prompt (après la bible de style) |
| --- | --- |
| Hitodama | `Hitodama, a small floating blue-white spirit flame with a tadpole-like tail and two tiny dark eyes, glowing cyan core, wispy trail` |
| Kodama | `Kodama, a small pale tree spirit with a round white head, simple dark hole eyes and mouth, slender body like a sapling, tiny leaves sprouting from its head, gentle healing green aura` |
| Kappa | `Kappa, a squat green turtle-like yokai with a hard brown shell on its back, beak-like mouth, webbed hands and feet, a shallow water-filled dish on top of its head, aggressive stance` |
| Kappa renforcé (élite) | ` Elite kappa, larger and bulkier, ` `c``racked mossy shell with red lacquered armor plates, scars, glowing eyes, water dish rimmed with gold` |
| Kasa-obake | `Kasa-obake, a haunted old paper umbrella yokai standing on one leg wearing a wooden geta sandal, one large eye, long red tongue, torn oiled paper, mischievous pose` |
| Oublié | `Forgotten soul, a tall faceless humanoid silhouette in tattered grey robes, smooth blank white mask without features, faint ghostly mist around its feet` |
| Petite araignée | `Small spider yokai minion, black and crimson, glossy body, thin legs, glowing red eyes` |
| Jorōgumo, forme humaine | `Jorogumo in human form, elegant woman in a layered black and crimson kimono with spider-web patterns, long black hair, holding a folding fan, pale face, hints of spider legs hidden under the kimono, menacing grace` |
| Jorōgumo, forme d'araignée | `Jorogumo true form, giant spider with a woman's upper body emerging from it, black and crimson carapace with kimono-pattern markings, eight long legs, silk threads hanging, boss creature` |

## PNJ et lieux

| Asset | Prompt (après la bible de style) |
| --- | --- |
| Charon | `Charon the ferryman of the dead, tall gaunt old figure in a hooded dark cloak, long grey beard, holding a long wooden pole, a small lantern at his belt, tired grumpy expression` |
| Tetsu, le forgeron | `Tetsu the blacksmith, a burly middle-aged Japanese smith spirit, bare muscular arms, dark leather apron over a faded indigo work kimono, a heavy forging hammer in his right hand, the left half of his face is a smooth blank white mask like the Forgotten, the right half is weathered and kind, short grey topknot, standing, full body, matte colors` (fichier `pnj_tetsu.jpg`) |
| Obaa Kiku | `Obaa Kiku, a small kind old woman ghost in a simple indigo kimono, carrying a wooden tray with tea cups, warm smile, faint glow` |
| Yuki | `Yuki, a little girl ghost in a pale kimono, bare feet, holding an empty paper lantern, sad but hopeful face, soft blue glow` |
| Tanuki marchand | `Tanuki merchant, chubby raccoon dog yokai with a straw hat and a big sake flask, oversized backpack full of odd trinkets, sly grin` |
| Moine du Rocher | `Old Buddhist monk spirit, shaved head, orange and grey robes, prayer beads, wooden staff, calm wise expression` |
| Barque de Charon | `Charon's boat, long narrow wooden ferry, dark weathered wood, a lantern on a pole at the bow, mystical mist around the hull` |
| Torii du ponton | `Weathered vermilion torii gate standing in shallow misty water, wooden pier planks, modular environment piece` |
| Statue Jizō | `Small weathered stone Jizo statue, round bald head with closed eyes and a peaceful smile, hands joined in prayer, wearing a vermilion cloth bib and a knitted vermilion cap, patches of green moss, standing on a small square stone base, modular environment piece, flat base` (fichier `decor_jizo.jpg`) |
| Rizière inondée | `Flooded rice paddy tile, still reflective water, young green rice shoots, low earthen borders, modular environment piece, flat base` |
| Grand Rocher | `Massive ancient sealing boulder bound with a thick shimenawa rope and white paper streamers, cracks glowing faintly red` |
| Souche (arène du boss) | `Old tree stump with thick roots, dark wet wood, silk threads wrapped around it, modular environment piece` |

## Armes, équipement et reliques

| Asset | Prompt (après la bible de style) |
| --- | --- |
| Nodachi des rizières | `Long Japanese nodachi sword, plain wooden handle wrapped in faded cloth, simple iron guard, slightly rusty blade` |
| Kanabō d'oni | `Oni kanabo, heavy spiked iron war club, dark metal studs, red lacquered grip, battle-worn` |
| Katana de rōnin | `Ronin katana, worn black scabbard, frayed red cord, chipped tsuba, elegant curved blade` |
| Grelots d'onmyōji | `Onmyoji ritual bells staff, short wooden handle with a cluster of golden bells and white paper ofuda talismans, faint blue spirit glow` |
| Éventail de la Jorōgumo | `Black and crimson folding war fan with spider-web pattern, silk threads dangling from its ribs, sinister and elegant` |
| Chapeau de paille | `Conical straw rice farmer hat (sugegasa), tightly woven golden straw, a simple faded red chin cord, slightly frayed rim, isolated item, front three-quarter view` (fichier `equipement_chapeau-de-paille.jpg`) |
| Masque d'Oublié | `Smooth blank white mask without any features, cracked edge, ghostly mist` |
| Carapace de kappa | `Chest armor made from a green-brown kappa turtle shell, hexagonal shell plates with mossy cracks, dark leather straps and bronze buckles, worn by nobody, isolated item, front three-quarter view` (fichier `equipement_carapace-de-kappa.jpg`) |
| Hakama de soie | `Pleated black silk hakama trousers with subtle silver spider-thread embroidery` |
| Geta du kasa-obake | `Pair of tall wooden geta sandals, old oiled paper scraps tied around them, playful spirit aura` |
| Lanterne-braise | `Small paper lantern amulet on a cord, glowing with a trapped blue hitodama flame` |
| Magatama fêlé | `Cracked jade magatama pendant on a red cord, faint inner glow` |
| Coupelle du kappa | `Shallow ceramic dish filled with shimmering water that never spills, mystical relic` |
| Fil de Jōren | `Spool of glowing silver spider silk, a single thread floating in the air, ancient mystical relic` |
| Magatama de Yasakani | `Legendary Yasakani magatama, large deep green jade comma-shaped jewel, divine golden aura, sacred relic` |
