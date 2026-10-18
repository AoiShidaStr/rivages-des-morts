// Bandeau « nouvelle version » : le build publie version.json (vite.config.ts, plugin `versionFile`) avec le nom du
// fichier principal du jeu, qui change à chaque modification du code. La page compare ce nom au sien au chargement, puis
// toutes les 10 minutes et à chaque retour sur l'onglet : s'il a changé, un bandeau propose de recharger, avant qu'une
// partie en ligne ne refuse l'ancienne version (« rechargez la page »).
import { PROTOCOL } from '../net/protocol';
import { h } from './dom';

interface PublishedVersion {
  /** Le fichier principal du jeu (assets/index-<empreinte>.js). */
  entry: string;
  /** PROTOCOL de cette version : s'il diffère, les parties en ligne ne se feront plus avec l'ancienne page. */
  protocol: number;
}

const EVERY_MS = 10 * 60 * 1000;

/** Le fichier principal de cette page, tel que version.json le nomme. */
const ownEntry = () => new URL(import.meta.url).pathname.split('/').pop() ?? '';

export function watchNewVersion(): void {
  // Pas de version.json avec `npm run dev` : le rechargement à chaud suffit.
  if (import.meta.env.DEV) return;
  let shown = false;
  let last = 0;
  const check = async () => {
    if (shown || Date.now() - last < 60_000) return;
    last = Date.now();
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return;
      const published = (await response.json()) as PublishedVersion;
      if (!published.entry || published.entry.split('/').pop() === ownEntry()) return;
      shown = true;
      showBanner(published.protocol !== PROTOCOL);
    } catch {
      // Hors ligne ou serveur en redémarrage : on réessaiera.
    }
  };
  void check();
  setInterval(() => void check(), EVERY_MS);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void check();
  });
}

function showBanner(online: boolean): void {
  const banner = h(
    'div',
    { class: 'new-version', role: 'status' },
    h(
      'span',
      {},
      'Une nouvelle version du jeu est en ligne.',
      online ? ' Les parties en ligne la demandent : recharge la page pour jouer avec tes amis.' : ' Recharge la page pour en profiter.',
    ),
    h('button', { class: 'btn small primary', onclick: () => location.reload() }, 'Recharger'),
    h('button', { class: 'btn small', 'aria-label': 'Plus tard', title: 'Plus tard', onclick: () => banner.remove() }, '×'),
  );
  (document.getElementById('ui') ?? document.body).append(banner);
}
