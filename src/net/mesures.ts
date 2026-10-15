// Mesures de la connexion, pour comprendre d'où vient le lag : la page relève son ping vers le serveur, ses images
// par seconde et les « à-coups » (un instantané du combat ou une position de l'île qui arrive bien plus tard que
// prévu), puis les envoie au serveur toutes les `REPORT_EVERY` ms. Le serveur les écrit dans son journal
// (server/journal.ts) : on sait alors si un joueur saccade parce que son réseau décroche, parce que sa machine peine
// (peu d'images par seconde), ou parce que le serveur prend du retard.
//
// Rien ne part sans serveur du jeu (version GitHub Pages, tests entre onglets).
import { pingStats, serverPost, type Network } from './transport';

const REPORT_EVERY = 15_000;
/** Un message attendu qui arrive avec plus de ce retard sur son rythme compte comme un à-coup (ms). */
const HITCH = 150;

/** Où est le joueur : ça dit quelles arrivées comptent (instantanés en descente, positions sur l'île). */
export type Place = 'menu' | 'ile' | 'descente' | 'hote';

let network: Network | null = null;
let place: Place = 'menu';
let frames = 0;
let frameTime = 0;
let worstFrame = 0;
let hitches = 0;
let worstGap = 0;
/** Dernière arrivée de chaque flux (`snap`, `pos:<joueur>`), et l'intervalle auquel on attend la suivante. */
const streams = new Map<string, { at: number; every: number }>();

/** Commence les relevés (une fois, au démarrage du jeu). */
export function startMeasures(net: Network): void {
  if (network || net !== 'serveur') return;
  network = net;
  window.setInterval(report, REPORT_EVERY);
}

export function setPlace(where: Place): void {
  if (where === place) return;
  place = where;
  streams.clear();
}

/** Une image dessinée, `elapsed` ms après la précédente (onglet visible seulement). */
export function noteFrame(elapsed: number): void {
  if (!network) return;
  frames++;
  frameTime += elapsed;
  worstFrame = Math.max(worstFrame, elapsed);
}

/**
 * Un message d'un flux régulier vient d'arriver. `every` : dans combien de ms on attend le suivant (0 : pas de suite
 * attendue, par exemple un héros de l'île qui s'est arrêté).
 */
export function noteArrival(stream: string, every: number): void {
  if (!network) return;
  const now = performance.now();
  const last = streams.get(stream);
  if (last?.every) {
    const gap = now - last.at;
    if (gap > last.every + HITCH) hitches++;
    worstGap = Math.max(worstGap, gap);
  }
  streams.set(stream, { at: now, every });
}

function report(): void {
  if (!frames && !pingStats.count) return;
  serverPost({
    t: 'mesures',
    lieu: place,
    ping: pingStats.count ? Math.round(pingStats.sum / pingStats.count) : 0,
    pingMax: Math.round(pingStats.max),
    ips: frameTime ? Math.round((frames * 1000) / frameTime) : 0,
    imageMax: Math.round(worstFrame),
    acoups: hitches,
    trou: Math.round(worstGap),
  });
  frames = frameTime = worstFrame = hitches = worstGap = 0;
  pingStats.sum = pingStats.count = pingStats.max = 0;
}
