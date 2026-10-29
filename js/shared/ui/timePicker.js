// Sélecteur d'heure maison (le cadran natif est lent à manier) : un tap sur
// l'heure, un tap sur les minutes → c'est validé. « Valider » reste là pour
// garder les minutes déjà affichées.
//
//   openTimePicker({ title, value: '09:30', onPick(time) })

import { openDrawer } from './drawer.js';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 h → 21 h
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const pad = (n) => String(n).padStart(2, '0');

export function openTimePicker({ title = 'Heure', value = '09:00', onPick }) {
  let [hour, minute] = (value || '09:00').split(':').map(Number);
  minute -= minute % 5;
  let hourTouched = false;

  const chips = (list, kind, current) => list.map((n) => `
    <button type="button" class="tp__chip" data-${kind}="${n}" aria-pressed="${n === current}">
      ${kind === 'hour' ? `${n}h` : pad(n)}
    </button>
  `).join('');

  openDrawer({
    title,
    content: `
      <div class="tp">
        <output class="tp__display" aria-live="polite">${pad(hour)}:${pad(minute)}</output>
        <p class="tp__label">Heure</p>
        <div class="tp__grid tp__grid--hours">${chips(HOURS, 'hour', hour)}</div>
        <p class="tp__label">Minutes</p>
        <div class="tp__grid tp__grid--minutes">${chips(MINUTES, 'minute', minute)}</div>
        <button type="button" class="btn btn--primary btn--lg btn--block" data-validate>Valider</button>
      </div>
    `,
    onMount(body, close) {
      const display = body.querySelector('.tp__display');
      const refresh = () => {
        display.textContent = `${pad(hour)}:${pad(minute)}`;
        body.querySelectorAll('[data-hour]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.hour) === hour)));
        body.querySelectorAll('[data-minute]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.minute) === minute)));
      };
      const done = () => {
        close();
        onPick(`${pad(hour)}:${pad(minute)}`);
      };

      body.addEventListener('click', (event) => {
        const h = event.target.closest('[data-hour]');
        const m = event.target.closest('[data-minute]');
        if (h) {
          hour = Number(h.dataset.hour);
          hourTouched = true;
          refresh();
        }
        if (m) {
          minute = Number(m.dataset.minute);
          refresh();
          // Heure puis minutes : le choix est complet, on ferme.
          if (hourTouched) setTimeout(done, 140);
        }
        if (event.target.closest('[data-validate]')) done();
      });
    },
  });
}
