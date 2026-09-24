import type { EnemyBaseConfig, HitodamaConfig, KappaConfig, KasaObakeConfig, KodamaConfig, OublieConfig } from './config';
import {
  add,
  angleOf,
  degToRad,
  distance,
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

  update(dt: number, world: World): void {
    if (this.spawnTimer > 0) {
      this.spawnTimer = Math.max(0, this.spawnTimer - dt);
      return;
    }
    this.think(dt, world);
    this.pos = add(this.pos, scale(this.knockback, dt));
    this.knockback = scale(this.knockback, Math.exp(-8 * dt));
    world.clampToArena(this.pos, this.radius);
  }

  /** Applique un coup ; renvoie vrai si la carapace l'a en partie arrêté. */
  receiveHit(hit: Hit, world: World): boolean {
    const shielded = !hit.ignoreShell && this.shields(hit.from);
    const amount = hit.amount * (shielded ? this.shieldFactor : 1);
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

  stun(_duration: number, _reason: StunReason, _world: World): void {}

  protected abstract think(dt: number, world: World): void;

  /** Appelé quand un coup porte vraiment (pas sur la carapace). */
  protected onHurt(_world: World): void {}

  protected shields(_from: Vec2): boolean {
    return false;
  }

  protected get shieldFactor(): number {
    return 1;
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
    return 'move';
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

/** Âme oubliée au masque blanc : ennemi de mêlée ordinaire, qui marque une pause avant de frapper. */
export class Oublie extends Enemy {
  readonly kind = 'oublie' as const;
  private state: OublieState = { kind: 'chase' };
  private cooldown = 0.5;

  constructor(
    id: number,
    pos: Vec2,
    private readonly cfg: OublieConfig,
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
