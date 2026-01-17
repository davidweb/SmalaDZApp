
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState, QUESTIONS, Player, Question } from './constants';
import { mockKv } from './services/mockKv';
import AnswerCard from './components/AnswerCard';
import StrikesDisplay from './components/StrikesDisplay';

const ADMIN_CODE = '2985';

const playSound = (url: string) => {
  const audio = new Audio(url);
  audio.play().catch(() => {});
};

const BUZZ_URL = 'https://www.myinstants.com/media/sounds/family-feud-buzzer.mp3';
const DING_URL = 'https://www.myinstants.com/media/sounds/family-feud-ding.mp3';

const App: React.FC = () => {
  const [view, setView] = useState<'LANDING' | 'ADMIN_LOGIN' | 'ADMIN_PANEL' | 'GAME_CLIENT'>('LANDING');
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  
  const prevStateRef = useRef<GameState | null>(null);

  // Sync / Polling
  useEffect(() => {
    if (!roomCode) return;
    const interval = setInterval(async () => {
      const state = await mockKv.get(`room:${roomCode}`);
      if (state) {
        // Sound detection logic
        if (prevStateRef.current) {
          if (state.strikes > prevStateRef.current.strikes) playSound(BUZZ_URL);
          if (state.revealedAnswers.length > prevStateRef.current.revealedAnswers.length) playSound(DING_URL);
        }
        setGameState(state);
        prevStateRef.current = state;
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [roomCode]);

  // Logic Handlers
  const updateRemoteState = async (updates: Partial<GameState>) => {
    if (!gameState) return;
    const newState = { ...gameState, ...updates };
    await mockKv.set(`room:${gameState.code}`, newState);
    setGameState(newState);
  };

  const createRoom = async () => {
    const code = `DZ-${Math.floor(10 + Math.random() * 89)}`;
    const initialState: GameState = {
      code,
      status: 'LOBBY',
      scores: { A: 0, B: 0 },
      roundPoints: 0,
      strikes: 0,
      currentQuestionIndex: 0,
      revealedAnswers: [],
      timerEndsAt: null,
      activeTeam: null,
      originalTeam: null,
      players: [],
      dice: { A: null, B: null }
    };
    await mockKv.set(`room:${code}`, initialState);
    setRoomCode(code);
    setGameState(initialState);
    setView('ADMIN_PANEL');
  };

  const joinRoom = async () => {
    if (!playerName || !roomCode) return alert("Pseudo et Code requis");
    const state = await mockKv.get(`room:${roomCode}`);
    if (!state) return alert("Salle non trouvée");
    
    const newPlayer: Player = {
      id: Math.random().toString(36).substr(2, 9),
      name: playerName,
      team: 'SPECTATOR',
      isCaptain: false,
      stats: { correctAnswers: 0 }
    };
    
    await updateRemoteState({ players: [...state.players, newPlayer] });
    setGameState(state);
    setView('GAME_CLIENT');
  };

  const handleStrike = async () => {
    if (!gameState) return;
    const newStrikes = gameState.strikes + 1;
    
    if (gameState.status === 'STEAL') {
      // Stealing team failed: Original team gets all points
      const winner = gameState.originalTeam === 'A' ? 'A' : 'B';
      const updatedScores = { ...gameState.scores };
      updatedScores[winner] += gameState.roundPoints;
      
      await updateRemoteState({ 
        strikes: 0, 
        roundPoints: 0, 
        scores: updatedScores, 
        status: 'FINISHED',
        activeTeam: null
      });
    } else {
      // Normal round strikes
      if (newStrikes >= 3) {
        // Switch to steal phase
        await updateRemoteState({ 
          strikes: 3, 
          status: 'STEAL', 
          activeTeam: gameState.activeTeam === 'A' ? 'B' : 'A',
          timerEndsAt: Date.now() + 60000
        });
      } else {
        await updateRemoteState({ strikes: newStrikes });
      }
    }
  };

  const handleAnswerReveal = async (index: number) => {
    if (!gameState || gameState.revealedAnswers.includes(index)) return;
    
    const currentQuestion = QUESTIONS[gameState.currentQuestionIndex];
    const points = currentQuestion.answers[index].points;
    const newRevealed = [...gameState.revealedAnswers, index];
    const newRoundPoints = gameState.roundPoints + points;

    if (gameState.status === 'STEAL') {
      // Steal successful: Active team (thieves) gets everything
      const winner = gameState.activeTeam!;
      const updatedScores = { ...gameState.scores };
      updatedScores[winner] += newRoundPoints;
      
      await updateRemoteState({
        revealedAnswers: newRevealed,
        roundPoints: 0,
        scores: updatedScores,
        status: 'FINISHED',
        activeTeam: null
      });
    } else {
      // Normal reveal
      await updateRemoteState({ 
        revealedAnswers: newRevealed, 
        roundPoints: newRoundPoints 
      });
      
      // Auto-win if all answers found
      if (newRevealed.length === currentQuestion.answers.length) {
        const winner = gameState.activeTeam!;
        const updatedScores = { ...gameState.scores };
        updatedScores[winner] += newRoundPoints;
        await updateRemoteState({ status: 'FINISHED', scores: updatedScores, roundPoints: 0 });
      }
    }
  };

  const handleRollDice = async (team: 'A' | 'B') => {
    if (!gameState || gameState.status !== 'DUEL') return;
    const roll = Math.floor(Math.random() * 6) + 1;
    const newDice = { ...gameState.dice, [team]: roll };
    
    let updates: Partial<GameState> = { dice: newDice };
    
    if (newDice.A !== null && newDice.B !== null) {
      if (newDice.A > newDice.B) {
        updates.activeTeam = 'A';
        updates.originalTeam = 'A';
        updates.status = 'ROUND';
      } else if (newDice.B > newDice.A) {
        updates.activeTeam = 'B';
        updates.originalTeam = 'B';
        updates.status = 'ROUND';
      } else {
        // Draw: reset dice
        updates.dice = { A: null, B: null };
      }
    }
    await updateRemoteState(updates);
  };

  // Render Logic
  if (view === 'LANDING') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#001529]">
        <div className="max-w-md w-full bg-white/5 p-8 rounded-3xl border border-[#bf953f]/30 backdrop-blur-md shadow-2xl text-center">
          <h1 className="text-4xl font-luxury gold-text mb-2">Famille DZ en Or</h1>
          <p className="text-blue-200 mb-10 text-sm tracking-[0.2em] uppercase">Vercel Edition</p>
          <input 
            className="w-full bg-black/30 border border-white/10 p-4 rounded-xl text-white mb-4"
            placeholder="Pseudo" value={playerName} onChange={e => setPlayerName(e.target.value)}
          />
          <input 
            className="w-full bg-black/30 border border-white/10 p-4 rounded-xl text-white mb-8"
            placeholder="Code Salle" value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())}
          />
          <button onClick={joinRoom} className="w-full gold-gradient p-4 rounded-xl text-blue-950 font-bold mb-4">REJOINDRE</button>
          <button onClick={() => setView('ADMIN_LOGIN')} className="text-xs text-blue-300 underline opacity-50">Admin</button>
        </div>
      </div>
    );
  }

  if (view === 'ADMIN_LOGIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="bg-white/5 p-8 rounded-xl border border-[#bf953f]/30 text-center">
          <h2 className="text-xl font-luxury gold-text mb-6">Accès Régie</h2>
          <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="w-full p-3 bg-black/40 rounded border border-white/20 text-white mb-4 text-center text-2xl" />
          <button onClick={() => adminPassword === ADMIN_CODE ? (gameState ? setView('ADMIN_PANEL') : createRoom()) : alert('Wrong')} className="w-full gold-gradient p-3 rounded font-bold text-blue-900">ENTRER</button>
        </div>
      </div>
    );
  }

  if (view === 'ADMIN_PANEL' && gameState) {
    const q = QUESTIONS[gameState.currentQuestionIndex];
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col font-sans">
        <header className="p-4 bg-slate-950 border-b border-[#bf953f]/20 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <span className="gold-text font-bold">{gameState.code}</span>
            <span className="bg-blue-600 px-2 py-1 rounded text-xs">{gameState.status}</span>
          </div>
          <div className="flex space-x-8">
            <div className="text-center"><div className="text-[10px] text-blue-400">TEAM A</div><div className="text-xl font-bold">{gameState.scores.A}</div></div>
            <div className="text-center font-bold text-[#bf953f]"><div className="text-[10px]">ROUND</div><div className="text-xl">{gameState.roundPoints}</div></div>
            <div className="text-center"><div className="text-[10px] text-red-400">TEAM B</div><div className="text-xl font-bold">{gameState.scores.B}</div></div>
          </div>
          <button onClick={() => updateRemoteState({ status: 'DUEL', strikes: 0, revealedAnswers: [], roundPoints: 0, dice: { A: null, B: null } })} className="bg-orange-600 px-3 py-1 rounded text-xs font-bold">START DUEL</button>
        </header>

        <main className="flex-1 p-6 grid grid-cols-12 gap-6 overflow-hidden">
          <div className="col-span-8 space-y-6">
            <section className="bg-black/20 p-6 rounded-2xl border border-white/5">
              <h3 className="text-xs text-gray-400 uppercase mb-4">Pilotage Question</h3>
              <p className="text-2xl font-bold mb-6">{q.question}</p>
              <div className="grid grid-cols-1 gap-2">
                {q.answers.map((ans, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => handleAnswerReveal(idx)}
                    className={`flex justify-between p-4 rounded-lg border ${gameState.revealedAnswers.includes(idx) ? 'bg-[#bf953f] text-blue-950 border-white' : 'bg-white/5 border-white/10'}`}
                  >
                    <span className="font-bold">{idx + 1}. {ans.text}</span>
                    <span className="opacity-70">{ans.points} pts</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-3 gap-4">
              <button onClick={handleStrike} className="bg-red-600 h-24 rounded-xl flex flex-col items-center justify-center shadow-lg font-black text-2xl">
                <span>❌ FAUTE</span>
                <span className="text-xs opacity-60">({gameState.strikes}/3)</span>
              </button>
              <button onClick={() => updateRemoteState({ status: 'ROUND', activeTeam: gameState.activeTeam === 'A' ? 'B' : 'A' })} className="bg-blue-600 h-24 rounded-xl font-bold">FLIP TEAM</button>
              <button onClick={() => {
                const next = (gameState.currentQuestionIndex + 1) % QUESTIONS.length;
                updateRemoteState({ currentQuestionIndex: next, revealedAnswers: [], strikes: 0, status: 'LOBBY', roundPoints: 0 });
              }} className="bg-green-600 h-24 rounded-xl font-bold">PROCHAINE Q</button>
            </section>
          </div>

          <aside className="col-span-4 bg-black/40 p-4 rounded-2xl border border-white/5 overflow-y-auto">
            <h3 className="text-xs text-gray-400 uppercase mb-4">Joueurs Connectés</h3>
            <div className="space-y-2">
              {gameState.players.map((p, i) => (
                <div key={i} className="bg-white/5 p-3 rounded flex items-center justify-between text-sm">
                  <span className="truncate">{p.name}</span>
                  <div className="flex space-x-1">
                    <button onClick={() => {
                      const players = [...gameState.players];
                      players[i].team = 'A';
                      updateRemoteState({ players });
                    }} className={`w-6 h-6 rounded text-[10px] ${p.team === 'A' ? 'bg-blue-600' : 'bg-gray-700'}`}>A</button>
                    <button onClick={() => {
                      const players = [...gameState.players];
                      players[i].team = 'B';
                      updateRemoteState({ players });
                    }} className={`w-6 h-6 rounded text-[10px] ${p.team === 'B' ? 'bg-red-600' : 'bg-gray-700'}`}>B</button>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </main>
      </div>
    );
  }

  if (view === 'GAME_CLIENT' && gameState) {
    const q = QUESTIONS[gameState.currentQuestionIndex];
    
    // Player POV
    const currentPlayer = gameState.players.find(p => p.name === playerName);
    const isMyTurnToRoll = gameState.status === 'DUEL' && 
      ((currentPlayer?.team === 'A' && gameState.dice.A === null) || 
       (currentPlayer?.team === 'B' && gameState.dice.B === null));

    return (
      <div className="min-h-screen bg-[#001529] relative overflow-hidden flex flex-col">
        <StrikesDisplay count={gameState.strikes} />
        
        {/* Scoreboard Overlay */}
        <div className="flex justify-between items-center px-4 pt-4 md:px-10 md:pt-8 h-32">
          <div className={`flex-1 max-w-[200px] p-4 rounded-2xl border-b-4 ${gameState.activeTeam === 'A' ? 'bg-blue-600 border-blue-400 scale-110 shadow-[0_0_30px_rgba(59,130,246,0.5)]' : 'bg-blue-900/40 border-blue-900/20'} transition-all duration-500 text-center`}>
            <div className="text-[10px] uppercase tracking-tighter text-white/50 mb-1">Equipe A</div>
            <div className="text-4xl font-black font-luxury">{gameState.scores.A}</div>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="text-6xl font-black text-[#bf953f] drop-shadow-lg scale-125 animate-pulse">{gameState.roundPoints}</div>
            <div className="text-[10px] uppercase font-bold text-[#bf953f]">Cagnotte</div>
          </div>

          <div className={`flex-1 max-w-[200px] p-4 rounded-2xl border-b-4 ${gameState.activeTeam === 'B' ? 'bg-red-600 border-red-400 scale-110 shadow-[0_0_30px_rgba(239,68,68,0.5)]' : 'bg-red-900/40 border-red-900/20'} transition-all duration-500 text-center`}>
            <div className="text-[10px] uppercase tracking-tighter text-white/50 mb-1">Equipe B</div>
            <div className="text-4xl font-black font-luxury">{gameState.scores.B}</div>
          </div>
        </div>

        {/* Duel Overlay */}
        <AnimatePresence>
          {gameState.status === 'DUEL' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center">
              <h2 className="text-4xl font-luxury gold-text mb-12">LE DUEL DES CAPITAINES</h2>
              <div className="flex space-x-20 mb-20">
                <div className="text-center">
                  <div className="text-6xl mb-4">{gameState.dice.A || '?'}</div>
                  <div className="text-blue-400 font-bold">TEAM A</div>
                </div>
                <div className="text-center">
                  <div className="text-6xl mb-4">{gameState.dice.B || '?'}</div>
                  <div className="text-red-400 font-bold">TEAM B</div>
                </div>
              </div>
              {isMyTurnToRoll && (
                <button 
                  onClick={() => handleRollDice(currentPlayer!.team as 'A' | 'B')}
                  className="px-12 py-6 gold-gradient rounded-2xl text-blue-950 font-black text-3xl animate-bounce"
                >LANCER LE DÉ !</button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Board */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-20 mt-10">
          <div className="mb-8 text-center">
            <div className="inline-block px-6 py-2 border border-[#bf953f] rounded-full gold-text text-sm font-bold uppercase mb-4 tracking-widest">{q.theme}</div>
            <h1 className="text-2xl md:text-4xl font-bold text-center leading-tight">« {q.question} »</h1>
          </div>
          
          <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
            {q.answers.map((ans, idx) => (
              <AnswerCard 
                key={idx} 
                index={idx} 
                text={ans.text} 
                points={ans.points} 
                isRevealed={gameState.revealedAnswers.includes(idx)} 
              />
            ))}
          </div>
        </div>

        {/* Phase Notification */}
        <div className="h-16 flex items-center justify-center bg-black/40 border-t border-white/5">
          <div className="flex space-x-2">
             {[0, 1, 2].map(i => (
               <div key={i} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-black ${gameState.strikes > i ? 'bg-red-600 border-white text-white' : 'border-white/20 text-white/20'}`}>X</div>
             ))}
          </div>
          {gameState.status === 'STEAL' && (
            <div className="ml-8 text-red-500 font-bold animate-pulse uppercase tracking-widest">⚠️ TENTATIVE DE VOL ! ⚠️</div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default App;
