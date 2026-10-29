// Logique « Réglages » : sauvegarde/restauration par fichier, remise à zéro,
// et façade sur la synchro cloud (l'écran n'importe jamais data/ directement).

import {
  exportSnapshot, importSnapshot, clearAll, loadDemoData,
  syncNow, signIn, signOut, getSyncStatus, onSyncStatus,
} from '../../data/index.js';
import { todayISO } from '../../shared/utils/dateUtils.js';

export { syncNow, signIn, signOut, getSyncStatus, onSyncStatus };

export function getDataStats() {
  const { collections } = exportSnapshot();
  const count = (name) => Object.values(collections[name]).filter((doc) => !doc.deleted).length;
  return { clients: count('clients'), visits: count('visits'), appointments: count('appointments') };
}

// Télécharge toutes les données dans un fichier .json (à garder dans ses
// fichiers / Drive / envoyer par mail). C'est le filet de sécurité tant que
// Firebase n'est pas branché.
export function downloadBackup() {
  const blob = new Blob([JSON.stringify(exportSnapshot(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), {
    href: url,
    download: `alice-coiffure-sauvegarde-${todayISO()}.json`,
  });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function restoreBackup(file) {
  let snapshot;
  try {
    snapshot = JSON.parse(await file.text());
  } catch {
    throw new Error('Fichier illisible : choisissez un fichier de sauvegarde .json.');
  }
  importSnapshot(snapshot);
}

export async function eraseEverything() {
  clearAll();
}

export async function loadDemo() {
  await loadDemoData();
}
