// Calcul des créneaux libres (horaires − RDV existants).
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { freeGaps, startsInGap, getDayPlan, findNextSlots, isOutsideHours } =
  await import('../js/features/appointments/availabilityService.js');
const { saveDayHours, rangesFor, DEFAULT_HORAIRES } = await import('../js/features/appointments/scheduleService.js');
const { addAppointment } = await import('../js/features/appointments/index.js');
const { createProvisionalClient } = await import('../js/features/clients/index.js');

const h = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

test('trous libres entre les RDV, dans les plages d’ouverture', () => {
  const gaps = freeGaps([[h('09:00'), h('12:00')], [h('14:00'), h('19:00')]], [[h('10:00'), h('11:30')], [h('14:00'), h('15:00')]]);
  assert.deepEqual(gaps, [[h('09:00'), h('10:00')], [h('11:30'), h('12:00')], [h('15:00'), h('19:00')]]);
});

test('heures de début au quart d’heure où la prestation tient', () => {
  assert.deepEqual(startsInGap([h('09:00'), h('10:00')], 45), [h('09:00'), h('09:15')]);
  assert.deepEqual(startsInGap([h('11:30'), h('12:00')], 45), []);
});

test('jour fermé = aucune plage ; RDV posé hors horaires détecté', async () => {
  assert.deepEqual(rangesFor('2999-01-06', DEFAULT_HORAIRES), []); // un dimanche
  assert.equal(await isOutsideHours({ date: '2999-01-06', heureDebut: '10:00', dureeMinutes: 30 }), true);
  assert.equal(await isOutsideHours({ date: '2999-01-08', heureDebut: '10:00', dureeMinutes: 30 }), false); // mardi
  assert.equal(await isOutsideHours({ date: '2999-01-08', heureDebut: '11:30', dureeMinutes: 60 }), true); // déborde sur midi
});

test('déroulé du jour et prochains créneaux tiennent compte des RDV', async () => {
  await saveDayHours('2', { ouvert: true, plages: [{ debut: '09:00', fin: '12:00' }] });
  const client = await createProvisionalClient({ prenom: 'Marie' });
  assert.equal(client.aCompleter, true);
  await addAppointment({ clientId: client.id, prestation: 'Coupe', date: '2999-01-08', heureDebut: '09:00', dureeMinutes: 120, notes: '' });

  const plan = await getDayPlan('2999-01-08', 60);
  assert.deepEqual(plan.items.map((i) => i.type), ['busy', 'free']);
  assert.deepEqual(plan.items[1].starts, ['11:00']);
  assert.equal((await getDayPlan('2999-01-08', 90)).fits, false);

  const next = await findNextSlots('2999-01-08', 60, 1);
  assert.deepEqual(next, [{ date: '2999-01-08', heure: '11:00' }]);
});

test('cliente absente : le créneau se libère et l’absence est comptée', async () => {
  const { setNoShow, getNoShowsForClient, canMarkNoShow, findOverlaps } = await import('../js/features/appointments/appointmentService.js');
  await saveDayHours('3', { ouvert: true, plages: [{ debut: '09:00', fin: '12:00' }] });
  const client = await createProvisionalClient({ prenom: 'Lou' });
  const appt = await addAppointment({ clientId: client.id, prestation: 'Coupe', date: '2999-01-09', heureDebut: '09:00', dureeMinutes: 180, notes: '' });

  assert.equal((await getDayPlan('2999-01-09', 60)).fits, false);
  assert.equal(canMarkNoShow(appt), false, 'pas avant l’heure du RDV');
  assert.equal(canMarkNoShow({ ...appt, date: '2000-01-01' }), true);

  await setNoShow(appt.id, true);
  assert.equal((await getDayPlan('2999-01-09', 60)).fits, true);
  assert.equal((await findOverlaps({ date: '2999-01-09', heureDebut: '10:00', dureeMinutes: 30 })).length, 0);
  assert.equal((await getNoShowsForClient(client.id)).length, 1);

  await setNoShow(appt.id, false);
  assert.equal((await getNoShowsForClient(client.id)).length, 0);
});
