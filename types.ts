
export type Team = 'A' | 'B' | 'SPECTATOR';
export type RoomStatus = 'LOBBY' | 'GAME';

export interface Answer {
  text: string;
  points: number;
}

export interface Question {
  id: number;
  theme: string;
  question_text: string;
  answers: Answer[];
}

export interface Player {
  id: string;
  room_code: string;
  nickname: string;
  team: Team;
  is_captain: boolean;
  stats_good_answers: number;
}

export interface Room {
  id: string;
  code: string;
  status: RoomStatus;
  team_a_name: string;
  team_b_name: string;
  team_a_score: number;
  team_b_score: number;
  current_strikes: number;
  points_in_bank: number;
  active_team: 'A' | 'B' | null;
  timer_ends_at: string | null;
  current_round_question_id: number | null;
  revealed_answers_indices: number[];
}
