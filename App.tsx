
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, Users, Crown, Settings, LogOut, Trash2, ArrowRight, Star, AlertTriangle } from 'lucide-react';
import { supabase } from './services/supabaseClient';
import { Room, Player, Question, Team } from './types';
import Board from './components/Board';
import { playSound } from './components/AudioProvider';

// Type pour la navigation interne
type Page = 'JOIN' | 'ADMIN_LOGIN' | 'ADMIN_DASHBOARD' | 'GAME_VIEW';

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('JOIN');
  const [adminPin, setAdminPin] = useState('');
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);

  // Vérification de la configuration au montage
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
    
    if (url && key && supabase) {
      setIsConfigured(true);
    } else {
      console.warn("Supabase non configuré ou mal initialisé.");
      setIsConfigured(false);
    }
  }, []);

  // Chargement des questions initiales
  useEffect(() => {
    if (isConfigured === true) {
      const fetchInitialData = async () => {
        try {
          const { data: qData } = await supabase!.from('questions').select('*');
          if (qData) setQuestions(qData);
        } catch (e) {
          console.error("Erreur chargement questions:", e);
        }
      };
      fetchInitialData();
    }
  }, [isConfigured]);

  // Souscription Realtime et gestion de la salle
  useEffect(() => {
    if (!roomCode || !isConfigured || !supabase) return;

    const cleanCode = roomCode.toUpperCase().trim();

    const roomChannel = supabase
      .channel(`room:${cleanCode}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${cleanCode}` }, (payload: any) => {
        const newRoom = payload.new as Room;
        
        // Sons contextuels
        if (newRoom.current_strikes > (room?.current_strikes || 0)) playSound('buzzer');
        if (newRoom.revealed_answers_indices.length > (room?.revealed_answers_indices.length || 0)) playSound('ding');
        
        setRoom(newRoom);
        // Mettre à jour la question active si elle change
        if (newRoom.current_round_question_id !== room?.current_round_question_id) {
          const q = questions.find(q => q.id === newRoom.current_round_question_id);
          setActiveQuestion(q || null);
        }
      })
      .subscribe();

    const playersChannel = supabase
      .channel(`players:${cleanCode}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_code=eq.${cleanCode}` }, () => {
        fetchPlayers();
      })
      .subscribe();

    const fetchRoom = async () => {
      const { data } = await supabase!.from('rooms').select('*').eq('code', cleanCode).single();
      if (data) {
        setRoom(data);
        if (data.current_round_question_id) {
          const q = questions.find(q => q.id === data.current_round_question_id);
          setActiveQuestion(q || null);
        }
      }
    };

    const fetchPlayers = async () => {
      const { data } = await supabase!.from('players').select('*').eq('room_code', cleanCode);
      if (data) setPlayers(data);
    };

    fetchRoom();
    fetchPlayers();

    return () => {
      supabase!.removeChannel(roomChannel);
      supabase!.removeChannel(playersChannel);
    };
  }, [roomCode, questions, isConfigured]);

  // Logique du Timer
  useEffect(() => {
    if (!room?.timer_ends_at) {
      setTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      const end = new Date(room.timer_ends_at!).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((end - now) / 1000));
      setTimeLeft(diff);
      if (diff === 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [room?.timer_ends_at]);

  // Handlers de l'application
  const handleAdminLogin = () => {
    if (adminPin === '2985') setPage('ADMIN_DASHBOARD');
    else alert('Code PIN incorrect');
  };

  const createRoom = async () => {
    const code = `DZ-${Math.floor(10 + Math.random() * 90)}`;
    const { data } = await supabase!.from('rooms').insert([{ code, status: 'LOBBY' }]).select().single();
    if (data) {
      setRoomCode(code);
      setRoom(data);
    }
  };

  const joinRoom = async () => {
    if (!nickname || !roomCode) return;
    const cleanCode = roomCode.toUpperCase().trim();
    const { data: roomExists } = await supabase!.from('rooms').select('*').eq('code', cleanCode).single();
    if (!roomExists) return alert("Salle introuvable");

    const { data: player } = await supabase!.from('players').insert([
      { room_code: cleanCode, nickname, team: 'SPECTATOR' }
    ]).select().single();

    if (player) {
      setCurrentPlayer(player);
      setRoomCode(cleanCode);
      setPage('GAME_VIEW');
    }
  };

  const updateRoom = async (updates: Partial<Room>) => {
    if (!roomCode) return;
    await supabase!.from('rooms').update(updates).eq('code', roomCode.toUpperCase());
  };

  const setNextQuestion = async () => {
    if (questions.length === 0) return;
    const nextQ = questions[Math.floor(Math.random() * questions.length)];
    await updateRoom({ 
      current_round_question_id: nextQ.id, 
      revealed_answers_indices: [], 
      current_strikes: 0,
      points_in_bank: 0,
      status: 'GAME' 
    });
    setActiveQuestion(nextQ);
  };

  const revealAnswer = async (index: number) => {
    if (!room || room.revealed_answers_indices.includes(index) || !activeQuestion) return;
    const newRevealed = [...room.revealed_answers_indices, index];
    const points = activeQuestion.answers[index].points || 0;
    await updateRoom({ 
      revealed_answers_indices: newRevealed,
      points_in_bank: room.points_in_bank + points
    });
  };

  const addStrike = async () => {
    if (!room) return;
    const newStrikes = Math.min(3, room.current_strikes + 1);
    await updateRoom({ current_strikes: newStrikes });
  };

  const resetStrikes = async () => {
    await updateRoom({ current_strikes: 0 });
  };

  const awardPoints = async (team: 'A' | 'B') => {
    if (!room) return;
    const updates = team === 'A' 
      ? { team_a_score: room.team_a_score + room.points_in_bank, points_in_bank: 0 }
      : { team_b_score: room.team_b_score + room.points_in_bank, points_in_bank: 0 };
    await updateRoom(updates);
    playSound('win');
  };

  const movePlayer = async (playerId: string, team: Team) => {
    await supabase!.from('players').update({ team }).eq('id', playerId);
  };

  const startTimer = async (seconds: number) => {
    const endsAt = new Date(Date.now() + seconds * 1000).toISOString();
    await updateRoom({ timer_ends_at: endsAt });
    playSound('timer');
  };

  // Rendu des états de chargement / erreur
  if (isConfigured === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (isConfigured === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-8">
        <AlertTriangle size={64} className="text-yellow-500 mb-6" />
        <h1 className="text-3xl font-anton mb-4 uppercase tracking-tighter">Configuration Requise</h1>
        <p className="text-slate-400 text-center max-w-md mb-6">
          Vérifiez vos variables d'environnement dans Vercel : <br/>
          <code className="bg-black/40 p-2 rounded mt-2 block">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY</code>
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <header className="p-4 flex justify-between items-center bg-black/30 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Crown className="text-yellow-400" />
          <h1 className="font-anton text-2xl tracking-tighter text-yellow-400">FAMILLE DZ EN OR</h1>
        </div>
        
        {page !== 'JOIN' && (
          <button onClick={() => setPage('JOIN')} className="bg-slate-700 hover:bg-slate-600 px-4 py-1 rounded-full text-xs font-bold transition-all">
            Quitter
          </button>
        )}
      </header>

      <main className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* PAGE : REJOINDRE */}
          {page === 'JOIN' && (
            <motion.div key="join" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="flex flex-col items-center justify-center p-8 mt-12 max-w-md mx-auto">
              <div className="bg-slate-800/80 p-8 rounded-3xl border border-white/20 shadow-2xl w-full">
                <h2 className="text-3xl font-anton text-center mb-8 italic text-white uppercase tracking-tighter">Rejoindre le Live</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 uppercase font-bold ml-2">Ton Pseudo</label>
                    <input type="text" placeholder="Ex: Ryad93" className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 focus:ring-2 focus:ring-yellow-400 outline-none text-white" value={nickname} onChange={(e) => setNickname(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase font-bold ml-2">Code Salle</label>
                    <input type="text" placeholder="DZ-..." className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 focus:ring-2 focus:ring-yellow-400 outline-none uppercase text-white" value={roomCode} onChange={(e) => setRoomCode(e.target.value)} />
                  </div>
                  <button onClick={joinRoom} className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-black py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                    C'EST PARTI ! <ArrowRight size={20} />
                  </button>
                </div>
              </div>
              <button onClick={() => setPage('ADMIN_LOGIN')} className="mt-8 text-slate-500 hover:text-white flex items-center gap-2 text-xs transition-colors">
                <Settings size={14} /> Mode Animateur
              </button>
            </motion.div>
          )}

          {/* PAGE : LOGIN ADMIN */}
          {page === 'ADMIN_LOGIN' && (
            <motion.div key="admin_login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center p-8 mt-12 max-w-md mx-auto">
              <div className="bg-slate-800 p-8 rounded-3xl border border-white/20 shadow-2xl w-full text-center">
                <h2 className="text-3xl font-anton mb-8 italic text-yellow-400">ACCÈS ANIMATEUR</h2>
                <input type="password" placeholder="PIN" maxLength={4} className="w-full bg-slate-900 text-center text-4xl tracking-[1em] font-bold border border-white/10 rounded-xl p-4 focus:ring-2 focus:ring-yellow-400 outline-none mb-6 text-white" value={adminPin} onChange={(e) => setAdminPin(e.target.value)} />
                <button onClick={handleAdminLogin} className="w-full bg-white text-slate-900 font-bold py-4 rounded-xl hover:bg-slate-100 transition-colors">VALIDER</button>
              </div>
            </motion.div>
          )}

          {/* PAGE : DASHBOARD ADMIN */}
          {page === 'ADMIN_DASHBOARD' && (
            <motion.div key="admin_dash" className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
              <div className="lg:col-span-2 space-y-6">
                {!room ? (
                  <div className="bg-slate-800 p-12 rounded-3xl flex flex-col items-center justify-center border-2 border-dashed border-white/20">
                    <button onClick={createRoom} className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 px-8 py-4 rounded-full font-black text-xl flex items-center gap-3 transition-transform hover:scale-105">
                      CRÉER UNE SALLE <LogIn />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="bg-slate-800 p-6 rounded-3xl flex justify-between items-center border border-white/10">
                      <div>
                        <h3 className="text-slate-400 text-xs uppercase font-bold">Code Salle</h3>
                        <p className="text-3xl font-anton text-yellow-400">{room.code}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={setNextQuestion} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-bold text-sm">Nouvelle Question</button>
                        <button onClick={() => updateRoom({ status: 'LOBBY' })} className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg font-bold text-sm">Lobby</button>
                      </div>
                    </div>

                    {activeQuestion && (
                      <div className="bg-slate-900 p-6 rounded-3xl border border-yellow-500/30">
                        <h2 className="text-xl font-bold mb-6 text-white">{activeQuestion.question_text}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                          {activeQuestion.answers.map((ans, idx) => (
                            <button
                              key={idx}
                              disabled={room.revealed_answers_indices.includes(idx)}
                              onClick={() => revealAnswer(idx)}
                              className={`p-4 rounded-xl flex justify-between items-center border-2 transition-all ${
                                room.revealed_answers_indices.includes(idx)
                                  ? 'bg-white text-slate-900 border-white opacity-50'
                                  : 'bg-slate-800 border-white/10 hover:border-yellow-400 text-white'
                              }`}
                            >
                              <span className="font-bold truncate pr-2">{ans.text}</span>
                              <span className="font-anton text-xl">{ans.points}</span>
                            </button>
                          ))}
                        </div>
                        
                        <div className="flex flex-wrap gap-6 items-center justify-between border-t border-white/10 pt-6">
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-black uppercase text-slate-500">Fautes :</span>
                            <div className="flex gap-2">
                              {[0, 1, 2].map((i) => (
                                <button key={i} onClick={addStrike} className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl font-black transition-all ${i < room.current_strikes ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'bg-slate-800 text-slate-600 border border-white/5'}`}>X</button>
                              ))}
                              <button onClick={resetStrikes} className="text-[10px] text-slate-500 hover:text-white uppercase ml-2 underline">Reset</button>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => startTimer(60)} className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-xs font-bold text-white border border-white/10">60s</button>
                            <button onClick={() => startTimer(30)} className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-xs font-bold text-white border border-white/10">30s</button>
                            <button onClick={() => updateRoom({ timer_ends_at: null })} className="bg-red-950 text-red-400 px-4 py-2 rounded-lg text-xs font-bold border border-red-900">STOP</button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-8">
                           <button onClick={() => awardPoints('A')} className="bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold text-white shadow-lg">Attribuer à {room.team_a_name}</button>
                           <button onClick={() => awardPoints('B')} className="bg-red-600 hover:bg-red-500 py-4 rounded-xl font-bold text-white shadow-lg">Attribuer à {room.team_b_name}</button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Management Joueurs */}
              <div className="bg-slate-800 p-6 rounded-3xl border border-white/10 h-fit">
                <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
                  <Users className="text-blue-400" />
                  <h3 className="font-anton text-xl uppercase tracking-wider text-white">JOUEURS ({players.length})</h3>
                </div>
                
                <div className="space-y-8">
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase text-blue-400 flex items-center justify-between tracking-widest">
                      {room?.team_a_name} <span className="text-white text-xl font-anton">{room?.team_a_score}</span>
                    </h4>
                    {players.filter(p => p.team === 'A').map(p => (
                      <div key={p.id} className="bg-slate-900/50 p-3 rounded-xl flex justify-between items-center group">
                        <span className="font-bold flex items-center gap-2 text-white">{p.nickname} {p.is_captain && <Star size={12} className="fill-yellow-400 text-yellow-400" />}</span>
                        <button onClick={() => movePlayer(p.id, 'SPECTATOR')} className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-all"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase text-red-400 flex items-center justify-between tracking-widest">
                      {room?.team_b_name} <span className="text-white text-xl font-anton">{room?.team_b_score}</span>
                    </h4>
                    {players.filter(p => p.team === 'B').map(p => (
                      <div key={p.id} className="bg-slate-900/50 p-3 rounded-xl flex justify-between items-center group">
                        <span className="font-bold flex items-center gap-2 text-white">{p.nickname} {p.is_captain && <Star size={12} className="fill-yellow-400 text-yellow-400" />}</span>
                        <button onClick={() => movePlayer(p.id, 'SPECTATOR')} className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-all"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 pt-6 border-t border-white/5">
                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">En attente</h4>
                    {players.filter(p => p.team === 'SPECTATOR').map(p => (
                      <div key={p.id} className="bg-slate-900 p-3 rounded-xl flex justify-between items-center">
                        <span className="font-bold text-white text-sm">{p.nickname}</span>
                        <div className="flex gap-2">
                          <button onClick={() => movePlayer(p.id, 'A')} className="bg-blue-600/20 text-blue-400 px-2 py-1 rounded text-[10px] font-bold border border-blue-600/30 hover:bg-blue-600 hover:text-white transition-all">A</button>
                          <button onClick={() => movePlayer(p.id, 'B')} className="bg-red-600/20 text-red-400 px-2 py-1 rounded text-[10px] font-bold border border-red-600/30 hover:bg-red-600 hover:text-white transition-all">B</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* PAGE : VUE JEU / PLATEAU */}
          {page === 'GAME_VIEW' && room && (
            <motion.div key="game_view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative min-h-full p-4 flex flex-col items-center">
              <div className="w-full max-w-5xl flex justify-between items-center mb-12 mt-6">
                <div className="text-left">
                  <span className="text-blue-400 font-black uppercase text-[10px] tracking-[0.2em]">{room.team_a_name}</span>
                  <div className="text-7xl font-anton text-white drop-shadow-[0_0_20px_rgba(59,130,246,0.3)]">{room.team_a_score}</div>
                </div>
                
                <div className="flex flex-col items-center">
                  {timeLeft !== null && (
                    <div className={`text-5xl font-anton px-8 py-3 rounded-full border-4 shadow-2xl mb-4 ${
                      timeLeft <= 10 ? 'bg-red-600 border-white text-white animate-pulse' : 'bg-slate-900 border-yellow-500 text-yellow-400'
                    }`}>
                      {timeLeft}
                    </div>
                  )}
                  <div className="bg-yellow-500 text-slate-900 px-8 py-2 rounded-full font-anton text-4xl shadow-xl border-4 border-white">
                    {room.points_in_bank}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-red-400 font-black uppercase text-[10px] tracking-[0.2em]">{room.team_b_name}</span>
                  <div className="text-7xl font-anton text-white drop-shadow-[0_0_20px_rgba(239,68,68,0.3)]">{room.team_b_score}</div>
                </div>
              </div>

              {room.status === 'LOBBY' ? (
                <div className="flex flex-col items-center justify-center mt-20 text-center">
                  <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 3 }} className="bg-yellow-500/10 border-2 border-yellow-500/50 p-16 rounded-full mb-8">
                    <Users size={80} className="text-yellow-400" />
                  </motion.div>
                  <h2 className="text-4xl font-anton uppercase text-white tracking-tighter mb-4">En attente de l'animateur</h2>
                  <p className="text-slate-400 max-w-sm">Le plateau s'affichera dès que la partie sera lancée en live !</p>
                </div>
              ) : (
                <Board room={room} question={activeQuestion} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {room && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-black/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 shadow-2xl">
            <span className="text-[10px] font-black text-slate-500 uppercase mr-2">Salle :</span>
            <span className="font-anton text-yellow-400 tracking-wider text-xl">{room.code}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
