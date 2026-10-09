# Prompt pour l'autre agent : pistes d'équilibrage restantes

À copier-coller dans une nouvelle session Claude Code, ouverte sur le dépôt `rivages-des-morts`.

---

Tu travailles sur **Rivages des Morts** (action-RPG de donjons japonais, Vite + TypeScript + Babylon.js, données dans `src/data/*.json`, règles dans `src/game/`). Lis d'abord `docs/plan-equilibrage-classes.md`, `docs/equilibrage.md` et le GDD (`docs/Rivages des Morts — Game Design Document.md`). Fais `git fetch` puis pars de `origin/main`.

## Contexte
Cinq classes : Guerrier, Sorcier, Lame, Paladin, Rôdeur. Règle du joueur : **aucun nerf, seulement des renforts** ; but : toutes les classes fortes et agréables. Un autre agent s'occupe en parallèle de : l'étape 0 du plan (bot « humain », banc de DPS à cible mobile, journal de parties), des sous-classes au niveau 25 ou 50, des bonus de rôle en coop, des bénédictions du Yomi sans fond et de la refonte du Paladin. **N'y touche pas.**

## Ta mission : deux pistes, en étude puis en proposition
1. **Aspects d'arme** (inspiré de Hades) : 2 à 3 variantes de l'arme de classe aux mécaniques différentes. Regarde d'abord comment la 0.11.0 a déjà réparti trois objets par emplacement (DPS / Survie / Boss, champ `spec` dans `src/data/items.json`) : ne double pas ce système. Dis honnêtement si les aspects ont encore une raison d'être, et sous quelle forme (par exemple, un aspect par arme de classe, débloqué par un boss).
2. **Maîtrise de classe** (inspiré de Darkest Dungeon et Vampire Survivors) : des points de maîtrise gagnés par classe qui débloquent des passifs. Étudie `src/game/progress.ts` et la sauvegarde (migrations) avant de proposer.

Une **sixième classe** n'est pas à faire. Si, en étudiant, tu vois un vide qu'une classe comblerait mieux que ces pistes, dis-le en une demi-page, sans l'implémenter.

## Livrable
Un document `docs/pistes-aspects-maitrise.md` en français, sans code de jeu modifié : pour chaque piste, le problème d'équilibrage qu'elle règle, ce qui existe déjà dans le code, 3 à 5 propositions concrètes chiffrées (valeurs à régler en jeu), le coût de mise en œuvre (fichiers touchés, protocole réseau `PROTOCOL` dans `src/net/protocol.ts`, migration des sauvegardes), les risques, et un avis net : à faire, à reporter ou à abandonner. Termine par un questionnaire de 4 questions maximum pour le joueur.

## Règles
- Garde un regard critique : dis ce qui ne marche pas, n'enjolive pas.
- Ne lance pas `npm run equilibrage` ni `npm run dps` (le joueur teste lui-même). `npx tsc --noEmit` est permis.
- Les fichiers source sont en CRLF : conserve les fins de ligne. Écris en français, ton simple.
- Commits : message court, terminé par la ligne de co-signature demandée par le système. Pousse directement sur `main` après `git fetch` (`git push origin HEAD:main`) ; si le push est refusé, fais `git merge origin/main` puis repousse.
