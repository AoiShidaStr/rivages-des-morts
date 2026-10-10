// Vérification des voies (sous-classes) : les dix voies de src/data/sous-classes.json, jouées par le moteur du jeu,
// sans navigateur ni rendu. Le moteur est chargé tel quel par Vite (comme `npm run equilibrage`).
//
//   npm run voies                      niveau 30, l'arme de départ de chaque classe
//   npm run voies -- --niveau 50
//
// Pour chaque classe, on éprouve la classe seule puis chacune de ses voies :
//   1. les chemins d'effets existent (perks.* dans config.ts, le reste dans player.json) — une coquille se voit ici ;
//   2. `buildLoadout` pose bien la voie dans la configuration, et elle change quelque chose ;
//   3. la touche F déclenche la compétence, et elle produit son effet (dégâts, soin, immobilisation ou cri) ;
//   4. au terrain d'entraînement, les poteaux fixes ne bougent pas, ceux qui défilent font leur va-et-vient, et
//      aucun mannequin ne touche le héros.
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

function option(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const LEVEL = Number(option('niveau', '30'));
/** Temps de la séance par voie, en secondes de simulation. */
const RUN = Number(option('temps', '4'));

const CLASSES = ['guerrier', 'sorcier', 'lame', 'paladin', 'rodeur'];

/** Toutes les clés de l'interface `Perks` (config.ts) : ce qu'un chemin `perks.x` peut viser. */
function perkNames() {
  const source = readFileSync(new URL('../src/game/config.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const block = /export interface Perks \{([\s\S]*?)\n\}/.exec(source);
  if (!block) throw new Error('interface Perks introuvable dans src/game/config.ts');
  return new Set([...block[1].matchAll(/^\s{2}([A-Za-z][\w]*)\?:/gm)].map((m) => m[1]));
}

/** Le chemin existe-t-il dans les réglages de base (player.json) ? */
function pathExists(base, path) {
  let node = base;
  for (const key of path.split('.')) {
    if (node === null || typeof node !== 'object' || !(key in node)) return false;
    node = node[key];
  }
  return true;
}

async function main() {
  const { createServer } = await import('vite');
  const server = await createServer({ root: ROOT, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', logLevel: 'error' });
  const load = (path) => server.ssrLoadModule(path);
  const [{ World }, { buildLoadout }, { content }, player, enemies, math] = await Promise.all([
    load('/src/game/world.ts'),
    load('/src/game/loadout.ts'),
    load('/src/content.ts'),
    load('/src/data/player.json'),
    load('/src/data/enemies.json'),
    load('/src/game/math.ts'),
  ]);

  const perks = perkNames();
  const base = player.default;
  const terrain = content.entrainement;
  const problems = [];
  const checks = [];
  const check = (label, ok, detail = '') => {
    checks.push({ label, ok });
    if (!ok) problems.push(`${label}${detail ? ` — ${detail}` : ''}`);
    return ok;
  };

  const stateFor = (cls, subclass) => {
    const branches = content.skills.classes[cls].branches;
    const weapon = content.skills.classes[cls].weapon;
    const talents = branches.flatMap((b) => b.nodes.map((n) => n.id)).slice(0, 9);
    return {
      version: 1,
      hero: { race: 'einherjar', class: cls, ...(subclass ? { subclass } : {}) },
      oboles: 0,
      xp: 0,
      talents,
      items: [weapon],
      equipped: { arme: weapon },
      itemLevels: { [weapon]: LEVEL },
      dungeons: {},
      materials: {},
      flags: {},
      quests: {},
      chests: 0,
    };
  };

  const frame = (over = {}) => ({
    move: math.vec(),
    aim: math.vec(),
    aimGround: math.vec(),
    attackPressed: false,
    attackHeld: false,
    signatureHeld: false,
    signaturePressed: false,
    dodgePressed: false,
    skillAPressed: false,
    skillEPressed: false,
    skillRPressed: false,
    skillFPressed: false,
    ...over,
  });

  // --- 1. Chemins d'effets -------------------------------------------------------------------
  for (const [cls, voies] of Object.entries(content.subclasses)) {
    for (const [id, voie] of Object.entries(voies)) {
      for (const effect of [...(voie.effects ?? []), ...voie.passive.effects]) {
        const path = effect.path;
        const ok = path.startsWith('perks.') ? perks.has(path.slice('perks.'.length)) : pathExists(base, path);
        check(`${cls}/${id} · chemin ${path}`, ok, ok ? '' : 'introuvable dans les réglages ou dans Perks');
      }
      check(`${cls}/${id} · passif nommé`, Boolean(voie.passive?.name && voie.passive?.description));
      check(`${cls}/${id} · compétence nommée`, Boolean(voie.active?.name && voie.active?.description && voie.active.cooldown > 0));
    }
  }

  // --- 2 à 4. Chaque voie, jouée au terrain d'entraînement -----------------------------------
  const rows = [];
  for (const cls of CLASSES) {
    const voies = content.subclasses[cls] ?? {};
    const plain = buildLoadout(base, stateFor(cls), content, LEVEL).config;
    for (const id of [null, ...Object.keys(voies)]) {
      const label = `${cls}${id ? ` / ${id}` : ' (classe seule)'}`;
      const state = stateFor(cls, id);
      const cfg = buildLoadout(base, state, content, LEVEL).config;

      if (id) {
        check(
          `${label} · voie posée par buildLoadout`,
          cfg.sousClasse?.name === voies[id].active.name && cfg.sousClasse?.kind === voies[id].active.kind,
          `trouvé : ${cfg.sousClasse?.name ?? 'rien'} (${cfg.sousClasse?.kind ?? '—'})`,
        );
        check(`${label} · dégâts de la voie à l'échelle des coups`, !voies[id].active.damage || cfg.sousClasse.damage >= voies[id].active.damage);
        check(`${label} · la voie change la configuration`, JSON.stringify({ ...cfg, sousClasse: undefined }) !== JSON.stringify({ ...plain, sousClasse: undefined }));
      } else {
        check(`${label} · aucune voie sans choix`, cfg.sousClasse === undefined);
      }

      const world = new World({ ...terrain.arena, player: cfg, enemies: enemies.default, training: true });
      const hero = world.players[0];
      const dummies = () => world.enemies;
      // On laisse la vague s'annoncer et les poteaux finir d'apparaître, puis on frappe F et on regarde ce qui suit.
      for (let i = 0; i < 400 && (dummies().length === 0 || dummies().some((e) => e.spawnTimer > 0)); i++) world.update(1 / 60, frame());
      check(`${label} · la vague du billot est là`, dummies().length > 0);
      const target = dummies()[0].pos;
      const before = dummies().map((e) => ({ x: e.pos.x, z: e.pos.z, hp: e.hp }));
      const hpBefore = hero.hp;
      const dpsBefore = hero.damageMultiplier();
      let hits = 0;
      let dealt = 0;
      let hurt = 0;
      let pressed = false;
      const steps = Math.round(RUN * 60);
      for (let i = 0; i < steps; i++) {
        // La touche F au premier pas, la visée sur le premier poteau.
        const press = !pressed;
        pressed = true;
        world.update(1 / 60, frame({ aim: { ...target }, aimGround: { ...target }, skillFPressed: press }));
        for (const event of world.drainEvents()) {
          if (event.type === 'enemyHit') {
            hits++;
            dealt += event.amount;
          }
          if (event.type === 'playerHit') hurt += event.amount;
        }
      }

      check(`${label} · F déclenche la compétence`, id ? hero.voieCooldown > 0 || cfg.sousClasse.kind === 'cri' : hero.voieCooldown === 0);
      if (id) {
        const kind = cfg.sousClasse.kind;
        if (kind === 'cri') check(`${label} · cri actif`, hero.voieTime > 0 && hero.damageMultiplier() > dpsBefore * 1.05);
        else if (kind === 'sanctuaire') check(`${label} · sanctuaire posé`, world.sanctuaries.length > 0 || hits > 0);
        else if (kind === 'filet') check(`${label} · poteau immobilisé`, dummies().some((e) => e.frozen > 0 || e.bindImmunity > 0));
        else check(`${label} · dégâts portés`, hits > 0 && dealt > 0, `${hits} coups, ${Math.round(dealt)} dégâts`);
      }

      // Les mannequins : deux fixes, deux qui défilent, et aucun qui touche le héros.
      const now = dummies().map((e) => ({ x: e.pos.x, z: e.pos.z }));
      const moved = now.map((p, i) => Math.hypot(p.x - before[i].x, p.z - before[i].z));
      const stayers = moved.filter((d) => d < 0.05).length;
      const walkers = moved.filter((d) => d > 0.2).length;
      const inside = now.every((p) => Math.abs(p.x) <= 9 && Math.abs(p.z) <= 9);
      check(`${label} · quatre mannequins`, dummies().length === 4, `${dummies().length} présents`);
      check(`${label} · poteaux fixes immobiles`, stayers === 2, `${stayers} immobile(s), déplacements : ${moved.map((d) => d.toFixed(2)).join(', ')}`);
      check(`${label} · deux mannequins qui défilent`, walkers === 2 && inside, `${walkers} en marche`);
      check(`${label} · le héros n'est jamais touché`, hero.hp === hpBefore && hurt === 0, `${Math.round(hurt)} dégâts subis`);
      rows.push({ classe: cls, voie: id ?? '—', coups: hits, degats: Math.round(dealt), immobiles: stayers, enMarche: walkers });
    }
  }

  const failed = checks.filter((c) => !c.ok);
  console.log(`\nVoies (sous-classes) · niveau ${LEVEL} · ${checks.length} vérifications\n`);
  console.table(rows);
  if (failed.length) {
    console.log(`\n${failed.length} vérification(s) en échec :`);
    for (const f of failed) console.log(`  · ${f.label}`);
  } else {
    console.log('Toutes les vérifications passent.');
  }
  await server.close();
  process.exit(failed.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
