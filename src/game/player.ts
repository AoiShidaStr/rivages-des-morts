import type { PlayerConfig } from './config';
import { add, degToRad, distance, inCone, length, lerp, normalize, scale, sub, vec, type Vec2 } from './math';
import type { InputFrame, Pose } from './types';
import type { World } from './world';

/** Durée pendant laquelle un clic reste en mémoire pour enchaîner les coups. */
const ATTACK_BUFFER = 0.2;

type Action =
  | { kind: 'free' }
  | { kind: 'attack'; t: number; dir: Vec2; hit: Set<number>; swung: boolean }
  | { kind: 'dodge'; t: number; dir: Vec2 }
  | { kind: 'smash'; t: number; dir: Vec2; landed: boolean }
  | { kind: 'bond'; t: number; from: Vec2; to: Vec2 };

/**
 * Le héros : il frappe à l'arme et esquive, quelle que soit sa classe.
 * Guerrier (`cfg.kit`) : bloque pour remplir sa rage, et la dépense en Frappe fracassante (A), Bond (E) et Frénésie (R).
 * Invocateur : lie les âmes des vaincus (clic droit) et les commande : Rappel (A), Sacrifice (E), Chœur spectral (R).
 * Les talents, la race et les reliques arrivent par `cfg.perks`.
 */
export class Player {
  pos: Vec2 = vec(0, 0);
  facing: Vec2 = vec(1, 0);
  knockback: Vec2 = vec();
  hp: number;
  rage = 0;
  blocking = false;
  dodgeCooldown = 0;
  bondCooldown = 0;
  frenzyCooldown = 0;
  /** Secondes de Frénésie restantes. */
  frenzy = 0;
  invulnerable = 0;
  /** Secondes pendant lesquelles la Coupelle du kappa reste vide après un coup reçu. */
  coupelleEmpty = 0;
  private bearSkinUsed = false;
  /** Invocateur : recharges du Rappel, du Sacrifice et du Chœur spectral. */
  recallCooldown = 0;
  sacrificeCooldown = 0;
  choirCooldown = 0;
  /** Âmes liées actives, tenu à jour par le monde : chacune affaiblit l'Invocateur. */
  summonCount = 0;
  /** Oushebti : secondes avant que la carapace d'argile ne se reforme (0 : elle est prête). */
  clayCooldown = 0;
  /** Hanyō : jauge de sang yokai (en coups portés) et secondes de transformation restantes. */
  yokaiGauge = 0;
  transformed = 0;
  private divineBloodUsed = false;
  /** Coups d'arme portés pendant la descente (foudre du fils de Zeus). */
  private hits = 0;
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
    return this.action.kind === 'dodge' || this.action.kind === 'bond';
  }

  get canSmash(): boolean {
    return this.rage >= this.cfg.smash.rageCost;
  }

  get canBond(): boolean {
    return this.bondCooldown <= 0 && this.rage >= this.cfg.bond.rageCost;
  }

  get canFrenzy(): boolean {
    return this.frenzyCooldown <= 0 && this.frenzy <= 0 && this.rage >= this.cfg.frenzy.rageCost;
  }

  /** Hauteur pendant le Bond, pour que le rendu dessine l'arc du saut. */
  get altitude(): number {
    const a = this.action;
    if (a.kind !== 'bond') return 0;
    return Math.sin(Math.PI * Math.min(1, a.t / this.cfg.bond.duration)) * this.cfg.bond.height;
  }

  /** La coupelle est pleine : on n'a pas été touché depuis un moment. */
  get coupelleFull(): boolean {
    return Boolean(this.cfg.perks?.coupelle) && this.coupelleEmpty <= 0;
  }

  get pose(): Pose {
    const a = this.action;
    switch (a.kind) {
      case 'attack':
        return a.t < this.timing().windup ? 'windup' : 'strike';
      case 'smash':
        return a.t < this.cfg.smash.windup ? 'windup' : 'strike';
      case 'dodge':
        return 'dash';
      case 'bond':
        return 'airborne';
      case 'free':
        return this.blocking ? 'guard' : this.moving ? 'move' : 'idle';
    }
  }

  /** Multiplicateur des dégâts infligés : race, talents, Coupelle du kappa, âmes liées. */
  damageMultiplier(): number {
    const perks = this.cfg.perks ?? {};
    const missing = 1 - this.hp / this.cfg.maxHp;
    let factor = 1 + (perks.einherjarRage ?? 0) * missing;
    if (perks.lowHpDamage && this.hp < this.cfg.maxHp / 2) factor += perks.lowHpDamage;
    if (perks.coupelle && this.coupelleFull) factor += perks.coupelle.bonus;
    if (perks.divineMight) factor += perks.divineMight;
    if (perks.yokaiBlood && this.transformed > 0) factor += perks.yokaiBlood.damage;
    // Chaque âme active affaiblit l'Invocateur (GDD : pas de limite stricte, un malus par invocation).
    return factor * Math.max(0.2, 1 - this.cfg.summon.malus * this.summonCount);
  }

  /** Vitesse de marche en plus : instinct et transformation du Hanyō. */
  private speedFactor(): number {
    const perks = this.cfg.perks ?? {};
    let factor = 1;
    if (perks.yokaiInstinct && this.hp < this.cfg.maxHp * perks.yokaiInstinct.threshold) factor += perks.yokaiInstinct.speed;
    if (perks.yokaiBlood && this.transformed > 0) factor += perks.yokaiBlood.speed;
    return factor;
  }

  heal(amount: number, world: World): void {
    const gained = Math.min(amount, this.cfg.maxHp - this.hp);
    if (gained <= 0) return;
    this.hp += gained;
    world.emit({ type: 'heal', id: 0, pos: { ...this.pos }, amount: gained });
  }

  /**
   * Un coup d'arme vient de porter. Remplit le sang yokai du Hanyō, et renvoie les dégâts de la foudre
   * du fils de Zeus quand c'est son tour (0 sinon).
   */
  landHit(world: World): number {
    const perks = this.cfg.perks ?? {};
    this.hits++;
    const blood = perks.yokaiBlood;
    if (blood && this.transformed <= 0 && ++this.yokaiGauge >= blood.hits) {
      this.yokaiGauge = 0;
      this.transformed = blood.duration;
      world.emit({ type: 'transform', pos: { ...this.pos } });
    }
    const zeus = perks.zeusBolt;
    return zeus && this.hits % zeus.every === 0 ? zeus.damage * this.damageMultiplier() : 0;
  }

  update(dt: number, input: InputFrame, world: World): void {
    const c = this.cfg;
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - dt);
    this.bondCooldown = Math.max(0, this.bondCooldown - dt);
    this.frenzyCooldown = Math.max(0, this.frenzyCooldown - dt);
    this.frenzy = Math.max(0, this.frenzy - dt);
    this.coupelleEmpty = Math.max(0, this.coupelleEmpty - dt);
    this.recallCooldown = Math.max(0, this.recallCooldown - dt);
    this.sacrificeCooldown = Math.max(0, this.sacrificeCooldown - dt);
    this.choirCooldown = Math.max(0, this.choirCooldown - dt);
    this.clayCooldown = Math.max(0, this.clayCooldown - dt);
    this.transformed = Math.max(0, this.transformed - dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.attackBuffer = Math.max(0, this.attackBuffer - dt);
    this.rage = Math.max(0, this.rage - c.rageDecayPerSecond * dt);
    if (input.attackPressed) this.attackBuffer = ATTACK_BUFFER;
    this.moving = false;

    // Instinct yokai : blessé, le Hanyō se régénère.
    const instinct = c.perks?.yokaiInstinct;
    if (instinct && this.hp > 0 && this.hp < c.maxHp * instinct.threshold) this.hp = Math.min(c.maxHp, this.hp + instinct.regen * dt);

    const aimDir = normalize(sub(input.aim, this.pos), this.facing);
    const warrior = c.kit === 'guerrier';
    if (warrior && input.skillRPressed && this.canFrenzy) this.startFrenzy(world);
    if (input.dodgePressed && this.dodgeCooldown <= 0 && this.canCancel()) this.startDodge(input, world);
    else if (warrior && input.skillEPressed && this.canBond && this.canCancel()) this.startBond(input.aim, world);
    if (!warrior) this.commandSouls(input, world);

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
      case 'bond': {
        a.t += dt;
        const k = Math.min(1, a.t / c.bond.duration);
        this.pos = lerp(a.from, a.to, k);
        if (k >= 1) {
          this.action = { kind: 'free' };
          world.bondLand(this.pos);
        }
        break;
      }
    }

    if (tether && this.action.kind !== 'bond') this.pos = add(this.pos, scale(tether.pull, dt));
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
    const gain = this.cfg.block.rageOnGuard * (1 + (this.cfg.perks?.guardRageFactor ?? 0));
    const gained = this.gainRage(gain);
    world.emit({ type: 'guard', pos: { ...this.pos }, rage: Math.round(gained) });
  }

  /** Renvoie faux si le joueur est invulnérable (esquive ou coup tout juste reçu). */
  takeHit(amount: number, pushDir: Vec2, knockback: number, world: World): boolean {
    if (this.invulnerable > 0 || this.action.kind === 'bond') return false;
    const perks = this.cfg.perks ?? {};
    // Corps d'argile : la carapace de l'Oushebti absorbe le coup entier, puis se reforme.
    if (perks.clayShell && this.clayCooldown <= 0) {
      this.clayCooldown = perks.clayShell;
      this.invulnerable = this.cfg.invulnerableAfterHit;
      world.emit({ type: 'clayShell', pos: { ...this.pos } });
      return true;
    }
    let factor = this.cfg.damageTakenFactor ?? 1;
    if (this.frenzy > 0) factor *= this.cfg.frenzy.damageTakenFactor;
    if (perks.lionSkin && this.rage >= this.cfg.rageMax / 2) factor *= 1 - perks.lionSkin;
    if (perks.yokaiBlood && this.transformed > 0) factor *= 1 + perks.yokaiBlood.taken;
    const taken = amount * factor;
    this.hp = Math.max(0, this.hp - taken);
    if (this.hp <= 0 && perks.bearSkin && !this.bearSkinUsed) {
      // Peau d'ours : une fois par descente, le Berserkir refuse de tomber.
      this.bearSkinUsed = true;
      this.hp = 1;
      this.rage = this.cfg.rageMax;
      world.emit({ type: 'bearSkin', pos: { ...this.pos } });
    }
    if (this.hp <= 0 && perks.divineBlood && !this.divineBloodUsed) {
      // Sang divin : une fois par descente, le Demi-dieu se relève.
      this.divineBloodUsed = true;
      this.hp = this.cfg.maxHp * perks.divineBlood;
      world.emit({ type: 'divineBlood', pos: { ...this.pos } });
    }
    if (perks.coupelle) this.coupelleEmpty = perks.coupelle.emptyTime;
    this.invulnerable = this.cfg.invulnerableAfterHit;
    this.knockback = scale(pushDir, knockback);
    if (this.action.kind === 'attack') this.action = { kind: 'free' };
    world.emit({ type: 'playerHit', pos: { ...this.pos }, amount: taken });
    return true;
  }

  /** Ajoute de la rage (paliers du tag Guerrier compris) ; renvoie ce qui a été gagné. */
  gainRage(amount: number): number {
    const gain = amount * (this.cfg.perks?.rageGainFactor ?? 1);
    const before = this.rage;
    this.rage = Math.min(this.cfg.rageMax, this.rage + gain);
    return this.rage - before;
  }

  /** Un ennemi vient de tomber sous nos coups. */
  onKill(): void {
    const perks = this.cfg.perks ?? {};
    let heal = perks.valhallaHeal ?? 0;
    if (this.frenzy > 0) heal += perks.frenzyHealOnKill ?? 0;
    this.hp = Math.min(this.cfg.maxHp, this.hp + heal);
    const cut = perks.cooldownOnKill ?? 0;
    this.bondCooldown = Math.max(0, this.bondCooldown - cut);
    this.frenzyCooldown = Math.max(0, this.frenzyCooldown - cut);
  }

  /** Temps d'un coup d'arme, raccourcis pendant la Frénésie. */
  private timing(): { windup: number; active: number; recovery: number } {
    const a = this.cfg.attack;
    const f = this.frenzy > 0 ? this.cfg.frenzy.attackTimeFactor : 1;
    return { windup: a.windup * f, active: a.active * f, recovery: a.recovery * f };
  }

  private updateFree(dt: number, input: InputFrame, aimDir: Vec2, slow: number): void {
    const c = this.cfg;
    this.facing = aimDir;
    this.blocking = c.kit === 'guerrier' && input.signatureHeld;
    if (c.kit === 'guerrier' && input.skillAPressed && this.canSmash) {
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
      const speed = c.moveSpeed * slow * this.speedFactor() * (this.blocking ? c.blockMoveFactor : 1);
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
    const time = this.timing();
    a.t += dt;
    if (!a.swung && a.t >= time.windup) {
      a.swung = true;
      world.emit({ type: 'swing', pos: { ...this.pos }, dir: a.dir, range: c.range, arcDeg: c.arcDeg });
    }
    const recoveryStart = time.windup + time.active;
    if (a.t >= time.windup && a.t < recoveryStart) {
      this.pos = add(this.pos, scale(a.dir, (c.lunge / time.active) * dt));
      world.strike(this.pos, a.dir, a.hit);
    }
    // Enchaînement : un clic mémorisé (ou le bouton maintenu) relance un coup à mi-récupération.
    const wantsNext = this.attackBuffer > 0 || input.attackHeld;
    if (wantsNext && a.t >= recoveryStart + time.recovery / 2) {
      this.facing = aimDir;
      this.startAttack();
    } else if (a.t >= recoveryStart + time.recovery) {
      this.action = { kind: 'free' };
    }
  }

  private startDodge(input: InputFrame, world: World): void {
    const dir = normalize(length(input.move) > 0.1 ? input.move : this.facing, this.facing);
    const joren = this.cfg.perks?.joren;
    if (joren) world.setSnare(this.pos, joren);
    this.action = { kind: 'dodge', t: 0, dir };
    this.blocking = false;
    this.dodgeCooldown = this.cfg.dodge.cooldown;
    this.invulnerable = Math.max(this.invulnerable, this.cfg.dodge.invulnerable);
    world.emit({ type: 'dodge', pos: { ...this.pos }, dir });
  }

  /** Bond : saut vers le point visé, dans la limite de sa portée. */
  private startBond(aim: Vec2, world: World): void {
    const b = this.cfg.bond;
    const toAim = sub(aim, this.pos);
    const reach = Math.min(b.range, length(toAim));
    const target = add(this.pos, scale(normalize(toAim, this.facing), reach));
    world.clampToArena(target, this.radius);
    this.rage -= b.rageCost;
    this.bondCooldown = b.cooldown;
    this.blocking = false;
    this.facing = normalize(toAim, this.facing);
    this.action = { kind: 'bond', t: 0, from: { ...this.pos }, to: target };
    // Un saut sur place (souris sur le héros) frappe quand même à l'arrivée.
    if (distance(this.pos, target) < 0.1) this.action.t = b.duration * 0.5;
  }

  /** Invocateur : Lier (clic droit), Rappel (A), Sacrifice (E), Chœur spectral (R). */
  private commandSouls(input: InputFrame, world: World): void {
    const s = this.cfg.summon;
    if (input.signaturePressed && this.canCancel()) world.bind(input.aim);
    if (input.skillAPressed && this.recallCooldown <= 0 && world.recall(input.aim)) this.recallCooldown = s.recall.cooldown;
    if (input.skillEPressed && this.sacrificeCooldown <= 0 && world.sacrifice()) this.sacrificeCooldown = s.sacrifice.cooldown;
    if (input.skillRPressed && this.choirCooldown <= 0 && world.chorus()) this.choirCooldown = s.choir.cooldown;
  }

  private startFrenzy(world: World): void {
    const f = this.cfg.frenzy;
    this.rage -= f.rageCost;
    this.frenzy = f.duration;
    this.frenzyCooldown = f.cooldown;
    world.emit({ type: 'frenzy', pos: { ...this.pos } });
  }

  /** L'esquive et le Bond peuvent interrompre la récupération d'un coup, pas son élan. */
  private canCancel(): boolean {
    const a = this.action;
    if (a.kind === 'free') return true;
    const time = this.timing();
    return a.kind === 'attack' && a.t >= time.windup + time.active;
  }
}
