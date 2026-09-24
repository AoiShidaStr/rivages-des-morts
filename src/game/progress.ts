// Progression conservée entre les sessions : oboles, objets, matériaux, quêtes et drapeaux.
// Les dialogues et les quêtes (src/data) la lisent avec des conditions et la modifient avec des effets.

export type Slot = 'arme' | 'casque' | 'plastron' | 'jambieres' | 'bottes' | 'amulette' | 'relique';
export type QuestStatus = 'none' | 'active' | 'done';

export interface ProgressState {
  version: 1;
  oboles: number;
  xp: number;
  /** Nœuds appris dans l'arbre de compétences. */
  talents: string[];
  items: string[];
  equipped: Partial<Record<Slot, string>>;
  /** Niveau de chaque arme possédée (forge de Tetsu). */
  weaponLevels: Record<string, number>;
  materials: Record<string, number>;
  /** Drapeaux et compteurs libres, posés par les dialogues. */
  flags: Record<string, number>;
  quests: Record<string, Exclude<QuestStatus, 'none'>>;
  /** Coffres gagnés en donjon, à ouvrir sur la barque. */
  chests: number;
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
}

export interface Effect {
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
  enterDungeon?: boolean;
  openChests?: boolean;
  xp?: number;
  resetTalents?: boolean;
}

/** Ce que l'interface doit faire après une suite d'effets. */
export type Action =
  | { kind: 'toast'; text: string; tone?: 'quest' | 'loot' }
  | { kind: 'shop'; id: string }
  | { kind: 'forge' }
  | { kind: 'dungeon' }
  | { kind: 'chests' };

export interface Catalog {
  itemName(id: string): string;
  materialName(id: string): string;
  questName(id: string): string;
  itemSlot(id: string): Slot | undefined;
  /** Niveau atteint avec cette expérience. */
  levelFor(xp: number): number;
  triggers: { if: Condition[]; then: Effect[] }[];
}

const SAVE_KEY = 'rivages-des-morts:sauvegarde';

/** L'arme de départ du Guerrier. */
export const STARTING_WEAPON = 'nodachi';

function fresh(): ProgressState {
  return {
    version: 1,
    oboles: 0,
    xp: 0,
    talents: [],
    items: [STARTING_WEAPON],
    equipped: { arme: STARTING_WEAPON },
    weaponLevels: { [STARTING_WEAPON]: 1 },
    materials: {},
    flags: {},
    quests: {},
    chests: 0,
  };
}

export class Progress {
  state: ProgressState;

  private constructor(state: ProgressState, private readonly catalog: Catalog) {
    this.state = state;
  }

  static load(catalog: Catalog): Progress {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      const parsed = raw ? (JSON.parse(raw) as ProgressState & { weaponLevel?: number }) : null;
      if (parsed?.version === 1) return new Progress(migrate(parsed), catalog);
    } catch {
      // Sauvegarde illisible ou stockage indisponible : on repart de zéro.
    }
    return new Progress(fresh(), catalog);
  }

  static hasSave(): boolean {
    try {
      return localStorage.getItem(SAVE_KEY) !== null;
    } catch {
      return false;
    }
  }

  save(): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
    } catch {
      // Navigation privée ou stockage plein : la partie continue sans sauvegarde.
    }
  }

  reset(): void {
    this.state = fresh();
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // Rien à effacer.
    }
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
    return Math.max(0, this.level - 1 - this.state.talents.length);
  }

  /** Ajoute de l'expérience ; renvoie les niveaux atteints (souvent aucun). */
  gainXp(amount: number): number[] {
    const before = this.level;
    this.state.xp += Math.max(0, Math.round(amount));
    const reached: number[] = [];
    for (let level = before + 1; level <= this.level; level++) reached.push(level);
    return reached;
  }

  /** Range un nouvel objet et l'équipe si son emplacement est libre. */
  acquire(item: string, slot?: Slot): void {
    if (!this.has(item)) this.state.items.push(item);
    if (slot && !this.state.equipped[slot]) this.state.equipped[slot] = item;
    if (slot === 'arme') this.state.weaponLevels[item] ??= 1;
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

  /** Remplace {oboles}, {coffres} et les compteurs {nom} par leur valeur. */
  format(text: string): string {
    return text.replace(/\{(\w+)\}/g, (match, key: string) => {
      if (key === 'oboles') return String(this.state.oboles);
      if (key === 'coffres') return String(this.state.chests);
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
    return true;
  }

  private applyOne(e: Effect, actions: Action[]): void {
    const { catalog, state } = this;
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
      actions.push({ kind: 'toast', text: `Objet obtenu : ${catalog.itemName(e.give)}`, tone: 'loot' });
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
      if (e.material[1] > 0) actions.push({ kind: 'toast', text: `+${e.material[1]} ${catalog.materialName(e.material[0])}`, tone: 'loot' });
    }
    if (e.toast) actions.push({ kind: 'toast', text: e.toast });
    if (e.open === 'shop' && e.shop) actions.push({ kind: 'shop', id: e.shop });
    if (e.open === 'forge') actions.push({ kind: 'forge' });
    if (e.xp) {
      actions.push({ kind: 'toast', text: `+${e.xp} XP`, tone: 'loot' });
      for (const level of this.gainXp(e.xp)) actions.push(levelUpToast(level));
    }
    if (e.resetTalents && state.talents.length > 0) {
      state.talents = [];
      actions.push({ kind: 'toast', text: 'Arbre de compétences réinitialisé : tes points sont rendus.' });
    }
    if (e.enterDungeon) actions.push({ kind: 'dungeon' });
    if (e.openChests) actions.push({ kind: 'chests' });
  }
}

export function levelUpToast(level: number): Action {
  return { kind: 'toast', text: `Niveau ${level} ! +1 point de compétence (touche K)`, tone: 'quest' };
}

/** Sauvegardes plus anciennes : un seul niveau d'arme, pas d'arme de départ dans l'inventaire. */
function migrate(saved: ProgressState & { weaponLevel?: number }): ProgressState {
  const { weaponLevel, ...rest } = saved;
  const state = { ...fresh(), ...rest };
  state.weaponLevels = { [STARTING_WEAPON]: weaponLevel ?? 1, ...saved.weaponLevels };
  if (!state.items.includes(STARTING_WEAPON)) state.items.unshift(STARTING_WEAPON);
  state.equipped.arme ??= STARTING_WEAPON;
  return state;
}

/** Remplace {self} par l'identifiant de l'objet avec lequel on interagit (une statue Jizō parmi six). */
export function bindSelf<T>(value: T, self: string): T {
  return JSON.parse(JSON.stringify(value).split('{self}').join(self)) as T;
}
