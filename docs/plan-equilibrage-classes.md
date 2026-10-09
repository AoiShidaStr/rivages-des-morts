# Plan d'équilibrage des classes (9 octobre 2026)

**Règles** : aucun nerf, uniquement des renforts. Objectif : cinq classes fortes et agréables, qui passent toutes le Palais. La Lame n'est plus « le premier DPS » : elle ne sert que d'unité de mesure du banc (voir `docs/equilibrage.md`).

## 1. Point de départ

| Classe | Victoires ressenties (joueur, avant 0.12.0) | DPS au banc, niv. 50 | Faiblesse |
|---|---|---|---|
| Rôdeur | 100 % | 103 % | Fragile au début et face à Izanami (bot : 5 à 36 %) |
| Sorcier | 96 % | 114 % | Le moins de PV, aucun soin |
| Lame | 70 % | 100 % | Dégâts durs à placer, peu de survie (corrigé en 0.12.0, à valider) |
| Guerrier | 48 % | 64 % | Aucune survie, posture pénible (corrigé en 0.12.0, à valider) |
| Paladin | non mesuré par le joueur | 70 % | Solo moins intéressant |

Les chiffres du bot ne sont pas fiables pour le Guerrier : il pare parfaitement (100 % de victoires au bot contre 48 % mesurés à la main).

## 2. Regard critique

1. **« Pas de nerf » + « tout le monde fort » = course à la puissance.** Le Rôdeur et le Sorcier fixent le plafond : tout le monde monte vers eux, donc les donjons deviennent plus faciles. Il faudra relever la courbe des ennemis (aujourd'hui +9 % PV et +10 % dégâts par niveau) ou la difficulté du donjon infini. Ce n'est pas un nerf de classe, mais c'est le seul vrai levier de difficulté qui reste.
2. **Le taux de victoire ne mesure pas le plaisir.** La Lame gagnait 70 % et ennuyait ; le Rôdeur gagne 100 % et peut ennuyer aussi. Il faut mesurer deux choses : la victoire et le temps où la classe fait ce qui la définit (placer ses coups, parer, tenir sa garde).
3. **Le banc de DPS flatte la mêlée.** Un kodama immobile aux PV infinis n'est jamais esquivé ni hors de portée. La Lame arrivait première au banc tout en étant frustrante : le banc ignore le temps passé à poursuivre. À compléter par une cible mobile qui fuit et recule, et à pondérer par le temps de contact.
4. **Le bot parie sur la perfection.** Pour le Guerrier, il biaise tout. Ajouter un bot « humain » : retard de réaction (250 ms), parade réussie 70 % du temps, 15 % de coups manqués. C'est le premier chantier : sans lui, chaque réglage repose sur le seul ressenti du joueur.
5. **15 builds (5 classes × 3 styles) ne s'équilibrent pas un par un.** Il faut une règle commune : à niveau égal, un style survie et un style dégâts doivent tous deux gagner au moins 80 % des descentes du Palais ; seuls le temps et le risque changent.
6. **Les 105 objets de la 0.11.0 et la refonte 0.12.0 n'ont pas encore été jouées.** Régler avant d'avoir joué, c'est corriger un fantôme. Prévoir une série de tests à la main avant toute nouvelle mécanique.

## 3. Plan par étapes

### Étape 0 : mesurer honnêtement (avant tout réglage)
- Bot « humain » (réaction, parades ratées, visée imparfaite) pour le Guerrier, la Lame et le Paladin.
- Banc à cible mobile, en plus du kodama fixe.
- Journal de parties local (classe, niveau, donjon, issue, PV perdus par minute) pour comparer aux ressentis du joueur.
- Nouvelle cible de victoire : **chaque classe ≥ 80 % au Palais en équipement complet, aux niveaux 1, 30 et 50**, avec le bot humain.

### Étape 1 : valider la 0.12.0 (Guerrier, Lame)
Rien à ajouter tant que le joueur n'a pas rejoué. Si le Guerrier reste sous 70 % : première réserve de renforts ci-dessous.

### Étape 2 : renforts par classe (valeurs à régler en jeu)
- **Guerrier** (banc 64 % → cible 85 %) : plus de PV de base (il reste le tank), Frappe fracassante qui recharge sur un coup bloqué, rage qui ne retombe pas en Offensive, arme à mêlée plus large, soin à la parade parfaite.
- **Paladin** (70 % → 80 %) : soin personnel en solo plus généreux (aujourd'hui 75 %, 60 %, 50 % selon la taille de l'équipe), Marteau lancé qui rend de la garde, Aura qui frappe plus large à l'allumage.
- **Lame** (reste 100 %) : valider d'abord combo, nuages et fantôme en chaîne ; si le contact reste dur, allonger un peu l'invulnérabilité de l'esquive.
- **Rôdeur** (aucun nerf) : renforcer son début de partie et le Palais, pas son plafond : Recul plus long, Flèche-filet plus large au niveau 1, arme de départ moins lente à bander. Il passe de « fort à la fin » à « fort partout ».
- **Sorcier** (aucun nerf) : un petit soin ou un bouclier de base, pour sortir des 30 % de victoires au Palais niveau 50 sans toucher à ses dégâts.

### Étape 3 : relever la difficulté
Une fois les cinq classes à 80 % ou plus au Palais : raccourcir les fenêtres de la Jorōgumo et d'Izanami, ajouter des modificateurs de donjon (comme la « Heat » de Hades), relever la montée du donjon infini.

## 4. Autres façons d'équilibrer

| Piste | Inspiration | Ce que ça règle | Coût | Avis |
|---|---|---|---|---|
| **Sous-classes au niveau 25 ou 50** | Path of Exile (ascendances), Diablo 4 | Un second axe par classe sans toucher à la base : Guerrier Rempart / Berserker, Lame Venin / Ombre, Rôdeur Piégeur / Tireur | 2 sous-classes × 5 = 10 passifs et quelques compétences | **Recommandé** : renfort pur, aucun nerf |
| **Aspects d'arme** | Hades | 2 à 3 variantes de l'arme de classe, aux mécaniques différentes | Déjà amorcé par les objets DPS / Survie / Boss de la 0.11.0 | Les 105 objets font déjà ce travail : ajouter des armes à mécanique, ne pas doubler le système |
| **Bonus de rôle en coop** | Risk of Rain 2, Deep Rock Galactic | Valorise le Paladin et le Guerrier, au DPS plus bas : auras, provocation, partage de garde | Auras et soins de groupe à régler | Bien pour le Paladin, ne règle pas le solo |
| **Bénédictions en cours de run** | Hades, Slay the Spire | Rattrape les classes faibles par des choix pendant la descente, ajoute de la rejouabilité | Gros chantier : système de choix, interface | À garder pour une 0.13 |
| **Maîtrise de classe** | Darkest Dungeon, Vampire Survivors | Points de maîtrise par classe qui débloquent des passifs | Moyen | Bonne progression, pas un équilibrage direct |
| **Refonte du Paladin** | Hades (Aegis), Diablo 4 | Le plus incertain des cinq : garde, marteau et aura peu liés. Il pourrait devenir « bouclier-projectile » (le marteau revient à la garde) | Moyen, comparable à la 0.12.0 | À décider après ses tests à la main |

## 5. Une sixième classe ?

Avis critique : **pas maintenant.** Le coût est celui d'une refonte entière : 21 objets (3 par emplacement), des planches 2D chibi 8×8, un bot, des talents, des textes, la coop (protocole). Deux classes viennent d'être refaites et ne sont pas validées. Une sixième classe sans critère de réussite ajoute un problème sans en résoudre un.

Si l'envie reste, deux pistes qui comblent un vrai vide :
- **Onmyōji (pièges et talismans)** : contrôle de zone et préparation, ce qui manque (le Sorcier brûle, le Rôdeur tire). Risque : recouvre les sceaux du Sorcier.
- **Moine shugenja (mêlée rapide aux poings, combos à jauge)** : style « Fists » de Hades ou Dead Cells, entre la Lame et le Guerrier. Risque : recouvre le combo de la Lame.

Préférer une sous-classe à une sixième classe tant que les cinq existantes ne sont pas toutes au niveau.

## 6. Ordre proposé

1. Étape 0 (bot humain, banc mobile) : un jour de travail, sans changement de jeu.
2. Tests à la main de la 0.12.0 et des objets 0.11.0.
3. Renforts du Paladin, du Rôdeur et du Sorcier (étape 2), puis du Guerrier si besoin.
4. Sous-classes au niveau 25, en commençant par le Guerrier et la Lame.
5. Relever la difficulté (étape 3).
