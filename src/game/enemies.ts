import type { EnemyBaseConfig, HitodamaConfig, KappaConfig } from './config';
import { add, degToRad, distance, inCone, length, normalize, rotateTowards, scale, sub, vec, type Vec2 } from './math';
import type { EnemyKind, Pose, StunReason } from './types';
import type { World } from './world';

/** Temps d'apparition pendant lequel un ennemi ne peut ni agir ni être touché. */
export const SPAWN_TIME = 0.6;

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

  get dead(): boolean {
    return this.hp <= 0;
  }

  get active(): boolean {
    return this.spawnTimer <= 0 && !this.dead;
  }

  get spawnProgress(): number {
    return 1 - this.spawnTimer / SPAWN_TIME;
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
    return shielded;
  }

  stun(_duration: number, _reason: StunReason, _world: World): void {}

  protected abstract think(dt: number, world: World): void;

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

type KappaState =
  | { kind: 'walk' }
  | { kind: 'telegraph'; t: number; dir: Vec2 }
  | { kind: 'charge'; dir: Vec2; traveled: number }
  | { kind: 'recover'; t: number }
  | { kind: 'stunned'; t: number };

/**
 * Kappa : tourne lentement, s'annonce puis charge en ligne droite.
 * Sa carapace arrête les coups de face ; bloquer sa charge renverse sa coupelle et l'étourdit.
 */
export class Kappa extends Enemy {
  readonly kind = 'kappa' as const;
  private state: KappaState = { kind: 'walk' };
  private cooldown = 1;

  constructor(
    id: number,
    pos: Vec2,
    private readonly cfg: KappaConfig,
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

  stun(duration: number, reason: StunReason, world: World): void {
    if (this.state.kind === 'telegraph' || this.state.kind === 'charge') world.emit({ type: 'chargeEnd', id: this.id });
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
        }
        break;
      }
      case 'telegraph':
        state.t += dt;
        if (state.t >= cfg.telegraph) this.state = { kind: 'charge', dir: state.dir, traveled: 0 };
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

  private endCharge(world: World): void {
    world.emit({ type: 'chargeEnd', id: this.id });
    this.state = { kind: 'recover', t: this.cfg.recover };
  }
}
