import type { EnemyKind } from './types';

// Forme des fichiers de src/data : les valeurs s'équilibrent là-bas, sans toucher au code du combat.

export interface PlayerConfig {
  maxHp: number;
  radius: number;
  moveSpeed: number;
  /** Multiplicateur de vitesse pendant le blocage. */
  blockMoveFactor: number;
  invulnerableAfterHit: number;
  rageMax: number;
  rageDecayPerSecond: number;
  attack: {
    damage: number;
    range: number;
    arcDeg: number;
    windup: number;
    active: number;
    recovery: number;
    /** Distance parcourue en avant pendant le coup. */
    lunge: number;
    knockback: number;
    rageOnHit: number;
  };
  block: { arcDeg: number; rageOnGuard: number };
  dodge: { distance: number; duration: number; invulnerable: number; cooldown: number };
  smash: {
    rageCost: number;
    damage: number;
    /** Distance entre le joueur et le centre de l'impact. */
    offset: number;
    radius: number;
    windup: number;
    recovery: number;
    knockback: number;
    stun: number;
  };
}

export interface EnemyBaseConfig {
  maxHp: number;
  radius: number;
  /** Poids relatif quand deux corps se poussent. */
  mass: number;
  knockbackFactor: number;
}

export interface HitodamaConfig extends EnemyBaseConfig {
  speed: number;
  /** Amplitude de l'ondulation latérale. */
  weave: number;
  contactDamage: number;
  retreatTime: number;
}

export interface KodamaConfig extends EnemyBaseConfig {
  speed: number;
  /** Distance gardée avec le joueur quand il n'a personne à soigner. */
  keepDistance: number;
  fleeDistance: number;
  healAmount: number;
  healRadius: number;
  healInterval: number;
  /** Durée pendant laquelle il se concentre avant de soigner ; un coup l'interrompt. */
  healChannel: number;
}

export interface KappaConfig extends EnemyBaseConfig {
  speed: number;
  turnRateDeg: number;
  /** Angle protégé par la carapace, devant le kappa. */
  shellArcDeg: number;
  shellDamageFactor: number;
  chargeRange: number;
  telegraph: number;
  chargeSpeed: number;
  chargeDistance: number;
  chargeDamage: number;
  chargeKnockback: number;
  /** Nombre de charges enchaînées (1 pour le kappa, plus pour l'élite). */
  comboCharges: number;
  /** Annonce raccourcie des charges suivantes du combo. */
  comboTelegraph: number;
  recover: number;
  cooldown: number;
  parryStun: number;
  wallStun: number;
}

export interface KasaObakeConfig extends EnemyBaseConfig {
  hopDistance: number;
  hopTime: number;
  hopHeight: number;
  pauseMin: number;
  pauseMax: number;
  jumpRange: number;
  /** Probabilité, après chaque pause, de tenter le grand saut plutôt qu'un petit bond. */
  jumpChance: number;
  /** Délai minimum entre deux grands sauts. */
  jumpCooldown: number;
  riseTime: number;
  /** Temps passé en l'air pendant que la zone d'atterrissage est affichée. */
  hangTime: number;
  fallTime: number;
  landRadius: number;
  landDamage: number;
  landKnockback: number;
  landRecover: number;
}

export interface OublieConfig extends EnemyBaseConfig {
  speed: number;
  attackRange: number;
  arcDeg: number;
  windup: number;
  recover: number;
  damage: number;
  knockback: number;
  cooldown: number;
}

/** Frappe de mêlée annoncée : éventail de la Jorōgumo, morsure de l'araignée géante. */
export interface MeleeConfig {
  range: number;
  arcDeg: number;
  windup: number;
  recover: number;
  damage: number;
  knockback: number;
  cooldown: number;
}

/** Zone annoncée par un cercle, qui retombe puis laisse parfois une toile. */
export interface HazardConfig {
  warning: number;
  radius: number;
  damage: number;
  knockback: number;
}

export interface JorogumoConfig extends EnemyBaseConfig {
  /** Seuils de PV (fraction du maximum) qui déclenchent la forme d'araignée puis la montée au plafond. */
  spiderAt: number;
  ceilingAt: number;
  transformTime: number;
  human: {
    speed: number;
    keepDistance: number;
    fan: MeleeConfig;
    summonInterval: number;
    summonChannel: number;
    summonCount: number;
    /** Nombre maximum de petites araignées en même temps. */
    maxSpiders: number;
    webTossInterval: number;
    webToss: HazardConfig;
  };
  spider: {
    radius: number;
    speed: number;
    turnRateDeg: number;
    bite: MeleeConfig;
    chargeRange: number;
    chargeCooldown: number;
    telegraph: number;
    chargeSpeed: number;
    chargeDistance: number;
    chargeDamage: number;
    chargeKnockback: number;
    recover: number;
    /** Étourdissement quand elle charge dans une souche. */
    stumpStun: number;
    webLayInterval: number;
  };
  ceiling: {
    height: number;
    climbTime: number;
    driftSpeed: number;
    rainInterval: number;
    rainCount: number;
    rain: HazardConfig;
    /** Probabilité qu'un fil tombé laisse une toile au sol. */
    rainWebChance: number;
    pullInterval: number;
    pullAim: number;
    pullSpeed: number;
    pullMaxTime: number;
    /** Vitesse de marche du joueur quand le fil le tient (multiplicateur). */
    tetheredMoveFactor: number;
    biteRange: number;
    biteDamage: number;
    biteKnockback: number;
    /** Temps passé au sol après une morsure, vulnérable, avant de remonter. */
    groundedAfterBite: number;
    fallTime: number;
    /** Étourdissement quand le fil de Jōren l'arrache du plafond, et bonus de dégâts pendant ce temps. */
    snagStun: number;
    snagDamageFactor: number;
  };
  /** Feux follets entretenus dans l'arène : ils servent à brûler les toiles. */
  hitodamaCount: number;
  hitodamaInterval: number;
}

export interface WebConfig {
  radius: number;
  maxWebs: number;
  /** Vitesse du joueur dans une toile (multiplicateur, déplacement et esquive). */
  slowFactor: number;
  /** Distance à laquelle un feu follet frappé enflamme une toile. */
  igniteReach: number;
  burnTime: number;
  /** Dégâts du feu aux yokai pris dans une toile qui brûle. */
  burnDamage: number;
}

export interface EnemyConfigs {
  hitodama: HitodamaConfig;
  kodama: KodamaConfig;
  kappa: KappaConfig;
  kappaRenforce: KappaConfig;
  kasaObake: KasaObakeConfig;
  oublie: OublieConfig;
  araignee: OublieConfig;
  jorogumo: JorogumoConfig;
}

export interface WaveConfig {
  label: string;
  hint?: string;
  spawns: { kind: EnemyKind; count: number }[];
  /** Souches placées dans l'arène pour cette vague (arène du boss). */
  stumps?: { x: number; z: number }[];
}

export interface GameConfig {
  arenaHalfSize: number;
  player: PlayerConfig;
  enemies: EnemyConfigs;
  webs: WebConfig;
  stumpRadius: number;
  waves: WaveConfig[];
}
