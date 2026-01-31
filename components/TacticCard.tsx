
import React, { useState, useMemo } from 'react';
import { Tactic } from '../types';
import { ActionList } from './ActionList';
import { calculateLoadoutCost } from '../utils/economyHelper';

interface TacticCardProps {
  tactic: Tactic;
  highlightRole?: string;
}

export const TacticCard: React.FC<TacticCardProps> = ({ tactic, highlightRole }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMapZoomed, setIsMapZoomed] = useState(false);

  // Calculate costs
  const { loadoutCosts, totalTeamCost } = useMemo(() => {
      if (!tactic.loadout) return { loadoutCosts: [], totalTeamCost: 0 };
      
      const costs = tactic.loadout.map(item => calculateLoadoutCost(item.equipment));
      const total = costs.reduce((a, b) => a + b, 0);
      
      return { loadoutCosts: costs, totalTeamCost: total };
  }, [tactic.loadout]);

  return (
    <div className={`
        mb-4 rounded-3xl overflow-hidden transition-all duration-300 border
        bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800
        ${isOpen ? 'shadow-xl ring-1 ring-neutral-200 dark:ring-neutral-700' : 'shadow-sm'}
    `}>
      {/* Card Header */}
      <div 
        className="p-5 cursor-pointer flex justify-between items-start group"
        onClick={() => setIsOpen(!isOpen)}
      >
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
            {/* Price Tag Preview if loadout exists */}
            {totalTeamCost > 0 && !isOpen && (
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                    ${totalTeamCost}
                </span>
            )}
          </div>
          <h3 className={`text-lg font-bold leading-tight transition-colors 
            ${isOpen ? 'text-neutral-900 dark:text-white' : 'text-neutral-700 dark:text-neutral-300'}
          `}>
            {tactic.title}
          </h3>
          
          {/* Metadata Row */}
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

        {/* Minimal Chevron */}
        <div className={`
            w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 mt-1
            ${isOpen 
                ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-black rotate-180' 
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'}
        `}>
           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
           </svg>
        </div>
      </div>

      {/* Content */}
      <div 
        className={`transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] overflow-hidden
        ${isOpen ? 'max-h-[1500px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="p-5 pt-0">
            
            {/* Loadout Section */}
            {tactic.loadout && tactic.loadout.length > 0 && (
                <div className="mb-6 bg-neutral-50 dark:bg-neutral-950/50 rounded-2xl border border-neutral-100 dark:border-neutral-800 p-4">
                     <div className="flex justify-between items-center mb-3">
                        <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                            配装分配
                        </h4>
                        <div className="text-xs font-mono font-bold text-neutral-500">
                            Team: <span className="text-neutral-900 dark:text-white">${totalTeamCost}</span>
                        </div>
                     </div>
                     <div className="space-y-2">
                        {tactic.loadout.map((item, idx) => (
                            <div key={idx} className="flex items-start text-xs relative">
                                <span className={`font-bold w-16 shrink-0 ${highlightRole === item.role ? 'text-blue-500' : 'text-neutral-600 dark:text-neutral-400'}`}>
                                    {item.role}
                                </span>
                                <span className="text-neutral-800 dark:text-neutral-300 font-mono flex-1 mr-12">
                                    {item.equipment}
                                </span>
                                <span className="absolute right-0 top-0 font-mono text-[10px] text-neutral-400 font-bold bg-neutral-200 dark:bg-neutral-800 px-1 rounded min-w-[36px] text-center">
                                    ${loadoutCosts[idx]}
                                </span>
                            </div>
                        ))}
                     </div>
                </div>
            )}

            {/* Map Visual - Only render if map_visual is present */}
            {tactic.map_visual && (
              <div className="relative mb-6 mt-2 rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                  <div 
                      className="aspect-video w-full cursor-zoom-in relative group"
                      onClick={(e) => { e.stopPropagation(); setIsMapZoomed(true); }}
                  >
                      <img 
                          src={tactic.map_visual} 
                          alt={tactic.title} 
                          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/10 dark:bg-black/40">
                          <span className="bg-white/90 dark:bg-black/60 backdrop-blur-md text-neutral-900 dark:text-white text-[10px] px-3 py-1.5 rounded-full font-bold shadow-lg">
                              查看战术图
                          </span>
                      </div>
                  </div>
              </div>
            )}

            {/* Action List */}
            <ActionList 
                actions={tactic.actions} 
                highlightRole={highlightRole}
            />
        </div>
      </div>

      {/* Full Screen Map Modal */}
      {isMapZoomed && tactic.map_visual && (
          <div 
            className="fixed inset-0 z-[60] bg-white/90 dark:bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={(e) => { e.stopPropagation(); setIsMapZoomed(false); }}
          >
              <img 
                src={tactic.map_visual} 
                alt="Full Map" 
                className="max-w-full max-h-full rounded-lg shadow-2xl" 
              />
              <button className="absolute top-6 right-6 text-neutral-500 hover:text-neutral-900 dark:text-white/50 dark:hover:text-white transition-colors">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
          </div>
      )}
    </div>
  );
};
