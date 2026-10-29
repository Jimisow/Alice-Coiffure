// Petits gabarits HTML réutilisés par toutes les vues. Aucune logique métier :
// uniquement de la mise en forme. Les textes reçus doivent déjà être
// échappés par l'appelant quand ils viennent de l'utilisatrice.

import { icons } from './icons.js';

// Barre du haut des écrans secondaires : retour + titre + action à droite.
export function topbar({ title, backLabel = 'Retour', action = '' }) {
  return `
    <header class="topbar">
      <button type="button" class="btn btn--icon btn--quiet" data-back aria-label="${backLabel}">
        <span class="icon">${icons.back}</span>
      </button>
      <h1 class="topbar__title">${title}</h1>
      <div class="topbar__action">${action}</div>
    </header>
  `;
}

export function emptyState({ icon, title, text, actions = '' }) {
  return `
    <div class="empty">
      <span class="empty__icon icon">${icon}</span>
      <p class="empty__title">${title}</p>
      <p class="empty__text">${text}</p>
      ${actions ? `<div class="empty__actions">${actions}</div>` : ''}
    </div>
  `;
}

// Ligne de perforation entre deux parties d'un ticket (avec encoches).
export const perforation = '<div class="perf" aria-hidden="true"></div>';

export function bindBack(container, ctx, fallback) {
  container.querySelector('[data-back]')?.addEventListener('click', () => ctx.back(fallback));
}

// Petite vibration de confirmation (Android ; ignoré ailleurs).
export function haptic(ms = 12) {
  navigator.vibrate?.(ms);
}
