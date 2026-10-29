// Disponibilités : où peut-on placer un RDV de N minutes ?
// Horaires de travail − RDV existants = trous libres ; dans chaque trou, on
// propose des heures de début tous les quarts d'heure où la prestation tient.

import { appointmentRepository } from '../../data/index.js';
import { getClientById } from '../clients/index.js';
import { getOpeningHours, rangesFor } from './scheduleService.js';
import {
  todayISO, addDays, timeToMinutes, minutesToTime, nowMinutes, toISODate,
} from '../../shared/utils/dateUtils.js';

const STEP = 15;
const SEARCH_DAYS = 60;

// Trous libres dans les plages d'ouverture : [[début, fin], …] en minutes.
export function freeGaps(ranges, busy) {
  const sorted = [...busy].sort((a, b) => a[0] - b[0]);
  const gaps = [];
  ranges.forEach(([rangeStart, rangeEnd]) => {
    let cursor = rangeStart;
    sorted.forEach(([start, end]) => {
      if (end <= cursor || start >= rangeEnd) return;
      if (start > cursor) gaps.push([cursor, start]);
      cursor = Math.max(cursor, end);
    });
    if (cursor < rangeEnd) gaps.push([cursor, rangeEnd]);
  });
  return gaps;
}

export function startsInGap([gapStart, gapEnd], duree, notBefore = 0) {
  const starts = [];
  const first = Math.ceil(Math.max(gapStart, notBefore) / STEP) * STEP;
  for (let t = first; t + duree <= gapEnd; t += STEP) starts.push(t);
  return starts;
}

// Calcul pur d'une journée (réutilisé par le mois et la recherche).
function computeDay(dateISO, horaires, dayAppointments, duree, exceptId) {
  const today = todayISO();
  const ranges = rangesFor(dateISO, horaires);
  // Une cliente absente libère son créneau.
  const busy = dayAppointments
    .filter((a) => a.id !== exceptId && a.statut !== 'absente')
    .map((a) => [timeToMinutes(a.heureDebut), timeToMinutes(a.heureDebut) + a.dureeMinutes, a]);
  const past = dateISO < today;
  const notBefore = dateISO === today ? nowMinutes() : 0;
  const gaps = past ? [] : freeGaps(ranges, busy).map((gap) => ({ gap, starts: startsInGap(gap, duree, notBefore) }));
  return {
    date: dateISO,
    past,
    closed: !ranges.length,
    busy: busy.sort((a, b) => a[0] - b[0]),
    gaps,
    fits: gaps.some((g) => g.starts.length > 0),
  };
}

function groupByDate(appointments) {
  const byDate = {};
  appointments.forEach((a) => (byDate[a.date] ||= []).push(a));
  return byDate;
}

// Vue d'un mois pour le calendrier : { 'YYYY-MM-DD': { closed, past, fits, count } }.
export async function getMonthOverview(year, month, duree, exceptId = null) {
  const [horaires, all] = await Promise.all([getOpeningHours(), appointmentRepository.getAll()]);
  const byDate = groupByDate(all);
  const days = new Date(year, month + 1, 0).getDate();
  const overview = {};
  for (let d = 1; d <= days; d += 1) {
    const date = toISODate(new Date(year, month, d));
    const day = computeDay(date, horaires, byDate[date] || [], duree, exceptId);
    overview[date] = {
      closed: day.closed,
      past: day.past,
      fits: day.fits,
      count: (byDate[date] || []).filter((a) => a.id !== exceptId).length,
    };
  }
  return overview;
}

// Déroulé d'une journée : RDV occupés et trous libres (avec heures proposées), dans l'ordre.
export async function getDayPlan(dateISO, duree, exceptId = null) {
  const [horaires, appointments] = await Promise.all([getOpeningHours(), appointmentRepository.getByDate(dateISO)]);
  const day = computeDay(dateISO, horaires, appointments, duree, exceptId);
  const busyItems = await Promise.all(day.busy.map(async ([start, end, appt]) => ({
    type: 'busy', start, end, appointment: appt, client: await getClientById(appt.clientId),
  })));
  const freeItems = day.gaps.map(({ gap: [start, end], starts }) => ({
    type: 'free', start, end, starts: starts.map(minutesToTime),
  }));
  return {
    ...day,
    items: [...busyItems, ...freeItems].sort((a, b) => a.start - b.start),
  };
}

// Premiers créneaux libres à partir d'une date : le début de chaque trou où
// la prestation tient (au plus 2 par jour, pour proposer des jours variés).
export async function findNextSlots(fromISO, duree, count = 4, exceptId = null) {
  const [horaires, all] = await Promise.all([getOpeningHours(), appointmentRepository.getAll()]);
  const byDate = groupByDate(all);
  const start = fromISO < todayISO() ? todayISO() : fromISO;
  const slots = [];
  for (let i = 0; i < SEARCH_DAYS && slots.length < count; i += 1) {
    const date = addDays(start, i);
    const day = computeDay(date, horaires, byDate[date] || [], duree, exceptId);
    day.gaps.filter((g) => g.starts.length).slice(0, 2).forEach((g) => {
      if (slots.length < count) slots.push({ date, heure: minutesToTime(g.starts[0]) });
    });
  }
  return slots;
}

// « Libre maintenant » : Alice a fini plus tôt (ou n'a personne) et pourrait
// prendre une cliente sans rendez-vous. Renvoie { from, until, minutes }
// (heures 'HH:MM') ou null si elle est occupée, hors horaires, ou si le
// trou fait moins de 15 min.
export async function getFreeNow() {
  const today = todayISO();
  const [horaires, appointments] = await Promise.all([getOpeningHours(), appointmentRepository.getByDate(today)]);
  const from = Math.ceil(nowMinutes() / 5) * 5;
  const range = rangesFor(today, horaires).find(([s, e]) => from >= s && from < e);
  if (!range) return null;
  // Fin avancée mais pas encore « Terminé » : Alice y est toujours, même si elle déborde.
  const busy = appointments
    .filter((a) => a.statut !== 'absente')
    .map((a) => {
      const start = timeToMinutes(a.heureDebut);
      const end = start + a.dureeMinutes;
      return [start, a.finAvancee && !a.statut && start <= from ? Math.max(end, from + 1) : end];
    });
  if (busy.some(([s, e]) => s <= from && from < e)) return null;
  const nextStart = busy.map(([s]) => s).filter((s) => s > from).sort((a, b) => a - b)[0];
  const until = Math.min(nextStart ?? range[1], range[1]);
  if (until - from < 15) return null;
  return { from: minutesToTime(from), until: minutesToTime(until), minutes: until - from };
}

// Le créneau demandé sort-il des horaires de travail ?
export async function isOutsideHours({ date, heureDebut, dureeMinutes }) {
  const ranges = rangesFor(date, await getOpeningHours());
  const start = timeToMinutes(heureDebut);
  return !ranges.some(([s, e]) => start >= s && start + dureeMinutes <= e);
}
