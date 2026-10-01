# Rivages des Morts — Charte 2D

Charte de la refonte graphique : **toutes les animations sont dessinées en 2D par Nano Banana 2** (application Gemini, sans API), sur des planches de **16 images**. La 3D, Blender et la pipeline GLB sont abandonnés : ce document remplace [Charte 3D](Charte%203D.md) et [pipeline](pipeline.md) pour le rendu des personnages. Les prompts correspondants sont dans [`prompts-2d/`](prompts-2d/) et se régénèrent avec `npm run prompts-2d` (`tools/prompts-2d.mjs`).

Ce que la charte 3D garde comme valeur : la lumière froide, la règle « rouge = danger ennemi », l'anneau clair sous les héros, les hauteurs relatives des créatures (hitodama 0,6 m, kappa 1,3 m, héros 1,8 m…). Tout cela est reproduit ici ou dans le jeu, pas dans les planches.

**Le GDD d'origine prime.** Le jeu est un archipel d'au-delà (Yomi, Hadès, Duat, Helheim, puis la Mésopotamie) : les personnages ne sont pas « du Yomi ». Seuls les yokai et les boss du Yomi le sont. Les héros, eux, doivent rester cohérents sur toutes les îles : **la race fixe le corps et la culture du vêtement, la classe fixe seulement le rôle, la posture, la silhouette, la couleur d'accent et l'arme** (voir 2).

## 1. Rendu : peint, contour encre, deux tons

- Formes lisses peintes, léger dégradé (plus clair en haut, plus sombre en bas), plus quelques plis simples.
- **Contour encre bleu-noir fin** sur la silhouette extérieure seulement (2 à 3 px pour un personnage de 512 px).
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

- **Héros : 3 têtes de haut, tous exactement de la même taille** (les 20 combinaisons). Grosse tête, épaules larges, grands pieds, mains / armes / accessoires ×1,3 à ×1,5.
- **Ennemis** : l'esprit chibi de la charte 3D, mais la forme propre à chaque créature. Chacun est dessiné **à pleine hauteur dans sa case** : c'est le jeu qui le met à l'échelle d'après sa hauteur (hitodama petit, kappa plus grand, héros 1,8 m). On ne dessine donc pas le hitodama plus petit dans l'image.
- **Boss** : case plus grande (768 px), proportions libres, tête et point faible toujours lisibles.

| | Case finale | Personnage debout | Pieds (ligne de base) |
| --- | --- | --- | --- |
| Héros, ennemis | 512 × 512 | ≈ 400 px (78 %) | à 456 px du haut (89 %) |
| Boss | 768 × 768 | ≈ 600 px | à 684 px du haut |

Les marges servent aux armes, cheveux et gestes larges. Les poses à plat (mort) gardent la même échelle : le personnage ne grossit jamais.

## 4. Planches : 16 images, un seul format

Une planche = une animation = **16 images** en grille **4 colonnes × 4 lignes**, lues de gauche à droite puis de haut en bas, dans **une image carrée 1:1**. À 2 048 px de côté, chaque case fait **512 × 512 px natifs** : c'est exactement la case finale des héros et des ennemis, sans agrandissement. Pour un boss, demander si possible la 4K (cases de 1 024 px, réduites à 768) ; en 2K, l'import agrandit les cases de 512 à 768, ce qui adoucit un peu l'image.

Il n'y a plus de format paysage ni de boss en deux moitiés : toutes les animations, de tous les personnages, ont la même mise en page. (L'abandon des 32 images allège le travail de génération, la dérive du modèle et la mémoire vidéo : une planche de 16 cases de 512 px pèse environ 17 Mo décompressée, contre 33 Mo.)

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
5. **Import** : un outil à écrire (voir 10) qui découpe, détoure, aligne sur la ligne de base, met à l'échelle, et écrit `public/sprites/anim/…` avec ses `frameTags`.

Pour un nouveau personnage ou une nouvelle race, ajouter son bloc dans `tools/prompts-2d.mjs` (`ENEMIES`, `BOSSES`, `RACES`, `OUTFITS` ou `CLASSES`, puis `LOTS`) et relancer `npm run prompts-2d`.

## 9. Lots et phases

Les tenues propres à chaque race multiplient par 4 le nombre de planches de héros : on avance donc par lots, **dans cet ordre**.

| Lot | Contenu | Fichier | Prompts |
| --- | --- | --- | --- |
| **1. Izanami** | les deux formes du boss (voilée, vrai visage) encore en pixel art, et le pêcher de son arène (décor provisoire, 2 états) | [`01-izanami.md`](prompts-2d/01-izanami.md) | 18 |
| **2. Yokai du Palais** | shikome, ikazuchi, ikusa, encore en pixel art | [`02-yokai-du-palais.md`](prompts-2d/02-yokai-du-palais.md) | 23 |
| **3. Héros du Yomi** | les 5 classes avec la race Hanyō (tenues japonaises), 8 animations de profil. Commencer par le Guerrier | `03-heros-<classe>.md` | 45 (9 par classe) |
| 4. Yokai des Rizières | hitodama, kodama, kappa, kappa renforcé, kasa-obake, Oublié, petite araignée : déjà peints, à refaire pour l'harmonie | [`04-yokai-des-rizieres.md`](prompts-2d/04-yokai-des-rizieres.md) | 53 |
| 5. Jorōgumo | le premier boss, déjà peint, à refaire avec Izanami comme référence | [`05-jorogumo.md`](prompts-2d/05-jorogumo.md) | 16 |

Soit **155 prompts** (fiches de profil et planches de profil) pour la première vue. Ensuite :

- **Face et dos** de chaque lot : `plus-tard/<lot>-face-dos-…md`.
- **Autres races** (Einherjar, Oushebti, Demi-dieu : tenues nordique, égyptienne, grecque), de préférence en **rhabillant** les planches de la série du Yomi (on joint la planche finie et la fiche de la race) plutôt qu'en redessinant chaque animation : [`plus-tard/01-fiches-autres-races.md`](prompts-2d/plus-tard/01-fiches-autres-races.md).
- **Autres îles** : yokai et boss de l'Hadès, de la Duat, du Helheim.

Tant que les autres races ne sont pas faites, leurs héros doivent afficher, dans le jeu, la série du Yomi (une solution de repli à prévoir dans l'import, comme la teinte actuelle).

## 10. Points d'attention

- **Mémoire vidéo** : une planche de 16 images de 512 × 512 pèse environ 17 Mo décompressée. Un héros a 8 planches de profil (≈ 135 Mo) : il faut charger **l'animation à la demande** (comme `setHero` le fait déjà) et ne garder que les planches de la vue et de l'état courants. L'import devra aussi pouvoir réduire les cases (384 px suffisent si le héros fait 150-200 px à l'écran).
- **Cohérence** : sur 16 images, Nano Banana dérive moins que sur 32, mais peut encore changer la taille de la tête ou déplacer l'arme. Si une planche dérive, relancer avec la même fiche.
- **Test d'abord** : générer **une fiche et une planche** (Izanami, `profil-attente`) et les regarder avant d'en faire d'autres. Ce premier test règle les prompts, et vérifie que Gemini rend bien une image carrée d'au moins 2 048 px.
- **Outil d'import** : à écrire après la première planche testée. Il devra gérer la grille 4 × 4, le fond magenta, la ligne de base à 89 %, le miroir, la réduction des cases et l'agrandissement des boss.
- **PNJ** (Charon, le moine, Obaa-Kiku, Tanuki, Tetsu, Yuki) : pas encore couverts ; même principe, une fiche et une attente suffisent en général.
