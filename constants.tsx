
import { Question } from './types';

export const INITIAL_QUESTIONS: Question[] = [
  {
    id: 1,
    theme: "Cuisine DZ",
    questionText: "Quel est le plat incontournable d'un mariage algérien ?",
    answers: [
      { id: 1, text: "Couscous", points: 45, revealed: false },
      { id: 2, text: "Chorba", points: 25, revealed: false },
      { id: 3, text: "Bourek", points: 15, revealed: false },
      { id: 4, text: "Tajine Zitoun", points: 10, revealed: false },
      { id: 5, text: "Ham Lahlou", points: 5, revealed: false }
    ]
  },
  {
    id: 2,
    theme: "Vie Quotidienne",
    questionText: "Qu'est-ce qu'on achète toujours au dernier moment avant l'Aïd ?",
    answers: [
      { id: 1, text: "Les vêtements des enfants", points: 40, revealed: false },
      { id: 2, text: "La semoule pour les gâteaux", points: 30, revealed: false },
      { id: 3, text: "Le mouton", points: 15, revealed: false },
      { id: 4, text: "Le henné", points: 10, revealed: false },
      { id: 5, text: "Les bougies", points: 5, revealed: false }
    ]
  },
  {
    id: 3,
    theme: "Transports",
    questionText: "Quel est le moyen de transport le plus typique à Alger ?",
    answers: [
      { id: 1, text: "Métro", points: 35, revealed: false },
      { id: 2, text: "Téléphérique", points: 30, revealed: false },
      { id: 3, text: "Bus ETUSA", points: 20, revealed: false },
      { id: 4, text: "Taxi clandestin", points: 10, revealed: false },
      { id: 5, text: "Tramway", points: 5, revealed: false }
    ]
  }
];
