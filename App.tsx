
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

  // Charger l'utilisateur au démarrage
  useEffect(() => {
    const savedUser = localStorage.getItem(SESSION_KEY);
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      fetchRoom(ROOM_CODE);
    }
  }, []);

  const fetchRoom = async (code: string) => {
    const { data, error } = await supabase
      .from('rooms')
      .select('data')
      .eq('code', code.toUpperCase())
      .single();

    if (data) {
      const roomData = data.data as GameRoom;
      setRoom(roomData);
      roomRef.current = roomData;
      return roomData;
    }
    return null;
  };

  // Abonnement Realtime amélioré
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms' },
        (payload) => {
          if (payload.new && payload.new.code === ROOM_CODE) {
            const newData = payload.new.data as GameRoom;
            setRoom(newData);
            roomRef.current = newData;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const saveRoomState = async (nextRoom: GameRoom) => {
    // On met à jour localement immédiatement pour la réactivité
    setRoom(nextRoom);
    roomRef.current = nextRoom;

    // Persistance Supabase
    const { error } = await supabase
      .from('rooms')
      .update({ data: nextRoom })
      .eq('code', nextRoom.code);

    if (error) {
      console.error("Erreur de sauvegarde base de données:", error);
    }
  };

  const handleLogout = useCallback(() => {
    if (!window.confirm("Quitter la partie ?")) return;
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    setRoom(null);
  }, []);

  const createRoom = async (nickname: string) => {
    setLoading(true);
    const code = ROOM_CODE;
    
    // Vérifier si un salon existe déjà pour ne pas écraser une partie en cours par erreur
    const existingRoom = await fetchRoom(code);
    
    const hostId = "host-" + Math.random().toString(36).substr(2, 9);
    const host: User = { id: hostId, nickname, team: Team.NONE, isCaptain: false, isHost: true, score: 0 };
    
    let newRoom: GameRoom;

    if (existingRoom) {
      // On garde les questions et l'état actuel mais on change l'hôte
      newRoom = { ...existingRoom, hostId, users: [host] };
    } else {
      const freshQuestions = JSON.parse(JSON.stringify(INITIAL_QUESTIONS)).map((q: Question) => ({
        ...q,
        answers: q.answers.map(a => ({ ...a, revealed: false }))
      }));
      newRoom = {
        code, state: GameState.LOBBY, hostId, teamAName: "Famille A", teamBName: "Famille B",
        teamAScore: 0, teamBScore: 0, roundScore: 0, strikes: 0, currentQuestionId: 1,
        activeTeam: Team.NONE, diceResults: {}, users: [host], activeQuestions: freshQuestions
      };
    }

    const { error } = await supabase
      .from('rooms')
      .upsert({ code, data: newRoom }, { onConflict: 'code' });

    if (!error) {
      setUser(host);
      setRoom(newRoom);
      roomRef.current = newRoom;
      localStorage.setItem(SESSION_KEY, JSON.stringify(host));
      SoundService.play('tada');
    } else {
      setError("Erreur lors de la création du salon.");
    }
    setLoading(false);
  };

  const joinRoom = async (nickname: string, code: string) => {
    setLoading(true);
    const currentRoom = await fetchRoom(code);

    if (!currentRoom) {
      setError("Le salon n'existe pas. L'animateur doit d'abord le créer.");
      setLoading(false);
      return;
    }

    const newUser: User = { 
      id: "user-" + Math.random().toString(36).substr(2, 9), 
      nickname, team: Team.NONE, isCaptain: false, isHost: false, score: 0 
    };
    
    const updatedRoom = { ...currentRoom, users: [...currentRoom.users, newUser] };
    await saveRoomState(updatedRoom);
    setUser(newUser);
    localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
    setError(null);
    setLoading(false);
  };

  const handleAction = useCallback(async (type: string, payload: any) => {
    if (!roomRef.current) return;
    
    // Si on est en pause, on ne permet que de reprendre
    if (isPaused && type !== 'RESUME') return;

    let next = JSON.parse(JSON.stringify(roomRef.current)) as GameRoom;

    switch (type) {
      case 'LOAD_CUSTOM_QUIZ':
        next.activeQuestions = payload.questions;
        next.currentQuestionId = 1;
        next.teamAScore = 0;
        next.teamBScore = 0;
        next.roundScore = 0;
        next.strikes = 0;
        next.state = GameState.LOBBY;
        next.diceResults = {};
        next.activeTeam = Team.NONE;
        SoundService.play('tada');
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
      case 'SET_ACTIVE_TEAM':
        next.activeTeam = payload.team;
        SoundService.play('ding');
        break;
      case 'ROLL_DICE':
        next.diceResults[payload.rollerId] = payload.value;
        SoundService.play('dice_roll');
        const captains = next.users.filter(u => u.isCaptain && u.team !== Team.NONE);
        if (captains.every(c => next.diceResults[c.id])) {
          const resA = next.diceResults[captains.find(c => c.team === Team.A)?.id || ''];
          const resB = next.diceResults[captains.find(c => c.team === Team.B)?.id || ''];
          if (resA && resB && resA !== resB) next.activeTeam = resA > resB ? Team.A : Team.B;
        }
        break;
      case 'START_ROUND':
        next.state = GameState.ROUND;
        next.strikes = 0;
        next.roundScore = 0;
        SoundService.play('ding');
        break;
      case 'REVEAL_ANSWER':
        const qIdx = next.activeQuestions.findIndex(q => q.id === next.currentQuestionId);
        if (qIdx === -1) break;
        const aIdx = next.activeQuestions[qIdx].answers.findIndex(a => a.id === payload.answerId);
        if (aIdx !== -1 && !next.activeQuestions[qIdx].answers[aIdx].revealed) {
          next.activeQuestions[qIdx].answers[aIdx].revealed = true;
          next.roundScore += next.activeQuestions[qIdx].answers[aIdx].points;
          SoundService.play('ding');
        }
        break;
      case 'ADD_STRIKE':
        next.strikes = Math.min(3, next.strikes + 1);
        SoundService.play('buzzer');
        if (next.strikes === 3) {
           next.state = GameState.STEAL;
        }
        break;
      case 'END_ROUND':
        if (payload.winnerTeam === Team.A) next.teamAScore += next.roundScore;
        else if (payload.winnerTeam === Team.B) next.teamBScore += next.roundScore;
        next.state = GameState.LOBBY;
        next.currentQuestionId++;
        next.roundScore = 0;
        next.strikes = 0;
        next.activeTeam = Team.NONE;
        if (next.currentQuestionId > next.activeQuestions.length) next.state = GameState.FINISHED;
        SoundService.play('tada');
        break;
      case 'RESET_GAME':
        const resetQuestions = next.activeQuestions.map((q: Question) => ({
          ...q,
          answers: q.answers.map(a => ({ ...a, revealed: false }))
        }));
        next = { ...next, state: GameState.LOBBY, teamAScore: 0, teamBScore: 0, currentQuestionId: 1, activeQuestions: resetQuestions, diceResults: {}, strikes: 0, roundScore: 0 };
        break;
      case 'DISCONNECT_USER':
        next.users = next.users.filter(u => u.id !== payload.userId);
        break;
    }
    
    await saveRoomState(next);
  }, [isPaused]);

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-yellow-500">
      <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="font-game text-2xl animate-pulse">SYNCHRONISATION DZ...</p>
    </div>
  );

  if (!user || !room) return <Lobby onJoin={joinRoom} onCreate={createRoom} error={error} />;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar Admin */}
      <div className={`md:w-1/3 lg:w-1/4 bg-slate-950 border-r border-slate-800 p-4 overflow-y-auto ${user.isHost ? 'block' : 'hidden md:block'}`}>
        {user.isHost ? (
          <AdminPanel room={room} onAction={handleAction} isPaused={isPaused} onTogglePause={() => setIsPaused(!isPaused)} onLogout={handleLogout} />
        ) : (
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <span className="text-yellow-500 font-game text-xl tracking-widest uppercase">Mon Profil</span>
              <button onClick={handleLogout} className="text-red-500 hover:text-red-400 p-2"><i className="fas fa-power-off"></i></button>
            </div>
            <div className="space-y-1">
              <p className="text-white font-bold text-lg">{user.nickname}</p>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                 <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest">Connecté au Salon {room.code}</p>
              </div>
            </div>
            {user.team !== Team.NONE && (
               <div className={`p-3 rounded-xl border-2 font-game text-center ${user.team === Team.A ? 'bg-green-600/20 border-green-500 text-green-500' : 'bg-red-600/20 border-red-500 text-red-500'}`}>
                 FAMILLE {user.team}
               </div>
            )}
          </div>
        )}
      </div>

      {/* Game Content */}
      <div className="flex-1 p-2 md:p-8 flex flex-col items-center overflow-y-auto">
        <GameBoard room={room} user={user} onRoll={(v) => handleAction('ROLL_DICE', { rollerId: user.id, value: v })} onLogout={handleLogout} />
      </div>
    </div>
  );
};

export default App;
