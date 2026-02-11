
import React from 'react';
import { MatchRound, Match } from '../../types';
import { TimelineEventRow } from './TimelineEventRow';
import { RoundTeamStats } from './RoundTeamStats';
import { getWinReasonText, formatTime, Icons } from './TimelineHelpers';
import { ROSTER } from '../../constants/roster';

interface RoundCardProps {
    round: MatchRound;
    isExpanded: boolean;
    onToggle: () => void;
    match: Match;
    showDetails: boolean;
    timeMode: 'elapsed' | 'countdown';
    showWinProb: boolean;
}

export const RoundCard: React.FC<RoundCardProps> = ({ round, isExpanded, onToggle, match, showDetails, timeMode, showWinProb }) => {
    const isCTWin = round.winnerSide === 'CT';
    
    // Style configurations based on winner
    const cardBorderColor = isCTWin ? 'border-blue-500' : 'border-amber-500';
    const winTextColor = isCTWin ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400';
    const gradientBg = isCTWin 
        ? 'bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-900/10' 
        : 'bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10';
    
    // Sort events by time
    const sortedEvents = [...round.timeline].sort((a,b) => a.seconds - b.seconds);
    
    // Identify bomb plant for timer calculations
    const plantEvent = sortedEvents.find(e => e.type === 'plant');
    const plantTime = plantEvent ? plantEvent.seconds : undefined;

    // Identify End Time of Bomb Logic (Defuse or Explode)
    const defuseEvent = sortedEvents.find(e => e.type === 'defuse');
    const explodeEvent = sortedEvents.find(e => e.type === 'explode');
    let bombEndTime: number | undefined = undefined;
    if (defuseEvent) bombEndTime = defuseEvent.seconds;
    if (explodeEvent) bombEndTime = explodeEvent.seconds;
    
    // Filter based on showDetails
    const displayEvents = sortedEvents.filter(ev => {
        if (ev.type === 'damage') return showDetails;
        return true;
    });

    // Summary data
    const killCount = sortedEvents.filter(e => e.type === 'kill').length;

    // Stats array preparation
    const statsArray = Object.entries(round.playerStats).map(([sid, stats]) => {
        let name = sid;
        const pMatch = match.players.find(p => p.steamid === sid) || match.enemyPlayers.find(p => p.steamid === sid);
        if (pMatch) name = pMatch.playerId;
        else {
            const roster = ROSTER.find(r => r.id === sid || r.name === sid);
            if (roster) name = roster.id;
        }
        return { name, ...(stats as any), steamid: sid };
    });

    const sidePlayers = {
        CT: statsArray.filter(s => s.side === 'CT'),
        T: statsArray.filter(s => s.side === 'T')
    };

    return (
        <div className={`
            bg-white dark:bg-neutral-900 border-l-[3px] ${cardBorderColor} 
            border-y border-r border-neutral-200 dark:border-neutral-800 
            rounded-r-xl overflow-hidden shadow-sm transition-all hover:shadow-md
        `}>
            {/* Round Header */}
            <div 
                onClick={onToggle}
                className={`p-3 pr-4 flex items-center justify-between cursor-pointer ${gradientBg} hover:bg-opacity-80 transition-colors`}
            >
                <div className="flex items-center gap-4">
                    {/* Round Number Badge */}
                    <div className="flex flex-col items-center justify-center min-w-[2.5rem]">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Round</span>
                        <span className="font-mono text-lg font-black text-neutral-700 dark:text-neutral-200 leading-none">
                            {round.roundNumber}
                        </span>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-8 bg-neutral-200 dark:bg-neutral-700"></div>

                    {/* Info */}
                    <div>
                        <div className={`text-sm font-black ${winTextColor} flex items-center gap-2 mb-0.5`}>
                            {round.winnerSide} 胜利 
                            <span className="text-[10px] font-bold text-neutral-500 bg-white/50 dark:bg-black/20 px-1.5 py-0.5 rounded border border-neutral-100 dark:border-neutral-800 backdrop-blur-sm">
                                {getWinReasonText(round.winReason)}
                            </span>
                        </div>
                        <div className="text-[10px] text-neutral-500 dark:text-neutral-400 flex items-center gap-3 font-sans tabular-nums">
                            <span className="flex items-center gap-1" title="回合时长">
                                <svg className="w-3 h-3 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {formatTime(round.duration, 'elapsed')}
                            </span>
                            <span className="flex items-center gap-1" title="总击杀">
                                <Icons.Kill />
                                {killCount} 击杀
                            </span>
                            
                            {/* Objective Status Icons */}
                            {plantEvent && (
                                <span className={`flex items-center gap-1 font-bold ${
                                    defuseEvent ? 'text-green-500' : explodeEvent ? 'text-amber-500' : 'text-red-500'
                                }`}>
                                    <Icons.Bomb />
                                    {defuseEvent ? '已拆除' : explodeEvent ? '已爆炸' : '已安放'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''} text-neutral-400`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="border-t border-neutral-100 dark:border-neutral-800 animate-in slide-in-from-top-2 duration-200">
                    
                    {/* Events Timeline */}
                    <div className="p-4 sm:p-6 bg-neutral-50/50 dark:bg-neutral-950/30">
                        <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            时间线 ({timeMode === 'countdown' ? '倒计时' : '正计时'})
                        </h4>
                        
                        <div className="relative pl-3 space-y-0">
                            {/* Vertical Line Container */}
                            <div className="absolute left-[34px] top-3 bottom-4 w-0.5 bg-neutral-200 dark:bg-neutral-800 -z-10"></div>
                            
                            {displayEvents.map((ev, idx) => (
                                <TimelineEventRow key={idx} event={ev} timeMode={timeMode} plantTime={plantTime} bombEndTime={bombEndTime} showWinProb={showWinProb} />
                            ))}
                        </div>
                    </div>

                    {/* Round Stats Table */}
                    <div className="p-4 sm:p-6 border-t border-neutral-100 dark:border-neutral-800">
                         <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                             <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                             本局数据
                         </h4>
                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                             <RoundTeamStats teamName="CT" players={sidePlayers.CT} color="text-blue-500" />
                             <RoundTeamStats teamName="T" players={sidePlayers.T} color="text-amber-500" />
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
};
