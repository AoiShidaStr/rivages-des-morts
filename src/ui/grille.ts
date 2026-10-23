// La grille d'objets de l'inventaire et de la forge, façon Wakfu ou Minecraft : des cases carrées qu'on survole
// (infobulle), qu'on glisse sur un emplacement, qu'on double-clique pour équiper, et un clic droit pour le reste.
// Rien ici ne connaît la progression : les fenêtres (panels.ts) donnent à chaque case son modèle et ses actions.
import { h, icon } from './dom';

/** Ce qu'affiche une case. */
export interface CellModel {
  /** Identifiant de la case : `own:<objet>` pour l'objet possédé, `stock:<uid>` pour un exemplaire de la réserve. */
  key: string;
  item: string;
  rarity: string;
  /** Niveau de forge, ou null si l'objet ne se forge pas. */
  level: number | null;
  /** Durabilité restante, de 0 à 1 ; null si l'objet ne s'use pas. */
  durability: number | null;
  /** Sous le seuil d'alerte. */
  worn?: boolean;
  equipped?: boolean;
  /** Exemplaire de la réserve (un doublon). */
  copy?: boolean;
  sealed?: boolean;
  engraved?: boolean;
  /** Le héros ne peut pas le porter. */
  blocked?: boolean;
  /** La classe qui peut le porter (initiale et identifiant, pour la couleur) ; absente : universel. */
  classTag?: { label: string; id: string; name: string };
  /** Forge : une amélioration est payable. */
  ready?: boolean;
  selected?: boolean;
}

export interface CellActions {
  /** Clic simple : sélection. */
  select?: () => void;
  /** Double-clic, Entrée : l'action principale (équiper, poser sur l'enclume). */
  activate?: () => void;
  /** Clic droit : les actions de la case. */
  menu?: () => MenuItem[];
  /** Le contenu de l'infobulle, construit au survol. */
  tooltip?: () => Node;
}

export interface MenuItem {
  label: string;
  run: () => void;
  danger?: boolean;
  disabled?: boolean;
}

/** Ce que transporte un glisser : la case d'origine. */
const DRAG_TYPE = 'application/x-rivages-objet';
let dragged: string | null = null;

const rarityClass = (rarity: string) => `rar-${rarity.replace(/\s/g, '-')}`;

/** La barre de durabilité en bas d'une case : verte, orange sous le seuil, rouge et vide quand l'objet est cassé. */
export function durabilityBar(value: number | null, worn = false): HTMLElement | null {
  if (value === null) return null;
  const state = value <= 0 ? ' broken' : worn ? ' low' : '';
  return h('span', { class: `dura${state}` }, h('i', { style: `width:${Math.max(0, Math.min(1, value)) * 100}%` }));
}

/** Une case de la grille. */
export function itemCell(model: CellModel, actions: CellActions): HTMLElement {
  const classes = [
    'cell',
    rarityClass(model.rarity),
    model.equipped ? 'equipped' : '',
    model.copy ? 'copy' : '',
    model.blocked ? 'blocked' : '',
    model.selected ? 'selected' : '',
    model.durability !== null && model.durability <= 0 ? 'broken' : '',
    model.engraved || model.sealed ? 'engraved' : '',
  ].filter(Boolean);
  const cell = h(
    'div',
    { class: classes.join(' '), tabindex: '-1', role: 'button', draggable: 'true', 'data-key': model.key, 'data-item': model.item },
    icon(model.item, 'medium'),
    model.level !== null ? h('span', { class: 'cell-level' }, String(model.level)) : null,
    model.sealed ? h('span', { class: 'cell-mark seal', title: 'Gravure scellée' }, '封') : model.engraved ? h('span', { class: 'cell-mark', title: 'Gravée' }, '刻') : null,
    model.copy ? h('span', { class: 'cell-copy', title: 'Exemplaire de la réserve' }, '×') : null,
    model.ready ? h('span', { class: 'cell-ready', title: 'Amélioration payable' }, '▲') : null,
    model.equipped ? h('span', { class: 'cell-worn', title: 'Porté' }, 'É') : null,
    model.classTag ? h('span', { class: `cell-class cls-${model.classTag.id}`, title: model.classTag.name }, model.classTag.label) : null,
    durabilityBar(model.durability, model.worn),
  );
  cell.addEventListener('click', () => actions.select?.());
  cell.addEventListener('dblclick', (e) => {
    e.preventDefault();
    actions.activate?.();
  });
  cell.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const items = actions.menu?.() ?? [];
    if (items.length) openMenu(cell, e.clientX, e.clientY, items);
  });
  cell.addEventListener('dragstart', (e) => {
    dragged = model.key;
    hideTip(cell);
    e.dataTransfer?.setData(DRAG_TYPE, model.key);
    e.dataTransfer?.setData('text/plain', model.key);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    cell.classList.add('dragging');
  });
  cell.addEventListener('dragend', () => {
    dragged = null;
    cell.classList.remove('dragging');
    for (const el of document.querySelectorAll('.drop-over')) el.classList.remove('drop-over');
  });
  if (actions.tooltip) bindTip(cell, actions.tooltip);
  return cell;
}

/**
 * Fait d'un élément une cible de glisser-déposer. `accepts` dit si la case glissée peut y tomber (l'emplacement s'allume),
 * `drop` reçoit la clé de la case.
 */
export function dropTarget(el: HTMLElement, accepts: (key: string) => boolean, drop: (key: string) => void): void {
  el.addEventListener('dragover', (e) => {
    if (!dragged || !accepts(dragged)) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    el.classList.add('drop-over');
  });
  el.addEventListener('dragleave', (e) => {
    if (!el.contains(e.relatedTarget as Node | null)) el.classList.remove('drop-over');
  });
  el.addEventListener('drop', (e) => {
    e.preventDefault();
    el.classList.remove('drop-over');
    const key = e.dataTransfer?.getData(DRAG_TYPE) || dragged;
    dragged = null;
    if (key && accepts(key)) drop(key);
  });
}

/** Rend un élément glissable (un emplacement porté, qu'on tire vers le sac pour le retirer). */
export function dragSource(el: HTMLElement, key: string): void {
  el.draggable = true;
  el.addEventListener('dragstart', (e) => {
    dragged = key;
    hideTip(el);
    e.dataTransfer?.setData(DRAG_TYPE, key);
    e.dataTransfer?.setData('text/plain', key);
  });
  el.addEventListener('dragend', () => {
    dragged = null;
    for (const node of document.querySelectorAll('.drop-over')) node.classList.remove('drop-over');
  });
}

// --- Infobulle ------------------------------------------------------------------

/** L'infobulle vit dans le même conteneur que la fenêtre : elle disparaît avec elle. */
function tipFor(anchor: HTMLElement): HTMLElement | null {
  const host = anchor.closest('.panel-backdrop') as HTMLElement | null;
  if (!host) return null;
  let tip = host.querySelector<HTMLElement>(':scope > .inv-tip');
  if (!tip) {
    tip = h('div', { class: 'inv-tip', role: 'tooltip' });
    host.append(tip);
  }
  return tip;
}

function placeTip(tip: HTMLElement, x: number, y: number): void {
  const pad = 14;
  const { innerWidth: w, innerHeight: ht } = window;
  const rect = tip.getBoundingClientRect();
  let left = x + pad;
  let top = y + pad;
  if (left + rect.width > w - 8) left = Math.max(8, x - rect.width - pad);
  if (top + rect.height > ht - 8) top = Math.max(8, ht - rect.height - 8);
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}

function hideTip(anchor: HTMLElement): void {
  const tip = tipFor(anchor);
  tip?.classList.remove('visible');
}

/** Montre `build()` en infobulle au survol de `el` (et au focus clavier). */
export function bindTip(el: HTMLElement, build: () => Node): void {
  const show = (x: number, y: number) => {
    const tip = tipFor(el);
    if (!tip) return;
    tip.replaceChildren(build());
    tip.classList.add('visible');
    placeTip(tip, x, y);
  };
  el.addEventListener('mouseenter', (e) => show(e.clientX, e.clientY));
  el.addEventListener('mousemove', (e) => {
    const tip = tipFor(el);
    if (tip?.classList.contains('visible')) placeTip(tip, e.clientX, e.clientY);
  });
  el.addEventListener('mouseleave', () => hideTip(el));
  el.addEventListener('focus', () => {
    const r = el.getBoundingClientRect();
    show(r.right, r.top);
  });
  el.addEventListener('blur', () => hideTip(el));
}

// --- Menu du clic droit -----------------------------------------------------------

function closeMenus(): void {
  for (const el of document.querySelectorAll('.inv-menu')) el.remove();
}

export function openMenu(anchor: HTMLElement, x: number, y: number, items: MenuItem[]): void {
  closeMenus();
  hideTip(anchor);
  const host = (anchor.closest('.panel-backdrop') as HTMLElement | null) ?? document.body;
  const menu = h(
    'div',
    { class: 'inv-menu', role: 'menu' },
    ...items.map((item) =>
      h(
        'button',
        {
          class: item.danger ? 'danger' : '',
          role: 'menuitem',
          disabled: item.disabled,
          onclick: (e: Event) => {
            e.stopPropagation();
            closeMenus();
            item.run();
          },
        },
        item.label,
      ),
    ),
  );
  host.append(menu);
  const rect = menu.getBoundingClientRect();
  menu.style.left = `${Math.min(x, window.innerWidth - rect.width - 8)}px`;
  menu.style.top = `${Math.min(y, window.innerHeight - rect.height - 8)}px`;
  (menu.querySelector('button:not([disabled])') as HTMLElement | null)?.focus();
  // Le prochain clic ailleurs, ou Échap, le referme.
  setTimeout(() => {
    const away = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return;
      if (e.target instanceof Node && menu.contains(e.target) && !(e instanceof KeyboardEvent)) return;
      closeMenus();
      document.removeEventListener('mousedown', away, true);
      document.removeEventListener('keydown', away, true);
    };
    document.addEventListener('mousedown', away, true);
    document.addEventListener('keydown', away, true);
  });
}

// --- Clavier ----------------------------------------------------------------------

/**
 * Déplacement aux flèches dans une grille de cases : renvoie la case voisine de `current` dans la direction de la
 * touche, d'après la place des cases à l'écran (la grille s'adapte à la largeur, le nombre de colonnes aussi).
 */
export function neighbour(grid: HTMLElement, current: string | null, key: string): string | null {
  const cells = [...grid.querySelectorAll<HTMLElement>('.cell')];
  if (!cells.length) return null;
  const at = cells.findIndex((c) => c.dataset.key === current);
  if (at < 0) return cells[0].dataset.key ?? null;
  const top = cells[0].offsetTop;
  const columns = Math.max(1, cells.findIndex((c) => c.offsetTop !== top) < 0 ? cells.length : cells.findIndex((c) => c.offsetTop !== top));
  const step = key === 'ArrowLeft' ? -1 : key === 'ArrowRight' ? 1 : key === 'ArrowUp' ? -columns : key === 'ArrowDown' ? columns : 0;
  const next = Math.max(0, Math.min(cells.length - 1, at + step));
  return cells[next].dataset.key ?? null;
}
