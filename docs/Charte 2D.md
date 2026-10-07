# Rivages des Morts — Charte 2D

Charte de la refonte graphique : **toutes les animations sont dessinées en 2D par Nano Banana 2** (application Gemini, sans API), sur des planches de **16 images**. La 3D, Blender et la pipeline GLB sont abandonnés : ce document remplace [Charte 3D](Charte%203D.md) et [pipeline](pipeline.md) pour le rendu des personnages. Les prompts correspondants sont dans [`prompts-2d/`](prompts-2d/) et se régénèrent avec `npm run prompts-2d` (`tools/prompts-2d.mjs`).

**Référence de style (7 octobre 2026) : le Hanyō Invocateur.** C'est le design le plus réussi du jeu ([portrait](../public/sprites/heros-hanyo-invocateur.png), planche `anim/heros-hanyo-invocateur`) : illustration peinte d'action-RPG au trait d'anime semi-réaliste, **proportions réalistes** (environ 7 têtes), costume détaillé (plis, motifs brodés, accessoires lisibles), contour encre net, ombres peintes douces. Tout nouveau personnage se dessine dans ce style, et la fiche de l'Invocateur Hanyō se joint aux prompts comme référence de style. Les planches complètes plus « cartoon » importées en octobre 2026 (Demi-dieux, Rôdeur et Sorcier Hanyō) jurent avec le reste du jeu (PNJ, île, décor) : elles restent en place en attendant d'être redessinées dans ce style (voir 9).

Ce que la charte 3D garde comme valeur : la lumière froide, la règle « rouge = danger ennemi », l'anneau clair sous les héros, les hauteurs relatives des créatures (hitodama 0,6 m, kappa 1,3 m, héros 1,8 m…). Tout cela est reproduit ici ou dans le jeu, pas dans les planches.

**Piste en essai (octobre 2026) : le héros modulaire.** Les planches image par image (sections 1 à 10) restent la référence pour les ennemis et les boss. Pour les héros, on essaie un squelette 2D dont chaque pièce porte l'équipement visible : voir la [section 11](#11-héros-modulaire-paper-doll-piste-en-essai). Les lots de héros (section 9) attendent le résultat de cet essai.

**Le GDD d'origine prime.** Le jeu est un archipel d'au-delà (Yomi, Hadès, Duat, Helheim, puis la Mésopotamie) : les personnages ne sont pas « du Yomi ». Seuls les yokai et les boss du Yomi le sont. Les héros, eux, doivent rester cohérents sur toutes les îles : **la race fixe le corps et la culture du vêtement, la classe fixe seulement le rôle, la posture, la silhouette, la couleur d'accent et l'arme** (voir 2).

## 1. Rendu : peint, contour encre, deux tons

- Style de l'**Invocateur Hanyō** (voir l'introduction) : illustration peinte semi-réaliste, au trait d’anime, pas cartoon. Formes peintes avec un dégradé doux, plis du tissu, motifs et accessoires dessinés nettement, sans texture fine.
- **Contour encre bleu-noir net** sur la silhouette, plus fin sur les détails intérieurs (1 à 2 px pour un personnage d'environ 200 px).
- **Deux tons** de lumière : la couleur de base et une ombre **teintée bleu-violet**, jamais noire.
- Lumière froide et douce venant du **haut-gauche**, identique sur toutes les îles : le sprite garde le même éclairage et la même ombre bleu-violet partout, c'est le décor de chaque île qui porte sa palette (brume du Yomi, or de la Duat…). Personnages plus saturés et plus clairs que le décor.
- Métal peint : un seul reflet blanc net. Pas de photo, pas de bruit, pas de texture fine, pas d'aspect « rendu 3D ».
- Caméra légèrement en plongée (environ 35° au-dessus de l'horizon), comme le jeu.
- **Aucun effet dessiné dans les planches** : ni magie, lueur, traînée, fumée, étincelle, trait de vitesse, ombre au sol, sol, texte ou cadre. Le jeu ajoute les effets, les ombres, l'anneau du héros et la dissolution en encre de la mort. Le détourage garde tout ce qui n'est pas le fond : un effet dessiné resterait collé au sprite.
- Couleur de classe (accent sur la tenue et l'arme, la culture du vêtement venant de la race) : Guerrier brun-rouge sombre (jamais le rouge vif), Invocateur bleu-vert, Lame violet, Paladin or, Rôdeur vert. Le vermillon vif est réservé au danger ennemi, donc jamais dans les planches des héros.

## 2. Race = corps et tenue, classe = rôle et arme

Règle du GDD : « cinq classes neutres culturellement, la race les habille ». Un Guerrier Hanyō a l'allure d'un samouraï, un Guerrier Einherjar celle d'un viking.

| Race | Corps | Culture du vêtement |
| --- | --- | --- |
| Einherjar | massif, épaules larges, tresses, barbe, peau pâle et cicatrices | nordique : cotte de mailles, fourrures, lin, runes |
| Oushebti | argile ou faïence bleu-vert craquelée, hiéroglyphes peints, raideur de statuette | égyptienne : lin plissé, colliers, or, bronze |
| Demi-dieu | peau dorée lumineuse, anneau doré discret, emblème du parent divin | grecque : chiton, bronze, laurier |
| Hanyō | oreilles et petites cornes de yokai, marques, yeux clairs, griffes | japonaise : armure laquée, robes, bandeaux |

| Classe | Rôle et posture | Accent | Arme de départ (Yomi) |
| --- | --- | --- | --- |
| Guerrier | armure partielle lourde, arme portée haut, penché en avant | brun-rouge sombre | nodachi |
| Invocateur | robe ample, breloques à la ceinture, posture droite | bleu-vert | grelots (bâton à anneaux) et talismans |
| Lame | tenue sombre ajustée, posture basse | violet | kunai jumeaux |
| Paladin | tissu clair et or, posture de rempart | or | naginata et bouclier de temple |
| Rôdeur | tenue légère de chasseur, carquois, posture de tir | vert | yumi |

Les 20 tenues (une par race × classe) sont écrites dans `OUTFITS`, en tête de `tools/prompts-2d.mjs`. Un Einherjar Invocateur est donc une völva nordique, un Oushebti Paladin un gardien de temple égyptien, un Demi-dieu Guerrier un hoplite.

> **Armes par île (à trancher plus tard).** Le GDD donne plusieurs armes par classe et par île (Guerrier : katana de rōnin, xiphos, khopesh, hache de draugr…). En 2D, chaque arme visible demanderait ses propres planches. Les fiches montrent donc l'**arme de départ du Yomi** (colonne ci-dessus), et c'est le champ `weapon` de `CLASSES` dans le générateur qui la décrit. Quand les autres îles arriveront, il faudra choisir : garder l'arme de départ à l'écran, ou redessiner les planches de la classe par arme majeure.

## 3. Proportions et échelle

- **Héros : proportions réalistes, environ 7 têtes de haut, comme l'Invocateur Hanyō, et tous exactement de la même taille** (les 20 combinaisons). Silhouette élancée, tête de taille naturelle, armes et accessoires à leur taille réelle mais bien lisibles.
- **Ennemis** : la forme propre à chaque créature, dans le même style peint semi-réaliste que les héros. Chacun est dessiné **à pleine hauteur dans sa case** : c'est le jeu qui le met à l'échelle d'après sa hauteur (hitodama petit, kappa plus grand, héros 1,8 m). On ne dessine donc pas le hitodama plus petit dans l'image.
- **Boss** : même planche et même case que les autres, proportions libres, tête et point faible toujours lisibles. C'est le jeu qui les affiche plus grands (Izanami : 2,6 m).

| | Case finale | Personnage debout | Pieds (ligne de base) |
| --- | --- | --- | --- |
| Tous (héros, ennemis, boss) | 256 × 256 | ≈ 200 px (78 %) | à 228 px du haut (89 %) |

Les marges servent aux armes, cheveux et gestes larges. Les poses à plat (mort) gardent la même échelle : le personnage ne grossit jamais.

## 4. Planches : 16 images, un seul format

Une planche = une animation = **16 images** en grille **4 colonnes × 4 lignes**, lues de gauche à droite puis de haut en bas, dans **une image carrée 1:1 de 1 024 × 1 024 px** (la taille que rend Gemini par défaut). Chaque case fait donc **256 × 256 px** : c'est la résolution retenue pour tout le jeu, validée en jeu avec Izanami (octobre 2026). Inutile de demander la 2K ou la 4K.

Il n'y a plus de format paysage ni de boss en deux moitiés : toutes les animations, de tous les personnages, ont la même mise en page. (L'abandon des 32 images allège le travail de génération, la dérive du modèle et la mémoire vidéo : une planche de 16 cases de 256 px pèse environ 4 Mo décompressée.)

## 5. Fond et détourage

- Fond **gris moyen uni `#8f8f8f`**, identique partout, sans dégradé ni vignette, sans grille ni cadre (les traits de grille compliquent le détourage).
- Exception : l'**Oublié** (robe gris-bleu) est dessiné sur fond **magenta `#ff00ff`**, parce que `tools/detourer.mjs` confond un sujet gris avec le fond gris. L'import devra accepter une couleur de fond par personnage.

## 6. Vues

| Vue | Description | Quand |
| --- | --- | --- |
| Profil | 3/4 de côté, tourné vers la droite | **maintenant** |
| Face | 3/4 de face, vers le bas-droite | plus tard |
| Dos | 3/4 de dos, vers le haut-droite | plus tard |

Nano Banana 2 ne réussit pas une fiche qui montre les trois vues d'un coup. **Chaque vue a donc sa propre fiche, d'une seule figure** : on fait d'abord le profil (de zéro), et la face et le dos se font ensuite à partir de la fiche de profil jointe (dossier [`plus-tard/`](prompts-2d/plus-tard/)).

Le côté gauche est le **miroir du droit** : le jeu retourne l'image. Les armes et détails asymétriques (yumi, bouclier) sont donc toujours dessinés du même côté. Héros : profil, face et dos (les deux dernières plus tard). Ennemis et boss : profil, puis face.

## 7. Animations

**Héros (8)** — Attente, Course, Attaque, Garde, Esquive, Touché, Mort, Compétence.
**Ennemis et boss (6)** — Attente, Déplacement, Anticipation, Attaque, Touché, Mort, plus un geste propre quand il y en a un (kappa étourdi, kodama qui soigne, ikazuchi qui disparaît, Izanami qui invoque, etc.).

| Animation | Boucle | Découpage des 16 images |
| --- | --- | --- |
| Attente | oui | un souffle lent : inspire, pause, expire ; image 16 ≈ image 1 |
| Course (héros) | oui | un cycle de 8 poses, chacune tenue 2 images |
| Déplacement (ennemi) | oui | un cycle en 4 temps de 4 images |
| Attaque (héros) | non | 1-2 départ, 3-4 armée, 5-6 armée tenue, 7-8 coup, **9 impact**, 10-12 prolongement, 13-16 récupération |
| Attaque (ennemi) | non | 1-2 départ, 3-5 coup, **6 impact**, 7-10 prolongement, 11-16 récupération |
| Anticipation (ennemi) | non | montée en tension, 15-16 figées (le jeu la tient le temps du télégraphe) |
| Garde | non | 1-6 mise en garde, 7-16 garde tenue |
| Esquive | non | 1-4 anticipation et départ, 5-8 esquive (pic vers 6), 9-13 arrêt et réception, 14-16 récupération |
| Touché | non | 1-5 recul, 6-8 chancelle, 9-16 se reprend |
| Mort | non | chute puis immobile dès l'image 15 ; **le corps reste plein** (le jeu fait la dissolution en encre) |
| Compétence | non | 1-7 concentration, **8-9 déclenchement**, 10-12 tenue, 13-16 récupération |

Vitesses de lecture conseillées : attente 120 ms par image, course 45 ms, attaque et esquive 30-40 ms ; le jeu peut les ajuster à la durée de l'action. L'impact tombe sur l'image 9 (héros) ou 6 (ennemis).

## 8. Workflow pour un personnage

1. **Fiche de profil** : prompt en tête du fichier de son lot. Générer 2-3 variantes et garder la meilleure : elle fixe le design de toutes les planches.
2. **Planches de profil** : pour chaque animation, joindre la fiche de profil et coller le prompt.
3. **Plus tard, face et dos** : générer la fiche de la vue à partir de la fiche de profil, puis les planches de cette vue.
4. **Rangement** : `~/Pictures/game visual/2d/<personnage>/<vue>-<animation>.png`.
5. **Import** : ajouter le personnage dans `tools/planches.json` (une entrée par animation, `"layout": [4, 4, 4, 4]`, et le même `"refHeight"` partout : la hauteur en pixels du personnage debout dans la source, pour qu'il garde la même taille dans toutes ses animations), lancer `npm run planches -- <nom>`, puis pointer `src/data/sprites.json` vers `anim/<nom>.json`. Voir les entrées `izanami` et `izanami-revelee`. Si Gemini ajoute un bandeau de titre sur fond sombre, l’option `"crop": [x0, y0, x1, y1]` (fractions de l’image) le coupe avant le détourage (voir `ikusa`, marche) ; un texte sur le fond gris s’efface avec `erase`. Les images fixes (décor) passent par `tools/sprites.json` et `npm run sprites`.

Pour un nouveau personnage ou une nouvelle race, ajouter son bloc dans `tools/prompts-2d.mjs` (`ENEMIES`, `BOSSES`, `RACES`, `OUTFITS` ou `CLASSES`, puis `LOTS`) et relancer `npm run prompts-2d`.

## 9. Lots et phases

Les tenues propres à chaque race multiplient par 4 le nombre de planches de héros : on avance donc par lots, **dans cet ordre**.

| Lot | Contenu | Fichier | Prompts |
| --- | --- | --- | --- |
| ~~1. Izanami~~ **fait** | les deux formes du boss (voilée, vrai visage) et le pêcher de son arène (2 états) : dans le jeu depuis octobre 2026 | [`01-izanami.md`](prompts-2d/01-izanami.md) | 18 |
| ~~2. Yokai du Palais~~ **fait** | shikome, ikazuchi, ikusa : dans le jeu depuis octobre 2026 | [`02-yokai-du-palais.md`](prompts-2d/02-yokai-du-palais.md) | 23 |
| **3. Héros** *(à reprendre dans le style de l'Invocateur Hanyō)* | 8 animations de profil par héros, sur l'exemple de l'Invocateur Hanyō. Des planches complètes (8 animations par planche) sont dans le jeu depuis octobre 2026 pour le Rôdeur et le Sorcier Hanyō et les cinq Demi-dieux, mais trop « cartoon » : elles restent en place jusqu'à leurs nouvelles planches. Si le héros modulaire est retenu (section 11), ce lot devient « pièces du corps et de l'équipement » | `03-heros-<classe>.md` | 45 (9 par classe) |
| 4. Yokai des Rizières | hitodama, kodama, kappa, kappa renforcé, kasa-obake, Oublié, petite araignée : déjà peints, à refaire pour l'harmonie | [`04-yokai-des-rizieres.md`](prompts-2d/04-yokai-des-rizieres.md) | 53 |
| 5. Jorōgumo | le premier boss, déjà peint, à refaire avec Izanami comme référence | [`05-jorogumo.md`](prompts-2d/05-jorogumo.md) | 16 |

Soit **155 prompts** (fiches de profil et planches de profil) pour la première vue. Ensuite :

- **Face et dos** de chaque lot : `plus-tard/<lot>-face-dos-…md`.
- **Autres races** (Einherjar, Oushebti, Demi-dieu : tenues nordique, égyptienne, grecque), de préférence en **rhabillant** les planches de la série du Yomi (on joint la planche finie et la fiche de la race) plutôt qu'en redessinant chaque animation : [`plus-tard/01-fiches-autres-races.md`](prompts-2d/plus-tard/01-fiches-autres-races.md).
- **Autres îles** : yokai et boss de l'Hadès, de la Duat, du Helheim.

**Héros jouables en attendant.** Les planches des Einherjar et des Oushebti sont mauvaises, sauf celles du Guerrier : à la création du personnage (et chez le moine), seuls l'**Einherjar Guerrier** et l'**Oushebti Guerrier** se choisissent, les autres classes de ces deux races sont grisées (« Bientôt »). La liste est `PLAYABLE` dans `src/render/heroes.ts` : y ajouter une classe dès que ses planches sont refaites. Un héros déjà créé garde sa race et sa classe. Hanyō et Demi-dieu restent ouverts dans toutes les classes.

## 10. Points d'attention

- **Mémoire vidéo** : une planche de 16 images de 256 × 256 pèse environ 4 Mo décompressée, soit une trentaine de Mo pour les 8 animations de profil d'un héros. Le chargement à la demande des héros (`setHero`) reste utile quand la face et le dos arriveront.
- **Poids du jeu (à traiter plus tard)** : en octobre 2026, `public/sprites/anim/` pèse 76 Mo, dont **46 Mo pour les 20 planches de héros** (une par race et par classe, jusqu'à 5,5 Mo chacune). Alléger le jeu n'est pas dans le périmètre de l'essai de la section 11, mais le héros modulaire y contribue : un squelette et quelques dizaines de pièces remplaceraient ces 20 planches. À chiffrer une fois l'essai fait.
- **Cohérence** : sur 16 images, Nano Banana dérive moins que sur 32, mais peut encore changer la taille de la tête ou déplacer l'arme. Si une planche dérive, relancer avec la même fiche.
- **Test d'abord** (pour chaque nouveau personnage) : générer **une fiche et une planche** et les regarder avant d'en faire d'autres. Ce premier test règle les prompts, et vérifie que Gemini rend bien une image carrée de 1 024 px.
- **Import** : `npm run planches` gère déjà la grille 4 × 4 (`layout`), la ligne de base et l'échelle commune (`refHeight`). Restent à faire : le fond magenta de l'Oublié, et le repli des autres races sur la série du Yomi.
- **PNJ** (Charon, le moine, Obaa-Kiku, Tanuki, Tetsu, Yuki) : pas encore couverts ; même principe, une fiche et une attente suffisent en général.

## 11. Héros modulaire (« paper doll ») : piste en essai

Décision du 5 octobre 2026. Une charte technique proposait de refaire le jeu sous Godot 4 avec des personnages à squelette 2D. On **garde TypeScript et Babylon.js** (17 800 lignes de règles, de réseau et de rendu, dont la coop, qu'il aurait fallu réécrire) et on **reprend seulement l'idée du squelette**, dans le rendu actuel.

### Pourquoi

Aujourd'hui, un héros est une planche d'images complètes (section 4), une par race et par classe : 20 planches, sans rien qui montre l'équipement porté ni le genre du personnage. Un héros modulaire apporte :

1. **L'équipement visible** : changer de casque, de plastron, de jambières, de bottes ou d'arme change ce qu'on voit à l'écran. C'est le gain que le joueur remarque le plus.
2. **Le genre au choix** (homme ou femme), sans effet sur le jeu.
3. **Plus de postures sans redessiner** : une nouvelle posture est une suite de poses de squelette, pas une planche de 16 images. Le Sorcier, qui emprunte toujours les planches de l'Invocateur (`BORROWED` dans `src/render/heroes.ts`), en profiterait.
4. **Moins de poids**, plus tard (voir la section 10).

### Ce qui ne change pas

- La **caméra orthographique**, le sol projeté, l'ombre, l'anneau sous les héros, le miroir pour regarder à gauche, les effets du jeu, et la règle « aucun effet dessiné dans les images ».
- Les **proportions** (section 3), le fond gris uni et le détourage (section 5), la vue de profil d'abord (section 6).
- Les **ennemis et les boss** : ils restent en planches de 16 images.
- Le **moteur** : le squelette est un groupe de plans Babylon, pas un nouveau moteur.

### Principe

- **Un squelette unique** pour tous les héros, de **quinze pièces environ** en vue de profil : tête, cheveux ou casque, buste, bassin, bras et avant-bras de chaque côté, cuisse et jambe de chaque côté, pieds, arme. (La charte Godot parlait de 18 à 24 os : de profil, moins suffisent.)
- Chaque pièce est une **image détourée** sur son propre plan, avec son pivot à l'articulation (épaule, coude, hanche, genou). Un ordre de profondeur fixe place les pièces les unes devant les autres.
- Les **animations sont des données** : pour chaque posture du jeu (`idle`, `move`, `windup`, `strike`, `guard`, `dash`, `channel`), des poses clés (position et rotation de chaque pièce) que le jeu interpole. Le jeu choisit toujours la posture d'après l'état du héros, comme avec les planches.
- Chaque pièce utilise le **même shader `sprite`** que les autres images (`tint`, `flash`, `alpha`, `flipX`) : le jeu règle ces valeurs sur toutes les pièces du héros. Le miroir vers la gauche retourne le groupe entier.
- Au plus trois héros sont à l'écran, soit une cinquantaine de plans : le coût de rendu est négligeable.

### Équipement visible

Sept emplacements (GDD), dont cinq se voient :

| Emplacement | Pièce du squelette qu'il remplace |
| --- | --- |
| Arme | l'arme tenue en main (et le bouclier du Paladin, l'arc du Rôdeur) |
| Casque | la couche casque ou cheveux de la tête |
| Plastron | le buste (et les bras si l'objet a des manches) |
| Jambières | les cuisses et les jambes |
| Bottes | les pieds |
| Amulette, relique | non visibles pour l'instant (un petit accessoire plus tard, si l'on veut) |

Un objet visible porte donc, dans `items.json`, le nom de ses images de pièces. Un objet sans image garde la pièce d'origine de la race. (La charte Godot ajoutait un emplacement « épaulières » : il n'existe pas dans le GDD, on ne l'ajoute pas.)

### Questions ouvertes

À trancher grâce à l'essai, pas avant :

- **L'équipement dépend-il de la race ?** Les corps diffèrent (Einherjar massif, Oushebti raide, Demi-dieu, Hanyō) : un même plastron peut ne pas aller à tous. Hypothèse de départ : **un gabarit de corps commun**, avec la race portée par la tête, la peau et les détails, et un équipement dessiné une seule fois.
- **Le genre** change-t-il seulement la tête, le buste et le bassin, ou aussi la tenue d'origine ?
- **La coop** : il faudra envoyer aux invités le genre et les objets visibles de chaque héros (nouveaux champs de `HeroView`, avec un nouveau numéro de `PROTOCOL`, comme pour `barrier`). Le genre se range aussi dans `Hero` (`src/game/progress.ts`) et se choisit à la création du personnage.
- **La mort** : la dissolution en encre doit s'appliquer à toutes les pièces à la fois.

### Essai : un seul héros

On ne refait pas les 20 héros avant de savoir si cela tient. Essai sur l'**Einherjar guerrier** (c'est le héros de départ, `heros`), de profil seulement :

1. **Fiche de pièces** : Nano Banana 2 dessine le héros, puis ses pièces séparées sur fond gris uni (une image de pièces, chacune bien écartée des autres). Plusieurs essais, on garde les pièces qui s'assemblent le mieux.
2. **Détourage par pièce** : une extension de `npm run planches` ou de `tools/detourer.mjs` qui découpe chaque pièce et note son pivot.
3. **`ModularHero`** dans `src/render/` : le groupe de plans, les poses clés et l'équipement. Activé par `?modulaire=1`, comme `?pixel=1`, pour comparer avec la planche actuelle sans rien casser.
4. **Quatre postures** : attente, déplacement, coup, garde.
5. **Deux objets interchangeables** : un casque et une arme, pour voir l'équipement changer.
6. **Comparaison côte à côte** avec la planche actuelle, en jeu, à l'échelle réelle (héros d'environ 200 px).

**Il est réussi si :** à l'échelle du jeu, les articulations ne se voient pas ou ne gênent pas ; les pièces gardent le même style d'une génération à l'autre ; changer un objet se voit sans retouche ; et la fluidité est au moins celle des planches.

**Si l'essai échoue**, le repli le plus simple : garder les planches actuelles et y **superposer l'arme et le casque**, en notant pour chaque image la position de la tête et de la main (un petit fichier de points d'ancrage par planche). On obtient l'équipement visible, mais pas le genre ni les postures sans redessiner.

### Hors périmètre pour l'instant

- **Alléger le jeu** : « on verra plus tard » (section 10).
- Les vues de face et de dos, les autres races (leurs corps et leurs tenues), les PNJ.
- La migration vers Godot : écartée, voir plus haut.

## 12. Effets animés (`npm run vfx`)

Les effets du combat ne passent pas par Nano Banana : `tools/vfx.mjs` les dessine image par image (SVG rastérisé par sharp) dans `public/sprites/fx/`, au format des planches, et le rendu les pose au sol (`sheetFx` dans `src/render/renderer.ts`) ou debout face à la caméra comme les personnages (`uprightFx` : éclair, pétales). Style de la charte : traits de pinceau, éclaboussures d'encre, aplats or pâle et blanc, contour encre, aucun flou lumineux, jamais de vermillon.

| Effet | Fichier | Quand |
| --- | --- | --- |
| Trait de pinceau qui balaie l'arc, puis s'effiloche | `slash-120`, `-150`, `-180`, `-200`, `-360` | coup d'arme en arc (la planche la plus proche de l'ouverture de l'arme) |
| Lance de pinceau | `thrust` | estoc (katana, kaiken…) |
| Éclaboussure or pâle | `impact` | ennemi touché (plus grande sur un critique) |
| Poussière et traits de vitesse | `dodge` | esquive |
| Comète de flammes en aplats | `fireball-sorcier` | boule de feu du Sorcier |
| Couronne de flammes et braises | `fire-wrath-sorcier` | explosion du météore |
| Éclair debout (deux coups) et fissures au sol | `lightning-bolt`, `lightning-ground` | foudre : fils de Zeus, Ikazuchi qui disparaît, zones d'éclair |
| Pétales de jade qui montent, ensō jade au sol | `heal-rise`, `heal-ring` | soin (l'ensō seulement à partir de 15 PV) |
| Cercle de pinceau or qui tourne (boucle) | `aura-loop` | Aura de lumière du Paladin, tant qu'elle dure |
| Rayons or et anneau qui s'ouvre | `aura-burst` | lancement de l'Aura de lumière |
| Marteau qui tournoie, trait de pinceau derrière la tête | `hammer` | marteau lancé du Paladin |

Pour retoucher un effet : modifier sa fonction dans `tools/vfx.mjs` (durées, couleurs, formes), relancer `npm run vfx -- <nom>`. Une planche absente laisse le rendu retomber sur l'ancien effet dessiné par le code.
