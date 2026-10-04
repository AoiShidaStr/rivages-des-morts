# Objets et passifs inertes depuis la 0.9.0, et leur remplacement

La refonte 0.9.0 a retiré :

- la **rage** et « Au bord du gouffre » du Guerrier ;
- le **Pas de l'ombre** de la Lame, avec ses marques d'ombre ;
- **Relever** du Paladin ;
- le **soin fixe de l'Aura**.

En 0.10.0, **tout ce qui s'appuyait dessus a été remplacé**. Ce tableau garde la correspondance.

## Objets

| Objet | Avant | Depuis la 0.10.0 |
|---|---|---|
| Totsuka-no-tsurugi (arme épique) | Foudre à rage pleine | Devient la **Naginata du Maître d'Armes** : saignement en passant en Offensive |
| Huit tonnerres (palier du Totsuka) | Foudre +6 | Paliers de la Naginata : allonge, Bond +20 %, critiques en Offensive |
| Gourde de saké d'oni (amulette) | Rage au blocage parfait | Devient le **Cœur de l'Arène** (relique) : vol de vie selon les ennemis proches |
| Kabuto fendu (casque) | Frappe −10 rage | Devient le **Mempō de Contre-Attaque** : riposte après un blocage parfait |
| Katana de rōnin | Bloquer : +50 % de rage | Un coup bloqué rend 2 % des PV max |
| Iaijutsu (palier du Katana) | Bloquer : rage | Premier coup en Offensive critique (×1,5) |
| Moisson (palier du Nodachi des rizières) | +2 rage par coup | +1 % de vol de vie |
| Waraji de pèlerin | Bond −10 rage | Bond −1,5 s de recharge |
| Masque de hannya | Au bord du gouffre dès 50 % | Sous 50 % des PV, +20 % de dégâts en Offensive |
| Kunai équilibrés (palier des Kunai jumeaux) | Pas de l'ombre −0,5 s | Frappe fantôme −0,5 s |
| Kusarigama des Oubliés | Pas de l'ombre plus long | Frappe fantôme +2 m, poison +5 s |
| Tabi de shinobi | Pas de l'ombre : une charge de plus | Frappe fantôme 15 % plus vite, +0,3 s d'invulnérabilité |
| Haidate de shikome | Bouclier après un Pas de l'ombre | Bouclier après une Frappe fantôme |
| Soleil levant (palier du Miroir de Yata) | Aura +30 % | L'Aura rend 35 % des PV max au lieu de 25 % |

## Talents de style

| Style | Talent | Depuis la 0.10.0 |
|---|---|---|
| Susanoo | Vent de tempête | Changer de posture lance un éclair (10 dégâts, 2,5 m) |
| Susanoo | Colère de la tempête (ultime) | En Offensive, un coup sur 4 appelle la foudre (+12) |
| Héraclès | Peau du lion de Némée | En Garde, 15 % de dégâts subis en moins en plus |
| Berserkir | Élan sauvage | Le Bond revient 2 s plus tôt |
| Berserkir | Peau d'ours (ultime) | Survie à 1 PV, puis 4 s de Frénésie |
| Tsukuyomi | Pas de lune | Frappe fantôme −1,5 s |
| Tsukuyomi | Croissant | Frappe fantôme +30 % de portée, empoisonne autour de la cible |
| Tsukuyomi | Marée d'ombre | Abattre un ennemi empoisonné : Frappe fantôme −3 s |
| Tsukuyomi | Éclipse (ultime) | Poison jusqu'à 4 charges (critique ×5) |
| Osiris | Crue du Nil | L'Égide revient 6 s plus tôt |
| Osiris | Bandelettes | L'Égide absorbe 60 % de plus |
| Osiris | Souffle de vie | Poser l'Égide rend 20 PV |
| Osiris | Roi des morts (ultime) | L'Égide protège deux héros à la fois |

## Passifs de race, de classe et paliers de tag

| Où | Depuis la 0.10.0 |
|---|---|
| Einherjar guerrier | Sang du Gladiateur : sous 50 % des PV, +15 % de vol de vie |
| Hanyō guerrier | Maîtrise du oni : transformé, +20 % de dégâts en Offensive |
| Oushebti guerrier | Riposte d'argile : coup suivant en zone, qui fait saigner |
| Einherjar et Hanyō lame | Leur accélération vaut pour l'esquive et la Frappe fantôme |
| Oushebti lame | La carapace rend la Frappe fantôme aussitôt prête |
| Lame, passif de classe | Festin toxique : abattre un ennemi empoisonné rend 4 PV |
| Tag Guerrier 2 / 4 / 6 | Changer de posture : +10 / +20 / +30 % de vitesse de frappe pendant 3 s. À 4 pièces, le Bond étourdit 0,5 s ; à 6, la Frappe fracassante revient 20 % plus vite |
| Tag Paladin 4 / 6 | Soin au blocage, plus l'Aura qui donne +15 / +30 % d'Armure ; à 6 pièces, +10 % de dégâts |

## Code laissé en place

Ces morceaux ne servent plus à aucune donnée et pourront être retirés :

- la jauge `rage` (toujours vide), `gainRage`, `rageCost`, `rageOnHit` ;
- le dash `shadowDash`, `dashCharges`, `refundDash`, les marques d'ombre ;
- `paladin.raise`, les âmes relevées, et `paladin.selfHeal`.
