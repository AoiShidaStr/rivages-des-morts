// Équilibrage du duel (PVP) : chaque classe affronte chaque classe, les deux héros joués par le bot du jeu
// (src/game/bot.ts, profil « humain »), sans navigateur ni rendu. Les héros sont égalisés comme en vrai
// (src/game/pvp.ts) et les règles viennent de src/data/pvp.json.
//
//   npm run duel                                   5 duels par paire de classes, race einherjar
//   npm run duel -- --parties 10 --race hanyo      plus de duels, une autre race
//   npm run duel -- --classes guerrier,lame         seulement ces classes
//
// Pour chaque paire : manches gagnées par chaque camp, durée moyenne d'une manche, part des manches jouées jusqu'au
// bout du temps. Puis le taux de victoire de chaque classe, toutes paires confondues.
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

function option(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const CLASSES = option('classes', 'guerrier,sorcier,lame,paladin,rodeur').split(',');
const RUNS = Number(option('parties', '5'));
const RACE = option('race', 'einherjar');
/** Les branches de talents prises par le bot : les deux premières pleines, un nœud de la troisième. */
const TREE = { guerrier: ['susanoo', 'heracles', 'berserkir'], sorcier: ['kagutsuchi', 'seimei', 'promethee'], lame: ['tsukuyomi', 'thanatos', 'loki'], paladin: ['tyr', 'amaterasu', 'osiris'], rodeur: ['artemis', 'hachiman', 'skadi'] };
const STEP = 1 / 60;

const { createServer } = await import('vite');
const server = await createServer({ root: ROOT, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', logLevel: 'error' });
const load = (path) => server.ssrLoadModule(path);
const [{ World }, { Bot }, { duelLoadout }, { content }, player, enemies] = await Promise.all([
  load('/src/game/world.ts'),
  load('/src/game/bot.ts'),
  load('/src/game/pvp.ts'),
  load('/src/content.ts'),
  load('/src/data/player.json'),
  load('/src/data/enemies.json'),
]);
const { arena, duel, level } = content.pvp;

const heroConfig = (cls) => {
  const [a, b, c] = TREE[cls];
  const state = {
    version: 1,
    hero: { race: RACE, class: cls, ...(RACE === 'demi-dieu' ? { parent: 'zeus' } : {}) },
    oboles: 0,
    xp: 0,
    talents: [1, 2, 3, 4].flatMap((n) => [`${a}-${n}`, `${b}-${n}`]).concat(`${c}-1`),
    items: [],
    equipped: {},
    itemLevels: {},
    eveils: {},
    gravures: {},
    dungeons: {},
    materials: {},
    flags: {},
    quests: {},
    chests: 0,
    stock: [],
  };
  return duelLoadout(player.default, state, content, level).config;
};

/** Un duel entre `a` (héros 0) et `b` (héros 1) : les manches de chacun, et pour chaque manche sa durée. */
function fight(a, b) {
  const world = new World({ ...arena.arena, player: heroConfig(a), allies: [heroConfig(b)], enemies: enemies.default, duel });
  const bots = world.players.map((hero) => new Bot(world, hero, false, true));
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

const wins = Object.fromEntries(CLASSES.map((c) => [c, { won: 0, played: 0 }]));
let allTime = 0;
let allRounds = 0;
let timeouts = 0;
console.log(`Duel : niveau ${level}, race ${RACE}, ${RUNS} duels par paire (dégâts ×${duel.damage}, soins ×${duel.healing})`);
console.log(`PV : ${CLASSES.map((c) => `${c} ${Math.round(heroConfig(c).maxHp)}`).join(', ')}\n`);
for (let i = 0; i < CLASSES.length; i++) {
  for (let j = i; j < CLASSES.length; j++) {
    const [a, b] = [CLASSES[i], CLASSES[j]];
    const score = [0, 0];
    let time = 0;
    let n = 0;
    let late = 0;
    for (let r = 0; r < RUNS; r++) {
      // On alterne les côtés : la place de départ ne doit rien décider.
      const swap = r % 2 === 1;
      for (const round of fight(swap ? b : a, swap ? a : b)) {
        n++;
        time += round.time;
        if (round.time >= duel.roundTime - 0.05) late++;
        if (round.winner < 0) continue;
        const side = swap ? 1 - round.winner : round.winner;
        score[side]++;
        if (a !== b) {
          wins[side === 0 ? a : b].won++;
          wins[a].played++;
          wins[b].played++;
        }
      }
    }
    allTime += time;
    allRounds += n;
    timeouts += late;
    console.log(`${a.padEnd(9)} contre ${b.padEnd(9)} ${String(score[0]).padStart(3)} – ${String(score[1]).padEnd(3)} manche ${(time / Math.max(1, n)).toFixed(1).padStart(5)} s, au temps ${Math.round((100 * late) / Math.max(1, n))} %`);
  }
}
console.log(`\nManche moyenne : ${(allTime / Math.max(1, allRounds)).toFixed(1)} s ; jouées jusqu'au bout du temps : ${Math.round((100 * timeouts) / Math.max(1, allRounds))} %`);
for (const [cls, w] of Object.entries(wins)) console.log(`${cls.padEnd(9)} ${w.played ? Math.round((100 * w.won) / w.played) : '-'} % de manches gagnées (${w.won}/${w.played})`);
await server.close();
