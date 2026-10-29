import {
  getAppointmentById, addAppointment, updateAppointment, deleteAppointment, findOverlaps, getNoShowsForClient,
} from './appointmentService.js';
import { findNextSlots, isOutsideHours } from './availabilityService.js';
import { openSlotPicker } from './slotPickerSheet.js';
import {
  getClientById, searchClients, findByPhone, validateClient, createProvisionalClient,
} from '../clients/index.js';
import { DUREES_RAPIDES } from './constants.js';
import { getPrestations } from './prestationService.js';
import { icons } from '../../shared/ui/icons.js';
import { topbar, bindBack, perforation } from '../../shared/ui/components.js';
import { openTimePicker } from '../../shared/ui/timePicker.js';
import { escapeHtml, fullName, capitalize } from '../../shared/utils/formatUtils.js';
import {
  todayISO, formatDuration, formatDateShort, formatDateLong, minutesToTime, nowMinutes,
  parseDuration, durationToInput,
} from '../../shared/utils/dateUtils.js';

const MAX_PICKER_RESULTS = 5;
const SUGGESTIONS = 3;

// Prochain quart d'heure si c'est aujourd'hui, sinon 9 h.
function defaultTime(dateISO) {
  if (dateISO !== todayISO()) return '09:00';
  const minutes = Math.ceil(nowMinutes() / 15) * 15;
  return minutes >= 19 * 60 ? '09:00' : minutesToTime(minutes);
}

// « Marie Dupont » → prénom + nom ; une suite de chiffres → téléphone.
function splitQuery(q) {
  if (/\d{4,}/.test(q)) return { prenom: '', nom: '', telephone: q.trim() };
  const [prenom = '', ...rest] = q.trim().split(/\s+/);
  return { prenom: capitalize(prenom), nom: rest.map(capitalize).join(' '), telephone: '' };
}

// Cliente choisie, avec ses absences passées : utile au moment de réserver.
async function renderSelectedClient(client) {
  const noShows = await getNoShowsForClient(client.id);
  return `
    <div class="picked">
      <span class="picked__name">
        ${escapeHtml(client.prenom)} <b>${escapeHtml(client.nom)}</b>
        ${client.aCompleter ? '<span class="badge badge--draft">À compléter</span>' : ''}
      </span>
      <button type="button" class="btn btn--quiet btn--sm" data-change-client>Changer</button>
    </div>
    ${noShows.length ? `
      <p class="noshow-note">
        <span class="icon">${icons.userX}</span>
        <span>${noShows.length > 1 ? `${noShows.length} rendez-vous manqués` : '1 rendez-vous manqué'} sans prévenir</span>
      </p>` : ''}
  `;
}

function renderPickerResults(clients) {
  if (!clients.length) return '';
  return `
    <ul class="roll roll--compact">
      ${clients.slice(0, MAX_PICKER_RESULTS).map((c) => `
        <li><button type="button" class="row row--compact" data-pick="${c.id}">
          <span class="row__name">${escapeHtml(c.prenom)} <b>${escapeHtml(c.nom)}</b></span>
          ${c.telephone ? `<span class="row__meta mono">${escapeHtml(c.telephone)}</span>` : ''}
        </button></li>
      `).join('')}
    </ul>
  `;
}

function renderNewClientForm() {
  return `
    <div class="newclient" id="newclient-form">
      <p class="newclient__title"><span class="icon">${icons.plus}</span> Nouvelle cliente</p>
      <p class="field__hint">Sa fiche sera créée avec le rendez-vous ; vous la compléterez plus tard depuis l'accueil.</p>
      <div class="grid-2">
        <div class="field">
          <label class="field__label" for="nc-prenom">Prénom</label>
          <input class="input" id="nc-prenom" type="text" autocomplete="off" autocapitalize="words" />
          <p class="field__error" id="nc-prenom-error" hidden></p>
        </div>
        <div class="field">
          <label class="field__label" for="nc-nom">Nom</label>
          <input class="input" id="nc-nom" type="text" autocomplete="off" autocapitalize="words" />
        </div>
      </div>
      <div class="field">
        <label class="field__label" for="nc-telephone">Téléphone <span class="muted">(pour le rappel SMS)</span></label>
        <input class="input" id="nc-telephone" type="tel" inputmode="tel" autocomplete="off" />
        <p class="field__error" id="nc-telephone-error" hidden></p>
      </div>
      <div class="notice" id="nc-dup" hidden></div>
    </div>
  `;
}

export async function renderAppointmentFormView(container, ctx) {
  const editingId = ctx.params.id || null;
  const existing = editingId ? await getAppointmentById(editingId) : null;
  if (editingId && !existing) {
    ctx.navigate('/agenda', { replace: true });
    return;
  }

  const startDate = existing?.date || (/^\d{4}-\d{2}-\d{2}$/.test(ctx.query.jour || '') ? ctx.query.jour : todayISO());
  // « Placer quelqu'un maintenant » (agenda) arrive avec ?heure=HH:MM : on la garde telle quelle.
  const askedTime = /^\d{2}:\d{2}$/.test(ctx.query.heure || '') ? ctx.query.heure : null;
  const state = {
    clientId: existing?.clientId || ctx.query.cliente || null,
    prestation: existing?.prestation || '',
    duree: existing?.dureeMinutes || 60,
    dureeTouched: Boolean(existing),
    date: startDate,
    heure: existing?.heureDebut || askedTime || defaultTime(startDate),
    whenTouched: Boolean(askedTime),
    newClientOpen: false,
    newClientTouched: false,
  };
  const client = state.clientId ? await getClientById(state.clientId) : null;
  if (!client) state.clientId = null;
  const selectedHtml = client ? await renderSelectedClient(client) : '';
  const prestations = await getPrestations();
  const prestationNames = prestations.map((p) => p.nom);
  if (!ctx.isCurrent()) return;

  const isOther = state.prestation && !prestationNames.includes(state.prestation);

  container.innerHTML = `
    <div class="screen">
      ${topbar({ title: editingId ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous', backLabel: 'Annuler' })}

      <form class="form" id="rdv-form" novalidate>
        <section class="ticket sheet">
          <h2 class="sheet__title" id="client-label">Cliente</h2>
          <div id="client-slot">${selectedHtml}</div>
          <div id="client-search-box" ${client ? 'hidden' : ''}>
            <label class="search search--field">
              <span class="icon search__icon">${icons.search}</span>
              <input class="search__input" id="rdv-client-search" type="search" autocomplete="off"
                placeholder="Tapez le prénom, le nom ou le numéro" aria-labelledby="client-label" />
            </label>
            <div id="client-results"></div>
            <div id="newclient-slot"></div>
          </div>
          <p class="field__error" id="client-error" hidden>Choisissez la cliente, ou remplissez sa nouvelle fiche.</p>
        </section>

        <section class="ticket sheet">
          <h2 class="sheet__title" id="presta-label">Prestation</h2>
          <div class="chips" role="group" aria-labelledby="presta-label">
            ${prestationNames.map((p) => `
              <button type="button" class="chip" data-presta="${escapeHtml(p)}" aria-pressed="${p === state.prestation}">${escapeHtml(p)}</button>
            `).join('')}
            <button type="button" class="chip" data-presta-other aria-pressed="${Boolean(isOther)}">Autre…</button>
          </div>
          <div class="field" id="other-field" ${isOther ? '' : 'hidden'}>
            <label class="field__label" for="rdv-other">Préciser la prestation</label>
            <input class="input" id="rdv-other" type="text" value="${isOther ? escapeHtml(state.prestation) : ''}" />
          </div>
          <div class="field">
            <p class="field__label" id="duree-label">Durée</p>
            <div class="chips" role="group" aria-labelledby="duree-label">
              ${DUREES_RAPIDES.map((m) => `<button type="button" class="chip chip--sm" data-duree="${m}">${formatDuration(m)}</button>`).join('')}
              <span class="duree-custom">
                <input class="chip chip--sm duree-custom__input" id="rdv-duree" type="text" inputmode="decimal"
                  autocomplete="off" placeholder="Autre" aria-label="Autre durée (1 à 9 = heures, 2.10 = 2 h 10, 10 et plus = minutes)"
                  aria-describedby="duree-preview"
                  value="${DUREES_RAPIDES.includes(state.duree) ? '' : durationToInput(state.duree)}" />
                <span class="duree-custom__preview" id="duree-preview" aria-live="polite"></span>
              </span>
            </div>
          </div>
          <p class="field__error" id="presta-error" hidden>Choisissez une prestation.</p>
        </section>

        <section class="ticket sheet">
          <h2 class="sheet__title">Quand</h2>
          <div class="when">
            <button type="button" class="field-btn" id="date-btn">
              <span class="field-btn__label">Date</span>
              <span class="field-btn__value"><span class="icon">${icons.calendar}</span><span id="date-text"></span></span>
            </button>
            <button type="button" class="field-btn field-btn--time" id="time-btn">
              <span class="field-btn__label">Heure</span>
              <span class="field-btn__value"><span class="icon">${icons.clock}</span><span class="mono" id="time-text"></span></span>
            </button>
          </div>
          <div id="suggestions"></div>
          <p class="notice" id="hours-warning" hidden></p>
          <p class="notice" id="overlap-warning" hidden></p>
        </section>

        <section class="ticket sheet">
          <div class="field">
            <label class="sheet__title" for="rdv-notes">Notes</label>
            <textarea class="input textarea" id="rdv-notes" rows="3"
              placeholder="Ex : racines + longueurs, ton chocolat">${escapeHtml(existing?.notes || '')}</textarea>
          </div>
        </section>

        <div class="form__submit">
          <button type="submit" class="btn btn--primary btn--lg btn--block">
            <span class="icon">${icons.check}</span> ${editingId ? 'Enregistrer' : 'Ajouter à l’agenda'}
          </button>
        </div>

        ${editingId ? `
          ${perforation}
          <div class="danger-zone">
            <button type="button" class="btn btn--danger btn--block" data-delete>
              <span class="icon">${icons.trash}</span> Annuler ce rendez-vous
            </button>
          </div>` : ''}
      </form>
    </div>
  `;

  const screen = container.firstElementChild;
  const $ = (selector) => screen.querySelector(selector);
  bindBack(screen, ctx, '/agenda');

  // ================= Cliente =================
  const searchBox = $('#client-search-box');
  const searchInput = $('#rdv-client-search');
  const resultsEl = $('#client-results');
  const newClientSlot = $('#newclient-slot');

  // Sous la recherche : les fiches qui correspondent, puis la nouvelle fiche.
  // Sans résultat, le formulaire « nouvelle cliente » s'ouvre directement ;
  // sinon il reste replié derrière un bouton (éviter les doublons).
  async function refreshClientSearch() {
    const query = searchInput.value.trim();
    const matches = query ? await searchClients(query) : [];
    resultsEl.innerHTML = renderPickerResults(matches);
    if (!query) {
      state.newClientOpen = false;
      newClientSlot.innerHTML = '';
      return;
    }
    if (!matches.length) state.newClientOpen = true;

    if (state.newClientOpen) {
      if (!$('#newclient-form')) newClientSlot.innerHTML = renderNewClientForm();
      if (!state.newClientTouched) {
        const guess = splitQuery(query);
        $('#nc-prenom').value = guess.prenom;
        $('#nc-nom').value = guess.nom;
        $('#nc-telephone').value = guess.telephone;
      }
    } else {
      newClientSlot.innerHTML = `
        <button type="button" class="btn btn--ghost btn--block newclient-open" data-open-newclient>
          <span class="icon">${icons.plus}</span> Pas dans la liste : nouvelle cliente « ${escapeHtml(query)} »
        </button>
      `;
    }
  }

  async function selectClient(selected) {
    state.clientId = selected.id;
    state.newClientOpen = false;
    $('#client-slot').innerHTML = await renderSelectedClient(selected);
    searchBox.hidden = true;
    $('#client-error').hidden = true;
  }

  searchInput.addEventListener('input', refreshClientSearch);

  newClientSlot.addEventListener('input', (event) => {
    if (event.target.matches('.input')) state.newClientTouched = true;
  });
  newClientSlot.addEventListener('change', async (event) => {
    if (event.target.id !== 'nc-telephone') return;
    const twin = await findByPhone(event.target.value);
    const dup = $('#nc-dup');
    dup.hidden = !twin;
    if (twin) {
      dup.innerHTML = `Ce numéro est déjà celui de <b>${escapeHtml(fullName(twin))}</b>.
        <button type="button" class="btn btn--ghost btn--sm" data-pick="${twin.id}">La choisir</button>`;
    }
  });

  screen.addEventListener('click', async (event) => {
    const pick = event.target.closest('[data-pick]');
    if (pick) selectClient(await getClientById(pick.dataset.pick));

    if (event.target.closest('[data-open-newclient]')) {
      state.newClientOpen = true;
      newClientSlot.innerHTML = '';
      await refreshClientSearch();
      $('#nc-prenom').focus();
    }

    if (event.target.closest('[data-change-client]')) {
      state.clientId = null;
      $('#client-slot').innerHTML = '';
      searchBox.hidden = false;
      searchInput.value = '';
      refreshClientSearch();
      searchInput.focus();
    }
  });

  // ================= Prestation & durée =================
  const otherField = $('#other-field');
  const dureeInput = $('#rdv-duree');
  const syncDureeChips = () => screen.querySelectorAll('[data-duree]').forEach((chip) =>
    chip.setAttribute('aria-pressed', String(Number(chip.dataset.duree) === state.duree)));

  const dureePreview = $('#duree-preview');

  // Puce ou durée habituelle d'une prestation : si une puce correspond, le
  // champ libre se vide ; sinon (ex. 20 min) la durée s'affiche dans « Autre ».
  function setDuree(minutes, touched, { fromInput = false } = {}) {
    state.duree = minutes;
    if (touched) state.dureeTouched = true;
    if (!fromInput) {
      const hasChip = DUREES_RAPIDES.includes(minutes);
      dureeInput.value = hasChip ? '' : durationToInput(minutes);
      showDureePreview(hasChip ? '' : `= ${formatDuration(minutes)}`);
    }
    syncDureeChips();
    refreshWhen();
  }

  // Aperçu en direct de ce que la saisie libre donne (« = 2 h 10 ») : avec
  // deux règles dans un même champ, une faute de frappe doit se voir.
  function showDureePreview(text, invalid = false) {
    dureePreview.textContent = text;
    dureePreview.classList.toggle('is-invalid', invalid);
    dureeInput.setAttribute('aria-invalid', String(invalid));
  }

  function readDureeInput() {
    if (!dureeInput.value.trim()) return showDureePreview('');
    const minutes = parseDuration(dureeInput.value);
    if (minutes === null) {
      screen.querySelectorAll('[data-duree]').forEach((chip) => chip.setAttribute('aria-pressed', 'false'));
      return showDureePreview('Durée non reconnue', true);
    }
    showDureePreview(`= ${formatDuration(minutes)}`);
    if (minutes !== state.duree) setDuree(minutes, true, { fromInput: true });
  }

  screen.querySelectorAll('[data-presta], [data-presta-other]').forEach((chip) => chip.addEventListener('click', () => {
    screen.querySelectorAll('[data-presta], [data-presta-other]').forEach((c) => c.setAttribute('aria-pressed', 'false'));
    chip.setAttribute('aria-pressed', 'true');
    $('#presta-error').hidden = true;
    const other = chip.hasAttribute('data-presta-other');
    otherField.hidden = !other;
    state.prestation = other ? '' : chip.dataset.presta;
    if (other) $('#rdv-other').focus();
    // Durée habituelle de la prestation, sauf si Alice l'a déjà réglée à la main.
    const habituelle = prestations.find((p) => p.nom === state.prestation)?.duree;
    if (!other && !state.dureeTouched && habituelle) {
      setDuree(habituelle, false);
    }
  }));
  screen.querySelectorAll('[data-duree]').forEach((chip) =>
    chip.addEventListener('click', () => setDuree(Number(chip.dataset.duree), true)));
  dureeInput.addEventListener('input', readDureeInput);
  if (dureeInput.value) readDureeInput();
  syncDureeChips();

  // ================= Quand =================
  const prestationLabel = () => (otherField.hidden ? state.prestation : $('#rdv-other').value.trim());

  function setWhen(date, heure) {
    state.date = date;
    state.heure = heure;
    state.whenTouched = true;
    refreshWhen();
  }

  // Nouveau RDV : tant qu'Alice n'a pas choisi elle-même, on se cale sur le
  // premier créneau libre (à partir du jour demandé) pour la durée en cours.
  async function autoPlace() {
    if (editingId || state.whenTouched) return;
    const [first] = await findNextSlots(startDate, state.duree, 1);
    if (first) {
      state.date = first.date;
      state.heure = first.heure;
    }
  }

  async function refreshWhen() {
    await autoPlace();
    $('#date-text').textContent = capitalize(formatDateShort(state.date));
    $('#time-text').textContent = state.heure;
    const slot = { date: state.date, heureDebut: state.heure, dureeMinutes: state.duree };

    const [outside, overlaps, next] = await Promise.all([
      isOutsideHours(slot),
      findOverlaps(slot, editingId),
      findNextSlots(todayISO(), state.duree, SUGGESTIONS, editingId),
    ]);

    const hoursEl = $('#hours-warning');
    hoursEl.hidden = !outside;
    hoursEl.textContent = outside ? 'En dehors de vos horaires de travail (Réglages → Salon).' : '';

    const names = await Promise.all(overlaps.map(async (a) => {
      const c = await getClientById(a.clientId);
      return `${c ? fullName(c) : 'une cliente'} à ${a.heureDebut}`;
    }));
    const overlapEl = $('#overlap-warning');
    overlapEl.hidden = !overlaps.length;
    overlapEl.textContent = overlaps.length ? `Ce créneau chevauche : ${names.join(', ')}.` : '';

    $('#suggestions').innerHTML = next.length ? `
      <p class="suggest__label">Libre pour ${formatDuration(state.duree)} :</p>
      <div class="chips">
        ${next.map((s) => `
          <button type="button" class="chip chip--slot" data-slot-date="${s.date}" data-slot-time="${s.heure}"
            aria-pressed="${s.date === state.date && s.heure === state.heure}">
            ${capitalize(formatDateShort(s.date))} <b class="mono">${s.heure}</b>
          </button>`).join('')}
        <button type="button" class="chip chip--sm" data-open-planning>Voir le planning…</button>
      </div>
    ` : '';
  }

  function openPlanning() {
    openSlotPicker({
      date: state.date,
      duree: state.duree,
      prestation: prestationLabel(),
      exceptId: editingId,
      onPick: ({ date, heure }) => setWhen(date, heure),
      onManual: (date) => {
        state.date = date;
        state.whenTouched = true;
        refreshWhen();
        openTimePicker({ title: capitalize(formatDateLong(date)), value: state.heure, onPick: (heure) => setWhen(date, heure) });
      },
    });
  }

  $('#date-btn').addEventListener('click', openPlanning);
  $('#time-btn').addEventListener('click', () => openTimePicker({
    title: capitalize(formatDateLong(state.date)),
    value: state.heure,
    onPick: (heure) => setWhen(state.date, heure),
  }));
  $('#suggestions').addEventListener('click', (event) => {
    const slot = event.target.closest('[data-slot-date]');
    if (slot) setWhen(slot.dataset.slotDate, slot.dataset.slotTime);
    if (event.target.closest('[data-open-planning]')) openPlanning();
  });
  refreshWhen();

  // ================= Enregistrement =================
  function showNewClientErrors(errors) {
    ['prenom', 'telephone'].forEach((id) => {
      const el = $(`#nc-${id}-error`);
      el.hidden = !errors[id];
      el.textContent = errors[id] || '';
      $(`#nc-${id}`).setAttribute('aria-invalid', String(Boolean(errors[id])));
    });
  }

  $('#rdv-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const prestation = prestationLabel();
    let newClientData = null;
    if (dureeInput.getAttribute('aria-invalid') === 'true') return dureeInput.focus();

    if (!state.clientId) {
      if (!state.newClientOpen) {
        $('#client-error').hidden = false;
        return searchInput.focus();
      }
      newClientData = {
        prenom: $('#nc-prenom').value,
        nom: $('#nc-nom').value,
        telephone: $('#nc-telephone').value,
        natureCheveux: '',
        notes: '',
      };
      const errors = validateClient(newClientData);
      showNewClientErrors(errors);
      if (Object.keys(errors).length) return $(`#nc-${Object.keys(errors)[0]}`).focus();
    }
    $('#client-error').hidden = true;
    $('#presta-error').hidden = Boolean(prestation);
    if (!prestation) return $('#presta-error').scrollIntoView({ block: 'center', behavior: 'smooth' });

    const created = newClientData ? await createProvisionalClient(newClientData) : null;
    const data = {
      clientId: created?.id || state.clientId,
      prestation,
      date: state.date,
      heureDebut: state.heure,
      dureeMinutes: Math.max(5, state.duree || 60),
      notes: $('#rdv-notes').value.trim(),
    };

    if (editingId) await updateAppointment(editingId, data);
    else await addAppointment(data);
    ctx.toast(created
      ? `Rendez-vous ajouté · fiche de ${created.prenom} à compléter`
      : editingId ? 'Rendez-vous modifié' : 'Rendez-vous ajouté');
    // Venu d'une fiche cliente : on y retourne. Sinon : agenda au jour du RDV.
    if (ctx.query.cliente) ctx.back(`/clientes/${data.clientId}`);
    else ctx.navigate(`/agenda?jour=${data.date}`, { replace: true });
  });

  $('[data-delete]')?.addEventListener('click', async () => {
    if (!confirm('Annuler ce rendez-vous ? Il sera retiré de l’agenda.')) return;
    await deleteAppointment(editingId);
    ctx.toast('Rendez-vous annulé');
    ctx.navigate(`/agenda?jour=${existing.date}`, { replace: true });
  });
}
