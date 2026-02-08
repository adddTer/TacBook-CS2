
import React from 'react';
import { Match } from '../../types';
import { SourceBadge, getMapDisplayName, getMapEnName } from './ReviewShared';

interface MatchListProps {
    matches: Match[];
    onSelectMatch: (match: Match) => void;
    // onDeleteMatch removed from List View to Detail View
    onDeleteMatch?: (e: React.MouseEvent, match: Match) => void; 
}

export const MatchList: React.FC<MatchListProps> = ({ matches, onSelectMatch }) => {
    if (matches.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
                <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                </div>
                <p className="text-sm font-bold">暂无比赛记录</p>
                <p className="text-xs mt-1">点击右上角导入 Demo JSON</p>
            </div>
        );
    }

    // Sort by date desc
    const sortedMatches = [...matches].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sortedMatches.map(match => {
                const mapName = getMapDisplayName(match.mapId);
                const mapEn = getMapEnName(match.mapId);
                // Removed dynamic theme class, using standard neutral look
                const isWin = match.result === 'WIN';
                const isTie = match.result === 'TIE';

                return (
                    <div 
                        key={match.id} 
                        onClick={() => onSelectMatch(match)}
                        className="relative overflow-hidden rounded-2xl cursor-pointer group transition-all duration-300 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md active:scale-[0.98]"
                    >
                        {/* Status Bar */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 z-10 ${isWin ? 'bg-green-500' : isTie ? 'bg-yellow-500' : 'bg-red-500'}`}></div>

                        <div className="p-5 pl-7 relative z-0">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-black text-neutral-900 dark:text-white leading-none">{mapName}</h3>
                                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1">{mapEn}</p>
                                </div>
                                <SourceBadge source={match.source} />
                            </div>

                            {/* Score Content */}
                            <div className="flex items-end justify-between">
                                <div>
                                    <div className="flex items-baseline gap-1 mb-1">
                                         <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400">SCORE</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-3xl font-black font-mono tracking-tighter ${isWin ? 'text-green-600 dark:text-green-400' : 'text-neutral-800 dark:text-neutral-200'}`}>
                                            {match.score.us}
                                        </span>
                                        <span className="text-xl text-neutral-400/50 font-light">:</span>
                                        <span className={`text-3xl font-black font-mono tracking-tighter ${!isWin && !isTie ? 'text-red-600 dark:text-red-400' : 'text-neutral-800 dark:text-neutral-200'}`}>
                                            {match.score.them}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="text-right">
                                     <div className="text-[10px] font-bold text-neutral-400 mb-1">{match.date.split('T')[0]}</div>
                                     <button className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                         查看详情 &rarr;
                                     </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
