// Point d'entrée : assemble le shell (zone principale, barre du bas, toasts),
// le routeur, la synchro cloud et le service worker. Aucune logique métier ici.

import { routes, tabs } from './app/routes.js';
import { createRouter } from './app/router.js';
import { registerServiceWorker } from './app/serviceWorker.js';
import { startSync } from './data/index.js';
import { initInstall } from './app/install.js';

// Avant le 1er rendu : Android peut proposer l'installation très tôt.
initInstall();

createRouter({
  routes,
  tabs,
  mainEl: document.getElementById('app-main'),
  navEl: document.getElementById('app-nav'),
  toastEl: document.getElementById('app-toast'),
}).start();

// Demande au navigateur de ne pas effacer le stockage local en cas de manque
// de place : ce sont les fiches clientes d'Alice.
navigator.storage?.persist?.();

startSync();
registerServiceWorker();
