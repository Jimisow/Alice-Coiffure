// Service worker : app shell précaché + "stale-while-revalidate" pour le reste
// (modules JS, polices, SDK Firebase…) → l'app démarre hors-ligne et se met à
// jour en arrière-plan, sans liste de fichiers JS à maintenir à la main.
//
// Incrémenter CACHE_NAME force l'invalidation de tout le cache existant.
// En développement (localhost) le SW n'intercepte rien : on voit toujours
// la dernière version des fichiers.
// Firestore (requêtes réseau en direct) n'est jamais mis en cache.

const CACHE_NAME = 'alice-coiffure-v5';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/tokens.css',
  './css/base.css',
  './css/components.css',
  './js/main.js',
  './images/Titre.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (self.location.hostname === 'localhost') return;
  const url = new URL(event.request.url);
  if (url.hostname.endsWith('googleapis.com') && !url.hostname.startsWith('fonts.')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      const network = fetch(event.request)
        .then((response) => {
          // 'opaque' = ressource cross-origin (CDN, polices) : cachable telle quelle.
          if (response.ok || response.type === 'opaque') {
            cache.put(event.request, response.clone());
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
