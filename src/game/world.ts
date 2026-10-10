import type { GameConfig, HazardConfig, SubclassActiveConfig, WaveConfig } from './config';
import type { CurseId } from './difficulty';
import { Hitodama, Ikazuchi, Izanami, Jorogumo, Kappa, KasaObake, Kodama, Mannequin, Oublie, Shikome, type Enemy } from './enemies';
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
  rotateTowards,
  scale,
  sub,
  vec,
  type Vec2,
} from './math';
import { Player } from './player';
import type { EnemyKind, GameEvent, InputFrame, MarkKind, Outcome, StunReason } from './types';

/** Pause entre deux vagues, en secondes. */
const WAVE_PAUSE = 1.5;
/** Distance minimale entre le joueur et un ennemi qui apparaît. */
const SPAWN_CLEARANCE = 5;
/** Secondes sans être touché avant que la « Sève du Yomi » ne soigne un yokai. */
const SAP_DELAY = 3;
/** Sol en feu et Bouclier de flammes du Sorcier : ils brûlent par à-coups, toutes les demi-secondes. */
const BURN_TICK = 0.5;
/** Secondes pendant lesquelles un yokai touché par le feu du Sorcier reste « en feu » (Cristal de pyromancie). */
const ON_FIRE = 2;
/** Secondes que durent l'Armure et les dégâts donnés par l'Aura (tag Paladin) après son dernier soin. */
const AURA_BUFF = 1.2;
/** Coop : secondes qu'un allié doit passer à côté d'un héros à terre pour le relever, et à quelle distance. */
export const REVIVE_TIME = 4;
const REVIVE_RANGE = 1.6;
/** Part des PV rendue au héros relevé par un allié. */
const REVIVE_HP = 0.3;
/** Les boss ne sont jamais doublés en coop. */
const BOSS_KINDS = new Set<EnemyKind>(['jorogumo', 'izanami']);
/** Salve d'une voie (Rôdeur : la Volée perçante) : vitesse d'un trait, en m/s, et écart en degrés entre deux traits. */
const SALVE_SPEED = 24;
const SALVE_SPREAD = 9;
/** Secondes avant qu'un boss ne se choisisse une autre proie parmi les héros. */
const PREY_TIME = 2;
/** Répit après une immobilisation (filet, fil de Jōren, soie) : le yokai ne peut plus être immobilisé pendant ce temps. */
const IMMOBILIZE_RESPITE = 3;
/** Étourdissement le plus long de la Frappe du Guerrier, le seul héros qui étourdit (hors filet du Rôdeur). */
const SMASH_STUN_MAX = 0.8;
/** Part de la vitesse que perdent les yokai frappés par le Bond (talent d'Héraclès). */
const BOND_SLOW = 0.5;
/** Un leurre (clone, plumes) attire les yokai à moins de ces mètres de lui. */
const LURE_RANGE = 7;

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
    skillFPressed: false,
  };
}

/** Ce qu'un yokai peut attaquer : un héros, ou le leurre qui le remplace (fumée, statuette, flamme). */
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
  takeHit(amount: number, pushDir: Vec2, knockback: number, world: World, falling?: boolean, attacker?: Enemy): boolean;
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

/** Flèche (et flèche-filet) du Rôdeur, marteau du Paladin, boule de feu du Sorcier : ils volent à hauteur de poitrine. */
export interface Projectile {
  id: number;
  kind: 'arrow' | 'net' | 'hammer' | 'fireball';
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
  /** Boule de feu : l'ennemi vers lequel elle s'infléchit. */
  target?: number;
  /** Marteau : il a déjà rebondi vers un second yokai (Couronne du Juge). */
  bounced?: boolean;
}

/** Sceau ou météore du Sorcier : annoncé au sol, il s'abat au bout de `t` secondes. `echo` : seconde explosion d'un sceau. */
interface Blast {
  id: number;
  kind: 'seal' | 'meteor';
  pos: Vec2;
  radius: number;
  damage: number;
  t: number;
  owner: number;
  echo: boolean;
  /** Charges de poison posées par un sceau de voie (la Nuée virulente de la Lame) : 0 pour un sceau du Sorcier. */
  poison: number;
}

/** Sol en feu (traînée de la Fuite de feu, Sol brûlant) : il brûle les yokai qui s'y tiennent. */
interface Ember {
  id: number;
  pos: Vec2;
  radius: number;
  /** Dégâts par seconde. */
  burn: number;
  life: number;
  tick: number;
  owner: number;
  /** Dôme de feu (Bâton de Susanoo) : il arrête aussi ce qui tombe du ciel sur les héros qui s'y abritent. */
  dome?: boolean;
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

/** Leurre laissé par un objet (Masque du Kitsune, Manteau de Plumes) : il attire les yokai proches `life` secondes. */
interface Lure {
  decoy: Decoy;
  life: number;
}

/** Nuage de poison de la Lame (esquive, Écran de fumée) : une charge de poison par seconde aux yokai qui s'y trouvent. */
interface Cloud {
  id: number;
  pos: Vec2;
  radius: number;
  life: number;
  tick: number;
  owner: number;
}

/** Zone sacrée (Geta d'Amaterasu, Geta de l'Égide) : elle soigne les héros qui s'y tiennent, `heal` PV par seconde. */
interface Sanctuary {
  id: number;
  pos: Vec2;
  radius: number;
  heal: number;
  life: number;
  tick: number;
  /** Dégâts par seconde subis par les yokai pris dedans (Sanctuaire d'aube) : 0 pour une zone de soin seule. */
  burn: number;
  owner: number;
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
  /** Flèches du Rôdeur, marteau du Paladin, boules de feu du Sorcier. */
  projectiles: Projectile[] = [];
  /** Sorcier : sceaux et météores annoncés, sol en feu. */
  private blasts: Blast[] = [];
  private embers: Ember[] = [];
  private lures: Lure[] = [];
  private sanctuaries: Sanctuary[] = [];
  private clouds: Cloud[] = [];
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
  /** Le héros qui agit en ce moment : celui dont on joue le tour, ou la proie du yokai qui joue le sien. */
  private actor: Player;
  /** Proie de chaque yokai parmi les héros, et secondes avant d'en changer. */
  private readonly prey = new Map<number, { hero: Player; t: number }>();
  /** Héros déjà signalés à terre. */
  private readonly downed = new Set<Player>();
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

  /** Lame : nuage de fumée du héros qui agit. */
  get smoke(): Decoy | null {
    return this.player.smoke;
  }

  /** Héros encore debout. */
  get standing(): Player[] {
    return this.players.filter((p) => !p.dead);
  }

  /** Fait agir `hero` le temps de `fn` : ses compétences et ses talents. */
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
    // Les dégâts du héros qui agit (ses coups, ses sorts, ses flèches) remplissent le sang yokai du Hanyō.
    if (event.type === 'enemyHit') this.actor.dealt(event.amount, this);
  }

  drainEvents(): GameEvent[] {
    const events = this.events;
    this.events = [];
    return events;
  }

  /** Tout ce que les yokai peuvent frapper : les héros debout. */
  foes(): Foe[] {
    return this.standing;
  }

  /** Vrai tant que `foe` peut encore être attaqué (un héros à terre ou invisible ne l'est plus). */
  isFoe(foe: Foe | null): foe is Foe {
    if (foe instanceof Player) return this.players.includes(foe) && !foe.dead && foe.hidden <= 0;
    return foe instanceof Decoy && (this.players.some((p) => p.smoke === foe && !p.dead) || this.lures.some((l) => l.decoy === foe));
  }

  /**
   * La cible d'un yokai : un leurre tout proche, sinon le héros le plus proche. Invisible, le héros est remplacé par son
   * nuage de fumée ; camouflé (Capuche de camouflage), il paraît plus loin qu'il n'est.
   */
  pickFoe(from: Vec2): Foe {
    const lure = closest(this.lures.map((l) => l.decoy), from);
    if (lure && distance(lure.pos, from) <= LURE_RANGE) return lure;
    let best: Foe = this.players[0];
    let bestScore = Infinity;
    for (const hero of this.standing) {
      const foe = hero.hidden > 0 && hero.smoke ? hero.smoke : hero;
      const score = distance(from, foe.pos) / this.notice(foe);
      if (score < bestScore) {
        best = foe;
        bestScore = score;
      }
    }
    return best;
  }

  /** Part de leur portée à laquelle les yokai remarquent `foe` (Capuche de camouflage : moins loin). */
  notice(foe: Foe): number {
    return foe instanceof Player ? 1 - (foe.cfg.perks?.stealth ?? 0) : 1;
  }

  /** Dégâts en plus que prend un yokai des coups du héros qui agit : en feu (Hakama cramoisi), ralenti (Grèves de l'Inquisiteur). */
  exposure(enemy: Enemy): number {
    const perks = this.player.cfg.perks ?? {};
    let factor = 1;
    if (perks.burningBonus && enemy.burning > 0) factor += perks.burningBonus;
    if (perks.slowedBonus && enemy.slowTime > 0) factor += perks.slowedBonus;
    return factor;
  }

  /** Leurre immobile qui attire les yokai proches pendant `life` s (Masque du Kitsune, Manteau de Plumes). */
  addLure(pos: Vec2, life: number): void {
    this.lures.push({ decoy: new Decoy({ ...pos }, 0.8), life });
    this.emit({ type: 'lure', pos: { ...pos } });
  }

  private updateLures(dt: number): void {
    this.lures = this.lures.filter((l) => (l.life -= dt) > 0);
  }

  /**
   * Zone sacrée qui soigne les héros qui s'y tiennent (Geta d'Amaterasu, Geta de l'Égide). `burn` y ajoute des
   * dégâts sur les yokai pris dedans (Sanctuaire d'aube, une voie du Paladin).
   */
  addSanctuary(pos: Vec2, cfg: { heal: number; duration: number; radius: number; burn?: number }, owner?: Player): void {
    const zone: Sanctuary = {
      id: this.nextFxId--,
      pos: { ...pos },
      radius: cfg.radius,
      heal: cfg.heal,
      life: cfg.duration,
      tick: 0,
      burn: cfg.burn ?? 0,
      owner: (owner ?? this.player).id,
    };
    this.sanctuaries.push(zone);
    this.emit({ type: 'sanctuary', id: zone.id, pos: { ...pos }, radius: cfg.radius, life: cfg.duration });
  }

  /** Une fois par seconde, la zone sacrée soigne et, si elle brûle, mord les yokai ; puis elle s'efface. */
  private updateSanctuaries(dt: number): void {
    for (const zone of [...this.sanctuaries]) {
      zone.life -= dt;
      zone.tick -= dt;
      if (zone.tick <= 0 && zone.life > 0) {
        zone.tick += 1;
        for (const hero of this.standing) if (distance(hero.pos, zone.pos) <= zone.radius + hero.radius) hero.heal(zone.heal, this);
        if (zone.burn) this.act(this.hero(zone.owner), () => this.burnAround(zone.pos, zone.radius, zone.burn, true));
      }
      if (zone.life > 0) continue;
      this.sanctuaries = this.sanctuaries.filter((z) => z !== zone);
      this.emit({ type: 'emberEnd', id: zone.id });
    }
  }

  /** Nuage de poison de la Lame qui agit (esquive, Écran de fumée). */
  poisonCloud(pos: Vec2, radius: number, life: number): void {
    const cloud: Cloud = { id: this.nextFxId--, pos: { ...pos }, radius, life, tick: 0, owner: this.player.id };
    this.clouds.push(cloud);
    this.emit({ type: 'cloud', id: cloud.id, pos: { ...pos }, radius, life });
  }

  /** Chaque seconde, chaque nuage pose une charge de poison sur les yokai qui s'y trouvent ; puis il se dissipe. */
  private updateClouds(dt: number): void {
    for (const cloud of [...this.clouds]) {
      cloud.life -= dt;
      cloud.tick -= dt;
      if (cloud.tick <= 0 && cloud.life > 0) {
        cloud.tick += 1;
        const hero = this.hero(cloud.owner);
        for (const enemy of this.enemies) {
          if (enemy.targetable && distance(enemy.pos, cloud.pos) - enemy.radius <= cloud.radius) this.poison(enemy, hero);
        }
      }
      if (cloud.life > 0) continue;
      this.clouds = this.clouds.filter((c) => c !== cloud);
      this.emit({ type: 'emberEnd', id: cloud.id });
    }
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
      if (!hero.dead) this.act(hero, () => hero.update(dt, inputs[hero.id] ?? idleInput(hero), this));
    }
    // « Hâte des morts » : le temps des yokai passe plus vite.
    const haste = 1 + this.curse('hate');
    // Copie : un ennemi peut en faire apparaître d'autres pendant son tour (araignées, feux follets).
    for (const enemy of [...this.enemies]) this.act(this.chase(enemy, dt * haste), () => enemy.update(dt * haste, this));
    for (const hero of this.players) {
      if (hero.smoke && hero.hidden <= 0) hero.smoke = null;
    }
    for (const hero of this.players) this.act(hero, () => this.updateAura(dt));
    for (const hero of this.players) this.act(hero, () => this.updateWard(dt));
    this.updateProjectiles(dt);
    this.updateBlasts(dt);
    this.updateEmbers(dt);
    this.updateSanctuaries(dt);
    this.updateClouds(dt);
    this.updateLures(dt);
    this.regenerate(dt);
    this.updateHazards(dt);
    this.updateWebs(dt);
    this.updateSnares(dt);
    this.updatePoison(dt);
    this.updatePeaches(dt);
    this.separate();
    this.clearBossMinions();
    const fallen = this.enemies.filter((e) => e.dead);
    this.enemies = this.enemies.filter((e) => !e.dead);
    for (const enemy of fallen) this.prey.delete(enemy.id);
    this.releaseWisps(fallen);
    for (const hero of this.players) this.act(hero, () => this.afterKills(fallen));
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
        // À terre, son Aura et sa fumée se dissipent.
        hero.aura = 0;
        hero.smoke = null;
        // Son Égide tombe avec lui.
        for (const id of [hero.aegisOn, hero.aegisSecond]) if (id !== null) this.hero(id).aegisArmor = 0;
        hero.aegisOn = null;
        hero.aegisSecond = null;
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
    const base = this.player.cfg.attack;
    // Posture Offensive du Guerrier : l'arme porte plus loin.
    const attack = { ...base, range: base.range + this.player.reachBonus };
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
   * Tout coup d'arme porté à un ennemi (lame, flèche, Danse des lames) : critiques, foudre, poison, saignement.
   * `crit` : multiplicateur de critique déjà acquis (embuscade, après une esquive) ; une marque de la Lame le rend critique.
   * Renvoie vrai si la carapace a arrêté le coup.
   */
  private weaponHit(enemy: Enemy, base: number, from: Vec2, knockback: number, crit: number): boolean {
    const player = this.player;
    const perks = player.cfg.perks ?? {};
    // Une marque de la Lame, ou un yokai à l'agonie avec l'Encre de Shinigami, rend le coup critique.
    const marked = enemy.marks.death > 0 || enemy.hp < enemy.maxHp * (perks.finisher ?? 0);
    let factor = marked ? Math.max(crit, player.cfg.blade.critFactor) : crit;
    // Coup de grâce (Hachiman) : la proie marquée du Rôdeur, à bout de forces, prend des critiques.
    const grace = perks.coupDeGrace;
    if (grace && enemy.marks.hunt > 0 && enemy.hp < enemy.maxHp * grace.threshold) factor = Math.max(factor, grace.factor);
    // Guerrier : la riposte du Mempō (un blocage parfait juste avant) est un critique ; en Offensive, la Naginata
    // affûte les critiques.
    const warrior = player.cfg.kit === 'guerrier';
    // Riposte du Guerrier après un blocage parfait ; le Mempō de Contre-Attaque s'y ajoute.
    const riposte = player.cfg.stance.counter;
    const counter = warrior && player.counterWindow > 0 ? { bonus: riposte.bonus + (perks.counter?.bonus ?? 0), stun: Math.max(riposte.stun, perks.counter?.stun ?? 0) } : undefined;
    if (counter) {
      player.counterWindow = 0;
      factor *= 1 + counter.bonus;
      this.emit({ type: 'counter', pos: { ...enemy.pos } });
    }
    // Iaijutsu : le premier coup après être passé en Offensive est critique.
    if (warrior && player.stanceCritPrimed && perks.stanceCrit) {
      player.stanceCritPrimed = false;
      factor = Math.max(factor, perks.stanceCrit);
    }
    if (warrior && factor > 1 && perks.offenseCrit && player.stance === 'offensive') factor += perks.offenseCrit;
    // « Écorce des kodama » : seuls les coups d'arme sont amoindris.
    let amount = base * factor * player.damageMultiplier() * (1 - this.curse('ecorce'));
    const execute = perks.execute;
    if (execute && enemy.hp < enemy.maxHp * execute.threshold) amount *= 1 + execute.bonus;
    // Suneate de l'assaut : le premier coup après une longue marche porte plus fort.
    if (perks.marchStrike && player.marchPrimed) {
      player.marchPrimed = false;
      amount *= 1 + perks.marchStrike.bonus;
    }
    // Cœur de l'Assassin : frapper une proie empoisonnée nourrit la Lame.
    if (perks.poisonHitHeal && enemy.poison) player.leech(perks.poisonHitHeal, this);
    const shielded = enemy.receiveHit({ amount, from, knockback, crit: factor > 1 }, this);
    if (!shielded) player.gainFervor(player.cfg.paladin.judgement.perHit);
    if (factor > 1 && perks.critHeal) player.heal(perks.critHeal, this);
    // Lame : chaque coup nourrit le combo ; chaque critique rapproche l'esquive et soigne un peu.
    if (player.cfg.kit === 'lame') {
      if (!shielded) player.comboHit();
      if (factor > 1) player.critLanded(this);
    }
    // Tsuba ébréchée : chaque critique rapproche la prochaine Marque de mort.
    if (factor > 1 && perks.critMarkRefund) player.deathMarkCooldown = Math.max(0, player.deathMarkCooldown - perks.critMarkRefund);
    // Fils de Zeus : un coup sur quelques-uns appelle la foudre (le sang du Hanyō, lui, monte dans `emit`).
    const bolt = player.landHit();
    if (bolt && !enemy.dead) {
      this.emit({ type: 'lightning', pos: { ...enemy.pos } });
      enemy.receiveHit({ amount: bolt, from, knockback: 1, ignoreShell: true }, this);
    }
    if (enemy.dead) player.onKill();
    else if (player.cfg.kit === 'lame') this.poison(enemy, player);
    if (counter && !enemy.dead) enemy.stun(Math.min(SMASH_STUN_MAX, counter.stun), 'smash', this);
    // Colère de la tempête : en Offensive, un coup sur quelques-uns appelle la foudre de Susanoo.
    if (player.offenseStrike() && !enemy.dead) {
      this.emit({ type: 'lightning', pos: { ...enemy.pos } });
      enemy.receiveHit({ amount: (perks.offenseBolt?.damage ?? 0) * player.damageMultiplier(), from, knockback: 1, ignoreShell: true }, this);
      if (enemy.dead) player.onKill();
    }
    // Naginata du Maître d'Armes : le coup préparé en passant en Offensive fait saigner.
    if (warrior && player.bleedPrimed && perks.stanceBleed) {
      player.bleedPrimed = false;
      if (!enemy.dead) this.bleed(enemy, player, base * perks.stanceBleed.damage, perks.stanceBleed.duration);
    }
    // Riposte d'argile : après que la carapace a encaissé, le coup suivant frappe aussi autour et fait saigner.
    if (warrior && player.clayPrimed && perks.clayCleave) {
      player.clayPrimed = false;
      this.clayCleave(enemy, base, perks.clayCleave);
    }
    if (enemy.kind === 'hitodama') this.igniteNear(enemy.pos);
    return shielded;
  }

  /** Riposte d'argile : la mêlée éclate autour de `center`, et tous ceux qu'elle touche saignent. */
  private clayCleave(center: Enemy, base: number, cfg: { radius: number; damage: number; bleed: number; duration: number }): void {
    const player = this.player;
    this.emit({ type: 'smash', pos: { ...center.pos }, radius: cfg.radius });
    for (const enemy of [...this.enemies]) {
      if (!enemy.targetable || distance(enemy.pos, center.pos) - enemy.radius > cfg.radius) continue;
      if (enemy !== center) {
        enemy.receiveHit({ amount: base * cfg.damage * player.damageMultiplier(), from: center.pos, knockback: 2 }, this);
        if (enemy.dead) player.onKill();
      }
      if (!enemy.dead) this.bleed(enemy, player, base * cfg.bleed, cfg.duration);
    }
  }

  /** Saignement : `total` dégâts (déjà ceux de l'arme) répartis sur `duration` s ; un nouveau remplace le précédent s'il est plus fort. */
  private bleed(enemy: Enemy, hero: Player, total: number, duration: number): void {
    const perSecond = (total * hero.damageMultiplier()) / Math.max(0.5, duration);
    if (enemy.bleed && enemy.bleed.perSecond * enemy.bleed.time > perSecond * duration) return;
    enemy.bleed = { time: duration, tick: BURN_TICK, perSecond, hero: hero.id };
    this.emit({ type: 'bleed', pos: { ...enemy.pos } });
  }

  /** Brûlure (Écaille de Ryūjin) : `perSecond` dégâts pendant `duration` s ; une plus forte remplace l'autre. */
  scorch(enemy: Enemy, hero: Player, perSecond: number, duration: number): void {
    if (enemy.scorch && enemy.scorch.perSecond > perSecond) return;
    enemy.scorch = { time: duration, tick: BURN_TICK, perSecond, hero: hero.id };
    enemy.burning = ON_FIRE;
  }

  /** Un dégât sur la durée (saignement, brûlure) ronge sa proie ; renvoie vrai quand il s'éteint. */
  private tickDot(enemy: Enemy, dot: { time: number; tick: number; perSecond: number; hero: number }, dt: number): boolean {
    dot.time -= dt;
    dot.tick -= dt;
    if (dot.tick <= 0) {
      dot.tick += BURN_TICK;
      const hero = this.hero(dot.hero);
      this.act(hero, () => {
        enemy.receiveHit({ amount: dot.perSecond * BURN_TICK, from: enemy.pos, knockback: 0, ignoreShell: true }, this);
        if (enemy.dead) hero.onKill();
      });
    }
    return dot.time <= 0;
  }

  /** Vent de tempête : un éclair tombe autour du Guerrier qui change de posture. */
  stanceBolt(center: Vec2, cfg: { damage: number; radius: number }): void {
    const player = this.player;
    this.emit({ type: 'lightning', pos: { ...center } });
    for (const enemy of [...this.enemies]) {
      if (!enemy.targetable || distance(enemy.pos, center) - enemy.radius > cfg.radius) continue;
      enemy.receiveHit({ amount: cfg.damage * player.damageMultiplier(), from: center, knockback: 2, ignoreShell: true }, this);
      if (enemy.dead) player.onKill();
    }
  }

  /** Héros : nombre d'ennemis à moins de `radius` m de `pos` (Cœur de l'Arène). */
  enemiesNear(pos: Vec2, radius: number): number {
    return this.enemies.filter((e) => e.targetable && distance(e.pos, pos) - e.radius <= radius).length;
  }

  // --- Lame : poison et Frappe fantôme ------------------------------------------------

  /** Une charge de poison de plus (au plus `maxStacks`), et ses `duration` s relancées. */
  poison(enemy: Enemy, hero: Player): void {
    const cfg = hero.cfg.blade.poison;
    enemy.poison = {
      stacks: Math.min(cfg.maxStacks, (enemy.poison?.stacks ?? 0) + 1),
      time: cfg.duration,
      tick: enemy.poison?.tick ?? 1,
      // Les dégâts d'une charge sont pris au moment du coup : arme, forge et bonus du héros.
      damage: Math.max(enemy.poison?.damage ?? 0, hero.cfg.attack.damage * cfg.damage * hero.damageMultiplier()),
      hero: hero.id,
    };
  }

  /** Le poison ronge : chaque seconde, chaque charge inflige ses dégâts ; la Lame qui l'a posé compte la proie. */
  private updatePoison(dt: number): void {
    for (const enemy of this.enemies) {
      enemy.burning = Math.max(0, enemy.burning - dt);
      if (enemy.bleed && !enemy.dead && this.tickDot(enemy, enemy.bleed, dt)) enemy.bleed = null;
      if (enemy.scorch && !enemy.dead) {
        enemy.burning = Math.max(enemy.burning, BURN_TICK);
        if (this.tickDot(enemy, enemy.scorch, dt)) enemy.scorch = null;
      }
      const poison = enemy.poison;
      if (!poison || enemy.dead) continue;
      poison.time -= dt;
      poison.tick -= dt;
      if (poison.tick <= 0) {
        const hero = this.hero(poison.hero);
        // Haidate de la vipère : le poison mord plus vite.
        poison.tick += 1 / (hero.cfg.perks?.poisonHaste ?? 1);
        this.act(hero, () => {
          enemy.receiveHit({ amount: poison.damage * poison.stacks, from: enemy.pos, knockback: 0, ignoreShell: true }, this);
          if (enemy.dead) hero.onKill();
        });
      }
      if (poison.time <= 0) enemy.poison = null;
    }
  }

  /**
   * Clic droit de la Lame : elle apparaît sur l'ennemi le plus proche de la souris et le frappe, critique ×(1 + charges
   * de poison), qu'elle consomme toutes. Si elle l'achève, elle enchaîne sur le yokai le plus proche à portée,
   * `ghost.chain` fois au plus. Renvoie la dernière cible et vrai si elle l'a tuée, ou null s'il n'y a personne.
   */
  ghostStrike(aim: Vec2): { target: Vec2; killed: boolean } | null {
    const player = this.player;
    const cfg = player.cfg.blade.ghost;
    const inRange = () => this.enemies.filter((e) => e.targetable && distance(e.pos, player.pos) <= cfg.range);
    let target = closest(inRange(), aim);
    if (!target) return null;
    for (let hop = 0; ; hop++) {
      const killed = this.ghostHit(target);
      const next = killed && hop < cfg.chain ? closest(inRange(), player.pos) : undefined;
      if (!next) return { target: { ...target.pos }, killed };
      target = next;
    }
  }

  /** Un coup de la Frappe fantôme : la Lame reparaît derrière `target` et la frappe. Vrai si elle l'achève. */
  private ghostHit(target: Enemy): boolean {
    const player = this.player;
    const cfg = player.cfg.blade.ghost;
    const stacks = target.poison?.stacks ?? 0;
    // Elle reparaît juste derrière sa proie.
    const from = { ...player.pos };
    const behind = normalize(sub(target.pos, player.pos), player.facing);
    player.pos = add(target.pos, scale(behind, target.radius + player.radius + 0.2));
    this.clampToArena(player.pos, player.radius);
    this.emit({ type: 'streak', from, to: { ...player.pos } });
    this.weaponHit(target, player.cfg.attack.damage * cfg.damage, player.pos, 3, 1 + stacks);
    // Jambières de l'Araignée : la Lame immobilise sa proie et ce qu'elle traverse.
    const root = player.cfg.perks?.ghostRoot;
    if (root) {
      for (const enemy of this.enemies) {
        if (enemy.targetable && distanceToSegment(enemy.pos, from, player.pos) <= enemy.radius + player.radius) enemy.stun(root, 'snare', this);
      }
    }
    // Croissant : le poison gagne les ennemis tout autour de la proie.
    const spread = player.cfg.perks?.ghostSpread;
    if (spread) {
      for (const enemy of this.enemies) {
        if (enemy !== target && enemy.targetable && distance(enemy.pos, target.pos) - enemy.radius <= spread.radius) this.poison(enemy, player);
      }
    }
    // La Frappe consomme toutes les charges (une proie achevée les garde, pour le Festin toxique).
    if (!target.dead) target.poison = null;
    return target.dead;
  }

  // --- Paladin : Égide --------------------------------------------------------------

  /**
   * R du Paladin : pose l'Égide sur le héros (lui compris) le plus proche de la souris, parmi ses alliés debout à portée ;
   * à nouveau sur le même héros, il la retire. Une seule Égide par Paladin.
   */
  castAegis(paladin: Player, aim: Vec2): void {
    const cfg = paladin.cfg.paladin.aegis;
    const perks = paladin.cfg.perks ?? {};
    // Le héros (lui compris) le plus proche de la souris, parmi ceux à portée.
    const target = closest([paladin, ...this.standing.filter((h) => h !== paladin && distance(h.pos, paladin.pos) <= cfg.range)], aim) ?? paladin;
    // R sur un héros déjà protégé : l'Égide le quitte, sans attendre la recharge.
    if (paladin.aegisOn === target.id || paladin.aegisSecond === target.id) {
      this.dropAegis(paladin, target.id);
      return;
    }
    if (paladin.aegisCooldown > 0) return;
    // Roi des morts : deux héros à la fois ; sinon l'Égide quitte l'ancien pour le nouveau.
    if ((perks.aegisTargets ?? 1) < 2 && paladin.aegisOn !== null) this.dropAegis(paladin, paladin.aegisOn);
    else if (paladin.aegisSecond !== null) this.dropAegis(paladin, paladin.aegisSecond);
    paladin.aegisSecond = paladin.aegisOn;
    paladin.aegisOn = target.id;
    paladin.aegisCooldown = cfg.cooldown;
    // Bandelettes : l'Égide absorbe davantage, les dégâts restants sont divisés d'autant.
    target.aegisArmor = 1 - (1 - cfg.armor) / (perks.aegisAbsorb ?? 1);
    if (perks.aegisHeal) paladin.heal(perks.aegisHeal, this);
    this.emit({ type: 'aegis', hero: target.id, pos: { ...target.pos }, on: true });
  }

  /** L'Égide de `paladin` quitte le héros `id`. */
  private dropAegis(paladin: Player, id: number): void {
    const hero = this.hero(id);
    hero.aegisArmor = 0;
    if (paladin.aegisSecond === id) paladin.aegisSecond = null;
    if (paladin.aegisOn === id) {
      paladin.aegisOn = paladin.aegisSecond;
      paladin.aegisSecond = null;
    }
    this.emit({ type: 'aegis', hero: id, pos: { ...hero.pos }, on: false });
  }

  /** Frappe fracassante : dégâts de zone qui ignorent la carapace et étourdissent. */
  smash(center: Vec2): void {
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
    const perks = this.player.cfg.perks ?? {};
    // Joyau de Susanoo : la foudre tombe sur la cible la plus proche de l'impact.
    const bolted = perks.smashBolt ? closest(this.enemies.filter((e) => e.targetable && distance(e.pos, center) - e.radius <= smash.radius), center) : undefined;
    if (bolted && perks.smashBolt) {
      this.emit({ type: 'lightning', pos: { ...bolted.pos } });
      bolted.receiveHit({ amount: perks.smashBolt * this.player.damageMultiplier(), from: center, knockback: 1, ignoreShell: true }, this);
      if (bolted.dead) this.player.onKill();
    }
    // Kanabō du Démon-Sang : une onde de choc part de l'impact et frappe plus loin.
    const wave = perks.smashWave;
    if (wave) {
      this.emit({ type: 'shockwave', pos: { ...center }, radius: wave.radius });
      for (const enemy of this.enemies) {
        const gap = distance(enemy.pos, center) - enemy.radius;
        if (!enemy.targetable || gap <= smash.radius || gap > wave.radius) continue;
        enemy.receiveHit({ amount: smash.damage * wave.damage * this.player.damageMultiplier(), from: center, knockback: wave.knockback, ignoreShell: true }, this);
        if (enemy.dead) this.player.onKill();
        else if (perks.smashSlow) enemy.slow(perks.smashSlow.amount, perks.smashSlow.duration, this);
      }
    }
    // Une Frappe qui porte soigne le Guerrier.
    if (struck && smash.heal) this.player.heal(this.player.cfg.maxHp * smash.heal, this);
  }

  /** Armure du Général Déchu : le blocage parfait repousse les yokai autour du héros. */
  repel(center: Vec2, radius: number, knockback: number): void {
    this.emit({ type: 'shockwave', pos: { ...center }, radius });
    for (const enemy of this.enemies) {
      if (!enemy.targetable || distance(enemy.pos, center) - enemy.radius > radius) continue;
      enemy.knockback = add(enemy.knockback, scale(normalize(sub(enemy.pos, center)), knockback));
    }
  }

  /** Onde qui frappe autour de `center`, carapaces ignorées (Masque du Traqueur, Geta de l'aube). */
  private shockAround(center: Vec2, radius: number, damage: number, knockback: number): void {
    const player = this.player;
    this.emit({ type: 'shockwave', pos: { ...center }, radius });
    for (const enemy of [...this.enemies]) {
      if (!enemy.targetable || distance(enemy.pos, center) - enemy.radius > radius) continue;
      enemy.receiveHit({ amount: damage * player.damageMultiplier(), from: center, knockback, ignoreShell: true }, this);
      if (enemy.dead) player.onKill();
    }
  }

  /** Atterrissage du Bond : dégâts de zone autour du héros, étourdissement avec le talent d'Héraclès. */
  bondLand(center: Vec2): void {
    const bond = this.player.cfg.bond;
    this.emit({ type: 'bondLand', pos: { ...center }, radius: bond.radius });
    this.shakePeaches(center, bond.radius);
    let struck = false;
    for (const enemy of this.enemies) {
      if (!enemy.targetable || distance(enemy.pos, center) - enemy.radius > bond.radius) continue;
      struck = true;
      enemy.receiveHit({ amount: bond.damage * this.player.damageMultiplier(), from: center, knockback: bond.knockback }, this);
      if (enemy.dead) this.player.onKill();
      else {
        if (bond.slow > 0) enemy.slow(BOND_SLOW, bond.slow, this);
        const stun = this.player.cfg.perks?.bondStun;
        if (stun) enemy.stun(Math.min(SMASH_STUN_MAX, stun), 'bond', this);
      }
      if (enemy.kind === 'hitodama') this.igniteNear(enemy.pos);
    }
    // Un Bond qui porte soigne le Guerrier ; avec les Waraji de pèlerin, chaque atterrissage.
    if (struck && bond.heal) this.player.heal(this.player.cfg.maxHp * bond.heal, this);
    const heal = this.player.cfg.perks?.bondHeal;
    if (heal) this.player.heal(this.player.cfg.maxHp * heal, this);
  }

  // --- Sorcier ---------------------------------------------------------------

  /**
   * Clic gauche : une salve de boules de feu ouverte en éventail vers la souris, puis guidée vers l'ennemi le plus
   * proche de `aim` au moment du clic.
   */
  fireSalvo(dir: Vec2, aim: Vec2): void {
    const player = this.player;
    const { attack, sorcier } = player.cfg;
    const cfg = sorcier.fireball;
    const target = closest(this.enemies.filter((e) => e.targetable), aim);
    const count = Math.max(1, Math.round(cfg.count));
    for (let i = 0; i < count; i++) {
      const spread = count === 1 ? 0 : (i / (count - 1) - 0.5) * 2;
      const angle = angleOf(dir) + degToRad(cfg.spreadDeg) * spread;
      this.launch('fireball', fromAngle(angle), { speed: cfg.speed, range: attack.range, damage: attack.damage, knockback: attack.knockback, radius: cfg.radius, pierce: cfg.pierce ?? false, target: target?.id });
    }
  }

  /** Clic droit : un sceau sous la souris (à portée), qui explose au bout d'un instant. */
  castSeal(aim: Vec2): void {
    const cfg = this.player.cfg.sorcier.seal;
    this.addBlast('seal', this.reach(aim, cfg.range), cfg.radius, cfg.damage, cfg.delay);
  }

  /** R : grand météore sous la souris (à portée), qui s'écrase au bout de quelques secondes. */
  castMeteor(aim: Vec2): void {
    const cfg = this.player.cfg.sorcier.meteor;
    this.addBlast('meteor', this.reach(aim, cfg.range), cfg.radius, cfg.damage, cfg.delay);
  }

  /**
   * A : Bouclier de flammes. En s'allumant, il repousse les yokai collés au Sorcier ; ensuite, il absorbe des dégâts et
   * brûle ceux qui l'approchent (`updateWard`).
   */
  raiseWard(hero?: Player): void {
    const player = hero ?? this.player;
    const cfg = player.cfg.sorcier.ward;
    player.shield(player.cfg.maxHp * cfg.shield, cfg.duration);
    // Le bouclier qui s'allume soigne un peu ; la Capuche de l'ascète ajoute à ce soin.
    const heal = cfg.heal + (player.cfg.perks?.wardHeal ?? 0);
    if (heal) player.heal(player.cfg.maxHp * heal, this);
    player.ward = cfg.duration;
    player.wardTick = 0;
    this.emit({ type: 'ward', pos: { ...player.pos }, radius: cfg.radius });
    for (const enemy of this.enemies) {
      if (!enemy.targetable || distance(enemy.pos, player.pos) - enemy.radius > cfg.radius) continue;
      enemy.knockback = add(enemy.knockback, scale(normalize(sub(enemy.pos, player.pos)), cfg.knockback));
    }
  }

  /** Le point visé, ramené à `range` m du héros et dans l'arène. */
  private reach(aim: Vec2, range: number, hero: Player = this.player): Vec2 {
    const to = sub(aim, hero.pos);
    const pos = add(hero.pos, scale(normalize(to, hero.facing), Math.min(range, length(to))));
    this.clampToArena(pos, 0);
    return pos;
  }

  private addBlast(kind: Blast['kind'], pos: Vec2, radius: number, damage: number, delay: number, echo = false, owner?: Player, poison = 0): void {
    const blast: Blast = { id: this.nextFxId--, kind, pos: { ...pos }, radius, damage, t: delay, owner: (owner ?? this.player).id, echo, poison };
    this.blasts.push(blast);
    this.emit({ type: 'blast', id: blast.id, kind, pos: { ...pos }, radius, delay });
  }

  private updateBlasts(dt: number): void {
    for (const blast of [...this.blasts]) {
      blast.t -= dt;
      if (blast.t > 0) continue;
      this.blasts = this.blasts.filter((b) => b !== blast);
      this.act(this.hero(blast.owner), () => this.detonate(blast));
    }
  }

  /** Un sceau ou un météore s'abat : tout ce qui est dessous est frappé, carapaces ignorées. */
  private detonate(blast: Blast): void {
    // C'est le héros qui a posé le sceau qui compte ses victimes (en coop, ce n'est pas forcément le premier).
    const player = this.hero(blast.owner);
    const perks = player.cfg.perks ?? {};
    const meteor = blast.kind === 'meteor';
    this.emit({ type: 'blastEnd', id: blast.id, kind: blast.kind, pos: { ...blast.pos }, radius: blast.radius });
    let touched = 0;
    for (const enemy of [...this.enemies]) {
      if (!enemy.targetable || distance(enemy.pos, blast.pos) - enemy.radius > blast.radius) continue;
      touched++;
      const knockback = meteor ? player.cfg.sorcier.meteor.knockback : 2;
      enemy.burning = ON_FIRE;
      enemy.receiveHit({ amount: blast.damage * player.damageMultiplier(), from: blast.pos, knockback, ignoreShell: true }, this);
      // Sceau d'une voie (Nuée virulente) : il empoisonne ceux qu'il prend, en plus de brûler.
      if (blast.poison) for (let i = 0; i < blast.poison && !enemy.dead; i++) this.poison(enemy, player);
      if (enemy.dead) player.onKill();
      else if (!meteor && perks.sealSlow) enemy.slow(perks.sealSlow.amount, perks.sealSlow.duration, this);
      if (enemy.kind === 'hitodama') this.igniteNear(enemy.pos);
    }
    if (meteor) return;
    // Étincelle : chaque yokai pris dans le sceau rend du mana ; Sol brûlant : le sceau laisse le sol en feu ;
    // Seiman : il explose une seconde fois, moins fort.
    if (perks.sealMana && touched) player.gainMana(perks.sealMana * touched);
    // Bâton de Susanoo : un sceau qui prend une grappe soigne le Sorcier.
    if (perks.sealHeal && touched >= perks.sealHeal.min) player.heal(player.cfg.maxHp * perks.sealHeal.share, this);
    if (perks.sealBurn) this.addEmber(blast.pos, blast.radius, perks.sealBurn.burn, perks.sealBurn.life);
    if (perks.sealEcho && !blast.echo) this.addBlast('seal', blast.pos, blast.radius, blast.damage * perks.sealEcho.damage, perks.sealEcho.delay, true);
  }

  /** Bâton de Susanoo : un dôme de feu autour du Sorcier, qui brûle et arrête ce qui tombe du ciel. */
  castDome(): void {
    const player = this.player;
    const cfg = player.cfg.perks?.fireDome;
    if (!cfg) return;
    const dome: Ember = { id: this.nextFxId--, pos: { ...player.pos }, radius: cfg.radius, burn: cfg.burn, life: cfg.duration, tick: 0, owner: player.id, dome: true };
    this.embers.push(dome);
    this.emit({ type: 'dome', id: dome.id, pos: { ...dome.pos }, radius: dome.radius, life: dome.life });
  }

  /** Vrai si `pos` est sous un dôme de feu. */
  insideDome(pos: Vec2): boolean {
    return this.embers.some((e) => e.dome && distance(e.pos, pos) <= e.radius);
  }

  /** Sol en feu sous `pos` (traînée de la Fuite de feu, Sol brûlant, sceau d'une voie). */
  addEmber(pos: Vec2, radius: number, burn: number, life: number, owner?: Player): void {
    const ember: Ember = { id: this.nextFxId--, pos: { ...pos }, radius, burn, life, tick: 0, owner: (owner ?? this.player).id };
    this.embers.push(ember);
    this.emit({ type: 'ember', id: ember.id, pos: { ...pos }, radius, life });
  }

  private updateEmbers(dt: number): void {
    for (const ember of [...this.embers]) {
      ember.life -= dt;
      ember.tick -= dt;
      if (ember.tick <= 0) {
        ember.tick += BURN_TICK;
        this.act(this.hero(ember.owner), () => this.burnAround(ember.pos, ember.radius, ember.burn * BURN_TICK, true));
      }
      if (ember.life > 0) continue;
      this.embers = this.embers.filter((e) => e !== ember);
      this.emit({ type: 'emberEnd', id: ember.id });
    }
  }

  /** Le Bouclier de flammes brûle les yokai au contact, tant qu'il tient ; dissipé ou brisé, il peut rendre du mana. */
  private updateWard(dt: number): void {
    const player = this.player;
    if (player.ward <= 0) return;
    const cfg = player.cfg.sorcier.ward;
    const broken = player.barrier <= 0;
    player.ward = broken ? 0 : Math.max(0, player.ward - dt);
    if (player.ward <= 0) {
      this.emit({ type: 'wardEnd', pos: { ...player.pos } });
      // Hakama de cendres : un bouclier brisé par les yokai rend des PV.
      const ashes = player.cfg.perks?.wardBreakHeal;
      if (broken && ashes) player.heal(player.cfg.maxHp * ashes, this);
      // Cape du Phénix : un bouclier brisé explose.
      const phoenix = player.cfg.perks?.wardBreakBlast;
      if (broken && phoenix) this.fireBurst(player.pos, phoenix.radius, phoenix.damage);
      if (player.cfg.perks?.wardMana) player.gainMana(player.cfg.perks.wardMana);
      return;
    }
    player.wardTick -= dt;
    if (player.wardTick > 0) return;
    player.wardTick += BURN_TICK;
    this.burnAround(player.pos, cfg.radius, cfg.burn * BURN_TICK);
  }

  /** Explosion de feu autour de `center` (Cape du Phénix). */
  private fireBurst(center: Vec2, radius: number, damage: number): void {
    const player = this.player;
    this.emit({ type: 'blastEnd', id: this.nextFxId--, kind: 'seal', pos: { ...center }, radius });
    for (const enemy of [...this.enemies]) {
      if (!enemy.targetable || distance(enemy.pos, center) - enemy.radius > radius) continue;
      enemy.burning = ON_FIRE;
      enemy.receiveHit({ amount: damage * player.damageMultiplier(), from: center, knockback: 4, ignoreShell: true }, this);
      if (enemy.dead) player.onKill();
    }
  }

  /**
   * Feu du Sorcier (sol en feu, Bouclier de flammes) : `amount` dégâts aux yokai à moins de `radius` m. `ground` : feu au
   * sol, dont les proies rendent du mana avec le Pantalon d'esprit.
   */
  private burnAround(center: Vec2, radius: number, amount: number, ground = false): void {
    const player = this.player;
    const mana = ground ? (player.cfg.perks?.emberKillMana ?? 0) : 0;
    for (const enemy of [...this.enemies]) {
      if (!enemy.targetable || distance(enemy.pos, center) - enemy.radius > radius) continue;
      enemy.burning = ON_FIRE;
      enemy.receiveHit({ amount: amount * player.damageMultiplier(), from: center, knockback: 0, ignoreShell: true }, this);
      if (enemy.dead) player.onKill();
      if (enemy.dead && mana) player.gainMana(mana);
      if (enemy.kind === 'hitodama') this.igniteNear(enemy.pos);
    }
  }

  /** Naissance du feu : `count` boules de feu partent de `from` vers les yokai les plus proches. */
  private burst(from: Vec2, count: number): void {
    const player = this.player;
    const { attack, sorcier } = player.cfg;
    const near = this.enemies
      .filter((e) => e.targetable && distance(e.pos, from) <= attack.range)
      .sort((a, b) => distance(a.pos, from) - distance(b.pos, from));
    if (!near.length) return;
    for (let i = 0; i < count; i++) {
      const target = near[i % near.length];
      const dir = normalize(sub(target.pos, from), fromAngle((i * Math.PI * 2) / count));
      this.launch('fireball', dir, { pos: { ...from }, speed: sorcier.fireball.speed, range: attack.range, damage: attack.damage, knockback: attack.knockback, radius: sorcier.fireball.radius, pierce: sorcier.fireball.pierce ?? false, target: target.id });
    }
  }

  /** Boule de feu : elle s'infléchit vers sa cible ; si elle tombe, vers le yokai le plus proche encore intact. */
  private steer(p: Projectile, dt: number): void {
    const cfg = this.player.cfg.sorcier.fireball;
    // Une boule perforante qui a déjà traversé sa proie file droit vers la suivante.
    let prey = p.target === undefined ? undefined : this.enemies.find((e) => e.id === p.target && e.targetable && !p.hit.has(e.id));
    if (!prey) {
      prey = closest(this.enemies.filter((e) => e.targetable && !p.hit.has(e.id) && distance(e.pos, p.pos) <= cfg.seek), p.pos);
      p.target = prey?.id;
    }
    if (prey) p.dir = rotateTowards(p.dir, normalize(sub(prey.pos, p.pos), p.dir), cfg.turnRate * dt);
  }

  // --- Lame ------------------------------------------------------------------

  /** A : Marque de mort sur l'ennemi le plus proche de la souris, à portée du héros. Faux s'il n'y a personne. */
  deathMark(aim: Vec2): boolean {
    const cfg = this.player.cfg.blade.deathMark;
    const target = closest(this.enemies.filter((e) => e.targetable && distance(e.pos, this.player.pos) <= cfg.range), aim);
    if (!target) return false;
    this.markEnemy(target, 'death', cfg.duration);
    return true;
  }

  /**
   * Leurre laissé là où se tient le héros, que les yokai attaquent un moment à sa place : statuette d'argile de l'Oushebti
   * rôdeur, flamme du Sorcier au Masque d'Oublié.
   */
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
    // La fumée empoisonne les yokai qui s'y trouvent.
    this.poisonCloud(player.pos, cfg.radius, Math.max(cfg.duration, player.cfg.blade.cloud.life));
    // Kemuri-dama : la fumée rend un peu de vie.
    const heal = player.cfg.perks?.smokeHeal;
    if (heal) player.heal(player.cfg.maxHp * heal, this);
    // Masque du Kitsune : un clone reste et attire les yokai ; Manteau d'Ombre : le prochain coup sera critique.
    const clone = player.cfg.perks?.smokeClone;
    if (clone) this.addLure(player.pos, clone);
    if (player.cfg.perks?.smokeCrit) player.smokeCritPrimed = true;
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

  /** Talents qui réagissent à la mort d'un ennemi, quelle qu'en soit la cause. */
  private afterKills(fallen: Enemy[]): void {
    const player = this.player;
    const perks = player.cfg.perks ?? {};
    for (const enemy of fallen) {
      // Festin toxique : une proie qui portait le poison de la Lame la nourrit.
      if (perks.poisonKillHeal && enemy.poison?.hero === player.id) player.heal(perks.poisonKillHeal, this);
      // Marée d'ombre : la Frappe fantôme se rapproche à chaque proie empoisonnée qui tombe.
      if (perks.poisonKillCut && enemy.poison?.hero === player.id) player.ghostCooldown = Math.max(0, player.ghostCooldown - perks.poisonKillCut);
      // Cristal de pyromancie : un yokai qui meurt en feu rend un peu de mana et de vie.
      if (perks.pyroKill && enemy.burning > 0) {
        player.gainMana(perks.pyroKill.mana);
        player.heal(perks.pyroKill.hp, this);
      }
      // Moisson des âmes : la Marque de mort passe à l'ennemi le plus proche.
      if (perks.markJump && enemy.marks.death > 0 && !enemy.boss) {
        const range = player.cfg.blade.deathMark.range;
        const next = closest(this.enemies.filter((e) => e.targetable && distance(e.pos, enemy.pos) <= range), enemy.pos);
        if (next) this.markEnemy(next, 'death', enemy.marks.death);
      }
      // Curée : abattre la proie marquée recharge la Marque du chasseur. Et le Rôdeur se soigne sur sa proie.
      if (perks.markRefund && enemy.marks.hunt > 0) player.huntCooldown = 0;
      // Masque du Traqueur : la proie marquée explose en tombant.
      if (perks.huntBlast && enemy.marks.hunt > 0) this.shockAround(enemy.pos, perks.huntBlast.radius, perks.huntBlast.damage, 3);
      if (player.cfg.kit === 'rodeur' && enemy.marks.hunt > 0) player.heal(player.cfg.maxHp * player.cfg.ranger.huntMark.killHeal, this);
      // Naissance du feu : un yokai qui tombe près du Sorcier libère des boules de feu vers ses voisins.
      if (perks.killBurst && distance(enemy.pos, player.pos) <= player.cfg.attack.range) this.burst(enemy.pos, perks.killBurst);
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

  // --- Paladin ---------------------------------------------------------------

  /** A : Aura de lumière autour du héros. */
  startAura(): void {
    const player = this.player;
    const cfg = player.cfg.paladin.aura;
    player.aura = cfg.duration;
    player.auraTick = 0;
    player.auraStunned.clear();
    this.emit({ type: 'aura', pos: { ...this.player.pos }, radius: cfg.radius });
    // Geta de l'aube : l'Aura s'allume dans un éclair qui brûle les yokai.
    const flash = player.cfg.perks?.auraFlash;
    if (flash) this.shockAround(player.pos, cfg.radius, flash, 0);
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
    // Chacun, Paladin compris, regagne `healShare` de ses PV max sur toute l'Aura, une part à chaque seconde.
    let healed = 0;
    const share = cfg.healShare / Math.max(1, cfg.duration);
    for (const hero of this.standing) {
      if (distance(hero.pos, player.pos) > cfg.radius + hero.radius) continue;
      healed += hero.heal(hero.cfg.maxHp * share, this);
      if (perks.auraArmor || perks.auraDamage) {
        hero.auraArmor = perks.auraArmor ?? 0;
        hero.auraDamage = perks.auraDamage ?? 0;
        hero.auraBuffTime = AURA_BUFF;
      }
    }
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
   * Soigne les héros debout autour de `center` (bouclier du Paladin). Le Paladin qui soigne
   * (`healer`) n'en reçoit qu'une part : il soigne mieux les autres que lui-même.
   */
  healAllies(center: Vec2, radius: number, amount: number, healer?: Player): number {
    let healed = 0;
    for (const hero of this.standing) {
      const shares = hero.cfg.paladin.selfHeal;
      const share = hero === healer ? (shares[Math.min(this.players.length, shares.length) - 1] ?? 1) : 1;
      if (distance(hero.pos, center) <= radius + hero.radius) healed += hero.heal(amount * share, this);
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

  /** Carquois de l'Ouragan : des flèches de plus, en éventail autour du tir. */
  fan(dir: Vec2, arrows: number): void {
    for (let i = 1; i < arrows; i++) {
      const side = (i % 2 ? 1 : -1) * Math.ceil(i / 2);
      this.loose(fromAngle(angleOf(dir) + degToRad(12 * side)));
    }
  }

  /**
   * A : la flèche-filet s'ouvre sur le premier ennemi touché, ou au bout de sa course. Avec les Jambières du Vent, elle
   * s'ouvre aussitôt sous `aim`.
   */
  netArrow(dir: Vec2, aim?: Vec2): void {
    const { ranger } = this.player.cfg;
    if (aim && this.player.cfg.perks?.netInstant) {
      this.netBurst(this.reach(aim, ranger.net.range));
      return;
    }
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
      else {
        this.immobilize(enemy, enemy.boss ? cfg.stun / 2 : cfg.stun, 'net');
        // Waraji de l'éclaireur : le filet empoisonne ce qu'il prend.
        for (let i = 0; i < (this.player.cfg.perks?.netPoison ?? 0); i++) this.poison(enemy, this.player);
      }
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

  // --- Voies (sous-classes) --------------------------------------------------

  /**
   * F : la compétence de la voie (sous-classe), décrite par ses données. Six formes, une seule porte : une onde
   * autour du héros, un sceau au sol (qui peut empoisonner), un sanctuaire (qui peut brûler), un filet qui
   * immobilise, une salve de traits, ou rien du tout (le cri : c'est le héros qui se renforce, dans player.ts).
   */
  castSubclass(cfg: SubclassActiveConfig, aim: Vec2, aimGround: Vec2): void {
    const player = this.player;
    switch (cfg.kind) {
      case 'onde': {
        this.emit({ type: 'shockwave', pos: { ...player.pos }, radius: cfg.radius });
        for (const enemy of [...this.enemies]) {
          if (!enemy.targetable || distance(enemy.pos, player.pos) - enemy.radius > cfg.radius) continue;
          enemy.receiveHit(
            { amount: (cfg.damage ?? 0) * player.damageMultiplier(), from: player.pos, knockback: cfg.knockback ?? 4, ignoreShell: true },
            this,
          );
          if (enemy.dead) player.onKill();
          else if (cfg.stun) enemy.stun(Math.min(SMASH_STUN_MAX, cfg.stun), 'smash', this);
          if (enemy.kind === 'hitodama') this.igniteNear(enemy.pos);
        }
        break;
      }
      case 'sceau': {
        const at = this.reach(aimGround, cfg.range ?? cfg.radius);
        this.addBlast('seal', at, cfg.radius, cfg.damage ?? 0, cfg.delay ?? 0.6, false, player, cfg.poison ?? 0);
        if (cfg.burn) this.addEmber(at, cfg.radius, cfg.burn, cfg.duration ?? 3, player);
        break;
      }
      case 'sanctuaire': {
        const at = this.reach(aimGround, cfg.range ?? cfg.radius);
        this.addSanctuary(at, { heal: player.cfg.maxHp * (cfg.heal ?? 0), duration: cfg.duration ?? 5, radius: cfg.radius, burn: cfg.burn ?? 0 }, player);
        break;
      }
      case 'filet': {
        const at = this.reach(aimGround, cfg.range ?? cfg.radius);
        this.emit({ type: 'netBurst', pos: { ...at }, radius: cfg.radius });
        const stun = cfg.stun ?? 2;
        for (const enemy of this.enemies) {
          if (!enemy.targetable || distance(enemy.pos, at) > cfg.radius + enemy.radius) continue;
          this.immobilize(enemy, enemy.boss ? stun / 2 : stun, 'net');
        }
        break;
      }
      case 'salve': {
        const count = Math.max(1, Math.round(cfg.count ?? 3));
        const dir = normalize(sub(aim, player.pos), player.facing);
        for (let i = 0; i < count; i++) {
          const spread = count === 1 ? 0 : (i / (count - 1) - 0.5) * 2;
          this.launch('arrow', fromAngle(angleOf(dir) + degToRad(SALVE_SPREAD) * spread), {
            speed: SALVE_SPEED,
            range: player.cfg.attack.range * 1.3,
            damage: cfg.damage ?? 0,
            knockback: player.cfg.attack.knockback,
            radius: 0.25,
            pierce: true,
          });
        }
        break;
      }
      case 'cri':
        break;
    }
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
    p: Pick<Projectile, 'speed' | 'range' | 'damage' | 'knockback' | 'radius' | 'pierce'> & { full?: boolean; hit?: Set<number>; pos?: Vec2; target?: number },
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
      } else if (p.kind === 'fireball') {
        this.steer(p, dt);
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
          // Geta de l'Égide : là où le marteau fait demi-tour, le sol garde la prière.
          const zone = player.cfg.perks?.hammerSanctuary;
          if (zone) this.addSanctuary(p.pos, zone);
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
        else if (perks.slowedBonus) enemy.slow(0.4, 1, this);
        if (enemy.kind === 'hitodama') this.igniteNear(enemy.pos);
        // Couronne du Juge : à l'aller, le marteau rebondit une fois vers un autre yokai proche.
        if (perks.hammerBounce && !p.returning && !p.bounced) {
          const reach = perks.hammerBounce;
          const next = closest(this.enemies.filter((e) => e.targetable && e !== enemy && !p.hit.has(e.id) && distance(e.pos, enemy.pos) <= reach), enemy.pos);
          if (next) {
            p.bounced = true;
            p.dir = normalize(sub(next.pos, p.pos), p.dir);
            p.range = distance(next.pos, p.pos) + next.radius;
          }
        }
        return true;
      case 'fireball': {
        // Les boules de feu sont l'attaque de base du Sorcier : des coups d'arme, critiques et talents compris.
        this.weaponHit(enemy, p.damage, from, p.knockback, 1);
        enemy.burning = ON_FIRE;
        const slow = perks.fireballSlow;
        if (slow && !enemy.dead) enemy.slow(slow.amount, slow.duration, this);
        return p.pierce;
      }
      case 'arrow': {
        // Dō de l'archer d'élite, Croc de loup : les tirs de loin portent plus fort, et parfois critiques.
        const far = distance(player.pos, enemy.pos);
        const long = perks.longShot && far >= perks.longShot.distance ? 1 + perks.longShot.bonus : 1;
        const crit = perks.farCrit && far >= perks.farCrit.distance && Math.random() < perks.farCrit.chance ? player.cfg.blade.critFactor : 1;
        this.weaponHit(enemy, p.damage * long, from, p.knockback, crit);
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
   * Empêche les corps au sol de se chevaucher. Pendant une esquive, le joueur traverse les ennemis, pas les souches.
   */
  private separate(): void {
    const bodies = this.enemies.filter((e) => e.active && e.grounded);
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) pushApart(bodies[i], bodies[j]);
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
    }
  }

  private updateHazards(dt: number): void {
    this.hazards = this.hazards.filter((h) => {
      h.t += dt;
      if (h.t < h.cfg.warning) return true;
      this.emit({ type: 'land', id: h.id, pos: h.pos, radius: h.cfg.radius });
      if (h.cfg.fx === 'lightning') this.emit({ type: 'lightning', pos: { ...h.pos } });
      // Les chutes viennent des boss et de leurs serviteurs : elles suivent leur puissance.
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
    // Terrain d'entraînement : sa vague ne s'épuise pas. Le mannequin tombé revient à sa place.
    if (!this.cfg.training && this.waveIndex >= waves.length - 1) {
      this.finish('victory');
      return;
    }
    this.waveTimer -= dt;
    if (this.waveTimer > 0) return;

    // La première vague s'annonce ; au terrain d'entraînement, les retours du mannequin se font sans bannière.
    const first = this.waveIndex < 0;
    this.waveIndex = this.cfg.training ? 0 : this.waveIndex + 1;
    this.waveTimer = WAVE_PAUSE;
    this.spawnWave(waves[this.waveIndex], !this.cfg.training || first);
  }

  /** Fait apparaître la vague `wave` : ses yokai, ses souches, ses pêchers, et son annonce si `announce`. */
  private spawnWave(wave: WaveConfig, announce: boolean): void {
    // Donjon infini : chaque palier a son niveau et ses modificateurs.
    if (wave.difficulty) this.cfg.difficulty = wave.difficulty;
    this.stumps = (wave.stumps ?? []).map((p) => ({ pos: vec(p.x, p.z), radius: this.cfg.stumpRadius }));
    this.peaches = (wave.peaches ?? []).map((p) => ({ pos: vec(p.x, p.z), radius: this.cfg.peachRadius, ripe: true, regrow: 0 }));
    this.webs = [];
    for (const spawn of wave.spawns) {
      for (let i = 0; i < spawn.count; i++) {
        // Lieu fixe quand la vague en donne un (le mannequin d'entraînement) : sinon, au hasard loin du héros.
        const at = spawn.positions?.[i % spawn.positions.length];
        const enemy = this.createEnemy(spawn.kind, at ? vec(at.x, at.z) : this.spawnPoint(), spawn.patrol ?? 0);
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
    if (announce) {
      this.emit({ type: 'wave', index: this.waveIndex, total: this.cfg.waves.length, label: wave.label, hint, step: wave.step, palier: wave.palier });
    }
  }

  private createEnemy(kind: EnemyKind, pos: Vec2, patrol = 0): Enemy {
    const enemy = this.instantiate(kind, this.nextId++, pos, patrol);
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

  private instantiate(kind: EnemyKind, id: number, pos: Vec2, patrol = 0): Enemy {
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
      case 'mannequin':
        return new Mannequin(id, pos, cfg.mannequin, patrol);
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
