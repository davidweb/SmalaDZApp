
import React, { useState, useEffect, useCallback, useRef } from 'react';
import useSWR from 'swr';
import { GameRoom, GameState, Team, User, Question } from './types';
import { INITIAL_QUESTIONS } from './constants';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';
import AdminPanel from './components/AdminPanel';
import SoundService from './services/SoundService';

const fetcher = (key: string) => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
};

const App: React.FC = () => {
  const { data: room, mutate } = useSWR('DZ_OR_STATE', fetcher, { 
    refreshInterval: 1000,
    fallbackData: null
  });

  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('dz_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isPaused, setIsPaused] = useState(false);
  const prevStrikes = useRef(0);

  useEffect(() => {
    if (room && room.strikes > prevStrikes.current) {
      SoundService.play('buzzer');
      document.body.classList.add('shake-screen');
      setTimeout(() => document.body.classList.remove('shake-screen'), 500);
    }
    if (room) prevStrikes.current = room.strikes;
  }, [room?.strikes]);

  const saveState = async (next: GameRoom) => {
    localStorage.setItem('DZ_OR_STATE', JSON.stringify(next));
    await mutate(next, false);
  };

  const handleAction = useCallback(async (type: string, payload: any) => {
    const currentRoom = room || fetcher('DZ_OR_STATE');
    if (!currentRoom && type !== 'CREATE_ROOM') return;
    
    let next = currentRoom ? JSON.parse(JSON.stringify(currentRoom)) as GameRoom : {} as GameRoom;

    switch (type) {
      case 'CREATE_ROOM':
        const freshQuestions = JSON.parse(JSON.stringify(INITIAL_QUESTIONS)).map((q: any) => ({
          ...q, answers: q.answers.map((a: any) => ({ ...a, revealed: false }))
        }));
        next = {
          code: "DZ-OR", state: GameState.LOBBY, hostId: payload.user.id,
          teamAName: "Famille A", teamBName: "Famille B", teamAScore: 0, teamBScore: 0,
          roundScore: 0, strikes: 0, currentQuestionId: 1, activeTeam: Team.NONE,
          diceResults: {}, users: [payload.user], activeQuestions: freshQuestions
        };
        break;

      case 'JOIN_TEAM':
        next.users = next.users.map(u => u.id === payload.userId ? { ...u, team: payload.team, isCaptain: payload.isCaptain ?? u.isCaptain } : u);
        break;

      case 'START_DUEL':
        next.state = GameState.DUEL;
        next.diceResults = {};
        next.activeTeam = Team.NONE;
        SoundService.play('tada');
        break;

      case 'ROLL_DICE':
        next.diceResults[payload.userId] = payload.value;
        const caps = next.users.filter(u => u.isCaptain && u.team !== Team.NONE);
        if (caps.length >= 2 && caps.every(c => next.diceResults[c.id])) {
          const valA = next.diceResults[caps.find(c => c.team === Team.A)?.id || ''];
          const valB = next.diceResults[caps.find(c => c.team === Team.B)?.id || ''];
          if (valA !== valB) {
            next.activeTeam = valA > valB ? Team.A : Team.B;
          }
        }
        break;

      case 'REVEAL_ANSWER':
        const q = next.activeQuestions.find(q => q.id === next.currentQuestionId);
        const ans = q?.answers.find(a => a.id === payload.answerId);
        if (ans && !ans.revealed) {
          ans.revealed = true;
          next.roundScore += ans.points;
          SoundService.play('ding');
        }
        break;

      case 'ADD_STRIKE':
        next.strikes = Math.min(3, next.strikes + 1);
        if (next.strikes === 3) {
          next.state = GameState.STEAL;
          next.activeTeam = next.activeTeam === Team.A ? Team.B : Team.A;
        }
        break;

      case 'END_ROUND':
        if (payload.winnerTeam === Team.A) next.teamAScore += next.roundScore;
        else if (payload.winnerTeam === Team.B) next.teamBScore += next.roundScore;
        next.state = GameState.LOBBY;
        next.currentQuestionId++;
        next.roundScore = 0;
        next.strikes = 0;
        if (next.currentQuestionId > next.activeQuestions.length) next.state = GameState.FINISHED;
        SoundService.play('tada');
        break;
      
      case 'RESET_GAME':
      case 'RESET':
        localStorage.removeItem('DZ_OR_STATE');
        window.location.reload();
        return;

      case 'LOAD_CUSTOM_QUIZ':
        next.activeQuestions = payload.questions;
        next.currentQuestionId = 1;
        next.teamAScore = 0;
        next.teamBScore = 0;
        next.roundScore = 0;
        next.strikes = 0;
        next.state = GameState.LOBBY;
        break;

      case 'SET_ACTIVE_TEAM':
        next.activeTeam = payload.team;
        SoundService.play('ding');
        break;

      case 'START_ROUND':
        next.state = GameState.ROUND;
        next.strikes = 0;
        next.roundScore = 0;
        break;

      case 'DISCONNECT_USER':
        next.users = next.users.filter(u => u.id !== payload.userId);
        break;
    }
    await saveState(next);
  }, [room, mutate]);

  const onJoin = (nickname: string, code: string) => {
    const newUser: User = {
      id: "user-" + Math.random().toString(36).substr(2, 9),
      nickname: nickname || "Anonyme",
      team: Team.NONE,
      isCaptain: false,
      isHost: false,
      score: 0
    };
    setUser(newUser);
    localStorage.setItem('dz_user', JSON.stringify(newUser));
    
    const current = fetcher('DZ_OR_STATE');
    if (current && current.code === code.toUpperCase()) {
      current.users.push(newUser);
      saveState(current);
    }
  };

  const onCreate = (nickname: string) => {
    const hostUser: User = {
      id: "host-" + Math.random().toString(36).substr(2, 9),
      nickname: nickname || "Animateur",
      team: Team.NONE,
      isCaptain: false,
      isHost: true,
      score: 0
    };
    setUser(hostUser);
    localStorage.setItem('dz_user', JSON.stringify(hostUser));
    handleAction('CREATE_ROOM', { user: hostUser });
  };

  const handleLogout = useCallback(() => {
    if (window.confirm("Quitter la session ?")) {
      localStorage.removeItem('dz_user');
      setUser(null);
    }
  }, []);

  if (!user || !room) return <Lobby onJoin={onJoin} onCreate={onCreate} error={null} />;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col md:flex-row overflow-hidden">
      <div className={`md:w-1/4 bg-slate-950 border-r border-slate-800 p-4 overflow-y-auto ${user.isHost ? 'block' : 'hidden md:block'}`}>
        {user.isHost ? (
          <AdminPanel 
            room={room} 
            onAction={handleAction} 
            isPaused={isPaused} 
            onTogglePause={() => setIsPaused(!isPaused)} 
            onLogout={handleLogout}
          />
        ) : (
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h2 className="text-yellow-500 font-game text-xl uppercase tracking-widest">Mon Profil</h2>
              <button onClick={handleLogout} className="text-red-500 p-2"><i className="fas fa-power-off"></i></button>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-dz-gradient rounded-full"></div>
              <div>
                <p className="font-bold">{user.nickname}</p>
                <p className="text-[10px] text-slate-500 uppercase">{user.team === Team.NONE ? 'Spectateur' : `Famille ${user.team}`}</p>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 p-4 md:p-8 overflow-y-auto scrollbar-hide">
        <GameBoard 
          room={room} 
          user={user} 
          onRoll={(v) => handleAction('ROLL_DICE', { userId: user.id, value: v })} 
          onLogout={handleLogout}
        />
      </div>
    </div>
  );
};

export default App;
