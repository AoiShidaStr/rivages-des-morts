# Crédits et licences des ressources tierces

## Cadres de l'interface : Kenney, « Fantasy UI Borders » 1.0

- Auteur : Kenney (www.kenney.nl), pack créé le 03-12-2023.
- Licence : Creative Commons Zero (CC0), http://creativecommons.org/publicdomain/zero/1.0/ : usage personnel, éducatif et commercial libre, sans obligation de crédit (on le crédite quand même, c'est ce qu'il demande en échange).
- Dans le dépôt : `public/ui/cadres/*.png`, seulement les cadres utilisés, recolorés aux teintes de l'interface « sumi et vermillon » (anthracite, vermillon, papier) par `npm run cadres` (`tools/cadres.mjs`). Le pack complet n'est pas copié ; l'outil le lit depuis `~/Downloads/kenney_fantasy-ui-borders` ou le dossier passé en argument.
- Planches d'origine :

| Fichier du jeu | Planche du pack (PNG/Default) | Usage |
| --- | --- | --- |
| `fenetre.png` | Border/panel-border-007 | fenêtres, carte de pause et de fin |
| `dialogue.png` | Border/panel-border-003 | boîte de dialogue, nom du lieu |
| `bouton*.png` | Border/panel-border-009 + Panel/panel-009 | boutons (encre, vermillon, vermillon sombre) |
| `case*.png` | Border/panel-border-001 | bouton fermer, onglet actif, carte choisie |
| `encart.png` | Border/panel-border-012 | suivi de quête |
| `separateur.png` | Divider Fade/divider-fade-001 (et son miroir) | trait sous le titre de la pause |

## Police des titres : Shippori Mincho (FONTWORKS, Google Fonts)

- Licence : SIL Open Font License 1.1, voir `public/fonts/OFL-shippori-mincho.txt`.
- Dans le dépôt : `public/fonts/shippori-mincho-*.woff2`, réduites aux caractères du jeu (latin, kana et les kanji des
  sceaux) par `tools/polices.py`, pour marcher hors ligne et sur le serveur coop.

## Modèles 3D : KayKit

Voir `public/models/kaykit-dungeon/LICENSE.txt` et `public/models/kaykit-forest/LICENSE.txt` (CC0).
