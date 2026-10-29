import {
  getDataStats, downloadBackup, restoreBackup, eraseEverything, loadDemo,
  syncNow, signIn, signOut, getSyncStatus, onSyncStatus,
} from './settingsService.js';
import { getLoyaltyRules, saveLoyaltyRules, OBJECTIF_MIN, OBJECTIF_MAX } from '../loyalty/index.js';
import { renderOpeningHoursEditor, describeOpeningDays } from '../appointments/index.js';
import { renderStatsPanel } from '../stats/index.js';
import { getDeletedClients, restoreClient, canLoadDemo } from '../clients/index.js';
import { icons } from '../../shared/ui/icons.js';
import { topbar, bindBack } from '../../shared/ui/components.js';
import { escapeHtml, plural } from '../../shared/utils/formatUtils.js';

// Réglages rangés par catégorie : un sommaire (#/reglages) avec un résumé
// par ligne, puis une page par catégorie (#/reglages/<id>).
const CATEGORIES = [
  { id: 'salon', title: 'Salon', icon: icons.clock, intro: 'Jours et horaires de travail : ils servent à proposer les créneaux libres.' },
  { id: 'fidelite', title: 'Carte fidélité', icon: icons.gift, intro: 'Règles appliquées à toutes les cartes.' },
  { id: 'sauvegarde', title: 'Sauvegarde', icon: icons.cloud, intro: 'Pour ne rien perdre, même en changeant de téléphone.' },
  { id: 'donnees', title: 'Données', icon: icons.users, intro: '' },
];

function formatSyncTime(iso) {
  if (!iso) return 'jamais';
  return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function cloudSummary(status) {
  if (!status.configured) return 'Sur ce téléphone uniquement';
  if (!status.signedIn) return 'En ligne : non connectée';
  return status.pending ? `${plural(status.pending, 'modification')} en attente` : 'Sauvegardé en ligne';
}

// ================= Sommaire =================

async function renderMenu(container, ctx) {
  const [rules, jours] = await Promise.all([getLoyaltyRules(), describeOpeningDays()]);
  if (!ctx.isCurrent()) return;
  const stats = getDataStats();
  const summaries = {
    salon: jours,
    fidelite: `${rules.objectif} tampons · ${rules.recompense}`,
    sauvegarde: cloudSummary(getSyncStatus()),
    donnees: `${plural(stats.clients, 'fiche')} · ${plural(stats.appointments, 'rendez-vous', 'rendez-vous')}`,
  };

  container.innerHTML = `
    <div class="screen">
      <div class="page-head page-head--top">
        <h1 class="title-xl">Réglages</h1>
      </div>
      <div id="install-card"></div>
      <div id="stats-slot" class="stats-slot"></div>
      <h2 class="section-title">Paramètres</h2>
      <ul class="roll settings-menu">
        ${CATEGORIES.map((cat) => `
          <li><button type="button" class="row settings-menu__row" data-category="${cat.id}">
            <span class="settings-menu__icon icon">${cat.icon}</span>
            <span class="row__main">
              <span class="row__name"><b>${cat.title}</b></span>
              <span class="row__meta">${escapeHtml(summaries[cat.id])}</span>
            </span>
            <span class="icon muted">${icons.chevronRight}</span>
          </button></li>
        `).join('')}
      </ul>
      <ul class="roll settings-menu settings-menu--help">
        <li><a class="row settings-menu__row" href="guide/">
          <span class="settings-menu__icon icon">${icons.book}</span>
          <span class="row__main">
            <span class="row__name"><b>Mode d’emploi</b></span>
            <span class="row__meta">Pas à pas, avec des images</span>
          </span>
          <span class="icon muted">${icons.chevronRight}</span>
        </a></li>
      </ul>
      <p class="colophon">Alice Coiffure · carnet clientes</p>
    </div>
  `;

  container.firstElementChild.addEventListener('click', (event) => {
    const row = event.target.closest('[data-category]');
    if (row) ctx.navigate(`/reglages/${row.dataset.category}`);
  });

  // Carte « Installer l'app » permanente (ne s'affiche que si l'installation est possible).
  ctx.install.mount(container.querySelector('#install-card'), { dismissible: false });
  if (stats.clients) await renderStatsPanel(container.querySelector('#stats-slot'));
}

// ================= Catégories =================

async function renderFidelite(slot, ctx) {
  const rules = await getLoyaltyRules();
  slot.innerHTML = `
    <section class="ticket sheet">
      <div class="stepper-row stepper-row--first">
        <div>
          <p class="field__label" id="objectif-label">Tampons pour une récompense</p>
          <p class="field__hint">Entre ${OBJECTIF_MIN} et ${OBJECTIF_MAX}.</p>
        </div>
        <div class="stepper" role="group" aria-labelledby="objectif-label">
          <button type="button" class="btn btn--ghost btn--icon" data-objectif="-1" aria-label="Un de moins"><span class="icon">${icons.minus}</span></button>
          <output class="stepper__value" id="objectif" aria-live="polite">${rules.objectif}</output>
          <button type="button" class="btn btn--ghost btn--icon" data-objectif="1" aria-label="Un de plus"><span class="icon">${icons.plus}</span></button>
        </div>
      </div>
      <div class="field">
        <label class="field__label" for="recompense">Récompense offerte</label>
        <input class="input" id="recompense" type="text" value="${escapeHtml(rules.recompense)}"
          placeholder="Ex : un brushing offert, -50 % sur la coupe" />
        <p class="field__hint">Affichée sur chaque carte. Enregistrée automatiquement.</p>
      </div>
    </section>
  `;

  let { objectif } = rules;
  slot.querySelectorAll('[data-objectif]').forEach((btn) => btn.addEventListener('click', async () => {
    objectif = Math.min(OBJECTIF_MAX, Math.max(OBJECTIF_MIN, objectif + Number(btn.dataset.objectif)));
    slot.querySelector('#objectif').textContent = objectif;
    await saveLoyaltyRules({ objectif });
  }));
  slot.querySelector('#recompense').addEventListener('change', async (event) => {
    const saved = await saveLoyaltyRules({ recompense: event.target.value });
    event.target.value = saved.recompense;
    ctx.toast('Récompense enregistrée');
  });
}

async function renderSalon(slot, ctx) {
  slot.innerHTML = '<section class="ticket sheet"><div id="hours-slot"></div></section>';
  await renderOpeningHoursEditor(slot.querySelector('#hours-slot'), { onSaved: (message) => message && ctx.toast(message) });
}

function renderCloud(status) {
  if (!status.configured) {
    return `
      <div class="status">
        <span class="status__icon icon">${icons.cloudOff}</span>
        <div>
          <p class="status__title">Pas encore activée</p>
          <p class="muted">Tout est enregistré sur ce téléphone, même sans Internet. En attendant, téléchargez une sauvegarde de temps en temps.</p>
        </div>
      </div>
    `;
  }
  if (!status.signedIn) {
    return `
      <form class="cloud-login" id="cloud-login">
        <p class="muted">Connectez-vous pour envoyer vos fiches en ligne et les retrouver sur un autre téléphone.</p>
        <div class="field">
          <label class="field__label" for="cloud-email">E-mail</label>
          <input class="input" id="cloud-email" type="email" autocomplete="username" required />
        </div>
        <div class="field">
          <label class="field__label" for="cloud-password">Mot de passe</label>
          <input class="input" id="cloud-password" type="password" autocomplete="current-password" required />
        </div>
        <p class="field__error" id="cloud-error" hidden></p>
        <button type="submit" class="btn btn--primary btn--block">Se connecter</button>
      </form>
    `;
  }
  const state = !status.online
    ? `Hors-ligne : ${status.pending ? `${plural(status.pending, 'modification')} en attente d’envoi` : 'tout est à jour'}`
    : status.syncing ? 'Synchronisation…'
      : status.pending ? `${plural(status.pending, 'modification')} en attente` : 'Tout est sauvegardé en ligne';
  return `
    <div class="status ${status.error ? 'is-error' : ''}">
      <span class="status__icon icon">${status.online ? icons.cloud : icons.cloudOff}</span>
      <div>
        <p class="status__title">${state}</p>
        <p class="muted">${escapeHtml(status.email)} · dernière synchro ${formatSyncTime(status.lastSyncAt)}</p>
        ${status.error ? `<p class="field__error">${escapeHtml(status.error)}</p>` : ''}
      </div>
    </div>
    <div class="btn-row">
      <button type="button" class="btn btn--ghost" data-sync ${status.online && !status.syncing ? '' : 'disabled'}>
        <span class="icon">${icons.sync}</span> Synchroniser
      </button>
      <button type="button" class="btn btn--quiet" data-signout>Se déconnecter</button>
    </div>
  `;
}

// Corbeille : fiches supprimées (téléphone + archive Firebase si connectée).
async function renderTrash(trashSlot, ctx) {
  const deleted = await getDeletedClients();
  if (!trashSlot.isConnected) return;
  trashSlot.innerHTML = deleted.length ? `
    <ul class="trash">
      ${deleted.map((c) => `
        <li class="trash__row">
          <span class="row__main">
            <span class="row__name">${escapeHtml(c.prenom)} <b>${escapeHtml(c.nom || '')}</b></span>
            <span class="row__meta">Supprimée le ${new Date(c.deletedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </span>
          <button type="button" class="btn btn--ghost btn--sm" data-restore-client="${c.id}">Restaurer</button>
        </li>
      `).join('')}
    </ul>
  ` : '<p class="muted trash__loading">La corbeille est vide.</p>';

  trashSlot.querySelectorAll('[data-restore-client]').forEach((btn) => btn.addEventListener('click', async () => {
    btn.disabled = true;
    const restored = await restoreClient(btn.dataset.restoreClient);
    if (restored) {
      ctx.toast(`Fiche de ${restored.prenom} restaurée`, {
        action: { label: 'Voir', run: () => ctx.navigate(`/clientes/${restored.id}`) },
      });
    }
    renderTrash(trashSlot, ctx);
  }));
}

function renderSauvegarde(slot, ctx, rerender) {
  slot.innerHTML = `
    <section class="ticket sheet" aria-labelledby="cloud-title">
      <h2 class="sheet__title" id="cloud-title">En ligne</h2>
      <div id="cloud-slot">${renderCloud(getSyncStatus())}</div>
    </section>
    <section class="ticket sheet" aria-labelledby="trash-title">
      <h2 class="sheet__title" id="trash-title">Corbeille</h2>
      <p class="muted">Fiches supprimées : rien n’est perdu, elles peuvent revenir avec leurs passages et rendez-vous.</p>
      <div id="trash-slot"><p class="muted trash__loading">Chargement…</p></div>
    </section>
    <section class="ticket sheet" aria-labelledby="backup-title">
      <h2 class="sheet__title" id="backup-title">Sur fichier</h2>
      <p class="muted">Un fichier à garder dans vos documents ou à vous envoyer par mail.</p>
      <div class="btn-col">
        <button type="button" class="btn btn--ghost btn--block" data-backup>
          <span class="icon">${icons.download}</span> Télécharger une sauvegarde
        </button>
        <label class="btn btn--quiet btn--block">
          <span class="icon">${icons.upload}</span> Restaurer depuis un fichier
          <input type="file" accept="application/json,.json" data-restore hidden />
        </label>
      </div>
    </section>
  `;

  // L'état cloud se met à jour en direct tant que la page est affichée.
  const cloudSlot = slot.querySelector('#cloud-slot');
  const unsubscribe = onSyncStatus((status) => {
    if (!cloudSlot.isConnected) return unsubscribe();
    if (!cloudSlot.contains(document.activeElement)) cloudSlot.innerHTML = renderCloud(status);
  });
  cloudSlot.addEventListener('click', (event) => {
    if (event.target.closest('[data-sync]')) syncNow();
    if (event.target.closest('[data-signout]')) signOut();
  });
  cloudSlot.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await signIn(slot.querySelector('#cloud-email').value.trim(), slot.querySelector('#cloud-password').value);
      cloudSlot.innerHTML = renderCloud(getSyncStatus());
    } catch (error) {
      const errorEl = slot.querySelector('#cloud-error');
      errorEl.hidden = false;
      errorEl.textContent = error.message || 'Connexion refusée : vérifiez l’e-mail et le mot de passe.';
    }
  });

  renderTrash(slot.querySelector('#trash-slot'), ctx);

  slot.querySelector('[data-backup]').addEventListener('click', () => {
    downloadBackup();
    ctx.toast('Sauvegarde téléchargée');
  });
  slot.querySelector('[data-restore]').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    if (!confirm('Remplacer TOUTES les données de ce téléphone par celles du fichier ?')) return;
    try {
      await restoreBackup(file);
      ctx.toast('Sauvegarde restaurée');
      rerender();
    } catch (error) {
      ctx.toast(error.message);
    }
  });
}

function renderDonnees(slot, ctx, rerender) {
  const stats = getDataStats();
  slot.innerHTML = `
    <section class="ticket sheet">
      <p class="muted">Sur ce téléphone : ${plural(stats.clients, 'fiche')}, ${plural(stats.visits, 'passage')}, ${plural(stats.appointments, 'rendez-vous', 'rendez-vous')}.</p>
      <div class="btn-col">
        ${canLoadDemo() ? '<button type="button" class="btn btn--ghost btn--block" data-demo>Ajouter des clientes fictives (démo)</button>' : ''}
      </div>
    </section>
    <section class="ticket sheet">
      <h2 class="sheet__title">Zone sensible</h2>
      <p class="muted">Efface toutes les fiches, passages et rendez-vous. Téléchargez une sauvegarde avant.</p>
      <div class="btn-col">
        <button type="button" class="btn btn--danger btn--block" data-erase>
          <span class="icon">${icons.trash}</span> Tout effacer
        </button>
      </div>
    </section>
  `;

  slot.querySelector('[data-demo]')?.addEventListener('click', async () => {
    await loadDemo();
    ctx.toast('Clientes fictives ajoutées');
    rerender();
  });
  slot.querySelector('[data-erase]').addEventListener('click', async () => {
    if (!confirm('Effacer toutes les fiches, passages et rendez-vous ?')) return;
    const typed = prompt('Pour confirmer, écrivez EFFACER');
    if (typed?.trim().toUpperCase() !== 'EFFACER') return;
    await eraseEverything();
    ctx.toast('Toutes les données ont été effacées');
    rerender();
  });
}

const RENDERERS = { salon: renderSalon, fidelite: renderFidelite, sauvegarde: renderSauvegarde, donnees: renderDonnees };

async function renderCategory(container, ctx, category) {
  container.innerHTML = `
    <div class="screen">
      ${topbar({ title: category.title, backLabel: 'Retour aux réglages' })}
      ${category.intro ? `<p class="settings-intro">${category.intro}</p>` : ''}
      <div id="category-slot"></div>
    </div>
  `;
  const screen = container.firstElementChild;
  bindBack(screen, ctx, '/reglages');
  await RENDERERS[category.id](screen.querySelector('#category-slot'), ctx, () => renderCategory(container, ctx, category));
}

export async function renderSettingsView(container, ctx) {
  const category = CATEGORIES.find((c) => c.id === ctx.params.section);
  if (ctx.params.section && !category) {
    ctx.navigate('/reglages', { replace: true });
    return;
  }
  if (category) await renderCategory(container, ctx, category);
  else await renderMenu(container, ctx);
}
