// API publique de la feature « settings » (réglages, sauvegardes).

import { icons } from '../../shared/ui/icons.js';
import { renderSettingsView } from './settingsView.js';

export const settingsTab = { id: 'reglages', label: 'Réglages', icon: icons.settings, path: '/reglages' };

// Sommaire par catégories, puis une page par catégorie (salon, fidelite, sauvegarde, donnees).
export const settingsRoutes = [
  { path: '/reglages', tab: 'reglages', render: renderSettingsView },
  { path: '/reglages/:section', tab: 'reglages', render: renderSettingsView },
];
