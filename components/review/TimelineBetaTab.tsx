import React, { useState, useMemo } from 'react';
import { Match, MatchRound } from '../../types';
import { TimelineEventRow } from './TimelineEventRow';
import { getWinReasonText } from './TimelineHelpers';

interface TimelineBetaTabProps {
    match: Match;
}

export const TimelineBetaTab: React.FC<TimelineBetaTabProps> = ({ match }) => {
    const [selectedRoundNum, setSelectedRoundNum] = useState<number>(match.rounds?.[0]?.roundNumber || 1);
    const [showDetails, setShowDetails] = useState(false);
    const [timeMode, setTimeMode] = useState<'elapsed' | 'countdown'>('countdown');
    const [showWinProb, setShowWinProb] = useState(true);

    if (!match.rounds || match.rounds.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
                <svg className="w-12 h-12 mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-sm">暂无详细回合数据</p>
                <p className="text-xs opacity-60">请尝试重新导入 Demo JSON</p>
            </div>
        );
    }

    const selectedRound = match.rounds.find(r => r.roundNumber === selectedRoundNum);

    const groupedEvents = useMemo(() => {
        if (!selectedRound) return [];
        const result: any[] = [];
        const allEvents = selectedRound.timeline || [];
        
        for (let i = 0; i < allEvents.length; i++) {
            const event = allEvents[i];
            if (event.type === 'kill') {
                const assists = [];
                let j = i + 1;
                while (j < allEvents.length && allEvents[j].type === 'assist' && allEvents[j].tick === event.tick) {
                    assists.push(allEvents[j]);
                    j++;
                }
                result.push({ ...event, assists });
                i = j - 1;
            } else if (event.type !== 'assist') {
                result.push(event);
            }
        }
        
        if (!showDetails) {
            return result.filter(e => e.type === 'kill' || e.type === 'bomb_planted' || e.type === 'bomb_defused' || e.type === 'bomb_exploded' || e.type === 'round_end');
        }
        return result;
    }, [selectedRound, showDetails]);

    return (
        <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-200px)]">
            {/* Left Sidebar: Round List */}
            <div className="w-full md:w-64 shrink-0 flex flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar">
                {match.rounds.map((round) => {
                    const isSelected = round.roundNumber === selectedRoundNum;
                    const isTWin = round.winnerSide === 'T';
                    const winColor = isTWin ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-500' : 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-500';
                    const inactiveColor = 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:border-neutral-300 dark:hover:border-neutral-700';
                    
                    const duration = round.timeline && round.timeline.length > 0 ? Math.floor(round.timeline[round.timeline.length - 1].seconds) : 0;
                    const mins = Math.floor(duration / 60);
                    const secs = duration % 60;
                    
                    let tKills = 0;
                    let ctKills = 0;
                    round.timeline?.forEach(e => {
                        if (e.type === 'kill' && e.subject) {
                            if (e.subject.side === 'T') tKills++;
                            else if (e.subject.side === 'CT') ctKills++;
                        }
                    });

                    return (
                        <button
                            key={round.roundNumber}
                            onClick={() => setSelectedRoundNum(round.roundNumber)}
                            className={`flex flex-col p-3 rounded-xl border transition-all text-left ${isSelected ? winColor : inactiveColor}`}
                        >
                            <div className="flex items-center justify-between w-full mb-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${isSelected ? (isTWin ? 'bg-yellow-500 text-white' : 'bg-blue-500 text-white') : 'bg-neutral-100 dark:bg-neutral-800'}`}>
                                        {round.roundNumber}
                                    </div>
                                    <div className="font-bold text-sm">{round.winnerSide} Win</div>
                                </div>
                                <div className="text-[10px] font-mono opacity-60">
                                    {mins}:{secs.toString().padStart(2, '0')}
                                </div>
                            </div>
                            <div className="flex items-center justify-between w-full text-xs">
                                <span className="opacity-70">{getWinReasonText(round.winReason)}</span>
                                <div className="flex items-center gap-1.5 font-mono">
                                    <span className="text-yellow-600 dark:text-yellow-500">{tKills}</span>
                                    <span className="opacity-30">-</span>
                                    <span className="text-blue-600 dark:text-blue-500">{ctKills}</span>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Right Content: Round Details */}
            <div className="flex-1 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col relative">
                
                {/* Header Controls */}
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-white/80 dark:bg-neutral-900/80 backdrop-blur z-10">
                    <div className="font-black text-lg">回合 {selectedRoundNum}</div>
                    <div className="flex gap-2">
                         <button 
                            onClick={() => setShowWinProb(!showWinProb)}
                            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 border border-transparent
                                ${showWinProb 
                                    ? 'bg-blue-600 text-white shadow-sm' 
                                    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-200'}`}
                         >
                            {showWinProb ? '隐藏胜率' : '显示胜率'}
                         </button>
                         <button 
                            onClick={() => setTimeMode(timeMode === 'countdown' ? 'elapsed' : 'countdown')}
                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-200 transition-all active:scale-95 border border-transparent"
                         >
                            {timeMode === 'countdown' ? '倒计时' : '正计时'}
                         </button>
                         <button 
                            onClick={() => setShowDetails(!showDetails)}
                            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 border border-transparent
                                ${showDetails 
                                    ? 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-black' 
                                    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-200'}`}
                         >
                            {showDetails ? '显示详情' : '简略模式'}
                         </button>
                    </div>
                </div>

                {/* Timeline Container */}
                <div className="flex-1 overflow-y-auto p-6 relative custom-scrollbar">
                    {/* Wave Background */}
                    {showWinProb && (
                        <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05] flex flex-col">
                            {groupedEvents.map((ev, i) => {
                                const prob = ev.winProb !== undefined ? ev.winProb : 0.5;
                                return (
                                    <div key={i} className="flex-1 w-full flex">
                                        <div className="h-full bg-blue-500 transition-all duration-700 ease-in-out" style={{ width: `${(1 - prob) * 100}%` }} />
                                        <div className="h-full bg-yellow-500 transition-all duration-700 ease-in-out" style={{ width: `${prob * 100}%` }} />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="relative z-10 max-w-3xl mx-auto">
                        {groupedEvents.map((event, index) => (
                            <TimelineEventRow 
                                key={index} 
                                event={event} 
                                timeMode={timeMode} 
                                showWinProb={showWinProb}
                                assists={event.assists}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
