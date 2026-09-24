import type { PlayerConfig } from './config';
import { add, degToRad, inCone, length, normalize, scale, sub, vec, type Vec2 } from './math';
import type { InputFrame, Pose } from './types';
import type { World } from './world';

/** Durée pendant laquelle un clic reste en mémoire pour enchaîner les coups. */
const ATTACK_BUFFER = 0.2;

type Action =
  | { kind: 'free' }
  | { kind: 'attack'; t: number; dir: Vec2; hit: Set<number>; swung: boolean }
  | { kind: 'dodge'; t: number; dir: Vec2 }
  | { kind: 'smash'; t: number; dir: Vec2; landed: boolean };

/** Le Guerrier : frappe à l'arme, bloque pour remplir sa rage, esquive, et dépense la rage en Frappe fracassante. */
export class Player {
  pos: Vec2 = vec(0, 0);
  facing: Vec2 = vec(1, 0);
  knockback: Vec2 = vec();
  hp: number;
  rage = 0;
  blocking = false;
  dodgeCooldown = 0;
  invulnerable = 0;
  /**
   * Fil de la Jorōgumo : vitesse de traction et frein sur la marche, posés par le boss à chaque pas.
   * Le joueur les applique au pas suivant, puis les oublie si le boss ne les renouvelle pas.
   */
  tether: { pull: Vec2; moveFactor: number } | null = null;
  readonly mass = 1;
  private moving = false;
  private action: Action = { kind: 'free' };
  private attackBuffer = 0;

  constructor(readonly cfg: PlayerConfig) {
    this.hp = cfg.maxHp;
  }

  get radius(): number {
    return this.cfg.radius;
  }

  get dead(): boolean {
    return this.hp <= 0;
  }

  get dodging(): boolean {
    return this.action.kind === 'dodge';
  }

  get canSmash(): boolean {
    return this.rage >= this.cfg.smash.rageCost;
  }

  get pose(): Pose {
    const a = this.action;
    switch (a.kind) {
      case 'attack':
        return a.t < this.cfg.attack.windup ? 'windup' : 'strike';
      case 'smash':
        return a.t < this.cfg.smash.windup ? 'windup' : 'strike';
      case 'dodge':
        return 'dash';
      case 'free':
        return this.blocking ? 'guard' : this.moving ? 'move' : 'idle';
    }
  }

  update(dt: number, input: InputFrame, world: World): void {
    const c = this.cfg;
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.attackBuffer = Math.max(0, this.attackBuffer - dt);
    this.rage = Math.max(0, this.rage - c.rageDecayPerSecond * dt);
    if (input.attackPressed) this.attackBuffer = ATTACK_BUFFER;
    this.moving = false;

    const aimDir = normalize(sub(input.aim, this.pos), this.facing);
    if (input.dodgePressed && this.dodgeCooldown <= 0 && this.canCancel()) this.startDodge(input, world);

    const tether = this.tether;
    this.tether = null;
    const slow = world.slowAt(this.pos) * (tether?.moveFactor ?? 1);

    const a = this.action;
    switch (a.kind) {
      case 'free':
        this.updateFree(dt, input, aimDir, slow);
        break;
      case 'attack':
        this.updateAttack(dt, a, aimDir, input, world);
        break;
      case 'dodge': {
        a.t += dt;
        // Seules les toiles freinent l'esquive : c'est elle qui permet de contourner une souche malgré le fil.
        this.pos = add(this.pos, scale(a.dir, (c.dodge.distance / c.dodge.duration) * world.slowAt(this.pos) * dt));
        if (a.t >= c.dodge.duration) this.action = { kind: 'free' };
        break;
      }
      case 'smash': {
        a.t += dt;
        if (!a.landed && a.t >= c.smash.windup) {
          a.landed = true;
          world.smash(add(this.pos, scale(a.dir, c.smash.offset)));
        }
        if (a.t >= c.smash.windup + c.smash.recovery) this.action = { kind: 'free' };
        break;
      }
    }

    if (tether) this.pos = add(this.pos, scale(tether.pull, dt));
    this.pos = add(this.pos, scale(this.knockback, dt));
    this.knockback = scale(this.knockback, Math.exp(-10 * dt));
    world.clampToArena(this.pos, this.radius);
  }

  /** Vrai si le joueur bloque et fait face à `from`. */
  isGuarding(from: Vec2): boolean {
    if (!this.blocking || this.action.kind !== 'free') return false;
    const toward = normalize(sub(from, this.pos), this.facing);
    return inCone(this.facing, toward, degToRad(this.cfg.block.arcDeg / 2));
  }

  /** Un coup a été bloqué : la rage monte. */
  guard(world: World): void {
    const gain = this.cfg.block.rageOnGuard;
    this.gainRage(gain);
    world.emit({ type: 'guard', pos: { ...this.pos }, rage: gain });
  }

  /** Renvoie faux si le joueur est invulnérable (esquive ou coup tout juste reçu). */
  takeHit(amount: number, pushDir: Vec2, knockback: number, world: World): boolean {
    if (this.invulnerable > 0) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.invulnerable = this.cfg.invulnerableAfterHit;
    this.knockback = scale(pushDir, knockback);
    if (this.action.kind === 'attack') this.action = { kind: 'free' };
    world.emit({ type: 'playerHit', pos: { ...this.pos }, amount });
    return true;
  }

  gainRage(amount: number): void {
    this.rage = Math.min(this.cfg.rageMax, this.rage + amount);
  }

  private updateFree(dt: number, input: InputFrame, aimDir: Vec2, slow: number): void {
    const c = this.cfg;
    this.facing = aimDir;
    this.blocking = input.blockHeld;
    if (input.smashPressed && this.canSmash) {
      this.rage -= c.smash.rageCost;
      this.blocking = false;
      this.action = { kind: 'smash', t: 0, dir: { ...this.facing }, landed: false };
      return;
    }
    if (!this.blocking && (this.attackBuffer > 0 || input.attackHeld)) {
      this.startAttack();
      return;
    }
    if (length(input.move) > 0.05) {
      const speed = c.moveSpeed * slow * (this.blocking ? c.blockMoveFactor : 1);
      this.pos = add(this.pos, scale(input.move, speed * dt));
      this.moving = true;
    }
  }

  private startAttack(): void {
    this.attackBuffer = 0;
    this.blocking = false;
    this.action = { kind: 'attack', t: 0, dir: { ...this.facing }, hit: new Set(), swung: false };
  }

  private updateAttack(
    dt: number,
    a: Extract<Action, { kind: 'attack' }>,
    aimDir: Vec2,
    input: InputFrame,
    world: World,
  ): void {
    const c = this.cfg.attack;
    a.t += dt;
    if (!a.swung && a.t >= c.windup) {
      a.swung = true;
      world.emit({ type: 'swing', pos: { ...this.pos }, dir: a.dir, range: c.range });
    }
    const recoveryStart = c.windup + c.active;
    if (a.t >= c.windup && a.t < recoveryStart) {
      this.pos = add(this.pos, scale(a.dir, (c.lunge / c.active) * dt));
      world.strike(this.pos, a.dir, a.hit);
    }
    // Enchaînement : un clic mémorisé (ou le bouton maintenu) relance un coup à mi-récupération.
    const wantsNext = this.attackBuffer > 0 || input.attackHeld;
    if (wantsNext && a.t >= recoveryStart + c.recovery / 2) {
      this.facing = aimDir;
      this.startAttack();
    } else if (a.t >= recoveryStart + c.recovery) {
      this.action = { kind: 'free' };
    }
  }

  private startDodge(input: InputFrame, world: World): void {
    const dir = normalize(length(input.move) > 0.1 ? input.move : this.facing, this.facing);
    this.action = { kind: 'dodge', t: 0, dir };
    this.blocking = false;
    this.dodgeCooldown = this.cfg.dodge.cooldown;
    this.invulnerable = Math.max(this.invulnerable, this.cfg.dodge.invulnerable);
    world.emit({ type: 'dodge', pos: { ...this.pos }, dir });
  }

  /** L'esquive peut interrompre la récupération d'un coup, pas son élan. */
  private canCancel(): boolean {
    const a = this.action;
    if (a.kind === 'free') return true;
    return a.kind === 'attack' && a.t >= this.cfg.attack.windup + this.cfg.attack.active;
  }
}
