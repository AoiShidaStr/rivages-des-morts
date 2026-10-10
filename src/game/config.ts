import type { Difficulty } from './difficulty';
import type { EnemyKind } from './types';

// Forme des fichiers de src/data : les valeurs s'équilibrent là-bas, sans toucher au code du combat.

/** Jeu de compétences de la classe : clic droit et A / E / R n'ont pas le même rôle. */
export type Kit = 'guerrier' | 'sorcier' | 'lame' | 'paladin' | 'rodeur';

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
  attack: {
    damage: number;
    range: number;
    /**
     * Forme du coup, propre à chaque arme : `arc` frappe dans un arc de `arcDeg` degrés vers la souris
     * (360 : tout autour du héros) ; `line` est un estoc, un couloir droit de `width` de large.
     */
    shape?: 'arc' | 'line';
    arcDeg: number;
    width?: number;
    windup: number;
    active: number;
    recovery: number;
    /**
     * Engagement, en secondes depuis le début du coup : pendant ce temps, le héros ne peut ni bouger
     * ni esquiver. Ensuite, se déplacer (sans redemander un coup) ou esquiver interrompt la fin du coup.
     * 0 : on peut feinter pendant l'élan ; la durée entière du coup : il va jusqu'au bout.
     */
    commit: number;
    knockback: number;
  };
  /** `reduction` : part d'un coup bloqué qui est arrêtée (1 : tout ; le reste passe quand même). */
  block: { arcDeg: number; reduction: number };
  dodge: { distance: number; duration: number; invulnerable: number; cooldown: number };
  smash: {
    cooldown: number;
    damage: number;
    /** Distance entre le joueur et le centre de l'impact. */
    offset: number;
    radius: number;
    windup: number;
    recovery: number;
    knockback: number;
    stun: number;
    /** Part des PV max rendue quand la Frappe touche au moins un ennemi. */
    heal: number;
  };
  /** E : saut sur une zone, qui frappe à l'atterrissage. */
  bond: {
    range: number;
    duration: number;
    height: number;
    damage: number;
    radius: number;
    knockback: number;
    cooldown: number;
    /** Secondes de ralentissement à l'atterrissage (0 sans le talent d'Héraclès). */
    slow: number;
    /** Part des PV max rendue quand le Bond touche au moins un ennemi. */
    heal: number;
  };
  /**
   * Guerrier : postures. Clic droit tenu : Garde, coups plus lents (`attackTimeFactor` > 1), dégâts subis réduits, et le
   * héros bloque. Relâché : Offensive, coups plus rapides, `reach` m d'allonge, `lifesteal` de vol de vie en plus et un
   * peu moins de dégâts subis. Un blocage parfait ouvre une riposte (`counter`) et rapproche la Frappe fracassante de
   * `parrySmash` s. Les effets « au changement de posture » (objets, talents, tag) ne se déclenchent qu'une fois
   * toutes les `effectCooldown` s.
   */
  stance: {
    guard: { attackTimeFactor: number; damageTakenFactor: number };
    offense: { attackTimeFactor: number; reach: number; lifesteal: number; damageTakenFactor: number };
    counter: { window: number; bonus: number; stun: number; heal: number };
    effectCooldown: number;
    parrySmash: number;
  };
  /** R : on frappe plus vite, mais on encaisse plus. */
  frenzy: {
    duration: number;
    cooldown: number;
    /** Multiplicateur des temps d'attaque (moins de 1 = plus rapide). */
    attackTimeFactor: number;
    damageTakenFactor: number;
  };
  blade: BladeConfig;
  paladin: PaladinConfig;
  ranger: RangerConfig;
  sorcier: SorcierConfig;
  /** Effets venus des talents, de la race, des reliques et des paliers de tags. */
  perks?: Perks;
  /**
   * La compétence de la voie (sous-classe), lancée avec F : posée par `buildLoadout` quand le héros a choisi sa voie
   * au niveau 25. Absente, la touche F ne fait rien.
   */
  sousClasse?: SubclassActiveConfig;
}

/**
 * La compétence d'une voie (sous-classe), telle que le moteur la joue. Les valeurs viennent de
 * src/data/sous-classes.json ; `buildLoadout` reporte ses dégâts à l'échelle des coups du héros.
 */
export interface SubclassActiveConfig {
  name: string;
  description: string;
  /** Recharge, en secondes. */
  cooldown: number;
  /** Ce que le moteur en fait : une onde autour du héros, un sceau au sol, un sanctuaire, un filet, une salve, un cri. */
  kind: 'onde' | 'sceau' | 'sanctuaire' | 'filet' | 'salve' | 'cri';
  /** Rayon de l'effet (m). */
  radius: number;
  /** Portée de visée au sol (m) : sceau, sanctuaire et filet. */
  range?: number;
  /** Dégâts, déjà mis à l'échelle des coups du héros. */
  damage?: number;
  knockback?: number;
  stun?: number;
  /** Délai avant l'explosion d'un sceau (s). */
  delay?: number;
  /** Sanctuaire : soins par seconde, en part des PV max. */
  heal?: number;
  /** Sceau : charges de poison posées sur les yokai qu'il prend (Nuée virulente de la Lame : 2). */
  poison?: number;
  /** Brûlure, en dégâts par seconde. */
  burn?: number;
  duration?: number;
  /** Salve : nombre de traits. */
  count?: number;
  /** Cri : dégâts et vitesse de marche en plus, en part ; armure, en part des dégâts retirés. */
  damageBonus?: number;
  speedBonus?: number;
  armor?: number;
}

/**
 * Sorcier (onmyōji du feu) : il vit de son mana. Le clic gauche lance une salve de boules de feu guidées, gratuite ;
 * ses sorts (clic droit, A, E, R) coûtent du mana (`cost`) et ont leur recharge.
 */
export interface SorcierConfig {
  /** Réserve de mana et ce qu'elle regagne par seconde. */
  mana: { max: number; regen: number };
  /**
   * Clic gauche : `count` boules de feu (dégâts : `attack.damage` chacune, portée : `attack.range`), ouvertes en
   * éventail de `spreadDeg` puis guidées vers l'ennemi le plus proche du curseur au moment du clic (`turnRate` rad/s).
   * Si leur cible tombe, elles cherchent un autre yokai à moins de `seek` m.
   */
  /** `pierce` : les boules de feu traversent les yokai (Bâton de Susanoo). */
  fireball: { count: number; spreadDeg: number; speed: number; turnRate: number; radius: number; seek: number; pierce?: boolean };
  /** Clic droit : un sceau tracé au sol, sous le curseur (à `range` m au plus), qui explose au bout de `delay` s. */
  seal: { cost: number; cooldown: number; delay: number; radius: number; damage: number; range: number };
  /**
   * A : Bouclier de flammes. En s'allumant, il repousse (`knockback`) les yokai à moins de `radius` m ; puis il absorbe
   * `shield` des PV max pendant `duration` s, et brûle ceux qui l'approchent.
   */
  ward: { cost: number; cooldown: number; duration: number; shield: number; heal: number; burn: number; radius: number; knockback: number };
  /** E : Fuite de feu. Un bond de `distance` m qui laisse une traînée brûlante (`burn` dégâts par seconde, `trailLife` s). */
  flight: { cost: number; cooldown: number; distance: number; duration: number; trailLife: number; trailRadius: number; burn: number };
  /** R : grand météore, sous le curseur (à `range` m au plus), qui s'écrase au bout de `delay` s. */
  meteor: { cooldown: number; delay: number; radius: number; damage: number; range: number; knockback: number };
}

/** Lame : frappe vite, empoisonne ses proies et les achève en critiques. */
export interface BladeConfig {
  /** Multiplicateur des coups critiques. */
  critFactor: number;
  /**
   * Combo : chaque coup d'arme enchaîné moins de `window` s après le précédent ajoute `bonus` de dégâts, jusqu'à `max`
   * charges. Un coup reçu le remet à zéro ; une esquive non.
   */
  combo: { max: number; bonus: number; window: number };
  /** Chaque coup critique rapproche l'esquive de ces secondes. */
  critDodge: number;
  /** Chaque coup critique rend `share` des PV max, au plus une fois toutes les `cooldown` s. */
  critHeal: { share: number; cooldown: number };
  /** Nuage de poison (esquive, Écran de fumée) : chaque seconde, une charge de poison aux yokai qui s'y trouvent. */
  cloud: { radius: number; life: number };
  /**
   * Clic droit : Frappe fantôme. La Lame apparaît sur l'ennemi le plus proche de la souris (à `range` m), frappe de
   * `damage` × les dégâts de son arme, critique ×(1 + charges de poison consommées), et revient en `cooldown` s
   * (aussitôt si elle tue). Une proie achevée : elle enchaîne sur la suivante à portée, `chain` fois au plus.
   */
  ghost: { range: number; cooldown: number; damage: number; invulnerable: number; chain: number };
  /**
   * Poison : chaque coup de la Lame qui touche ajoute une charge (`maxStacks` au plus) et relance les `duration` s.
   * Chaque seconde, chaque charge inflige `damage` × les dégâts de son arme.
   */
  poison: { duration: number; maxStacks: number; damage: number };
  /** A : tous les coups sur la cible sont critiques un moment. */
  deathMark: { cooldown: number; duration: number; range: number };
  /** E : nuage de fumée ; le héros disparaît, les yokai attaquent le nuage. */
  /**
   * `maxHidden` : invisibilité totale d'un nuage, prolongations de Métamorphe comprises. `armor` : part des dégâts
   * retirée tant que la Lame est invisible. Le nuage empoisonne les yokai qui s'y trouvent.
   */
  smoke: { cooldown: number; duration: number; radius: number; maxHidden: number; armor: number };
  /** R : la Lame bondit d'ennemi en ennemi et frappe chacun. */
  dance: { cooldown: number; targets: number; range: number; damage: number; hop: number };
}

/** Paladin : bouclier levé, aura de soin, marteau lancé, et l'Égide. */
export interface PaladinConfig {
  /** A : zone qui rend à chacun, Paladin compris, `healShare` de ses PV max sur ses `duration` s. */
  aura: { cooldown: number; duration: number; radius: number; healShare: number };
  /**
   * R : Égide, posée sur l'allié le plus proche de la souris (à `range` m), sinon sur soi ; elle reste jusqu'au
   * prochain R. Elle retire `armor` des dégâts reçus ; sur soi, le Paladin frappe `selfDamageMalus` moins fort.
   */
  /** `cooldown` : délai avant de poser ou de déplacer l'Égide à nouveau (la retirer reste libre). */
  aegis: { range: number; armor: number; selfDamageMalus: number; cooldown: number };
  /** Part de ses propres soins au blocage (tag Paladin) que reçoit le Paladin, seul, à deux, à trois. */
  selfHeal: number[];
  /**
   * Jugement : chaque coup bloqué (`perBlock`, doublé en blocage parfait) et chaque coup d'arme porté (`perHit`)
   * remplissent la ferveur ; pleine (`max`), le coup d'arme suivant libère une onde sacrée de `radius` m qui fait
   * `damage` dégâts, ignore les carapaces et rend `heal` des PV max au Paladin.
   */
  judgement: { max: number; perBlock: number; perHit: number; radius: number; damage: number; heal: number };
  /**
   * Jauge de garde : chaque coup bloqué l'use de `cost` points par % des PV max du héros qu'il aurait retirés
   * (au moins `minCost`). Vide, la garde se brise pendant `breakTime` s. Elle remonte de `regen` par seconde
   * après `delay` s sans rien bloquer.
   */
  guard: { max: number; cost: number; minCost: number; regen: number; delay: number; breakTime: number };
  /** E : le marteau part vers la souris et revient, en frappant à l'aller et au retour. */
  hammer: { cooldown: number; damage: number; range: number; speed: number; radius: number; knockback: number };
}

/** Rôdeur : flèches, tir chargé, filet, marque du chasseur, bond en arrière. */
export interface RangerConfig {
  /** La portée des flèches est celle de l'arme (`attack.range`). */
  arrow: { speed: number; radius: number };
  /**
   * Clic droit maintenu : la flèche se charge, de `minFactor` à `maxFactor` fois les dégâts, selon la charge.
   * Une flèche lâchée aussitôt ne fait presque rien : on ne peut pas mitrailler au clic droit en marchant.
   * Plus l'arc est bandé, plus on marche lentement (de `moveFactor` à `fullMoveFactor`) ; après le tir, la vitesse
   * revient en `recover` secondes. L'esquive interrompt le tir.
   */
  charged: {
    time: number;
    minFactor: number;
    maxFactor: number;
    moveFactor: number;
    fullMoveFactor: number;
    recover: number;
    rangeFactor: number;
    speedFactor: number;
  };
  /** A : flèche qui immobilise les ennemis autour de l'impact. */
  net: { cooldown: number; stun: number; radius: number; range: number };
  /** E : la cible prend plus de dégâts, de toutes les sources ; l'abattre rend `killHeal` des PV max. */
  huntMark: { cooldown: number; duration: number; bonus: number; range: number; killHeal: number };
  /** R : bond en arrière en tirant une volée vers la souris. */
  leap: { cooldown: number; distance: number; duration: number; height: number; arrows: number; spreadDeg: number };
}

/** Effets spéciaux du Guerrier ; absents = inactifs. */
export interface Perks {
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
  /** PV rendus par ennemi tué (Cor de Gjallarhorn). */
  valhallaHeal?: number;
  /** Coupelle du kappa : dégâts en plus tant qu'on n'est pas touché. */
  coupelle?: { bonus: number; emptyTime: number };
  /** Fil de Jōren : chaque esquive laisse un fil qui immobilise le premier ennemi. */
  joren?: { stun: number; life: number; radius: number };

  // --- Races ---
  /** Einherjar (Festin du Valhalla) : part des PV max rendue par ennemi tué. */
  valhallaShare?: number;
  /** Einherjar lame : sous `threshold` des PV, l'esquive et la Frappe fantôme reviennent `factor` fois plus vite. */
  lowHpHaste?: { threshold: number; factor: number };
  /** Einherjar paladin : sous `threshold` des PV, la garde remonte `factor` fois plus vite. */
  lowHpGuard?: { threshold: number; factor: number };
  /** Einherjar rôdeur : sous cette part des PV, toutes les flèches transpercent. */
  lowHpPierce?: number;
  /** Oushebti : une carapace d'argile absorbe un coup, puis se reforme après ce nombre de secondes. */
  clayShell?: number;
  /** Oushebti lame : la carapace qui absorbe un coup rend aussitôt la Frappe fantôme. */
  clayDash?: boolean;
  /**
   * Oushebti guerrier : la carapace qui absorbe un coup prépare une riposte. Le coup de mêlée suivant frappe aussi
   * autour de sa cible (`radius` m, `damage` fois les dégâts de l'arme), et fait saigner tous ceux qu'il touche
   * (`bleed` fois les dégâts de l'arme, sur `duration` s).
   */
  clayCleave?: { radius: number; damage: number; bleed: number; duration: number };
  /** Einherjar guerrier : sous `threshold` des PV, le vol de vie gagne `bonus` (part des dégâts infligés). */
  lowHpLifesteal?: { threshold: number; bonus: number };
  /** Hanyō guerrier : transformé et en posture Offensive, cette part de dégâts en plus. */
  yokaiOffense?: number;
  /** Oushebti paladin : la carapace qui absorbe un coup remplit la garde. */
  clayGuard?: boolean;
  /** Oushebti rôdeur : la carapace qui absorbe un coup laisse une statuette que les yokai attaquent, ces secondes. */
  clayDecoy?: number;
  /** Demi-dieu : une fois par vague, passé sous `threshold` des PV, invulnérable `invulnerable` s et soigné de `heal` des PV max. */
  divineAegis?: { threshold: number; invulnerable: number; heal: number };
  /** Demi-dieu, fils de Zeus : un coup d'arme sur `every` appelle la foudre. */
  zeusBolt?: { every: number; damage: number };
  /** Demi-dieu, fils d'Arès : dégâts en plus, pour toutes les attaques. */
  divineMight?: number;
  /**
   * Hanyō : les dégâts infligés, de toutes les sources (arme, flèches, sorts, compétences), remplissent une jauge ;
   * à `fill` fois ses PV max, elle transforme le héros un moment.
   */
  yokaiBlood?: { fill: number; duration: number; damage: number; speed: number; taken: number };
  /** Hanyō lame : transformé, la Frappe fantôme et l'esquive reviennent ce nombre de fois plus vite. */
  yokaiDash?: number;
  /** Hanyō paladin : transformé, l'Aura brûle les yokai (dégâts par seconde). */
  yokaiAuraBurn?: number;
  /** Hanyō rôdeur : transformé, l'arc se bande ce nombre de fois plus vite. */
  yokaiDraw?: number;
  /** Hanyō : sous `threshold` des PV, vitesse en plus et régénération. */
  yokaiInstinct?: { threshold: number; speed: number; regen: number };

  // --- Sorcier ---
  /** Part du coût en mana des sorts (paliers du tag Sorcier, Magatama de Yasakani). */
  manaCost?: number;
  /** Éventail de la Jorōgumo : les boules de feu ralentissent leur cible (`amount` de sa vitesse, `duration` s). */
  fireballSlow?: { amount: number; duration: number };
  /** Pinceau de Seimei : le sceau lie les yokai qu'il frappe, ralentis de `amount` pendant `duration` s. */
  sealSlow?: { amount: number; duration: number };
  /** Sol brûlant : le sceau qui explose laisse le sol en feu (`burn` dégâts par seconde pendant `life` s). */
  sealBurn?: { burn: number; life: number };
  /** Seiman : le sceau explose une seconde fois, `delay` s après la première, à `damage` de sa force. */
  sealEcho?: { delay: number; damage: number };
  /** Étincelle : mana rendu par yokai touché par un sceau. */
  sealMana?: number;
  /** Flamme rendue : mana rendu quand le Bouclier de flammes se dissipe ou se brise. */
  wardMana?: number;
  /** La Fuite de feu rend cette part des PV max. */
  flightHeal?: number;
  /** Masque d'Oublié : après une Fuite de feu, les yokai oublient le Sorcier ces secondes et s'en prennent à sa flamme. */
  flightDecoy?: number;
  /** Feu inextinguible : sous cette part de ses PV, les sorts ne coûtent plus de mana. */
  freeSpells?: number;
  /** Naissance du feu : chaque yokai abattu par le Sorcier libère ce nombre de boules de feu vers ses voisins. */
  killBurst?: number;
  /** Einherjar sorcier : le mana remonte plus vite selon les PV perdus (valeur à 0 PV). */
  manaRage?: number;
  /** Oushebti sorcier : mana rendu quand la carapace d'argile absorbe un coup. */
  clayMana?: number;
  /** Hanyō sorcier : transformé, les sorts reviennent ce nombre de fois plus vite. */
  yokaiSpells?: number;

  // --- Lame ---
  /** Après une esquive, les `swings` premiers coups dans les `window` s sont critiques (tag Lame). */
  dodgeCrit?: { window: number; swings: number };
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
  /** Festin toxique (Lame) : abattre un ennemi qui porte ton poison rend ces PV. */
  poisonKillHeal?: number;
  /** Crocs de la Jorōgumo : chaque coup critique rend ces PV. */
  critHeal?: number;

  // --- Paladin ---
  /** Un coup bloqué soigne le héros et ses alliés autour de lui (tag Paladin). */
  shieldHeal?: { amount: number; radius: number };
  /** Riposte : un coup bloqué renvoie ces dégâts à l'attaquant. */
  riposte?: number;
  /** Main de Týr : part des dégâts absorbés (Armure, Égide, garde) renvoyée à l'attaquant. */
  tyrHand?: number;
  /** Vol de vie (armes du Guerrier) : part des dégâts infligés rendue en PV. */
  lifesteal?: number;
  /** Cœur de l'Arène : `perEnemy` de vol de vie par ennemi à moins de `radius` m, jusqu'à `max`. */
  arenaHeart?: { perEnemy: number; max: number; radius: number };
  /**
   * Naginata du Maître d'Armes : en passant en Offensive, le coup de mêlée suivant fait saigner (`damage` fois les dégâts
   * de l'arme, répartis sur `duration` s).
   */
  stanceBleed?: { damage: number; duration: number };
  /** Naginata (palier 50) : en Offensive, les coups critiques gagnent ce multiplicateur. */
  offenseCrit?: number;
  /**
   * Mempō de Contre-Attaque : après un blocage parfait, le premier coup porté dans les `window` s est une riposte :
   * `bonus` de dégâts en plus (un critique), et la cible est étourdie `stun` s.
   */
  counter?: { window: number; bonus: number; stun: number };
  /** Tag Guerrier : changer de posture donne `bonus` de vitesse de frappe pendant `duration` s. */
  stanceRush?: { bonus: number; duration: number };
  /** Tag Guerrier : le Bond étourdit à l'atterrissage, ces secondes. */
  bondStun?: number;
  /** Vent de tempête (Susanoo) : changer de posture lance un éclair autour du Guerrier. */
  stanceBolt?: { damage: number; radius: number };
  /** Colère de la tempête (Susanoo) : en Offensive, un coup d'arme sur `every` appelle la foudre sur sa cible. */
  offenseBolt?: { every: number; damage: number };
  /** Peau du lion de Némée (Héraclès) : en Garde, cette part de dégâts subis en moins, en plus de la posture. */
  guardSkin?: number;
  /** Peau d'ours (Berserkir) : la survie à 1 PV déclenche aussi ces secondes de Frénésie. */
  bearFrenzy?: number;
  /** Iaijutsu (Katana de rōnin) : le premier coup après être passé en Offensive est critique, de ce multiplicateur. */
  stanceCrit?: number;
  /** Masque de hannya : sous `threshold` des PV, `bonus` de dégâts en plus en posture Offensive. */
  hannyaOffense?: { threshold: number; bonus: number };
  /** Croissant (Tsukuyomi) : la Frappe fantôme empoisonne aussi les ennemis à moins de `radius` m de sa cible. */
  ghostSpread?: { radius: number };
  /** Marée d'ombre (Tsukuyomi) : abattre un ennemi empoisonné rapproche la Frappe fantôme de ces secondes. */
  poisonKillCut?: number;
  /** Haidate de shikome : après une Frappe fantôme, un bouclier de `amount` des PV max pendant `duration` s. */
  ghostShield?: { amount: number; duration: number };
  /** Bandelettes : l'Égide retire les dégâts restants divisés par ce facteur (1,6 : 60 % d'absorption en plus). */
  aegisAbsorb?: number;
  /** Souffle de vie : poser l'Égide rend ces PV au Paladin. */
  aegisHeal?: number;
  /** Roi des morts : l'Égide peut protéger ce nombre de héros à la fois. */
  aegisTargets?: number;
  /** Tag Paladin : l'Aura donne cette Armure (part des dégâts retirée) aux héros qui s'y tiennent. */
  auraArmor?: number;
  /** Tag Paladin : les héros soignés par l'Aura infligent cette part de dégâts en plus. */
  auraDamage?: number;
  /** Gleipnir : un coup bloqué étourdit l'attaquant. */
  gleipnir?: number;
  /** Chaleur : l'Aura brûle les ennemis qui s'y trouvent (dégâts par seconde). */
  auraBurn?: number;
  /** Ama-no-Iwato : un ennemi qui entre dans l'Aura est étourdi (une fois par Aura). */
  auraStun?: number;
  /** Miroir de Yata : les yokai baignés par l'Aura font cette part de dégâts en moins. */
  auraWeaken?: number;
  /** Marteau du juge : le Marteau lancé étourdit. */
  hammerStun?: number;

  // --- Rôdeur ---
  /** Tir chargé plein : il traverse les ennemis (tag Rôdeur). */
  chargedPierce?: boolean;
  /** Tir chargé plein : il pose la Marque du chasseur pendant ces secondes (tag Rôdeur). */
  chargedMark?: number;
  /** Tir chargé : dégâts multipliés. */
  chargedDamage?: number;
  /** Lune pleine : un tir chargé plein étourdit. */
  chargedStun?: number;
  /** Arc de soie : un tir chargé plein ouvre un filet sur le premier ennemi touché. */
  /** Arc de soie : le tir chargé plein s'ouvre en soie qui ralentit (`amount` de la vitesse, `duration` s). */
  chargedNet?: { amount: number; duration: number };
  /** Après la Frappe, ralentissement des yokai touchés (objets du Guerrier). */
  smashSlow?: { amount: number; duration: number };
  /** Carquois divin : un tir chargé plein part en plusieurs flèches. */
  splitShot?: number;
  /** Vent du nord : le Recul laisse un filet là où tu étais. */
  leapNet?: boolean;
  /** Curée : tuer une cible marquée recharge la Marque du chasseur. */
  markRefund?: boolean;
  /** Coup de grâce : la cible marquée, sous `threshold` de ses PV, prend des coups critiques (× `factor`). */
  coupDeGrace?: { threshold: number; factor: number };

  // --- Objets du Yomi (0.3.0) ---
  /** Nodachi de l'Ikusa : coups plus rapides selon les PV perdus, jusqu'à `bonus` sous `threshold` des PV. */
  lowHpAttackSpeed?: { threshold: number; bonus: number };
  /** Cloche du Grand Rocher : un coup bloqué renvoie cette part de ses dégâts à l'attaquant. */
  guardReflect?: number;
  /** Hakama de cendres : le Bouclier de flammes brisé par un ennemi rend cette part des PV max. */
  wardBreakHeal?: number;
  /** Geta du danseur de feu : l'esquive laisse une traînée de braises. */
  dodgeEmbers?: { radius: number; burn: number; life: number };
  /** Cristal de pyromancie : abattre un yokai en feu rend `mana` et `hp`. */
  pyroKill?: { mana: number; hp: number };
  /** Bâton de Susanoo : le R lance un dôme de feu (`radius` m, `duration` s) qui arrête ce qui tombe du ciel et brûle (`burn` par seconde). */
  fireDome?: { radius: number; duration: number; burn: number };
  /** Bâton de Susanoo (palier 50) : un sceau qui touche au moins `min` yokai rend `share` des PV max. */
  sealHeal?: { min: number; share: number };
  /** Encensoir du moine : les PV rendus par l'Aura renforcent le prochain Marteau (`perHp` dégât par PV, au plus `max` fois ses dégâts). */
  censer?: { perHp: number; max: number };
  /** Tabi du messager : après un Recul, le prochain tir part chargé à fond. */
  leapCharge?: boolean;
  /** Arc d'Ikazuchi : un tir chargé plein appelle la foudre à l'impact, au plus une fois toutes les `cooldown` s. */
  chargedBolt?: { damage: number; radius: number; stun: number; cooldown: number };
  /** Tsuba ébréchée : chaque coup critique retire ces secondes à la recharge de la Marque de mort. */
  critMarkRefund?: number;
  /** Mino de paille : part des dégâts des projectiles et des zones qui est arrêtée. */
  hazardWard?: number;
  /** Yomotsu-hegui : dégâts et vitesse en plus, mais les soins reçus sont multipliés par `healing`. */
  yomotsu?: { damage: number; speed: number; healing: number };
  /** Gohei du sanctuaire : les effets du parent divin sont renforcés de ce facteur. */
  parentBoost?: number;
  /** Dogū aux yeux clos : la carapace d'argile absorbe ce nombre de coups avant de se reformer. */
  clayCharges?: number;
  /** Dō de lamelles d'os : PV max multipliés. */
  maxHpFactor?: number;
  /** Haidate du temple : quand la garde se brise, une onde repousse et étourdit `stun` s dans un rayon de `radius`. */
  guardBreakNova?: { radius: number; stun: number; knockback: number };
  /** Dō de cuir noir : la cible de la Marque du chasseur fait cette part de dégâts en moins. */
  huntMarkWeaken?: number;

  // --- Styles de jeu par l'équipement (0.8.0) ---
  /** Écaille de Ryūjin : chaque coup bloqué rend cette part des PV max (Guerrier). */
  blockHeal?: number;
  /** Kemuri-dama : l'Écran de fumée rend cette part des PV max. */
  smokeHeal?: number;
  /** Encre de Shinigami : tout coup sur un yokai sous cette part de ses PV est critique. */
  finisher?: number;
  /** Flèches d'Ame-no-Hahaya : toutes les flèches transpercent. */
  arrowPierce?: boolean;

  // --- Refonte spécialisée (0.11.0) ---
  /** Kanabō du Démon-Sang : la Frappe libère une onde qui frappe jusqu'à `radius` m (`damage` fois ses dégâts). */
  smashWave?: { radius: number; damage: number; knockback: number };
  /** Joyau de Susanoo : la Frappe appelle la foudre sur la cible la plus proche de l'impact (dégâts). */
  smashBolt?: number;
  /** Armure du Général Déchu : le blocage parfait repousse les yokai à moins de `radius` m. */
  perfectPush?: { radius: number; knockback: number };
  /** Suneate de l'assaut : après `time` s de marche, le premier coup fait `bonus` de dégâts en plus. */
  marchStrike?: { time: number; bonus: number };
  /** Grèves du Colosse : un coup reçu sans le bloquer donne `bonus` de dégâts pendant `duration` s. */
  hurtFury?: { bonus: number; duration: number };
  /** Dō du fanatique : la garde brisée donne `bonus` de dégâts pendant `duration` s. */
  breakFury?: { bonus: number; duration: number };
  /** Bottes du bastion : part du recul subi. */
  knockbackTaken?: number;
  /** Waraji de pèlerin : chaque atterrissage du Bond rend cette part des PV max. */
  bondHeal?: number;
  /** Talisman de l'Ours : sous `threshold` des PV, `reduction` des dégâts subis en moins. */
  lowHpArmor?: { threshold: number; reduction: number };
  /** Écaille de Ryūjin : un coup bloqué brûle l'attaquant (`damage` par seconde, `duration` s). */
  blockBurn?: { damage: number; duration: number };
  /** Capuche de l'ascète : le Bouclier de flammes rend cette part des PV max en s'allumant. */
  wardHeal?: number;
  /** Robe de feu : dégâts de feu en plus (tous les dégâts du Sorcier). */
  fireDamage?: number;
  /** Cape du Phénix : le Bouclier de flammes brisé explose. */
  wardBreakBlast?: { damage: number; radius: number };
  /** Hakama cramoisi : dégâts en plus sur les yokai en feu. */
  burningBonus?: number;
  /** Pantalon d'esprit : mana rendu par yokai abattu par le feu au sol. */
  emberKillMana?: number;
  /** Geta d'Amaterasu : la Fuite de feu laisse une zone qui soigne (`heal` PV par seconde, `duration` s). */
  flightSanctuary?: { heal: number; duration: number; radius: number };
  /** Pierre de sang yōkai : chaque sort coûte aussi cette part des PV actuels. */
  bloodCost?: number;
  /** Cœur de Cendres : survit à un coup mortel et allume le Bouclier de flammes, une fois toutes les `cooldown` s. */
  cheatDeath?: { cooldown: number };
  /** Bandeau du vent : pendant `duration` s après une esquive, `chance` d'éviter un coup. */
  evasion?: { chance: number; duration: number };
  /** Masque du Kitsune : l'Écran de fumée laisse un clone qui attire les yokai ces secondes. */
  smokeClone?: number;
  /** Gi de l'assassin : vitesse de frappe en plus. */
  attackSpeed?: number;
  /** Manteau d'Ombre : l'Écran de fumée rend la prochaine attaque critique. */
  smokeCrit?: boolean;
  /** Haidate de la vipère : le poison mord ce nombre de fois plus vite. */
  poisonHaste?: number;
  /** Jambières de l'Araignée : la Frappe fantôme immobilise ce qu'elle traverse, ces secondes. */
  ghostRoot?: number;
  /** Bottes de Tengu : esquives qu'on peut garder en réserve. */
  dodgeCharges?: number;
  /** Talisman de l'ombre : chaque ennemi traversé en esquivant rend cette part des PV max. */
  dodgeThroughHeal?: number;
  /** Cœur de l'Assassin : PV rendus par coup sur une cible empoisonnée. */
  poisonHitHeal?: number;
  /** Couronne du Juge : le Marteau rebondit vers un yokai à moins de ces mètres. */
  hammerBounce?: number;
  /** Kesa de sōhei : la garde s'use de cette part face aux boss et aux coups lourds. */
  heavyGuard?: number;
  /** Grèves de l'Inquisiteur : dégâts en plus sur les yokai ralentis (et le Marteau ralentit). */
  slowedBonus?: number;
  /** Geta de l'aube : allumer l'Aura frappe les yokai qu'elle touche (dégâts). */
  auraFlash?: number;
  /** Geta du bastion : bouclier levé, rien ne repousse le héros. */
  steadyGuard?: boolean;
  /** Geta de l'Égide : le Marteau laisse une zone qui soigne là où il fait demi-tour. */
  hammerSanctuary?: { heal: number; duration: number; radius: number };
  /** Écaille du Dragon d'Or : la garde qui se briserait tient, une fois toutes les ces secondes. */
  guardSave?: number;
  /** Capuche de camouflage : les yokai remarquent le héros de cette part moins loin. */
  stealth?: number;
  /** Masque du Traqueur : la proie marquée explose en tombant. */
  huntBlast?: { damage: number; radius: number };
  /** Dō de l'archer d'élite : dégâts en plus sur les cibles à plus de `distance` m. */
  longShot?: { distance: number; bonus: number };
  /** Manteau de Plumes : le Recul laisse un leurre ces secondes. */
  leapDecoy?: number;
  /** Kyahan d'éclaireur : après le Recul, `bonus` de vitesse de tir pendant `duration` s. */
  leapRush?: { bonus: number; duration: number };
  /** Jambières de survie : part du ralentissement des toiles et des fils qui est ignorée. */
  slowResist?: number;
  /** Jambières du Vent : la Flèche-filet s'ouvre aussitôt sous la visée. */
  netInstant?: boolean;
  /** Waraji de l'éclaireur : charges de poison posées par le filet. */
  netPoison?: number;
  /** Croc de loup : `chance` de critique sur les cibles à plus de `distance` m. */
  farCrit?: { distance: number; chance: number };
  /** Charme des bois : immobile `delay` s, le héros regagne `heal` PV par seconde. */
  stillHeal?: { delay: number; heal: number };
  /** Cœur de la Forêt : arc bandé, aucun recul et cette part de dégâts subis en moins. */
  drawGuard?: number;
  /** Carquois de l'Ouragan : un tir simple sur `every` part en éventail de `arrows` flèches. */
  quiverVolley?: { every: number; arrows: number };
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
  /** `lightning` : un éclair tombe à l'impact (Ikazuchi, Izanami), plutôt qu'un fil ou un parapluie. */
  fx?: 'lightning';
}

/** Yomotsu-shikome : furie du Yomi qui se ramasse sur elle-même, puis bondit griffes en avant. */
export interface ShikomeConfig extends EnemyBaseConfig {
  speed: number;
  /** Distance à partir de laquelle elle se ramasse pour bondir. */
  lungeRange: number;
  crouch: number;
  lungeSpeed: number;
  lungeDistance: number;
  lungeDamage: number;
  lungeKnockback: number;
  recover: number;
  cooldown: number;
  /** Étourdissement quand le héros pare son bond. */
  parryStun: number;
}

/** Ikazuchi : dieu du tonnerre né du corps d'Izanami ; il reste à distance et appelle la foudre. */
export interface IkazuchiConfig extends EnemyBaseConfig {
  speed: number;
  keepDistance: number;
  fleeDistance: number;
  boltInterval: number;
  /** Temps pendant lequel il appelle la foudre ; un coup l'interrompt. */
  boltChannel: number;
  bolt: HazardConfig;
  /** Délai entre deux disparitions, quand le héros s'approche trop. */
  blinkCooldown: number;
  /** Distance d'un éclair de fuite, et nombre d'éclairs par ikazuchi. */
  blinkDistance: number;
  blinkCharges: number;
}

/**
 * Izanami, boss du Palais, en trois phases (voilée, révélée, poursuite).
 * Son regard : la regarder (viser vers elle) la renforce, jusqu'à la colère.
 * Sa faiblesse cachée : les pêches d'Izanagi, qu'on fait tomber des pêchers de l'arène.
 */
export interface IzanamiConfig extends EnemyBaseConfig {
  /** Seuils de PV (fraction du maximum) : elle se révèle, puis se lance à la poursuite du héros. */
  revealAt: number;
  pursuitAt: number;
  transformTime: number;
  gaze: {
    /** Angle du cône de visée du héros dans lequel elle se sent regardée. */
    coneDeg: number;
    range: number;
    /** Montée de la jauge par seconde regardée, et descente par seconde sans la regarder. */
    rise: number;
    fall: number;
    /** Part des dégâts qu'elle ignore quand la jauge est pleine. */
    guard: number;
    /** Colère quand la jauge est pleine : un cri en zone. */
    wrath: HazardConfig;
  };
  veiled: {
    speed: number;
    embrace: MeleeConfig;
    summonInterval: number;
    summonChannel: number;
    summonCount: number;
    maxShikome: number;
  };
  revealed: {
    speed: number;
    grasp: MeleeConfig;
    blinkInterval: number;
    boltInterval: number;
    boltCount: number;
    bolt: HazardConfig;
    ikazuchiInterval: number;
    maxIkazuchi: number;
  };
  pursuit: {
    speed: number;
    /** Part des dégâts qu'elle subit pendant la poursuite, hors de la stupeur d'une pêche. */
    damageFactor: number;
    /** La jauge du regard monte plus vite. */
    gazeFactor: number;
    lungeRange: number;
    lungeCooldown: number;
    telegraph: number;
    lungeSpeed: number;
    lungeDistance: number;
    lungeDamage: number;
    lungeKnockback: number;
    recover: number;
    boltInterval: number;
    boltCount: number;
  };
  /** Une pêche d'Izanagi la repousse : stupeur et dégâts reçus en plus. Le pêcher refleurit ensuite. */
  peach: { stun: number; damageFactor: number; regrow: number };
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
    /** Secondes au sol, après une chute, avant de remonter. */
    groundTime: number;
    /** Fils lancés sans succès avant de redescendre d'elle-même. */
    pullsBeforeDrop: number;
    /** Part des PV max qu'elle peut regagner au plafond : par montée, et sur tout le combat. */
    healPerClimb: number;
    healTotal: number;
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
  shikome: ShikomeConfig;
  ikazuchi: IkazuchiConfig;
  ikusa: OublieConfig;
  izanami: IzanamiConfig;
  /** Mannequin d'entraînement : immobile, sans attaque, il encaisse les coups tant qu'on veut. */
  mannequin: EnemyBaseConfig;
}

export interface WaveConfig {
  label: string;
  hint?: string;
  /** Conseil propre à une classe, à la place de `hint` (le Guerrier bloque, le Sorcier pose un sceau). */
  hints?: Partial<Record<Kit, string>>;
  /** `elite` : ce yokai est un champion (plus grand, plus résistant), quel que soit le niveau. */
  spawns: {
    kind: EnemyKind;
    count: number;
    elite?: boolean;
    /** Places fixes, dans l'ordre (terrain d'entraînement) ; sans elles, l'apparition se fait au hasard loin du héros. */
    positions?: { x: number; z: number }[];
    /**
     * Va-et-vient d'un mannequin, en mètres (terrain d'entraînement) : il marche de `patrol / 2` de part et d'autre
     * de sa place, dans l'axe des x. Absent ou nul, le poteau ne bouge pas (cible fixe, pour une mesure au repos).
     */
    patrol?: number;
  }[];
  /** Souches placées dans l'arène pour cette vague (arène de la Jorōgumo). */
  stumps?: { x: number; z: number }[];
  /** Pêchers d'Izanagi placés dans l'arène pour cette vague (arène d'Izanami). */
  peaches?: { x: number; z: number }[];
  /** Donjon infini : l'annonce de la vague (« Palier 7 · Niveau 60 »), son palier et sa propre difficulté. */
  step?: string;
  palier?: number;
  difficulty?: Difficulty;
}

export interface GameConfig {
  arenaHalfSize: number;
  player: PlayerConfig;
  /** Coop : les héros des autres joueurs (ou alliés du bot), après le premier. */
  allies?: PlayerConfig[];
  enemies: EnemyConfigs;
  webs: WebConfig;
  stumpRadius: number;
  /** Rayon d'un pêcher (obstacle, et portée à laquelle un coup en fait tomber la pêche). */
  peachRadius: number;
  /** Champion demandé par une vague (`elite`), hors malédiction « Âmes d'élite ». */
  champion: { hp: number; damage: number };
  waves: WaveConfig[];
  /** Niveau du donjon choisi à l'entrée ; absent = niveau 1, sans renfort. */
  difficulty?: Difficulty;
  /**
   * Terrain d'entraînement : la vague ne se termine jamais — quand le mannequin tombe, un autre reprend sa place,
   * sans annonce et sans butin. Le héros n'y gagne ni quête ni objet.
   */
  training?: boolean;
}
