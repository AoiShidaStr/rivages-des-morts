// Écran de chargement (écrit dans index.html, pour s'afficher avant que le code du jeu arrive) : le jeu y annonce ses
// étapes, puis le retire quand l'écran titre est prêt.

const screen = () => document.getElementById('chargement') as (HTMLElement & { avancer?: () => void }) | null;

/** Nouvelle étape du chargement : son texte, et la part de la barre déjà acquise (de 0 à 1). */
export function loadingStep(text: string, floor: number): void {
  const el = screen();
  if (!el) return;
  const label = el.querySelector('.etape');
  if (label) label.textContent = text;
  el.dataset.plancher = String(Math.max(Number(el.dataset.plancher) || 0, floor));
  el.avancer?.();
}

/** Le jeu est prêt : la barre se remplit, puis l'écran s'efface en fondu. */
export function loadingDone(): void {
  const el = screen();
  if (!el) return;
  const fill = el.querySelector<HTMLElement>('.remplissage');
  if (fill) fill.style.transform = 'scaleX(1)';
  el.classList.add('fini');
  setTimeout(() => el.remove(), 600);
}

/** Le jeu n'a pas pu démarrer : l'écran s'en va pour laisser lire le message d'erreur. */
export function loadingFailed(): void {
  screen()?.remove();
}
