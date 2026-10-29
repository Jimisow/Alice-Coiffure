// Message bref en bas d'écran, avec action optionnelle (ex. « Annuler » après
// un tampon). Un seul toast à la fois : le suivant remplace le précédent.
//   showToast(el, 'Passage ajouté', { action: { label: 'Annuler', run() {} }, duration: 6000 })

import { escapeHtml } from '../shared/utils/formatUtils.js';

let hideTimer = null;

export function showToast(container, message, { action = null, duration = 3500 } = {}) {
  clearTimeout(hideTimer);
  container.innerHTML = `
    <div class="toast" role="status">
      <span class="toast__text">${escapeHtml(message)}</span>
      ${action ? `<button type="button" class="toast__action">${escapeHtml(action.label)}</button>` : ''}
    </div>
  `;
  const toast = container.firstElementChild;
  requestAnimationFrame(() => toast.classList.add('is-visible'));

  const hide = () => {
    toast.classList.remove('is-visible');
    setTimeout(() => toast.remove(), 250);
  };

  toast.querySelector('.toast__action')?.addEventListener('click', () => {
    hide();
    action.run();
  });
  hideTimer = setTimeout(hide, action ? Math.max(duration, 6000) : duration);
}
