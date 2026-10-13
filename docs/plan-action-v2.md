# Plan d'action — questionnaire gameplay v2

Étude, pas implémentation : aucun fichier de jeu n'est modifié par ce document.
Source : réponses du joueur au questionnaire v2 (récupérées après compression de thread).
Base : dépôt v0.18.0 (~11 300 lignes TS). Chiffres relus sur le code réel.

## Échelle d'effort

- **S** ≈ une demie-session (quick win, 1 fichier + son éventuel écran)
- **M** ≈ une session (système complet sur 2–4 fichiers existants)
- **L** ≈ deux sessions / étalé (nouveau système + données + écran + sauvegardes)

## Chantiers retenus (tes réponses)

### 0. Quick win — découvrabilité de la gravure (Q2 D) — S
Aucune réplique de Tetsu n'oriente vers l'onglet « Graver » à la première soie.
Une seule réplique déclenchée à la première soie obtenue + badge visuel sur l'onglet.
Fichiers : répliques (content.ts), état tutoriel (progress.ts). Aucune dépendance.

### 1. Confort du combat : lisibilité des dégâts en coop (Q1 D + Q8 C) — M
Tes mots exacts : « en coop tous les joueurs voient les dégâts de tout le monde,
ce qui rend la lisibilité difficile ». Sous-lots dans l'ordre :
1a. Filtrage/attribution des dégâts par joueur (convivial : mes dégâts pleine
    taille, ceux des autres atténués ou agrégés) — M, fichiers : render/hud.ts,
    render/renderer.ts, net/frames.ts.
1b. Visée/lisibilité générale (reticle, contours) — petit lot séparé, S–M.
Optionnel non coché : VFX de la marée (Q8 B non retenu, reste en réserve).

### 2. Yomi sans fond, vitrine : la Stèle des records (Q1 C + Q3 D) — S–M
Écran d'icônes sur le ponton : meilleur palier par héros, descentes du journal
(journal.ts enregistre déjà dungeonLevel + waves + players). Fichiers : island.ts,
ui, render. Petit, montre immédiatement que le Yomi « va plus loin ».

### 3. Yomi sans fond : pactes de bloc (Q3 A) — M–L
À chaque bloc de 5 paliers au-delà du palier 50, l'hôte choisit 1 pacte parmi 2–3
(bonus + contrepartie). Fichiers : game/infini.ts, data/donjon-infini.json,
net/protocol.ts (l'hôte décide, frame de diffusion en coop), journal.ts.
⚠️ En coop l'hôte seule vote : décision à re-trancher avec l'autre agent si un
bonus de rôle coop atterrit un jour (Q5 : « Rien » aujourd'hui).
Ordre recommandé : Stèle d'abord (2), pactes ensuite (3).

### 4. Codex : objets et tables de drop visibles (Q2 A) — M–L
129 objets + taux affichés à la Warframe ; prévu au GDD, jamais codé.
Fichiers : nouvel onglet ui (journal-like), data/*.json pour taux réels de
loot.ts, compteur obtenu/nombre vu (localStorage). Se branche sur la stèle (2)
mais indépendant.

### 5. Éveil de relique / éclats de mémoire (Q2 C) — L
Monnaies « plus tard » jamais branchées. Dépend du code de forge/gravure
(forge.ts, gravure.ts) et de la migration des sauvegardes (saves.ts).
À chiffrer après le Codex (4), car l'Éveil donnera à consommer ce que le Codex
rend lisible.

### 6. Gardien errant sur l'île (Q4 A) — L
Yokai rare hors donjon, butin dédié. Fichiers : enemies.ts (~2 000 l.), world.ts
(~2 400 l.), loot.ts. Un filtre de spawn d'île + 1 fiche ennemie + 1 butin.

### 7. Sons d'interface et de combat (Q8 A) — M
Restriction indiquée par toi : les musiques ambiantes/combats sont confiées à des
amis (étudiants en musique) → on ne touche PAS musiques ; seulement les SFX UI et
de combat manquants (sons-a-produire.md). Anti-répétition obligatoire :
variations de pitch/joueurs (2–3 variantes par son) dans src/audio/.

## Écartés par tes réponses (on n'y touche pas)

- Rotation des donjons (Q2 B)
- Élites entre paliers (Q3 B), affixes affichés (Q3 C)
- Mini-boss en zone (Q4 B)
- Bonus de rôle coop (Q5 : « Rien »)
- Les 4 fixes d'objets diagnostiqués (Q6 : « Rien ») — katana de rōnin, CC infini
  Fil de Jōren/Arc de soie, Miroir de Yata, effets de kit Nodachi/Ikusa
- Tout chantier d'équilibrage (Q7 : « Rien ») — classes, marée, ×1,5, Hanyō
- VFX de la marée (Q8 B non coché)

## Bilan d'effort

Quick win S + 1 M + 2 S–M + 3 M–L = ~7–9 sessions agent réparties, chantier 5
(Éveil) étant le plus lourd et dépendant du 4. Ne pas lancer 5 sans 4.

Interdiction qu'a rappelée le questionnaire : lever de « Rien » sur Q6/Q7 = l'agent ne touche ni l'équilibrage ni les objets diagnostiqués, même si « ça aiderait ».
