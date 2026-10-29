// Corbeille : tout ce qui a été supprimé et peut être restauré.
// Deux sources fusionnées (la plus récente gagne pour un même document) :
//   - le téléphone : les pierres tombales gardent le contenu (local/store.js) ;
//   - l'archive Firebase : utile après un changement de téléphone.
// Contrat :
//   getTrash()                       -> Promise<{ clients: Doc[], visits: Doc[], appointments: Doc[] }>
//                                       (chaque Doc garde son contenu + `deletedAt` en ms)
//   restoreFromTrash(collection, doc) -> Promise<Doc>   (remis en service, re-synchronisé)

import { readDeleted, readOne, restoreDoc } from './local/store.js';
import { fetchArchive } from './sync/syncEngine.js';

const TRASH_COLLECTIONS = ['clients', 'visits', 'appointments'];
const TECHNICAL_KEYS = ['id', 'deleted', 'deletedAt', 'updatedAt', 'syncedAt'];

// Une pierre tombale venue d'un AUTRE appareil n'a pas de contenu : c'est
// alors l'archive cloud qui le fournit.
const hasContent = (doc) => Object.keys(doc).some((key) => !TECHNICAL_KEYS.includes(key));

export async function getTrash() {
  const archive = await fetchArchive();
  const trash = {};
  TRASH_COLLECTIONS.forEach((collection) => {
    const byId = new Map(readDeleted(collection).map((doc) => [doc.id, doc]));
    archive.filter((item) => item.collection === collection && item.data).forEach((item) => {
      const known = byId.get(item.id);
      // Déjà revenu en service sur ce téléphone : rien à restaurer.
      if (readOne(collection, item.id)) return;
      if (!known || !hasContent(known) || (item.deletedAt || 0) > (known.deletedAt || 0)) {
        byId.set(item.id, { ...item.data, id: item.id, deleted: true, deletedAt: item.deletedAt });
      }
    });
    trash[collection] = [...byId.values()].filter(hasContent);
  });
  return trash;
}

export async function restoreFromTrash(collection, doc) {
  return restoreDoc(collection, doc);
}
