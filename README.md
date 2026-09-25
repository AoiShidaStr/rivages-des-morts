# Rivages des Morts

Action-RPG de donjon en temps réel, jouable dans le navigateur. Tu incarnes une âme échouée sur l'île du Yomi, l'au-delà japonais, et tu affrontes ses yokai au corps à corps. Inspiré de Waven et de Hades.

> Prototype : une île, un donjon de sept vagues dont un boss. Graphismes provisoires.

## ▶ Jouer

**https://aoishidastr.github.io/rivages-des-morts/**

Il faut un ordinateur avec **clavier et souris** et un navigateur récent (Chrome, Firefox ou Edge). Le jeu ne se joue pas sur téléphone.

La partie est sauvegardée automatiquement dans le navigateur. Au retour, choisis **Continuer** sur l'écran titre.

## Comment jouer

1. **Nouvelle partie** : choisis ta race et ta classe, puis Charon, le passeur, te dépose sur l'île.
2. **Explore l'île** : parle aux habitants avec <kbd>E</kbd>. Un **!** au-dessus d'un personnage veut dire qu'il a quelque chose pour toi. Ta quête en cours s'affiche en haut à droite (<kbd>J</kbd> pour toutes les voir).
3. **Entre dans le donjon** : le torii noir, au nord-ouest de l'île, mène aux Rizières noyées. Six vagues de yokai t'attendent, puis la Jorōgumo, une araignée géante en trois phases.
4. **Reviens plus fort** : tu gardes ton butin même si tu meurs. Ouvre tes coffres sur la barque de Charon, achète et forge de l'équipement puis équipe-le (<kbd>I</kbd>), dépense tes points de compétence (<kbd>K</kbd>), puis retente ta chance.

### Races et classes

| Race | Passifs |
| --- | --- |
| Einherjar (nordique) | plus tu perds de PV, plus tu frappes fort ; chaque ennemi tué te soigne |
| Oushebti (égyptienne) | une carapace d'argile absorbe un coup toutes les 8 s ; +1 âme active et des âmes plus durables |
| Demi-dieu (grecque) | un parent divin au choix (Zeus, Arès, Hermès, Athéna) ; une fois par descente, tu te relèves |
| Hanyō (japonaise) | tes coups remplissent une jauge qui te transforme un moment ; sous 30 % de PV, tu cours plus vite et tu te régénères |

- **Guerrier** : bloque les coups pour remplir sa rage, puis la dépense en attaques puissantes.
- **Invocateur** : chaque yokai vaincu laisse son âme au sol quelques secondes (un halo bleu). Clic droit pour la lier : elle se relève et combat pour toi, jusqu'à s'effacer ou se briser sous les coups des yokai, qui la prennent pour cible comme toi. Chaque âme active réduit un peu tes propres dégâts.
- **Lame, Paladin et Rôdeur** arrivent plus tard. Toutes les races ont encore la même apparence.

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

**Au combat**

| Touche | Guerrier | Invocateur |
| --- | --- | --- |
| <kbd>Z</kbd> <kbd>Q</kbd> <kbd>S</kbd> <kbd>D</kbd> | se déplacer | se déplacer |
| Souris | viser | viser |
| Clic gauche | frapper (maintenir pour enchaîner) | frapper |
| Clic droit | bloquer : remplit la rage | lier l'âme d'un ennemi vaincu |
| <kbd>Espace</kbd> | esquiver | esquiver |
| <kbd>A</kbd> | frappe fracassante (demi-rage), traverse les carapaces | rappel : tes âmes foncent sur l'ennemi visé |
| <kbd>E</kbd> | bond (25 de rage) | sacrifice : ta plus vieille âme explose |
| <kbd>R</kbd> | frénésie (30 de rage) | chœur spectral : tes âmes frappent plus fort |
| <kbd>Échap</kbd> | pause | pause |

### Conseils

- **Kodama** : il soigne les autres yokai. Tue-le en premier, un coup interrompt son soin.
- **Kappa** : sa carapace arrête les coups de face. Passe dans son dos, ou bloque sa charge pour renverser sa coupelle.
- **Kasa-obake** : un cercle rouge sous tes pieds veut dire qu'il va retomber dessus. Esquive.
- **Oubliés** : ils marquent une pause avant de frapper. Bloque au bon moment pour remplir ta rage. En Invocateur, lie leurs âmes : ce sont les plus fortes.
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
