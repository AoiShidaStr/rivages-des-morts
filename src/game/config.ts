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
  recover: number;
  cooldown: number;
  parryStun: number;
  wallStun: number;
}

export interface WaveConfig {
  label: string;
  hint?: string;
  spawns: { kind: EnemyKind; count: number }[];
}

export interface GameConfig {
  arenaHalfSize: number;
  player: PlayerConfig;
  hitodama: HitodamaConfig;
  kappa: KappaConfig;
  waves: WaveConfig[];
}
