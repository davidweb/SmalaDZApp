
import React from 'react';
import { motion } from 'framer-motion';
import FlipCard from './FlipCard';
import { Room, Question } from '../types';
import { X } from 'lucide-react';

interface BoardProps {
  room: Room;
  question: Question | null;
}

const Board: React.FC<BoardProps> = ({ room, question }) => {
  const strikes = Array.from({ length: 3 }, (_, i) => i < room.current_strikes);

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-4">
      {/* Theme Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-8 text-center"
      >
        <h2 className="text-yellow-400 text-lg uppercase tracking-widest font-bold">Thème</h2>
        <h1 className="text-4xl md:text-6xl font-anton text-white drop-shadow-lg uppercase italic">
          {question?.theme || 'Chargement...'}
        </h1>
      </motion.div>

      {/* Main Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 w-full bg-black/40 p-6 rounded-xl border-4 border-yellow-600/50 shadow-2xl relative">
        {question?.answers.map((ans, idx) => (
          <FlipCard 
            key={idx} 
            index={idx} 
            text={ans.text} 
            points={ans.points} 
            isRevealed={room.revealed_answers_indices.includes(idx)} 
          />
        ))}
        
        {/* Strikes Overlay */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-4 pointer-events-none">
           {room.current_strikes > 0 && Array.from({ length: room.current_strikes }).map((_, i) => (
             <motion.div
               key={i}
               initial={{ scale: 3, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="bg-red-600 p-4 border-4 border-white shadow-2xl rounded-lg"
             >
               <X size={120} strokeWidth={4} color="white" />
             </motion.div>
           ))}
        </div>
      </div>

      {/* Bank Score */}
      <div className="mt-8 flex items-center gap-6">
        <div className="bg-yellow-500 text-slate-900 px-8 py-2 rounded-full font-anton text-4xl shadow-lg border-4 border-white">
          {room.points_in_bank}
        </div>
      </div>
    </div>
  );
};

export default Board;
