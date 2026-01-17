
export interface Answer {
  text: string;
  points: number;
}

export interface Question {
  id: number;
  theme: string;
  question: string;
  answers: Answer[];
}

export interface Player {
  id: string;
  name: string;
  team: 'A' | 'B' | 'SPECTATOR';
  isCaptain: boolean;
  stats: { correctAnswers: number };
}

export interface GameState {
  code: string;
  status: 'LOBBY' | 'DUEL' | 'ROUND' | 'STEAL' | 'FINISHED';
  scores: { A: number; B: number };
  roundPoints: number;
  strikes: number;
  currentQuestionIndex: number;
  revealedAnswers: number[]; // indices
  timerEndsAt: number | null;
  activeTeam: 'A' | 'B' | null;
  originalTeam: 'A' | 'B' | null; // The team that started the round before a steal
  players: Player[];
  dice: { A: number | null; B: number | null };
}

export const QUESTIONS: Question[] = [
  {
    "id": 1,
    "theme": "Ramadan",
    "question": "Qu'est-ce qu'on trouve OBLIGATOIREMENT sur la table du F'tour ?",
    "answers": [
      { "text": "La Chorba / Hrira", "points": 35 },
      { "text": "Les Boureks", "points": 30 },
      { "text": "Les Dattes / Lben", "points": 15 },
      { "text": "Le Pain (Matlouh)", "points": 10 },
      { "text": "Zlabia / Kalbelouz", "points": 10 }
    ]
  },
  {
    "id": 2,
    "theme": "Quotidien",
    "question": "Une excuse bidon pour le retard ?",
    "answers": [
      { "text": "Bouchons / Circulation", "points": 40 },
      { "text": "Réveil pas sonné", "points": 25 },
      { "text": "Pas de transport", "points": 15 },
      { "text": "Je suis en route", "points": 15 },
      { "text": "J'étais malade", "points": 5 }
    ]
  },
  {
    "id": 3,
    "theme": "Mariage",
    "question": "Vu ou entendu dans un mariage DZ ?",
    "answers": [
      { "text": "Le Cortège / Klaxons", "points": 35 },
      { "text": "Les Youyous", "points": 25 },
      { "text": "Mariée change de robe", "points": 20 },
      { "text": "Le Couscous", "points": 10 },
      { "text": "La famille qui critique", "points": 10 }
    ]
  },
  {
    "id": 4,
    "theme": "Sac à main",
    "question": "Objet dans le sac d'une femme ?",
    "answers": [
      { "text": "Téléphone", "points": 30 },
      { "text": "Argent / Porte-monnaie", "points": 25 },
      { "text": "Maquillage", "points": 20 },
      { "text": "Clés", "points": 15 },
      { "text": "Mouchoirs", "points": 10 }
    ]
  },
  {
    "id": 5,
    "theme": "École",
    "question": "Dans le cartable au primaire ?",
    "answers": [
      { "text": "Trousse", "points": 25 },
      { "text": "Ardoise / Craie", "points": 25 },
      { "text": "Goûter", "points": 20 },
      { "text": "Cahiers", "points": 20 },
      { "text": "Règle", "points": 10 }
    ]
  }
];
