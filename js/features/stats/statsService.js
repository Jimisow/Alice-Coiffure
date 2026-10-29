// Statistiques du salon, calculées à la volée depuis les données de l'app
// (rien n'est stocké). Choisies pour ce qui aide Alice à piloter :
// activité du mois, fidélité, clientes à relancer, absences.

import { clientRepository, visitRepository, appointmentRepository } from '../../data/index.js';
import { getLoyaltyRules, loyaltyState } from '../loyalty/index.js';
import { todayISO, addDays, fromISODate, toISODate } from '../../shared/utils/dateUtils.js';

const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const RELANCE_JOURS = 90;

const monthKey = (dateISO) => dateISO.slice(0, 7);

// Les N derniers mois, du plus ancien au mois en cours : [{ key: '2026-10', court, long }].
function lastMonths(count) {
  const today = fromISODate(todayISO());
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (count - 1 - i), 1);
    return { key: toISODate(d).slice(0, 7), court: MOIS_COURTS[d.getMonth()], long: MOIS[d.getMonth()] };
  });
}

export async function computeStats() {
  const [clients, visits, appointments, rules] = await Promise.all([
    clientRepository.getAll(),
    visitRepository.getAll(),
    appointmentRepository.getAll(),
    getLoyaltyRules(),
  ]);
  const today = todayISO();
  const months = lastMonths(6);
  const current = months.at(-1);
  const previous = months.at(-2);
  const stamps = visits.filter((v) => v.type === 'tampon');

  const passagesByMonth = months.map((m) => ({ ...m, value: stamps.filter((v) => monthKey(v.date) === m.key).length }));
  const thisMonth = stamps.filter((v) => monthKey(v.date) === current.key);

  // Prestations des 12 derniers mois (passages renseignés + RDV honorés).
  const since = addDays(today, -365);
  const counts = new Map();
  const count = (p) => p && counts.set(p, (counts.get(p) || 0) + 1);
  stamps.filter((v) => v.date >= since).forEach((v) => count(v.prestation));
  appointments
    .filter((a) => a.date >= since && a.date < today && a.statut !== 'absente')
    .forEach((a) => count(a.prestation));
  const topPrestations = [...counts].map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value).slice(0, 4);

  // Absences sur 3 mois, rapportées aux RDV déjà passés.
  const since90 = addDays(today, -RELANCE_JOURS);
  const pastAppts = appointments.filter((a) => (a.date >= since90 && a.date < today) || (a.date === today && a.statut));
  const noShows = pastAppts.filter((a) => a.statut === 'absente').length;

  const weekEnd = addDays(today, 6);
  const states = clients.map((c) => loyaltyState(c, rules));

  return {
    month: { label: current.long, previousLabel: previous.long },
    passages: { value: thisMonth.length, previous: passagesByMonth.at(-2).value },
    clientesVenues: new Set(thisMonth.map((v) => v.clientId)).size,
    nouvellesFiches: clients.filter((c) => c.creeLe && monthKey(c.creeLe) === current.key).length,
    recompensesMois: visits.filter((v) => v.type === 'recompense' && monthKey(v.date) === current.key).length,
    passagesByMonth,
    topPrestations,
    watch: {
      aRelancer: clients.filter((c) => c.derniereVisite && c.derniereVisite < since90).length,
      presquePleines: states.filter((s) => !s.complete && s.restant <= 2).length,
      aOffrir: states.filter((s) => s.complete).length,
      rdvSemaine: appointments.filter((a) => a.date >= today && a.date <= weekEnd && a.statut !== 'absente').length,
      absences: { count: noShows, total: pastAppts.length },
    },
    totalClientes: clients.length,
  };
}
