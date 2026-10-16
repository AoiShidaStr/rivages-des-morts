// Le journal des connexions : qui se connecte, qui est coupé et pourquoi, combien de temps il reste absent, son ping,
// ses images par seconde et ses à-coups (relevés par la page toutes les 15 s, src/net/mesures.ts), et la santé du
// serveur lui-même (retard de sa boucle, mémoire) chaque minute. De quoi savoir, après une soirée de jeu, d'où venait
// le lag : du réseau d'un joueur, de sa machine, ou du serveur.
//
// Les événements s'écrivent dans donnees/journal-reseau.jsonl (une ligne JSON par événement ; au-delà de 20 Mo, le
// fichier passe en .1 et un nouveau commence). Les dernières 24 heures restent en mémoire pour la page /journal
// (lisible seulement depuis la machine du serveur) et le résumé de /sante (sans pseudos).
import { readFileSync } from 'node:fs';
import { appendFile, rename, stat } from 'node:fs/promises';
import path from 'node:path';
import { monitorEventLoopDelay } from 'node:perf_hooks';

const MAX_FILE = 20 * 1024 * 1024;
/** Les heures du journal, à l'heure du joueur (le conteneur, lui, vit en UTC). */
const FUSEAU = process.env.FUSEAU || 'Europe/Paris';
const DAY = 24 * 60 * 60 * 1000;
/** Au plus autant d'événements gardés en mémoire (10 joueurs, une mesure toutes les 15 s : ~60 000 par jour au pire). */
const MAX_MEMORY = 100_000;
const HEALTH_EVERY = 60_000;
/** Au-delà de ce retard de boucle (ms), le serveur lui-même prend du retard sur le combat. */
const SLOW_LOOP = 20;

export type Evenement = { type: string; quand: number } & Record<string, string | number | boolean | null>;

/** Ce que le serveur sait de la santé du jeu à l'instant (joueurs, parties). */
export interface Etat {
  joueurs: number;
  parties: number;
}

/** Codes de fermeture WebSocket : ce qu'ils veulent dire pour un joueur. */
export function causeCoupure(code: number, silence: boolean): string {
  if (silence) return 'ne répondait plus';
  if (code === 1000) return 'fermée normalement';
  if (code === 1001) return 'page quittée ou rechargée';
  if (code === 1006) return 'coupée net (réseau)';
  if (code === 1009) return 'message trop gros';
  return `code ${code}`;
}

export class Journal {
  private readonly fichier: string;
  private readonly memoire: Evenement[] = [];
  private readonly boucle = monitorEventLoopDelay({ resolution: 10 });
  /** Écritures en cours, l'une après l'autre (les lignes restent dans l'ordre). */
  private file: Promise<void> = Promise.resolve();

  constructor(dossier: string, etat: () => Etat) {
    this.fichier = path.join(dossier, 'journal-reseau.jsonl');
    this.relire();
    this.boucle.enable();
    setInterval(() => {
      const { joueurs, parties } = etat();
      this.ecrire({
        type: 'serveur',
        joueurs,
        parties,
        boucleMoy: Math.round(this.boucle.mean / 1e5) / 10,
        boucleMax: Math.round(this.boucle.max / 1e5) / 10,
        memoireMo: Math.round(process.memoryUsage().rss / 1e6),
      });
      this.boucle.reset();
    }, HEALTH_EVERY).unref();
  }

  /** Après un redémarrage (mise à jour, lancer.bat), les dernières 24 heures reviennent du fichier. */
  private relire(): void {
    let texte: string;
    try {
      texte = readFileSync(this.fichier, 'utf8');
    } catch {
      return;
    }
    const vieux = Date.now() - DAY;
    for (const ligne of texte.split('\n')) {
      try {
        const e = JSON.parse(ligne) as Record<string, string | number | boolean | null>;
        const quand = Date.parse(String(e.quand));
        if (quand > vieux && typeof e.type === 'string') this.memoire.push({ ...e, type: e.type, quand });
      } catch {
        // Ligne coupée (arrêt brutal) : on passe.
      }
    }
    this.memoire.splice(0, Math.max(0, this.memoire.length - MAX_MEMORY));
  }

  ecrire(evenement: Omit<Evenement, 'quand'>): void {
    const complet = { quand: Date.now(), ...evenement } as Evenement;
    this.memoire.push(complet);
    const vieux = complet.quand - DAY;
    let debut = 0;
    while (debut < this.memoire.length && this.memoire[debut].quand < vieux) debut++;
    if (debut || this.memoire.length > MAX_MEMORY) this.memoire.splice(0, Math.max(debut, this.memoire.length - MAX_MEMORY));
    const ligne = JSON.stringify({ ...complet, quand: new Date(complet.quand).toISOString() }) + '\n';
    this.file = this.file
      .then(async () => {
        const taille = (await stat(this.fichier).catch(() => null))?.size ?? 0;
        if (taille > MAX_FILE) await rename(this.fichier, `${this.fichier}.1`);
        await appendFile(this.fichier, ligne);
      })
      .catch((error: unknown) => console.error('Journal des connexions :', error));
  }

  /** Le résumé des dernières 24 heures, sans pseudos (pour /sante, que tout le monde peut lire). */
  resume(): Record<string, number> {
    const mesures = this.memoire.filter((e) => e.type === 'mesures');
    const coupures = this.memoire.filter((e) => e.type === 'coupure');
    const retours = this.memoire.filter((e) => e.type === 'retour');
    const serveur = this.memoire.filter((e) => e.type === 'serveur');
    const moyenne = (valeurs: number[]) => (valeurs.length ? Math.round(valeurs.reduce((a, b) => a + b, 0) / valeurs.length) : 0);
    const nombres = (liste: Evenement[], cle: string) => liste.map((e) => e[cle]).filter((v): v is number => typeof v === 'number' && v > 0);
    return {
      connexions: this.memoire.filter((e) => e.type === 'connexion').length,
      coupuresReseau: coupures.filter((e) => e.anormale).length,
      reconnexions: retours.length,
      absenceMoyenneS: Math.round(moyenne(nombres(retours, 'absent')) / 100) / 10,
      pingMoyen: moyenne(nombres(mesures, 'ping')),
      pingMax: Math.max(0, ...nombres(mesures, 'pingMax')),
      acoups: nombres(mesures, 'acoups').reduce((a, b) => a + b, 0),
      ipsMoyennes: moyenne(nombres(mesures, 'ips')),
      boucleMaxMs: Math.max(0, ...nombres(serveur, 'boucleMax')),
    };
  }

  /** La page /journal : le résumé, puis les derniers événements, du plus récent au plus ancien. */
  page(): string {
    const resume = this.resume();
    const lignes = this.memoire
      .slice(-500)
      .reverse()
      .map((e) => `<tr class="${classe(e)}"><td>${heure(e.quand)}</td><td>${echapper(e.type)}</td><td>${echapper(String(e.joueur ?? ''))}</td><td>${echapper(details(e))}</td></tr>`)
      .join('');
    const cases = Object.entries(resume)
      .map(([cle, valeur]) => `<div><b>${valeur}</b><span>${echapper(LIBELLES[cle] ?? cle)}</span></div>`)
      .join('');
    return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="refresh" content="30"><title>Journal des connexions</title><style>
body{margin:0;padding:16px;background:#14161b;color:#e8e2d4;font:14px/1.4 system-ui,sans-serif}
h1{font-size:20px;margin:0 0 4px}p{color:#a49d8f;margin:0 0 16px}
.resume{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin-bottom:16px}
.resume div{background:#1f232b;border-radius:8px;padding:8px 10px}.resume b{display:block;font-size:20px}.resume span{color:#a49d8f;font-size:12px}
.table{overflow-x:auto}table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}td{padding:4px 8px;border-bottom:1px solid #2a2f39;white-space:nowrap}
tr.mauvais td{color:#ffb36b}tr.coupe td{color:#ff7b6b}tr.serveur td{color:#8fb6d9}
</style></head><body><h1>Journal des connexions</h1><p>Dernières 24 heures (la page se met à jour toute seule toutes les 30 s). Tout est aussi dans donnees/journal-reseau.jsonl.</p>
<div class="resume">${cases}</div><div class="table"><table><tbody>${lignes || '<tr><td>Rien pour l’instant.</td></tr>'}</tbody></table></div></body></html>`;
  }
}

const LIBELLES: Record<string, string> = {
  connexions: 'connexions',
  coupuresReseau: 'coupures réseau',
  reconnexions: 'reconnexions',
  absenceMoyenneS: 's d’absence en moyenne',
  pingMoyen: 'ms de ping moyen',
  pingMax: 'ms de ping au pire',
  acoups: 'à-coups',
  ipsMoyennes: 'images/s en moyenne',
  boucleMaxMs: 'ms de retard serveur au pire',
};

function classe(e: Evenement): string {
  if (e.type === 'coupure' && e.anormale) return 'coupe';
  if (e.type === 'serveur') return (e.boucleMax as number) > SLOW_LOOP ? 'mauvais' : 'serveur';
  if (e.type === 'mesures' && ((e.pingMax as number) > 250 || (e.acoups as number) > 0 || ((e.ips as number) > 0 && (e.ips as number) < 30))) return 'mauvais';
  return '';
}

function details(e: Evenement): string {
  switch (e.type) {
    case 'connexion':
      return 'arrive';
    case 'coupure':
      return `${e.cause}, après ${duree(e.duree as number)}`;
    case 'retour':
      return `revenu après ${duree(e.absent as number)} d’absence`;
    case 'mesures':
      return `${e.lieu} · ping ${e.ping} ms (pire ${e.pingMax}) · ${e.ips} images/s (pire image ${e.imageMax} ms) · ${e.acoups} à-coups (pire trou ${e.trou} ms)`;
    case 'serveur':
      return `${e.joueurs} joueurs · ${e.parties} parties · retard de boucle ${e.boucleMoy} ms (pire ${e.boucleMax}) · ${e.memoireMo} Mo`;
    default:
      return '';
  }
}

function duree(ms: number): string {
  if (!Number.isFinite(ms)) return '?';
  if (ms < 60_000) return `${Math.round(ms / 100) / 10} s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)} min`;
  return `${Math.round(ms / 360_000) / 10} h`;
}

function heure(quand: number): string {
  return new Date(quand).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: FUSEAU });
}

function echapper(texte: string): string {
  return texte.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}
