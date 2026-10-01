// Équilibrage des classes et des races : chaque classe avec chaque race (et chaque parent divin) descend en solo,
// jouée par le bot du jeu (src/game/bot.ts), sans navigateur ni rendu. Le moteur du jeu est chargé tel quel par Vite.
//
//   npm run equilibrage                                  niveaux 1, 10 et 20, 12 descentes par combinaison
//   npm run equilibrage -- --niveaux 10 --parties 20 --classes paladin,rodeur --donjon palais --json resultats.json
//   npm run equilibrage -- --classes invocateur --compagnon kodama
//   npm run equilibrage -- --niveaux 30,50 --stuff complet            fin de progression, meilleur équipement
//   npm run equilibrage -- --niveaux 30 --stuff complet --joueurs 3    en coop : deux alliés joués par le bot
//   npm run equilibrage -- --classes lame --objets menpo-shikome,do-lamelles-os   le héros testé porte ces objets
//
// Au niveau 5 et plus, le héros porte un équipement typique forgé à son niveau (`--stuff complet` : le meilleur
// équipement de sa classe, arme épique et relique comprises) ; au niveau 10 et plus, il a ses 9 points de talents
// (deux branches pleines et un nœud). Le donjon est au niveau du héros. Avec `--joueurs 2` ou `3`, les alliés sont
// d'autres classes (`--allies lame,rodeur` pour les choisir), au même niveau et avec le même équipement.
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
/** `--stuff complet` : le meilleur équipement de chaque classe, forgé au niveau du héros (arme comprise). */
const FULL = {
  guerrier: { arme: 'totsuka-tsurugi', casque: 'kabuto-fendu', plastron: 'carapace-kappa', jambieres: 'suneate-ecailles', bottes: 'waraji-pelerin', amulette: 'peche-okamuzumi', relique: 'coupelle-kappa' },
  invocateur: { arme: 'eventail-jorogumo', casque: 'voile-izanami', plastron: 'shiroshozoku', jambieres: 'hakama-soie', bottes: 'geta-kasa', amulette: 'magatama-fele', relique: 'magatama-yasakani' },
  lame: { arme: 'kaiken-izanami', casque: 'chapeau-paille', plastron: 'shiroshozoku', jambieres: 'hakama-soie', bottes: 'geta-kasa', amulette: 'peche-okamuzumi', relique: 'fil-joren' },
  paladin: { arme: 'miroir-yata', casque: 'chapeau-paille', plastron: 'do-yomi', jambieres: 'hakama-soie', bottes: 'geta-kasa', amulette: 'peche-okamuzumi', relique: 'fil-joren' },
  rodeur: { arme: 'arc-soie', casque: 'chapeau-paille', plastron: 'shiroshozoku', jambieres: 'hakama-soie', bottes: 'geta-kasa', amulette: 'peche-okamuzumi', relique: 'fil-joren' },
};
const STUFF = option('stuff', 'typique');
/** `--objets a,b` : objets portés en plus par le héros testé (pas ses alliés), chacun à la place de celui de son emplacement. */
const OBJECTS = option('objets', '').split(',').filter(Boolean);
/**
 * `--mode dps` (`npm run dps`) : banc de DPS. Chaque héros frappe pendant `--duree` secondes un kodama immobile et
 * inoffensif dont les PV remontent sans cesse (`--pv` : ses PV de base, pour les effets qui en dépendent). Toutes les
 * compétences qui font des dégâts partent dès qu'elles sont prêtes. Cible (GDD, plan de mise à jour) : en dégâts
 * par seconde, Lame 100 %, Rôdeur 95 %, Guerrier et Invocateur 75 %, Paladin 60 %.
 */
const MODE = option('mode', 'survie');
const DPS_TARGET = { lame: 1, rodeur: 1 / 1.05, guerrier: 0.75, invocateur: 0.75, paladin: 0.6 };
const DURATION = Number(option('duree', '60'));
const DUMMY_HP = Number(option('pv', '750'));
const PLAYERS = Math.max(1, Math.min(3, Number(option('joueurs', '1'))));
const ALLIES = option('allies', '').split(',').filter(Boolean);
/** Compagnon de l'Invocateur (`--compagnon kodama`), celui par défaut de la classe sinon. */
const COMPANION = option('compagnon', '');
/** Le donjon joué (`--donjon palais`), les Rizières noyées par défaut. */
const DUNGEON = option('donjon', 'rizieres');
// Donjon infini (`--donjon infini`) : le bloc qui contient ce palier (le héros garde le niveau de `--niveaux`).
const PALIER = Number(option('palier', '1'));
/** Cibles de l'équilibrage (GDD) : écart de victoires entre classes et entre races, pire combinaison. */
const TARGETS = { classSpread: 0.15, raceSpread: 0.1, worst: 0.5 };

// --- Une descente, jouée dans un fil d'exécution à part ---------------------------------------------------------

async function worker() {
  const { createServer } = await import('vite');
  const server = await createServer({ root: ROOT, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', logLevel: 'error' });
  const load = (path) => server.ssrLoadModule(path);
  const [{ World }, { Bot }, { buildLoadout }, { content, endlessArenas }, { difficultyFor }, player, enemies, infini] = await Promise.all([
    load('/src/game/world.ts'),
    load('/src/game/bot.ts'),
    load('/src/game/loadout.ts'),
    load('/src/content.ts'),
    load('/src/game/difficulty.ts'),
    load('/src/data/player.json'),
    load('/src/data/enemies.json'),
    load('/src/game/infini.ts'),
  ]);
  const endless = DUNGEON === 'infini';
  const bloc = infini.blocOf(content.endless, PALIER);
  const dungeon = endless ? content.dungeons[infini.arenaOf(content.endless, bloc)] : (content.dungeons[DUNGEON] ?? content.dungeons.rizieres);
  const base = { ...dungeon.arena, player: player.default, enemies: enemies.default };

  /** Réglages d'un héros de cette classe et de cette race, équipé et formé pour ce niveau. */
  const heroConfig = (cls, race, parent, level, tested = true) => {
    const equipped = STUFF === 'complet' && level >= 5 ? { ...FULL[cls] } : { arme: content.skills.classes[cls].weapon, ...(level >= 5 ? GEAR : {}) };
    for (const id of tested ? OBJECTS : []) {
      const slot = content.items[id]?.slot;
      if (!slot) throw new Error(`Objet inconnu ou sans emplacement : ${id}`);
      equipped[slot] = id;
    }
    const items = Object.values(equipped);
    const [a, b, c] = TREE[cls];
    const talents = level >= 10 ? [1, 2, 3, 4].flatMap((n) => [`${a}-${n}`, `${b}-${n}`]).concat(`${c}-1`) : [];
    const state = {
      version: 1,
      hero: { race, class: cls, ...(parent ? { parent } : {}) },
      ...(COMPANION && cls === 'invocateur' ? { companion: COMPANION } : {}),
      oboles: 0,
      xp: 0,
      talents,
      items,
      equipped,
      itemLevels: Object.fromEntries(items.map((id) => [id, level])),
      dungeons: {},
      materials: {},
      flags: {},
      quests: {},
      chests: 0,
    };
    return buildLoadout(base.player, state, content, level).config;
  };

  /** Banc de DPS : le kodama ne bouge pas, ne soigne pas, ne recule pas, et ses PV remontent à chaque pas. */
  const dummyEnemies = { ...base.enemies, kodama: { ...base.enemies.kodama, maxHp: DUMMY_HP, speed: 0, knockbackFactor: 0, healInterval: 1e9 } };
  const dps = (job, runs) => {
    const cfg = heroConfig(job.cls, job.race, job.parent, job.level);
    const results = [];
    for (let r = 0; r < runs; r++) {
      const world = new World(
        { ...base, enemies: dummyEnemies, player: cfg, waves: [{ label: 'Banc de DPS', spawns: [{ kind: 'kodama', count: 1 }] }], difficulty: difficultyFor(content.difficulty, job.level, 1, dungeon.strength) },
        0,
      );
      const bot = new Bot(world, world.players[0], true);
      let t = 0;
      let dealt = 0;
      while (t < DURATION + 30) {
        world.update(1 / 60, bot.input());
        const dummy = world.enemies[0];
        if (dummy) dummy.hp = dummy.maxHp;
        for (const e of world.drainEvents()) if (e.type === 'enemyHit' && dummy) dealt += e.amount;
        // Le chrono part quand le kodama est là.
        if (dummy?.active) t += 1 / 60;
        if (t >= DURATION) break;
      }
      results.push(dealt / DURATION);
    }
    parentPort.postMessage({ ...job, dps: results.reduce((a, b) => a + b, 0) / results.length });
  };

  parentPort.on('message', ({ job, runs }) => {
    if (MODE === 'dps') return dps(job, runs);
    const cfg = heroConfig(job.cls, job.race, job.parent, job.level);
    const allyClasses = (ALLIES.length ? ALLIES : CLASSES.filter((c) => c !== job.cls)).slice(0, PLAYERS - 1);
    const allies = allyClasses.map((cls) => heroConfig(cls, 'einherjar', undefined, job.level, false));
    const out = [];
    for (let r = 0; r < runs; r++) {
      const waves = endless ? infini.blocWaves(content.endless, content.difficulty, bloc, endlessArenas, PLAYERS) : null;
      const difficulty = waves ? waves[0].difficulty : difficultyFor(content.difficulty, job.level, PLAYERS, dungeon.strength);
      const world = new World({ ...base, ...(waves ? { waves } : {}), player: cfg, allies, difficulty }, 0);
      const bots = world.players.map((hero) => new Bot(world, hero));
      let t = 0;
      let taken = 0;
      let healed = 0;
      let dealt = 0;
      let reached = 0;
      while (world.state === 'playing' && t < (endless ? 900 : 600)) {
        const inputs = bots.map((bot) => bot.input());
        world.update(1 / 60, PLAYERS > 1 ? inputs : inputs[0]);
        for (const e of world.drainEvents()) {
          if (e.type === 'playerHit' && (e.hero ?? 0) === 0) taken += e.amount;
          else if (e.type === 'heal' && e.id === 0) healed += e.amount;
          else if (e.type === 'enemyHit') dealt += e.amount;
          else if (e.type === 'wave') reached++;
        }
        t += 1 / 60;
      }
      out.push({ waves: reached, won: world.state === 'victory', t, taken, healed, dealt, hpLeft: Math.max(0, world.players[0].hp) / cfg.maxHp });
    }
    const n = out.length;
    const mean = (f) => out.reduce((s, x) => s + f(x), 0) / n;
    parentPort.postMessage({
      ...job,
      maxHp: Math.round(cfg.maxHp),
      win: mean((x) => (x.won ? 1 : 0)),
      time: mean((x) => x.t),
      waves: mean((x) => x.waves),
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
    out('| Classe | Victoires | Vagues atteintes | Durée | Dégâts/s | Dégâts subis/min | Soins/min | PV restants | PV max |');
    out('|---|---|---|---|---|---|---|---|---|');
    const classWins = [];
    for (const cls of CLASSES) {
      const list = at.filter((r) => r.cls === cls);
      if (!list.length) continue;
      classWins.push(avg(list, (r) => r.win));
      out(`| ${cls} | ${pct(avg(list, (r) => r.win))} | ${avg(list, (r) => r.waves).toFixed(1)} | ${Math.round(avg(list, (r) => r.time))} s | ${avg(list, (r) => r.dps).toFixed(1)} | ${Math.round(avg(list, (r) => r.takenPerMin))} | ${Math.round(avg(list, (r) => r.healPerMin))} | ${pct(avg(list, (r) => r.hpLeft))} | ${list[0].maxHp} |`);
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

/** Dégâts par seconde de chaque classe, comparés à la Lame et à la cible du plan (écart toléré : 5 points). */
function dpsReport(rows, levels) {
  const lines = [];
  const avg = (list) => list.reduce((s, r) => s + r.dps, 0) / list.length;
  const alerts = [];
  for (const level of levels) {
    const at = rows.filter((r) => r.level === level);
    lines.push(`\n## Niveau ${level}\n`);
    lines.push(`| Race | ${CLASSES.join(' | ')} |`);
    lines.push(`|---|${CLASSES.map(() => '---').join('|')}|`);
    for (const [race, parent] of RACES) {
      const row = at.filter((r) => r.race === race && (r.parent ?? undefined) === parent);
      if (row.length) lines.push(`| ${key(row[0])} | ${CLASSES.map((cls) => row.find((r) => r.cls === cls)).map((r) => (r ? r.dps.toFixed(1) : '-')).join(' | ')} |`);
    }
    const lame = avg(at.filter((r) => r.cls === 'lame'));
    lines.push('');
    lines.push('| Classe | DPS moyen | Part de la Lame | Cible | Écart |');
    lines.push('|---|---|---|---|---|');
    for (const cls of CLASSES) {
      const list = at.filter((r) => r.cls === cls);
      if (!list.length) continue;
      const share = lame ? avg(list) / lame : 0;
      const gap = share - DPS_TARGET[cls];
      lines.push(`| ${cls} | ${avg(list).toFixed(1)} | ${pct(share)} | ${pct(DPS_TARGET[cls])} | ${gap >= 0 ? '+' : ''}${Math.round(gap * 100)} pts |`);
      if (Math.abs(gap) > 0.05) alerts.push(`niveau ${level} : ${cls} à ${pct(share).trim()} de la Lame (cible ${pct(DPS_TARGET[cls]).trim()})`);
    }
  }
  lines.push(alerts.length ? `\nHors des cibles (±5 points) :\n${alerts.map((a) => `- ${a}`).join('\n')}` : '\nToutes les cibles sont tenues.');
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
        // Les fils ne reçoivent pas les options de la ligne de commande d'eux-mêmes : on les leur passe.
        const w = new Worker(fileURLToPath(import.meta.url), { argv: process.argv.slice(2) });
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
  if (MODE === 'dps') {
    console.log(`# Banc de DPS : kodama immobile, ${DURATION} s, équipement ${STUFF}, ${runs} essais par combinaison`);
    console.log(dpsReport(rows, levels));
  } else {
    console.log(`# Équilibrage : ${DUNGEON}, équipement ${STUFF}${OBJECTS.length ? ` + ${OBJECTS.join(', ')}` : ''}, ${PLAYERS} joueur${PLAYERS > 1 ? 's' : ''}, ${runs} descentes par combinaison`);
    console.log(report(rows, levels));
  }

  const json = option('json', '');
  if (json) writeFileSync(json, JSON.stringify(rows, null, 1));
}

if (isMainThread) await main();
else await worker();
