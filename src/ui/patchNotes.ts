// « Nouveautés » : les notes de version, écrites en Markdown dans docs/patch-notes (une par version), lues au build.
// En tête de chaque fichier : version, date et titre, entre deux lignes « --- ».
import { h } from './dom';
import type { PanelHost } from './panels';

export interface PatchNote {
  version: string;
  /** AAAA-MM-JJ. */
  date: string;
  title: string;
  body: string;
}

const files = import.meta.glob<string>('../../docs/patch-notes/*.md', { query: '?raw', import: 'default', eager: true });

/** Les notes, de la plus récente à la plus ancienne (par date, puis par version). */
export const patchNotes: PatchNote[] = Object.values(files)
  .map(parse)
  .filter((note): note is PatchNote => note !== null)
  .sort((a, b) => b.date.localeCompare(a.date) || compareVersions(b.version, a.version));

/** Dernière version publiée, affichée sur l'écran titre. */
export const latestVersion = patchNotes[0]?.version ?? '';

const SEEN_KEY = 'rivages-des-morts:nouveautes-vues';

/** Vrai tant que le joueur n'a pas ouvert les notes de la dernière version. */
export function hasUnseenNotes(): boolean {
  try {
    return latestVersion !== '' && localStorage.getItem(SEEN_KEY) !== latestVersion;
  } catch {
    return false;
  }
}

export function openPatchNotes(host: PanelHost, onClose: () => void): void {
  try {
    localStorage.setItem(SEEN_KEY, latestVersion);
  } catch {
    // Stockage indisponible : le rappel reviendra.
  }
  host.show(
    'Nouveautés',
    latestVersion ? `Version ${latestVersion}` : null,
    h(
      'div',
      { class: 'list patch-notes' },
      patchNotes.length ? null : h('p', { class: 'note' }, 'Aucune note de version pour le moment.'),
      ...patchNotes.map((note, i) =>
        h(
          'details',
          { class: 'patch-note', open: i === 0 },
          h('summary', {}, h('strong', {}, `Version ${note.version}`), ` · ${note.title}`, h('small', {}, formatDate(note.date))),
          h('div', { class: 'patch-body' }, ...renderMarkdown(note.body)),
        ),
      ),
    ),
    { onClose },
  );
}

function parse(raw: string): PatchNote | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) return null;
  const meta: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const [key, ...rest] = line.split(':');
    if (rest.length) meta[key.trim()] = rest.join(':').trim();
  }
  if (!meta.version || !meta.date) return null;
  return { version: meta.version, date: meta.date, title: meta.titre ?? '', body: match[2] };
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff) return diff;
  }
  return 0;
}

/** « 30 septembre 2026 ». */
function formatDate(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  return Number.isNaN(d.getTime()) ? date : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Le peu de Markdown des notes : titres (##, ###), listes (- ou •), paragraphes et **gras**. */
function renderMarkdown(text: string): HTMLElement[] {
  const out: HTMLElement[] = [];
  let list: HTMLUListElement | null = null;
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) out.push(h('p', {}, ...inline(paragraph.join(' '))));
    paragraph = [];
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    const item = /^[-•*]\s+(.*)$/.exec(line);
    if (heading || !line) {
      flush();
      list = null;
      if (heading) out.push(h('h3', {}, ...inline(heading[2])));
    } else if (item) {
      flush();
      if (!list) out.push((list = h('ul', {})));
      list.append(h('li', {}, ...inline(item[1])));
    } else {
      list = null;
      paragraph.push(line);
    }
  }
  flush();
  return out;
}

function inline(text: string): (string | HTMLElement)[] {
  return text.split(/(\*\*[^*]+\*\*)/).map((part) => (part.startsWith('**') && part.endsWith('**') ? h('strong', {}, part.slice(2, -2)) : part));
}
