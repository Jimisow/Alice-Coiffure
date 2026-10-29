// Stockage local du téléphone (localStorage), source de vérité de l'app.
// PRIVÉ à data/ : seuls les repositories et le moteur de synchro l'importent.
//
// Chaque document porte `updatedAt` (ms) et, une fois supprimé, devient une
// « pierre tombale » `{ ...contenu, deleted: true, deletedAt, updatedAt }` :
// sans elle, une suppression faite hors-ligne ne pourrait jamais être propagée
// au cloud. Le CONTENU est gardé : il alimente la Corbeille (restauration) et
// l'archive Firebase (rien n'y est jamais effacé, cf. data/sync).
// Toute écriture ajoute le document à `outbox` ; le moteur de synchro
// (data/sync) vide cette file dès qu'Internet et Firebase sont disponibles.
//
// Hors navigateur (tests Node), on retombe sur un stockage en mémoire.

const STORAGE_KEY = 'alice-coiffure:v1';
export const COLLECTIONS = ['clients', 'appointments', 'visits', 'settings'];

function emptyState() {
  return {
    schema: 1,
    collections: Object.fromEntries(COLLECTIONS.map((name) => [name, {}])),
    outbox: [],
    meta: { lastPullAt: 0, lastSyncAt: null },
  };
}

const storage = (() => {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    // Accès refusé (navigation privée stricte) : on bascule en mémoire.
  }
  const memory = new Map();
  return {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, value),
    removeItem: (key) => memory.delete(key),
  };
})();

function load() {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    const base = emptyState();
    return {
      ...base,
      ...parsed,
      collections: { ...base.collections, ...parsed.collections },
      meta: { ...base.meta, ...parsed.meta },
    };
  } catch {
    return emptyState();
  }
}

let state = load();
const listeners = new Set();

function persist() {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
  listeners.forEach((listener) => listener());
}

// Prévenu après chaque écriture (utilisé par le moteur de synchro).
export function onChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function queue(collection, id) {
  const key = `${collection}/${id}`;
  if (!state.outbox.includes(key)) state.outbox.push(key);
}

export function readAll(collection) {
  return Object.values(state.collections[collection]).filter((doc) => !doc.deleted);
}

export function readOne(collection, id) {
  const doc = state.collections[collection][id];
  return doc && !doc.deleted ? doc : null;
}

export function write(collection, doc) {
  const stored = { ...doc, updatedAt: Date.now() };
  state.collections[collection][doc.id] = stored;
  queue(collection, doc.id);
  persist();
  return stored;
}

export function remove(collection, id) {
  const current = state.collections[collection][id];
  if (!current || current.deleted) return;
  const now = Date.now();
  state.collections[collection][id] = { ...current, id, deleted: true, deletedAt: now, updatedAt: now };
  queue(collection, id);
  persist();
}

// Documents supprimés dont le contenu est encore connu (Corbeille).
export function readDeleted(collection) {
  return Object.values(state.collections[collection]).filter((doc) => doc.deleted && doc.deletedAt);
}

// Remet un document en service (depuis la Corbeille ou l'archive cloud).
export function restoreDoc(collection, doc) {
  const { deleted, deletedAt, syncedAt, ...data } = doc;
  return write(collection, data);
}

// ---- Utilisé par le moteur de synchro uniquement ----

export function pendingChanges() {
  return state.outbox.map((key) => {
    const [collection, id] = key.split('/');
    return { key, collection, id, doc: state.collections[collection]?.[id] };
  }).filter((change) => change.doc);
}

export function acknowledge(keys, at) {
  state.outbox = state.outbox.filter((key) => !keys.includes(key));
  state.meta.lastSyncAt = at;
  persist();
}

// Fusion « le plus récent gagne » des documents venus du cloud. `syncedAt`
// est l'heure SERVEUR de réception : c'est elle (et non `updatedAt`, horloge
// du téléphone) qui sert de curseur, sinon une modification faite hors-ligne
// sur un autre appareil puis envoyée plus tard serait ignorée.
export function mergeRemote(collection, docs) {
  if (!docs.length) return;
  docs.forEach((remoteDoc) => {
    const local = state.collections[collection][remoteDoc.id];
    if (!local || (remoteDoc.updatedAt || 0) > (local.updatedAt || 0)) {
      state.collections[collection][remoteDoc.id] = remoteDoc;
    }
    state.meta.lastPullAt = Math.max(state.meta.lastPullAt, remoteDoc.syncedAt || 0);
  });
  persist();
}

export function getMeta() {
  return { ...state.meta, pending: state.outbox.length };
}

// ---- Sauvegarde / restauration / remise à zéro (Réglages) ----

export function exportSnapshot() {
  return {
    app: 'alice-coiffure',
    schema: state.schema,
    exportedAt: new Date().toISOString(),
    collections: state.collections,
  };
}

// Remplace TOUT le contenu local par la sauvegarde. Chaque document est remis
// dans la file d'envoi pour que le cloud reflète la restauration.
export function importSnapshot(snapshot) {
  if (snapshot?.app !== 'alice-coiffure' || !snapshot.collections) {
    throw new Error('Ce fichier n’est pas une sauvegarde Alice Coiffure.');
  }
  const next = emptyState();
  const now = Date.now();
  COLLECTIONS.forEach((name) => {
    Object.values(snapshot.collections[name] || {}).forEach((doc) => {
      next.collections[name][doc.id] = { ...doc, updatedAt: now };
      next.outbox.push(`${name}/${doc.id}`);
    });
  });
  next.meta = state.meta;
  state = next;
  persist();
}

// Supprime toutes les données (en propageant les suppressions au cloud, où
// elles partent dans l'archive). Une seule sauvegarde locale à la fin.
export function clearAll() {
  const now = Date.now();
  COLLECTIONS.forEach((name) => {
    Object.entries(state.collections[name]).forEach(([id, doc]) => {
      if (doc.deleted) return;
      state.collections[name][id] = { ...doc, id, deleted: true, deletedAt: now, updatedAt: now };
      queue(name, id);
    });
  });
  persist();
}
