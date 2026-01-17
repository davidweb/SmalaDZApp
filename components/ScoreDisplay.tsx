
import React from 'react';
import { Team } from '../types';

interface ScoreDisplayProps {
  name: string;
  score: number;
  team: Team;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ name, score, team }) => {
  const isTeamA = team === Team.A;
  
  return (
    <div className={`flex flex-col ${isTeamA ? 'items-start' : 'items-end'} w-full`}>
      <div className={`text-[8px] md:text-xs font-black uppercase tracking-widest text-slate-500 mb-1 truncate w-full ${isTeamA ? 'text-left' : 'text-right'}`}>
        {name}
      </div>
      <div className={`relative w-full h-10 md:h-20 bg-slate-950 border-2 md:border-4 ${isTeamA ? 'border-green-600' : 'border-red-600'} rounded-lg md:rounded-2xl flex items-center justify-center overflow-hidden shadow-lg`}>
        <div className={`absolute inset-0 opacity-20 ${isTeamA ? 'bg-green-600' : 'bg-red-600'}`}></div>
        <span className="relative font-game text-xl md:text-5xl text-white gold-glow">{score}</span>
      </div>
    </div>
  );
};

export default ScoreDisplay;
