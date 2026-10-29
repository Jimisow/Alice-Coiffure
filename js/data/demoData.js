// Clientes FICTIVES pour découvrir l'app (Réglages → « Charger la démo »).
// Ne jamais les charger automatiquement : l'app sert à de vraies clientes.
// Les dates sont calculées relativement à aujourd'hui pour rester crédibles.

import { addDays, todayISO } from '../shared/utils/dateUtils.js';

export function createDemoData() {
  const today = todayISO();
  const ago = (days) => addDays(today, -days);

  const clients = [
    ['Camille', 'Rousseau', '06 12 34 56 78', 'Épais, bouclés', "Allergie à l'ammoniaque : colorations végétales uniquement. Aime le balayage miel.", 4, 1, 420],
    ['Sophie', 'Lambert', '06 23 45 67 89', 'Fins, colorés', 'Racines toutes les 5 semaines, ton 6.3. Cuir chevelu sensible, eau tiède.', 9, 2, 900],
    ['Nadia', 'Benali', '07 34 56 78 90', 'Frisés, secs', 'Soin hydratant avant la coupe. Coupes courtes et structurées.', 2, 0, 120],
    ['Émilie', 'Petit', '06 45 67 89 01', 'Fins, plats', 'Cliente fidèle depuis 3 ans. Préfère les rendez-vous en fin de journée.', 10, 3, 1100],
    ['Monique', 'Garnier', '06 56 78 90 12', 'Blancs, fins', 'Mise en plis chaque vendredi. Rinçage argenté. Vient avec sa fille parfois.', 7, 5, 2400],
    ['Jacqueline', 'Morel', '06 67 89 01 23', 'Gris, épais', 'Permanente tous les 4 mois. Dure d’oreille : bien articuler au téléphone.', 1, 4, 1800],
    ['Hélène', 'Faure', '07 78 90 12 34', 'Mi-longs, ondulés', '', 5, 0, 200],
    ['Brigitte', 'André', '06 89 01 23 45', 'Courts, colorés', 'Couleur 7.1 + gloss. Ne pas couper la nuque trop court.', 3, 1, 640],
  ];

  const prestations = ['Coupe + Brushing', 'Coloration', 'Mise en plis', 'Balayage', 'Coupe', 'Soin profond'];
  const visits = [];

  const clientDocs = clients.map(([prenom, nom, telephone, natureCheveux, notes, tampons, recompensesOffertes, depuis], i) => {
    const id = `demo-c${i + 1}`;
    // Un passage tous les ~3 semaines pour les tampons de la carte en cours.
    for (let n = 0; n < tampons; n += 1) {
      visits.push({
        id: `demo-v${i + 1}-${n}`,
        clientId: id,
        type: 'tampon',
        date: ago(3 + (tampons - 1 - n) * 21 + i),
        prestation: prestations[(i + n) % prestations.length],
      });
    }
    if (recompensesOffertes) {
      visits.push({ id: `demo-r${i + 1}`, clientId: id, type: 'recompense', date: ago(3 + tampons * 21 + i), prestation: '' });
    }
    return {
      id,
      prenom,
      nom,
      telephone,
      natureCheveux,
      notes,
      fidelite: { tampons, recompensesOffertes },
      creeLe: ago(depuis),
      derniereVisite: tampons ? ago(3 + i) : null,
    };
  });

  const appointments = [
    ['demo-c2', 'Coloration + Brushing', 0, '09:30', 90, 'Racines + longueurs, ton chocolat.'],
    ['demo-c5', 'Mise en plis', 0, '11:15', 45, ''],
    ['demo-c3', 'Coupe + Coiffage', 0, '14:30', 45, 'Coupe courte, dégradé nuque.'],
    ['demo-c6', 'Permanente', 1, '10:00', 120, ''],
    ['demo-c1', 'Balayage', 2, '09:00', 150, 'Balayage miel, coloration végétale.'],
    ['demo-c8', 'Coloration', 4, '15:00', 75, ''],
  ].map(([clientId, prestation, inDays, heureDebut, dureeMinutes, notes], i) => ({
    id: `demo-a${i + 1}`,
    clientId,
    prestation,
    date: addDays(today, inDays),
    heureDebut,
    dureeMinutes,
    notes,
  }));

  return { clients: clientDocs, visits, appointments };
}
