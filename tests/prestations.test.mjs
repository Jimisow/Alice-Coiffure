// Prestations personnalisées (Réglages → Prestations).
import { test } from 'node:test';
import assert from 'node:assert/strict';

const p = await import('../js/features/appointments/prestationService.js');

test('par défaut : les modèles d’origine avec leur durée', async () => {
  const list = await p.getPrestations();
  assert.equal(list.length, p.DEFAULT_PRESTATIONS.length);
  assert.equal(await p.getDefaultDuration('coloration'), 90);
});

test('ajouter, modifier, supprimer, revenir à l’origine', async () => {
  let list = await p.addPrestation({ nom: '  Coupe enfant ', duree: 20 });
  assert.equal(list.at(-1).nom, 'Coupe enfant');
  assert.equal(await p.getDefaultDuration('Coupe enfant'), 20);

  const index = list.length - 1;
  list = await p.updatePrestation(index, { nom: 'Coupe enfant (-10 ans)', duree: 25 });
  assert.equal(list[index].duree, 25);

  list = await p.removePrestation(0);
  assert.equal((await p.getPrestationNames()).includes('Coupe'), false);

  list = await p.resetPrestations();
  assert.deepEqual(list, p.DEFAULT_PRESTATIONS);
});

test('validation : nom obligatoire, pas de doublon, durée choisie', async () => {
  const list = await p.getPrestations();
  assert.ok(p.validatePrestation({ nom: ' ', duree: 30 }, list));
  assert.ok(p.validatePrestation({ nom: 'coloration', duree: 30 }, list), 'doublon sans tenir compte des majuscules');
  assert.equal(p.validatePrestation({ nom: 'Coloration', duree: 90 }, list, list.findIndex((x) => x.nom === 'Coloration')), null);
  assert.ok(p.validatePrestation({ nom: 'Henné', duree: 0 }, list));
});
