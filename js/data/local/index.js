import { write } from './store.js';
import { createDemoData } from '../demoData.js';

export {
  clientRepository,
  appointmentRepository,
  visitRepository,
  settingsRepository,
} from './repositories.js';

export { exportSnapshot, importSnapshot, clearAll } from './store.js';

// Ajoute les clientes fictives (ids fixes « demo-… » : recharger la démo
// écrase la précédente au lieu de la dupliquer).
export async function loadDemoData() {
  const { clients, visits, appointments } = createDemoData();
  clients.forEach((doc) => write('clients', doc));
  visits.forEach((doc) => write('visits', doc));
  appointments.forEach((doc) => write('appointments', doc));
}
