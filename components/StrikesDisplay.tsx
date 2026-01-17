
import React, { useEffect, useState } from 'react';

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

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/20 backdrop-blur-sm">
      <div className="flex space-x-8 animate-bounce">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="text-[150px] md:text-[250px] font-black text-red-600 drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)]">
            X
          </div>
        ))}
      </div>
    </div>
  );
};

export default StrikesDisplay;
