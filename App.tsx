
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameRoom, GameState, Team, User, Question } from './types';
import { INITIAL_QUESTIONS } from './constants';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';
import AdminPanel from './components/AdminPanel';
import SoundService from './services/SoundService';
import { supabase } from './services/supabase';

const SESSION_KEY = 'famille_dz_user_v3';
const ROOM_CODE = "DZ-OR";

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const roomRef = useRef<GameRoom | null>(null);

  // Charger la session locale
  useEffect(() => {
    const savedUser = localStorage.getItem(SESSION_KEY);
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      fetchRoom(ROOM_CODE);
    }
  }, []);

  const fetchRoom = async (code: string) => {
    const { data } = await supabase
      .from('rooms')
      .select('data')
      .eq('code', code.toUpperCase())
      .maybeSingle();

    if (data && data.data) {
      setRoom(data.data);
      roomRef.current = data.data;
      return data.data;
    }
    return null;
  };

  // Abonnement Realtime robuste
  useEffect(() => {
    const subscription = supabase
      .channel('any')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms' }, (payload) => {
        if (payload.new && payload.new.code === ROOM_CODE) {
          setRoom(payload.new.data);
          roomRef.current = payload.new.data;
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const saveRoomState = async (nextRoom: GameRoom) => {
    setRoom(nextRoom);
    roomRef.current = nextRoom;
    await supabase.from('rooms').update({ data: nextRoom }).eq('code', ROOM_CODE);
  };

  const handleLogout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    setRoom(null);
  }, []);

  const createRoom = async (nickname: string) => {
    setLoading(true);
    const hostId = "host-" + Math.random().toString(36).substr(2, 9);
    const host: User = { id: hostId, nickname, team: Team.NONE, isCaptain: false, isHost: true, score: 0 };
    
    const existing = await fetchRoom(ROOM_CODE);
    let newRoom: GameRoom;

    if (existing) {
      newRoom = { ...existing, hostId, users: [host] };
    } else {
      newRoom = {
        code: ROOM_CODE, state: GameState.LOBBY, hostId, teamAName: "Famille A", teamBName: "Famille B",
        teamAScore: 0, teamBScore: 0, roundScore: 0, strikes: 0, currentQuestionId: 1,
        activeTeam: Team.NONE, diceResults: {}, users: [host], activeQuestions: INITIAL_QUESTIONS
      };
    }

    await supabase.from('rooms').upsert({ code: ROOM_CODE, data: newRoom });
    setUser(host);
    setRoom(newRoom);
    localStorage.setItem(SESSION_KEY, JSON.stringify(host));
    setLoading(false);
  };

  const joinRoom = async (nickname: string, code: string) => {
    setLoading(true);
    const current = await fetchRoom(code);
    if (!current) {
      setError("Salon non trouvé.");
      setLoading(false);
      return;
    }
    const newUser: User = { id: "u-" + Math.random().toString(36).substr(2, 9), nickname, team: Team.NONE, isCaptain: false, isHost: false, score: 0 };
    const updated = { ...current, users: [...current.users, newUser] };
    await saveRoomState(updated);
    setUser(newUser);
    localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
    setLoading(false);
  };

  const handleAction = useCallback(async (type: string, payload: any) => {
    if (!roomRef.current || (isPaused && type !== 'RESUME')) return;
    let next = JSON.parse(JSON.stringify(roomRef.current)) as GameRoom;

    switch (type) {
      case 'JOIN_TEAM':
        next.users = next.users.map(u => u.id === payload.userId ? { ...u, team: payload.team } : u);
        break;
      case 'START_DUEL':
        next.state = GameState.DUEL;
        next.diceResults = {};
        break;
      case 'START_ROUND':
        next.state = GameState.ROUND;
        next.strikes = 0;
        break;
      case 'REVEAL_ANSWER':
        const q = next.activeQuestions.find(q => q.id === next.currentQuestionId);
        const a = q?.answers.find(ans => ans.id === payload.answerId);
        if (a && !a.revealed) {
          a.revealed = true;
          next.roundScore += a.points;
          SoundService.play('ding');
        }
        break;
      case 'ADD_STRIKE':
        next.strikes = Math.min(3, next.strikes + 1);
        SoundService.play('buzzer');
        if (next.strikes === 3) next.state = GameState.STEAL;
        break;
      case 'END_ROUND':
        if (payload.winnerTeam === Team.A) next.teamAScore += next.roundScore;
        else if (payload.winnerTeam === Team.B) next.teamBScore += next.roundScore;
        next.state = GameState.LOBBY;
        next.currentQuestionId++;
        next.roundScore = 0;
        next.strikes = 0;
        break;
      case 'RESET_GAME':
        next.teamAScore = 0;
        next.teamBScore = 0;
        next.currentQuestionId = 1;
        next.state = GameState.LOBBY;
        break;
    }
    await saveRoomState(next);
  }, [isPaused]);

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-yellow-500 font-game text-3xl">CHARGEMENT...</div>;
  if (!user || !room) return <Lobby onJoin={joinRoom} onCreate={createRoom} error={error} />;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col md:flex-row">
      <div className={`md:w-1/4 bg-slate-950 p-4 border-r border-slate-800 ${user.isHost ? '' : 'hidden md:block'}`}>
        {user.isHost ? (
          <AdminPanel room={room} onAction={handleAction} isPaused={isPaused} onTogglePause={() => setIsPaused(!isPaused)} onLogout={handleLogout} />
        ) : (
          <div className="text-white">
            <h2 className="font-game text-xl text-yellow-500 mb-4">PROFIL</h2>
            <p className="font-bold">{user.nickname}</p>
            <p className="text-xs text-slate-500 uppercase">Connecté au salon DZ-OR</p>
          </div>
        )}
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        <GameBoard room={room} user={user} onRoll={(v) => handleAction('ROLL_DICE', { rollerId: user.id, value: v })} onLogout={handleLogout} />
      </div>
    </div>
  );
};

export default App;
