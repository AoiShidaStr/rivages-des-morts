export type Child = Node | string | number | null | undefined | false;
type Attr = string | boolean | undefined | ((event: Event) => void);

/** Crée un élément HTML : h('button', { class: 'x', onclick: () => … }, 'Texte'). */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, Attr> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (typeof value === 'function') el.addEventListener(key.slice(2), value);
    else if (key === 'class') el.className = String(value);
    else el.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    el.append(typeof child === 'number' ? String(child) : child);
  }
  return el;
}

/**
 * Icône peinte d'un objet ou d'un matériau (public/sprites/icones, découpées par `npm run icones`).
 * `small` se glisse dans une ligne de texte ; `medium` et `large` sont des cases encadrées.
 * Un objet sans icône garde sa case vide (ou rien, en petit).
 */
export function icon(id: string, size: 'small' | 'medium' | 'large' = 'medium'): HTMLSpanElement {
  return h(
    'span',
    { class: `icon ${size}` },
    h('img', {
      src: `${import.meta.env.BASE_URL}sprites/icones/${id}.png`,
      alt: '',
      draggable: 'false',
      onerror: (e) => (e.currentTarget as HTMLElement).parentElement?.classList.add('missing'),
    }),
  );
}

/** Pièce d'obole (le « mon » troué des anciennes monnaies). */
export function obole(amount: number | string): HTMLSpanElement {
  return h('span', { class: 'obole' }, h('i'), String(amount));
}
