import { content } from '../content';
import type { PlayerConfig } from '../game/config';
import { canLearn, levelProgress, type Bonus, type BonusKind, type ItemDef, type Loadout } from '../game/loadout';
import type { Progress, Slot } from '../game/progress';
import { h, obole } from './dom';

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

/** Ce que fait un objet, en une ligne. */
function effectText(def: ItemDef): string {
  return [def.summary, bonusText(def.bonus)].filter(Boolean).join(' · ') || 'Aucun effet';
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

export function openForge(host: PanelHost, ctx: UiContext): void {
  const render = () => {
    const { progress } = ctx;
    const forge = content.weapon;
    const rows: HTMLElement[] = [];

    // Affûtage de chaque arme possédée.
    for (const id of progress.state.items.filter((i) => content.items[i]?.slot === 'arme')) {
      const def = content.items[id];
      const level = progress.state.weaponLevels[id] ?? 1;
      const price = cost(progress, forge.obolesPerLevel * level, { [forge.material]: level });
      const maxed = level >= forge.maxLevel;
      rows.push(
        h(
          'div',
          { class: 'row' },
          h(
            'div',
            { class: 'item' },
            h('div', { class: 'item-head' }, h('strong', {}, `${def.name} · niveau ${level}`), h('span', { class: 'rarity r-arme' }, 'arme')),
            h('div', { class: 'item-meta' }, maxed ? 'Niveau maximum atteint.' : `Affûter : niveau ${level + 1}, +${forge.damagePerLevel} dégâts`),
          ),
          maxed ? h('div') : price.node,
          h(
            'button',
            {
              class: 'btn',
              disabled: maxed || !price.ok,
              onclick: () => {
                progress.gainOboles(-forge.obolesPerLevel * level);
                progress.gainMaterial(forge.material, -level);
                progress.state.weaponLevels[id] = level + 1;
                progress.save();
                ctx.toast(`${def.name} : niveau ${level + 1}`, 'loot');
                render();
              },
            },
            maxed ? 'Maximum' : 'Affûter',
          ),
        ),
      );
    }

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
    host.show('Forge de Tetsu', purse(progress), h('div', { class: 'list' }, ...rows));
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
      const name = def ? (slot === 'arme' ? `${def.name} (niv. ${state.weaponLevels[id!] ?? 1})` : def.name) : null;
      return h('div', { class: `slot${name ? '' : ' empty'}` }, h('span', { class: 'slot-label' }, label), h('span', {}, name ?? '—'));
    });

    const owned = state.items.filter((id) => content.items[id]?.slot);
    const itemButtons = owned.map((id) => {
      const def = content.items[id];
      const slot = def.slot as Slot;
      const equipped = state.equipped[slot] === id;
      const level = slot === 'arme' ? ` (niv. ${state.weaponLevels[id] ?? 1})` : '';
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
        h('small', {}, `${content.slots[slot]} · ${effectText(def)}`),
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
      '1 point par niveau · les nœuds d’une branche s’apprennent dans l’ordre · réinitialisation gratuite sur la barque de Charon',
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

// --- Butin ------------------------------------------------------------------

export function openLoot(host: PanelHost, title: string, lines: string[], onClose?: () => void): void {
  host.show(title, null, h('div', { class: 'list' }, h('ul', { class: 'loot' }, ...lines.map((l) => h('li', {}, l)))), { onClose });
}
