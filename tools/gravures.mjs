// Vérification des gravures (rivens) : la table de src/data/gravures.json, tirée par le vrai `rollGravure`, posée par
// le vrai `buildLoadout`, et éprouvée au terrain d'entraînement. Le moteur est chargé tel quel par Vite (comme
// `npm run voies` et `npm run equilibrage`), sans navigateur ni rendu.
//
//   npm run gravures                      30 000 tirages par arme, niveau 30
//   npm run gravures -- --tirages 5000 --niveau 50
//
// Ce qui est vérifié :
//   1. les chemins d'effets existent (perks.* dans config.ts, les champs de PlayerConfig, le reste dans player.json) ;
//   2. chaque arme du jeu a de quoi tirer, dans les deux paquets (forme et maîtrise) — sinon une ligne manquerait ;
//   3. un tirage a le compte exact du rang : `lines - 1` formes, une maîtrise, une contrepartie si et seulement si le
//      rang en donne une, jamais deux fois la même ligne, chaque valeur dans [min, max] et sur son pas ;
//   4. la répartition des rangs suit les poids annoncés, et un tirage Vierge met toutes les lignes au maximum ;
//   5. le prix monte à chaque relance, et le formatage affiche ce qu'il faut (« −12 % », « +2 % », « +0,35 ») ;
//   6. `buildLoadout` pose la gravure de l'arme équipée, et d'elle seule : une gravure sur une arme non portée, ou
//      sur une pièce d'armure, ne change rien ;
//   7. au terrain d'entraînement, une gravure fait vraiment plus de dégâts qu'une arme nue, pour les cinq classes ;
//   8. `Progress` range un tirage, compte la relance, et une vieille sauvegarde (sans `gravures`) se charge sans bruit.
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

function option(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const LEVEL = Number(option('niveau', '30'));
/** Tirages par arme pour les contrôles de structure et la mesure au billot. */
const DRAWS = Number(option('tirages', '2000'));
/** Secondes de simulation par séance au billot. */
const RUN = Number(option('temps', '6'));

const CLASSES = ['guerrier', 'sorcier', 'lame', 'paladin', 'rodeur'];

/** Toutes les clés de l'interface `Perks` (config.ts) : ce qu'un chemin `perks.x` peut viser. */
function perkNames() {
  const source = readFileSync(new URL('../src/game/config.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const block = /export interface Perks \{([\s\S]*?)\n\}/.exec(source);
  if (!block) throw new Error('interface Perks introuvable dans src/game/config.ts');
  return new Set([...block[1].matchAll(/^\s{2}([A-Za-z][\w]*)\?:/gm)].map((m) => m[1]));
}

/** Les champs de `PlayerConfig` : certains (damageTakenFactor) ne sont pas dans player.json, mais existent. */
function configFields() {
  const source = readFileSync(new URL('../src/game/config.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const block = /export interface PlayerConfig \{([\s\S]*?)\n\}/.exec(source);
  if (!block) throw new Error('interface PlayerConfig introuvable dans src/game/config.ts');
  return new Set([...block[1].matchAll(/^\s{2}([A-Za-z][\w]*)\??:/gm)].map((m) => m[1]));
}

/** Le chemin existe-t-il dans les réglages de base (player.json), ou parmi les champs déclarés de PlayerConfig ? */
function pathExists(base, path, fields) {
  if (path.startsWith('perks.')) return true;
  const root = path.split('.')[0];
  if (fields.has(root)) return true;
  let node = base;
  for (const key of path.split('.')) {
    if (node === null || typeof node !== 'object' || !(key in node)) return false;
    node = node[key];
  }
  return true;
}

/** Tirage reproductible : deux exécutions donnent les mêmes nombres. */
function mulberry32(seed) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sauvegardes en mémoire : Progress ne parle qu'à `SaveStore`. */
function memoryStore(saves) {
  return {
    list: () => Object.keys(saves).map((id) => ({ id, savedAt: 1 })),
    read: (id) => saves[id] ?? null,
    write: (id, data) => {
      saves[id] = data;
    },
    remove: (id) => {
      delete saves[id];
    },
  };
}

async function main() {
  const { createServer } = await import('vite');
  const server = await createServer({ root: ROOT, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', logLevel: 'error' });
  const load = (path) => server.ssrLoadModule(path);
  const [{ World }, { buildLoadout }, { content, catalog }, gravure, player, enemies] = await Promise.all([
    load('/src/game/world.ts'),
    load('/src/game/loadout.ts'),
    load('/src/content.ts'),
    load('/src/game/gravure.ts'),
    load('/src/data/player.json'),
    load('/src/data/enemies.json'),
  ]);
  const { Progress } = await load('/src/game/progress.ts');

  const { rollGravure, gravureCost, gravureEffects, gravureLineText, gravureLineDef, formatGravureValue, rankOdds, gravureRank } = gravure;
  const data = content.gravures;
  const base = player.default;
  const terrain = content.entrainement;
  const perks = perkNames();
  const fields = configFields();
  const problems = [];
  const checks = [];
  const check = (label, ok, detail = '') => {
    checks.push({ label, ok });
    if (!ok) problems.push(`${label}${detail ? ` — ${detail}` : ''}`);
    return ok;
  };
  const near = (a, b, tolerance = 1e-6) => Math.abs(a - b) <= Math.abs(b) * tolerance + 1e-9;

  const weapons = Object.entries(content.items)
    .filter(([, def]) => def.slot === 'arme')
    .map(([id, def]) => ({ id, def, cls: def.tags?.[0] ?? 'Tous' }));
  const stateFor = (cls, gravureOn) => ({
    version: 1,
    hero: { race: 'einherjar', class: cls },
    oboles: 0,
    xp: 0,
    talents: content.skills.classes[cls].branches.flatMap((b) => b.nodes.map((n) => n.id)).slice(0, 9),
    items: [content.skills.classes[cls].weapon],
    equipped: { arme: content.skills.classes[cls].weapon },
    itemLevels: { [content.skills.classes[cls].weapon]: LEVEL },
    gravures: {},
    dungeons: {},
    materials: {},
    flags: {},
    quests: {},
    chests: 0,
  });

  // --- 1. Données : chemins, bornes, poids ------------------------------------------------------
  const contreparties = data.lines.filter((l) => l.effects);
  for (const line of data.lines) {
    if (line.effects) {
      check(`ligne ${line.id} · paquet de contrepartie`, line.effects.length >= 2, `${line.effects.length} effet(s)`);
      for (const effect of line.effects) check(`ligne ${line.id} · chemin ${effect.path}`, pathExists(base, effect.path, fields), 'introuvable');
      check(`ligne ${line.id} · sommaire nommé`, Boolean(line.summary) && !line.summary.includes('{v}'));
      continue;
    }
    const path = line.path ?? '';
    const known = path.startsWith('perks.') ? perks.has(path.slice('perks.'.length)) : pathExists(base, path, fields);
    check(`ligne ${line.id} · chemin ${path}`, known, known ? '' : 'introuvable dans les réglages ou dans Perks');
    check(`ligne ${line.id} · bornes`, typeof line.min === 'number' && typeof line.max === 'number' && line.min <= line.max, `${line.min} → ${line.max}`);
    check(`ligne ${line.id} · pas`, typeof line.step === 'number' && line.step > 0, String(line.step));
    check(`ligne ${line.id} · sommaire à trou`, Boolean(line.summary) && line.summary.includes('{v}'));
    // Le « % » est ajouté par l'affichage pour `part` et `ecart` : le sommaire ne doit pas le répéter.
    check(`ligne ${line.id} · pas de « % » en double`, line.show === 'brut' || !line.summary.includes('%'), line.summary);
    check(`ligne ${line.id} · affichage`, ['brut', 'part', 'ecart'].includes(line.show), String(line.show));
    check(`ligne ${line.id} · poids`, (line.weight ?? 1) > 0);
    check(`ligne ${line.id} · genre`, ['forme', 'maitrise', 'contrepartie'].includes(line.kind));
  }
  check('lignes · deux paquets non vides', data.lines.some((l) => l.kind === 'forme') && data.lines.some((l) => l.kind === 'maitrise'));
  check('contreparties · au moins une', contreparties.length > 0);

  let floor = -1;
  for (const rank of data.ranks) {
    check(`rang ${rank.id} · nom et sommaire`, Boolean(rank.name && rank.summary));
    check(`rang ${rank.id} · au moins deux lignes`, rank.lines >= 2, String(rank.lines));
    check(`rang ${rank.id} · plancher dans [0, 1]`, rank.floor >= 0 && rank.floor <= 1, String(rank.floor));
    check(`rang ${rank.id} · poids`, (rank.weight ?? 1) > 0);
    check(`rang ${rank.id} · planchers croissants`, rank.floor >= floor, `${rank.floor} après ${floor}`);
    floor = rank.floor;
  }
  check('rangs · un seul plancher au maximum', data.ranks.filter((r) => r.floor === 1).length === 1);

  // --- 2. Chaque arme a de quoi tirer -----------------------------------------------------------
  const pools = (tags) => ({
    forme: data.lines.filter((l) => l.kind === 'forme' && (!l.tags || l.tags.some((t) => t === 'Tous' || tags.includes(t)))),
    maitrise: data.lines.filter((l) => l.kind === 'maitrise' && (!l.tags || l.tags.some((t) => t === 'Tous' || tags.includes(t)))),
  });
  for (const w of weapons) {
    const pool = pools(w.def.tags ?? []);
    check(`${w.id} (${w.cls}) · paquet de forme`, pool.forme.length >= 2, `${pool.forme.length} lignes`);
    check(`${w.id} (${w.cls}) · paquet de maîtrise`, pool.maitrise.length >= 1, `${pool.maitrise.length} lignes`);
  }

  // --- 3. Structure du tirage, arme par arme -----------------------------------------------------
  const random = mulberry32(20261010);
  const rows = [];
  for (const w of weapons) {
    const tags = w.def.tags ?? [];
    const pool = pools(tags);
    let widest = null;
    let formulaOk = true;
    let boundsOk = true;
    let againstOk = true;
    for (let i = 0; i < DRAWS; i++) {
      const gravure = rollGravure(data, tags, random);
      const rank = gravureRank(data, gravure);
      const drawn = gravure.lines.map((l) => ({ line: l, def: gravureLineDef(data, l.id) }));
      const kinds = drawn.map((d) => d.def?.kind);
      const formeCount = kinds.filter((k) => k === 'forme').length;
      const marcheCount = kinds.filter((k) => k === 'maitrise').length;
      const contreCount = kinds.filter((k) => k === 'contrepartie').length;
      const unique = new Set(gravure.lines.map((l) => l.id)).size === gravure.lines.length;
      // Le rang compte les renforts ; la contrepartie s'ajoute par-dessus (un riven : trois lignes et un défaut).
      const expectedLines = rank ? rank.lines + (rank.contrepartie ? 1 : 0) : 0;
      if (!rank || gravure.lines.length !== expectedLines) {
        formulaOk = false;
        if (!widest) widest = `${w.id} · ${rank?.id} : ${gravure.lines.length} lignes (attendu ${expectedLines})`;
      } else if (formeCount !== rank.lines - 1 || marcheCount !== 1) {
        formulaOk = false;
        if (!widest) widest = `${w.id} · ${rank.id} : ${formeCount} formes + ${marcheCount} maîtrise`;
      } else if (contreCount !== (rank.contrepartie ? 1 : 0)) {
        formulaOk = false;
        if (!widest) widest = `${w.id} · ${rank.id} : ${contreCount} contrepartie(s)`;
      } else if (!unique) {
        formulaOk = false;
        if (!widest) widest = `${w.id} · ligne tirée deux fois`;
      }
      for (const { line, def } of drawn) {
        if (!def) {
          boundsOk = false;
          continue;
        }
        const inPool = def.kind === 'forme' ? pool.forme.includes(def) : def.kind === 'maitrise' ? pool.maitrise.includes(def) : true;
        if (!inPool) againstOk = false;
        if (def.effects) continue;
        if (line.value < def.min || line.value > def.max) boundsOk = false;
        if (Math.abs(line.value / def.step - Math.round(line.value / def.step)) > 1e-6) boundsOk = false;
        if (rank.floor === 1 && !near(line.value, def.max)) boundsOk = false;
      }
    }
    check(`${w.id} · structure du tirage`, formulaOk, widest ?? '');
    check(`${w.id} · valeurs dans les bornes`, boundsOk);
    check(`${w.id} · lignes de sa classe`, againstOk);
    rows.push({ arme: w.id, classe: w.cls, forme: pool.forme.length, maitrise: pool.maitrise.length, contreparties: contreparties.length });
  }

  // --- 4. Répartition des rangs -----------------------------------------------------------------
  const BIG = 30000;
  const counted = new Map(data.ranks.map((r) => [r.id, 0]));
  for (let i = 0; i < BIG; i++) {
    const rank = rollGravure(data, ['Guerrier'], random).rank;
    counted.set(rank, counted.get(rank) + 1);
  }
  const totalWeight = data.ranks.reduce((sum, r) => sum + (r.weight ?? 1), 0);
  for (const rank of data.ranks) {
    const observed = counted.get(rank.id) / BIG;
    const expected = (rank.weight ?? 1) / totalWeight;
    check(`répartition · ${rank.name}`, Math.abs(observed - expected) < 0.015, `${(observed * 100).toFixed(1)} % observé, ${(expected * 100).toFixed(1)} % attendu`);
  }
  check('répartition · odds affichées', near(rankOdds(data).reduce((sum, o) => sum + o.chance, 0), 1));

  // --- 5. Prix et affichage ---------------------------------------------------------------------
  const prices = [0, 1, 2, 5, 10].map((n) => gravureCost(data, n));
  check('prix · monte à chaque relance', prices.every((p, i) => i === 0 || p.oboles > prices[i - 1].oboles), prices.map((p) => p.oboles).join(' · '));
  check(
    'prix · les matériaux montent aussi',
    prices.every((p, i) => i === 0 || Object.values(p.materials).every((n, k) => n > Object.values(prices[i - 1].materials)[k])),
    prices.map((p) => Object.values(p.materials).join('/')).join(' · '),
  );
  check('affichage · écart négatif', formatGravureValue(0.88, 'ecart') === '−12 %', `« ${formatGravureValue(0.88, 'ecart')} »`);
  check('affichage · écart positif', formatGravureValue(1.06, 'ecart') === '+6 %', formatGravureValue(1.06, 'ecart'));
  check('affichage · part', formatGravureValue(0.02, 'part') === '+2 %', formatGravureValue(0.02, 'part'));
  check('affichage · brut à virgule', formatGravureValue(0.35, 'brut') === '+0,35', formatGravureValue(0.35, 'brut'));
  check('affichage · brut négatif', formatGravureValue(-0.3, 'brut') === '−0,3', formatGravureValue(-0.3, 'brut'));
  check(
    'affichage · une ligne complète en unité',
    gravureLineText({ id: 'allonge', value: 0.35 }, gravureLineDef(data, 'allonge')) === 'Portée des coups +0,35 m',
    gravureLineText({ id: 'allonge', value: 0.35 }, gravureLineDef(data, 'allonge')),
  );
  check(
    'affichage · une ligne en pourcentage, une seule unité',
    gravureLineText({ id: 'releve', value: 0.89 }, gravureLineDef(data, 'releve')) === 'Temps de récupération −11 %',
    gravureLineText({ id: 'releve', value: 0.89 }, gravureLineDef(data, 'releve')),
  );

  // --- 6. buildLoadout : la gravure porte sur l'arme équipée, et sur elle seule ------------------
  const crafted = { rank: 'vierge', lines: [{ id: 'allonge', value: 0.5 }, { id: 'violence', value: 1.1 }, { id: 'vampire', value: 0.02 }] };
  for (const cls of CLASSES) {
    const weapon = content.skills.classes[cls].weapon;
    const plain = buildLoadout(base, stateFor(cls), content, LEVEL).config;
    const on = buildLoadout(base, { ...stateFor(cls), gravures: { [weapon]: crafted } }, content, LEVEL).config;
    check(`${cls} · allonge posée`, near(on.attack.range, plain.attack.range + 0.5), `${on.attack.range} vs ${plain.attack.range + 0.5}`);
    check(`${cls} · violence à l'échelle`, near(on.attack.damage, plain.attack.damage * 1.1, 1e-6), `${on.attack.damage} vs ${plain.attack.damage * 1.1}`);
    check(`${cls} · vol de vie posé`, near((on.perks?.lifesteal ?? 0) - (plain.perks?.lifesteal ?? 0), 0.02), `${(on.perks?.lifesteal ?? 0) - (plain.perks?.lifesteal ?? 0)}`);
    // Une gravure sur une arme NON portée, et une gravure sur une pièce d'armure, ne doivent rien changer.
    const clsTag = content.items[weapon].tags?.[0];
    const other = weapons.find((w) => w.id !== weapon && w.def.tags?.[0] === clsTag);
    if (other) {
      const away = buildLoadout(base, { ...stateFor(cls), gravures: { [other.id]: crafted } }, content, LEVEL).config;
      check(`${cls} · arme non portée ignorée`, JSON.stringify(away) === JSON.stringify(plain));
    }
    const armour = buildLoadout(base, { ...stateFor(cls), gravures: { 'chapeau-paille': crafted } }, content, LEVEL).config;
    check(`${cls} · pièce d'armure ignorée`, JSON.stringify(armour) === JSON.stringify(plain));
    // La contrepartie coûte vraiment ce qu'elle annonce.
    const cursed = { rank: 'kami', lines: [{ id: 'peau-nue', value: 1 }] };
    const withCurse = buildLoadout(base, { ...stateFor(cls), gravures: { [weapon]: cursed } }, content, LEVEL).config;
    check(`${cls} · contrepartie : dégâts en plus`, near(withCurse.attack.damage, plain.attack.damage * 1.25, 1e-6));
    check(`${cls} · contrepartie : dégâts subis en plus`, near(withCurse.damageTakenFactor ?? 1, (plain.damageTakenFactor ?? 1) * 1.12, 1e-6), `${withCurse.damageTakenFactor} vs ${(plain.damageTakenFactor ?? 1) * 1.12}`);
    const effects = gravureEffects(cursed, data);
    check(`${cls} · effets de la contrepartie`, effects.length === 2 && effects.every((e) => e.path && e.op));
  }

  // --- 7. Mesure au terrain : une gravure fait plus de dégâts qu'une arme nue --------------------
  const baseFrame = {
    move: { x: 0, z: 0 },
    aim: { x: 0, z: 0 },
    aimGround: { x: 0, z: 0 },
    attackPressed: false,
    attackHeld: false,
    signatureHeld: false,
    signaturePressed: false,
    dodgePressed: false,
    skillAPressed: false,
    skillEPressed: false,
    skillRPressed: false,
    skillFPressed: false,
  };
  const hit = (cfg) => {
    const world = new World({ ...terrain.arena, player: cfg, enemies: enemies.default, training: true });
    for (let i = 0; i < 400 && (world.enemies.length === 0 || world.enemies.some((e) => e.spawnTimer > 0)); i++) world.update(1 / 60, baseFrame);
    let dealt = 0;
    let hits = 0;
    for (let i = 0; i < RUN * 60; i++) {
      const target = world.enemies[0]?.pos ?? { x: 0, z: 0 };
      world.update(1 / 60, { ...baseFrame, attackPressed: true, attackHeld: true, aim: { ...target }, aimGround: { ...target } });
      for (const event of world.drainEvents()) {
        if (event.type === 'enemyHit') {
          hits++;
          dealt += event.amount;
        }
      }
    }
    return { dealt, hits };
  };
  const engraved = { rank: 'vierge', lines: [{ id: 'violence', value: 1.16 }, { id: 'allonge', value: 0.5 }, { id: 'engagement', value: 0.82 }] };
  for (const cls of CLASSES) {
    const weapon = content.skills.classes[cls].weapon;
    const plain = hit(buildLoadout(base, stateFor(cls), content, LEVEL).config);
    const withG = hit(buildLoadout(base, { ...stateFor(cls), gravures: { [weapon]: engraved } }, content, LEVEL).config);
    check(`${cls} · le héros frappe au billot`, plain.hits > 0, `${plain.hits} coups`);
    check(`${cls} · la gravure fait plus de dégâts`, withG.dealt > plain.dealt * 1.02, `${Math.round(plain.dealt)} → ${Math.round(withG.dealt)}`);
    rows.find((r) => r.arme === weapon).billot = `${Math.round(plain.dealt)} → ${Math.round(withG.dealt)}`;
  }

  // --- 8. Progress : ranger, compter, et se charger depuis une vieille sauvegarde ----------------
  const old = {
    version: 1,
    hero: { race: 'einherjar', class: 'guerrier' },
    oboles: 500,
    xp: 0,
    talents: [],
    items: ['nodachi'],
    equipped: { arme: 'nodachi' },
    itemLevels: { nodachi: 1 },
    dungeons: {},
    materials: { soie: 9 },
    flags: {},
    quests: {},
    chests: 0,
  };
  const saves = { vieux: old };
  const progress = Progress.load(catalog, memoryStore(saves));
  check('sauvegarde · une vieille sauvegarde se charge', progress.slot === 'vieux' && progress.state.gravures !== undefined, String(progress.slot));
  check('sauvegarde · gravures vides au départ', Object.keys(progress.state.gravures).length === 0 && progress.gravure('nodachi') === undefined);
  check('sauvegarde · aucun tirage compté', progress.gravureRolls('nodachi') === 0);
  const first = gravureCost(data, progress.gravureRolls('nodachi'));
  progress.setGravure('nodachi', crafted);
  check('sauvegarde · le tirage est rangé', progress.gravure('nodachi')?.rank === 'vierge' && progress.state.gravures.nodachi.lines.length === 3);
  check('sauvegarde · la relance est comptée', progress.gravureRolls('nodachi') === 1, String(progress.gravureRolls('nodachi')));
  const drawn = rollGravure(data, ['Guerrier'], random);
  progress.setGravure('nodachi', drawn);
  check('sauvegarde · la relance renchérit', gravureCost(data, progress.gravureRolls('nodachi')).oboles > first.oboles);
  check('sauvegarde · la relance remplace', progress.gravure('nodachi') === drawn && drawn.lines.length >= 2);
  check('sauvegarde · écrite dans l’emplacement', Boolean(saves.vieux?.gravures?.nodachi));
  // Une gravure dont l'arme n'existe plus est écartée au chargement.
  const ghost = { ...old, gravures: { 'arme-disparue': { rank: 'vierge', lines: [] }, nodachi: crafted } };
  const cleaned = Progress.load(catalog, memoryStore({ fantome: ghost }));
  check('migration · arme disparue oubliée', cleaned.gravure('arme-disparue') === undefined && cleaned.gravure('nodachi') !== undefined);

  const failed = checks.filter((c) => !c.ok);
  console.log(`\nGravures (rivens) · niveau ${LEVEL} · ${DRAWS} tirages par arme · ${checks.length} vérifications\n`);
  console.table(rows);
  console.log(`\nRangs : ${rankOdds(data).map((o) => `${o.name} ${Math.round(o.chance * 100)} %`).join(' · ')}`);
  console.log(`Prix : ${prices.map((p, i) => `${i * 1}e relance ${p.oboles} oboles + ${Object.entries(p.materials).map(([m, n]) => `${n} ${m}`).join(', ')}`).join(' | ')}`);
  if (failed.length) {
    console.log(`\n${failed.length} vérification(s) en échec :`);
    for (const problem of problems) console.log(`  · ${problem}`);
  } else {
    console.log('\nToutes les vérifications passent.');
  }
  await server.close();
  process.exit(failed.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
