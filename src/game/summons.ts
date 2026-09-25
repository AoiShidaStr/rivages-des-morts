// Âmes de l'Invocateur (GDD, « Système d'âmes ») : un yokai vaincu laisse son âme au sol quelques secondes ;
// liée, elle se relève et combat aux côtés du héros, jusqu'à s'effacer ou se briser sous les coups des yokai.
import type { SummonConfig } from './config';
import type { Enemy } from './enemies';
import { add, distance, length, normalize, scale, sub, vec, type Vec2 } from './math';
import type { EnemyKind, Pose } from './types';
import type { World } from './world';

/** Distance à laquelle une âme sans cible se tient du héros. */
const FOLLOW_DISTANCE = 1.6;
/** Durée de la pose de frappe. */
const STRIKE_POSE = 0.18;
/** Temps d'apparition d'une âme liée. */
const RISE_TIME = 0.4;
/** Répit après un coup reçu, pour qu'une même attaque ne la touche pas deux fois. */
const HIT_GRACE = 0.25;

/** Âme au sol d'un ennemi vaincu, prête à être liée. */
export interface Soul {
  id: number;
  pos: Vec2;
  kind: EnemyKind;
  life: number;
}

export class Summon {
  facing: Vec2 = vec(1, 0);
  knockback: Vec2 = vec();
  life: number;
  readonly maxLife: number;
  hp: number;
  readonly maxHp: number;
  /** Détruite par les yokai (et non effacée par le temps). */
  broken = false;
  readonly mass = 0.6;
  /** Rappel : l'ennemi sur lequel l'âme fonce, et les secondes de ruée restantes. */
  rush: { target: number; t: number } | null = null;
  private cooldown = 0;
  private striking = 0;
  private moving = false;
  private rising = 0;
  private grace = 0;

  /** `toughness` multiplie ses PV et sa durée (Les Douze Shikigami pour un kappa). */
  constructor(
    readonly id: number,
    readonly kind: EnemyKind,
    public pos: Vec2,
    private readonly cfg: SummonConfig,
    toughness: number,
  ) {
    this.life = cfg.life * toughness;
    this.maxLife = this.life;
    this.hp = cfg.hp * (cfg.kinds[kind]?.hp ?? 1) * toughness;
    this.maxHp = this.hp;
  }

  get radius(): number {
    return this.cfg.radius;
  }

  get pose(): Pose {
    if (this.striking > 0) return 'strike';
    return this.moving ? 'move' : 'idle';
  }

  get spawnProgress(): number {
    return Math.min(1, this.rising / RISE_TIME);
  }

  /** De 1 (toute fraîche) à 0 (sur le point de s'effacer ou de se briser) : le rendu la fait pâlir. */
  get vigor(): number {
    return Math.max(0, Math.min(this.life / this.maxLife, this.hp / this.maxHp));
  }

  get gone(): boolean {
    return this.life <= 0 || this.hp <= 0;
  }

  /** Les yokai ne la prennent pour cible qu'une fois relevée. */
  get targetable(): boolean {
    return this.rising >= RISE_TIME && !this.gone;
  }

  /** Une âme ne bloque pas. */
  isGuarding(): boolean {
    return false;
  }

  guard(): void {}

  /** Coup d'un yokai ; faux si l'âme vient déjà d'être touchée. */
  takeHit(amount: number, pushDir: Vec2, knockback: number, world: World): boolean {
    if (this.grace > 0 || this.gone) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.broken = this.hp <= 0;
    this.grace = HIT_GRACE;
    this.knockback = scale(pushDir, knockback);
    world.emit({ type: 'summonHit', id: this.id, pos: { ...this.pos }, amount });
    return true;
  }

  update(dt: number, world: World): void {
    const cfg = this.cfg;
    const player = world.player;
    this.life -= dt;
    this.rising += dt;
    this.grace = Math.max(0, this.grace - dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.striking = Math.max(0, this.striking - dt);
    this.moving = false;
    this.pos = add(this.pos, scale(this.knockback, dt));
    this.knockback = scale(this.knockback, Math.exp(-10 * dt));
    if (this.rising < RISE_TIME) return;

    let speed = cfg.speed * (cfg.kinds[this.kind]?.speed ?? 1) * (world.choir > 0 ? cfg.choir.speedFactor : 1);
    let target: Enemy | undefined;
    if (this.rush) {
      this.rush.t -= dt;
      target = world.enemies.find((e) => e.id === this.rush?.target && e.targetable);
      if (!target || this.rush.t <= 0) this.rush = null;
      else speed = cfg.recall.speed;
    }
    // Sans ordre, l'âme s'en prend à l'ennemi le plus proche, sans trop s'éloigner du héros.
    const farFromHero = distance(this.pos, player.pos) > cfg.leash;
    if (!target && !farFromHero) target = this.nearestEnemy(world);

    if (target) {
      const toTarget = sub(target.pos, this.pos);
      this.facing = normalize(toTarget, this.facing);
      const gap = length(toTarget) - target.radius - this.radius;
      if (gap > cfg.attackRange) this.step(this.facing, speed, dt);
      else if (this.cooldown <= 0) {
        world.summonHit(this, target, this.rush ? cfg.recall.damageFactor : 1);
        this.rush = null;
        this.cooldown = cfg.attackCooldown;
        this.striking = STRIKE_POSE;
      }
    } else {
      const toHero = sub(player.pos, this.pos);
      if (length(toHero) > FOLLOW_DISTANCE) {
        this.facing = normalize(toHero, this.facing);
        this.step(this.facing, speed, dt);
      }
    }
    world.clampToArena(this.pos, this.radius);
  }

  private step(dir: Vec2, speed: number, dt: number): void {
    this.pos = add(this.pos, scale(dir, speed * dt));
    this.moving = true;
  }

  private nearestEnemy(world: World): Enemy | undefined {
    const reach = this.cfg.leash + 2;
    let best: Enemy | undefined;
    let bestDist = Infinity;
    for (const enemy of world.enemies) {
      if (!enemy.targetable || distance(enemy.pos, world.player.pos) > reach) continue;
      const d = distance(enemy.pos, this.pos);
      if (d < bestDist) {
        best = enemy;
        bestDist = d;
      }
    }
    return best;
  }
}
