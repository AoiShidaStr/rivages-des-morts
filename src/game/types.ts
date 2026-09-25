import type { Vec2 } from './math';

export type EnemyKind =
  | 'hitodama'
  | 'kodama'
  | 'kappa'
  | 'kappaRenforce'
  | 'kasaObake'
  | 'oublie'
  | 'araignee'
  | 'jorogumo';
export type StunReason = 'parry' | 'wall' | 'smash' | 'snag' | 'bond' | 'snare';
export type Outcome = 'victory' | 'defeat';

/** Posture affichée : le rendu s'en sert pour animer les sprites (écrasement, tremblement, teinte). */
export type Pose = 'idle' | 'move' | 'windup' | 'channel' | 'strike' | 'guard' | 'dash' | 'airborne' | 'stunned';

/** Commandes du joueur pour un pas de simulation, déjà converties dans le repère du monde. */
export interface InputFrame {
  /** Direction de déplacement au sol, de longueur 0 à 1. */
  move: Vec2;
  /** Point du sol sous la souris. */
  aim: Vec2;
  attackPressed: boolean;
  attackHeld: boolean;
  /** Clic droit : blocage du Guerrier, Lier de l'Invocateur. */
  signatureHeld: boolean;
  signaturePressed: boolean;
  dodgePressed: boolean;
  /** A : Frappe fracassante ou Rappel, selon la classe. */
  skillAPressed: boolean;
  /** E : Bond ou Sacrifice. */
  skillEPressed: boolean;
  /** R : Frénésie ou Chœur spectral. */
  skillRPressed: boolean;
}

/** Ce qui s'est passé pendant un pas : le rendu et l'interface en tirent les effets et les textes. */
export type GameEvent =
  | { type: 'wave'; index: number; total: number; label: string; hint?: string }
  | { type: 'swing'; pos: Vec2; dir: Vec2; range: number; arcDeg: number }
  | { type: 'enemyHit'; id: number; pos: Vec2; amount: number; shielded: boolean }
  | { type: 'playerHit'; pos: Vec2; amount: number }
  | { type: 'guard'; pos: Vec2; rage: number }
  | { type: 'parry'; id: number; pos: Vec2 }
  | { type: 'stun'; id: number; pos: Vec2; reason: StunReason }
  | { type: 'telegraph'; id: number; from: Vec2; dir: Vec2; length: number; width: number; duration: number }
  | { type: 'chargeEnd'; id: number }
  | { type: 'channel'; id: number; pos: Vec2; radius: number; duration: number }
  | { type: 'channelEnd'; id: number; pos: Vec2; radius: number; healed: boolean }
  | { type: 'heal'; id: number; pos: Vec2; amount: number }
  | { type: 'enemySwing'; pos: Vec2; dir: Vec2; range: number }
  | { type: 'jump'; id: number; target: Vec2; radius: number; duration: number }
  | { type: 'land'; id: number; pos: Vec2; radius: number }
  | { type: 'dodge'; pos: Vec2; dir: Vec2 }
  | { type: 'smash'; pos: Vec2; radius: number }
  | { type: 'death'; id: number; pos: Vec2; kind: EnemyKind }
  | { type: 'bossPhase'; phase: number; label: string; hint?: string }
  | { type: 'webBurn'; id: number; pos: Vec2; radius: number }
  | { type: 'bite'; pos: Vec2 }
  | { type: 'bondLand'; pos: Vec2; radius: number }
  | { type: 'frenzy'; pos: Vec2 }
  | { type: 'lightning'; pos: Vec2 }
  | { type: 'bearSkin'; pos: Vec2 }
  | { type: 'snareSet'; id: number; pos: Vec2; radius: number }
  | { type: 'snareEnd'; id: number }
  // Races
  | { type: 'clayShell'; pos: Vec2 }
  | { type: 'divineBlood'; pos: Vec2 }
  | { type: 'transform'; pos: Vec2 }
  // Invocateur : âmes au sol, âmes liées et leurs compétences
  | { type: 'soulSet'; id: number; pos: Vec2 }
  | { type: 'soulEnd'; id: number }
  | { type: 'bind'; id: number; pos: Vec2; kind: EnemyKind }
  | { type: 'bindFail'; pos: Vec2 }
  | { type: 'summonHit'; id: number; pos: Vec2; amount: number }
  /** `broken` : l'âme a été détruite par les yokai, plutôt que de s'effacer avec le temps. */
  | { type: 'summonFade'; id: number; pos: Vec2; broken: boolean }
  | { type: 'recall'; pos: Vec2 }
  | { type: 'sacrifice'; pos: Vec2; radius: number }
  | { type: 'choir'; pos: Vec2; radius: number }
  | { type: 'end'; outcome: Outcome };
