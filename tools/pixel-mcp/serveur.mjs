#!/usr/bin/env node
// Serveur MCP de retouche pixel art pour Rivages des morts.
// Inspiré de pixel-mcp (adrianoamaral) mais réécrit : il ouvre des PNG existants, retrouve la vraie
// taille de pixel d'une image IA, la recale en pixels nets, applique une palette commune, détoure,
// contoure et assemble des morceaux de carte. Lancement : node tools/pixel-mcp/serveur.mjs --dossier <sortie>
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname, resolve, isAbsolute } from 'node:path';
import * as px from './pixels.mjs';

const arg = process.argv.indexOf('--dossier');
const dossier = resolve(arg !== -1 && process.argv[arg + 1] ? process.argv[arg + 1] : process.cwd());
const chemin = (p) => (isAbsolute(p) ? p : resolve(dossier, p));
const source = (p) => (isAbsolute(p) ? p : resolve(process.cwd(), p));

const toiles = new Map();
const palettes = new Map();
const historique = new Map(); // nom → copies précédentes (annuler)

function toile(nom) {
  const t = toiles.get(nom);
  if (!t) throw new Error(`toile « ${nom} » inconnue (charger_png ou creer_toile d'abord)`);
  return t;
}
function remplacer(nom, t) {
  if (toiles.has(nom)) {
    const h = historique.get(nom) ?? [];
    h.push(toiles.get(nom));
    if (h.length > 20) h.shift();
    historique.set(nom, h);
  }
  toiles.set(nom, t);
  return t;
}
function palette(nom) {
  const p = palettes.get(nom);
  if (!p) throw new Error(`palette « ${nom} » inconnue`);
  return p;
}
const texte = (t) => ({ content: [{ type: 'text', text: t }] });
const resume = (nom, t) => {
  const s = px.stats(t);
  return `${nom} : ${t.width}×${t.height}, ${s.couleurs} couleurs, contenu ${s.bbox ? s.bbox.join(',') : 'vide'}`;
};
const outil = (nom, desc, schema, f) =>
  server.tool(nom, desc, schema, async (a) => {
    try {
      return texte(await f(a));
    } catch (e) {
      return { ...texte(`erreur : ${e.message}`), isError: true };
    }
  });

const server = new McpServer({ name: 'pixel-rivages', version: '1.0.0' });
const nomT = z.string().default('principale').describe('Nom de la toile');

outil('creer_toile', 'Crée une toile transparente (ou remplie).', {
  nom: nomT, largeur: z.number().int().min(1).max(8192), hauteur: z.number().int().min(1).max(8192),
  couleur: z.string().optional(),
}, ({ nom, largeur, hauteur, couleur }) => {
  const t = px.creer(largeur, hauteur);
  if (couleur) px.rectangle(t, 0, 0, largeur, hauteur, px.couleur(couleur));
  remplacer(nom, t);
  return resume(nom, t);
});

outil('charger_png', 'Ouvre un PNG/WebP/JPG existant dans une toile, éventuellement recadré (x, y, largeur, hauteur).', {
  nom: nomT, fichier: z.string(), x: z.number().int().optional(), y: z.number().int().optional(),
  largeur: z.number().int().optional(), hauteur: z.number().int().optional(),
}, async ({ nom, fichier, x, y, largeur, hauteur }) => {
  let img = sharp(source(fichier)).ensureAlpha();
  if (largeur && hauteur) img = img.extract({ left: x ?? 0, top: y ?? 0, width: largeur, height: hauteur });
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const t = { width: info.width, height: info.height, data: Buffer.from(data) };
  remplacer(nom, t);
  return resume(nom, t);
});

outil('lister', 'Liste les toiles et palettes chargées.', {}, () => {
  const l = [...toiles].map(([n, t]) => resume(n, t));
  const p = [...palettes].map(([n, c]) => `palette ${n} : ${c.length} couleurs`);
  return [...l, ...p].join('\n') || 'rien de chargé';
});

outil('infos', 'Taille, nombre de couleurs, cadre du contenu, couleurs les plus fréquentes.', { nom: nomT }, ({ nom }) => {
  const t = toile(nom);
  const s = px.stats(t);
  return `${resume(nom, t)}\nfréquentes : ${s.frequentes.map(([c, n]) => `${c}×${n}`).join(' ')}`;
});

outil('taille_pixel', "Estime la taille d'un « gros pixel » (image IA ou agrandie) et le décalage de la grille.", { nom: nomT }, ({ nom }) => {
  const g = px.detecterGrille(toile(nom));
  return `taille ≈ ${g.taille} (x : ${g.tx.toFixed(2)}, y : ${g.ty.toFixed(2)}), décalage ${g.dx},${g.dy}, confiance ${g.confiance.toFixed(2)}`;
});

outil('recaler_grille', 'Recale une image sur sa grille : chaque bloc devient un vrai pixel (couleur majoritaire). Sans taille, elle est détectée.', {
  nom: nomT, taille: z.number().positive().optional(), dx: z.number().int().optional(), dy: z.number().int().optional(),
  vers: z.string().optional().describe('Toile de sortie (par défaut : la même)'),
}, ({ nom, taille, dx, dy, vers }) => {
  const t = toile(nom);
  const g = taille ? { taille, dx: dx ?? 0, dy: dy ?? 0 } : px.detecterGrille(t);
  const r = px.recaler(t, g.taille, g.dx, g.dy);
  remplacer(vers ?? nom, r);
  return `grille ${g.taille} → ${resume(vers ?? nom, r)}`;
});

outil('redimensionner', 'Change la taille au plus proche voisin (facteur, ou largeur/hauteur). Jamais de lissage.', {
  nom: nomT, facteur: z.number().positive().optional(), largeur: z.number().int().optional(), hauteur: z.number().int().optional(),
  vers: z.string().optional(),
}, ({ nom, facteur, largeur, hauteur, vers }) => {
  const t = toile(nom);
  const w = largeur ?? Math.max(1, Math.round(t.width * (facteur ?? (hauteur ? hauteur / t.height : 1))));
  const h = hauteur ?? Math.max(1, Math.round(t.height * (facteur ?? (largeur ? largeur / t.width : 1))));
  const r = px.plusProcheVoisin(t, w, h);
  remplacer(vers ?? nom, r);
  return resume(vers ?? nom, r);
});

outil('reduire', 'Réduit une image trop détaillée à une hauteur cible en prenant la couleur majoritaire de chaque zone (garde des pixels nets).', {
  nom: nomT, hauteur: z.number().int().min(1), vers: z.string().optional(),
}, ({ nom, hauteur, vers }) => {
  const t = toile(nom);
  const r = px.recaler(t, t.height / hauteur, 0, 0);
  remplacer(vers ?? nom, r);
  return resume(vers ?? nom, r);
});

outil('extraire_palette', "Calcule une palette de N couleurs (médiane) à partir d'une ou plusieurs toiles.", {
  palette: z.string(), toiles: z.array(z.string()).min(1), couleurs: z.number().int().min(2).max(256),
}, ({ palette: p, toiles: noms, couleurs }) => {
  const c = px.medianCut(noms.map(toile), couleurs);
  palettes.set(p, c);
  return `palette ${p} : ${c.map(px.hex).join(' ')}`;
});

outil('definir_palette', 'Définit une palette à partir de couleurs hexadécimales, ou des pixels d\'un PNG (une case par couleur).', {
  palette: z.string(), couleurs: z.array(z.string()).optional(), fichier: z.string().optional(),
}, async ({ palette: p, couleurs, fichier }) => {
  let c;
  if (fichier) {
    const { data } = await sharp(source(fichier)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const vus = new Map();
    for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 127) vus.set(px.hex([data[i], data[i + 1], data[i + 2]]), [data[i], data[i + 1], data[i + 2]]);
    c = [...vus.values()];
  } else c = (couleurs ?? []).map((h) => px.couleur(h).slice(0, 3));
  if (!c.length) throw new Error('palette vide');
  palettes.set(p, c);
  return `palette ${p} : ${c.length} couleurs`;
});

outil('appliquer_palette', 'Ramène chaque pixel à la couleur la plus proche de la palette (distance perceptive, sans tramage par défaut).', {
  nom: nomT, palette: z.string(), tramage: z.boolean().default(false),
}, ({ nom, palette: p, tramage }) => {
  const r = px.appliquerPalette(toile(nom), palette(p), tramage);
  remplacer(nom, r);
  return resume(nom, r);
});

outil('ajuster_couleurs', 'Règle luminosité, contraste, saturation et teinte chaude/froide (avant d\'appliquer une palette).', {
  nom: nomT, luminosite: z.number().default(0).describe('-1..1'), contraste: z.number().default(0).describe('-1..1'),
  saturation: z.number().default(0).describe('-1..1'), chaleur: z.number().default(0).describe('-1 froid .. 1 chaud'),
}, (a) => {
  const r = px.ajuster(toile(a.nom), a);
  remplacer(a.nom, r);
  return resume(a.nom, r);
});

outil('detourer', 'Rend transparent un fond uni (magenta, vert…) ; sans couleur, prend celle des coins.', {
  nom: nomT, couleur: z.string().optional(), tolerance: z.number().min(0).max(442).default(60),
}, ({ nom, couleur, tolerance }) => {
  const r = px.detourer(toile(nom), couleur ? px.couleur(couleur) : null, tolerance);
  remplacer(nom, r);
  return resume(nom, r);
});

outil('nettoyer_alpha', 'Supprime la semi-transparence (seuil) et les pixels isolés.', {
  nom: nomT, seuil: z.number().int().min(0).max(255).default(128), isoles: z.boolean().default(true),
}, ({ nom, seuil, isoles }) => {
  const r = px.nettoyerAlpha(toile(nom), seuil, isoles);
  remplacer(nom, r);
  return resume(nom, r);
});

outil('contour', 'Ajoute un contour d\'un pixel autour du contenu (extérieur), ou assombrit le bord intérieur.', {
  nom: nomT, couleur: z.string().default('#141016'), interieur: z.boolean().default(false), diagonales: z.boolean().default(false),
}, ({ nom, couleur, interieur, diagonales }) => {
  const r = px.contour(toile(nom), px.couleur(couleur), interieur, diagonales);
  remplacer(nom, r);
  return resume(nom, r);
});

outil('recadrer', 'Recadre une toile (rectangle), ou automatiquement sur son contenu avec une marge.', {
  nom: nomT, x: z.number().int().optional(), y: z.number().int().optional(), largeur: z.number().int().optional(),
  hauteur: z.number().int().optional(), marge: z.number().int().default(0), vers: z.string().optional(),
}, ({ nom, x, y, largeur, hauteur, marge, vers }) => {
  const t = toile(nom);
  let b = largeur && hauteur ? [x ?? 0, y ?? 0, (x ?? 0) + largeur, (y ?? 0) + hauteur] : px.stats(t).bbox;
  if (!b) throw new Error('toile vide');
  if (!(largeur && hauteur)) b = [b[0] - marge, b[1] - marge, b[2] + marge, b[3] + marge];
  const r = px.recadrer(t, b);
  remplacer(vers ?? nom, r);
  return resume(vers ?? nom, r);
});

outil('miroir', 'Retourne horizontalement (ou verticalement).', { nom: nomT, vertical: z.boolean().default(false) }, ({ nom, vertical }) => {
  const r = px.miroir(toile(nom), vertical);
  remplacer(nom, r);
  return resume(nom, r);
});

outil('coller', 'Colle une toile sur une autre en (x, y), avec transparence ; option répéter pour paver une zone.', {
  dans: z.string(), source: z.string(), x: z.number().int().default(0), y: z.number().int().default(0),
  repeter_largeur: z.number().int().optional(), repeter_hauteur: z.number().int().optional(),
}, ({ dans, source, x, y, repeter_largeur, repeter_hauteur }) => {
  const d = px.copie(toile(dans));
  const s = toile(source);
  const W = repeter_largeur ?? s.width;
  const H = repeter_hauteur ?? s.height;
  for (let oy = 0; oy < H; oy += s.height) for (let ox = 0; ox < W; ox += s.width) px.coller(d, s, x + ox, y + oy);
  remplacer(dans, d);
  return resume(dans, d);
});

outil('pixel', 'Pose des pixels : liste de [x, y, couleur].', {
  nom: nomT, points: z.array(z.tuple([z.number().int(), z.number().int(), z.string()])),
}, ({ nom, points }) => {
  const t = px.copie(toile(nom));
  for (const [x, y, c] of points) px.poser(t, x, y, px.couleur(c));
  remplacer(nom, t);
  return `${points.length} pixels posés`;
});

outil('rectangle', 'Remplit un rectangle.', {
  nom: nomT, x: z.number().int(), y: z.number().int(), largeur: z.number().int(), hauteur: z.number().int(), couleur: z.string(),
}, ({ nom, x, y, largeur, hauteur, couleur }) => {
  const t = px.copie(toile(nom));
  px.rectangle(t, x, y, largeur, hauteur, px.couleur(couleur));
  remplacer(nom, t);
  return resume(nom, t);
});

outil('ligne', 'Trace une ligne (Bresenham).', {
  nom: nomT, x1: z.number().int(), y1: z.number().int(), x2: z.number().int(), y2: z.number().int(), couleur: z.string(),
}, ({ nom, x1, y1, x2, y2, couleur }) => {
  const t = px.copie(toile(nom));
  px.ligne(t, x1, y1, x2, y2, px.couleur(couleur));
  remplacer(nom, t);
  return resume(nom, t);
});

outil('lire_pixel', "Couleur d'un pixel.", { nom: nomT, x: z.number().int(), y: z.number().int() }, ({ nom, x, y }) =>
  px.hex(px.lire(toile(nom), x, y), true));

outil('annuler', 'Annule la dernière modification de la toile.', { nom: nomT }, ({ nom }) => {
  const h = historique.get(nom);
  if (!h?.length) throw new Error('rien à annuler');
  toiles.set(nom, h.pop());
  return resume(nom, toile(nom));
});

outil('exporter_png', 'Écrit la toile en PNG (agrandissement au plus proche voisin possible pour l\'aperçu).', {
  nom: nomT, fichier: z.string(), agrandir: z.number().int().min(1).max(16).default(1),
}, async ({ nom, fichier, agrandir }) => {
  let t = toile(nom);
  if (agrandir > 1) t = px.plusProcheVoisin(t, t.width * agrandir, t.height * agrandir);
  const f = chemin(fichier);
  mkdirSync(dirname(f), { recursive: true });
  await sharp(t.data, { raw: { width: t.width, height: t.height, channels: 4 } }).png({ compressionLevel: 9 }).toFile(f);
  return `écrit ${f} (${t.width}×${t.height})`;
});

outil('exporter_palette', 'Écrit une palette en PNG (une case de 1 px par couleur) et en liste hexadécimale.', {
  palette: z.string(), fichier: z.string(),
}, async ({ palette: p, fichier }) => {
  const c = palette(p);
  const t = px.creer(c.length, 1);
  c.forEach((col, i) => px.poser(t, i, 0, [...col, 255]));
  const f = chemin(fichier);
  mkdirSync(dirname(f), { recursive: true });
  await sharp(t.data, { raw: { width: t.width, height: 1, channels: 4 } }).png().toFile(f);
  return `écrit ${f} : ${c.map((x) => px.hex(x)).join(' ')}`;
});

await server.connect(new StdioServerTransport());
