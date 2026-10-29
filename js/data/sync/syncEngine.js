// Synchronisation « local d'abord » : l'app lit et écrit TOUJOURS dans le
// stockage local (instantané, hors-ligne). Ce moteur, en arrière-plan :
//   1. envoie au cloud les documents en attente (outbox du store),
//   2. récupère ce qui a changé côté cloud depuis le dernier passage
//      (autre téléphone, restauration) et le fusionne (le plus récent gagne).
// Il se relance au retour du réseau, après chaque écriture (léger délai) et
// à intervalle régulier. Sans configuration Firebase, il reste inactif et
// l'app fonctionne en 100 % local.

import { pendingChanges, acknowledge, mergeRemote, getMeta, onChange, COLLECTIONS } from '../local/store.js';
import { createFirebaseRemote } from './firebaseRemote.js';

const PUSH_DELAY_MS = 2000;
const PERIODIC_MS = 5 * 60 * 1000;

let remote = null;
let running = false;
let pushTimer = null;
let lastError = null;
const listeners = new Set();

function isOnline() {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

function emit() {
  const status = getSyncStatus();
  listeners.forEach((listener) => listener(status));
}

export function getSyncStatus() {
  const meta = getMeta();
  return {
    configured: Boolean(remote?.configured),
    signedIn: Boolean(remote?.user),
    email: remote?.user?.email || null,
    online: isOnline(),
    syncing: running,
    pending: meta.pending,
    lastSyncAt: meta.lastSyncAt,
    error: lastError,
  };
}

export function onSyncStatus(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function syncNow() {
  if (running || !remote?.user || !isOnline()) {
    emit();
    return getSyncStatus();
  }
  running = true;
  lastError = null;
  emit();
  try {
    const changes = pendingChanges();
    if (changes.length) await remote.push(changes);

    const since = getMeta().lastPullAt;
    for (const collection of COLLECTIONS) {
      mergeRemote(collection, await remote.pull(collection, since));
    }

    // Un document modifié PENDANT l'envoi reste dans la file pour le prochain passage.
    const sent = new Map(changes.map((change) => [change.key, change.doc.updatedAt]));
    const done = pendingChanges()
      .filter((change) => sent.get(change.key) === change.doc.updatedAt)
      .map((change) => change.key);
    acknowledge(done, new Date().toISOString());
  } catch (error) {
    lastError = error?.message || 'Synchronisation impossible.';
  } finally {
    running = false;
    emit();
  }
  return getSyncStatus();
}

// Archive cloud (tout ce qui a été supprimé), si connectée et en ligne ;
// sinon liste vide (la Corbeille se contente alors des données locales).
export async function fetchArchive() {
  if (!remote?.user || !isOnline()) return [];
  try {
    return await remote.listArchive();
  } catch {
    return [];
  }
}

export async function signIn(email, password) {
  if (!remote?.configured) throw new Error('Firebase n’est pas encore configuré.');
  await remote.signIn(email, password);
  emit();
  syncNow();
}

export async function signOut() {
  await remote?.signOut();
  emit();
}

export async function startSync() {
  remote = await createFirebaseRemote(() => {
    emit();
    syncNow();
  });
  if (typeof window === 'undefined') return;

  window.addEventListener('online', () => syncNow());
  // App rouverte (retour au premier plan) : on récupère ce qu'un autre téléphone a pu changer.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncNow();
  });
  window.addEventListener('offline', emit);
  setInterval(() => syncNow(), PERIODIC_MS);
  onChange(() => {
    emit();
    // Seulement s'il reste des envois : sinon la fin d'une synchro (qui écrit
    // aussi dans le store) en relancerait une autre, à l'infini.
    if (!getMeta().pending) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => syncNow(), PUSH_DELAY_MS);
  });
  emit();
}
