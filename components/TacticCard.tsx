
import React, { useMemo } from 'react';
import { Tactic } from '../types';
import { calculateLoadoutCost } from '../utils/economyHelper';

interface TacticCardProps {
  tactic: Tactic;
  onClick: () => void;
  onDelete?: () => void; // New prop
  highlightRole?: string; 
}

export const TacticCard: React.FC<TacticCardProps> = ({ tactic, onClick, onDelete }) => {
  // Calculate costs for preview
  const { totalTeamCost } = useMemo(() => {
      if (!tactic.loadout) return { totalTeamCost: 0 };
      const costs = tactic.loadout.map(item => calculateLoadoutCost(item.equipment));
      const total = costs.reduce((a, b) => a + b, 0);
      return { totalTeamCost: total };
  }, [tactic.loadout]);

  return (
    <div 
        onClick={onClick}
        className={`
            mb-4 rounded-3xl overflow-hidden transition-all duration-300 border shadow-sm active:scale-[0.98] cursor-pointer group relative
            ${tactic.isRecommended 
                ? 'bg-gradient-to-br from-yellow-50/50 to-orange-50/50 dark:from-yellow-900/5 dark:to-orange-900/5 border-yellow-400/30 hover:border-yellow-500/50' 
                : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-blue-500/30'}
        `}
    >
      <div className="p-5">
        <div className="flex justify-between items-start">
            <div className="flex-1 pr-4">
            <div className="flex flex-wrap gap-1.5 mb-2.5">
                {tactic.tags.map(tag => (
                <span key={tag.label} className={`
                    text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded
                    ${tag.category === 'economy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    tag.category === 'playstyle' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                    'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'}
                `}>
                    {tag.label}
                </span>
                ))}
                {totalTeamCost > 0 && (
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                        ${totalTeamCost}
                    </span>
                )}
                {tactic._isTemp && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        已编辑
                    </span>
                )}
            </div>
            <div className="flex items-start gap-1.5">
                <h3 className="text-lg font-bold leading-tight text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {tactic.title}
                </h3>
                {tactic.isRecommended && (
                    <svg className="w-4 h-4 text-yellow-500 fill-current mt-0.5" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                )}
            </div>
            
            <div className="flex items-center gap-3 mt-2 text-[10px] text-neutral-400 font-medium">
                <span>By {tactic.metadata.author}</span>
                <span>•</span>
                <span>{tactic.metadata.lastUpdated}</span>
                {tactic.metadata.difficulty && (
                    <>
                        <span>•</span>
                        <span className={`
                            ${tactic.metadata.difficulty === 'Easy' ? 'text-green-500' : 
                            tactic.metadata.difficulty === 'Medium' ? 'text-yellow-500' : 'text-red-500'}
                        `}>{tactic.metadata.difficulty}</span>
                    </>
                )}
            </div>
            </div>

            <div className="flex flex-col gap-2 items-end">
                {onDelete && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                )}
                
                <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-neutral-500 dark:text-neutral-400 transition-colors
                    ${tactic.isRecommended 
                        ? 'bg-yellow-100 text-yellow-600 group-hover:bg-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-400' 
                        : 'bg-neutral-100 dark:bg-neutral-800 group-hover:bg-blue-100 group-hover:text-blue-600 dark:group-hover:bg-blue-900/30 dark:group-hover:text-blue-400'}
                `}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
