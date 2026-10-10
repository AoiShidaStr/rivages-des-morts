# Pistes : gravures (le hasard, la relance, le build) — 10 octobre 2026

Étude, pas implémentation : aucun fichier de jeu n'est modifié par ce document, à une exception près notée en fin de page. Il répond à la demande du joueur, après ses réponses au questionnaire de `docs/pistes-aspects-maitrise.md` : il veut **un système comme les rivens de Warframe — qui use de la chance et qui incite à bâtir tout son style de jeu dessus**. Il ne tranche pas : il propose quatre formes, chiffrées sur l'état réel du dépôt (sous-classes incluses), et dit laquelle je ferais.

Rappel de la règle du joueur : **aucun nerf, seulement des renforts**. Elle est en tension directe avec ce qui suit — voir « Le point critique », qui est la partie utile de ce document.

---

## 1. Ce qu'est un riven, mécaniquement

Un riven de Warframe tient à cinq traits. Il faut les séparer, parce que les adapter ne coûte pas le même prix :

1. **Le tirage en bloc.** Un riven porte 2 ou 3 lignes tirées ensemble (dégâts, cadence, critique, portée…). On ne choisit pas : on accepte le paquet ou on relance.
2. **La relance payante.** On recommence le tirage contre une ressource gagnée en jouant (le Kuva). C'est la boucle : jouer → relancer → espérer mieux.
3. **Un tirage est un pari, donc il a souvent une perte** : les rivens ont des lignes **négatives**. C'est ce qui donne le frisson, et c'est ce que la règle du joueur interdit.
4. **La disposition.** La force du tirage dépend de la popularité de l'arme — les armes délaissées tirent plus fort. Chez nous, il n'y a pas de communauté à mesurer : la disposition serait écrite à la main, donc ce n'est plus du hasard mais un outil d'équilibrage.
5. **Le riven porte le build.** Ses chiffres sont assez gros pour qu'on joue l'arme *pour* son riven. C'est le point que le joueur veut : le tirage ne doit pas être un bonus de 5 %, il doit décider de la façon de jouer.

Un riven, en Warframe, est attaché à un **type** d'arme, pas à une copie de cette arme. C'est une bonne nouvelle pour nous : voir plus bas.

## 2. Ce que le code a déjà, et qui compte

- `ProgressState.items` est une liste d'identifiants et `itemLevels` est indexé par identifiant : il existe **un seul niveau par type d'objet**, pas d'instance. Le riven attaché au *type* ne demande donc **aucune instance à inventer** — c'est la forme de Warframe, et la moins chère ici.
- La **forge de Tetsu** (`src/game/forge.ts`, `forge.upgrade` de `items.json`) : niveau `n` → `n+1` coûte `8 × n^1,2` oboles, `1 + n ÷ 10` matériaux de l'emplacement, et un matériau de boss (`soie`) à partir du niveau 25. Paliers propres à chaque arme à 10 / 25 / 50.
- Les **doublons** sont déjà monétisés (`duplicates` de `items.json`) : par rareté, 10 / 20 / 40 / 80 / 200 oboles et 1 / 2 / 3 / 5 / 8 matériaux. **La monnaie de relance existe déjà** : rien à inventer pour l'économie.
- `drawWeighted` (`src/game/loot.ts`) : le tirage pondéré existe, avec les `weight` et les `chance` des tables de drop.
- `flags` : des compteurs libres, **déjà sérialisés et déjà absorbés par `migrate()`** (`{ ...fresh(), ...rest }`). Une clé neuve dans `ProgressState` ne coûte aucune migration écrite à la main.
- `ProgressState.version` vaut 1 et `ExportFile.format` vaut 1 : tant qu'on ajoute une clé, **ni la version de sauvegarde ni le format d'export ne bougent**.
- Le `PlayerConfig` voyage **entier** en coop (`Member.config`, `Start.heroes[].config`). Une gravure qui ne pose que des réglages et des `perks` **ne touche pas `PROTOCOL`** ; une gravure qui crée un état de combat lu par l'affichage, si.
- `tools/equilibrage.mjs` et `tools/voies.mjs` mesurent un héros construit par `buildLoadout` : **toute gravure non simulée par le banc rend les mesures fausses par omission.** C'est la leçon la plus chère du dossier, elle se répète.

## 3. Les quatre formes

### A — La Gravure (tirage par arme) · la forme fidèle

Une clé neuve, `itemRolls: Record<string, Gravure>` : **une gravure par type d'arme** (les 18 armes du jeu), pas par copie. Chaque gravure tire **2 lignes de « forme »** (elles changent la façon de frapper) et **1 ligne de « maîtrise »** (elle change les chiffres), plus un rang.

Exemples de lignes de forme, écrites sur les réglages existants : `+0,4 m` de portée · arc `+25°` · `−12 %` de temps de récupération · `+0,5 m` de rayon de sceau · `+1 s` de durée de nuée · `+1` charge de poison · `−1,5 s` de recharge de la Marque · `+1` projectile (Bâton de Susanoo). Exemples de maîtrise : `+4 %` dégâts · `+1 %` vol de vie · `+6 %` vitesse · `+8` PV · `+2 %` armure.

Rangs, du plus courant au mémorable : **Ébréchée** (2 lignes, valeurs basses) · **Nette** (3 lignes basses) · **Trempée** (3 lignes moyennes) · **Kami** (3 lignes hautes **et une contrepartie**) · **Vierge** (3 lignes **au maximum** et une contrepartie — 1 tirage sur 100).

Relance : chez Tetsu, contre des oboles **et** de la `soie` de jorōgumo. Le prix monte à chaque relance du même objet (le Kuva, en somme).

Pourquoi elle tient la promesse : une ligne de forme se sent tout de suite (on frappe plus large, plus loin), et l'arme garde son identité. Coût : `src/data/gravures.json`, la clé dans `progress.ts`, `loadout.ts` (après les paliers), un écran chez Tetsu, le banc. **Zéro migration, zéro protocole, zéro instance.** Risque : c'est un **second axe d'équipement** par-dessus la forge, sur 18 armes — si les lignes de maîtrise sont trop grosses, il double la puissance que le plan d'équilibrage essaie justement de tenir.

### B — La Voie du kami (le tirage par héros) · la plus courte

La gravure s'attache au héros, comme la voie : `hero.gravure`. Trois lignes qui ne touchent pas l'arme mais **le héros, sa classe et sa voie** — y compris la compétence F de la voie. C'est ici que « bâtir tout son style dessus » est littéral : une ligne peut transformer la compétence de voie en une autre compétence (`+1,2 m` de rayon, `−4 s` de recharge, poison en plus, brûlure en plus), une autre peut déplacer la classe (`arc de coup +20°`, `+2 m` de portée de tir chargé, `+30 %` de rage de blocage).

Relance au Rocher, contre des matériaux. Coût : un fichier de données, `loadout.ts`, `panels.ts`, le banc. **Une clé de sauvegarde, aucun protocole** (tout passe par `PlayerConfig`). Risque : elle s'ajoute **sous** les talents et la voie — trois axes de passifs pour la même classe, le reproche exact que je faisais à la maîtrise ; et comme elle est par personnage, recommencer un personnage relance le hasard.

### C — Les Sceaux trouvés (le tirage par le butin) · la plus « chance »

Ici la gravure **est un objet** : des `sceau` qui tombent (les tables `drops` d'`items.json` ont déjà `chance` et `weight`), qu'on scelle sur une pièce — 2 emplacements sur l'arme, 1 sur chaque pièce d'armure. On ne relance **pas** : on farme. Le hasard est dans la trouvaille, pas dans la machine à sous, et le butin redevient utile une fois la table complète (ce que `duplicates` essaie déjà de faire avec des oboles).

Coût : `items.json` (une table de lignes + une clé `sockets` dans `ProgressState`), `loadout.ts`, l'écran d'inventaire — qui devient enfin un écran de gestion, ce que le joueur avait demandé. Risque : 105 objets existent déjà, et deux emplacements par pièce veulent dire **jusqu'à 14 lignes actives**, plus que la forge et les paliers réunis. Sans capacité d'inventaire (que je continue de déconseiller), ça reste sain ; avec, ça devient une corvée.

### D — Le Pari de Tetsu (le tirage consommable) · la boucle la plus nue

Pas de stockage : une **action**. On apporte des matériaux, on choisit l'axe (forme / dégâts / survie), Tetsu trempe la pièce : un tirage donne **une** ligne, qui **remplace** la précédente. Le joueur relance tant qu'il n'est pas satisfait. Le stockage tient alors dans la même clé `itemRolls` que A — c'est A, avec un rituel et une économie à la place d'un écran de gravure.

Pourquoi je la déconseille seule : sans ligne négative, « rater » son tirage n'est qu'une perte de matériaux, donc une corvée ; et le joueur ne voit pas ses probabilités. À garder comme **façon de relancer A**, pas comme système.

### E — La Disposition (un modificateur, pas un système)

Le trait 4 des rivens. Chez nous il n'y a pas d'usage communautaire à mesurer : la disposition serait une table écrite à la main (telle arme tire plus fort). Ce n'est donc plus de la chance mais un **outil d'équilibrage** — utile pour relever une arme délaissée, inutile comme promesse au joueur. À accrocher à A, B ou C si le besoin apparaît, jamais à vendre seul.

## 4. Le point critique

**1. Un riven sans contrepartie est un robinet de puissance.** Le frisson des rivens vient aussi de la ligne négative. Sous la règle « aucun nerf », je refuse les lignes négatives ; la chance doit donc porter sur *ce que sont les lignes*, pas sur une punition. Il faut le dire net : le résultat sera **plus indulgent, et moins grisant**, qu'un riven.

**2. Le vrai risque, maintenant, c'est la course à la puissance.** Le niveau et la forge donnent déjà, ensemble, environ **deux fois** les dégâts et les PV d'un héros nu. Une gravure à `+40 %` de dégâts par-dessus rend fausses toutes les mesures en cours. D'où la règle que je propose : **la forme d'abord, les nombres ensuite, et plafonnés** — une ligne doit changer *comment* on joue (portée, arc, recharge, rayon, projectiles) bien plus qu'elle n'augmente les dégâts.

**3. Un tirage exceptionnel doit être rare et visible**, sinon la chance est invisible : d'où l'échelle de rangs, un nom propre pour les hauts tirages, et une couleur à part. Un « Vierge » sur 300 tirages est mémorable ; « +12 % au lieu de +10 % » ne l'est pas.

**4. Toute gravure doit être simulable par le banc** (`tools/equilibrage.mjs`, `tools/voies.mjs`), sinon l'équilibrage devient aveugle **sans le dire**.

**5. Attention au recouvrement** : les « bénédictions du Yomi sans fond » (l'autre agent) donnent déjà de la chance **par descente**. La gravure doit être **persistante**, sinon deux systèmes de chance se marchent dessus et le joueur ne saura plus lequel il joue.

## 5. Avis

**À faire — une seule des quatre, et dans cet ordre : B, puis A, puis C. Jamais D seule, jamais E seule.**

- **B** si le but est la phrase du joueur, « tout son style de jeu » : c'est la plus courte (une clé, zéro protocole), et elle touche la voie et la classe, donc le cœur du gameplay. C'est par elle que je commencerais.
- **A** si le but est le **riven** au sens strict : une identité par arme, une économie de relance, un rang à afficher. Elle est étonnamment peu chère ici, parce que le jeu stocke déjà un niveau par type d'objet — la même clé sert.
- **C** si le but est le **butin** : le hasard dans la trouvaille plutôt que dans la relance. C'est la plus lourde en écran, et la seule qui pourrait glisser vers la gestion d'inventaire que le joueur a demandée.
- **Avant toute implémentation** : ajouter la gravure au banc, même à vide, pour que les mesures du plan d'équilibrage ne deviennent pas muettes.

Et un mot franc, puisque c'est la demande : la gravure **n'équilibre rien**. Elle ajoute de la rejouabilité et du plaisir de tirage, comme je le disais déjà des aspects. Elle est donc à poser **après** la validation des voies en jeu, pas avant.

## 6. Questionnaire pour le joueur

1. **La forme** : la plus courte et la plus « style de jeu » (**B**, par héros), la plus fidèle au riven (**A**, par arme, avec relance), la plus « butin » (**C**, sceaux trouvés) — ou tu veux d'abord voir les trois chiffrées côte à côte dans le banc ?
2. **Les lignes négatives** : vraiment jamais, ou une **contrepartie** rare (une ligne qui coûte, pour une ligne beaucoup plus forte — c'est le frisson du riven, et c'est la seule entorse à ta règle) ?
3. **La relance** : oboles et matériaux de l'emplacement (déjà dans l'économie), **soie de jorōgumo** seule (rare, donc précieuse), ou pas de relance du tout (le tirage est définitif, on refarme) ?
4. **L'écran** : chez **Tetsu** (la forge, au milieu de ce qui existe), au **Rocher** (à côté des voies et de l'arbre), ou une **table neuve** sur la barque de Charon ?

---

## Note : le seul fichier de jeu touché

En réponse à la question 2 du questionnaire précédent (« le cri de la voie Serment ne renforce aujourd'hui que le Paladin »), le joueur a choisi **« rester en solo et corriger le texte »** : la description de `serment` dans `src/data/sous-classes.json` dit maintenant « pour toi seul », et son `role` passe de « Bouclier, soutien » à « Bouclier, garde », puisqu'il ne soutient personne.

---

# Réponses du joueur (10 octobre 2026) : la forme A est faite

Le joueur a tranché : **la forme A, la Gravure** ; **oui à une contrepartie rare** (« c'est la seule entorse à ta règle, mais c'est ce qui fait qu'un tirage se raconte ») ; et **on enchaîne tout de suite**, sans attendre la validation des voies en jeu. Du même questionnaire : le **niveau 25** des voies reste tel quel, la **maîtrise de classe est abandonnée**, et le Serment du Paladin reste en solo.

## Ce qui est posé

- **`src/data/gravures.json`** : 5 rangs (Ébréchée 34 % · Nette 33 % · Trempée 24 % · Kami 8 % · Vierge 1 %), 40 lignes de renfort (**27 de forme, 13 de maîtrise**, dont 27 réservées à une classe par `tags`) et **5 contreparties**. Le plancher d'un rang (`floor`) va de 0 à 1 : à Vierge, chaque ligne tombe au maximum, sans hasard.
- **`src/game/gravure.ts`** : le tirage (`rollGravure`), le prix (`gravureCost`), les effets (`gravureEffects`) et l'affichage des valeurs. Un tirage donne `lines - 1` lignes de forme, une de maîtrise, et — quand le rang en donne une — la contrepartie **en plus** (c'est le modèle du riven : trois renforts et un défaut).
- **La gravure se pose sur un type d'arme**, pas sur une copie : `progress.state.gravures[arme]`. Une clé de sauvegarde neuve, absorbée par `migrate()` sans code de migration ; ni `ProgressState.version` ni `Format d'export` ne bougent.
- **Prix** : `120 + 60 × relances` oboles et `1 + relances` soie de jorōgumo, comptées par arme dans un drapeau (`gravure_<arme>`). La soie ne tombe que sur la Jorōgumo, trois par victoire : la gravure est donc **derrière le premier donjon**, sans aucune condition de niveau.
- **Moteur** : les lignes s'appliquent dans `buildLoadout`, **comme un effet de l'arme équipée** — donc avant les mises à l'échelle, et pas sur une pièce d'armure ni sur une arme non portée (les trois cas sont vérifiés par le banc). `PlayerConfig` ne porte que des réglages : **`PROTOCOL` ne bouge pas**, et une partie en coop n'a rien à négocier.
- **Écran** : un troisième onglet de la **forge de Tetsu**, « Graver » — les armes à gauche, le rang, les lignes (la contrepartie en rouge), les chances de chaque rang et le prix à droite. Le compteur de l'onglet dit combien de tirages sont payables.
- **Outil** : `npm run gravures` (voir plus bas). Et deux accès de développement en plus (`rdm.panels`, `rdm.ui`) pour ouvrir un écran depuis la console du navigateur.

## Ce que le banc a trouvé, et que l'œil aurait laissé passer

`npm run gravures` (494 vérifications, tout vert) et une séance dans le vrai navigateur ont sorti **trois défauts réels** :

1. **La contrepartie était comptée dans `lines`.** Un Kami tirait 4 lignes au lieu de 3, parce que le tirage lisait « `lines` moins une de forme » sans compter la contrepartie à part. Le banc l'a vu sur les 18 armes d'un coup.
2. **Le signe d'une ligne en écart.** `−12 %` s'écrivait `+12 %` : le signe était lu sur le multiplicateur (0,88) au lieu de l'écart (−0,12).
3. **« −11 % % ».** L'unité était écrite deux fois — une fois dans le sommaire de la ligne, une fois par l'affichage — et le banc ne pouvait pas le voir : c'est la session dans le navigateur qui l'a montré. Le pourcentage est maintenant ajouté par l'affichage seul, et le banc **interdit** désormais un « % » dans le sommaire d'une ligne en pourcentage.

Ce qui a été vérifié pour de bon, dans le navigateur, par l'entrée réelle du jeu (l'écran ouvert depuis son point d'entrée, un vrai clic sur « Graver l'arme ») : le tirage d'un Ébréchée sur le Nodachi (oboles 5000 → 4880, soie 30 → 29, un compteur de relance à 1, le prix qui monte à 180 + 2 soies), les lignes affichées, la contrepartie en rouge (`rgb(155, 47, 34)`) et le rang en vermillon, et — sur le héros vivant — la portée 2,60 → 3,05 m, les dégâts ×1,40 et les dégâts subis ×1,12.

## Ce qui reste ouvert, et ce que je critique encore

- **La gravure n'équilibre rien.** Elle ajoute une couche de puissance : les ennemis devront être relevés derrière, exactement comme le plan d'équilibrage l'annonçait. Le banc ne mesure que le billot, pas un donjon à niveau égal.
- **La découvrabilité.** Rien n'oriente le joueur vers l'onglet « Graver » : ni Tetsu, ni une quête, ni la première soie en poche. C'est le prochain geste utile — une réplique de Tetsu, ou un repère sur l'onglet dès la première soie.
- **La contrepartie à 8 %** (Kami) est le seul endroit où la règle « aucun nerf » plie. Elle est assumée, affichée en rouge, et le joueur peut relancer : c'est un pari, pas une punition — mais elle mérite d'être jugée en jeu, pas dans un document.
- **Les formes B et C** de ce document restent à faire, et **D** (le Pari) reste déconseillée seule. La **Disposition (E)** demeure un outil d'équilibrage, pas une promesse au joueur.
- **La mesure manquante** : le banc compare une arme nue à une arme gravée, pas deux tirages entre eux. « Les deux voies d'une classe se valent » avait le même trou ; ici, la question devient « un Kami vaut-il le risque qu'il porte ». C'est au joueur de le dire en jouant.
