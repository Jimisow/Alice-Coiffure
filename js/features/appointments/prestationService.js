// Prestations du salon : nom + durée habituelle (minutes), réglables par
// Alice dans Réglages → Prestations. Tant qu'elle n'a rien modifié, ce sont
// les modèles de constants.js. Stockées dans le doc réglages :
//   prestations: [{ nom, duree }]   (ordre = ordre d'affichage)

import { settingsRepository } from '../../data/index.js';
import { PRESTATIONS, DUREE_PAR_PRESTATION } from './constants.js';
import { normalizeText } from '../../shared/utils/formatUtils.js';

export const DEFAULT_PRESTATIONS = PRESTATIONS.map((nom) => ({ nom, duree: DUREE_PAR_PRESTATION[nom] || 60 }));

export async function getPrestations() {
  const settings = await settingsRepository.get();
  const list = settings?.prestations;
  return Array.isArray(list) && list.length ? list : DEFAULT_PRESTATIONS;
}

export async function getPrestationNames() {
  return (await getPrestations()).map((p) => p.nom);
}

// Durée habituelle d'une prestation (null si inconnue).
export async function getDefaultDuration(nom) {
  const found = (await getPrestations()).find((p) => normalizeText(p.nom) === normalizeText(nom));
  return found ? found.duree : null;
}

async function save(list) {
  await settingsRepository.update({ prestations: list });
  return list;
}

// Renvoie un message d'erreur, ou null si la prestation est valide.
export function validatePrestation({ nom, duree }, list, exceptIndex = -1) {
  const name = nom.trim();
  if (!name) return 'Donnez un nom à la prestation.';
  if (!(duree >= 5)) return 'Choisissez une durée.';
  const twin = list.findIndex((p, i) => i !== exceptIndex && normalizeText(p.nom) === normalizeText(name));
  if (twin >= 0) return 'Cette prestation existe déjà.';
  return null;
}

export async function addPrestation({ nom, duree }) {
  const list = await getPrestations();
  return save([...list, { nom: nom.trim(), duree }]);
}

export async function updatePrestation(index, { nom, duree }) {
  const list = await getPrestations();
  return save(list.map((p, i) => (i === index ? { nom: nom.trim(), duree } : p)));
}

export async function removePrestation(index) {
  const list = await getPrestations();
  return save(list.filter((_, i) => i !== index));
}

export async function resetPrestations() {
  return save(DEFAULT_PRESTATIONS);
}
