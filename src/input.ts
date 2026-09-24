/** Touches dont le navigateur ne doit pas faire son usage habituel (défilement de la page). */
const CAPTURED_KEYS = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

/** Bits de `PointerEvent.buttons` et numéro de bouton correspondant (`MouseEvent.button`). */
const MOUSE_BUTTONS = [
  { bit: 1, button: 0 }, // gauche
  { bit: 2, button: 2 }, // droit
] as const;

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
      if (CAPTURED_KEYS.has(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.down.add(e.code);
      this.pressed.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => {
      this.down.clear();
      this.buttons.clear();
    });

    const track = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      this.pointer.x = e.clientX - rect.left;
      this.pointer.y = e.clientY - rect.top;
    };
    // Un second bouton pressé alors que le premier est tenu n'envoie pas de `pointerdown`,
    // seulement un `pointermove` dont `buttons` change : on compare donc l'état des boutons à chaque événement.
    const syncButtons = (e: PointerEvent) => {
      for (const { bit, button } of MOUSE_BUTTONS) {
        const held = (e.buttons & bit) !== 0;
        if (held && !this.buttons.has(button) && e.target === canvas) this.clicks.add(button);
        if (held && e.target === canvas) this.buttons.add(button);
        else if (!held) this.buttons.delete(button);
      }
    };
    canvas.addEventListener('pointerdown', (e) => {
      track(e);
      syncButtons(e);
      canvas.setPointerCapture(e.pointerId);
      canvas.focus();
    });
    window.addEventListener('pointermove', (e) => {
      track(e);
      syncButtons(e);
    });
    window.addEventListener('pointerup', syncButtons);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
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
