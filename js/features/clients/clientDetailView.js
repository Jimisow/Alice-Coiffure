import { getClientById } from './clientService.js';
import {
  getLoyaltyRules, renderLoyaltyCard, bindLoyaltyCard, undoStamp, getVisitHistory, loyaltyState, restoreStamp,
} from '../loyalty/index.js';
import { getUpcomingForClient, getNoShowsForClient, getPrestationNames } from '../appointments/index.js';
import { buildReminderSmsLink } from '../reminders/index.js';
import { icons } from '../../shared/ui/icons.js';
import { topbar, bindBack, haptic } from '../../shared/ui/components.js';
import { escapeHtml, telHref, plural, capitalize } from '../../shared/utils/formatUtils.js';
import {
  formatSince, formatMonthYear, formatDateFull, formatDateLong, todayISO, isToday, isTomorrow,
} from '../../shared/utils/dateUtils.js';

const HISTORY_PREVIEW = 6;

// Rendez-vous manqués sans prévenir (marqués « Absente » dans l'agenda).
function renderNoShows(noShows) {
  if (!noShows.length) return '';
  return `
    <p class="noshow-note">
      <span class="icon">${icons.userX}</span>
      <span><b>${noShows.length > 1 ? `${noShows.length} rendez-vous manqués` : '1 rendez-vous manqué'}</b> sans prévenir
      · dernier le ${formatDateFull(noShows[0].date)}</span>
    </p>
  `;
}

function renderIdentity(client, noShows = []) {
  const meta = [
    client.creeLe ? `Fiche créée en ${formatMonthYear(client.creeLe)}` : '',
    client.derniereVisite ? `dernière visite ${formatSince(client.derniereVisite)}` : 'pas encore de passage',
  ].filter(Boolean).join(' · ');

  return `
    <section class="identity">
      <h1 class="identity__name">${escapeHtml(client.prenom)}<br /><span>${escapeHtml(client.nom)}</span></h1>
      <p class="identity__meta">${meta}</p>
      ${renderNoShows(noShows)}
      ${client.telephone ? `
        <div class="identity__actions">
          <a class="btn btn--ghost" href="tel:${telHref(client.telephone)}">
            <span class="icon">${icons.phone}</span> <span class="mono">${escapeHtml(client.telephone)}</span>
          </a>
          <a class="btn btn--ghost btn--icon" href="sms:${telHref(client.telephone)}" aria-label="Envoyer un SMS">
            <span class="icon">${icons.message}</span>
          </a>
        </div>` : ''}
    </section>
  `;
}

function renderHairNotes(client) {
  const empty = !client.natureCheveux && !client.notes;
  return `
    <section class="ticket sheet" aria-labelledby="notes-title">
      <div class="sheet__head">
        <h2 class="sheet__title" id="notes-title">Cheveux &amp; notes</h2>
        <button type="button" class="btn btn--quiet btn--sm" data-edit>
          <span class="icon">${icons.edit}</span> Modifier
        </button>
      </div>
      ${empty ? '<p class="muted">Rien de noté pour l’instant : nature des cheveux, allergies, couleur utilisée…</p>' : ''}
      ${client.natureCheveux ? `<p class="hair">${client.natureCheveux.split(',').filter((t) => t.trim()).map((t) => `<span class="badge">${escapeHtml(capitalize(t.trim()))}</span>`).join('')}</p>` : ''}
      ${client.notes ? `<p class="notes">${escapeHtml(client.notes)}</p>` : ''}
    </section>
  `;
}

function dayLabel(dateISO) {
  if (isToday(dateISO)) return "Aujourd'hui";
  if (isTomorrow(dateISO)) return 'Demain';
  return capitalize(formatDateLong(dateISO));
}

function renderUpcoming(client, appointments) {
  return `
    <section class="ticket sheet" aria-labelledby="rdv-title">
      <div class="sheet__head">
        <h2 class="sheet__title" id="rdv-title">Rendez-vous</h2>
        <button type="button" class="btn btn--quiet btn--sm" data-new-rdv>
          <span class="icon">${icons.plus}</span> Prendre RDV
        </button>
      </div>
      ${appointments.length ? `
        <ul class="mini-appts">
          ${appointments.map((a) => `
            <li class="mini-appt">
              <span class="mini-appt__when"><b>${dayLabel(a.date)}</b> <span class="mono">${a.heureDebut}</span></span>
              <span class="mini-appt__what">${escapeHtml(a.prestation)}</span>
              ${client.telephone ? `
                <a class="btn btn--quiet btn--icon" href="${buildReminderSmsLink(client, a)}" aria-label="Envoyer le rappel par SMS">
                  <span class="icon">${icons.message}</span>
                </a>` : ''}
            </li>
          `).join('')}
        </ul>` : '<p class="muted">Aucun rendez-vous à venir.</p>'}
    </section>
  `;
}

function renderHistory(visits, showAll) {
  if (!visits.length) return '';
  const shown = showAll ? visits : visits.slice(0, HISTORY_PREVIEW);
  return `
    <section class="ticket sheet" aria-labelledby="history-title">
      <div class="sheet__head">
        <h2 class="sheet__title" id="history-title">Passages</h2>
        <span class="muted">${plural(visits.filter((v) => v.type === 'tampon').length, 'passage')}</span>
      </div>
      <ol class="timeline">
        ${shown.map((v) => `
          <li class="timeline__item ${v.type === 'recompense' ? 'is-reward' : ''}">
            <span class="timeline__dot icon">${v.type === 'recompense' ? icons.gift : icons.punch}</span>
            <span class="timeline__date">${formatDateFull(v.date)}</span>
            <span class="timeline__what">${v.type === 'recompense'
              ? `Récompense offerte${v.prestation ? ` : ${escapeHtml(v.prestation)}` : ''}`
              : escapeHtml(v.prestation) || 'Passage'}</span>
          </li>
        `).join('')}
      </ol>
      ${!showAll && visits.length > HISTORY_PREVIEW ? `
        <button type="button" class="btn btn--quiet btn--block" data-show-history>
          Voir les ${visits.length} passages
        </button>` : ''}
    </section>
  `;
}

export async function renderClientDetailView(container, ctx, { justPunched = null, showAllHistory = false } = {}) {
  const clientId = ctx.params.id;
  const [client, rules, upcoming, visits, noShows, prestations] = await Promise.all([
    getClientById(clientId),
    getLoyaltyRules(),
    getUpcomingForClient(clientId),
    getVisitHistory(clientId),
    getNoShowsForClient(clientId),
    getPrestationNames(),
  ]);
  if (!ctx.isCurrent()) return;
  if (!client) {
    ctx.navigate('/clientes', { replace: true });
    return;
  }

  // Pré-sélectionne la prestation si la cliente a rendez-vous aujourd'hui.
  const todaysAppt = upcoming.find((a) => a.date === todayISO());
  const rerender = (opts) => renderClientDetailView(container, ctx, opts);

  container.innerHTML = `
    <div class="screen">
      ${topbar({
        title: '',
        backLabel: 'Retour aux clientes',
        action: `<button type="button" class="btn btn--quiet btn--icon" data-edit aria-label="Modifier la fiche">
                   <span class="icon">${icons.edit}</span></button>`,
      })}
      ${renderIdentity(client, noShows)}
      ${client.aCompleter ? `
        <section class="ticket ticket--draft todo">
          <p class="todo__title"><span class="icon">${icons.edit}</span> Fiche à compléter</p>
          <p class="todo__text">Créée en prenant un rendez-vous. Ajoutez la nature des cheveux, les notes et les tampons de sa carte carton.</p>
          <button type="button" class="btn btn--primary btn--block" data-edit>Compléter la fiche</button>
        </section>` : ''}
      ${renderLoyaltyCard(client, rules, {
        prestations,
        prestationDuJour: todaysAppt && prestations.includes(todaysAppt.prestation) ? todaysAppt.prestation : '',
        justPunched,
      })}
      ${renderHairNotes(client)}
      ${renderUpcoming(client, upcoming)}
      ${renderHistory(visits, showAllHistory)}
    </div>
  `;

  const screen = container.firstElementChild;
  bindBack(screen, ctx, '/clientes');
  screen.querySelectorAll('[data-edit]').forEach((btn) =>
    btn.addEventListener('click', () => ctx.navigate(`/clientes/${clientId}/modifier`)));
  screen.querySelector('[data-new-rdv]').addEventListener('click', () =>
    ctx.navigate(`/agenda/nouveau?cliente=${clientId}`));
  screen.querySelector('[data-show-history]')?.addEventListener('click', () => rerender({ showAllHistory: true }));

  bindLoyaltyCard(screen, clientId, {
    async onStamp({ client: updated, visit }) {
      if (!visit) return;
      haptic(18);
      const state = loyaltyState(updated, rules);
      await rerender({ justPunched: state.tampons, showAllHistory });
      ctx.toast(state.complete ? 'Carte pleine : la récompense est à offrir !' : `Passage enregistré · ${state.tampons}/${state.objectif}`, {
        action: {
          label: 'Annuler',
          async run() {
            await undoStamp(clientId, visit.id);
            if (ctx.isCurrent()) rerender({ showAllHistory });
            ctx.toast('Tampon retiré');
          },
        },
      });
    },
    async onMinus({ client: updated, removedVisit }) {
      if (!updated) return;
      await rerender({ showAllHistory });
      const state = loyaltyState(updated, rules);
      ctx.toast(`Tampon retiré · ${state.tampons}/${state.objectif}`, {
        action: {
          label: 'Annuler',
          async run() {
            await restoreStamp(clientId, removedVisit);
            if (ctx.isCurrent()) rerender({ showAllHistory });
          },
        },
      });
    },
    async onRedeem(updated) {
      if (!updated) return;
      haptic(30);
      await rerender({ showAllHistory });
      ctx.toast(`Récompense offerte à ${updated.prenom} · nouvelle carte`);
    },
  });
}
