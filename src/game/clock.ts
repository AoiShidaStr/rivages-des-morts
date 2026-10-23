/**
 * L'heure du jour sur l'île : la lumière la suit (src/render/islandLighting.ts) et le jeu aussi (le gardien errant ne se
 * laisse affronter qu'après minuit). Une seule horloge pour les deux, qui n'avance que sur l'île.
 */

/** Une heure de jeu par minute le jour, deux fois plus vite la nuit. */
const HOURS_PER_SECOND = 1 / 60;
const NIGHT_SPEED = 2;
const START_HOUR = 9;

/** `?heure=21` dans l'adresse : l'heure reste fixe (essais, captures). */
function fixedHour(): number | null {
  if (typeof location === 'undefined') return null;
  const value = new URLSearchParams(location.search).get('heure');
  const hour = value === null ? NaN : Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(hour) ? ((hour % 24) + 24) % 24 : null;
}

class IslandClock {
  readonly fixed: boolean;
  private current: number;

  constructor() {
    const hour = fixedHour();
    this.fixed = hour !== null;
    this.current = hour ?? START_HOUR;
  }

  /** L'heure (de 0 à 24). */
  get hour(): number {
    return this.current;
  }

  /** La nuit : de 20 h à 5 h. */
  get night(): boolean {
    return this.current >= 20 || this.current < 5;
  }

  advance(dt: number): void {
    if (this.fixed) return;
    this.current = (this.current + dt * HOURS_PER_SECOND * (this.night ? NIGHT_SPEED : 1)) % 24;
  }

  /** Vrai si l'heure est dans [from, to[ (`from` > `to` : la plage passe par minuit). */
  between(from: number, to: number): boolean {
    const h = this.current;
    return from <= to ? h >= from && h < to : h >= from || h < to;
  }
}

export const islandClock = new IslandClock();
