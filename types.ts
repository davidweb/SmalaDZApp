
export enum GameState {
  LOBBY = 'LOBBY',
  DUEL = 'DUEL',
  ROUND = 'ROUND',
  STEAL = 'STEAL',
  FINISHED = 'FINISHED'
}

export enum Team {
  A = 'A',
  B = 'B',
  NONE = 'NONE'
}

export interface Answer {
  id: number;
  text: string;
  points: number;
  revealed: boolean;
}

export interface Question {
  id: number;
  theme: string;
  questionText: string;
  answers: Answer[];
}

export interface User {
  id: string;
  nickname: string;
  team: Team;
  isCaptain: boolean;
  isHost: boolean;
  score: number;
}

export interface GameRoom {
  code: string;
  state: GameState;
  hostId: string;
  teamAName: string;
  teamBName: string;
  teamAScore: number;
  teamBScore: number;
  roundScore: number;
  strikes: number;
  currentQuestionId: number;
  activeTeam: Team;
  diceResults: { [key: string]: number };
  users: User[];
  // On stocke les questions avec leur état de révélation actuel ici pour la synchro
  activeQuestions: Question[];
}
