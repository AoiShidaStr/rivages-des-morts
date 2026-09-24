import type { GameConfig } from './config';
import { Hitodama, Kappa, KasaObake, Kodama, Oublie, type Enemy } from './enemies';
import { add, degToRad, distance, inCone, length, normalize, scale, sub, vec, type Vec2 } from './math';
import { Player } from './player';
import type { EnemyKind, GameEvent, InputFrame, Outcome } from './types';

/** Pause entre deux vagues, en secondes. */
const WAVE_PAUSE = 1.5;
/** Distance minimale entre le joueur et un ennemi qui apparaît. */
const SPAWN_CLEARANCE = 5;

interface Body {
  pos: Vec2;
  radius: number;
  mass: number;
}

/**
 * État complet d'une partie. Aucune dépendance au rendu : Babylon.js lit cet état
 * et les événements émis, ce qui permettra plus tard de faire tourner la logique sur un serveur.
 */
export class World {
  readonly player: Player;
  enemies: Enemy[] = [];
  state: 'playing' | Outcome = 'playing';
  time = 0;
  private waveIndex = -1;
  private waveTimer = 1;
  private nextId = 1;
  private events: GameEvent[] = [];

  constructor(readonly cfg: GameConfig) {
    this.player = new Player(cfg.player);
  }

  emit(event: GameEvent): void {
    this.events.push(event);
  }

  drainEvents(): GameEvent[] {
    const events = this.events;
    this.events = [];
    return events;
  }

  update(dt: number, input: InputFrame): void {
    if (this.state !== 'playing') return;
    this.time += dt;
    this.player.update(dt, input, this);
    for (const enemy of this.enemies) enemy.update(dt, this);
    this.separate();
    this.enemies = this.enemies.filter((e) => !e.dead);
    if (this.player.dead) {
      this.finish('defeat');
      return;
    }
    this.updateWaves(dt);
  }

  /** Coup d'arme : touche une seule fois chaque ennemi présent dans l'arc devant le joueur. */
  strike(origin: Vec2, dir: Vec2, alreadyHit: Set<number>): void {
    const attack = this.cfg.player.attack;
    // `enemies` peut contenir des morts du pas en cours : `targetable` les écarte.
    const halfArc = degToRad(attack.arcDeg / 2);
    for (const enemy of this.enemies) {
      if (!enemy.targetable || alreadyHit.has(enemy.id)) continue;
      const toEnemy = sub(enemy.pos, origin);
      const dist = length(toEnemy);
      if (dist - enemy.radius > attack.range) continue;
      // Un ennemi collé au joueur est touché même s'il déborde de l'arc.
      if (dist > enemy.radius + 0.2 && !inCone(dir, normalize(toEnemy), halfArc)) continue;
      alreadyHit.add(enemy.id);
      const shielded = enemy.receiveHit({ amount: attack.damage, from: origin, knockback: attack.knockback }, this);
      this.player.gainRage(shielded ? attack.rageOnHit / 2 : attack.rageOnHit);
      if (shielded) this.player.knockback = scale(dir, -4);
    }
  }

  /** Frappe fracassante : dégâts de zone qui ignorent la carapace et étourdissent. */
  smash(center: Vec2): void {
    const smash = this.cfg.player.smash;
    this.emit({ type: 'smash', pos: center, radius: smash.radius });
    for (const enemy of this.enemies) {
      if (!enemy.targetable || distance(enemy.pos, center) - enemy.radius > smash.radius) continue;
      enemy.receiveHit({ amount: smash.damage, from: center, knockback: smash.knockback, ignoreShell: true }, this);
      if (!enemy.dead) enemy.stun(smash.stun, 'smash', this);
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

  /** Empêche les corps au sol de se chevaucher. Pendant une esquive, le joueur traverse tout. */
  private separate(): void {
    const bodies = this.enemies.filter((e) => e.active && e.grounded);
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) pushApart(bodies[i], bodies[j]);
    }
    if (this.player.dodging) return;
    for (const enemy of bodies) {
      if (enemy.solid) pushApart(this.player, enemy);
    }
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
    for (const spawn of wave.spawns) {
      for (let i = 0; i < spawn.count; i++) this.enemies.push(this.createEnemy(spawn.kind, this.spawnPoint()));
    }
    this.emit({ type: 'wave', index: this.waveIndex, total: waves.length, label: wave.label, hint: wave.hint });
  }

  private createEnemy(kind: EnemyKind, pos: Vec2): Enemy {
    const enemy = this.instantiate(kind, this.nextId++, pos);
    enemy.facing = normalize(sub(this.player.pos, pos));
    return enemy;
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
    }
  }

  private spawnPoint(): Vec2 {
    const half = this.cfg.arenaHalfSize - 1.5;
    for (let attempt = 0; attempt < 30; attempt++) {
      const p = vec((Math.random() * 2 - 1) * half, (Math.random() * 2 - 1) * half);
      if (distance(p, this.player.pos) > SPAWN_CLEARANCE) return p;
    }
    // Arène trop petite : on vise le coin opposé au joueur.
    return vec(-Math.sign(this.player.pos.x || 1) * half, -Math.sign(this.player.pos.z || 1) * half);
  }

  private finish(outcome: Outcome): void {
    this.state = outcome;
    this.emit({ type: 'end', outcome });
  }
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
