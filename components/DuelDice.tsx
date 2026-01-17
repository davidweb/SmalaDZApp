
import React, { useState } from 'react';
import { Team } from '../types';

interface DuelDiceProps {
  team: Team;
  value: number | undefined;
  active: boolean;
  onRoll: (val: number) => void;
}

const DuelDice: React.FC<DuelDiceProps> = ({ team, value, active, onRoll }) => {
  const [rolling, setRolling] = useState(false);

  const handleRoll = () => {
    if (!active || rolling) return;
    setRolling(true);
    
    // Animation simulation
    let count = 0;
    const interval = setInterval(() => {
      count++;
      if (count > 10) {
        clearInterval(interval);
        const finalVal = Math.floor(Math.random() * 6) + 1;
        setRolling(false);
        onRoll(finalVal);
      }
    }, 100);
  };

  const getDots = (num: number) => {
    switch (num) {
      case 1: return <div className="bg-slate-900 w-3 h-3 rounded-full"></div>;
      case 2: return <><div className="bg-slate-900 w-3 h-3 rounded-full absolute top-2 right-2"></div><div className="bg-slate-900 w-3 h-3 rounded-full absolute bottom-2 left-2"></div></>;
      case 3: return <><div className="bg-slate-900 w-3 h-3 rounded-full absolute top-2 right-2"></div><div className="bg-slate-900 w-3 h-3 rounded-full"></div><div className="bg-slate-900 w-3 h-3 rounded-full absolute bottom-2 left-2"></div></>;
      case 4: return <><div className="bg-slate-900 w-3 h-3 rounded-full absolute top-2 left-2"></div><div className="bg-slate-900 w-3 h-3 rounded-full absolute top-2 right-2"></div><div className="bg-slate-900 w-3 h-3 rounded-full absolute bottom-2 left-2"></div><div className="bg-slate-900 w-3 h-3 rounded-full absolute bottom-2 right-2"></div></>;
      case 5: return <><div className="bg-slate-900 w-3 h-3 rounded-full absolute top-2 left-2"></div><div className="bg-slate-900 w-3 h-3 rounded-full absolute top-2 right-2"></div><div className="bg-slate-900 w-3 h-3 rounded-full"></div><div className="bg-slate-900 w-3 h-3 rounded-full absolute bottom-2 left-2"></div><div className="bg-slate-900 w-3 h-3 rounded-full absolute bottom-2 right-2"></div></>;
      case 6: return <><div className="bg-slate-900 w-3 h-3 rounded-full absolute top-2 left-2"></div><div className="bg-slate-900 w-3 h-3 rounded-full absolute top-2 right-2"></div><div className="bg-slate-900 w-3 h-3 rounded-full absolute top-1/2 left-2 -translate-y-1/2"></div><div className="bg-slate-900 w-3 h-3 rounded-full absolute top-1/2 right-2 -translate-y-1/2"></div><div className="bg-slate-900 w-3 h-3 rounded-full absolute bottom-2 left-2"></div><div className="bg-slate-900 w-3 h-3 rounded-full absolute bottom-2 right-2"></div></>;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className={`text-sm font-bold uppercase tracking-widest ${team === Team.A ? 'text-green-500' : 'text-red-500'}`}>
        {team === Team.A ? 'Famille A' : 'Famille B'}
      </div>
      
      <div 
        className={`w-20 h-20 bg-white rounded-2xl flex items-center justify-center relative shadow-xl transform transition-all duration-300 ${rolling ? 'animate-bounce' : ''} ${value ? 'rotate-12' : ''}`}
      >
        {value ? getDots(value) : (
          <i className="fas fa-dice text-slate-300 text-4xl"></i>
        )}
      </div>

      {active && (
        <button 
          onClick={handleRoll}
          disabled={rolling}
          className={`px-6 py-2 rounded-full font-game text-xl shadow-lg transition-all active:scale-95 ${team === Team.A ? 'bg-green-600' : 'bg-red-600'} hover:brightness-110`}
        >
          LANCER 🎲
        </button>
      )}
    </div>
  );
};

export default DuelDice;
