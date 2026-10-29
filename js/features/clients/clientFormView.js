import {
  getClientById, createClient, updateClient, deleteClient, validateClient, findByPhone, getHairSuggestions,
} from './clientService.js';
import { getLoyaltyRules } from '../loyalty/index.js';
import { icons } from '../../shared/ui/icons.js';
import { topbar, bindBack, perforation } from '../../shared/ui/components.js';
import { escapeHtml, normalizeText, fullName } from '../../shared/utils/formatUtils.js';

// Pré-remplissage depuis une recherche sans résultat : « Marie Dupont » ou un numéro.
function prefillFromQuery(q = '') {
  if (/\d{4,}/.test(q)) return { telephone: q };
  const [prenom = '', ...rest] = q.trim().split(/\s+/);
  return { prenom: prenom.charAt(0).toUpperCase() + prenom.slice(1), nom: rest.join(' ') };
}

function field({ id, label, value = '', type = 'text', attrs = '', hint = '' }) {
  return `
    <div class="field">
      <label class="field__label" for="${id}">${label}</label>
      <input class="input" id="${id}" name="${id}" type="${type}" value="${escapeHtml(value)}" ${attrs} />
      ${hint ? `<p class="field__hint">${hint}</p>` : ''}
      <p class="field__error" id="${id}-error" hidden></p>
    </div>
  `;
}

export async function renderClientFormView(container, ctx) {
  const editingId = ctx.params.id || null;
  const [client, rules, hairSuggestions] = await Promise.all([
    editingId ? getClientById(editingId) : null,
    getLoyaltyRules(),
    getHairSuggestions(),
  ]);
  if (!ctx.isCurrent()) return;
  if (editingId && !client) {
    ctx.navigate('/clientes', { replace: true });
    return;
  }

  const data = client || { prenom: '', nom: '', telephone: '', natureCheveux: '', notes: '', ...prefillFromQuery(ctx.query.q) };
  const tampons = client?.fidelite?.tampons || 0;

  container.innerHTML = `
    <div class="screen">
      ${topbar({
        title: client?.aCompleter ? 'Compléter la fiche' : editingId ? 'Modifier la fiche' : 'Nouvelle cliente',
        backLabel: 'Annuler',
      })}

      <form class="form" id="client-form" novalidate>
        <section class="ticket sheet">
          <h2 class="sheet__title">Identité</h2>
          ${field({ id: 'prenom', label: 'Prénom', value: data.prenom, attrs: 'autocomplete="off" autocapitalize="words" required' })}
          ${field({ id: 'nom', label: 'Nom', value: data.nom, attrs: 'autocomplete="off" autocapitalize="words"' })}
          ${field({ id: 'telephone', label: 'Téléphone', value: data.telephone, type: 'tel', attrs: 'inputmode="tel" autocomplete="off"' })}
          <p class="notice" id="dup-warning" hidden></p>
        </section>

        <section class="ticket sheet">
          <h2 class="sheet__title">Cheveux &amp; notes</h2>
          <div class="field">
            <label class="field__label" for="natureCheveux">Nature des cheveux</label>
            <input class="input" id="natureCheveux" type="text" value="${escapeHtml(data.natureCheveux)}" autocomplete="off" />
            <div class="chips" id="hair-chips">
              ${hairSuggestions.map((s) => `<button type="button" class="chip chip--sm" data-hair="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join('')}
            </div>
          </div>
          <div class="field">
            <label class="field__label" for="notes">Notes</label>
            <textarea class="input textarea" id="notes" rows="4"
              placeholder="Allergies, couleur utilisée, préférences…">${escapeHtml(data.notes)}</textarea>
          </div>
        </section>

        <section class="ticket sheet">
          <h2 class="sheet__title">Carte fidélité</h2>
          <div class="stepper-row">
            <div>
              <p class="field__label" id="tampons-label">${editingId && !client.aCompleter ? 'Tampons sur la carte' : 'Tampons déjà sur sa carte carton'}</p>
              <p class="field__hint">${editingId && !client.aCompleter ? 'Pour corriger une erreur.' : 'Reprenez simplement le compte de son ancienne carte.'}</p>
            </div>
            <div class="stepper" role="group" aria-labelledby="tampons-label">
              <button type="button" class="btn btn--ghost btn--icon" data-step="-1" aria-label="Un tampon de moins"><span class="icon">${icons.minus}</span></button>
              <output class="stepper__value" id="tampons" aria-live="polite">${tampons}</output>
              <button type="button" class="btn btn--ghost btn--icon" data-step="1" aria-label="Un tampon de plus"><span class="icon">${icons.plus}</span></button>
            </div>
          </div>
          <p class="field__hint">Sur ${rules.objectif} : la carte pleine donne droit à la récompense.</p>
        </section>

        <div class="form__submit">
          <button type="submit" class="btn btn--primary btn--lg btn--block">
            <span class="icon">${icons.check}</span> ${client?.aCompleter ? 'Fiche complète' : editingId ? 'Enregistrer les modifications' : 'Créer la fiche'}
          </button>
        </div>

        ${editingId ? `
          ${perforation}
          <div class="danger-zone">
            <button type="button" class="btn btn--danger btn--block" data-delete>
              <span class="icon">${icons.trash}</span> Supprimer la fiche de ${escapeHtml(client.prenom)}
            </button>
            <p class="field__hint">Efface aussi son historique de passages et ses rendez-vous.</p>
          </div>` : ''}
      </form>
    </div>
  `;

  const screen = container.firstElementChild;
  const form = screen.querySelector('#client-form');
  const fieldEl = (id) => form.querySelector(`#${id}`);
  bindBack(screen, ctx, editingId ? `/clientes/${editingId}` : '/clientes');

  // Puces « nature des cheveux » : ajoutent/retirent le mot dans le champ.
  const hairInput = fieldEl('natureCheveux');
  const syncChips = () => {
    const words = hairInput.value.split(',').map(normalizeText).filter(Boolean);
    screen.querySelectorAll('[data-hair]').forEach((chip) =>
      chip.setAttribute('aria-pressed', String(words.includes(normalizeText(chip.dataset.hair)))));
  };
  screen.querySelector('#hair-chips').addEventListener('click', (event) => {
    const chip = event.target.closest('[data-hair]');
    if (!chip) return;
    const parts = hairInput.value.split(',').map((t) => t.trim()).filter(Boolean);
    const key = normalizeText(chip.dataset.hair);
    const kept = parts.filter((p) => normalizeText(p) !== key);
    const next = kept.length === parts.length ? [...parts, chip.dataset.hair] : kept;
    // Seul le premier mot garde sa majuscule : « Fins, colorés ».
    hairInput.value = next.map((p, i) => (i === 0 ? p.charAt(0).toUpperCase() + p.slice(1) : p.toLowerCase())).join(', ');
    syncChips();
  });
  hairInput.addEventListener('input', syncChips);
  syncChips();

  // Compteur de tampons.
  const output = fieldEl('tampons');
  let count = tampons;
  screen.querySelectorAll('[data-step]').forEach((btn) => btn.addEventListener('click', () => {
    count = Math.min(rules.objectif, Math.max(0, count + Number(btn.dataset.step)));
    output.textContent = count;
  }));

  // Doublon probable (même numéro) : simple avertissement, pas un blocage.
  const dupEl = screen.querySelector('#dup-warning');
  fieldEl('telephone').addEventListener('change', async () => {
    const twin = await findByPhone(fieldEl('telephone').value, editingId);
    dupEl.hidden = !twin;
    if (twin) dupEl.textContent = `Ce numéro est déjà celui de ${fullName(twin)}.`;
  });

  function showErrors(errors) {
    ['prenom', 'telephone'].forEach((id) => {
      const errorEl = form.querySelector(`#${id}-error`);
      errorEl.hidden = !errors[id];
      errorEl.textContent = errors[id] || '';
      fieldEl(id).setAttribute('aria-invalid', String(Boolean(errors[id])));
      if (errors[id]) fieldEl(id).setAttribute('aria-describedby', `${id}-error`);
    });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = {
      prenom: fieldEl('prenom').value,
      nom: fieldEl('nom').value,
      telephone: fieldEl('telephone').value,
      natureCheveux: hairInput.value,
      notes: fieldEl('notes').value,
      tampons: count,
    };
    const errors = validateClient(values);
    showErrors(errors);
    if (Object.keys(errors).length) {
      fieldEl(Object.keys(errors)[0]).focus();
      return;
    }

    if (editingId) {
      await updateClient(editingId, values);
      ctx.toast('Fiche mise à jour');
      ctx.back(`/clientes/${editingId}`);
    } else {
      const created = await createClient(values);
      ctx.toast(`Fiche de ${created.prenom} créée`);
      ctx.navigate(`/clientes/${created.id}`, { replace: true });
    }
  });

  screen.querySelector('[data-delete]')?.addEventListener('click', async () => {
    if (!confirm(`Supprimer définitivement la fiche de ${fullName(client)} ?\nSon historique et ses rendez-vous seront effacés.`)) return;
    await deleteClient(editingId);
    ctx.toast('Fiche supprimée');
    ctx.navigate('/clientes', { replace: true });
  });
}
