// Le ping du joueur, toujours à l'écran quand il joue en ligne (sur l'île partagée, en descente à plusieurs) : un petit
// badge en haut à droite, en couleur d'alerte au-delà de `LAGGY`, et « Connexion perdue » quand le serveur ne répond
// plus. Les pings des alliés s'affichent à côté de leur nom (src/render/hud.ts).
import { h } from './dom';

/** Au-delà de ce ping (ms), il s'affiche en couleur d'alerte (le même seuil que pour les alliés). */
const LAGGY = 150;

export type PingView = { ms: number } | 'host' | 'lost' | null;

export class PingBadge {
  private readonly root = h('div', { class: 'ping-badge', title: 'Aller-retour jusqu’au serveur ou à l’hôte de la partie' });
  private shown = '';

  constructor(parent: HTMLElement = document.body) {
    parent.append(this.root);
  }

  /** `null` : rien à montrer (en solo). */
  show(view: PingView): void {
    const text = view === null ? '' : view === 'host' ? 'Hôte' : view === 'lost' ? 'Connexion perdue…' : view.ms ? `Ping ${Math.round(view.ms)} ms` : 'Ping …';
    const state = view === 'lost' ? 'lost' : typeof view === 'object' && view && view.ms > LAGGY ? 'lag' : '';
    const key = `${text}|${state}`;
    if (key === this.shown) return;
    this.shown = key;
    this.root.textContent = text;
    this.root.classList.toggle('visible', view !== null);
    this.root.classList.toggle('lag', state === 'lag');
    this.root.classList.toggle('lost', state === 'lost');
  }
}
