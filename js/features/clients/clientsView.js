import { getClients, searchClients, loadDemoClients, isToComplete, canLoadDemo } from './clientService.js';
import { getLoyaltyRules, isRewardDue, renderMiniCard } from '../loyalty/index.js';
import { icons } from '../../shared/ui/icons.js';
import { emptyState } from '../../shared/ui/components.js';
import { openPopover } from '../../shared/ui/popover.js';
import { escapeHtml, normalizeText, plural, capitalize } from '../../shared/utils/formatUtils.js';
import { formatDateLong, formatSince, todayISO } from '../../shared/utils/dateUtils.js';

// Conservée volontairement entre les écrans : en revenant d'une fiche, la
// recherche précédente est restaurée.
let searchQuery = '';

function renderRow(client, rules) {
  const visite = client.derniereVisite ? `venue ${formatSince(client.derniereVisite)}` : 'pas encore venue';
  return `
    <li>
      <button type="button" class="row" data-client-id="${client.id}">
        <span class="row__main">
          <span class="row__name">${escapeHtml(client.prenom)} <b>${escapeHtml(client.nom)}</b></span>
          <span class="row__meta">
            ${client.telephone ? `<span class="mono">${escapeHtml(client.telephone)}</span> · ` : ''}${visite}
          </span>
        </span>
        ${isToComplete(client) ? '<span class="badge badge--draft">À compléter</span>' : renderMiniCard(client, rules)}
      </button>
    </li>
  `;
}

function letterOf(client) {
  const letter = normalizeText(client.prenom).charAt(0).toUpperCase();
  return /[A-Z]/.test(letter) ? letter : '#';
}

// Sans recherche : liste alphabétique groupée par initiale du prénom (Alice
// appelle ses clientes par leur prénom). Avec recherche : liste à plat.
function renderList(clients, rules, query) {
  if (!clients.length) {
    return emptyState({
      icon: icons.search,
      title: `Aucune cliente pour « ${escapeHtml(query)} »`,
      text: 'Vérifiez l’orthographe, ou cherchez par numéro de téléphone.',
      actions: `
        <button type="button" class="btn btn--primary" data-create-from-query>
          <span class="icon">${icons.plus}</span> Créer la fiche « ${escapeHtml(query)} »
        </button>
      `,
    });
  }

  if (query) {
    return `
      <p class="list-note">${plural(clients.length, 'cliente trouvée', 'clientes trouvées')}</p>
      <ul class="roll">${clients.map((c) => renderRow(c, rules)).join('')}</ul>
    `;
  }

  const groups = new Map();
  clients.forEach((client) => {
    const letter = letterOf(client);
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter).push(client);
  });
  return [...groups].map(([letter, group]) => `
    <section class="letter-group" aria-label="${letter}">
      <h2 class="letter">${letter}</h2>
      <ul class="roll">${group.map((c) => renderRow(c, rules)).join('')}</ul>
    </section>
  `).join('');
}

// Tout ce qui « attend Alice » passe par la cloche : rien ne s'empile sous la
// recherche. Chaque groupe : titre, icône, lignes qui mènent où agir.
function collectNotifications(clients, rules) {
  return [
    {
      id: 'rewards',
      title: 'Récompenses à offrir',
      icon: icons.gift,
      tone: 'gold',
      items: clients.filter((c) => isRewardDue(c, rules)).map((c) => ({
        client: c, meta: 'Carte pleine', path: `/clientes/${c.id}`,
      })),
    },
    {
      id: 'drafts',
      title: 'Fiches à compléter',
      icon: icons.edit,
      tone: 'ink',
      items: clients.filter(isToComplete).map((c) => ({
        client: c, meta: `Créée ${c.creeLe ? formatSince(c.creeLe) : ''} avec un RDV`, path: `/clientes/${c.id}/modifier`,
      })),
    },
  ].filter((group) => group.items.length);
}

function renderBell(groups) {
  const count = groups.reduce((sum, g) => sum + g.items.length, 0);
  const label = count ? `Notifications : ${groups.map((g) => `${g.items.length} ${g.title.toLowerCase()}`).join(', ')}` : 'Notifications';
  return `
    <button type="button" class="btn btn--quiet btn--icon bell" data-open-notifs aria-label="${label}"
      aria-haspopup="dialog" aria-expanded="false">
      <span class="icon">${icons.bell}</span>
      ${count ? `<span class="bell__count" aria-hidden="true">${count}</span>` : ''}
    </button>
  `;
}

function openNotifications(bell, groups, ctx) {
  openPopover(bell, {
    title: 'Notifications',
    content: groups.length ? groups.map((group) => `
      <section class="notif-group notif-group--${group.tone}">
        <h3 class="notif-group__title"><span class="icon">${group.icon}</span>${group.title}</h3>
        <ul class="notifs">
          ${group.items.map(({ client, meta, path }) => `
            <li><button type="button" class="row" data-notif-path="${path}">
              <span class="row__main">
                <span class="row__name">${escapeHtml(client.prenom)} <b>${escapeHtml(client.nom)}</b></span>
                <span class="row__meta">${meta}</span>
              </span>
              <span class="icon muted">${icons.chevronRight}</span>
            </button></li>
          `).join('')}
        </ul>
      </section>
    `).join('') : '<p class="muted notifs__empty">Rien en attente pour l’instant.</p>',
    onMount(body, close) {
      body.addEventListener('click', (event) => {
        const row = event.target.closest('[data-notif-path]');
        if (!row) return;
        close();
        ctx.navigate(row.dataset.notifPath);
      });
    },
  });
}

function renderFirstRun() {
  return emptyState({
    icon: icons.punch,
    title: 'Le fichier est vide',
    text: 'Créez la fiche de chaque cliente à son prochain passage, avec les tampons déjà présents sur sa carte carton.',
    actions: `
      <button type="button" class="btn btn--primary" data-new-client>
        <span class="icon">${icons.plus}</span> Créer une première fiche
      </button>
      ${canLoadDemo() ? '<button type="button" class="btn btn--ghost" data-load-demo>Essayer avec des clientes fictives</button>' : ''}
    `,
  });
}

export async function renderClientsView(container, ctx) {
  const [clients, rules] = await Promise.all([getClients(), getLoyaltyRules()]);
  if (!ctx.isCurrent()) return;
  const notifications = collectNotifications(clients, rules);

  container.innerHTML = `
    <div class="screen screen--home">
      <header class="masthead">
        ${clients.length ? renderBell(notifications) : ''}
        <img class="masthead__logo" src="images/Titre.png" alt="Alice Coiffure" draggable="false" />
        <p class="masthead__date">${capitalize(formatDateLong(todayISO()))}</p>
      </header>

      <div class="page-head">
        <h1 class="title-xl">Clientes${clients.length ? ` <span class="title-count">${clients.length}</span>` : ''}</h1>
        ${clients.length ? `
          <button type="button" class="btn btn--primary" data-new-client>
            <span class="icon">${icons.plus}</span> Nouvelle
          </button>` : ''}
      </div>

      ${clients.length ? `
        <div class="searchbar">
          <label class="search">
            <span class="icon search__icon">${icons.search}</span>
            <input id="client-search" class="search__input" type="search" inputmode="search"
              autocomplete="off" enterkeyhint="search" placeholder="Prénom, nom ou téléphone"
              aria-label="Rechercher une cliente" value="${escapeHtml(searchQuery)}" />
            <button type="button" class="search__clear" data-clear-search aria-label="Effacer la recherche"
              ${searchQuery ? '' : 'hidden'}><span class="icon">${icons.x}</span></button>
          </label>
        </div>
        <div id="client-list"></div>
      ` : renderFirstRun()}
    </div>
  `;

  container.querySelectorAll('[data-new-client]').forEach((btn) =>
    btn.addEventListener('click', () => ctx.navigate('/clientes/nouvelle')));

  container.querySelector('[data-load-demo]')?.addEventListener('click', async () => {
    await loadDemoClients();
    ctx.toast('Clientes fictives ajoutées (à effacer dans Réglages → Données)');
    renderClientsView(container, ctx);
  });

  // Délégation sur l'écran (pas sur `container`, qui survit aux rendus).
  container.firstElementChild.addEventListener('click', (event) => {
    const target = event.target.closest('[data-client-id]');
    if (target) ctx.navigate(`/clientes/${target.dataset.clientId}`);
    const bell = event.target.closest('[data-open-notifs]');
    if (bell) openNotifications(bell, notifications, ctx);
    if (event.target.closest('[data-create-from-query]')) {
      ctx.navigate(`/clientes/nouvelle?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  });

  const input = container.querySelector('#client-search');
  if (!input) return;
  const listEl = container.querySelector('#client-list');
  const clearBtn = container.querySelector('[data-clear-search]');

  async function update() {
    const matches = await searchClients(searchQuery);
    listEl.innerHTML = renderList(matches, rules, searchQuery.trim());
    clearBtn.hidden = !searchQuery;
  }

  input.addEventListener('input', () => {
    searchQuery = input.value;
    update();
  });
  clearBtn.addEventListener('click', () => {
    searchQuery = '';
    input.value = '';
    input.focus();
    update();
  });
  await update();
}
