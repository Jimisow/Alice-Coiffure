// Registre des écrans. C'est LE fichier à modifier pour brancher une feature :
//   1. la feature exporte depuis son index.js un onglet ({ id, label, icon, path })
//      et/ou des routes ({ path, tab, render(container, ctx) }),
//   2. on les ajoute ici.
// Ordre des routes : le premier motif qui correspond gagne (« /clientes/nouvelle »
// doit donc précéder « /clientes/:id »). La première route est l'écran d'accueil.

import { clientsTab, clientRoutes } from '../features/clients/index.js';
import { agendaTab, appointmentRoutes } from '../features/appointments/index.js';
import { settingsTab, settingsRoutes } from '../features/settings/index.js';

export const tabs = [clientsTab, agendaTab, settingsTab];

export const routes = [...clientRoutes, ...appointmentRoutes, ...settingsRoutes];
