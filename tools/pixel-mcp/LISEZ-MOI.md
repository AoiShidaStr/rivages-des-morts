# Serveur MCP pixel art (pixel-rivages)

Outils de retouche pixel art que Claude Code peut appeler directement, pour rendre cohérents les
sprites Nano Banana, les tuiles du pack Forgotten Memories et les décors.

Réécrit d'après l'idée de [pixel-mcp](https://github.com/adrianoamaral/pixel-mcp) (qui ne sait que
dessiner à partir de rien et n'a pas de licence) : le code ici est entièrement à nous.

## Lancement

Déclaré dans `.mcp.json` à la racine : ouvrir Claude Code dans le dépôt, accepter le serveur
`pixel-rivages`, vérifier avec `/mcp`. Les exports vont dans `tools/pixel-mcp/sortie/` (ignoré par git).

## Outils

- **Ouvrir / écrire** : `charger_png` (PNG, WebP, JPG, recadrage possible), `creer_toile`,
  `exporter_png` (agrandissement net pour l'aperçu), `lister`, `infos`, `annuler`.
- **Recaler une image IA** : `taille_pixel` (retrouve la taille des « gros pixels »), `recaler_grille`
  (un bloc = un vrai pixel), `reduire` (hauteur cible, couleur majoritaire), `redimensionner`
  (plus proche voisin seulement).
- **Palette commune** : `extraire_palette` (coupe médiane sur plusieurs images), `definir_palette`
  (hex ou PNG), `appliquer_palette` (tramage en option), `exporter_palette`, `ajuster_couleurs`.
- **Nettoyage** : `detourer` (fond magenta/vert), `nettoyer_alpha`, `contour` (noir, 2 px par défaut : le style du jeu ; `epaisseur` réglable), `recadrer`, `miroir`.
- **Assemblage / dessin** : `coller` (avec pavage pour un morceau de carte), `pixel`, `rectangle`,
  `ligne`, `lire_pixel`.
