# Plan de mise à jour, Rivages des Morts

## Objectifs

Cette feuille de route vise à faire évoluer Rivages des Morts autour de plusieurs axes :

- Ajouter des items utilisables par toutes les classes.
- Améliorer le design d'Izanami et développer son pixel art.
- Ajouter un mode DJ infini une fois le jeu terminé.
- Rééquilibrer certaines mécaniques problématiques.
- Renforcer le Guerrier et le Paladin.
- Ajouter de la musique au menu et sur l'île.
- Ajouter un système de patch notes visible par les joueurs.

## Décisions du 30 septembre 2026

- **Ordre** : d'abord les victoires rapides (musique du menu, écran « Nouveautés »), puis la 0.1.0.
- **Numéros de version** : ceux du plan, même quand une étape est faite plus tôt (musique = 0.6.0, Nouveautés = 0.7.0).
- **Musique** : l'île joue la musique du menu en attendant sa propre piste ; le combat et les boss viendront plus tard.
- **Guerrier** : la récompense du risque à faible PV va à la **classe** Guerrier, quelle que soit sa race. Le passif de l'Einherjar ne change pas.
- **Izanami** : peinte comme les héros (kit Nano Banana 2), pas en pixel art.
- **Livraison** : un commit par étape, poussé directement sur `main`.

## Philosophie d'équilibrage

Les retours des joueurs recommandent de ne pas chercher à nerf systématiquement les classes ou races qui se démarquent.

La philosophie proposée est :

1. Identifier les classes ou races sous-performantes.
2. Comprendre pourquoi leur gameplay est moins satisfaisant ou moins efficace.
3. Renforcer leur identité et leurs points forts.
4. Tester les changements sur plusieurs configurations.
5. Vérifier l'impact sur les autres classes et builds.
6. Si la puissance globale des joueurs augmente trop, renforcer les adversaires en conséquence.
7. Garder les nerfs pour les mécaniques qui posent un problème précis de gameplay ou de frustration.

L'objectif est d'augmenter la diversité des builds viables plutôt que de faire tourner l'équilibrage autour d'une succession de nerfs.

---

# 0.1.0, Fondations et équilibrage

## Système d'items

Mettre en place une structure d'items suffisamment flexible pour permettre l'ajout de nouveaux objets sans créer une exception pour chaque classe.

Structure cible :

```text
Item
├── statistiques
├── rareté
├── niveau
├── effets
├── classe compatible
├── race compatible
├── passifs
└── apparence
```

Prévoir une compatibilité :

```text
classe compatible = toutes
```

pour les objets universels.

Le système devra permettre :

- Objets universels.
- Objets réservés à une classe.
- Objets réservés à une race.
- Objets hybrides.
- Objets avec effets conditionnels.
- Objets construits autour d'une mécanique précise.

## Instrumentation de l'équilibrage

Mettre en place une grille de suivi des performances et du ressenti des classes.

| Élément | Problème | Direction |
|---|---|---|
| Guerrier | Risque élevé pour une récompense insuffisante | UP |
| Guerrier | Sustain insuffisant | UP |
| Paladin | Jeu solo moins intéressant | UP / adaptation |
| Paladin | Soins pensés pour la coop | Ajustement selon la taille de l'équipe |
| Rôdeur | Tir chargé trop confortable | Nerf ciblé |
| Invocateur | Trop fort en fin de progression (l'« écran fumé » était une erreur : seule la Lame a l'Écran de fumée) | Nerf ciblé, testé aux niveaux 30 et 50 avec tout l'équipement |
| Lame | Écran fumé problématique | Nerf ciblé |
| Fil de Jōren (relique) et Arc de soie | Temps de recharge plus court que l'immobilisation : on bloque les ennemis à l'infini | Nerf ciblé : plus d'immobilisation permanente |
| Katana de rônin | Plus du tout fun à jouer, alors qu'il était très apprécié au départ | UP : plus de portée (longueur) ou plus de largeur |
| Classes fortes | Fonctionnent correctement | Pas de nerf global |
| Ennemis | Les UP des joueurs peuvent réduire la difficulté | Scaling à ajuster |

### Où tester

L'équilibrage se joue surtout en fin de progression : chaque changement est mesuré aux **niveaux 30 et 50, avec tout l'équipement** (`--stuff complet`), en plus du début de partie.

### Banc de DPS

Toutes les classes sont comparées face au même adversaire : un **kodama immobile aux PV infinis**, qui ne riposte pas. Chaque classe lance toutes ses compétences offensives dès qu'elles sont prêtes, et on mesure ses dégâts par seconde maximaux.

Classement visé, en part des dégâts de la Lame :

| Rang | Classe | DPS visé | Pourquoi |
|---|---|---|---|
| 1 | Lame | 100 % | Classe de dégâts pure, peu de PV |
| 2 | Rôdeur | ≈ 95 % | La Lame ne fait que 5 % de dégâts de plus que le Rôdeur |
| 3 | Guerrier | 75 % | Meilleure survie : il échange des dégâts contre de la résistance |
| 3 | Invocateur | 75 % | À égalité avec le Guerrier |
| 4 | Paladin | 60 % | Tank et soutien : la survie et les soins passent avant les dégâts |

Commandes :

```text
npm run dps -- --niveaux 30,50 --stuff complet                   banc de DPS
npm run equilibrage -- --niveaux 30,50 --stuff complet           victoires et survie en donjon
npm run equilibrage -- --niveaux 30 --stuff complet --joueurs 3  coop à 3 (alliés joués par le bot)
```

Un écart de plus de 5 points avec la cible est signalé.

---

# 0.2.0, Équilibrage du combat

## Guerrier

Le Guerrier doit recevoir une meilleure récompense pour le risque pris lorsqu'il descend volontairement à faible PV.

Ce bonus appartient à la classe Guerrier (toutes les races). Aujourd'hui, seul l'Einherjar a un bonus à faible PV (sa Rage du guerrier mort) ; il ne change pas.

Objectifs :

- Conserver la mécanique liée à la perte de PV.
- Rendre le passage sous 30 % de PV plus intéressant.
- Augmenter le sustain.
- Améliorer la récompense lorsque le joueur prend volontairement le risque de rester bas en PV.
- Conserver une identité basée sur le risque et la puissance plutôt que transformer le Guerrier en simple classe résistante.

Principe recherché :

```text
PV faibles
    ↓
Risque élevé
    ↓
Puissance / sustain supplémentaires
    ↓
Le risque devient intéressant à prendre
```

## Paladin

Le Paladin est intéressant en groupe grâce à son rôle de tank/support, mais son gameplay est moins satisfaisant en solo.

Objectifs :

- Améliorer son intérêt en solo.
- Adapter l'efficacité des soins selon la taille de l'équipe.
- Conserver son identité de tank/support en coop.
- Éviter qu'un UP du solo rende le Paladin excessivement puissant à 3 joueurs.

Piste :

| Taille de l'équipe | Soin personnel |
|---|---|
| 1 joueur | Coefficient élevé |
| 2 joueurs | Coefficient intermédiaire |
| 3 joueurs | Coefficient proche de l'actuel |

Les valeurs exactes devront être déterminées par les tests de gameplay.

## Rôdeur

Le tir chargé doit présenter un compromis entre puissance et mobilité.

Changement proposé :

- Plus le tir est chargé, plus la vitesse de déplacement diminue.
- Retour progressif à la vitesse normale après le tir.
- Possibilité d'interrompre le chargement.

Principe :

```text
Mobilité élevée
    ↓
Tir moins chargé

Mobilité réduite
    ↓
Tir plus puissant
```

Le but est d'introduire une décision pendant le combat plutôt que de simplement réduire les dégâts.

## Invocateur

L'« écran fumé » de l'Invocateur était une erreur : seule la Lame a l'Écran de fumée. L'Invocateur a tout de même besoin d'un nerf, surtout en fin de progression.

- Mesurer aux niveaux 30 et 50 avec tout l'équipement.
- Viser 75 % des dégâts de la Lame au banc de DPS, à égalité avec le Guerrier.

## Lame, écran fumé

Réduire l'efficacité de l'écran fumé sans supprimer la mécanique.

Tester notamment :

- Durée.
- Rayon.
- Cooldown.
- Nombre d'utilisations.
- Conditions d'utilisation.

Objectif :

- Réduire les situations trop fortes.
- Conserver l'identité de la compétence.
- Éviter un nerf qui rendrait la compétence inutile.

## Fil de Jōren et Arc de soie

La relique Fil de Jōren et l'Arc de soie de la Jorōgumo immobilisent plus longtemps que leur temps de recharge : on peut bloquer les ennemis à l'infini.

Réduire l'effet de contrôle sans supprimer l'intérêt des objets.

Pistes :

- Réduire la durée.
- Réduire le ralentissement.
- Faire diminuer progressivement l'effet.
- Ajouter un cooldown entre certains déclenchements.
- Prévoir une résistance particulière pour certains boss.
- Au minimum : un ennemi qui vient d'être immobilisé ne peut plus l'être pendant quelques secondes.

## Katana de rônin

Le Katana de rônin (arme du Guerrier) n'est plus du tout fun à jouer, alors qu'il était très apprécié au départ.

- Lui ajouter de la portée (longueur de l'estoc) ou de la largeur.
- Historique : au départ, un coup circulaire (360°, portée 1,65, 7 à 8 dégâts) ; aujourd'hui, un estoc droit de 2,1 m de long sur seulement 0,9 m de large. Il rate facilement sa cible depuis ce changement.
- Piste : élargir l'estoc (0,9 → 1,5 m) et l'allonger (2,1 → 2,6 m), en gardant sa vitesse.
- Vérifier au banc de DPS qu'il reste dans la cible du Guerrier (75 % de la Lame).

---


# 0.3.0, Nouveaux items

## Items pour toutes les classes

Ajouter des objets permettant de construire plusieurs styles de jeu.

### Items de build

Ils renforcent une façon précise de jouer.

Exemples :

- Guerrier faible PV.
- Guerrier garde/rage.
- Paladin tank.
- Paladin soin.
- Rôdeur tir chargé.
- Rôdeur mobilité.
- Invocateur âmes.
- Invocateur compagnon.
- Lame critique.
- Lame mobilité.

### Items de confort

Objets améliorant certains aspects du gameplay sans modifier profondément le fonctionnement d'une classe.

### Items à risque

Objets donnant un avantage important avec une contrepartie.

Cette catégorie peut renforcer les choix de build et créer des objets plus intéressants sans simplement augmenter toutes les statistiques.

## Nouveaux items et équilibrage

Chaque nouvel item doit être testé sur :

- Plusieurs classes.
- Plusieurs races.
- Solo.
- Coop à 2.
- Coop à 3.
- Début de progression.
- Fin de progression.
- Mode DJ infini lorsque celui-ci sera disponible.

---

# 0.4.0, DJ infini

## Déblocage

Une fois le jeu terminé :

```text
Fin du jeu
    ↓
DJ infini débloqué
    ↓
Vague 1
    ↓
Vague 2
    ↓
Vague 3
    ↓
...
```

Le mode doit fonctionner comme un mode endgame distinct du parcours principal.

## Scaling de difficulté

Éviter de faire reposer toute la difficulté sur une simple augmentation des PV des ennemis.

Utiliser plusieurs axes :

- Nombre d'ennemis.
- Composition des groupes.
- Ennemis élites.
- Affixes ennemis.
- Comportements différents.
- Fréquence des ennemis dangereux.
- Boss périodiques.
- Paliers de difficulté.

## Récompenses

Prévoir des récompenses liées aux paliers.

Exemple :

```text
Palier 5
→ Oboles

Palier 10
→ Coffre

Palier 20
→ Objet spécial

Palier 30
→ Cosmétique

Palier 50
→ Récompense rare
```

Les récompenses doivent rester suffisamment intéressantes pour donner une raison de jouer au mode infini sans le rendre obligatoire pour optimiser tous les personnages.

---

# 0.5.0, Izanami et pixel art

## Design d'Izanami

Améliorer le design d'Izanami afin de lui donner une identité visuelle plus forte.

### Sprite

Prévoir :

- Silhouette plus identifiable.
- Animation idle.
- Animation de dialogue.
- Animations spécifiques lors de certaines interventions.

### Pixel art

Améliorer :

- Niveau de détail.
- Cohérence avec les héros.
- Palette.
- Effets visuels.
- Animations.

### Présence sur l'île

Ajouter des animations ou effets permettant de donner davantage d'importance au personnage sur l'île.

---

# 0.6.0, Musique et ambiance

## Musique du menu

Ajouter une musique dédiée au menu principal.

Prévoir :

- Boucle propre.
- Volume séparé.
- Option pour couper la musique.
- Sauvegarde du réglage audio.

## Musique de l'île

Ajouter une ambiance musicale propre à l'île.

Organisation souhaitée :

```text
Menu
  ↓
Musique du menu

Île
  ↓
Musique d'exploration

Donjon
  ↓
Musique de combat

Boss
  ↓
Musique de boss
```

L'objectif est de mieux différencier les différents moments du jeu.

---

# 0.7.0, Patch notes en jeu

## Interface

Ajouter un bouton :

```text
Nouveautés
```

sur le menu principal.

Exemple :

```text
Version 0.7.0

Nouveautés
• Ajout du DJ infini
• Nouveaux objets
• Nouvelle musique de l'île

Équilibrage
• Guerrier renforcé
• Paladin adapté au solo
• Tir chargé du Rôdeur ajusté

Corrections
• Correction de ...
• Correction de ...
```

## Stockage des patch notes

Prévoir des fichiers séparés :

```text
docs/
└── patch-notes/
    ├── 0.1.0.md
    ├── 0.2.0.md
    ├── 0.3.0.md
    ├── 0.4.0.md
    ├── 0.5.0.md
    ├── 0.6.0.md
    └── 0.7.0.md
```

L'interface du jeu pourra ensuite charger les notes disponibles.

Avantages :

- Les patch notes restent séparées du code.
- Chaque version possède son historique.
- Les développeurs peuvent modifier les notes facilement.
- Les joueurs peuvent consulter les changements depuis le jeu.

---

# Ordre de développement

```text
0.1.0
Fondations
│
├── Système d'items extensible
├── Instrumentation de l'équilibrage
├── UP Guerrier
└── UP / adaptation Paladin

        ↓

0.2.0
Équilibrage combat
│
├── Rôdeur
├── Invocateur
├── Lame
├── Pris dans la toile
└── Scaling des ennemis

        ↓

0.3.0
Contenu
│
├── Nouveaux items
└── Nouveaux builds

        ↓

0.4.0
Endgame
│
└── DJ infini

        ↓

0.5.0
Direction artistique
│
└── Izanami + pixel art

        ↓

0.6.0
Audio
│
├── Musique du menu
└── Musique de l'île

        ↓

0.7.0
Communication
│
└── Patch notes en jeu
```

---

# Organisation GitHub

Créer des milestones correspondant aux versions :

```text
[0.1.0] Fondations & équilibrage
[0.2.0] Combat & équilibrage
[0.3.0] Nouveaux objets
[0.4.0] DJ infini
[0.5.0] Izanami & pixel art
[0.6.0] Musique
[0.7.0] Patch notes
```

## Issues liées aux items

```text
[ITEM] Permettre les items universels
[ITEM] Ajouter compatibilité classe/race
[ITEM] Ajouter effets conditionnels
[ITEM] Ajouter nouveaux items Guerrier
[ITEM] Ajouter nouveaux items Paladin
[ITEM] Ajouter nouveaux items Rôdeur
[ITEM] Ajouter nouveaux items Invocateur
[ITEM] Ajouter nouveaux items Lame
```

## Issues liées à l'équilibrage

```text
[BALANCE] UP Guerrier
[BALANCE] UP sustain Guerrier
[BALANCE] Adapter Paladin solo
[BALANCE] Adapter soin Paladin selon taille équipe
[BALANCE] Ajuster tir chargé Rôdeur
[BALANCE] Ajuster Pris dans la toile
[BALANCE] Ajuster écran fumé Invocateur
[BALANCE] Ajuster écran fumé Lame
[BALANCE] Ajuster scaling des ennemis
```

## Issues liées au contenu

```text
[CONTENT] Ajouter DJ infini
[CONTENT] Ajouter récompenses DJ infini
[CONTENT] Ajouter nouveaux paliers de difficulté
[CONTENT] Refaire design Izanami
[CONTENT] Ajouter animations Izanami
[CONTENT] Ajouter pixel art Izanami
[CONTENT] Ajouter musique du menu
[CONTENT] Ajouter musique de l'île
```

## Issues liées à l'interface

```text
[UI] Ajouter bouton Nouveautés
[UI] Ajouter lecteur de patch notes
[UI] Ajouter affichage de version
[UI] Charger les patch notes depuis les fichiers
```

---

# Méthode de test de l'équilibrage

Chaque modification importante devrait être testée dans plusieurs situations.

## Classes

- Guerrier.
- Paladin.
- Rôdeur.
- Invocateur.
- Lame.
- Autres classes existantes.

## Nombre de joueurs

- Solo.
- 2 joueurs.
- 3 joueurs.

## Progression

- Début de partie.
- Milieu de partie.
- Fin de partie.
- DJ infini.

## Critères à observer

- Dégâts.
- Survie.
- Sustain.
- Temps nécessaire pour vaincre les ennemis.
- Facilité d'utilisation.
- Risque pris par le joueur.
- Récompense obtenue en échange de ce risque.
- Utilité en solo.
- Utilité en coop.
- Variété des builds.

L'objectif n'est pas que toutes les classes aient exactement les mêmes performances. Elles doivent conserver des identités différentes tout en évitant qu'une classe ou une mécanique soit systématiquement écartée.

---

# Boucle d'équilibrage globale

```text
Classe ou build sous-performant
          ↓
Identifier le problème
          ↓
UP de l'identité de la classe
          ↓
Tests solo / coop
          ↓
Tests avec plusieurs builds
          ↓
Mesurer l'impact sur la puissance globale
          ↓
Renforcer les ennemis si nécessaire
          ↓
Tester à nouveau
```

Pour une mécanique problématique :

```text
Mécanique trop forte ou frustrante
          ↓
Identifier précisément le problème
          ↓
Nerf ciblé
          ↓
Vérifier que la mécanique reste intéressante
          ↓
Tester les interactions avec les autres classes
```

Cette approche permet de conserver les mécaniques appréciées par les joueurs tout en corrigeant les situations problématiques.
