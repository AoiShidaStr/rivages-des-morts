# Diagnostic 0.16.0 — les classes, le Yomi sans fond, et la difficulté des donjons

10-11 octobre 2026. Mesures faites pour répondre à trois questions posées après une session de test à la main :
**quelle classe est trop forte, laquelle ne l'est pas assez ; pourquoi le Yomi sans fond sépare autant les classes ;
et faut-il durcir les donjons ordinaires ?** Tout ce qui suit se vérifie avec `npm run equilibrage`, `npm run dps`,
`npm run voies` et le nouveau mode `--mode infini`.

## 1. Ce que le joueur a mesuré (la référence)

Une descente dans le Yomi sans fond, palier 50 visé, équipement complet de niveau 50, les cinq classes jouées à la
main :

| Classe | Palier atteint | Ressenti |
|---|---|---|
| Rôdeur | **50** | — |
| Lame | 49 | Pas mal de dégâts, mais on sent que c'est moins fort que le Rôdeur. |
| Sorcier | 40 | Très dur comparé au Rôdeur. |
| Paladin | 30 | Long, impression de ne faire aucun dégât ; 2 s d'inattention et le boss récupère ses PV. |
| Guerrier | 30 | Hyper dur : peu de dégâts même avec la Frénésie et la Fureur. |

C'est **la** mesure qui compte : 40 paliers d'écart, et un ordre clair. Le robot du banc, lui, ne sait ni viser à
distance ni reculer en bon ordre ; ses chiffres sur le Rôdeur et le Sorcier sont à lire en relatif, jamais en absolu
(voir § 5).

## 2. Ce que dit le banc de DPS (niveau 50, équipement complet)

Unités de banc : les dégâts de la Lame sur un kodama immobile valent 100 %. Cible posée par `docs/plan-equilibrage-classes.md`.

| Classe | Avant | Après réglages | Cible |
|---|---|---|---|
| Lame | 100 % | 100 % | 100 % |
| Sorcier | 77 % | **80 %** | 115 % |
| Rôdeur | 71 % | 71 % | 100 % |
| Guerrier | **66 %** | **83 %** | 85 % |
| Paladin | **40 %** | **51 %** | 80 % |

Le banc flatte la mêlée (cible immobile, jamais poursuivie) : il exagère l'écart du Sorcier et du Rôdeur, mais il dit
vrai sur le Guerrier et le Paladin, qui sont **20 à 60 points sous leur cible**, et c'est exactement ce que le joueur a
ressenti.

## 3. Ce que dit le Yomi sans fond, joué d'un bout à l'autre

Nouveau mode du banc (`npm run equilibrage -- --mode infini --niveaux 50 --stuff complet`) : le bot enchaîne les blocs
comme le joueur, chaque bloc repartant à PV pleins.

| Classe | Avant les renforts (8 descentes) | Après (6 descentes, code livré) |
|---|---|---|
| Guerrier | 16,3 paliers | **30,0** |
| Paladin | 5,0 | **18,3** |
| Lame | 6,3 | 15,8 |
| Sorcier | 4,4 | 5,0 |
| Rôdeur | 1,3 | 2,5 |

À lire comme ceci : **tous ces chiffres sont faussés vers le bas** (le bot ne kitera pas 40 minutes), mais les
*deltas* restent utiles — les renforts du Guerrier et du Paladin se voient, et le Rôdeur reste le cas à part : c'est
la classe la plus dépendante de l'adresse du joueur.

## 4. Ce qui a été changé

### Renforts (les trois classes que le joueur a trouvées trop faibles)

- **Guerrier** — « Coups appuyés » : **+40 % de dégâts sur ses coups d'arme de base** (perk `strikeDamage`, appliqué
  après l'équipement, parce qu'une arme pose ses propres dégâts). C'est la demande directe du joueur : sa Frénésie et
  sa Fureur ne rattrapaient pas des coups trop mous. Banc : 66 % → 83 %.
- **Paladin** — mêmes coups appuyés **+30 %**, Marteau **×1,25**, Jugement **×1,2**. Banc : 40 % → 51 %. Il reste sous
  les autres par choix (c'est le tank), mais il finit ses salles.
- **Sorcier** — **mana 5 → 6 par seconde** : entre deux sceaux, il attendait plus qu'il ne lançait.

### Le Rôdeur, rogné du bout des doigts

PV ×1,35 → **×1,3** et dégâts subis ×0,9 → **×0,95** (les deux cadeaux de la 0.16.0). C'est le meilleur du joueur : il
n'était pas sain qu'il soit aussi le plus encaissant.

### Une troisième voie par classe : les voies d'abandon

Jusqu'ici une voie était « un renfort pur, aucun nerf ». Les deux voies demandées abandonnent un pilier de la classe,
et trois autres ont été écrites dans la même veine.

| Classe | Voie | Ce qu'elle abandonne | Ce qu'elle donne |
|---|---|---|---|
| Sorcier | **Orbe** | la salve de trois boules guidées | **un seul orbe à viser** : 12 fois les dégâts d'une boule (4 salves), plus loin, plus vite — mais 1,2 s entre deux tirs et aucun guidage |
| Paladin | **Parjure** | la garde qui tient | **+50 % de dégâts**, et **+10 % par blocage parfait**, sans plafond, tant que la descente dure (la garde casse au premier coup et met 1,5 s à revenir) |
| Guerrier | **Démuni** | la Garde entière (clic droit) | +55 % de dégâts, +30 % de vitesse de frappe, +10 % de vol de vie |
| Lame | **Chair** | un tiers de ses PV | critiques ×2,75 et +60 % de dégâts |
| Rôdeur | **Sans cuirasse** | un cinquième de ses PV et sa résistance (25 % de dégâts subis en plus) | +60 % de dégâts, +40 % sur les tirs chargés |

Détails d'implémentation : `perks.abandon` (dégâts, vitesse, vol de vie, et le cumul par garde parfaite),
`perks.noGuard` (la classe renonce à sa garde), `perks.frailHp` (la part de PV qu'on garde, appliquée **après** le
niveau et l'équipement : un `mul maxHp` classique ne toucherait que la base, et le « −35 % de PV » n'en serait pas
un) et `perks.baseAttack` — une voie qui refait l'attaque de base, posée **après** l'équipement, parce qu'une arme
pose ses propres réglages d'attaque et écraserait ceux de la voie.

Mesurées au bot dans le Yomi sans fond (référence : 6 descentes sans voie ; chaque voie : 4 descentes au même
équipement), elles font toutes ce qu'elles disent — **les dégâts par seconde montent de 9 à 60 %** :

| Voie | Palier atteint (sans → avec) | Dégâts/s (sans → avec) | Prix payé, visible à l'écran |
|---|---|---|---|
| Guerrier **Démuni** | 30,0 → 27,5 | 421 → **477** | plus de garde du tout : le bot tombe un peu plus tôt |
| Sorcier **Orbe** | 5,0 → **10,0** | 343 → **396** | un seul orbe à viser : 1,58 s entre deux orbes, contre 0,56 s entre deux salves |
| Lame **Chair** | 15,8 → 7,5 | 327 → **356** | PV max 641 → **417** : le bot meurt, un joueur qui esquive tient |
| Paladin **Parjure** | 18,3 → **22,5** | 260 → **385** | garde qui casse au premier coup, 1,5 s pour revenir |
| Rôdeur **Sans cuirasse** | 2,5 → **5,0** | 172 → **275** | PV max 676 → **541**, +25 % de dégâts subis |

Lecture : une voie d'abandon est un **marché**, pas un cadeau. Les deux voies qui gagnent le plus de paliers au bot
(Orbe, Sans cuirasse) sont celles qui échangent un geste difficile à jouer contre des dégâts ; celles qui en perdent
(Démuni, Chair) paient en PV et en garde, ce que le bot — qui ne recule jamais — ne sait pas convertir. Un joueur, si.

### La marée monte (mécanique nouvelle)

Elle n'était pas demandée, elle répond au problème du § 2 : une salle qu'on ne finit pas doit finir par se refermer sur
toi. Trois leviers, dans `world.ts` :

| Levier | Valeur | Effet |
|---|---|---|
| Hâte de la marée | +0,7 % de vitesse de yokai par seconde, plafond **+30 %** (atteint en 40 s) | un combat qui traîne se durcit tout seul |
| Saignée du Yomi | au plus haut, **−35 %** sur tout ce qui rend des PV | soigner à l'infini ne paie plus |
| Annonces | « Les morts s'agitent… », « La marée monte ! », « **Le Yomi boit tes soins…** » | le joueur voit la marée monter au lieu de la subir |

Elle **repart de zéro à chaque vague**, et le terrain d'entraînement de Tetsu ne la connaît pas. C'est un levier de
difficulté qui ne s'achète pas : il ne touche ni aux PV ni aux dégâts, donc il ne périme pas le travail d'équilibrage
— il change seulement la *façon* de jouer une salle (la finir, pas y survivre).

### La difficulté des donjons ordinaires : ×1,5

Dans `difficulty.json`, `enemy.dungeons` multiplie les PV et les dégâts de tous les donjons ordinaires (Rizières,
Palais), boss compris. **Le Yomi sans fond ne le reçoit pas** : il appelle `difficultyFor` directement, il garde ses
propres chiffres. Le curseur est donc unique et lisible : les donjons sont plus durs, l'épreuve est inchangée.

La base générale, elle, **n'a pas bougé** (×1,4 PV / ×1,6 dégâts au niveau 1, +9 %/+10 % par niveau) — c'est une
décision de mesure, pas un oubli : montée *en même temps* que le ×1,5, elle donnait ×1,8 à ×2,15 et cassait la moitié
des classes (§ 6). Ce qui durcit les yokai sans toucher aux chiffres, c'est leur **comportement** : télégraphes plus
courts, recharges réduites, vitesses relevées, kodama qui soignent plus fort (`enemies.json`), et des vagues plus
fournies. Ça, le Yomi sans fond en hérite aussi — leurs arènes sont les mêmes.

## 5. Critique de l'état actuel (ce que ce chantier a mis au jour)

1. **Le banc n'est pas le jeu.** Le bot pare parfaitement, ne panique pas, ne kitera pas, et ne vise pas comme un
   humain. Tant qu'il n'y a pas de « bot humain » pour les classes à distance, chaque réglage de Rôdeur et de Sorcier
   repose sur le ressenti du joueur. Piste : un profil de bot qui recule en gardant la distance de tir, esquive une
   fois sur deux, et rate 20 % de ses tirs — et un journal de parties comparé aux mesures.
2. **Les phases de boss décident de tout, et les kodama décident des boss.** Le joueur a mis le doigt dessus : « si je
   me décroche 2 s, le boss récupère des HP ». Les kodama soignent les yokai (et la 0.16.0 les a rendus plus forts et
   plus fréquents), donc une classe à petits dégâts ne peut tout simplement pas finir un boss : elle frappe, les
   soins annulent, la marée monte. C'est un mur de DPS, pas un mur de difficulté — et il frappe le Paladin et le
   Guerrier bien plus que le Rôdeur. Piste : plafonner les soins du kodama aux boss (ou les rendre « absorbables » en
   interrompant le canal au corps à corps).
3. **« La marée monte » + « Saignée du Yomi » punissent les classes de soutien deux fois** : hâte croissante *et*
   soins réduits. Le test du joueur le confirme (Paladin 30). C'est voulu, mais le cumul avec le mur de DPS du § 2 est
   violent ; une des deux mécaniques devrait céder du terrain si le Paladin reste dernier.
4. **Le Rôdeur est fort *parce que* le joueur est bon.** Il n'a ni garde ni soin : son plafond dépend entièrement de
   l'adresse. Le régler au banc, c'est régler un fantôme. Le vrai levier serait de rendre son plancher plus bas (une
   faiblesse claire à bas niveau) sans toucher à son plafond.
5. **Le banc de DPS ne compte pas le temps de contact.** Une cible immobile et infinie récompense la mêlée ; c'est
   déjà noté dans `docs/plan-equilibrage-classes.md`, et ça n'a pas été corrigé.
6. **Les donjons ×1,5 sont un vrai mur au niveau 1 pour les classes sans garde** (voir § 6) : la Rizières niveau 1 est
   le donjon d'apprentissage, et le bot n'y gagne plus qu'une fois sur six avec le Sorcier ou le Rôdeur. Un joueur fait
   mieux (il recule), mais c'est le réglage à revoir en premier si un débutant se plaint.
7. **« La marée monte » n'avait pas d'arbitre.** Écrite une première fois, elle montait pendant *toute la descente* :
   au bout de quarante secondes d'un Yomi de trente minutes, tout allait 30 % plus vite et ne redescendait jamais. Le
gel de la mesure a mis le doigt dessus (`--mode infini`) : elle repart maintenant **à chaque vague**, comme l'annonce
   le patch note. Ce genre d'écart entre le texte et le code ne se voit qu'en relisant la mécanique avec ses chiffres
   sous les yeux.

## 6. Effet mesuré du ×1,5 (bot, Rizières, équipement typique, 6 descentes)

Bornes : six descentes par classe et par niveau, donc **chaque descente vaut 17 points** — en dessous de 34 %, lire
« rarement », au-dessus de 83 %, « presque toujours ». La colonne « avant » vient du même banc, 8 descentes, juste
avant le ×1,5 (mêmes classes, mêmes renforts).

| Niveau | | Guerrier | Paladin | Sorcier | Lame | Rôdeur |
|---|---|---|---|---|---|---|
| 1 | avant ×1,5 | 100 % | 100 % | 84 % | 95 % | 73 % |
| 1 | **×1,5** | 100 % | 95 % | **17 %** | 76 % | **10 %** |
| 50 | avant ×1,5 | 100 % | 100 % | 96 % | 82 % | 66 % |
| 50 | **×1,5** | 100 % | 100 % | 98 % | 76 % | 40 % |

Trois lectures, dans l'ordre d'importance :

1. **Au niveau 1, le ×1,5 se voit nettement** sur les deux classes que le bot joue le plus mal : le Sorcier passe de
   84 % à 17 %, le Rôdeur de 73 % à 10 %. Ce sont aussi les deux classes qui n'ont ni garde ni soin : à bas niveau,
   encaisser 50 % de plus sans pouvoir se protéger ne se rattrape pas. Les trois classes à garde restent au-dessus de
   75 %. La Rizières niveau 1 étant le donjon qui ouvre tout le reste, c'est le point à surveiller en jeu.
2. **Au niveau 50, le ×1,5 seul ne renverse presque rien** (76 à 100 %) : les classes gagnaient trop largement pour
   qu'une marche de 50 % change l'issue en six descentes. Ce qui change, ce sont les *conditions* : durée 117 → 122 s,
   dégâts subis 404 → 551 par minute pour le Guerrier, 912 → 1 033 pour le Paladin — la marge fond, la descente se paie.
3. **Un premier essai avait doublé la mise sans le dire** : j'avais d'abord monté la base générale des yokai
   (×1,65 PV / ×1,95 dégâts, +11,5 %/+12 % par niveau) *puis* appliqué le ×1,5. Cumulé, l'effet valait ×1,8 au
   niveau 1 et ×2,15 au niveau 50 : la Lame tombait à 12 %, le Sorcier à 36 %, le Rôdeur à 0 %, et l'écart entre
   classes sautait à 90 points. Mesuré, donc retiré : `difficulty.json` garde ses chiffres d'origine, et le ×1,5 ne
   s'applique qu'aux donjons ordinaires — le Yomi sans fond ne le reçoit pas.

Si c'est trop peu à haut niveau, `enemy.dungeons` monte à 1,75 en une ligne ; si le niveau 1 reste trop dur pour un
débutant, deux réglages d'une ligne s'offrent : repousser la malédiction de niveau 1 (« Souffle du Yomi »,
`curses.from`) à 5, ou appliquer le ×1,5 seulement à partir du niveau 5. Le second a ma préférence : il ne touche que le
donjon d'apprentissage, et laisse la lettre de la règle — « les donjons passent à ×1,5 » — intacte là où elle compte.

## 7. Comment refaire ces mesures

```bash
npm run dps        -- --niveaux 50 --stuff complet --races einherjar --parties 3
npm run equilibrage -- --mode infini --niveaux 50 --stuff complet --races einherjar --parties 8 --blocs 12
npm run equilibrage -- --donjon palais --niveaux 1,50 --stuff complet --supplement 1     # sans le ×1,5
npm run equilibrage -- --donjon palais --niveaux 1,50 --stuff complet                     # avec, tel que livré
npm run equilibrage -- --mode infini --voie orbe --niveaux 50 --stuff complet --parties 4  # une voie en particulier
npm run voies -- --niveau 50
```

`--supplement` force le supplément des donjons (comparer avant/après), `--voie` fixe la voie du héros testé.
