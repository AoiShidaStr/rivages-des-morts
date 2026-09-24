import type {
  EnemyBaseConfig,
  HitodamaConfig,
  JorogumoConfig,
  KappaConfig,
  KasaObakeConfig,
  KodamaConfig,
  MeleeConfig,
  OublieConfig,
} from './config';
import {
  add,
  angleOf,
  degToRad,
  distance,
  distanceToSegment,
  fromAngle,
  inCone,
  length,
  lerp,
  normalize,
  rotateTowards,
  scale,
  sub,
  vec,
  type Vec2,
} from './math';
import type { EnemyKind, Pose, StunReason } from './types';
import type { World } from './world';

/** Temps d'apparition pendant lequel un ennemi ne peut ni agir ni être touché. */
export const SPAWN_TIME = 0.6;
/** Au-dessus de cette hauteur, un ennemi est hors d'atteinte et ne bloque plus le passage. */
const AIRBORNE_ALTITUDE = 0.5;

export interface Hit {
  amount: number;
  from: Vec2;
  knockback: number;
  ignoreShell?: boolean;
}

export abstract class Enemy {
  abstract readonly kind: EnemyKind;
  abstract get pose(): Pose;
  facing: Vec2 = vec(1, 0);
  knockback: Vec2 = vec();
  hp: number;
  spawnTimer = SPAWN_TIME;

  constructor(
    readonly id: number,
    public pos: Vec2,
    private readonly base: EnemyBaseConfig,
  ) {
    this.hp = base.maxHp;
  }

  get radius(): number {
    return this.base.radius;
  }

  get mass(): number {
    return this.base.mass;
  }

  get maxHp(): number {
    return this.base.maxHp;
  }

  get dead(): boolean {
    return this.hp <= 0;
  }

  get wounded(): boolean {
    return this.hp < this.base.maxHp;
  }

  get active(): boolean {
    return this.spawnTimer <= 0 && !this.dead;
  }

  get spawnProgress(): number {
    return 1 - this.spawnTimer / SPAWN_TIME;
  }

  /** Hauteur au-dessus du sol (sauts du kasa-obake). */
  get altitude(): number {
    return 0;
  }

  get grounded(): boolean {
    return this.altitude < AIRBORNE_ALTITUDE;
  }

  /** Vrai si le corps repousse le joueur. Les feux follets et les ennemis en pleine charge le traversent. */
  get solid(): boolean {
    return this.grounded;
  }

  get targetable(): boolean {
    return this.active && this.grounded;
  }

  /** Vrai pour un boss : sa mort termine la vague et dissipe les autres ennemis. */
  get boss(): boolean {
    return false;
  }

  /** Image à afficher ; un ennemi qui change de forme en change. */
  get sprite(): string {
    return this.kind;
  }

  update(dt: number, world: World): void {
    if (this.spawnTimer > 0) {
      this.spawnTimer = Math.max(0, this.spawnTimer - dt);
      return;
    }
    // Étourdissement par défaut (feux follets…) : l'ennemi reste figé, seul le recul le déplace.
    if (this.frozen > 0) this.frozen = Math.max(0, this.frozen - dt);
    else this.think(dt, world);
    this.pos = add(this.pos, scale(this.knockback, dt));
    this.knockback = scale(this.knockback, Math.exp(-8 * dt));
    world.clampToArena(this.pos, this.radius);
  }

  /** Applique un coup ; renvoie vrai si la carapace l'a en partie arrêté. */
  receiveHit(hit: Hit, world: World): boolean {
    const shielded = !hit.ignoreShell && this.shields(hit.from);
    const amount = Math.min(hit.amount * (shielded ? this.shieldFactor : 1) * this.damageFactor, this.hp - this.hpFloor);
    this.hp -= amount;
    const away = normalize(sub(this.pos, hit.from), scale(this.facing, -1));
    const push = hit.knockback * this.base.knockbackFactor * (shielded ? 0.3 : 1);
    this.knockback = add(this.knockback, scale(away, push));
    world.emit({ type: 'enemyHit', id: this.id, pos: { ...this.pos }, amount, shielded });
    if (this.dead) world.emit({ type: 'death', id: this.id, pos: { ...this.pos }, kind: this.kind });
    else if (!shielded) this.onHurt(world);
    return shielded;
  }

  heal(amount: number, world: World): void {
    const gained = Math.min(amount, this.base.maxHp - this.hp);
    if (gained <= 0) return;
    this.hp += gained;
    world.emit({ type: 'heal', id: this.id, pos: { ...this.pos }, amount: gained });
  }

  /** Secondes d'immobilisation, pour les ennemis sans étourdissement propre. */
  protected frozen = 0;

  /** Par défaut, l'ennemi est figé. Kappa, Oublié, kodama… ont leur propre état étourdi. */
  stun(duration: number, reason: StunReason, world: World): void {
    this.frozen = Math.max(this.frozen, duration);
    world.emit({ type: 'stun', id: this.id, pos: { ...this.pos }, reason });
  }

  protected abstract think(dt: number, world: World): void;

  /** Appelé quand un coup porte vraiment (pas sur la carapace). */
  protected onHurt(_world: World): void {}

  protected shields(_from: Vec2): boolean {
    return false;
  }

  protected get shieldFactor(): number {
    return 1;
  }

  /** Multiplicateur des dégâts reçus (boss vulnérable). */
  protected get damageFactor(): number {
    return 1;
  }

  /** PV en dessous desquels les coups ne descendent pas : un boss ne saute pas de phase. */
  protected get hpFloor(): number {
    return 0;
  }
}

/** Feu follet : essaim qui fonce en ondulant et brûle au contact. */
export class Hitodama extends Enemy {
  readonly kind = 'hitodama' as const;
  private retreat = 0;
  private readonly phase = Math.random() * Math.PI * 2;

  constructor(
    id: number,
    pos: Vec2,
    private readonly cfg: HitodamaConfig,
  ) {
    super(id, pos, cfg);
  }

  get pose(): Pose {
    return this.frozen > 0 ? 'stunned' : 'move';
  }

  get solid(): boolean {
    return false;
  }

  protected think(dt: number, world: World): void {
    const player = world.player;
    const toward = normalize(sub(player.pos, this.pos), this.facing);
    this.facing = toward;
    this.retreat = Math.max(0, this.retreat - dt);

    let move: Vec2;
    if (this.retreat > 0) {
      move = scale(toward, -1);
    } else {
      const side = vec(-toward.z, toward.x);
      move = add(toward, scale(side, Math.sin(world.time * 5 + this.phase) * this.cfg.weave));
    }
    const speed = this.cfg.speed * (this.retreat > 0 ? 0.7 : 1);
    this.pos = add(this.pos, scale(normalize(move), speed * dt));

    if (this.retreat > 0 || distance(player.pos, this.pos) > player.radius + this.radius) return;
    if (player.isGuarding(this.pos)) {
      player.guard(world);
      this.retreat = this.cfg.retreatTime;
      this.knockback = scale(toward, -7);
    } else if (player.takeHit(this.cfg.contactDamage, toward, 3, world)) {
      this.retreat = this.cfg.retreatTime;
    }
  }
}

type KodamaState = { kind: 'roam' } | { kind: 'channel'; t: number } | { kind: 'stunned'; t: number };

/** Esprit des arbres : reste derrière ses alliés, loin du joueur, et les soigne. Un coup interrompt le soin. */
export class Kodama extends Enemy {
  readonly kind = 'kodama' as const;
  private state: KodamaState = { kind: 'roam' };
  private healTimer: number;

  constructor(
    id: number,
    pos: Vec2,
    private readonly cfg: KodamaConfig,
  ) {
    super(id, pos, cfg);
    this.healTimer = cfg.healInterval * 0.6;
  }

  get pose(): Pose {
    switch (this.state.kind) {
      case 'roam':
        return 'move';
      case 'channel':
        return 'channel';
      case 'stunned':
        return 'stunned';
    }
  }

  stun(duration: number, reason: StunReason, world: World): void {
    this.interrupt(world);
    this.state = { kind: 'stunned', t: duration };
    world.emit({ type: 'stun', id: this.id, pos: { ...this.pos }, reason });
  }

  protected onHurt(world: World): void {
    if (this.state.kind !== 'channel') return;
    this.interrupt(world);
    this.state = { kind: 'roam' };
  }

  protected think(dt: number, world: World): void {
    const cfg = this.cfg;
    const player = world.player;
    const allies = world.enemies.filter((e) => e !== this && e.active);
    this.facing = normalize(sub(player.pos, this.pos), this.facing);

    const state = this.state;
    switch (state.kind) {
      case 'stunned':
        state.t -= dt;
        if (state.t <= 0) this.state = { kind: 'roam' };
        return;
      case 'channel':
        state.t += dt;
        if (state.t < cfg.healChannel) return;
        world.emit({ type: 'channelEnd', id: this.id, pos: { ...this.pos }, radius: cfg.healRadius, healed: true });
        for (const ally of allies) {
          if (distance(ally.pos, this.pos) <= cfg.healRadius) ally.heal(cfg.healAmount, world);
        }
        this.state = { kind: 'roam' };
        this.healTimer = cfg.healInterval;
        return;
      case 'roam': {
        this.healTimer -= dt;
        const patients = allies.filter((a) => a.wounded && distance(a.pos, this.pos) <= cfg.healRadius);
        if (this.healTimer <= 0 && patients.length > 0) {
          this.state = { kind: 'channel', t: 0 };
          world.emit({ type: 'channel', id: this.id, pos: { ...this.pos }, radius: cfg.healRadius, duration: cfg.healChannel });
          return;
        }
        this.pos = add(this.pos, scale(this.steer(allies, player.pos), cfg.speed * dt));
      }
    }
  }

  /** Se place derrière l'allié le plus blessé par rapport au joueur ; fuit si le joueur s'approche. */
  private steer(allies: Enemy[], playerPos: Vec2): Vec2 {
    const cfg = this.cfg;
    const away = normalize(sub(this.pos, playerPos));
    if (distance(this.pos, playerPos) < cfg.fleeDistance) return away;
    let patient: Enemy | null = null;
    for (const ally of allies) {
      if (!patient || ally.hp / ally.maxHp < patient.hp / patient.maxHp) patient = ally;
    }
    const anchor = patient
      ? add(patient.pos, scale(normalize(sub(patient.pos, playerPos)), 1.5))
      : add(playerPos, scale(away, cfg.keepDistance));
    const toAnchor = sub(anchor, this.pos);
    return length(toAnchor) < 0.3 ? vec() : normalize(toAnchor);
  }

  private interrupt(world: World): void {
    if (this.state.kind !== 'channel') return;
    world.emit({ type: 'channelEnd', id: this.id, pos: { ...this.pos }, radius: this.cfg.healRadius, healed: false });
    this.healTimer = this.cfg.healInterval / 2;
  }
}

type KappaState =
  | { kind: 'walk' }
  | { kind: 'telegraph'; t: number; dir: Vec2; duration: number }
  | { kind: 'charge'; dir: Vec2; traveled: number }
  | { kind: 'recover'; t: number }
  | { kind: 'stunned'; t: number };

/**
 * Kappa : tourne lentement, s'annonce puis charge en ligne droite.
 * Sa carapace arrête les coups de face ; bloquer sa charge renverse sa coupelle et l'étourdit.
 * Le kappa renforcé utilise la même logique avec plus de PV et des charges enchaînées.
 */
export class Kappa extends Enemy {
  private state: KappaState = { kind: 'walk' };
  private cooldown = 1;
  private chargesLeft = 0;

  constructor(
    id: number,
    pos: Vec2,
    private readonly cfg: KappaConfig,
    readonly kind: 'kappa' | 'kappaRenforce' = 'kappa',
  ) {
    super(id, pos, cfg);
  }

  get pose(): Pose {
    switch (this.state.kind) {
      case 'walk':
        return 'move';
      case 'telegraph':
        return 'windup';
      case 'charge':
        return 'dash';
      case 'recover':
        return 'idle';
      case 'stunned':
        return 'stunned';
    }
  }

  get solid(): boolean {
    return this.state.kind !== 'charge';
  }

  stun(duration: number, reason: StunReason, world: World): void {
    if (this.state.kind === 'telegraph' || this.state.kind === 'charge') world.emit({ type: 'chargeEnd', id: this.id });
    this.chargesLeft = 0;
    this.state = { kind: 'stunned', t: duration };
    world.emit({ type: 'stun', id: this.id, pos: { ...this.pos }, reason });
  }

  protected get shieldFactor(): number {
    return this.cfg.shellDamageFactor;
  }

  protected shields(from: Vec2): boolean {
    if (this.state.kind === 'stunned') return false;
    const toward = normalize(sub(from, this.pos), this.facing);
    return inCone(this.facing, toward, degToRad(this.cfg.shellArcDeg / 2));
  }

  protected think(dt: number, world: World): void {
    const cfg = this.cfg;
    const player = world.player;
    const toPlayer = sub(player.pos, this.pos);
    const toward = normalize(toPlayer, this.facing);
    this.cooldown = Math.max(0, this.cooldown - dt);

    const state = this.state;
    switch (state.kind) {
      case 'walk': {
        this.facing = rotateTowards(this.facing, toward, degToRad(cfg.turnRateDeg) * dt);
        const gap = length(toPlayer) - this.radius - player.radius;
        if (gap > 0.1) this.pos = add(this.pos, scale(this.facing, cfg.speed * dt));
        const aligned = inCone(this.facing, toward, degToRad(20));
        if (this.cooldown <= 0 && length(toPlayer) <= cfg.chargeRange && aligned) {
          this.chargesLeft = cfg.comboCharges;
          this.startTelegraph(this.facing, cfg.telegraph, world);
        }
        break;
      }
      case 'telegraph':
        state.t += dt;
        if (state.t >= state.duration) {
          this.chargesLeft--;
          this.state = { kind: 'charge', dir: state.dir, traveled: 0 };
        }
        break;
      case 'charge':
        this.charge(state, dt, world);
        break;
      case 'recover':
      case 'stunned':
        state.t -= dt;
        if (state.t <= 0) {
          this.cooldown = state.kind === 'stunned' ? cfg.cooldown / 2 : cfg.cooldown;
          this.state = { kind: 'walk' };
        }
        break;
    }
  }

  private startTelegraph(dir: Vec2, duration: number, world: World): void {
    this.facing = { ...dir };
    this.state = { kind: 'telegraph', t: 0, dir: { ...dir }, duration };
    world.emit({
      type: 'telegraph',
      id: this.id,
      from: { ...this.pos },
      dir: { ...dir },
      length: this.cfg.chargeDistance,
      width: this.radius * 2,
      duration,
    });
  }

  private charge(state: Extract<KappaState, { kind: 'charge' }>, dt: number, world: World): void {
    const cfg = this.cfg;
    const player = world.player;
    const step = cfg.chargeSpeed * dt;
    this.pos = add(this.pos, scale(state.dir, step));
    state.traveled += step;

    if (distance(player.pos, this.pos) < player.radius + this.radius) {
      if (player.isGuarding(this.pos)) {
        // La coupelle se renverse : le kappa est étourdi, le joueur recule et gagne de la rage.
        player.guard(world);
        player.knockback = scale(state.dir, 5);
        world.emit({ type: 'parry', id: this.id, pos: { ...this.pos } });
        this.stun(cfg.parryStun, 'parry', world);
        return;
      }
      if (player.takeHit(cfg.chargeDamage, state.dir, cfg.chargeKnockback, world)) {
        this.endCharge(world);
        return;
      }
    }
    if (world.clampToArena(this.pos, this.radius)) {
      this.stun(cfg.wallStun, 'wall', world);
      return;
    }
    if (state.traveled >= cfg.chargeDistance) this.endCharge(world);
  }

  /** Fin d'une charge : l'élite repart aussitôt vers le joueur tant qu'il lui reste des charges. */
  private endCharge(world: World): void {
    world.emit({ type: 'chargeEnd', id: this.id });
    if (this.chargesLeft > 0) {
      this.startTelegraph(normalize(sub(world.player.pos, this.pos), this.facing), this.cfg.comboTelegraph, world);
    } else {
      this.state = { kind: 'recover', t: this.cfg.recover };
    }
  }
}

type KasaState =
  | { kind: 'pause'; t: number }
  | { kind: 'hop'; t: number; from: Vec2; to: Vec2 }
  | { kind: 'rise'; t: number }
  | { kind: 'hang'; t: number; target: Vec2 }
  | { kind: 'fall'; t: number; target: Vec2 }
  | { kind: 'recover'; t: number };

/** Hauteur du grand saut : assez pour sortir de l'écran. */
const KASA_JUMP_HEIGHT = 8;

/**
 * Parapluie hanté : sautille au hasard, puis bondit très haut et retombe sur le joueur.
 * Seule l'ombre et le cercle au sol annoncent l'endroit de la chute : il faut esquiver, pas bloquer.
 */
export class KasaObake extends Enemy {
  readonly kind = 'kasaObake' as const;
  private state: KasaState;
  private height = 0;
  private jumpTimer: number;

  constructor(
    id: number,
    pos: Vec2,
    private readonly cfg: KasaObakeConfig,
  ) {
    super(id, pos, cfg);
    this.state = { kind: 'pause', t: this.randomPause() };
    // Décalage aléatoire : plusieurs kasa-obake ne sautent pas tous en même temps.
    this.jumpTimer = cfg.jumpCooldown * (0.5 + Math.random());
  }

  get altitude(): number {
    return this.height;
  }

  get pose(): Pose {
    switch (this.state.kind) {
      case 'hop':
        return 'move';
      case 'rise':
      case 'hang':
      case 'fall':
        return 'airborne';
      case 'recover':
        return 'stunned';
      case 'pause':
        return 'idle';
    }
  }

  stun(duration: number, reason: StunReason, world: World): void {
    if (!this.grounded) return;
    this.height = 0;
    this.state = { kind: 'recover', t: duration };
    world.emit({ type: 'stun', id: this.id, pos: { ...this.pos }, reason });
  }

  protected think(dt: number, world: World): void {
    const cfg = this.cfg;
    const player = world.player;
    this.facing = normalize(sub(player.pos, this.pos), this.facing);
    this.jumpTimer = Math.max(0, this.jumpTimer - dt);

    const state = this.state;
    switch (state.kind) {
      case 'pause':
        state.t -= dt;
        if (state.t > 0) break;
        if (this.jumpTimer <= 0 && distance(player.pos, this.pos) <= cfg.jumpRange && Math.random() < cfg.jumpChance) {
          this.jumpTimer = cfg.jumpCooldown;
          this.state = { kind: 'rise', t: 0 };
        } else {
          this.state = { kind: 'hop', t: 0, from: { ...this.pos }, to: this.hopTarget(player.pos) };
        }
        break;
      case 'hop': {
        state.t += dt;
        const k = Math.min(1, state.t / cfg.hopTime);
        this.pos = lerp(state.from, state.to, k);
        this.height = Math.sin(k * Math.PI) * cfg.hopHeight;
        if (k >= 1) {
          this.height = 0;
          this.state = { kind: 'pause', t: this.randomPause() };
        }
        break;
      }
      case 'rise': {
        state.t += dt;
        const k = Math.min(1, state.t / cfg.riseTime);
        this.height = k * k * KASA_JUMP_HEIGHT;
        if (k < 1) break;
        // La cible est fixée maintenant : c'est là qu'il retombera, même si le joueur bouge.
        const target = { ...player.pos };
        this.state = { kind: 'hang', t: 0, target };
        world.emit({ type: 'jump', id: this.id, target, radius: cfg.landRadius, duration: cfg.hangTime + cfg.fallTime });
        break;
      }
      case 'hang':
        state.t += dt;
        this.pos = { ...state.target };
        if (state.t >= cfg.hangTime) this.state = { kind: 'fall', t: 0, target: state.target };
        break;
      case 'fall': {
        state.t += dt;
        const k = Math.min(1, state.t / cfg.fallTime);
        this.height = (1 - k * k) * KASA_JUMP_HEIGHT;
        if (k >= 1) this.land(state.target, world);
        break;
      }
      case 'recover':
        state.t -= dt;
        if (state.t <= 0) this.state = { kind: 'pause', t: this.randomPause() };
        break;
    }
  }

  private land(target: Vec2, world: World): void {
    const cfg = this.cfg;
    const player = world.player;
    this.height = 0;
    this.pos = { ...target };
    world.emit({ type: 'land', id: this.id, pos: { ...target }, radius: cfg.landRadius });
    const offset = sub(player.pos, target);
    if (length(offset) <= cfg.landRadius + player.radius) {
      player.takeHit(cfg.landDamage, normalize(offset), cfg.landKnockback, world);
    }
    this.state = { kind: 'recover', t: cfg.landRecover };
  }

  /** Petit bond imprévisible : vers le joueur, mais dévié au hasard, parfois même vers l'arrière. */
  private hopTarget(playerPos: Vec2): Vec2 {
    const angle = angleOf(sub(playerPos, this.pos)) + (Math.random() * 2 - 1) * degToRad(110);
    const reach = this.cfg.hopDistance * (0.6 + Math.random() * 0.6);
    return add(this.pos, scale(fromAngle(angle), reach));
  }

  private randomPause(): number {
    return this.cfg.pauseMin + Math.random() * (this.cfg.pauseMax - this.cfg.pauseMin);
  }
}

type OublieState =
  | { kind: 'chase' }
  | { kind: 'windup'; t: number; dir: Vec2 }
  | { kind: 'recover'; t: number }
  | { kind: 'stunned'; t: number };

/**
 * Âme oubliée au masque blanc : ennemi de mêlée ordinaire, qui marque une pause avant de frapper.
 * Les petites araignées de la Jorōgumo suivent la même logique, en plus rapides et plus fragiles.
 */
export class Oublie extends Enemy {
  private state: OublieState = { kind: 'chase' };
  private cooldown = 0.5;

  constructor(
    id: number,
    pos: Vec2,
    private readonly cfg: OublieConfig,
    readonly kind: 'oublie' | 'araignee' = 'oublie',
  ) {
    super(id, pos, cfg);
  }

  get pose(): Pose {
    const state = this.state;
    switch (state.kind) {
      case 'chase':
        return 'move';
      case 'windup':
        return 'windup';
      case 'recover':
        return state.t > this.cfg.recover - 0.15 ? 'strike' : 'idle';
      case 'stunned':
        return 'stunned';
    }
  }

  stun(duration: number, reason: StunReason, world: World): void {
    this.state = { kind: 'stunned', t: duration };
    world.emit({ type: 'stun', id: this.id, pos: { ...this.pos }, reason });
  }

  protected think(dt: number, world: World): void {
    const cfg = this.cfg;
    const player = world.player;
    const toPlayer = sub(player.pos, this.pos);
    const dist = length(toPlayer);
    const toward = normalize(toPlayer, this.facing);
    this.cooldown = Math.max(0, this.cooldown - dt);

    const state = this.state;
    switch (state.kind) {
      case 'chase':
        this.facing = toward;
        if (dist > cfg.attackRange * 0.8 + player.radius) this.pos = add(this.pos, scale(toward, cfg.speed * dt));
        if (this.cooldown <= 0 && dist <= cfg.attackRange + player.radius) {
          this.state = { kind: 'windup', t: 0, dir: toward };
        }
        break;
      case 'windup':
        state.t += dt;
        if (state.t < cfg.windup) break;
        this.swing(state.dir, world);
        this.state = { kind: 'recover', t: cfg.recover };
        this.cooldown = cfg.cooldown;
        break;
      case 'recover':
      case 'stunned':
        state.t -= dt;
        if (state.t <= 0) this.state = { kind: 'chase' };
        break;
    }
  }

  private swing(dir: Vec2, world: World): void {
    const cfg = this.cfg;
    const player = world.player;
    world.emit({ type: 'enemySwing', pos: { ...this.pos }, dir, range: cfg.attackRange });
    const toPlayer = sub(player.pos, this.pos);
    if (length(toPlayer) > cfg.attackRange + player.radius) return;
    if (!inCone(dir, normalize(toPlayer, dir), degToRad(cfg.arcDeg / 2))) return;
    if (player.isGuarding(this.pos)) player.guard(world);
    else player.takeHit(cfg.damage, dir, cfg.knockback, world);
  }
}

type JorogumoState =
  | { kind: 'walk' }
  | { kind: 'melee'; t: number; dir: Vec2 }
  | { kind: 'meleeRecover'; t: number }
  | { kind: 'summon'; t: number }
  | { kind: 'transform'; t: number }
  | { kind: 'telegraph'; t: number; dir: Vec2 }
  | { kind: 'charge'; dir: Vec2; traveled: number }
  | { kind: 'recover'; t: number }
  | { kind: 'stunned'; t: number; snagged: boolean }
  | { kind: 'climb'; t: number }
  | { kind: 'ceiling' }
  | { kind: 'aim'; t: number }
  | { kind: 'pull'; t: number; dodged: boolean }
  | { kind: 'drop'; t: number; from: Vec2; to: Vec2; snag: boolean }
  | { kind: 'grounded'; t: number };

/** Ce que le rendu doit tracer du fil de traction : visé (fin) ou tendu (le joueur est tiré). */
export interface Thread {
  to: Vec2;
  taut: boolean;
}

const PHASES = [
  { label: 'La dame des rizières', hint: "Ses toiles te ralentissent. Frappe un feu follet près d'une toile pour la brûler." },
  { label: 'Sa vraie forme', hint: 'Elle charge en ligne droite et tisse partout où elle passe. Les souches, elles, ne bougent pas.' },
  {
    label: 'Au plafond',
    hint: "Son fil t'attire vers elle. Une vieille légende parle d'un homme, d'une cascade et d'une souche…",
  },
];

/**
 * Jorōgumo, boss des Rizières noyées, en trois phases :
 * 1. forme humaine : éventail, petites araignées, toiles lancées ;
 * 2. forme d'araignée : charges, morsures, toiles semées derrière elle ;
 * 3. au plafond : pluie de fils, puis un fil qui tire le joueur vers elle. Esquiver autour
 *    d'une souche pendant la traction y accroche le fil (le fil de Jōren) : elle est arrachée
 *    du plafond et reste vulnérable.
 */
export class Jorogumo extends Enemy {
  readonly kind = 'jorogumo' as const;
  phase = 1;
  private state: JorogumoState = { kind: 'walk' };
  private height = 0;
  private meleeCooldown = 1;
  private summonTimer: number;
  private webTimer: number;
  private chargeCooldown = 0;
  private rainTimer = 0;
  private pullTimer = 0;
  private hitodamaTimer = 2;
  private drift: Vec2;

  constructor(
    id: number,
    pos: Vec2,
    private readonly cfg: JorogumoConfig,
  ) {
    super(id, pos, cfg);
    this.summonTimer = cfg.human.summonInterval * 0.4;
    this.webTimer = cfg.human.webTossInterval * 0.6;
    this.drift = { ...pos };
  }

  get boss(): boolean {
    return true;
  }

  get sprite(): string {
    return this.phase === 1 ? 'jorogumo' : 'jorogumoAraignee';
  }

  get radius(): number {
    return this.phase === 1 ? this.cfg.radius : this.cfg.spider.radius;
  }

  get altitude(): number {
    return this.height;
  }

  get solid(): boolean {
    return this.grounded && this.state.kind !== 'charge';
  }

  get targetable(): boolean {
    return super.targetable && this.state.kind !== 'transform' && this.state.kind !== 'drop';
  }

  /** Fil tendu vers le joueur pendant la phase au plafond. */
  get thread(): Thread | null {
    if (this.state.kind === 'aim') return { to: this.pos, taut: false };
    if (this.state.kind === 'pull') return { to: this.pos, taut: true };
    return null;
  }

  get pose(): Pose {
    const state = this.state;
    switch (state.kind) {
      case 'walk':
        return 'move';
      case 'melee':
      case 'telegraph':
      case 'transform':
      case 'aim':
        return 'windup';
      case 'meleeRecover':
        return state.t > this.meleeCfg.recover - 0.15 ? 'strike' : 'idle';
      case 'summon':
        return 'channel';
      case 'charge':
        return 'dash';
      case 'pull':
        return 'strike';
      case 'stunned':
        return 'stunned';
      case 'climb':
      case 'drop':
        return 'airborne';
      case 'recover':
      case 'ceiling':
      case 'grounded':
        return 'idle';
    }
  }

  stun(duration: number, reason: StunReason, world: World): void {
    const s = this.state.kind;
    if (!this.grounded || s === 'transform' || s === 'drop' || s === 'stunned') return;
    if (s === 'telegraph' || s === 'charge') world.emit({ type: 'chargeEnd', id: this.id });
    // Un boss se remet plus vite d'une frappe fracassante.
    this.state = { kind: 'stunned', t: reason === 'smash' ? duration / 2 : duration, snagged: reason === 'snag' };
    world.emit({ type: 'stun', id: this.id, pos: { ...this.pos }, reason });
  }

  protected get damageFactor(): number {
    return this.state.kind === 'stunned' && this.state.snagged ? this.cfg.ceiling.snagDamageFactor : 1;
  }

  protected get hpFloor(): number {
    // Chaque phase se joue : la forme humaine ne peut pas perdre plus que ses PV et ceux de la forme d'araignée.
    if (this.phase === 1) return this.cfg.maxHp * this.cfg.ceilingAt + 1;
    if (this.phase === 2) return 1;
    return 0;
  }

  private get meleeCfg(): MeleeConfig {
    return this.phase === 1 ? this.cfg.human.fan : this.cfg.spider.bite;
  }

  protected think(dt: number, world: World): void {
    this.meleeCooldown = Math.max(0, this.meleeCooldown - dt);
    this.chargeCooldown = Math.max(0, this.chargeCooldown - dt);
    this.tendHitodama(dt, world);
    if (this.checkPhase(world)) return;

    const state = this.state;
    switch (state.kind) {
      case 'walk':
        if (this.phase === 1) this.walkHuman(dt, world);
        else this.walkSpider(dt, world);
        break;
      case 'melee':
        state.t += dt;
        if (state.t < this.meleeCfg.windup) break;
        this.swing(state.dir, world);
        this.state = { kind: 'meleeRecover', t: this.meleeCfg.recover };
        this.meleeCooldown = this.meleeCfg.cooldown;
        break;
      case 'summon':
        state.t += dt;
        if (state.t < this.cfg.human.summonChannel) break;
        this.summonSpiders(world);
        this.state = { kind: 'walk' };
        break;
      case 'transform':
        state.t += dt;
        if (state.t < this.cfg.transformTime) break;
        if (this.phase === 3) this.state = { kind: 'climb', t: 0 };
        else this.state = { kind: 'walk' };
        break;
      case 'telegraph':
        state.t += dt;
        this.facing = state.dir;
        if (state.t >= this.cfg.spider.telegraph) this.state = { kind: 'charge', dir: state.dir, traveled: 0 };
        break;
      case 'charge':
        this.charge(state, dt, world);
        break;
      case 'meleeRecover':
      case 'recover':
        state.t -= dt;
        if (state.t <= 0) this.state = { kind: 'walk' };
        break;
      case 'stunned':
      case 'grounded':
        state.t -= dt;
        if (state.t <= 0) this.state = this.phase === 3 ? { kind: 'climb', t: 0 } : { kind: 'walk' };
        break;
      case 'climb': {
        state.t += dt;
        const k = Math.min(1, state.t / this.cfg.ceiling.climbTime);
        this.height = k * this.cfg.ceiling.height;
        if (k >= 1) {
          this.state = { kind: 'ceiling' };
          this.rainTimer = Math.min(this.rainTimer, 1);
          this.pullTimer = Math.max(this.pullTimer, 2.5);
        }
        break;
      }
      case 'ceiling':
        this.updateCeiling(dt, world);
        break;
      case 'aim':
        state.t += dt;
        if (state.t >= this.cfg.ceiling.pullAim) this.state = { kind: 'pull', t: 0, dodged: false };
        break;
      case 'pull':
        this.pull(state, dt, world);
        break;
      case 'drop':
        this.drop(state, dt, world);
        break;
    }
  }

  /** Passe à la phase suivante quand les PV franchissent un seuil. Renvoie vrai si la transformation commence. */
  private checkPhase(world: World): boolean {
    const s = this.state.kind;
    if (s === 'transform' || s === 'climb' || s === 'drop' || this.phase >= 3) return false;
    const threshold = this.phase === 1 ? this.cfg.spiderAt : this.cfg.ceilingAt;
    if (this.hp > this.cfg.maxHp * threshold) return false;
    if (s === 'telegraph' || s === 'charge') world.emit({ type: 'chargeEnd', id: this.id });
    this.phase++;
    this.state = { kind: 'transform', t: 0 };
    const { label, hint } = PHASES[this.phase - 1];
    world.emit({ type: 'bossPhase', phase: this.phase, label, hint });
    return true;
  }

  /** Entretient quelques feux follets dans l'arène : c'est avec eux qu'on brûle les toiles. */
  private tendHitodama(dt: number, world: World): void {
    this.hitodamaTimer -= dt;
    if (this.hitodamaTimer > 0) return;
    this.hitodamaTimer = this.cfg.hitodamaInterval;
    const count = world.enemies.filter((e) => e.kind === 'hitodama' && !e.dead).length;
    if (count < this.cfg.hitodamaCount) world.spawn('hitodama', world.edgePoint());
  }

  private walkHuman(dt: number, world: World): void {
    const cfg = this.cfg.human;
    const player = world.player;
    const toPlayer = sub(player.pos, this.pos);
    const dist = length(toPlayer);
    const toward = normalize(toPlayer, this.facing);
    this.facing = toward;

    this.webTimer -= dt;
    if (this.webTimer <= 0) {
      this.webTimer = cfg.webTossInterval;
      world.dropHazard(player.pos, cfg.webToss, true);
    }
    this.summonTimer -= dt;
    const spiders = world.enemies.filter((e) => e.kind === 'araignee' && !e.dead).length;
    if (this.summonTimer <= 0 && spiders < cfg.maxSpiders) {
      this.summonTimer = cfg.summonInterval;
      this.state = { kind: 'summon', t: 0 };
      return;
    }

    const reach = cfg.fan.range + player.radius;
    if (this.meleeCooldown <= 0) {
      if (dist <= reach) {
        this.state = { kind: 'melee', t: 0, dir: toward };
        return;
      }
      this.pos = add(this.pos, scale(toward, cfg.speed * dt));
    } else if (dist < cfg.keepDistance) {
      // Entre deux coups d'éventail, elle recule avec grâce.
      this.pos = add(this.pos, scale(toward, -cfg.speed * 0.6 * dt));
    }
  }

  private walkSpider(dt: number, world: World): void {
    const cfg = this.cfg.spider;
    const player = world.player;
    const toPlayer = sub(player.pos, this.pos);
    const dist = length(toPlayer);
    const toward = normalize(toPlayer, this.facing);
    this.facing = rotateTowards(this.facing, toward, degToRad(cfg.turnRateDeg) * dt);

    this.webTimer -= dt;
    if (this.webTimer <= 0) {
      this.webTimer = cfg.webLayInterval;
      world.addWeb(this.pos);
    }

    if (this.meleeCooldown <= 0 && dist <= cfg.bite.range + player.radius) {
      this.state = { kind: 'melee', t: 0, dir: toward };
      return;
    }
    const aligned = inCone(this.facing, toward, degToRad(15));
    if (this.chargeCooldown <= 0 && dist <= cfg.chargeRange && dist > cfg.bite.range + 1 && aligned) {
      this.state = { kind: 'telegraph', t: 0, dir: { ...this.facing } };
      world.emit({
        type: 'telegraph',
        id: this.id,
        from: { ...this.pos },
        dir: { ...this.facing },
        length: cfg.chargeDistance,
        width: this.radius * 2,
        duration: cfg.telegraph,
      });
      return;
    }
    if (dist - this.radius - player.radius > 0.2) this.pos = add(this.pos, scale(this.facing, cfg.speed * dt));
  }

  private swing(dir: Vec2, world: World): void {
    const cfg = this.meleeCfg;
    const player = world.player;
    world.emit({ type: 'enemySwing', pos: { ...this.pos }, dir, range: cfg.range });
    const toPlayer = sub(player.pos, this.pos);
    if (length(toPlayer) > cfg.range + player.radius) return;
    if (!inCone(dir, normalize(toPlayer, dir), degToRad(cfg.arcDeg / 2))) return;
    if (player.isGuarding(this.pos)) player.guard(world);
    else player.takeHit(cfg.damage, dir, cfg.knockback, world);
  }

  private summonSpiders(world: World): void {
    const cfg = this.cfg.human;
    const alive = world.enemies.filter((e) => e.kind === 'araignee' && !e.dead).length;
    const count = Math.min(cfg.summonCount, cfg.maxSpiders - alive);
    for (let i = 0; i < count; i++) {
      const angle = (i / Math.max(1, count)) * Math.PI * 2 + Math.random();
      world.spawn('araignee', add(this.pos, scale(fromAngle(angle), this.radius + 0.8)));
    }
  }

  private charge(state: Extract<JorogumoState, { kind: 'charge' }>, dt: number, world: World): void {
    const cfg = this.cfg.spider;
    const player = world.player;
    const step = cfg.chargeSpeed * dt;
    this.pos = add(this.pos, scale(state.dir, step));
    state.traveled += step;

    if (distance(player.pos, this.pos) < player.radius + this.radius) {
      if (player.isGuarding(this.pos)) {
        player.guard(world);
        player.knockback = scale(state.dir, 6);
        this.endCharge(world);
        return;
      }
      if (player.takeHit(cfg.chargeDamage, state.dir, cfg.chargeKnockback, world)) {
        this.endCharge(world);
        return;
      }
    }
    // Lancée contre une souche, elle s'y assomme : c'est le moment de frapper.
    if (world.insideStump(this.pos, this.radius)) {
      world.addWeb(this.pos);
      this.stun(cfg.stumpStun, 'wall', world);
      return;
    }
    if (world.clampToArena(this.pos, this.radius) || state.traveled >= cfg.chargeDistance) this.endCharge(world);
  }

  private endCharge(world: World): void {
    world.emit({ type: 'chargeEnd', id: this.id });
    world.addWeb(this.pos);
    this.chargeCooldown = this.cfg.spider.chargeCooldown;
    this.state = { kind: 'recover', t: this.cfg.spider.recover };
  }

  private updateCeiling(dt: number, world: World): void {
    const cfg = this.cfg.ceiling;
    const toDrift = sub(this.drift, this.pos);
    if (length(toDrift) < 0.3) this.drift = world.randomPoint(3);
    else this.pos = add(this.pos, scale(normalize(toDrift), cfg.driftSpeed * dt));

    this.rainTimer -= dt;
    if (this.rainTimer <= 0) {
      this.rainTimer = cfg.rainInterval;
      for (let i = 0; i < cfg.rainCount; i++) {
        const target = i === 0 ? world.player.pos : world.randomPoint();
        world.dropHazard(target, cfg.rain, Math.random() < cfg.rainWebChance);
      }
    }
    this.pullTimer -= dt;
    if (this.pullTimer <= 0) this.state = { kind: 'aim', t: 0 };
  }

  private pull(state: Extract<JorogumoState, { kind: 'pull' }>, dt: number, world: World): void {
    const cfg = this.cfg.ceiling;
    const player = world.player;
    state.t += dt;
    if (player.dodging) state.dodged = true;
    const toBoss = sub(this.pos, player.pos);

    // Le fil de Jōren : une esquive a fait passer le fil autour d'une souche, qui le retient.
    if (state.dodged) {
      const stump = world.stumps.find((s) => distanceToSegment(s.pos, player.pos, this.pos) < s.radius + 0.1);
      if (stump) {
        const side = normalize(sub(this.pos, stump.pos));
        const to = add(stump.pos, scale(side, stump.radius + this.radius + 0.1));
        this.state = { kind: 'drop', t: 0, from: { ...this.pos }, to, snag: true };
        this.pullTimer = cfg.pullInterval;
        return;
      }
    }
    if (length(toBoss) <= cfg.biteRange) {
      this.state = { kind: 'drop', t: 0, from: { ...this.pos }, to: { ...this.pos }, snag: false };
      this.pullTimer = cfg.pullInterval;
      return;
    }
    if (state.t >= cfg.pullMaxTime) {
      this.state = { kind: 'ceiling' };
      this.pullTimer = cfg.pullInterval;
      return;
    }
    player.tether = { pull: scale(normalize(toBoss), cfg.pullSpeed), moveFactor: cfg.tetheredMoveFactor };
  }

  /** Chute du plafond : pour mordre le joueur qu'elle a ramené, ou arrachée par le fil accroché. */
  private drop(state: Extract<JorogumoState, { kind: 'drop' }>, dt: number, world: World): void {
    const cfg = this.cfg.ceiling;
    state.t += dt;
    const k = Math.min(1, state.t / cfg.fallTime);
    this.height = (1 - k * k) * cfg.height;
    this.pos = lerp(state.from, state.to, k);
    if (k < 1) return;

    this.height = 0;
    world.emit({ type: 'land', id: this.id, pos: { ...this.pos }, radius: this.radius * 1.4 });
    if (state.snag) {
      this.state = { kind: 'grounded', t: 0 };
      this.stun(cfg.snagStun, 'snag', world);
      return;
    }
    const player = world.player;
    const offset = sub(player.pos, this.pos);
    world.emit({ type: 'bite', pos: { ...this.pos } });
    if (length(offset) <= cfg.biteRange + this.radius + player.radius) {
      player.takeHit(cfg.biteDamage, normalize(offset), cfg.biteKnockback, world);
    }
    this.state = { kind: 'grounded', t: cfg.groundedAfterBite };
  }
}
