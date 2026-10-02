# Suivi de l'équilibrage

Grille de suivi du plan de mise à jour (docs/plan-mise-a-jour-rivages-des-morts.md), avec les dernières mesures. Les mesures se refont après chaque changement de classe, d'arme ou de talent.

## Outils

```text
npm run dps -- --niveaux 30,50 --stuff complet                   banc de DPS (kodama immobile aux PV infinis)
npm run equilibrage -- --niveaux 30,50 --stuff complet           victoires et survie en donjon
npm run equilibrage -- --niveaux 30 --stuff complet --joueurs 3  coop à 3, alliés joués par le bot
npm run equilibrage -- --mode kits --donjon palais --niveaux 30,50  les 3 styles de chaque classe : survie, DPS, victoires
npm run equilibrage -- --niveaux 50 --stuff nu --niveau-donjon 30  héros sans objet contre un donjon plus bas
```

`--stuff survie`, `dps` ou `equilibre` : un des trois styles de jeu de la classe (tableau `KITS` de `tools/equilibrage.mjs`, et GDD, « Styles de jeu par l'équipement »). `--stuff nu` : l'arme de départ jamais forgée, rien d'autre.

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

## Après la 0.2.0 (30 septembre 2026)

Banc de DPS, équipement complet (part de la Lame ; avant la 0.2.0 entre parenthèses) :

| Classe | Niveau 30 | Niveau 50 | Cible |
|---|---|---|---|
| Lame | 100 % | 100 % | 100 % |
| Rôdeur | 105 % (303 %) | 98 % (362 %) | 95 % |
| Guerrier | 82 % | 69 % | 75 % |
| Paladin | 62 % | 52 % | 60 % |
| Invocateur | 45 % | 42 % | 75 % |

Victoires du bot en donjon, équipement complet (niveaux 30 et 50 : donjon au niveau du héros) :

| Classe | Niveau 1 | Niveau 30 | Niveau 50 |
|---|---|---|---|
| Guerrier | 89 à 95 % | 98 % | 80 à 85 % |
| Invocateur | 76 à 93 % | 100 % (72 s, contre 55 s avant) | 96 à 100 % |
| Lame | 82 à 93 % | 96 % | 95 à 98 % |
| Paladin | 88 à 89 % | 100 % | 100 % |
| Rôdeur | 73 à 82 % | 88 % | 71 à 76 % |

Les mesures du niveau 1 varient d'environ 10 points d'un lancement à l'autre : ne pas régler sur un seul lancement.

À retenir :

- **Invocateur** : au banc de DPS (une seule cible, sans âmes à lier), il reste loin de sa cible de 75 %. En donjon, où ses âmes font sa force, il reste le plus rapide. Pour qu'il soit à 75 % contre une seule cible sans devenir trop fort en vague, il faudrait déplacer sa puissance des âmes vers son compagnon ou ses propres coups : c'est une décision de design à prendre.
- **Niveau 50** : le Guerrier et le Rôdeur décrochent (80 % et 75 % environ, contre 95 à 100 % pour les autres). Piste : les objets de classe de la 0.3.0.

## Objets du Yomi (0.3.0), 1er octobre 2026

Chaque objet est comparé à la même classe sans lui : 16 descentes par race, soit 112 par classe (16 par classe pour les amulettes de race, 64 pour le Gohei). Le héros porte l'équipement typique forgé à son niveau ; l'objet testé **remplace** la pièce de son emplacement. Le résultat mesure donc l'effet de l'objet moins ce que la pièce remplacée apportait : c'est le choix qu'a vraiment le joueur. Écart de bruit : environ 5 points par classe, 12 points pour une amulette de race.

**Bot formé à Izanami** (première version, celle de la PR #23 ; la version de `main`, plus complète, la remplace et donne des chiffres voisins, voir « Palais d'Izanami » plus bas) : il frappe sans la regarder (le bord d'un arc large, ou par salves avec un estoc ou un arc) et fait tomber les pêches mûres. Avant, toutes les classes atteignaient Izanami et mouraient devant elle : le Palais semblait injouable (0 à 6 % de victoires), alors que c'était le bot. À la force actuelle du Palais, qui ne change pas :

| Classe | Palais niv. 1 | Palais niv. 10 | Palais niv. 20 |
|---|---|---|---|
| Guerrier | 90 % | 100 % | 93 % |
| Invocateur | 79 % | 100 % | 88 % |
| Lame | 64 % | 98 % | 88 % |
| Paladin | 90 % | 93 % | 33 % |
| Rôdeur | 17 % | 30 % | 8 % |

Le Rôdeur (contre Izanami : il doit viser pour tirer, donc la regarder) et le Paladin au niveau 20 sont les points faibles du Palais.

Banc de DPS, niveau 30, équipement complet : Nodachi de l'Ikusa 191 contre 195 pour le Totsuka (même puissance, autre style) ; Arc d'Ikazuchi 234 contre 235 pour l'Arc de soie, après son renfort (212 avant).

Victoires au Palais niveau 20, avant → avec l'objet (après les réglages de la PR #23) :

| Objet | Classe | Palais niv. 20 | Ce que l'objet change |
|---|---|---|---|
| Masque de hannya | Guerrier | 93 → 96 % | PV restants 63 → 72 % |
| Nodachi de l'Ikusa | Guerrier | 93 → 95 % | dégâts/s +9 % |
| Gourde de saké d'oni | Guerrier | 93 → 84 % | le bot ne fait pas de blocage parfait : sa rage n'est pas mesurée |
| Les trois ensemble | Guerrier | 93 → 100 % | build « au bord du gouffre » |
| Os de shikome, 4 pièces | Lame | 88 → 98 % | PV restants 41 → 60 % ; le plus fort des nouveaux objets |
| Os de shikome, 2 pièces | Lame | 88 → 96 % | |
| Tabi de shinobi | Lame | 88 → 93 % | |
| Tsuba ébréchée | Lame | 88 → 88 % | dégâts/s +16 % |
| Sōhei, 4 pièces | Paladin | 33 → 56 % | dégâts subis −20 % ; aide la classe la plus faible au niveau 20 |
| Sōhei, 2 pièces | Paladin | 33 → 41 % | |
| Shimenawa tressée | Paladin | 33 → 30 % | remplace la Carapace de kappa (−15 % de dégâts subis) |
| Cloche du Grand Rocher | Paladin | 33 → 27 % | remplace le Magatama fêlé (+20 PV) |
| Encensoir du moine | Paladin | 33 → 20 % | idem |
| Éclaireur du Yomi, 4 pièces | Rôdeur | 8 → 18 % | |
| Tabi du messager | Rôdeur | 8 → 9 % | dégâts/s +6 % |
| Arc d'Ikazuchi | Rôdeur | 8 → 6 % | |
| Mino de paille | toutes | −5 à −21 points | objet commun qui remplace la Carapace de kappa : normal qu'il soit en dessous |
| Yomotsu-hegui | Guerrier, Invocateur, Paladin | −21 à −23 points | trop coûteux pour les classes qui vivent de leurs soins |
| Yomotsu-hegui | Lame, Rôdeur | −3 à +5 points | dégâts/s +15 à +20 % |

Amulettes de race : leurs effets jouent, mais elles donnent 10 PV quand le Magatama fêlé, l'amulette typique, en donne 20. Le Gohei, le Dogū et la Tsuba du rōnin restent dans le bruit ; la Corne d'oni coûte des victoires au Paladin (niv. 10 : 63 → 44 %) et à l'Invocateur (niv. 20 : 75 → 50 %), ce qui va avec un objet à risque.

Second passage, après les réglages (amulettes à 20 PV, Yomotsu-hegui +35 %, la Marque du chasseur aveugle Izanami) ; Palais niveau 20, avant → avec l'objet :

| Objet | Classe | Avant les réglages | Après |
|---|---|---|---|
| Cloche du Grand Rocher | Paladin | 33 → 27 % | 28 → 39 % |
| Encensoir du moine | Paladin | 33 → 20 % | 28 → 32 % |
| Gourde de saké d'oni | Guerrier | 93 → 84 % | 96 → 96 % (PV restants 63 → 68 %) |
| Tsuba ébréchée | Lame | 88 → 88 % | 87 → 97 % |
| Yomotsu-hegui | Guerrier / Invocateur / Paladin | −21 à −23 points | −12 à −27 points : le risque reste lourd pour les classes qui vivent de leurs soins |
| Yomotsu-hegui | Lame / Rôdeur | −3 à +5 points | +3 points, dégâts/s +23 à +30 % |

Rôdeur au Palais avec la Marque du chasseur qui aveugle Izanami : niveau 10 de 30 à 36 %, niveau 20 de 8 à 18 %. Avec le bot de `main` (comparaison A/B, Rôdeur seul, 16 descentes par race, équipement typique) : niveau 1 de 21 à 32 %, niveau 10 de 79 à 90 %, niveau 20 de 43 à 59 %. Il reste la classe la plus faible du Palais ; la panoplie de l'Éclaireur le monte à 58 % au niveau 10.

## Styles de jeu et poids de l'équipement (0.8.0), 2 octobre 2026

**Puissance.** Sur main, le niveau du héros ne donnait que des PV (+4 par niveau) : tous les dégâts venaient de la forge de l'arme (+6 % par niveau), et les pièces apportaient peu (+1 dégât, +4 PV). Désormais, le niveau donne +1 % de dégâts et +3 PV par niveau ; l'arme forgée +3,3 % par niveau ; une pièce +9 % de ses PV et +1 % de ses dégâts (en %) et de son armure par niveau. Forgé au niveau du héros, l'équipement double à peu près ses dégâts et ses PV effectifs (×1,8 à ×3,4 selon le style au niveau 50). À niveau égal, la courbe ne bouge pas : équipement typique, Rizières, niveau 30 de 78 à 100 % de victoires et niveau 50 de 72 à 100 %, comme sur main.

**Test de référence** : héros niveau 50 sans objet (arme de départ jamais forgée, 9 points de talents) contre les Rizières niveau 30, 7 races, 8 descentes chacune : Guerrier 5 %, Invocateur 0 %, Lame 0 %, Paladin 2 %, Rôdeur 14 % de victoires. Il échoue. Avec un partage exact moitié niveau, moitié équipement (+2 % de dégâts et +5,5 PV par niveau), il gagnait encore 28 à 67 % : l'équipement pèse donc un peu plus de la moitié.

**Styles de jeu** : trois par classe (survie, équilibre, dégâts), mesurés sur trois critères. *Survie* : PV perdus par minute en donjon, soins déduits, en part des PV max (plus bas, mieux c'est). *DPS* : banc de DPS. *Équilibre* : victoires. Palais d'Izanami à niveau égal, races Einherjar, Oushebti et Hanyō, 8 descentes chacune. L'Invocateur attend sa refonte en Sorcier.

| Classe | Style | Survie : pertes nettes / min (niv. 30 · 50) | DPS au banc (niv. 30 · 50) | Victoires (niv. 30 · 50) |
|---|---|---|---|---|
| Guerrier | Survie | 42 % · 42 % | 139 · 214 | 100 % · 100 % |
| Guerrier | Équilibre | 50 % · 56 % | 166 · 261 | 96 % · 96 % |
| Guerrier | Dégâts | 90 % · 146 % | 216 · 345 | 96 % · 71 % |
| Lame | Survie | 15 % · 14 % | 141 · 218 | 100 % · 100 % |
| Lame | Équilibre | 48 % · 43 % | 238 · 371 | 92 % · 96 % |
| Lame | Dégâts | 126 % · 126 % | 316 · 536 | 92 % · 92 % |
| Paladin | Survie | 22 % · 27 % | 152 · 235 | 100 % · 96 % |
| Paladin | Équilibre | 30 % · 47 % | 157 · 244 | 96 % · 83 % |
| Paladin | Dégâts | 73 % · 100 % | 211 · 375 | 67 % · 63 % |
| Rôdeur | Survie | 32 % · 47 % | 254 · 416 | 79 % · 58 % |
| Rôdeur | Équilibre | 54 % · 65 % | 339 · 553 | 71 % · 58 % |
| Rôdeur | Dégâts | 51 % · 57 % | 375 · 552 | 83 % · 83 % |

Chaque classe s'étage dans l'ordre : le style survie perd le moins de PV, le style dégâts frappe le plus fort, et le style équilibre se place entre les deux. Le style dégâts est le style à risque : 63 à 96 % de victoires au Palais. Aux Rizières, les douze styles gagnent au moins 83 % des descentes à tous les niveaux (le Rôdeur survie au niveau 50 ; tous les autres au moins 89 %). Seule exception, le Rôdeur au Palais : son style équilibre ne se distingue pas du style dégâts au niveau 50, parce que tuer vite reste sa meilleure défense et que le bot se sert mal du Recul et des filets.

Réglages trouvés en mesurant :
- **Armes.** Au Palais, l'arme pesait plus que les pièces. Le Totsuka (engagement 0,36 s) faisait perdre deux fois plus de PV que le Katana, pour le même DPS : il passe à 0,26 s. Le Tetsubō (0,45 s) laissait le Paladin à 29 % de victoires contre 75 à 96 % avec le Miroir de Yata : il passe à 0,26 s et gagne +25 de garde (son bouclier-cloche).
- **Yomotsu-hegui** dans un style dégâts : Paladin 0 % de victoires au Palais niveau 30, Guerrier 33 % au niveau 50. Les soins divisés par deux tuent les classes qui vivent de leurs soins. Les styles dégâts prennent donc une relique de classe ; Yomotsu-hegui reste un choix à risque.
- **Retouches d'objets** :
  - Cloche du Grand Rocher : renvoi de 40 à 30 %. Elle faisait mieux survivre que les pièces de survie.
  - Shimenawa : +40 de garde, −5 % de vitesse, 6 % d'armure.
  - Geta du temple : Marteau 1 s plus tôt au lieu de 2 s, qui donnaient au Paladin le DPS de la Lame.
  - Jingasa : tir chargé 15 % plus rapide au lieu de 20 %.
  - Dō de cuir noir : la cible marquée fait 35 % de dégâts en moins.
  - Plume de Yatagarasu : abattre la proie marquée rend 15 % des PV max.
  - Écaille de Ryūjin : 3 % des PV max par coup bloqué.
  - Encre de Shinigami : chaque yokai abattu rend 3 % des PV max (Lame dégâts au Palais niveau 50 : de 38 à 92 % de victoires).
- **DPS au banc des styles dégâts, niveau 50** : Lame 536, Rôdeur 552 (103 %), Paladin 375 (70 %), Guerrier 345 (64 %). C'est proche des cibles du plan (95 %, 60 %, 75 %).

## Grille de suivi

| Élément | Problème | Direction | État |
|---|---|---|---|
| Guerrier | Risque élevé pour une récompense insuffisante | UP (passif de classe sous 30 % de PV) | Fait (0.1.0) : Au bord du gouffre |
| Guerrier | Sustain insuffisant | UP | Fait (0.1.0) : vol de vie sous 30 % de PV |
| Paladin | Jeu solo moins intéressant | UP / adaptation | Fait (0.1.0) : armes avancées plus fortes |
| Paladin | Soins pensés pour la coop | Soin personnel selon la taille de l'équipe | Fait (0.1.0) : 75 %, 60 %, 50 % |
| Rôdeur | Tir chargé trop fort : 3 à 3,6 fois la Lame | Nerf ciblé : tir divisé + flèches déviées, cadence du tir plein | Fait (0.2.0) : 98 à 105 % de la Lame |
| Invocateur | Trop fort en donjon, faible sur une cible | Nerf des âmes en vague, mesuré en donjon | En partie (0.2.0) : paliers réduits ; reste une décision de design |
| Lame | Écran de fumée trop fort | Nerf ciblé | Fait (0.2.0) : 2,5 s, 12 s, Métamorphe plafonné |
| Fil de Jōren et Arc de soie | Immobilisation infinie | Plus d'immobilisation permanente | Fait (0.2.0) : 3 s de répit après chaque immobilisation |
| Katana de rônin | Plus fun à jouer | Plus de portée ou de largeur | Fait (0.2.0) : estoc de 2,6 × 1,5 m |
| Ennemis | Les UP des joueurs peuvent réduire la difficulté | Scaling à ajuster | Fait (0.2.0) : +9 % PV, +10 % dégâts par niveau |
| Objets du Yomi | Styles de jeu par classe, sans objet strictement meilleur | Réglages mesurés au bot | Fait (PR #23, puis 0.8.0) |
| Forge | Pièces qui ne gagnaient rien en montant de niveau | Chaque pièce a des PV | Fait (PR #23) |
| Palais | Rôdeur et Paladin (niv. 20) faibles contre Izanami | À décider | Mesuré (PR #23) |
| Équipement | Les pièces pesaient peu, tout passait par la forge de l'arme | Objets forts : la moitié de la puissance | Fait (0.8.0) : niveau +1 %/+3 PV, arme +3,3 %, pièces en % ; un héros niveau 50 sans objet échoue au donjon 30 |
| Styles de jeu | Les panoplies imposaient un style | Trois styles par classe qui se mélangent | Fait (0.8.0) : survie, équilibre, dégâts, mesurés au Palais |
| Rôdeur | Flèche du kami peu utile | Autre ultime | Fait (0.8.0) : Coup de grâce |

## Palais d'Izanami (1er octobre 2026, bot formé à Izanami)

Avant, le bot mourait toujours sur Izanami (0 % à tous les niveaux) : il la regardait en face et ignorait les pêches. Il vise maintenant à côté d'elle (au-delà du cône de son regard), détourne les yeux quand la jauge monte, fuit sa colère, esquive son étreinte et son bond, et frappe les pêchers mûrs pour la repousser.

`npm run equilibrage -- --donjon palais --niveaux 1,30,50 --stuff complet --parties 6` (victoires) :

| Classe | Niveau 1 | Niveau 30 | Niveau 50 |
|---|---|---|---|
| Guerrier | 90 % | 71 % | 52 % |
| Invocateur | 93 % | 95 % | 93 % |
| Lame | 74 % | 64 % | 45 % |
| Paladin | 100 % | 95 % | 88 % |
| Rôdeur | 14 % | 36 % | 5 % |

Le Rôdeur et la Lame (les moins de PV au contact des shikome et d'Izanami) décrochent ; à confirmer en jouant, le bot du Rôdeur pouvant être en cause.

Donjon infini, héros niveau 50 (`--donjon infini --palier N`) : paliers 6 à 10 (Palais, niveau 60 puis 70) 0 à 67 % ; paliers 21 à 25 (niveau 90 puis 100) 0 %, le bot meurt avant le double boss.
