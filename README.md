# Rivages des Morts

Action-RPG de donjon en temps réel, jouable dans le navigateur. Tu incarnes une âme échouée sur l'île du Yomi, l'au-delà japonais, et tu affrontes ses yokai au corps à corps. Inspiré de Waven et de Hades.

> Prototype : une île, un donjon de sept vagues dont un boss. Graphismes provisoires.

## ▶ Jouer

**https://aoishidastr.github.io/rivages-des-morts/**

Il faut un ordinateur avec **clavier et souris** et un navigateur récent (Chrome, Firefox ou Edge). Le jeu ne se joue pas sur téléphone.

Chaque personnage est sauvegardé automatiquement dans le navigateur (six au plus). Au retour, choisis **Continuer** sur l'écran titre, ou **Personnages** pour en reprendre un autre, en supprimer un, ou exporter sa sauvegarde dans un fichier (copie de secours, autre ordinateur) et l'importer plus tard.

## Comment jouer

1. **Nouveau personnage** : choisis ta race et ta classe, puis Charon, le passeur, te dépose sur l'île.
2. **Explore l'île** : parle aux habitants avec <kbd>E</kbd>. Un **!** au-dessus d'un personnage veut dire qu'il a quelque chose pour toi. Ta quête en cours s'affiche en haut à droite (<kbd>J</kbd> pour toutes les voir).
3. **Entre dans le donjon** : le torii noir, au nord-ouest de l'île, mène aux Rizières noyées. Six vagues de yokai t'attendent, puis la Jorōgumo, une araignée géante en trois phases. À l'entrée, choisis le niveau du donjon : les yokai y sont plus forts que toi, et ils se renforcent plus vite que toi d'un niveau à l'autre. Une victoire ouvre les niveaux suivants jusqu'au prochain multiple de 5 (gagne au niveau 1 et tu peux tenter directement le niveau 5).
4. **Reviens plus fort** : tu gardes ton butin même si tu meurs. Ouvre tes coffres sur la barque de Charon, achète et forge de l'équipement puis équipe-le (<kbd>I</kbd>), dépense tes points de compétence (<kbd>K</kbd>), puis retente ta chance.
5. **Change de race ou de classe** : le moine du Rocher t'aide à retrouver une autre vie, gratuitement. Tu gardes ton équipement et ta progression ; tes points de compétence te sont rendus.

### Jouer à plusieurs (coop en ligne)

Jusqu'à **trois joueurs**, chacun avec son héros. C'est gratuit : les navigateurs se relient directement, sans compte ni serveur.

1. Sur l'écran titre, choisis **Coop en ligne**. Sur l'île, tu peux aussi passer par <kbd>Échap</kbd>, puis **Coop en ligne**.
2. **Créer une partie** : tu es l'hôte. Un code de quatre caractères s'affiche, donne-le à tes amis. Coche **Partie publique** pour que ta partie apparaisse aussi dans la liste des autres joueurs.
3. **Rejoindre** : tape le code d'un ami, ou choisis une partie dans la liste des **parties publiques**. Clique ensuite sur **Je suis prêt**.
4. L'hôte choisit le donjon et son niveau, puis clique sur **Descendre ensemble** quand tout le monde est prêt.

Pendant la descente :
- Chacun garde son butin, ses oboles et son expérience. Une victoire ouvre les niveaux suivants pour tous.
- Les yokai ont plus de PV à plusieurs, et chaque vague compte un yokai de plus par joueur.
- Un héros à 0 PV tombe **à terre**. Reste 4 s à côté de lui pour le relever, ou utilise Relever du Paladin. La descente échoue seulement quand tout le monde est à terre.
- Le combat tourne chez l'hôte. Il continue même si l'hôte passe sur un autre onglet ou une autre fenêtre. Si l'hôte quitte, la descente s'arrête, mais chacun garde ce qu'il a ramassé.
- Le **ping** de chacun s'affiche à côté de son nom, sous ta barre de vie. Il passe en orange au-delà de 150 ms.
- Ton héros répond tout de suite à tes déplacements, même quand tu n'es pas l'hôte. Les coups, les esquives et les compétences partent chez l'hôte : leur retard dépend du ping.
- Pour une partie fluide, l'hôte doit être le joueur qui a la meilleure connexion, idéalement en câble plutôt qu'en Wi-Fi. La puissance de l'ordinateur compte peu. Chaque ami coûte environ 15 Ko/s d'envoi à l'hôte.
- Certains réseaux d'entreprise ou d'école bloquent les connexions directes entre navigateurs. La coop n'y fonctionne pas.

### Races et classes

Toutes les races vont avec toutes les classes. Chaque race a ses passifs communs, et une **affinité** qui change selon ta classe.

| Race | Passifs communs | Affinité selon la classe (exemples) |
| --- | --- | --- |
| Einherjar (nordique) | plus tu perds de PV, plus tu frappes fort ; chaque ennemi tué te rend 2,5 % de tes PV | Guerrier : blessé, ta rage ne retombe plus. Rôdeur : blessé, tes flèches transpercent. |
| Oushebti (égyptienne) | une carapace d'argile absorbe un coup toutes les 8 s | Invocateur : +1 âme active. Guerrier : la carapace brisée donne de la rage. Rôdeur : elle laisse une statuette-leurre. |
| Demi-dieu (grecque) | un parent divin au choix (Zeus, Arès, Hermès, Athéna) ; une fois par vague, au bord de la mort, tu deviens intouchable un instant et tu récupères des PV | le parent divin, au choix |
| Hanyō (japonaise) | tes dégâts remplissent une jauge qui te transforme un moment ; sous 30 % de PV, tu cours plus vite et tu te régénères | Lame : transformé, ton Pas de l'ombre revient deux fois plus vite. Paladin : ton Aura brûle. |

Chaque classe a aussi sa façon de se soigner :

- **Guerrier** : bloque les coups (sa garde en arrête 90 %) pour remplir sa rage, puis la dépense en attaques puissantes. Sa Frappe fracassante le soigne quand elle touche.
- **Invocateur** : un **compagnon** yokai, que tu choisis dans l'arbre de compétences (<kbd>K</kbd>), te suit dès le début de chaque descente et se reforme s'il tombe. En plus, chaque yokai vaincu laisse son âme au sol quelques secondes (un halo bleu). Clic droit pour la lier : elle se relève et combat pour toi, jusqu'à s'effacer ou se briser sous les coups des yokai. Les yokai visent plutôt toi que tes âmes, sauf si tu portes le Masque d'Oublié. Chaque âme liée réduit un peu tes propres dégâts, et tu récupères une part des dégâts de tes âmes.
- **Lame** : peu de PV, mais des coups très rapides. Traverse les ennemis pour les marquer, puis achève-les en coups critiques. Abattre un ennemi marqué la soigne.
- **Paladin** : tank et soutien. Bouclier levé, il arrête 85 % des coups de face tant que sa **garde** tient (chaque coup bloqué l'use ; vide, elle se brise un instant). Il soigne ses alliés deux fois mieux que lui-même, et relève les alliés tombés.
- **Rôdeur** : combat à distance. Clic gauche pour tirer, clic droit maintenu pour un tir chargé ; garde tes distances. Abattre la cible de sa Marque du chasseur le soigne.

Chaque race et chaque classe a son apparence en pixel art : casque viking, némès égyptien, laurier grec ou cornes d'oni, avec l'arme et la cape de la classe.

### Équipement

Sept emplacements : l'arme, quatre pièces d'armure, une amulette et une relique. Chaque pièce qui porte le tag de ta classe te rapproche des paliers de classe (2, 4 et 6 pièces).

- **Panoplies** : la Lame (os de shikome), le Paladin (sōhei) et le Rôdeur (éclaireur du Yomi) ont chacun une panoplie de quatre pièces, avec un bonus à 2 et un autre à 4 pièces. Le casque et le plastron se forgent chez Tetsu, les jambières et les bottes tombent au Palais d'Izanami.
- **Objets de race** : une amulette par race, lâchée par la Jorōgumo ou Izanami, seulement pour un héros de cette race. Elle renforce ou détourne ton passif de race.
- **Objets à risque** : par exemple le Yomotsu-hegui, la nourriture du Yomi, qui donne beaucoup de dégâts mais divise tes soins par deux.
- **Blocage parfait** : lève ta garde juste avant le coup (Guerrier, Paladin). « Parfait ! » s'affiche ; certains objets en tirent un bonus.

### Commandes

Les touches sont pensées pour un clavier AZERTY. Sur un clavier QWERTY, elles restent à la même place : <kbd>WASD</kbd> pour marcher et <kbd>Q</kbd> à la place de <kbd>A</kbd>.

**Sur l'île**

| Touche | Action |
| --- | --- |
| <kbd>Z</kbd> <kbd>Q</kbd> <kbd>S</kbd> <kbd>D</kbd> ou flèches | marcher |
| <kbd>E</kbd> | parler, examiner, ramasser |
| <kbd>Espace</kbd> / <kbd>E</kbd> | faire avancer un dialogue |
| <kbd>I</kbd> | équipement |
| <kbd>J</kbd> | quêtes |
| <kbd>K</kbd> | compétences |
| <kbd>Échap</kbd> | menu (et rappel des commandes) |
| <kbd>M</kbd> | couper ou remettre la musique (partout, volume dans **Options**) |

**Au combat**, pour toutes les classes : <kbd>Z</kbd> <kbd>Q</kbd> <kbd>S</kbd> <kbd>D</kbd> pour se déplacer, la souris pour viser, clic gauche pour frapper (maintenir pour enchaîner ; le Rôdeur tire une flèche), <kbd>Espace</kbd> pour esquiver, <kbd>Échap</kbd> pour la pause. Le clic droit et <kbd>A</kbd> <kbd>E</kbd> <kbd>R</kbd> changent selon la classe :

| Classe | Clic droit | <kbd>A</kbd> | <kbd>E</kbd> | <kbd>R</kbd> |
| --- | --- | --- | --- | --- |
| Guerrier | bloquer : remplit la rage | frappe fracassante (demi-rage), traverse les carapaces | bond (25 de rage) | frénésie (30 de rage) |
| Invocateur | lier l'âme d'un ennemi vaincu | rappel : tes âmes foncent sur l'ennemi visé | sacrifice : ta plus vieille âme explose | chœur spectral : tes âmes frappent plus fort |
| Lame | pas de l'ombre : traverse et marque les ennemis | marque de mort : tous tes coups sur la cible sont critiques | écran de fumée : tu disparais, les yokai attaquent le nuage | danse des lames : tu bondis d'ennemi en ennemi |
| Paladin | bouclier levé (maintenir), tant que ta garde tient | aura de lumière : soigne tes alliés, et toi un peu | marteau lancé : aller-retour | relever : le dernier allié tombé combat pour toi |
| Rôdeur | tir chargé (maintenir, puis relâcher) | flèche-filet : immobilise | marque du chasseur : la cible prend plus de dégâts | recul : bond en arrière en tirant |

### Conseils

- **Kodama** : il soigne les autres yokai. Tue-le en premier, un coup interrompt son soin.
- **Kappa** : sa carapace arrête les coups et les flèches de face. Passe dans son dos, ou bloque sa charge (Guerrier, Paladin) pour renverser sa coupelle.
- **Kasa-obake** : un cercle rouge sous tes pieds veut dire qu'il va retomber dessus. Esquive.
- **Oubliés** : ils marquent une pause avant de frapper. Bloque au bon moment pour remplir ta rage. En Invocateur, lie leurs âmes : ce sont les plus fortes. En Paladin, relève-les.
- **Jorōgumo** : ses toiles te ralentissent. Frappe un feu follet près d'une toile pour la brûler.

## Lancer le jeu en local

Il faut [Node.js](https://nodejs.org/) 22.12 ou plus récent.

```sh
git clone https://github.com/AoiShidaStr/rivages-des-morts.git
cd rivages-des-morts
npm install
npm run dev
```

Puis ouvre http://localhost:5173 dans le navigateur.

Deux options d'URL pour tester :

- `?vague=7` lance directement le donjon à la septième vague (le boss), sans passer par l'île.
- `?pixel=0` remplace le pixel art par les images peintes.

## Pour aller plus loin

- [Game Design Document](<docs/Rivages des Morts — Game Design Document.md>) : univers, races, classes, progression prévue.
- [Pixel art](<docs/Pixel art.md>) et [prompts visuels](<docs/Prompts visuels.md>) : la direction artistique.

Le code est en TypeScript avec [Babylon.js](https://www.babylonjs.com/) et [Vite](https://vite.dev/). Les ennemis, vagues, quêtes, dialogues et objets sont décrits dans `src/data/*.json`.

## Donner son avis

Une idée, un bug, un boss trop dur ? Ouvre une [issue](https://github.com/AoiShidaStr/rivages-des-morts/issues).
