// Personnages de test : toutes les armes et tous les objets, forgés au plus haut, niveau maximum, donjons ouverts.
// Un fichier par classe dans docs/persos-test, à importer depuis l'écran titre (Personnages › Importer un fichier).
//   npm run perso-test                    → einherjar, une sauvegarde par classe
//   npm run perso-test -- --race hanyo    → une autre race (demi-dieu : --parent zeus|ares|hermes|athena)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const json = (path) => JSON.parse(readFileSync(new URL(`../src/data/${path}`, import.meta.url), 'utf8'));
const items = json('items.json');
const skills = json('skills.json');
const dungeons = json('dungeons.json');

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const race = arg('race', 'einherjar');
const parent = race === 'demi-dieu' ? arg('parent', 'zeus') : undefined;

// XP qu'il faut pour atteindre le niveau maximum.
const { levels } = skills;
let xp = 0;
for (let level = 1; level < levels.max; level++) xp += levels.xpBase + levels.xpPerLevel * level;

const ids = Object.keys(items.items);
const forged = Math.min(items.forge.upgrade.maxLevel, levels.max);
const out = new URL('../docs/persos-test/', import.meta.url);
mkdirSync(out, { recursive: true });

for (const cls of Object.keys(skills.classes)) {
  const state = {
    version: 1,
    hero: parent ? { race, parent, class: cls } : { race, class: cls },
    oboles: 99999,
    xp,
    talents: [],
    items: ids,
    equipped: {},
    itemLevels: Object.fromEntries(ids.map((id) => [id, forged])),
    dungeons: Object.fromEntries(Object.keys(dungeons).filter((id) => id !== 'about').map((id) => [id, { unlocked: 100, best: 99 }])),
    materials: Object.fromEntries(Object.keys(items.materials).map((id) => [id, 999])),
    flags: {},
    quests: {},
    chests: 0,
  };
  const file = { jeu: 'rivages-des-morts', format: 1, exporte: new Date().toISOString(), sauvegarde: state };
  const name = `test-${race}${parent ? `-${parent}` : ''}-${cls}.json`;
  writeFileSync(new URL(name, out), `${JSON.stringify(file, null, 2)}\n`);
  console.log(`docs/persos-test/${name}`);
}
