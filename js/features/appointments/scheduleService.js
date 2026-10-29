// Jours et horaires de travail d'Alice (Réglages). Servent à proposer des
// créneaux libres et à signaler un RDV posé hors horaires.
//
// Stockés dans le doc réglages : horaires = { '0'..'6': { ouvert, plages: [{ debut, fin }] } }
// (clé = getDay() : '0' dimanche). Objets et non tableaux imbriqués : Firestore
// refuse les tableaux de tableaux.

import { settingsRepository } from '../../data/index.js';
import { fromISODate, timeToMinutes } from '../../shared/utils/dateUtils.js';

const JOURNEE = [{ debut: '09:00', fin: '12:00' }, { debut: '14:00', fin: '19:00' }];

// Hypothèse de départ (classique en salon) : mardi → samedi, coupure le midi.
export const DEFAULT_HORAIRES = {
  0: { ouvert: false, plages: [] },
  1: { ouvert: false, plages: [] },
  2: { ouvert: true, plages: JOURNEE },
  3: { ouvert: true, plages: JOURNEE },
  4: { ouvert: true, plages: JOURNEE },
  5: { ouvert: true, plages: JOURNEE },
  6: { ouvert: true, plages: [{ debut: '09:00', fin: '17:00' }] },
};

// Lundi en premier, comme dans un agenda français.
export const ORDRE_JOURS = ['1', '2', '3', '4', '5', '6', '0'];

export async function getOpeningHours() {
  const settings = await settingsRepository.get();
  return { ...DEFAULT_HORAIRES, ...settings?.horaires };
}

// Plages valides (début < fin), triées, sans chevauchement.
function cleanPlages(plages = []) {
  return plages
    .filter((p) => p.debut && p.fin && timeToMinutes(p.debut) < timeToMinutes(p.fin))
    .sort((a, b) => a.debut.localeCompare(b.debut));
}

export async function saveDayHours(day, { ouvert, plages }) {
  const horaires = await getOpeningHours();
  const next = { ...horaires, [day]: { ouvert: Boolean(ouvert), plages: cleanPlages(plages) } };
  await settingsRepository.update({ horaires: next });
  return next;
}

export async function copyDayToOpenDays(day) {
  const horaires = await getOpeningHours();
  const source = horaires[day];
  const next = Object.fromEntries(Object.entries(horaires).map(([d, h]) => [d, h.ouvert ? { ...h, plages: source.plages } : h]));
  await settingsRepository.update({ horaires: next });
  return next;
}

// Plages d'un jour donné en minutes : [[540, 720], [840, 1140]] ; [] si fermé.
export function rangesFor(dateISO, horaires) {
  const day = horaires[String(fromISODate(dateISO).getDay())];
  if (!day?.ouvert) return [];
  return cleanPlages(day.plages).map((p) => [timeToMinutes(p.debut), timeToMinutes(p.fin)]);
}

// Résumé des jours travaillés pour Réglages : « Mardi → samedi » si les jours
// se suivent, sinon « lun., mer., ven. ».
export async function describeOpeningDays() {
  const NOMS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const horaires = await getOpeningHours();
  const open = ORDRE_JOURS.filter((d) => horaires[d].ouvert);
  if (!open.length) return 'Aucun jour travaillé';
  const indexes = open.map((d) => ORDRE_JOURS.indexOf(d));
  const contiguous = indexes.every((idx, i) => i === 0 || idx === indexes[i - 1] + 1);
  if (open.length > 2 && contiguous) {
    const first = NOMS[open[0]];
    return `${first.charAt(0).toUpperCase()}${first.slice(1)} → ${NOMS[open.at(-1)]}`;
  }
  const list = open.map((d) => `${NOMS[d].slice(0, 3)}.`).join(', ');
  return list.charAt(0).toUpperCase() + list.slice(1);
}

export function formatPlages(day) {
  if (!day.ouvert || !day.plages.length) return 'Fermé';
  return day.plages.map((p) => `${p.debut.replace(':', 'h')}–${p.fin.replace(':', 'h')}`).join(' · ');
}
