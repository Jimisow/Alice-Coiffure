// Éditeur des prestations (affiché dans Réglages → Prestations) : la liste,
// un tap = panneau de modification (nom, durée, supprimer), « + Ajouter ».
// Enregistrement immédiat ; « Revenir à la liste d'origine » remet les modèles.

import {
  getPrestations, addPrestation, updatePrestation, removePrestation, resetPrestations, validatePrestation,
} from './prestationService.js';
import { DUREES_RAPIDES } from './constants.js';
import { openDrawer } from '../../shared/ui/drawer.js';
import { icons } from '../../shared/ui/icons.js';
import { escapeHtml, plural } from '../../shared/utils/formatUtils.js';
import { formatDuration, parseDuration, durationToInput } from '../../shared/utils/dateUtils.js';

function openEditor({ title, prestation, list, index, onSave, onDelete }) {
  let duree = prestation?.duree || 60;
  openDrawer({
    title,
    content: `
      <form class="presta-form" novalidate>
        <div class="field">
          <label class="field__label" for="presta-nom">Nom de la prestation</label>
          <input class="input" id="presta-nom" type="text" autocomplete="off" autocapitalize="sentences"
            value="${escapeHtml(prestation?.nom || '')}" placeholder="Ex : Coupe enfant, Brushing long…" />
        </div>
        <div class="field">
          <p class="field__label" id="presta-duree-label">Durée habituelle</p>
          <div class="chips" role="group" aria-labelledby="presta-duree-label">
            ${DUREES_RAPIDES.map((m) => `<button type="button" class="chip chip--sm" data-duree="${m}" aria-pressed="${m === duree}">${formatDuration(m)}</button>`).join('')}
            <span class="duree-custom">
              <input class="chip chip--sm duree-custom__input" id="presta-duree" type="text" inputmode="decimal" autocomplete="off"
                placeholder="Autre" aria-label="Autre durée (1 à 9 = heures, 2.10 = 2 h 10, 10 et plus = minutes)"
                value="${DUREES_RAPIDES.includes(duree) ? '' : durationToInput(duree)}" />
              <span class="duree-custom__preview" id="presta-preview" aria-live="polite"></span>
            </span>
          </div>
        </div>
        <p class="field__error" id="presta-error" hidden></p>
        <div class="btn-col">
          <button type="submit" class="btn btn--primary btn--lg btn--block"><span class="icon">${icons.check}</span> Enregistrer</button>
          ${onDelete ? `<button type="button" class="btn btn--danger btn--block" data-presta-delete><span class="icon">${icons.trash}</span> Supprimer cette prestation</button>` : ''}
        </div>
      </form>
    `,
    onMount(body, close) {
      const form = body.querySelector('form');
      const input = body.querySelector('#presta-duree');
      const preview = body.querySelector('#presta-preview');
      const errorEl = body.querySelector('#presta-error');
      const syncChips = () => body.querySelectorAll('[data-duree]').forEach((c) =>
        c.setAttribute('aria-pressed', String(Number(c.dataset.duree) === duree && !input.value.trim())));

      body.querySelectorAll('[data-duree]').forEach((chip) => chip.addEventListener('click', () => {
        duree = Number(chip.dataset.duree);
        input.value = '';
        preview.textContent = '';
        input.removeAttribute('aria-invalid');
        syncChips();
      }));
      input.addEventListener('input', () => {
        const minutes = parseDuration(input.value);
        const empty = !input.value.trim();
        preview.textContent = empty ? '' : minutes ? `= ${formatDuration(minutes)}` : 'Durée non reconnue';
        preview.classList.toggle('is-invalid', !empty && !minutes);
        input.setAttribute('aria-invalid', String(!empty && !minutes));
        if (minutes) duree = minutes;
        syncChips();
      });
      if (input.value) input.dispatchEvent(new Event('input'));

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = { nom: body.querySelector('#presta-nom').value, duree };
        const error = input.getAttribute('aria-invalid') === 'true' ? 'Durée non reconnue.' : validatePrestation(data, list, index);
        errorEl.hidden = !error;
        errorEl.textContent = error || '';
        if (error) return;
        close();
        onSave(data);
      });
      body.querySelector('[data-presta-delete]')?.addEventListener('click', () => {
        close();
        onDelete();
      });
      if (!prestation) body.querySelector('#presta-nom').focus();
    },
  });
}

export async function renderPrestationsEditor(container, { toast }) {
  let list = await getPrestations();

  function draw() {
    container.innerHTML = `
      <ul class="roll presta-list">
        ${list.map((p, i) => `
          <li><button type="button" class="row presta-row" data-presta-index="${i}">
            <span class="row__main"><span class="row__name">${escapeHtml(p.nom)}</span></span>
            <span class="presta-row__duree">${formatDuration(p.duree)}</span>
            <span class="icon muted">${icons.chevronRight}</span>
          </button></li>
        `).join('')}
      </ul>
      <div class="btn-col">
        <button type="button" class="btn btn--primary btn--block" data-presta-add>
          <span class="icon">${icons.plus}</span> Ajouter une prestation
        </button>
        <button type="button" class="btn btn--quiet btn--block" data-presta-reset>Revenir à la liste d’origine</button>
      </div>
    `;
  }

  container.addEventListener('click', async (event) => {
    const row = event.target.closest('[data-presta-index]');
    if (row) {
      const index = Number(row.dataset.prestaIndex);
      const prestation = list[index];
      openEditor({
        title: 'Modifier la prestation',
        prestation,
        list,
        index,
        async onSave(data) {
          list = await updatePrestation(index, data);
          draw();
          toast('Prestation enregistrée');
        },
        onDelete: list.length > 1 ? async () => {
          if (!confirm(`Supprimer « ${prestation.nom} » de la liste ?\nLes rendez-vous déjà pris ne changent pas.`)) return;
          list = await removePrestation(index);
          draw();
          toast('Prestation supprimée');
        } : null,
      });
    }

    if (event.target.closest('[data-presta-add]')) {
      openEditor({
        title: 'Nouvelle prestation',
        prestation: null,
        list,
        index: -1,
        async onSave(data) {
          list = await addPrestation(data);
          draw();
          toast(`« ${data.nom.trim()} » ajoutée · ${plural(list.length, 'prestation')}`);
        },
      });
    }

    if (event.target.closest('[data-presta-reset]')) {
      if (!confirm('Remettre la liste de prestations d’origine ? Vos prestations personnalisées seront remplacées.')) return;
      list = await resetPrestations();
      draw();
      toast('Liste d’origine rétablie');
    }
  });

  draw();
}
