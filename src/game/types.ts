import type { Vec2 } from './math';

export type EnemyKind = 'hitodama' | 'kodama' | 'kappa' | 'kappaRenforce' | 'kasaObake' | 'oublie';
export type StunReason = 'parry' | 'wall' | 'smash';
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
  blockHeld: boolean;
  dodgePressed: boolean;
  smashPressed: boolean;
}

/** Ce qui s'est passé pendant un pas : le rendu et l'interface en tirent les effets et les textes. */
export type GameEvent =
  | { type: 'wave'; index: number; total: number; label: string; hint?: string }
  | { type: 'swing'; pos: Vec2; dir: Vec2; range: number }
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
  | { type: 'end'; outcome: Outcome };
