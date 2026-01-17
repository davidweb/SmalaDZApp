
import React from 'react';

interface AnswerCardProps {
  index: number;
  text: string;
  points: number;
  isRevealed: boolean;
}

const AnswerCard: React.FC<AnswerCardProps> = ({ index, text, points, isRevealed }) => {
  return (
    <div className="perspective w-full h-16 md:h-20 mb-3">
      <div className={`flip-card-inner relative w-full h-full text-center ${isRevealed ? 'flipped' : ''}`}>
        {/* FRONT (HIDDEN) */}
        <div className="flip-card-front absolute w-full h-full flex items-center justify-center bg-blue-900 border-2 border-blue-400 rounded-lg shadow-xl">
          <span className="text-3xl font-bold text-blue-300 font-luxury">{index + 1}</span>
        </div>
        
        {/* BACK (REVEALED) */}
        <div className="flip-card-back absolute w-full h-full flex items-center justify-between px-6 bg-white rounded-lg shadow-2xl border-4 border-[#bf953f]">
          <span className="text-xl md:text-2xl font-bold text-gray-800 uppercase truncate pr-4">{text}</span>
          <div className="h-full w-16 md:w-20 bg-[#bf953f] flex items-center justify-center -mr-6 rounded-r-sm">
            <span className="text-xl md:text-2xl font-bold text-white">{points}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnswerCard;
