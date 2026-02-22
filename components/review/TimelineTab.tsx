
import React, { useState } from 'react';
import { Match } from '../../types';
import { RoundCard } from './RoundCard';
import { getWinReasonText } from './TimelineHelpers';
import { exportTimelineToTxt } from '../../utils/exportTimeline';

interface TimelineTabProps {
    match: Match;
}

export const TimelineTab: React.FC<TimelineTabProps> = ({ match }) => {
    const [expandedRound, setExpandedRound] = useState<number | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    const [timeMode, setTimeMode] = useState<'elapsed' | 'countdown'>('countdown');
    const [showWinProb, setShowWinProb] = useState(false);

    if (!match.rounds || match.rounds.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
                <svg className="w-12 h-12 mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-sm">暂无详细回合数据</p>
                <p className="text-xs opacity-60">请尝试重新导入 Demo JSON</p>
            </div>
        );
    }

    const toggleRound = (r: number) => {
        setExpandedRound(expandedRound === r ? null : r);
    };

    return (
        <div className="space-y-4 pb-8">
            <div className="flex justify-end px-1 gap-2 flex-wrap">
                 <button 
                    onClick={() => exportTimelineToTxt(match, showDetails)}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-200 transition-all active:scale-95 border border-transparent"
                 >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    导出
                 </button>

                 <button 
                    onClick={() => setShowWinProb(!showWinProb)}
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 border border-transparent
                        ${showWinProb 
                            ? 'bg-blue-600 text-white shadow-sm' 
                            : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-200'}`}
                 >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    {showWinProb ? '隐藏胜率' : '显示胜率'}
                 </button>

                 <button 
                    onClick={() => setTimeMode(timeMode === 'countdown' ? 'elapsed' : 'countdown')}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-200 transition-all active:scale-95 border border-transparent"
                 >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {timeMode === 'countdown' ? '倒计时' : '正计时'}
                 </button>

                 <button 
                    onClick={() => setShowDetails(!showDetails)}
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 border border-transparent
                        ${showDetails 
                            ? 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-black' 
                            : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-200'}`}
                 >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {showDetails ? '显示详情' : '简略模式'}
                 </button>
            </div>

            {match.rounds.map((round) => (
                <RoundCard 
                    key={round.roundNumber} 
                    round={round} 
                    isExpanded={expandedRound === round.roundNumber} 
                    onToggle={() => toggleRound(round.roundNumber)}
                    match={match}
                    showDetails={showDetails}
                    timeMode={timeMode}
                    showWinProb={showWinProb}
                />
            ))}
        </div>
    );
};
