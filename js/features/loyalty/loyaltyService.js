// Logique métier « Fidélité » : la carte à tampons du salon, en numérique.
// Règle : 1 tampon par passage ; carte pleine (objectif, 10 par défaut) =
// récompense ; une fois la récompense offerte, la carte repart à zéro.
//
// Le compteur vit sur la cliente (`client.fidelite.tampons`) pour un
// affichage instantané ; chaque tampon/récompense est AUSSI journalisé comme
// passage (`visits`) pour l'historique et pour pouvoir annuler une erreur.

import { clientRepository, visitRepository, settingsRepository } from '../../data/index.js';
import { todayISO } from '../../shared/utils/dateUtils.js';

export const DEFAULT_RULES = { objectif: 10, recompense: 'Une prestation offerte' };
export const OBJECTIF_MIN = 4;
export const OBJECTIF_MAX = 20;

export async function getLoyaltyRules() {
  const settings = await settingsRepository.get();
  return { ...DEFAULT_RULES, ...settings?.fidelite };
}

export async function saveLoyaltyRules({ objectif, recompense }) {
  const current = await getLoyaltyRules();
  const next = {
    objectif: clampObjectif(objectif ?? current.objectif),
    recompense: (recompense ?? current.recompense).trim() || DEFAULT_RULES.recompense,
  };
  await settingsRepository.update({ fidelite: next });
  return next;
}

export function clampObjectif(value) {
  const n = Math.round(Number(value)) || DEFAULT_RULES.objectif;
  return Math.min(OBJECTIF_MAX, Math.max(OBJECTIF_MIN, n));
}

// État lisible de la carte d'une cliente, selon les règles du salon.
export function loyaltyState(client, rules) {
  const tampons = Math.min(client.fidelite?.tampons || 0, rules.objectif);
  return {
    tampons,
    objectif: rules.objectif,
    restant: rules.objectif - tampons,
    complete: tampons >= rules.objectif,
    numeroCarte: (client.fidelite?.recompensesOffertes || 0) + 1,
  };
}

export function isRewardDue(client, rules) {
  return loyaltyState(client, rules).complete;
}

async function latestVisitDate(clientId) {
  const visits = await visitRepository.getByClient(clientId);
  return visits.reduce((max, visit) => (visit.date > (max || '') ? visit.date : max), null);
}

// Ajoute un tampon (un passage). Refusé si la carte est déjà pleine : il faut
// d'abord offrir la récompense. Renvoie { client, visit } pour permettre
// l'annulation immédiate.
export async function addStamp(clientId, { prestation = '', date = todayISO() } = {}) {
  const [client, rules] = await Promise.all([clientRepository.getById(clientId), getLoyaltyRules()]);
  if (!client || loyaltyState(client, rules).complete) return { client, visit: null };

  const visit = await visitRepository.add({ clientId, type: 'tampon', date, prestation });
  const updated = await clientRepository.update(clientId, {
    fidelite: { ...client.fidelite, tampons: loyaltyState(client, rules).tampons + 1 },
    derniereVisite: !client.derniereVisite || date > client.derniereVisite ? date : client.derniereVisite,
  });
  return { client: updated, visit };
}

export async function undoStamp(clientId, visitId) {
  const client = await clientRepository.getById(clientId);
  if (!client) return null;
  await visitRepository.remove(visitId);
  return clientRepository.update(clientId, {
    fidelite: { ...client.fidelite, tampons: Math.max(0, (client.fidelite?.tampons || 0) - 1) },
    derniereVisite: await latestVisitDate(clientId),
  });
}

// Correction manuelle « −1 » : retire un tampon et, s'il existe, le dernier
// passage journalisé (les tampons repris d'une carte carton n'en ont pas).
// Renvoie { client, removedVisit } pour permettre l'annulation.
export async function removeLastStamp(clientId) {
  const client = await clientRepository.getById(clientId);
  if (!client || !(client.fidelite?.tampons > 0)) return { client, removedVisit: null };
  const lastStamp = (await getVisitHistory(clientId)).find((v) => v.type === 'tampon') || null;
  if (lastStamp) await visitRepository.remove(lastStamp.id);
  const updated = await clientRepository.update(clientId, {
    fidelite: { ...client.fidelite, tampons: client.fidelite.tampons - 1 },
    derniereVisite: await latestVisitDate(clientId),
  });
  return { client: updated, removedVisit: lastStamp };
}

// Annule un « −1 » : remet le tampon (et son passage d'origine s'il y en avait un).
export async function restoreStamp(clientId, removedVisit) {
  if (removedVisit) return addStamp(clientId, { prestation: removedVisit.prestation, date: removedVisit.date });
  const [client, rules] = await Promise.all([clientRepository.getById(clientId), getLoyaltyRules()]);
  if (!client) return { client: null, visit: null };
  const tampons = Math.min(rules.objectif, (client.fidelite?.tampons || 0) + 1);
  return { client: await clientRepository.update(clientId, { fidelite: { ...client.fidelite, tampons } }), visit: null };
}

// Offre la récompense : la carte repart à zéro et le cadeau est journalisé.
export async function redeemReward(clientId) {
  const [client, rules] = await Promise.all([clientRepository.getById(clientId), getLoyaltyRules()]);
  if (!client || !loyaltyState(client, rules).complete) return null;

  await visitRepository.add({ clientId, type: 'recompense', date: todayISO(), prestation: rules.recompense });
  return clientRepository.update(clientId, {
    fidelite: {
      tampons: 0,
      recompensesOffertes: (client.fidelite?.recompensesOffertes || 0) + 1,
    },
  });
}

// Historique des passages, du plus récent au plus ancien.
export async function getVisitHistory(clientId) {
  const visits = await visitRepository.getByClient(clientId);
  return [...visits].sort((a, b) => b.date.localeCompare(a.date) || (b.updatedAt || 0) - (a.updatedAt || 0));
}

export async function removeVisitsOfClient(clientId) {
  const visits = await visitRepository.getByClient(clientId);
  await Promise.all(visits.map((visit) => visitRepository.remove(visit.id)));
}
