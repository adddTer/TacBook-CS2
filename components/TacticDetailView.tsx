
import React, { useState, useMemo } from 'react';
import { Tactic } from '../types';
import { ActionList } from './ActionList';
import { calculateLoadoutCost } from '../utils/economyHelper';

interface TacticDetailViewProps {
  tactic: Tactic;
  onBack: () => void;
  onEdit?: () => void;
  highlightRole?: string;
}

export const TacticDetailView: React.FC<TacticDetailViewProps> = ({ tactic, onBack, onEdit, highlightRole }) => {
  const [isMapZoomed, setIsMapZoomed] = useState(false);

  // Calculate costs
  const { loadoutCosts, totalTeamCost } = useMemo(() => {
      if (!tactic.loadout) return { loadoutCosts: [], totalTeamCost: 0 };
      const costs = tactic.loadout.map(item => calculateLoadoutCost(item.equipment));
      const total = costs.reduce((a, b) => a + b, 0);
      return { loadoutCosts: costs, totalTeamCost: total };
  }, [tactic.loadout]);

  return (
    <div className="fixed inset-0 z-[60] bg-white dark:bg-neutral-950 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md sticky top-0 z-10">
            <button onClick={onBack} className="flex items-center gap-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors pl-0 pr-4 py-2">
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                 <span className="font-bold text-sm">返回</span>
            </button>
            
            <div className="flex items-center gap-2 max-w-[60%]">
                 {onEdit && (
                    <button 
                        onClick={onEdit}
                        className="text-blue-600 dark:text-blue-400 text-xs font-bold px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap"
                    >
                        编辑
                    </button>
                )}
                <h2 className="font-bold text-neutral-900 dark:text-white text-sm truncate text-center">
                    {tactic.title}
                </h2>
            </div>

            <div className="w-12"></div> {/* Spacer for center alignment */}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 pb-20 overscroll-contain">
             {/* Header Info */}
             <div className="mb-6">
                <div className="flex flex-wrap gap-2 mb-3">
                    {tactic.tags.map(tag => (
                    <span key={tag.label} className={`
                        text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded
                        ${tag.category === 'economy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        tag.category === 'playstyle' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'}
                    `}>
                        {tag.label}
                    </span>
                    ))}
                </div>
                
                <h1 className="text-2xl font-black text-neutral-900 dark:text-white mb-2 leading-tight">{tactic.title}</h1>
                
                <div className="flex items-center gap-4 text-xs text-neutral-500 font-medium">
                    <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        {tactic.metadata.author}
                    </span>
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

             {/* Loadout */}
             {tactic.loadout && tactic.loadout.length > 0 && (
                <div className="mb-6 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-neutral-100 dark:border-neutral-800 p-4">
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

            {/* Map Visual */}
            {tactic.map_visual && (
              <div className="relative mb-8 rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 shadow-sm">
                  <div 
                      className="aspect-video w-full cursor-zoom-in relative group"
                      onClick={() => setIsMapZoomed(true)}
                  >
                      <img 
                          src={tactic.map_visual} 
                          alt={tactic.title} 
                          className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 dark:bg-black/40">
                          <span className="bg-white/90 dark:bg-black/60 backdrop-blur-md text-neutral-900 dark:text-white text-[10px] px-3 py-1.5 rounded-full font-bold shadow-lg">
                              查看大图
                          </span>
                      </div>
                  </div>
              </div>
            )}

            {/* Action List */}
            <div className="mb-4">
                 <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    战术流程
                </h4>
                <ActionList 
                    actions={tactic.actions} 
                    highlightRole={highlightRole}
                />
            </div>
        </div>

        {/* Full Screen Map Modal */}
        {isMapZoomed && tactic.map_visual && (
            <div 
                className="fixed inset-0 z-[70] bg-white/90 dark:bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200"
                onClick={() => setIsMapZoomed(false)}
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
