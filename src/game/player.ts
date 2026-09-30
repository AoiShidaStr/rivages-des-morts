import type { PlayerConfig } from './config';
import type { Enemy } from './enemies';
import { add, degToRad, distance, inCone, length, lerp, normalize, scale, sub, vec, type Vec2 } from './math';
import type { InputFrame, Pose } from './types';
import type { Decoy, World } from './world';

/** Durée pendant laquelle un clic, une esquive ou une compétence reste en mémoire, le temps que le coup en cours le permette. */
const ATTACK_BUFFER = 0.2;

type Action =
  | { kind: 'free' }
  /** `crit` : multiplicateur de critique du coup (1 : coup normal). */
  | { kind: 'attack'; t: number; dir: Vec2; hit: Set<number>; swung: boolean; crit: number }
  | { kind: 'dodge'; t: number; dir: Vec2 }
  | { kind: 'smash'; t: number; dir: Vec2; landed: boolean }
  | { kind: 'bond'; t: number; from: Vec2; to: Vec2 }
  | { kind: 'shadowDash'; t: number; dir: Vec2; marked: Set<number> }
  /** Danse des lames : `index` est la cible en cours ; chaque pas dure `blade.dance.hop`. */
  | { kind: 'dance'; t: number; targets: number[]; index: number }
  | { kind: 'draw'; t: number }
  | { kind: 'leap'; t: number; from: Vec2; to: Vec2 };

/**
 * Le héros : il frappe à l'arme et esquive, quelle que soit sa classe.
 * Guerrier (`cfg.kit`) : bloque pour remplir sa rage, et la dépense en Frappe fracassante (A), Bond (E) et Frénésie (R).
 * Invocateur : lie les âmes des vaincus (clic droit) et les commande : Rappel (A), Sacrifice (E), Chœur spectral (R).
 * Lame : traverse les ennemis en les marquant (clic droit) : Marque de mort (A), Écran de fumée (E), Danse des lames (R).
 * Paladin : bouclier levé (clic droit), Aura de lumière (A), Marteau lancé (E), Relever (R).
 * Rôdeur : tire à l'arc, tir chargé (clic droit), Flèche-filet (A), Marque du chasseur (E), Recul (R).
 * Les talents, la race et les reliques arrivent par `cfg.perks`.
 */
/** Soin des âmes versé dès qu'il atteint ces PV. */
const LEECH_SIP = 3;

/** Vitesse de marche en plus : instinct (blessé) et transformation du Hanyō. */
export function walkFactor(cfg: PlayerConfig, hp: number, transformed: number): number {
  const perks = cfg.perks ?? {};
  let factor = 1;
  if (perks.yokaiInstinct && hp < cfg.maxHp * perks.yokaiInstinct.threshold) factor += perks.yokaiInstinct.speed;
  if (perks.yokaiBlood && transformed > 0) factor += perks.yokaiBlood.speed;
  return factor;
}

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
  /** Hanyō : jauge de sang yokai (en dégâts infligés) et secondes de transformation restantes. */
  yokaiGauge = 0;
  transformed = 0;
  /** Lame : charges du Pas de l'ombre et recharge de la suivante, recharges des compétences. */
  dashCharges: number;
  dashRecharge = 0;
  deathMarkCooldown = 0;
  smokeCooldown = 0;
  danceCooldown = 0;
  /** Lame : secondes d'invisibilité (Écran de fumée) ; le premier coup porté invisible est une embuscade critique. */
  hidden = 0;
  /** Métamorphe : secondes d'invisibilité déjà ajoutées à l'Écran de fumée en cours (plafonnées). */
  smokeExtended = 0;
  private ambushReady = false;
  /** Lame (tag) : coups critiques encore dus après une esquive, et le temps qu'il reste pour les porter. */
  private critWindow = 0;
  private critSwings = 0;
  /** Paladin : jauge de garde, secondes de garde brisée, et secondes depuis le dernier coup bloqué. */
  guardLeft: number;
  guardBroken = 0;
  private guardRest = 0;
  /** Paladin : recharges de l'Aura, du Marteau et de Relever. */
  auraCooldown = 0;
  hammerCooldown = 0;
  raiseCooldown = 0;
  /** Rôdeur : recharges de la Flèche-filet, de la Marque du chasseur et du Recul. */
  netCooldown = 0;
  huntCooldown = 0;
  leapCooldown = 0;
  /** Demi-dieu : l'Égide divine a déjà servi pendant cette vague. */
  private aegisUsed = false;
  /** Soin des âmes pas encore versé (voir `leech`). */
  private leechPool = 0;
  /** Coups d'arme portés pendant la descente (foudre du fils de Zeus). */
  private hits = 0;
  /**
   * Fil de la Jorōgumo : vitesse de traction et frein sur la marche, posés par le boss à chaque pas.
   * Le joueur les applique au pas suivant, puis les oublie si le boss ne les renouvelle pas.
   */
  tether: { pull: Vec2; moveFactor: number } | null = null;
  /** Rôdeur : ralentissement juste après un tir chargé, qui remonte jusqu'à 1 (pleine vitesse). */
  private shotSlow = 1;
  readonly mass = 1;
  private moving = false;
  private action: Action = { kind: 'free' };
  private attackBuffer = 0;
  /** Esquive, Bond et Frappe fracassante demandés pendant l'engagement d'un coup : partent dès qu'on peut l'interrompre. */
  private buffered = { dodge: 0, bond: 0, smash: 0 };

  /** Paladin : secondes d'Aura de lumière restantes, et ennemis déjà étourdis par celle-ci (Ama-no-Iwato). */
  aura = 0;
  auraTick = 0;
  readonly auraStunned = new Set<number>();
  /** Invocateur : secondes de Chœur spectral restantes. */
  choir = 0;
  /** Lame : nuage de l'Écran de fumée, que les yokai prennent pour le héros tant qu'il est invisible. */
  smoke: Decoy | null = null;
  /** Coop : secondes passées par un allié à le relever, tant que le héros est à terre. */
  revive = 0;
  /** Coop : son joueur a quitté la partie ; le héros reste à terre. */
  gone = false;

  /** `id` : place du héros dans la partie (0 : l'hôte, ou le seul héros en solo). */
  constructor(
    readonly cfg: PlayerConfig,
    readonly id = 0,
  ) {
    this.guardLeft = cfg.paladin.guard.max;
    this.hp = cfg.maxHp;
    this.dashCharges = cfg.blade.shadowDash.charges;
  }

  get radius(): number {
    return this.cfg.radius;
  }

  get dead(): boolean {
    return this.hp <= 0;
  }

  /** Esquive, bond, Pas de l'ombre, Danse, Recul : le héros traverse les ennemis. */
  get dodging(): boolean {
    const kind = this.action.kind;
    return kind === 'dodge' || kind === 'bond' || kind === 'shadowDash' || kind === 'dance' || kind === 'leap';
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

  /** Hauteur pendant le Bond et le Recul, pour que le rendu dessine l'arc du saut. */
  get altitude(): number {
    const a = this.action;
    if (a.kind === 'bond') return Math.sin(Math.PI * Math.min(1, a.t / this.cfg.bond.duration)) * this.cfg.bond.height;
    if (a.kind === 'leap') return Math.sin(Math.PI * Math.min(1, a.t / this.cfg.ranger.leap.duration)) * this.cfg.ranger.leap.height;
    return 0;
  }

  /** Rôdeur : charge du tir en cours, de 0 à 1 (0 s'il ne bande pas l'arc). */
  get drawProgress(): number {
    const a = this.action;
    return a.kind === 'draw' ? Math.min(1, a.t / this.cfg.ranger.charged.time) : 0;
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
      case 'shadowDash':
        return 'dash';
      case 'dance':
        return 'strike';
      case 'draw':
        // Arc bandé : l'animation « channel » des planches du Rôdeur.
        return 'channel';
      case 'bond':
      case 'leap':
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
    if (perks.lastStand && this.below(perks.lastStand.threshold)) factor += perks.lastStand.damage;
    if (perks.coupelle && this.coupelleFull) factor += perks.coupelle.bonus;
    if (perks.divineMight) factor += perks.divineMight;
    if (perks.yokaiBlood && this.transformed > 0) factor += perks.yokaiBlood.damage;
    // Chaque âme active affaiblit l'Invocateur (GDD : pas de limite stricte, un malus par invocation).
    return factor * Math.max(0.2, 1 - this.cfg.summon.malus * this.summonCount);
  }

  /** Vitesse de marche en plus : instinct et transformation du Hanyō. */
  private speedFactor(): number {
    return walkFactor(this.cfg, this.hp, this.transformed) * this.shotSlow;
  }

  /** Soin goutte à goutte (âmes de l'Invocateur) : versé par petites gorgées, pour ne pas couvrir l'écran de chiffres. */
  leech(amount: number, world: World): void {
    this.leechPool += amount;
    if (this.leechPool < LEECH_SIP) return;
    this.heal(this.leechPool, world);
    this.leechPool = 0;
  }

  heal(amount: number, world: World): void {
    const gained = Math.min(amount, this.cfg.maxHp - this.hp);
    if (gained <= 0) return;
    this.hp += gained;
    world.emit({ type: 'heal', id: 0, pos: { ...this.pos }, amount: gained });
  }

  /** Un coup d'arme vient de porter : renvoie les dégâts de la foudre du fils de Zeus quand c'est son tour (0 sinon). */
  landHit(): number {
    const zeus = this.cfg.perks?.zeusBolt;
    this.hits++;
    return zeus && this.hits % zeus.every === 0 ? zeus.damage * this.damageMultiplier() : 0;
  }

  /** Dégâts infligés par ce héros ou les siens (âmes, flèches, marteau…) : ils remplissent le sang yokai du Hanyō. */
  dealt(amount: number, world: World): void {
    // Au bord du gouffre : sous le seuil, les dégâts infligés soignent, goutte à goutte.
    const stand = this.cfg.perks?.lastStand;
    if (stand && !this.dead && this.below(stand.threshold)) this.leech(amount * stand.lifesteal, world);
    const blood = this.cfg.perks?.yokaiBlood;
    if (!blood || this.transformed > 0 || this.dead) return;
    this.yokaiGauge += amount;
    if (this.yokaiGauge < blood.fill * this.cfg.maxHp) return;
    this.yokaiGauge = 0;
    this.transformed = blood.duration;
    world.emit({ type: 'transform', pos: { ...this.pos } });
  }

  /** Une nouvelle vague commence : l'Égide divine du Demi-dieu est de nouveau prête. */
  newWave(): void {
    this.aegisUsed = false;
  }

  /** Sous cette part de ses PV (affinités de l'Einherjar). */
  private below(threshold: number): boolean {
    return this.hp < this.cfg.maxHp * threshold;
  }

  /** Einherjar lame, Hanyō lame : l'esquive et le Pas de l'ombre reviennent plus vite. */
  private get haste(): number {
    const perks = this.cfg.perks ?? {};
    let factor = 1;
    if (perks.lowHpHaste && this.below(perks.lowHpHaste.threshold)) factor *= perks.lowHpHaste.factor;
    if (perks.yokaiDash && this.transformed > 0) factor *= perks.yokaiDash;
    return factor;
  }

  update(dt: number, input: InputFrame, world: World): void {
    const c = this.cfg;
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - dt * this.haste);
    this.bondCooldown = Math.max(0, this.bondCooldown - dt);
    this.frenzyCooldown = Math.max(0, this.frenzyCooldown - dt);
    this.frenzy = Math.max(0, this.frenzy - dt);
    this.coupelleEmpty = Math.max(0, this.coupelleEmpty - dt);
    this.recallCooldown = Math.max(0, this.recallCooldown - dt);
    this.sacrificeCooldown = Math.max(0, this.sacrificeCooldown - dt);
    this.choirCooldown = Math.max(0, this.choirCooldown - dt);
    this.clayCooldown = Math.max(0, this.clayCooldown - dt);
    this.transformed = Math.max(0, this.transformed - dt);
    this.tickKitCooldowns(dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.attackBuffer = Math.max(0, this.attackBuffer - dt);
    this.recoverGuard(dt);
    // Einherjar guerrier : près de la mort, la rage ne retombe plus.
    const furious = c.perks?.lowHpRage && this.below(c.perks.lowHpRage.threshold);
    if (!furious) this.rage = Math.max(0, this.rage - c.rageDecayPerSecond * dt);
    if (input.attackPressed) this.attackBuffer = ATTACK_BUFFER;
    // Pendant l'engagement d'un coup, la demande attend qu'on puisse l'interrompre ; ensuite, elle s'efface vite.
    const buffered = this.buffered;
    if (this.canCancel()) for (const k of ['dodge', 'bond', 'smash'] as const) buffered[k] = Math.max(0, buffered[k] - dt);
    if (input.dodgePressed) buffered.dodge = ATTACK_BUFFER;
    if (input.skillEPressed) buffered.bond = ATTACK_BUFFER;
    if (input.skillAPressed) buffered.smash = ATTACK_BUFFER;
    this.moving = false;

    // Instinct yokai : blessé, le Hanyō se régénère.
    const instinct = c.perks?.yokaiInstinct;
    if (instinct && this.hp > 0 && this.hp < c.maxHp * instinct.threshold) this.hp = Math.min(c.maxHp, this.hp + instinct.regen * dt);

    const aimDir = normalize(sub(input.aim, this.pos), this.facing);
    const warrior = c.kit === 'guerrier';
    if (warrior && input.skillRPressed && this.canFrenzy) this.startFrenzy(world);
    if (buffered.dodge > 0 && this.dodgeCooldown <= 0 && this.canCancel()) {
      buffered.dodge = 0;
      this.startDodge(input, world);
    } else if (warrior && buffered.bond > 0 && this.canBond && this.canCancel()) {
      buffered.bond = 0;
      this.startBond(input.aimGround, world);
    } else if (warrior && buffered.smash > 0 && this.canSmash && this.canCancel()) {
      buffered.smash = 0;
      this.startSmash(aimDir);
    }
    if (c.kit === 'invocateur') this.commandSouls(input, world);
    else if (c.kit === 'lame') this.bladeSkills(input, aimDir, world);
    else if (c.kit === 'paladin') this.paladinSkills(input, aimDir, world);
    else if (c.kit === 'rodeur') this.rangerSkills(input, aimDir, world);

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
      case 'shadowDash': {
        a.t += dt;
        const dash = c.blade.shadowDash;
        this.pos = add(this.pos, scale(a.dir, (dash.distance / dash.duration) * world.slowAt(this.pos) * dt));
        world.clampToArena(this.pos, this.radius);
        world.shadowMark(this.pos, a.marked);
        if (a.t >= dash.duration) this.action = { kind: 'free' };
        break;
      }
      case 'dance':
        this.updateDance(dt, a, world);
        break;
      case 'draw':
        this.updateDraw(dt, a, input, aimDir, slow, world);
        break;
      case 'leap': {
        a.t += dt;
        const k = Math.min(1, a.t / c.ranger.leap.duration);
        this.pos = lerp(a.from, a.to, k);
        if (k >= 1) this.action = { kind: 'free' };
        break;
      }
    }

    if (tether && this.action.kind !== 'bond' && this.action.kind !== 'leap') this.pos = add(this.pos, scale(tether.pull, dt));
    this.pos = add(this.pos, scale(this.knockback, dt));
    this.knockback = scale(this.knockback, Math.exp(-10 * dt));
    world.clampToArena(this.pos, this.radius);
  }

  /** Guerrier et Paladin lèvent leur garde, sauf quand celle du Paladin vient de se briser. */
  get canGuard(): boolean {
    return (this.cfg.kit === 'guerrier' || this.cfg.kit === 'paladin') && this.guardBroken <= 0;
  }

  /** Paladin : la garde brisée se relève, puis la jauge remonte quand on ne bloque plus rien. */
  private recoverGuard(dt: number): void {
    if (this.cfg.kit !== 'paladin') return;
    const g = this.cfg.paladin.guard;
    this.guardBroken = Math.max(0, this.guardBroken - dt);
    this.guardRest += dt;
    const low = this.cfg.perks?.lowHpGuard;
    const regen = g.regen * (low && this.below(low.threshold) ? low.factor : 1);
    if (this.guardRest >= g.delay) this.guardLeft = Math.min(g.max, this.guardLeft + regen * dt);
  }

  /** Vrai si le joueur bloque et fait face à `from`. */
  isGuarding(from: Vec2): boolean {
    if (!this.blocking || this.action.kind !== 'free') return false;
    const toward = normalize(sub(from, this.pos), this.facing);
    return inCone(this.facing, toward, degToRad(this.cfg.block.arcDeg / 2));
  }

  /**
   * Un coup a été bloqué. Guerrier : la rage monte. Paladin : le bouclier soigne les alliés proches (tag),
   * renvoie des dégâts (Riposte) et entrave l'attaquant (Gleipnir).
   */
  guard(world: World, attacker?: Enemy, amount = 0): void {
    // La garde du Guerrier n'arrête pas tout : le reste du coup passe, sans recul ni invulnérabilité.
    const chip = amount * (1 - this.cfg.block.reduction);
    if (chip > 0) this.loseHp(chip * this.damageTakenFactor(), world, true);
    if (this.cfg.kit !== 'paladin') {
      const gain = this.cfg.block.rageOnGuard * (1 + (this.cfg.perks?.guardRageFactor ?? 0));
      const gained = this.gainRage(gain);
      world.emit({ type: 'guard', pos: { ...this.pos }, rage: Math.round(gained) });
      return;
    }
    const perks = this.cfg.perks ?? {};
    world.emit({ type: 'guard', pos: { ...this.pos }, rage: 0 });
    // La garde s'use selon la force du coup ; vide, elle se brise.
    const g = this.cfg.paladin.guard;
    this.guardRest = 0;
    this.guardLeft -= Math.max(g.minCost, (g.cost * 100 * amount) / this.cfg.maxHp);
    if (this.guardLeft <= 0) {
      this.guardLeft = 0;
      this.guardBroken = g.breakTime;
      this.blocking = false;
      world.emit({ type: 'guardBreak', pos: { ...this.pos } });
    }
    if (perks.shieldHeal) world.healAllies(this.pos, perks.shieldHeal.radius, perks.shieldHeal.amount, this);
    if (!attacker || attacker.dead) return;
    if (perks.riposte) {
      attacker.receiveHit({ amount: perks.riposte * this.damageMultiplier(), from: this.pos, knockback: 4 }, world);
      if (attacker.dead) this.onKill();
    }
    if (perks.gleipnir && !attacker.dead) attacker.stun(perks.gleipnir, 'daze', world);
  }

  /** Renvoie faux si le joueur est invulnérable (esquive ou coup tout juste reçu). */
  takeHit(amount: number, pushDir: Vec2, knockback: number, world: World): boolean {
    const kind = this.action.kind;
    if (this.invulnerable > 0 || kind === 'bond' || kind === 'dance' || kind === 'leap') return false;
    const perks = this.cfg.perks ?? {};
    // Corps d'argile : la carapace de l'Oushebti absorbe le coup entier, puis se reforme.
    if (perks.clayShell && this.clayCooldown <= 0) {
      this.clayCooldown = perks.clayShell;
      this.invulnerable = this.cfg.invulnerableAfterHit;
      world.emit({ type: 'clayShell', pos: { ...this.pos } });
      // Affinités de l'Oushebti : l'argile qui éclate nourrit la rage, rend l'ombre, remplit la garde, ou reste en leurre.
      if (perks.clayRage) this.gainRage(perks.clayRage);
      if (perks.clayDash) this.refundDash();
      if (perks.clayGuard) {
        this.guardLeft = this.cfg.paladin.guard.max;
        this.guardBroken = 0;
      }
      if (perks.clayDecoy) world.clayDecoy(this, perks.clayDecoy);
      return true;
    }
    this.loseHp(amount * this.damageTakenFactor(), world, false);
    if (perks.coupelle) this.coupelleEmpty = perks.coupelle.emptyTime;
    this.invulnerable = this.cfg.invulnerableAfterHit;
    this.knockback = scale(pushDir, knockback);
    if (this.action.kind === 'attack') this.action = { kind: 'free' };
    return true;
  }

  /** Part des dégâts réellement subis : équipement, Frénésie, Peau du lion, sang yokai. */
  private damageTakenFactor(): number {
    const perks = this.cfg.perks ?? {};
    let factor = this.cfg.damageTakenFactor ?? 1;
    if (this.frenzy > 0) factor *= this.cfg.frenzy.damageTakenFactor;
    if (perks.lionSkin && this.rage >= this.cfg.rageMax / 2) factor *= 1 - perks.lionSkin;
    if (perks.yokaiBlood && this.transformed > 0) factor *= 1 + perks.yokaiBlood.taken;
    return factor;
  }

  /** Retire des PV ; Peau d'ours empêche une fois de tomber, l'Égide divine protège au bord de la mort. `blocked` : à travers la garde. */
  private loseHp(taken: number, world: World, blocked: boolean): void {
    const perks = this.cfg.perks ?? {};
    this.hp = Math.max(0, this.hp - taken);
    if (this.hp <= 0 && perks.bearSkin && !this.bearSkinUsed) {
      // Peau d'ours : une fois par descente, le Berserkir refuse de tomber.
      this.bearSkinUsed = true;
      this.hp = 1;
      this.rage = this.cfg.rageMax;
      world.emit({ type: 'bearSkin', pos: { ...this.pos } });
    }
    const aegis = perks.divineAegis;
    if (aegis && !this.aegisUsed && this.hp > 0 && this.below(aegis.threshold)) {
      // Égide divine : une fois par vague, le Demi-dieu au bord de la mort devient intouchable un instant.
      this.aegisUsed = true;
      this.invulnerable = Math.max(this.invulnerable, aegis.invulnerable);
      this.hp = Math.min(this.cfg.maxHp, this.hp + this.cfg.maxHp * aegis.heal);
      world.emit({ type: 'divineAegis', pos: { ...this.pos } });
    }
    world.emit({ type: 'playerHit', pos: { ...this.pos }, amount: taken, blocked, hero: this.id });
  }

  /** Ajoute de la rage (paliers du tag Guerrier compris) ; renvoie ce qui a été gagné. */
  gainRage(amount: number): number {
    const perks = this.cfg.perks ?? {};
    let gain = amount * (perks.rageGainFactor ?? 1);
    if (perks.lowHpRage && this.below(perks.lowHpRage.threshold)) gain *= perks.lowHpRage.gain;
    if (perks.yokaiRage && this.transformed > 0) gain *= perks.yokaiRage;
    const before = this.rage;
    this.rage = Math.min(this.cfg.rageMax, this.rage + gain);
    return this.rage - before;
  }

  /** Un ennemi vient de tomber sous nos coups. */
  onKill(): void {
    const perks = this.cfg.perks ?? {};
    let heal = (perks.valhallaHeal ?? 0) + this.cfg.maxHp * (perks.valhallaShare ?? 0);
    if (this.frenzy > 0) heal += perks.frenzyHealOnKill ?? 0;
    this.hp = Math.min(this.cfg.maxHp, this.hp + heal);
    const cut = perks.cooldownOnKill ?? 0;
    this.bondCooldown = Math.max(0, this.bondCooldown - cut);
    this.frenzyCooldown = Math.max(0, this.frenzyCooldown - cut);
  }

  /** Temps d'un coup d'arme, raccourcis pendant la Frénésie. */
  private timing(): { windup: number; active: number; recovery: number; commit: number } {
    const a = this.cfg.attack;
    const f = this.frenzy > 0 ? this.cfg.frenzy.attackTimeFactor : 1;
    return { windup: a.windup * f, active: a.active * f, recovery: a.recovery * f, commit: a.commit * f };
  }

  private updateFree(dt: number, input: InputFrame, aimDir: Vec2, slow: number): void {
    const c = this.cfg;
    this.facing = aimDir;
    // L'attaque d'abord : un clic la lance même garde levée ; un clic mémorisé ou le bouton tenu, seulement sans la garde.
    // (Les compétences, elles, sont lancées avant, dans `update`, et interrompent la fin d'un coup.)
    const wantsAttack = this.attackBuffer > 0 || input.attackHeld;
    if (input.attackPressed || (wantsAttack && !input.signatureHeld)) {
      this.blocking = false;
      this.startAttack();
      return;
    }

    this.blocking = this.canGuard && input.signatureHeld;
    if (c.kit === 'rodeur' && input.signatureHeld) {
      this.action = { kind: 'draw', t: 0 };
      return;
    }
    if (!this.blocking && wantsAttack) {
      this.startAttack();
      return;
    }
    if (length(input.move) > 0.05) {
      const speed = c.moveSpeed * slow * this.speedFactor() * (this.blocking ? c.blockMoveFactor : 1);
      this.pos = add(this.pos, scale(input.move, speed * dt));
      this.moving = true;
    }
  }

  /** Frappe fracassante du Guerrier, comme le Bond : depuis l'arrêt, ou en coupant la fin d'un coup. */
  private startSmash(aimDir: Vec2): void {
    this.facing = aimDir;
    this.rage -= this.cfg.smash.rageCost;
    this.blocking = false;
    this.action = { kind: 'smash', t: 0, dir: { ...this.facing }, landed: false };
  }

  private startAttack(): void {
    this.attackBuffer = 0;
    this.blocking = false;
    this.action = { kind: 'attack', t: 0, dir: { ...this.facing }, hit: new Set(), swung: false, crit: this.nextCrit() };
  }

  /**
   * Lame : critique du coup qui commence. Invisible, le premier coup est une embuscade (Langue d'argent la renforce) ;
   * juste après une esquive, les premiers coups sont critiques (tag Lame).
   */
  private nextCrit(): number {
    const crit = this.cfg.blade.critFactor;
    if (this.hidden > 0 && this.ambushReady) {
      this.ambushReady = false;
      return crit * (this.cfg.perks?.ambush ?? 1);
    }
    if (this.critWindow > 0 && this.critSwings > 0) {
      this.critSwings--;
      return crit;
    }
    return 1;
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
    // Le Rôdeur tire une flèche au lieu de frapper.
    const ranged = this.cfg.kit === 'rodeur';
    if (!a.swung && a.t >= time.windup) {
      a.swung = true;
      if (ranged) world.loose(a.dir);
      else world.emit({ type: 'swing', pos: { ...this.pos }, dir: a.dir, range: c.range, arcDeg: c.arcDeg, shape: c.shape, width: c.width });
    }
    const recoveryStart = time.windup + time.active;
    if (!ranged && a.t >= time.windup && a.t < recoveryStart) {
      this.pos = add(this.pos, scale(a.dir, (c.lunge / time.active) * dt));
      world.strike(this.pos, a.dir, a.hit, a.crit);
    }

    // Passé l'engagement de l'arme et l'impact, lever la garde (clic droit) interrompt la fin du coup
    const canInterrupt = a.t >= Math.max(time.commit, recoveryStart);
    const wantsGuard = this.canGuard && input.signatureHeld;
    if (canInterrupt && wantsGuard) {
      this.action = { kind: 'free' };
      this.blocking = true;
      this.facing = aimDir;
      return;
    }

    // Enchaînement : un clic mémorisé (ou le bouton maintenu) relance un coup à mi-récupération,
    // sauf si le joueur a demandé la parade
    const wantsNext = (this.attackBuffer > 0 || input.attackHeld) && !input.signatureHeld;
    if (wantsNext && a.t >= recoveryStart + time.recovery / 2) {
      this.facing = aimDir;
      this.startAttack();
    } else if (a.t >= recoveryStart + time.recovery) {
      this.action = { kind: 'free' };
    } else if (!wantsNext && canInterrupt && length(input.move) > 0.05) {
      // Passé l'engagement de l'arme, se déplacer interrompt la fin du coup. Jamais avant que le coup ne porte :
      // on frappe souvent en marchant ; la feinte, elle, passe par l'esquive.
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
    this.openCritWindow();
    world.emit({ type: 'dodge', pos: { ...this.pos }, dir });
  }

  /** Tag Lame : les coups qui suivent une esquive sont critiques. */
  private openCritWindow(): void {
    const dodgeCrit = this.cfg.perks?.dodgeCrit;
    if (!dodgeCrit) return;
    this.critWindow = dodgeCrit.window;
    this.critSwings = dodgeCrit.swings;
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

  private tickKitCooldowns(dt: number): void {
    this.shotSlow = Math.min(1, this.shotSlow + dt / Math.max(0.01, this.cfg.ranger.charged.recover));
    const tick = (value: number) => Math.max(0, value - dt);
    this.deathMarkCooldown = tick(this.deathMarkCooldown);
    this.smokeCooldown = tick(this.smokeCooldown);
    this.danceCooldown = tick(this.danceCooldown);
    this.hidden = tick(this.hidden);
    this.critWindow = tick(this.critWindow);
    this.auraCooldown = tick(this.auraCooldown);
    this.hammerCooldown = tick(this.hammerCooldown);
    this.raiseCooldown = tick(this.raiseCooldown);
    this.netCooldown = tick(this.netCooldown);
    this.huntCooldown = tick(this.huntCooldown);
    this.leapCooldown = tick(this.leapCooldown);
    // Les charges du Pas de l'ombre reviennent une à une.
    const dash = this.cfg.blade.shadowDash;
    if (this.dashCharges >= dash.charges) return;
    this.dashRecharge -= dt * this.haste;
    if (this.dashRecharge > 0) return;
    this.dashCharges++;
    this.dashRecharge = dash.cooldown;
  }

  // --- Lame ------------------------------------------------------------------

  /** Pas de l'ombre (clic droit), Marque de mort (A), Écran de fumée (E), Danse des lames (R). */
  private bladeSkills(input: InputFrame, aimDir: Vec2, world: World): void {
    const b = this.cfg.blade;
    if (input.signaturePressed && this.dashCharges > 0 && this.canCancel()) this.startShadowDash(aimDir, world);
    if (input.skillAPressed && this.deathMarkCooldown <= 0 && world.deathMark(input.aim)) this.deathMarkCooldown = b.deathMark.cooldown;
    if (input.skillEPressed && this.smokeCooldown <= 0) {
      world.smokeScreen();
      this.smokeCooldown = b.smoke.cooldown;
      this.hidden = b.smoke.duration;
      this.smokeExtended = 0;
      this.ambushReady = true;
    }
    if (input.skillRPressed && this.danceCooldown <= 0 && this.canCancel()) {
      const targets = world.danceTargets();
      if (!targets.length) return;
      this.danceCooldown = b.dance.cooldown;
      this.blocking = false;
      this.action = { kind: 'dance', t: 0, targets: targets.map((e) => e.id), index: -1 };
    }
  }

  /** Rend une charge du Pas de l'ombre (Marée d'ombre). */
  refundDash(): void {
    this.dashCharges = Math.min(this.cfg.blade.shadowDash.charges, this.dashCharges + 1);
  }

  private startShadowDash(dir: Vec2, world: World): void {
    const dash = this.cfg.blade.shadowDash;
    // La recharge ne démarre que quand on entame les charges pleines.
    if (this.dashCharges >= dash.charges) this.dashRecharge = dash.cooldown;
    this.dashCharges--;
    this.blocking = false;
    this.facing = dir;
    this.action = { kind: 'shadowDash', t: 0, dir, marked: new Set() };
    this.invulnerable = Math.max(this.invulnerable, dash.duration + 0.05);
    this.openCritWindow();
    const to = add(this.pos, scale(dir, dash.distance));
    world.clampToArena(to, this.radius);
    world.emit({ type: 'streak', from: { ...this.pos }, to });
  }

  /** La Danse des lames saute de cible en cible ; une cible disparue est passée. */
  private updateDance(dt: number, a: Extract<Action, { kind: 'dance' }>, world: World): void {
    a.t -= dt;
    if (a.t > 0) return;
    while (++a.index < a.targets.length) {
      const to = world.danceStrike(a.targets[a.index], this.pos);
      if (!to) continue;
      this.facing = normalize(sub(this.pos, to), this.facing);
      this.pos = to;
      a.t = this.cfg.blade.dance.hop;
      return;
    }
    this.action = { kind: 'free' };
    this.invulnerable = Math.max(this.invulnerable, 0.2);
  }

  // --- Paladin ---------------------------------------------------------------

  /** Aura de lumière (A), Marteau lancé (E), Relever (R) ; le bouclier se lève dans `updateFree`. */
  private paladinSkills(input: InputFrame, aimDir: Vec2, world: World): void {
    const p = this.cfg.paladin;
    if (input.skillAPressed && this.auraCooldown <= 0) {
      world.startAura();
      this.auraCooldown = p.aura.cooldown;
    }
    if (input.skillEPressed && this.hammerCooldown <= 0 && world.throwHammer(aimDir)) this.hammerCooldown = p.hammer.cooldown;
    if (input.skillRPressed && this.raiseCooldown <= 0 && world.relever()) this.raiseCooldown = p.raise.cooldown;
  }

  // --- Rôdeur ----------------------------------------------------------------

  /** Flèche-filet (A), Marque du chasseur (E), Recul (R) ; le tir chargé se bande dans `updateFree`. */
  private rangerSkills(input: InputFrame, aimDir: Vec2, world: World): void {
    const r = this.cfg.ranger;
    if (input.skillAPressed && this.netCooldown <= 0) {
      world.netArrow(aimDir);
      this.netCooldown = r.net.cooldown;
    }
    if (input.skillEPressed && this.huntCooldown <= 0 && world.huntMark(input.aim)) this.huntCooldown = r.huntMark.cooldown;
    if (input.skillRPressed && this.leapCooldown <= 0 && this.canCancel()) this.startLeap(aimDir, world);
  }

  /** Tir chargé : on bande l'arc en marchant lentement, on tire en relâchant le clic droit. */
  private updateDraw(
    dt: number,
    a: Extract<Action, { kind: 'draw' }>,
    input: InputFrame,
    aimDir: Vec2,
    slow: number,
    world: World,
  ): void {
    const c = this.cfg;
    // Hanyō rôdeur : transformé, l'arc se bande plus vite.
    a.t += dt * (c.perks?.yokaiDraw && this.transformed > 0 ? c.perks.yokaiDraw : 1);
    this.facing = aimDir;
    const charged = c.ranger.charged;
    const drawSlow = charged.moveFactor + (charged.fullMoveFactor - charged.moveFactor) * this.drawProgress;
    if (!input.signatureHeld) {
      world.loose(aimDir, this.drawProgress);
      this.action = { kind: 'free' };
      // Le pas reste lourd juste après le tir, puis revient peu à peu (tickKitCooldowns).
      this.shotSlow = drawSlow;
      return;
    }
    if (length(input.move) > 0.05) {
      const speed = c.moveSpeed * slow * walkFactor(c, this.hp, this.transformed) * drawSlow;
      this.pos = add(this.pos, scale(input.move, speed * dt));
      this.moving = true;
    }
  }

  /** Recul : bond en arrière, loin de la souris, en lâchant une volée de flèches vers elle. */
  private startLeap(aimDir: Vec2, world: World): void {
    const leap = this.cfg.ranger.leap;
    const to = add(this.pos, scale(aimDir, -leap.distance));
    world.clampToArena(to, this.radius);
    if (this.cfg.perks?.leapNet) world.netBurst(this.pos);
    world.volley(aimDir);
    this.leapCooldown = leap.cooldown;
    this.blocking = false;
    this.facing = aimDir;
    this.action = { kind: 'leap', t: 0, from: { ...this.pos }, to };
  }

  private startFrenzy(world: World): void {
    const f = this.cfg.frenzy;
    this.rage -= f.rageCost;
    this.frenzy = f.duration;
    this.frenzyCooldown = f.cooldown;
    world.emit({ type: 'frenzy', pos: { ...this.pos } });
  }

  /**
   * L'esquive et les compétences de mouvement interrompent un coup une fois passé l'engagement de l'arme
   * (dès l'élan pour les kunai, jamais pour le kanabō) ; et le tir chargé à tout moment.
   */
  private canCancel(): boolean {
    const a = this.action;
    if (a.kind === 'free' || a.kind === 'draw') return true;
    return a.kind === 'attack' && a.t >= this.timing().commit;
  }
}
