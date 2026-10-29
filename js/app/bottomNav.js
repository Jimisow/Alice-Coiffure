// Barre de navigation du bas, générée depuis la liste d'onglets (app/routes.js).
export function renderBottomNav(container, tabs, activeTab, onTabChange) {
  container.innerHTML = `
    <nav class="tabbar" aria-label="Navigation principale">
      ${tabs.map((tab) => `
        <button type="button" class="tabbar__item" data-path="${tab.path}"
          ${tab.id === activeTab ? 'aria-current="page"' : ''}>
          <span class="icon">${tab.icon}</span>
          <span class="tabbar__label">${tab.label}</span>
        </button>
      `).join('')}
    </nav>
  `;

  container.querySelectorAll('[data-path]').forEach((btn) => {
    btn.addEventListener('click', () => onTabChange(btn.dataset.path));
  });
}
