// Équilibrage du duel (PVP) : chaque classe affronte chaque classe, les deux héros joués par le bot du jeu
// (src/game/bot.ts, profil « humain », qui esquive aussi les coups lents de l'autre héros), sans navigateur ni rendu.
// Les héros sont égalisés comme en vrai (src/game/pvp.ts) et les règles viennent de src/data/pvp.json.
//
//   npm run duel                                   grille : 100 duels par paire de classes, race einherjar
//   npm run duel -- --parties 60 --race hanyo      plus de duels, une autre race
//   npm run duel -- --classes guerrier,lame         seulement ces classes
//   npm run duel -- --graine 7                      un autre tirage (même graine = même résultat, au duel près)
//   npm run duel -- --json grille.json              garde la grille dans un fichier (référence de l'équilibrage)
//   npm run duel -- --comparer tools/duel-reference.json   écart de chaque paire avec la grille de référence
//   npm run duel -- --objets rodeur --parties 6     audit des objets : la classe avec puis sans chaque objet
//
// Grille : pour chaque paire, manches gagnées par chaque camp, part gagnée par le premier avec sa marge d'erreur
// (intervalle de Wilson à 95 %), durée moyenne d'une manche et part des manches jouées jusqu'au bout du temps. Puis le
// taux de victoire de chaque classe, toutes paires confondues. Une paire hors de 40–60 % est marquée « ! ».
//
// Audit : la classe affronte chacune des autres, d'abord avec l'arme de départ seule, puis avec en plus chacun des
// objets qu'elle peut porter en duel, dans son build Duel. Le duel applique sa règle (src/game/pvp.ts : stats ignorées,
// effets gardés, plafonds) : l'écart de taux de victoire est ce que l'effet de l'objet change. Au-delà de 8 points, il
// est à revoir (plan PvP).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

function option(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const CLASSES = option('classes', 'guerrier,sorcier,lame,paladin,rodeur').split(',');
const AUDIT = option('objets', null);
const RUNS = Number(option('parties', AUDIT ? '6' : '100'));
const RACE = option('race', 'einherjar');
const SEED = Number(option('graine', '1'));
const JSON_OUT = option('json', null);
const COMPARE = option('comparer', null);
/** Les branches de talents prises par le bot : les deux premières pleines, un nœud de la troisième. */
const TREE = { guerrier: ['susanoo', 'heracles', 'berserkir'], sorcier: ['kagutsuchi', 'seimei', 'promethee'], lame: ['tsukuyomi', 'thanatos', 'loki'], paladin: ['tyr', 'amaterasu', 'osiris'], rodeur: ['artemis', 'hachiman', 'skadi'] };
const STEP = 1 / 60;

/** Hasard à graine (mulberry32) : le jeu tire le sien de src/game/rng.ts, le bot de Math.random ; on fixe les deux. */
function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Une graine par duel, tirée de la graine générale et du nom du duel. */
function seedOf(...parts) {
  let h = 2166136261 ^ SEED;
  for (const ch of parts.join('|')) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

const { createServer } = await import('vite');
const server = await createServer({ root: ROOT, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', logLevel: 'error' });
const load = (path) => server.ssrLoadModule(path);
const [{ World }, { Bot }, { duelLoadout, allowedInDuel }, { equipBlock }, { content }, rng, player, enemies] = await Promise.all([
  load('/src/game/world.ts'),
  load('/src/game/bot.ts'),
  load('/src/game/pvp.ts'),
  load('/src/game/loadout.ts'),
  load('/src/content.ts'),
  load('/src/game/rng.ts'),
  load('/src/data/player.json'),
  load('/src/data/enemies.json'),
]);
const { arena, duel, level } = content.pvp;

/**
 * La progression d'un héros de test de la classe `cls`, avec son build Duel : l'arme de départ, et `item` en plus
 * (audit des objets). Le duel la ramène à ses règles (src/game/pvp.ts) : stats des objets ignorées, effets gardés.
 */
const heroState = (cls, item) => {
  const [a, b, c] = TREE[cls];
  const talents = [1, 2, 3, 4].flatMap((n) => [`${a}-${n}`, `${b}-${n}`]).concat(`${c}-1`);
  const weapon = content.skills.classes[cls].weapon;
  const slot = item ? content.items[item].slot : null;
  const equipped = { arme: weapon, ...(slot ? { [slot]: item } : {}) };
  return {
    version: 1,
    hero: { race: RACE, class: cls, ...(RACE === 'demi-dieu' ? { parent: 'zeus' } : {}) },
    oboles: 0,
    xp: 0,
    talents,
    items: Object.values(equipped),
    equipped,
    itemLevels: {},
    eveils: {},
    gravures: {},
    dungeons: {},
    materials: {},
    flags: {},
    quests: {},
    chests: 0,
    stock: [],
    builds: [],
    duelBuild: { name: 'Duel', class: cls, equipped, talents },
  };
};
const heroConfig = (cls, item) => duelLoadout(player.default, heroState(cls, item), content, level, content.pvp.items).config;

/** Un duel entre `a` (héros 0) et `b` (héros 1), avec sa graine : les manches de chacun, et la durée de chacune. */
function fight(a, b, seed) {
  const random = mulberry32(seed);
  Math.random = random;
  rng.setRandomState(Math.floor(random() * 2 ** 32));
  const world = new World({ ...arena.arena, player: heroConfig(a.cls, a.item), allies: [heroConfig(b.cls, b.item)], enemies: enemies.default, duel });
  const bots = world.players.map((hero) => new Bot(world, hero, false, true, true));
  const rounds = [];
  let start = 0;
  while (world.state === 'playing' && world.time < 600) {
    world.update(STEP, bots.map((bot) => bot.input()));
    for (const e of world.drainEvents()) {
      if (e.type === 'duel' && e.kind === 'round') start = world.time;
      if (e.type === 'duel' && e.kind === 'point') rounds.push({ winner: e.winner, time: world.time - start });
    }
  }
  return rounds;
}

/** `runs` duels de `a` contre `b`, côtés alternés : manches de chacun, durée totale, manches allées au bout du temps. */
function series(a, b, runs, tag) {
  const score = [0, 0];
  /** Manches gagnées par le héros de la première place (héros 0), quel que soit son camp. */
  let first = 0;
  let time = 0;
  let n = 0;
  let late = 0;
  for (let r = 0; r < runs; r++) {
    // On alterne les côtés : la place de départ ne doit rien décider.
    const swap = r % 2 === 1;
    for (const round of fight(swap ? b : a, swap ? a : b, seedOf(tag, r))) {
      n++;
      time += round.time;
      if (round.time >= duel.roundTime - 0.05) late++;
      if (round.winner < 0) continue;
      score[swap ? 1 - round.winner : round.winner]++;
      if (round.winner === 0) first++;
    }
  }
  return { score, first, time, n, late };
}

/** Intervalle de Wilson à 95 % autour de `won / total` : la marge d'erreur d'un taux de victoire mesuré. */
function wilson(won, total) {
  if (!total) return { p: 0.5, low: 0, high: 1 };
  const z = 1.96;
  const p = won / total;
  const d = 1 + (z * z) / total;
  const mid = (p + (z * z) / (2 * total)) / d;
  const half = (z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))) / d;
  return { p, low: mid - half, high: mid + half };
}
const pct = (x) => Math.round(100 * x);
const margin = (w) => `${String(pct(w.p)).padStart(3)} % (${pct(w.low)}–${pct(w.high)})`;

const header = `niveau ${level}, race ${RACE}, graine ${SEED}, ${RUNS} duels par paire (dégâts ×${duel.damage}, soins ×${duel.healing})`;

if (AUDIT) {
  // Audit des objets d'une classe.
  const cls = AUDIT;
  const others = CLASSES.filter((c) => c !== cls);
  const hero = heroState(cls).hero;
  const items = Object.entries(content.items)
    .filter(([, def]) => def.slot && allowedInDuel(def) && !equipBlock(def, hero, content.skills))
    .map(([id]) => id);
  const pooled = (item) => {
    let won = 0;
    let total = 0;
    for (const o of others) {
      // Même graine avec et sans l'objet : seul l'objet change d'un essai à l'autre.
      const { score } = series({ cls, item }, { cls: o }, RUNS, `${cls}-${o}`);
      won += score[0];
      total += score[0] + score[1];
    }
    return { won, total, ...wilson(won, total) };
  };
  console.log(`Audit des objets : ${cls}, ${header}`);
  console.log(`${items.length} objets portables, contre ${others.join(', ')}\n`);
  const base = pooled(null);
  console.log(`${'sans objet'.padEnd(30)} ${margin(base)}  (${base.won}/${base.total})`);
  const rows = [];
  for (const item of items) {
    const r = pooled(item);
    const delta = r.p - base.p;
    rows.push({ item, slot: content.items[item].slot, name: content.items[item].name, ...r, delta });
    console.log(`${content.items[item].name.slice(0, 29).padEnd(30)} ${margin(r)}  écart ${delta >= 0 ? '+' : ''}${pct(delta)}`);
  }
  rows.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
  console.log(`\nLes plus forts écarts :`);
  for (const r of rows.slice(0, 10)) console.log(`  ${r.name} (${r.slot}) ${r.delta >= 0 ? '+' : ''}${pct(r.delta)} points`);
  if (JSON_OUT) writeFileSync(JSON_OUT, `${JSON.stringify({ kind: 'objets', class: cls, level, race: RACE, seed: SEED, runs: RUNS, base, items: rows }, null, 2)}\n`);
} else {
  const wins = Object.fromEntries(CLASSES.map((c) => [c, { won: 0, played: 0 }]));
  const reference = COMPARE ? JSON.parse(readFileSync(COMPARE, 'utf8')) : null;
  const pairs = [];
  let firstWon = 0;
  let firstPlayed = 0;
  let allTime = 0;
  let allRounds = 0;
  let timeouts = 0;
  console.log(`Duel : ${header}`);
  console.log(`PV : ${CLASSES.map((c) => `${c} ${Math.round(heroConfig(c).maxHp)}`).join(', ')}\n`);
  for (let i = 0; i < CLASSES.length; i++) {
    for (let j = i; j < CLASSES.length; j++) {
      const [a, b] = [CLASSES[i], CLASSES[j]];
      const { score, first, time, n, late } = series({ cls: a }, { cls: b }, RUNS, `${a}-${b}`);
      firstWon += first;
      firstPlayed += score[0] + score[1];
      if (a !== b) {
        wins[a].won += score[0];
        wins[b].won += score[1];
        wins[a].played += score[0] + score[1];
        wins[b].played += score[0] + score[1];
      }
      allTime += time;
      allRounds += n;
      timeouts += late;
      const w = wilson(score[0], score[0] + score[1]);
      const flag = a !== b && (w.p < 0.4 || w.p > 0.6) ? ' !' : '';
      const was = reference?.pairs.find((x) => x.a === a && x.b === b);
      const delta = was && a !== b ? `, avant ${pct(was.rate)} % (${w.p >= was.rate ? '+' : ''}${pct(w.p - was.rate)})` : '';
      pairs.push({ a, b, score, first, rate: w.p, low: w.low, high: w.high, round: time / Math.max(1, n), timeouts: late / Math.max(1, n) });
      console.log(
        `${a.padEnd(9)} contre ${b.padEnd(9)} ${String(score[0]).padStart(3)} – ${String(score[1]).padEnd(3)} ${a === b ? '        miroir       ' : margin(w)}  manche ${(time / Math.max(1, n)).toFixed(1).padStart(5)} s, au temps ${String(pct(late / Math.max(1, n))).padStart(3)} %, 1re place ${String(pct(first / Math.max(1, score[0] + score[1]))).padStart(3)} %${delta}${flag}`,
      );
    }
  }
  console.log(`\nManche moyenne : ${(allTime / Math.max(1, allRounds)).toFixed(1)} s ; jouées jusqu'au bout du temps : ${pct(timeouts / Math.max(1, allRounds))} %`);
  // La place de départ ne doit rien décider : vers 50 %, sinon la première place a un avantage.
  console.log(`Manches gagnées par la première place : ${margin(wilson(firstWon, firstPlayed))}`);
  for (const [cls, w] of Object.entries(wins)) {
    const was = reference?.classes[cls]?.rate;
    const delta = was != null && w.played ? `, avant ${pct(was)} %` : '';
    console.log(`${cls.padEnd(9)} ${w.played ? margin(wilson(w.won, w.played)) : '-'} de manches gagnées (${w.won}/${w.played})${delta}`);
  }
  if (JSON_OUT) {
    const classes = Object.fromEntries(Object.entries(wins).map(([c, w]) => [c, { ...w, rate: w.played ? w.won / w.played : null }]));
    writeFileSync(JSON_OUT, `${JSON.stringify({ kind: 'grille', level, race: RACE, seed: SEED, runs: RUNS, duel: { damage: duel.damage, healing: duel.healing }, firstSeat: firstWon / Math.max(1, firstPlayed), pairs, classes }, null, 2)}\n`);
  }
}
await server.close();
