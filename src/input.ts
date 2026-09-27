/** Touches dont le navigateur ne doit pas faire son usage habituel (défilement de la page). */
const CAPTURED_KEYS = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

/** Bits de `PointerEvent.buttons` et numéro de bouton correspondant (`MouseEvent.button`). */
const MOUSE_BUTTONS = [
  { bit: 1, button: 0 }, // gauche
  { bit: 2, button: 2 }, // droit
] as const;

function isInteractiveUi(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return !!target.closest('#ui button, #ui .btn, #ui a, #ui input, #ui select, #ui [tabindex]');
}

/** Types de champs qui ne servent pas à écrire : leurs touches restent au jeu. */
const NOT_TEXT = new Set(['checkbox', 'radio', 'range', 'button', 'submit', 'reset', 'file', 'color', 'image']);

/**
 * Champ où l'on écrit (pseudo, code d'une partie en coop) : ses touches ne commandent pas le jeu, sinon
 * taper un I ouvrirait l'équipement, et un Z ferait marcher le héros. Seule Échap garde son rôle.
 */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target instanceof HTMLTextAreaElement) return true;
  return target instanceof HTMLInputElement && !NOT_TEXT.has(target.type);
}

/**
 * Clavier et souris. Les touches sont lues par position physique (`KeyboardEvent.code`) :
 * ZQSD sur un clavier AZERTY correspond à KeyW, KeyA, KeyS, KeyD, et la touche A à KeyQ.
 * Un appui reste en attente jusqu'à ce qu'un pas de simulation le consomme.
 *
 * La souris passe par les événements `pointer*` : Babylon.js annule `pointerdown` sur le canvas,
 * ce qui empêche le navigateur d'envoyer `mousedown` et `mouseup`.
 */
export class Input {
  readonly pointer = { x: 0, y: 0 };
  private readonly down = new Set<string>();
  private readonly pressed = new Set<string>();
  private readonly buttons = new Set<number>();
  private readonly clicks = new Set<number>();

  constructor(canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => {
      if (isTyping(e.target) && e.code !== 'Escape') return;
      if (CAPTURED_KEYS.has(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.down.add(e.code);
      this.pressed.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => {
      this.down.clear();
      this.buttons.clear();
      this.clicks.clear();
      this.pressed.clear();
    });

    const track = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      this.pointer.x = e.clientX - rect.left;
      this.pointer.y = e.clientY - rect.top;
    };

    // Un second bouton pressé alors que le premier est tenu n'envoie pas forcément de `pointerdown`,
    // seulement un `pointermove` dont `buttons` change : on synchronise donc l'état à chaque événement.
    const syncButtons = (e: PointerEvent) => {
      const onUi = isInteractiveUi(e.target);
      for (const { bit, button } of MOUSE_BUTTONS) {
        const held = (e.buttons & bit) !== 0;
        if (held) {
          if (!this.buttons.has(button) && !onUi) {
            this.buttons.add(button);
            this.clicks.add(button);
          }
        } else {
          this.buttons.delete(button);
        }
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      track(e);
      syncButtons(e);
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // Ignorer si la capture de pointeur n'est pas acceptée par le navigateur
      }
      canvas.focus();
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerdown', (e) => {
      if (!isInteractiveUi(e.target)) syncButtons(e);
    });
    window.addEventListener('pointermove', (e) => {
      track(e);
      syncButtons(e);
    });
    window.addEventListener('pointerup', syncButtons);
    window.addEventListener('pointercancel', () => this.buttons.clear());
    // Empêche le menu contextuel du navigateur de bloquer la parade au clic droit
    window.addEventListener('contextmenu', (e) => {
      if (!isInteractiveUi(e.target)) e.preventDefault();
    });
  }

  /** Axe de déplacement à l'écran : x vers la droite, y vers le haut. */
  moveAxis(): { x: number; y: number } {
    const held = (...codes: string[]) => (codes.some((c) => this.down.has(c)) ? 1 : 0);
    return {
      x: held('KeyD', 'ArrowRight') - held('KeyA', 'ArrowLeft'),
      y: held('KeyW', 'ArrowUp') - held('KeyS', 'ArrowDown'),
    };
  }

  isButtonDown(button: number): boolean {
    return this.buttons.has(button);
  }

  consumeKey(code: string): boolean {
    return this.pressed.delete(code);
  }

  consumeClick(button: number): boolean {
    return this.clicks.delete(button);
  }

  /** Oublie les appuis que personne n'a consommés, pour qu'ils ne se déclenchent pas plus tard par surprise. */
  flush(): void {
    this.pressed.clear();
    this.clicks.clear();
  }
}
