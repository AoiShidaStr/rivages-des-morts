import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/**
 * L'éditeur de carte (editeur.html, seulement avec npm run dev) : il lit src/data/island.json et y enregistre ce
 * qu'on a déplacé, dans le même format compact (une ligne par polygone, par objet, par décor).
 */
function mapEditor(): Plugin {
  const islandFile = path.resolve('src/data/island.json');
  const decorDir = path.resolve('public/sprites/decor');
  return {
    name: 'editeur-de-carte',
    apply: 'serve',
    // island.json enregistré : seul le jeu se recharge, l'éditeur garde sa vue et son historique.
    handleHotUpdate({ file, server }) {
      if (path.resolve(file) !== islandFile) return;
      server.ws.send('editeur:ile', {});
      return [];
    },
    configureServer(server) {
      server.middlewares.use('/__editeur/ile', async (req, res) => {
        try {
          if (req.method === 'POST') {
            let body = '';
            for await (const chunk of req) body += chunk;
            await writeFile(islandFile, `${formatJson(JSON.parse(body))}\n`);
            res.end('ok');
          } else {
            res.setHeader('Content-Type', 'application/json');
            res.end(await readFile(islandFile, 'utf8'));
          }
        } catch (error) {
          res.statusCode = 500;
          res.end(String(error));
        }
      });
      // Les images de décor, par dossier : { "ile": ["arbre-mort", …], "rizieres": […] }.
      server.middlewares.use('/__editeur/decors', async (_req, res) => {
        const folders: Record<string, string[]> = {};
        for (const entry of await readdir(decorDir, { withFileTypes: true })) {
          if (!entry.isDirectory()) continue;
          const files = await readdir(path.join(decorDir, entry.name));
          folders[entry.name] = files.filter((f) => f.endsWith('.webp')).map((f) => f.slice(0, -5));
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(folders));
      });
    },
  };
}

/** Un polygone : une suite de points [u, v]. */
const isPolygon = (v: unknown) =>
  Array.isArray(v) && v.length > 0 && v.every((p) => Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === 'number'));
const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
/** Sur une ligne : les polygones, les listes simples, et les objets qui ne contiennent pas de polygones. */
const flat = (v: unknown): boolean =>
  isPolygon(v) ||
  (Array.isArray(v) && v.every((x) => x === null || typeof x !== 'object')) ||
  (isObject(v) && Object.values(v).every((x) => !(Array.isArray(x) && x.some(Array.isArray))));
const inline = (v: unknown): string =>
  Array.isArray(v)
    ? `[${v.map(inline).join(', ')}]`
    : isObject(v)
      ? `{ ${Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${inline(x)}`).join(', ')} }`
      : JSON.stringify(v);

function formatJson(v: unknown, indent = ''): string {
  if (indent && flat(v)) return inline(v);
  const pad = `${indent}  `;
  if (Array.isArray(v)) return v.length ? `[\n${v.map((x) => pad + formatJson(x, pad)).join(',\n')}\n${indent}]` : '[]';
  if (isObject(v)) return `{\n${Object.entries(v).map(([k, x]) => `${pad}${JSON.stringify(k)}: ${formatJson(x, pad)}`).join(',\n')}\n${indent}}`;
  return JSON.stringify(v);
}

export default defineConfig({
  plugins: [mapEditor()],
});
