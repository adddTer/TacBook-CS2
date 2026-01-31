import React, { useState } from 'react';
import { Action } from '../types';

interface RoleListProps {
  actions: Action[];
}

export const RoleList: React.FC<RoleListProps> = ({ actions }) => {
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const handleActionClick = (id: string) => {
    setFocusedId(focusedId === id ? null : id);
  };

  return (
    <div className="space-y-1 mt-4">
      {actions.map((action) => {
        const isFocused = focusedId === action.id;
        const isDimmed = focusedId !== null && !isFocused;

        return (
          <div
            key={action.id}
            onClick={(e) => {
              e.stopPropagation();
              handleActionClick(action.id);
            }}
            className={`
              flex items-start p-3 rounded-xl transition-all duration-300 cursor-pointer border
              ${isFocused 
                ? 'bg-neutral-800 border-neutral-700 shadow-lg scale-[1.02]' 
                : 'bg-transparent border-transparent hover:bg-neutral-900'}
              ${isDimmed ? 'opacity-20 blur-[1px]' : 'opacity-100'}
            `}
          >
            {/* 角色名 */}
            <div className={`
              w-16 font-bold text-xs pt-0.5 shrink-0 tracking-wide uppercase
              ${isFocused ? 'text-white' : 'text-neutral-500'}
            `}>
              {action.who}
            </div>

            {/* 任务指令 */}
            <div className={`
              flex-1 text-sm pl-4 leading-relaxed border-l border-neutral-800
              ${isFocused ? 'text-neutral-200' : 'text-neutral-400'}
            `}>
              {action.content}
            </div>
          </div>
        );
      })}
      
      {focusedId !== null && (
        <div className="text-center pt-4 pb-2">
            <button 
                onClick={(e) => { e.stopPropagation(); setFocusedId(null); }}
                className="text-[10px] text-neutral-600 hover:text-neutral-400 uppercase tracking-widest transition-colors"
            >
                Close Focus
            </button>
        </div>
      )}
    </div>
  );
};