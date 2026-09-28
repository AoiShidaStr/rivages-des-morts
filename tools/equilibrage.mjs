// Équilibrage des classes et des races : chaque classe avec chaque race (et chaque parent divin) descend en solo,
// jouée par le bot du jeu (src/game/bot.ts), sans navigateur ni rendu. Le moteur du jeu est chargé tel quel par Vite.
//
//   npm run equilibrage                                  niveaux 1, 10 et 20, 12 descentes par combinaison
//   npm run equilibrage -- --niveaux 10 --parties 20 --classes paladin,rodeur --donjon palais --json resultats.json
//   npm run equilibrage -- --classes invocateur --compagnon kodama
//
// Au niveau 5 et plus, le héros porte un équipement typique forgé à son niveau ; au niveau 10 et plus, il a ses 9 points
// de talents (deux branches pleines et un nœud). Le donjon est au niveau du héros.
import os from 'node:os';
import { writeFileSync } from 'node:fs';
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

function option(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const CLASSES = ['guerrier', 'invocateur', 'lame', 'paladin', 'rodeur'];
const RACES = [['einherjar'], ['oushebti'], ['demi-dieu', 'zeus'], ['demi-dieu', 'ares'], ['demi-dieu', 'hermes'], ['demi-dieu', 'athena'], ['hanyo']];
/** Les branches de talents prises par le bot : les deux premières pleines, un nœud de la troisième. */
const TREE = { guerrier: ['susanoo', 'heracles', 'berserkir'], invocateur: ['seimei', 'orphee', 'anubis'], lame: ['tsukuyomi', 'thanatos', 'loki'], paladin: ['tyr', 'amaterasu', 'osiris'], rodeur: ['artemis', 'hachiman', 'skadi'] };
const GEAR = { casque: 'chapeau-paille', plastron: 'carapace-kappa', jambieres: 'suneate-ecailles', bottes: 'waraji-pelerin', amulette: 'magatama-fele' };
/** Compagnon de l'Invocateur (`--compagnon kodama`), celui par défaut de la classe sinon. */
const COMPANION = option('compagnon', '');
/** Le donjon joué (`--donjon palais`), les Rizières noyées par défaut. */
const DUNGEON = option('donjon', 'rizieres');
/** Cibles de l'équilibrage (GDD) : écart de victoires entre classes et entre races, pire combinaison. */
const TARGETS = { classSpread: 0.15, raceSpread: 0.1, worst: 0.5 };

// --- Une descente, jouée dans un fil d'exécution à part ---------------------------------------------------------

async function worker() {
  const { createServer } = await import('vite');
  const server = await createServer({ root: ROOT, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', logLevel: 'error' });
  const load = (path) => server.ssrLoadModule(path);
  const [{ World }, { Bot }, { buildLoadout }, { content }, { difficultyFor }, player, enemies] = await Promise.all([
    load('/src/game/world.ts'),
    load('/src/game/bot.ts'),
    load('/src/game/loadout.ts'),
    load('/src/content.ts'),
    load('/src/game/difficulty.ts'),
    load('/src/data/player.json'),
    load('/src/data/enemies.json'),
  ]);
  const dungeon = content.dungeons[DUNGEON] ?? content.dungeons.rizieres;
  const base = { ...dungeon.arena, player: player.default, enemies: enemies.default };

  parentPort.on('message', ({ job, runs }) => {
    const weapon = content.skills.classes[job.cls].weapon;
    const gear = job.level >= 5 ? GEAR : {};
    const items = [weapon, ...Object.values(gear)];
    const [a, b, c] = TREE[job.cls];
    const talents = job.level >= 10 ? [1, 2, 3, 4].flatMap((n) => [`${a}-${n}`, `${b}-${n}`]).concat(`${c}-1`) : [];
    const state = {
      version: 1,
      hero: { race: job.race, class: job.cls, ...(job.parent ? { parent: job.parent } : {}) },
      ...(COMPANION ? { companion: COMPANION } : {}),
      oboles: 0,
      xp: 0,
      talents,
      items,
      equipped: { arme: weapon, ...gear },
      itemLevels: Object.fromEntries(items.map((id) => [id, job.level])),
      dungeons: {},
      materials: {},
      flags: {},
      quests: {},
      chests: 0,
    };
    const cfg = buildLoadout(base.player, state, content, job.level).config;
    const out = [];
    for (let r = 0; r < runs; r++) {
      const world = new World({ ...base, player: cfg, difficulty: difficultyFor(content.difficulty, job.level, 1, dungeon.strength) }, 0);
      const bot = new Bot(world, world.players[0]);
      let t = 0;
      let taken = 0;
      let healed = 0;
      let dealt = 0;
      while (world.state === 'playing' && t < 600) {
        world.update(1 / 60, bot.input());
        for (const e of world.drainEvents()) {
          if (e.type === 'playerHit') taken += e.amount;
          else if (e.type === 'heal' && e.id === 0) healed += e.amount;
          else if (e.type === 'enemyHit') dealt += e.amount;
        }
        t += 1 / 60;
      }
      out.push({ won: world.state === 'victory', t, taken, healed, dealt, hpLeft: Math.max(0, world.players[0].hp) / cfg.maxHp });
    }
    const n = out.length;
    const mean = (f) => out.reduce((s, x) => s + f(x), 0) / n;
    parentPort.postMessage({
      ...job,
      maxHp: Math.round(cfg.maxHp),
      win: mean((x) => (x.won ? 1 : 0)),
      time: mean((x) => x.t),
      dps: mean((x) => x.dealt / x.t),
      takenPerMin: mean((x) => (x.taken / x.t) * 60),
      healPerMin: mean((x) => (x.healed / x.t) * 60),
      hpLeft: mean((x) => (x.won ? x.hpLeft : 0)),
    });
  });
  parentPort.postMessage('prêt');
}

// --- Répartition du travail et tableaux --------------------------------------------------------------------------

const pct = (x) => `${Math.round(x * 100)} %`.padStart(5);
const key = (r) => (r.parent ? `demi-dieu (${r.parent})` : r.race);

function report(rows, levels) {
  const lines = [];
  const out = (s = '') => lines.push(s);
  const avg = (list, f) => list.reduce((s, r) => s + f(r), 0) / list.length;
  const alerts = [];
  for (const level of levels) {
    const at = rows.filter((r) => r.level === level);
    out(`\n## Niveau ${level}\n`);
    out(`| Race | ${CLASSES.join(' | ')} | Moyenne |`);
    out(`|---|${CLASSES.map(() => '---').join('|')}|---|`);
    for (const [race, parent] of RACES) {
      const row = at.filter((r) => r.race === race && (r.parent ?? undefined) === parent);
      if (!row.length) continue;
      const cells = CLASSES.map((cls) => row.find((r) => r.cls === cls)).map((r) => (r ? pct(r.win) : '  -  '));
      out(`| ${key(row[0])} | ${cells.join(' | ')} | ${pct(avg(row, (r) => r.win))} |`);
    }
    out('');
    out('| Classe | Victoires | Durée | Dégâts/s | Dégâts subis/min | Soins/min | PV restants | PV max |');
    out('|---|---|---|---|---|---|---|---|');
    const classWins = [];
    for (const cls of CLASSES) {
      const list = at.filter((r) => r.cls === cls);
      if (!list.length) continue;
      classWins.push(avg(list, (r) => r.win));
      out(`| ${cls} | ${pct(avg(list, (r) => r.win))} | ${Math.round(avg(list, (r) => r.time))} s | ${avg(list, (r) => r.dps).toFixed(1)} | ${Math.round(avg(list, (r) => r.takenPerMin))} | ${Math.round(avg(list, (r) => r.healPerMin))} | ${pct(avg(list, (r) => r.hpLeft))} | ${list[0].maxHp} |`);
    }
    // Races : le Demi-dieu compte une fois, en moyenne sur ses parents.
    const raceWins = [...new Set(RACES.map(([race]) => race))]
      .map((race) => at.filter((r) => r.race === race))
      .filter((list) => list.length)
      .map((list) => avg(list, (r) => r.win));
    const classSpread = Math.max(...classWins) - Math.min(...classWins);
    const raceSpread = Math.max(...raceWins) - Math.min(...raceWins);
    const worst = at.reduce((w, r) => (r.win < w.win ? r : w), at[0]);
    out('');
    out(`Écart entre classes : ${pct(classSpread).trim()} (cible ≤ ${pct(TARGETS.classSpread).trim()}) · entre races : ${pct(raceSpread).trim()} (cible ≤ ${pct(TARGETS.raceSpread).trim()}) · pire combinaison : ${worst.cls} ${key(worst)} ${pct(worst.win).trim()} (cible ≥ ${pct(TARGETS.worst).trim()})`);
    if (classSpread > TARGETS.classSpread) alerts.push(`niveau ${level} : écart entre classes ${pct(classSpread).trim()}`);
    if (raceSpread > TARGETS.raceSpread) alerts.push(`niveau ${level} : écart entre races ${pct(raceSpread).trim()}`);
    if (worst.win < TARGETS.worst) alerts.push(`niveau ${level} : ${worst.cls} ${key(worst)} à ${pct(worst.win).trim()}`);
  }
  out(alerts.length ? `\nHors des cibles :\n${alerts.map((a) => `- ${a}`).join('\n')}` : '\nToutes les cibles sont tenues.');
  return lines.join('\n');
}

async function main() {
  const levels = option('niveaux', '1,10,20').split(',').map(Number);
  const runs = Number(option('parties', '12'));
  const classes = option('classes', CLASSES.join(',')).split(',');
  const races = option('races', '') ? RACES.filter(([race]) => option('races', '').split(',').includes(race)) : RACES;
  const jobs = [];
  for (const level of levels) for (const cls of classes) for (const [race, parent] of races) jobs.push({ level, cls, race, parent });
  const total = jobs.length;
  const rows = [];
  const threads = Math.max(1, Math.min(Number(option('fils', os.availableParallelism?.() ?? os.cpus().length)), jobs.length));
  const started = Date.now();
  await Promise.all(
    Array.from({ length: threads }, () =>
      new Promise((resolve, reject) => {
        const w = new Worker(fileURLToPath(import.meta.url));
        const next = () => {
          const job = jobs.shift();
          if (job) w.postMessage({ job, runs });
          else w.terminate().then(resolve);
        };
        w.on('message', (msg) => {
          if (msg !== 'prêt') {
            rows.push(msg);
            process.stderr.write(`\r${rows.length}/${total} combinaisons`);
          }
          next();
        });
        w.on('error', reject);
      }),
    ),
  );
  process.stderr.write(`\r${total} combinaisons, ${runs} descentes chacune, en ${Math.round((Date.now() - started) / 1000)} s\n`);
  console.log(report(rows, levels));
  const json = option('json', '');
  if (json) writeFileSync(json, JSON.stringify(rows, null, 1));
}

if (isMainThread) await main();
else await worker();
