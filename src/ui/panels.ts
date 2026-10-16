import { content, type DungeonDef } from '../content';
import type { PlayerConfig } from '../game/config';
import { activeCurses, clampLevel, dungeonDifficultyFor, nextCurse, rewardsFor, unlockAfter } from '../game/difficulty';
import { isUpgradable, paliersOf, reachedPaliers, scaledBonus, upgradeCap, upgradeCost, weaponPower } from '../game/forge';
import {
  buildLoadout,
  canLearn,
  classUpgrade,
  equipBlock,
  heroClass,
  heroRace,
  heroSubclass,
  itemLevel,
  levelProgress,
  racePassives,
  raceNames,
  type Bonus,
  type BonusKind,
  type ItemDef,
  type Loadout,
  type SubclassDef,
} from '../game/loadout';
import { gravureCost, gravureLineDef, gravureLineText, gravureNeedsSeal, gravureRank, gravureSealText, rankOdds, rollGravure, type Gravure, type GravureData } from '../game/gravure';
import type { EndlessModifierSeed } from '../game/infini';
import { salvage, type RolledOffer } from '../game/loot';
import { breakSeal, meltStock, poseGravure, takeOut } from '../game/reserve';
import { applyBuild, BUILD_COUNT, DUEL_SLOTS, extraSlots, fitsHero, missingItems, saveBuild, saveDuelBuild, snapshot, type Build } from '../game/builds';
import { markSeen, readJournal, seenItems } from '../game/journal';
import { STOCK_MAX, SUBCLASS_LEVEL, type Progress, type Slot } from '../game/progress';
import { keyName, withKeys } from '../keys';
import { h, icon, obole, type Child } from './dom';
import { livePanel } from './social';
import type { SocialClient } from '../net/social';

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

  /** Le panneau affiché, pour y chercher un élément après un rendu. */
  get root(): HTMLElement {
    return this.backdrop;
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
    const label = key === 'maxHp' ? content.bonuses[key] : content.bonuses[key].toLowerCase();
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
  const conditional = (def.conditional ?? []).map((c) => c.summary);
  return [def.summary, bonusText(bonus), ...conditional, ...paliers].filter(Boolean).join(' · ') || 'Aucun effet';
}

/** « Réservé à la race Hanyō. » : ce qui empêche le héros de porter l'objet, ou null. */
function blockText(progress: Progress, def: ItemDef): string | null {
  return equipBlock(def, progress.state.hero, content.skills);
}

/** Rôle d'un objet pour sa classe, en une étiquette. */
const SPEC_NAMES = { dps: 'DPS', survie: 'Survie', boss: 'Boss' } as const;

/** Étiquettes d'un objet : ses tags de classe, son rôle, la race à qui il est réservé. */
function itemTags(def: ItemDef): string[] {
  return [...(def.tags ?? []), ...(def.spec ? [SPEC_NAMES[def.spec]] : []), ...(def.races?.length ? [raceNames(content.skills, def)] : [])];
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
  const sign = (n: number) => (n < 0 ? `−${-n}` : `+${n}`);
  if (key === 'armor') return `−${Math.round(value * 100)} %`;
  if (key === 'maxHp') return sign(value);
  return `${sign(Math.round(value * 100))} %`;
}

/**
 * Rayon d'objets, dans l'inventaire et la forge : `mine` (ce que le héros peut porter parmi les objets de sa classe,
 * les universels et ceux de sa race), une classe (son identifiant), `universel` ou `racial`. Les objets d'une autre
 * classe, ou qu'il ne peut pas porter, n'apparaissent que dans le rayon de leur classe ou de leur race.
 */
type Shelf = string;
const MINE: Shelf = 'mine';
const UNIVERSAL: Shelf = 'universel';
const RACIAL: Shelf = 'racial';

/** Classes d'un objet, d'après ses tags (« Guerrier », « Rôdeur » ; « Tous » ou rien : universel). */
function itemClasses(def: ItemDef): string[] {
  const byName = new Map(Object.entries(content.skills.classes).map(([id, cls]) => [cls.name, id]));
  return (def.tags ?? []).map((tag) => byName.get(tag)).filter((id): id is string => id !== undefined);
}

function onShelf(progress: Progress, def: ItemDef, shelf: Shelf): boolean {
  if (shelf === MINE) {
    // Sa classe, les objets universels et ceux de sa race ; une pièce taguée pour une autre classe reste dans son rayon.
    const classes = itemClasses(def);
    return blockText(progress, def) === null && (classes.length === 0 || classes.includes(progress.state.hero.class));
  }
  if (shelf === RACIAL) return Boolean(def.races?.length);
  if (shelf === UNIVERSAL) return !def.races?.length && itemClasses(def).length === 0;
  return itemClasses(def).includes(shelf);
}

/**
 * Onglets des rayons qui ont au moins un objet parmi `ids` (« Ma classe » toujours en premier). La classe du héros
 * n'a pas d'onglet à elle : c'est « Ma classe ».
 */
function shelfTabs(progress: Progress, ids: string[], current: Shelf, pick: (shelf: Shelf) => void, extra: { id: string; label: string; count?: number }[] = []): HTMLElement {
  const own = progress.state.hero.class;
  const count = (shelf: Shelf) => ids.filter((id) => onShelf(progress, content.items[id], shelf)).length;
  const classes = Object.entries(content.skills.classes)
    .filter(([id]) => id !== own)
    .map(([id, cls]) => ({ id, label: cls.name, count: count(id) }));
  const options = [
    ...extra,
    { id: MINE, label: `Ma classe · ${content.skills.classes[own]?.name ?? own}`, count: count(MINE) },
    ...classes,
    { id: UNIVERSAL, label: 'Universels', count: count(UNIVERSAL) },
    { id: RACIAL, label: 'Raciaux', count: count(RACIAL) },
  ].filter((o) => o.id === MINE || o.id === current || extra.includes(o) || o.count);
  const bar = tabs(options, current, pick);
  bar.classList.add('shelves');
  return bar;
}

/** Les objets de `ids` rangés par emplacement, dans l'ordre des emplacements. */
function bySlot(ids: string[]): [Slot, string[]][] {
  return (Object.keys(content.slots) as Slot[]).map((slot): [Slot, string[]] => [slot, ids.filter((id) => content.items[id]?.slot === slot)]).filter(([, list]) => list.length);
}

/** Ce que le joueur a choisi dans les fenêtres, gardé d'une ouverture à l'autre. */
const memory = {
  forgeTab: 'upgrade' as 'upgrade' | 'craft' | 'gravure' | 'eveil',
  /** La forge montre d'abord les pièces portées (`worn`), sinon un rayon. */
  forgeScope: 'worn' as Shelf,
  /** Rayon de l'onglet Fabriquer. */
  craftShelf: MINE,
  /** Rayon de l'inventaire : à l'ouverture, ce que le héros peut porter. */
  inventoryShelf: MINE,
  forgeItem: null as string | null,
  /** L'arme choisie dans l'onglet Gravure. */
  gravureItem: null as string | null,
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

/**
 * Boutique. `rolled` : l'offre tirée au hasard d'une boutique à `pool` (fin de donjon), qui peut
 * mêler objets et lots de matériaux ; sans elle, le stock fixe de la boutique.
 */
export function openShop(host: PanelHost, ctx: UiContext, shopId: string, rolled?: RolledOffer[]): void {
  const shop = content.shops[shopId];
  if (!shop) return;
  const render = () => {
    const { progress } = ctx;
    const { state } = progress;
    const loadout = ctx.loadout();
    const bonusDiscount = shop.discountIf && progress.check(shop.discountIf.if) ? shop.discountIf.discount : 0;
    const discount = 1 - (1 - (shop.discount ?? 0)) * (1 - bonusDiscount);
    const priced = (price: number) => Math.round(price * (1 - discount));
    const entries: RolledOffer[] = rolled ?? (shop.stock ?? []).filter((entry) => progress.check(entry.if)).map(({ item, price }) => ({ item, price }));
    const offers = entries
      .filter((o): o is Extract<RolledOffer, { item: string }> => o.item !== undefined)
      .map(({ item, price }) => ({ item, price, final: priced(price), owned: progress.has(item) }));
    // Ce qu'on peut acheter d'abord, puis ce qui est trop cher, et ce qu'on a déjà tout en bas.
    const rank = (o: (typeof offers)[number]) => (o.owned ? 2 : state.oboles >= o.final ? 0 : 1);
    offers.sort((a, b) => rank(a) - rank(b) || a.final - b.final);
    const bundles = entries.filter((o): o is Extract<RolledOffer, { material: string }> => o.material !== undefined);

    const bundleRow = (offer: (typeof bundles)[number]) => {
      const final = priced(offer.price);
      const missing = final - state.oboles;
      const name = content.materials[offer.material] ?? offer.material;
      return h(
        'div',
        { class: `row offer${offer.sold ? ' owned-offer' : ''}` },
        itemBlock(
          offer.material,
          h('div', { class: 'item-head' }, h('strong', {}, `${offer.count} × ${name}`), h('span', { class: 'rarity' }, 'Ressource')),
          h('div', { class: 'item-meta' }, `Matériau de forge · tu en as ${progress.material(offer.material)}`),
        ),
        offer.sold ? h('div') : h('div', { class: 'price' }, discount ? h('s', {}, String(offer.price)) : null, obole(final)),
        offer.sold
          ? h('span', { class: 'badge inline' }, 'Acheté')
          : h(
              'button',
              {
                class: `btn${missing <= 0 ? ' primary' : ''}`,
                disabled: missing > 0,
                title: missing > 0 ? `Il te manque ${missing} oboles` : undefined,
                onclick: () => {
                  progress.gainOboles(-final);
                  progress.gainMaterial(offer.material, offer.count);
                  progress.save();
                  offer.sold = true;
                  ctx.toast(`Acheté : ${offer.count} × ${name}`, 'loot', offer.material);
                  render();
                },
              },
              missing > 0 ? `Il manque ${missing}` : 'Acheter',
            ),
      );
    };

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
            ...itemTags(def).map((t) => h('span', { class: 'tag' }, t)),
          ),
          h('div', { class: 'item-meta' }, slot ? `${content.slots[slot]} · ${effectText(def, itemLevel(state, item))}` : 'Objet de quête'),
          blockText(ctx.progress, def) ? h('div', { class: 'item-meta note danger' }, blockText(ctx.progress, def)) : null,
          delta.length ? h('div', { class: 'deltas' }, ...delta.map((d) => h('span', { class: `delta ${d.good ? 'up' : 'down'}` }, d.text))) : null,
        ),
        owned ? h('div') : h('div', { class: 'price' }, discount ? h('s', {}, String(price)) : null, obole(final)),
        action,
      );
    });
    const notes = [
      shop.discount ? `−${Math.round(shop.discount * 100)} % : la récompense de ta victoire.` : null,
      rolled ? 'L’étal change à chaque victoire : ce qui n’est pas acheté repart avec le marchand.' : null,
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
        ...bundles.map(bundleRow),
        h('p', { class: 'note' }, 'Survole un nom pour lire sa description. Les étiquettes vertes et rouges comparent avec ce que tu portes.'),
      ),
    );
  };
  render();
}

// --- Forge ------------------------------------------------------------------

/** Règles de forge des armes pour le héros : sa classe peut tirer plus de puissance de la forge (Sorcier). */
function heroUpgrade(ctx: UiContext) {
  return classUpgrade(content.upgrade, heroClass(content.skills, ctx.progress.state.hero));
}

/** Dégâts du coup d'une arme à ce niveau de forge. */
function weaponDamage(ctx: UiContext, def: ItemDef, level: number): number {
  const set = def.effects?.find((e) => e.op === 'set' && e.path === 'attack.damage');
  const base = set ? Number(set.value) : ctx.basePlayer.attack.damage;
  return Math.round(base * weaponPower(heroUpgrade(ctx), level));
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
    const power = (n: number) => `+${Math.round((weaponPower(heroUpgrade(ctx), n) - 1) * 100)} %`;
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
  const gravure = def.slot === 'arme' ? progress.gravure(id) : undefined;
  const gravureName = gravure ? gravureRank(content.gravures, gravure)?.name : undefined;
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
    gravureName ? h('p', { class: 'note' }, `Gravure ${gravureName} · voir l’onglet Graver.`) : null,
    growth.length ? h('h3', {}, 'Au niveau suivant') : null,
    growth.length ? h('dl', { class: 'stats compare' }, ...growth) : null,
    def.slot === 'arme' && growth.length ? h('p', { class: 'note' }, 'Les compétences de ta classe et la foudre suivent les dégâts de l’arme.') : null,
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

// --- Gravure (riven) ----------------------------------------------------------

/**
 * Ce que coûte la prochaine gravure d'une arme, et si le joueur peut la payer. `sealed` : l'arme n'a jamais été gravée,
 * donc rien à vendre — sa première gravure s'arrache au sceau du Yomi (voir `rollSeal`, dans gravure.ts).
 */
function gravurePrice(progress: Progress, id: string): { oboles: number; materials: Record<string, number>; ok: boolean; sealed: boolean } {
  const rolls = progress.gravureRolls(id);
  const price = gravureCost(content.gravures, rolls);
  const sealed = gravureNeedsSeal(rolls);
  const ok = !sealed && progress.state.oboles >= price.oboles && Object.entries(price.materials).every(([m, n]) => progress.material(m) >= n);
  return { ...price, ok, sealed };
}

/** Une arme de la liste des gravures : son nom, et son rang s'il y en a un. */
function gravurePick(ctx: UiContext, id: string, selected: boolean, rerender: () => void): HTMLElement {
  const def = content.items[id];
  const gravure = ctx.progress.gravure(id);
  const rank = gravure ? gravureRank(content.gravures, gravure) : undefined;
  return h(
    'button',
    {
      class: `pick${selected ? ' selected' : ''}`,
      title: rank?.summary,
      onclick: () => {
        memory.gravureItem = id;
        rerender();
      },
    },
    h('span', { class: 'pick-name' }, icon(id, 'small'), def.name, ctx.progress.state.equipped.arme === id ? h('i', { class: 'worn-dot', title: 'Portée' }) : null),
    h('span', { class: 'pick-level' }, rank ? rank.name : '—'),
  );
}

/**
 * Une gravure : son rang, ses lignes — la contrepartie se lit en rouge —, les chances de chaque rang, et le tirage
 * suivant. Le bouton prélève le prix et remplace la gravure en place : c'est un pari, et le texte le dit.
 */
function gravureDetail(ctx: UiContext, id: string, rerender: () => void): HTMLElement {
  const { progress } = ctx;
  const data: GravureData = content.gravures;
  const def = content.items[id];
  const gravure = progress.gravure(id);
  const rank = gravure ? gravureRank(data, gravure) : undefined;
  const rolls = progress.gravureRolls(id);
  const price = gravurePrice(progress, id);

  const lines = gravure
    ? gravure.lines.flatMap((line) => {
        const lineDef = gravureLineDef(data, line.id);
        if (!lineDef) return [];
        const contre = lineDef.kind === 'contrepartie';
        return [
          h(
            'li',
            { class: `gravure-line${contre ? ' contrepartie' : ''}`, title: lineDef.name },
            contre ? `Contrepartie · ${lineDef.summary}` : gravureLineText(line, lineDef),
          ),
        ];
      })
    : [];

  return h(
    'div',
    { class: 'gravure' },
    h(
      'div',
      { class: 'gravure-head' },
      h('span', { class: 'gravure-rank' }, rank ? rank.name : 'Aucune gravure'),
      h('span', { class: 'note' }, rolls ? `${rolls} tirage${rolls > 1 ? 's' : ''} déjà fait${rolls > 1 ? 's' : ''}` : 'Jamais gravée'),
    ),
    h(
      'p',
      { class: 'note' },
      rank?.summary ?? (price.sealed ? gravureSealText(data.sceau) : `Tetsu trempe la lame dans la poussière du Yomi : ce qui monte sur l’acier, personne ne le choisit. Le rang le plus courant ne donne que deux lignes basses.`),
    ),
    lines.length ? h('ul', { class: 'gravure-lines' }, ...lines) : null,
    h('div', { class: 'gravure-odds' }, 'Rangs : ', rankOdds(data).map((o) => `${o.name} ${Math.round(o.chance * 100)} %`).join(' · ')),
    h('p', { class: 'note' }, 'Le tirage remplace la gravure en place, et son prix monte à chaque relance. La soie de jorōgumo ne tombe que sur la Jorōgumo.'),
    // La première gravure d'une arme ne s'achète pas : pas de prix à montrer, et le bouton reste fermé.
    ...(price.sealed
      ? [
          h('button', { class: 'btn', disabled: true, title: data.sceau.summary }, `${data.sceau.name} requis`),
        ]
      : [
          cost(progress, price.oboles, price.materials).node,
          h(
            'button',
            {
              class: 'btn primary',
              disabled: !price.ok,
              title: gravure ? 'Remplacera la gravure actuelle' : 'Pose une première gravure sur cette arme',
              onclick: () => {
                progress.gainOboles(-price.oboles);
                for (const [m, n] of Object.entries(price.materials)) progress.gainMaterial(m, -n);
                const drawn = rollGravure(data, def.tags ?? []);
                progress.setGravure(id, drawn);
                ctx.toast(`${def.name} · ${gravureRank(data, drawn)?.name ?? 'gravure'}`, 'loot', id);
                for (const line of drawn.lines) {
                  const lineDef = gravureLineDef(data, line.id);
                  if (!lineDef) continue;
                  const contre = lineDef.kind === 'contrepartie';
                  ctx.toast(contre ? `Contrepartie · ${lineDef.summary}` : gravureLineText(line, lineDef), contre ? 'quest' : 'loot');
                }
                rerender();
              },
            },
            gravure ? 'Relancer le tirage' : 'Graver l’arme',
          ),
        ]),
  );
}

/** Onglet Gravure : les armes à gauche, le tirage de celle qu'on regarde à droite. */
function gravureBody(ctx: UiContext, rerender: () => void): HTMLElement {
  const weapons = ctx.progress.state.items.filter((id) => content.items[id]?.slot === 'arme');
  if (!memory.gravureItem || !weapons.includes(memory.gravureItem)) memory.gravureItem = weapons[0] ?? null;
  const selected = memory.gravureItem;
  return h(
    'div',
    { class: 'forge' },
    h(
      'div',
      { class: 'forge-side' },
      h(
        'div',
        { class: 'pick-list', 'data-scroll': 'gravure-list' },
        ...(weapons.length ? weapons.map((id) => gravurePick(ctx, id, id === selected, rerender)) : [h('p', { class: 'note' }, 'Aucune arme à graver.')]),
      ),
    ),
    selected ? gravureDetail(ctx, selected, rerender) : h('p', { class: 'note' }, 'Aucune arme dans ton sac.'),
  );
}

/** Ce que l'éveil charge sur le héros, en clair : « +20 PV max, +4 % de dégâts » (forge.eveil, bonus). */
function eveilCharge(bonus: { maxHp?: number; damage?: number }): string {
  const parts: string[] = [];
  if (bonus.maxHp) parts.push(`+${bonus.maxHp} PV max`);
  if (bonus.damage) parts.push(`+${Math.round(bonus.damage * 100)} % de dégâts`);
  return parts.join(', ');
}

/** L'onglet Éveil des Tablettes : une relique possédée par ligne, éveillée ou à éveiller. */
function eveilBody(ctx: UiContext, rerender: () => void): HTMLElement {
  const { progress } = ctx;
  const rules = content.eveil;
  const [matId, matCount] = rules.material;
  const materials: Record<string, number> = { [matId]: matCount };
  const relics = progress.state.items.filter((id) => content.items[id]?.slot === 'relique');
  const atMax = (id: string) => progress.eveil(id) >= rules.max;
  return h(
    'div',
    { class: 'list' },
    h(
      'p',
      { class: 'note' },
      `${matCount} × ${content.materials[matId] ?? matId} et ${rules.oboles} oboles éveillent une relique : portée, elle gagne le pouvoir écrit sous son nom. Les Éclats tombent sur le boss de chaque bloc du Yomi sans fond, dès le palier 50.`,
    ),
    ...(relics.length
      ? relics.map((id) => {
          const def = content.items[id];
          const price = cost(progress, rules.oboles, materials);
          return h(
            'div',
            { class: 'row recipe' },
            itemBlock(
              id,
              h(
                'div',
                { class: 'item-head' },
                h('strong', { title: def.description }, def.name),
                ...itemTags(def).map((t) => h('span', { class: 'tag' }, t)),
              ),
              h('div', { class: 'item-meta' }, `Relique · ${def.summary ?? def.description}`),
              h('div', { class: 'eveil-power' }, `Éveil : ${def.eveil?.summary ?? eveilCharge(rules.bonus)}`),
            ),
            atMax(id) ? h('span', { class: 'note' }, 'Éveillée') : price.node,
            atMax(id)
              ? null
              : h(
                  'button',
                  {
                    class: 'btn',
                    disabled: !price.ok,
                    onclick: () => {
                      progress.gainOboles(-rules.oboles);
                      progress.gainMaterial(matId, -matCount);
                      progress.state.eveils[id] = progress.eveil(id) + 1;
                      progress.save();
                      ctx.toast(`Relique éveillée : ${def.name}`, 'loot', id);
                      rerender();
                    },
                  },
                  'Éveiller',
                ),
          );
        })
      : [h('p', { class: 'note' }, 'Aucune relique dans ton sac.')]),
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
    const gravable = state.items.filter((id) => content.items[id]?.slot === 'arme' && gravurePrice(progress, id).ok).length;
    // À la première soie, l'onglet « Graver » se souligne jusqu'à ce que le joueur l'ouvre une fois.
    if (memory.forgeTab === 'gravure' && state.flags.premiere_soie && !state.flags.onglet_graver_vu) {
      state.flags.onglet_graver_vu = 1;
      progress.save();
    }
    const gravureIndice = Boolean(state.flags.premiere_soie && !state.flags.onglet_graver_vu);
    // L'Éveil des Tablettes (GDD) : reliques possédées, non éveillées, dont le prix (oboles + Éclat) est payable.
    const [eveilMatId, eveilMatCount] = content.eveil.material;
    const eveilMateriaux: Record<string, number> = { [eveilMatId]: eveilMatCount };
    // Le badge compte les éveils payables tout de suite : autant que de reliques à éveiller, d'Éclats et d'oboles.
    const eveilAttente = state.items.filter((id) => content.items[id]?.slot === 'relique' && progress.eveil(id) < content.eveil.max).length;
    const eveilable = cost(progress, content.eveil.oboles, eveilMateriaux).ok
      ? Math.min(eveilAttente, Math.floor(progress.material(eveilMatId) / eveilMatCount), Math.floor(state.oboles / content.eveil.oboles))
      : 0;

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
          { id: 'gravure', label: gravureIndice ? 'Graver !' : 'Graver', count: gravable },
          { id: 'eveil', label: 'Éveil', count: eveilable },
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
      // « Portés », puis les rayons : Ma classe, chaque autre classe, Universels, Raciaux.
      const shown = memory.forgeScope === 'worn' ? worn : upgradable.filter((id) => onShelf(progress, content.items[id], memory.forgeScope));
      if (!memory.forgeItem || !shown.includes(memory.forgeItem)) memory.forgeItem = shown.find((id) => content.items[id].slot === 'arme') ?? shown[0] ?? null;
      const selected = memory.forgeItem;
      const scope = shelfTabs(
        progress,
        upgradable,
        memory.forgeScope,
        (s) => {
          memory.forgeScope = s;
          render();
        },
        [{ id: 'worn', label: 'Portés', count: worn.length }],
      );
      scope.classList.add('small');

      let list: (HTMLElement | null)[];
      if (memory.forgeScope === 'worn') {
        list = worn.map((id) => forgePick(ctx, id, cap, id === selected, true, render));
      } else {
        // Un groupe repliable par emplacement ; celui de la pièce choisie est ouvert.
        list = bySlot(shown).map(([slot, ids]) => {
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
        h(
          'div',
          { class: 'forge-side' },
          scope,
          h('div', { class: 'pick-list', 'data-scroll': 'forge-list' }, ...(list.length ? list : [h('p', { class: 'note' }, 'Aucune pièce dans ce rayon.')])),
        ),
        selected ? forgeDetail(ctx, selected, cap, render) : h('p', { class: 'note' }, 'Aucune pièce à améliorer pour le moment.'),
      );
    } else if (memory.forgeTab === 'eveil') {
      body = eveilBody(ctx, render);
    } else if (memory.forgeTab === 'gravure') {
      body = gravureBody(ctx, render);
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
              ...itemTags(def).map((t) => h('span', { class: 'tag' }, t)),
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
      // Les recettes du rayon choisi, une section par emplacement, les payables d'abord ; les pièces déjà
      // possédées sont repliées en bas.
      const inShelf = (r: (typeof recipes)[number]) => onShelf(progress, content.items[r.item], memory.craftShelf);
      const owned = recipes.filter((r) => progress.has(r.item) && inShelf(r));
      const pending = toForge.filter(inShelf);
      const shelves = shelfTabs(
        progress,
        recipes.map((r) => r.item),
        memory.craftShelf,
        (s) => {
          memory.craftShelf = s;
          render();
        },
      );
      shelves.classList.add('small');
      const sections = bySlot(pending.map((r) => r.item)).map(([slot, ids]) => {
        const rows = pending.filter((r) => ids.includes(r.item)).sort((a, b) => Number(canForge(b)) - Number(canForge(a)));
        const payable = rows.filter(canForge).length;
        return fold(
          `craft-${slot}`,
          true,
          content.slots[slot],
          h('span', {}, `${rows.length} recette${rows.length > 1 ? 's' : ''}`, payable ? h('span', { class: 'ready-count', title: 'Recettes payables' }, `▲ ${payable}`) : null),
          h('div', { class: 'list' }, ...rows.map(recipeRow)),
        );
      });
      body = h(
        'div',
        { class: 'list' },
        shelves,
        pending.length ? null : h('p', { class: 'note' }, toForge.length ? 'Rien à forger dans ce rayon.' : 'Tu as déjà tout ce que Tetsu sait forger.'),
        ...sections,
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
  if (a.kit === 'sorcier') {
    add(Math.round(b.sorcier.mana.max - a.sorcier.mana.max), '', 'mana max');
    add(Math.round(b.sorcier.seal.damage) - Math.round(a.sorcier.seal.damage), '', 'dégâts du sceau');
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
      const count = ofSlot(slot).filter((item) => onShelf(progress, content.items[item], memory.inventoryShelf)).length;
      return h(
        'button',
        {
          class: `slot${id ? '' : ' empty'}${slot === current ? ' selected' : ''}`,
          onclick: () => {
            // Un emplacement porté ouvre sa section à droite, et la fait défiler jusqu'à elle.
            memory.inventorySlot = slot;
            memory.folds.set(`inv-${memory.inventoryShelf}-${slot}`, true);
            render();
            host.root.querySelector(`.inventory-shelf [data-slot="${slot}"]`)?.scrollIntoView({ block: 'nearest' });
          },
        },
        h('span', { class: 'slot-label' }, label),
        h('span', { class: 'slot-item' }, id ? icon(id, 'small') : null, id ? content.items[id].name + levelTag(progress, id) : '—'),
        h('span', { class: 'slot-count', title: `${count} objet${count > 1 ? 's' : ''} de ce rayon pour cet emplacement` }, String(count)),
      );
    });

    const cls = heroClass(content.skills, state.hero);
    const shelf = memory.inventoryShelf;
    const shelved = owned.filter((id) => onShelf(progress, content.items[id], shelf));
    const choice = (id: string): HTMLElement => {
      const def = content.items[id];
      const slot = def.slot as Slot;
      const equipped = state.equipped[slot] === id;
      // Une arme d'une autre classe, une pièce réservée à une autre race, se gardent mais ne se portent pas.
      const blocked = blockText(progress, def);
      if (blocked) {
        return h(
          'button',
          { class: 'owned', disabled: true, title: def.description },
          icon(id, 'medium'),
          h(
            'span',
            { class: 'owned-text' },
            h('strong', {}, def.name + levelTag(progress, id)),
            h('small', {}, effectText(def, itemLevel(state, id))),
            h('small', { class: 'tags' }, blocked),
          ),
        );
      }
      const delta = equipped ? [] : equipDelta(ctx, loadout, id, slot);
      return h(
        'button',
        {
          class: `owned${equipped ? ' equipped' : ''}`,
          title: def.description,
          onclick: () => {
            memory.inventorySlot = slot;
            progress.equip(id, slot);
            render();
          },
        },
        icon(id, 'medium'),
        h(
          'span',
          { class: 'owned-text' },
          h('strong', {}, def.name + levelTag(progress, id)),
          h('small', {}, effectText(def, itemLevel(state, id))),
          itemTags(def).length ? h('small', { class: 'tags' }, itemTags(def).join(' · ')) : null,
          equipped
            ? null
            : h('span', { class: 'deltas' }, ...(delta.length ? delta.map((d) => h('span', { class: `delta ${d.good ? 'up' : 'down'}` }, d.text)) : [h('span', { class: 'delta' }, 'Mêmes caractéristiques')])),
        ),
        equipped ? h('span', { class: 'badge' }, 'Équipé') : null,
      );
    };
    // Le rayon choisi, une section par emplacement ; celle de l'emplacement choisi à gauche est ouverte.
    const sections = bySlot(shelved).map(([slot, ids]) => {
      const section = fold(
        `inv-${shelf}-${slot}`,
        slot === current,
        content.slots[slot],
        `${ids.length} objet${ids.length > 1 ? 's' : ''}`,
        h('div', { class: 'owned-list' }, ...ids.map(choice)),
      );
      section.dataset.slot = slot;
      if (slot === current) section.classList.add('current');
      return section;
    });

    const tiers = cls.tag.tiers;
    const tagLine = h(
      'div',
      { class: 'tag-tiers' },
      ...tiers.map((t, i) => h('div', { class: `tier${i <= loadout.tier ? ' active' : ''}` }, h('b', {}, `(${t.count})`), ` ${t.description}`)),
    );

    // Ce que l'équipement apporte (la moitié de la puissance du héros, GDD) : le même héros sans objet a son arme de
    // départ jamais forgée. Dégâts : forge de l'arme et dégâts des pièces ; PV : PV et armure.
    const bare = buildLoadout(ctx.basePlayer, { ...state, equipped: { arme: cls.weapon }, itemLevels: {} }, content, progress.level).config;
    const weapon = state.equipped.arme;
    const gearDamage = (weapon ? weaponPower(classUpgrade(content.upgrade, cls), itemLevel(state, weapon)) : 1) * (1 + loadout.bonus.damage);
    const effective = (c: PlayerConfig) => c.maxHp / (c.damageTakenFactor ?? 1);
    const stats = h(
      'dl',
      { class: 'stats' },
      h('dt', {}, 'Niveau'),
      h('dd', {}, String(loadout.level)),
      h('dt', {}, 'Équipement'),
      h('dd', {}, `dégâts ×${fr(gearDamage, 1)} · PV effectifs ×${fr(effective(cfg) / effective(bare), 1)}`),
      h('dt', {}, 'PV max'),
      h('dd', {}, String(Math.round(cfg.maxHp))),
      h('dt', {}, 'Dégâts par coup'),
      h('dd', {}, String(Math.round(cfg.attack.damage))),
      h('dt', {}, 'Vitesse'),
      h('dd', {}, `${Math.round((cfg.moveSpeed / ctx.basePlayer.moveSpeed) * 100)} %`),
      h('dt', {}, 'Esquive'),
      h('dd', {}, `${Math.round((cfg.dodge.distance / ctx.basePlayer.dodge.distance) * 100)} %`),
      h('dt', {}, 'Dégâts subis'),
      h('dd', {}, `${Math.round((cfg.damageTakenFactor ?? 1) * 100)} %`),
      loadout.bonus.oboles ? h('dt', {}, 'Oboles gagnées') : null,
      loadout.bonus.oboles ? h('dd', {}, `+${Math.round(loadout.bonus.oboles * 100)} %`) : null,
      ...(cfg.kit === 'sorcier'
        ? [
            h('dt', {}, 'Mana'),
            h('dd', {}, `${Math.round(cfg.sorcier.mana.max)} (+${fr(cfg.sorcier.mana.regen, 1)} par s)`),
            h('dt', {}, 'Boules de feu'),
            h('dd', {}, `${Math.round(cfg.sorcier.fireball.count)} × ${Math.round(cfg.attack.damage)}`),
            h('dt', {}, 'Sceau · météore'),
            h('dd', {}, `${Math.round(cfg.sorcier.seal.damage)} · ${Math.round(cfg.sorcier.meteor.damage)}`),
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
        { class: 'inventory-page' },
        gearTabs(host, ctx, 'equipement'),
          h(
          'div',
          { class: 'inventory' },
          h(
            'div',
            { class: 'col' },
            h('h3', {}, 'Porté'),
            h('div', { class: 'slots' }, ...slotButtons),
            h(
              'div',
              { class: 'inv-links' },
              h('button', { class: 'btn small', onclick: () => openReserve(host, ctx) }, `Réserve (${progress.state.stock.length})`),
              h('button', { class: 'btn small', onclick: () => openCodex(host, ctx) }, 'Codex des objets'),
            ),
            fold('inv-stats', true, 'Caractéristiques', `${Math.round(cfg.maxHp)} PV · ${Math.round(cfg.attack.damage)} dégâts`, stats),
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
            { class: 'col inventory-shelf' },
            shelfTabs(progress, owned, shelf, (s) => {
              memory.inventoryShelf = s;
              render();
            }),
            sections.length
              ? h('div', { class: 'shelf-sections', 'data-scroll': `inventory-${shelf}` }, ...sections)
              : h('p', { class: 'note' }, 'Aucun objet dans ce rayon. Tetsu en forge, le tanuki en vend, et les yokai en laissent tomber.'),
            sections.length ? h('p', { class: 'note' }, 'Clique sur un objet pour l’équiper ; clique sur l’objet porté pour le retirer. Une arme se change, elle ne se retire pas.') : null,
          ),
        ),
      ),
      { wide: true },
    );
  };
  render();
}

/** Les onglets de la fenêtre d'équipement : ce qui est porté, et les builds enregistrés. */
function gearTabs(host: PanelHost, ctx: UiContext, current: 'equipement' | 'builds'): HTMLElement {
  return tabs(
    [
      { id: 'equipement' as const, label: 'Équipement' },
      { id: 'builds' as const, label: `Builds (${keyName('B')})` },
    ],
    current,
    (id) => (id === 'builds' ? openBuilds(host, ctx) : openInventory(host, ctx)),
  );
}

// --- Builds -----------------------------------------------------------------------

/** Vrai si le héros porte et a choisi exactement ce que tient le build. */
function isWorn(progress: Progress, build: Build): boolean {
  const now = snapshot(progress.state, build.name);
  const same = (a: Partial<Record<Slot, string>>, b: Partial<Record<Slot, string>>) =>
    (Object.keys(content.slots) as Slot[]).every((slot) => (a[slot] ?? '') === (b[slot] ?? ''));
  return (
    now.class === build.class &&
    now.subclass === build.subclass &&
    same(now.equipped, build.equipped) &&
    now.talents.length === build.talents.length &&
    now.talents.every((t) => build.talents.includes(t))
  );
}

/** Le contenu d'un build : un objet par emplacement (barré s'il n'est plus possédé), ses talents et sa voie. */
function buildSummary(progress: Progress, build: Build): HTMLElement {
  const missing = new Set(missingItems(progress.state, build));
  const voie = build.subclass ? content.subclasses[build.class]?.[build.subclass] : undefined;
  const items = (Object.keys(content.slots) as Slot[])
    .map((slot) => build.equipped[slot])
    .filter((id): id is string => !!id)
    .map((id) =>
      h(
        'span',
        {
          class: `chip${missing.has(id) ? ' build-missing' : ''}`,
          title: missing.has(id) ? 'Tu ne possèdes plus cet objet : son emplacement restera vide.' : (content.items[id]?.description ?? ''),
        },
        icon(id, 'small'),
        content.items[id]?.name ?? id,
      ),
    );
  return h(
    'div',
    { class: 'build-summary' },
    h('div', { class: 'chips' }, ...items),
    h(
      'div',
      { class: 'note' },
      `${content.skills.classes[build.class]?.name ?? build.class} · ${build.talents.length} talent${build.talents.length > 1 ? 's' : ''} · ${voie ? `voie ${voie.name}` : 'sans voie'}`,
    ),
    missing.size ? h('div', { class: 'note danger' }, `${missing.size} objet${missing.size > 1 ? 's' : ''} que tu ne possèdes plus : ${missing.size > 1 ? 'leurs emplacements resteront vides' : 'son emplacement restera vide'}.`) : null,
  );
}

/**
 * Les builds : cinq places pour enregistrer l'équipement, les talents et la voie du héros, et y revenir en un clic,
 * plus le build Duel (l'arme et 4 des 6 autres emplacements), qui sert tout seul en duel. Sur l'île seulement,
 * comme la fenêtre d'équipement.
 */
export function openBuilds(host: PanelHost, ctx: UiContext): void {
  /** Les emplacements gardés pour le build Duel, pendant que le joueur choisit ; null hors de ce choix. */
  let duelPick: Slot[] | null = null;

  const render = () => {
    const { progress } = ctx;
    const { state } = progress;
    const hero = state.hero;

    const card = (index: number) => {
      const build = state.builds[index] ?? null;
      const worn = build ? isWorn(progress, build) : false;
      const other = build && !fitsHero(build, hero);
      return h(
        'div',
        { class: `row build-row${worn ? ' worn' : ''}` },
        h(
          'div',
          {},
          h(
            'div',
            { class: 'item-head' },
            build
              ? h('input', {
                  class: 'coop-input build-name',
                  value: build.name,
                  maxlength: '24',
                  'aria-label': 'Nom du build',
                  onchange: (e) => {
                    build.name = (e.currentTarget as HTMLInputElement).value.trim() || `Build ${index + 1}`;
                    progress.save();
                    render();
                  },
                  onkeydown: (e) => e.stopPropagation(),
                })
              : h('strong', {}, `Build ${index + 1}`),
            worn ? h('span', { class: 'tag' }, 'Porté') : null,
          ),
          build ? buildSummary(progress, build) : h('div', { class: 'note' }, 'Place libre : enregistre ce que tu portes maintenant.'),
          other ? h('div', { class: 'note danger' }, 'Build d’une autre classe : il ne s’applique pas à ton héros.') : null,
        ),
        h(
          'div',
          { class: 'reserve-actions' },
          build
            ? h(
                'button',
                {
                  class: 'btn small primary',
                  disabled: worn || !!other,
                  onclick: () => {
                    const missing = applyBuild(progress, content, build);
                    if (missing === null) return;
                    ctx.toast(missing.length ? `${build.name} équipé (${missing.length} objet${missing.length > 1 ? 's' : ''} manquant${missing.length > 1 ? 's' : ''})` : `${build.name} équipé`, 'quest');
                    render();
                  },
                },
                worn ? 'Équipé' : 'Équiper',
              )
            : null,
          h(
            'button',
            {
              class: 'btn small',
              disabled: worn,
              title: 'Enregistre ton équipement, tes talents et ta voie actuels dans cette place.',
              onclick: () => {
                const saved = saveBuild(progress, index);
                ctx.toast(`${saved.name} enregistré`, 'quest');
                render();
              },
            },
            build ? 'Remplacer par l’actuel' : 'Enregistrer l’actuel',
          ),
          build
            ? h(
                'button',
                {
                  class: 'btn small',
                  onclick: () => {
                    state.builds[index] = null;
                    progress.save();
                    render();
                  },
                },
                'Vider',
              )
            : null,
        ),
      );
    };

    // Le build Duel : l'arme, puis au plus DUEL_SLOTS des six autres emplacements.
    const duel = state.duelBuild;
    const current = extraSlots(state);
    const saveDuel = (keep: Slot[]) => {
      saveDuelBuild(progress, keep);
      duelPick = null;
      ctx.toast('Build Duel enregistré', 'quest');
      render();
    };
    const picker = duelPick
      ? h(
          'div',
          { class: 'build-summary' },
          h('div', { class: 'note' }, `Garde ${DUEL_SLOTS} emplacements sur ${current.length} en plus de l’arme (${duelPick.length} / ${DUEL_SLOTS}) :`),
          h(
            'div',
            { class: 'chips' },
            ...current.map((slot) => {
              const id = state.equipped[slot] as string;
              const on = duelPick!.includes(slot);
              return h(
                'button',
                {
                  class: `chip build-pick${on ? ' on' : ''}`,
                  'aria-pressed': String(on),
                  disabled: !on && duelPick!.length >= DUEL_SLOTS,
                  onclick: () => {
                    duelPick = on ? duelPick!.filter((s) => s !== slot) : [...duelPick!, slot];
                    render();
                  },
                },
                icon(id, 'small'),
                `${content.slots[slot]} · ${content.items[id]?.name ?? id}`,
              );
            }),
          ),
        )
      : null;
    const duelCard = h(
      'div',
      { class: 'row build-row build-duel' },
      h(
        'div',
        {},
        h('div', { class: 'item-head' }, h('strong', {}, 'Build Duel'), h('span', { class: 'tag' }, `arme + ${DUEL_SLOTS} sur 6`)),
        picker ?? (duel ? buildSummary(progress, duel) : h('div', { class: 'note' }, 'Aucun build Duel : en duel, ton héros garde ses talents et sa voie actuels.')),
        duel && !fitsHero(duel, hero) ? h('div', { class: 'note danger' }, 'Build d’une autre classe : le duel prend tes talents et ta voie actuels.') : null,
        h('div', { class: 'note' }, 'Sert tout seul en duel, sans toucher à ce que tu portes. Ses talents et sa voie comptent déjà ; ses objets compteront quand la règle des objets en duel sera en place (pour l’instant, le duel donne l’arme de départ de ta classe).'),
      ),
      h(
        'div',
        { class: 'reserve-actions' },
        ...(duelPick
          ? [
              h('button', { class: 'btn small primary', onclick: () => saveDuel(duelPick ?? []) }, 'Valider'),
              h(
                'button',
                {
                  class: 'btn small',
                  onclick: () => {
                    duelPick = null;
                    render();
                  },
                },
                'Annuler',
              ),
            ]
          : [
              h(
                'button',
                {
                  class: 'btn small',
                  title: 'Enregistre ton arme, tes talents, ta voie et 4 de tes autres pièces.',
                  onclick: () => {
                    if (current.length <= DUEL_SLOTS) saveDuel(current);
                    else {
                      duelPick = current.slice(0, DUEL_SLOTS);
                      render();
                    }
                  },
                },
                duel ? 'Remplacer par l’actuel' : 'Enregistrer l’actuel',
              ),
            ]),
        duel && !duelPick
          ? h(
              'button',
              {
                class: 'btn small',
                onclick: () => {
                  state.duelBuild = null;
                  progress.save();
                  render();
                },
              },
              'Vider',
            )
          : null,
      ),
    );

    host.show(
      'Équipement',
      `${BUILD_COUNT} builds pour ${heroClass(content.skills, hero).name.toLowerCase()} · un clic pour changer d’équipement, de talents et de voie`,
      h(
        'div',
        { class: 'inventory-page' },
        gearTabs(host, ctx, 'builds'),
        h(
          'div',
          { class: 'list', 'data-scroll': 'builds' },
          h('p', { class: 'note' }, 'Un build garde ton équipement, tes talents et ta voie. « Équiper » les reprend tous d’un coup ; un objet vendu ou échangé depuis laisse son emplacement vide.'),
          ...Array.from({ length: BUILD_COUNT }, (_, i) => card(i)),
          h('h3', {}, 'Duel'),
          duelCard,
        ),
      ),
      { wide: true },
    );
  };
  render();
}

// --- Voie (sous-classe) ---------------------------------------------------------

/**
 * Le choix de la voie : trois voies par classe, ouvertes au niveau 25, et modifiable à volonté — un joueur qui se
 * trompe ne perd rien (règle du joueur : aucun nerf, aucune punition). Depuis la 0.16.0, la troisième est une voie
 * d'abandon : elle renonce à un pilier de la classe, et le dit dans son passif avant qu'on la choisisse. Les nombres
 * d'une voie sont décrits dans l'écran (passif et compétence) : le joueur sait ce qu'il prend avant de cliquer.
 */
export function openSubclass(host: PanelHost, ctx: UiContext): void {
  const render = () => {
    const { progress } = ctx;
    const { hero } = progress.state;
    const cls = heroClass(content.skills, hero);
    const voies = Object.entries(content.subclasses[hero.class] ?? {});
    const chosen = heroSubclass(content.subclasses, hero);
    const level = progress.level;
    const unlocked = level >= SUBCLASS_LEVEL;

    const card = ([id, voie]: [string, SubclassDef]) => {
      const here = hero.subclass === id;
      return h(
        'div',
        { class: `branch voie${here ? ' chosen' : ''}` },
        h('h3', {}, voie.name),
        h('div', { class: 'branch-sub' }, voie.subtitle),
        h('p', { class: 'branch-lore' }, voie.lore),
        h('div', { class: 'note' }, `Rôle : ${voie.role}`),
        h('div', { class: 'passives' }, h('div', {}, h('strong', {}, `Passif · ${voie.passive.name}`), h('small', {}, voie.passive.description))),
        h(
          'div',
          { class: 'passives' },
          h('div', {}, h('strong', {}, h('kbd', {}, keyName('F')), ` ${voie.active.name}`), h('small', {}, withKeys(voie.active.description))),
        ),
        h(
          'button',
          {
            class: `btn${here ? ' chosen' : ''}`,
            disabled: !unlocked || here,
            onclick: () => {
              if (!progress.chooseSubclass(id)) return;
              ctx.toast(`Voie choisie : ${voie.name} (appliquée à ta prochaine descente)`, 'quest');
              render();
            },
          },
          here ? 'Voie actuelle' : `Choisir ${voie.name}`,
        ),
      );
    };

    host.show(
      'Ta voie',
      unlocked
        ? `Un second axe pour ton ${cls.name} · modifiable à volonté, sans rien reperdre`
        : `Un second axe s'ouvre au niveau ${SUBCLASS_LEVEL} · tu es niveau ${level}`,
      h(
        'div',
        { class: 'list' },
        h(
          'div',
          { class: 'skills-header' },
          h('div', {}, h('strong', {}, chosen ? `${cls.name} · ${chosen.name}` : `${cls.name} · aucune voie`), h('div', { class: 'note' }, `Niveau ${level}`)),
          chosen
            ? h(
                'button',
                {
                  class: 'btn',
                  onclick: () => {
                    progress.chooseSubclass(null);
                    ctx.toast('Voie abandonnée : tu retrouves ta classe seule.', 'quest');
                    render();
                  },
                },
                'Renoncer à ma voie',
              )
            : null,
        ),
        h('div', { class: 'tree voies' }, ...voies.map(card)),
      ),
      { wide: true },
    );
  };
  render();
}

// --- Prêt du billot (essayer une classe, une voie) ------------------------------

/** La classe et la voie que le billot prête pour une séance. */
export interface TrialChoice {
  class: string;
  /** La voie essayée, ou null : la classe seule. */
  subclass: string | null;
}

/**
 * Le prêt du billot : Tetsu prête n'importe quelle classe et n'importe quelle voie le temps d'une séance, sans rien
 * toucher à la sauvegarde. C'est le seul endroit du jeu où l'on mesure une classe qu'on ne joue pas encore — et le
 * compteur de dégâts en haut de l'écran est là pour ça.
 */
export function openTrainingTrial(host: PanelHost, ctx: UiContext, current: TrialChoice, onPick: (choice: TrialChoice | null) => void): void {
  const classes = Object.entries(content.skills.classes);
  const card = ([id, cls]: [string, (typeof classes)[number][1]]) => {
    const voies = Object.entries(content.subclasses[id] ?? {});
    const here = current.class === id;
    const pick = (subclass: string | null) => () => {
      host.close();
      onPick({ class: id, subclass });
    };
    return h(
      'div',
      { class: `branch${here ? ' chosen' : ''}` },
      h('h3', {}, cls.name),
      h('div', { class: 'branch-sub' }, `${cls.subtitle} · ${cls.role}`),
      h('button', { class: `btn small${here && current.subclass === null ? ' chosen' : ''}`, onclick: pick(null) }, 'Sans voie'),
      ...voies.map(([vid, voie]) =>
        h(
          'button',
          { class: `btn small${here && current.subclass === vid ? ' chosen' : ''}`, onclick: pick(vid) },
          `${voie.name} · ${voie.active.name}`,
        ),
      ),
    );
  };

  host.show(
    'Le billot prête',
    'Une classe et une voie, le temps d’une séance : arme de départ forgée à ton niveau quand la tienne ne se manie pas, arbre canonique de la classe (deux branches pleines et un nœud) au niveau 10 et plus, et ton équipement universel gardé. Rien n’en touche ta sauvegarde.',
    h(
      'div',
      { class: 'list' },
      h(
        'div',
        { class: 'skills-header' },
        h(
          'div',
          {},
          h('strong', {}, current.class ? `Essai : ${content.skills.classes[current.class]?.name ?? current.class}${current.subclass ? ` · ${content.subclasses[current.class]?.[current.subclass]?.name ?? ''}` : ' (sans voie)'}` : 'Essai : aucune classe prêtée'),
          h('div', { class: 'note' }, `Niveau ${ctx.progress.level} · ta classe : ${heroClass(content.skills, ctx.progress.state.hero).name}`),
        ),
        h('button', { class: 'btn', onclick: () => { host.close(); onPick(null); } }, 'Revenir à mon héros'),
      ),
      h('div', { class: 'tree voies' }, ...classes.map(card)),
    ),
    { wide: true },
  );
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

    const voie = heroSubclass(content.subclasses, state.hero);
    const passives = h(
      'div',
      { class: 'passives' },
      ...racePassives(skills, state.hero).map((p) => h('div', {}, h('strong', {}, p.name), h('small', {}, p.description))),
      ...cls.actives.map((a) => h('div', {}, h('strong', {}, h('kbd', {}, keyName(a.key)), ` ${a.name}`), h('small', {}, a.description))),
      ...(voie ? [h('div', {}, h('strong', {}, h('kbd', {}, keyName('F')), ` ${voie.active.name} (voie ${voie.name})`), h('small', {}, withKeys(voie.active.description)))] : []),
      ...(cls.passives ?? []).map((p) => h('div', {}, h('strong', {}, h('kbd', {}, 'Passif'), ` ${p.name}`), h('small', {}, p.description))),
    );

    const voieBlock = h(
      'div',
      { class: 'skills-header' },
      h(
        'div',
        {},
        h('strong', {}, voie ? `Voie : ${voie.name}` : `Voie : aucune (niveau ${SUBCLASS_LEVEL})`),
        h(
          'div',
          { class: 'note' },
          voie ? withKeys(`Passif : ${voie.passive.name} · ${voie.active.name} sur {F}`) : 'Un second axe pour ta classe : deux voies à choisir au niveau 25, modifiables à volonté.',
        ),
      ),
      h('button', { class: 'btn', onclick: () => openSubclass(host, ctx) }, voie ? 'Changer de voie' : 'Choisir ma voie'),
    );

    host.show(
      'Arbre de compétences',
      `1 point par niveau jusqu’au niveau ${skills.levels.pointsUntil} · les nœuds d’une branche s’apprennent dans l’ordre · réinitialisation gratuite sur la barque de Charon`,        h('div', { class: 'list' },
        header,
        voieBlock,
        h('div', { class: 'tree' }, ...branches),
        h('h3', {}, 'Passifs et compétences'),
        passives,
      ),
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
 * Choix du niveau d'un donjon (GDD : « Difficulté à l'entrée », comme dans Waven).
 * Seuls les niveaux déjà ouverts sont proposés ; vaincre le boss ouvre les suivants, cinq par cinq
 * (1 → 5 → 10…), même si le héros n'est pas encore assez fort pour eux.
 */
export function openDungeonEntry(host: PanelHost, ctx: UiContext, dungeon: DungeonDef, onEnter: (level: number) => void): void {
  const data = content.difficulty;
  const { progress } = ctx;
  const record = progress.dungeon(dungeon.id);
  const unlocked = clampLevel(data, record.unlocked);
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
    const d = dungeonDifficultyFor(data, level, 1, dungeon.strength);
    const r = rewardsFor(data, level);
    const curses = activeCurses(data, level);
    const next = nextCurse(data, level);
    value.textContent = `Niveau ${level}`;
    const parts: (HTMLElement | null)[] = [
      level > playerLevel + 5
        ? h('p', { class: 'note danger' }, `Dangereux pour ton niveau (${playerLevel}) : améliore ton équipement chez Tetsu avant de descendre si bas.`)
        : level > playerLevel
          ? h('p', { class: 'note' }, `Au-dessus de ton niveau (${playerLevel}) : les yokai y sont plus forts que toi.`)
          : null,
      unlockAfter(data, level) > unlocked ? h('p', { class: 'note' }, `Une victoire à ce niveau ouvre jusqu’au niveau ${unlockAfter(data, level)}.`) : null,
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
          h('dt', {}, 'PV de la Jorōgumo'),
          h('dd', {}, `×${fr(d.boss.hp)}`),
          h('dt', {}, 'Ses dégâts'),
          h('dd', {}, `×${fr(d.boss.damage)}`),
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

  const best = record.best;
  host.show(
    dungeon.name,
    best
      ? `Record : niveau ${best} · niveaux ouverts : 1 à ${unlocked} sur ${data.maxLevel}`
      : `Vaincs ${dungeon.bossLabel} pour ouvrir les niveaux 2 à ${unlockAfter(data, 1)} (jusqu’à ${data.maxLevel}).`,
    h(
      'div',
      { class: 'list' },
      h(
        'div',
        { class: 'level-picker' },
        h('button', { class: 'btn small', onclick: () => set(level - data.unlockStep) }, `−${data.unlockStep}`),
        h('button', { class: 'btn small', onclick: () => set(level - 1) }, '−'),
        slider,
        h('button', { class: 'btn small', onclick: () => set(level + 1) }, '+'),
        h('button', { class: 'btn small', onclick: () => set(level + data.unlockStep) }, `+${data.unlockStep}`),
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

/**
 * La stèle des records du ponton : les paliers franchis dans le Yomi sans fond, lus dans le journal de descentes
 * (src/game/journal.ts, rien n'en sort de l'ordinateur), puis, sur le serveur du jeu, le classement de tous les
 * joueurs (server/records.ts). Le héros du journal porte déjà son libellé (`heroLabel`).
 */
export function openRecords(host: PanelHost, social: SocialClient | null = null): void {
  const build = () => {
    const runs = readJournal();
    const perHero = new Map<string, { best: number; wins: number; total: number }>();
    let cooperative = 0;
    for (const run of runs) {
      const stat = perHero.get(run.hero) ?? { best: 0, wins: 0, total: 0 };
      stat.total += 1;
      if (run.victory) stat.wins += 1;
      if (run.dungeon === 'infini' && run.victory) stat.best = Math.max(stat.best, run.dungeonLevel);
      perHero.set(run.hero, stat);
      if (run.players > 1) cooperative += 1;
    }
    const ranked = [...perHero.entries()].sort((a, b) => b[1].best - a[1].best || b[1].total - a[1].total);
    const mine: (string | Node)[] = ranked.map(([name, stat]) =>
      h(
        'div',
        { class: 'records-line' },
        h('span', {}, name),
        h(
          'span',
          { class: 'note' },
          stat.best > 0 ? `palier ${stat.best}` : 'aucun palier franchi',
          ` · ${stat.wins} victoire${stat.wins > 1 ? 's' : ''} sur ${stat.total} descente${stat.total > 1 ? 's' : ''}`,
        ),
      ),
    );
    if (cooperative > 0) mine.push(h('div', { class: 'note' }, `${cooperative} descente${cooperative > 1 ? 's' : ''} en coop dans le journal.`));
    if (runs.length === 0) mine.push(h('p', { class: 'note' }, 'Aucune descente enregistrée. La stèle attend ton premier palier.'));
    const server = social
      ? social.records === null
        ? [h('p', { class: 'note' }, social.connected ? 'La stèle interroge le serveur…' : 'Serveur injoignable pour l’instant.')]
        : social.records.length === 0
          ? [h('p', { class: 'note' }, 'Aucun palier gravé sur ce serveur. Le premier bloc gagné du Yomi sans fond ouvrira la liste.')]
          : social.records.map((r, i) =>
              h(
                'div',
                { class: 'records-line' },
                h('span', {}, `${i + 1}. ${r.pseudo} · ${r.heros}`),
                h('span', { class: 'note' }, `palier ${r.palier}`),
              ),
            )
      : [];
    const body = h(
      'div',
      { class: 'list' },
      social ? h('h3', {}, 'Tous les joueurs du serveur') : null,
      ...server,
      h('h3', {}, 'Sur ce navigateur'),
      h('ul', { class: 'loot' }, ...mine.map((l) => h('li', {}, l))),
    );
    return { title: 'Stèle des records — Yomi sans fond', subtitle: social ? 'Le classement du serveur, puis ton journal' : '', body };
  };
  if (!social) {
    const { title, body } = build();
    host.show(title, null, body);
    return;
  }
  social.requestRecords();
  livePanel(host, social, build);
}

/**
 * Les pactes du Yomi sans fond : à chaque bloc au-delà du palier 50, deux ou trois offres sont tirées (src/data/
 * donjon-infini.json) ; l'hôte en scelle une, qui tient pour toute la descente et s'ajoute aux précédentes.
 */
export function openPactDraft(host: PanelHost, premier: number, palierStep: number, drafts: EndlessModifierSeed[], onPick: (pacte: EndlessModifierSeed) => void): void {
  const carte = (pacte: EndlessModifierSeed) =>
    h(
      'div',
      { class: 'branch' },
      h('h3', {}, pacte.name),
      h('p', { class: 'note' }, pacte.description),
      h('button', { class: 'btn small', onclick: () => { host.close(); onPick(pacte); } }, 'Sceller'),
    );
  host.show(
    `Pacte du Yomi — paliers ${premier} à ${premier + palierStep - 1}`,
    'Un pacte par bloc, scellé pour toute la descente : ils s’ajoutent. En coop, l’hôte scelle seul.',
    h('div', { class: 'list' }, h('div', { class: 'tree voies' }, ...drafts.map(carte))),
    { wide: true },
  );
}

/**
 * Le codex des objets : les 129 objets, groupés par emplacement (puis les objets de quête), avec leur rareté et leur
 * état — possédé, déjà vu (journal d'objets, localStorage), ou jamais croisé. Les taux de drop par source sont des
 * données d'autres documents (donjons, boutique de fin, Yomi) : le codex en rend lisible l'inventaire complet.
 */
/** Les noms des sources du codex : ce sont les clés de `drops` (items.json), où l'on ne dit pas qui frappe. */
const YOKAI_NOMS: Record<string, string> = {
  hitodama: 'Hitodama',
  kodama: 'Kodama',
  kappa: 'Kappa',
  kappaRenforce: 'Kappa renforcé',
  kasaObake: 'Kasa-obake',
  oublie: 'Oublié',
  araignee: 'Araignée',
  jorogumo: 'Jorōgumo',
  shikome: 'Shikome',
  ikazuchi: 'Ikazuchi',
  ikusa: 'Ikusa',
  izanami: 'Izanami',
  mannequin: 'Mannequin de Tetsu',
};

/** Les sources de l'objet : les yokai qui le lâchent (taux par yokai vaincu), les boutiques pondérées (taux par visite), le Yomi sans fond. */
function dropSources(id: string): string[] {
  const def = content.items[id];
  const sources: string[] = [];
  for (const [kind, drop] of Object.entries(content.drops)) {
    const entry = drop.items?.find((e) => e.item === id);
    if (entry) sources.push(`${YOKAI_NOMS[kind] ?? kind} · ${Math.round(entry.chance * 100)} % par yokai vaincu`);
  }
  for (const shop of Object.values(content.shops)) {
    const mine = shop.pool?.filter((o) => o.item === id) ?? [];
    if (mine.length > 0 && shop.pool) {
      const weight = mine.reduce((sum, o) => sum + (o.weight ?? 1), 0);
      const total = shop.pool.reduce((sum, o) => sum + (o.weight ?? 1), 0);
      const perVisit = Math.round(((shop.offers?.items ?? 1) * weight * 100) / total);
      sources.push(`${shop.name} · ${perVisit} % par visite`);
    }
  }
  const tier = def?.spec === 'boss' ? undefined : content.endless.rewards.rarity.find((t) => def?.rarity && t.weights[def.rarity]);
  if (tier) sources.push(`${content.endless.name} · dès le palier ${tier.from}`);
  return sources;
}

export function openCodex(host: PanelHost, ctx: UiContext): void {
  const render = () => {
    const { progress } = ctx;
    // Tout objet possédé compte comme croisé, d'où qu'il vienne (achat, coffre, quête, échange, réserve) : un objet
    // revendu ensuite reste « déjà vu ».
    for (const id of [...progress.state.items, ...progress.state.stock.map((e) => e.item)]) markSeen(id);
    const seen = new Set<string>(seenItems());
    const all = Object.entries(content.items);
    const total = all.length;
    let possessed = 0;
    let glimpsed = 0;
    for (const [id] of all) {
      if (progress.has(id)) possessed++;
      else if (seen.has(id)) glimpsed++;
    }
    const rayon = (slot: Slot | null, label: string): HTMLElement | null => {
      const items = all.filter(([, def]) => (def.slot ?? null) === slot);
      if (items.length === 0) return null;
      return h(
        'div',
        { class: 'codex-rayon' },
        h('h3', {}, `${label} · ${items.length}`),
        h(
          'div',
          { class: 'owned-list' },
          ...items.map(([id, def]) => {
            const owned = progress.has(id);
            const wasSeen = owned || seen.has(id);
            return h(
              'div',
              { class: `codex-item${wasSeen ? '' : ' faint'}` },
              icon(id, 'small'),
              h('span', { class: 'codex-name' }, def.name),
              h('small', { class: 'tags' }, [def.rarity, ...(def.tags ?? [])].filter(Boolean).join(' · ')),
              owned
                ? h('span', { class: 'badge codex-state' }, 'Possédé')
                : h('span', { class: 'note codex-state' }, wasSeen ? 'Déjà vu' : 'Jamais croisé'),
              h('small', { class: 'sources' }, dropSources(id).join(' · ') || 'Ni yokai ni boutique : forge de Tetsu, coffres ou arme de départ'),
            );
          }),
        ),
      );
    };
    host.show(
      'Codex des objets',
      `${possessed} possédé${possessed > 1 ? 's' : ''} · ${glimpsed} déjà croisé${glimpsed > 1 ? 's' : ''} · ${total} en tout`,
      h(
        'div',
        { class: 'list' },
        h('p', { class: 'note' }, 'Un objet obtenu une fois (butin, achat, coffre, échange) reste compté sur ce navigateur, pour tous les personnages.'),
        ...((Object.entries(content.slots) as [Slot, string][]).map(([slot, label]) => rayon(slot, label)).filter(Boolean) as HTMLElement[]),
        rayon(null, 'Objets de quête') as HTMLElement | null,
      ),
      { wide: true },
    );
  };
  render();
}

/** Les lignes d'une gravure, en liste : la contrepartie se lit en rouge, comme dans l'onglet Graver. */
function gravureList(gravure: Gravure): HTMLElement {
  const data = content.gravures;
  return h(
    'ul',
    { class: 'gravure-lines' },
    ...gravure.lines.flatMap((line) => {
      const lineDef = gravureLineDef(data, line.id);
      if (!lineDef) return [];
      const contre = lineDef.kind === 'contrepartie';
      return [h('li', { class: `gravure-line${contre ? ' contrepartie' : ''}` }, contre ? `Contrepartie · ${lineDef.summary}` : gravureLineText(line, lineDef))];
    }),
  );
}

/**
 * La réserve : chaque exemplaire en plus d'un objet possédé (doublons, sceaux du Yomi, achats), avec son niveau et sa
 * gravure. On y brise un sceau, on pose une gravure sur son arme (l'ancienne prend sa place), on fond, ou on sort
 * l'exemplaire vers l'équipement quand on n'a plus l'objet. La vente passe par les échanges (menu social).
 */
export function openReserve(host: PanelHost, ctx: UiContext): void {
  const render = () => {
    const { progress } = ctx;
    const stock = progress.state.stock;
    const data = content.gravures;
    const rows = [...stock]
      .sort((a, b) => (content.items[a.item]?.name ?? a.item).localeCompare(content.items[b.item]?.name ?? b.item) || b.level - a.level)
      .map((entry) => {
        const def = content.items[entry.item];
        if (!def) return null;
        const owned = progress.has(entry.item);
        const rank = entry.gravure && !entry.sceau ? gravureRank(data, entry.gravure) : undefined;
        const current = owned && def.slot === 'arme' ? progress.gravure(entry.item) : undefined;
        const s = salvage(content.duplicates, content.upgrade, def);
        const gain = [`${s.oboles} oboles`, s.material ? `${s.count} ${content.materials[s.material] ?? s.material}` : null].filter(Boolean).join(', ');
        const act = (label: string, run: () => void, title?: string) =>
          h('button', { class: 'btn small', title, onclick: () => { run(); render(); } }, label);
        return h(
          'div',
          { class: 'row recipe reserve-row' },
          itemBlock(
            entry.item,
            h(
              'div',
              { class: 'item-head' },
              h('strong', { title: def.description }, def.name),
              h('span', { class: 'tag' }, `niv. ${entry.level}`),
              entry.sceau ? h('span', { class: 'tag' }, 'Gravure scellée') : rank ? h('span', { class: 'tag' }, rank.name) : null,
            ),
            h('div', { class: 'item-meta' }, `${content.slots[def.slot as Slot] ?? 'Objet'} · ${owned ? 'tu possèdes déjà cet objet' : 'tu ne possèdes plus cet objet'}`),
            entry.gravure && !entry.sceau ? gravureList(entry.gravure) : null,
            current && entry.gravure && !entry.sceau ? h('div', { class: 'note' }, `Sur ton arme : ${gravureRank(data, current)?.name ?? 'gravure'}`) : null,
          ),
          h(
            'div',
            { class: 'reserve-actions' },
            entry.sceau
              ? act('Briser le sceau', () => {
                  const opened = breakSeal(progress, entry.uid);
                  if (opened?.gravure) ctx.toast(`${def.name} · ${gravureRank(data, opened.gravure)?.name ?? 'gravure'}`, 'loot', entry.item);
                })
              : null,
            !entry.sceau && entry.gravure && owned && def.slot === 'arme'
              ? act(
                  current ? 'Échanger avec mon arme' : 'Poser sur mon arme',
                  () => {
                    if (poseGravure(progress, entry.uid)) ctx.toast(`Gravure posée sur ${def.name}`, 'loot', entry.item);
                  },
                  current ? 'La gravure de ton arme passe sur cet exemplaire : une seule gravure active à la fois.' : undefined,
                )
              : null,
            !owned && !entry.sceau
              ? act('Ranger dans l’équipement', () => {
                  if (takeOut(progress, entry.uid)) ctx.toast(`${def.name} rejoint ton équipement`, 'loot', entry.item);
                })
              : null,
            act(
              'Fondre',
              () => {
                const text = meltStock(progress, entry.uid);
                if (text) ctx.toast(text, 'loot', entry.item);
              },
              `Tetsu le fond : ${gain}`,
            ),
          ),
        );
      })
      .filter(Boolean) as HTMLElement[];
    host.show(
      'Réserve',
      `${stock.length} / ${STOCK_MAX} exemplaires`,
      h(
        'div',
        { class: 'list' },
        h('p', { class: 'note' }, 'Les doublons, les sceaux du Yomi et les objets reçus en double attendent ici. Brise un sceau pour découvrir sa gravure ; pose-la sur ton arme ou revends l’exemplaire (menu social : échange, hôtel des ventes, boutique).'),
        ...(rows.length ? rows : [h('p', { class: 'note' }, 'Ta réserve est vide.')]),
      ),
      { wide: true },
    );
  };
  render();
}
