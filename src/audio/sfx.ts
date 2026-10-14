// Sons courts (SFX) d'interface et de combat : un identifiant par événement, deux ou trois variantes de fichier
// audio pour couper la répétition, et une vitesse de lecture tirée au hasard à chaque joue. Comme pour la musique,
// le navigateur interdit le son avant le premier geste du joueur : les appels d'avant restent silencieux.
// Les Pistes longues (menu, île, combats) restent dans src/audio/music.ts : ici, on ne touche pas aux musiques des
// amis musicologues. Un fichier absent ne casse rien : la variante est écartée, le jeu continue sans ce son.
// Conventions : public/audio/sfx/<id>-1.mp3, -2.mp3, -3.mp3 (deux ou trois variantes, une suffit) — le cahier de
// production de chaque id est dans docs/sons-a-produire.md. Sans fichier, le son reste muet.

import data from '../data/sfx.json';
import type { GameEvent } from '../game/types';

export type SfxId = keyof typeof data.sons;

/** Les événements du combat qui sonnent un fichier court ; le coup critique choisit « crit », le coup ordinaire « coup ». */
export const SFX_DES_EVENTS: Partial<Record<GameEvent['type'], SfxId>> = {
  wave: 'vague',
  enemyHit: 'coup',
  playerHit: 'recu',
  guard: 'garde',
  parry: 'parade',
  heroDown: 'a-terre',
  heroRevived: 'releve',
};

export interface SfxSettings {
  /** De 0 à 1, indépendant du réglage des musiques. */
  volume: number;
  muted: boolean;
}

const SETTINGS_KEY = 'rivages-des-morts:sfx';
/** Les variantes attendues par son : -1, -2 et -3. Une qui manque est simplement ignorée. */
const VARIANTES = [1, 2, 3];
/** Pas entre deux joues du même son : les coups partent en rafale, on ne les empile pas l'un sur l'autre. */
const MÊME_PAS_MS = 90;
/**
 * Repos plus long pour les sons du combat qui reviennent sans cesse : entendus à chaque coup, ils lassent vite.
 * Un critique ne sonne qu'une fois toutes les 3 s ; entre-temps, le coup sonne comme un coup ordinaire.
 */
const REPOS_MS: Partial<Record<SfxId, number>> = {
  crit: 3000,
  coup: 400,
  vide: 1500,
  recu: 1000,
  esquive: 800,
  butin: 1000,
};

/** Ce qu'on clique décide du son : valider (bouton principal, choix), onglet, fermer, ou un bouton ordinaire. */
function sonDuClic(cible: Element): { id: SfxId; vitesse: number } {
  if (cible.matches('.primary, .dialogue .choice')) return { id: 'valider', vitesse: 1 };
  if (cible.matches('[role="tab"], .tab, .chat-tab')) return { id: 'clic', vitesse: 1.2 };
  if (cible.matches('.close, .danger') || /^(fermer|retour|annuler|quitter)/i.test(cible.getAttribute('title') ?? cible.textContent?.trim() ?? '')) {
    return { id: 'clic', vitesse: 0.8 };
  }
  return { id: 'clic', vitesse: 1 };
}

/** L'élément cliquable sous le pointeur : un bouton, ou tout élément que le jeu montre comme cliquable (curseur main). */
function cliquable(cible: EventTarget | null): Element | null {
  let el = cible instanceof Element ? cible : null;
  for (let i = 0; el && el !== document.body && i < 6; i++, el = el.parentElement) {
    if (el.matches('button, .btn, [role="button"], [role="tab"]')) return (el as HTMLButtonElement).disabled ? null : el;
    if (el instanceof HTMLCanvasElement) return null;
    if (getComputedStyle(el).cursor === 'pointer') return el;
  }
  return null;
}

export class Sfx {
  readonly settings: SfxSettings;
  private unlocked = false;
  /** Cache des variantes valides par identifiant : les fichiers absents sont retirés dès leur erreur de chargement. */
  private readonly pools = new Map<SfxId, HTMLAudioElement[]>();
  /** La dernière variante jouée par son, pour ne jamais répéter la même derrière elle-même. */
  private readonly dernière = new Map<SfxId, number>();
  /** L'heure de la dernière joue de chaque son : le pas de 90 ms vaut son par son, pas pour tous ensemble. */
  private readonly dernierJeu = new Map<SfxId, number>();

  constructor() {
    this.settings = loadSettings();
    const débloque = () => {
      this.unlocked = true;
      // Les fichiers se chargent dès le premier geste : le premier coup du combat a déjà son son.
      for (const id of Object.keys(data.sons) as SfxId[]) this.pool(id);
      window.removeEventListener('pointerdown', débloque, true);
      window.removeEventListener('keydown', débloque, true);
    };
    window.addEventListener('pointerdown', débloque, true);
    window.addEventListener('keydown', débloque, true);
    // Tout ce qui se clique dans les menus et les fenêtres sonne, d'un seul endroit : pas un appel par bouton.
    document.addEventListener('click', (event) => {
      const cible = cliquable(event.target);
      if (!cible) return;
      const { id, vitesse } = sonDuClic(cible);
      this.play(id, vitesse);
    }, true);
  }

  setVolume(volume: number): void {
    this.settings.volume = Math.max(0, Math.min(1, volume));
    this.settings.muted = false;
    this.changed();
  }

  setMuted(muted: boolean): void {
    this.settings.muted = muted;
    this.changed();
  }

  /**
   * Joue ce son, si le navigateur le permet : s'il a au moins un fichier et qu'il a fini son repos. Renvoie faux
   * quand le son se tait. `vitesse` fixe la hauteur (sons d'interface) ; sans elle, elle varie un peu à chaque joue.
   */
  play(id: SfxId, vitesse?: number): boolean {
    if (!this.unlocked || this.settings.muted) return false;
    const maintenant = Date.now();
    // Le même son s'efface devant lui-même pendant son repos : plusieurs coups à la fois ne sonnent qu'une fois.
    if (maintenant - (this.dernierJeu.get(id) ?? 0) < (REPOS_MS[id] ?? MÊME_PAS_MS)) return false;
    const variantes = this.pool(id);
    if (variantes.length === 0) return false;
    this.dernierJeu.set(id, maintenant);
    const dernière = this.dernière.get(id) ?? -1;
    const dispo = variantes.length > 1 ? variantes.filter((_, i) => i !== dernière) : variantes;
    const audio = dispo[Math.floor(Math.random() * dispo.length)];
    audio.currentTime = 0;
    // Un peu de vitesse au hasard : même une seule variante ne colle pas l'oreille.
    audio.playbackRate = vitesse ?? 0.92 + Math.random() * 0.14;
    audio.volume = this.settings.volume;
    this.dernière.set(id, variantes.indexOf(audio));
    void audio.play().catch(() => {
      // Lecture refusée (fichier absent, onglet en arrière-plan) : le jeu continue en silence.
    });
    return true;
  }

  /**
   * Les variantes prêtes de ce son. On ne demande la variante suivante que si la précédente existe : un son pas
   * encore produit ne coûte qu'une requête manquée, pas trois.
   */
  private pool(id: SfxId): HTMLAudioElement[] {
    let variantes = this.pools.get(id);
    if (!variantes) {
      const prêtes: HTMLAudioElement[] = [];
      variantes = prêtes;
      this.pools.set(id, prêtes);
      const charge = (i: number) => {
        if (i >= VARIANTES.length) return;
        const audio = new Audio(`${import.meta.env.BASE_URL}audio/sfx/${id}-${VARIANTES[i]}.mp3`);
        audio.preload = 'auto';
        // Fichier absent : la variante n'entre pas dans la réserve, et les suivantes ne sont pas demandées.
        audio.addEventListener('canplaythrough', () => {
          prêtes.push(audio);
          charge(i + 1);
        }, { once: true });
        audio.load();
      };
      charge(0);
    }
    return variantes;
  }

  private changed(): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch {
      // Stockage indisponible : le réglage vaut pour cette session seulement.
    }
  }
}

function loadSettings(): SfxSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<SfxSettings>) : {};
    return {
      volume: typeof saved.volume === 'number' ? Math.max(0, Math.min(1, saved.volume)) : 0.8,
      muted: saved.muted === true,
    };
  } catch {
    return { volume: 0.8, muted: false };
  }
}
