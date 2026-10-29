// Fin anticipée d'un RDV et « Libre maintenant » (horloge simulée).
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

// Mardi 15 janvier 2999, 10 h 30 (horaires par défaut : 9h-12h / 14h-19h).
mock.timers.enable({ apis: ['Date'], now: new Date(2999, 0, 15, 10, 30) });

const { addAppointment } = await import('../js/features/appointments/index.js');
const { finishNow, isInProgress, setEndSoon, endTimeIn, agendaCategory, findOverlaps } =
  await import('../js/features/appointments/appointmentService.js');
const { getFreeNow } = await import('../js/features/appointments/availabilityService.js');
const { createProvisionalClient } = await import('../js/features/clients/index.js');

test('RDV en cours → Terminé libère la fin du créneau', async () => {
  const client = await createProvisionalClient({ prenom: 'Odile' });
  const appt = await addAppointment({ clientId: client.id, prestation: 'Coloration', date: '2999-01-15', heureDebut: '10:00', dureeMinutes: 90, notes: '' });

  assert.equal(isInProgress(appt), true);
  assert.equal(await getFreeNow(), null, 'occupée jusqu’à 11h30');

  const done = await finishNow(appt.id);
  assert.equal(done.statut, 'termine');
  assert.equal(done.dureeMinutes, 30);
  assert.equal(done.dureePrevue, 90);
  assert.equal(isInProgress(done), false);

  assert.deepEqual(await getFreeNow(), { from: '10:30', until: '12:00', minutes: 90 });

  await addAppointment({ clientId: client.id, prestation: 'Coupe', date: '2999-01-15', heureDebut: '11:30', dureeMinutes: 30, notes: '' });
  assert.deepEqual(await getFreeNow(), { from: '10:30', until: '11:30', minutes: 60 });
});

test('« Je finis bientôt » : fin avancée, créneau libéré, reste en cours si elle déborde', async () => {
  const client = await createProvisionalClient({ prenom: 'Gisèle' });
  const appt = await addAppointment({ clientId: client.id, prestation: 'Balayage', date: '2999-01-15', heureDebut: '14:00', dureeMinutes: 150, notes: '' });
  mock.timers.setTime(new Date(2999, 0, 15, 15, 2).getTime());

  assert.equal(endTimeIn(15), '15:20', 'arrondi aux 5 minutes');
  const soon = await setEndSoon(appt.id, endTimeIn(15));
  assert.equal(soon.dureeMinutes, 80);
  assert.equal(soon.dureePrevue, 150);
  assert.equal(await setEndSoon(appt.id, '13:00'), null, 'pas avant le début');

  // La personne au téléphone peut être placée à 15h20 sans chevauchement.
  assert.equal((await findOverlaps({ date: '2999-01-15', heureDebut: '15:20', dureeMinutes: 45 })).length, 0);

  // 15h30 : Alice déborde → toujours « en cours », pas « libre maintenant ».
  mock.timers.setTime(new Date(2999, 0, 15, 15, 30).getTime());
  const late = { ...soon };
  assert.equal(isInProgress(late), true);
  assert.equal(agendaCategory(late), 'actifs');
  assert.equal(await getFreeNow(), null);

  const done = await finishNow(appt.id);
  assert.equal(done.dureeMinutes, 90, 'durée réelle');
  assert.equal(done.finAvancee, false);
});
