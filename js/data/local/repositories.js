// Repositories du backend local. Contrat (à respecter à l'identique par tout
// autre backend) — tout est async et ne renvoie que des objets simples :
//
//   clientRepository       getAll() · getById(id) · add(data) · update(id, patch) · remove(id)
//   appointmentRepository  idem + getByDate(iso) · getByClient(clientId)
//   visitRepository        idem + getByClient(clientId)
//   settingsRepository     get() · update(patch)
//
// `add` attribue l'id ; `update` fait une fusion superficielle et renvoie le
// document à jour (ou null) ; `remove` ne renvoie rien. Aucune logique métier
// ici (tri, règles de fidélité…) : elle vit dans les services des features.

import { readAll, readOne, write, remove } from './store.js';
import { generateId } from '../../shared/utils/idGenerator.js';

function createRepository(collection, idPrefix) {
  return {
    async getAll() {
      return readAll(collection);
    },
    async getById(id) {
      return readOne(collection, id);
    },
    async add(data) {
      return write(collection, { ...data, id: generateId(idPrefix) });
    },
    async update(id, patch) {
      const current = readOne(collection, id);
      if (!current) return null;
      return write(collection, { ...current, ...patch, id });
    },
    async remove(id) {
      remove(collection, id);
    },
  };
}

export const clientRepository = createRepository('clients', 'cli');

export const appointmentRepository = {
  ...createRepository('appointments', 'rdv'),
  async getByDate(dateISO) {
    return readAll('appointments').filter((appt) => appt.date === dateISO);
  },
  async getByClient(clientId) {
    return readAll('appointments').filter((appt) => appt.clientId === clientId);
  },
};

export const visitRepository = {
  ...createRepository('visits', 'pas'),
  async getByClient(clientId) {
    return readAll('visits').filter((visit) => visit.clientId === clientId);
  },
};

const SETTINGS_ID = 'salon';

export const settingsRepository = {
  async get() {
    return readOne('settings', SETTINGS_ID);
  },
  async update(patch) {
    const current = readOne('settings', SETTINGS_ID) || { id: SETTINGS_ID };
    return write('settings', { ...current, ...patch, id: SETTINGS_ID });
  },
};
