// Le journal des duels (plan PvP, étape 5) : chaque duel en ligne joué par ce serveur, pour confirmer avec de vrais
// joueurs la grille que `npm run duel` mesure avec des bots. L'hôte du duel envoie le résultat à la fin (les classes
// et voies des deux héros, la durée et le vainqueur de chaque manche) ; chaque joueur envoie son équipement de
// duel au début. Rien n'est vérifié : comme la progression, ces chiffres viennent des pages.
//
// Messages de la page vers le serveur :
//   { t: 'duel', faire: 'resultat', classes: [a, b], voies: [a, b], manches: [{ duree, gagnant }], forfait }
//   { t: 'duel', faire: 'equipement', classe, voie, race, arme, objets: [id…] }   (objets : hors arme)
//
// Tout s'écrit dans donnees/duels.jsonl (une ligne JSON par message, jamais tronqué : un duel fait une ligne). Le
// résumé va dans /sante, clé `duels` : la grille réelle d'une paire de classes s'affiche dès 30 duels, et des alertes
// signalent un objet porté dans plus de 60 % des équipements ou une classe au-dessus de 58 % sur 50 duels.
import { readFileSync } from 'node:fs';
import { appendFile } from 'node:fs/promises';
import path from 'node:path';

/** Duels d'une paire de classes avant d'en afficher le taux de victoire. */
const PAIRE_MIN = 30;
/** Duels d'une classe avant de la juger, et le taux de manches au-delà duquel elle alerte. */
const CLASSE_MIN = 50;
const CLASSE_MAX = 0.58;
/** Équipements avant de juger un objet, et la part au-delà de laquelle il est trop porté. */
const OBJET_MIN = 20;
const OBJET_MAX = 0.6;
const NOM = /^[\w-]{1,40}$/;
const MAX_MANCHES = 9;
const MAX_OBJETS = 6;

interface Resultat {
  type: 'resultat';
  quand: string;
  classes: [string, string];
  voies: [string, string];
  manches: { duree: number; gagnant: number }[];
  forfait: number | null;
}

interface Equipement {
  type: 'equipement';
  quand: string;
  classe: string;
  voie: string;
  race: string;
  arme: string;
  objets: string[];
}

type Ligne = Resultat | Equipement;

const nom = (v: unknown): string | null => (typeof v === 'string' && NOM.test(v) ? v : null);
const nomOuVide = (v: unknown): string => nom(v) ?? '';
const paire = (v: unknown, lire: (x: unknown) => string | null): [string, string] | null => {
  if (!Array.isArray(v) || v.length !== 2) return null;
  const [a, b] = v.map(lire);
  return a !== null && b !== null ? [a, b] : null;
};

export class Duels {
  private readonly fichier: string;
  private readonly lignes: Ligne[] = [];
  private file: Promise<void> = Promise.resolve();

  constructor(dossier: string) {
    this.fichier = path.join(dossier, 'duels.jsonl');
    let texte = '';
    try {
      texte = readFileSync(this.fichier, 'utf8');
    } catch {
      return;
    }
    for (const ligne of texte.split('\n')) {
      try {
        const l = JSON.parse(ligne) as Ligne;
        if (l.type === 'resultat' || l.type === 'equipement') this.lignes.push(l);
      } catch {
        // Ligne coupée (arrêt brutal) : on passe.
      }
    }
  }

  /** Un message `duel` d'une page. Faux s'il n'a pas la bonne forme. */
  recevoir(message: Record<string, unknown>): boolean {
    const quand = new Date().toISOString();
    let ligne: Ligne | null = null;
    if (message.faire === 'resultat') {
      const classes = paire(message.classes, nom);
      const manches = Array.isArray(message.manches)
        ? message.manches
            .slice(0, MAX_MANCHES)
            .map((m) => m as Record<string, unknown>)
            .filter((m) => typeof m.duree === 'number' && m.duree >= 0 && m.duree < 600 && (m.gagnant === 0 || m.gagnant === 1 || m.gagnant === -1))
            .map((m) => ({ duree: Math.round((m.duree as number) * 10) / 10, gagnant: m.gagnant as number }))
        : [];
      if (!classes || (!manches.length && message.forfait == null)) return false;
      const forfait = message.forfait === 0 || message.forfait === 1 ? message.forfait : null;
      ligne = { type: 'resultat', quand, classes, voies: paire(message.voies, nomOuVide) ?? ['', ''], manches, forfait };
    } else if (message.faire === 'equipement') {
      const classe = nom(message.classe);
      if (!classe || !Array.isArray(message.objets)) return false;
      const objets = [...new Set(message.objets.map(nom).filter((o): o is string => o !== null))].slice(0, MAX_OBJETS);
      ligne = { type: 'equipement', quand, classe, voie: nomOuVide(message.voie), race: nomOuVide(message.race), arme: nomOuVide(message.arme), objets };
    }
    if (!ligne) return false;
    this.lignes.push(ligne);
    const texte = JSON.stringify(ligne) + '\n';
    this.file = this.file.then(() => appendFile(this.fichier, texte)).catch((error: unknown) => console.error('Journal des duels :', error));
    return true;
  }

  /** Le résumé pour /sante : la grille réelle (paires d'au moins 30 duels), les classes, les objets les plus portés, les alertes. */
  resume(): Record<string, unknown> {
    const resultats = this.lignes.filter((l): l is Resultat => l.type === 'resultat');
    const equipements = this.lignes.filter((l): l is Equipement => l.type === 'equipement');
    const paires = new Map<string, { duels: number; manches: number; gagnees: number; duree: number }>();
    const classes = new Map<string, { duels: number; manches: number; gagnees: number }>();
    for (const r of resultats) {
      const [a, b] = r.classes;
      const cle = [a, b].sort().join('-');
      // Le taux d'une paire est celui de la première classe dans l'ordre alphabétique.
      const premier = a <= b ? 0 : 1;
      const p = paires.get(cle) ?? { duels: 0, manches: 0, gagnees: 0, duree: 0 };
      p.duels++;
      // Un miroir compte pour sa paire (durée des manches), pas pour le taux de sa classe.
      const camps = a === b ? [] : [0, 1].map((side) => {
        const c = classes.get(r.classes[side]) ?? { duels: 0, manches: 0, gagnees: 0 };
        c.duels++;
        classes.set(r.classes[side], c);
        return c;
      });
      for (const m of r.manches) {
        if (m.gagnant < 0) continue;
        p.manches++;
        p.duree += m.duree;
        if (m.gagnant === premier) p.gagnees++;
        camps.forEach((c, side) => {
          c.manches++;
          if (m.gagnant === side) c.gagnees++;
        });
      }
      paires.set(cle, p);
    }
    const alertes: string[] = [];
    const grille = Object.fromEntries(
      [...paires].map(([cle, p]) => {
        const [a, b] = cle.split('-');
        const taux = a !== b && p.duels >= PAIRE_MIN && p.manches ? Math.round((100 * p.gagnees) / p.manches) : null;
        if (taux !== null && (taux < 40 || taux > 60)) alertes.push(`${a} contre ${b} : ${taux} % des manches pour ${a} (${p.duels} duels)`);
        return [cle, { duels: p.duels, taux, manche: p.manches ? Math.round((10 * p.duree) / p.manches) / 10 : null }];
      }),
    );
    const parClasse = Object.fromEntries(
      [...classes].map(([c, v]) => {
        const taux = v.manches ? v.gagnees / v.manches : null;
        if (taux !== null && v.duels >= CLASSE_MIN && taux > CLASSE_MAX) alertes.push(`${c} gagne ${Math.round(100 * taux)} % de ses manches (${v.duels} duels)`);
        return [c, { duels: v.duels, taux: v.duels >= PAIRE_MIN && taux !== null ? Math.round(100 * taux) : null }];
      }),
    );
    const ports = new Map<string, number>();
    for (const e of equipements) for (const o of e.objets) ports.set(o, (ports.get(o) ?? 0) + 1);
    const objets = [...ports].sort((x, y) => y[1] - x[1]).slice(0, 10).map(([id, n]) => ({ id, part: Math.round((100 * n) / Math.max(1, equipements.length)) }));
    if (equipements.length >= OBJET_MIN) for (const o of objets) if (o.part > 100 * OBJET_MAX) alertes.push(`${o.id} est porté dans ${o.part} % des équipements de duel`);
    return { duels: resultats.length, equipements: equipements.length, grille, classes: parClasse, objets, alertes };
  }
}
