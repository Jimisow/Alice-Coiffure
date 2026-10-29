const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

// Date ISO (YYYY-MM-DD) dans le fuseau LOCAL. Ne pas utiliser
// toISOString() : il renvoie la date UTC, donc la veille entre minuit et 1h/2h
// heure de Paris.
export function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromISODate(dateISO) {
  const [year, month, day] = dateISO.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function todayISO() {
  return toISODate(new Date());
}

export function addDays(dateISO, days) {
  const date = fromISODate(dateISO);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

// Lundi de la semaine contenant la date (semaine française).
export function startOfWeek(dateISO) {
  const date = fromISODate(dateISO);
  const offset = (date.getDay() + 6) % 7;
  return addDays(dateISO, -offset);
}

export function isToday(dateISO) {
  return dateISO === todayISO();
}

export function isTomorrow(dateISO) {
  return dateISO === addDays(todayISO(), 1);
}

export function formatDateLong(dateISO) {
  const date = fromISODate(dateISO);
  return `${JOURS[date.getDay()]} ${date.getDate()} ${MOIS[date.getMonth()]}`;
}

// « 12 mars 2026 » — pour l'historique, où l'année compte.
export function formatDateFull(dateISO) {
  const date = fromISODate(dateISO);
  return `${date.getDate()} ${MOIS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatMonthYear(dateISO) {
  const date = fromISODate(dateISO);
  return `${MOIS[date.getMonth()]} ${date.getFullYear()}`;
}

export function dayInitial(dateISO) {
  return JOURS[fromISODate(dateISO).getDay()].slice(0, 3);
}

// Utilisé dans les SMS de rappel : "aujourd'hui" / "demain" / date formatée.
export function getRelativeDayLabel(dateISO) {
  if (isToday(dateISO)) return "aujourd'hui";
  if (isTomorrow(dateISO)) return 'demain';
  return `le ${formatDateLong(dateISO)}`;
}

// « aujourd'hui », « hier », « il y a 12 jours », « il y a 3 mois ».
export function formatSince(dateISO) {
  const days = Math.round((fromISODate(todayISO()) - fromISODate(dateISO)) / 86400000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return 'hier';
  if (days < 45) return `il y a ${days} jours`;
  const months = Math.round(days / 30.4);
  if (months < 12) return `il y a ${months} mois`;
  const years = Math.floor(months / 12);
  return `il y a ${years} an${years > 1 ? 's' : ''}`;
}

export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

// « jeu. 30 oct. » — pour les boutons et puces, où la place manque.
export function formatDateShort(dateISO) {
  const date = fromISODate(dateISO);
  return `${JOURS[date.getDay()].slice(0, 3)}. ${date.getDate()} ${MOIS_COURTS[date.getMonth()]}`;
}
const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export function minutesToTime(total) {
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function nowMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

// Durée tapée « à la main » par Alice → minutes (null si non reconnue) :
//   « 1 » à « 9 »          → heures           (2 → 120)
//   « 10 » et plus         → minutes          (45 → 45, 90 → 90)
//   « 2.10 », « 2,10 », « 2h10 » → heures.minutes (130)
//   un seul chiffre après le séparateur = dizaines (« 1.5 » → 1 h 50)
// Plafond 10 h, plancher 5 min.
export const DUREE_MAX = 600;

export function parseDuration(raw) {
  const text = String(raw).trim().toLowerCase().replace(/\s+/g, '').replace(/[,h]/g, '.');
  if (!text) return null;
  let minutes = null;

  if (/^\d+$/.test(text)) {
    const n = Number(text);
    minutes = n <= 9 ? n * 60 : n;
  } else {
    const match = text.match(/^(\d)\.(\d{0,2})$/);
    if (!match) return null;
    const [, h, m] = match;
    const mins = m.length === 1 ? Number(m) * 10 : Number(m || 0);
    if (mins > 59) return null;
    minutes = Number(h) * 60 + mins;
  }
  return minutes >= 5 && minutes <= DUREE_MAX ? minutes : null;
}

// Inverse pour pré-remplir le champ : 75 → « 1.15 », 45 → « 45 ».
export function durationToInput(minutes) {
  if (minutes < 10) return `0.${String(minutes).padStart(2, '0')}`; // « 5 » voudrait dire 5 h
  if (minutes < 60 || minutes >= 600) return String(minutes); // « 10.00 » ne serait pas reconnu
  return `${Math.floor(minutes / 60)}.${String(minutes % 60).padStart(2, '0')}`;
}

export function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function addMinutesToTime(time, minutes) {
  const total = timeToMinutes(time) + minutes;
  const endH = Math.floor((total % (24 * 60)) / 60);
  const endM = total % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}
