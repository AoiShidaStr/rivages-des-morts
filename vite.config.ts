import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { formatAnimations } from './tools/pixel/format-animations.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));

/**
 * Éditeur d'animations (editeur.html, en développement seulement) : il enregistre ses poses dans
 * tools/pixel/heros-animations.json par une requête POST sur /__editeur/animations.
 */
function animationEditor(): Plugin {
  return {
    name: 'editeur-animations',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__editeur/animations', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('POST seulement');
          return;
        }
        try {
          let body = '';
          for await (const chunk of req) body += chunk;
          const data = JSON.parse(body);
          if (!data.melee) throw new Error('animations de mêlée manquantes');
          await writeFile(path.join(root, 'tools', 'pixel', 'heros-animations.json'), formatAnimations(data));
          res.end('ok');
        } catch (error) {
          res.statusCode = 400;
          res.end(error instanceof Error ? error.message : String(error));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [animationEditor()],
});
