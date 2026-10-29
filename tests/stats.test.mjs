// Statistiques du tableau de bord (horloge simulée : 15 octobre 2026).
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

mock.timers.enable({ apis: ['Date'], now: new Date(2026, 9, 15, 12, 0) });

const { createClient } = await import('../js/features/clients/clientService.js');
const loyalty = await import('../js/features/loyalty/index.js');
const { addAppointment } = await import('../js/features/appointments/index.js');
const { setNoShow } = await import('../js/features/appointments/appointmentService.js');
const { computeStats } = await import('../js/features/stats/index.js');

const blank = { nom: '', telephone: '', natureCheveux: '', notes: '' };

test('activité du mois, comparaison, prestations et points à surveiller', async () => {
  const a = await createClient({ ...blank, prenom: 'Anne', tampons: 0 });
  const b = await createClient({ ...blank, prenom: 'Berthe', tampons: 9 });
  await loyalty.addStamp(a.id, { prestation: 'Coupe', date: '2026-10-02' });
  await loyalty.addStamp(a.id, { prestation: 'Coupe', date: '2026-10-09' });
  await loyalty.addStamp(b.id, { prestation: 'Coloration', date: '2026-10-10' });
  await loyalty.addStamp(a.id, { prestation: 'Coupe', date: '2026-09-20' });
  const c = await createClient({ ...blank, prenom: 'Colette', tampons: 0 });
  await loyalty.addStamp(c.id, { prestation: 'Mise en plis', date: '2026-05-01' }); // plus revenue depuis

  const rdv = await addAppointment({ clientId: a.id, prestation: 'Coupe', date: '2026-10-01', heureDebut: '10:00', dureeMinutes: 30, notes: '' });
  await setNoShow(rdv.id, true);
  await addAppointment({ clientId: b.id, prestation: 'Coupe', date: '2026-10-18', heureDebut: '10:00', dureeMinutes: 30, notes: '' });

  const s = await computeStats();
  assert.equal(s.month.label, 'octobre');
  assert.deepEqual(s.passages, { value: 3, previous: 1 });
  assert.equal(s.clientesVenues, 2);
  assert.equal(s.nouvellesFiches, 3);
  assert.deepEqual(s.passagesByMonth.map((m) => m.value), [1, 0, 0, 0, 1, 3]);
  assert.deepEqual(s.topPrestations[0], { label: 'Coupe', value: 3 });
  assert.equal(s.watch.aOffrir, 1, 'Berthe : 9 + 1 = carte pleine');
  assert.equal(s.watch.aRelancer, 1, 'Colette');
  assert.equal(s.watch.rdvSemaine, 1);
  assert.deepEqual(s.watch.absences, { count: 1, total: 1 });
});
