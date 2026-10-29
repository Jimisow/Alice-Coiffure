// Point d'entrée UNIQUE de la couche données. Les features n'importent que
// d'ici — jamais `local/` ou `sync/` directement.
//
// Architecture « local d'abord » : les repositories lisent/écrivent dans le
// stockage du téléphone (marche sans réseau) ; le moteur de synchro pousse
// ensuite vers Firebase quand c'est possible. Les features ne savent rien
// du cloud, sauf l'écran Réglages qui affiche l'état de synchro.

export {
  clientRepository,
  appointmentRepository,
  visitRepository,
  settingsRepository,
  exportSnapshot,
  importSnapshot,
  clearAll,
  loadDemoData,
} from './local/index.js';

export { startSync, syncNow, signIn, signOut, getSyncStatus, onSyncStatus } from './sync/syncEngine.js';
export { getTrash, restoreFromTrash } from './trash.js';
