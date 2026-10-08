// Progression conservée entre les sessions : oboles, objets, matériaux, quêtes et drapeaux.
// Les dialogues et les quêtes (src/data) la lisent avec des conditions et la modifient avec des effets.
// Chaque personnage a son emplacement de sauvegarde (saves.ts) ; `Progress` tient celui qu'on joue.
import { LocalSaveStore, newSlotId, type SaveStore } from './saves';

import { keyName } from '../keys';

export type Slot = 'arme' | 'casque' | 'plastron' | 'jambieres' | 'bottes' | 'amulette' | 'relique';
export type QuestStatus = 'none' | 'active' | 'done';

/** Le héros choisi à la création : sa race (et son parent divin pour un Demi-dieu), sa classe. */
export interface Hero {
  race: string;
  parent?: string;
  class: string;
}

export interface ProgressState {
  version: 1;
  hero: Hero;
  oboles: number;
  xp: number;
  /** Nœuds appris dans l'arbre de compétences. */
  talents: string[];
  items: string[];
  equipped: Partial<Record<Slot, string>>;
  /** Niveau de forge de chaque pièce d'équipement possédée (forge de Tetsu). */
  itemLevels: Record<string, number>;
  /** Par donjon (rizieres, palais…) : plus haut niveau ouvert, et plus haut niveau vaincu. */
  dungeons: Record<string, DungeonRecord>;
  materials: Record<string, number>;
  /** Drapeaux et compteurs libres, posés par les dialogues. */
  flags: Record<string, number>;
  quests: Record<string, Exclude<QuestStatus, 'none'>>;
  /** Coffres gagnés en donjon, à ouvrir sur la barque. */
  chests: number;
}

export interface DungeonRecord {
  unlocked: number;
  best: number;
}

/** Toutes les clés présentes doivent être vraies. */
export interface Condition {
  flag?: string;
  notFlag?: string;
  quest?: string;
  is?: QuestStatus;
  has?: string;
  notHas?: string;
  material?: [string, number];
  oboles?: number;
  count?: [string, number];
  chests?: number;
  level?: number;
  /** Race ou classe du héros : une réplique propre à chaque personnage, pour qui recommence avec un autre. */
  race?: string;
  class?: string;
  /** Meilleure victoire dans un donjon (`*` : dans n'importe lequel) au moins à ce niveau. */
  dungeon?: [string, number];
  /** Une pièce d'équipement forgée au moins à ce niveau. */
  forged?: number;
}

export interface Effect {
  /** L'effet ne s'applique que si ces conditions sont remplies (l'arme de la classe du héros, par exemple). */
  if?: Condition[];
  set?: string;
  unset?: string;
  add?: [string, number];
  startQuest?: string;
  completeQuest?: string;
  give?: string;
  take?: string;
  oboles?: number;
  material?: [string, number];
  toast?: string;
  open?: 'shop' | 'forge';
  shop?: string;
  /** Ouvre l'entrée d'un donjon (`true` : les Rizières noyées). */
  enterDungeon?: boolean | string;
  openChests?: boolean;
  xp?: number;
  resetTalents?: boolean;
  /** Ouvre le choix d'une autre race et d'une autre classe (le moine du Rocher). */
  changeHero?: boolean;
}

/** Ce que l'interface doit faire après une suite d'effets. */
export type Action =
  | { kind: 'toast'; text: string; tone?: 'quest' | 'loot'; icon?: string }
  | { kind: 'shop'; id: string }
  | { kind: 'forge' }
  | { kind: 'dungeon'; id: string }
  | { kind: 'chests' }
  | { kind: 'changeHero' };

export interface Catalog {
  itemName(id: string): string;
  materialName(id: string): string;
  questName(id: string): string;
  itemSlot(id: string): Slot | undefined;
  /** Vrai si l'objet existe encore dans le jeu. */
  hasItem(id: string): boolean;
  /** Niveau atteint avec cette expérience. */
  levelFor(xp: number): number;
  /** Points de talent gagnés en tout à ce niveau. */
  talentPoints(level: number): number;
  /** Arme de départ d'une classe. */
  startingWeapon(heroClass: string): string;
  triggers: { if: Condition[]; then: Effect[] }[];
}

/** Personnages que l'on peut garder en même temps. */
export const MAX_CHARACTERS = 6;

/** Un personnage sauvegardé, tel que le montre l'écran des personnages. */
export interface CharacterSummary {
  id: string;
  hero: Hero;
  level: number;
  oboles: number;
  savedAt: number;
  /** Meilleur palier franchi dans le donjon infini (0 s'il n'y est jamais descendu). */
  endless: number;
}

/** Fichier d'export : la sauvegarde, marquée pour qu'on reconnaisse un fichier du jeu à l'import. */
interface ExportFile {
  jeu: 'rivages-des-morts';
  format: 1;
  exporte: string;
  sauvegarde: ProgressState;
}

/** L'arme de départ du Guerrier. */
export const STARTING_WEAPON = 'nodachi';
/** Le héros des parties commencées avant le choix de la race et de la classe. */
export const DEFAULT_HERO: Hero = { race: 'einherjar', class: 'guerrier' };

function fresh(): ProgressState {
  return {
    version: 1,
    hero: { ...DEFAULT_HERO },
    oboles: 0,
    xp: 0,
    talents: [],
    items: [STARTING_WEAPON],
    equipped: { arme: STARTING_WEAPON },
    itemLevels: { [STARTING_WEAPON]: 1 },
    dungeons: {},
    materials: {},
    flags: {},
    quests: {},
    chests: 0,
  };
}

export class Progress {
  state: ProgressState = fresh();
  /** Emplacement du personnage joué ; null avant d'en avoir choisi ou créé un. */
  slot: string | null = null;

  private constructor(
    private readonly catalog: Catalog,
    private readonly store: SaveStore,
  ) {}

  /** Charge le dernier personnage joué, s'il y en a un. */
  static load(catalog: Catalog, store: SaveStore = new LocalSaveStore()): Progress {
    const progress = new Progress(catalog, store);
    const last = progress.characters()[0];
    if (last) progress.use(last.id, false);
    return progress;
  }

  /** Les personnages sauvegardés, du plus récemment joué au plus ancien (les illisibles sont ignorés). */
  characters(): CharacterSummary[] {
    return this.store.list().flatMap(({ id, savedAt }) => {
      const state = this.readSlot(id);
      if (!state) return [];
      return [{ id, hero: state.hero, level: this.catalog.levelFor(state.xp), oboles: state.oboles, savedAt, endless: state.flags.infini_record ?? 0 }];
    });
  }

  get canCreate(): boolean {
    return this.characters().length < MAX_CHARACTERS;
  }

  /** Reprend un personnage sauvegardé ; `touch` le place en tête de liste (« Continuer »). */
  use(id: string, touch = true): boolean {
    const state = this.readSlot(id);
    if (!state) return false;
    this.state = state;
    this.slot = id;
    if (touch) this.save();
    return true;
  }

  /** Efface un personnage ; si c'est celui qu'on joue, plus aucun n'est choisi. */
  remove(id: string): void {
    this.store.remove(id);
    if (this.slot !== id) return;
    this.slot = null;
    this.state = fresh();
  }

  save(): void {
    // Sans personnage choisi (tests lancés avec ?vague), rien n'est écrit.
    if (this.slot) this.store.write(this.slot, this.state);
  }

  /** Nouveau personnage, dans un nouvel emplacement : le héros choisi à la création, avec l'arme de départ de sa classe. */
  start(hero: Hero): void {
    const weapon = this.catalog.startingWeapon(hero.class);
    this.state = { ...fresh(), hero, items: [weapon], equipped: { arme: weapon }, itemLevels: { [weapon]: 1 } };
    this.slot = newSlotId();
    this.save();
  }

  /** Contenu du fichier d'export d'un personnage (JSON lisible). */
  exportSlot(id: string): string | null {
    const state = this.readSlot(id);
    if (!state) return null;
    const file: ExportFile = { jeu: 'rivages-des-morts', format: 1, exporte: new Date().toISOString(), sauvegarde: state };
    return JSON.stringify(file, null, 2);
  }

  /**
   * Ajoute un personnage depuis un fichier d'export (ou une ancienne sauvegarde brute) et renvoie son emplacement.
   * Lève une erreur au message lisible si le fichier ne convient pas.
   */
  importSave(text: string): string {
    if (!this.canCreate) throw new Error(`Tu as déjà ${MAX_CHARACTERS} personnages : supprimes-en un avant d'importer.`);
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Ce fichier n'est pas une sauvegarde de Rivages des Morts.");
    }
    const saved = isExportFile(data) ? data.sauvegarde : data;
    if (!isSavedState(saved)) throw new Error("Ce fichier n'est pas une sauvegarde de Rivages des Morts.");
    const id = newSlotId();
    this.store.write(id, migrate(saved, this.catalog));
    return id;
  }

  private readSlot(id: string): ProgressState | null {
    const saved = this.store.read(id);
    return isSavedState(saved) ? migrate(saved, this.catalog) : null;
  }

  /**
   * Changement de race et de classe en cours de partie : les talents de l'ancienne classe sont rendus, et le héros
   * prend `weapon`, une arme de sa classe (reçue si elle lui manque). Le reste de la progression est gardé.
   */
  changeHero(hero: Hero, weapon: string): void {
    const { state } = this;
    state.hero = { ...hero };
    state.talents = [];
    this.acquire(weapon);
    state.itemLevels[weapon] ??= 1;
    state.equipped.arme = weapon;
    this.save();
  }

  quest(id: string): QuestStatus {
    return this.state.quests[id] ?? 'none';
  }

  flag(id: string): number {
    return this.state.flags[id] ?? 0;
  }

  material(id: string): number {
    return this.state.materials[id] ?? 0;
  }

  has(item: string): boolean {
    return this.state.items.includes(item);
  }

  get level(): number {
    return this.catalog.levelFor(this.state.xp);
  }

  /** Points de compétence encore à dépenser. */
  get skillPoints(): number {
    return Math.max(0, this.catalog.talentPoints(this.level) - this.state.talents.length);
  }

  /** Ajoute de l'expérience ; renvoie les annonces des niveaux atteints (souvent aucune). */
  gainXp(amount: number): Action[] {
    const before = this.level;
    this.state.xp += Math.max(0, Math.round(amount));
    const actions: Action[] = [];
    for (let level = before + 1; level <= this.level; level++) {
      const point = this.catalog.talentPoints(level) > this.catalog.talentPoints(level - 1);
      actions.push(levelUpToast(level, point));
    }
    return actions;
  }

  /** Range un nouvel objet et l'équipe si son emplacement est libre. */
  acquire(item: string, slot?: Slot): void {
    if (!this.has(item)) this.state.items.push(item);
    if (slot && !this.state.equipped[slot]) this.state.equipped[slot] = item;
    if (slot) this.state.itemLevels[item] ??= 1;
  }

  /** Niveaux ouverts et record d'un donjon (le niveau 1 est toujours ouvert). */
  dungeon(id: string): DungeonRecord {
    return (this.state.dungeons[id] ??= { unlocked: 1, best: 0 });
  }

  /** Une victoire au niveau `level` ouvre les niveaux du donjon jusqu'à `next` ; renvoie vrai si de nouveaux niveaux s'ouvrent. */
  winDungeon(id: string, level: number, next: number): boolean {
    const dungeon = this.dungeon(id);
    dungeon.best = Math.max(dungeon.best, level);
    if (next <= dungeon.unlocked) return false;
    dungeon.unlocked = next;
    return true;
  }

  check(conditions: readonly Condition[] | undefined): boolean {
    return (conditions ?? []).every((c) => this.checkOne(c));
  }

  /** Applique des effets, puis les déclencheurs globaux (bénédiction des Jizō…). */
  apply(effects: readonly Effect[] | undefined): Action[] {
    const actions: Action[] = [];
    for (const effect of effects ?? []) this.applyOne(effect, actions);
    for (const trigger of this.catalog.triggers) {
      if (this.check(trigger.if)) for (const effect of trigger.then) this.applyOne(effect, actions);
    }
    this.save();
    return actions;
  }

  /** Meilleure victoire dans un donjon, ou dans n'importe lequel (`*`). */
  record(id: string): number {
    const records = id === '*' ? Object.values(this.state.dungeons) : [this.state.dungeons[id]];
    return Math.max(0, ...records.map((r) => r?.best ?? 0));
  }

  /** Plus haut niveau de forge parmi les pièces possédées. */
  get forgeMax(): number {
    return Math.max(0, ...Object.values(this.state.itemLevels));
  }

  /** Remplace {oboles}, {coffres}, {record_<donjon>}, {forge_max} et les compteurs {nom} par leur valeur. */
  format(text: string): string {
    return text.replace(/\{([\w*]+)\}/g, (match, key: string) => {
      if (key === 'oboles') return String(this.state.oboles);
      if (key === 'coffres') return String(this.state.chests);
      if (key === 'forge_max') return String(this.forgeMax);
      if (key.startsWith('record_')) return String(this.record(key.slice('record_'.length)));
      if (key in this.state.flags) return String(this.state.flags[key]);
      return match === '{self}' ? match : '0';
    });
  }

  gainOboles(amount: number): void {
    this.state.oboles = Math.max(0, this.state.oboles + amount);
  }

  gainMaterial(id: string, amount: number): void {
    this.state.materials[id] = Math.max(0, this.material(id) + amount);
  }

  /** Équipe ou retire un objet ; on ne peut pas se retrouver sans arme. */
  equip(item: string, slot: Slot): void {
    if (this.state.equipped[slot] !== item) this.state.equipped[slot] = item;
    else if (slot !== 'arme') delete this.state.equipped[slot];
    this.save();
  }

  private checkOne(c: Condition): boolean {
    if (c.flag !== undefined && !this.flag(c.flag)) return false;
    if (c.notFlag !== undefined && this.flag(c.notFlag)) return false;
    if (c.quest !== undefined && this.quest(c.quest) !== (c.is ?? 'active')) return false;
    if (c.has !== undefined && !this.has(c.has)) return false;
    if (c.notHas !== undefined && this.has(c.notHas)) return false;
    if (c.material !== undefined && this.material(c.material[0]) < c.material[1]) return false;
    if (c.oboles !== undefined && this.state.oboles < c.oboles) return false;
    if (c.count !== undefined && this.flag(c.count[0]) < c.count[1]) return false;
    if (c.chests !== undefined && this.state.chests < c.chests) return false;
    if (c.level !== undefined && this.level < c.level) return false;
    if (c.race !== undefined && this.state.hero.race !== c.race) return false;
    if (c.class !== undefined && this.state.hero.class !== c.class) return false;
    if (c.dungeon !== undefined && this.record(c.dungeon[0]) < c.dungeon[1]) return false;
    if (c.forged !== undefined && this.forgeMax < c.forged) return false;
    return true;
  }

  private applyOne(e: Effect, actions: Action[]): void {
    const { catalog, state } = this;
    if (!this.check(e.if)) return;
    if (e.set) state.flags[e.set] = 1;
    if (e.unset) delete state.flags[e.unset];
    if (e.add) state.flags[e.add[0]] = this.flag(e.add[0]) + e.add[1];
    if (e.startQuest && this.quest(e.startQuest) === 'none') {
      state.quests[e.startQuest] = 'active';
      actions.push({ kind: 'toast', text: `Nouvelle quête : ${catalog.questName(e.startQuest)}`, tone: 'quest' });
    }
    if (e.completeQuest && this.quest(e.completeQuest) !== 'done') {
      state.quests[e.completeQuest] = 'done';
      actions.push({ kind: 'toast', text: `Quête terminée : ${catalog.questName(e.completeQuest)}`, tone: 'quest' });
    }
    if (e.give && !this.has(e.give)) {
      this.acquire(e.give, catalog.itemSlot(e.give));
      actions.push({ kind: 'toast', text: `Objet obtenu : ${catalog.itemName(e.give)}`, tone: 'loot', icon: e.give });
    }
    if (e.take) {
      state.items = state.items.filter((i) => i !== e.take);
      for (const slot of Object.keys(state.equipped) as Slot[]) if (state.equipped[slot] === e.take) delete state.equipped[slot];
    }
    if (e.oboles) {
      this.gainOboles(e.oboles);
      if (e.oboles > 0) actions.push({ kind: 'toast', text: `+${e.oboles} oboles`, tone: 'loot' });
    }
    if (e.material) {
      this.gainMaterial(e.material[0], e.material[1]);
      if (e.material[1] > 0) {
        actions.push({ kind: 'toast', text: `+${e.material[1]} ${catalog.materialName(e.material[0])}`, tone: 'loot', icon: e.material[0] });
      }
    }
    if (e.toast) actions.push({ kind: 'toast', text: e.toast });
    if (e.open === 'shop' && e.shop) actions.push({ kind: 'shop', id: e.shop });
    if (e.open === 'forge') actions.push({ kind: 'forge' });
    if (e.xp) {
      actions.push({ kind: 'toast', text: `+${e.xp} XP`, tone: 'loot' });
      actions.push(...this.gainXp(e.xp));
    }
    if (e.resetTalents && state.talents.length > 0) {
      state.talents = [];
      actions.push({ kind: 'toast', text: 'Arbre de compétences réinitialisé : tes points sont rendus.' });
    }
    if (e.enterDungeon) actions.push({ kind: 'dungeon', id: e.enterDungeon === true ? 'rizieres' : e.enterDungeon });
    if (e.openChests) actions.push({ kind: 'chests' });
    if (e.changeHero) actions.push({ kind: 'changeHero' });
  }
}

function levelUpToast(level: number, point: boolean): Action {
  const text = point ? `Niveau ${level} ! +1 point de compétence (touche ${keyName('K')})` : `Niveau ${level} ! Tetsu peut forger ton équipement jusqu’au niveau ${level}.`;
  return { kind: 'toast', text, tone: 'quest' };
}

/**
 * Anciennes sauvegardes : un seul niveau d'arme, puis des niveaux d'arme seulement, pas de niveau de donjon,
 * pas de héros (c'était toujours un Guerrier Einherjar).
 */
type SavedState = Omit<ProgressState, 'itemLevels' | 'dungeons' | 'hero'> &
  Partial<Pick<ProgressState, 'itemLevels' | 'dungeons' | 'hero'>> & {
    weaponLevel?: number;
    weaponLevels?: Record<string, number>;
    /** Avant le Palais d'Izanami, un seul donjon : les Rizières noyées. */
    dungeon?: DungeonRecord;
    /** Avant la 0.8.0 : le compagnon de l'Invocateur. */
    companion?: string;
  };

function isSavedState(value: unknown): value is SavedState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<SavedState>;
  return v.version === 1 && Array.isArray(v.items);
}

function isExportFile(value: unknown): value is ExportFile {
  return typeof value === 'object' && value !== null && (value as Partial<ExportFile>).jeu === 'rivages-des-morts';
}

function migrate(saved: SavedState, catalog: Catalog): ProgressState {
  const { weaponLevel, weaponLevels, dungeon, companion: _companion, ...rest } = saved;
  const state: ProgressState = { ...fresh(), ...rest };
  state.hero = saved.hero ?? { ...DEFAULT_HERO };
  // 0.8.0 : le Sorcier remplace l'Invocateur. Le héros garde son niveau et ses objets ; ses talents lui sont rendus.
  if (state.hero.class === 'invocateur') {
    state.hero = { ...state.hero, class: 'sorcier' };
    state.talents = [];
  }
  // Un objet qui a changé d'emplacement (0.10.0 : la Gourde de saké d'oni devient le Cœur de l'Arène, une relique)
  // quitte l'emplacement où il était porté ; il reste dans l'inventaire.
  state.equipped = { ...state.equipped };
  for (const slot of Object.keys(state.equipped) as Slot[]) {
    const item = state.equipped[slot];
    if (item && catalog.itemSlot(item) !== slot) delete state.equipped[slot];
  }
  state.itemLevels = { [STARTING_WEAPON]: weaponLevel ?? 1, ...weaponLevels, ...saved.itemLevels };
  // 0.11.0 : les objets retirés du jeu (Kanabō d'oni, Arc de soie…) quittent l'inventaire, sans compensation.
  state.items = state.items.filter((id) => catalog.hasItem(id));
  for (const id of Object.keys(state.itemLevels)) if (!catalog.hasItem(id)) delete state.itemLevels[id];
  // Une Jorōgumo déjà vaincue compte comme une victoire au niveau 1.
  const rizieres = dungeon ?? (state.quests.dame === 'done' ? { unlocked: 2, best: 1 } : { unlocked: 1, best: 0 });
  state.dungeons = { rizieres, ...saved.dungeons };
  const weapon = catalog.startingWeapon(state.hero.class);
  if (!state.items.includes(weapon)) state.items.unshift(weapon);
  state.itemLevels[weapon] ??= 1;
  state.equipped.arme ??= weapon;
  return state;
}

/** Remplace {self} par l'identifiant de l'objet avec lequel on interagit (une statue Jizō parmi six). */
export function bindSelf<T>(value: T, self: string): T {
  return JSON.parse(JSON.stringify(value).split('{self}').join(self)) as T;
}
