// Serveur de développement sans dépendance : fichiers statiques, sans cache.
//   node server.mjs          (ou npm start)   → http://localhost:5174
//   PORT=8080 node server.mjs
// Écoute aussi sur le réseau local pour tester depuis un téléphone en Wi-Fi
// (l'adresse est affichée au démarrage).

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateEnv } from './scripts/env.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 5174;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
};

// Fichiers jamais servis (secrets, outillage).
const BLOCKED = /(^|[\\/])(\.env|\.git|\.claude|\.gemini|node_modules|Versions)([\\/]|$)/;

const firebaseReady = generateEnv();

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  // Un dossier (« /guide/ ») sert son index.html, comme Vercel.
  const file = normalize(join(root, path.endsWith('/') ? `${path}index.html` : path));
  if (!file.startsWith(root) || BLOCKED.test(file.slice(root.length))) {
    res.writeHead(403).end('Interdit');
    return;
  }
  try {
    if (!(await stat(file)).isFile()) throw new Error('not a file');
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Introuvable');
  }
}).listen(port, '0.0.0.0', () => {
  const lan = Object.values(networkInterfaces()).flat()
    .find((net) => net?.family === 'IPv4' && !net.internal)?.address;
  console.log(`Alice Coiffure → http://localhost:${port}/`);
  if (lan) console.log(`Sur le téléphone (même Wi-Fi) → http://${lan}:${port}/`);
  console.log(firebaseReady ? 'Firebase : configuré (.env)' : 'Firebase : non configuré, mode 100 % local');
});
