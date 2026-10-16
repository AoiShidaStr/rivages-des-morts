// Les fenêtres des échanges (server/echanges.ts) : l'échange direct avec un joueur, l'hôtel des ventes, et la
// boutique d'un joueur (son mode marchand).
import { content } from '../content';
import type { Progress } from '../game/progress';
import { cannotGive, describeLot, emptyLot, lotItem, lotKey, tradableLots, type Lot, type LotItem } from '../game/trade';
import type { Sale, SocialClient } from '../net/social';
import { h, icon } from './dom';
import { sonUi } from '../audio/sfx';
import type { PanelHost } from './panels';
import { livePanel } from './social';

const itemName = (id: string) => content.items[id]?.name ?? id;
const materialName = (id: string) => content.materials[id] ?? id;

/** « Katana de rōnin · niv. 3 · gravé · réserve » : ce qu'on voit d'une pièce dans un lot. */
const lotLabel = (i: LotItem, mine = false): string =>
  `${itemName(i.item)}${i.level > 1 ? ` · niv. ${i.level}` : ''}${i.sceau ? ' · gravure scellée' : i.gravure ? ' · gravé' : ''}${mine && i.uid ? ' · réserve' : ''}`;

/** Les matériaux qu'on possède, avec leur nombre. */
function ownedMaterials(progress: Progress): [string, number][] {
  return Object.entries(progress.state.materials).filter(([, n]) => n > 0);
}

/** Un lot à l'écran : ses pièces avec leur icône, ses matériaux, ses oboles. */
function lotView(lot: Lot): HTMLElement {
  if (!lot.items.length && !Object.keys(lot.materials).length && !lot.oboles) return h('p', { class: 'note' }, 'Rien pour l’instant.');
  return h(
    'div',
    { class: 'trade-lot' },
    ...lot.items.map((i) => h('div', { class: 'trade-line' }, icon(i.item, 'small'), lotLabel(i))),
    ...Object.entries(lot.materials).map(([id, n]) => h('div', { class: 'trade-line' }, `${n} × ${materialName(id)}`)),
    lot.oboles ? h('div', { class: 'trade-line' }, `${lot.oboles} oboles`) : null,
  );
}

/**
 * Ce qu'on met dans un lot : cocher des pièces d'équipement, choisir un nombre de chaque matériau, des oboles.
 * `change` reçoit le lot à chaque modification.
 */
function lotEditor(progress: Progress, lot: Lot, change: (lot: Lot) => void, withOboles: boolean): HTMLElement {
  const items = tradableLots(progress);
  const chosen = new Set(lot.items.map(lotKey));
  const update = (next: Lot) => change(next);
  const number = (value: number, max: number, set: (n: number) => void) => {
    const input = h('input', { type: 'number', min: '0', max: String(max), value: String(value), class: 'coop-input trade-count' });
    input.addEventListener('change', () => set(Math.max(0, Math.min(max, Math.floor(Number(input.value) || 0)))));
    return input;
  };
  return h(
    'div',
    { class: 'trade-editor', 'data-scroll': 'trade-editor' },
    h('h3', {}, 'Équipement'),
    items.length
      ? h(
          'div',
          { class: 'trade-items' },
          ...items.map((choice) => {
            const key = lotKey(choice);
            return h(
              'label',
              { class: 'trade-line' },
              h('input', {
                type: 'checkbox',
                checked: chosen.has(key),
                onchange: (e) => {
                  const on = (e.target as HTMLInputElement).checked;
                  update({ ...lot, items: on ? [...lot.items, lotItem(progress, key)] : lot.items.filter((i) => lotKey(i) !== key) });
                },
              }),
              icon(choice.item, 'small'),
              lotLabel(choice, true),
            );
          }),
        )
      : h('p', { class: 'note' }, 'Aucune pièce à céder (celles que tu portes restent sur toi).'),
    h('h3', {}, 'Matériaux'),
    ownedMaterials(progress).length
      ? h(
          'div',
          { class: 'trade-items' },
          ...ownedMaterials(progress).map(([id, owned]) =>
            h(
              'div',
              { class: 'trade-line' },
              number(lot.materials[id] ?? 0, owned, (n) => {
                const materials = { ...lot.materials };
                if (n > 0) materials[id] = n;
                else delete materials[id];
                update({ ...lot, materials });
              }),
              ` ${materialName(id)} (tu en as ${owned})`,
            ),
          ),
        )
      : h('p', { class: 'note' }, 'Aucun matériau.'),
    withOboles
      ? h('div', { class: 'trade-line' }, h('strong', {}, 'Oboles '), number(lot.oboles, progress.state.oboles, (n) => update({ ...lot, oboles: n })), ` (tu en as ${progress.state.oboles})`)
      : null,
  );
}

// --- Échange direct -----------------------------------------------------------------------------

/** La fenêtre de l'échange en cours : son lot à gauche, celui de l'autre à droite, et les validations. */
export function openTrade(host: PanelHost, social: SocialClient, progress: Progress): void {
  livePanel(host, social, () => {
    const trade = social.trade;
    if (!trade) {
      return { title: 'Échange', subtitle: 'Terminé', body: h('div', { class: 'list coop' }, h('p', { class: 'note' }, 'L’échange est terminé.')) };
    }
    const mine = trade.mien.lot;
    const problem = cannotGive(progress, mine);
    const body = h(
      'div',
      { class: 'list coop trade' },
      h(
        'div',
        { class: 'trade-sides' },
        h(
          'section',
          {},
          h('h3', {}, `Ton lot${trade.mien.valide ? ' · validé' : ''}`),
          lotEditor(progress, mine, (lot) => social.offer(lot), true),
        ),
        h(
          'section',
          {},
          h('h3', {}, `Le lot de ${trade.avec}${trade.sien.valide ? ' · validé' : ''}`),
          lotView(trade.sien.lot),
        ),
      ),
      problem ? h('p', { class: 'note danger' }, problem) : null,
      h('p', { class: 'note' }, 'Changer un lot retire les deux validations : chacun revoit l’échange avant de valider.'),
      h(
        'div',
        { class: 'entry-actions' },
        h('button', { class: 'btn', onclick: () => social.tradeAction('annuler') }, 'Annuler l’échange'),
        h('button', { class: 'btn primary', disabled: Boolean(problem) || trade.mien.valide, onclick: () => social.tradeAction('valider') }, trade.mien.valide ? 'En attente de l’autre…' : 'Valider'),
      ),
    );
    return { title: `Échange avec ${trade.avec}`, subtitle: 'Chacun pose son lot, puis valide.', body, wide: true };
  }, () => {
    // Fermer la fenêtre en plein échange l'annule.
    if (social.trade) social.tradeAction('annuler');
  });
}

// --- Hôtel des ventes ---------------------------------------------------------------------------

type MarketTab = 'acheter' | 'vendre' | 'miennes';

/** L'hôtel des ventes : acheter, vendre (à l'hôtel ou en boutique), ses ventes en cours, et sa caisse. */
export function openMarket(host: PanelHost, social: SocialClient, progress: Progress, showShop: (pseudo: string) => void): void {
  let tab: MarketTab = 'acheter';
  let draft: Lot = emptyLot();
  let price = 100;
  let inShop = false;
  let search = '';
  social.marketAction('lister');
  livePanel(host, social, () => {
    const market = social.market;
    const taxe = market?.taxe ?? 0.05;
    const tabs = h(
      'div',
      { class: 'row-pills' },
      ...(
        [
          ['acheter', 'Acheter'],
          ['vendre', 'Vendre'],
          ['miennes', `Mes ventes${market?.miennes.length ? ` (${market.miennes.length})` : ''}`],
        ] as [MarketTab, string][]
      ).map(([id, label]) =>
        h(
          'button',
          {
            class: `btn small${tab === id ? ' primary' : ''}`,
            onclick: () => {
              tab = id;
              social.marketAction('lister');
            },
          },
          label,
        ),
      ),
    );
    const caisse = market?.caisse
      ? h('div', { class: 'social-row' }, h('strong', {}, `${market.caisse} oboles t’attendent`), h('button', { class: 'btn small primary', onclick: () => social.marketAction('encaisser') }, 'Encaisser'))
      : null;
    let content_: HTMLElement;
    if (!market) {
      content_ = h('p', { class: 'note' }, 'Chargement…');
    } else if (tab === 'acheter') {
      const input = h('input', { type: 'search', class: 'coop-input', placeholder: 'Chercher un objet ou un vendeur', value: search });
      input.addEventListener('change', () => {
        search = input.value.trim().toLowerCase();
        social.marketAction('lister');
      });
      const shown = market.ventes.filter((v) => !search || describeLot(v.lot).toLowerCase().includes(search) || v.vendeur.toLowerCase().includes(search));
      content_ = h(
        'div',
        {},
        input,
        ...(shown.length ? shown.map((v) => saleRow(v, progress, () => social.buy(v.id), showShop)) : [h('p', { class: 'note' }, 'Rien en vente pour l’instant.')]),
      );
    } else if (tab === 'vendre') {
      const problem = cannotGive(progress, draft);
      const empty = !draft.items.length && !Object.keys(draft.materials).length;
      const priceInput = h('input', { type: 'number', min: '1', value: String(price), class: 'coop-input trade-count' });
      priceInput.addEventListener('change', () => {
        price = Math.max(1, Math.floor(Number(priceInput.value) || 1));
        social.marketAction('lister');
      });
      const gain = inShop ? price : price - Math.ceil(price * taxe);
      content_ = h(
        'div',
        {},
        lotEditor(
          progress,
          draft,
          (lot) => {
            draft = lot;
            social.marketAction('lister');
          },
          false,
        ),
        h('div', { class: 'trade-line' }, h('strong', {}, 'Prix '), priceInput, ' oboles'),
        h(
          'label',
          { class: 'coop-check' },
          h('input', {
            type: 'checkbox',
            checked: inShop,
            onchange: (e) => {
              inShop = (e.target as HTMLInputElement).checked;
              social.marketAction('lister');
            },
          }),
          h('span', {}, 'Mode marchand : dans ta boutique seulement, sans taxe (les autres l’ouvrent depuis le menu social)'),
        ),
        h('p', { class: 'note' }, inShop ? `Tu recevras ${gain} oboles.` : `Taxe de l’hôtel : ${Math.round(taxe * 100)} %. Tu recevras ${gain} oboles.`),
        problem ? h('p', { class: 'note danger' }, problem) : null,
        h(
          'div',
          { class: 'entry-actions' },
          h(
            'button',
            {
              class: 'btn primary',
              disabled: empty || Boolean(problem),
              onclick: () => {
                social.sell(draft, price, inShop);
                sonUi('vendre');
                draft = emptyLot();
              },
            },
            inShop ? 'Mettre en boutique' : 'Mettre en vente',
          ),
        ),
      );
    } else {
      content_ = h(
        'div',
        {},
        ...(market.miennes.length
          ? market.miennes.map((v) =>
              h(
                'div',
                { class: 'social-row' },
                h('div', {}, lotView(v.lot), h('small', {}, `${v.prix} oboles${v.boutique ? ' · en boutique' : ' · à l’hôtel'}`)),
                h('button', { class: 'btn small', onclick: () => social.withdraw(v.id) }, 'Retirer'),
              ),
            )
          : [h('p', { class: 'note' }, 'Tu n’as rien en vente.')]),
      );
    }
    const body = h('div', { class: 'list coop social' }, tabs, caisse, content_);
    return { title: 'Hôtel des ventes', subtitle: `${progress.state.oboles} oboles sur toi`, body, wide: true };
  });
}

function saleRow(v: Sale, progress: Progress, buy: () => void, showShop?: (pseudo: string) => void): HTMLElement {
  const short = progress.state.oboles < v.prix;
  return h(
    'div',
    { class: 'social-row' },
    h(
      'div',
      {},
      lotView(v.lot),
      h('small', {}, 'Vendu par ', showShop ? h('button', { class: 'chat-name link', onclick: () => showShop(v.vendeur) }, v.vendeur) : h('strong', {}, v.vendeur)),
    ),
    h('button', { class: 'btn small primary', disabled: short, title: short ? 'Pas assez d’oboles' : '', onclick: buy }, `Acheter · ${v.prix} oboles`),
  );
}

/** La boutique d'un joueur (mode marchand) : ses lots, à acheter même s'il n'est pas là. */
export function openPlayerShop(host: PanelHost, social: SocialClient, progress: Progress, pseudo: string): void {
  social.shop = null;
  social.openShop(pseudo);
  livePanel(host, social, () => {
    const shop = social.shop;
    const ventes = shop?.ventes ?? [];
    const body = h(
      'div',
      { class: 'list coop social' },
      ...(!shop
        ? [h('p', { class: 'note' }, 'Chargement…')]
        : ventes.length
          ? ventes.map((v) =>
              saleRow(v, progress, () => {
                social.buy(v.id);
                // La boutique se recharge : le lot acheté n'y est plus.
                window.setTimeout(() => social.openShop(pseudo), 300);
              }),
            )
          : [h('p', { class: 'note' }, `${pseudo} n’a rien en boutique pour l’instant.`)]),
    );
    return { title: `Boutique de ${shop?.pseudo ?? pseudo}`, subtitle: `${progress.state.oboles} oboles sur toi`, body };
  });
}
