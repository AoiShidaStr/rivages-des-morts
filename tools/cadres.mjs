// Teinte les cadres du pack Kenney « Fantasy UI Borders » (CC0, voir docs/credits.md) aux couleurs de
// l'interface : public/ui/cadres/<nom>.png, utilisés en border-image dans src/ui/ui.css.
//
// Usage : npm run cadres [-- <dossier du pack>]   (par défaut ~/Downloads/kenney_fantasy-ui-borders)
//
// Les PNG du pack sont blancs : on garde leur forme et on remplace la couleur. Un cadre « plein » prend
// le trait d'une planche Border et le fond de la planche Panel de même numéro (le fond seul = Panel moins
// Border), chacun dans sa couleur. Seuls les cadres listés ici entrent dans le dépôt.
import { mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packDir = process.argv[2] ?? path.join(os.homedir(), 'Downloads', 'kenney_fantasy-ui-borders');
// Pour essayer une autre palette sans toucher aux cadres du jeu : CADRES_SORTIE=<dossier> et
// CADRES_COULEURS='{"trait":"#…",…}' (clés ci-dessous).
const outDir = process.env.CADRES_SORTIE ?? path.join(projectDir, 'public', 'ui', 'cadres');

// Couleurs de src/ui/ui.css (:root).
const colors = {
  fenetre: '#1d2226', // trait des fenêtres, encarts, séparateur
  dialogue: '#d9b45a', // double trait de la boîte de dialogue
  bouton: '#1d2226', // fond des boutons
  boutonTrait: '#d9b45a',
  survol: '#c8412f', // bouton survolé ou principal
  survolTrait: '#f1ece2',
  survolSombre: '#9b2f22', // bouton principal survolé, bouton dangereux
  case: '#1d2226', // bouton fermer
  accent: '#c8412f', // onglet actif, carte choisie
  ...JSON.parse(process.env.CADRES_COULEURS ?? '{}'),
};

const border = (n) => `PNG/Default/Border/panel-border-${n}.png`;
const panel = (n) => `PNG/Default/Panel/panel-${n}.png`;

const frames = [
  // Fenêtres, cartes de pause et de fin : grecque aux coins, à l'encre sur le papier.
  { name: 'fenetre', line: [border('007'), colors.fenetre] },
  // Boîte de dialogue et bannière de lieu (fond sombre) : double trait doré.
  { name: 'dialogue', line: [border('003'), colors.dialogue] },
  // Boutons : coins en carrés, trait doré ou papier, fond plein.
  { name: 'bouton', line: [border('009'), colors.boutonTrait], fill: [panel('009'), colors.bouton] },
  { name: 'bouton-vermillon', line: [border('009'), colors.survolTrait], fill: [panel('009'), colors.survol] },
  { name: 'bouton-vermillon-sombre', line: [border('009'), colors.survolTrait], fill: [panel('009'), colors.survolSombre] },
  // Fermer, onglet actif, carte choisie : trait fin à l'encre.
  { name: 'case', line: [border('001'), colors.case] },
  { name: 'case-vermillon', line: [border('001'), colors.accent] },
  // Suivi de quête et petits encarts sur papier.
  { name: 'encart', line: [border('012'), colors.fenetre] },
];

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const alphaOf = async (file) => {
  const { data, info } = await sharp(path.join(packDir, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alpha = new Uint8Array(info.width * info.height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3];
  return { alpha, width: info.width, height: info.height };
};

await mkdir(outDir, { recursive: true });
for (const frame of frames) {
  const line = await alphaOf(frame.line[0]);
  const fill = frame.fill ? await alphaOf(frame.fill[0]) : null;
  const out = Buffer.alloc(line.width * line.height * 4);
  const lineColor = rgb(frame.line[1]);
  const fillColor = frame.fill ? rgb(frame.fill[1]) : null;
  for (let i = 0; i < line.alpha.length; i++) {
    let color = null;
    let a = 0;
    if (line.alpha[i]) [color, a] = [lineColor, line.alpha[i]];
    else if (fill?.alpha[i]) [color, a] = [fillColor, fill.alpha[i]];
    if (!color) continue;
    out.set([...color, a], i * 4);
  }
  await sharp(out, { raw: { width: line.width, height: line.height, channels: 4 } })
    .png({ palette: true })
    .toFile(path.join(outDir, `${frame.name}.png`));
  console.log(`${frame.name}.png`);
}

// Séparateur sous les titres : le trait qui s'efface du pack, de part et d'autre d'un losange.
const fade = path.join(packDir, 'PNG/Default/Divider Fade/divider-fade-001.png');
const half = await sharp(fade).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = half.info;
const sep = Buffer.alloc(width * 2 * height * 4);
const lineRgb = rgb(colors.fenetre);
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const a = half.data[(y * width + x) * 4 + 3];
    if (!a) continue;
    sep.set([...lineRgb, a], (y * width * 2 + x) * 4);
    sep.set([...lineRgb, a], (y * width * 2 + (width * 2 - 1 - x)) * 4);
  }
}
await sharp(sep, { raw: { width: width * 2, height, channels: 4 } })
  .png({ palette: true })
  .toFile(path.join(outDir, 'separateur.png'));
console.log('separateur.png');
