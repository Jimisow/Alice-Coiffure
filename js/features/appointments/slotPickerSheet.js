// Panneau « Choisir le créneau » : premiers créneaux libres, calendrier du
// mois (jours fermés / complets / chargés) et déroulé du jour choisi avec les
// heures où la prestation tient. Un tap sur une heure = date + heure choisies.
//
//   openSlotPicker({ date, duree, prestation, exceptId, onPick({ date, heure }), onManual(date) })

import { getMonthOverview, getDayPlan, findNextSlots } from './availabilityService.js';
import { openDrawer } from '../../shared/ui/drawer.js';
import { icons } from '../../shared/ui/icons.js';
import { escapeHtml, capitalize } from '../../shared/utils/formatUtils.js';
import {
  todayISO, fromISODate, toISODate, formatDateLong, formatDateShort, formatMonthYear, formatDuration, minutesToTime,
} from '../../shared/utils/dateUtils.js';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function renderCalendar(year, month, overview, selected) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const today = todayISO();
  const cells = Array.from({ length: offset }, () => '<span></span>');
  Object.entries(overview).forEach(([date, day]) => {
    const classes = [
      'cal__day',
      day.closed && 'is-closed',
      !day.closed && !day.past && !day.fits && 'is-full',
      date === today && 'is-today',
    ].filter(Boolean).join(' ');
    const state = day.past ? 'passé' : day.closed ? 'fermé' : day.fits ? 'disponible' : 'complet';
    cells.push(`
      <button type="button" class="${classes}" data-cal-day="${date}" ${day.past ? 'disabled' : ''}
        ${date === selected ? 'aria-current="date"' : ''} aria-label="${formatDateLong(date)}, ${state}">
        <span class="cal__num">${fromISODate(date).getDate()}</span>
        <span class="cal__dots">${'<i></i>'.repeat(Math.min(day.count, 3))}</span>
      </button>
    `);
  });
  return `
    <div class="cal">
      <div class="cal__nav">
        <button type="button" class="btn btn--quiet btn--icon" data-cal-month="-1" aria-label="Mois précédent"><span class="icon">${icons.chevronLeft}</span></button>
        <p class="cal__label">${capitalize(formatMonthYear(toISODate(first)))}</p>
        <button type="button" class="btn btn--quiet btn--icon" data-cal-month="1" aria-label="Mois suivant"><span class="icon">${icons.chevronRight}</span></button>
      </div>
      <div class="cal__grid">
        ${WEEKDAYS.map((d) => `<span class="cal__wd" aria-hidden="true">${d}</span>`).join('')}
        ${cells.join('')}
      </div>
      <p class="cal__legend"><span><i class="lg lg--free"></i>libre</span><span><i class="lg lg--full"></i>complet</span><span><i class="lg lg--closed"></i>fermé</span></p>
    </div>
  `;
}

function renderDayPlan(plan) {
  const title = `<h3 class="dayplan__title">${capitalize(formatDateLong(plan.date))}</h3>`;
  const manual = `<button type="button" class="btn btn--quiet btn--block" data-manual>
                    <span class="icon">${icons.clock}</span> Choisir une autre heure ce jour-là</button>`;
  if (plan.closed) {
    return `${title}<p class="dayplan__closed">Vous ne travaillez pas ce jour-là.</p>${manual}`;
  }
  const items = plan.items.map((item) => {
    const range = `<span class="mono">${minutesToTime(item.start)} – ${minutesToTime(item.end)}</span>`;
    if (item.type === 'busy') {
      const who = item.client ? `${escapeHtml(item.client.prenom)} ${escapeHtml(item.client.nom)}` : 'Cliente supprimée';
      return `<li class="slot slot--busy">${range}<span>${who} · ${escapeHtml(item.appointment.prestation)}</span></li>`;
    }
    if (!item.starts.length) {
      return `<li class="slot slot--short">${range} <span>libre, trop court</span></li>`;
    }
    return `
      <li class="slot slot--free">
        <span>${range} <span class="muted">libre</span></span>
        <div class="chips chips--times">${item.starts.map((t) => `<button type="button" class="chip chip--sm chip--time" data-time="${t}">${t}</button>`).join('')}</div>
      </li>
    `;
  }).join('');
  const nothing = !plan.items.some((i) => i.type === 'free' && i.starts.length);
  return `
    ${title}
    <ol class="dayplan">${items}</ol>
    ${nothing ? '<p class="dayplan__closed">Plus de place pour cette durée ce jour-là.</p>' : ''}
    ${manual}
  `;
}

export function openSlotPicker({ date, duree, prestation, exceptId = null, onPick, onManual }) {
  let selected = date < todayISO() ? todayISO() : date;
  let view = fromISODate(selected);
  view = { year: view.getFullYear(), month: view.getMonth() };

  openDrawer({
    title: 'Choisir le créneau',
    subtitle: `${prestation ? `${escapeHtml(prestation)} · ` : ''}${formatDuration(duree)}`,
    content: `
      <section class="next-slots" id="next-slots"></section>
      <div id="cal-slot"></div>
      <section id="dayplan-slot"></section>
    `,
    async onMount(body, close) {
      const pick = (d, heure) => {
        close();
        onPick({ date: d, heure });
      };

      async function drawCalendar() {
        const overview = await getMonthOverview(view.year, view.month, duree, exceptId);
        body.querySelector('#cal-slot').innerHTML = renderCalendar(view.year, view.month, overview, selected);
      }
      async function drawDay() {
        body.querySelector('#dayplan-slot').innerHTML = renderDayPlan(await getDayPlan(selected, duree, exceptId));
      }

      body.addEventListener('click', async (event) => {
        const next = event.target.closest('[data-next]');
        if (next) return pick(next.dataset.next, next.dataset.heure);
        const time = event.target.closest('[data-time]');
        if (time) return pick(selected, time.dataset.time);
        if (event.target.closest('[data-manual]')) {
          close();
          return onManual(selected);
        }
        const month = event.target.closest('[data-cal-month]');
        if (month) {
          const d = new Date(view.year, view.month + Number(month.dataset.calMonth), 1);
          view = { year: d.getFullYear(), month: d.getMonth() };
          return drawCalendar();
        }
        const day = event.target.closest('[data-cal-day]');
        if (day) {
          selected = day.dataset.calDay;
          body.querySelectorAll('[data-cal-day]').forEach((b) => b.toggleAttribute('aria-current', b === day));
          day.setAttribute('aria-current', 'date');
          await drawDay();
          body.querySelector('#dayplan-slot').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });

      const nextSlots = await findNextSlots(todayISO(), duree, 4, exceptId);
      body.querySelector('#next-slots').innerHTML = nextSlots.length ? `
        <p class="tp__label">Premiers créneaux libres</p>
        <div class="chips">
          ${nextSlots.map((s) => `
            <button type="button" class="chip chip--slot" data-next="${s.date}" data-heure="${s.heure}">
              ${capitalize(formatDateShort(s.date))} <b class="mono">${s.heure}</b>
            </button>`).join('')}
        </div>
      ` : '<p class="muted">Aucun créneau libre dans les 2 mois : vérifiez vos horaires dans Réglages → Salon.</p>';
      await Promise.all([drawCalendar(), drawDay()]);
    },
  });
}
