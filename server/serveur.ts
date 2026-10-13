// Le serveur de Rivages des Morts : il sert le jeu construit (dist/), garde les comptes et leurs personnages
// (comptes.ts, sous /api), et relie les joueurs par WebSocket, sur le même port. Le même WebSocket porte le menu
// social (social.ts : amis, groupes, chat). Pour la coop, il ne fait que
// relayer : chaque page ouvre des salons (`openRoom` dans src/net/transport.ts), et le serveur transmet les messages
// d'un salon à ses autres membres. La partie elle-même tourne encore chez l'hôte.
//
// Lancement : `npm run serveur` (Node 22.18 ou plus récent lit le TypeScript directement), ou `docker compose up`.
// Réglages par variables d'environnement : PORT (8080), DIST (dist/ à côté du dossier server/), DONNEES (donnees/
// à côté du dossier server/ : la base des comptes).
import { chownSync, createReadStream, mkdirSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, type WebSocket } from 'ws';
import { Comptes } from './comptes.ts';
import { Social, type Page } from './social.ts';

const PORT = Number(process.env.PORT) || 8080;
const DIST = path.resolve(process.env.DIST ?? fileURLToPath(new URL('../dist', import.meta.url)));
const DONNEES = path.resolve(process.env.DONNEES ?? fileURLToPath(new URL('../donnees', import.meta.url)));
/** Un message plus gros est refusé : le plus gros du jeu (le départ d'une descente, avec les héros) fait quelques Ko. */
const MAX_MESSAGE = 1024 * 1024;
/** Noms de salon et identifiants de joueur : courts, sans caractères bizarres. */
const NAME = /^[\w:-]{1,64}$/;
/** Le salon de l'île partagée (src/net/presence.ts) : le menu social dit qui s'y promène. */
const ILE = 'ile';
/** Une page qui ne répond plus à ce rythme est considérée partie (onglet fermé sans prévenir, coupure réseau). */
const HEARTBEAT = 30_000;

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.wasm': 'application/wasm',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

// --- Les fichiers du jeu ---------------------------------------------------------------

async function serveFile(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://serveur');
  if (await comptes.handle(req, res, url.pathname)) return;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405).end();
    return;
  }
  if (url.pathname === '/sante') {
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: true, joueurs: clients.size, comptes: comptes.total, connectes: social.connectes }));
    return;
  }
  let relative: string;
  try {
    relative = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400).end();
    return;
  }
  if (relative.endsWith('/')) relative += 'index.html';
  const file = path.join(DIST, relative);
  // Rien en dehors de dist/ (« ../ » et compagnie).
  if (file !== DIST && !file.startsWith(DIST + path.sep)) {
    res.writeHead(403).end();
    return;
  }
  const info = await stat(file).catch(() => null);
  if (!info?.isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Introuvable');
    return;
  }
  // Les fichiers de Vite (assets/) portent leur empreinte dans leur nom : ils ne changent jamais. Le reste peut changer
  // à chaque mise à jour, le navigateur revérifie.
  const immutable = relative.startsWith('/assets/');
  res.writeHead(200, {
    'Content-Type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
    'Content-Length': info.size,
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    'Last-Modified': info.mtime.toUTCString(),
  });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  createReadStream(file).on('error', () => res.destroy()).pipe(res);
}

// --- Le relais -----------------------------------------------------------------------------

/** Une page du jeu : son identifiant (celui que le jeu appelle `selfId`) et les salons où elle est. */
interface Client {
  socket: WebSocket;
  id: string;
  rooms: Set<string>;
  alive: boolean;
  /** La page pour le menu social (son compte, une fois identifiée). */
  page: Page;
}

/** Messages de la page vers le serveur. */
type Incoming =
  | { t: 'hi'; id: string }
  | { t: 'join'; r: string }
  | { t: 'leave'; r: string }
  | { t: 'msg'; r: string; a: string; d: unknown; to?: string };

const clients = new Set<Client>();
/** Membres de chaque salon, par identifiant. */
const rooms = new Map<string, Map<string, Client>>();

function post(client: Client, message: unknown): void {
  if (client.socket.readyState === client.socket.OPEN) client.socket.send(JSON.stringify(message));
}

function join(client: Client, name: string): void {
  if (client.rooms.has(name)) return;
  let members = rooms.get(name);
  if (!members) rooms.set(name, (members = new Map()));
  // Le même identifiant ailleurs (page rechargée avant que l'ancienne connexion ne tombe) : l'ancienne place se libère.
  const stale = members.get(client.id);
  if (stale && stale !== client) leave(stale, name);
  post(client, { t: 'peers', r: name, ids: [...members.keys()] });
  for (const other of members.values()) post(other, { t: 'join', r: name, id: client.id });
  members.set(client.id, client);
  client.rooms.add(name);
  if (name === ILE) social.bouger(client.page);
}

function leave(client: Client, name: string): void {
  if (!client.rooms.delete(name)) return;
  if (name === ILE) social.bouger(client.page);
  const members = rooms.get(name);
  if (!members || members.get(client.id) !== client) return;
  members.delete(client.id);
  if (!members.size) rooms.delete(name);
  for (const other of members.values()) post(other, { t: 'leave', r: name, id: client.id });
}

function relay(client: Client, message: Extract<Incoming, { t: 'msg' }>): void {
  if (!client.rooms.has(message.r) || typeof message.a !== 'string') return;
  const members = rooms.get(message.r);
  if (!members) return;
  const text = JSON.stringify({ t: 'msg', r: message.r, a: message.a, d: message.d ?? null, from: client.id });
  const targets = message.to ? [members.get(message.to)] : [...members.values()];
  for (const target of targets) {
    if (target && target !== client && target.socket.readyState === target.socket.OPEN) target.socket.send(text);
  }
}

function receive(client: Client, raw: string): void {
  let message: Incoming;
  try {
    message = JSON.parse(raw) as Incoming;
  } catch {
    return;
  }
  if (!message || typeof message !== 'object') return;
  if (message.t !== 'hi' && message.t !== 'join' && message.t !== 'leave' && message.t !== 'msg') {
    social.recevoir(client.page, message as Record<string, unknown>);
    return;
  }
  if (message.t === 'hi') {
    // L'identifiant se choisit une fois, avant d'entrer dans un salon.
    if (!client.id && typeof message.id === 'string' && NAME.test(message.id)) client.id = message.id;
    return;
  }
  if (!client.id || typeof message.r !== 'string' || !NAME.test(message.r)) return;
  if (message.t === 'join') join(client, message.r);
  else if (message.t === 'leave') leave(client, message.r);
  else if (message.t === 'msg') relay(client, message);
}

// --- Démarrage -------------------------------------------------------------------------------

// Dans l'image Docker, le serveur démarre en root pour pouvoir écrire dans le dossier donnees/ monté depuis la
// machine (Docker le crée en root), puis il lui en donne la propriété et continue en utilisateur ordinaire (UTILISATEUR,
// « 1000:1000 », l'utilisateur node de l'image).
const utilisateur = process.env.UTILISATEUR?.split(':').map(Number);
if (utilisateur && process.getuid?.() === 0) {
  mkdirSync(DONNEES, { recursive: true });
  chownSync(DONNEES, utilisateur[0], utilisateur[1] ?? utilisateur[0]);
  process.setgid?.(utilisateur[1] ?? utilisateur[0]);
  process.setuid?.(utilisateur[0]);
}
const comptes = new Comptes(DONNEES);
const social = new Social(comptes);

const server = createServer((req, res) => {
  serveFile(req, res).catch((error: unknown) => {
    console.error(error);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  });
});

const sockets = new WebSocketServer({ server, path: '/ws', maxPayload: MAX_MESSAGE });
sockets.on('connection', (socket) => {
  const client: Client = {
    socket,
    id: '',
    rooms: new Set(),
    alive: true,
    page: { compte: null, envoyer: (message) => post(client, message), surIle: () => client.rooms.has(ILE) },
  };
  clients.add(client);
  socket.on('pong', () => (client.alive = true));
  socket.on('message', (data, binary) => {
    if (!binary) receive(client, data.toString());
  });
  socket.on('close', () => {
    for (const name of [...client.rooms]) leave(client, name);
    clients.delete(client);
    social.quitter(client.page);
  });
  socket.on('error', () => socket.terminate());
});

setInterval(() => {
  for (const client of clients) {
    if (!client.alive) {
      client.socket.terminate();
      continue;
    }
    client.alive = false;
    client.socket.ping();
  }
}, HEARTBEAT).unref();

server.listen(PORT, () => console.log(`Rivages des Morts : http://localhost:${PORT} (jeu : ${DIST}, données : ${DONNEES})`));

const stop = () => {
  sockets.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2_000).unref();
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
