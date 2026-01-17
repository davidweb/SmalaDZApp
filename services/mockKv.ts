
import { GameState } from '../constants';

// Simulated Server State
let globalState: Record<string, GameState> = {};

export const mockKv = {
  get: async (key: string): Promise<GameState | null> => {
    return globalState[key] || null;
  },
  set: async (key: string, value: GameState): Promise<void> => {
    globalState[key] = JSON.parse(JSON.stringify(value));
  },
  delete: async (key: string): Promise<void> => {
    delete globalState[key];
  }
};
