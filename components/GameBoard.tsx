
import React, { useState, useEffect, useRef } from 'react';
import { GameRoom, GameState, Team, User } from '../types';
import ScoreDisplay from './ScoreDisplay';
import AnswerCard from './AnswerCard';
import DuelDice from './DuelDice';

interface GameBoardProps {
  room: GameRoom;
  user: User;
  onRoll: (val: number) => void;
  onLogout: () => void;
}

const GameBoard: React.FC<GameBoardProps> = ({ room, user, onRoll, onLogout }) => {
  const [timeLeft, setTimeLeft] = useState(30);
  const [showStrikeOverlay, setShowStrikeOverlay] = useState(false);
  const prevStrikesRef = useRef(room.strikes);
  
  const currentQuestion = room.activeQuestions.find(q => q.id === room.currentQuestionId);

  useEffect(() => {
    if (room.strikes > prevStrikesRef.current && room.state !== GameState.FINISHED) {
      setShowStrikeOverlay(true);
      const timer = setTimeout(() => setShowStrikeOverlay(false), 1500);
      return () => clearTimeout(timer);
    }
    prevStrikesRef.current = room.strikes;
  }, [room.strikes, room.state]);

  useEffect(() => {
    let timer: number;
    if (room.state === GameState.STEAL) {
      setTimeLeft(30);
      timer = window.setInterval(() => {
        setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [room.state]);

  const stealingTeam = room.activeTeam === Team.A ? Team.B : Team.A;

  return (
    <div className="w-full max-w-5xl flex flex-col items-center relative game-board-container px-2 sm:px-4">
      {/* Bouton de sortie rapide mobile */}
      {!user.isHost && (
        <button 
          onClick={onLogout}
          className="md:hidden fixed top-4 right-4 bg-red-600/40 hover:bg-red-600 p-2 rounded-full text-white border border-red-500/50 transition-all z-[60] backdrop-blur-md"
          title="Quitter"
        >
          <i className="fas fa-sign-out-alt"></i>
        </button>
      )}

      {showStrikeOverlay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none animate-in fade-in zoom-in duration-200">
          <div className="flex gap-4 md:gap-8 bg-slate-950/60 w-full h-full items-center justify-center backdrop-blur-sm">
            {[...Array(room.strikes)].map((_, i) => (
              <i key={i} className="fas fa-times text-[80px] sm:text-[150px] md:text-[280px] text-red-600 drop-shadow-[0_0_30px_rgba(220,38,38,1)] animate-bounce" style={{ animationDelay: `${i * 100}ms` }}></i>
            ))}
          </div>
        </div>
      )}

      {/* Header Scores - Responsive Gap */}
      <div className="flex justify-between w-full mb-4 md:mb-8 px-2 items-end gap-2">
        <div className="relative flex-1 max-w-[120px] md:max-w-[200px]">
          <ScoreDisplay name={room.teamAName} score={room.teamAScore} team={Team.A} />
          {room.activeTeam === Team.A && (
            <div className="absolute -top-4 md:-top-6 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[8px] md:text-[10px] font-black px-2 md:px-3 py-0.5 md:py-1 rounded-full animate-pulse shadow-lg uppercase whitespace-nowrap">A LA MAIN</div>
          )}
        </div>
        
        <div className="flex flex-col items-center flex-1">
          <div className="bg-yellow-500 text-slate-950 font-game text-2xl md:text-5xl px-6 md:px-10 py-1 md:py-3 rounded-b-2xl md:rounded-b-3xl shadow-lg relative border-x-2 md:border-x-4 border-b-2 md:border-b-4 border-yellow-300">
            {room.roundScore}
            <div className="absolute -bottom-3 md:-bottom-4 left-1/2 -translate-x-1/2 text-[7px] md:text-[10px] font-black text-white uppercase bg-slate-950 px-2 md:px-3 py-0.5 rounded-full border border-yellow-500 tracking-tighter whitespace-nowrap">CUMUL</div>
          </div>
          
          <div className="mt-4 md:mt-8 flex gap-1.5 md:gap-3">
             {[...Array(3)].map((_, i) => (
               <div key={i} className={`w-8 h-8 md:w-12 md:h-12 border-2 md:border-4 rounded-lg md:rounded-xl flex items-center justify-center transition-all duration-300 ${i < room.strikes ? 'bg-red-600 border-red-400 scale-110 shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'bg-slate-800 border-slate-700 opacity-20'}`}>
                 <i className={`fas fa-times text-white text-lg md:text-2xl ${i < room.strikes ? 'opacity-100' : 'opacity-0'}`}></i>
               </div>
             ))}
          </div>
        </div>

        <div className="relative flex-1 max-w-[120px] md:max-w-[200px]">
          <ScoreDisplay name={room.teamBName} score={room.teamBScore} team={Team.B} />
          {room.activeTeam === Team.B && (
            <div className="absolute -top-4 md:-top-6 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[8px] md:text-[10px] font-black px-2 md:px-3 py-0.5 md:py-1 rounded-full animate-pulse shadow-lg uppercase whitespace-nowrap">A LA MAIN</div>
          )}
        </div>
      </div>

      {/* Main Container - Responsive Border and Padding */}
      <div className="w-full bg-slate-950 border-[6px] md:border-[10px] border-yellow-600 rounded-[2rem] md:rounded-[3rem] p-4 md:p-8 shadow-2xl relative overflow-hidden min-h-[400px] md:min-h-[520px] flex flex-col border-double">
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none grid grid-cols-8 grid-rows-8">
           {[...Array(64)].map((_, i) => <div key={i} className="border border-white"></div>)}
        </div>

        {room.state === GameState.LOBBY && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 md:space-y-6">
            <h2 className="text-3xl md:text-6xl font-game text-white uppercase tracking-tighter">PRÊT POUR LA MANCHE {room.currentQuestionId} ?</h2>
            <div className="bg-yellow-500/10 px-4 md:px-6 py-1 md:py-2 rounded-full border border-yellow-500/30">
               <p className="text-yellow-500 font-game text-lg md:text-2xl">SALON : {room.code}</p>
            </div>
            <p className="text-slate-500 text-[10px] md:text-sm font-black animate-pulse uppercase tracking-[0.2em]">En attente de l'animateur...</p>
          </div>
        )}

        {room.state === GameState.DUEL && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-8 md:space-y-12">
            <h2 className="text-4xl md:text-7xl font-game text-white gold-glow uppercase italic">FACE À FACE !</h2>
            <div className="flex flex-row items-center justify-center gap-4 md:gap-24">
               <DuelDice team={Team.A} value={room.diceResults[room.users.find(u => u.team === Team.A && u.isCaptain)?.id || '']} active={room.state === GameState.DUEL && user.isCaptain && user.team === Team.A && !room.diceResults[user.id]} onRoll={onRoll} />
               <div className="font-game text-3xl md:text-5xl text-yellow-500">VS</div>
               <DuelDice team={Team.B} value={room.diceResults[room.users.find(u => u.team === Team.B && u.isCaptain)?.id || '']} active={room.state === GameState.DUEL && user.isCaptain && user.team === Team.B && !room.diceResults[user.id]} onRoll={onRoll} />
            </div>
          </div>
        )}

        {(room.state === GameState.ROUND || room.state === GameState.STEAL) && currentQuestion && (
          <div className="space-y-4 md:space-y-8 flex-1 flex flex-col">
            <div className="bg-slate-900/80 backdrop-blur-sm p-4 md:p-6 rounded-2xl md:rounded-3xl border-2 border-yellow-500/20 text-center shadow-inner">
              <h2 className="text-xl md:text-5xl font-game text-white uppercase leading-tight">{currentQuestion.questionText}</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5 px-1">
              {currentQuestion.answers.map((ans, idx) => (
                <AnswerCard key={ans.id} index={idx + 1} answer={ans} revealed={ans.revealed} />
              ))}
            </div>

            {room.state === GameState.STEAL && (
              <div className="mt-auto bg-red-600 p-3 md:p-5 rounded-2xl md:rounded-[2rem] border-2 md:border-4 border-red-400 shadow-xl animate-bounce">
                <div className="flex justify-between items-center px-4 md:px-8">
                  <div className="flex flex-col">
                    <span className="text-white font-game text-sm md:text-xl opacity-80 uppercase tracking-tighter leading-none">Tentative de</span>
                    <span className="text-white font-game text-xl md:text-4xl uppercase">VOL : {stealingTeam}</span>
                  </div>
                  <div className="bg-slate-950 text-white font-game text-2xl md:text-5xl w-12 h-12 md:w-20 md:h-20 rounded-full flex items-center justify-center border-2 md:border-4 border-red-400">
                    {timeLeft}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {room.state === GameState.FINISHED && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 md:space-y-8">
            <h2 className="text-5xl md:text-8xl font-game text-yellow-500 gold-glow uppercase">PARTIE FINIE !</h2>
            <div className="flex gap-6 md:gap-12">
               <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black text-green-500 uppercase mb-2">Famille A</span>
                  <div className="bg-slate-900 p-4 md:p-8 rounded-2xl md:rounded-[2rem] border-2 md:border-4 border-green-600"><p className="text-white font-game text-3xl md:text-6xl">{room.teamAScore}</p></div>
               </div>
               <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black text-red-500 uppercase mb-2">Famille B</span>
                  <div className="bg-slate-900 p-4 md:p-8 rounded-2xl md:rounded-[2rem] border-2 md:border-4 border-red-400"><p className="text-white font-game text-3xl md:text-6xl">{room.teamBScore}</p></div>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameBoard;
