// API publique de la feature « clients ». Les autres features n'importent
// QUE depuis ce fichier, jamais depuis ses vues/composants internes.

import { icons } from '../../shared/ui/icons.js';
import { renderClientsView } from './clientsView.js';
import { renderClientDetailView } from './clientDetailView.js';
import { renderClientFormView } from './clientFormView.js';

export {
  getClients, getClientById, searchClients, findByPhone, validateClient, createProvisionalClient,
  getDeletedClients, restoreClient,
} from './clientService.js';

export const clientsTab = { id: 'clientes', label: 'Clientes', icon: icons.users, path: '/clientes' };

export const clientRoutes = [
  { path: '/clientes', tab: 'clientes', render: renderClientsView },
  { path: '/clientes/nouvelle', tab: 'clientes', render: renderClientFormView },
  { path: '/clientes/:id', tab: 'clientes', render: (container, ctx) => renderClientDetailView(container, ctx) },
  { path: '/clientes/:id/modifier', tab: 'clientes', render: renderClientFormView },
];
