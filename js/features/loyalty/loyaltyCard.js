// Carte fidélité d'une cliente, dessinée comme la carte carton du salon : une
// rangée de trous à poinçonner, le dernier étant la récompense.
//
//   renderLoyaltyCard(client, rules, { prestations, prestationDuJour, justPunched })
//   bindLoyaltyCard(root, clientId, { onStamp, onRedeem })

import { icons } from '../../shared/ui/icons.js';
import { perforation } from '../../shared/ui/components.js';
import { escapeHtml, plural } from '../../shared/utils/formatUtils.js';
import { loyaltyState, addStamp, redeemReward, removeLastStamp } from './loyaltyService.js';

function renderHoles({ tampons, objectif }, justPunched) {
  const cols = Math.min(6, Math.ceil(objectif / 2));
  let holes = '';
  for (let i = 1; i <= objectif; i += 1) {
    const punched = i <= tampons;
    const isReward = i === objectif;
    const classes = [
      'hole',
      punched && 'is-punched',
      isReward && 'hole--reward',
      i === tampons + 1 && 'is-next',
      i === justPunched && 'is-just-punched',
    ].filter(Boolean).join(' ');
    holes += `
      <li class="${classes}">
        ${isReward ? `<span class="icon">${icons.gift}</span>` : `<span class="hole__num">${i}</span>`}
        ${i === justPunched ? '<span class="hole__chad" aria-hidden="true"></span>' : ''}
      </li>
    `;
  }
  return `<ol class="punchcard__holes" style="--cols:${cols}" aria-label="${tampons} tampons sur ${objectif}">${holes}</ol>`;
}

function renderPrestationPicker(prestations, selected) {
  if (!prestations?.length) return '';
  return `
    <fieldset class="picker">
      <legend class="picker__legend">Prestation du jour <span class="muted">(facultatif)</span></legend>
      <div class="chips chips--scroll">
        ${prestations.map((p) => `
          <button type="button" class="chip" data-prestation="${escapeHtml(p)}" aria-pressed="${p === selected}">
            ${escapeHtml(p)}
          </button>
        `).join('')}
      </div>
    </fieldset>
  `;
}

export function renderLoyaltyCard(client, rules, { prestations = [], prestationDuJour = '', justPunched = null } = {}) {
  const state = loyaltyState(client, rules);
  const offertes = client.fidelite?.recompensesOffertes || 0;

  const hint = state.complete
    ? `<p class="punchcard__hint punchcard__hint--done"><span class="icon">${icons.gift}</span>
         Carte pleine : <strong>${escapeHtml(rules.recompense)}</strong></p>`
    : `<p class="punchcard__hint">Encore ${plural(state.restant, 'passage')} avant
         <strong>${escapeHtml(rules.recompense.charAt(0).toLowerCase() + rules.recompense.slice(1))}</strong></p>`;

  const actions = state.complete
    ? `
      <button type="button" class="btn btn--gold btn--lg btn--block" data-loyalty-redeem>
        <span class="icon">${icons.gift}</span> Offrir la récompense
      </button>
    `
    : `
      ${renderPrestationPicker(prestations, prestationDuJour)}
      <button type="button" class="btn btn--primary btn--lg btn--block" data-loyalty-stamp>
        <span class="icon">${icons.punch}</span> Poinçonner un passage
      </button>
    `;

  return `
    <section class="ticket punchcard ${state.complete ? 'is-complete' : ''}" aria-labelledby="punchcard-title">
      <div class="punchcard__head">
        <div>
          <h2 class="punchcard__title" id="punchcard-title">Carte fidélité</h2>
          <p class="punchcard__sub">Carte n° ${state.numeroCarte}${offertes ? ` · ${plural(offertes, 'récompense offerte', 'récompenses offertes')}` : ''}</p>
        </div>
        <div class="punchcard__counter">
          <p class="punchcard__count" aria-hidden="true"><b>${state.tampons}</b>/${state.objectif}</p>
          ${state.tampons > 0 ? `
            <button type="button" class="punchcard__minus" data-loyalty-minus aria-label="Retirer un tampon (erreur)">−1</button>` : ''}
        </div>
      </div>
      ${renderHoles(state, justPunched)}
      ${hint}
      ${perforation}
      <div class="punchcard__actions">${actions}</div>
    </section>
  `;
}

// Branche les boutons rendus par renderLoyaltyCard().
//   onStamp({ client, visit })          après un tampon (visit = null si refusé)
//   onRedeem(client)                    après la récompense
//   onMinus({ client, removedVisit })   après une correction « −1 »
export function bindLoyaltyCard(root, clientId, { onStamp, onRedeem, onMinus }) {
  root.querySelector('[data-loyalty-minus]')?.addEventListener('click', async (event) => {
    event.currentTarget.disabled = true;
    onMinus(await removeLastStamp(clientId));
  });

  let prestation = root.querySelector('.chip[aria-pressed="true"]')?.dataset.prestation || '';

  root.querySelectorAll('[data-prestation]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const wasOn = chip.getAttribute('aria-pressed') === 'true';
      root.querySelectorAll('[data-prestation]').forEach((c) => c.setAttribute('aria-pressed', 'false'));
      chip.setAttribute('aria-pressed', String(!wasOn));
      prestation = wasOn ? '' : chip.dataset.prestation;
    });
  });

  root.querySelector('[data-loyalty-stamp]')?.addEventListener('click', async (event) => {
    event.currentTarget.disabled = true;
    onStamp(await addStamp(clientId, { prestation }));
  });

  root.querySelector('[data-loyalty-redeem]')?.addEventListener('click', async (event) => {
    // Pas d'annulation possible ensuite : on confirme (geste rare, conséquence durable).
    if (!confirm('La récompense est offerte ? La carte repartira à zéro.')) return;
    event.currentTarget.disabled = true;
    onRedeem(await redeemReward(clientId));
  });
}

// Mini-carte (liste des clientes) : 2 rangées de points, lisible d'un coup d'œil.
export function renderMiniCard(client, rules) {
  const state = loyaltyState(client, rules);
  if (state.complete) {
    return `<span class="badge badge--gold"><span class="icon">${icons.gift}</span>À offrir</span>`;
  }
  const dots = Array.from({ length: state.objectif }, (_, i) =>
    `<i class="${i < state.tampons ? 'on' : ''}"></i>`).join('');
  return `
    <span class="minicard" style="--cols:${Math.ceil(state.objectif / 2)}" aria-label="${state.tampons} tampons sur ${state.objectif}">
      ${dots}
    </span>
  `;
}
