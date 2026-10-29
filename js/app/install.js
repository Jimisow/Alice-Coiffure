// Installation de l'app sur l'écran d'accueil, adaptée à la plateforme :
//   android  → Chrome / Edge / Samsung : boîte d'installation native (beforeinstallprompt)
//   ios      → Safari (ou Chrome iOS) : guide Partager → « Sur l'écran d'accueil »
//   inapp    → navigateur intégré (Facebook, Instagram…) : ouvrir dans Safari / Chrome
//   installed / unsupported → rien à proposer
// Exposé aux vues via ctx.install (cf. router) : elles ne touchent pas à ce module.
//
// Le bandeau de l'accueil est refusable : il revient 14 jours plus tard tant
// que l'app n'est pas installée. L'entrée de Réglages, elle, reste toujours là.

import { icons } from '../shared/ui/icons.js';
import { openDrawer } from '../shared/ui/drawer.js';

const DISMISS_KEY = 'alice-coiffure:install-dismissed';
const DISMISS_DAYS = 14;

let deferredPrompt = null;
let installedNow = false;
const listeners = new Set();
const notify = () => listeners.forEach((listener) => listener());

// À appeler au démarrage : l'événement Android peut arriver avant le 1er rendu.
export function initInstall() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installedNow = true;
    notify();
  });
}

function isStandalone() {
  return installedNow
    || window.matchMedia?.('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

export function getPlatform() {
  if (isStandalone()) return 'installed';
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (/FBAN|FBAV|Instagram|Line\/|Snapchat|TikTok/i.test(ua)) return 'inapp';
  if (ios) return 'ios';
  if (deferredPrompt) return 'android';
  return 'unsupported';
}

function isDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return Boolean(at) && Date.now() - at < DISMISS_DAYS * 86400000;
  } catch {
    return false;
  }
}

function dismiss() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Stockage indisponible : le bandeau reviendra au prochain lancement.
  }
}

function openIosGuide() {
  openDrawer({
    title: 'Installer sur l’iPhone',
    subtitle: 'Trois gestes, dans Safari',
    content: `
      <ol class="install-steps">
        <li><span class="install-steps__num">1</span>
          <span>Touchez <b>Partager</b> <span class="install-steps__icon icon">${icons.share}</span> en bas de l’écran
          (en haut sur iPad).</span></li>
        <li><span class="install-steps__num">2</span>
          <span>Faites défiler et choisissez <b>Sur l’écran d’accueil</b> <span class="install-steps__icon icon">${icons.plusSquare}</span>.</span></li>
        <li><span class="install-steps__num">3</span>
          <span>Touchez <b>Ajouter</b> en haut à droite : l’icône Alice Coiffure apparaît sur l’écran d’accueil.</span></li>
      </ol>
      <p class="install-steps__note">Ensuite, ouvrez toujours l’app depuis cette icône : vos fiches y sont mieux protégées.</p>
    `,
  });
}

async function copyLink(toast) {
  try {
    await navigator.clipboard.writeText(location.origin);
    toast('Lien copié : collez-le dans Safari ou Chrome');
  } catch {
    toast(location.origin);
  }
}

async function install(toast) {
  const platform = getPlatform();
  if (platform === 'android' && deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    if (outcome === 'accepted') toast('Application installée sur l’écran d’accueil');
    notify();
  } else if (platform === 'ios') {
    openIosGuide();
  } else if (platform === 'inapp') {
    copyLink(toast);
  }
}

const TEXTS = {
  android: 'Ouvrez-la d’un tap depuis l’écran d’accueil, même sans Internet.',
  ios: 'Ajoutez-la à l’écran d’accueil : elle s’ouvre d’un tap, même sans Internet.',
  inapp: 'Ce navigateur ne permet pas l’installation : ouvrez le lien dans Safari ou Chrome.',
};

// Affiche le bandeau (ou rien) dans `slot`, et le tient à jour.
//   dismissible : croix de fermeture (accueil) ; sinon carte permanente (Réglages).
export function mountInstall(slot, { toast, dismissible = true }) {
  function draw() {
    if (!slot.isConnected) return listeners.delete(draw);
    const platform = getPlatform();
    if (!TEXTS[platform] || (dismissible && isDismissed())) {
      slot.innerHTML = '';
      return undefined;
    }
    slot.innerHTML = `
      <section class="ticket install ${dismissible ? '' : 'install--card'}" aria-labelledby="install-title">
        <span class="install__icon icon">${icons.smartphone}</span>
        <div class="install__body">
          <h2 class="install__title" id="install-title">Installer l’app sur ce téléphone</h2>
          <p class="install__text">${TEXTS[platform]}</p>
          <button type="button" class="btn btn--primary btn--sm install__cta" data-install>
            <span class="icon">${platform === 'inapp' ? icons.copy : icons.download}</span>
            ${platform === 'inapp' ? 'Copier le lien' : 'Installer'}
          </button>
        </div>
        ${dismissible ? `
          <button type="button" class="btn btn--quiet btn--icon btn--sm install__close" data-install-close aria-label="Fermer (rappel dans 14 jours)">
            <span class="icon">${icons.x}</span>
          </button>` : ''}
      </section>
    `;
    slot.querySelector('[data-install]').addEventListener('click', () => install(toast));
    slot.querySelector('[data-install-close]')?.addEventListener('click', () => {
      dismiss();
      slot.innerHTML = '';
      toast('D’accord, rappel dans 14 jours (installation possible dans Réglages)');
    });
    return undefined;
  }
  listeners.add(draw);
  draw();
}

export function isInstallable() {
  return Boolean(TEXTS[getPlatform()]);
}
