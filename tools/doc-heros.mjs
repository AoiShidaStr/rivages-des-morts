// Écrit docs/Prompts héros.md : tous les prompts Nano Banana 2 des héros dans un seul fichier, tirés de
// tools/prompts-heros.mjs (les mêmes que ceux rangés par `npm run kit-heros`).
//
// Usage : npm run doc-heros
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { animationPrompt, facePrompt, profilePrompt } from './prompts-heros.mjs';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLASSES = { guerrier: 'Guerrier', invocateur: 'Invocateur', lame: 'Lame', paladin: 'Paladin', rodeur: 'Rôdeur' };
const block = (text) => `\`\`\`\n${text}\n\`\`\`\n`;
const prompt = (title, text, note) => `**${title}**${note ? ` (${note})` : ''}\n\n${block(text)}\n`;

let md = `# Prompts des héros (Nano Banana 2)

> **Méthode remplacée (octobre 2026).** Les héros se dessinent désormais en une **planche complète chibi de 64 images (8 × 8)** : voir la [Charte 2D](Charte%202D.md), sections 3 et 4, et les prompts de [\`prompts-2d/\`](prompts-2d/). Cette page ne sert plus qu'aux héros encore faits avec \`npm run kit-heros\` (Invocateur Hanyō, autres races).

Chaque prompt se colle tel quel dans Gemini, avec une seule image jointe. L'image donne la race, la classe, la tenue et l'arme : le même prompt sert aux quatre races d'une classe. Les vues de profil et de face sont prévues, la vue de dos viendra plus tard.

1. **Poses clés :** joindre la fiche du héros, coller le prompt « Profil » de sa classe, puis le prompt « Face ».
2. **Animations :** joindre une pose découpée dans ces planches, coller le prompt de l'animation. Nano Banana dessine toute l'animation en une planche.

\`npm run kit-heros\` range tout cela dans \`~/Pictures/game visual/heros/<race>-<classe>/\` : la fiche, les planches de poses clés déposées, et pour chaque animation la pose déjà découpée (\`pose.png\`) avec son prompt. Les prompts viennent de \`tools/prompts-heros.mjs\` ; après une modification, \`npm run doc-heros\` réécrit ce fichier.

## Fiche à joindre

Les fiches sont dans \`src/assets/images/\`, sauf celle de l'Einherjar guerrier.

| Race | Guerrier | Invocateur | Lame | Paladin | Rôdeur |
| --- | --- | --- | --- | --- | --- |
| Einherjar | \`public/sprites/heros.png\` | \`heros_invocateur_….jpg\` | \`heros_lame_….jpg\` | \`heros_paladin_….jpg\` | \`heros_rodeur_….jpg\` |
| Oushebti | \`race_oushebti_….jpg\` | \`oushebti_invocateur_….jpg\` | \`oushebti_lame_….jpg\` | \`oushebti_paladin_….jpg\` | \`oushebti_rodeur_….jpg\` |
| Demi-dieu | \`race_demidieu_….jpg\` | \`demidieu_invocateur_….jpg\` | \`demidieu_lame_….jpg\` | \`demidieu_paladin_….jpg\` | \`demidieu_rodeur_….jpg\` |
| Hanyō | \`race_hanyo_….jpg\` | \`hanyo_invocateur_….jpg\` | \`hanyo_lame_….jpg\` | \`hanyo_paladin_….jpg\` | \`hanyo_rodeur_….jpg\` |

L'Einherjar guerrier a déjà ses animations de profil dans le jeu : pour lui, seulement la face. Les planches de profil des autres guerriers, faites par AI Studio, portent des légendes écrites et sont à refaire.

## Pose à joindre pour chaque animation

| Animation | Pose jointe | Images |
| --- | --- | --- |
| Attente | pose 1 (repos) | 6, en boucle |
| Course | pose 2 (course) | 8, en boucle |
| Attaque | pose 1 (repos) | 6 : 3 d'élan, 3 de coup |
| Garde (profil) | pose 1 (repos) | 4 |
| Esquive (profil) | pose 1 (repos) | 6 |

Prendre la pose dans la planche de la même vue : de profil pour les animations de profil, de face pour celles de face.

## Si ça sort mal

Demander dans la même conversation :

- des images presque identiques : \`The frames are almost identical. Redraw the sheet following the frame list exactly: every frame must show a clearly different pose, exaggerate the motion if needed.\`
- une image ratée : \`Redraw only frame 4, keep everything else identical.\`
- des figures qui se chevauchent : \`Some figures overlap. Redraw the same sheet with more space: every figure, weapon included, must stay inside its own cell with empty grey background all around it, even if the figures get smaller.\`

## Toutes les classes : attente et course

`;
for (const [view, label] of [['profil', 'de profil'], ['face', 'de face']]) {
  md += prompt(`Attente, ${view}`, animationPrompt('guerrier', view, 'attente'), `joindre la pose 1 ${label}`);
  md += prompt(`Course, ${view}`, animationPrompt('guerrier', view, 'course'), `joindre la pose 2 ${label}`);
}
for (const [cls, name] of Object.entries(CLASSES)) {
  md += `## ${name}\n\n### Poses clés (joindre la fiche)\n\n`;
  md += prompt('Profil', profilePrompt(cls));
  md += prompt('Face', facePrompt(cls));
  md += '### Animations\n\n';
  md += prompt('Attaque, profil', animationPrompt(cls, 'profil', 'attaque'), 'joindre la pose 1 de profil');
  md += prompt('Garde, profil', animationPrompt(cls, 'profil', 'garde'), 'joindre la pose 1 de profil');
  md += prompt('Esquive, profil', animationPrompt(cls, 'profil', 'esquive'), 'joindre la pose 1 de profil');
  md += prompt('Attaque, face', animationPrompt(cls, 'face', 'attaque'), 'joindre la pose 1 de face');
}
md += `## Outils

- **\`npm run kit-heros\` :** prépare les dossiers des 20 héros (\`npm run kit-heros -- <race>-<classe>\` pour un seul). Il découpe les planches de poses clés déposées (\`profil.jpg\`, \`face.jpg\`) et ne touche jamais aux planches d'animation déposées (\`planche.jpg\`). Si les poses sont dans un autre ordre, \`poses.json\` dit laquelle joindre, par exemple \`{ "profil": { "course": 3 } }\`.
- **\`npm run poses -- <planche>\` :** découpe une planche isolée dans \`poses/<planche>/\` ; \`--grille 3x2\` force le nombre de colonnes et de lignes si la détection se trompe.
- **\`npm run doc-heros\` :** réécrit ce fichier depuis \`tools/prompts-heros.mjs\`.
- **\`npm run planches\` :** monte les planches d'animation de profil déposées (\`profil/<animation>/planche.jpg\`) en planche de jeu \`anim/heros-<race>-<classe>\`, dès que le héros a sa course (\`npm run planches -- heros-<race>-<classe>\` pour un seul). Sans attente, le héros se tient immobile dans sa pose de repos ; sans garde ni esquive, le jeu prend l'attente et la course.
- **À écrire :** l'affichage de la vue de face selon la direction du déplacement.
`;
await writeFile(path.join(projectDir, 'docs', 'Prompts héros.md'), md);
console.log('→ docs/Prompts héros.md');
