
import React, { useState, useEffect, useCallback } from 'react';
import { GameState, QUESTIONS, Player } from './constants';
import { mockKv } from './services/mockKv';
import AnswerCard from './components/AnswerCard';
import StrikesDisplay from './components/StrikesDisplay';

// Simple Audio Player helper
const playBuzzer = () => {
  const audio = new Audio('https://www.myinstants.com/media/sounds/family-feud-buzzer.mp3');
  audio.play().catch(() => {});
};

const playCorrect = () => {
  const audio = new Audio('https://www.myinstants.com/media/sounds/family-feud-ding.mp3');
  audio.play().catch(() => {});
};

const App: React.FC = () => {
  const [view, setView] = useState<'LANDING' | 'ADMIN_LOGIN' | 'ADMIN_PANEL' | 'GAME_CLIENT'>('LANDING');
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [adminPassword, setAdminPassword] = useState('');

  // SWR replacement (Polling 1s)
  useEffect(() => {
    if (!roomCode) return;
    
    const interval = setInterval(async () => {
      const state = await mockKv.get(`room:${roomCode}`);
      if (state) {
        // Detect strike increase to play sound
        if (gameState && state.strikes > gameState.strikes) {
          playBuzzer();
        }
        // Detect revealed answers to play sound
        if (gameState && state.revealedAnswers.length > gameState.revealedAnswers.length) {
          playCorrect();
        }
        setGameState(state);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [roomCode, gameState]);

  const createRoom = async () => {
    const code = `DZ-${Math.floor(10 + Math.random() * 90)}`;
    const newState: GameState = {
      code,
      status: 'LOBBY',
      scores: { A: 0, B: 0 },
      strikes: 0,
      currentQuestionIndex: 0,
      revealedAnswers: [],
      timerEndsAt: null,
      activeTeam: null,
      players: [],
    };
    await mockKv.set(`room:${code}`, newState);
    setRoomCode(code);
    setGameState(newState);
    setView('ADMIN_PANEL');
  };

  const joinRoom = async () => {
    const state = await mockKv.get(`room:${roomCode}`);
    if (!state) {
      alert("Salle introuvable !");
      return;
    }
    const updatedPlayers = [...state.players, { name: playerName, team: 'SPECTATOR' as const, captain: false }];
    const newState = { ...state, players: updatedPlayers };
    await mockKv.set(`room:${roomCode}`, newState);
    setGameState(newState);
    setView('GAME_CLIENT');
  };

  const updateGameState = async (updates: Partial<GameState>) => {
    if (!gameState) return;
    const newState = { ...gameState, ...updates };
    await mockKv.set(`room:${gameState.code}`, newState);
    setGameState(newState);
  };

  const handleAdminLogin = () => {
    if (adminPassword === '2985') {
      setView('ADMIN_PANEL');
    } else {
      alert('Code erroné');
    }
  };

  // Views
  if (view === 'LANDING') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[url('https://picsum.photos/id/122/1600/900')] bg-cover bg-center">
        <div className="absolute inset-0 bg-blue-900/80 backdrop-blur-sm"></div>
        <div className="relative z-10 text-center max-w-md w-full">
          <h1 className="text-5xl font-bold mb-2 font-luxury gold-text drop-shadow-lg">Famille DZ en Or</h1>
          <p className="text-blue-200 mb-12 italic">Le show télé à la maison</p>
          
          <div className="bg-white/10 p-8 rounded-2xl border border-white/20 shadow-2xl backdrop-blur-md">
            <input 
              type="text" 
              placeholder="Ton Pseudo" 
              className="w-full p-4 mb-4 rounded-lg bg-white/10 border border-white/30 text-white placeholder-blue-200 outline-none focus:ring-2 focus:ring-[#bf953f]"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
            <input 
              type="text" 
              placeholder="Code Salle (ex: DZ-92)" 
              className="w-full p-4 mb-8 rounded-lg bg-white/10 border border-white/30 text-white placeholder-blue-200 outline-none focus:ring-2 focus:ring-[#bf953f]"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
            />
            
            <button 
              onClick={joinRoom}
              className="w-full p-4 gold-gradient text-blue-950 font-bold rounded-lg mb-4 hover:scale-105 transition-transform active:scale-95"
            >
              REJOINDRE LA PARTIE
            </button>
            <button 
              onClick={() => setView('ADMIN_LOGIN')}
              className="text-blue-200 text-sm underline opacity-70 hover:opacity-100"
            >
              Accès Animateur (Admin)
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'ADMIN_LOGIN') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-blue-950">
        <div className="bg-white/5 p-10 rounded-xl border border-[#bf953f]/30 max-w-sm w-full">
          <h2 className="text-2xl font-luxury gold-text mb-6 text-center">Cockpit Animateur</h2>
          <input 
            type="password" 
            placeholder="Code d'accès" 
            className="w-full p-4 mb-6 rounded bg-black/40 border border-white/20 text-white text-center text-xl"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
          />
          <button 
            onClick={handleAdminLogin}
            className="w-full p-4 gold-gradient text-blue-950 font-bold rounded"
          >
            CONNEXION
          </button>
          <button onClick={() => setView('LANDING')} className="w-full mt-4 text-gray-400">Retour</button>
        </div>
      </div>
    );
  }

  if (view === 'ADMIN_PANEL') {
    if (!gameState) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6">
          <h1 className="text-3xl font-luxury gold-text mb-8">Admin Dashboard</h1>
          <button onClick={createRoom} className="p-6 gold-gradient rounded-xl text-blue-900 font-bold text-2xl shadow-2xl">
            CRÉER UNE NOUVELLE SALLE
          </button>
        </div>
      );
    }

    const currentQuestion = QUESTIONS[gameState.currentQuestionIndex];

    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        {/* Header Admin */}
        <div className="p-4 bg-slate-900 border-b border-[#bf953f]/30 flex justify-between items-center">
          <div>
            <span className="text-[#bf953f] font-bold">ROOM: </span>
            <span className="text-xl font-mono">{gameState.code}</span>
          </div>
          <div className="flex space-x-6">
            <div className="text-center">
              <div className="text-xs text-blue-300">ÉQUIPE A</div>
              <div className="text-2xl font-bold">{gameState.scores.A}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-red-300">ÉQUIPE B</div>
              <div className="text-2xl font-bold">{gameState.scores.B}</div>
            </div>
          </div>
          <button onClick={() => { mockKv.delete(`room:${gameState.code}`); setGameState(null); }} className="bg-red-900/50 px-4 py-2 rounded text-xs border border-red-500">FERMER LA SALLE</button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Controls */}
          <div className="flex-1 p-8 overflow-y-auto">
            <div className="mb-8">
              <h3 className="text-sm text-gray-500 uppercase mb-2">Question Active</h3>
              <div className="bg-blue-900/20 border border-blue-500/30 p-6 rounded-xl">
                <p className="text-2xl font-semibold mb-4">{currentQuestion.question}</p>
                <div className="grid grid-cols-1 gap-4">
                  {currentQuestion.answers.map((ans, idx) => {
                    const isRevealed = gameState.revealedAnswers.includes(idx);
                    return (
                      <button 
                        key={idx}
                        onClick={() => {
                          if (!isRevealed) {
                            updateGameState({ revealedAnswers: [...gameState.revealedAnswers, idx] });
                          }
                        }}
                        className={`flex justify-between items-center p-4 rounded-lg border transition-all ${isRevealed ? 'bg-[#bf953f] text-blue-950 border-white' : 'bg-white/5 border-white/10 hover:border-[#bf953f]'}`}
                      >
                        <span className="font-bold">{ans.text}</span>
                        <span className="bg-black/20 px-3 py-1 rounded">{ans.points} pts</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <button 
                onClick={() => updateGameState({ strikes: (gameState.strikes + 1) % 4 })}
                className="bg-red-600 hover:bg-red-500 p-6 rounded-xl font-bold text-xl flex flex-col items-center justify-center shadow-lg"
              >
                <span>❌ FAUTE</span>
                <span className="text-sm opacity-70 mt-1">({gameState.strikes}/3)</span>
              </button>
              
              <button 
                onClick={() => updateGameState({ timerEndsAt: Date.now() + 60000 })}
                className="bg-blue-600 hover:bg-blue-500 p-6 rounded-xl font-bold text-xl flex flex-col items-center justify-center shadow-lg"
              >
                <span>⏱️ TIMER 60s</span>
              </button>

              <button 
                onClick={() => {
                   const nextIdx = (gameState.currentQuestionIndex + 1) % QUESTIONS.length;
                   updateGameState({ currentQuestionIndex: nextIdx, revealedAnswers: [], strikes: 0 });
                }}
                className="bg-green-600 hover:bg-green-500 p-6 rounded-xl font-bold text-xl flex flex-col items-center justify-center shadow-lg"
              >
                <span>➡️ SUIVANT</span>
              </button>
            </div>

            <div className="flex space-x-4">
               <button 
                onClick={() => {
                  const roundPoints = gameState.revealedAnswers.reduce((sum, idx) => sum + currentQuestion.answers[idx].points, 0);
                  updateGameState({ scores: { ...gameState.scores, A: gameState.scores.A + roundPoints }, revealedAnswers: [], strikes: 0 });
                }}
                className="flex-1 bg-blue-800 p-4 rounded-lg font-bold border border-blue-400"
               >
                 ATTRIBUER POINTS À A
               </button>
               <button 
                onClick={() => {
                  const roundPoints = gameState.revealedAnswers.reduce((sum, idx) => sum + currentQuestion.answers[idx].points, 0);
                  updateGameState({ scores: { ...gameState.scores, B: gameState.scores.B + roundPoints }, revealedAnswers: [], strikes: 0 });
                }}
                className="flex-1 bg-red-800 p-4 rounded-lg font-bold border border-red-400"
               >
                 ATTRIBUER POINTS À B
               </button>
            </div>
          </div>

          {/* Players Sidebar */}
          <div className="w-80 bg-slate-900 border-l border-white/10 p-4">
             <h3 className="font-luxury gold-text mb-4 border-b border-white/10 pb-2">Joueurs ({gameState.players.length})</h3>
             <div className="space-y-2">
                {gameState.players.map((p, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/5 p-2 rounded text-sm">
                    <span className="truncate flex-1">{p.name}</span>
                    <div className="flex space-x-1">
                      <button 
                        onClick={() => {
                          const newPlayers = [...gameState.players];
                          newPlayers[i].team = 'A';
                          updateGameState({ players: newPlayers });
                        }}
                        className={`w-6 h-6 rounded flex items-center justify-center ${p.team === 'A' ? 'bg-blue-500' : 'bg-gray-700'}`}
                      >A</button>
                      <button 
                        onClick={() => {
                          const newPlayers = [...gameState.players];
                          newPlayers[i].team = 'B';
                          updateGameState({ players: newPlayers });
                        }}
                        className={`w-6 h-6 rounded flex items-center justify-center ${p.team === 'B' ? 'bg-red-500' : 'bg-gray-700'}`}
                      >B</button>
                      <button 
                        onClick={() => {
                          const newPlayers = [...gameState.players];
                          newPlayers[i].team = 'SPECTATOR';
                          updateGameState({ players: newPlayers });
                        }}
                        className="w-6 h-6 bg-gray-600 rounded flex items-center justify-center"
                      >👀</button>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'GAME_CLIENT') {
    if (!gameState) return <div className="p-20 text-center">Chargement...</div>;

    const currentQuestion = QUESTIONS[gameState.currentQuestionIndex];
    const timeLeft = gameState.timerEndsAt ? Math.max(0, Math.floor((gameState.timerEndsAt - Date.now()) / 1000)) : 0;
    const roundTotal = gameState.revealedAnswers.reduce((sum, idx) => sum + currentQuestion.answers[idx].points, 0);

    return (
      <div className="min-h-screen bg-[#001529] overflow-hidden flex flex-col relative">
        <StrikesDisplay count={gameState.strikes} />
        
        {/* Top Header / Scoreboard */}
        <div className="flex justify-between items-stretch h-32 md:h-40 px-4 pt-4 gap-4">
          <div className="flex-1 bg-gradient-to-b from-blue-700 to-blue-900 rounded-2xl border-b-4 border-blue-400 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-white/30"></div>
            <span className="text-white/60 text-sm md:text-lg font-bold tracking-widest uppercase">Équipe A</span>
            <span className="text-5xl md:text-7xl font-bold font-luxury text-white">{gameState.scores.A}</span>
          </div>
          
          <div className="w-32 md:w-48 bg-gradient-to-b from-yellow-500 to-yellow-800 rounded-2xl border-b-4 border-[#bf953f] flex flex-col items-center justify-center shadow-2xl">
             <span className="text-blue-950 font-black text-3xl md:text-5xl">{roundTotal}</span>
             <span className="text-blue-950 text-xs md:text-sm font-bold uppercase">Points</span>
          </div>

          <div className="flex-1 bg-gradient-to-b from-red-700 to-red-900 rounded-2xl border-b-4 border-red-400 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-white/30"></div>
            <span className="text-white/60 text-sm md:text-lg font-bold tracking-widest uppercase">Équipe B</span>
            <span className="text-5xl md:text-7xl font-bold font-luxury text-white">{gameState.scores.B}</span>
          </div>
        </div>

        {/* Question Panel */}
        <div className="mt-8 px-6 text-center">
          <div className="inline-block px-8 py-3 bg-white/5 border-2 border-[#bf953f] rounded-full gold-text font-bold text-xl md:text-3xl font-luxury shadow-lg animate-pulse mb-6">
            {currentQuestion.theme}
          </div>
          <h2 className="text-2xl md:text-4xl font-bold text-white mb-8 px-4 leading-tight">
            « {currentQuestion.question} »
          </h2>
        </div>

        {/* Answers Grid */}
        <div className="flex-1 px-4 md:px-20 lg:px-40 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
            {currentQuestion.answers.map((ans, idx) => (
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

        {/* Timer Bar */}
        {gameState.timerEndsAt && timeLeft > 0 && (
          <div className="fixed bottom-0 left-0 w-full h-4 bg-gray-900">
            <div 
              className="h-full bg-blue-500 transition-all duration-1000" 
              style={{ width: `${(timeLeft / 60) * 100}%` }}
            ></div>
          </div>
        )}

        {/* Footer info */}
        <div className="absolute bottom-4 left-6 text-white/30 text-xs uppercase tracking-widest">
          Salla: {gameState.code} | Joueurs: {gameState.players.length}
        </div>
      </div>
    );
  }

  return null;
};

export default App;
