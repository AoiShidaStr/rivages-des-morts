// Contenu de l'île en données (src/data) : on l'ajoute ou le modifie sans toucher au code.
import dialoguesJson from './data/dialogues.json';
import difficultyJson from './data/difficulty.json';
import rizieresJson from './data/dungeon.json';
import palaisJson from './data/dungeon-palais.json';
import dungeonsJson from './data/dungeons.json';
import endlessJson from './data/donjon-infini.json';
import islandJson from './data/island.json';
import islandSpritesJson from './data/islandSprites.json';
import itemsJson from './data/items.json';
import questsJson from './data/quests.json';
import skillsJson from './data/skills.json';
import type { GameConfig } from './game/config';
import type { DifficultyData, EnemyStrength } from './game/difficulty';
import type { ArenaSource, EndlessData } from './game/infini';
import type { UpgradeRules } from './game/forge';
import type { IslandData, ScreenPoint } from './game/island';
import { levelFor, talentPointsAt, type BonusKind, type ItemDef, type SkillsDef } from './game/loadout';
import type { DuplicateRules, ShopOffer } from './game/loot';
import { STARTING_WEAPON, type Catalog, type Condition, type Effect, type Slot } from './game/progress';
import { withHeroSprites } from './render/heroes';
import type { SpriteManifest } from './render/renderer';

/** Une réplique : [locuteur, texte], et parfois ses conditions (une race, une classe…) : sinon, elle est sautée. */
export type Line = [string, string] | [string, string, Condition[]];

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
  /**
   * Bavardage : après `lines`, une seule de ces répliques, à tour de rôle d'une visite à l'autre
   * (parmi celles dont les conditions sont remplies).
   */
  pool?: { if?: Condition[]; lines: Line[] }[];
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

/** Décor d'une arène : teinte du sol, couleur de la brume, sprites posés autour (voir src/data/sprites.json). */
export interface DungeonStyle {
  ground: [number, number, number];
  sky: string;
  decor: { sprite: string; x: number; z: number }[];
}

/** Ce qui change d'un donjon à l'autre dans la configuration du combat. */
export type ArenaConfig = Pick<GameConfig, 'arenaHalfSize' | 'stumpRadius' | 'peachRadius' | 'webs' | 'champion' | 'waves'>;

/** Un donjon (src/data/dungeons.json), avec ses salles de combat. */
export interface DungeonDef {
  id: string;
  name: string;
  /** Sous-titre du fondu d'entrée, avant le niveau (« Donjon du Yomi · niveau 3 »). */
  region: string;
  boss: string;
  /** Le boss dans une phrase (« Vaincs la Jorōgumo »). */
  bossLabel: string;
  victory: { title: string; text: string };
  /** Effets de chaque victoire (quête terminée, drapeau), puis ceux de la première seulement. */
  onVictory: Effect[];
  firstVictory: { if: Condition[]; then: Effect[] };
  /** Boutique de fin tirée au hasard après la victoire. */
  shop: string;
  /** Point de retour sur l'île (par défaut, le ponton de Charon). */
  exit?: ScreenPoint;
  /** Force des yokai et du boss au niveau 1, si elle diffère de celle de difficulty.json. */
  strength?: EnemyStrength;
  style: DungeonStyle;
  arena: ArenaConfig;
}

/** Réglages communs aux arènes, qu'un donjon peut remplacer. */
const ARENA_DEFAULTS = {
  stumpRadius: rizieresJson.stumpRadius,
  webs: rizieresJson.webs,
  peachRadius: 0.7,
  champion: { hp: 1.8, damage: 1.3 },
};

function dungeon(id: 'rizieres' | 'palais', arena: Partial<ArenaConfig> & Pick<ArenaConfig, 'arenaHalfSize' | 'waves'>): DungeonDef {
  const meta = dungeonsJson[id] as unknown as Omit<DungeonDef, 'id' | 'arena'>;
  return { id, ...meta, arena: { ...ARENA_DEFAULTS, ...arena } };
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
  dungeons: {
    rizieres: dungeon('rizieres', rizieresJson as unknown as ArenaConfig),
    palais: dungeon('palais', palaisJson as unknown as ArenaConfig),
  } as Record<string, DungeonDef>,
  triggers: questsJson.triggers as unknown as Catalog['triggers'],
  /** Le Yomi sans fond (donjon infini), qui tire ses blocs des donjons ci-dessus. */
  endless: endlessJson as unknown as EndlessData,
};

/** Les donjons, tels que le donjon infini y puise ses vagues. */
export const endlessArenas: Record<string, ArenaSource> = Object.fromEntries(
  Object.values(content.dungeons).map((d) => [d.id, { id: d.id, waves: d.arena.waves, strength: d.strength }]),
);

/** Identifiant du donjon infini (dans les actions, la coop et les records). */
export const ENDLESS = 'infini';
/** Drapeau du meilleur palier franchi par ce personnage, et celui posé en trouvant le passage. */
export const ENDLESS_RECORD = 'infini_record';
export const ENDLESS_FOUND = 'infini_decouvert';

export type Content = typeof content;

export const catalog: Catalog = {
  itemName: (id) => content.items[id]?.name ?? id,
  materialName: (id) => content.materials[id] ?? id,
  questName: (id) => content.quests[id]?.name ?? id,
  itemSlot: (id) => content.items[id]?.slot,
  hasItem: (id) => id in content.items,
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
