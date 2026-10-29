// Petit panneau qui se déplie depuis un bouton (ex. la cloche des
// notifications), ancré sous lui, aligné sur son bord droit. <dialog> natif :
// Échap, tap à côté et bouton retour du téléphone le ferment.
//
//   openPopover(anchorEl, { title, content, onMount(body, close) })

export function openPopover(anchor, { title, content = '', onMount }) {
  const rect = anchor.getBoundingClientRect();
  const dialog = document.createElement('dialog');
  dialog.className = 'popover';
  dialog.style.top = `${rect.bottom + 6}px`;
  dialog.style.right = `${Math.max(8, window.innerWidth - rect.right)}px`;
  dialog.innerHTML = `
    <div class="popover__panel">
      <h2 class="popover__title">${title}</h2>
      <div class="popover__body">${content}</div>
    </div>
  `;
  document.body.append(dialog);
  anchor.setAttribute('aria-expanded', 'true');

  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    window.removeEventListener('popstate', close);
    anchor.setAttribute('aria-expanded', 'false');
    dialog.classList.add('is-closing');
    setTimeout(() => {
      dialog.close();
      dialog.remove();
    }, 140);
  }

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) close();
  });
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });
  window.addEventListener('popstate', close);

  dialog.showModal();
  // Pas la place en dessous (bouton bas d'écran) : on l'ouvre au-dessus.
  const height = dialog.offsetHeight;
  if (rect.bottom + 6 + height > window.innerHeight - 70 && rect.top - 6 - height > 8) {
    dialog.style.top = `${rect.top - 6 - height}px`;
    dialog.classList.add('is-above');
  }
  const body = dialog.querySelector('.popover__body');
  onMount?.(body, close);
  return { close, body };
}
