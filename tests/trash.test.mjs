// Suppressions : contenu gardé (Corbeille / archive), restauration d'une fiche
// avec ses passages et rendez-vous.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { createClient, deleteClient, getDeletedClients, restoreClient, getClientById } =
  await import('../js/features/clients/clientService.js');
const loyalty = await import('../js/features/loyalty/index.js');
const { addAppointment, getUpcomingForClient } = await import('../js/features/appointments/index.js');
const { exportSnapshot, clearAll } = await import('../js/data/index.js');

const blank = { nom: 'Martin', telephone: '', natureCheveux: 'Fins', notes: 'Allergie' };

test('une fiche supprimée garde son contenu et revient avec ses passages et RDV', async () => {
  const client = await createClient({ ...blank, prenom: 'Yvette', tampons: 3 });
  await loyalty.addStamp(client.id, { prestation: 'Coupe' });
  await addAppointment({ clientId: client.id, prestation: 'Coupe', date: '2999-03-01', heureDebut: '10:00', dureeMinutes: 30, notes: '' });

  await deleteClient(client.id);
  assert.equal(await getClientById(client.id), null);
  const tomb = exportSnapshot().collections.clients[client.id];
  assert.equal(tomb.deleted, true);
  assert.equal(tomb.notes, 'Allergie', 'le contenu part dans l’archive');
  assert.ok(tomb.deletedAt);

  const trash = await getDeletedClients();
  assert.equal(trash[0].prenom, 'Yvette');

  const restored = await restoreClient(client.id);
  assert.equal(restored.prenom, 'Yvette');
  assert.equal(restored.deleted, undefined);
  assert.equal(restored.fidelite.tampons, 4);
  assert.equal((await loyalty.getVisitHistory(client.id)).length, 1);
  assert.equal((await getUpcomingForClient(client.id)).length, 1);
  assert.equal((await getDeletedClients()).some((c) => c.id === client.id), false);
});

test('« Tout effacer » met tout à la corbeille, rien n’est perdu', async () => {
  await createClient({ ...blank, prenom: 'Zoé', tampons: 0 });
  clearAll();
  const deleted = await getDeletedClients();
  assert.ok(deleted.some((c) => c.prenom === 'Zoé'));
});
