export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      // Échec silencieux : l'app reste pleinement fonctionnelle sans le SW.
    });
  });
}
