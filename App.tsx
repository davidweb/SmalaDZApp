
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, Users, Crown, Settings, LogOut, Trash2, ArrowRight, Star, AlertTriangle } from 'lucide-react';
import { supabase } from './services/supabaseClient';
import { Room, Player, Question, Team } from './types';
import Board from './components/Board';
import { playSound } from './components/AudioProvider';

// Mock routing since we can't use standard router
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
  const [isConfigured, setIsConfigured] = useState(true);

  // Check configuration
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      setIsConfigured(false);
    }
  }, []);

  // Initialize data
  useEffect(() => {
    if (!isConfigured) return;
    const fetchInitialData = async () => {
      try {
        const { data: qData } = await supabase.from('questions').select('*');
        if (qData) setQuestions(qData);
      } catch (e) {
        console.error("Failed to fetch questions:", e);
      }
    };
    fetchInitialData();
  }, [isConfigured]);

  // Realtime subscription
  useEffect(() => {
    if (!roomCode || !isConfigured) return;

    const roomChannel = supabase
      .channel(`room:${roomCode}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${roomCode}` }, (payload: any) => {
        const newRoom = payload.new as Room;
        
        // Sound triggers on state changes
        if (newRoom.current_strikes > (room?.current_strikes || 0)) playSound('buzzer');
        if (newRoom.revealed_answers_indices.length > (room?.revealed_answers_indices.length || 0)) playSound('ding');
        
        setRoom(newRoom);
      })
      .subscribe();

    const playersChannel = supabase
      .channel(`players:${roomCode}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_code=eq.${roomCode}` }, () => {
        fetchPlayers();
      })
      .subscribe();

    const fetchRoom = async () => {
      const { data } = await supabase.from('rooms').select('*').eq('code', roomCode).single();
      if (data) {
        setRoom(data);
        if (data.current_round_question_id) {
          const q = questions.find(q => q.id === data.current_round_question_id);
          setActiveQuestion(q || null);
        }
      }
    };

    const fetchPlayers = async () => {
      const { data } = await supabase.from('players').select('*').eq('room_code', roomCode);
      if (data) setPlayers(data);
    };

    fetchRoom();
    fetchPlayers();

    return () => {
      supabase.removeChannel(roomChannel);
      supabase.removeChannel(playersChannel);
    };
  }, [roomCode, questions, isConfigured]);

  // Timer logic
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

  // Handlers
  const handleAdminLogin = () => {
    if (adminPin === '2985') {
      setPage('ADMIN_DASHBOARD');
    } else {
      alert('Code PIN incorrect');
    }
  };

  const createRoom = async () => {
    const code = `DZ-${Math.floor(10 + Math.random() * 90)}`;
    const { data, error } = await supabase.from('rooms').insert([{ code, status: 'LOBBY' }]).select().single();
    if (data) {
      setRoomCode(code);
      setRoom(data);
    } else {
      console.error(error);
    }
  };

  const joinRoom = async () => {
    if (!nickname || !roomCode) return;
    const { data: roomExists } = await supabase.from('rooms').select('*').eq('code', roomCode.toUpperCase()).single();
    if (!roomExists) return alert("Salle introuvable");

    const { data: player, error } = await supabase.from('players').insert([
      { room_code: roomCode.toUpperCase(), nickname, team: 'SPECTATOR' }
    ]).select().single();

    if (player) {
      setCurrentPlayer(player);
      setRoomCode(roomCode.toUpperCase());
      setPage('GAME_VIEW');
    }
  };

  const updateRoom = async (updates: Partial<Room>) => {
    if (!roomCode) return;
    await supabase.from('rooms').update(updates).eq('code', roomCode);
  };

  const setNextQuestion = async () => {
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
    if (!room || room.revealed_answers_indices.includes(index)) return;
    const newRevealed = [...room.revealed_answers_indices, index];
    const points = activeQuestion?.answers[index].points || 0;
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
    await supabase.from('players').update({ team }).eq('id', playerId);
  };

  const startTimer = async (seconds: number) => {
    const endsAt = new Date(Date.now() + seconds * 1000).toISOString();
    await updateRoom({ timer_ends_at: endsAt });
    playSound('timer');
  };

  if (!isConfigured) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-8">
        <AlertTriangle size={64} className="text-yellow-500 mb-6" />
        <h1 className="text-3xl font-anton mb-4">CONFIGURATION REQUISE</h1>
        <p className="text-slate-400 text-center max-w-md">
          Les variables d'environnement Supabase ne sont pas configurées. 
          Veuillez ajouter <code>NEXT_PUBLIC_SUPABASE_URL</code> et <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="p-4 flex justify-between items-center bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-2">
          <Crown className="text-yellow-400" />
          <h1 className="font-anton text-2xl tracking-tighter text-yellow-400">FAMILLE DZ EN OR</h1>
        </div>
        
        {page === 'ADMIN_DASHBOARD' && (
          <button onClick={() => setPage('JOIN')} className="bg-red-600 hover:bg-red-700 p-2 rounded-full transition-colors">
            <LogOut size={20} />
          </button>
        )}
        {page === 'GAME_VIEW' && (
          <button onClick={() => setPage('JOIN')} className="bg-slate-700 hover:bg-slate-600 px-4 py-1 rounded-full text-sm font-bold">
            Quitter
          </button>
        )}
      </header>

      <main className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* JOIN PAGE */}
          {page === 'JOIN' && (
            <motion.div 
              key="join"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center p-8 mt-12 max-w-md mx-auto"
            >
              <div className="bg-slate-800/80 p-8 rounded-3xl border border-white/20 shadow-2xl w-full">
                <h2 className="text-3xl font-anton text-center mb-8 italic">REJOINDRE LE LIVE</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 uppercase font-bold ml-2">Ton Pseudo</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Ryad93"
                      className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 focus:ring-2 focus:ring-yellow-400 outline-none"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase font-bold ml-2">Code de la salle</label>
                    <input 
                      type="text" 
                      placeholder="DZ-..."
                      className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 focus:ring-2 focus:ring-yellow-400 outline-none uppercase"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={joinRoom}
                    className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-black py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    C'EST PARTI ! <ArrowRight size={20} />
                  </button>
                </div>
              </div>
              <button 
                onClick={() => setPage('ADMIN_LOGIN')}
                className="mt-8 text-slate-400 hover:text-white flex items-center gap-2 text-sm"
              >
                <Settings size={16} /> Mode Animateur
              </button>
            </motion.div>
          )}

          {/* ADMIN LOGIN */}
          {page === 'ADMIN_LOGIN' && (
            <motion.div 
              key="admin_login"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center p-8 mt-12 max-w-md mx-auto"
            >
              <div className="bg-slate-800 p-8 rounded-3xl border border-white/20 shadow-2xl w-full text-center">
                <h2 className="text-3xl font-anton mb-8 italic">ACCÈS ANIMATEUR</h2>
                <input 
                  type="password" 
                  placeholder="CODE PIN"
                  maxLength={4}
                  className="w-full bg-slate-900 text-center text-4xl tracking-[1em] font-bold border border-white/10 rounded-xl p-4 focus:ring-2 focus:ring-yellow-400 outline-none mb-6"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                />
                <button 
                  onClick={handleAdminLogin}
                  className="w-full bg-white text-slate-900 font-bold py-4 rounded-xl"
                >
                  VALIDER
                </button>
              </div>
            </motion.div>
          )}

          {/* ADMIN DASHBOARD */}
          {page === 'ADMIN_DASHBOARD' && (
            <motion.div 
              key="admin_dash"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Left Column: Room Control */}
              <div className="lg:col-span-2 space-y-6">
                {!room ? (
                  <div className="bg-slate-800 p-12 rounded-3xl flex flex-col items-center justify-center border-2 border-dashed border-white/20">
                    <button onClick={createRoom} className="bg-yellow-500 text-slate-900 px-8 py-4 rounded-full font-black text-xl flex items-center gap-3">
                      CRÉER UNE SALLE <LogIn />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="bg-slate-800 p-6 rounded-3xl flex justify-between items-center border border-white/10">
                      <div>
                        <h3 className="text-slate-400 text-xs uppercase font-bold">Salle Active</h3>
                        <p className="text-3xl font-anton text-yellow-400">{room.code}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={setNextQuestion} className="bg-blue-600 px-4 py-2 rounded-lg font-bold">Prochaine Question</button>
                        <button onClick={() => updateRoom({ status: 'LOBBY' })} className="bg-red-600 px-4 py-2 rounded-lg font-bold">Lobby</button>
                      </div>
                    </div>

                    {activeQuestion && (
                      <div className="bg-slate-900 p-6 rounded-3xl border border-yellow-500/30">
                        <h2 className="text-xl font-bold mb-4">{activeQuestion.question_text}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          {activeQuestion.answers.map((ans, idx) => (
                            <button
                              key={idx}
                              disabled={room.revealed_answers_indices.includes(idx)}
                              onClick={() => revealAnswer(idx)}
                              className={`p-4 rounded-xl flex justify-between items-center border-2 transition-all ${
                                room.revealed_answers_indices.includes(idx)
                                  ? 'bg-white text-slate-900 border-white opacity-50'
                                  : 'bg-slate-800 border-white/10 hover:border-yellow-400'
                              }`}
                            >
                              <span className="font-bold">{ans.text}</span>
                              <span className="font-anton text-xl">{ans.points}</span>
                            </button>
                          ))}
                        </div>
                        
                        {/* Faults & Logic */}
                        <div className="flex flex-wrap gap-4 items-center justify-between border-t border-white/10 pt-6">
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-bold uppercase text-slate-400">Fautes:</span>
                            <div className="flex gap-2">
                              {Array.from({ length: 3 }).map((_, i) => (
                                <button
                                  key={i}
                                  onClick={addStrike}
                                  className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl font-black transition-all ${
                                    i < room.current_strikes ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-600'
                                  }`}
                                >
                                  X
                                </button>
                              ))}
                              <button onClick={resetStrikes} className="text-xs text-slate-400 hover:text-white underline">Reset</button>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => startTimer(60)} className="bg-slate-700 px-4 py-2 rounded-lg text-sm font-bold">60s</button>
                            <button onClick={() => startTimer(30)} className="bg-slate-700 px-4 py-2 rounded-lg text-sm font-bold">30s</button>
                            <button onClick={() => updateRoom({ timer_ends_at: null })} className="bg-red-900 px-4 py-2 rounded-lg text-sm font-bold">STOP</button>
                          </div>
                        </div>

                        {/* Hand management */}
                        <div className="grid grid-cols-2 gap-4 mt-6">
                           <button 
                            onClick={() => awardPoints('A')} 
                            className="bg-green-600 hover:bg-green-500 py-3 rounded-xl font-bold"
                          >
                             Attribuer à {room.team_a_name}
                           </button>
                           <button 
                            onClick={() => awardPoints('B')} 
                            className="bg-green-600 hover:bg-green-500 py-3 rounded-xl font-bold"
                          >
                             Attribuer à {room.team_b_name}
                           </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Right Column: Player Management */}
              <div className="bg-slate-800 p-6 rounded-3xl border border-white/10">
                <div className="flex items-center gap-2 mb-6">
                  <Users className="text-blue-400" />
                  <h3 className="font-anton text-xl uppercase tracking-wider">Joueurs ({players.length})</h3>
                </div>
                
                <div className="space-y-6">
                  {/* Team A */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase text-blue-400 flex items-center justify-between">
                      {room?.team_a_name}
                      <span className="text-white text-lg font-anton">{room?.team_a_score}</span>
                    </h4>
                    {players.filter(p => p.team === 'A').map(p => (
                      <div key={p.id} className="bg-slate-900/50 p-3 rounded-xl flex justify-between items-center group">
                        <span className="font-bold flex items-center gap-2">{p.nickname} {p.is_captain && <Star size={14} className="fill-yellow-400 text-yellow-400" />}</span>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                          <button onClick={() => movePlayer(p.id, 'SPECTATOR')} className="p-1 hover:text-red-400"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))}
                    <button className="w-full py-1 border-2 border-dashed border-white/10 rounded-lg text-xs text-slate-500 hover:bg-white/5 uppercase font-bold">Vide</button>
                  </div>

                  {/* Team B */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase text-red-400 flex items-center justify-between">
                      {room?.team_b_name}
                      <span className="text-white text-lg font-anton">{room?.team_b_score}</span>
                    </h4>
                    {players.filter(p => p.team === 'B').map(p => (
                      <div key={p.id} className="bg-slate-900/50 p-3 rounded-xl flex justify-between items-center group">
                        <span className="font-bold flex items-center gap-2">{p.nickname} {p.is_captain && <Star size={14} className="fill-yellow-400 text-yellow-400" />}</span>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                          <button onClick={() => movePlayer(p.id, 'SPECTATOR')} className="p-1 hover:text-red-400"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))}
                    <button className="w-full py-1 border-2 border-dashed border-white/10 rounded-lg text-xs text-slate-500 hover:bg-white/5 uppercase font-bold">Vide</button>
                  </div>

                  {/* Spectators / Unassigned */}
                  <div className="space-y-2 pt-6 border-t border-white/10">
                    <h4 className="text-xs font-black uppercase text-slate-500">En attente</h4>
                    {players.filter(p => p.team === 'SPECTATOR').map(p => (
                      <div key={p.id} className="bg-slate-900 p-3 rounded-xl flex justify-between items-center">
                        <span className="font-bold">{p.nickname}</span>
                        <div className="flex gap-2">
                          <button onClick={() => movePlayer(p.id, 'A')} className="bg-blue-600 px-2 py-1 rounded text-[10px] font-bold">Team A</button>
                          <button onClick={() => movePlayer(p.id, 'B')} className="bg-red-600 px-2 py-1 rounded text-[10px] font-bold">Team B</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* GAME VIEW (Public / Player) */}
          {page === 'GAME_VIEW' && room && (
            <motion.div 
              key="game_view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="relative min-h-full p-4 flex flex-col items-center"
            >
              {/* Scores Bar */}
              <div className="w-full max-w-5xl flex justify-between items-center mb-12">
                <div className="flex flex-col items-start">
                  <span className="text-blue-400 font-black uppercase text-xs tracking-widest">{room.team_a_name}</span>
                  <span className="text-6xl font-anton text-white drop-shadow-md">{room.team_a_score}</span>
                </div>
                
                {timeLeft !== null && (
                  <div className="flex flex-col items-center">
                    <div className={`text-4xl font-anton px-6 py-2 rounded-full border-4 shadow-xl ${
                      timeLeft <= 10 ? 'bg-red-600 border-white text-white animate-pulse' : 'bg-slate-800 border-yellow-500 text-yellow-400'
                    }`}>
                      {timeLeft}s
                    </div>
                  </div>
                )}

                <div className="flex flex-col items-end">
                  <span className="text-red-400 font-black uppercase text-xs tracking-widest">{room.team_b_name}</span>
                  <span className="text-6xl font-anton text-white drop-shadow-md">{room.team_b_score}</span>
                </div>
              </div>

              {room.status === 'LOBBY' ? (
                <div className="flex flex-col items-center justify-center mt-20 text-center">
                  <motion.div 
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="bg-yellow-500/10 border-2 border-yellow-500/50 p-12 rounded-full mb-8"
                  >
                    <Users size={64} className="text-yellow-400" />
                  </motion.div>
                  <h2 className="text-3xl font-anton uppercase mb-2">En attente de l'animateur</h2>
                  <p className="text-slate-400 max-w-sm">Dès que la partie commence, le plateau s'affichera ici en direct.</p>
                </div>
              ) : (
                <Board room={room} question={activeQuestion} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Persistent Call-to-action for Stream context */}
      {room && (
        <div className="fixed bottom-0 left-0 right-0 p-2 pointer-events-none flex justify-center z-50">
          <div className="bg-black/60 backdrop-blur-md px-4 py-1 rounded-full text-[10px] font-bold border border-white/10 uppercase tracking-tighter text-slate-400 pointer-events-auto">
            Room Code: <span className="text-yellow-400">{room.code}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
