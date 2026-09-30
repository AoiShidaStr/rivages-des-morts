# Suivi de l'équilibrage

Grille de suivi du plan de mise à jour (docs/plan-mise-a-jour-rivages-des-morts.md), avec les dernières mesures. Les mesures se refont après chaque changement de classe, d'arme ou de talent.

## Outils

```text
npm run dps -- --niveaux 30,50 --stuff complet                   banc de DPS (kodama immobile aux PV infinis)
npm run equilibrage -- --niveaux 30,50 --stuff complet           victoires et survie en donjon
npm run equilibrage -- --niveaux 30 --stuff complet --joueurs 3  coop à 3, alliés joués par le bot
```

`--stuff complet` : le meilleur équipement de chaque classe, forgé au niveau du héros, avec ses 9 points de talents.

| Classe | Arme | Casque | Plastron | Jambières | Bottes | Amulette | Relique |
|---|---|---|---|---|---|---|---|
| Guerrier | Totsuka-no-tsurugi | Kabuto fendu | Carapace de kappa | Suneate d'écailles | Waraji du pèlerin | Pêche d'Ōkamuzumi | Coupelle du kappa |
| Invocateur | Éventail de la Jorōgumo | Voile d'Izanami | Shiroshōzoku | Hakama de soie | Geta du kasa | Magatama fêlé | Magatama Yasakani |
| Lame | Kaiken d'Izanami | Chapeau de paille | Shiroshōzoku | Hakama de soie | Geta du kasa | Pêche d'Ōkamuzumi | Fil de Jōren |
| Paladin | Miroir Yata | Chapeau de paille | Dō du Yomi | Hakama de soie | Geta du kasa | Pêche d'Ōkamuzumi | Fil de Jōren |
| Rôdeur | Arc de soie | Chapeau de paille | Shiroshōzoku | Hakama de soie | Geta du kasa | Pêche d'Ōkamuzumi | Fil de Jōren |

## Cible du banc de DPS

Lame 100 %, Rôdeur 95 %, Guerrier 75 %, Invocateur 75 %, Paladin 60 % (en part des dégâts de la Lame, écart toléré : 5 points).

## Mesure de référence, 30 septembre 2026 (avant la 0.1.0)

Banc de DPS, équipement complet, moyenne des 7 races et parents divins.

| Classe | DPS niv. 30 | Part de la Lame | DPS niv. 50 | Part de la Lame | Cible |
|---|---|---|---|---|---|
| Lame | 239 | 100 % | 406 | 100 % | 100 % |
| Rôdeur | 724 | 303 % | 1469 | 362 % | 95 % |
| Guerrier | 195 | 82 % | 280 | 69 % | 75 % |
| Invocateur | 113 | 47 % | 183 | 45 % | 75 % |
| Paladin | 114 | 48 % | 165 | 41 % | 60 % |

Ce que ça montre :

- **Rôdeur, bien trop fort** : un tir chargé plein toutes les 0,6 s environ. Le talent qui le divise en 3 flèches se cumule avec les flèches qui s'infléchissent vers la cible marquée (Kami de la victoire) : les trois flèches touchent la même cible, soit ×3. L'Arc de soie immobilise la cible à chaque tir plein (612 étourdissements en 60 s) : c'est le blocage infini.
- **Invocateur, faible contre une seule cible** : sa force vient des âmes des yokai vaincus, qu'un mannequin ne donne jamais. Son nerf doit viser les âmes en vague (le nombre, la durée ou les dégâts des âmes), pas ses dégâts de base, et se mesurer en donjon (`npm run equilibrage`).
- **Paladin** : sous sa cible (48 % et 41 % pour 60 %), ce qui va dans le sens du renfort prévu.
- **Guerrier** : proche de sa cible (82 % puis 69 % pour 75 %).
- **Races** : le Hanyō est nettement au-dessus (sa transformation), surtout avec le Rôdeur.

## Après la 0.1.0 (30 septembre 2026)

Banc de DPS (part de la Lame, cible entre parenthèses) :

| Classe | Niveau 30 | Niveau 50 |
|---|---|---|
| Guerrier | 82 % (75 %) | 69 % (75 %) |
| Paladin | 61 % (60 %) | 52 % (60 %) |

Victoires du bot au niveau 1 (donjon des Rizières, niveau 1, 24 descentes par combinaison ; avant → après) :

| Guerrier | Invocateur | Lame | Paladin | Rôdeur |
|---|---|---|---|---|
| 74 → 88 % | 74 → 77 % | 88 → 90 % | 83 → 87 % | 75 → 71 % |

À retenir :

- Aux niveaux 30 et 50 avec tout l'équipement, presque toutes les classes gagnent à 100 % : le donjon à ton niveau ne départage plus les classes. C'est le chantier « scaling des ennemis » (0.2.0).
- Au niveau 50, la Lame prend de l'avance sur le Guerrier et le Paladin : le palier de forge « Âme liée » donne à toutes ses pièces le tag « Tous ». Or la Lame, le Paladin et le Rôdeur n'ont presque aucune pièce d'armure à leur tag, contrairement au Guerrier. Les objets de classe de la 0.3.0 corrigeront cette asymétrie.
- Le Rôdeur est faible au début (71 %) mais écrase tout en fin de partie (3 fois la Lame) : son nerf de la 0.2.0 doit viser la fin de progression.

## Grille de suivi

| Élément | Problème | Direction | État |
|---|---|---|---|
| Guerrier | Risque élevé pour une récompense insuffisante | UP (passif de classe sous 30 % de PV) | Fait (0.1.0) : Dernier souffle |
| Guerrier | Sustain insuffisant | UP | Fait (0.1.0) : vol de vie sous 30 % de PV |
| Paladin | Jeu solo moins intéressant | UP / adaptation | Fait (0.1.0) : armes avancées plus fortes |
| Paladin | Soins pensés pour la coop | Soin personnel selon la taille de l'équipe | Fait (0.1.0) : 75 %, 60 %, 50 % |
| Rôdeur | Tir chargé trop fort : 3 à 3,6 fois la Lame | Nerf ciblé : tir divisé + flèches déviées, cadence du tir plein | À faire (0.2.0) |
| Invocateur | Trop fort en donjon, faible sur une cible | Nerf des âmes en vague, mesuré en donjon | À faire (0.2.0) |
| Lame | Écran de fumée trop fort | Nerf ciblé | À faire (0.2.0) |
| Fil de Jōren et Arc de soie | Immobilisation infinie | Plus d'immobilisation permanente | À faire (0.2.0) |
| Katana de rônin | Plus fun à jouer | Plus de portée ou de largeur | À faire (0.2.0) |
| Ennemis | Les UP des joueurs peuvent réduire la difficulté | Scaling à ajuster | À faire (0.2.0) |
