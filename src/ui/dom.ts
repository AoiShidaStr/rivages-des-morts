type Child = Node | string | number | null | undefined | false;
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

/** Pièce d'obole (le « mon » troué des anciennes monnaies). */
export function obole(amount: number | string): HTMLSpanElement {
  return h('span', { class: 'obole' }, h('i'), String(amount));
}
