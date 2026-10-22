# Réserve d'idées : Claude Code Game Studios

Extraits de [Donchitos/Claude-Code-Game-Studios](https://github.com/Donchitos/Claude-Code-Game-Studios) (commit be8993b, 08/10/2026), licence MIT (`LICENSE`).

Rangés **hors de `.claude/`** exprès : rien ne se charge ni ne s'exécute. On n'a pas repris les 12 hooks bash, les 49 agents, ni les réglages, qui modifieraient le comportement de Claude sur tout le dépôt. Le projet d'origine vise Godot, Unity et Unreal, donc les passages sur ces moteurs ne s'appliquent pas à notre Babylon.js.

Pour adopter une idée, on l'adapte au jeu et on en fait un vrai skill dans `.claude/skills/` (avec `skill-creator`).

## Ce qui a été gardé

- `skills/` : 16 procédures choisies pour le jeu.
  - Équilibrage et combat : `balance-check`, `team-combat`, `playtest-report`.
  - Son : `team-audio`.
  - Rendu et finition : `art-bible`, `asset-audit`, `team-polish`, `perf-profile`, `ux-review`.
  - Conception : `brainstorm`, `quick-design`, `design-review`, `scope-check`, `vertical-slice`.
  - Sortie : `launch-checklist`, `patch-notes`.
- `modeles/` : 11 gabarits de documents (bible graphique, bible sonore, piliers du jeu, modèle d'économie, courbe de difficulté, parcours joueur, HUD, pitch, notes de version, post-mortem, document de game design).
- `COLLABORATIVE-DESIGN-PRINCIPLE.md` : leur façon de faire valider chaque décision de design par l'humain.
