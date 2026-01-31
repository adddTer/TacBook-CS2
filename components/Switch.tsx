import React from 'react';
import { Side } from '../types';

interface SwitchProps {
  side: Side;
  onChange: (side: Side) => void;
}

export const Switch: React.FC<SwitchProps> = ({ side, onChange }) => {
  const isCT = side === 'CT';
  
  return (
    <button 
      className={`
        relative w-14 h-8 rounded-full transition-colors duration-300 flex items-center p-1
        ${isCT ? 'bg-blue-900/40 border border-blue-500/30' : 'bg-yellow-900/40 border border-yellow-500/30'}
      `}
      onClick={() => onChange(isCT ? 'T' : 'CT')}
    >
      <div 
        className={`
          absolute w-6 h-6 rounded-full shadow-sm transform transition-transform duration-300 flex items-center justify-center text-[10px] font-black
          ${isCT 
            ? 'translate-x-6 bg-blue-500 text-white' 
            : 'translate-x-0 bg-yellow-500 text-black'}
        `}
      >
        {side}
      </div>
    </button>
  );
};
