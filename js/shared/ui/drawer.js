// Panneau qui monte du bas de l'écran (<dialog> natif : focus piégé, Échap,
// fond assombri). Réservé aux choix qui demandent toute l'attention : heure,
// créneau. Ajouté à <body> le temps de son ouverture puis retiré.
//
//   const { close } = openDrawer({ title, subtitle, content, onMount(body, close), onClose(result) })
// `close(result)` transmet `result` à onClose ; une fermeture par la croix,
// le fond ou le bouton retour donne `undefined`.

import { icons } from './icons.js';

export function openDrawer({ title, subtitle = '', content = '', onMount, onClose }) {
  const dialog = document.createElement('dialog');
  dialog.className = 'drawer';
  dialog.innerHTML = `
    <div class="drawer__panel">
      <header class="drawer__header">
        <div>
          <h2 class="drawer__title">${title}</h2>
          ${subtitle ? `<p class="drawer__subtitle">${subtitle}</p>` : ''}
        </div>
        <button type="button" class="btn btn--quiet btn--icon" data-drawer-close aria-label="Fermer">
          <span class="icon">${icons.x}</span>
        </button>
      </header>
      <div class="drawer__body">${content}</div>
    </div>
  `;
  document.body.append(dialog);

  let closed = false;
  function close(result) {
    if (closed) return;
    closed = true;
    window.removeEventListener('popstate', dismiss);
    dialog.classList.add('is-closing');
    setTimeout(() => {
      dialog.close();
      dialog.remove();
    }, 180);
    onClose?.(result);
  }
  const dismiss = () => close(undefined);

  // Tap sur le fond (le <dialog> lui-même, hors panneau) ou sur la croix.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog || event.target.closest('[data-drawer-close]')) dismiss();
  });
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    dismiss();
  });
  // Bouton retour du téléphone : ferme le panneau avec l'écran qu'il recouvrait.
  window.addEventListener('popstate', dismiss);

  dialog.showModal();
  const body = dialog.querySelector('.drawer__body');
  onMount?.(body, close);
  return { close, body };
}
