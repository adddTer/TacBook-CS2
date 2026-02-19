
import React from 'react';
import { PlayerAnalysisReport } from '../../../services/ai/types';

interface PlayerDetailHeaderProps {
    onBack: () => void;
    onOpenReport: () => void;
    analysis: PlayerAnalysisReport | null;
    sideFilter: 'ALL' | 'CT' | 'T';
    onSetFilter: (filter: 'ALL' | 'CT' | 'T') => void;
}

export const PlayerDetailHeader: React.FC<PlayerDetailHeaderProps> = ({
    onBack,
    onOpenReport,
    analysis,
    sideFilter,
    onSetFilter
}) => {
    return (
        <div className="sticky top-[56px] z-30 bg-neutral-50/95 dark:bg-neutral-950/95 backdrop-blur-md py-3 -mx-4 px-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
            <button 
                onClick={onBack}
                className="flex items-center text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                BACK
            </button>
            <div className="flex gap-2">
                <button 
                    onClick={onOpenReport}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all shadow-sm ${
                        analysis 
                        ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700' 
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-transparent'
                    }`}
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    <span>{analysis ? '查看 AI 报告' : 'AI 深度分析'}</span>
                </button>
                
                <div className="flex p-0.5 bg-neutral-200 dark:bg-neutral-800 rounded-lg">
                    {(['ALL', 'CT', 'T'] as const).map(side => (
                        <button
                            key={side}
                            onClick={() => onSetFilter(side)}
                            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${sideFilter === side ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'}`}
                        >
                            {side}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
