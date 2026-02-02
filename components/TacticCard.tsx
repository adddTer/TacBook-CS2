
import React, { useMemo } from 'react';
import { Tactic } from '../types';
import { calculateLoadoutCost } from '../utils/economyHelper';

interface TacticCardProps {
  tactic: Tactic;
  onClick: () => void;
  highlightRole?: string; // Kept for interface compatibility but not used in summary
}

export const TacticCard: React.FC<TacticCardProps> = ({ tactic, onClick }) => {
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
        className="mb-4 rounded-3xl overflow-hidden transition-all duration-300 border bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-sm active:scale-[0.98] cursor-pointer hover:border-blue-500/30 group"
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
            </div>
            <h3 className="text-lg font-bold leading-tight text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {tactic.title}
            </h3>
            
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

            {/* Chevron Right */}
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 mt-1 group-hover:bg-blue-100 group-hover:text-blue-600 dark:group-hover:bg-blue-900/30 dark:group-hover:text-blue-400 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
            </div>
        </div>
      </div>
    </div>
  );
};
