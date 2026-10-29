// Vérifie, en LECTURE SEULE, que Firebase est prêt pour Alice Coiffure :
//   1. la connexion e-mail / mot de passe est activée ;
//   2. la base Firestore existe et des règles sont publiées.
// Aucune donnée n'est créée ni modifiée.   npm run check:firebase
//
// Optionnel : EMAIL=... PASSWORD=... npm run check:firebase
//   → se connecte avec le compte d'Alice et vérifie que les règles
//     communes (bloc aliceCoiffure) l'autorisent à lire son dossier.

import { readFileSync } from 'node:fs';

const env = Object.fromEntries(readFileSync(new URL('../.env', import.meta.url), 'utf8')
  .split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2]]));
const key = env.FIREBASE_API_KEY;
const project = env.FIREBASE_PROJECT_ID;
if (!key || !project) {
  console.log('✗ .env incomplet (FIREBASE_API_KEY / FIREBASE_PROJECT_ID).');
  process.exit(1);
}

const auth = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${key}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(process.env.EMAIL
    ? { email: process.env.EMAIL, password: process.env.PASSWORD, returnSecureToken: true }
    : { email: 'verification-inexistante@example.com', password: 'x-verification', returnSecureToken: true }),
}).then((r) => r.json());

const authError = auth.error?.message || '';
if (authError.includes('PASSWORD_LOGIN_DISABLED') || authError.includes('OPERATION_NOT_ALLOWED')) {
  console.log('✗ Connexion e-mail/mot de passe DÉSACTIVÉE (Authentication → Sign-in method → E-mail/Mot de passe).');
} else if (process.env.EMAIL && auth.idToken) {
  console.log(`✓ Connexion réussie avec ${process.env.EMAIL}.`);
} else if (process.env.EMAIL) {
  console.log(`✗ Connexion refusée pour ${process.env.EMAIL} : ${authError}`);
} else {
  console.log('✓ Connexion e-mail/mot de passe activée.');
}

const base = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
const path = auth.idToken ? `aliceCoiffure/${auth.localId}/settings` : 'aliceCoiffure/verification/settings';
const res = await fetch(`${base}/${path}?pageSize=1`, {
  headers: auth.idToken ? { Authorization: `Bearer ${auth.idToken}` } : {},
}).then((r) => r.json());

const code = res.error?.status;
if (!res.error) console.log('✓ Firestore répond et les règles autorisent ce compte à lire son dossier.');
else if (code === 'PERMISSION_DENIED' && !auth.idToken) console.log('✓ Firestore existe (accès anonyme refusé, comme prévu).');
else if (code === 'PERMISSION_DENIED') console.log('✗ Accès refusé : publiez firestore.rules (fichier commun) dans la console.');
else console.log(`✗ Firestore : ${res.error.message}`);
