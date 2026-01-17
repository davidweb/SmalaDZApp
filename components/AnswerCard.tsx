
import React from 'react';
import { motion } from 'framer-motion';
import { Answer } from '../types';

interface AnswerCardProps {
  index: number;
  answer: Answer;
  revealed: boolean;
}

const AnswerCard: React.FC<AnswerCardProps> = ({ index, answer, revealed }) => {
  return (
    <div className="relative w-full h-14 md:h-24 perspective-1000">
      <motion.div
        initial={false}
        animate={{ rotateX: revealed ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
        className="relative w-full h-full transform-style-3d"
      >
        {/* Face Recto (Cachée) */}
        <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-slate-800 to-slate-950 border-2 border-yellow-600/50 rounded-xl flex items-center px-4 shadow-xl">
          <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-slate-900 border-2 border-yellow-500 flex items-center justify-center text-yellow-500 font-game text-xl md:text-3xl shadow-[0_0_15px_rgba(234,179,8,0.3)]">
            {index}
          </div>
          <div className="ml-4 flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              animate={{ x: ["-100%", "100%"] }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="w-1/3 h-full bg-yellow-500/10"
            />
          </div>
        </div>

        {/* Face Verso (Révélée) */}
        <div className="absolute inset-0 backface-hidden bg-gradient-to-b from-white to-slate-200 border-2 border-yellow-400 rounded-xl flex items-center justify-between px-4 md:px-8 shadow-2xl rotate-x-180">
          <span className="font-game text-xl md:text-4xl text-slate-950 uppercase truncate drop-shadow-sm">
            {answer.text}
          </span>
          <div className="h-full flex items-center border-l-2 border-slate-300 pl-4 md:pl-8">
            <span className="font-game text-3xl md:text-5xl text-red-600">{answer.points}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AnswerCard;
