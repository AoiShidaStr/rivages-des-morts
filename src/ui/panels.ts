import { content } from '../content';
import type { PlayerConfig } from '../game/config';
import { activeCurses, clampLevel, difficultyFor, nextCurse, rewardsFor } from '../game/difficulty';
import { isUpgradable, paliersOf, reachedPaliers, scaledBonus, upgradeCap, upgradeCost, weaponPower } from '../game/forge';
import { buildLoadout, canLearn, canWield, heroClass, heroRace, itemLevel, levelProgress, racePassives, type Bonus, type BonusKind, type ItemDef, type Loadout } from '../game/loadout';
import type { Progress, Slot } from '../game/progress';
import { h, icon, obole, type Child } from './dom';

/** Nombre à la française : « 1,35 ». */
const fr = (value: number, digits = 2): string => value.toLocaleString('fr-FR', { maximumFractionDigits: digits });

export interface UiContext {
  progress: Progress;
  basePlayer: PlayerConfig;
  /** Réglages du héros avec sa race, sa classe, l'équipement, le niveau et les talents actuels. */
  loadout(): Loadout;
  /** `icon` : l'objet ou le matériau dont on montre l'icône à côté du texte. */
  toast(text: string, tone?: 'quest' | 'loot', icon?: string): void;
}

/** Fenêtre centrale (boutique, forge, équipement, quêtes). Échap ou un clic à côté la ferment. */
export class PanelHost {
  private readonly backdrop: HTMLDivElement;
  private onClose: (() => void) | null = null;

  constructor(parent: HTMLElement) {
    this.backdrop = h('div', {
      class: 'panel-backdrop',
      onmousedown: (e) => {
        if (e.target === this.backdrop) this.close();
      },
    });
    parent.append(this.backdrop);
  }

  get open(): boolean {
    return this.backdrop.classList.contains('visible');
  }

  show(title: string, subtitle: Node | string | null, body: HTMLElement, options: { onClose?: () => void; wide?: boolean } = {}): void {
    const panel = h(
      'section',
      { class: `panel${options.wide ? ' wide' : ''}` },
      h(
        'header',
        {},
        h('div', { class: 'seal' }, '黄泉'),
        h('div', {}, h('h2', {}, title), subtitle ? h('div', { class: 'subtitle' }, subtitle) : null),
        h('button', { class: 'close', title: 'Fermer (Échap)', onclick: () => this.close() }, '✕'),
      ),
      body,
    );
    // Garde la position de défilement quand on redessine la même fenêtre (achat, équipement…),
    // celle de la fenêtre comme celle des listes marquées data-scroll.
    const scroll = this.backdrop.querySelector('.panel')?.scrollTop ?? 0;
    const inner = new Map([...this.backdrop.querySelectorAll<HTMLElement>('[data-scroll]')].map((el) => [el.dataset.scroll, el.scrollTop]));
    this.backdrop.replaceChildren(panel);
    panel.scrollTop = scroll;
    for (const el of panel.querySelectorAll<HTMLElement>('[data-scroll]')) el.scrollTop = inner.get(el.dataset.scroll) ?? 0;
    this.backdrop.classList.add('visible');
    if (options.onClose) this.onClose = options.onClose;
  }

  close(): void {
    if (!this.open) return;
    this.backdrop.classList.remove('visible');
    this.backdrop.replaceChildren();
    const done = this.onClose;
    this.onClose = null;
    done?.();
  }
}

// --- Petits éléments ----------------------------------------------------------

export function bonusText(bonus: Bonus | undefined): string {
  const parts = (Object.entries(bonus ?? {}) as [BonusKind, number][]).map(([key, value]) => {
    const label = key === 'maxHp' || key === 'damage' ? content.bonuses[key] : content.bonuses[key].toLowerCase();
    return `${bonusValue(key, value)} ${label}`;
  });
  return parts.join(' · ');
}

/** Ce que fait un objet à son niveau de forge, en une ligne (bonus renforcés, paliers atteints). */
function effectText(def: ItemDef, level = 1): string {
  const rules = content.upgrade;
  const upgradable = isUpgradable(rules, def);
  const bonus = upgradable ? scaledBonus(rules, def.bonus, level) : def.bonus;
  const paliers = upgradable ? reachedPaliers(rules, def, level).map((p) => p.name) : [];
  return [def.summary, bonusText(bonus), ...paliers].filter(Boolean).join(' · ') || 'Aucun effet';
}

/** « (niv. 12) » pour une pièce que la forge peut améliorer. */
function levelTag(progress: Progress, id: string): string {
  return isUpgradable(content.upgrade, content.items[id]) ? ` (niv. ${itemLevel(progress.state, id)})` : '';
}

/** Fiche d'objet : son icône à gauche, le texte à droite. */
function itemBlock(id: string, ...children: Child[]): HTMLElement {
  return h('div', { class: 'item' }, icon(id, 'large'), h('div', { class: 'item-body' }, ...children));
}

function cost(progress: Progress, oboles: number, materials: Record<string, number>): { node: HTMLElement; ok: boolean } {
  let ok = progress.state.oboles >= oboles;
  const parts: (HTMLElement | string)[] = [obole(oboles)];
  for (const [id, amount] of Object.entries(materials)) {
    const owned = progress.material(id);
    ok &&= owned >= amount;
    parts.push(h('span', { class: `mat with-icon${owned >= amount ? '' : ' missing'}` }, icon(id, 'small'), `${amount} × ${content.materials[id] ?? id} (${owned})`));
  }
  return { node: h('div', { class: 'cost' }, ...parts), ok };
}

/** Une ligne de butin avec la petite icône de l'objet ou du matériau (coffres, fin de donjon). */
export function lootLine(id: string, text: string): HTMLElement {
  return h('span', { class: 'with-icon' }, icon(id, 'small'), text);
}

function purse(progress: Progress): HTMLElement {
  return h('span', {}, 'Tu as ', obole(progress.state.oboles));
}

function acquire(ctx: UiContext, item: string): void {
  ctx.progress.acquire(item, content.items[item]?.slot);
  ctx.progress.save();
}

/** « +3 », « −18 % » : la valeur d'un bonus seule, pour les comparaisons. */
function bonusValue(key: BonusKind, value: number): string {
  if (key === 'armor') return `−${Math.round(value * 100)} %`;
  if (key === 'speed' || key === 'dodge' || key === 'oboles') return `+${Math.round(value * 100)} %`;
  return `+${value}`;
}

/** Ce que le joueur a choisi dans les fenêtres, gardé d'une ouverture à l'autre. */
const memory = {
  forgeTab: 'upgrade' as 'upgrade' | 'craft',
  /** La forge montre d'abord les pièces portées, les autres sur demande. */
  forgeScope: 'worn' as 'worn' | 'all',
  forgeItem: null as string | null,
  inventorySlot: 'arme' as Slot,
  /** Sections repliables ouvertes ou fermées par le joueur. */
  folds: new Map<string, boolean>(),
};

/** Section repliable : seul son titre se lit, le détail s'ouvre au clic. */
function fold(key: string, openByDefault: boolean, title: string, meta: Node | string | null, ...children: (Node | null)[]): HTMLDetailsElement {
  const details = h(
    'details',
    { class: 'fold', open: memory.folds.get(key) ?? openByDefault },
    h('summary', {}, h('span', { class: 'fold-title' }, title), meta ? h('span', { class: 'fold-meta' }, meta) : null),
    ...children,
  );
  details.addEventListener('toggle', () => memory.folds.set(key, details.open));
  return details;
}

function tabs<T extends string>(options: { id: T; label: string; count?: number }[], current: T, pick: (id: T) => void): HTMLElement {
  return h(
    'div',
    { class: 'tabs', role: 'tablist' },
    ...options.map((o) =>
      h(
        'button',
        { class: `tab${o.id === current ? ' active' : ''}`, role: 'tab', 'aria-selected': String(o.id === current), onclick: () => pick(o.id) },
        o.label,
        o.count ? h('span', { class: 'tab-count' }, String(o.count)) : null,
      ),
    ),
  );
}

// --- Boutique ---------------------------------------------------------------

export function openShop(host: PanelHost, ctx: UiContext, shopId: string): void {
  const shop = content.shops[shopId];
  if (!shop) return;
  const render = () => {
    const { progress } = ctx;
    const { state } = progress;
    const loadout = ctx.loadout();
    const bonusDiscount = shop.discountIf && progress.check(shop.discountIf.if) ? shop.discountIf.discount : 0;
    const discount = 1 - (1 - (shop.discount ?? 0)) * (1 - bonusDiscount);
    const offers = shop.stock
      .filter((entry) => progress.check(entry.if))
      .map(({ item, price }) => ({ item, price, final: Math.round(price * (1 - discount)), owned: progress.has(item) }));
    // Ce qu'on peut acheter d'abord, puis ce qui est trop cher, et ce qu'on a déjà tout en bas.
    const rank = (o: (typeof offers)[number]) => (o.owned ? 2 : state.oboles >= o.final ? 0 : 1);
    offers.sort((a, b) => rank(a) - rank(b) || a.final - b.final);

    const rows = offers.map(({ item, price, final, owned }) => {
      const def = content.items[item];
      const slot = def.slot;
      const worn = slot ? state.equipped[slot] === item : false;
      const missing = final - state.oboles;
      const delta = slot && !worn ? equipDelta(ctx, loadout, item, slot) : [];
      const action = owned
        ? slot && !worn
          ? h(
              'button',
              {
                class: 'btn',
                onclick: () => {
                  progress.equip(item, slot);
                  render();
                },
              },
              'Équiper',
            )
          : h('span', { class: 'badge inline' }, worn ? 'Porté' : 'Possédé')
        : h(
            'button',
            {
              class: `btn${missing <= 0 ? ' primary' : ''}`,
              disabled: missing > 0,
              title: missing > 0 ? `Il te manque ${missing} oboles` : undefined,
              onclick: () => {
                progress.gainOboles(-final);
                acquire(ctx, item);
                ctx.toast(`Acheté : ${def.name}`, 'loot', item);
                render();
              },
            },
            missing > 0 ? `Il manque ${missing}` : 'Acheter',
          );
      return h(
        'div',
        { class: `row offer${owned ? ' owned-offer' : ''}` },
        itemBlock(
          item,
          h(
            'div',
            { class: 'item-head' },
            h('strong', { title: def.description }, def.name),
            h('span', { class: `rarity r-${def.rarity.replace(/\s/g, '-')}` }, def.rarity),
            ...(def.tags ?? []).map((t) => h('span', { class: 'tag' }, t)),
          ),
          h('div', { class: 'item-meta' }, slot ? `${content.slots[slot]} · ${effectText(def, itemLevel(state, item))}` : 'Objet de quête'),
          delta.length ? h('div', { class: 'deltas' }, ...delta.map((d) => h('span', { class: `delta ${d.good ? 'up' : 'down'}` }, d.text))) : null,
        ),
        owned ? h('div') : h('div', { class: 'price' }, discount ? h('s', {}, String(price)) : null, obole(final)),
        action,
      );
    });
    const notes = [
      shop.discount ? `−${Math.round(shop.discount * 100)} % : la récompense de ta victoire.` : null,
      bonusDiscount ? shop.discountIf?.note : null,
    ].filter((n): n is string => Boolean(n));
    host.show(
      shop.name,
      purse(progress),
      h(
        'div',
        { class: 'list' },
        ...notes.map((n) => h('p', { class: 'note' }, n)),
        ...rows,
        h('p', { class: 'note' }, 'Survole un nom pour lire sa description. Les étiquettes vertes et rouges comparent avec ce que tu portes.'),
      ),
    );
  };
  render();
}

// --- Forge ------------------------------------------------------------------

/** Dégâts du coup d'une arme à ce niveau de forge. */
function weaponDamage(ctx: UiContext, def: ItemDef, level: number): number {
  const set = def.effects?.find((e) => e.op === 'set' && e.path === 'attack.damage');
  const base = set ? Number(set.value) : ctx.basePlayer.attack.damage;
  return Math.round(base * weaponPower(content.upgrade, level));
}

interface UpgradePlan {
  to: number;
  oboles: number;
  materials: Record<string, number>;
}

/** Jusqu'où le joueur peut monter une pièce en `times` niveaux au plus, et pour quel prix. Rien n'est dépensé. */
function planUpgrade(progress: Progress, def: ItemDef, from: number, cap: number, times: number): UpgradePlan {
  const plan: UpgradePlan = { to: from, oboles: 0, materials: {} };
  while (plan.to - from < times && plan.to < cap) {
    const c = upgradeCost(content.upgrade, def, plan.to);
    const affordable =
      progress.state.oboles >= plan.oboles + c.oboles &&
      Object.entries(c.materials).every(([m, n]) => progress.material(m) >= (plan.materials[m] ?? 0) + n);
    if (!affordable) break;
    plan.oboles += c.oboles;
    for (const [m, n] of Object.entries(c.materials)) plan.materials[m] = (plan.materials[m] ?? 0) + n;
    plan.to++;
  }
  return plan;
}

function applyUpgrade(ctx: UiContext, id: string, plan: UpgradePlan): void {
  const { progress } = ctx;
  const rules = content.upgrade;
  const def = content.items[id];
  const before = reachedPaliers(rules, def, itemLevel(progress.state, id)).length;
  progress.gainOboles(-plan.oboles);
  for (const [m, n] of Object.entries(plan.materials)) progress.gainMaterial(m, -n);
  progress.state.itemLevels[id] = plan.to;
  progress.save();
  ctx.toast(`${def.name} : niveau ${plan.to}`, 'loot', id);
  for (const p of reachedPaliers(rules, def, plan.to).slice(before)) ctx.toast(`Palier ${p.level} · ${p.name} : ${p.summary}`, 'quest');
}

/** Barre de niveau 1 → 50, avec les paliers et le plafond (le niveau du joueur). */
function levelTrack(def: ItemDef, level: number, cap: number): HTMLElement {
  const max = content.upgrade.maxLevel;
  const at = (n: number) => `left:${((n - 1) / (max - 1)) * 100}%`;
  return h(
    'div',
    { class: 'level-track' },
    h('span', { class: 'track-fill', style: `width:${((level - 1) / (max - 1)) * 100}%` }),
    cap < max ? h('span', { class: 'track-cap', style: at(cap), title: `Plafond : ton niveau (${cap})` }) : null,
    ...paliersOf(content.upgrade, def).map((p) =>
      h('span', { class: `track-mark${p.level <= level ? ' reached' : ''}`, style: at(p.level), title: `Palier ${p.level} · ${p.name}` }),
    ),
  );
}

/** Ce qui change au niveau suivant : une ligne par caractéristique. */
function growthRows(ctx: UiContext, def: ItemDef, level: number): HTMLElement[] {
  if (def.slot === 'arme') {
    // Les dégâts sont arrondis : la puissance montre ce que chaque niveau apporte vraiment (+6 %).
    const power = (n: number) => `+${Math.round((weaponPower(content.upgrade, n) - 1) * 100)} %`;
    return [
      h('dt', {}, 'Puissance de l’arme'),
      h('dd', {}, `${power(level)} → `, h('b', {}, power(level + 1))),
      h('dt', {}, 'Dégâts par coup'),
      h('dd', {}, `${weaponDamage(ctx, def, level)} → `, h('b', {}, String(weaponDamage(ctx, def, level + 1)))),
    ];
  }
  const now = scaledBonus(content.upgrade, def.bonus, level);
  const next = scaledBonus(content.upgrade, def.bonus, level + 1);
  return (Object.keys(now) as BonusKind[]).flatMap((key) => {
    const changes = bonusValue(key, now[key] ?? 0) !== bonusValue(key, next[key] ?? 0);
    return [
      h('dt', {}, content.bonuses[key]),
      h('dd', { class: changes ? '' : 'same' }, changes ? `${bonusValue(key, now[key] ?? 0)} → ` : bonusValue(key, now[key] ?? 0), changes ? h('b', {}, bonusValue(key, next[key] ?? 0)) : null),
    ];
  });
}

/** Fiche de la pièce choisie : où elle en est, ce que donne le niveau suivant, ses paliers et le prix. */
function forgeDetail(ctx: UiContext, id: string, cap: number, rerender: () => void): HTMLElement {
  const { progress } = ctx;
  const rules = content.upgrade;
  const def = content.items[id];
  const level = itemLevel(progress.state, id);
  const worn = progress.state.equipped[def.slot as Slot] === id;
  const maxed = level >= rules.maxLevel;
  const capped = !maxed && level >= cap;
  const one = planUpgrade(progress, def, level, cap, 1);
  const all = planUpgrade(progress, def, level, cap, Infinity);
  const price = maxed || capped ? null : upgradeCost(rules, def, level);
  const priceNode = price ? cost(progress, price.oboles, price.materials) : null;
  const growth = maxed || capped ? [] : growthRows(ctx, def, level);

  const buttons = h(
    'div',
    { class: 'forge-buttons' },
    h(
      'button',
      {
        class: 'btn primary',
        disabled: one.to === level,
        onclick: () => {
          applyUpgrade(ctx, id, one);
          rerender();
        },
      },
      maxed ? 'Niveau maximum' : capped ? 'Plafond atteint' : `Améliorer → niv. ${level + 1}`,
    ),
    all.to > level + 1
      ? h(
          'button',
          {
            class: 'btn',
            title: 'Améliorer tant que tu peux payer, jusqu’à ton niveau',
            onclick: () => {
              applyUpgrade(ctx, id, all);
              rerender();
            },
          },
          `Au max → niv. ${all.to}`,
        )
      : null,
  );

  return h(
    'div',
    { class: 'forge-detail' },
    itemBlock(
      id,
      h(
        'div',
        { class: 'item-head' },
        h('strong', { title: def.description }, def.name),
        h('span', { class: `rarity r-${def.rarity.replace(/\s/g, '-')}` }, def.rarity),
        worn ? h('span', { class: 'badge inline' }, 'Porté') : null,
      ),
      h('div', { class: 'item-meta' }, [content.slots[def.slot as Slot], def.summary].filter(Boolean).join(' · ')),
    ),
    h('div', { class: 'detail-level' }, h('span', {}, `Niveau ${level}`), h('small', {}, ` / ${rules.maxLevel}${cap < rules.maxLevel ? ` · plafond ${cap} (ton niveau)` : ''}`)),
    levelTrack(def, level, cap),
    maxed ? h('p', { class: 'note' }, 'Cette pièce est au niveau maximum.') : null,
    capped ? h('p', { class: 'note danger' }, `Tetsu ne dépasse pas ton niveau (${cap}) : gagne de l’expérience au donjon pour continuer.`) : null,
    growth.length ? h('h3', {}, 'Au niveau suivant') : null,
    growth.length ? h('dl', { class: 'stats compare' }, ...growth) : null,
    def.slot === 'arme' && growth.length ? h('p', { class: 'note' }, 'Frappe fracassante, Bond et foudre suivent les dégâts de l’arme.') : null,
    !growth.length && !maxed && !capped ? h('p', { class: 'note' }, 'Pas de bonus qui monte : la forge lui apporte ses paliers.') : null,
    h('h3', {}, 'Paliers'),
    h(
      'ul',
      { class: 'paliers' },
      ...paliersOf(rules, def).map((p) =>
        h(
          'li',
          { class: p.level <= level ? 'reached' : '' },
          h('b', {}, `Niv. ${p.level}`),
          h('span', {}, h('strong', {}, p.name), ` · ${p.summary}`),
        ),
      ),
    ),
    priceNode ? h('h3', {}, 'Prix du niveau suivant') : null,
    priceNode ? h('div', { class: 'detail-cost' }, priceNode.node) : null,
    all.to > level + 1
      ? h(
          'p',
          { class: 'note' },
          `Au max : niv. ${level} → ${all.to} pour `,
          obole(fr(all.oboles, 0)),
          ...Object.entries(all.materials).map(([m, n]) => ` · ${n} × ${content.materials[m] ?? m}`),
        )
      : null,
    buttons,
  );
}

/** Une ligne de la liste de gauche : nom, niveau, et un repère si une amélioration est payable. */
function forgePick(ctx: UiContext, id: string, cap: number, selected: boolean, showSlot: boolean, rerender: () => void): HTMLElement {
  const { progress } = ctx;
  const def = content.items[id];
  const level = itemLevel(progress.state, id);
  const maxed = level >= content.upgrade.maxLevel;
  const ready = planUpgrade(progress, def, level, cap, 1).to > level;
  const worn = progress.state.equipped[def.slot as Slot] === id;
  return h(
    'button',
    {
      class: `pick${selected ? ' selected' : ''}`,
      title: ready ? 'Amélioration possible' : maxed ? 'Niveau maximum' : level >= cap ? 'Plafond : ton niveau' : 'Pas assez d’oboles ou de matériaux',
      onclick: () => {
        memory.forgeItem = id;
        rerender();
      },
    },
    showSlot ? h('span', { class: 'pick-slot' }, content.slots[def.slot as Slot]) : null,
    h('span', { class: 'pick-name' }, icon(id, 'small'), def.name, worn && !showSlot ? h('i', { class: 'worn-dot', title: 'Porté' }) : null),
    h('span', { class: 'pick-level' }, maxed ? 'max' : `niv. ${level}`),
    h('span', { class: `pick-state${ready ? ' ready' : ''}` }, ready ? '▲' : ''),
  );
}

export function openForge(host: PanelHost, ctx: UiContext): void {
  const render = () => {
    const { progress } = ctx;
    const { state } = progress;
    const rules = content.upgrade;
    const cap = upgradeCap(rules, progress.level);
    const slotOrder = Object.keys(content.slots) as Slot[];
    const upgradable = state.items
      .filter((id) => isUpgradable(rules, content.items[id]))
      .sort((a, b) => slotOrder.indexOf(content.items[a].slot as Slot) - slotOrder.indexOf(content.items[b].slot as Slot));
    const worn = upgradable.filter((id) => state.equipped[content.items[id].slot as Slot] === id);
    const readyCount = upgradable.filter((id) => planUpgrade(progress, content.items[id], itemLevel(state, id), cap, 1).to > itemLevel(state, id)).length;

    const recipes = content.recipes.filter((r) => progress.check(r.if));
    const toForge = recipes.filter((r) => !progress.has(r.item));
    const canForge = (r: (typeof recipes)[number]) => cost(progress, r.oboles, r.materials).ok;
    const craftable = toForge.filter(canForge).length;

    const header = h(
      'div',
      { class: 'forge-top' },
      tabs(
        [
          { id: 'upgrade', label: 'Améliorer', count: readyCount },
          { id: 'craft', label: 'Fabriquer', count: craftable },
        ],
        memory.forgeTab,
        (tab) => {
          memory.forgeTab = tab;
          render();
        },
      ),
      h('span', { class: 'note' }, `Jusqu’à ton niveau : ${cap} / ${rules.maxLevel}`),
    );

    let body: HTMLElement;
    if (memory.forgeTab === 'upgrade') {
      const shown = memory.forgeScope === 'worn' ? worn : upgradable;
      if (!memory.forgeItem || !shown.includes(memory.forgeItem)) memory.forgeItem = shown.find((id) => content.items[id].slot === 'arme') ?? shown[0] ?? null;
      const selected = memory.forgeItem;
      const scope = tabs(
        [
          { id: 'worn', label: `Portés (${worn.length})` },
          { id: 'all', label: `Tout (${upgradable.length})` },
        ],
        memory.forgeScope,
        (s) => {
          memory.forgeScope = s;
          render();
        },
      );
      scope.classList.add('small');

      let list: (HTMLElement | null)[];
      if (memory.forgeScope === 'worn') {
        list = worn.map((id) => forgePick(ctx, id, cap, id === selected, true, render));
      } else {
        // Un groupe repliable par emplacement ; celui de la pièce choisie est ouvert.
        list = slotOrder.map((slot) => {
          const ids = upgradable.filter((id) => content.items[id].slot === slot);
          if (!ids.length) return null;
          const ready = ids.filter((id) => planUpgrade(progress, content.items[id], itemLevel(state, id), cap, 1).to > itemLevel(state, id)).length;
          const holdsSelection = selected !== null && ids.includes(selected);
          return fold(
            `forge-${slot}`,
            holdsSelection,
            content.slots[slot],
            h('span', {}, `${ids.length} pièce${ids.length > 1 ? 's' : ''}`, ready ? h('span', { class: 'ready-count', title: 'Améliorations payables' }, `▲ ${ready}`) : null),
            h('div', { class: 'pick-group' }, ...ids.map((id) => forgePick(ctx, id, cap, id === selected, false, render))),
          );
        });
      }
      body = h(
        'div',
        { class: 'forge' },
        h('div', { class: 'forge-side' }, scope, h('div', { class: 'pick-list', 'data-scroll': 'forge-list' }, ...list)),
        selected ? forgeDetail(ctx, selected, cap, render) : h('p', { class: 'note' }, 'Aucune pièce à améliorer pour le moment.'),
      );
    } else {
      // Ce qui reste à forger, les recettes payables d'abord ; les pièces déjà possédées sont repliées.
      const recipeRow = (recipe: (typeof recipes)[number]) => {
        const def = content.items[recipe.item];
        const price = cost(progress, recipe.oboles, recipe.materials);
        return h(
          'div',
          { class: 'row recipe' },
          itemBlock(
            recipe.item,
            h(
              'div',
              { class: 'item-head' },
              h('strong', { title: def.description }, def.name),
              h('span', { class: `rarity r-${def.rarity.replace(/\s/g, '-')}` }, def.rarity),
              ...(def.tags ?? []).map((t) => h('span', { class: 'tag' }, t)),
            ),
            h('div', { class: 'item-meta' }, `${content.slots[def.slot as Slot]} · ${effectText(def)}`),
          ),
          price.node,
          h(
            'button',
            {
              class: 'btn',
              disabled: !price.ok,
              onclick: () => {
                progress.gainOboles(-recipe.oboles);
                for (const [id, amount] of Object.entries(recipe.materials)) progress.gainMaterial(id, -amount);
                acquire(ctx, recipe.item);
                ctx.toast(`Forgé : ${def.name}`, 'loot', recipe.item);
                render();
              },
            },
            'Forger',
          ),
        );
      };
      const owned = recipes.filter((r) => progress.has(r.item));
      body = h(
        'div',
        { class: 'list' },
        toForge.length ? null : h('p', { class: 'note' }, 'Tu as déjà tout ce que Tetsu sait forger.'),
        ...[...toForge].sort((a, b) => Number(canForge(b)) - Number(canForge(a))).map(recipeRow),
        owned.length
          ? fold('forge-owned', false, 'Déjà possédés', String(owned.length), h('ul', { class: 'plain' }, ...owned.map((r) => h('li', {}, content.items[r.item].name))))
          : null,
      );
    }

    host.show('Forge de Tetsu', purse(progress), h('div', { class: 'forge-panel' }, header, body), { wide: true });
  };
  render();
}

// --- Équipement ---------------------------------------------------------------

/** Ce que change le fait d'équiper un objet : « +12 PV max », « −3 dégâts »… en vert ou en rouge. */
function statDelta(ctx: UiContext, before: Loadout, after: Loadout): { text: string; good: boolean }[] {
  const out: { text: string; good: boolean }[] = [];
  const add = (diff: number, unit: string, label: string, lowerIsBetter = false) => {
    if (!diff) return;
    out.push({ text: `${diff > 0 ? '+' : '−'}${Math.abs(diff)}${unit} ${label}`, good: diff > 0 !== lowerIsBetter });
  };
  const a = before.config;
  const b = after.config;
  const base = ctx.basePlayer;
  add(Math.round(b.maxHp) - Math.round(a.maxHp), '', 'PV max');
  add(Math.round(b.attack.damage) - Math.round(a.attack.damage), '', 'dégâts par coup');
  add(Math.round(((b.moveSpeed - a.moveSpeed) / base.moveSpeed) * 100), ' %', 'vitesse');
  add(Math.round(((b.dodge.distance - a.dodge.distance) / base.dodge.distance) * 100), ' %', 'esquive');
  add(Math.round(((b.damageTakenFactor ?? 1) - (a.damageTakenFactor ?? 1)) * 100), ' %', 'dégâts subis', true);
  add(Math.round((after.bonus.oboles - before.bonus.oboles) * 100), ' %', 'oboles');
  const tag = heroClass(content.skills, ctx.progress.state.hero).tag.name;
  add(after.tagCount - before.tagCount, '', `tag${Math.abs(after.tagCount - before.tagCount) > 1 ? 's' : ''} ${tag}`);
  if (a.kit === 'invocateur') {
    add(b.summon.max - a.summon.max, '', `âme${Math.abs(b.summon.max - a.summon.max) > 1 ? 's' : ''} active${Math.abs(b.summon.max - a.summon.max) > 1 ? 's' : ''}`);
    add(Math.round(b.summon.damage) - Math.round(a.summon.damage), '', 'dégâts des âmes');
    add(Math.round(b.summon.life - a.summon.life), ' s', 'de vie des âmes');
  }
  return out;
}

/** Ce que changerait le fait de porter `id` à la place de l'objet actuel de son emplacement. */
function equipDelta(ctx: UiContext, loadout: Loadout, id: string, slot: Slot): { text: string; good: boolean }[] {
  const { state } = ctx.progress;
  return statDelta(ctx, loadout, buildLoadout(ctx.basePlayer, { ...state, equipped: { ...state.equipped, [slot]: id } }, content, ctx.progress.level));
}

export function openInventory(host: PanelHost, ctx: UiContext): void {
  const render = () => {
    const { progress } = ctx;
    const { state } = progress;
    const loadout = ctx.loadout();
    const cfg = loadout.config;
    const slots = Object.entries(content.slots) as [Slot, string][];
    const owned = state.items.filter((id) => content.items[id]?.slot);
    const ofSlot = (slot: Slot) => owned.filter((id) => content.items[id].slot === slot);
    const current = memory.inventorySlot;

    // À gauche, ce qui est porté : un clic sur un emplacement n'affiche que ses objets à droite.
    const slotButtons = slots.map(([slot, label]) => {
      const id = state.equipped[slot];
      const count = ofSlot(slot).length;
      return h(
        'button',
        {
          class: `slot${id ? '' : ' empty'}${slot === current ? ' selected' : ''}`,
          onclick: () => {
            memory.inventorySlot = slot;
            render();
          },
        },
        h('span', { class: 'slot-label' }, label),
        h('span', { class: 'slot-item' }, id ? icon(id, 'small') : null, id ? content.items[id].name + levelTag(progress, id) : '—'),
        h('span', { class: 'slot-count', title: `${count} objet${count > 1 ? 's' : ''} pour cet emplacement` }, String(count)),
      );
    });

    const cls = heroClass(content.skills, state.hero);
    const choices = ofSlot(current).map((id) => {
      const def = content.items[id];
      const equipped = state.equipped[current] === id;
      // Une arme d'une autre classe se garde (multiclassage à venir) mais ne se manie pas.
      if (!canWield(def, cls)) {
        return h(
          'button',
          { class: 'owned', disabled: true, title: def.description },
          icon(id, 'medium'),
          h(
            'span',
            { class: 'owned-text' },
            h('strong', {}, def.name + levelTag(progress, id)),
            h('small', {}, effectText(def, itemLevel(state, id))),
            h('small', { class: 'tags' }, `Arme de ${def.tags?.join(' · ')} : un ${cls.name} ne sait pas la manier.`),
          ),
        );
      }
      const delta = equipped ? [] : equipDelta(ctx, loadout, id, current);
      return h(
        'button',
        {
          class: `owned${equipped ? ' equipped' : ''}`,
          title: def.description,
          onclick: () => {
            progress.equip(id, current);
            render();
          },
        },
        icon(id, 'medium'),
        h(
          'span',
          { class: 'owned-text' },
          h('strong', {}, def.name + levelTag(progress, id)),
          h('small', {}, effectText(def, itemLevel(state, id))),
          def.tags?.length ? h('small', { class: 'tags' }, def.tags.join(' · ')) : null,
          equipped
            ? null
            : h('span', { class: 'deltas' }, ...(delta.length ? delta.map((d) => h('span', { class: `delta ${d.good ? 'up' : 'down'}` }, d.text)) : [h('span', { class: 'delta' }, 'Mêmes caractéristiques')])),
        ),
        equipped ? h('span', { class: 'badge' }, 'Équipé') : null,
      );
    });

    const tiers = cls.tag.tiers;
    const tagLine = h(
      'div',
      { class: 'tag-tiers' },
      ...tiers.map((t, i) => h('div', { class: `tier${i <= loadout.tier ? ' active' : ''}` }, h('b', {}, `(${t.count})`), ` ${t.description}`)),
    );

    const stats = h(
      'dl',
      { class: 'stats' },
      h('dt', {}, 'Niveau'),
      h('dd', {}, String(loadout.level)),
      h('dt', {}, 'PV max'),
      h('dd', {}, String(Math.round(cfg.maxHp))),
      h('dt', {}, 'Dégâts par coup'),
      h('dd', {}, String(cfg.attack.damage)),
      h('dt', {}, 'Vitesse'),
      h('dd', {}, `${Math.round((cfg.moveSpeed / ctx.basePlayer.moveSpeed) * 100)} %`),
      h('dt', {}, 'Esquive'),
      h('dd', {}, `${Math.round((cfg.dodge.distance / ctx.basePlayer.dodge.distance) * 100)} %`),
      h('dt', {}, 'Dégâts subis'),
      h('dd', {}, `${Math.round((cfg.damageTakenFactor ?? 1) * 100)} %`),
      loadout.bonus.oboles ? h('dt', {}, 'Oboles gagnées') : null,
      loadout.bonus.oboles ? h('dd', {}, `+${Math.round(loadout.bonus.oboles * 100)} %`) : null,
      ...(cfg.kit === 'invocateur'
        ? [
            h('dt', {}, 'Âmes actives'),
            h('dd', {}, String(cfg.summon.max)),
            h('dt', {}, 'Dégâts d’une âme'),
            h('dd', {}, String(Math.round(cfg.summon.damage * (cfg.perks?.summonDamageFactor ?? 1)))),
            h('dt', {}, 'Vie d’une âme'),
            h('dd', {}, `${Math.round(cfg.summon.life)} s`),
          ]
        : []),
    );

    const materials = Object.entries(content.materials).filter(([id]) => progress.material(id) > 0);
    const questItems = state.items.filter((id) => !content.items[id]?.slot);
    const top = tiers[tiers.length - 1].count;

    host.show(
      'Équipement',
      h('span', {}, purse(progress), ` · ${state.chests} coffre${state.chests > 1 ? 's' : ''} à ouvrir sur la barque`),
      h(
        'div',
        { class: 'inventory' },
        h(
          'div',
          { class: 'col' },
          h('h3', {}, 'Porté'),
          h('div', { class: 'slots' }, ...slotButtons),
          fold('inv-stats', true, 'Caractéristiques', `${Math.round(cfg.maxHp)} PV · ${cfg.attack.damage} dégâts`, stats),
          fold('inv-tags', false, 'Tags de classe', `${cls.tag.name} ${loadout.tagCount} / ${top}`, tagLine),
          fold(
            'inv-materials',
            false,
            'Matériaux',
            materials.length ? String(materials.reduce((sum, [id]) => sum + progress.material(id), 0)) : 'aucun',
            materials.length
              ? h('div', { class: 'chips' }, ...materials.map(([id, name]) => h('span', { class: 'chip' }, icon(id, 'small'), name, h('b', {}, `× ${progress.material(id)}`))))
              : h('p', { class: 'note' }, 'Les ennemis des Rizières noyées en laissent tomber.'),
          ),
          questItems.length
            ? fold(
                'inv-quest',
                false,
                'Objets de quête',
                String(questItems.length),
                h('div', { class: 'chips' }, ...questItems.map((id) => h('span', { class: 'chip', title: content.items[id]?.description ?? '' }, icon(id, 'small'), content.items[id]?.name ?? id))),
              )
            : null,
        ),
        h(
          'div',
          { class: 'col' },
          h('h3', {}, `${content.slots[current]} · ${choices.length} objet${choices.length > 1 ? 's' : ''}`),
          choices.length
            ? h('div', { class: 'owned-list', 'data-scroll': 'inventory-list' }, ...choices)
            : h('p', { class: 'note' }, 'Aucun objet pour cet emplacement. Tetsu en forge, le tanuki en vend, et les yokai en laissent tomber.'),
          choices.length
            ? h('p', { class: 'note' }, current === 'arme' ? 'Clique sur une arme pour la prendre en main.' : 'Clique sur un objet pour l’équiper ; clique sur l’objet porté pour le retirer.')
            : null,
        ),
      ),
      { wide: true },
    );
  };
  render();
}

// --- Arbre de compétences -------------------------------------------------------

export function openSkills(host: PanelHost, ctx: UiContext): void {
  const skills = content.skills;
  const render = () => {
    const { progress } = ctx;
    const { state } = progress;
    const points = progress.skillPoints;
    const xp = levelProgress(skills, state.xp);
    const cls = heroClass(skills, state.hero);
    const race = heroRace(skills, state.hero);
    const parent = state.hero.parent ? race.parents?.[state.hero.parent] : undefined;

    const branches = cls.branches.map((branch) =>
      h(
        'div',
        { class: 'branch' },
        h('h3', {}, branch.name),
        h('div', { class: 'branch-sub' }, branch.subtitle),
        h('p', { class: 'branch-lore' }, branch.lore),
        ...branch.nodes.map((node, i) => {
          const learned = state.talents.includes(node.id);
          const available = canLearn(skills, state, node.id, points);
          return h(
            'button',
            {
              class: `node${learned ? ' learned' : available ? ' available' : ' locked'}${node.ultimate ? ' ultimate' : ''}`,
              disabled: !available,
              onclick: () => {
                state.talents.push(node.id);
                progress.save();
                ctx.toast(`Talent appris : ${node.name}`, 'quest');
                render();
              },
            },
            h('span', { class: 'node-rank' }, node.ultimate ? 'Ultime' : `Rang ${i + 1}`),
            h('strong', {}, node.name),
            h('small', {}, node.description),
          );
        }),
      ),
    );

    const header = h(
      'div',
      { class: 'skills-header' },
      h(
        'div',
        {},
        h('strong', {}, `${cls.name} · ${cls.subtitle}`),
        h('div', { class: 'note' }, `${race.name}${parent ? `, enfant de ${parent.name}` : ''} (${race.origin})`),
      ),
      h(
        'div',
        { class: 'xp' },
        h('div', {}, `Niveau ${xp.level}${xp.needed ? ` · ${xp.into} / ${xp.needed} XP` : ' · maximum'}`),
        h('div', { class: 'xp-bar' }, h('div', { class: 'xp-fill', style: `width:${xp.needed ? (xp.into / xp.needed) * 100 : 100}%` })),
        h('div', { class: `points${points ? ' has' : ''}` }, `${points} point${points > 1 ? 's' : ''} à dépenser`),
      ),
    );

    const passives = h(
      'div',
      { class: 'passives' },
      ...racePassives(skills, state.hero).map((p) => h('div', {}, h('strong', {}, p.name), h('small', {}, p.description))),
      ...cls.actives.map((a) => h('div', {}, h('strong', {}, h('kbd', {}, a.key), ` ${a.name}`), h('small', {}, a.description))),
    );

    host.show(
      'Arbre de compétences',
      `1 point par niveau jusqu’au niveau ${skills.levels.pointsUntil} · les nœuds d’une branche s’apprennent dans l’ordre · réinitialisation gratuite sur la barque de Charon`,
      h('div', { class: 'list' }, header, h('div', { class: 'tree' }, ...branches), h('h3', {}, 'Passifs et compétences'), passives),
      { wide: true },
    );
  };
  render();
}

// --- Quêtes -----------------------------------------------------------------

export function questObjective(progress: Progress, id: string): string {
  const quest = content.quests[id];
  return progress.format(quest?.objectives.find((o) => progress.check(o.if))?.text ?? '');
}

/** La quête à suivre dans le coin de l'écran : d'abord les principales. */
export function trackedQuest(progress: Progress): { name: string; objective: string } | null {
  const active = Object.entries(content.quests).filter(([id]) => progress.quest(id) === 'active');
  const main = active.find(([, q]) => q.type === 'Principale') ?? active[0];
  if (!main) return null;
  return { name: main[1].name, objective: questObjective(progress, main[0]) };
}

export function openQuests(host: PanelHost, ctx: UiContext): void {
  const { progress } = ctx;
  const entries = Object.entries(content.quests).filter(([id]) => progress.quest(id) !== 'none');
  const active = entries.filter(([id]) => progress.quest(id) === 'active');
  const done = entries.filter(([id]) => progress.quest(id) === 'done');
  const card = ([id, quest]: (typeof entries)[number], finished: boolean) =>
    h(
      'div',
      { class: `quest${finished ? ' done' : ''}` },
      h('div', { class: 'item-head' }, h('strong', {}, quest.name), h('span', { class: `rarity r-${quest.type.toLowerCase()}` }, quest.type)),
      h('p', {}, finished ? 'Terminée.' : questObjective(progress, id)),
    );
  host.show(
    'Journal de quêtes',
    `${done.length} terminée${done.length > 1 ? 's' : ''} sur ${Object.keys(content.quests).length}`,
    h(
      'div',
      { class: 'list' },
      active.length ? null : h('p', { class: 'note' }, 'Aucune quête en cours. Parle aux habitants de l’île.'),
      ...active.map((e) => card(e, false)),
      done.length ? h('h3', {}, 'Terminées') : null,
      ...done.map((e) => card(e, true)),
    ),
  );
}

// --- Entrée du donjon -----------------------------------------------------------

/**
 * Choix du niveau des Rizières noyées (GDD : « Difficulté à l'entrée », comme dans Waven).
 * Seuls les niveaux déjà ouverts sont proposés ; vaincre la Jorōgumo ouvre le suivant.
 */
export function openDungeonEntry(host: PanelHost, ctx: UiContext, onEnter: (level: number) => void): void {
  const data = content.difficulty;
  const { progress } = ctx;
  const unlocked = clampLevel(data, progress.state.dungeon.unlocked);
  const playerLevel = progress.level;
  let level = Math.min(unlocked, Math.max(1, playerLevel));

  const slider = h('input', { type: 'range', min: '1', max: String(unlocked), value: String(level), 'aria-label': 'Niveau du donjon' });
  const value = h('strong', { class: 'level-value' });
  const details = h('div', { class: 'entry-details' });
  const set = (n: number) => {
    level = clampLevel(data, Math.min(unlocked, n));
    slider.value = String(level);
    update();
  };
  slider.addEventListener('input', () => set(Number(slider.value)));

  const update = () => {
    const d = difficultyFor(data, level);
    const r = rewardsFor(data, level);
    const curses = activeCurses(data, level);
    const next = nextCurse(data, level);
    value.textContent = `Niveau ${level}`;
    const parts: (HTMLElement | null)[] = [
      level > playerLevel + 5 ? h('p', { class: 'note danger' }, `Dangereux pour ton niveau (${playerLevel}) : améliore ton équipement chez Tetsu avant de descendre si bas.`) : null,
      h(
        'div',
        { class: 'entry-cols' },
        h(
          'dl',
          { class: 'stats' },
          h('dt', {}, 'PV des yokai'),
          h('dd', {}, `×${fr(d.hp)}`),
          h('dt', {}, 'Dégâts des yokai'),
          h('dd', {}, `×${fr(d.damage)}`),
        ),
        h(
          'dl',
          { class: 'stats' },
          h('dt', {}, 'Oboles'),
          h('dd', {}, `×${fr(r.oboles)}`),
          h('dt', {}, 'Expérience'),
          h('dd', {}, `×${fr(r.xp)}`),
          h('dt', {}, 'Butin rare'),
          h('dd', {}, `×${fr(r.rareChance)}`),
          h('dt', {}, 'Matériaux par drop'),
          h('dd', {}, `+${r.extraMaterials}`),
        ),
      ),
      h('h3', {}, 'Malédictions du Yomi'),
      curses.length
        ? h('div', { class: 'curses' }, ...curses.map((c) => h('div', { class: 'curse' }, h('strong', {}, c.name), h('small', {}, c.description))))
        : h('p', { class: 'note' }, 'Aucune malédiction à ce niveau.'),
      next ? h('p', { class: 'note' }, `Au niveau ${next.from} : ${next.name}. ${next.description}`) : null,
    ];
    details.replaceChildren(...parts.filter((p): p is HTMLElement => p !== null));
  };

  const quick = [
    { label: 'Niveau 1', level: 1 },
    playerLevel > 1 && playerLevel < unlocked ? { label: `Ton niveau (${playerLevel})`, level: playerLevel } : null,
    unlocked > 1 ? { label: `Le plus haut (${unlocked})`, level: unlocked } : null,
  ].filter((q): q is { label: string; level: number } => q !== null);

  const best = progress.state.dungeon.best;
  host.show(
    'Rizières noyées',
    best ? `Record : niveau ${best} · niveaux ouverts : 1 à ${unlocked} sur ${data.maxLevel}` : `Vaincs la Jorōgumo pour ouvrir le niveau 2 (jusqu’à ${data.maxLevel}).`,
    h(
      'div',
      { class: 'list' },
      h(
        'div',
        { class: 'level-picker' },
        h('button', { class: 'btn small', onclick: () => set(level - 1) }, '−'),
        slider,
        h('button', { class: 'btn small', onclick: () => set(level + 1) }, '+'),
        value,
      ),
      h('div', { class: 'row-pills' }, ...quick.map((q) => h('button', { class: 'btn small', onclick: () => set(q.level) }, q.label))),
      details,
      h(
        'div',
        { class: 'entry-actions' },
        h(
          'button',
          {
            class: 'btn primary',
            onclick: () => {
              host.close();
              onEnter(level);
            },
          },
          'Descendre',
        ),
      ),
    ),
  );
  update();
}

// --- Butin ------------------------------------------------------------------

export function openLoot(host: PanelHost, title: string, lines: (string | Node)[], onClose?: () => void): void {
  host.show(title, null, h('div', { class: 'list' }, h('ul', { class: 'loot' }, ...lines.map((l) => h('li', {}, l)))), { onClose });
}
