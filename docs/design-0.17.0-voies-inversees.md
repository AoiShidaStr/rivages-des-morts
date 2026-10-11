# Design 0.17.0 — « Plutôt défendre »

L'état mesuré par le joueur, à la main, équipement complet, Yomi sans fond, règles 0.16.0 :

| Classe | Palier atteint | Voie jouée |
|---|---|---|
| Rôdeur | 50 | Sans cuirasse |
| Lame | 49 | Chair |
| Sorcier | 40 | Orbe |
| Paladin | 30 | Parjure |
| Guerrier | 30 | Démuni |

Lecture : **les adversaires sont équilibrés — ce sont les voies qui biaisent le choix.** Les paliers plafonnent
sur des voies d'abandon, qu'on joue parce qu'elles gagnent des dégâts. Le joueur demande des voies qui font
*autre chose* : pour le Guerrier et le Rôdeur plus de contrôle, pour le Sorcier plus de défense et du soin (soigner
l'allié qu'il vise), pour la Lame plus de poison et moins de dégâts, pour le Paladin un passif qui fait à peu près le travail de l'Égide,
mais qui invoque un garde à sa place, à la manière de l'ancien Invocateur. Et le Yomi doit être faisable
**en solo** jusqu'au palier 50.

Deux familles nouvelles, à côté de la voie d'abandon 0.16.0 :

1. **La voie inverse** (une par classe) : elle abandonne des dégâts (ou une faculté) pour ce que la voie d'abandon
   n'a pas donné — contrôle, soin, défense, poison. Elle **remplace** la voie des trois qui est la plus proche
   d'elle : celle qui ne sert déjà plus rien aux paliers hauts. Les deux autres voies (le renfort pur et la voie
   d'abandon) restent — trois voies par classe, comme aujourd'hui.
2. **La voie équilibrée** (une par classe, en plus — donc quatre voies au total) : un désavantage **modéré et
   local**, remédiable en jouant autrement, et une mécanique qui change le rythme de la classe sans toucher à son
   attaque de base.

Règle tenue des deux côtés : une voie inverse donne **peu ou pas de dégâts** — c'est le prix du contrôle et du
soin — et une voie équilibrée donne **sa part de dégâts** sans dominer les voies d'abandon.

Compétences F employées, des formes que le moteur connaît déjà (aucun nouveau `active.kind`) :

| `kind` | Ce qu'il fait |
|---|---|
| `onde` | frappe et pousse autour du héros, peut étourdir, peut ralentir (`slow`) |
| `sceau` | pose une zone au sol retardée |
| `sanctuaire` | soigne les héros dans la zone, peut brûler les yokai |
| `filet` | immobilise ce qui entre dans la zone |
| `salve` | tire des traits qui traversent |
| `cri` | renforce le héros sans toucher personne |

---

## Guerrier

### La voie d'abandon 0.16.0 : **Démuni** (gardé)
Sans Garde, en Offensive : +55 % de dégâts, +30 % de vitesse de frappe, 10 % de vol de vie. Inchangé.

### Cratère (voie inverse) — remplace **Rempart**

Rempart est la voie dont la garde existe déjà (80 %, contre-attaque, Frappe fracassante soignante) : la garde à
95 % de Rempart tend le Guerrier vers le Paladin. La voie inverse garde le mur mais le met **au service du
contrôle** : pousser, étourdir, tenir le tas loin de l'arrière-garde.

| Élément | Réglage |
|---|---|
| **Passif : Mur qui tourne** | La Frappe fracassante (R) **pousse 50 % plus loin** et étourdit **0,5 s de plus**. |
| **Coût** | Les coups d'arme de base font **20 % de dégâts en moins** : la voie est un contrôleur, pas un casseur. |
| **Compétence F : Vague de bouclier** | `onde`, rayon 3,8, dégâts 0,8, **pousse 12**, étourdit **1,0 s**, recharge **12 s**. « Tu frappes le sol du bouclier : tout ce qui t'entoure est projeté loin et sonné une seconde. » |
| **Ce qu'elle règle** | Le Guerrier plafonne au palier 30 parce qu'il n'a pas le temps de frapper. La voie garde le tas à distance de lui et de son allié : il place ses coups pendant que les yokai se relèvent. |

### Réplique (voie équilibrée) — nouvelle

Le Guerrier qui renonce au vol de vie de l'attaque Offensive pour une Parade transformée en attaque.

| Élément | Réglage |
|---|---|
| **Passif : Parade d'acier** | Un blocage parfait déclenche aussitôt une **Frappe fracassante gratuite** (sa recharge ne démarre pas), dont les dégâts valent **1,5 coup d'arme**. |
| **Désavantage** | Le vol de vie de la posture Offensive tombe de 10 % à **6 %**. |
| **Compétence F : Spirale** | `onde`, rayon 3,4, dégâts 1,0, pousse 10, étourdit 0,4 s, recharge **11 s**. |

---

## Lame

### La voie d'abandon 0.16.0 : **Chair** (gardée)
Un tiers de PV cédés : critiques ×2,75, +60 % de dégâts. Inchangée.

### Saigne (voie inverse) — remplace **Venin**

Venin amplifie le poison que la Lame pose déjà (nuages plus larges, poison plus lent à finir) : c'est le renfort
le plus redondant — la classe pose déjà du poison toute seule. La voie inverse reprend le poison, mais en fait un
**outil défensif** : le yokai empoisonné frappe moins fort.

| Élément | Réglage |
|---|---|
| **Passif : Sang putride** | **Chaque yokai empoisonné frappe avec 12 % de dégâts en moins** par charge de poison (jusqu'à 3 charges : −36 %). La classe pose déjà le poison toute seule ; la voie ne l'amplifie pas, elle l'utilise autrement : chaque charge affaiblit. |
| **Coût** | **Tous les coups critiques frappent ×1,7 au lieu de ×2** (passif de la Lame : les critiques vennent par esquive). |
| **Compétence F : Croc lente** | `onde`, rayon 3,4, dégâts 0,7, **slow 35 %** 2 s, **pas d'étourdissement**, recharge 12 s. « Tes lames balaient : ce qui t'entoure n'est pas sonné, il est ralenti — il ne sortira pas avant d'avoir perdu son venin. » |
| **Ce qu'elle règle** | La Lame joue Chair (49 paliers) parce que ses critiques ×2,75 sont sa seule façon de finir un boss. La voie inverse donne une autre façon : les yokai affaiblis de 36 % frappent si peu qu'un duel qui traîne devient tenable — le poison « fait le travail », comme la Jorōgumo le fait aux héros. |

### Le Voile (voie équilibrée) — nouvelle

La Lame qui lâche la longueur de son Écran de fumée pour un poison qui la soigne.

| Élément | Réglage |
|---|---|
| **Passif : Manteau écarlate** | Le poison de tes nuages **rend 3 PV par tick** (5 ticks : 15 PV par nuage). |
| **Désavantage** | L'Écran de fumée dure **2,5 → 1,5 s** : la durée d'invisibilité tombe, la recharge reste. |
| **Compétence F : Frappe rouge** | `onde`, rayon 3,6, dégâts 1,2, pousse 6, étourdit 0,5 s, recharge **12 s**. |

---

## Sorcier

### La voie d'abandon 0.16.0 : **Orbe** (gardée)
Une boule à viser, 1,2 s de reprise. Inchangée.

### Dryade (voie inverse) — remplace **Sceaux**

Sceaux amplifie les sceaux que le Sorcier pose déjà (rayon élargi, mana rendu) : c'est le renfort le plus redondant
— la classe contrôle déjà toute seule. La voie inverse reprend le rôle « contrôle » mais l'inverse : au lieu de
relever les sceaux, la voie **soigne** — le Sorcier gagne le soin que le joueur lui demande.

| Élément | Réglage |
|---|---|
| **Passif : Flammes douces** | Toutes tes sources de feu (boules, sceaux, traînées, météore) te rendent **2 PV par yokai touché**. « Même le feu du Yomi nourrit son maître. » |
| **Coût** | Les boules de feu font **15 % de dégâts en moins**. |
| **Compétence F : Sceau de vigueur** | `sanctuaire` posé **sous la souris** (portée 8, rayon 3,2, **heal 3 % des PV max/s pendant 5 s**, brûle les yokai qui y passent 6/s), reco 14 s. Description : « Un cercle de vigueur : les héros qui s'y tiennent récupèrent 3 % de leurs PV max par seconde — y compris l'allié que tu vises. » |
| **Ce qu'elle règle** | Le Sorcier n'a **aucun soin** et meurt premier en coop. Il peut se soigner lui-même (poser le F sous lui), ou soigner un allié — sur demande du joueur : « soigner l'allié qu'il vise ». |

### Lampion (voie équilibrée) — nouvelle

Le Sorcier qui renonce aux boules guidées pour un jeu « je pose, je recule, je laisse la zone travailler ».
(Son passif emploie `perks.sealBurn`, talent déjà écrit ; trois réglages connus, aucun nouveau mécanisme.)

| Élément | Réglage |
|---|---|
| **Passif : Héritage du feu** | Le sol brûlé par un sceau qui explose **dure 3 s de plus** et brûle 10/s (moteur : `perks.sealBurn`). |
| **Désavantage** | Les boules de feu ne **suivent plus** les cibles (`seek` : 3 → 0) : elles partent droit. |
| **Compétence F : Lampion** | `sceau`, portée 8, rayon 2,4, dégâts 1,2, délai 1 s, burn 10/s au sol 3 s, recharge **12 s**. |

---

## Paladin

### La voie d'abandon 0.16.0 : **Parjure** (gardée)
Garde à un blocage, +50 % de dégâts, +10 % par blocage parfait. Inchangée.

### L'Évêque (voie inverse) — remplace **Aube**

Aube amplifie l'Aura (durée, rayon, soin) que le Paladin possède déjà : la voie la plus coop pure, jamais jouée au
Yomi. La voie inverse reprend la demande du joueur : **l'Égide s'en va**, et un passif fait à peu près son travail
autrement — il **invoque un garde**, à la manière de l'ancien Invocateur (supprimé en 0.8.0, dont les planches
existent encore), posé ici sur le Paladin.

| Élément | Réglage |
|---|---|
| **Passif : Garde du serment** | Tu **renonces à l'Égide** (tout le groupe `aegis` de la classe tombe). À sa place, toutes les 12 s, un **garde spectral** apparaît à ton côté : il **taunt** les yokai proches, il fait le travail de l'Égide autrement (tous les héros à moins de 3 m de lui subissent 30 % de dégâts en moins tant qu'il vit), frappe pour **0,7 d'une attaque du Paladin** toutes les ~1,2 s, et a **50 % des PV max du Paladin**. Une fois tombé, il revient avec son cycle de 12 s. |
| **Désavantage** | Les soins personnels du Paladin passent solo de **85 % à 60 %** des PV rendus (selfHeal[0]) : le garde fait le travail de taunt et de dégâts, le soin individuel baisse. |
| **Compétence F : Jugement d'armes** | `onde`, rayon 3,6, dégâts 1,4, pousse 7, étourdit 0,6 s, recharge **13 s**. « L'onde sacrée fauche tout ce qui t'entoure, et le garde frappe dans la même seconde. » |
| **Ce qu'elle règle** | Le Paladin plafonne à 30 parce qu'il tient sans finir. Le garde ajoute un DPS **indépendant** du duel de mêlée, et son bouclier collectif fait ce que l'Égide faisait — mais il peut tomber, ce que l'Égide ne faisait jamais. |

### Le Chantre (voie équilibrée) — nouvelle

Le Paladin qui lâche sa garde individuelle pour l'Égide partagée — le bouclier vole vers l'allié.

| Élément | Réglage |
|---|---|
| **Passif : Bouclier volant** | L'Égide protège **aussi l'allié le plus proche** (40 % de réduction, la moitié du sien). |
| **Désavantage** | L'Aura rend **16 % des PV max au lieu de 22 %**. |
| **Compétence F : Chant** | `cri` : +15 % dégâts, 20 % de dégâts subis en moins, 6 s, recharge **16 s** — pour le héros et l'allié le plus proche. |

---

## Rôdeur

### La voie d'abandon 0.16.0 : **Sans cuirasse** (gardée)
PV ×0,8, dégâts subis ×1,25 : +60 % dégâts, +40 % tirs chargés. Inchangée.

### L'Éclaireur (voie inverse) — remplace **Piégeur**

Piégeur amplifie le filet que le Rôdeur pose déjà (rayon, durée, poison) : la voie la plus proche d'un renfort
« contrôle ». La voie inverse prend le contrôle **en coop** : marquer, accélérer, tenir l'allié vivant.

| Élément | Réglage |
|---|---|
| **Passif : Flèche balise** | La Marque du chasseur dure **9 s au lieu de 6**, et les yokai marqués subissent **+15 % de dégâts de toute source** (y compris allié et sorts) : le marqueur du groupe. |
| **Coût** | **PV de la classe ×0,85** (le Rôdeur vaut ×1,3 ; la voie le ramène à ×1,10) : un vrai désavantage personnel, pas que du bonus collectif. |
| **Compétence F : Le Couloir** | `filet` posé sous la souris (portée 11, rayon 2,4, étourdit **2 s**, recharge **12 s**) ; les alliés qui s'y tiennent vont **+20 % plus vite** (donc s'écartent vite). |
| **Ce qu'elle règle** | Le Rôdeur plafonne déjà à 50 : la voie n'ajoute pas de dégâts personnels (il n'en a pas besoin), elle rend son Marquage utile à l'équipe — +30 % pour lui, +15 % pour tous les autres. |

### Le Vigie (voie équilibrée) — nouvelle

Le Rôdeur qui renonce à la mobilité du Recul (Bond) pour un arc plus patient.

| Élément | Réglage |
|---|---|
| **Passif : Œil d'argile** | Les tirs chargés pleins étourdissent **0,5 s** (moteur : `perks.chargedStun`). |
| **Désavantage** | Le Recul (Bond) recharge **3,6 → 5 s**. |
| **Compétence F : Volée d'argile** | `salve`, 6 traits, dégâts 0,9, recharge **13 s**. |

---

# Le Yomi sans fond : le palier 50 tombe en solo

Trois réglages seulement, tous dans `donjon-infini.json` :

1. **La marée 0.16.0 devient moins punitive dans les paliers hauts** : au palier 40+, le plafond de la marée passe
   de +30 % à **+15 %** de vitesse. C'est le réglage le plus grand : 40 s de combat mènent déjà à +30 %,
   et la marée punit les classes à soin (Sorcier, Paladin) plus que toutes les autres.
2. **Le double boss recule** : `doubleBossFrom` 25 → **30**. Le double boss (Jorōgumo **et** Izanami ensemble) est
   le mur qui ferme la descente aux classes à garde : Paladin (30) et Guerrier (30) lui buttent dessus, le Rôdeur
   (50) passe plus loin. En le repoussant au palier 30, les blocs 25–29 redeviennent des paliers ordinaires — et les
   deux classes à garde ont une fenêtre de progression qu'elles n'avaient pas.
3. **« Chair du Yomi » (palier 50)** : HP ×1,25 / dégâts ×1,15 → **1,15 / 1,10** ; et l'**Abîme** au-delà
   (`beyond` 1,15/1,10) → **1,10/1,08**. La descente *dépasse* le 50, mais elle **y arrive** : la Lame (palier 49)
   et le Rôdeur (50) frôlaient le mur ; c'est ce bloc de chiffres qui l'adoucit juste assez.

Mesure attendue : le joueur rejoue le Yomi en solo, sur les cinq classes, à la main. Si le 50 reste fermé pour les
classes à garde, l'**Abîme** au-delà du 50 recule encore d'un cran (1,10/1,08 → 1,06/1,05) et on re-mesure.
