// Routeur par hash (#/clientes/42) : le bouton retour du téléphone, le
// rechargement et l'icône d'accueil ramènent au bon écran.
//
// Chaque route : { path: '/clientes/:id', tab: 'clientes', render(container, ctx) }.
// `ctx` passé à render() :
//   - params / query          segments `:x` de l'URL et paramètres `?a=b`
//   - navigate(path, opts)    aller à un écran ({ replace: true } = sans historique)
//   - back(fallback)          retour arrière, ou `fallback` si on est arrivé ici directement
//   - toast(message, opts)    message bref en bas d'écran (voir toast.js)
// Les vues n'ont ainsi jamais besoin de toucher au DOM du shell.

import { renderBottomNav } from './bottomNav.js';
import { showToast } from './toast.js';

function compile(path) {
  const keys = [];
  const pattern = path.replace(/:(\w+)/g, (_, key) => {
    keys.push(key);
    return '([^/]+)';
  });
  return { regex: new RegExp(`^${pattern}$`), keys };
}

function parseHash() {
  const raw = decodeURI(location.hash.slice(1)) || '/';
  const [path, search = ''] = raw.split('?');
  return { path, query: Object.fromEntries(new URLSearchParams(search)) };
}

export function createRouter({ routes, tabs, mainEl, navEl, toastEl }) {
  const compiled = routes.map((route) => ({ route, ...compile(route.path) }));
  const scrollByIndex = new Map();
  let renderToken = 0;

  const currentIndex = () => history.state?.idx ?? 0;

  function match(path) {
    for (const { route, regex, keys } of compiled) {
      const found = path.match(regex);
      if (found) return { route, params: Object.fromEntries(keys.map((k, i) => [k, decodeURIComponent(found[i + 1])])) };
    }
    return null;
  }

  async function render({ restoreScroll = false } = {}) {
    const { path, query } = parseHash();
    const found = match(path);
    if (!found) {
      navigate(routes[0].path, { replace: true });
      return;
    }
    const token = ++renderToken;
    const ctx = {
      params: found.params,
      query,
      navigate,
      back,
      toast: (message, opts) => showToast(toastEl, message, opts),
      // Une vue qui a lancé un traitement long vérifie qu'elle est toujours affichée.
      isCurrent: () => token === renderToken,
    };

    renderBottomNav(navEl, tabs, found.route.tab, (tabPath) => navigate(tabPath));
    mainEl.dataset.screen = found.route.tab;
    await found.route.render(mainEl, ctx);
    if (token !== renderToken) return;

    mainEl.classList.remove('view-enter');
    void mainEl.offsetWidth;
    mainEl.classList.add('view-enter');
    window.scrollTo(0, restoreScroll ? scrollByIndex.get(currentIndex()) || 0 : 0);
  }

  function navigate(path, { replace = false } = {}) {
    scrollByIndex.set(currentIndex(), window.scrollY);
    const idx = replace ? currentIndex() : currentIndex() + 1;
    history[replace ? 'replaceState' : 'pushState']({ idx }, '', `#${path}`);
    render();
  }

  function back(fallback = routes[0].path) {
    if (currentIndex() > 0) history.back();
    else navigate(fallback, { replace: true });
  }

  window.addEventListener('popstate', () => render({ restoreScroll: true }));

  return {
    start() {
      history.replaceState({ idx: currentIndex() }, '', location.hash || `#${routes[0].path}`);
      render({ restoreScroll: true });
    },
  };
}
