
import React from 'react';
import { Answer } from '../types';

interface AnswerCardProps {
  index: number;
  answer: Answer;
  revealed: boolean;
}

const AnswerCard: React.FC<AnswerCardProps> = ({ index, answer, revealed }) => {
  return (
    <div className="relative w-full h-12 md:h-20 perspective-1000">
      <div className={`relative w-full h-full transition-all duration-700 transform-style-3d ${revealed ? 'rotate-x-180' : ''}`}>
        {/* Face Cachée */}
        <div className="absolute inset-0 backface-hidden bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-slate-700 rounded-lg md:rounded-xl flex items-center px-3 md:px-4 shadow-lg">
          <div className="w-6 h-6 md:w-10 md:h-10 rounded-full bg-slate-950 border-2 border-yellow-500/50 flex items-center justify-center text-yellow-500 font-game text-sm md:text-2xl shadow-inner">
            {index}
          </div>
          <div className="flex-1 px-4 hidden sm:block">
             <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full w-1/4 bg-yellow-500/20 animate-pulse"></div>
             </div>
          </div>
        </div>

        {/* Face Révélée */}
        <div className="absolute inset-0 backface-hidden bg-gradient-to-b from-yellow-400 to-yellow-600 border-2 border-yellow-300 rounded-lg md:rounded-xl flex items-center justify-between px-3 md:px-6 shadow-2xl rotate-x-180">
          <span className="font-game text-lg md:text-3xl text-slate-900 uppercase truncate pr-2 drop-shadow-sm">
            {revealed ? answer.text : ""}
          </span>
          <div className="h-full flex items-center justify-center border-l-2 border-slate-900/20 pl-2 md:pl-4">
            <span className="font-game text-2xl md:text-4xl text-slate-950">{revealed ? answer.points : ""}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnswerCard;
