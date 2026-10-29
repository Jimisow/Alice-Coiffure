// API publique de la feature « appointments » (agenda, rendez-vous, horaires).

import { icons } from '../../shared/ui/icons.js';
import { renderAgendaView } from './agendaView.js';
import { renderAppointmentFormView } from './appointmentFormView.js';

export {
  getAppointmentsByDate, getUpcomingForClient, addAppointment, removeAppointmentsOfClient, getNoShowsForClient,
} from './appointmentService.js';
export { PRESTATIONS } from './constants.js';
export { renderOpeningHoursEditor } from './openingHoursEditor.js';
export { describeOpeningDays } from './scheduleService.js';

export const agendaTab = { id: 'agenda', label: 'Agenda', icon: icons.calendar, path: '/agenda' };

export const appointmentRoutes = [
  { path: '/agenda', tab: 'agenda', render: renderAgendaView },
  { path: '/agenda/nouveau', tab: 'agenda', render: renderAppointmentFormView },
  { path: '/agenda/:id/modifier', tab: 'agenda', render: renderAppointmentFormView },
];
