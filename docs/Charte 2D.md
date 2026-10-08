# Rivages des Morts — Charte 2D

Charte de la refonte graphique : **toutes les animations sont dessinées en 2D par Nano Banana 2** (application Gemini, sans API), **en personnages chibi de 3 têtes**, sur **une planche complète de 64 images (grille 8 × 8) par personnage**. La 3D, Blender et la pipeline GLB sont abandonnés : ce document remplace [Charte 3D](Charte%203D.md) et [pipeline](pipeline.md) pour le rendu des personnages. Les prompts correspondants sont dans [`prompts-2d/`](prompts-2d/) et se régénèrent avec `npm run prompts-2d` (`tools/prompts-2d.mjs`).

**Décision du 8 octobre 2026 : retour officiel au chibi en grille 8 × 8.** Les autres proportions et les autres grilles essayées avant ont été abandonnées. Sur une grille dense, Nano Banana 2 garde bien mieux l'anatomie et l'équipement d'un personnage chibi : un corps compact, une grosse tête et une arme exagérée restent cohérents d'une case à l'autre, alors que des corps élancés se disloquent (membres en trop, arme qui change de main ou de forme). Les références de style sont les planches complètes Hanyō d'octobre 2026, en particulier la Lame et le Paladin (`2d/hanyo-2D/`, portraits `public/sprites/heros-hanyo-<classe>.png`).

Ce que la charte 3D garde comme valeur : la lumière froide, la règle « rouge = danger ennemi », l'anneau clair sous les héros, les hauteurs relatives des créatures (hitodama 0,6 m, kappa 1,3 m, héros 1,8 m…). Tout cela est reproduit ici ou dans le jeu, pas dans les planches.

**Le GDD d'origine prime.** Le jeu est un archipel d'au-delà (Yomi, Hadès, Duat, Helheim, puis la Mésopotamie) : les personnages ne sont pas « du Yomi ». Seuls les yokai et les boss du Yomi le sont. Les héros, eux, doivent rester cohérents sur toutes les îles : **la race fixe le corps et la culture du vêtement, la classe fixe seulement le rôle, la posture, la silhouette, la couleur d'accent et l'arme** (voir 2).

## 1. Rendu : chibi peint, contour encre, deux tons

- Style des **planches complètes Hanyō** (voir l'introduction) : sprite d'action-RPG chibi peint. Formes peintes avec un dégradé doux, plis du tissu, motifs et accessoires dessinés nettement mais simplifiés pour un petit sprite, sans texture fine.
- **Contour encre bleu-noir net** sur la silhouette, plus fin sur les détails intérieurs (environ 2 px pour un personnage d'environ 200 px).
- **Deux tons** de lumière : la couleur de base et une ombre **teintée bleu-violet**, jamais noire.
- Lumière froide et douce venant du **haut-gauche**, identique sur toutes les îles : le sprite garde le même éclairage et la même ombre bleu-violet partout, c'est le décor de chaque île qui porte sa palette (brume du Yomi, or de la Duat…). Personnages plus saturés et plus clairs que le décor.
- Métal peint : un seul reflet blanc net. Pas de photo, pas de bruit, pas de texture fine, pas d'aspect « rendu 3D ».
- Caméra légèrement en plongée (environ 35° au-dessus de l'horizon), comme le jeu.
- **Aucun effet dessiné dans les planches** : ni magie, lueur, traînée, fumée, étincelle, trait de vitesse, ombre au sol, sol, texte ou cadre. Le jeu ajoute les effets (section 11), les ombres, l'anneau du héros et la dissolution en encre de la mort. Le détourage garde tout ce qui n'est pas le fond : un effet dessiné resterait collé au sprite.
- Couleur de classe (accent sur la tenue et l'arme, la culture du vêtement venant de la race) : Guerrier brun-rouge sombre (jamais le rouge vif), Sorcier vermillon et noir, Invocateur bleu-vert, Lame violet, Paladin or, Rôdeur vert. Le vermillon vif est réservé au danger ennemi : chez les héros, seul le Sorcier le porte, sur sa robe de prêtre du feu.

## 2. Race = corps et tenue, classe = rôle et arme

Règle du GDD : « cinq classes neutres culturellement, la race les habille ». Un Guerrier Hanyō a l'allure d'un samouraï, un Guerrier Einherjar celle d'un viking.

| Race | Corps | Culture du vêtement |
| --- | --- | --- |
| Einherjar | massif, épaules larges, tresses, barbe, peau pâle et cicatrices | nordique : cotte de mailles, fourrures, lin, runes |
| Oushebti | argile ou faïence bleu-vert craquelée, hiéroglyphes peints, raideur de statuette | égyptienne : lin plissé, colliers, or, bronze |
| Demi-dieu | peau dorée lumineuse, anneau doré discret, emblème du parent divin | grecque : chiton, bronze, laurier |
| Hanyō | oreilles et petites cornes de yokai, marques, yeux clairs, griffes | japonaise : armure laquée, robes, bandeaux |

| Classe | Rôle et posture | Accent | Arme de départ (Yomi), dessinée exagérée |
| --- | --- | --- | --- |
| Guerrier | armure partielle lourde, arme portée haut, penché en avant | brun-rouge sombre | nodachi plus long que le personnage |
| Sorcier | robe ample de prêtre du feu, talismans et grelots à la ceinture, posture droite | vermillon et noir | kagura-suzu (bâton à grelots) et talismans |
| Lame | tenue sombre ajustée, posture basse | violet | kunai jumeaux surdimensionnés |
| Paladin | tissu clair et or, posture de rempart | or | naginata et grand bouclier de temple |
| Rôdeur | tenue légère de chasseur, carquois, posture de tir | vert | yumi bien plus haut que le personnage |

Les 20 tenues (une par race × classe) sont écrites dans `OUTFITS`, en tête de `tools/prompts-2d.mjs`. Un Einherjar Sorcier est donc un voyant du feu nordique, un Oushebti Paladin un gardien de temple égyptien, un Demi-dieu Guerrier un hoplite.

> **Armes par île (à trancher plus tard).** Le GDD donne plusieurs armes par classe et par île (Guerrier : katana de rōnin, xiphos, khopesh, hache de draugr…). En 2D, chaque arme visible demanderait sa propre planche. Les fiches montrent donc l'**arme de départ du Yomi** (colonne ci-dessus), et c'est le champ `weapon` de `CLASSES` dans le générateur qui la décrit. Quand les autres îles arriveront, il faudra choisir : garder l'arme de départ à l'écran, ou redessiner les planches de la classe par arme majeure.

## 3. Proportions et échelle

- **Héros : format chibi, exactement 3 têtes de haut, et tous exactement de la même taille** (les 20 combinaisons).
  - **Tête volumineuse aux grands yeux expressifs** : c'est elle qui porte l'émotion et la race (cornes, oreilles, marques).
  - **Épaules larges** : les postures (garde, élan, coup) se lisent de loin même sur un petit sprite.
  - **Corps compact, membres courts et solides.**
  - **Armes exagérées** : nodachi plus long que le personnage, kunai surdimensionnés, yumi bien plus haut que lui, naginata et bouclier de temple démesurés. L'arme doit se lire à l'échelle du jeu.
- **Pourquoi le chibi** : sur une grille dense de 64 cases, l'IA garde bien mieux l'anatomie et l'équipement d'un personnage chibi. Un corps compact et une arme exagérée restent identiques d'une case à l'autre ; des proportions réalistes se disloquent (membres déformés, arme qui change de forme ou de main, tête qui grossit).
- **Ennemis** : la forme propre à chaque créature, dans le même rendu chibi (tête ou visage surdimensionné, traits exagérés, corps compact). Une créature humanoïde (shikome, ikusa, Oublié) fait aussi 3 têtes. Chacune est dessinée **à pleine hauteur dans sa case** : c'est le jeu qui la met à l'échelle d'après sa hauteur (hitodama petit, kappa plus grand, héros 1,8 m). On ne dessine donc pas le hitodama plus petit dans l'image.
- **Boss** : même planche et même case que les autres, rendu chibi, tête et point faible toujours lisibles. C'est le jeu qui les affiche plus grands (Izanami : 2,6 m).

| | Case finale | Personnage debout | Pieds (ligne de base) |
| --- | --- | --- | --- |
| Tous (héros, ennemis, boss) | 256 × 256 | ≈ 200 px (78 %) | à 228 px du haut (89 %) |

Les marges servent aux armes, cheveux et gestes larges. Les poses à plat (mort) gardent la même échelle : le personnage ne grossit jamais.

## 4. Format des planches : une grille complète de 64 images (8 × 8)

**Le standard est une planche complète par personnage et par vue : 64 images en grille 8 colonnes × 8 lignes, une ligne de 8 images par animation**, lues de gauche à droite, dans **une image carrée 1:1**. Demander la plus haute résolution, **2 048 × 2 048 px** si possible : chaque case fait alors **256 × 256 px**, la résolution du jeu. En 1 024 px (taille par défaut de Gemini), les cases ne font que 128 px et le personnage est plus flou en jeu.

Chaque ligne a **exactement 8 images**, sans case vide ni image en trop. L'ordre des lignes est **strict** : le moteur les lit dans cet ordre.

| Ligne | Animation | Contenu |
| --- | --- | --- |
| 1 | **Attente** (Idle) | respiration en boucle |
| 2 | **Course** (déplacement aux touches ZQSD) | cycle de course sur place, en boucle |
| 3 | **Attaque principale** (clic gauche) | élan puis coup |
| 4 | **Action défensive** (clic droit) | Blocage du Guerrier et du Paladin, Frappe fantôme (pas de l'ombre) de la Lame, Tir chargé du Rôdeur, Sceau du Sorcier |
| 5 | **Compétences A et E** | Frappe fracassante, Écran de fumée, Marteau lancé, Flèche-filet… |
| 6 | **Dégâts** (Hurt) | recul sous un coup, puis retour en garde |
| 7 | **Mort** (Death) | chute, puis immobile ; le corps reste plein |
| 8 | **Compétence ultime** (touche R) | Frénésie, Danse des lames, Aura de lumière et Égide, Recul, Météore |

**Tags du moteur.** Le jeu choisit l'animation par tag (`pose` et `artPose` dans `src/game/player.ts`, `playSheet` dans `src/render/renderer.ts`, avec repli sur la posture voisine puis l'attente). L'entrée de la planche dans `tools/planches.json` relie chaque ligne à ses tags (`rows`) :

| Ligne | Tous les héros | Guerrier | Sorcier | Lame | Paladin | Rôdeur |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `idle` | | | | | |
| 2 | `move` | | | | | |
| 3 | `windup` (images 1-3), `strike` (4-8) | | | | | |
| 4 | | `guard` (Garde) | `skill` (Sceau, Bouclier de flammes) | `dash` (Frappe fantôme, et l'esquive) | `guard` (Garde au bouclier) | `channel` (Tir chargé) |
| 5 | | `skill` (Frappe fracassante) ; `airborne` (images du saut : Bond) | `dash` (Fuite de feu, et l'esquive) | `skill` (Marque de mort, Écran de fumée) | `skill` (Marteau lancé) | `ultimate` (Flèche-filet), `skill` (Marque du chasseur) |
| 6 | `hurt` | | | | | |
| 7 | `death` | | | | | |
| 8 | | `ultimate` (Frénésie) | `ultimate` (Météore) | `ultimate` (Danse des lames) | `ultimate` (Aura de lumière, Égide) | `airborne` (Recul), `dash` (esquive) |

Ce tableau suit le code tel qu'il est : l'Aura de lumière (A) du Paladin et la Flèche-filet (A) du Rôdeur jouent le tag `ultimate`, et le Recul (R) du Rôdeur le tag `airborne`. L'esquive joue `dash` quand la planche en a un, sinon la course.

**Ennemis et boss** : même grille, même logique de lignes : 1 attente (`idle`), 2 déplacement (`move`), 3 attaque (`windup` images 1-3, `strike` 4-8), 4 anticipation tenue (le télégraphe, `windup` des attaques lentes), 5 étourdi (`stunned`), 6 dégâts, 7 mort, 8 geste propre (`channel`, `airborne`… : soin du kodama, disparition de l'ikazuchi, invocation d'Izanami) ou, faute de geste propre, une seconde attaque plus lourde.

**Planches déjà dans le jeu hors standard.** L'import (`layout` et `rows`) accepte d'autres grilles, ce qui laisse en place les planches faites avant ce standard. Elles seront refaites en 8 × 8 quand on les reprendra :

| Personnage | Grille actuelle |
| --- | --- |
| Guerrier et Rôdeur Hanyō | 12 images par ligne (deux animations sur certaines lignes) |
| Lame et Sorcier Hanyō | 8 × 8, mais une ligne de 7 images |
| Demi-dieux | grilles d'avant le standard, au nombre d'images variable selon la classe |
| Invocateur Hanyō, héros des autres races | planches par animation (outil `kit-heros`) |
| Izanami, yokai du Palais | une planche de 16 images (4 × 4) par animation |

## 5. Fond et détourage

- Fond **gris moyen uni `#8f8f8f`**, identique partout, sans dégradé ni vignette, sans grille ni cadre (les traits de grille compliquent le détourage).
- Exception : l'**Oublié** (robe gris-bleu) est dessiné sur fond **magenta `#ff00ff`**, parce que `tools/detourer.mjs` confond un sujet gris avec le fond gris. L'import devra accepter une couleur de fond par personnage.
- Le fond enfermé dans une forme (entre l'arc et sa corde, sous un bras) se vide avec `"fillHoles": true` (et `"minHole": 30` sur une petite planche).

## 6. Vues

| Vue | Description | Quand |
| --- | --- | --- |
| Profil | 3/4 de côté, tourné vers la droite | **maintenant** |
| Face | 3/4 de face, vers le bas-droite | plus tard |
| Dos | 3/4 de dos, vers le haut-droite | plus tard |

Nano Banana 2 ne réussit pas une fiche qui montre les trois vues d'un coup. **Chaque vue a donc sa propre fiche, d'une seule figure, et sa propre planche complète** : on fait d'abord le profil (de zéro), et la face et le dos se font ensuite à partir de la fiche de profil jointe (dossier [`plus-tard/`](prompts-2d/plus-tard/)).

Le côté gauche est le **miroir du droit** : le jeu retourne l'image. Les armes et détails asymétriques (yumi, bouclier) sont donc toujours dessinés du même côté. Héros : profil, face et dos (les deux dernières plus tard). Ennemis et boss : profil, puis face.

## 7. Découpage des 8 images de chaque ligne

| Ligne | Boucle | Découpage des 8 images |
| --- | --- | --- |
| 1 Attente | oui | 1-2 pose neutre, 3-4 inspire, 5-6 expire, 7-8 retour ; image 8 ≈ image 1 |
| 2 Course | oui | un cycle de 8 poses, une par image (contact, appui, passage, poussée, de chaque côté) |
| 3 Attaque | non | 1 départ, 2-3 élan, 4 coup lancé, **5 impact**, 6 prolongement, 7-8 retour en garde |
| 4 Clic droit (tenu : garde, arc bandé) | non | 1 départ, 2-3 mise en place, 4-5 position atteinte, 6-8 position tenue (presque identiques) |
| 4 Clic droit (d'un trait : pas de l'ombre, sceau) | non | 1-2 anticipation, 3-5 action, 6 fin du mouvement, 7-8 retour |
| 5 Compétences A et E | non | 1-2 élan, 3-4 tension, **5 déclenchement**, 6 tenue, 7-8 retour |
| 6 Dégâts | non | 1 coup reçu, 2-3 recul maximal, 4-5 chancelle, 6-8 se reprend |
| 7 Mort | non | 1 coup fatal, 2-3 chancelle, 4-5 s'effondre, 6 touche le sol, **7-8 immobile et identiques** ; aucune dissolution dessinée (le jeu la fait) |
| 8 Ultime | non | 1-2 élan, 3-4 montée en puissance, **5-6 déclenchement**, 7 tenue, 8 retour |

Vitesses de lecture, calées sur les temps du jeu (`duration` par image dans `tools/planches.json`) : attente 100-120 ms, course 60-80 ms, attaque 40-45 ms (élan 0,08 s, coup 0,24 s), clic droit tenu 50 ms, recul 40 ms (0,32 s), compétence 60-70 ms (0,5 s), ultime 80-85 ms (0,7 s), mort 110 ms. Une animation jouée une fois (`"once": true`) s'arrête sur sa dernière image : la garde reste levée, le corps reste au sol.

## 8. Workflow pour un personnage

1. **Fiche de profil** : premier prompt du personnage dans le fichier de son lot. Générer 2-3 variantes et garder la meilleure : elle fixe le design de la planche.
2. **Planche complète de profil** : joindre la fiche de profil et coller le prompt « planche complète (8 × 8) ». Une seule image contient les 8 animations.
3. **Plus tard, face et dos** : générer la fiche de la vue à partir de la fiche de profil, puis la planche complète de cette vue.
4. **Rangement** : `~/Pictures/game visual/2d/<race>-2D/<race>-<classe>-planchecomplete.jpg` et `<race>-<classe>-reference.jpg` (la fiche), comme dans `2d/hanyo-2D/`.
5. **Import de la planche** : ajouter une entrée dans `tools/planches.json` avec `"layout": [8, 8, 8, 8, 8, 8, 8, 8]` et `rows` (une entrée par tag, voir la section 4 ; modèle : `heros-hanyo-paladin`), puis lancer `npm run planches -- <nom>`. **Toujours regarder la planche avant d'écrire `layout`** : Nano Banana ne respecte pas toujours la grille demandée (ligne de 7 images, 12 colonnes). Un héros n'a pas d'entrée à ajouter dans `src/data/sprites.json` : `src/render/heroes.ts` charge `anim/heros-<race>-<classe>.json`. Pour un ennemi ou un boss, pointer `src/data/sprites.json` vers `anim/<nom>.json`.
6. **Portrait** : la fiche devient le portrait du menu des personnages, de la création et des dialogues (`public/sprites/heros-<race>-<classe>.png`) : l'ajouter dans `tools/sprites.json` et lancer `npm run sprites -- <nom>`.

Si Gemini ajoute un bandeau de titre sur fond sombre, l'option `"crop": [x0, y0, x1, y1]` (fractions de l'image) le coupe avant le détourage (voir `ikusa`) ; un texte sur le fond gris s'efface avec `erase`. Les images fixes (décor) passent par `tools/sprites.json` et `npm run sprites`.

Pour un nouveau personnage ou une nouvelle race, ajouter son bloc dans `tools/prompts-2d.mjs` (`ENEMIES`, `BOSSES`, `RACES`, `OUTFITS` ou `CLASSES`, puis `LOTS`) et relancer `npm run prompts-2d`.

## 9. Lots et phases

Les tenues propres à chaque race multiplient par 4 le nombre de planches de héros : on avance donc par lots, **dans cet ordre**. Chaque personnage demande deux prompts : sa fiche et sa planche complète.

| Lot | Contenu | Fichier | Prompts |
| --- | --- | --- | --- |
| 1. Izanami | les deux formes du boss (voilée, vrai visage) et le pêcher de son arène (2 états) : dans le jeu en planches 4 × 4, à refaire en 8 × 8 chibi | [`01-izanami.md`](prompts-2d/01-izanami.md) | 6 |
| 2. Yokai du Palais | shikome, ikazuchi, ikusa : dans le jeu en planches 4 × 4, à refaire en 8 × 8 chibi | [`02-yokai-du-palais.md`](prompts-2d/02-yokai-du-palais.md) | 6 |
| **3. Héros Hanyō** | les cinq Hanyō ont leur planche complète chibi dans le jeu depuis octobre 2026 (Guerrier, Lame, Paladin et Rôdeur le 8 octobre), avec leur portrait ; à refaire au format 8 × 8 strict quand une planche est hors standard (section 4) | `03-heros-<classe>.md` | 10 (2 par classe) |
| 4. Yokai des Rizières | hitodama, kodama, kappa, kappa renforcé, kasa-obake, Oublié, petite araignée : déjà peints, à refaire pour l'harmonie | [`04-yokai-des-rizieres.md`](prompts-2d/04-yokai-des-rizieres.md) | 14 |
| 5. Jorōgumo | le premier boss, déjà peint, à refaire au format chibi 8 × 8 | [`05-jorogumo.md`](prompts-2d/05-jorogumo.md) | 4 |

Soit **40 prompts** pour la première vue. Ensuite :

- **Face et dos** de chaque lot : `plus-tard/<lot>-face-dos-…md`.
- **Autres races** (Einherjar, Oushebti, Demi-dieu : tenues nordique, égyptienne, grecque), de préférence en **rhabillant** la planche complète de la série du Yomi (on joint la planche finie et la fiche de la race) plutôt qu'en redessinant chaque animation : [`plus-tard/01-fiches-autres-races.md`](prompts-2d/plus-tard/01-fiches-autres-races.md).
- **Autres îles** : yokai et boss de l'Hadès, de la Duat, du Helheim.

**Héros jouables en attendant.** Les planches des Einherjar et des Oushebti sont mauvaises, sauf celles du Guerrier : à la création du personnage (et chez le moine), seuls l'**Einherjar Guerrier** et l'**Oushebti Guerrier** se choisissent, les autres classes de ces deux races sont grisées (« Bientôt »). La liste est `PLAYABLE` dans `src/render/heroes.ts` : y ajouter une classe dès que sa planche est refaite. Un héros déjà créé garde sa race et sa classe. Hanyō et Demi-dieu restent ouverts dans toutes les classes.

## 10. Points d'attention

- **Mémoire vidéo** : une planche complète de 64 cases de 256 px pèse au plus 16 Mo décompressée (l'import recadre les cases au plus près, souvent moins). Le jeu ne charge un héros qu'au moment où il entre en scène (`isHeroVariant`, `setHero`), ce qui reste utile quand la face et le dos arriveront.
- **Poids du jeu (à traiter plus tard)** : en octobre 2026, `public/sprites/anim/` pèse 68 Mo, dont l'essentiel en planches de héros (une par race et par classe). Piste : passer les planches en WebP avec perte, ou ne garder que les cases utilisées par les tags.
- **Cohérence** : sur 64 images, Nano Banana peut encore changer la taille de la tête, déplacer l'arme ou oublier une case. Si une planche dérive, relancer avec la même fiche ; si une seule ligne rate, la refaire à part et l'importer avec les options `source` et `layout` de son entrée de `rows`.
- **Test d'abord** (pour chaque nouveau personnage) : générer **une fiche et une planche** et les regarder avant d'en faire d'autres. Ce premier test règle les prompts, et vérifie la résolution rendue par Gemini.
- **Import** : `npm run planches` gère déjà les planches complètes (`layout`, `rows`, frames choisies par ligne), la ligne de base et l'échelle commune (prise sur la ligne d'attente). Restent à faire : le fond magenta de l'Oublié, et le repli des autres races sur la série du Yomi.
- **PNJ** (Charon, le moine, Obaa-Kiku, Tanuki, Tetsu, Yuki) : pas encore couverts ; même rendu chibi, une fiche et une ligne d'attente suffisent en général.

## 11. Effets animés (`npm run vfx`)

Les effets du combat ne passent pas par Nano Banana : `tools/vfx.mjs` les dessine image par image (SVG rastérisé par sharp) dans `public/sprites/fx/`, au format des planches, et le rendu les pose au sol (`sheetFx` dans `src/render/renderer.ts`) ou debout face à la caméra comme les personnages (`uprightFx` : éclair, pétales). Style de la charte : traits de pinceau, éclaboussures d'encre, aplats or pâle et blanc, contour encre, aucun flou lumineux, jamais de vermillon.

| Effet | Fichier | Quand |
| --- | --- | --- |
| Trait de pinceau qui balaie l'arc, puis s'effiloche | `slash-120`, `-150`, `-180`, `-200`, `-360` | coup d'arme en arc (la planche la plus proche de l'ouverture de l'arme) |
| Lance de pinceau | `thrust` | estoc (katana, kaiken…) |
| Éclaboussure or pâle | `impact` | ennemi touché (plus grande sur un critique) |
| Poussière et traits de vitesse | `dodge` | esquive |
| Comète de flammes en aplats | `fireball-sorcier` | boule de feu du Sorcier |
| Couronne de flammes et braises | `fire-wrath-sorcier` | explosion du météore |
| Éclair fin et lumineux, sans contour (deux coups), fissures de lumière au sol (style lumière) | `lightning-bolt`, `lightning-ground` | foudre : fils de Zeus, Ikazuchi qui disparaît, zones d'éclair |
| Pétales de jade qui montent, ensō jade au sol | `heal-rise`, `heal-ring` | soin (l'ensō seulement à partir de 15 PV) |
| Cercle d'or fin et lumineux, éclats qui courent dessus, étincelles (boucle, style lumière) | `aura-loop` | Aura de lumière du Paladin, tant qu'elle dure |
| Éclat doux, anneau fin qui s'ouvre et fins rayons (style lumière) | `aura-burst` | lancement de l'Aura de lumière |
| Marteau qui tournoie, trait de pinceau derrière la tête | `hammer` | marteau lancé du Paladin |

**Style « lumière » (octobre 2026, toutes les classes).** Les effets au pinceau ci-dessus étaient trop chargés à côté des personnages peints. Le style lumière, inspiré des effets de Merakintsugi, les remplace pour les héros :

- pas de contour : un cœur blanc et une seule couleur d'accent par classe (Guerrier ambre, Lame violet, Paladin or pâle, Rôdeur vert, Sorcier feu), des traits fins effilés en pointe, un pic très bref puis des éclats ;
- traînée de lame discrète à hauteur de poitrine (`light-slash-<classe>-<degrés>`) et estoc en aiguille (`light-thrust-<classe>`), qui passent devant ou derrière les sprites selon la profondeur ;
- **pas d'effet d'impact** : le flash blanc de l'ennemi touché suffit ;
- esquive : volutes de poussière (`light-dust`) et **images rémanentes** du héros, des silhouettes translucides de la couleur de la classe (`spawnGhost`).

Les classes et la teinte de leurs images rémanentes sont dans `LIGHT_STYLE` (`src/render/renderer.ts`), leurs couleurs de traînée dans `LIGHT` (`tools/vfx.mjs`).

**Feu du Sorcier, inspiré de Brand (League of Legends).** Le seul effet du jeu qui a droit au flou, pour sa chaleur : flammes en couches sans contour (rouge sombre, orange, jaune, cœur blanc), halo flou, braises vives et fumée sombre.

| Effet | Fichier | Quand |
| --- | --- | --- |
| Boule de feu à cœur blanc, flammes qui fouettent, braises et fumée | `brand-fireball` | boule de feu (attaque) |
| Éclatement de feu, debout | `brand-pop` | là où la boule de feu s'arrête |
| Cercle de runes qui se trace pendant l'annonce, puis palpite | `brand-rune` | sceau et météore |
| Comète qui tombe du ciel | `brand-comet` | les 0,3 dernières secondes du météore |
| Pilier de flammes qui jaillit, rugit et s'arrache en braises | `brand-pillar` | explosion du sceau (plus grand pour le météore) |
| Onde de feu au sol et fissures en fusion | `brand-scorch` | sceau, météore, levée du Bouclier de flammes |
| Anneau de flammes (boucle) | `brand-ring` | Dôme de feu |
| Plaque de fissures en fusion et petites flammes (boucle) | `brand-embers` | sol brûlant |
| Sillage de flammes | `brand-trail` | Fuite de feu |

**Auras d'état.** Un état qui dure se montre par une aura dressée juste derrière le héros (on n'en voit que ce qui dépasse de sa silhouette), de la couleur de l'état, et son lancement par une petite animation en sphère au centre du héros :

| État | Aura (boucle) | Lancement |
| --- | --- | --- |
| Bouclier de flammes (Sorcier) | `aura-state-fire` : langues de feu et braises | `dome-fire` : sphère de flammes |
| Frénésie (Guerrier) | `aura-state-rage` : flammes rouges | `dome-rage` : sphère de flammes rouges |
| Sang yokai (Hanyō) | `aura-state-yokai` : énergie violette sombre, plus discrète | `dome-yokai` : sphère violette atténuée |
| Égide (Paladin, sur le héros protégé) | `aura-state-aegis` : traits de lumière dorés et étincelles | `dome-aegis` : bulle-bouclier dorée à treillis hexagonal |

Code : `syncStateAuras` dans `src/render/renderer.ts`.

Les planches plus larges que 4 096 px sont rangées en grille (taille de texture sûre sur toutes les cartes graphiques).

Pour retoucher un effet : modifier sa fonction dans `tools/vfx.mjs` (durées, couleurs, formes), relancer `npm run vfx -- <nom>`. Une planche absente laisse le rendu retomber sur l'ancien effet dessiné par le code.
