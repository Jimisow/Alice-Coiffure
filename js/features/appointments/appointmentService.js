// Logique métier « Rendez-vous ». La persistance est déléguée au repository
// (js/data) : ce fichier ne sait pas où vivent les données.

import { appointmentRepository } from '../../data/index.js';
import { todayISO, timeToMinutes, addDays } from '../../shared/utils/dateUtils.js';

const byTime = (a, b) => a.date.localeCompare(b.date) || a.heureDebut.localeCompare(b.heureDebut);

// Rendez-vous d'un jour donné, triés par heure de début.
export async function getAppointmentsByDate(dateISO) {
  const appointments = await appointmentRepository.getByDate(dateISO);
  return [...appointments].sort(byTime);
}

export async function getAppointmentById(id) {
  return appointmentRepository.getById(id);
}

// Nombre de RDV par jour sur une plage (points de la bande « semaine »).
export async function countAppointmentsBetween(fromISO, days) {
  const all = await appointmentRepository.getAll();
  const to = addDays(fromISO, days - 1);
  const counts = {};
  all.filter((a) => a.date >= fromISO && a.date <= to).forEach((a) => {
    counts[a.date] = (counts[a.date] || 0) + 1;
  });
  return counts;
}

export async function getUpcomingForClient(clientId) {
  const today = todayISO();
  const appointments = await appointmentRepository.getByClient(clientId);
  return appointments.filter((a) => a.date >= today && !isNoShow(a)).sort(byTime);
}

// « Absente » : la cliente n'est pas venue et n'a pas prévenu.
export function isNoShow(appointment) {
  return appointment.statut === 'absente';
}

// On ne peut constater une absence qu'une fois l'heure du RDV arrivée.
export function canMarkNoShow(appointment) {
  const today = todayISO();
  if (appointment.date !== today) return appointment.date < today;
  const now = new Date();
  return timeToMinutes(appointment.heureDebut) <= now.getHours() * 60 + now.getMinutes();
}

// RDV passé : jour antérieur, ou heure de fin dépassée aujourd'hui.
export function hasEnded(appointment) {
  const today = todayISO();
  if (appointment.date !== today) return appointment.date < today;
  const now = new Date();
  return timeToMinutes(appointment.heureDebut) + appointment.dureeMinutes <= now.getHours() * 60 + now.getMinutes();
}

// Catégorie d'affichage dans l'agenda : à venir / en cours, terminé, absente.
export function agendaCategory(appointment) {
  if (isNoShow(appointment)) return 'absentes';
  if (isInProgress(appointment)) return 'actifs';
  if (appointment.statut === 'termine' || hasEnded(appointment)) return 'termines';
  return 'actifs';
}

// RDV en cours maintenant (commencé, ni absente ni terminé). Une fois la fin
// avancée (« Je finis bientôt »), il reste en cours même si Alice déborde un
// peu : c'est « Terminé » qui le clôt.
export function isInProgress(appointment) {
  if (appointment.date !== todayISO() || appointment.statut) return false;
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const start = timeToMinutes(appointment.heureDebut);
  return start <= minutes && (minutes < start + appointment.dureeMinutes || Boolean(appointment.finAvancee));
}

function nowInMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

// « Je finis bientôt » : avance la fin prévue du RDV en cours à `endTime`
// ('HH:MM'), ce qui libère la suite du créneau pour placer quelqu'un.
// La durée d'origine est gardée dans `dureePrevue`.
export async function setEndSoon(id, endTime) {
  const appointment = await appointmentRepository.getById(id);
  if (!appointment) return null;
  const start = timeToMinutes(appointment.heureDebut);
  const end = timeToMinutes(endTime);
  if (end <= start) return null;
  return appointmentRepository.update(id, {
    dureePrevue: appointment.dureePrevue || appointment.dureeMinutes,
    dureeMinutes: end - start,
    finAvancee: true,
  });
}

// Heure de fin « dans N minutes », arrondie aux 5 minutes supérieures.
export function endTimeIn(minutes) {
  const end = Math.ceil((nowInMinutes() + minutes) / 5) * 5;
  return `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
}

// « Terminé » : la durée devient la durée réelle (bornée à la durée prévue
// d'origine), ce qui libère la fin du créneau pour une cliente sans rendez-vous.
export async function finishNow(id) {
  const appointment = await appointmentRepository.getById(id);
  if (!appointment) return null;
  const elapsed = nowInMinutes() - timeToMinutes(appointment.heureDebut);
  const prevue = appointment.dureePrevue || appointment.dureeMinutes;
  return appointmentRepository.update(id, {
    statut: 'termine',
    dureePrevue: prevue,
    dureeMinutes: Math.max(5, Math.min(elapsed, prevue)),
    finAvancee: false,
  });
}

export async function setNoShow(id, absent) {
  return appointmentRepository.update(id, { statut: absent ? 'absente' : null });
}

// Absences d'une cliente, la plus récente d'abord.
export async function getNoShowsForClient(clientId) {
  const appointments = await appointmentRepository.getByClient(clientId);
  return appointments.filter(isNoShow).sort((a, b) => b.date.localeCompare(a.date) || b.heureDebut.localeCompare(a.heureDebut));
}

// RDV du même jour qui chevauchent le créneau demandé (hors RDV `exceptId`).
// Un RDV marqué « absente » ne bloque plus le créneau.
export async function findOverlaps({ date, heureDebut, dureeMinutes }, exceptId = null) {
  const start = timeToMinutes(heureDebut);
  const end = start + dureeMinutes;
  const sameDay = await appointmentRepository.getByDate(date);
  return sameDay.filter((a) => {
    if (a.id === exceptId || isNoShow(a)) return false;
    const aStart = timeToMinutes(a.heureDebut);
    return aStart < end && start < aStart + a.dureeMinutes;
  });
}

export async function addAppointment(appointment) {
  return appointmentRepository.add(appointment);
}

export async function updateAppointment(id, patch) {
  return appointmentRepository.update(id, patch);
}

export async function deleteAppointment(id) {
  return appointmentRepository.remove(id);
}

export async function removeAppointmentsOfClient(clientId) {
  const appointments = await appointmentRepository.getByClient(clientId);
  await Promise.all(appointments.map((a) => appointmentRepository.remove(a.id)));
}
