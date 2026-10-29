// Tableau de bord compact (haut de Réglages), en un seul bloc :
// 3 chiffres du mois, mini-histogramme des 6 mois, une ligne de repères.
// Une seule couleur de données (l'encre) ; l'or reste réservé aux récompenses.
// Le graphique a son tableau équivalent pour les lecteurs d'écran, et un tap
// sur une barre affiche sa valeur (pas de survol sur téléphone).

import { computeStats } from './statsService.js';
import { escapeHtml, plural, capitalize } from '../../shared/utils/formatUtils.js';

function delta(value, previous) {
  const diff = value - previous;
  if (!diff) return '=';
  return `${diff > 0 ? '+' : '−'}${Math.abs(diff)}`;
}

function renderFigures(s) {
  return `
    <dl class="kpis">
      <div class="kpi">
        <dt>Passages</dt>
        <dd><b>${s.passages.value}</b> <span class="kpi__delta" title="par rapport à ${s.month.previousLabel}">${delta(s.passages.value, s.passages.previous)} vs ${s.month.previousLabel.slice(0, 4)}.</span></dd>
      </div>
      <div class="kpi">
        <dt>Clientes venues</dt>
        <dd><b>${s.clientesVenues}</b></dd>
      </div>
      <div class="kpi kpi--gold">
        <dt>Récompenses</dt>
        <dd><b>${s.recompensesMois}</b></dd>
      </div>
    </dl>
  `;
}

function renderMonths(months) {
  const max = Math.max(1, ...months.map((m) => m.value));
  const last = months.length - 1;
  return `
    <div class="minibars" role="img" aria-label="Passages par mois : ${months.map((m) => `${m.long} ${m.value}`).join(', ')}">
      ${months.map((m, i) => `
        <button type="button" class="minibars__col" data-bar="${i}" aria-pressed="${i === last}" tabindex="-1" aria-hidden="true">
          <span class="minibars__bar" style="--h:${(m.value / max) * 100}%"></span>
          <span class="minibars__label">${m.court}</span>
        </button>
      `).join('')}
    </div>
    <table class="sr-only">
      <caption>Passages par mois</caption>
      ${months.map((m) => `<tr><td>${m.long}</td><td>${m.value}</td></tr>`).join('')}
    </table>
  `;
}

// Repères en une ligne : seulement ce qui mérite l'attention.
function renderNotes(s) {
  const w = s.watch;
  const notes = [];
  if (w.aRelancer) notes.push(`${plural(w.aRelancer, 'cliente')} à relancer (+ de 3 mois)`);
  if (w.presquePleines) notes.push(`${plural(w.presquePleines, 'carte')} presque pleine${w.presquePleines > 1 ? 's' : ''}`);
  if (w.absences.count) notes.push(`${Math.round((w.absences.count / w.absences.total) * 100)} % de RDV non honorés (3 mois)`);
  if (s.topPrestations[0]) notes.push(`Top : ${escapeHtml(s.topPrestations[0].label)}`);
  return notes.length ? `<p class="stats__notes">${notes.join(' · ')}</p>` : '';
}

export async function renderStatsPanel(container) {
  const s = await computeStats();
  const months = s.passagesByMonth;
  container.innerHTML = `
    <section class="ticket stats" aria-labelledby="stats-title">
      <div class="stats__head">
        <h2 class="stats__title" id="stats-title">Activité du salon</h2>
        <p class="stats__readout" aria-live="polite" data-readout>${capitalize(months.at(-1).long)} : ${plural(months.at(-1).value, 'passage')}</p>
      </div>
      ${renderFigures(s)}
      ${renderMonths(months)}
      ${renderNotes(s)}
    </section>
  `;

  container.querySelector('.minibars').addEventListener('click', (event) => {
    const col = event.target.closest('[data-bar]');
    if (!col) return;
    const m = months[Number(col.dataset.bar)];
    container.querySelectorAll('[data-bar]').forEach((c) => c.setAttribute('aria-pressed', String(c === col)));
    container.querySelector('[data-readout]').textContent = `${capitalize(m.long)} : ${plural(m.value, 'passage')}`;
  });
}
