
import React, { useState, useMemo } from 'react';
import { Action } from '../types';
import { sortActions } from '../utils/timeHelper';
import { UTILITIES } from '../data/utilities';

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
        
        // Find linked utility
        const linkedUtility = action.utilityId ? UTILITIES.find(u => u.id === action.utilityId) : null;

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
            <div className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                {action.content}
                {/* Utility Link Badge */}
                {linkedUtility && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if(linkedUtility.image) setExpandedImg(linkedUtility.image);
                        }}
                        className={`
                            ml-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold align-middle transition-colors
                            ${linkedUtility.type === 'smoke' ? 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300' :
                              linkedUtility.type === 'flash' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' :
                              linkedUtility.type === 'molotov' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' :
                              'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}
                            hover:opacity-80
                        `}
                    >
                        {linkedUtility.type === 'smoke' && <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>}
                        {linkedUtility.type === 'flash' && <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>}
                        {linkedUtility.title}
                        {linkedUtility.image && (
                            <svg className="w-2.5 h-2.5 opacity-50 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        )}
                    </button>
                )}
            </div>

            {/* Optional Image Thumbnail (Action specific) */}
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
            className="fixed inset-0 z-[80] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
            onClick={(e) => { e.stopPropagation(); setExpandedImg(null); }}
        >
            <img src={expandedImg} className="max-w-full max-h-full rounded shadow-2xl" alt="Full size" />
            <button className="absolute top-8 right-8 text-white bg-neutral-800/50 p-2 rounded-full hover:bg-neutral-800 transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none">
                 <span className="bg-black/50 text-white px-3 py-1 rounded-full text-xs backdrop-blur-md">点击任意处关闭</span>
            </div>
        </div>
      )}
    </div>
  );
};
