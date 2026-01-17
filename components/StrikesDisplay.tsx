
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StrikesDisplayProps {
  count: number;
}

const StrikesDisplay: React.FC<StrikesDisplayProps> = ({ count }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (count > 0) {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [count]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none bg-red-600/10 backdrop-blur-[2px]"
        >
          <motion.div 
            animate={{ 
              x: [0, -20, 20, -20, 20, 0],
              transition: { duration: 0.4 } 
            }}
            className="flex space-x-8"
          >
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="text-[120px] md:text-[220px] font-black text-red-600 drop-shadow-[0_10px_10px_rgba(0,0,0,0.9)]">
                X
              </div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StrikesDisplay;
