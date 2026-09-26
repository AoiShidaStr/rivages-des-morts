// Contenu de l'île en données (src/data) : on l'ajoute ou le modifie sans toucher au code.
import dialoguesJson from './data/dialogues.json';
import difficultyJson from './data/difficulty.json';
import islandJson from './data/island.json';
import islandSpritesJson from './data/islandSprites.json';
import itemsJson from './data/items.json';
import questsJson from './data/quests.json';
import skillsJson from './data/skills.json';
import type { DifficultyData } from './game/difficulty';
import type { UpgradeRules } from './game/forge';
import type { IslandData } from './game/island';
import { levelFor, talentPointsAt, type BonusKind, type ItemDef, type SkillsDef } from './game/loadout';
import type { DuplicateRules, ShopOffer } from './game/loot';
import { STARTING_WEAPON, type Catalog, type Condition, type Effect, type Slot } from './game/progress';
import { withHeroSprites } from './render/heroes';
import type { SpriteManifest } from './render/renderer';

/** Une réplique : [locuteur, texte]. */
export type Line = [string, string];

export interface Choice {
  text: string;
  if?: Condition[];
  then?: Effect[];
  reply?: Line[];
}

export interface Variant {
  if?: Condition[];
  /** « ! » : quelque chose de nouveau ; « ? » : une quête à rendre. */
  marker?: string;
  lines: Line[];
  choices?: Choice[];
  then?: Effect[];
}

export interface SpeakerDef {
  name: string;
  sprite?: string;
}

export interface ShopDef {
  name: string;
  discount?: number;
  /** Remise accordée sous condition (Obaa Kiku, après sa quête). */
  discountIf?: { if: Condition[]; discount: number; note: string };
  stock?: { item: string; price: number; if?: Condition[] }[];
  /** Boutique tirée au hasard à chaque visite (fin de donjon) : jusqu'à `offers.items` objets, puis des lots. */
  pool?: (ShopOffer & { weight?: number; if?: Condition[] })[];
  offers?: { items: number; total: number };
}

export interface RecipeDef {
  item: string;
  oboles: number;
  materials: Record<string, number>;
  if?: Condition[];
}

export interface DropDef {
  oboles: number;
  xp?: number;
  material?: string;
  chance?: number;
  count?: number;
  /** Objets rares (armes, reliques) ou de quête, chacun avec sa chance. */
  items?: { item: string; chance: number; if?: Condition[] }[];
}

export interface QuestDef {
  name: string;
  type: string;
  objectives: { if?: Condition[]; text: string }[];
}

export const content = {
  island: islandJson as unknown as IslandData,
  islandSprites: withHeroSprites(islandSpritesJson as SpriteManifest, Object.keys(skillsJson.races), Object.keys(skillsJson.classes)),
  speakers: dialoguesJson.speakers as Record<string, SpeakerDef>,
  dialogues: dialoguesJson.dialogues as unknown as Record<string, Variant[]>,
  items: itemsJson.items as unknown as Record<string, ItemDef>,
  materials: itemsJson.materials as Record<string, string>,
  slots: itemsJson.slots as Record<Slot, string>,
  bonuses: itemsJson.bonuses as Record<BonusKind, string>,
  drops: itemsJson.drops as unknown as Record<string, DropDef>,
  chest: itemsJson.chest as { oboles: [number, number]; materials: string[]; count: [number, number] },
  shops: itemsJson.shops as unknown as Record<string, ShopDef>,
  duplicates: itemsJson.duplicates as DuplicateRules,
  upgrade: itemsJson.forge.upgrade as unknown as UpgradeRules,
  difficulty: difficultyJson as unknown as DifficultyData,
  skills: skillsJson as unknown as SkillsDef,
  recipes: itemsJson.forge.recipes as unknown as RecipeDef[],
  quests: questsJson.quests as Record<string, QuestDef>,
  triggers: questsJson.triggers as unknown as Catalog['triggers'],
};

export type Content = typeof content;

export const catalog: Catalog = {
  itemName: (id) => content.items[id]?.name ?? id,
  materialName: (id) => content.materials[id] ?? id,
  questName: (id) => content.quests[id]?.name ?? id,
  itemSlot: (id) => content.items[id]?.slot,
  levelFor: (xp) => levelFor(content.skills, xp),
  talentPoints: (level) => talentPointsAt(content.skills, level),
  startingWeapon: (heroClass) => content.skills.classes[heroClass]?.weapon ?? STARTING_WEAPON,
  triggers: content.triggers,
};

/** Image d'un personnage pour les portraits de dialogue. */
export function portraitUrl(sprite: string | undefined): string | null {
  const file = sprite ? content.islandSprites[sprite]?.file : null;
  return file ? `${import.meta.env.BASE_URL}sprites/${file}` : null;
}
