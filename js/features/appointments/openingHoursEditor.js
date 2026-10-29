// Éditeur des jours/horaires de travail (affiché dans Réglages). Chaque jour :
// un interrupteur ouvert/fermé et jusqu'à 2 plages (matin / après-midi).
// Tap sur un jour ouvert = déplier ses plages. Enregistrement immédiat.

import { getOpeningHours, saveDayHours, copyDayToOpenDays, ORDRE_JOURS, formatPlages } from './scheduleService.js';
import { openTimePicker } from '../../shared/ui/timePicker.js';
import { icons } from '../../shared/ui/icons.js';
import { capitalize } from '../../shared/utils/formatUtils.js';
import { timeToMinutes, minutesToTime } from '../../shared/utils/dateUtils.js';

const NOMS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

function renderDay(day, hours, expanded) {
  const name = capitalize(NOMS[day]);
  return `
    <li class="hours-day ${hours.ouvert ? '' : 'is-closed'}" data-day="${day}">
      <div class="hours-day__head">
        <button type="button" class="hours-day__toggle" data-expand ${hours.ouvert ? '' : 'disabled'}
          aria-expanded="${expanded}">
          <span class="hours-day__name">${name}</span>
          <span class="hours-day__summary">${formatPlages(hours)}</span>
        </button>
        <label class="switch">
          <input type="checkbox" data-open ${hours.ouvert ? 'checked' : ''} />
          <span class="switch__track" aria-hidden="true"></span>
          <span class="sr-only">Travaille le ${NOMS[day]}</span>
        </label>
      </div>
      ${hours.ouvert && expanded ? `
        <div class="hours-day__edit">
          ${hours.plages.map((p, i) => `
            <div class="plage">
              <button type="button" class="time-btn" data-plage="${i}" data-edge="debut" aria-label="Début de la plage ${i + 1}">${p.debut}</button>
              <span class="plage__arrow" aria-hidden="true">→</span>
              <button type="button" class="time-btn" data-plage="${i}" data-edge="fin" aria-label="Fin de la plage ${i + 1}">${p.fin}</button>
              <button type="button" class="btn btn--quiet btn--icon btn--sm" data-remove="${i}" aria-label="Retirer cette plage">
                <span class="icon">${icons.x}</span>
              </button>
            </div>
          `).join('')}
          <div class="btn-row">
            ${hours.plages.length < 2 ? `<button type="button" class="btn btn--ghost btn--sm" data-add><span class="icon">${icons.plus}</span> Plage</button>` : ''}
            <button type="button" class="btn btn--quiet btn--sm" data-copy>Copier sur les autres jours travaillés</button>
          </div>
        </div>` : ''}
    </li>
  `;
}

export async function renderOpeningHoursEditor(container, { onSaved } = {}) {
  let horaires = await getOpeningHours();
  let expanded = null;

  function draw() {
    container.innerHTML = `<ul class="hours">${ORDRE_JOURS.map((d) => renderDay(d, horaires[d], d === expanded)).join('')}</ul>`;
  }

  async function save(day, hours) {
    horaires = await saveDayHours(day, hours);
    draw();
    onSaved?.();
  }

  container.addEventListener('change', (event) => {
    const input = event.target.closest('[data-open]');
    if (!input) return;
    const day = input.closest('[data-day]').dataset.day;
    const current = horaires[day];
    const plages = input.checked && !current.plages.length
      ? [{ debut: '09:00', fin: '12:00' }, { debut: '14:00', fin: '19:00' }]
      : current.plages;
    expanded = input.checked ? day : expanded;
    save(day, { ouvert: input.checked, plages });
  });

  container.addEventListener('click', (event) => {
    const dayEl = event.target.closest('[data-day]');
    if (!dayEl) return;
    const day = dayEl.dataset.day;
    const current = horaires[day];

    if (event.target.closest('[data-expand]')) {
      expanded = expanded === day ? null : day;
      draw();
    }

    const timeBtn = event.target.closest('[data-plage]');
    if (timeBtn) {
      const i = Number(timeBtn.dataset.plage);
      const edge = timeBtn.dataset.edge;
      openTimePicker({
        title: `${capitalize(NOMS[day])} · ${edge === 'debut' ? 'début' : 'fin'}`,
        value: current.plages[i][edge],
        onPick(time) {
          const plages = current.plages.map((p, j) => (j === i ? { ...p, [edge]: time } : p));
          save(day, { ...current, plages });
        },
      });
    }

    const remove = event.target.closest('[data-remove]');
    if (remove) {
      const plages = current.plages.filter((_, j) => j !== Number(remove.dataset.remove));
      save(day, { ouvert: plages.length > 0, plages });
    }

    if (event.target.closest('[data-add]')) {
      const last = current.plages.at(-1);
      const start = last ? Math.min(timeToMinutes(last.fin) + 60, 20 * 60) : 9 * 60;
      const plage = { debut: minutesToTime(start), fin: minutesToTime(Math.min(start + 180, 22 * 60)) };
      save(day, { ...current, plages: [...current.plages, plage] });
    }

    if (event.target.closest('[data-copy]')) {
      copyDayToOpenDays(day).then((next) => {
        horaires = next;
        draw();
        onSaved?.('Horaires copiés sur les autres jours travaillés');
      });
    }
  });

  draw();
}
