# Pistes : aspects d'arme et maîtrise de classe (9 octobre 2026)

Étude, pas implémentation : aucun fichier de jeu n'est modifié par ce document. Il répond aux deux pistes que le plan d'équilibrage des classes laisse ouvertes (`docs/plan-equilibrage-classes.md`, section 4), à partir de l'état réel du dépôt au commit `cb48cd8`. Les réponses du joueur au questionnaire, et ce qu’elles changent, sont en fin de document.

Ce que l'autre agent garde, et que je ne touche pas : étape 0 (bot « humain », banc à cible mobile, journal de parties), sous-classes au niveau 25 ou 50, bonus de rôle en coop, bénédictions du Yomi sans fond, refonte du Paladin.

Rappel de la règle du joueur : aucun nerf, seulement des renforts. C'est ce qui rend ces deux pistes délicates : elles ajoutent du pouvoir, donc elles poussent dans le sens de la « course à la puissance » que le plan signale déjà.

---

## Piste A — Aspects d'arme

### Le problème d'équilibrage qu'elle était censée régler

Dans Hades, l'arme de base (une lame, un arc…) est unique ; les **aspects** en sont des variantes débloquées en jouant, chacune changeant les mécaniques du moveset. L'idée attirante ici : une classe n'aurait qu'**une** arme de classe et deux ou trois façons de la jouer.

Le problème, c'est que ce besoin est déjà couvert — deux fois plutôt qu'une.

### Ce qui existe déjà dans le code

**1. Trois objets par emplacement et par classe, un par rôle.** Le champ `spec` de `src/data/items.json` (`dps`, `survie`, `boss`) est la charpente de la 0.11.0 :

- 129 objets, dont 125 avec emplacement, 4 objets de quête (`ema-tetsu`, `tasse-ebrechee`, `concombre`, `tablette-argile`) et 18 armes ;
- exactement **105 objets portent un `spec`** : 35 `dps`, 35 `survie`, 35 `boss`, soit 3 par emplacement et par classe (15 par emplacement, 5 classes). Les 24 objets sans `spec` sont les pièces communes (Shiroshōzoku, Hakama de soie, Geta du kasa, Chapeau de paille, Mino de paille), les 4 amulettes de race (Gohei, Corne d'oni, Dogū, Tsuba du rōnin) et le Fil de Jōren, l'Objet du Yomotsu-hegui, etc.

**2. Les armes font déjà le travail d'aspect.** Chaque classe a 3 ou 4 armes, chacune avec un **moveset différent** et des effets de kit :

| Classe | Arme de départ (sans `spec`, sauf Sorcier et Paladin) | Survie | DPS | Boss (légendaire) |
|---|---|---|---|---|
| Guerrier | Nodachi des rizières, arc 150°, 9 dégâts, 1,9 m, engagement 0,26 s | Katana de rōnin, **estoc** 2,6 × 1,5 m, 7 dégâts, engagement 0,15 s, +2 % de soin au blocage | Nodachi de l'Ikusa, arc 160°, 12 dégâts, 2,1 m, coups plus rapides selon les PV perdus | Kanabō du Démon-Sang, arc 200°, 15 dégâts, 1,7 m, engagement 0,63 s, onde de choc sur la Frappe |
| Sorcier | Grelots d'onmyōji (**c'est aussi l'arme `survie`**) | idem grelots | Éventail de la Jorōgumo, 5 dégâts, 10,5 m, boules qui ralentissent | Bâton de Susanoo, **4 boules**, perçantes, dôme de feu |
| Lame | Kunai jumeaux, arc 120°, 8 dégâts, 2,1 m, engagement 0 | Crocs de la Jorōgumo, 9 dégâts, +2 PV par critique | Kaiken d'Izanami, **estoc** 0,7 m, 8 dégâts, critiques +0,5 | Kusarigama des Oubliés, arc 140°, 9 dégâts, 2,7 m, spectre +2 m, poison +5 s |
| Paladin | Naginata et bouclier de temple (**arme `survie`**) | idem naginata, arc 180°, 10 dégâts, 2,2 m | Tetsubō de guerre, arc 170°, 18 dégâts, Marteau ×1,6 | Miroir de Yata, estoc 1,1 m, 14 dégâts, Aura qui affaiblit |
| Rôdeur | Yumi en bambou, 10 dégâts, 10 m | Hankyū de chasse, 7,7 dégâts, 8 m, Recul −2,5 s, flèches +20 % | Arc du pêcher, 10 dégâts, 11 m, tir chargé 25 % plus rapide | Arc d'Ikazuchi, 8,8 dégâts, foudre sur tir plein |

Chaque arme a en plus ses **paliers de forge 10 / 25 / 50** (`paliers` dans l'arme), soit un troisième effet propre. Un « aspect » (une variante mécanique de l'arme) est donc déjà là, en objet.

**3. Les armes de boss sont déjà des déblocages par boss.** Les objets `spec: "boss"` ne tombent que sur la Jorōgumo et Izanami : `src/game/infini.ts` les exclut du pool du donjon infini (`def.spec !== 'boss'`), et les listes `items` de `drops` dans `items.json` les réservent aux boss. Le Paladin fait exception : son arme `boss`, le Miroir de Yata, est donnée à la **première victoire des Rizières** (`firstVictory` de `dungeons.json`), en même temps que le Katana de rōnin (Guerrier, `survie`), les Crocs (Lame, `survie`), l'Éventail (Sorcier, `dps`) et l'Arc du pêcher (Rôdeur, `dps`). Le « déblocage par boss » demandé existe donc **déjà** — et son incohérence est là, visible : une arme `boss` n'est pas réservée aux boss.

**4. Le `spec` est aussi affiché** comme étiquette d'objet (`SPEC_NAMES` dans `src/ui/panels.ts`), donc le joueur lit déjà DPS / Survie / Boss.

### Regard critique

- Les aspects au sens de Hades **doublonnent** le système `spec` : ce serait un second jeu de variantes par-dessus celui qui existe.
- La seule chose que le système `spec` ne fait pas : il **remplace** l'arme, il ne la **modifie** pas. Un joueur qui aime le kit du Guerrier (postures) doit abandonner le Katana de rōnin pour reprendre le Nodachi, et inversement. Les variantes changent le coup de base, pas les touches A / E / R — sauf effet de kit déjà prévu sur l'arme (Marteau ×1,6 du Tetsubō, 4 boules du Bâton).
- Ajouter des variantes ne règle **aucun** déséquilibre entre classes : ça ajoute du choix. Le plan le dit déjà : la diversité ne compense pas une classe sous 70 %.
- Une variante mécanique neuve veut dire de l'état en cours de combat (une posture différente, un fil lancé, des orbes). Cet état doit passer dans le protocole coop : `PROTOCOL` monterait, et il faudrait toucher `snapshot`/`PRIVATE`/`FIELDS` dans `src/net/protocol.ts`. C'est le coût caché le plus lourd.

### Cinq propositions, si l'on garde une forme réduite

Forme proposée : **un aspect par classe**, qui se pose sur **l'arme équipée** (quelle qu'elle soit) au lieu de la remplacer, débloqué par un boss, armé avant la descente. C'est la seule forme qui ne double pas le `spec`.

1. **Guerrier — Aspect du rempart.** Le clic droit ne tient plus une posture : la Garde est fixe. Dégâts subis −20 % en permanence, mais la rage ne monte plus au blocage : +4 rage par seconde, plafonnée à 60. (`perks`, pas de nouvel état.)
2. **Lame — Aspect du fil.** Le Pas de l'ombre devient un lancer de fil à 6 m : la Lame est **tirée** vers la cible au lieu de la traverser ; dégâts −20 %, recharge 2,5 s → 2 s. Nouvel état de déplacement (un « grappin »).
3. **Sorcier — Aspect des orbes.** Les boules de feu n'orbitent plus autour du Sorcier en salve : 3 orbes tournent à 1,2 m autour de lui et frappent au contact pour 25 % des dégâts. Nouvel état (orbes), lourd en réseau.
4. **Paladin — Aspect du marteau-rempart.** Le Marteau lancé revient **en bloquant de face** : +20 de garde max, dégâts −15 %, mais le Marteau ne peut plus être lancé tant que la garde est vide. (`paladin.guard`, `paladin.hammer`.)
5. **Rôdeur — Aspect du piège.** La Flèche-filet se **pose au sol** et se déclenche au passage : durée 4 s au lieu de 2,5 s, elle ne peut plus être tirée sur une cible. (`ranger.net` + un objet posé, état déjà existant côté filets.)

Valeurs à régler en jeu, une par une, sur le bot puis à la main.

### Coût de mise en œuvre (forme réduite)

- `src/data/` : définir les aspects (le plus proche est `skills.json` → `passives`, ou un nouveau fichier `aspects.json`), et leur condition de déblocage (les drapeaux `jorogumo_vaincue`, `izanami_vaincue` existent déjà).
- `src/game/loadout.ts` : appliquer l'aspect après les effets d'arme, avant les paliers — c'est là que se construit `PlayerConfig`.
- `src/game/progress.ts` : mémoriser l'aspect choisi. Le plus simple est un **drapeau** (`flags.aspect_guerrier`), qui est déjà sérialisé et migré ; rien à changer dans `saves.ts`.
- `src/ui/panels.ts` : une fenêtre de choix sur la barque de Charon, à côté de l'arbre de compétences.
- `src/net/protocol.ts` : **aucun changement** si l'aspect ne pose que des `perks`/réglages (ils voyagent dans `PlayerConfig` via `Member.config` et `Start.heroes[].config`). **Montée de `PROTOCOL` (9 → 10)** dès qu'un aspect crée un état lu par l'affichage (orbes, grappin, filet posé) : `FIELDS`, `PRIVATE` et `HERO_DEFAULTS` devraient l'accueillir, et deux versions du jeu ne joueraient plus ensemble.
- Migrations de sauvegarde : **aucune** dans la forme à drapeaux (la 0.11.0 a déjà ajouté un `migrate()` qui gère les objets retirés et les changements d'emplacement ; un aspect rangé en drapeau passe tout seul).
- `tools/equilibrage.mjs` : si l'aspect se choisit, le banc doit pouvoir le simuler, sinon chaque mesure est fausse par omission.

### Risques

- Recouvrement avec les **sous-classes** de l'autre agent : un aspect est un axe de passifs par classe, comme une sous-classe. Deux axes qui font la même chose, c'est de la confusion pour le joueur.
- Les aspects 2, 3 et 5 demandent de l'état de combat neuf : le coût réel est proche d'une petite refonte, pas d'un réglage.
- Aucun gain d'équilibrage : c'est du fun et de la rejouabilité, ce que le plan classe déjà en « rien à ajouter tant que le joueur n'a pas rejoué ».

### Avis

**À abandonner sous sa forme « variantes de l'arme de classe ».** Le système `spec` de la 0.11.0 (105 objets, 15 armes, paliers de forge, armes de boss) remplit déjà le rôle, et mieux : le joueur choisit *un objet*, pas *un mode*. Saupoudrer des variantes par-dessus rend le build illisible.

**À reporter** pour la forme réduite « un aspect par classe posé sur l'arme équipée » — c'est la seule qui ne double rien — **mais après les sous-classes**, et seulement si le joueur juge que l'arbre de compétences ne suffit pas. Le gain attendu est du plaisir, pas de l'équilibrage. Si l'on veut améliorer l'existant avant tout nouvel axe, deux gestes moins chers le font : donner au Nodachi de l'Ikusa et au Katana de rōnin un effet de kit (pas seulement des chiffres), et remettre les armes `boss` dans le giron des boss (le Miroir de Yata distribué aux Rizières détruit la logique du `spec`). Le joueur a répondu le 9 octobre : il garde le déblocage actuel, et la piste aspects pivote vers la personnalisation d’arme — voir « Réponses du joueur » en fin de document.

---

## Piste B — Maîtrise de classe

### Le problème d'équilibrage qu'elle était censée régler

Le vrai point faible des cinq classes est le **début de partie**, et le plan le mesure : Rôdeur 71 à 79 % au niveau 1, Guerrier 48 % ressenti, Lame « dégâts durs à placer ». Or la progression du personnage **s'arrête au niveau 10** : `levels.pointsFrom = 2`, `pointsUntil = 10` dans `skills.json`, donc 9 points pour 12 nœuds, et rien à dépenser après. Du niveau 10 au niveau 50, le héros ne grandit que par l'équipement.

La maîtrise de classe (Darkest Dungeon, Vampire Survivors) promet une progression **lente, par classe, au long cours**, donc un renfort qui tombe exactement là où les classes souffrent — sans rien retirer.

### Ce qui existe déjà dans le code

- `src/game/progress.ts` : `ProgressState` (version 1) contient `hero`, `xp`, `talents: string[]`, `items`, `equipped`, `itemLevels`, `dungeons`, `materials`, `flags: Record<string, number>`, `quests`, `chests`. Les `flags` sont des compteurs **libres** : de quoi compter des points de maîtrise **sans changer la forme de la sauvegarde**.
- `Progress.talentPoints` / `skillPoints` : la mécanique de points existe déjà, mais **liée au niveau du héros** et **partagée** entre branches. `canLearn` impose l'ordre dans une branche.
- `migrate()` (`progress.ts`) : le point d'entrée unique des vieilles sauvegardes. Il gère déjà `weaponLevel`, `weaponLevels`, l'ancien `dungeon`, le `companion` retiré, le passage Invocateur → Sorcier, les objets qui ont changé d'emplacement, les objets sortis du jeu, et le héros par défaut. Une nouvelle clé dans `ProgressState` y est absorbée automatiquement (`{ ...fresh(), ...rest }`).
- `src/game/saves.ts` : **une sauvegarde par personnage** (`rivages-des-morts:perso:<id>`, index dans `rivages-des-morts:persos`). **Il n'existe aucune sauvegarde de compte.** Une maîtrise partagée entre tous les personnages devrait donc vivre **hors** de `ProgressState` — une clé nouvelle, avec son propre `migrate` et son propre export. C'est le point de coût principal de la piste.
- `src/ui/panels.ts` `openSkills` : l'écran d'arbre de compétences (3 branches × 4 nœuds, compteur de points, réinitialisation gratuite sur la barque) est le modèle exact d'un écran de maîtrise.
- `src/net/protocol.ts` : `Member.config` et `Start.heroes[].config` transportent le `PlayerConfig` **complet** construit par `buildLoadout`. Un passif de maîtrise qui ne touche que le `PlayerConfig` **ne demande aucune montée de `PROTOCOL`** — c'est un avantage net sur les aspects.

### Cinq propositions chiffrées

1. **Paliers sans écran (le moins cher).** Chaque classe accorde un petit passif tous les 10 niveaux **joués avec elle** (10, 20, 30, 40, 50), soit 5 paliers automatiques, sans choix ni interface. Exemple Guerrier : +1 % de vol de vie (niv. 10), +5 PV (20), −3 % de dégâts subis (30), +0,5 rage par coup bloqué (40), +5 % de dégâts sous 30 % de PV (50). Coût : `skills.json` + `loadout.ts` seulement.
2. **Arbre de 6 nœuds par classe.** 1 point par 5 niveaux joués (10 points au niveau 50), 6 nœuds à 1 / 1 / 2 / 2 / 3 / 3 points : il faut choisir, comme les talents. Écran à ajouter, sur le modèle de `openSkills`.
3. **Maîtrise par les boss, pas par le temps.** 1 point par boss vaincu avec la classe (Jorōgumo, Izanami, et les boss du donjon infini), plafond 10. Récompense le donjon plutôt que le farm de niveaux — c'est le plus proche de Darkest Dungeon, où la maîtrise se gagne en mission.
4. **Rattrapage du début seulement.** Les passifs de maîtrise ne s'appliquent que **sous le niveau 25** (« tu as déjà joué cette classe, tu redémarres moins nu »). Le haut de la courbe ne bouge pas : cela répond pile au point faible du plan (début de partie) sans accélérer la course à la puissance déjà signalée.
5. **Repli et partage.** Points remboursables gratuitement sur la barque (comme les talents), et une part **partagée entre personnages** (une seule réserve par classe) tandis que le reste reste par personnage.

### Coût de mise en œuvre

- `src/data/skills.json` : un bloc `mastery` par classe (paliers ou nœuds).
- `src/game/loadout.ts` : appliquer les passifs à la fin de `buildLoadout`, juste après les talents et les paliers de tag.
- `src/game/progress.ts` : le compteur de maîtrise. Option A (le moins cher) : un `flags.maitrise_<classe>` **dans la sauvegarde du personnage** — rien à migrer. Option B (partagée) : une clé neuve, ce qui sort du format actuel et touche `saves.ts`, `exportSlot`/`importSave` (`ExportFile.format` passerait de 1 à 2) et l'écran des personnages.
- `src/ui/panels.ts` : un écran (propositions 2 et 5) ou rien du tout (propositions 1, 3 et 4).
- `src/net/protocol.ts` : **aucun changement** tant que la maîtrise ne pose que des réglages du héros. Attention : l'hôte fait tourner le combat ; si un passif de maîtrise ajoutait un état de combat (une charge, un compteur), il faudrait monter `PROTOCOL` et compléter `FIELDS` / `PRIVATE`.
- `tools/equilibrage.mjs` : le banc doit poser la maîtrise du héros testé, sinon il **sous-estime** systématiquement toutes les classes. À défaut, une option `--maitrise 0|5|10`.
- Migrations : **aucune** en option A (les `flags` sont déjà sérialisés et migrés).

### Risques

- **Recouvrement triple.** Talents (9 points, 12 nœuds), sous-classes (l'autre agent), maîtrise : trois axes qui donnent tous des passifs à la même classe. Si les trois coexistent, le build devient un mur de cases et le joueur ne saura plus quel axe compte. Il faut en assumer un.
- **La maîtrise est un renfort global, donc elle n'équilibre rien.** Elle aide autant le Rôdeur que la Lame : l'écart entre classes ne bouge pas, seul le donjon entier devient plus facile. Combinée à la règle « aucun nerf », elle accélère le constat du plan (les donjons à niveau égal ne départagent plus les classes, et il faudra relever les ennemis).
- **Elle efface le point faible qu'on veut corriger autrement.** Le plan veut rendre le Rôdeur et le Guerrier meilleurs au début par une vraie force de classe (Recul plus long, arme moins lente). Une maîtrise de départ l'obtient aussi, mais par le grind — et masque alors si le correctif de classe fonctionne.
- **Option B, la sauvegarde partagée, est un vrai chantier** (format, export, écran des personnages) pour un bénéfice que le joueur solo ne verra pas tout de suite.

### Avis

**À reporter.** La bonne idée est la **progression par classe au long cours**, qui manque réellement après le niveau 10 ; mais la place est déjà prise par les sous-classes, que l'autre agent traite. Faire les deux, c'est trois axes de passifs pour la même classe.

Si la maîtrise revient sur la table (après validation des sous-classes), prendre la **forme la moins chère et la plus utile** : **propositions 1 + 4** (paliers automatiques, sans écran, appliqués seulement sous le niveau 25), compteur dans un `flags` de la sauvegarde du personnage. Zéro migration, zéro réseau, un fichier de données et une fonction. Elle répond exactement au point faible mesuré du plan (le début de partie) sans gonfler la fin. La version « réserve partagée entre personnages » est à réserver à une 0.13, quand le donjon infini aura été relevé. Le joueur demande, lui, un **arbre complet de styles de jeu**, par personnage : voir « Réponses du joueur », qui traite le recouvrement désormais certain avec les sous-classes.

---

## Une sixième classe ? (demi-page)

Non, et l'étude le confirme. Une classe coûte au moins 21 objets (3 par emplacement), 3 à 5 armes, les branches de talents, les sprites chibi 8 × 8, un bot pour la mesurer, les textes, et la coop (protocole). Deux classes viennent d'être refaites et ne sont pas validées par le joueur : ajouter une sixième classe, c'est ajouter un problème sans en résoudre un.

Reste à dire s'il existe un **vide** qu'une classe comblerait mieux que ces deux pistes. Ce que les cinq classes couvrent aujourd'hui : rage et postures (Guerrier), crit et ombre (Lame), garde et soin (Paladin), mana et zone (Sorcier), charge et marque (Rôdeur). Deux trous visibles :

1. **Le terrain et le positionnement ne sont la ressource de personne.** Aucune classe ne vit de ce qu'elle pose (pièges, talismans, zones préparées) : le Sorcier brûle, le Rôdeur tire, mais rien ne se prépare avant la vague. C'est le vide le plus net.
2. **Les invocations ont disparu** avec l'Invocateur, remplacé en 0.8.0 parce que son gameplay n'était pas amusant. Seul Relever, du Paladin, en garde la trace.

Le second est un piège : remettre des compagnons, c'est refaire ce qui a été retiré. Le premier est un vrai manque, **mais il ne justifie pas une classe de plus aujourd'hui**, pour deux raisons : le plan l'a déjà identifié comme le rôle d'un éventuel Onmyōji de pièges, et les sceaux du Sorcier occupent déjà le terrain. Un système d'**aspect** ou de **maîtrise** peut porter ce goût (poser un filet, préparer un sceau) sans un personnage entier.

Ce que je recommande à la place, si le vide gêne vraiment : confier le positionnement au **Rôdeur survivant** (son filet, son arc du pêcher) plutôt que d'inventer une classe. Autrement dit : régler les cinq classes avant d'en dessiner une sixième.

---

## Questionnaire pour le joueur

1. **Aspects d'arme** : j'abandonne la forme « variantes de l'arme de classe » (elle double les 105 objets de la 0.11.0). Garde-t-on quand même **un aspect par classe posé sur l'arme équipée**, après les sous-classes — ou on referme la piste ?
2. **Armes de boss** : veux-tu que je remette les armes `spec: "boss"` dans le giron des boss (le Miroir de Yata donné aux Rizières casse la logique), ou le déblocage actuel te convient ?
3. **Maîtrise de classe** : si elle revient après les sous-classes, la veux-tu en **paliers automatiques sans écran** (la moins chère, appliquée seulement sous le niveau 25) ou en **arbre de 6 nœuds à choisir**, comme les talents ?
4. **Progression de classe** : la maîtrise doit-elle être **par personnage** (rien à migrer) ou **partagée entre tous les personnages** (nouvelle sauvegarde de compte, export à faire évoluer) ?

---

## Réponses du joueur (9 octobre 2026)

Le joueur a répondu aux quatre questions. Voici ce que chaque réponse change, et ce que je maintiens.

### 1. Aspects d’arme : la piste n’est pas refermée, mais elle pivote

Réponse : garder quelque chose, mais pas des variantes de moveset — plutôt un **système d’amélioration d’arme complexe** (mods à la Warframe, sublimations ou chasses à la Wakfu), avec peut-être un **inventaire géré** (capacité maximale, gestion).

Ce que le code a déjà, et qui compte pour juger :

- L’**axe d’amélioration existe** : la forge de Tetsu (`src/game/forge.ts`, règles `forge.upgrade` dans `items.json`) monte chaque pièce jusqu’au niveau du joueur (plafond 50), à 3,3 % de dégâts par niveau pour l’arme, avec les **paliers 10 / 25 / 50** propres à chaque arme, payés en oboles et en matériaux, plus un matériau de boss au-delà du seuil.
- Les **doublons sont déjà traités** : `src/game/loot.ts` les fond en oboles et en matériaux selon la rareté. Un « sacrifice d’objet » a donc déjà une règle.
- Le **modèle d’objet n’a pas d’identité**. `ProgressState.items` est une liste d’identifiants et `itemLevels` est indexé par identifiant : il existe **une seule instance par type d’objet**, avec un seul niveau. C’est le point dur : Warframe repose sur des instances (chaque arme porte ses propres mods), donc le système demandé suppose de réinventer la clé de sauvegarde (`id` → instance), ce qui touche `progress.ts`, `saves.ts`, l’export (`ExportFile.format`) et `migrate()`.
- L’**inventaire n’a aucune gestion** : c’est une liste de rayons (ma classe, les autres, universels, raciaux) affichée par `openInventory` (`src/ui/panels.ts`). Pas de capacité, pas de place, pas de tri par le joueur — posséder est binaire.

Trois formes possibles, chiffrées :

1. **Sockets par type d’objet (le plus proche de Wakfu).** 2 emplacements de sceau sur une arme, 1 sur chaque pièce d’armure. Un sceau donne une ligne simple : +4 % dégâts, −3 % dégâts subis, +8 PV, +3 % vitesse, +6 % vol de vie. On le pose et on le retire contre des oboles (50 au retrait). Aucune instance à inventer : un `Record<string, (string | null)[]>` à côté de `itemLevels`. Coût : un fichier de données, `loadout.ts`, l’écran d’inventaire.
2. **Forgemagie légère (Wakfu).** Aux paliers d’arme 25 et 50 seulement, un tirage de bonus secondaire, relançable contre 150 oboles et 2 matériaux : une des cinq lignes ci-dessus. Réutilise les paliers et les matériaux existants et ne crée rien de neuf — c’est la moins chère des trois et la plus lisible.
3. **Mods libres à la Warframe (le plus cher).** 4 à 6 emplacements par arme, mods montés, coût en « capacité » selon la rareté du mod, fusion de mods. C’est le seul qui exige des instances d’objet, donc une migration de sauvegarde et un format d’export à faire évoluer. Je le déconseille.

À part, la question de l’inventaire : une **capacité** de 60 objets, +10 par donjon vaincu jusqu’à 120, le surplus fondu d’office. C’est la seule proposition qui contredit la règle « aucun nerf » : elle retire du confort sans apporter de contenu tant qu’il n’y a que deux donjons, et un joueur à qui on détruit du butin le ressent comme une punition.

Avis : **à reporter**, et pas dans la forme Warframe. La bonne forme est **2, puis 1** — elles donnent le goût de la personnalisation sans toucher à l’identité des objets ni à la sauvegarde. La capacité d’inventaire seule est **à abandonner** pour l’instant : elle ne crée pas de choix, elle crée une corvée. Et comme les aspects, ce système **n’équilibre aucune classe** : il ajoute une couche de puissance, donc il faudra relever les ennemis derrière (le plan le prévoit déjà).

### 2. Armes de boss : déblocage actuel conservé

Le joueur garde le déblocage actuel (« ça ne change pas grand chose pour le moment, il n’y a que 2 donjons »). C’est un raisonnement solide : l’étiquette `boss` ne sert encore qu’à distinguer un rôle d’objet, pas une provenance, et le Miroir de Yata continue d’arriver à la première victoire des Rizières. **Je retire donc ma proposition de correction** — l’incohérence est notée dans ce document, pas corrigée. Elle redeviendra urgente quand il y aura plus de deux boss, parce que l’étiquette annoncera alors une provenance fausse.

### 3. Maîtrise de classe : arbre complet

Réponse : pas des paliers automatiques, mais **un arbre complet, avec beaucoup de styles de jeu différents**. Je dois dire clairement ce qui cloche : c’est exactement le rôle des **sous-classes** de l’autre agent (trois passifs par classe au niveau 25 ou 50). Si les deux arrivent, la même classe reçoit trois axes de passifs — arbre de compétences, sous-classe, maîtrise — et le joueur ne saura plus quel axe compte. Le recouvrement signalé plus haut n’est plus un risque théorique : la réponse le rend certain.

Deux issues honnêtes :

- **La maîtrise prend l’axe, les sous-classes lâchent.** L’arbre de maîtrise devient *le* lieu des styles de jeu par classe : 8 nœuds par classe, 1 point tous les 5 niveaux joués avec elle, plus 1 par boss vaincu avec elle, deux voies qui ne se cumulent pas (Lame : poison contre burst ; Guerrier : blocage contre rage ; Rôdeur : portée contre mobilité). C’est un vrai écran, sur le modèle de `openSkills`. Mais il faut que l’autre agent renonce aux sous-classes : je n’y touche pas, c’est une décision d’organisation.
- **La maîtrise reste dans son coin**, et alors elle doit se limiter à ce que les sous-classes ne font pas : un renfort de début de partie, sous le niveau 25, sans écran. C’est la position défendue plus haut, et elle est moins ambitieuse que la demande.

Avis : **à faire seulement si le joueur tranche la question des sous-classes.** Si l’arbre de styles l’emporte, il doit **remplacer** les sous-classes, pas s’y ajouter. Si les deux doivent vivre, je reste sur la forme minimale (paliers sous le niveau 25, sans écran) : l’arbre complet à côté des sous-classes serait un troisième mur de cases.

### 4. Par personnage

Confirmé : la maîtrise reste **par personnage**. C’est la bonne option technique. Le compteur tient dans un `flags.maitrise_<classe>` de la sauvegarde du personnage : déjà sérialisé, déjà absorbé par `migrate()`, **aucune migration**, **aucune sauvegarde de compte**, **aucun changement à l’export**, et **aucun changement de `PROTOCOL`** tant que les passifs ne touchent que le `PlayerConfig`. Le prix à assumer : commencer un second personnage de la même classe remet la maîtrise à zéro — c’est cohérent avec « par personnage ».

### Ce que je recommande, dans l’ordre

1. **Rien de tout cela avant les sous-classes** (l’autre agent). Ces deux pistes sont des couches de puissance ; les empiler avant d’avoir mesuré le plan actuel, c’est mesurer du bruit.
2. **Ensuite, la maîtrise**, sous la forme tranchée à l’étape 3 : l’arbre complet *à la place* des sous-classes, ou le renfort de début de partie *à côté*.
3. **La personnalisation d’arme (formes 2 puis 1)** quand la forge actuelle sera épuisée : c’est du plaisir et de la rejouabilité, pas de l’équilibrage.
4. **Jamais : la limite d’inventaire seule, et les mods à la Warframe avec instances.**
