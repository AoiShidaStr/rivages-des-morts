# Rivages des Morts

Action-RPG de donjon en temps réel, jouable dans le navigateur. Tu incarnes une âme échouée sur l'île du Yomi, l'au-delà japonais, et tu affrontes ses yokai au corps à corps. Inspiré de Waven et de Hades.

> Prototype : une île, un donjon de sept vagues dont un boss. Graphismes provisoires.

## ▶ Jouer

**https://aoishidastr.github.io/rivages-des-morts/**

Il faut un ordinateur avec **clavier et souris** et un navigateur récent (Chrome, Firefox ou Edge). Le jeu ne se joue pas sur téléphone.

La partie est sauvegardée automatiquement dans le navigateur. Au retour, choisis **Continuer** sur l'écran titre.

## Comment jouer

1. **Nouvelle partie** : Charon, le passeur, te dépose sur l'île.
2. **Explore l'île** : parle aux habitants avec <kbd>E</kbd>. Un **!** au-dessus d'un personnage veut dire qu'il a quelque chose pour toi. Ta quête en cours s'affiche en haut à droite (<kbd>J</kbd> pour toutes les voir).
3. **Entre dans le donjon** : le torii noir, au nord-ouest de l'île, mène aux Rizières noyées. Six vagues de yokai t'attendent, puis la Jorōgumo, une araignée géante en trois phases.
4. **Reviens plus fort** : tu gardes ton butin même si tu meurs. Ouvre tes coffres sur la barque de Charon, achète et forge de l'équipement puis équipe-le (<kbd>I</kbd>), dépense tes points de compétence (<kbd>K</kbd>), puis retente ta chance.

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

| Touche | Action |
| --- | --- |
| <kbd>Z</kbd> <kbd>Q</kbd> <kbd>S</kbd> <kbd>D</kbd> | se déplacer |
| Souris | viser |
| Clic gauche | frapper (maintenir pour enchaîner) |
| Clic droit | bloquer : remplit la rage |
| <kbd>Espace</kbd> | esquiver |
| <kbd>A</kbd> | frappe fracassante (demi-rage), traverse les carapaces |
| <kbd>E</kbd> | bond (25 de rage) |
| <kbd>R</kbd> | frénésie (30 de rage) |
| <kbd>Échap</kbd> | pause |

### Conseils

- **Kodama** : il soigne les autres yokai. Tue-le en premier, un coup interrompt son soin.
- **Kappa** : sa carapace arrête les coups de face. Passe dans son dos, ou bloque sa charge pour renverser sa coupelle.
- **Kasa-obake** : un cercle rouge sous tes pieds veut dire qu'il va retomber dessus. Esquive.
- **Oubliés** : ils marquent une pause avant de frapper. Bloque au bon moment pour remplir ta rage.
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
