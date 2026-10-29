// Tests de la logique métier, sans navigateur : le store retombe sur un
// stockage en mémoire quand localStorage n'existe pas (Node).
//   npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { createClient, searchClients, deleteClient, validateClient } = await import('../js/features/clients/clientService.js');
const loyalty = await import('../js/features/loyalty/index.js');
const { addAppointment, getUpcomingForClient } = await import('../js/features/appointments/index.js');
const { exportSnapshot } = await import('../js/data/index.js');

const blank = { prenom: '', nom: '', telephone: '', natureCheveux: '', notes: '' };

test('une fiche reprend les tampons de la carte carton, plafonnés à l’objectif', async () => {
  const a = await createClient({ ...blank, prenom: 'Odette', tampons: 4 });
  const b = await createClient({ ...blank, prenom: 'Ginette', tampons: 99 });
  assert.equal(a.fidelite.tampons, 4);
  assert.equal(b.fidelite.tampons, 10);
});

test('tampon, annulation, carte pleine puis récompense', async () => {
  const client = await createClient({ ...blank, prenom: 'Lucie', tampons: 8 });
  const rules = await loyalty.getLoyaltyRules();

  const first = await loyalty.addStamp(client.id, { prestation: 'Coupe' });
  assert.equal(first.client.fidelite.tampons, 9);
  assert.ok(first.client.derniereVisite);

  const undone = await loyalty.undoStamp(client.id, first.visit.id);
  assert.equal(undone.fidelite.tampons, 8);
  assert.equal(undone.derniereVisite, null);

  await loyalty.addStamp(client.id);
  const full = await loyalty.addStamp(client.id);
  assert.ok(loyalty.loyaltyState(full.client, rules).complete);

  const refused = await loyalty.addStamp(client.id);
  assert.equal(refused.visit, null, 'pas de 11e tampon sur une carte pleine');

  const after = await loyalty.redeemReward(client.id);
  assert.equal(after.fidelite.tampons, 0);
  assert.equal(after.fidelite.recompensesOffertes, 1);
  assert.equal(loyalty.loyaltyState(after, rules).numeroCarte, 2);

  const history = await loyalty.getVisitHistory(client.id);
  assert.deepEqual(history.map((v) => v.type).sort(), ['recompense', 'tampon', 'tampon']);
});

test('−1 : retire le dernier tampon et son passage ; annulable', async () => {
  const client = await createClient({ ...blank, prenom: 'Rose', tampons: 2 }); // 2 tampons « carton », sans passage
  await loyalty.addStamp(client.id, { prestation: 'Coupe', date: '2026-01-10' });

  const first = await loyalty.removeLastStamp(client.id);
  assert.equal(first.client.fidelite.tampons, 2);
  assert.equal(first.removedVisit.prestation, 'Coupe');
  assert.equal((await loyalty.getVisitHistory(client.id)).length, 0);

  const restored = await loyalty.restoreStamp(client.id, first.removedVisit);
  assert.equal(restored.client.fidelite.tampons, 3);
  assert.equal(restored.client.derniereVisite, '2026-01-10');

  await loyalty.removeLastStamp(client.id);
  const carton = await loyalty.removeLastStamp(client.id); // tampon carton : pas de passage à retirer
  assert.equal(carton.removedVisit, null);
  assert.equal(carton.client.fidelite.tampons, 1);
  await loyalty.removeLastStamp(client.id);
  const none = await loyalty.removeLastStamp(client.id);
  assert.equal(none.client.fidelite.tampons, 0, 'jamais en dessous de zéro');
});

test('objectif réglable, borné', async () => {
  assert.equal((await loyalty.saveLoyaltyRules({ objectif: 2 })).objectif, loyalty.OBJECTIF_MIN);
  assert.equal((await loyalty.saveLoyaltyRules({ objectif: 12, recompense: '  ' })).recompense, loyalty.DEFAULT_RULES.recompense);
  await loyalty.saveLoyaltyRules({ objectif: 10 });
});

test('recherche sans accents, par mots ou par numéro', async () => {
  await createClient({ ...blank, prenom: 'Hélène', nom: 'Faure', telephone: '0778901234' });
  assert.equal((await searchClients('helene')).length, 1);
  assert.equal((await searchClients('faure hel')).length, 1);
  assert.equal((await searchClients('78 90')).length, 1);
  assert.equal((await searchClients('zzz')).length, 0);
});

test('validation : prénom obligatoire, téléphone complet', () => {
  assert.ok(validateClient({ ...blank }).prenom);
  assert.ok(validateClient({ ...blank, prenom: 'A', telephone: '06 12' }).telephone);
  assert.deepEqual(validateClient({ ...blank, prenom: 'A', telephone: '06 12 34 56 78' }), {});
});

test('supprimer une cliente efface ses passages et RDV (en pierres tombales pour la synchro)', async () => {
  const client = await createClient({ ...blank, prenom: 'Paulette', tampons: 1 });
  await loyalty.addStamp(client.id);
  await addAppointment({ clientId: client.id, prestation: 'Coupe', date: '2999-01-01', heureDebut: '10:00', dureeMinutes: 30, notes: '' });
  assert.equal((await getUpcomingForClient(client.id)).length, 1);

  await deleteClient(client.id);
  assert.equal((await getUpcomingForClient(client.id)).length, 0);
  assert.equal((await loyalty.getVisitHistory(client.id)).length, 0);
  assert.equal(exportSnapshot().collections.clients[client.id].deleted, true);
});
