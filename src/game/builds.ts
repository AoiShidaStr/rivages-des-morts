// Les builds : l'équipement, les talents et la voie d'un héros, enregistrés pour y revenir en un clic. Un objet
// possédé est unique (les doublons vont dans la réserve), donc un build n'est qu'une liste « emplacement → objet » :
// l'appliquer ne déplace rien, il rééquipe. Cinq builds libres par personnage, plus le build Duel, qui sert tout seul
// en duel sans toucher à l'équipement du héros (choix de Meven, 16/10/2026).
import { equipBlock, talentPointsAt, type LoadoutData } from './loadout';
import type { Hero, Progress, ProgressState, Slot } from './progress';

export interface Build {
  name: string;
  /** La classe du héros à l'enregistrement : un build d'une autre classe ne s'applique pas. */
  class: string;
  equipped: Partial<Record<Slot, string>>;
  talents: string[];
  subclass?: string;
}

/** Builds libres par personnage. */
export const BUILD_COUNT = 5;
/** Le build Duel : l'arme, plus au plus 4 des 6 autres emplacements (plan PvP, 16/10/2026). */
export const DUEL_SLOTS = 4;

/** Ce que le héros porte et a choisi maintenant, sous forme de build. */
export function snapshot(state: ProgressState, name: string): Build {
  const { hero } = state;
  return {
    name,
    class: hero.class,
    equipped: { ...state.equipped },
    talents: [...state.talents],
    ...(hero.subclass ? { subclass: hero.subclass } : {}),
  };
}

/** Les emplacements portés hors arme, dans l'ordre où le build les tient. */
export function extraSlots(build: Pick<Build, 'equipped'>): Slot[] {
  return (Object.keys(build.equipped) as Slot[]).filter((slot) => slot !== 'arme' && build.equipped[slot]);
}

/** Les objets du build que le héros ne possède plus (vendus, échangés, fondus). */
export function missingItems(state: ProgressState, build: Build): string[] {
  return Object.values(build.equipped).filter((id): id is string => !!id && !state.items.includes(id));
}

/** Le build vaut pour ce héros : même classe. */
export const fitsHero = (build: Build, hero: Hero): boolean => build.class === hero.class;

/** Garde un build lu dans une sauvegarde s'il a la bonne forme, sinon null. */
export function readBuild(value: unknown): Build | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Partial<Build>;
  if (typeof v.name !== 'string' || typeof v.class !== 'string' || typeof v.equipped !== 'object' || !v.equipped || !Array.isArray(v.talents)) return null;
  return {
    name: v.name,
    class: v.class,
    equipped: { ...v.equipped },
    talents: v.talents.filter((t) => typeof t === 'string'),
    ...(typeof v.subclass === 'string' ? { subclass: v.subclass } : {}),
  };
}

/** Les talents du build qui valent pour sa classe, dans l'ordre appris, au plus ce que le niveau `level` donne. */
export function buildTalents(data: LoadoutData, build: Build, level: number): string[] {
  const nodes = new Set((data.skills.classes[build.class]?.branches ?? []).flatMap((b) => b.nodes.map((n) => n.id)));
  return build.talents.filter((id) => nodes.has(id)).slice(0, talentPointsAt(data.skills, level));
}

/**
 * Rééquipe le héros comme le build : ses objets encore possédés et portables, ses talents, sa voie. Un objet qui
 * manque laisse son emplacement vide (l'arme, elle, reste celle d'avant). Renvoie les objets manquants, ou null si
 * le build est d'une autre classe.
 */
export function applyBuild(progress: Progress, data: LoadoutData, build: Build): string[] | null {
  const { state } = progress;
  if (!fitsHero(build, state.hero)) return null;
  const equipped: Partial<Record<Slot, string>> = {};
  for (const [slot, id] of Object.entries(build.equipped) as [Slot, string][]) {
    const def = data.items[id];
    if (def?.slot === slot && state.items.includes(id) && !equipBlock(def, state.hero, data.skills)) equipped[slot] = id;
  }
  equipped.arme ??= state.equipped.arme;
  state.equipped = equipped;
  state.talents = buildTalents(data, build, progress.level);
  progress.chooseSubclass(build.subclass && data.subclasses?.[build.class]?.[build.subclass] ? build.subclass : null);
  progress.save();
  return missingItems(state, build);
}

/** Enregistre ce que porte le héros dans le build libre `index` (en gardant son nom s'il en avait un). */
export function saveBuild(progress: Progress, index: number): Build {
  const builds = progress.state.builds;
  const build = snapshot(progress.state, builds[index]?.name ?? `Build ${index + 1}`);
  while (builds.length <= index) builds.push(null);
  builds[index] = build;
  progress.save();
  return build;
}

/** Enregistre le build Duel : l'arme et les emplacements `keep` (au plus DUEL_SLOTS) de l'équipement actuel. */
export function saveDuelBuild(progress: Progress, keep: Slot[]): Build {
  const build = snapshot(progress.state, 'Duel');
  const kept = new Set(keep.slice(0, DUEL_SLOTS));
  for (const slot of extraSlots(build)) if (!kept.has(slot)) delete build.equipped[slot];
  progress.state.duelBuild = build;
  progress.save();
  return build;
}
