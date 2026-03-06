
import React from 'react';
import { Match, MatchRound } from '../../types';
import { Icons } from './TimelineHelpers';
import { getTeamSideInRound, getTeamNames } from '../../utils/matchHelpers';

interface RoundHistoryProps {
    match: Match;
}

export const RoundHistory: React.FC<RoundHistoryProps> = ({ match }) => {
    if (!match.rounds || match.rounds.length === 0) return null;

    const rounds = [...match.rounds].sort((a, b) => a.roundNumber - b.roundNumber);
    const { teamA, teamB } = getTeamNames(match);
    
    // Regulation: 1-24
    const regulationRounds = rounds.filter(r => r.roundNumber <= 24);
    
    // Overtime: 25-30, 31-36, etc.
    const otBlocks: MatchRound[][] = [];
    let currentOTBlock: MatchRound[] = [];
    
    rounds.filter(r => r.roundNumber > 24).forEach((round, index) => {
        currentOTBlock.push(round);
        // Every 6 rounds is a new OT block
        if (currentOTBlock.length === 6) {
            otBlocks.push(currentOTBlock);
            currentOTBlock = [];
        }
    });
    // Push remaining rounds if any
    if (currentOTBlock.length > 0) {
        otBlocks.push(currentOTBlock);
    }

    const renderHistoryBlock = (title: string, blockRounds: MatchRound[], isOT: boolean = false, otIndex?: number) => {
        if (blockRounds.length === 0) return null;

        const displayTitle = isOT 
            ? (otBlocks.length > 1 ? `加时赛 ${otIndex! + 1}` : '加时赛')
            : '回合历史';

        return (
            <div key={displayTitle} className="mb-6">
                <h3 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-3 px-1">
                    {displayTitle}
                </h3>
                <div className="bg-neutral-100/50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
                    <div className="flex">
                        {/* Team Names Column */}
                        <div className="w-16 shrink-0 border-r border-neutral-200 dark:border-neutral-800 flex flex-col bg-neutral-50/50 dark:bg-neutral-900/50">
                            <div className="h-10 flex items-center px-2 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100/30 dark:bg-neutral-800/20">
                                <span className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase truncate tracking-tighter" title={teamA}>
                                    {teamA}
                                </span>
                            </div>
                            <div className="h-10 flex items-center px-2 bg-neutral-100/30 dark:bg-neutral-800/20">
                                <span className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase truncate tracking-tighter" title={teamB}>
                                    {teamB}
                                </span>
                            </div>
                        </div>

                        {/* Rounds Grid */}
                        <div className="flex-1 overflow-x-auto scrollbar-hide">
                            <div className="flex min-w-max">
                                {blockRounds.map((round) => {
                                    // Half-time split at round 12 (for regulation)
                                    const isHalfEnd = !isOT && (round.roundNumber === 12);
                                    // OT split at round 3 (each OT half is 3 rounds)
                                    const isOTHalfEnd = isOT && ((round.roundNumber - 24) % 6 === 3);
                                    
                                    const winnerSide = round.winnerSide;
                                    const usSide = getTeamSideInRound(match, round, true);
                                    const usWon = winnerSide === usSide;
                                    
                                    const winnerColor = winnerSide === 'CT' ? 'text-blue-500' : 'text-yellow-500';

                                    const renderIcons = (isUs: boolean) => {
                                        const isWinner = isUs ? usWon : !usWon;
                                        if (!isWinner) return null;

                                        const winIcon = getWinIcon(round.winReason, winnerColor);
                                        
                                        return (
                                            <div className="flex items-center justify-center">
                                                {winIcon}
                                            </div>
                                        );
                                    };

                                    return (
                                        <div 
                                            key={round.roundNumber} 
                                            className={`flex flex-col w-10 shrink-0 
                                                ${(isHalfEnd || isOTHalfEnd) 
                                                    ? 'border-r-4 border-neutral-300 dark:border-neutral-700' 
                                                    : 'border-r border-neutral-200 dark:border-neutral-800'
                                                }`}
                                        >
                                            {/* Row 1: Team A (Us) */}
                                            <div className="h-10 flex items-center justify-center border-b border-neutral-200 dark:border-neutral-800 relative group">
                                                {renderIcons(true)}
                                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-neutral-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                                                    R{round.roundNumber}
                                                </div>
                                            </div>
                                            {/* Row 2: Team B (Them) */}
                                            <div className="h-10 flex items-center justify-center relative group">
                                                {renderIcons(false)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="px-1">
            {renderHistoryBlock('Round history', regulationRounds)}
            {otBlocks.map((block, idx) => (
                <React.Fragment key={`ot-block-${idx}`}>
                    {renderHistoryBlock('Overtime', block, true, idx)}
                </React.Fragment>
            ))}
        </div>
    );
};

const getWinIcon = (reason: number | string, className?: string) => {
    const r = String(reason);
    // 7: Bomb Defused (CT)
    if (r === '7' || r === 'bomb_defused') {
        return <Icons.Defuse className={`${className} w-4 h-4`} />;
    }
    // 10: Bomb Exploded (T)
    if (r === '10' || r === 'target_bombed' || r === 'bomb_exploded') {
        return <Icons.Explode className={`${className} w-4 h-4`} />;
    }
    // 12: Time Ran Out (CT)
    if (r === '12' || r === 'target_saved' || r === 'time_ran_out') {
        return <Icons.Bomb className={`${className} w-4 h-4`} />;
    }
    // Default: Elimination (Skull)
    return <Icons.Skull className={`${className} w-4 h-4`} />;
};
