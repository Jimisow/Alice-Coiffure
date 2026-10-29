// Génère config/env.js (lu par le navigateur) à partir de .env.
// Il n'y a pas de build : ce script est lancé par server.mjs au démarrage,
// et à lancer à la main avant un déploiement statique : `npm run env`.
//
// Seules les clés FIREBASE_* sont exportées. La config web Firebase n'est pas
// secrète (elle finit dans le navigateur) : la sécurité repose sur
// l'authentification + firestore.rules. Ne JAMAIS mettre de mot de passe ici.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const KEYS = {
  apiKey: 'FIREBASE_API_KEY',
  authDomain: 'FIREBASE_AUTH_DOMAIN',
  projectId: 'FIREBASE_PROJECT_ID',
  storageBucket: 'FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'FIREBASE_MESSAGING_SENDER_ID',
  appId: 'FIREBASE_APP_ID',
};

function parseEnv(text) {
  const vars = {};
  text.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match) vars[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  });
  return vars;
}

// Sources : le fichier .env (développement), puis les variables
// d'environnement du système, qui priment (Vercel : Settings → Environment Variables).
export function generateEnv(outDir = join(root, 'config')) {
  const envPath = join(root, '.env');
  const fileVars = existsSync(envPath) ? parseEnv(readFileSync(envPath, 'utf8')) : {};
  const vars = { ...fileVars, ...Object.fromEntries(Object.values(KEYS).filter((k) => process.env[k]).map((k) => [k, process.env[k]])) };
  const config = Object.fromEntries(Object.entries(KEYS).map(([key, name]) => [key, vars[name] || '']));
  const configured = Boolean(config.apiKey && config.projectId);

  writeFileSync(
    join(outDir, 'env.js'),
    '// FICHIER GÉNÉRÉ par scripts/env.mjs depuis .env — ne pas modifier à la main.\n' +
      `export const firebaseConfig = ${configured ? JSON.stringify(config, null, 2) : 'null'};\n`,
  );
  return configured;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(generateEnv() ? 'config/env.js : Firebase configuré.' : 'config/env.js : Firebase non configuré (.env vide).');
}
