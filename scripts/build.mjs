// Build de production (Vercel) : copie dans dist/ UNIQUEMENT ce que le
// navigateur doit recevoir, et y génère config/env.js depuis les variables
// d'environnement. Pas de bundler : les fichiers sont servis tels quels.
//   npm run build   → dist/
//
// Sur Vercel, une config Firebase absente fait ÉCHOUER le build : sinon le
// site partirait en ligne sans synchro, en silence.

import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateEnv } from './env.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const PUBLIC = ['index.html', 'manifest.json', 'sw.js', 'css', 'js', 'images'];

rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, 'config'), { recursive: true });
PUBLIC.forEach((entry) => cpSync(join(root, entry), join(dist, entry), { recursive: true }));

const configured = generateEnv(join(dist, 'config'));
if (!configured && process.env.VERCEL) {
  console.error('✗ Variables FIREBASE_* manquantes : Vercel → Settings → Environment Variables (voir .env.example).');
  process.exit(1);
}
console.log(`✓ dist/ prêt (${configured ? 'Firebase configuré' : 'sans Firebase : mode 100 % local'}).`);
