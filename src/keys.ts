// Lettres des touches, telles que le joueur les voit sur son clavier. Le jeu lit les touches par position
// (KeyQ, KeyW…) : la touche de la première compétence est « A » en AZERTY, mais « Q » en QWERTY.
// Les textes du jeu désignent chaque touche par sa lettre AZERTY ; {A}, {E}, {R}… y sont remplacés à l'affichage.

/** Position de chaque touche du jeu, d'après sa lettre sur un clavier AZERTY. */
const CODES: Record<string, string> = {
  A: 'KeyQ',
  Z: 'KeyW',
  Q: 'KeyA',
  S: 'KeyS',
  D: 'KeyD',
  E: 'KeyE',
  R: 'KeyR',
  I: 'KeyI',
  J: 'KeyJ',
  K: 'KeyK',
};

/** Disposition du clavier donnée par le navigateur (Chrome, Edge) ; sinon, on suppose un clavier AZERTY. */
let layout: ReadonlyMap<string, string> | null = null;

interface KeyboardApi {
  getLayoutMap(): Promise<ReadonlyMap<string, string>>;
}

/** Demande la disposition du clavier au navigateur, une fois au lancement. Sans réponse, on garde l'AZERTY. */
export async function loadKeyboardLayout(): Promise<void> {
  const keyboard = (navigator as Navigator & { keyboard?: KeyboardApi }).keyboard;
  if (!keyboard?.getLayoutMap) return;
  try {
    layout = await keyboard.getLayoutMap();
  } catch {
    // Page dans un cadre, ou navigateur qui refuse : les lettres AZERTY restent affichées.
  }
}

/** Lettre à afficher pour une touche désignée par sa lettre AZERTY ; tout le reste (« Clic droit »…) est rendu tel quel. */
export function keyName(azerty: string): string {
  const code = CODES[azerty];
  const letter = code ? layout?.get(code) : undefined;
  return letter ? letter.toUpperCase() : azerty;
}

/** Les quatre touches de déplacement : « ZQSD » en AZERTY, « WASD » en QWERTY. */
export function moveKeys(): string {
  return ['Z', 'Q', 'S', 'D'].map(keyName).join('');
}

/** Remplace {A}, {E}, {R}, {K}… par la touche du clavier du joueur. */
export function withKeys(text: string): string {
  return text.replace(/\{([AZQSDERIJK])\}/g, (_, letter: string) => keyName(letter));
}
