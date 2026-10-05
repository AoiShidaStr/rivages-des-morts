# Version bureau et Steam

Décision du 4 octobre 2026 : chantier reporté à la version finie du jeu. Ce document garde l'étude pour ce moment-là. Rien n'est commencé dans le code.

## En bref

- Passer le jeu en application de bureau **ne rend pas la coop plus fluide**. Le décalage vient du netcode (voir « Avant Steam » plus bas), pas du navigateur.
- Steam apporte surtout une **connexion qui marche pour tout le monde** (relais de Valve), des **invitations entre amis** et la **visibilité** du magasin.
- Coût : 100 $ par jeu (récupérés à 1 000 $ de ventes), 30 % de commission, une version Electron du jeu, et deux à quatre jours pour un prototype.
- La version navigateur reste. Tout le code Steam vit à part et ne se charge que dans la version bureau.

## Pourquoi le bureau ne rend pas le jeu plus fluide

| Option | Verdict |
| --- | --- |
| **Electron** | Le même Chromium que le navigateur : même WebRTC, même moteur JavaScript, même WebGL. Le ping dépend de la distance entre les joueurs, aucun emballage n'y change rien. Petits gains seulement : pas d'onglet concurrent ni d'extensions, carte graphique performante forcée, pas de limite d'images par seconde. Le ralentissement des onglets cachés est déjà réglé par le Worker de `src/background.ts`. |
| **Tauri** | Utilise le moteur web du système (WebKit sur Mac et Linux), souvent moins bon en WebGL et en WebRTC. Risque de recul. |
| **Réécrire sous Godot ou Unity** | Énorme pour aucun gain réseau. |

Electron est le bon choix, mais pour Steam, pas pour la fluidité.

## Ce que Steam apporte

1. **Des connexions qui marchent partout.** Aujourd'hui, les joueurs se relient en WebRTC direct, sans relais TURN : derrière certaines box, en 4G ou sur un réseau d'entreprise, la connexion échoue. Le réseau de Steam tente d'abord la liaison directe puis passe par les relais de Valve (Steam Datagram Relay). L'adresse IP de chaque joueur reste cachée aux autres. Le ping baisse parfois quand le réseau de Valve offre un meilleur trajet, sans garantie.
2. **Rejoindre sans code.** « Rejoindre la partie » depuis la liste d'amis, invitations depuis l'overlay (Maj+Tab), salons publics listés par Steam. Aujourd'hui : relais Nostr publics et code de salon.
3. **La plateforme** : succès, sauvegardes dans le cloud, liste de souhaits, démo au Steam Next Fest, tests fermés avec Steam Playtest.

**Remote Play Together ne s'applique pas** : cette fonction ne vise que les jeux jouables à plusieurs sur un même écran.

## Coûts et démarches

| Point | Détail |
| --- | --- |
| Frais Steam Direct | 100 $ par jeu, remboursés une fois 1 000 $ de ventes atteints |
| Commission | 30 % jusqu'à 10 M$ de ventes, puis 25 %, puis 20 % au-delà de 50 M$ |
| Page du magasin | Page « Bientôt disponible » avant la sortie, puis vérification de la page et du jeu par Valve. Délai exact à vérifier dans la doc Steamworks. |
| Déclaration IA (règles de janvier 2026) | Pas besoin de déclarer le code écrit avec un assistant. Il faut déclarer le contenu que voit ou entend le joueur s'il a été généré par une IA : textes (dialogues, descriptions d'objets), et probablement les icônes dessinées par les scripts de `tools/pixel/`. Le développeur reste responsable de ce contenu. |
| Version Electron | Environ 100 à 150 Mo par plateforme. Windows et Linux ; Mac demande en plus la notarisation Apple. Steam gère les mises à jour. |
| Steam Deck | Le jeu ne gère pas la manette (aucun `getGamepads` dans `src/`). Il faut l'ajouter pour être jouable correctement et obtenir le badge « Vérifié ». |

## Le prototype

Une version bureau du jeu qui parle à Steam, sans rien payer, pour voir si ça vaut le coup.

- **Electron** reprend exactement le jeu web compilé. Steam s'y branche par la bibliothèque **steamworks.js**.
- **Identifiant d'application 480 (« Spacewar »)** : le jeu de démonstration de Valve. N'importe quel développeur peut l'utiliser pour tester les fonctions Steam sans payer. Passer à un vrai identifiant revient à changer un nombre.
- **Sans Steam lancé**, le jeu marche comme aujourd'hui : WebRTC et codes de salon.

Trois couches, testables chacune à part.

### Couche 0 : la coquille Electron (environ ½ journée)

- **`desktop/main.cjs`** ouvre la fenêtre et sert le dossier `dist/` par un protocole interne. Ouvrir directement les fichiers du disque bloquerait en partie le chargement des données JSON et du Worker de fond. Le build relatif existe déjà (`--base=./` dans le déploiement).
- **Steam tourne dans le processus principal d'Electron**, pas dans la page. La page reçoit seulement une petite API `window.steam` par un fichier `desktop/preload.cjs` : elle n'a aucun accès direct à l'ordinateur.
- **L'overlay Steam** (Maj+Tab) s'active avec `electronEnableSteamOverlay`, fourni par steamworks.js.
- **Deux commandes** : `npm run bureau` compile le jeu et le lance ; `npm run bureau:paquet` fabrique les dossiers Windows et Linux (electron-builder).
- **Les sauvegardes** de la version bureau sont rangées à part de celles du navigateur. Pour passer un héros de l'une à l'autre : export et import de fichier dans l'écran des personnages (`src/ui/characters.ts`). Steam Cloud plus tard.

### Couche 1 : les invitations Steam (environ ½ à 1 journée)

Les invitations passent par Steam, les données de jeu restent en WebRTC.

1. **L'hôte** crée sa partie comme aujourd'hui. Un bouton **« Inviter un ami Steam »** crée un salon Steam réservé aux amis (3 places), y range le code de la partie et la version du protocole, et ouvre l'overlay sur la liste d'amis.
2. **L'ami accepte.** Si son jeu est ouvert, il reçoit l'événement `GameLobbyJoinRequested` ; s'il est fermé, Steam le lance avec `+connect_lobby <id>`.
3. **Son jeu** lit le code dans le salon Steam et appelle `CoopSession.join(code)` (`src/net/session.ts`). La suite ne change pas.

Gain : plus de code à dicter, et un joueur web peut toujours rejoindre une partie Steam avec le code. Pas de gain de connexion : les données passent toujours en WebRTC direct.

### Couche 2 : les données par Steam (environ 1 à 2 jours)

Le vrai gain : des relais quand la liaison directe échoue, et des adresses IP cachées. Il s'agit d'écrire `steamRoom`, une troisième version de l'interface `Room` de `src/net/transport.ts`, à côté de `trysteroRoom` et `localRoom` (et `'steam'` dans le type `Network`).

| `Room` | Équivalent Steam |
| --- | --- |
| `selfId` | Le SteamID du joueur |
| `send` (sûr, dans l'ordre) | Paquet `Reliable`, jusqu'à 1 Mo |
| `sendFast` (sans renvoi) | Paquet `UnreliableNoDelay`, jusqu'à 1 200 octets. Les instantanés tiennent sous 1 Ko : vérifier le pire cas à 3 joueurs avec beaucoup de yokai. |
| `onPeerJoin` / `onPeerLeave` | Arrivées et départs dans le salon Steam (`LobbyChatUpdate`) |

Trois points demandent du soin :

- **La réception.** steamworks.js ne prévient pas quand un paquet arrive : il faut aller voir (`isP2PPacketAvailable`, `readP2PPacket`). Vérifier une fois par image ajouterait jusqu'à 16 ms de retard ; il vaut mieux vérifier toutes les 1 à 2 ms dans le processus principal, puis transmettre à la page.
- **La sécurité.** N'accepter une connexion (`P2PSessionRequest`, puis `acceptP2PSession`) que d'un membre du salon.
- **L'API utilisée.** steamworks.js passe par l'ancienne API P2P de Steam (`ISteamNetworking`). Valve la déclare dépréciée, mais elle fonctionne et passe par ses serveurs quand la liaison directe échoue. Si elle disparaît ou déçoit, steamworks-ffi-node donne accès aux nouvelles API (`ISteamNetworkingSockets`, `ISteamNetworkingMessages`) : seul `steamRoom` serait à réécrire.

Le reste ne bouge pas : prédiction, interpolation, protocole, salon.

Limite : une partie qui passe par Steam est réservée aux joueurs Steam. Règle proposée : tout le monde est sur Steam, donc Steam ; sinon WebRTC.

### Particularités de l'identifiant 480

- Dans la liste d'amis, les testeurs apparaissent « en jeu sur Spacewar ».
- « Rejoindre » depuis la liste d'amis lance Spacewar si le jeu est fermé : pour les tests, les deux joueurs ouvrent le jeu avant.
- La liste des salons publics de 480 est partagée par tous les développeurs du monde, et steamworks.js ne permet pas de la filtrer côté Steam (`getLobbies()` sans filtre). La liste des parties publiques (`PublicBoard`) reste en WebRTC pour le prototype, puis passe sur Steam avec un vrai identifiant (filtre sur une donnée du salon, par exemple `jeu = rivages-des-morts`).
- Pas de succès ni de Cloud propres au jeu tant qu'il n'a pas de vrai identifiant.

### Qui fait quoi

**Développement (Claude)** : écrire tout le code, vérifier que le jeu compile, lancer Electron sans Steam pour vérifier le démarrage et le retour au WebRTC. En option, une tâche GitHub Actions qui fabrique un zip Windows à télécharger, pour que le deuxième PC n'ait besoin ni de Node ni de npm. La partie Steam elle-même ne peut pas être testée dans un conteneur : il faut le client Steam et deux comptes.

**Tests (toi)** : deux PC avec Steam ouvert, deux comptes amis entre eux (un compte gratuit en plus suffit), le jeu lancé sur les deux.

1. Inviter depuis l'overlay, accepter, faire une descente complète.
2. Comparer le ping affiché en WebRTC et par Steam, entre les deux mêmes PC.
3. Mettre un PC en partage de connexion 4G : en WebRTC, ça échoue souvent ; par Steam, ça doit passer par les relais.
4. Fermer brutalement le jeu de l'invité : l'hôte doit le voir partir.

La simulation de réseau (`?reseau=local&ping=…`) ne s'applique pas à Steam : les mesures de cette couche se font sur de vraies machines.

### Ordre et durée

Deux à quatre jours au total, dont une bonne partie en allers-retours sur les tests. Commencer par les couches 0 et 1, déjà utiles seules ; faire la couche 2 si les tests convainquent.

### Après le prototype

- Payer Steam Direct et passer au vrai identifiant.
- Ouvrir la page « Bientôt disponible », récolter des listes de souhaits.
- Ajouter la manette (Steam Deck).
- Succès et Steam Cloud.
- Démo au Next Fest.

## Avant Steam : la fluidité de la coop

Ces améliorations servent à tous les joueurs, navigateur compris, et passent avant le chantier Steam. Classées par gain :

1. **Synchroniser les effets avec l'affichage** (peu coûteux). Les effets de combat (dégâts affichés, étincelles, sons) sont montrés dès leur arrivée, alors que les yokai sont affichés ~100 ms dans le passé. Chaque paquet d'effets porte déjà son numéro de pas (`tick`) : le retenir jusqu'à ce que l'affichage de l'invité l'atteigne, sauf pour les effets de son propre héros.
2. **Prédire le début des actions de l'invité** (le plus gros gain). `src/net/predict.ts` ne prédit que la marche, la garde et l'arc bandé : un coup, une esquive ou une compétence attend la réponse de l'hôte (~120 à 150 ms à 100 ms de ping). Lancer tout de suite l'animation, le son et le déplacement de l'esquive, puis recaler sur l'hôte.
3. **Compensation de latence chez l'hôte.** Pour juger un coup d'invité, replacer les ennemis là où l'invité les voyait. Surtout utile pour les sorts au sol du Sorcier et les tirs du Rôdeur.
4. **Le combat de l'hôte dans un Worker**, séparé de son affichage, pour un 60 pas/s stable même quand l'hôte rame. `World` ne dépend pas de Babylon.
5. **30 instantanés par seconde** (`SNAPSHOT_EVERY = 2` dans `src/net/protocol.ts`) : environ 17 ms de retard en moins, contre ~50 % de débit en plus. À mesurer avec le réseau simulé.

## À revérifier le moment venu

Ce document date d'octobre 2026. Avant de lancer le chantier :

- steamworks.js est-il toujours maintenu, et donne-t-il enfin accès aux nouvelles API réseau ?
- L'ancienne API P2P de Steam existe-t-elle encore ?
- Les frais, la commission, les délais de la page magasin et les règles de déclaration IA ont-ils changé ?

## Sources

- [Steamworks — Networking](https://partner.steamgames.com/doc/features/multiplayer/networking)
- [Steamworks — Steam Datagram Relay](https://partner.steamgames.com/doc/features/multiplayer/steamdatagramrelay)
- [Steamworks — ISteamNetworking](https://partner.steamgames.com/doc/api/ISteamNetworking)
- [steamworks.js](https://github.com/ceifa/steamworks.js)
- [Notebookcheck — nouvelles règles de déclaration IA sur Steam](https://www.notebookcheck.net/Steam-updates-AI-disclosure-form-requiring-developers-to-report-visible-and-in-game-AI-but-not-background-tools.1206103.0.html)
- [Slashdot — Valve réécrit ses règles sur l'IA](https://games.slashdot.org/story/26/01/19/1735231/valve-has-significantly-rewritten-steams-rules-for-how-developers-must-disclose-ai-use)
- [Fungies — frais et commission Steam](https://fungies.io/steam-revenue-share-explained/)
- [ghacks — Remote Play Together](https://www.ghacks.net/?p=155430)
