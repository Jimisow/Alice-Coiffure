import { telHref } from '../../shared/utils/formatUtils.js';
import { getRelativeDayLabel } from '../../shared/utils/dateUtils.js';

// Ouvre l'appli SMS du téléphone avec le message pré-rempli : Alice n'a plus
// qu'à appuyer sur Envoyer. Le « h » remplace « : » (plus naturel à l'oral).
export function buildReminderSmsLink(client, appointment) {
  const heure = appointment.heureDebut.replace(':', 'h');
  const message =
    `Bonjour ${client.prenom}, je vous rappelle votre rendez-vous chez ` +
    `Alice Coiffure ${getRelativeDayLabel(appointment.date)} à ${heure}. À très vite ! Alice`;
  return `sms:${telHref(client.telephone)}?body=${encodeURIComponent(message)}`;
}
