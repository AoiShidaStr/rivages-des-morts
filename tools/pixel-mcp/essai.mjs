// Essai du serveur sans Claude : node tools/pixel-mcp/essai.mjs '[["outil", {arguments}], …]' (sorties dans tools/pixel-mcp/sortie).
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const c = new Client({ name: 't', version: '1' });
await c.connect(new StdioClientTransport({ command: 'node', args: ['tools/pixel-mcp/serveur.mjs', '--dossier', 'tools/pixel-mcp/sortie'] }));
const appels = JSON.parse(process.argv[2]);
for (const [n, a] of appels) { const r = await c.callTool({ name: n, arguments: a }); console.log(n, '→', r.content[0].text.slice(0, 400)); }
await c.close();
