import type { Difficulty } from './difficulty';
import type { EnemyKind } from './types';

// Forme des fichiers de src/data : les valeurs s'équilibrent là-bas, sans toucher au code du combat.

/** Jeu de compétences de la classe : clic droit et A / E / R n'ont pas le même rôle. */
export type Kit = 'guerrier' | 'invocateur' | 'lame' | 'paladin' | 'rodeur';

export interface PlayerConfig {
  kit: Kit;
  maxHp: number;
  radius: number;
  moveSpeed: number;
  /** Multiplicateur de vitesse pendant le blocage. */
  blockMoveFactor: number;
  invulnerableAfterHit: number;
  /** Part des dégâts réellement subis (1 par défaut ; l'équipement la réduit). */
  damageTakenFactor?: number;
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
  /** E : saut sur une zone, qui frappe à l'atterrissage. */
  bond: {
    rageCost: number;
    range: number;
    duration: number;
    height: number;
    damage: number;
    radius: number;
    knockback: number;
    cooldown: number;
    /** Étourdissement à l'atterrissage (0 sans le talent d'Héraclès). */
    stun: number;
  };
  /** R : on frappe plus vite, mais on encaisse plus. */
  frenzy: {
    rageCost: number;
    duration: number;
    cooldown: number;
    /** Multiplicateur des temps d'attaque (moins de 1 = plus rapide). */
    attackTimeFactor: number;
    damageTakenFactor: number;
  };
  /** Âmes liées de l'Invocateur (ignoré par le Guerrier). */
  summon: SummonConfig;
  blade: BladeConfig;
  paladin: PaladinConfig;
  ranger: RangerConfig;
  /** Effets venus des talents, de la race, des reliques et des paliers de tags. */
  perks?: Perks;
}

/** Invocateur : les âmes des ennemis vaincus se relèvent et combattent à ses côtés. */
export interface SummonConfig {
  /** Âmes actives en même temps. */
  max: number;
  /** Distance maximale entre le héros et l'âme qu'il lie. */
  bindRange: number;
  /** Secondes pendant lesquelles l'âme d'un ennemi vaincu reste au sol, prête à être liée. */
  soulLife: number;
  /** Secondes de combat d'une âme liée avant qu'elle ne s'efface. */
  life: number;
  /** PV d'une âme liée : les yokai l'attaquent, et elle se brise à 0. */
  hp: number;
  radius: number;
  speed: number;
  damage: number;
  attackRange: number;
  attackCooldown: number;
  knockback: number;
  /** Au-delà de cette distance du héros, une âme revient vers lui. */
  leash: number;
  /** Dégâts du héros en moins pour chaque âme active (GDD : chaque invocation affaiblit le joueur). */
  malus: number;
  /** A : les âmes foncent sur l'ennemi visé et frappent plus fort. */
  recall: { cooldown: number; speed: number; damageFactor: number; duration: number };
  /** E : la plus vieille âme explose. */
  sacrifice: { cooldown: number; damage: number; radius: number };
  /** R : les âmes sont renforcées un moment. */
  choir: { cooldown: number; duration: number; damageFactor: number; speedFactor: number; radius: number };
  /** Multiplicateurs par yokai d'origine : un kappa lié frappe plus fort et encaisse mieux qu'un feu follet. */
  kinds: Partial<Record<EnemyKind, { damage: number; speed: number; hp: number }>>;
}

/** Lame : frappe vite, marque ses proies et les achève en critiques. */
export interface BladeConfig {
  /** Multiplicateur des coups critiques. */
  critFactor: number;
  /** Clic droit : dash qui traverse les ennemis et marque chacun d'eux (leur prochain coup reçu est critique). */
  shadowDash: { distance: number; duration: number; cooldown: number; charges: number; markTime: number };
  /** A : tous les coups sur la cible sont critiques un moment. */
  deathMark: { cooldown: number; duration: number; range: number };
  /** E : nuage de fumée ; le héros disparaît, les yokai attaquent le nuage. */
  smoke: { cooldown: number; duration: number; radius: number };
  /** R : la Lame bondit d'ennemi en ennemi et frappe chacun. */
  dance: { cooldown: number; targets: number; range: number; damage: number; hop: number };
}

/** Paladin : bouclier levé, aura de soin, marteau lancé, et un allié relevé. */
export interface PaladinConfig {
  /** A : zone qui soigne le héros et ses alliés. */
  aura: { cooldown: number; duration: number; radius: number; heal: number };
  /** E : le marteau part vers la souris et revient, en frappant à l'aller et au retour. */
  hammer: { cooldown: number; damage: number; range: number; speed: number; radius: number; knockback: number };
  /** R : relève le dernier allié tombé (âme brisée, ou yokai vaincu) près du héros. */
  raise: { cooldown: number; range: number; memory: number };
}

/** Rôdeur : flèches, tir chargé, filet, marque du chasseur, bond en arrière. */
export interface RangerConfig {
  /** La portée des flèches est celle de l'arme (`attack.range`). */
  arrow: { speed: number; radius: number };
  /** Clic droit maintenu : la flèche se charge, de 1 à `maxFactor` fois les dégâts. */
  charged: { time: number; maxFactor: number; moveFactor: number; rangeFactor: number; speedFactor: number };
  /** A : flèche qui immobilise les ennemis autour de l'impact. */
  net: { cooldown: number; stun: number; radius: number; range: number };
  /** E : la cible prend plus de dégâts, de toutes les sources. */
  huntMark: { cooldown: number; duration: number; bonus: number; range: number };
  /** R : bond en arrière en tirant une volée vers la souris. */
  leap: { cooldown: number; distance: number; duration: number; height: number; arrows: number; spreadDeg: number };
}

/** Effets spéciaux du Guerrier ; absents = inactifs. */
export interface Perks {
  /** Multiplie la rage gagnée en frappant. */
  hitRageFactor?: number;
  /** Multiplie toute la rage gagnée (paliers du tag Guerrier). */
  rageGainFactor?: number;
  /** Rage gagnée en bloquant, en plus (Katana de rōnin). */
  guardRageFactor?: number;
  /** Éclair ajouté à chaque coup quand la rage est pleine. */
  storm?: number;
  /** Réduction des dégâts subis au-dessus de la moitié de la rage. */
  lionSkin?: number;
  /** Secondes retirées aux temps de recharge à chaque ennemi tué. */
  cooldownOnKill?: number;
  /** PV rendus par ennemi tué pendant la Frénésie. */
  frenzyHealOnKill?: number;
  /** Dégâts en plus sous la moitié des PV. */
  lowHpDamage?: number;
  /** Une fois par descente, survit à un coup fatal. */
  bearSkin?: boolean;
  /** Einherjar : dégâts en plus selon les PV perdus (valeur à 0 PV). */
  einherjarRage?: number;
  /** Einherjar : PV rendus par ennemi tué. */
  valhallaHeal?: number;
  /** Coupelle du kappa : dégâts en plus tant qu'on n'est pas touché. */
  coupelle?: { bonus: number; emptyTime: number };
  /** Fil de Jōren : chaque esquive laisse un fil qui immobilise le premier ennemi. */
  joren?: { stun: number; life: number; radius: number };

  // --- Races ---
  /** Oushebti : une carapace d'argile absorbe un coup, puis se reforme après ce nombre de secondes. */
  clayShell?: number;
  /** Demi-dieu : une fois par descente, se relève avec cette part de ses PV. */
  divineBlood?: number;
  /** Demi-dieu, fils de Zeus : un coup d'arme sur `every` appelle la foudre. */
  zeusBolt?: { every: number; damage: number };
  /** Demi-dieu, fils d'Arès : dégâts en plus, pour toutes les attaques. */
  divineMight?: number;
  /** Hanyō : les coups remplissent une jauge ; pleine, elle transforme le héros un moment. */
  yokaiBlood?: { hits: number; duration: number; damage: number; speed: number; taken: number };
  /** Hanyō : sous `threshold` des PV, vitesse en plus et régénération. */
  yokaiInstinct?: { threshold: number; speed: number; regen: number };

  // --- Invocateur ---
  /** Dégâts des âmes multipliés (paliers du tag Invocateur). */
  summonDamageFactor?: number;
  /** Les coups des âmes étourdissent (Éventail de la Jorōgumo). */
  summonStun?: number;
  /** Masque d'Oublié : les yokai s'en prennent d'abord aux âmes. */
  summonTaunt?: boolean;
  /** Les Douze Shikigami : chaque âme garde un trait de son yokai. */
  shikigami?: boolean;
  /** PV rendus en lançant le Chœur spectral. */
  choirHeal?: number;
  /** Le Chœur spectral étourdit les ennemis proches. */
  choirStun?: number;
  /** Chant des Enfers : un ennemi sous cette part de ses PV (hors boss) peut être lié vivant. */
  underworldSong?: number;
  /** PV rendus par un Sacrifice. */
  sacrificeHeal?: number;
  /** Une âme sacrifiée laisse son âme au sol. */
  sacrificeSoul?: boolean;
  /** Le Jugement : le Sacrifice inflige en plus cette part des PV max des ennemis touchés. */
  judgement?: number;

  // --- Lame ---
  /** Après une esquive (ou un Pas de l'ombre), les `swings` premiers coups dans les `window` s sont critiques (tag Lame). */
  dodgeCrit?: { window: number; swings: number };
  /** Croissant : dégâts infligés aux ennemis traversés par le Pas de l'ombre. */
  dashDamage?: number;
  /** Marée d'ombre : tuer un ennemi marqué rend une charge du Pas de l'ombre. */
  dashRefund?: boolean;
  /** Poudre aux yeux : l'Écran de fumée étourdit les ennemis proches. */
  smokeStun?: number;
  /** Langue d'argent : multiplicateur en plus des critiques portés depuis l'invisibilité. */
  ambush?: number;
  /** Métamorphe : chaque ennemi tué pendant l'invisibilité la prolonge. */
  smokeKillExtend?: number;
  /** Dernier souffle : dégâts en plus sur les ennemis sous `threshold` de leurs PV. */
  execute?: { threshold: number; bonus: number };
  /** Moisson des âmes : la Marque de mort passe à l'ennemi le plus proche quand sa cible meurt. */
  markJump?: boolean;

  // --- Paladin ---
  /** Un coup bloqué soigne le héros et ses alliés autour de lui (tag Paladin). */
  shieldHeal?: { amount: number; radius: number };
  /** Riposte : un coup bloqué renvoie ces dégâts à l'attaquant. */
  riposte?: number;
  /** Gleipnir : un coup bloqué étourdit l'attaquant. */
  gleipnir?: number;
  /** Chaleur : l'Aura brûle les ennemis qui s'y trouvent (dégâts par seconde). */
  auraBurn?: number;
  /** Ama-no-Iwato : un ennemi qui entre dans l'Aura est étourdi (une fois par Aura). */
  auraStun?: number;
  /** Marteau du juge : le Marteau lancé étourdit. */
  hammerStun?: number;
  /** Relever te soigne. */
  raiseHeal?: number;
  /** Bandelettes : PV et durée des alliés relevés multipliés. */
  raiseToughness?: number;
  /** Roi des morts : Relever relève ce nombre d'alliés. */
  raiseCount?: number;

  // --- Rôdeur ---
  /** Tir chargé plein : il traverse les ennemis (tag Rôdeur). */
  chargedPierce?: boolean;
  /** Tir chargé plein : il pose la Marque du chasseur pendant ces secondes (tag Rôdeur). */
  chargedMark?: number;
  /** Tir chargé : dégâts multipliés. */
  chargedDamage?: number;
  /** Lune pleine : un tir chargé plein étourdit. */
  chargedStun?: number;
  /** Carquois divin : un tir chargé plein part en plusieurs flèches. */
  splitShot?: number;
  /** Vent du nord : le Recul laisse un filet là où tu étais. */
  leapNet?: boolean;
  /** Curée : tuer une cible marquée recharge la Marque du chasseur. */
  markRefund?: boolean;
  /** Kami de la victoire : tes flèches s'infléchissent vers la cible marquée. */
  homing?: boolean;
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
  /** Conseil propre à une classe, à la place de `hint` (le Guerrier bloque, l'Invocateur lie des âmes). */
  hints?: Partial<Record<Kit, string>>;
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
  /** Niveau du donjon choisi à l'entrée ; absent = niveau 1, sans renfort. */
  difficulty?: Difficulty;
}
