import type { GameConfig, HazardConfig } from './config';
import type { CurseId } from './difficulty';
import { Hitodama, Jorogumo, Kappa, KasaObake, Kodama, Oublie, type Enemy } from './enemies';
import { add, angleOf, degToRad, distance, fromAngle, inCone, length, normalize, rotateTowards, scale, sub, vec, type Vec2 } from './math';
import { Player } from './player';
import { Summon, type Soul } from './summons';
import type { EnemyKind, GameEvent, InputFrame, MarkKind, Outcome } from './types';

/** Pause entre deux vagues, en secondes. */
const WAVE_PAUSE = 1.5;
/** Distance minimale entre le joueur et un ennemi qui apparaît. */
const SPAWN_CLEARANCE = 5;
/** Secondes sans être touché avant que la « Sève du Yomi » ne soigne un yokai. */
const SAP_DELAY = 3;
/** Avec le Masque d'Oublié, une âme compte comme si elle était trois fois plus proche que le héros. */
const TAUNT_PULL = 3;

/** Ce qu'un yokai peut attaquer : le héros, ou une âme liée de l'Invocateur. */
export interface Foe {
  pos: Vec2;
  readonly radius: number;
  knockback: Vec2;
  /** Seul le héros bloque (Guerrier, Paladin), et seulement de face. */
  isGuarding(from: Vec2): boolean;
  /** Coup bloqué ; `attacker` : le yokai qui l'a porté (riposte du Paladin). */
  guard(world: World, attacker?: Enemy): void;
  /** Faux si le coup n'a pas porté (esquive, invulnérabilité). */
  takeHit(amount: number, pushDir: Vec2, knockback: number, world: World): boolean;
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
interface Hazard {
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
  readonly player: Player;
  enemies: Enemy[] = [];
  /** Invocateur : âmes liées qui combattent, et âmes au sol prêtes à être liées. */
  summons: Summon[] = [];
  souls: Soul[] = [];
  /** Secondes de Chœur spectral restantes. */
  choir = 0;
  /** Flèches du Rôdeur, marteau du Paladin. */
  projectiles: Projectile[] = [];
  /** Lame : nuage de l'Écran de fumée, que les yokai prennent pour le héros tant qu'il est invisible. */
  smoke: Decoy | null = null;
  /** Paladin : secondes d'Aura de lumière restantes. */
  aura = 0;
  stumps: Stump[] = [];
  webs: Web[] = [];
  state: 'playing' | Outcome = 'playing';
  time = 0;
  private waveIndex = -1;
  private waveTimer = 1;
  private nextId = 1;
  /** Les effets sans corps (toiles, chutes) ont des identifiants négatifs, distincts de ceux des ennemis. */
  private nextFxId = -1;
  private hazards: Hazard[] = [];
  private snares: Snare[] = [];
  /** Ennemis liés vivants (Chant des Enfers) : ils ne laissent pas d'âme au sol. */
  private readonly boundAlive = new Set<number>();
  /** Aura : temps avant le prochain soin, et ennemis déjà étourdis par celle-ci (Ama-no-Iwato). */
  private auraTick = 0;
  private readonly auraStunned = new Set<number>();
  private graves: Grave[] = [];
  private events: GameEvent[] = [];

  /** `startWave` permet de commencer directement à une vague (tests, `?vague=7`). */
  constructor(
    readonly cfg: GameConfig,
    startWave = 0,
  ) {
    this.player = new Player(cfg.player);
    this.waveIndex = Math.max(0, Math.min(cfg.waves.length, startWave)) - 1;
  }

  emit(event: GameEvent): void {
    this.events.push(event);
  }

  drainEvents(): GameEvent[] {
    const events = this.events;
    this.events = [];
    return events;
  }

  /** Tout ce que les yokai peuvent frapper : le héros et les âmes liées relevées. */
  foes(): Foe[] {
    return [this.player, ...this.summons.filter((s) => s.targetable)];
  }

  /** Vrai tant que `foe` peut encore être attaqué (une âme effacée ou brisée ne l'est plus, le héros invisible non plus). */
  isFoe(foe: Foe | null): foe is Foe {
    if (foe === this.player) return this.player.hidden <= 0;
    if (foe instanceof Decoy) return foe === this.smoke;
    return foe instanceof Summon && foe.targetable && this.summons.includes(foe);
  }

  /**
   * La cible d'un yokai : la plus proche, entre le héros et les âmes. Avec le Masque d'Oublié, les âmes passent devant.
   * Invisible, le héros est remplacé par son nuage de fumée.
   */
  pickFoe(from: Vec2): Foe {
    const pull = this.player.cfg.perks?.summonTaunt ? TAUNT_PULL : 1;
    let best: Foe = this.player.hidden > 0 && this.smoke ? this.smoke : this.player;
    let bestScore = distance(from, best.pos);
    for (const summon of this.summons) {
      if (!summon.targetable) continue;
      const score = distance(from, summon.pos) / pull;
      if (score < bestScore) {
        best = summon;
        bestScore = score;
      }
    }
    return best;
  }

  /** Valeur d'une malédiction du niveau de donjon (0 si elle n'est pas active). */
  curse(id: CurseId): number {
    return this.cfg.difficulty?.curses[id] ?? 0;
  }

  update(dt: number, input: InputFrame): void {
    if (this.state !== 'playing') return;
    this.time += dt;
    this.player.summonCount = this.summons.length;
    this.player.update(dt, input, this);
    // « Hâte des morts » : le temps des yokai passe plus vite.
    const haste = 1 + this.curse('hate');
    // Copie : un ennemi peut en faire apparaître d'autres pendant son tour (araignées, feux follets).
    for (const enemy of [...this.enemies]) enemy.update(dt * haste, this);
    this.choir = Math.max(0, this.choir - dt);
    for (const summon of this.summons) summon.update(dt, this);
    for (const summon of this.summons.filter((s) => s.gone)) this.dismiss(summon);
    if (this.smoke && this.player.hidden <= 0) this.smoke = null;
    this.updateAura(dt);
    this.updateProjectiles(dt);
    this.regenerate(dt);
    this.updateHazards(dt);
    this.updateWebs(dt);
    this.updateSnares(dt);
    this.separate();
    this.clearBossMinions();
    const fallen = this.enemies.filter((e) => e.dead);
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.releaseWisps(fallen);
    this.leaveSouls(fallen);
    this.afterKills(fallen);
    this.updateSouls(dt);
    if (this.player.dead) {
      this.finish('defeat');
      return;
    }
    this.updateWaves(dt);
  }

  /**
   * Coup d'arme : touche une seule fois chaque ennemi à portée, dans l'arc visé (`attack.arcDeg`).
   * À 360°, le coup balaie tout autour du héros : le sprite ne se tourne que vers la gauche ou la droite,
   * un arc étroit vers le haut ou le bas de l'écran ne correspondait pas à ce que l'on voit.
   * `crit` : multiplicateur de critique du coup (Lame).
   */
  strike(origin: Vec2, dir: Vec2, alreadyHit: Set<number>, crit = 1): void {
    const attack = this.cfg.player.attack;
    // `enemies` peut contenir des morts du pas en cours : `targetable` les écarte.
    const fullCircle = attack.arcDeg >= 360;
    const halfArc = degToRad(attack.arcDeg / 2);
    for (const enemy of this.enemies) {
      if (!enemy.targetable || alreadyHit.has(enemy.id)) continue;
      const toEnemy = sub(enemy.pos, origin);
      const dist = length(toEnemy);
      if (dist - enemy.radius > attack.range) continue;
      // Un ennemi collé au joueur est touché même s'il déborde de l'arc.
      if (!fullCircle && dist > enemy.radius + 0.2 && !inCone(dir, normalize(toEnemy), halfArc)) continue;
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
    const marked = enemy.marks.death > 0 || enemy.marks.shadow > 0;
    const factor = marked ? Math.max(crit, player.cfg.blade.critFactor) : crit;
    // « Écorce des kodama » : seuls les coups d'arme sont amoindris.
    let amount = base * factor * player.damageMultiplier() * (1 - this.curse('ecorce'));
    const execute = perks.execute;
    if (execute && enemy.hp < enemy.maxHp * execute.threshold) amount *= 1 + execute.bonus;
    const shielded = enemy.receiveHit({ amount, from, knockback, crit: factor > 1 }, this);
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
    // Races : un coup sur quelques-uns appelle la foudre de Zeus ; le sang du Hanyō monte.
    const bolt = player.landHit(this);
    if (bolt && !enemy.dead) {
      this.emit({ type: 'lightning', pos: { ...enemy.pos } });
      enemy.receiveHit({ amount: bolt, from, knockback: 1, ignoreShell: true }, this);
    }
    if (enemy.dead) player.onKill();
    if (enemy.kind === 'hitodama') this.igniteNear(enemy.pos);
    return shielded;
  }

  /** Frappe fracassante : dégâts de zone qui ignorent la carapace et étourdissent. */
  smash(center: Vec2): void {
    const smash = this.cfg.player.smash;
    this.emit({ type: 'smash', pos: center, radius: smash.radius });
    for (const enemy of this.enemies) {
      if (!enemy.targetable || distance(enemy.pos, center) - enemy.radius > smash.radius) continue;
      enemy.receiveHit({ amount: smash.damage * this.player.damageMultiplier(), from: center, knockback: smash.knockback, ignoreShell: true }, this);
      if (!enemy.dead) enemy.stun(smash.stun, 'smash', this);
      else this.player.onKill();
      if (enemy.kind === 'hitodama') this.igniteNear(enemy.pos);
    }
  }

  /** Atterrissage du Bond : dégâts de zone autour du héros, étourdissement avec le talent d'Héraclès. */
  bondLand(center: Vec2): void {
    const bond = this.cfg.player.bond;
    this.emit({ type: 'bondLand', pos: { ...center }, radius: bond.radius });
    for (const enemy of this.enemies) {
      if (!enemy.targetable || distance(enemy.pos, center) - enemy.radius > bond.radius) continue;
      enemy.receiveHit({ amount: bond.damage * this.player.damageMultiplier(), from: center, knockback: bond.knockback }, this);
      if (enemy.dead) this.player.onKill();
      else if (bond.stun > 0) enemy.stun(bond.stun, 'bond', this);
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
    const cfg = this.player.cfg.summon;
    return this.souls.some((s) => distance(s.pos, this.player.pos) <= cfg.bindRange);
  }

  /** A : toutes les âmes foncent sur l'ennemi le plus proche de la souris. Faux s'il n'y a personne à envoyer. */
  recall(aim: Vec2): boolean {
    const target = closest(this.enemies.filter((e) => e.targetable), aim);
    if (!this.summons.length || !target) return false;
    for (const summon of this.summons) summon.rush = { target: target.id, t: this.player.cfg.summon.recall.duration };
    this.emit({ type: 'recall', pos: { ...target.pos } });
    return true;
  }

  /** E : la plus vieille âme explose. */
  sacrifice(): boolean {
    const summon = this.summons[0];
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
    if (!this.summons.length) return false;
    const player = this.player;
    const cfg = player.cfg.summon.choir;
    const perks = player.cfg.perks ?? {};
    this.choir = cfg.duration;
    this.emit({ type: 'choir', pos: { ...player.pos }, radius: cfg.radius });
    if (perks.choirHeal) player.heal(perks.choirHeal, this);
    if (perks.choirStun) {
      for (const enemy of this.enemies) {
        if (enemy.targetable && distance(enemy.pos, player.pos) <= cfg.radius + enemy.radius) enemy.stun(perks.choirStun, 'bond', this);
      }
    }
    return true;
  }

  /** Coup d'une âme liée ; `factor` vaut plus de 1 pendant un Rappel. */
  summonHit(summon: Summon, target: Enemy, factor: number): void {
    const player = this.player;
    const cfg = player.cfg.summon;
    const perks = player.cfg.perks ?? {};
    // Les Douze Shikigami : le feu follet brûle plus fort, l'Oublié étourdit, le kodama soigne le héros.
    const trait = perks.shikigami ? summon.kind : null;
    const fire = trait === 'hitodama' ? 1.5 : 1;
    const choir = this.choir > 0 ? cfg.choir.damageFactor : 1;
    const amount = cfg.damage * (cfg.kinds[summon.kind]?.damage ?? 1) * fire * factor * choir * (perks.summonDamageFactor ?? 1);
    this.emit({ type: 'swing', pos: { ...summon.pos }, dir: summon.facing, range: cfg.attackRange + summon.radius, arcDeg: 90 });
    target.receiveHit({ amount, from: summon.pos, knockback: cfg.knockback }, this);
    if (target.dead) player.onKill();
    else {
      const stun = Math.max(perks.summonStun ?? 0, trait === 'oublie' ? 0.5 : 0);
      if (stun) target.stun(stun, 'snare', this);
    }
    if (trait === 'kodama') player.heal(2, this);
    if (target.kind === 'hitodama') this.igniteNear(target.pos);
  }

  /** Lève une âme alliée ; `holy` : un allié relevé par le Paladin, qui a sa propre robustesse. */
  private raise(kind: EnemyKind, pos: Vec2, holy = false): Summon {
    const player = this.player;
    const cfg = player.cfg.summon;
    const perks = player.cfg.perks ?? {};
    // Au-delà du maximum, la plus vieille âme laisse sa place.
    while (this.summons.length >= Math.max(1, cfg.max)) this.dismiss(this.summons[0]);
    // Les Douze Shikigami : un kappa lié garde sa carapace, deux fois plus de PV et de durée.
    const tough = perks.shikigami && (kind === 'kappa' || kind === 'kappaRenforce') ? 2 : 1;
    const summon = new Summon(this.nextId++, kind, { ...pos }, cfg, holy ? (perks.raiseToughness ?? 1) : tough, holy);
    this.summons.push(summon);
    if (!holy) this.emit({ type: 'bind', id: summon.id, pos: { ...pos }, kind });
    return summon;
  }

  private dismiss(summon: Summon): void {
    this.summons = this.summons.filter((s) => s !== summon);
    // Une âme brisée par les yokai peut être relevée par un Paladin.
    if (summon.broken) this.graves.push({ kind: summon.kind, pos: { ...summon.pos }, time: this.time });
    this.emit({ type: 'summonFade', id: summon.id, pos: { ...summon.pos }, broken: summon.broken });
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
    if (this.player.cfg.kit !== 'invocateur' || fallen.some((e) => e.boss)) return;
    for (const enemy of fallen) {
      if (!this.boundAlive.delete(enemy.id)) this.addSoul(enemy.kind, enemy.pos);
    }
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

  /** E : Écran de fumée. Le nuage reste là où était le héros ; les yokai s'en prennent à lui tant que le héros est invisible. */
  smokeScreen(): void {
    const player = this.player;
    const cfg = player.cfg.blade.smoke;
    this.smoke = new Decoy({ ...player.pos }, cfg.radius);
    this.emit({ type: 'smoke', pos: { ...player.pos }, radius: cfg.radius });
    // Poudre aux yeux : la fumée étourdit ceux qui étaient tout près.
    const stun = player.cfg.perks?.smokeStun;
    if (!stun) return;
    for (const enemy of this.enemies) {
      if (enemy.targetable && distance(enemy.pos, player.pos) <= cfg.radius + enemy.radius) enemy.stun(stun, 'daze', this);
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
      if (!enemy.boss) this.graves.push({ kind: enemy.kind, pos: { ...enemy.pos }, time: this.time });
      // Marée d'ombre : un ennemi marqué abattu rend une charge du Pas de l'ombre.
      if (perks.dashRefund && (enemy.marks.shadow > 0 || enemy.marks.death > 0)) player.refundDash();
      // Moisson des âmes : la Marque de mort passe à l'ennemi le plus proche.
      if (perks.markJump && enemy.marks.death > 0 && !enemy.boss) {
        const range = player.cfg.blade.deathMark.range;
        const next = closest(this.enemies.filter((e) => e.targetable && distance(e.pos, enemy.pos) <= range), enemy.pos);
        if (next) this.markEnemy(next, 'death', enemy.marks.death);
      }
      // Curée : abattre la proie marquée recharge la Marque du chasseur.
      if (perks.markRefund && enemy.marks.hunt > 0) player.huntCooldown = 0;
      // Métamorphe : chaque ennemi tué pendant l'invisibilité la prolonge.
      if (perks.smokeKillExtend && player.hidden > 0) player.hidden += perks.smokeKillExtend;
    }
    const memory = player.cfg.paladin.raise.memory;
    this.graves = this.graves.filter((g) => this.time - g.time <= memory);
  }

  // --- Paladin ---------------------------------------------------------------

  /** A : Aura de lumière autour du héros. */
  startAura(): void {
    const cfg = this.player.cfg.paladin.aura;
    this.aura = cfg.duration;
    this.auraTick = 0;
    this.auraStunned.clear();
    this.emit({ type: 'aura', pos: { ...this.player.pos }, radius: cfg.radius });
  }

  /**
   * L'Aura suit le héros. Chaque seconde, elle soigne ses alliés et brûle les yokai (Chaleur) ;
   * un yokai qui y entre est étourdi une fois (Ama-no-Iwato).
   */
  private updateAura(dt: number): void {
    if (this.aura <= 0) return;
    const player = this.player;
    const cfg = player.cfg.paladin.aura;
    const perks = player.cfg.perks ?? {};
    this.aura = Math.max(0, this.aura - dt);
    const inside = this.enemies.filter((e) => e.targetable && distance(e.pos, player.pos) <= cfg.radius + e.radius);
    if (perks.auraStun) {
      for (const enemy of inside.filter((e) => !this.auraStunned.has(e.id))) {
        this.auraStunned.add(enemy.id);
        enemy.stun(perks.auraStun, 'daze', this);
      }
    }
    this.auraTick -= dt;
    // Un soin par seconde, le premier dès l'activation : six pour une Aura de 6 s.
    if (this.auraTick > 0 || this.aura <= 0) return;
    this.auraTick = 1;
    this.healAllies(player.pos, cfg.radius, cfg.heal);
    if (!perks.auraBurn) return;
    for (const enemy of inside) {
      enemy.receiveHit({ amount: perks.auraBurn * player.damageMultiplier(), from: player.pos, knockback: 0, ignoreShell: true }, this);
      if (enemy.dead) player.onKill();
    }
  }

  /** Soigne le héros et ses âmes alliées autour de `center` (Aura, bouclier du Paladin). */
  healAllies(center: Vec2, radius: number, amount: number): void {
    const player = this.player;
    if (distance(player.pos, center) <= radius + player.radius) player.heal(amount, this);
    for (const summon of this.summons) {
      if (distance(summon.pos, center) <= radius + summon.radius) summon.heal(amount, this);
    }
  }

  /** Le marteau du Paladin est en vol : on ne peut pas le relancer. */
  get hammerOut(): boolean {
    return this.projectiles.some((p) => p.kind === 'hammer');
  }

  /** E : le marteau part vers la souris puis revient au héros, en frappant à l'aller et au retour. */
  throwHammer(dir: Vec2): boolean {
    if (this.hammerOut) return false;
    const cfg = this.player.cfg.paladin.hammer;
    this.launch('hammer', dir, { speed: cfg.speed, range: cfg.range, damage: cfg.damage, knockback: cfg.knockback, radius: cfg.radius, pierce: true });
    return true;
  }

  /** Vrai si Relever a quelqu'un à relever (le HUD le signale). */
  get graveInReach(): boolean {
    const range = this.player.cfg.paladin.raise.range;
    return this.graves.some((g) => distance(g.pos, this.player.pos) <= range);
  }

  /** R : Relever. Les alliés tombés le plus récemment près du héros se relèvent en âmes de lumière. Faux s'il n'y a personne. */
  relever(): boolean {
    const player = this.player;
    const range = player.cfg.paladin.raise.range;
    const perks = player.cfg.perks ?? {};
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
    const power = charge === undefined ? 1 : mix(1, ranger.charged.maxFactor, k) * (perks.chargedDamage ?? 1);
    const count = full && perks.splitShot ? perks.splitShot : 1;
    for (let i = 0; i < count; i++) {
      const angle = angleOf(dir) + degToRad(10) * (i - (count - 1) / 2);
      this.launch('arrow', fromAngle(angle), {
        speed: ranger.arrow.speed * mix(1, ranger.charged.speedFactor, k),
        range: attack.range * mix(1, ranger.charged.rangeFactor, k),
        damage: attack.damage * power,
        knockback: attack.knockback * (full ? 2 : 1),
        radius: ranger.arrow.radius,
        pierce: full && Boolean(perks.chargedPierce),
        full,
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
  netBurst(pos: Vec2): void {
    const cfg = this.player.cfg.ranger.net;
    this.emit({ type: 'netBurst', pos: { ...pos }, radius: cfg.radius });
    for (const enemy of this.enemies) {
      if (!enemy.targetable || distance(enemy.pos, pos) > cfg.radius + enemy.radius) continue;
      enemy.stun(enemy.boss ? cfg.stun / 2 : cfg.stun, 'net', this);
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
    p: Pick<Projectile, 'speed' | 'range' | 'damage' | 'knockback' | 'radius' | 'pierce'> & { full?: boolean },
  ): void {
    this.projectiles.push({
      id: this.nextFxId--,
      kind,
      pos: { ...this.player.pos },
      dir: normalize(dir),
      hit: new Set(),
      full: false,
      returning: false,
      ...p,
    });
  }

  private updateProjectiles(dt: number): void {
    const player = this.player;
    const homing = player.cfg.perks?.homing;
    this.projectiles = this.projectiles.filter((p) => {
      if (p.returning) {
        // Le marteau revient dans la main du héros, où qu'il soit.
        p.dir = normalize(sub(player.pos, p.pos), p.dir);
        if (distance(p.pos, player.pos) < player.radius + p.radius) return false;
      } else if (homing && p.kind === 'arrow') {
        this.home(p, dt);
      }
      const step = p.speed * dt;
      p.pos = add(p.pos, scale(p.dir, step));
      if (!p.returning) p.range -= step;
      for (const enemy of this.enemies) {
        if (!enemy.targetable || p.hit.has(enemy.id) || distance(enemy.pos, p.pos) > enemy.radius + p.radius) continue;
        p.hit.add(enemy.id);
        if (!this.projectileHit(p, enemy)) return false;
      }
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
    });
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
        else if (perks.hammerStun) enemy.stun(perks.hammerStun, 'daze', this);
        if (enemy.kind === 'hitodama') this.igniteNear(enemy.pos);
        return true;
      case 'arrow':
        this.weaponHit(enemy, p.damage, from, p.knockback, 1);
        if (p.full && !enemy.dead) {
          if (perks.chargedMark) this.hunt(enemy, perks.chargedMark);
          if (perks.chargedStun) enemy.stun(perks.chargedStun, 'daze', this);
        }
        return p.pierce;
    }
  }

  /** Kami de la victoire : une flèche s'infléchit vers la proie marquée qu'elle a devant elle. */
  private home(p: Projectile, dt: number): void {
    const ahead = (e: Enemy) => inCone(p.dir, normalize(sub(e.pos, p.pos)), degToRad(60));
    const prey = closest(this.enemies.filter((e) => e.targetable && e.marks.hunt > 0 && !p.hit.has(e.id) && ahead(e)), p.pos);
    if (prey) p.dir = rotateTowards(p.dir, normalize(sub(prey.pos, p.pos)), 8 * dt);
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
      const caught = this.enemies.find((e) => e.targetable && distance(e.pos, snare.pos) <= snare.radius + e.radius);
      if (caught) caught.stun(snare.stun, 'snare', this);
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
      if (distance(p, this.player.pos) > SPAWN_CLEARANCE && !this.insideStump(p, 0.5)) return p;
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

  /** Souche qui gêne le passage d'un corps de rayon `radius` placé en `pos`. */
  insideStump(pos: Vec2, radius: number): Stump | undefined {
    return this.stumps.find((s) => distance(s.pos, pos) < s.radius + radius);
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
    if (!this.player.dodging) {
      for (const enemy of bodies) {
        if (enemy.solid) pushApart(this.player, enemy);
      }
    }
    for (const stump of this.stumps) {
      pushOut(this.player, stump);
      for (const enemy of bodies) {
        if (enemy.kind !== 'hitodama') pushOut(enemy, stump);
      }
      for (const summon of this.summons) pushOut(summon, stump);
    }
  }

  private updateHazards(dt: number): void {
    this.hazards = this.hazards.filter((h) => {
      h.t += dt;
      if (h.t < h.cfg.warning) return true;
      this.emit({ type: 'land', id: h.id, pos: h.pos, radius: h.cfg.radius });
      // Les chutes viennent toutes de la Jorōgumo : elles suivent sa puissance, et frappent aussi les âmes.
      for (const foe of this.foes()) {
        const offset = sub(foe.pos, h.pos);
        if (length(offset) <= h.cfg.radius + foe.radius) foe.takeHit(h.cfg.damage * this.bossMight(), normalize(offset), h.cfg.knockback, this);
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
    if (!this.enemies.some((e) => e.boss && e.dead)) return;
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
    this.stumps = (wave.stumps ?? []).map((p) => ({ pos: vec(p.x, p.z), radius: this.cfg.stumpRadius }));
    this.webs = [];
    for (const spawn of wave.spawns) {
      for (let i = 0; i < spawn.count; i++) this.enemies.push(this.createEnemy(spawn.kind, this.spawnPoint()));
    }
    // « Âmes d'élite » : les yokai les plus robustes de la vague (jamais le boss) deviennent des élites.
    const elites = this.curse('elites');
    const difficulty = this.cfg.difficulty;
    if (elites && difficulty) {
      const candidates = this.enemies.filter((e) => !e.boss).sort((a, b) => b.maxHp - a.maxHp);
      for (const enemy of candidates.slice(0, elites)) enemy.makeElite(difficulty.elite);
    }
    const hint = wave.hints?.[this.player.cfg.kit] ?? wave.hint;
    this.emit({ type: 'wave', index: this.waveIndex, total: waves.length, label: wave.label, hint });
  }

  private createEnemy(kind: EnemyKind, pos: Vec2): Enemy {
    const enemy = this.instantiate(kind, this.nextId++, pos);
    enemy.facing = normalize(sub(this.player.pos, pos));
    // Niveau du donjon : tous les yokai sont renforcés, le boss encore plus sous le « Regard d'Izanami ».
    const difficulty = this.cfg.difficulty;
    if (difficulty) {
      const izanami = enemy.boss ? 1 + this.curse('izanami') : 1;
      enemy.empower(difficulty.hp * izanami, difficulty.damage * izanami);
    }
    return enemy;
  }

  /** Puissance des attaques de zone de la Jorōgumo (niveau du donjon, « Regard d'Izanami »). */
  private bossMight(): number {
    return (this.cfg.difficulty?.damage ?? 1) * (1 + this.curse('izanami'));
  }

  /** « Sève du Yomi » : un yokai épargné quelques secondes se régénère. */
  private regenerate(dt: number): void {
    const rate = this.curse('seve');
    if (!rate) return;
    for (const enemy of this.enemies) {
      if (enemy.active && enemy.wounded && enemy.sinceHurt > SAP_DELAY) enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * rate * dt);
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
    }
  }

  private spawnPoint(): Vec2 {
    const half = this.cfg.arenaHalfSize - 1.5;
    for (let attempt = 0; attempt < 30; attempt++) {
      const p = vec((Math.random() * 2 - 1) * half, (Math.random() * 2 - 1) * half);
      if (distance(p, this.player.pos) > SPAWN_CLEARANCE && !this.insideStump(p, 1)) return p;
    }
    // Arène trop petite : on vise le coin opposé au joueur.
    return vec(-Math.sign(this.player.pos.x || 1) * half, -Math.sign(this.player.pos.z || 1) * half);
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
function pushOut(body: Body, stump: Stump): void {
  const delta = sub(body.pos, stump.pos);
  const dist = length(delta);
  const minDist = body.radius + stump.radius;
  if (dist >= minDist) return;
  body.pos = add(stump.pos, scale(normalize(delta), minDist));
}
