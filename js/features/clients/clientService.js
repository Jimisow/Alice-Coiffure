// Logique métier « Clientes ». La persistance est déléguée au repository
// (js/data) : ce fichier ne sait pas où vivent les données.

import { clientRepository, loadDemoData, getTrash, restoreFromTrash } from '../../data/index.js';
import { getLoyaltyRules, removeVisitsOfClient } from '../loyalty/index.js';
import { removeAppointmentsOfClient } from '../appointments/index.js';
import { normalizeText, formatPhone } from '../../shared/utils/formatUtils.js';
import { todayISO } from '../../shared/utils/dateUtils.js';

const byName = (a, b) =>
  normalizeText(`${a.prenom} ${a.nom}`).localeCompare(normalizeText(`${b.prenom} ${b.nom}`), 'fr');

export async function getClients() {
  const clients = await clientRepository.getAll();
  return [...clients].sort(byName);
}

export async function getClientById(id) {
  return clientRepository.getById(id);
}

// Recherche par prénom/nom (sans accents, dans n'importe quel ordre) ou par
// morceau de numéro de téléphone.
export async function searchClients(query) {
  const clients = await getClients();
  const words = normalizeText(query).split(/\s+/).filter(Boolean);
  if (!words.length) return clients;
  const digits = query.replace(/\D/g, '');
  return clients.filter((client) => {
    const name = normalizeText(`${client.prenom} ${client.nom}`);
    if (words.every((word) => name.includes(word))) return true;
    return digits.length >= 2 && client.telephone.replace(/\D/g, '').includes(digits);
  });
}

// Doublon probable : même numéro (chiffres) qu'une autre cliente.
export async function findByPhone(phone, exceptId = null) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 6) return null;
  const clients = await clientRepository.getAll();
  return clients.find((c) => c.id !== exceptId && c.telephone.replace(/\D/g, '') === digits) || null;
}

// Renvoie un message d'erreur par champ ({} si tout va bien).
export function validateClient(data) {
  const errors = {};
  if (!data.prenom.trim()) errors.prenom = 'Le prénom est obligatoire.';
  const digits = data.telephone.replace(/\D/g, '');
  if (data.telephone.trim() && digits.length < 10) errors.telephone = 'Numéro incomplet : il faut 10 chiffres.';
  return errors;
}

function cleanFields(data) {
  return {
    prenom: data.prenom.trim(),
    nom: data.nom.trim(),
    telephone: formatPhone(data.telephone),
    natureCheveux: data.natureCheveux.trim(),
    notes: data.notes.trim(),
  };
}

// `tampons` : tampons déjà acquis (reprise des cartes carton) ou correction.
export async function createClient(data) {
  const rules = await getLoyaltyRules();
  return clientRepository.add({
    ...cleanFields(data),
    fidelite: { tampons: Math.min(rules.objectif, Math.max(0, Number(data.tampons) || 0)), recompensesOffertes: 0 },
    creeLe: todayISO(),
    derniereVisite: null,
    // Fiche créée à la volée depuis un RDV : Alice la complètera plus tard.
    aCompleter: Boolean(data.aCompleter),
  });
}

export async function updateClient(id, data) {
  const [client, rules] = await Promise.all([clientRepository.getById(id), getLoyaltyRules()]);
  if (!client) return null;
  return clientRepository.update(id, {
    ...cleanFields(data),
    fidelite: { ...client.fidelite, tampons: Math.min(rules.objectif, Math.max(0, Number(data.tampons) || 0)) },
    aCompleter: false,
  });
}

// Fiche rapide depuis le formulaire de RDV (prénom, nom, téléphone).
export async function createProvisionalClient({ prenom, nom = '', telephone = '' }) {
  return createClient({ prenom, nom, telephone, natureCheveux: '', notes: '', tampons: 0, aCompleter: true });
}

export function isToComplete(client) {
  return Boolean(client.aCompleter);
}

export async function deleteClient(id) {
  await Promise.all([removeVisitsOfClient(id), removeAppointmentsOfClient(id)]);
  await clientRepository.remove(id);
}

// ---- Corbeille ----
// Supprimer une fiche supprime aussi ses passages et RDV (même instant) :
// restaurer la fiche les ramène avec elle.
const SAME_DELETION_MS = 2 * 60 * 1000;

export async function getDeletedClients() {
  const trash = await getTrash();
  return trash.clients
    .filter((c) => c.prenom)
    .sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
}

export async function restoreClient(clientId) {
  const trash = await getTrash();
  const client = trash.clients.find((c) => c.id === clientId);
  if (!client) return null;
  const sameTime = (doc) => doc.clientId === clientId && Math.abs((doc.deletedAt || 0) - (client.deletedAt || 0)) < SAME_DELETION_MS;
  await Promise.all([
    ...trash.visits.filter(sameTime).map((v) => restoreFromTrash('visits', v)),
    ...trash.appointments.filter(sameTime).map((a) => restoreFromTrash('appointments', a)),
  ]);
  return restoreFromTrash('clients', client);
}

// Clientes fictives pour découvrir l'app (effaçables dans Réglages).
export async function loadDemoClients() {
  await loadDemoData();
}

// Suggestions pour le champ « nature des cheveux » : ce qu'Alice a déjà saisi.
export async function getHairSuggestions() {
  const clients = await clientRepository.getAll();
  const seen = new Map();
  clients.forEach((c) => c.natureCheveux && seen.set(normalizeText(c.natureCheveux), c.natureCheveux));
  const base = ['Fins', 'Épais', 'Bouclés', 'Frisés', 'Raides', 'Colorés', 'Blancs', 'Secs'];
  return [...new Set([...base, ...seen.values()])].slice(0, 14);
}
