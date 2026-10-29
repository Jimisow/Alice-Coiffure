import {
  getAppointmentsByDate, countAppointmentsBetween, setNoShow, finishNow, agendaCategory,
  isNoShow, canMarkNoShow, deleteAppointment, addAppointment, setEndSoon, endTimeIn,
} from './appointmentService.js';
import { openPopover } from '../../shared/ui/popover.js';
import { getFreeNow } from './availabilityService.js';
import { getPrestationNames } from './prestationService.js';
import { getClientById } from '../clients/index.js';
import { addStamp, getLoyaltyRules, loyaltyState } from '../loyalty/index.js';
import { openDrawer } from '../../shared/ui/drawer.js';
import { openTimePicker } from '../../shared/ui/timePicker.js';
import { renderAppointmentCard } from './appointmentCard.js';
import { icons } from '../../shared/ui/icons.js';
import { emptyState } from '../../shared/ui/components.js';
import { capitalize, plural, escapeHtml } from '../../shared/utils/formatUtils.js';
import {
  formatDuration, todayISO, startOfWeek, addDays, formatDateLong, formatMonthYear, dayInitial, fromISODate,
} from '../../shared/utils/dateUtils.js';

// Les RDV encore à venir (ou en cours) restent dépliés en haut ; les terminés
// et les absentes se replient dans leur catégorie pour ne pas encombrer.
const FOLDED_GROUPS = [
  { id: 'termines', label: 'Terminés', icon: icons.check },
  { id: 'absentes', label: 'Pas venues', icon: icons.userX },
];

function renderGroups(appointments, clients, rules) {
  const cards = { actifs: [], termines: [], absentes: [] };
  appointments.forEach((a, i) => cards[agendaCategory(a)].push(renderAppointmentCard(a, clients[i], rules)));

  const active = cards.actifs.length
    ? cards.actifs.join('')
    : '<p class="day-done">Plus de rendez-vous à venir ce jour-là.</p>';

  return active + FOLDED_GROUPS.filter((g) => cards[g.id].length).map((g) => `
    <details class="fold fold--${g.id}">
      <summary class="fold__summary">
        <span class="icon">${g.icon}</span>
        <span class="fold__label">${g.label}</span>
        <span class="fold__count">${cards[g.id].length}</span>
        <span class="fold__chevron icon" aria-hidden="true">${icons.chevronDown}</span>
      </summary>
      <div class="fold__body">${cards[g.id].join('')}</div>
    </details>
  `).join('');
}

function renderWeek(selected, counts) {
  const monday = startOfWeek(selected);
  const today = todayISO();
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  return `
    <div class="week">
      <div class="week__nav">
        <button type="button" class="btn btn--quiet btn--icon" data-day="${addDays(selected, -7)}" aria-label="Semaine précédente">
          <span class="icon">${icons.chevronLeft}</span>
        </button>
        <p class="week__label">${capitalize(formatMonthYear(selected))}</p>
        ${startOfWeek(today) !== monday || selected !== today
          ? `<button type="button" class="btn btn--quiet btn--sm" data-day="${today}">Aujourd'hui</button>` : ''}
        <button type="button" class="btn btn--quiet btn--icon" data-day="${addDays(selected, 7)}" aria-label="Semaine suivante">
          <span class="icon">${icons.chevronRight}</span>
        </button>
      </div>
      <div class="week__days">
        ${days.map((day) => `
          <button type="button" class="day ${day === today ? 'is-today' : ''}" data-day="${day}"
            ${day === selected ? 'aria-current="date"' : ''} aria-label="${formatDateLong(day)}${counts[day] ? `, ${plural(counts[day], 'rendez-vous', 'rendez-vous')}` : ''}">
            <span class="day__name">${dayInitial(day)}</span>
            <span class="day__num">${fromISODate(day).getDate()}</span>
            <span class="day__dots">${'<i></i>'.repeat(Math.min(counts[day] || 0, 4))}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

export async function renderAgendaView(container, ctx) {
  const selected = /^\d{4}-\d{2}-\d{2}$/.test(ctx.query.jour || '') ? ctx.query.jour : todayISO();
  const [appointments, counts] = await Promise.all([
    getAppointmentsByDate(selected),
    countAppointmentsBetween(startOfWeek(selected), 7),
  ]);
  const [clients, rules] = await Promise.all([
    Promise.all(appointments.map((a) => getClientById(a.clientId))),
    getLoyaltyRules(),
  ]);
  const freeNow = selected === todayISO() ? await getFreeNow() : null;
  if (!ctx.isCurrent()) return;

  const dayTitle = selected === todayISO() ? "Aujourd'hui" : capitalize(formatDateLong(selected));

  container.innerHTML = `
    <div class="screen">
      <div class="page-head page-head--top">
        <h1 class="title-xl">Agenda</h1>
        <button type="button" class="btn btn--primary" data-new-rdv>
          <span class="icon">${icons.plus}</span> Rendez-vous
        </button>
      </div>

      ${renderWeek(selected, counts)}

      ${freeNow ? `
        <section class="ticket free-now" aria-labelledby="free-now-title">
          <p class="free-now__title" id="free-now-title">
            <span class="free-now__dot" aria-hidden="true"></span>
            Libre maintenant jusqu'à <span class="mono">${freeNow.until}</span>
          </p>
          <p class="free-now__meta">${formatDuration(freeNow.minutes)} devant vous pour une cliente sans rendez-vous.</p>
          <button type="button" class="btn btn--primary btn--block" data-walk-in="${freeNow.from}">
            <span class="icon">${icons.plus}</span> Placer quelqu'un maintenant
          </button>
        </section>` : ''}

      <h2 class="day-title">${dayTitle}
        ${appointments.length ? `<span class="muted">· ${plural(appointments.length, 'rendez-vous', 'rendez-vous')}</span>` : ''}
      </h2>

      <div class="stack">
        ${appointments.length
          ? renderGroups(appointments, clients, rules)
          : emptyState({
            icon: icons.calendar,
            title: 'Journée libre',
            text: 'Aucun rendez-vous ce jour-là.',
            actions: `<button type="button" class="btn btn--ghost" data-new-rdv>
                        <span class="icon">${icons.plus}</span> Ajouter un rendez-vous</button>`,
          })}
      </div>
    </div>
  `;

  const screen = container.firstElementChild;
  screen.addEventListener('click', (event) => {
    const dayBtn = event.target.closest('[data-day]');
    if (dayBtn) ctx.navigate(`/agenda?jour=${dayBtn.dataset.day}`, { replace: true });

    const clientBtn = event.target.closest('[data-client-id]');
    if (clientBtn) ctx.navigate(`/clientes/${clientBtn.dataset.clientId}`);

    const menuBtn = event.target.closest('[data-appt-menu]');
    if (menuBtn) openAppointmentMenu(menuBtn, appointments.find((a) => a.id === menuBtn.dataset.apptMenu));

    if (event.target.closest('[data-new-rdv]')) ctx.navigate(`/agenda/nouveau?jour=${selected}`);

    const walkIn = event.target.closest('[data-walk-in]');
    if (walkIn) ctx.navigate(`/agenda/nouveau?jour=${todayISO()}&heure=${walkIn.dataset.walkIn}`);

    const finishBtn = event.target.closest('[data-finish]');
    if (finishBtn) finish(finishBtn.dataset.finish);

    const soonBtn = event.target.closest('[data-end-soon]');
    if (soonBtn) openEndSoon(appointments.find((a) => a.id === soonBtn.dataset.endSoon));
  });

  // « Je finis bientôt » : un appel arrive pendant une cliente. Alice dit dans
  // combien de temps elle aura fini ; on avance la fin du RDV en cours puis on
  // ouvre directement le formulaire de RDV à cette heure-là.
  function openEndSoon(appointment) {
    if (!appointment) return;
    const client = clients[appointments.indexOf(appointment)];
    const placeAt = async (endTime) => {
      const updated = await setEndSoon(appointment.id, endTime);
      if (!updated) return ctx.toast('Heure de fin impossible : elle doit être après le début du rendez-vous.');
      ctx.navigate(`/agenda/nouveau?jour=${todayISO()}&heure=${endTime}`);
      ctx.toast(`Fin avancée à ${endTime} : placez la personne au téléphone`);
    };

    openDrawer({
      title: 'Je finis dans…',
      subtitle: client ? `${escapeHtml(client.prenom)} ${escapeHtml(client.nom)} · ${escapeHtml(appointment.prestation)}` : '',
      content: `
        <div class="soon__grid">
          ${[5, 10, 15, 20, 30].map((m) => `
            <button type="button" class="soon__chip" data-soon="${m}">
              <b>${m}</b><span>min</span><span class="soon__at">${endTimeIn(m)}</span>
            </button>
          `).join('')}
        </div>
        <button type="button" class="btn btn--ghost btn--block soon__other" data-soon-other>
          <span class="icon">${icons.clock}</span> Autre heure de fin…
        </button>
        <p class="soon__hint">Ensuite, le formulaire de rendez-vous s’ouvre à cette heure-là pour placer la personne.</p>
      `,
      onMount(body, close) {
        body.addEventListener('click', (event) => {
          const chip = event.target.closest('[data-soon]');
          if (chip) {
            close();
            placeAt(endTimeIn(Number(chip.dataset.soon)));
          }
          if (event.target.closest('[data-soon-other]')) {
            close();
            openTimePicker({ title: 'Je finis à…', value: endTimeIn(15), onPick: placeAt });
          }
        });
      },
    });
  }

  // Terminé : on libère la fin du créneau, puis on DEMANDE si on poinçonne
  // (un RDV terminé est en général un passage). « Non » laisse le RDV terminé
  // et rappelle l'option dans un toast, pour une seconde chance.
  async function finish(id) {
    const appointment = await finishNow(id);
    if (!appointment) return;
    await renderAgendaView(container, ctx);
    const client = await getClientById(appointment.clientId);
    if (!client) return ctx.toast('Rendez-vous terminé');

    const state = loyaltyState(client, rules);
    if (state.complete) {
      ctx.toast(`Terminé · carte de ${client.prenom} pleine : la récompense est à offrir`);
      return;
    }
    const prestation = (await getPrestationNames()).includes(appointment.prestation) ? appointment.prestation : '';
    const stamp = async () => {
      const { client: updated, visit } = await addStamp(client.id, { prestation });
      if (ctx.isCurrent()) await renderAgendaView(container, ctx);
      if (!visit) return ctx.toast('Carte déjà pleine : la récompense est à offrir');
      const after = loyaltyState(updated, rules);
      ctx.toast(after.complete
        ? `Carte de ${client.prenom} pleine : la récompense est à offrir !`
        : `Carte de ${client.prenom} poinçonnée · ${after.tampons}/${after.objectif}`);
    };

    openDrawer({
      title: 'Rendez-vous terminé',
      subtitle: `${escapeHtml(client.prenom)} ${escapeHtml(client.nom)} · ${escapeHtml(appointment.prestation)}`,
      content: `
        <div class="finish">
          <p class="finish__question">Poinçonner sa carte fidélité ?</p>
          <p class="finish__count"><span class="mono">${state.tampons}/${state.objectif}</span>
            <span class="icon">${icons.chevronRight}</span>
            <b class="mono">${state.tampons + 1}/${state.objectif}</b>
            ${state.tampons + 1 >= state.objectif ? '<span class="badge badge--gold">carte pleine</span>' : ''}</p>
          <div class="btn-col">
            <button type="button" class="btn btn--primary btn--lg btn--block" data-answer="yes">
              <span class="icon">${icons.punch}</span> Oui, poinçonner
            </button>
            <button type="button" class="btn btn--quiet btn--block" data-answer="no">Non, pas cette fois</button>
          </div>
        </div>
      `,
      onMount(body, close) {
        body.addEventListener('click', (event) => {
          const answer = event.target.closest('[data-answer]');
          if (answer) close(answer.dataset.answer);
        });
      },
      onClose(answer) {
        if (answer === 'yes') return stamp();
        // Non (ou panneau fermé) : le RDV reste terminé, dernière chance en bas.
        ctx.toast(`Terminé · poinçonner la carte de ${client.prenom} ?`, {
          action: { label: 'Poinçonner', run: stamp },
        });
      },
    });
  }

  // Menu « ⋯ » d'un RDV. L'annulation (la cliente a prévenu) et la « pas
  // venue » (lapin) sont deux choses différentes : la seconde est placée à
  // part, en bas, et n'apparaît qu'une fois l'heure du RDV arrivée.
  function openAppointmentMenu(button, appointment) {
    if (!appointment) return;
    const absent = isNoShow(appointment);
    const showNoShow = canMarkNoShow(appointment) && appointment.statut !== 'termine';
    openPopover(button, {
      title: `Rendez-vous de ${appointment.heureDebut}`,
      content: `
        <ul class="menu">
          <li><button type="button" class="menu__item" data-menu="edit">
            <span class="icon">${icons.edit}</span> Modifier</button></li>
          ${!absent ? `<li><button type="button" class="menu__item menu__item--danger" data-menu="cancel">
            <span class="icon">${icons.x}</span> Annuler le rendez-vous</button></li>` : ''}
        </ul>
        ${showNoShow ? `
          <div class="menu__aside">
            <button type="button" class="menu__item menu__item--quiet" data-menu="noshow">
              <span class="icon">${icons.userX}</span>
              ${absent ? 'Elle est venue finalement' : 'Pas venue, sans prévenir'}
            </button>
          </div>` : ''}
      `,
      onMount(body, close) {
        body.addEventListener('click', async (event) => {
          const item = event.target.closest('[data-menu]');
          if (!item) return;
          close();
          if (item.dataset.menu === 'edit') ctx.navigate(`/agenda/${appointment.id}/modifier`);
          if (item.dataset.menu === 'cancel') cancel(appointment);
          if (item.dataset.menu === 'noshow') toggleNoShow(appointment.id, !absent);
        });
      },
    });
  }

  // Annulation : le RDV disparaît de l'agenda (la cliente a prévenu) ; annulable tout de suite.
  async function cancel(appointment) {
    if (!confirm('Annuler ce rendez-vous ? Il sera retiré de l’agenda.')) return;
    await deleteAppointment(appointment.id);
    await renderAgendaView(container, ctx);
    ctx.toast('Rendez-vous annulé', {
      action: {
        label: 'Rétablir',
        async run() {
          const { id, updatedAt, ...data } = appointment;
          await addAppointment(data);
          if (ctx.isCurrent()) renderAgendaView(container, ctx);
        },
      },
    });
  }

  async function toggleNoShow(id, absent) {
    await setNoShow(id, absent);
    await renderAgendaView(container, ctx);
    ctx.toast(absent ? 'Notée « pas venue » sur sa fiche' : 'Retiré : elle est bien venue', {
      action: absent ? {
        label: 'Annuler',
        async run() {
          await setNoShow(id, false);
          if (ctx.isCurrent()) renderAgendaView(container, ctx);
        },
      } : null,
    });
  }
}
