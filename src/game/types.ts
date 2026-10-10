import type { Vec2 } from './math';

export type EnemyKind =
  | 'hitodama'
  | 'kodama'
  | 'kappa'
  | 'kappaRenforce'
  | 'kasaObake'
  | 'oublie'
  | 'araignee'
  | 'jorogumo'
  // Palais d'Izanami
  | 'shikome'
  | 'ikazuchi'
  | 'ikusa'
  | 'izanami'
  // Terrain d'entraînement de Tetsu : immobile, sans attaque.
  | 'mannequin';
/** `peach` : une pêche d'Izanagi a repoussé Izanami. */
export type StunReason = 'parry' | 'wall' | 'smash' | 'snag' | 'bond' | 'snare' | 'net' | 'daze' | 'peach';
/** Marques posées sur un ennemi : mort (Lame), chasseur (Rôdeur). */
export type MarkKind = 'death' | 'hunt';
export type Outcome = 'victory' | 'defeat';

/** Posture affichée : le rendu s'en sert pour animer les sprites (écrasement, tremblement, teinte). */
export type Pose = 'idle' | 'move' | 'windup' | 'channel' | 'strike' | 'guard' | 'dash' | 'airborne' | 'stunned';

/** Animations des planches complètes des héros, en plus des postures : compétence, ultime, recul après un coup. */
export type ArtPose = 'skill' | 'ultimate' | 'hurt';

/** Commandes du joueur pour un pas de simulation, déjà converties dans le repère du monde. */
export interface InputFrame {
  /** Direction de déplacement au sol, de longueur 0 à 1. */
  move: Vec2;
  /**
   * Point visé, à hauteur de poitrine : là où volent les flèches et où l'on voit le corps des ennemis.
   * Toutes les directions (coups, tirs, élans) et le choix d'une cible partent de lui.
   */
  aim: Vec2;
  /** Point du sol sous la souris : pour les compétences qui visent une zone au sol (Bond). */
  aimGround: Vec2;
  attackPressed: boolean;
  attackHeld: boolean;
  /** Clic droit : blocage du Guerrier et du Paladin, Sceau du Sorcier, Frappe fantôme, tir chargé. */
  signatureHeld: boolean;
  signaturePressed: boolean;
  dodgePressed: boolean;
  /** A, E, R : les trois compétences de la classe (Frappe fracassante, Bond, Frénésie pour le Guerrier…). */
  skillAPressed: boolean;
  skillEPressed: boolean;
  skillRPressed: boolean;
  /** F : la compétence de la voie (sous-classe), quand le héros en a choisi une au niveau 25. */
  skillFPressed: boolean;
}

/** Ce qui s'est passé pendant un pas : le rendu et l'interface en tirent les effets et les textes. */
export type GameEvent =
  | { type: 'wave'; index: number; total: number; label: string; hint?: string; step?: string; palier?: number }
  | { type: 'swing'; pos: Vec2; dir: Vec2; range: number; arcDeg: number; shape?: 'arc' | 'line'; width?: number }
  | { type: 'enemyHit'; id: number; pos: Vec2; amount: number; shielded: boolean; crit: boolean }
  /** `blocked` : ce qui a traversé la garde du Guerrier. */
  | { type: 'playerHit'; pos: Vec2; amount: number; blocked: boolean; hero: number }
  /** Coop : un héros tombe à terre ; un allié qui reste à côté le relève. */
  | { type: 'heroDown'; hero: number; pos: Vec2 }
  | { type: 'heroRevived'; hero: number; pos: Vec2 }
  | { type: 'guard'; pos: Vec2 }
  /** La garde du Paladin se brise : sa jauge est vide. */
  | { type: 'guardBreak'; pos: Vec2 }
  /** Garde levée juste avant le coup. */
  | { type: 'perfectGuard'; pos: Vec2; hero: number }
  /** Sōhei : la garde brisée libère une onde de lumière. */
  | { type: 'guardNova'; pos: Vec2; radius: number }
  | { type: 'parry'; id: number; pos: Vec2 }
  | { type: 'stun'; id: number; pos: Vec2; reason: StunReason }
  | { type: 'slow'; id: number; pos: Vec2 }
  | { type: 'stance'; pos: Vec2; hero: number; stance: 'garde' | 'offensive' }
  | { type: 'aegis'; hero: number; pos: Vec2; on: boolean }
  | { type: 'bleed'; pos: Vec2 }
  | { type: 'counter'; pos: Vec2 }
  | { type: 'dome'; id: number; pos: Vec2; radius: number; life: number }
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
  // Palais d'Izanami : pêche lancée d'un pêcher vers Izanami, cri de colère quand on la regarde trop
  | { type: 'peach'; from: Vec2; to: Vec2 }
  | { type: 'wrath'; pos: Vec2; radius: number }
  | { type: 'bondLand'; pos: Vec2; radius: number }
  | { type: 'frenzy'; pos: Vec2 }
  | { type: 'lightning'; pos: Vec2 }
  | { type: 'bearSkin'; pos: Vec2 }
  | { type: 'snareSet'; id: number; pos: Vec2; radius: number }
  | { type: 'snareEnd'; id: number }
  // Races
  | { type: 'clayShell'; pos: Vec2 }
  | { type: 'divineAegis'; pos: Vec2 }
  | { type: 'transform'; pos: Vec2 }
  // Sorcier : sceaux et météores annoncés puis abattus, sol en feu, Bouclier de flammes
  | { type: 'blast'; id: number; kind: 'seal' | 'meteor'; pos: Vec2; radius: number; delay: number }
  | { type: 'blastEnd'; id: number; kind: 'seal' | 'meteor'; pos: Vec2; radius: number }
  | { type: 'ember'; id: number; pos: Vec2; radius: number; life: number }
  | { type: 'emberEnd'; id: number }
  | { type: 'ward'; pos: Vec2; radius: number }
  | { type: 'wardEnd'; pos: Vec2 }
  | { type: 'flight'; from: Vec2; to: Vec2 }
  | { type: 'noMana'; pos: Vec2 }
  // Lame : marques, traînées de la Frappe fantôme et de la Danse des lames, fumée
  | { type: 'mark'; id: number; pos: Vec2; mark: MarkKind }
  | { type: 'streak'; from: Vec2; to: Vec2 }
  | { type: 'smoke'; pos: Vec2; radius: number }
  // Paladin
  | { type: 'aura'; pos: Vec2; radius: number }
  // Rôdeur : filet qui s'ouvre, tir chargé plein
  | { type: 'netBurst'; pos: Vec2; radius: number }
  | { type: 'loose'; pos: Vec2; full: boolean }
  // Objets (0.11.0) : coup évité, sauvetage, onde de choc, zone sacrée, leurre
  | { type: 'evade'; pos: Vec2 }
  | { type: 'saved'; pos: Vec2; label: string }
  | { type: 'shockwave'; pos: Vec2; radius: number }
  | { type: 'sanctuary'; id: number; pos: Vec2; radius: number; life: number }
  | { type: 'cloud'; id: number; pos: Vec2; radius: number; life: number }
  | { type: 'lure'; pos: Vec2 }
  | { type: 'end'; outcome: Outcome };
