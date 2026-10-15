// Duel (PVP) : le héros tel qu'il entre dans l'arène. Tout y est égalisé (choix de Meven, 15/10/2026) : le même
// niveau pour tous, l'arme de départ de sa classe forgée à ce niveau, et rien d'autre. Seuls comptent la race, la
// classe, la voie et les talents (jamais plus que le niveau commun n'en donne). L'inventaire du joueur n'y entre
// pas : un objet trafiqué ne sert à rien en duel.
import type { PlayerConfig } from './config';
import { buildLoadout, talentPointsAt, type Loadout, type LoadoutData } from './loadout';
import type { ProgressState } from './progress';

/** La progression d'un héros ramenée à celle du duel : ses choix gardés, son équipement et ses bonus retirés. */
export function duelState(state: ProgressState, data: LoadoutData, level: number): ProgressState {
  const weapon = data.skills.classes[state.hero.class]?.weapon;
  return {
    ...state,
    talents: state.talents.slice(0, talentPointsAt(data.skills, level)),
    items: weapon ? [weapon] : [],
    equipped: weapon ? { arme: weapon } : {},
    itemLevels: weapon ? { [weapon]: level } : {},
    eveils: {},
    gravures: {},
    flags: {},
    stock: [],
  };
}

/** Les réglages d'un héros en duel, au niveau commun `level`. */
export function duelLoadout(base: PlayerConfig, state: ProgressState, data: LoadoutData, level: number): Loadout {
  return buildLoadout(base, duelState(state, data, level), data, level);
}
