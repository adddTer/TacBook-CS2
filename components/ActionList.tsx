
import React, { useState, useMemo } from 'react';
import { Action } from '../types';
import { sortActions } from '../utils/timeHelper';

interface ActionListProps {
  actions: Action[];
  highlightRole?: string;
}

export const ActionList: React.FC<ActionListProps> = ({ actions, highlightRole }) => {
  const [expandedImg, setExpandedImg] = useState<string | null>(null);

  // Auto-sort actions chronologically
  const sortedActions = useMemo(() => {
    return [...actions].sort(sortActions);
  }, [actions]);

  return (
    <div className="space-y-3 mt-4 relative">
      {/* Timeline Line */}
      <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-neutral-100 dark:bg-neutral-800"></div>

      {sortedActions.map((action, index) => {
        // Highlight logic: Match specific role OR match "全员"
        const isHighlighted = highlightRole && (action.who === highlightRole || action.who === '全员');
        
        return (
            <div 
            key={action.id}
            className={`
                relative pl-6 transition-all duration-300
                ${isHighlighted ? 'opacity-100 scale-[1.01]' : highlightRole ? 'opacity-40' : 'opacity-100'}
            `}
            >
            {/* Timeline Dot */}
            <div className={`
                absolute left-0 top-1.5 w-4 h-4 rounded-full border-[3px] z-10 bg-white dark:bg-neutral-900
                ${isHighlighted ? 'border-blue-500' : 'border-neutral-200 dark:border-neutral-700'}
            `}></div>

            {/* Time & Who Header */}
            <div className="flex items-center gap-2 mb-1">
                {action.time && (
                <span className={`
                    text-[10px] font-mono px-1.5 py-0.5 rounded font-bold
                    ${isHighlighted 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'}
                `}>
                    {action.time}
                </span>
                )}
                <span className={`
                    text-xs font-bold uppercase tracking-wide
                    ${isHighlighted ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-900 dark:text-neutral-200'}
                `}>
                {action.who}
                </span>
            </div>

            {/* Content */}
            <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                {action.content}
            </p>

            {/* Optional Image Thumbnail */}
            {action.image && (
                <div className="mt-2">
                <button 
                    onClick={(e) => { e.stopPropagation(); setExpandedImg(action.image || null); }}
                    className="group relative overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700 w-24 h-16 shadow-sm"
                >
                    <img 
                    src={action.image} 
                    alt="Action Visual" 
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" 
                    />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                    </div>
                </button>
                </div>
            )}
            </div>
        );
      })}

      {/* Image Modal */}
      {expandedImg && (
        <div 
            className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
            onClick={(e) => { e.stopPropagation(); setExpandedImg(null); }}
        >
            <img src={expandedImg} className="max-w-full max-h-full rounded shadow-2xl" alt="Full size" />
            <button className="absolute top-8 right-8 text-white bg-neutral-800/50 p-2 rounded-full">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
      )}
    </div>
  );
};
