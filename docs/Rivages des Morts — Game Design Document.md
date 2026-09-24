# Rivages des Morts — Game Design Document

Sep 24, 2026 · @Meven Hoarau

## Pitch & vision

**Rivages des Morts** (titre de travail) est un action-RPG isométrique à donjons, jouable dans le navigateur. Le joueur, une âme issue d'une mythologie, combat à l'arme et avec des invocations dans un archipel formé des au-delà effondrés.

**Piliers**

- **Action lisible** : combat nerveux au corps à corps, parade, esquive et 2 à 4 compétences simples.
- **Diversité des builds** : tous les builds sont viables, grâce aux tags de classe et au multiclassage.
- **Sessions courtes** : un donjon dure 5 à 20 minutes, la progression se garde entre les sessions.
- **Monde vivant** : des zones sans combat avec PNJ, quêtes rapides, marchands et secrets.

**Objectifs** : un projet portfolio pour l'alternance, un plaisir à créer, un jeu à partager avec des amis, puis une publication.

**Références** : Waven (structure, items, ton), Hades (combat, vue, progression), TFT (paliers de traits), BG3 (multiclassage).

## Univers & lore

Les au-delà de toutes les mythologies se sont effondrés les uns sur les autres et forment désormais un archipel. Les âmes ne trouvent plus leur chemin : elles errent, se corrompent ou deviennent des monstres.

**Les îles** : chaque île est un au-delà, avec sa culture, ses ennemis et son dieu en boss final.

| Île | Mythologie | Ennemis typiques | Boss divin |
| --- | --- | --- | --- |
| Rizières du Yomi (départ) | Japonaise | Petits yokai : hitodama, kodama, kappa, kasa-obake | Jorōgumo, puis Izanami |
| Rives de l'Hadès | Grecque | Ombres, harpies, chiens des Enfers | Hadès |
| Déserts de la Duat | Égyptienne | Momies, scarabées, âmes dévoreuses | Anubis ou Osiris |
| Brumes du Helheim | Nordique | Draugr, loups, géants de givre | Hel |

**Charon, le fil rouge** : le passeur grec est contraint de servir tous les au-delà depuis l'effondrement. Sa barque relie les îles et sert de hub au joueur.

**Le rôle du joueur** : une âme passeuse qui guide, lie ou combat les âmes perdues. La cause de l'effondrement reste le grand mystère de l'histoire.

### Cause de l'effondrement

Gilgamesh a volé les Tablettes du Destin, mais ce vol n'a été possible que parce que les vivants ont oublié les anciens dieux. L'oubli est la cause profonde, le vol le déclencheur.

**La règle du monde : on existe tant qu'on se souvient de nous.** Une âme, un dieu ou une relique tire sa force du souvenir des vivants. En oubliant les anciens dieux, les humains ont affaibli les frontières des au-delà.

**Le mobile de Gilgamesh** : dans l'épopée, la mort de son ami Enkidu le pousse à chercher l'immortalité, en vain. Ici, il ne redoute pas la mort mais l'oubli, la « seconde mort ». Il vole les Tablettes pour graver son nom dans l'éternité. C'est un antagoniste mélancolique, presque compréhensible.

**Conséquences en jeu**

- **Les Oubliés** : des âmes dont plus personne ne se souvient, devenues des silhouettes sans visage aux masques blancs. Ennemis communs à toutes les îles.
- **Le rang des reliques** : une relique est puissante parce que son propriétaire est encore célèbre. Mjöllnir est légendaire, un ofuda anonyme est commun.
- **Les quêtes** : rendre un souvenir à une âme (un objet, un nom, un lieu). Courtes, avec une touche mélancolique.
- **Le héros** : une âme qui a oublié qui elle était. Chaque île lui rend un fragment de mémoire.
- **Enkidu** : l'ami perdu de Gilgamesh, croisé comme PNJ ou allié, clé émotionnelle du dénouement.

**Idée de fin** : vaincre Gilgamesh et restaurer le cycle (donc accepter l'oubli), ou garder une part du pouvoir des Tablettes ? Un choix final possible. La Mésopotamie est l'île finale.

## Races

La race est l'héritage mythologique du personnage : elle donne un passif et une apparence, et pousse vers un style de jeu sans l'imposer. Quatre races sont prévues au lancement.

| Race | Mythologie | Passif 1 | Passif 2 | Style favorisé |
| --- | --- | --- | --- | --- |
| Demi-dieu | Grecque | Parent divin : Zeus (foudre), Arès (dégâts), Hermès (vitesse) ou Athéna (défense) | Sang divin : une fois par donjon, se relève avec la moitié de ses PV | Polyvalent |
| Hanyō (mi-humain, mi-yokai) | Japonaise | Sang yokai : jauge qui déclenche une transformation plus puissante mais moins contrôlable | Instinct yokai : sous 30 % de PV, vitesse et régénération augmentent | Burst, prise de risque |
| Oushebti (statuette funéraire animée) | Égyptienne | Serviteur funéraire : +1 invocation, invocations plus durables | Corps d'argile : une carapace absorbe un coup toutes les quelques secondes | Invocateur, résistant |
| Einherjar (guerrier mort au combat) | Nordique | Rage du guerrier mort : plus il perd de PV, plus il frappe fort | Festin du Valhalla : chaque ennemi tué rend un peu de PV | Agressif |

**Affinité d'île** : une race est un peu plus forte sur l'île de sa mythologie et débloque des dialogues propres avec certains dieux.

**Races envisagées plus tard** : Nahual (aztèque, métamorphe), Sidhe (celtique, illusions).

## Classes & multiclassage

Cinq classes au lancement, neutres culturellement : la race les habille. Un Guerrier Hanyō a l'allure d'un samouraï, un Guerrier Einherjar celle d'un viking.

| Classe | Rôle | Signature (clic droit) | Bonus de palier |
| --- | --- | --- | --- |
| Guerrier (Berserker) | Mêlée, rage | Blocage qui remplit la rage | La rage monte plus vite et Frénésie dure plus longtemps |
| Lame (Assassin des ombres) | DPS mêlée, peu de PV | Dash à travers les ennemis, qui les marque | Les coups après une esquive sont critiques |
| Paladin (Rempart solaire) | Tank / soutien | Bouclier levé, bloque de face | Le bouclier absorbe et soigne les alliés proches, invocations comprises |
| Invocateur (Lieur d'âmes) | Contrôle par les âmes | Lier l'âme d'un ennemi vaincu | Plus d'invocations actives, et plus fortes |
| Rôdeur (Chasseur) | DPS à distance, sans pièges | Tir chargé | Les tirs chargés traversent et marquent les ennemis |

### Kits des classes

Contrôles communs : clic gauche pour l'attaque de base, clic droit pour la signature, Espace pour l'esquive, A / E / R pour les compétences.

| Classe | Clic droit | A | E | R |
| --- | --- | --- | --- | --- |
| Guerrier (Berserker) | Blocage qui remplit la rage | Frappe fracassante : consomme la rage, gros dégâts | Bond : saute sur une zone | Frénésie : attaque plus vite, subit plus de dégâts |
| Lame (Assassin des ombres) | Dash à travers les ennemis, qui les marque | Marque de mort : la cible prend des critiques | Écran de fumée : invisibilité courte | Danse des lames : enchaînement sur plusieurs cibles |
| Paladin (Rempart solaire) | Bouclier levé : bloque de face, on avance lentement | Aura de lumière : à activer, soigne autour | Marteau lancé : aller-retour | Relever : ressuscite une invocation détruite |
| Invocateur (Lieur d'âmes) | Lier l'âme d'un ennemi vaincu | Rappel : les invocations foncent sur la cible | Sacrifice : une invocation explose | Chœur spectral : renforce les invocations |
| Rôdeur (Chasseur) | Tir chargé | Flèche-filet : immobilise | Marque du chasseur : la cible prend plus de dégâts | Recul : bond en arrière en tirant |

La Marque du chasseur remplace la Mine spirituelle prévue au départ, pour garder le Rôdeur en DPS sans pièges.

### Arbres de compétences (V1)

Chaque classe a 3 branches de 4 nœuds, chacune inspirée d'une figure mythologique. En V1, le joueur gagne 1 point par niveau du niveau 2 au niveau 10, soit 9 points pour 12 nœuds : impossible de tout prendre, il faut choisir.

**Règles** : les nœuds d'une branche se prennent dans l'ordre. Le 4e nœud (ultime) demande les 3 précédents. On peut réinitialiser l'arbre gratuitement sur la barque.

**Guerrier (Berserker)**

| Branche | Nœud 1 | Nœud 2 | Nœud 3 | Ultime |
| --- | --- | --- | --- | --- |
| Susanoo, dieu de la tempête (attaque) | Chaque coup donne plus de rage | Frappe fracassante crée une onde de choc | Frénésie dure plus longtemps | **Colère de la tempête** : à rage pleine, chaque coup déclenche un éclair |
| Héraclès (défense) | Le blocage réduit plus de dégâts | **Peau du lion de Némée** : dégâts subis réduits au-dessus de 50 % de rage | Bond étourdit à l'atterrissage | **Les Douze Travaux** : chaque ennemi tué réduit les temps de recharge |
| Berserkir, guerriers-ours d'Odin (risque) | Chaque ennemi tué pendant Frénésie soigne | Sous 50 % de PV, les dégâts augmentent | Bond coûte moins de rage | **Peau d'ours** : une fois par combat, survit à un coup fatal avec 1 PV et la rage pleine |

**Invocateur (Lieur d'âmes)**

| Branche | Nœud 1 | Nœud 2 | Nœud 3 | Ultime |
| --- | --- | --- | --- | --- |
| Abe no Seimei, le grand onmyōji (armée) | Invocations plus résistantes | +1 invocation active (le malus par invocation s'applique) | Rappel donne de la vitesse aux invocations | **Les Douze Shikigami** : une invocation garde une capacité de l'ennemi dont elle vient |
| Orphée, qui charma les Enfers par son chant (soutien) | Chœur spectral soigne aussi le joueur | Chœur spectral ralentit les ennemis proches | Lier une âme est plus rapide | **Chant des Enfers** : un ennemi sous 20 % de PV peut être lié sans être tué |
| Anubis, gardien de la pesée (sacrifice) | Sacrifice fait plus de dégâts | Sacrifice rend des PV au joueur | Une invocation sacrifiée réduit le temps de recharge de Lier | **Le Jugement** : le Sacrifice d'une âme d'élite inflige des dégâts selon les PV de la cible |

Les arbres de la Lame, du Paladin et du Rôdeur suivront le même modèle, plus tard.

**Système de tags** : chaque compétence, arme ou passif porte un ou deux tags de classe. Réunir 2, 4 ou 6 éléments d'une même classe débloque un bonus de plus en plus fort, comme les traits de TFT.

**Le multiclassage se joue à trois moments** :

1. **À la création** : race + classe principale, puis une classe secondaire une fois l'emplacement débloqué.
2. **Avant chaque donjon** : on compose son équipement (arme, pièces d'équipement, relique, compétences). Les tags viennent de cet équipement, et les builds hybrides naissent du mélange.
3. **Au fil de l'aventure** : déblocage permanent de classes, d'items et de l'emplacement secondaire.

**Exemples de synergies** : Paladin + Invocateur (invocations soignées et increvables), Rôdeur + Invocateur (les invocations s'acharnent sur les cibles marquées), Lame + Guerrier (duelliste parade-esquive).

## Armes, items & reliques

Les items sont des **reliques** tirées des mythologies et classées par rang, dans l'esprit de Tomb Raider King. Plus une relique est liée à une figure célèbre, plus elle est puissante.

### Emplacements d'équipement

Sept emplacements seulement, pour ne pas noyer le joueur : l'arme, cinq pièces classiques, et un emplacement de relique autour duquel se construit le build.

| Emplacement | Rôle | Poids dans le build |
| --- | --- | --- |
| Arme | Moveset, dégâts, tags de classe | Fort |
| Casque | Stats et petit effet | Faible |
| Plastron | Stats et petit effet | Faible |
| Jambières | Stats et petit effet | Faible |
| Bottes | Stats et petit effet | Faible |
| Amulette | Stats et effet plus marqué | Moyen |
| Relique | Stats bien plus élevées et une règle unique | Très fort, cœur du build |

**L'emplacement de relique** : ni équipement, ni accessoire. On y place une seule relique (Égide, Ankh, Plume de Maât, Draupnir…), qui oriente tout le reste de l'équipement. Dans le lore, c'est l'endroit où l'âme du joueur accueille un fragment du pouvoir des Tablettes du Destin.

**Tags** : chaque pièce porte au moins un tag de classe. Avec 7 emplacements plus les compétences, atteindre le palier 6 d'une classe demande d'y consacrer presque tout l'équipement, alors que deux paliers 2 ou 4 s'obtiennent facilement en build hybride.

**Idée optionnelle** : des panoplies par île (armure du Yomi, de l'Hadès…) qui donnent un bonus quand on en porte plusieurs pièces.

**Rangs**

| Rang | Origine | Exemples | Tags |
| --- | --- | --- | --- |
| Commune | Objets d'âmes anonymes | Ofuda usé, scarabée de bronze, rune fêlée | 1, effet de stats |
| Rare | Héros et créatures mineurs | Plume de harpie, dent de kappa | 1, petit effet |
| Épique | Héros célèbres | Arc d'Héraclès, sandales d'Hermès | 1 ou 2, effet qui change le jeu |
| Légendaire | Dieux et artefacts majeurs | Voir ci-dessous | 2, règle unique |

**Armes de classe** : épée ou katana (Guerrier), dagues jumelles (Lame), masse et bouclier (Paladin), catalyseur d'âmes (Invocateur), arc (Rôdeur). Chaque type se décline en nombreuses armes : voir « Arsenal » dans Progression.

**Armes hybrides** (plus tard) : une arme porte deux tags et mélange deux styles. Exemples : une lame spectrale dont les parades invoquent une âme (Guerrier + Invocateur), un arc sacré dont les flèches soignent les alliés (Rôdeur + Paladin).

**Reliques légendaires de départ**

| Relique | Mythologie | Tags | Effet |
| --- | --- | --- | --- |
| Kusanagi-no-Tsurugi | Japonaise | Guerrier · Rôdeur | Les coups projettent des lames de vent à distance |
| Magatama de Yasakani | Japonaise | Invocateur | +1 invocation active |
| Égide | Grecque | Paladin · Guerrier | Une parade parfaite pétrifie l'attaquant |
| Casque d'Hadès | Grecque | Lame | Invisible 2 s après une esquive, premier coup critique |
| Harpè de Persée | Grecque | Lame · Guerrier | Exécute les ennemis sous 15 % de PV |
| Ankh | Égyptienne | Paladin · Invocateur | Une invocation détruite revient une fois par salle |
| Plume de Maât | Égyptienne | Invocateur | Les ennemis « jugés » deviennent des invocations élites |
| Gungnir | Nordique | Rôdeur · Guerrier | Lance lancée qui ne rate jamais et revient |
| Mjöllnir | Nordique | Guerrier · Paladin | L'arme lancée revient en frappant de la foudre |
| Draupnir | Nordique | Tous | Chaque palier de tags atteint duplique une relique commune |

Les valeurs (%, durées) sont des premières estimations, à équilibrer en test.

### Kit d'items du Yomi (V1)

Chaque ennemi du Yomi lâche un matériau, et chaque item se fabrique ou se droppe à partir du bestiaire et du boss. Les effets sont indicatifs, à équilibrer en test.

**Matériaux**

| Matériau | Source |
| --- | --- |
| Braise de hitodama | Hitodama |
| Sève de kodama | Kodama |
| Écaille de kappa | Kappa, Kappa renforcé |
| Papier huilé | Kasa-obake |
| Éclat de masque blanc | Oubliés |
| Soie de jorōgumo, Croc venimeux | Jorōgumo |

**Équipement**

| Item | Emplacement | Rareté | Tag | Effet | Source |
| --- | --- | --- | --- | --- | --- |
| Nodachi des rizières | Arme | Commune | Guerrier | Arme de départ, portée longue | Départ |
| Kanabō d'oni | Arme | Rare | Guerrier | Coups lents, Frappe fracassante étourdit | Kappa renforcé |
| Katana de rōnin | Arme | Rare | Guerrier | Plus rapide, le blocage donne plus de rage | Jorōgumo |
| Grelots d'onmyōji | Arme | Commune | Invocateur | Arme de départ, les invocations tapent plus vite | Départ |
| Éventail de la Jorōgumo | Arme | Épique | Invocateur | Les invocations posent des toiles qui ralentissent | Jorōgumo |
| Chapeau de paille | Casque | Commune | — | +PV | Forge (sève) |
| Masque d'Oublié | Casque | Rare | Invocateur | Les ennemis ciblent les invocations en priorité | Oubliés |
| Carapace de kappa | Plastron | Rare | Guerrier | Dégâts de face réduits | Forge (écailles) |
| Hakama de soie | Jambières | Peu commune | — | Vitesse de déplacement | Forge (soie) |
| Geta du kasa-obake | Bottes | Peu commune | — | Esquive plus longue (le kasa-obake est représenté sautant sur une geta) | Kasa-obake |
| Lanterne-braise | Amulette | Commune | Guerrier | Les attaques brûlent | Forge (braises) |
| Magatama fêlé | Amulette | Rare | Invocateur | Invocations plus durables | Boutique de fin |

**Reliques**

| Relique | Rareté | Tag | Effet | Source |
| --- | --- | --- | --- | --- |
| Coupelle du kappa | Rare | Guerrier | Tant qu'on n'est pas touché, les dégâts augmentent. Un coup reçu vide la coupelle quelques secondes | Kappa renforcé |
| Fil de Jōren | Épique | Tous | Une esquive laisse un fil : le premier ennemi qui le touche est immobilisé | Jorōgumo |
| Magatama de Yasakani | Légendaire | Invocateur | +1 invocation active | Jorōgumo (très rare) |

## Combat

Le combat mélange arme au corps à corps, parade/esquive et invocations, en vue isométrique et en temps réel.

- **Arme** : attaque de base, avec un moveset qui change selon le type d'arme.
- **Parade** : sa forme dépend de la classe (blocage et rage pour le Guerrier, bouclier levé pour le Paladin). Le clic droit porte la mécanique signature de chaque classe.
- **Esquive** : dash court avec invulnérabilité brève.
- **Compétences** : 2 à 4 emplacements, volontairement simples (une touche, un effet clair).
- **Invocations** : des âmes combattent aux côtés du joueur. Leur origine dépend de la classe (ennemis liés, pactes, anciens porteurs).

**Contrôles** : clavier-souris pour commencer (déplacement ZQSD, visée à la souris, clic gauche pour attaquer, clic droit pour la mécanique de classe, Espace pour esquiver, A / E / R pour les compétences).

**Équilibrage des invocations** : pas de limite fixe stricte, mais chaque invocation active affaiblit le joueur (dégâts ou PV réduits). Un build invocateur pur est fort en groupe mais fragile seul, un build duelliste reste solide sans armée. Les armes sont détaillées dans « Armes, items & reliques ».

## Structure du jeu

Le jeu alterne exploration sans combat et donjons roguelite, comme dans Waven.

```mermaid
flowchart LR
  A[Barque de Charon<br/>hub] --> B[Zone d'exploration<br/>de l'île]
  B --> C[Donjon<br/>run de 5 à 20 min]
  C --> D[Récompenses<br/>et déblocages]
  D --> A
  B --> A
```

**Zones d'exploration** : de petites cartes par île, pas un vrai open world. On y trouve :

- des PNJ et des quêtes qui racontent le lore ;
- des marchands, une forge et des améliorations ;
- des secrets et objets cachés.

**Règle des quêtes** : courtes et sans corvée. Pas de chaînes interminables ni d'allers-retours inutiles. Une quête se boucle en quelques minutes ou en un donjon.

**Donjons** : des parcours fixes, identiques à chaque passage, comme dans Waven. Aucune récompense entre les salles : chaque combat laisse des coffres, ouverts plus tard. Un boss clôt le donjon, suivi d'une boutique de fin à prix réduit.

**Hub** : la barque de Charon. Marchand, forgeron et maître des classes y vivent, et elle s'agrandit avec la progression.

## Premier donjon : les Rizières noyées

Le premier donjon du Yomi dure environ 10 minutes : 10 salles fixes, toujours dans le même ordre, jusqu'à la Jorōgumo. Un parcours fixe se conçoit et s'équilibre plus facilement, ce qui convient bien au prototype.

| # | Salle | Contenu | Rôle |
| --- | --- | --- | --- |
| 1 | Combat | Hitodama (feux follets) | Apprendre déplacement et attaque |
| 2 | Combat | Hitodama + kodama | Choisir ses cibles (le kodama soigne) |
| 3 | Combat | Kappa | Apprendre à bloquer |
| 4 | Événement | Une âme oubliée | Petit choix rapide, récompense, lore |
| 5 | Élite | Kappa renforcé | Premier vrai défi |
| 6 | Trésor | Coffre caché dans les rizières | Oboles et matériaux |
| 7 | Combat | Kasa-obake | Ennemis imprévisibles |
| 8 | Combat | Mélange de tous les yokai et Oubliés | Tester le build |
| 9 | Sanctuaire | Autel en ruine | Soin avant le boss |
| 10 | Boss | Jorōgumo | Fin du donjon |
| 11 | Boutique de fin | Marchand du donjon | Récompense : achats à prix réduit |

**Coffres** : chaque combat gagné laisse un coffre, dont le contenu suit les tables de drop. On les ouvre plus tard, sur la barque, comme dans Waven.

**Mort** : on garde tout ce qui a été ramassé (XP, ressources et coffres non ouverts), mais on perd sa progression dans le donjon : il faut le recommencer depuis la première salle.

**Boutique de fin** (comme Waven) : après le boss, une petite salle propose des items et ressources liés au donjon, environ 25 % moins chers que sur la barque. Elle récompense la victoire et donne une raison de finir le donjon.

**Drops à la Warframe** : chaque ennemi et chaque boss a sa table de drop, avec un taux par objet. Le joueur sait ce qu'il cherche et où le trouver, ce qui pousse au farming.

| Rareté | Taux indicatif | Exemples (Jorōgumo) |
| --- | --- | --- |
| Commun | 40 à 60 % | Soie de jorōgumo, Oboles |
| Peu commun | 15 à 25 % | Croc venimeux, plan d'arme du Yomi |
| Rare | 5 à 10 % | Arme du Yomi (ex. Katana de rōnin) |
| Très rare | 1 à 2 % | Relique épique, Éclat des Tablettes |

Pistes pour que le farming reste agréable :

- **Tables visibles en jeu** dans un codex, pour savoir exactement quoi farmer et où.
- **Protection contre la malchance** : chaque échec augmente légèrement la chance du drop suivant.
- **Difficultés supérieures** débloquées après la première victoire, avec de meilleurs taux.
- **Matériaux du Yomi** nécessaires aux armes du Yomi, pour donner une raison de revenir.

## Bestiaire du Yomi

Chaque ennemi du Yomi apprend quelque chose au joueur, dans l'ordre où il apparaît dans les Rizières noyées.

| Ennemi | Rôle | Comportement | Ce qu'il apprend |
| --- | --- | --- | --- |
| Hitodama (feu follet) | Essaim | Fonce en groupe et brûle au contact, meurt en 1 ou 2 coups | Attaquer, se placer |
| Kodama (esprit des arbres) | Soutien | Reste en retrait et soigne les autres yokai | Choisir ses cibles |
| Kappa | Tank | Carapace qui bloque de face, charge en ligne droite. Un blocage réussi renverse la coupelle d'eau sur sa tête et l'étourdit | Bloquer, contourner |
| Kasa-obake (parapluie hanté) | Surprise | Bondit de façon imprévisible et retombe sur le joueur | Lire les signaux, esquiver |
| Oubliés | Mêlée standard | Silhouettes aux masques blancs, présentes sur toutes les îles | L'ennemi récurrent du lore |
| Kappa renforcé (élite) | Élite | Plus résistant, charges enchaînées | Premier vrai défi |

### Principe des boss

Comme dans Wakfu et Waven, chaque boss a une mécanique qui lui est propre et une faiblesse cachée. Il faut l'observer pour la comprendre, puis l'exploiter. Chaque boss est difficile à sa manière, et la mécanique s'inspire toujours de son mythe.

| Boss | Mythe | Piste de mécanique |
| --- | --- | --- |
| Izanami (Yomi) | Izanagi avait promis de ne pas la regarder, et l'a fait | La regarder la renforce : il faut l'attaquer sans lui faire face |
| Hadès (Hadès) | Son casque le rend invisible | Invisible : on le repère à ses traces et aux sons |
| Anubis (Duat) | La pesée du cœur contre la plume de Maât | Une balance à équilibrer pendant le combat pour le rendre vulnérable |
| Hel (Helheim) | La moitié de son corps est vivante, l'autre morte | Seul un côté est vulnérable à la fois, et il change |

Ces pistes sont à affiner quand on travaillera chaque île.

### Boss : la Jorōgumo

Trois phases, dans une arène qui se couvre de toiles au fil du combat.

1. **Forme humaine** : attaques à l'éventail, elle appelle de petites araignées. Les premières toiles apparaissent.
2. **Forme d'araignée** : elle révèle son corps, pose des toiles qui ralentissent et charge. L'espace se réduit.
3. **Sous 30 % de PV** : elle monte au plafond, fait pleuvoir des fils et attire le joueur vers elle. C'est la phase où sa faiblesse peut être exploitée.

**Toiles à brûler** : des hitodama flottent dans l'arène. Les frapper près d'une toile la fait brûler et libère de l'espace. Le décor devient une ressource.

**Faiblesse : le fil de Jōren** : selon une légende, une jorōgumo enroula son fil autour de la jambe d'un homme au bord d'une cascade. Il l'accrocha à une souche, qui fut entraînée dans l'eau. En jeu, des souches et des piliers sont placés dans l'arène. Quand elle attire le joueur avec son fil, une esquive au bon moment autour d'une souche y accroche le fil : la Jorōgumo est arrachée du plafond, s'écrase et reste vulnérable quelques secondes. Rien ne l'indique directement : le joueur doit observer le fil et faire le lien.

## Zone d'exploration du Yomi : Yomotsu Hirasaka

La zone s'appelle Yomotsu Hirasaka, la pente qui sépare les vivants du Yomi dans le mythe japonais. Izanagi l'a scellée avec un rocher en fuyant Izanami. Elle compte 6 lieux, 6 PNJ, 5 quêtes courtes et 4 secrets.

**Lieux**

| Lieu | Contenu |
| --- | --- |
| Ponton de Charon | Arrivée, la barque et le hub |
| Village des âmes | PNJ, marchande, forge |
| Rizières ouvertes | Exploration, ennemis faibles, secrets |
| Cascade | Passage caché derrière l'eau |
| Grand Rocher | Le sceau d'Izanagi, fermé en V1 : une voix se fait entendre derrière |
| Entrée du donjon | Accès aux Rizières noyées |

**PNJ**

| PNJ | Rôle | Ce qui le rend unique |
| --- | --- | --- |
| Charon | Passeur, quête principale | Bougon, fatigué de servir tous les au-delà |
| Tetsu, le forgeron sans nom | Forge et améliorations | À moitié Oublié : il ne se souvient plus de son nom |
| Obaa Kiku | Marchande (Oboles) | Vieille âme qui tenait une maison de thé, bavarde et chaleureuse |
| Yuki | Petite âme perdue, quête secondaire | A perdu sa lanterne, reste près des statues Jizō |
| Le tanuki marchand | Farceur, quête secondaire | Se cache parmi les statues, vend des « trésors » douteux |
| Le moine du Rocher | Gardien du lore | Raconte l'histoire d'Izanagi et Izanami |

**Quêtes** (5 minutes maximum chacune, un seul déplacement, objectif toujours clair)

| Quête | Type | Déroulé | Récompense |
| --- | --- | --- | --- |
| Le passeur | Principale | Charon présente le monde et envoie le joueur au village | Déblocage du village |
| Le nom du forgeron | Principale | Retrouver dans les rizières la plaque votive (ema) où Tetsu avait écrit son nom | Tetsu retrouve la mémoire, la forge s'ouvre |
| La dame des rizières | Principale | Des âmes disparaissent dans les rizières : entrer dans le donjon et vaincre la Jorōgumo | Boutique de fin, suite de l'histoire |
| La lanterne de Yuki | Secondaire | Rapporter une braise de hitodama | Recette de la Lanterne-braise |
| Le tanuki parmi les statues | Secondaire | Trouver lequel des Jizō est le tanuki déguisé | Un indice vers un secret et un coffre |

**Secrets**

- **Les six Jizō** : dans la tradition japonaise, six statues de Jizō protègent les âmes. Offrir une Obole à chacune donne une récompense unique.
- **Derrière la cascade** : un coffre et un fragment de mémoire qui raconte la légende du fil de Jōren. Le joueur qui explore obtient ainsi l'indice sur la faiblesse de la Jorōgumo.
- **Sous le pont des rizières** : un coffre d'Oboles et de matériaux.
- **Le Grand Rocher** : écouter la voix derrière le sceau débloque un premier fragment sur Izanami, en préparation de la suite.

## Progression

Le build se construit avec l'équipement choisi avant chaque donjon, et tout ce qu'on gagne est conservé. Il n'y a pas de bonus temporaires pendant un donjon.

| Boucle | Ce qui progresse | Ce qui est conservé |
| --- | --- | --- |
| Pendant le donjon | XP des ennemis tués, coffres de fin de combat, ressources ramassées | Tout, même en cas d'échec (coffres ouverts après le donjon) |
| Entre les donjons | Armes de l'arsenal, reliques, niveaux d'équipement, classes débloquées, emplacement de classe secondaire, talents de race | Tout |
| Monde | Quêtes, îles et donjons débloqués, agrandissement de la barque | Tout |

**Niveau du personnage** : niveau max 20 pour l'instant, environ 5 niveaux par île (Yomi 1-5, Hadès 6-10, Duat 11-15, Helheim 16-20, Mésopotamie au niveau max). Objectif à terme : niveau 50, le plafond montant avec les nouvelles îles. Une fois au niveau max, la progression passe par l'équipement.

**Donjons dans la durée** (plus tard) : pour que les anciens donjons ne meurent pas, deux systèmes à détailler.

- **Difficulté à l'entrée** : paliers de stase ou niveau choisi en entrant, comme dans Waven, avec de meilleures récompenses aux paliers élevés.
- **Rotation** : certains donjons sont mis en avant par période, avec des bonus (drops, matériaux). Une version plus poussée que celle de Waven.

### Ressources, monnaies & amélioration

Comme dans Waven, on améliore son équipement avec des ressources récoltées. Chaque monnaie est ancrée dans le lore.

| Ressource | Origine dans le lore | Où on l'obtient | À quoi elle sert |
| --- | --- | --- | --- |
| Oboles | La pièce qu'on glissait aux morts pour payer Charon | Ennemis, coffres, quêtes | Marchands de la barque, boutique de fin de donjon |
| Matériaux d'île | Propres à chaque au-delà | Donjons et exploration de l'île | Forge : améliorer armes et équipement |
| Éclats de mémoire | Souvenirs rendus aux âmes | Quêtes, boss, premières victoires | Progression permanente (classes, talents de race) |
| Éclats des Tablettes | Fragments du pouvoir volé par Gilgamesh | Boss, très rares | Éveiller une relique ou lui ajouter un tag |

**Exemples de matériaux d'île** : soie de jorōgumo et bois de kodama (Yomi), asphodèle et obsidienne (Hadès), lin funéraire et sable doré (Duat), givre éternel et fer de draugr (Helheim).

**Arsenal** : comme dans Waven, le joueur collectionne de nombreuses armes, les garde toute l'aventure et en change librement entre les donjons, sur la barque. On part avec une arme, cinq pièces d'équipement et une relique (voir « Emplacements d'équipement »).

- **Beaucoup d'armes par classe** : chaque île apporte ses propres armes pour chaque classe, avec un effet ou un moveset qui les distingue.
- **Obtention** : boss, quêtes, coffres cachés, marchands, ou fabrication à la forge.
- **Amélioration** : chaque arme monte de niveau avec les matériaux de son île d'origine. De quoi donner envie de refaire les îles.
- **Sommet de l'arsenal** : les reliques légendaires qui sont des armes (Kusanagi, Harpè, Gungnir, Mjöllnir). Les autres reliques (Égide, Ankh, Magatama…) se placent dans l'emplacement de relique.

| Classe | Yomi | Hadès | Duat | Helheim |
| --- | --- | --- | --- | --- |
| Guerrier | Katana de rōnin | Xiphos d'hoplite | Khopesh | Hache de draugr |
| Lame | Kunai jumeaux | Dagues d'Érinye | Griffes de Bastet | Seax de givre |
| Paladin | Naginata et bouclier de temple | Lance et bouclier spartiate | Sceptre ouas | Marteau runique |
| Invocateur | Grelots d'onmyōji | Lyre d'Orphée | Sistre d'Hathor | Bâton de völva |
| Rôdeur | Yumi en bambou | Arc de chasse d'Artémis | Boomerang de Thot | Arc en frêne d'Yggdrasil |

Les compétences et passifs se débloquent en montant de niveau, dans un arbre de compétences par classe comme dans Waven, et s'équipent entre les donjons.

**Options d'amélioration (validées)**

1. **Niveaux d'arme** (V1) : les matériaux montent le niveau d'une arme, plafonné au niveau du personnage. Certains paliers débloquent un passif.
2. **Éveil de relique** (plus tard) : un Éclat des Tablettes éveille une relique et renforce son effet. Exemple : l'Égide éveillée pétrifie en zone.
3. **Sceaux** (plus tard, à développer et équilibrer) : graver un sceau sur une arme lui ajoute un tag de classe.
4. **Fusion** (plus tard) : fusionner des reliques identiques les fait monter de niveau.
5. **Invocations** (plus tard) : elles gagnent des niveaux comme le joueur, mais plus vite.
6. **Arbre de mémoire** (plus tard) : talents permanents par race, payés en Éclats de mémoire, réinitialisables.

**Garde-fou d'équilibrage** : privilégier les améliorations qui ouvrent des options (tags, variantes, éveils) plutôt que des stats brutes. Sinon, un build trop amélioré écrase les autres et on perd la diversité voulue.

## Direction artistique & ton

Le ton est épique mais coloré, dans l'esprit de Waven : des enjeux mythologiques, sans noirceur écrasante.

- **Rendu** : 3D low-poly, caméra fixe isométrique, shader stylisé de type cel-shading pour l'effet « fausse 3D ».
- **Personnages** : un squelette d'animation commun, des modèles différents par race. Les armes et items se voient sur le personnage.
- **Îles** : chaque au-delà a sa palette propre (brume et rouge pour le Yomi, or et sable pour la Duat, etc.).
- **Assets** : packs libres de droits (Kenney, Quaternius, KayKit) comme base, retouchés pour l'identité du jeu.

Les prompts de génération par IA de chaque asset sont dans l'onglet Prompts visuels.

## Technique

Le jeu tourne dans le navigateur avec **Babylon.js** (JavaScript/TypeScript), pour rester sur une stack web et préparer le multi.

- **Moteur** : Babylon.js, avec sa physique (Havok), ses animations et son GUI intégrés.
- **Données** : items, compétences et tags décrits en JSON, pour ajouter du contenu sans toucher au code du combat.
- **Multi (plus tard)** : serveur Node, par exemple avec Colyseus. Solo et coop PvE d'abord, PvP peut-être plus tard. L'architecture doit séparer dès le départ la logique de jeu du rendu.
- **Cibles** : navigateurs desktop en priorité, mobile à évaluer.

### Créer la zone d'exploration du Yomi

On construit la zone en cinq étapes, du papier au jeu, en validant chaque étape avant d'ajouter du détail.

1. **Plan sur papier** : 3 ou 4 lieux reliés, à l'échelle d'une île de Waven. Par exemple le ponton de la barque, un village d'âmes (PNJ, marchand), les rizières à explorer (secrets), et l'entrée du donjon.
2. **Graybox dans Babylon.js** : poser le terrain avec de simples cubes et plans, pour tester les distances, la caméra et le temps de trajet. On ne passe à l'étape suivante que quand on s'y déplace avec plaisir.
3. **Habillage** : remplacer les cubes par des assets modulaires (Kenney, Quaternius, KayKit), assemblés dans Blender puis exportés en glTF (.glb), le format que Babylon.js charge nativement. L'éditeur communautaire Babylon.js Editor peut aussi servir à placer les éléments.
4. **PNJ et quêtes en données** : dialogues et quêtes décrits en JSON, ou écrits avec Ink (un langage de dialogue qui a un moteur JavaScript, inkjs). On ajoute une quête sans toucher au code du jeu.
5. **Secrets** : quelques coffres cachés et passages discrets, placés en dernier une fois la zone jouable.

Contenu de la zone (PNJ, quêtes, secrets) à définir ensemble ensuite.

## Prototype & roadmap

Le prototype valide le combat et le système d'âmes sur une seule île, avant tout ajout de contenu.

| Étape | Contenu | Ce qu'elle valide |
| --- | --- | --- |
| 1. Combat de base | Guerrier, une arme, déplacement, frappe, parade, esquive, un type d'ennemi | Le combat est-il agréable ? |
| 2. Système d'âmes | Invocateur, lier les ennemis vaincus | L'élément unique du jeu fonctionne-t-il ? |
| 3. Premier donjon | Salles fixes, coffres de fin de combat, boutique de fin, un boss (Jorōgumo) | La boucle donjon + farming est-elle addictive ? |
| 4. Première île | Zone d'exploration du Yomi, 2 ou 3 quêtes courtes, un marchand | La boucle monde + donjon tient-elle ? |
| 5. Contenu | Lame, Paladin, Rôdeur, les 4 races, progression entre les donjons | Diversité des builds |
| 6. Suite | Nouvelles îles, niveau max 50, difficulté et rotation des donjons, multijoueur | — |

**Règle de périmètre** : tout concevoir sur papier, mais ne coder que le strict nécessaire à chaque étape.

### Version 1 : dedans ou plus tard

La V1 est une tranche jouable complète mais petite : une île, un donjon, deux classes. Tout ce qui ajoute un système en plus attend la suite.

| Domaine | Dans la V1 | Plus tard |
| --- | --- | --- |
| Monde | Île du Yomi : petite zone, 2 ou 3 quêtes courtes, barque réduite (marchand, forge, ouverture des coffres) | Autres îles, Mésopotamie, agrandissement de la barque |
| Donjons | Les Rizières noyées, boss Jorōgumo, boutique de fin, coffres, drops | Difficulté à l'entrée, rotation, autres donjons |
| Classes | Guerrier, Invocateur | Lame, Paladin, Rôdeur, classe secondaire |
| Races | Einherjar et Oushebti (passifs simples) | Demi-dieu (choix du parent), Hanyō (jauge de transformation), Nahual, Sidhe, affinité d'île |
| Équipement | 7 emplacements, niveaux d'arme, tags et paliers, 2 ou 3 reliques | Sceaux, armes hybrides, éveil, fusion, panoplies |
| Progression | XP, niveau max 10, arbre de compétences réduit pour les 2 classes | Niveau 20 puis 50, arbre de mémoire, niveaux d'invocation |
| Ressources | Oboles, matériaux du Yomi | Éclats de mémoire, Éclats des Tablettes |
| Multi | Aucun | Coop PvE, puis PvP éventuel |

Le niveau max de la V1 (10) est une proposition, à ajuster selon la durée de jeu réelle.

## Questions ouvertes

- [ ] Nom définitif du jeu
- [x] Contrôles : clavier-souris pour commencer
- [x] Armes : armes de classe d'abord, armes hybrides ensuite
- [x] Invocations : pas de limite stricte, malus par invocation active
- [x] Liste complète des items et tags (base proposée dans « Armes, items & reliques »)
- [x] Ressources et monnaies : inspirées de Waven, options d'amélioration validées
- [x] Cause de l'effondrement : Gilgamesh et les Tablettes, sur fond d'oubli des vivants
- [x] Multi : solo et coop PvE d'abord, PvP peut-être plus tard
- [ ] Plus tard : sceaux à détailler et équilibrer
- [x] Compétences et passifs : arbre de compétences par classe débloqué en montant de niveau
- [x] Mort : on garde ressources et coffres, on perd la progression dans le donjon
- [x] Niveau max du personnage : 20 pour l'instant (l'XP vient des ennemis tués, gardée même en cas d'échec)
- [ ] Plus tard : niveau max 50, difficulté à l'entrée des donjons, système de rotation
