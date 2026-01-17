
import React, { useState, useRef } from 'react';
import { GameRoom, GameState, Team, User, Answer, Question } from '../types';
import SoundService from '../services/SoundService';
import GameBoard from './GameBoard';

interface AdminPanelProps {
  room: GameRoom;
  onAction: (type: string, payload: any) => void;
  isPaused: boolean;
  onTogglePause: () => void;
  onLogout: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ room, onAction, isPaused, onTogglePause, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'GAME' | 'TEAMS' | 'MONITOR'>('GAME');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentQuestion = room.activeQuestions.find(q => q.id === room.currentQuestionId);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        
        // Validation et transformation du format JSON utilisateur vers format GameRoom
        const formattedQuestions: Question[] = json.map((q: any, idx: number) => ({
          id: idx + 1,
          theme: q.theme || "Thème inconnu",
          questionText: q.question || q.questionText,
          answers: q.answers.map((a: any, aIdx: number) => ({
            id: aIdx + 1,
            text: a.text,
            points: a.points,
            revealed: false
          }))
        }));

        if (confirm(`Voulez-vous charger ce quiz de ${formattedQuestions.length} questions ? Cela réinitialisera la partie actuelle.`)) {
          onAction('LOAD_CUSTOM_QUIZ', { questions: formattedQuestions });
          alert("Quiz chargé avec succès !");
        }
      } catch (err) {
        alert("Erreur lors de la lecture du fichier JSON. Vérifiez le format.");
        console.error(err);
      }
    };
    reader.readAsText(file);
    // Reset l'input pour permettre de re-charger le même fichier si besoin
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="bg-slate-900 p-4 rounded-2xl border-2 border-yellow-500/30 shadow-lg">
        <div className="flex justify-between items-center mb-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Contrôle Animateur</span>
            <span className="text-xs font-bold text-white uppercase">{room.code}</span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={onTogglePause} 
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isPaused ? 'bg-green-600 shadow-lg shadow-green-900/40' : 'bg-slate-800'}`}
              title={isPaused ? "Reprendre" : "Pause"}
            >
              <i className={`fas fa-${isPaused ? 'play text-[10px]' : 'pause text-[10px]'}`}></i>
            </button>
            <button 
              onClick={() => { if(confirm("Voulez-vous réinitialiser la manche et les scores ?")) onAction('RESET_GAME', {}); }}
              className="w-10 h-10 bg-slate-800 hover:bg-red-600 rounded-xl flex items-center justify-center transition-all border border-slate-700"
              title="Reset"
            >
              <i className="fas fa-rotate text-[10px]"></i>
            </button>
            <button 
              onClick={(e) => {
                e.preventDefault();
                onLogout();
              }} 
              className="w-10 h-10 bg-red-900/30 hover:bg-red-600 rounded-xl flex items-center justify-center transition-all text-white border border-red-500/40"
              title="Fermer la session animateur"
            >
              <i className="fas fa-power-off text-[10px]"></i>
            </button>
          </div>
        </div>
      </div>

      <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800">
        {(['GAME', 'TEAMS', 'MONITOR'] as const).map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)} 
            className={`flex-1 py-2 text-[9px] font-black rounded-lg transition-all ${activeTab === tab ? 'bg-slate-800 text-yellow-500 shadow-inner' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {tab === 'GAME' ? 'COMMANDES' : tab === 'TEAMS' ? 'JOUEURS' : 'MONITEUR'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-hide">
        {activeTab === 'GAME' && (
          <div className="space-y-4">
            {/* Import JSON Section */}
            <div className="p-3 bg-slate-900/50 rounded-xl border border-dashed border-slate-700 space-y-2">
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest px-1">Quiz Personnalisé</p>
              <input 
                type="file" 
                accept=".json" 
                onChange={handleFileUpload} 
                ref={fileInputRef}
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black rounded-lg flex items-center justify-center gap-2 transition-all border border-slate-600"
              >
                <i className="fas fa-file-import text-yellow-500"></i> IMPORTER QUIZ JSON
              </button>
            </div>

            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest px-1">Prise de main</p>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => onAction('SET_ACTIVE_TEAM', { team: Team.A })}
                  className={`p-2 rounded-lg text-[10px] font-black border-2 transition-all ${room.activeTeam === Team.A ? 'bg-green-600 border-green-400 text-white' : 'bg-slate-800 border-transparent text-slate-500'}`}
                >
                  MAIN À FAMILLE A
                </button>
                <button 
                  onClick={() => onAction('SET_ACTIVE_TEAM', { team: Team.B })}
                  className={`p-2 rounded-lg text-[10px] font-black border-2 transition-all ${room.activeTeam === Team.B ? 'bg-red-600 border-red-400 text-white' : 'bg-slate-800 border-transparent text-slate-500'}`}
                >
                  MAIN À FAMILLE B
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest px-1">Flux de jeu</p>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => onAction('START_DUEL', {})} 
                  className={`p-3 rounded-xl text-[10px] font-black transition-all ${room.state === GameState.LOBBY ? 'bg-blue-600 hover:bg-blue-500' : 'bg-slate-800 opacity-50'}`}
                >
                  <i className="fas fa-dice mr-1"></i> DUEL
                </button>
                <button 
                  onClick={() => onAction('START_ROUND', {})} 
                  disabled={room.activeTeam === Team.NONE}
                  className={`p-3 rounded-xl text-[10px] font-black transition-all ${room.state === GameState.DUEL && room.activeTeam !== Team.NONE ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-800 opacity-50'}`}
                >
                  <i className="fas fa-play mr-1"></i> DÉBUT Q.
                </button>
              </div>
            </div>

            {currentQuestion && (room.state === GameState.ROUND || room.state === GameState.STEAL) && (
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <p className="text-[9px] text-slate-500 font-black uppercase">Réponses à dévoiler</p>
                    <span className="text-[8px] text-yellow-500 font-bold uppercase">Main : Famille {room.activeTeam}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {currentQuestion.answers.map(ans => (
                    <button 
                      key={ans.id} 
                      onClick={() => onAction('REVEAL_ANSWER', { answerId: ans.id })}
                      disabled={ans.revealed}
                      className={`w-full p-3 rounded-xl text-left border flex justify-between items-center transition-all ${ans.revealed ? 'opacity-30 bg-slate-950 border-transparent shadow-inner' : 'bg-slate-800 border-slate-700 hover:border-yellow-500 active:scale-[0.98]'}`}
                    >
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-white uppercase">{ans.text}</span>
                        <span className="text-[10px] text-yellow-500 font-game">{ans.points} PTS</span>
                      </div>
                      <i className={`fas fa-${ans.revealed ? 'check-circle text-emerald-500' : 'eye text-slate-600'}`}></i>
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => onAction('ADD_STRIKE', {})} 
                  className={`w-full p-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-lg transition-all active:translate-y-0.5 ${room.state === GameState.STEAL ? 'bg-orange-700 hover:bg-orange-600' : 'bg-red-600 hover:bg-red-500'}`}
                >
                  <i className="fas fa-times-circle text-lg"></i> 
                  {room.state === GameState.STEAL ? 'VOL ÉCHOUÉ (POINTS À ORIGINE)' : 'SIGNALER FAUTE (X)'}
                </button>
              </div>
            )}
            
            {(room.state === GameState.ROUND || room.state === GameState.STEAL) && (
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                <p className="text-[9px] text-slate-500 font-black uppercase">Terminaison manuelle</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => onAction('END_ROUND', { winnerTeam: Team.A })} className="bg-green-700 hover:bg-green-600 p-3 rounded-xl text-[10px] font-black border-b-4 border-green-900">FORCER WIN A</button>
                  <button onClick={() => onAction('END_ROUND', { winnerTeam: Team.B })} className="bg-red-700 hover:bg-red-600 p-3 rounded-xl text-[10px] font-black border-b-4 border-red-900">FORCER WIN B</button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'TEAMS' && (
          <div className="space-y-2">
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest px-1">Gestion des familles</p>
            {room.users.filter(u => !u.isHost).map(u => (
              <div key={u.id} className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex justify-between items-center group hover:border-yellow-500/50">
                 <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">{u.nickname}</span>
                    <span className={`text-[8px] uppercase font-black ${u.team === Team.A ? 'text-green-500' : u.team === Team.B ? 'text-red-500' : 'text-slate-600'}`}>
                      {u.team === Team.NONE ? 'Spectateur' : 'Famille ' + u.team}
                    </span>
                 </div>
                 <div className="flex items-center gap-1.5">
                    <button onClick={() => onAction('JOIN_TEAM', { userId: u.id, team: Team.A })} className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${u.team === Team.A ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-500'}`}>A</button>
                    <button onClick={() => onAction('JOIN_TEAM', { userId: u.id, team: Team.B })} className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${u.team === Team.B ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-500'}`}>B</button>
                    <button onClick={() => onAction('DISCONNECT_USER', { userId: u.id })} className="w-8 h-8 rounded-lg bg-slate-800 text-red-500 hover:bg-red-900/40 border border-transparent hover:border-red-500/50">
                      <i className="fas fa-user-minus text-[10px]"></i>
                    </button>
                 </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'MONITOR' && (
          <div className="relative rounded-2xl border-4 border-slate-800 bg-slate-950 overflow-hidden shadow-2xl h-[450px]">
             <div className="absolute top-0 left-0 w-full bg-red-600/90 py-1 text-center z-50">
                <span className="text-[8px] font-black text-white uppercase tracking-[0.2em] animate-pulse">● VUE JOUEURS EN DIRECT</span>
             </div>
             <div className="pointer-events-none scale-[0.45] origin-top h-[1000px] w-[1000px] absolute left-1/2 -translate-x-1/2 top-8">
                <GameBoard room={room} user={{isHost: false} as any} onRoll={() => {}} onLogout={() => {}} />
             </div>
          </div>
        )}
      </div>

      <div className="p-3 bg-slate-900 rounded-xl grid grid-cols-3 gap-2 border-t border-slate-800">
        <button onClick={() => SoundService.play('ding')} className="bg-slate-800 hover:bg-yellow-500/20 py-2 rounded-lg text-[9px] font-black text-slate-400 hover:text-yellow-500 border border-slate-700">DING</button>
        <button onClick={() => SoundService.play('buzzer')} className="bg-slate-800 hover:bg-red-500/20 py-2 rounded-lg text-[9px] font-black text-slate-400 hover:text-red-500 border border-slate-700">BUZZ</button>
        <button onClick={() => SoundService.play('tada')} className="bg-slate-800 hover:bg-emerald-500/20 py-2 rounded-lg text-[9px] font-black text-slate-400 hover:text-emerald-500 border border-slate-700">TADA</button>
      </div>
    </div>
  );
};

export default AdminPanel;
