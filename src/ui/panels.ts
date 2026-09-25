import { content } from '../content';
import type { PlayerConfig } from '../game/config';
import { activeCurses, clampLevel, difficultyFor, nextCurse, rewardsFor } from '../game/difficulty';
import { isUpgradable, nextPalier, reachedPaliers, scaledBonus, upgradeCap, upgradeCost, weaponPower } from '../game/forge';
import { canLearn, itemLevel, levelProgress, type Bonus, type BonusKind, type ItemDef, type Loadout } from '../game/loadout';
import type { Progress, Slot } from '../game/progress';
import { h, obole } from './dom';

/** Nombre à la française : « 1,35 ». */
const fr = (value: number, digits = 2): string => value.toLocaleString('fr-FR', { maximumFractionDigits: digits });

export interface UiContext {
  progress: Progress;
  basePlayer: PlayerConfig;
  /** Réglages du Guerrier avec l'équipement, le niveau et les talents actuels. */
  loadout(): Loadout;
  toast(text: string, tone?: 'quest' | 'loot'): void;
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
    // Garde la position de défilement quand on redessine la même fenêtre (achat, équipement…).
    const scroll = this.backdrop.querySelector('.panel')?.scrollTop ?? 0;
    this.backdrop.replaceChildren(panel);
    panel.scrollTop = scroll;
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
    const label = content.bonuses[key].toLowerCase();
    if (key === 'armor') return `−${Math.round(value * 100)} % ${label}`;
    if (key === 'speed' || key === 'dodge' || key === 'oboles') return `+${Math.round(value * 100)} % ${label}`;
    return `+${value} ${content.bonuses[key]}`;
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

function itemCard(def: ItemDef, extra?: string): HTMLElement {
  const rarity = def.rarity.replace(/\s/g, '-');
  return h(
    'div',
    { class: 'item' },
    h(
      'div',
      { class: 'item-head' },
      h('strong', {}, def.name),
      h('span', { class: `rarity r-${rarity}` }, def.rarity),
      ...(def.tags ?? []).map((t) => h('span', { class: 'tag' }, t)),
    ),
    h('div', { class: 'item-meta' }, def.slot ? `${content.slots[def.slot]}${extra ?? ''} · ${effectText(def)}` : 'Objet de quête'),
    h('p', { class: 'item-desc' }, def.description),
  );
}

function cost(progress: Progress, oboles: number, materials: Record<string, number>): { node: HTMLElement; ok: boolean } {
  let ok = progress.state.oboles >= oboles;
  const parts: (HTMLElement | string)[] = [obole(oboles)];
  for (const [id, amount] of Object.entries(materials)) {
    const owned = progress.material(id);
    ok &&= owned >= amount;
    parts.push(h('span', { class: owned >= amount ? 'mat' : 'mat missing' }, `${amount} × ${content.materials[id] ?? id} (${owned})`));
  }
  return { node: h('div', { class: 'cost' }, ...parts), ok };
}

function purse(progress: Progress): HTMLElement {
  return h('span', {}, 'Tu as ', obole(progress.state.oboles));
}

function acquire(ctx: UiContext, item: string): void {
  ctx.progress.acquire(item, content.items[item]?.slot);
  ctx.progress.save();
}

// --- Boutique ---------------------------------------------------------------

export function openShop(host: PanelHost, ctx: UiContext, shopId: string): void {
  const shop = content.shops[shopId];
  if (!shop) return;
  const render = () => {
    const { progress } = ctx;
    const bonusDiscount = shop.discountIf && progress.check(shop.discountIf.if) ? shop.discountIf.discount : 0;
    const discount = 1 - (1 - (shop.discount ?? 0)) * (1 - bonusDiscount);
    const rows = shop.stock
      .filter((entry) => progress.check(entry.if))
      .map(({ item, price }) => {
        const def = content.items[item];
        const final = Math.round(price * (1 - discount));
        const owned = progress.has(item);
        const affordable = progress.state.oboles >= final;
        return h(
          'div',
          { class: 'row' },
          itemCard(def),
          h('div', { class: 'price' }, discount ? h('s', {}, String(price)) : null, obole(final)),
          h(
            'button',
            {
              class: 'btn',
              disabled: owned || !affordable,
              onclick: () => {
                progress.gainOboles(-final);
                acquire(ctx, item);
                ctx.toast(`Acheté : ${def.name}`, 'loot');
                render();
              },
            },
            owned ? 'Possédé' : affordable ? 'Acheter' : 'Trop cher',
          ),
        );
      });
    const notes = [
      shop.discount ? `Prix réduits de ${Math.round(shop.discount * 100)} % : c'est la récompense de ta victoire.` : null,
      bonusDiscount ? shop.discountIf?.note : null,
    ].filter((n): n is string => Boolean(n));
    host.show(shop.name, purse(progress), h('div', { class: 'list' }, ...notes.map((n) => h('p', { class: 'note' }, n)), ...rows));
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

/** Une pièce à améliorer : ce que donne le niveau suivant, le prochain palier, le prix. */
function upgradeRow(ctx: UiContext, id: string, cap: number, rerender: () => void): HTMLElement {
  const { progress } = ctx;
  const { state } = progress;
  const rules = content.upgrade;
  const def = content.items[id];
  const level = itemLevel(state, id);
  const maxed = level >= rules.maxLevel;
  const blocked = !maxed && level >= cap;
  const growth =
    def.slot === 'arme'
      ? `Dégâts ${weaponDamage(ctx, def, level)} → ${weaponDamage(ctx, def, level + 1)} · Frappe fracassante, Bond et foudre suivent`
      : `${bonusText(scaledBonus(rules, def.bonus, level)) || 'Aucun bonus'} → ${bonusText(scaledBonus(rules, def.bonus, level + 1)) || 'aucun bonus'}`;
  const price = maxed || blocked ? null : upgradeCost(rules, def, level);
  const priceNode = price ? cost(progress, price.oboles, price.materials) : null;
  const next = nextPalier(rules, def, level);

  // Monte d'un niveau, ou autant que possible (« Au max ») sans dépasser le niveau du joueur.
  const upgrade = (times: number) => {
    const before = reachedPaliers(rules, def, level).length;
    let done = 0;
    while (done < times) {
      const lvl = itemLevel(state, id);
      if (lvl >= cap) break;
      const c = upgradeCost(rules, def, lvl);
      if (state.oboles < c.oboles || Object.entries(c.materials).some(([m, n]) => progress.material(m) < n)) break;
      progress.gainOboles(-c.oboles);
      for (const [m, n] of Object.entries(c.materials)) progress.gainMaterial(m, -n);
      state.itemLevels[id] = lvl + 1;
      done++;
    }
    if (!done) return;
    progress.save();
    const reached = itemLevel(state, id);
    ctx.toast(`${def.name} : niveau ${reached}`, 'loot');
    for (const p of reachedPaliers(rules, def, reached).slice(before)) ctx.toast(`Palier ${p.level} · ${p.name} : ${p.summary}`, 'quest');
    rerender();
  };

  return h(
    'div',
    { class: 'row forge-row' },
    h(
      'div',
      { class: 'item' },
      h(
        'div',
        { class: 'item-head' },
        h('strong', {}, `${def.name} · niv. ${level}`),
        h('span', { class: `rarity r-${def.rarity.replace(/\s/g, '-')}` }, content.slots[def.slot as Slot]),
        ...reachedPaliers(rules, def, level).map((p) => h('span', { class: 'tag palier', title: p.summary }, p.name)),
      ),
      h('div', { class: 'item-meta' }, maxed ? 'Niveau maximum atteint.' : blocked ? `Niveau ${level + 1} : il faut d’abord atteindre le niveau ${level + 1}.` : growth),
      next ? h('div', { class: 'item-meta palier-next' }, `Palier ${next.level} · ${next.name} : ${next.summary}`) : null,
    ),
    priceNode ? priceNode.node : h('div'),
    h(
      'div',
      { class: 'forge-buttons' },
      h('button', { class: 'btn', disabled: !priceNode?.ok, onclick: () => upgrade(1) }, maxed ? 'Maximum' : blocked ? 'Ton niveau' : 'Améliorer'),
      priceNode
        ? h('button', { class: 'btn small', disabled: !priceNode.ok, title: 'Améliorer tant que tu peux payer, jusqu’à ton niveau', onclick: () => upgrade(Infinity) }, 'Au max')
        : null,
    ),
  );
}

export function openForge(host: PanelHost, ctx: UiContext): void {
  const render = () => {
    const { progress } = ctx;
    const rules = content.upgrade;
    const cap = upgradeCap(rules, progress.level);
    const slotOrder = Object.keys(content.slots);
    const upgradable = progress.state.items
      .filter((id) => isUpgradable(rules, content.items[id]))
      .sort((a, b) => slotOrder.indexOf(content.items[a].slot ?? '') - slotOrder.indexOf(content.items[b].slot ?? ''));
    const rows: HTMLElement[] = [
      h(
        'p',
        { class: 'note' },
        `Tetsu améliore ton équipement jusqu’à ton niveau (${cap} / ${rules.maxLevel}). Aux paliers, une pièce gagne un passif : l’arme a les siens, les autres pièces comptent double pour les tags au niveau 25 et deviennent « Tous » au niveau 50.`,
      ),
      ...upgradable.map((id) => upgradeRow(ctx, id, cap, render)),
    ];

    rows.push(h('h3', {}, 'Fabriquer'));
    for (const recipe of content.recipes) {
      if (!progress.check(recipe.if)) continue;
      const def = content.items[recipe.item];
      const price = cost(progress, recipe.oboles, recipe.materials);
      const owned = progress.has(recipe.item);
      rows.push(
        h(
          'div',
          { class: 'row' },
          itemCard(def),
          price.node,
          h(
            'button',
            {
              class: 'btn',
              disabled: owned || !price.ok,
              onclick: () => {
                progress.gainOboles(-recipe.oboles);
                for (const [id, amount] of Object.entries(recipe.materials)) progress.gainMaterial(id, -amount);
                acquire(ctx, recipe.item);
                ctx.toast(`Forgé : ${def.name}`, 'loot');
                render();
              },
            },
            owned ? 'Possédé' : 'Forger',
          ),
        ),
      );
    }
    host.show('Forge de Tetsu', purse(progress), h('div', { class: 'list' }, ...rows), { wide: true });
  };
  render();
}

// --- Équipement ---------------------------------------------------------------

export function openInventory(host: PanelHost, ctx: UiContext): void {
  const render = () => {
    const { progress } = ctx;
    const { state } = progress;
    const loadout = ctx.loadout();
    const cfg = loadout.config;
    const slots = Object.entries(content.slots) as [Slot, string][];
    const slotRows = slots.map(([slot, label]) => {
      const id = state.equipped[slot];
      const def = id ? content.items[id] : undefined;
      const name = id && def ? def.name + levelTag(progress, id) : null;
      return h('div', { class: `slot${name ? '' : ' empty'}` }, h('span', { class: 'slot-label' }, label), h('span', {}, name ?? '—'));
    });

    const owned = state.items.filter((id) => content.items[id]?.slot);
    const itemButtons = owned.map((id) => {
      const def = content.items[id];
      const slot = def.slot as Slot;
      const equipped = state.equipped[slot] === id;
      const level = levelTag(progress, id);
      return h(
        'button',
        {
          class: `owned${equipped ? ' equipped' : ''}`,
          title: def.description,
          onclick: () => {
            progress.equip(id, slot);
            render();
          },
        },
        h('strong', {}, def.name + level),
        h('small', {}, `${content.slots[slot]} · ${effectText(def, itemLevel(state, id))}`),
        def.tags?.length ? h('small', { class: 'tags' }, def.tags.join(' · ')) : null,
        equipped ? h('span', { class: 'badge' }, 'Équipé') : null,
      );
    });

    const tiers = content.skills.tag.tiers;
    const tagLine = h(
      'div',
      { class: 'tag-tiers' },
      h('strong', {}, `${content.skills.tag.name} ${loadout.tagCount} / ${tiers[tiers.length - 1].count}`),
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
    );

    const materials = Object.entries(content.materials)
      .filter(([id]) => progress.material(id) > 0)
      .map(([id, name]) => h('li', {}, `${name} × ${progress.material(id)}`));
    const questItems = state.items.filter((id) => !content.items[id]?.slot).map((id) => h('li', { title: content.items[id]?.description ?? '' }, content.items[id]?.name ?? id));

    host.show(
      'Équipement',
      h('span', {}, purse(progress), ` · ${state.chests} coffre${state.chests > 1 ? 's' : ''} à ouvrir sur la barque`),
      h(
        'div',
        { class: 'inventory' },
        h('div', { class: 'col' }, h('h3', {}, 'Porté'), ...slotRows, h('h3', {}, 'Tags de classe'), tagLine, h('h3', {}, 'Caractéristiques'), stats),
        h(
          'div',
          { class: 'col' },
          h('h3', {}, 'Objets'),
          h('div', { class: 'owned-list' }, ...itemButtons),
          h('p', { class: 'note' }, 'Clique sur un objet pour l’équiper ou le retirer.'),
          h('h3', {}, 'Matériaux'),
          materials.length ? h('ul', { class: 'plain' }, ...materials) : h('p', { class: 'note' }, 'Les ennemis des Rizières noyées en laissent tomber.'),
          questItems.length ? h('h3', {}, 'Objets de quête') : null,
          questItems.length ? h('ul', { class: 'plain' }, ...questItems) : null,
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

    const branches = skills.branches.map((branch) =>
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
        h('strong', {}, `${skills.class.name} · ${skills.class.subtitle}`),
        h('div', { class: 'note' }, `${skills.race.name} (${skills.race.origin})`),
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
      ...skills.race.passives.map((p) => h('div', {}, h('strong', {}, p.name), h('small', {}, p.description))),
      ...skills.class.actives.map((a) => h('div', {}, h('strong', {}, h('kbd', {}, a.key), ` ${a.name}`), h('small', {}, a.description))),
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

export function openLoot(host: PanelHost, title: string, lines: string[], onClose?: () => void): void {
  host.show(title, null, h('div', { class: 'list' }, h('ul', { class: 'loot' }, ...lines.map((l) => h('li', {}, l)))), { onClose });
}
