
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FlipCardProps {
  index: number;
  text: string;
  points: number;
  isRevealed: boolean;
}

const FlipCard: React.FC<FlipCardProps> = ({ index, text, points, isRevealed }) => {
  return (
    <div className="relative h-16 w-full perspective-1000 mb-2">
      <AnimatePresence mode="wait">
        {!isRevealed ? (
          <motion.div
            key="front"
            initial={{ rotateX: 0 }}
            exit={{ rotateX: 90 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 bg-gradient-to-b from-blue-700 to-blue-900 border-2 border-yellow-400 rounded-md flex items-center justify-center shadow-lg"
          >
            <span className="text-3xl font-anton text-yellow-400 drop-shadow-md">{index + 1}</span>
          </motion.div>
        ) : (
          <motion.div
            key="back"
            initial={{ rotateX: -90 }}
            animate={{ rotateX: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 bg-white text-blue-900 border-2 border-yellow-500 rounded-md flex items-center px-4 justify-between shadow-xl"
          >
            <span className="text-xl font-bold uppercase truncate pr-4">{text}</span>
            <span className="text-2xl font-anton border-l-2 border-blue-900 pl-4">{points}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FlipCard;
