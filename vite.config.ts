import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
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

/**
 * Les PNG de public/sprites, convertis en WebP à côté d'eux dans dist/ (src/render/imageUrl.ts les demande) : sur les
 * images peintes, 60 à 80 % de moins à télécharger, sans différence visible. Les petites images (pixel art, icônes)
 * passent sans perte. Les PNG restent dans dist/ pour ce qui les demande encore par leur nom (CSS, index.html).
 */
function webpSprites(): Plugin {
  let outDir = 'dist';
  return {
    name: 'sprites-webp',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      const sharp = (await import('sharp')).default;
      const root = path.join(outDir, 'sprites');
      const files = (await readdir(root, { recursive: true })).filter((f) => f.endsWith('.png')).map((f) => path.join(root, f));
      let before = 0;
      let after = 0;
      const convert = async (file: string) => {
        const size = (await stat(file)).size;
        const image = sharp(file);
        const webp = await (size < 100_000 ? image.webp({ lossless: true }) : image.webp({ quality: 90, alphaQuality: 100, smartSubsample: true })).toBuffer();
        await writeFile(file.replace(/\.png$/, '.webp'), webp);
        before += size;
        after += webp.length;
      };
      // Quelques conversions à la fois : sharp travaille déjà sur plusieurs cœurs.
      const queue = [...files];
      await Promise.all(Array.from({ length: 4 }, async () => {
        for (let file = queue.shift(); file; file = queue.shift()) await convert(file);
      }));
      console.log(`Sprites en WebP : ${files.length} PNG, ${(before / 1e6).toFixed(1)} Mo → ${(after / 1e6).toFixed(1)} Mo`);
    },
  };
}

/**
 * version.json : le fichier principal du jeu (son nom change avec le code) et PROTOCOL. Une page ouverte le relit de
 * temps en temps et propose de recharger quand il a changé (src/ui/newVersion.ts).
 */
function versionFile(): Plugin {
  return {
    name: 'version-json',
    apply: 'build',
    async generateBundle(_options, bundle) {
      const entry = Object.values(bundle).find((chunk) => chunk.type === 'chunk' && chunk.isEntry && chunk.name === 'index');
      const protocol = Number(/export const PROTOCOL = (\d+)/.exec(await readFile('src/net/protocol.ts', 'utf8'))?.[1] ?? 0);
      if (!entry) return;
      this.emitFile({ type: 'asset', fileName: 'version.json', source: `${JSON.stringify({ entry: entry.fileName, protocol })}\n` });
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

export default defineConfig(({ isSsrBuild }) => ({
  plugins: isSsrBuild ? [mapEditor()] : [mapEditor(), webpSprites(), versionFile()],
  // Le serveur (`npm run serveur:build`) : un seul fichier pour Node, avec le moteur du jeu pour les parties qu'il
  // tient. Les images du jeu restent dans dist/.
  build: isSsrBuild ? { copyPublicDir: false, target: 'node22' } : undefined,
  // `npm run serveur` à côté de `npm run dev` : la coop et les comptes du serveur marchent aussi en développement
  // (`?reseau=serveur`).
  server: { proxy: { '/ws': { target: 'ws://localhost:8080', ws: true }, '/api': 'http://localhost:8080' } },
}));
