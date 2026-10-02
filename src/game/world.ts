import type { GameConfig, HazardConfig } from './config';
import type { CurseId } from './difficulty';
import { Hitodama, Ikazuchi, Izanami, Jorogumo, Kappa, KasaObake, Kodama, Oublie, Shikome, type Enemy } from './enemies';
import {
  add,
  angleOf,
  degToRad,
  distance,
  distanceToSegment,
  dot,
  fromAngle,
  inCone,
  length,
  normalize,
  scale,
  sub,
  vec,
  type Vec2,
} from './math';
import { Player } from './player';
import { Summon, type Soul } from './summons';
import type { EnemyKind, GameEvent, InputFrame, MarkKind, Outcome, StunReason } from './types';

/** Pause entre deux vagues, en secondes. */
const WAVE_PAUSE = 1.5;
/** Distance minimale entre le joueur et un ennemi qui apparaît. */
const SPAWN_CLEARANCE = 5;
/** Secondes sans être touché avant que la « Sève du Yomi » ne soigne un yokai. */
const SAP_DELAY = 3;
/** Avec le Masque d'Oublié, une âme compte comme si elle était trois fois plus proche que le héros. */
const TAUNT_PULL = 3;
/** Sans lui, un yokai préfère le héros : une âme doit être une fois et demie plus proche pour l'attirer. */
const HERO_PULL = 1.5;
/** Coop : secondes qu'un allié doit passer à côté d'un héros à terre pour le relever, et à quelle distance. */
export const REVIVE_TIME = 4;
const REVIVE_RANGE = 1.6;
/** Part des PV rendue au héros relevé par un allié. */
const REVIVE_HP = 0.3;
/** Les boss ne sont jamais doublés en coop. */
const BOSS_KINDS = new Set<EnemyKind>(['jorogumo', 'izanami']);
/** Secondes avant qu'un boss ne se choisisse une autre proie parmi les héros. */
const PREY_TIME = 2;
/** Répit après une immobilisation (filet, fil de Jōren, soie) : le yokai ne peut plus être immobilisé pendant ce temps. */
const IMMOBILIZE_RESPITE = 3;
/** Étourdissement le plus long de la Frappe du Guerrier, le seul héros qui étourdit (hors filet du Rôdeur). */
const SMASH_STUN_MAX = 0.8;
/** Part de la vitesse que perdent les yokai frappés par le Bond (talent d'Héraclès). */
const BOND_SLOW = 0.5;

/** Commandes d'un héros sans joueur (entrée manquante) : il reste immobile. */
function idleInput(hero: Player): InputFrame {
  const at = { ...hero.pos };
  return {
    move: vec(),
    aim: at,
    aimGround: at,
    attackPressed: false,
    attackHeld: false,
    signatureHeld: false,
    signaturePressed: false,
    dodgePressed: false,
    skillAPressed: false,
    skillEPressed: false,
    skillRPressed: false,
  };
}

/** Ce qu'un yokai peut attaquer : le héros, ou une âme liée de l'Invocateur. */
export interface Foe {
  pos: Vec2;
  readonly radius: number;
  knockback: Vec2;
  /** Seul le héros bloque (Guerrier, Paladin), et seulement de face. */
  isGuarding(from: Vec2): boolean;
  /**
   * Coup bloqué ; `attacker` : le yokai qui l'a porté (riposte du Paladin), `amount` : la force du coup,
   * `parried` : un assaut arrêté net, dont rien ne passe.
   */
  guard(world: World, attacker?: Enemy, amount?: number, parried?: boolean): void;
  /** Faux si le coup n'a pas porté (esquive, invulnérabilité). `falling` : il tombe du ciel (Mino de paille). */
  takeHit(amount: number, pushDir: Vec2, knockback: number, world: World, falling?: boolean): boolean;
}

interface Body {
  pos: Vec2;
  radius: number;
  mass: number;
}

/** Souche de l'arène du boss : un obstacle fixe, et le point d'accroche du fil de Jōren. */
export interface Stump {
  pos: Vec2;
  radius: number;
}

/**
 * Pêcher d'Izanagi (arène d'Izanami) : un obstacle. Un coup fait tomber sa pêche, qui file repousser
 * Izanami ; il refleurit ensuite (`regrow` : secondes avant la prochaine pêche).
 */
export interface PeachTree {
  pos: Vec2;
  radius: number;
  ripe: boolean;
  regrow: number;
}

/** Toile au sol : ralentit le joueur ; un feu follet frappé à côté l'enflamme. */
export interface Web {
  id: number;
  pos: Vec2;
  radius: number;
  age: number;
  /** Temps écoulé depuis que la toile a pris feu, ou null si elle est intacte. */
  burning: number | null;
}

/** Chute annoncée par un cercle au sol (toile lancée, pluie de fils). */
export interface Hazard {
  id: number;
  pos: Vec2;
  t: number;
  cfg: HazardConfig;
  leavesWeb: boolean;
}

/** Flèche (et flèche-filet) du Rôdeur, marteau du Paladin : ils volent à hauteur de poitrine. */
export interface Projectile {
  id: number;
  kind: 'arrow' | 'net' | 'hammer';
  pos: Vec2;
  dir: Vec2;
  speed: number;
  /** Distance restante : la flèche tombe, le filet s'ouvre, le marteau fait demi-tour. */
  range: number;
  damage: number;
  knockback: number;
  radius: number;
  /** Ennemis déjà touchés : une flèche qui traverse, ou le marteau, ne frappe chacun qu'une fois par passage. */
  hit: Set<number>;
  pierce: boolean;
  /** Tir chargé plein : il marque ou étourdit selon les talents. */
  full: boolean;
  /** Marteau sur le chemin du retour. */
  returning: boolean;
  /** Le héros qui l'a tiré ou lancé. */
  owner: number;
}

/** Leurre de l'Écran de fumée : les yokai l'attaquent à la place du héros invisible, sans rien toucher. */
export class Decoy implements Foe {
  knockback = vec();
  readonly radius = 0.4;

  constructor(
    public pos: Vec2,
    /** Rayon du nuage, pour le rendu. */
    readonly cloud: number,
  ) {}

  isGuarding(): boolean {
    return false;
  }

  guard(): void {}

  takeHit(): boolean {
    return false;
  }
}

/** Allié tombé depuis peu (yokai vaincu, âme brisée) : le Paladin peut le relever. */
interface Grave {
  kind: EnemyKind;
  pos: Vec2;
  time: number;
}

/** Fil de Jōren laissé par une esquive : le premier ennemi qui le touche est immobilisé. */
interface Snare {
  id: number;
  pos: Vec2;
  radius: number;
  life: number;
  stun: number;
}

/**
 * État complet d'une partie. Aucune dépendance au rendu : Babylon.js lit cet état
 * et les événements émis, ce qui permettra plus tard de faire tourner la logique sur un serveur.
 */
export class World {
  /** Les héros de la partie : un seul en solo, jusqu'à trois en coop. */
  readonly players: Player[];
  enemies: Enemy[] = [];
  /** Invocateur : âmes liées qui combattent (de tous les héros), et âmes au sol prêtes à être liées. */
  summons: Summon[] = [];
  souls: Soul[] = [];
  /** Flèches du Rôdeur, marteau du Paladin. */
  projectiles: Projectile[] = [];
  stumps: Stump[] = [];
  peaches: PeachTree[] = [];
  webs: Web[] = [];
  state: 'playing' | Outcome = 'playing';
  time = 0;
  private waveIndex = -1;
  private waveTimer = 1;
  private nextId = 1;
  /** Les effets sans corps (toiles, chutes) ont des identifiants négatifs, distincts de ceux des ennemis. */
  private nextFxId = -1;
  private hazards: Hazard[] = [];

  /** Chutes annoncées en cours (les alliés joués par le bot s'en écartent). */
  get dangers(): readonly Hazard[] {
    return this.hazards;
  }
  private snares: Snare[] = [];
  /** Ennemis liés vivants (Chant des Enfers) : ils ne laissent pas d'âme au sol. */
  private readonly boundAlive = new Set<number>();
  /** Le héros qui agit en ce moment : celui dont on joue le tour, ou la proie du yokai qui joue le sien. */
  private actor: Player;
  /** Proie de chaque yokai parmi les héros, et secondes avant d'en changer. */
  private readonly prey = new Map<number, { hero: Player; t: number }>();
  /** Héros déjà signalés à terre. */
  private readonly downed = new Set<Player>();
  private graves: Grave[] = [];
  /** Invocateur : secondes avant que le compagnon de chaque héros (par place) ne se reforme. */
  private readonly companionTimers = new Map<number, number>();
  private events: GameEvent[] = [];

  /** `startWave` permet de commencer directement à une vague (tests, `?vague=7`). */
  constructor(
    readonly cfg: GameConfig,
    startWave = 0,
  ) {
    this.players = [cfg.player, ...(cfg.allies ?? [])].map((c, i) => new Player(c, i));
    this.actor = this.players[0];
    this.waveIndex = Math.max(0, Math.min(cfg.waves.length, startWave)) - 1;
  }

  /**
   * Le héros qui agit : toutes les compétences, tous les coups et tous les talents se lisent sur lui.
   * Hors du pas de simulation, c'est le premier héros (celui de ce joueur, en solo ou pour l'hôte).
   */
  get player(): Player {
    return this.actor;
  }

  /** Paladin : secondes d'Aura de lumière du héros qui agit. */
  get aura(): number {
    return this.player.aura;
  }

  /** Invocateur : secondes de Chœur spectral du héros qui agit. */
  get choir(): number {
    return this.player.choir;
  }

  /** Lame : nuage de fumée du héros qui agit. */
  get smoke(): Decoy | null {
    return this.player.smoke;
  }

  /** Héros encore debout. */
  get standing(): Player[] {
    return this.players.filter((p) => !p.dead);
  }

  /** Âmes liées du héros qui agit. */
  private get mine(): Summon[] {
    return this.summons.filter((s) => s.owner === this.actor.id);
  }

  /** Âmes liées du héros qui agit, sans son compagnon : ce sont elles que le maximum limite et que le Sacrifice consume. */
  private get bound(): Summon[] {
    return this.mine.filter((s) => !s.companion);
  }

  /** Fait agir `hero` le temps de `fn` : ses compétences, ses talents et ses âmes. */
  private act<T>(hero: Player, fn: () => T): T {
    const previous = this.actor;
    this.actor = hero;
    try {
      return fn();
    } finally {
      this.actor = previous;
    }
  }

  private hero(id: number): Player {
    return this.players[id] ?? this.players[0];
  }

  /** Le héros que poursuit ce yokai (le premier en solo, ou s'il n'en a pas encore choisi). */
  preyOf(enemyId: number): number {
    return this.prey.get(enemyId)?.hero.id ?? 0;
  }

  /** Le héros debout le plus proche de `pos`, invisible ou non (le premier si tous sont tombés). */
  nearestHero(pos: Vec2): Player {
    return closest(this.standing, pos) ?? this.players[0];
  }

  /**
   * La proie d'un yokai parmi les héros : le plus proche, revu toutes les deux secondes ou quand il tombe.
   * Les boss la poursuivent ; les autres yokai s'en servent quand ils n'ont pas de cible.
   */
  private chase(enemy: Enemy, dt: number): Player {
    if (this.players.length === 1) return this.players[0];
    const current = this.prey.get(enemy.id);
    if (current && !current.hero.dead && current.t > 0) {
      current.t -= dt;
      return current.hero;
    }
    const hero = this.nearestHero(enemy.pos);
    this.prey.set(enemy.id, { hero, t: PREY_TIME });
    return hero;
  }

  emit(event: GameEvent): void {
    this.events.push(event);
    // Les dégâts du héros qui agit (ses coups, ses âmes, ses flèches) remplissent le sang yokai du Hanyō.
    if (event.type === 'enemyHit') this.actor.dealt(event.amount, this);
  }

  drainEvents(): GameEvent[] {
    const events = this.events;
    this.events = [];
    return events;
  }

  /** Tout ce que les yokai peuvent frapper : le héros et les âmes liées relevées. */
  foes(): Foe[] {
    return [...this.standing, ...this.summons.filter((s) => s.targetable)];
  }

  /** Vrai tant que `foe` peut encore être attaqué (une âme effacée ou brisée ne l'est plus, le héros invisible non plus). */
  isFoe(foe: Foe | null): foe is Foe {
    if (foe instanceof Player) return this.players.includes(foe) && !foe.dead && foe.hidden <= 0;
    if (foe instanceof Decoy) return this.players.some((p) => p.smoke === foe && !p.dead);
    return foe instanceof Summon && foe.targetable && this.summons.includes(foe);
  }

  /**
   * La cible d'un yokai : la plus proche, entre le héros et les âmes, le héros passant devant à distance égale.
   * Avec le Masque d'Oublié, ce sont les âmes qui passent devant. Invisible, le héros est remplacé par son nuage de fumée.
   */
  pickFoe(from: Vec2): Foe {
    let best: Foe = this.players[0];
    let bestScore = Infinity;
    for (const hero of this.standing) {
      const foe = hero.hidden > 0 && hero.smoke ? hero.smoke : hero;
      const score = distance(from, foe.pos);
      if (score < bestScore) {
        best = foe;
        bestScore = score;
      }
    }
    for (const summon of this.summons) {
      if (!summon.targetable) continue;
      const pull = this.hero(summon.owner).cfg.perks?.summonTaunt ? TAUNT_PULL : 1 / HERO_PULL;
      const score = distance(from, summon.pos) / pull;
      if (score < bestScore) {
        best = summon;
        bestScore = score;
      }
    }
    return best;
  }

  /**
   * Part des dégâts qu'un yokai perd : baigné par l'Aura du Paladin (Miroir de Yata), ou sous la Marque du chasseur
   * d'un Rôdeur (panoplie de l'Éclaireur du Yomi).
   */
  dazzle(pos: Vec2, hunted = false): number {
    let best = 0;
    for (const hero of this.players) {
      const perks = hero.cfg.perks;
      if (hunted && perks?.huntMarkWeaken) best = Math.max(best, perks.huntMarkWeaken);
      const weaken = perks?.auraWeaken;
      if (!weaken || hero.aura <= 0) continue;
      if (distance(pos, hero.pos) <= hero.cfg.paladin.aura.radius) best = Math.max(best, weaken);
    }
    return best;
  }

  /** Valeur d'une malédiction du niveau de donjon (0 si elle n'est pas active). */
  curse(id: CurseId): number {
    return this.cfg.difficulty?.curses[id] ?? 0;
  }

  /** Un pas de simulation ; `input` : les commandes de chaque héros, dans l'ordre (une seule en solo). */
  update(dt: number, input: InputFrame | readonly InputFrame[]): void {
    if (this.state !== 'playing') return;
    const inputs: readonly InputFrame[] = Array.isArray(input) ? input : [input];
    this.time += dt;
    for (const hero of this.players) {
      // Le compagnon ne compte pas : il n'affaiblit pas l'Invocateur.
      hero.summonCount = this.summons.filter((s) => s.owner === hero.id && !s.companion).length;
      if (!hero.dead) this.act(hero, () => hero.update(dt, inputs[hero.id] ?? idleInput(hero), this));
    }
    // « Hâte des morts » : le temps des yokai passe plus vite.
    const haste = 1 + this.curse('hate');
    // Copie : un ennemi peut en faire apparaître d'autres pendant son tour (araignées, feux follets).
    for (const enemy of [...this.enemies]) this.act(this.chase(enemy, dt * haste), () => enemy.update(dt * haste, this));
    for (const hero of this.players) {
      hero.choir = Math.max(0, hero.choir - dt);
      if (hero.smoke && hero.hidden <= 0) hero.smoke = null;
    }
    for (const summon of this.summons) this.act(this.hero(summon.owner), () => summon.update(dt, this));
    for (const summon of this.summons.filter((s) => s.gone)) this.dismiss(summon);
    this.updateCompanions(dt);
    for (const hero of this.players) this.act(hero, () => this.updateAura(dt));
    this.updateProjectiles(dt);
    this.regenerate(dt);
    this.updateHazards(dt);
    this.updateWebs(dt);
    this.updateSnares(dt);
    this.updatePeaches(dt);
    this.separate();
    this.clearBossMinions();
    const fallen = this.enemies.filter((e) => e.dead);
    this.enemies = this.enemies.filter((e) => !e.dead);
    for (const enemy of fallen) this.prey.delete(enemy.id);
    this.releaseWisps(fallen);
    this.leaveSouls(fallen);
    for (const hero of this.players) this.act(hero, () => this.afterKills(fallen));
    this.forgetGraves();
    this.updateSouls(dt);
    this.updateFallen(dt);
    if (this.players.every((p) => p.dead)) {
      this.finish('defeat');
      return;
    }
    this.updateWaves(dt);
  }

  /**
   * Coop : un héros à terre attend qu'un allié reste à côté de lui pour se relever. Seul, un héros
   * qui tombe perd la partie (plus haut) ; à plusieurs, seulement quand tous sont à terre.
   */
  private updateFallen(dt: number): void {
    for (const hero of this.players) {
      if (!hero.dead) continue;
      if (hero.revive === 0 && !this.downed.has(hero)) {
        this.downed.add(hero);
        // À terre, son Aura et sa fumée se dissipent ; ses âmes, elles, continuent le combat.
        hero.aura = 0;
        hero.smoke = null;
        if (this.players.length > 1) this.emit({ type: 'heroDown', hero: hero.id, pos: { ...hero.pos } });
      }
      if (hero.gone) continue;
      const helped = this.standing.some((ally) => distance(ally.pos, hero.pos) <= REVIVE_RANGE + ally.radius);
      hero.revive = helped ? hero.revive + dt : Math.max(0, hero.revive - dt / 2);
      if (hero.revive >= REVIVE_TIME) this.reviveHero(hero, REVIVE_HP);
    }
  }

  /** Coop : le joueur de ce héros est parti. Son héros tombe et ne se relève plus. */
  retire(id: number): void {
    const hero = this.players[id];
    if (!hero || hero.gone) return;
    hero.gone = true;
    hero.hp = 0;
    hero.revive = 0;
  }

  /** Relève un héros à terre avec une part de ses PV. */
  private reviveHero(hero: Player, share: number): void {
    hero.hp = hero.cfg.maxHp * share;
    hero.revive = 0;
    hero.invulnerable = Math.max(hero.invulnerable, 1.5);
    this.downed.delete(hero);
    this.emit({ type: 'heroRevived', hero: hero.id, pos: { ...hero.pos } });
    this.emit({ type: 'heal', id: 0, pos: { ...hero.pos }, amount: hero.hp });
  }

  /**
   * Coup d'arme : touche une seule fois chaque ennemi dans la forme de l'arme, tournée vers la souris :
   * un arc de `attack.arcDeg` degrés (360 : tout autour du héros), ou un estoc (`line`), couloir droit
   * de `attack.width` de large. Un repère au sol montre cette forme avant le coup.
   * `crit` : multiplicateur de critique du coup (Lame).
   */
  strike(origin: Vec2, dir: Vec2, alreadyHit: Set<number>, crit = 1): void {
    const attack = this.player.cfg.attack;
    // `enemies` peut contenir des morts du pas en cours : `targetable` les écarte.
    const thrust = attack.shape === 'line';
    const fullCircle = !thrust && attack.arcDeg >= 360;
    const halfArc = degToRad(attack.arcDeg / 2);
    const tip = add(origin, scale(dir, attack.range));
    this.shakePeaches(thrust ? add(origin, scale(dir, attack.range / 2)) : origin, thrust ? attack.range / 2 : attack.range);
    for (const enemy of this.enemies) {
      if (!enemy.targetable || alreadyHit.has(enemy.id)) continue;
      const toEnemy = sub(enemy.pos, origin);
      const dist = length(toEnemy);
      if (thrust) {
        if (dot(toEnemy, dir) < -enemy.radius || distanceToSegment(enemy.pos, origin, tip) > enemy.radius + (attack.width ?? 0.8) / 2) continue;
      } else {
        if (dist - enemy.radius > attack.range) continue;
        // Un ennemi collé au joueur est touché même s'il déborde de l'arc.
        if (!fullCircle && dist > enemy.radius + 0.2 && !inCone(dir, normalize(toEnemy), halfArc)) continue;
      }
      alreadyHit.add(enemy.id);
      const shielded = this.weaponHit(enemy, attack.damage, origin, attack.knockback, crit);
      if (shielded) this.player.knockback = scale(dir, -4);
    }
  }

  /**
   * Tout coup d'arme porté à un ennemi (lame, flèche, Danse des lames) : critiques, rage, foudre, sang yokai.
   * `crit` : multiplicateur de critique déjà acquis (embuscade, après une esquive) ; une marque de la Lame le rend critique.
   * Renvoie vrai si la carapace a arrêté le coup.
   */
  private weaponHit(enemy: Enemy, base: number, from: Vec2, knockback: number, crit: number): boolean {
    const player = this.player;
    const perks = player.cfg.perks ?? {};
    // Une marque de la Lame, ou un yokai à l'agonie avec l'Encre de Shinigami, rend le coup critique.
    const marked = enemy.marks.death > 0 || enemy.marks.shadow > 0 || enemy.hp < enemy.maxHp * (perks.finisher ?? 0);
    let factor = marked ? Math.max(crit, player.cfg.blade.critFactor) : crit;
    // Coup de grâce (Hachiman) : la proie marquée du Rôdeur, à bout de forces, prend des critiques.
    const grace = perks.coupDeGrace;
    if (grace && enemy.marks.hunt > 0 && enemy.hp < enemy.maxHp * grace.threshold) factor = Math.max(factor, grace.factor);
    // « Écorce des kodama » : seuls les coups d'arme sont amoindris.
    let amount = base * factor * player.damageMultiplier() * (1 - this.curse('ecorce'));
    const execute = perks.execute;
    if (execute && enemy.hp < enemy.maxHp * execute.threshold) amount *= 1 + execute.bonus;
    const shielded = enemy.receiveHit({ amount, from, knockback, crit: factor > 1 }, this);
    if (!shielded) player.gainFervor(player.cfg.paladin.judgement.perHit);
    if (factor > 1 && perks.critHeal) player.heal(perks.critHeal, this);
    // Tsuba ébréchée : chaque critique rapproche la prochaine Marque de mort.
    if (factor > 1 && perks.critMarkRefund) player.deathMarkCooldown = Math.max(0, player.deathMarkCooldown - perks.critMarkRefund);
    // La marque d'ombre part au premier coup ; sur un ennemi abattu, elle reste pour Marée d'ombre.
    if (!enemy.dead) enemy.marks.shadow = 0;
    const rage = player.cfg.attack.rageOnHit * (perks.hitRageFactor ?? 1);
    // Colère de la tempête : à rage pleine, chaque coup appelle la foudre de Susanoo.
    const storm = perks.storm && player.rage >= player.cfg.rageMax - 0.5;
    player.gainRage(shielded ? rage / 2 : rage);
    if (storm && !enemy.dead) {
      this.emit({ type: 'lightning', pos: { ...enemy.pos } });
      enemy.receiveHit({ amount: perks.storm ?? 0, from, knockback: 1, ignoreShell: true }, this);
    }
    // Fils de Zeus : un coup sur quelques-uns appelle la foudre (le sang du Hanyō, lui, monte dans `emit`).
    const bolt = player.landHit();
    if (bolt && !enemy.dead) {
      this.emit({ type: 'lightning', pos: { ...enemy.pos } });
      enemy.receiveHit({ amount: bolt, from, knockback: 1, ignoreShell: true }, this);
    }
    if (enemy.dead) player.onKill();
    if (enemy.kind === 'hitodama') this.igniteNear(enemy.pos);
    return shielded;
  }

  /** Frappe fracassante : dégâts de zone qui ignorent la carapace et étourdissent. `full` : lancée à rage pleine. */
  smash(center: Vec2, full = false): void {
    const smash = this.player.cfg.smash;
    this.emit({ type: 'smash', pos: center, radius: smash.radius });
    this.shakePeaches(center, smash.radius);
    let struck = false;
    for (const enemy of this.enemies) {
      if (!enemy.targetable || distance(enemy.pos, center) - enemy.radius > smash.radius) continue;
      struck = true;
      enemy.receiveHit({ amount: smash.damage * this.player.damageMultiplier(), from: center, knockback: smash.knockback, ignoreShell: true }, this);
      if (!enemy.dead) {
        // Seul étourdissement des héros, et il reste bref ; les objets ajoutent un ralentissement qui le suit.
        enemy.stun(Math.min(SMASH_STUN_MAX, smash.stun), 'smash', this);
        const trail = this.player.cfg.perks?.smashSlow;
        if (trail) enemy.slow(trail.amount, trail.duration, this);
      }
      else this.player.onKill();
      if (enemy.kind === 'hitodama') this.igniteNear(enemy.pos);
    }
    // Le Guerrier se soigne en dépensant sa rage, pourvu que la Frappe porte ; deux fois plus à rage pleine avec la Gourde.
    const gourde = full ? (this.player.cfg.perks?.gourde?.smashHeal ?? 1) : 1;
    if (struck && smash.heal) this.player.heal(this.player.cfg.maxHp * smash.heal * gourde, this);
  }

  /** Atterrissage du Bond : dégâts de zone autour du héros, étourdissement avec le talent d'Héraclès. */
  bondLand(center: Vec2): void {
    const bond = this.player.cfg.bond;
    this.emit({ type: 'bondLand', pos: { ...center }, radius: bond.radius });
    this.shakePeaches(center, bond.radius);
    for (const enemy of this.enemies) {
      if (!enemy.targetable || distance(enemy.pos, center) - enemy.radius > bond.radius) continue;
      enemy.receiveHit({ amount: bond.damage * this.player.damageMultiplier(), from: center, knockback: bond.knockback }, this);
      if (enemy.dead) this.player.onKill();
      else if (bond.slow > 0) enemy.slow(BOND_SLOW, bond.slow, this);
      if (enemy.kind === 'hitodama') this.igniteNear(enemy.pos);
    }
  }

  // --- Invocateur -------------------------------------------------------------

  /** Clic droit : lie l'âme au sol la plus proche de la souris, à portée du héros. */
  bind(aim: Vec2): void {
    const player = this.player;
    const cfg = player.cfg.summon;
    const inReach = (pos: Vec2) => distance(pos, player.pos) <= cfg.bindRange;
    const soul = closest(this.souls.filter((s) => inReach(s.pos)), aim);
    if (soul) {
      this.removeSoul(soul);
      this.raise(soul.kind, soul.pos);
      return;
    }
    // Chant des Enfers : un ennemi presque vaincu (jamais le boss) se lie sans mourir.
    const song = player.cfg.perks?.underworldSong;
    const prey = song ? closest(this.enemies.filter((e) => e.targetable && !e.boss && e.hp <= e.maxHp * song && inReach(e.pos)), aim) : undefined;
    if (prey) {
      this.boundAlive.add(prey.id);
      prey.hp = 0;
      this.emit({ type: 'death', id: prey.id, pos: { ...prey.pos }, kind: prey.kind });
      player.onKill();
      this.raise(prey.kind, prey.pos);
      return;
    }
    this.emit({ type: 'bindFail', pos: { ...player.pos } });
  }

  /** Vrai si une âme au sol est à portée de Lier (le HUD la signale). */
  get soulInReach(): boolean {
    return this.soulNear(this.player);
  }

  /** Vrai si une âme au sol est à portée de Lier pour `hero`. */
  soulNear(hero: Player): boolean {
    return this.souls.some((s) => distance(s.pos, hero.pos) <= hero.cfg.summon.bindRange);
  }

  /** A : toutes les âmes foncent sur l'ennemi le plus proche de la souris. Faux s'il n'y a personne à envoyer. */
  recall(aim: Vec2): boolean {
    const target = closest(this.enemies.filter((e) => e.targetable), aim);
    const mine = this.mine;
    if (!mine.length || !target) return false;
    for (const summon of mine) summon.rush = { target: target.id, t: this.player.cfg.summon.recall.duration };
    this.emit({ type: 'recall', pos: { ...target.pos } });
    return true;
  }

  /** E : la plus vieille âme explose. */
  sacrifice(): boolean {
    const summon = this.bound[0];
    if (!summon) return false;
    const player = this.player;
    const cfg = player.cfg.summon.sacrifice;
    const perks = player.cfg.perks ?? {};
    this.dismiss(summon);
    const center = summon.pos;
    this.emit({ type: 'sacrifice', pos: { ...center }, radius: cfg.radius });
    const amount = cfg.damage * (perks.summonDamageFactor ?? 1);
    for (const enemy of this.enemies) {
      if (!enemy.targetable || distance(enemy.pos, center) - enemy.radius > cfg.radius) continue;
      // Le Jugement : un poids selon les PV de la cible, allégé pour un boss.
      const judged = perks.judgement ? enemy.maxHp * perks.judgement * (enemy.boss ? 1 / 3 : 1) : 0;
      enemy.receiveHit({ amount: amount + judged, from: center, knockback: 6, ignoreShell: true }, this);
      if (enemy.dead) player.onKill();
      if (enemy.kind === 'hitodama') this.igniteNear(enemy.pos);
    }
    if (perks.sacrificeHeal) player.heal(perks.sacrificeHeal, this);
    if (perks.sacrificeSoul) this.addSoul(summon.kind, center);
    return true;
  }

  /** R : les âmes frappent plus fort et plus vite un moment. */
  chorus(): boolean {
    if (!this.mine.length) return false;
    const player = this.player;
    const cfg = player.cfg.summon.choir;
    const perks = player.cfg.perks ?? {};
    player.choir = cfg.duration;
    this.emit({ type: 'choir', pos: { ...player.pos }, radius: cfg.radius });
    if (perks.choirHeal) player.heal(perks.choirHeal, this);
    if (perks.choirStun) {
      for (const enemy of this.enemies) {
        if (enemy.targetable && distance(enemy.pos, player.pos) <= cfg.radius + enemy.radius) enemy.slow(0.5, perks.choirStun, this);
      }
    }
    return true;
  }

  /** Coup d'une âme liée ; `factor` vaut plus de 1 pendant un Rappel. */
  summonHit(summon: Summon, target: Enemy, factor: number, ranged = false): void {
    const player = this.player;
    const cfg = player.cfg.summon;
    const perks = player.cfg.perks ?? {};
    // Les Douze Shikigami : le feu follet brûle plus fort, l'Oublié étourdit, le kodama soigne le héros.
    const trait = perks.shikigami || summon.companion ? summon.kind : null;
    const fire = trait === 'hitodama' ? 1.5 : 1;
    const choir = this.choir > 0 ? cfg.choir.damageFactor : 1;
    // Affinités : les âmes de l'Einherjar partagent sa rage, celles du Hanyō transformé son sang yokai.
    const fury = perks.soulsFury ? 1 + (perks.einherjarRage ?? 0) * (1 - player.hp / player.cfg.maxHp) : 1;
    const blood = perks.yokaiSouls && player.transformed > 0 ? 1 + (perks.yokaiBlood?.damage ?? 0) : 1;
    const amount = cfg.damage * summon.damageFactor * fire * factor * choir * fury * blood * (perks.summonDamageFactor ?? 1);
    if (ranged) this.emit({ type: 'lightning', pos: { ...target.pos } });
    else this.emit({ type: 'swing', pos: { ...summon.pos }, dir: summon.facing, range: cfg.attackRange + summon.radius, arcDeg: 90 });
    target.receiveHit({ amount, from: summon.pos, knockback: cfg.knockback }, this);
    if (target.dead) player.onKill();
    else {
      const stun = Math.max(perks.summonStun ?? 0, trait === 'oublie' ? 1 : 0);
      if (stun) target.slow(0.4, stun, this);
    }
    if (trait === 'kodama') player.heal(2, this);
    // L'Invocateur récupère une part des dégâts de ses âmes.
    if (cfg.leech) player.leech(amount * cfg.leech, this);
    if (target.kind === 'hitodama') this.igniteNear(target.pos);
  }

  /** Lève une âme alliée ; `holy` : un allié relevé par le Paladin, qui a sa propre robustesse. */
  private raise(kind: EnemyKind, pos: Vec2, holy = false): Summon {
    const player = this.player;
    const cfg = player.cfg.summon;
    const perks = player.cfg.perks ?? {};
    // Au-delà du maximum, la plus vieille âme laisse sa place (le compagnon, lui, ne compte pas).
    while (this.bound.length >= Math.max(1, cfg.max)) this.dismiss(this.bound[0]);
    // Les Douze Shikigami : un kappa lié garde sa carapace, deux fois plus de PV et de durée.
    const tough = perks.shikigami && (kind === 'kappa' || kind === 'kappaRenforce') ? 2 : 1;
    const summon = new Summon(this.nextId++, kind, { ...pos }, cfg, holy ? (perks.raiseToughness ?? 1) : tough, holy);
    summon.owner = player.id;
    this.summons.push(summon);
    if (!holy) this.emit({ type: 'bind', id: summon.id, pos: { ...pos }, kind });
    return summon;
  }

  private dismiss(summon: Summon): void {
    this.summons = this.summons.filter((s) => s !== summon);
    // Le compagnon détruit se reforme un peu plus tard.
    if (summon.companion) this.companionTimers.set(summon.owner, this.hero(summon.owner).cfg.summon.companion?.respawn ?? 0);
    // Une âme brisée par les yokai peut être relevée par un Paladin.
    if (summon.broken) this.graves.push({ kind: summon.kind, pos: { ...summon.pos }, time: this.time });
    this.emit({ type: 'summonFade', id: summon.id, pos: { ...summon.pos }, broken: summon.broken });
  }

  /** Invocateur : le compagnon se lève au début de la descente, et se reforme après avoir été détruit. */
  private updateCompanions(dt: number): void {
    for (const hero of this.standing) {
      const companion = hero.cfg.summon.companion;
      if (!companion || this.summons.some((s) => s.owner === hero.id && s.companion)) continue;
      const left = (this.companionTimers.get(hero.id) ?? 0) - dt;
      this.companionTimers.set(hero.id, left);
      if (left > 0) continue;
      const pos = add(hero.pos, scale(hero.facing, -1.2));
      this.clampToArena(pos, hero.cfg.summon.radius);
      const summon = new Summon(this.nextId++, companion.kind, pos, hero.cfg.summon, 1, false, companion);
      summon.owner = hero.id;
      this.summons.push(summon);
      this.emit({ type: 'bind', id: summon.id, pos: { ...pos }, kind: companion.kind });
    }
  }

  private addSoul(kind: EnemyKind, pos: Vec2): void {
    const soul = { id: this.nextFxId--, pos: { ...pos }, kind, life: this.player.cfg.summon.soulLife };
    this.souls.push(soul);
    this.emit({ type: 'soulSet', id: soul.id, pos: soul.pos });
  }

  private removeSoul(soul: Soul): void {
    this.souls = this.souls.filter((s) => s !== soul);
    this.emit({ type: 'soulEnd', id: soul.id });
  }

  private updateSouls(dt: number): void {
    for (const soul of [...this.souls]) {
      soul.life -= dt;
      if (soul.life <= 0) this.removeSoul(soul);
    }
  }

  /** Chez l'Invocateur, chaque yokai vaincu laisse son âme au sol, sauf quand le boss tombe. */
  private leaveSouls(fallen: Enemy[]): void {
    const binder = this.players.find((p) => p.cfg.kit === 'invocateur');
    if (!binder || fallen.some((e) => e.boss)) return;
    this.act(binder, () => {
      for (const enemy of fallen) {
        if (!this.boundAlive.delete(enemy.id)) this.addSoul(enemy.kind, enemy.pos);
      }
    });
  }

  // --- Lame ------------------------------------------------------------------

  /** Pas de l'ombre : marque les ennemis que le héros traverse (leur prochain coup d'arme reçu sera critique). */
  shadowMark(pos: Vec2, marked: Set<number>): void {
    const player = this.player;
    const cut = player.cfg.perks?.dashDamage;
    for (const enemy of this.enemies) {
      if (!enemy.targetable || marked.has(enemy.id) || distance(enemy.pos, pos) > enemy.radius + player.radius + 0.3) continue;
      marked.add(enemy.id);
      this.markEnemy(enemy, 'shadow', player.cfg.blade.shadowDash.markTime);
      // Croissant : la lame entaille au passage.
      if (cut) {
        enemy.receiveHit({ amount: cut * player.damageMultiplier(), from: pos, knockback: 1, ignoreShell: true }, this);
        if (enemy.dead) player.onKill();
      }
    }
  }

  /** A : Marque de mort sur l'ennemi le plus proche de la souris, à portée du héros. Faux s'il n'y a personne. */
  deathMark(aim: Vec2): boolean {
    const cfg = this.player.cfg.blade.deathMark;
    const target = closest(this.enemies.filter((e) => e.targetable && distance(e.pos, this.player.pos) <= cfg.range), aim);
    if (!target) return false;
    this.markEnemy(target, 'death', cfg.duration);
    return true;
  }

  /** Oushebti rôdeur : la carapace éclatée laisse une statuette d'argile ; les yokai s'en prennent à elle un moment. */
  clayDecoy(hero: Player, seconds: number): void {
    hero.smoke = new Decoy({ ...hero.pos }, 1);
    hero.hidden = Math.max(hero.hidden, seconds);
    this.emit({ type: 'smoke', pos: { ...hero.pos }, radius: 1 });
  }

  /** E : Écran de fumée. Le nuage reste là où était le héros ; les yokai s'en prennent à lui tant que le héros est invisible. */
  smokeScreen(): void {
    const player = this.player;
    const cfg = player.cfg.blade.smoke;
    player.smoke = new Decoy({ ...player.pos }, cfg.radius);
    this.emit({ type: 'smoke', pos: { ...player.pos }, radius: cfg.radius });
    // Kemuri-dama : la fumée rend un peu de vie.
    const heal = player.cfg.perks?.smokeHeal;
    if (heal) player.heal(player.cfg.maxHp * heal, this);
    // Poudre aux yeux : la fumée étourdit ceux qui étaient tout près.
    const stun = player.cfg.perks?.smokeStun;
    if (!stun) return;
    for (const enemy of this.enemies) {
      if (enemy.targetable && distance(enemy.pos, player.pos) <= cfg.radius + enemy.radius) enemy.slow(0.6, stun, this);
    }
  }

  /** R : cibles de la Danse des lames, de proche en proche : la plus proche du héros, puis la plus proche de chacune. */
  danceTargets(): Enemy[] {
    const cfg = this.player.cfg.blade.dance;
    const chosen: Enemy[] = [];
    let from = this.player.pos;
    while (chosen.length < cfg.targets) {
      const next = closest(this.enemies.filter((e) => e.targetable && !chosen.includes(e) && distance(e.pos, from) <= cfg.range), from);
      if (!next) break;
      chosen.push(next);
      from = next.pos;
    }
    return chosen;
  }

  /**
   * Un pas de la Danse des lames : le héros surgit derrière sa cible et la frappe. Renvoie où il arrive,
   * ou null si la cible n'est plus là.
   */
  danceStrike(id: number, from: Vec2): Vec2 | null {
    const enemy = this.enemies.find((e) => e.id === id && e.targetable);
    if (!enemy) return null;
    const player = this.player;
    const dir = normalize(sub(enemy.pos, from), player.facing);
    const to = add(enemy.pos, scale(dir, enemy.radius + player.radius + 0.1));
    this.clampToArena(to, player.radius);
    this.emit({ type: 'streak', from: { ...from }, to: { ...to } });
    this.emit({ type: 'swing', pos: { ...to }, dir: scale(dir, -1), range: enemy.radius + 1.2, arcDeg: 120 });
    this.weaponHit(enemy, player.cfg.blade.dance.damage, to, 3, 1);
    return to;
  }

  private markEnemy(enemy: Enemy, mark: MarkKind, duration: number): void {
    enemy.marks[mark] = Math.max(enemy.marks[mark], duration);
    this.emit({ type: 'mark', id: enemy.id, pos: { ...enemy.pos }, mark });
  }

  /** Talents qui réagissent à la mort d'un ennemi, quelle qu'en soit la cause ; et les tombes que Relever peut rouvrir. */
  private afterKills(fallen: Enemy[]): void {
    const player = this.player;
    const perks = player.cfg.perks ?? {};
    for (const enemy of fallen) {
      if (!enemy.boss && player === this.players[0]) this.graves.push({ kind: enemy.kind, pos: { ...enemy.pos }, time: this.time });
      // Marée d'ombre : un ennemi marqué abattu rend une charge du Pas de l'ombre ; Festin de l'ombre, des PV.
      const marked = enemy.marks.shadow > 0 || enemy.marks.death > 0;
      if (perks.dashRefund && marked) player.refundDash();
      if (perks.markKillHeal && marked) player.heal(perks.markKillHeal, this);
      // Moisson des âmes : la Marque de mort passe à l'ennemi le plus proche.
      if (perks.markJump && enemy.marks.death > 0 && !enemy.boss) {
        const range = player.cfg.blade.deathMark.range;
        const next = closest(this.enemies.filter((e) => e.targetable && distance(e.pos, enemy.pos) <= range), enemy.pos);
        if (next) this.markEnemy(next, 'death', enemy.marks.death);
      }
      // Curée : abattre la proie marquée recharge la Marque du chasseur. Et le Rôdeur se soigne sur sa proie.
      if (perks.markRefund && enemy.marks.hunt > 0) player.huntCooldown = 0;
      if (player.cfg.kit === 'rodeur' && enemy.marks.hunt > 0) player.heal(player.cfg.maxHp * player.cfg.ranger.huntMark.killHeal, this);
      // Métamorphe : chaque ennemi tué pendant l'invisibilité la prolonge, jusqu'à `maxHidden` s d'invisibilité en tout par nuage.
      if (perks.smokeKillExtend && player.hidden > 0) {
        const extra = Math.min(perks.smokeKillExtend, player.cfg.blade.smoke.maxHidden - player.cfg.blade.smoke.duration - player.smokeExtended);
        if (extra > 0) {
          player.hidden += extra;
          player.smokeExtended += extra;
        }
      }
    }
  }

  /** Relever ne rouvre que les tombes récentes. */
  private forgetGraves(): void {
    const memory = Math.max(...this.players.map((p) => p.cfg.paladin.raise.memory));
    this.graves = this.graves.filter((g) => this.time - g.time <= memory);
  }

  // --- Paladin ---------------------------------------------------------------

  /** A : Aura de lumière autour du héros. */
  startAura(): void {
    const player = this.player;
    const cfg = player.cfg.paladin.aura;
    player.aura = cfg.duration;
    player.auraTick = 0;
    player.auraStunned.clear();
    this.emit({ type: 'aura', pos: { ...this.player.pos }, radius: cfg.radius });
  }

  /**
   * L'Aura suit le héros. Chaque seconde, elle soigne ses alliés et brûle les yokai (Chaleur) ;
   * un yokai qui y entre est étourdi une fois (Ama-no-Iwato).
   */
  private updateAura(dt: number): void {
    const player = this.player;
    if (player.aura <= 0) return;
    const cfg = player.cfg.paladin.aura;
    const perks = player.cfg.perks ?? {};
    player.aura = Math.max(0, player.aura - dt);
    const inside = this.enemies.filter((e) => e.targetable && distance(e.pos, player.pos) <= cfg.radius + e.radius);
    if (perks.auraStun) {
      for (const enemy of inside.filter((e) => !player.auraStunned.has(e.id))) {
        player.auraStunned.add(enemy.id);
        enemy.slow(0.5, perks.auraStun, this);
      }
    }
    player.auraTick -= dt;
    // Un soin par seconde, le premier dès l'activation : six pour une Aura de 6 s.
    if (player.auraTick > 0 || player.aura <= 0) return;
    player.auraTick = 1;
    const healed = this.healAllies(player.pos, cfg.radius, cfg.heal, player);
    // Encensoir du moine : les PV rendus renforcent le prochain Marteau.
    const censer = perks.censer;
    if (censer) player.censer = Math.min(player.censer + healed * censer.perHp, player.cfg.paladin.hammer.damage * censer.max);
    // Chaleur (talent) ; Hanyō paladin transformé : l'Aura brûle aussi.
    const burn = (perks.auraBurn ?? 0) + (player.transformed > 0 ? (perks.yokaiAuraBurn ?? 0) : 0);
    if (!burn) return;
    for (const enemy of inside) {
      enemy.receiveHit({ amount: burn * player.damageMultiplier(), from: player.pos, knockback: 0, ignoreShell: true }, this);
      if (enemy.dead) player.onKill();
    }
  }

  /**
   * Soigne les héros debout et les âmes alliées autour de `center` (Aura, bouclier du Paladin). Le Paladin qui soigne
   * (`healer`) n'en reçoit qu'une part : il soigne mieux les autres que lui-même.
   */
  healAllies(center: Vec2, radius: number, amount: number, healer?: Player): number {
    let healed = 0;
    for (const hero of this.standing) {
      const shares = hero.cfg.paladin.selfHeal;
      const share = hero === healer ? (shares[Math.min(this.players.length, shares.length) - 1] ?? 1) : 1;
      if (distance(hero.pos, center) <= radius + hero.radius) healed += hero.heal(amount * share, this);
    }
    for (const summon of this.summons) {
      if (distance(summon.pos, center) <= radius + summon.radius) healed += summon.heal(amount, this);
    }
    return healed;
  }

  /** Sōhei : la garde brisée du Paladin libère une onde qui repousse et étourdit les yokai autour de lui. */
  guardNova(center: Vec2, cfg: { radius: number; stun: number; knockback: number }): void {
    this.emit({ type: 'guardNova', pos: { ...center }, radius: cfg.radius });
    for (const enemy of this.enemies) {
      if (!enemy.targetable || distance(enemy.pos, center) - enemy.radius > cfg.radius) continue;
      enemy.knockback = add(enemy.knockback, scale(normalize(sub(enemy.pos, center)), cfg.knockback));
      enemy.slow(0.5, cfg.stun, this);
    }
  }

  /** Jugement du Paladin : une onde sacrée qui frappe autour de `center`, ignore les carapaces et le soigne. */
  judgement(center: Vec2): void {
    const player = this.player;
    const cfg = player.cfg.paladin.judgement;
    this.emit({ type: 'guardNova', pos: { ...center }, radius: cfg.radius });
    for (const enemy of this.enemies) {
      if (!enemy.targetable || distance(enemy.pos, center) - enemy.radius > cfg.radius) continue;
      enemy.receiveHit({ amount: cfg.damage * player.damageMultiplier(), from: center, knockback: 5, ignoreShell: true }, this);
      if (enemy.dead) player.onKill();
      if (enemy.kind === 'hitodama') this.igniteNear(enemy.pos);
    }
    player.heal(player.cfg.maxHp * cfg.heal, this);
  }

  /** Le marteau du Paladin est en vol : on ne peut pas le relancer. */
  get hammerOut(): boolean {
    return this.hammerOutOf(this.player);
  }

  hammerOutOf(hero: Player): boolean {
    return this.projectiles.some((p) => p.kind === 'hammer' && p.owner === hero.id);
  }

  /** E : le marteau part vers la souris puis revient au héros, en frappant à l'aller et au retour. */
  throwHammer(dir: Vec2): boolean {
    if (this.hammerOut) return false;
    const cfg = this.player.cfg.paladin.hammer;
    // Encensoir du moine : le marteau emporte les soins de l'Aura.
    const damage = cfg.damage + this.player.censer;
    this.player.censer = 0;
    this.launch('hammer', dir, { speed: cfg.speed, range: cfg.range, damage, knockback: cfg.knockback, radius: cfg.radius, pierce: true });
    return true;
  }

  /** Vrai si Relever a quelqu'un à relever (le HUD le signale). */
  get graveInReach(): boolean {
    return this.graveNear(this.player);
  }

  /** Vrai si `hero` a quelqu'un à relever : un allié tombé depuis peu, ou un héros à terre. */
  graveNear(hero: Player): boolean {
    const range = hero.cfg.paladin.raise.range;
    const near = (pos: Vec2) => distance(pos, hero.pos) <= range;
    return this.graves.some((g) => near(g.pos)) || this.players.some((p) => p.dead && !p.gone && near(p.pos));
  }

  /** R : Relever. Les alliés tombés le plus récemment près du héros se relèvent en âmes de lumière. Faux s'il n'y a personne. */
  relever(): boolean {
    const player = this.player;
    const range = player.cfg.paladin.raise.range;
    const perks = player.cfg.perks ?? {};
    // Un héros à terre passe avant tout : Relever le remet debout avec la moitié de ses PV.
    const fallen = this.players.find((p) => p.dead && !p.gone && distance(p.pos, player.pos) <= range);
    if (fallen) {
      this.reviveHero(fallen, 0.5);
      this.emit({ type: 'raise', id: -1, pos: { ...fallen.pos } });
      if (perks.raiseHeal) player.heal(perks.raiseHeal, this);
      return true;
    }
    const chosen = this.graves
      .filter((g) => distance(g.pos, player.pos) <= range)
      .sort((a, b) => b.time - a.time)
      .slice(0, perks.raiseCount ?? 1);
    if (!chosen.length) {
      this.emit({ type: 'raiseFail', pos: { ...player.pos } });
      return false;
    }
    this.graves = this.graves.filter((g) => !chosen.includes(g));
    for (const grave of chosen) {
      const summon = this.raise(grave.kind, grave.pos, true);
      this.emit({ type: 'raise', id: summon.id, pos: { ...grave.pos } });
    }
    if (perks.raiseHeal) player.heal(perks.raiseHeal, this);
    return true;
  }

  // --- Rôdeur ----------------------------------------------------------------

  /**
   * Tire une flèche depuis le héros. `charge` : absent pour un tir simple, de 0 à 1 pour un tir chargé.
   * Un tir chargé plein traverse (tag Rôdeur) et, avec Carquois divin, part en plusieurs flèches.
   */
  loose(dir: Vec2, charge?: number): void {
    const player = this.player;
    const { attack, ranger } = player.cfg;
    const perks = player.cfg.perks ?? {};
    const k = charge ?? 0;
    const full = charge !== undefined && k >= 1;
    const power = charge === undefined ? 1 : mix(ranger.charged.minFactor, ranger.charged.maxFactor, k) * (perks.chargedDamage ?? 1);
    const count = full && perks.splitShot ? perks.splitShot : 1;
    // Les flèches d'un tir divisé partagent leurs cibles : chacune touche un ennemi différent.
    const hit = new Set<number>();
    for (let i = 0; i < count; i++) {
      const angle = angleOf(dir) + degToRad(10) * (i - (count - 1) / 2);
      this.launch('arrow', fromAngle(angle), {
        speed: ranger.arrow.speed * mix(1, ranger.charged.speedFactor, k),
        range: attack.range * mix(1, ranger.charged.rangeFactor, k),
        damage: attack.damage * power,
        knockback: attack.knockback * (full ? 2 : 1),
        radius: ranger.arrow.radius,
        // Einherjar rôdeur : près de la mort, toutes les flèches transpercent.
        pierce: Boolean(perks.arrowPierce) || (full && Boolean(perks.chargedPierce)) || (perks.lowHpPierce !== undefined && player.hp < player.cfg.maxHp * perks.lowHpPierce),
        full,
        hit,
      });
    }
    if (full) this.emit({ type: 'loose', pos: { ...player.pos }, full });
  }

  /** Recul : une volée de flèches en éventail vers la souris. */
  volley(dir: Vec2): void {
    const cfg = this.player.cfg.ranger.leap;
    for (let i = 0; i < cfg.arrows; i++) {
      const offset = cfg.arrows > 1 ? (i / (cfg.arrows - 1) - 0.5) * cfg.spreadDeg : 0;
      this.loose(fromAngle(angleOf(dir) + degToRad(offset)));
    }
  }

  /** A : la flèche-filet s'ouvre sur le premier ennemi touché, ou au bout de sa course. */
  netArrow(dir: Vec2): void {
    const { ranger } = this.player.cfg;
    this.launch('net', dir, { speed: ranger.arrow.speed * 0.8, range: ranger.net.range, damage: 0, knockback: 0, radius: 0.35, pierce: false });
  }

  /** Le filet s'ouvre : les ennemis autour sont immobilisés, un boss deux fois moins longtemps. */
  netBurst(pos: Vec2, silk?: { amount: number; duration: number }): void {
    const cfg = this.player.cfg.ranger.net;
    this.emit({ type: 'netBurst', pos: { ...pos }, radius: cfg.radius });
    for (const enemy of this.enemies) {
      if (!enemy.targetable || distance(enemy.pos, pos) > cfg.radius + enemy.radius) continue;
      // La soie de l'Arc de soie ne fait que ralentir : seul le filet du Rôdeur immobilise.
      if (silk) enemy.slow(silk.amount, silk.duration, this);
      else this.immobilize(enemy, enemy.boss ? cfg.stun / 2 : cfg.stun, 'net');
    }
  }

  /**
   * Immobilisation par un filet, un fil de Jōren, la soie des âmes ou un tir étourdissant : après elle, le yokai y
   * échappe pendant `IMMOBILIZE_RESPITE` secondes. Renvoie faux s'il y échappe encore.
   */
  immobilize(enemy: Enemy, duration: number, reason: StunReason): boolean {
    if (enemy.bindImmunity > 0) return false;
    enemy.stun(duration, reason, this);
    enemy.bindImmunity = duration + IMMOBILIZE_RESPITE;
    return true;
  }

  /** E : Marque du chasseur sur l'ennemi le plus proche de la souris, à portée. Faux s'il n'y a personne. */
  huntMark(aim: Vec2): boolean {
    const cfg = this.player.cfg.ranger.huntMark;
    const target = closest(this.enemies.filter((e) => e.targetable && distance(e.pos, this.player.pos) <= cfg.range), aim);
    if (!target) return false;
    this.hunt(target, cfg.duration);
    return true;
  }

  private hunt(enemy: Enemy, duration: number): void {
    enemy.huntBonus = this.player.cfg.ranger.huntMark.bonus;
    this.markEnemy(enemy, 'hunt', duration);
  }

  private launch(
    kind: Projectile['kind'],
    dir: Vec2,
    p: Pick<Projectile, 'speed' | 'range' | 'damage' | 'knockback' | 'radius' | 'pierce'> & { full?: boolean; hit?: Set<number> },
  ): void {
    this.projectiles.push({
      id: this.nextFxId--,
      kind,
      pos: { ...this.player.pos },
      dir: normalize(dir),
      hit: new Set(),
      full: false,
      returning: false,
      owner: this.player.id,
      ...p,
    });
  }

  private updateProjectiles(dt: number): void {
    this.projectiles = this.projectiles.filter((p) => this.act(this.hero(p.owner), () => this.moveProjectile(p, dt)));
  }

  /** Fait voler un projectile d'un pas ; renvoie faux quand il disparaît. */
  private moveProjectile(p: Projectile, dt: number): boolean {
    const player = this.player;
    {
      if (p.returning) {
        // Le marteau revient dans la main du héros, où qu'il soit.
        p.dir = normalize(sub(player.pos, p.pos), p.dir);
        if (distance(p.pos, player.pos) < player.radius + p.radius) return false;
      }
      const step = p.speed * dt;
      p.pos = add(p.pos, scale(p.dir, step));
      if (!p.returning) p.range -= step;
      for (const enemy of this.enemies) {
        if (!enemy.targetable || p.hit.has(enemy.id) || distance(enemy.pos, p.pos) > enemy.radius + p.radius) continue;
        p.hit.add(enemy.id);
        if (!this.projectileHit(p, enemy)) return false;
      }
      if (p.kind !== 'net' && this.shakePeaches(p.pos, p.radius) && p.kind === 'arrow') return false;
      const out = this.clampToArena(p.pos, 0);
      if (p.kind === 'hammer') {
        if (!p.returning && (p.range <= 0 || out)) {
          p.returning = true;
          p.hit.clear();
        }
        return true;
      }
      if (p.range > 0 && !out) return true;
      if (p.kind === 'net') this.netBurst(p.pos);
      return false;
    }
  }

  /** Un projectile touche un ennemi ; renvoie vrai s'il poursuit sa course. */
  private projectileHit(p: Projectile, enemy: Enemy): boolean {
    const player = this.player;
    const perks = player.cfg.perks ?? {};
    // Tiré d'un pas en arrière : la carapace du kappa arrête les flèches qui arrivent de face.
    const from = sub(p.pos, p.dir);
    switch (p.kind) {
      case 'net':
        this.netBurst(p.pos);
        return false;
      case 'hammer':
        enemy.receiveHit({ amount: p.damage * player.damageMultiplier(), from, knockback: p.knockback }, this);
        if (enemy.dead) player.onKill();
        else if (perks.hammerStun) enemy.slow(0.4, perks.hammerStun, this);
        if (enemy.kind === 'hitodama') this.igniteNear(enemy.pos);
        return true;
      case 'arrow':
        this.weaponHit(enemy, p.damage, from, p.knockback, 1);
        // Arc de soie : le tir chargé plein s'ouvre en filet sur sa première proie.
        if (p.full && perks.chargedNet && p.hit.size === 1) this.netBurst(p.pos, perks.chargedNet);
        // Arc d'Ikazuchi : la foudre tombe sur la première proie d'un tir plein, au plus une fois par recharge.
        if (p.full && perks.chargedBolt && p.hit.size === 1 && player.boltCooldown <= 0) this.chargedBolt(enemy.pos, perks.chargedBolt);
        if (p.full && !enemy.dead) {
          if (perks.chargedMark) this.hunt(enemy, perks.chargedMark);
          if (perks.chargedStun) this.immobilize(enemy, perks.chargedStun, 'daze');
        }
        return p.pierce;
    }
  }

  /** Arc d'Ikazuchi : un éclair frappe autour de l'impact et étourdit un instant. */
  private chargedBolt(center: Vec2, cfg: { damage: number; radius: number; stun: number; cooldown: number }): void {
    const player = this.player;
    player.boltCooldown = cfg.cooldown;
    this.emit({ type: 'lightning', pos: { ...center } });
    for (const enemy of this.enemies) {
      if (!enemy.targetable || distance(enemy.pos, center) - enemy.radius > cfg.radius) continue;
      enemy.receiveHit({ amount: cfg.damage * player.damageMultiplier(), from: center, knockback: 1, ignoreShell: true }, this);
      if (enemy.dead) player.onKill();
      else enemy.slow(0.5, cfg.stun, this);
    }
  }

  /** Pose un fil de Jōren (relique) là où le héros commence son esquive. */
  setSnare(pos: Vec2, cfg: { stun: number; life: number; radius: number }): void {
    const snare = { id: this.nextFxId--, pos: { ...pos }, radius: cfg.radius, life: cfg.life, stun: cfg.stun };
    this.snares.push(snare);
    this.emit({ type: 'snareSet', id: snare.id, pos: snare.pos, radius: snare.radius });
  }

  private updateSnares(dt: number): void {
    this.snares = this.snares.filter((snare) => {
      snare.life -= dt;
      // Un yokai encore protégé par son répit passe le fil sans le déclencher.
      const caught = this.enemies.find((e) => e.targetable && e.bindImmunity <= 0 && distance(e.pos, snare.pos) <= snare.radius + e.radius);
      if (caught) caught.slow(0.6, snare.stun, this);
      if (caught || snare.life <= 0) {
        this.emit({ type: 'snareEnd', id: snare.id });
        return false;
      }
      return true;
    });
  }

  /** Fait apparaître un ennemi en cours de vague (araignées invoquées, feux follets de l'arène du boss). */
  spawn(kind: EnemyKind, pos: Vec2): Enemy {
    const enemy = this.createEnemy(kind, pos);
    this.enemies.push(enemy);
    return enemy;
  }

  /** Un point libre au bord de l'arène, loin du joueur. */
  edgePoint(): Vec2 {
    const half = this.cfg.arenaHalfSize - 1;
    for (let attempt = 0; attempt < 30; attempt++) {
      const along = (Math.random() * 2 - 1) * half;
      const side = Math.random() < 0.5 ? -half : half;
      const p = Math.random() < 0.5 ? vec(along, side) : vec(side, along);
      if (this.players.every((h) => distance(p, h.pos) > SPAWN_CLEARANCE) && !this.insideStump(p, 0.5)) return p;
    }
    return this.spawnPoint();
  }

  /** Point au hasard dans l'arène, hors des souches. */
  randomPoint(margin = 1.5): Vec2 {
    const half = this.cfg.arenaHalfSize - margin;
    for (let attempt = 0; attempt < 30; attempt++) {
      const p = vec((Math.random() * 2 - 1) * half, (Math.random() * 2 - 1) * half);
      if (!this.insideStump(p, 0.5)) return p;
    }
    return vec();
  }

  /** Annonce une chute à `pos` : un cercle rouge, puis l'impact. */
  dropHazard(pos: Vec2, cfg: HazardConfig, leavesWeb: boolean): void {
    const id = this.nextFxId--;
    const target = { ...pos };
    this.clampToArena(target, cfg.radius * 0.5);
    this.hazards.push({ id, pos: target, t: 0, cfg, leavesWeb });
    this.emit({ type: 'jump', id, target, radius: cfg.radius, duration: cfg.warning });
  }

  /** Tisse une toile, sauf si l'arène en est déjà couverte ou qu'une toile est déjà là. */
  addWeb(pos: Vec2): void {
    const cfg = this.cfg.webs;
    if (this.webs.length >= cfg.maxWebs) return;
    if (this.webs.some((w) => w.burning === null && distance(w.pos, pos) < cfg.radius)) return;
    const p = { ...pos };
    this.clampToArena(p, cfg.radius * 0.6);
    this.webs.push({ id: this.nextFxId--, pos: p, radius: cfg.radius, age: 0, burning: null });
  }

  /** Multiplicateur de vitesse du joueur à cet endroit (1 hors des toiles). */
  slowAt(pos: Vec2): number {
    const inWeb = this.webs.some((w) => w.burning === null && distance(w.pos, pos) < w.radius);
    return inWeb ? this.cfg.webs.slowFactor : 1;
  }

  /** Souche (ou pêcher) qui gêne le passage d'un corps de rayon `radius` placé en `pos`. */
  insideStump(pos: Vec2, radius: number): Stump | undefined {
    return this.stumps.find((s) => distance(s.pos, pos) < s.radius + radius) ?? this.peachAt(pos, radius);
  }

  /** Pêcher qui gêne le passage d'un corps de rayon `radius` placé en `pos`. */
  peachAt(pos: Vec2, radius: number): PeachTree | undefined {
    return this.peaches.find((p) => distance(p.pos, pos) < p.radius + radius);
  }

  /**
   * Un coup atteint les pêchers à `reach` de `center` : chaque pêcher mûr lâche sa pêche, qui file repousser
   * Izanami (la faiblesse du mythe). Renvoie vrai si un pêcher a été touché.
   */
  private shakePeaches(center: Vec2, reach: number): boolean {
    let touched = false;
    for (const tree of this.peaches) {
      if (distance(tree.pos, center) > reach + tree.radius) continue;
      touched = true;
      if (!tree.ripe) continue;
      tree.ripe = false;
      tree.regrow = this.cfg.enemies.izanami.peach.regrow;
      const izanami = this.enemies.find((e): e is Izanami => e instanceof Izanami && e.active);
      this.emit({ type: 'peach', from: { ...tree.pos }, to: izanami ? { ...izanami.pos } : { ...tree.pos } });
      izanami?.repel(this);
    }
    return touched;
  }

  private updatePeaches(dt: number): void {
    for (const tree of this.peaches) {
      if (tree.ripe) continue;
      tree.regrow -= dt;
      if (tree.regrow <= 0) tree.ripe = true;
    }
  }

  /** Garde `pos` dans l'arène ; renvoie vrai si la position a été corrigée. */
  clampToArena(pos: Vec2, radius: number): boolean {
    const limit = this.cfg.arenaHalfSize - radius;
    let clamped = false;
    if (Math.abs(pos.x) > limit) {
      pos.x = Math.sign(pos.x) * limit;
      clamped = true;
    }
    if (Math.abs(pos.z) > limit) {
      pos.z = Math.sign(pos.z) * limit;
      clamped = true;
    }
    return clamped;
  }

  /**
   * Empêche les corps au sol de se chevaucher. Pendant une esquive, le joueur traverse les ennemis, pas les souches ;
   * les âmes liées, elles, traversent toujours le héros.
   */
  private separate(): void {
    const bodies = this.enemies.filter((e) => e.active && e.grounded);
    const crowd: Body[] = [...bodies, ...this.summons];
    for (let i = 0; i < crowd.length; i++) {
      for (let j = i + 1; j < crowd.length; j++) pushApart(crowd[i], crowd[j]);
    }
    for (const hero of this.standing) {
      if (hero.dodging) continue;
      for (const enemy of bodies) {
        if (enemy.solid) pushApart(hero, enemy);
      }
    }
    for (const stump of [...this.stumps, ...this.peaches]) {
      for (const hero of this.players) pushOut(hero, stump);
      for (const enemy of bodies) {
        if (enemy.kind !== 'hitodama' && enemy.kind !== 'ikazuchi') pushOut(enemy, stump);
      }
      for (const summon of this.summons) pushOut(summon, stump);
    }
  }

  private updateHazards(dt: number): void {
    this.hazards = this.hazards.filter((h) => {
      h.t += dt;
      if (h.t < h.cfg.warning) return true;
      this.emit({ type: 'land', id: h.id, pos: h.pos, radius: h.cfg.radius });
      if (h.cfg.fx === 'lightning') this.emit({ type: 'lightning', pos: { ...h.pos } });
      // Les chutes viennent des boss et de leurs serviteurs : elles suivent leur puissance, et frappent aussi les âmes.
      for (const foe of this.foes()) {
        const offset = sub(foe.pos, h.pos);
        if (length(offset) <= h.cfg.radius + foe.radius) foe.takeHit(h.cfg.damage * this.bossMight(), normalize(offset), h.cfg.knockback, this, true);
      }
      if (h.leavesWeb) this.addWeb(h.pos);
      return false;
    });
  }

  private updateWebs(dt: number): void {
    const cfg = this.cfg.webs;
    for (const web of this.webs) {
      web.age += dt;
      if (web.burning === null) continue;
      const before = web.burning;
      web.burning += dt;
      // Le feu gagne les toiles voisines à mi-combustion.
      if (before < cfg.burnTime / 2 && web.burning >= cfg.burnTime / 2) {
        for (const other of this.webs) {
          if (other.burning === null && distance(other.pos, web.pos) < web.radius + other.radius) this.ignite(other);
        }
      }
    }
    this.webs = this.webs.filter((w) => w.burning === null || w.burning < cfg.burnTime);
  }

  /** Un feu follet frappé près d'une toile y met le feu. */
  private igniteNear(pos: Vec2): void {
    const reach = this.cfg.webs.igniteReach;
    for (const web of this.webs) {
      if (web.burning === null && distance(web.pos, pos) < web.radius + reach) this.ignite(web);
    }
  }

  private ignite(web: Web): void {
    web.burning = 0;
    this.emit({ type: 'webBurn', id: web.id, pos: { ...web.pos }, radius: web.radius });
    // Le feu brûle les yokai pris dans la toile, la Jorōgumo comprise.
    for (const enemy of this.enemies) {
      if (!enemy.targetable || enemy.kind === 'hitodama') continue;
      if (distance(enemy.pos, web.pos) > web.radius + enemy.radius) continue;
      enemy.receiveHit({ amount: this.cfg.webs.burnDamage, from: web.pos, knockback: 2, ignoreShell: true }, this);
    }
  }

  /** Quand le boss tombe, ses araignées et les feux follets de l'arène se dissipent avec lui. */
  private clearBossMinions(): void {
    // Avec deux boss (donjon infini), il faut les abattre tous les deux.
    if (!this.enemies.some((e) => e.boss && e.dead) || this.enemies.some((e) => e.boss && !e.dead)) return;
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      enemy.hp = 0;
      this.emit({ type: 'death', id: enemy.id, pos: { ...enemy.pos }, kind: enemy.kind });
    }
    for (const web of this.webs) {
      if (web.burning === null) this.ignite(web);
    }
    this.hazards = [];
  }

  private updateWaves(dt: number): void {
    if (this.enemies.length > 0) return;
    const waves = this.cfg.waves;
    if (this.waveIndex >= waves.length - 1) {
      this.finish('victory');
      return;
    }
    this.waveTimer -= dt;
    if (this.waveTimer > 0) return;

    this.waveIndex++;
    this.waveTimer = WAVE_PAUSE;
    const wave = waves[this.waveIndex];
    // Donjon infini : chaque palier a son niveau et ses modificateurs.
    if (wave.difficulty) this.cfg.difficulty = wave.difficulty;
    this.stumps = (wave.stumps ?? []).map((p) => ({ pos: vec(p.x, p.z), radius: this.cfg.stumpRadius }));
    this.peaches = (wave.peaches ?? []).map((p) => ({ pos: vec(p.x, p.z), radius: this.cfg.peachRadius, ripe: true, regrow: 0 }));
    this.webs = [];
    for (const spawn of wave.spawns) {
      for (let i = 0; i < spawn.count; i++) {
        const enemy = this.createEnemy(spawn.kind, this.spawnPoint());
        if (spawn.elite) enemy.makeElite(this.cfg.champion);
        this.enemies.push(enemy);
      }
    }
    // Coop : des yokai en plus pour chaque héros au-delà du premier (jamais un boss en plus).
    const extra = (this.cfg.difficulty?.extraSpawns ?? 0) * (this.players.length - 1) + (this.cfg.difficulty?.soloExtra ?? 0);
    const common = wave.spawns.filter((sp) => !BOSS_KINDS.has(sp.kind));
    for (let i = 0; i < extra && common.length; i++) {
      this.enemies.push(this.createEnemy(common[i % common.length].kind, this.spawnPoint()));
    }
    // « Âmes d'élite » : les yokai les plus robustes de la vague (jamais le boss) deviennent des élites.
    const elites = this.curse('elites');
    const difficulty = this.cfg.difficulty;
    if (elites && difficulty) {
      const candidates = this.enemies.filter((e) => !e.boss).sort((a, b) => b.maxHp - a.maxHp);
      for (const enemy of candidates.slice(0, elites)) enemy.makeElite(difficulty.elite);
    }
    const hint = wave.hints?.[this.player.cfg.kit] ?? wave.hint;
    for (const hero of this.players) hero.newWave();
    this.emit({ type: 'wave', index: this.waveIndex, total: waves.length, label: wave.label, hint, step: wave.step, palier: wave.palier });
  }

  private createEnemy(kind: EnemyKind, pos: Vec2): Enemy {
    const enemy = this.instantiate(kind, this.nextId++, pos);
    enemy.facing = normalize(sub(this.nearestHero(pos).pos, pos));
    // Niveau du donjon : tous les yokai sont renforcés ; le boss a sa propre base, et plus encore sous le « Regard d'Izanami ».
    const difficulty = this.cfg.difficulty;
    if (difficulty) {
      if (enemy.boss) {
        const izanami = 1 + this.curse('izanami');
        enemy.empower(difficulty.boss.hp * izanami, difficulty.boss.damage * izanami);
      } else {
        enemy.empower(difficulty.hp, difficulty.damage);
      }
    }
    return enemy;
  }

  /** Puissance des attaques de zone de la Jorōgumo (niveau du donjon, « Regard d'Izanami »). */
  private bossMight(): number {
    return (this.cfg.difficulty?.boss.damage ?? 1) * (1 + this.curse('izanami'));
  }

  /** « Sève du Yomi » : un yokai épargné quelques secondes se régénère. */
  private regenerate(dt: number): void {
    const rate = this.curse('seve');
    if (!rate) return;
    for (const enemy of this.enemies) {
      if (enemy.active && enemy.wounded && enemy.sinceHurt > SAP_DELAY) enemy.regen(enemy.maxHp * rate * dt);
    }
  }

  /** « Feux follets vengeurs » : chaque yokai vaincu libère un feu follet, sauf quand le boss tombe. */
  private releaseWisps(fallen: Enemy[]): void {
    if (!this.curse('feux') || fallen.some((e) => e.boss)) return;
    for (const enemy of fallen) {
      if (enemy.kind !== 'hitodama' && enemy.kind !== 'araignee') this.spawn('hitodama', enemy.pos);
    }
  }

  private instantiate(kind: EnemyKind, id: number, pos: Vec2): Enemy {
    const cfg = this.cfg.enemies;
    switch (kind) {
      case 'hitodama':
        return new Hitodama(id, pos, cfg.hitodama);
      case 'kodama':
        return new Kodama(id, pos, cfg.kodama);
      case 'kappa':
        return new Kappa(id, pos, cfg.kappa, 'kappa');
      case 'kappaRenforce':
        return new Kappa(id, pos, cfg.kappaRenforce, 'kappaRenforce');
      case 'kasaObake':
        return new KasaObake(id, pos, cfg.kasaObake);
      case 'oublie':
        return new Oublie(id, pos, cfg.oublie);
      case 'araignee':
        return new Oublie(id, pos, cfg.araignee, 'araignee');
      case 'jorogumo':
        return new Jorogumo(id, pos, cfg.jorogumo);
      case 'shikome':
        return new Shikome(id, pos, cfg.shikome);
      case 'ikazuchi':
        return new Ikazuchi(id, pos, cfg.ikazuchi);
      case 'ikusa':
        return new Oublie(id, pos, cfg.ikusa, 'ikusa');
      case 'izanami':
        return new Izanami(id, pos, cfg.izanami);
    }
  }

  private spawnPoint(): Vec2 {
    const half = this.cfg.arenaHalfSize - 1.5;
    for (let attempt = 0; attempt < 30; attempt++) {
      const p = vec((Math.random() * 2 - 1) * half, (Math.random() * 2 - 1) * half);
      if (this.players.every((h) => distance(p, h.pos) > SPAWN_CLEARANCE) && !this.insideStump(p, 1)) return p;
    }
    // Arène trop petite : on vise le coin opposé au joueur.
    const hero = this.players[0].pos;
    return vec(-Math.sign(hero.x || 1) * half, -Math.sign(hero.z || 1) * half);
  }

  private finish(outcome: Outcome): void {
    this.state = outcome;
    this.emit({ type: 'end', outcome });
  }
}

/** Mélange de deux nombres, de `a` (k = 0) à `b` (k = 1). */
const mix = (a: number, b: number, k: number): number => a + (b - a) * k;

/** L'élément de `items` le plus proche de `point`. */
function closest<T extends { pos: Vec2 }>(items: readonly T[], point: Vec2): T | undefined {
  let best: T | undefined;
  let bestDist = Infinity;
  for (const item of items) {
    const d = distance(item.pos, point);
    if (d < bestDist) {
      best = item;
      bestDist = d;
    }
  }
  return best;
}

function pushApart(a: Body, b: Body): void {
  const delta = sub(b.pos, a.pos);
  const dist = length(delta);
  const minDist = a.radius + b.radius;
  if (dist >= minDist) return;
  const normal = dist > 1e-6 ? scale(delta, 1 / dist) : vec(1, 0);
  const overlap = minDist - dist;
  const total = a.mass + b.mass;
  a.pos = sub(a.pos, scale(normal, (overlap * b.mass) / total));
  b.pos = add(b.pos, scale(normal, (overlap * a.mass) / total));
}

/** Repousse un corps hors d'un obstacle fixe. */
export function pushOut(body: { pos: Vec2; radius: number }, stump: { pos: Vec2; radius: number }): void {
  const delta = sub(body.pos, stump.pos);
  const dist = length(delta);
  const minDist = body.radius + stump.radius;
  if (dist >= minDist) return;
  body.pos = add(stump.pos, scale(normalize(delta), minDist));
}
