// Alliés relevés par le Paladin (Relever) : un yokai tombé depuis peu se relève en âme de lumière et combat aux
// côtés du héros, jusqu'à s'effacer ou se briser sous les coups des yokai.
import type { SummonConfig } from './config';
import type { Enemy } from './enemies';
import { add, distance, length, normalize, scale, sub, vec, type Vec2 } from './math';
import type { EnemyKind, Pose } from './types';
import type { World } from './world';

/** Distance à laquelle un allié sans cible se tient du héros. */
const FOLLOW_DISTANCE = 1.6;
/** Durée de la pose de frappe. */
const STRIKE_POSE = 0.18;
/** Temps d'apparition d'un allié relevé. */
const RISE_TIME = 0.4;
/** Répit après un coup reçu, pour qu'une même attaque ne la touche pas deux fois. */
const HIT_GRACE = 0.25;

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
  /** Le héros qui l'a relevé. */
  owner = 0;
  /** Multiplicateurs propres à son yokai : dégâts et vitesse. */
  readonly damageFactor: number;
  readonly speedFactor: number;
  /** Portée de tir d'une âme de yokai à distance ; absente, l'âme frappe au contact. */
  readonly range: number | undefined;
  private cooldown = 0;
  private striking = 0;
  private moving = false;
  private rising = 0;
  private grace = 0;

  /** `toughness` multiplie ses PV et sa durée (Bandelettes d'Osiris). */
  constructor(
    readonly id: number,
    readonly kind: EnemyKind,
    public pos: Vec2,
    private readonly cfg: SummonConfig,
    toughness: number,
  ) {
    const k = { damage: 1, speed: 1, hp: 1, ...cfg.kinds[kind] };
    this.life = cfg.life * toughness;
    this.maxLife = this.life;
    this.hp = cfg.hp * k.hp * toughness;
    this.maxHp = this.hp;
    this.damageFactor = k.damage;
    this.speedFactor = k.speed;
    this.range = k.range;
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

  /** De 1 (tout frais) à 0 (sur le point de s'effacer ou de se briser) : le rendu le fait pâlir. */
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

  /** Soin (Aura de lumière, bouclier du Paladin) ; renvoie les PV rendus. */
  heal(amount: number, world: World): number {
    const gained = Math.min(amount, this.maxHp - this.hp);
    if (gained <= 0 || this.gone) return 0;
    this.hp += gained;
    world.emit({ type: 'heal', id: this.id, pos: { ...this.pos }, amount: gained });
    return gained;
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

    const speed = cfg.speed * this.speedFactor;
    // L'allié s'en prend à l'ennemi le plus proche, sans trop s'éloigner du héros.
    const farFromHero = distance(this.pos, player.pos) > cfg.leash;
    const target = farFromHero ? undefined : this.nearestEnemy(world);

    if (target) {
      const toTarget = sub(target.pos, this.pos);
      this.facing = normalize(toTarget, this.facing);
      const gap = length(toTarget) - target.radius - this.radius;
      // Un allié à distance tire de loin et recule si l'ennemi le serre de trop près.
      const reach = this.range ?? cfg.attackRange;
      if (gap > reach) this.step(this.facing, speed, dt);
      else if (this.range && gap < this.range * 0.4) this.step(scale(this.facing, -1), speed * 0.8, dt);
      if (gap <= reach && this.cooldown <= 0) {
        const ranged = Boolean(this.range);
        world.summonHit(this, target, ranged ? cfg.rangedFactor : 1, ranged);
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
