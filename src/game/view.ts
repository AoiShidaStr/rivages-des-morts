// Ce que l'affichage (rendu et HUD) lit du combat. En solo et chez l'hôte d'une partie en coop, c'est le
// World lui-même ; chez un invité, c'est une copie reconstruite à partir des instantanés de l'hôte (src/net).
import type { PlayerConfig } from './config';
import type { Vec2 } from './math';
import type { EnemyKind, MarkKind, Pose } from './types';

/** Un héros, tel que l'affichage le voit : où il est, ce qu'il fait, ses PV et ses recharges. */
export interface HeroView {
  readonly id: number;
  readonly cfg: PlayerConfig;
  readonly pos: Vec2;
  readonly facing: Vec2;
  readonly radius: number;
  readonly pose: Pose;
  readonly altitude: number;
  readonly hp: number;
  readonly dead: boolean;
  /** Coop : secondes de relève passées par un allié à côté du héros à terre. */
  readonly revive: number;
  readonly invulnerable: number;
  readonly frenzy: number;
  readonly transformed: number;
  readonly hidden: number;
  readonly aura: number;
  readonly choir: number;
  readonly smoke: { readonly pos: Vec2; readonly cloud: number } | null;
  readonly drawProgress: number;
  readonly rage: number;
  readonly canSmash: boolean;
  readonly dodgeCooldown: number;
  readonly bondCooldown: number;
  readonly frenzyCooldown: number;
  readonly recallCooldown: number;
  readonly sacrificeCooldown: number;
  readonly choirCooldown: number;
  readonly dashCharges: number;
  readonly dashRecharge: number;
  readonly deathMarkCooldown: number;
  readonly smokeCooldown: number;
  readonly danceCooldown: number;
  readonly auraCooldown: number;
  readonly hammerCooldown: number;
  /** Paladin : jauge de garde, et secondes de garde brisée. */
  readonly guardLeft: number;
  readonly guardBroken: number;
  /** Bouclier temporaire (panoplie de la Lame), en PV. */
  readonly barrier: number;
  readonly raiseCooldown: number;
  readonly netCooldown: number;
  readonly huntCooldown: number;
  readonly leapCooldown: number;
}

export interface EnemyView {
  readonly id: number;
  readonly kind: EnemyKind;
  readonly sprite: string;
  readonly pos: Vec2;
  readonly facing: Vec2;
  readonly radius: number;
  readonly pose: Pose;
  readonly altitude: number;
  readonly spawnProgress: number;
  readonly elite: boolean;
  readonly mark: MarkKind | null;
  readonly dead: boolean;
  readonly boss: boolean;
  readonly hp: number;
  readonly maxHp: number;
  /** Izanami : son regard (de 0 à 1), le héros qui la regarde, la pêche qui l'a repoussée. */
  readonly gaze?: number;
  readonly watched?: boolean;
  readonly repelled?: boolean;
  /** Jorōgumo : le fil tendu vers le héros. */
  readonly thread?: { readonly to: Vec2; readonly taut: boolean } | null;
  /** Coop : le héros que ce boss poursuit. */
  readonly prey?: number;
}

export interface SummonView {
  readonly id: number;
  readonly kind: EnemyKind;
  readonly owner: number;
  readonly pos: Vec2;
  readonly facing: Vec2;
  readonly radius: number;
  readonly pose: Pose;
  readonly spawnProgress: number;
  readonly vigor: number;
  readonly holy: boolean;
  /** Le compagnon permanent de l'Invocateur. */
  readonly companion: boolean;
}

export interface ProjectileView {
  readonly id: number;
  readonly kind: 'arrow' | 'net' | 'hammer';
  readonly pos: Vec2;
  readonly dir: Vec2;
  readonly full: boolean;
}

export interface StumpView {
  readonly pos: Vec2;
  readonly radius: number;
}

export interface PeachView extends StumpView {
  readonly ripe: boolean;
}

export interface WebView {
  readonly id: number;
  readonly pos: Vec2;
  readonly radius: number;
  readonly age: number;
  readonly burning: number | null;
}

/** Tout ce que l'affichage lit d'une partie. `player` : le héros de ce joueur ; les autres sont ses alliés. */
export interface WorldView {
  readonly players: readonly HeroView[];
  readonly player: HeroView;
  readonly enemies: readonly EnemyView[];
  readonly summons: readonly SummonView[];
  readonly projectiles: readonly ProjectileView[];
  readonly stumps: readonly StumpView[];
  readonly peaches: readonly PeachView[];
  readonly webs: readonly WebView[];
  /** Pour le héros de ce joueur : une âme à lier à portée, quelqu'un à relever, son marteau en vol. */
  readonly soulInReach: boolean;
  readonly graveInReach: boolean;
  readonly hammerOut: boolean;
  /** Le héros que poursuit ce yokai (le premier en solo). */
  preyOf(enemyId: number): number;
  readonly cfg: { readonly webs: { readonly burnTime: number }; readonly difficulty?: { readonly level: number } };
}
