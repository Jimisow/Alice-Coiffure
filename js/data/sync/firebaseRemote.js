// Adaptateur cloud Firebase (Auth e-mail/mot de passe + Firestore).
// Le SDK n'est téléchargé QUE si une configuration existe dans config/env.js
// (généré depuis .env par scripts/env.mjs) : sans elle, rien n'est chargé.
//
// Projet Firebase PARTAGÉ (« outils », aussi utilisé par Micka Poulet) :
// tout ce qui concerne Alice Coiffure vit sous la collection racine
// `aliceCoiffure`, un dossier par compte :
//   aliceCoiffure/{uid}/{clients|appointments|visits|settings}/{id}   données
//   aliceCoiffure/{uid}/archive/{collection}__{id}                    copie de tout ce qui est supprimé
// Rien n'est jamais effacé (règles : delete interdit). Une suppression
// écrit une copie complète dans `archive` et remplace le document par une
// « pierre tombale » `{ id, deleted, deletedAt, updatedAt }` qui propage la
// suppression aux autres appareils. Règles : firestore.rules (fichier COMMUN
// aux deux apps, à publier en entier).

const SDK = 'https://www.gstatic.com/firebasejs/10.14.1';
const ROOT = 'aliceCoiffure';
const TIMEOUT_MS = 20000;
const MAX_WRITES_PER_BATCH = 400;

async function loadConfig() {
  try {
    const { firebaseConfig } = await import('../../../config/env.js');
    return firebaseConfig?.apiKey && firebaseConfig?.projectId ? firebaseConfig : null;
  } catch {
    return null;
  }
}

// Le SDK Firestore réessaie en silence quand la base ou les règles posent
// problème : on borne chaque opération pour afficher une vraie erreur.
function withTimeout(promise, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} : pas de réponse du serveur (connexion lente ou base indisponible).`)), TIMEOUT_MS);
    }),
  ]).finally(() => clearTimeout(timer));
}

// Messages Firebase → français compréhensible.
export function describeFirebaseError(error) {
  const code = error?.code || '';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found') || code.includes('invalid-email')) {
    return 'E-mail ou mot de passe incorrect.';
  }
  if (code.includes('operation-not-allowed')) return 'La connexion par e-mail n’est pas activée dans Firebase.';
  if (code.includes('too-many-requests')) return 'Trop d’essais : réessayez dans quelques minutes.';
  if (code.includes('network-request-failed') || code.includes('unavailable')) return 'Pas de connexion Internet.';
  if (code.includes('permission-denied')) return 'Accès refusé par Firebase : les règles ne sont pas (encore) publiées.';
  return error?.message || 'Erreur Firebase.';
}

const NOT_CONFIGURED = {
  configured: false,
  user: null,
  async signIn() {},
  async signOut() {},
  async push() {},
  async pull() { return []; },
  async listArchive() { return []; },
};

// Firestore refuse les valeurs `undefined` : un aller-retour JSON les retire.
const clean = (value) => JSON.parse(JSON.stringify(value));

// Ce qui part dans l'archive : le contenu, sans les marqueurs techniques.
function archivedContent(doc) {
  const { deleted, deletedAt, syncedAt, ...data } = doc;
  return data;
}

export async function createFirebaseRemote(onAuthChange) {
  const config = await loadConfig();
  if (!config) return NOT_CONFIGURED;

  let sdk;
  try {
    const [app, auth, firestore] = await Promise.all([
      import(`${SDK}/firebase-app.js`),
      import(`${SDK}/firebase-auth.js`),
      import(`${SDK}/firebase-firestore.js`),
    ]);
    sdk = { ...app, ...auth, ...firestore };
  } catch {
    // Premier lancement hors-ligne : le SDK n'est pas encore en cache.
    return { ...NOT_CONFIGURED, configured: true };
  }

  // Nom d'instance dédié : n'interfère pas avec une autre app Firebase de la page.
  const app = sdk.initializeApp(config, 'alice-coiffure');
  const auth = sdk.getAuth(app);
  const db = sdk.getFirestore(app);
  const userRef = (...path) => sdk.doc(db, ROOT, remote.user.uid, ...path);

  const remote = {
    configured: true,
    user: auth.currentUser,

    async signIn(email, password) {
      try {
        await withTimeout(sdk.signInWithEmailAndPassword(auth, email, password), 'Connexion');
      } catch (error) {
        throw new Error(describeFirebaseError(error));
      }
    },

    async signOut() {
      await sdk.signOut(auth);
    },

    // Une suppression = 2 écritures (archive + pierre tombale) : on découpe en lots.
    async push(changes) {
      let batch = sdk.writeBatch(db);
      let writes = 0;
      const commits = [];
      const flushIfFull = () => {
        if (writes < MAX_WRITES_PER_BATCH) return;
        commits.push(batch.commit());
        batch = sdk.writeBatch(db);
        writes = 0;
      };

      changes.forEach(({ collection, id, doc }) => {
        if (doc.deleted) {
          if (doc.deletedAt) {
            batch.set(userRef('archive', `${collection}__${id}`), {
              collection,
              id,
              data: clean(archivedContent(doc)),
              deletedAt: doc.deletedAt,
              archivedAt: sdk.serverTimestamp(),
            });
            writes += 1;
          }
          batch.set(userRef(collection, id), {
            id, deleted: true, deletedAt: doc.deletedAt || doc.updatedAt, updatedAt: doc.updatedAt, syncedAt: sdk.serverTimestamp(),
          });
        } else {
          batch.set(userRef(collection, id), { ...clean(doc), syncedAt: sdk.serverTimestamp() });
        }
        writes += 1;
        flushIfFull();
      });
      if (writes) commits.push(batch.commit());
      try {
        await withTimeout(Promise.all(commits), 'Envoi');
      } catch (error) {
        throw new Error(describeFirebaseError(error));
      }
    },

    // Renvoie `syncedAt` en millisecondes (curseur de reprise, cf. store.mergeRemote).
    async pull(collection, since) {
      const ref = sdk.collection(db, ROOT, remote.user.uid, collection);
      const after = sdk.Timestamp.fromMillis(since);
      try {
        const snapshot = await withTimeout(sdk.getDocs(sdk.query(ref, sdk.where('syncedAt', '>', after))), 'Réception');
        return snapshot.docs.map((d) => {
          const data = d.data();
          return { ...data, syncedAt: data.syncedAt?.toMillis?.() || 0 };
        });
      } catch (error) {
        throw new Error(describeFirebaseError(error));
      }
    },

    // Contenu de l'archive (Corbeille, récupération après perte du téléphone).
    async listArchive() {
      const ref = sdk.collection(db, ROOT, remote.user.uid, 'archive');
      try {
        const snapshot = await withTimeout(sdk.getDocs(ref), 'Lecture des archives');
        return snapshot.docs.map((d) => d.data());
      } catch (error) {
        throw new Error(describeFirebaseError(error));
      }
    },
  };

  sdk.onAuthStateChanged(auth, (user) => {
    remote.user = user;
    onAuthChange();
  });

  return remote;
}
