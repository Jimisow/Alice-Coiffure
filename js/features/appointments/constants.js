// Listes de choix des formulaires. À terme, elles pourront devenir
// configurables (Réglages) sans toucher aux vues.

export const PRESTATIONS = [
  'Coupe',
  'Coupe + Brushing',
  'Brushing',
  'Mise en plis',
  'Coloration',
  'Balayage',
  'Mèches',
  'Permanente',
  'Lissage',
  'Soin profond',
  'Chignon / évènement',
];

// Durée proposée par défaut quand Alice choisit une prestation.
export const DUREE_PAR_PRESTATION = {
  Coupe: 30,
  'Coupe + Brushing': 45,
  Brushing: 30,
  'Mise en plis': 45,
  Coloration: 90,
  Balayage: 150,
  Mèches: 120,
  Permanente: 120,
  Lissage: 150,
  'Soin profond': 45,
  'Chignon / évènement': 60,
};

export const DUREES_RAPIDES = [30, 45, 60, 90, 120, 150];
