// Saisie libre de la durée d'un RDV.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { parseDuration, durationToInput } = await import('../js/shared/utils/dateUtils.js');

test('1 à 9 = heures, 10 et plus = minutes', () => {
  assert.equal(parseDuration('1'), 60);
  assert.equal(parseDuration('9'), 540);
  assert.equal(parseDuration('10'), 10);
  assert.equal(parseDuration('45'), 45);
  assert.equal(parseDuration('90'), 90);
});

test('heures.minutes, avec point, virgule ou h', () => {
  assert.equal(parseDuration('2.10'), 130);
  assert.equal(parseDuration('4.35'), 275);
  assert.equal(parseDuration('2,10'), 130);
  assert.equal(parseDuration('2h10'), 130);
  assert.equal(parseDuration('2h'), 120);
  assert.equal(parseDuration(' 1 h 30 '), 90);
  assert.equal(parseDuration('0.45'), 45);
});

test('un seul chiffre après le séparateur = dizaines de minutes', () => {
  assert.equal(parseDuration('1.5'), 110);
  assert.equal(parseDuration('1.3'), 90);
});

test('valeurs non reconnues', () => {
  ['', '0', '2.75', '12.30', 'abc', '700', '1.2.3', '3'.repeat(4)].forEach((v) =>
    assert.equal(parseDuration(v), null, `« ${v} » devrait être refusé`));
});

test('pré-remplissage : l’inverse redonne la même durée', () => {
  [5, 15, 45, 75, 130, 600].forEach((m) => assert.equal(parseDuration(durationToInput(m)), m));
});
