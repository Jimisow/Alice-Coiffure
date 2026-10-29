import { icons } from '../../shared/ui/icons.js';
import { telHref, escapeHtml } from '../../shared/utils/formatUtils.js';
import { formatDuration, addMinutesToTime } from '../../shared/utils/dateUtils.js';
import { buildReminderSmsLink } from '../reminders/index.js';
import { isNoShow, isInProgress } from './appointmentService.js';
import { loyaltyState } from '../loyalty/index.js';

// Carte fidélité dans le talon : « 7/10 », ou « À offrir » (or) si pleine.
function renderStubLoyalty(client, rules) {
  if (!client || !rules) return '';
  const state = loyaltyState(client, rules);
  if (state.complete) {
    return `<span class="appt__loyalty appt__loyalty--full" title="Carte pleine : récompense à offrir">
      <span class="icon">${icons.gift}</span>À offrir</span>`;
  }
  return `<span class="appt__loyalty" title="Carte fidélité : ${state.tampons} tampons sur ${state.objectif}">
    <span class="icon">${icons.punch}</span>${state.tampons}/${state.objectif}</span>`;
}

// Ticket de rendez-vous : talon horaire à gauche, détachable par la perforation.
// `rules` (règles fidélité) permet d'afficher la carte de la cliente dans le talon.
export function renderAppointmentCard(appointment, client, rules = null) {
  const heureFin = addMinutesToTime(appointment.heureDebut, appointment.dureeMinutes);
  const absent = isNoShow(appointment);
  const finished = appointment.statut === 'termine';
  const inProgress = isInProgress(appointment);
  const name = client
    ? `${escapeHtml(client.prenom)} <b>${escapeHtml(client.nom)}</b>`
    : '<span class="muted">Cliente supprimée</span>';

  return `
    <article class="ticket appt ${absent ? 'is-noshow' : ''} ${inProgress ? 'is-now' : ''}">
      <div class="appt__stub">
        <span class="appt__time">${appointment.heureDebut}</span>
        <span class="appt__end">${heureFin}</span>
        ${renderStubLoyalty(client, rules)}
      </div>
      <div class="appt__body">
        ${client ? `
          <button type="button" class="appt__client" data-client-id="${client.id}">
            ${name}<span class="icon">${icons.chevronRight}</span>
          </button>` : `<p class="appt__client">${name}</p>`}
        <p class="appt__what">${escapeHtml(appointment.prestation)} · ${formatDuration(appointment.dureeMinutes)}
          ${finished ? '<span class="appt__done">· terminé plus tôt</span>' : ''}</p>
        ${appointment.finAvancee && !finished ? `
          <p class="appt__soon"><span class="icon">${icons.clock}</span>Fin avancée à <span class="mono">${heureFin}</span></p>` : ''}
        ${absent ? `<p class="appt__noshow"><span class="badge badge--danger"><span class="icon">${icons.userX}</span>Pas venue, sans prévenir</span></p>` : ''}
        ${appointment.notes ? `<p class="appt__notes">${escapeHtml(appointment.notes)}</p>` : ''}
        <div class="appt__actions">
          ${inProgress ? `
            <button type="button" class="btn btn--primary btn--sm" data-finish="${appointment.id}">
              <span class="icon">${icons.check}</span> Terminé
            </button>
            <button type="button" class="btn btn--ghost btn--sm" data-end-soon="${appointment.id}">
              <span class="icon">${icons.clock}</span> Je finis bientôt
            </button>` : ''}
          ${client?.telephone && !inProgress ? `
            <a class="btn btn--ghost btn--sm" href="tel:${telHref(client.telephone)}">
              <span class="icon">${icons.phone}</span> Appeler
            </a>
            <a class="btn btn--ghost btn--sm" href="${buildReminderSmsLink(client, appointment)}">
              <span class="icon">${icons.message}</span> Rappel SMS
            </a>` : ''}
          <!-- Modifier / annuler / « pas venue » : rangés dans un menu pour ne pas
               confondre une absence avec une annulation. -->
          <button type="button" class="btn btn--quiet btn--icon btn--sm appt__edit" data-appt-menu="${appointment.id}"
            aria-label="Plus d’actions sur ce rendez-vous" aria-haspopup="dialog" aria-expanded="false">
            <span class="icon">${icons.more}</span>
          </button>
        </div>
      </div>
    </article>
  `;
}
