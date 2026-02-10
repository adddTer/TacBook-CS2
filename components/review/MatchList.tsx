
import React, { useState } from 'react';
import { Match, MatchSeries } from '../../types';
import { SourceBadge, getMapDisplayName, getMapEnName } from './ReviewShared';
import { isMyTeamMatch } from '../../utils/matchHelpers';

interface MatchListProps {
    matches: Match[];
    series?: MatchSeries[];
    onSelectMatch: (match: Match) => void;
    onDeleteMatch?: (e: React.MouseEvent, match: Match) => void; 
    onDeleteSeries?: (e: React.MouseEvent, series: MatchSeries) => void;
}

export const MatchList: React.FC<MatchListProps> = ({ matches, series = [], onSelectMatch, onDeleteMatch, onDeleteSeries }) => {
    const [expandedSeries, setExpandedSeries] = useState<string | null>(null);

    if (matches.length === 0 && series.length === 0) {
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

    // Filter out matches that are part of a series for the main list? 
    // Ideally yes, but to keep it simple, we show series at top or mixed.
    // Let's mix them based on date.
    
    const seriesIds = new Set<string>();
    series.forEach(s => s.matches.forEach(m => seriesIds.add(m.matchId)));

    const standaloneMatches = matches.filter(m => !seriesIds.has(m.id));
    
    // Create a unified list of items to sort
    const items = [
        ...standaloneMatches.map(m => ({ type: 'match' as const, data: m, date: m.date })),
        ...series.map(s => ({ type: 'series' as const, data: s, date: s.date }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map(item => {
                if (item.type === 'series') {
                    const s = item.data as MatchSeries;
                    const isExpanded = expandedSeries === s.id;
                    
                    // Get sub-matches objects
                    const subMatches = s.matches.map(ref => matches.find(m => m.id === ref.matchId)).filter(Boolean) as Match[];
                    
                    // Determine series result (if needed) - simplistic
                    // Count wins for Team A (the one defined by first match)
                    let winsA = 0;
                    let winsB = 0;
                    subMatches.forEach((m, idx) => {
                         const ref = s.matches[idx]; // Corresponds to subMatches[idx] because we filtered order
                         let scoreA = m.score.us; // Default A
                         let scoreB = m.score.them;
                         
                         if (ref.swapSides) {
                             scoreA = m.score.them;
                             scoreB = m.score.us;
                         }
                         if (scoreA > scoreB) winsA++;
                         if (scoreB > scoreA) winsB++;
                    });

                    return (
                        <div key={s.id} className="relative rounded-2xl bg-neutral-900 border border-neutral-800 shadow-sm overflow-hidden flex flex-col group">
                             {/* Series Header */}
                             <div 
                                className="p-5 pl-6 cursor-pointer bg-gradient-to-br from-neutral-800 to-neutral-900 hover:from-neutral-700 transition-all"
                                onClick={() => setExpandedSeries(isExpanded ? null : s.id)}
                             >
                                 <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600"></div>
                                 <div className="flex justify-between items-start mb-3">
                                     <h3 className="text-lg font-black text-white leading-tight">{s.title}</h3>
                                     <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-900/50 text-blue-300 border border-blue-800">{s.format}</span>
                                 </div>
                                 <div className="flex justify-between items-end">
                                     <div>
                                         <div className="text-[10px] text-neutral-400 uppercase font-bold mb-1">Series Score</div>
                                         <div className="text-3xl font-black font-mono text-white tracking-tighter">
                                             {winsA} <span className="text-neutral-600">:</span> {winsB}
                                         </div>
                                     </div>
                                     <div className="text-right">
                                         <div className="text-[10px] text-neutral-500 font-mono mb-2">{s.date.split('T')[0]}</div>
                                         <div className="flex -space-x-2">
                                             {subMatches.slice(0, 3).map(m => (
                                                 <div key={m.id} className="w-6 h-6 rounded-full bg-neutral-700 border border-neutral-800 flex items-center justify-center text-[8px] text-neutral-300 font-bold overflow-hidden" title={m.mapId}>
                                                     {m.mapId.substring(0, 2).toUpperCase()}
                                                 </div>
                                             ))}
                                             {subMatches.length > 3 && (
                                                  <div className="w-6 h-6 rounded-full bg-neutral-800 border border-neutral-800 flex items-center justify-center text-[8px] text-neutral-500 font-bold">
                                                      +{subMatches.length - 3}
                                                  </div>
                                             )}
                                         </div>
                                     </div>
                                 </div>
                                 
                                 {onDeleteSeries && (
                                     <button 
                                        onClick={(e) => onDeleteSeries(e, s)}
                                        className="absolute top-2 right-2 p-2 text-neutral-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                     >
                                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                     </button>
                                 )}
                             </div>

                             {/* Expanded Matches */}
                             {isExpanded && (
                                 <div className="border-t border-neutral-800 bg-neutral-950/50 p-2 space-y-1">
                                     {subMatches.map((m, i) => {
                                         const mapName = getMapDisplayName(m.mapId);
                                         const ref = s.matches.find(r => r.matchId === m.id);
                                         const scoreUs = ref?.swapSides ? m.score.them : m.score.us;
                                         const scoreThem = ref?.swapSides ? m.score.us : m.score.them;
                                         const isWin = scoreUs > scoreThem;

                                         return (
                                             <div 
                                                key={m.id}
                                                onClick={() => onSelectMatch(m)}
                                                className="flex items-center justify-between p-2 rounded-lg hover:bg-neutral-800 cursor-pointer transition-colors"
                                             >
                                                 <div className="flex items-center gap-3">
                                                     <div className={`w-1 h-8 rounded-full ${isWin ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                     <div>
                                                         <div className="text-xs font-bold text-neutral-300">{mapName}</div>
                                                         <div className="text-[10px] text-neutral-500 font-mono">Map {i+1}</div>
                                                     </div>
                                                 </div>
                                                 <div className="font-mono font-bold text-neutral-400">
                                                     <span className={isWin ? 'text-green-500' : ''}>{scoreUs}</span> : <span className={!isWin ? 'text-red-500' : ''}>{scoreThem}</span>
                                                 </div>
                                             </div>
                                         );
                                     })}
                                 </div>
                             )}
                        </div>
                    );
                }

                // Render Regular Match
                const match = item.data as Match;
                const mapName = getMapDisplayName(match.mapId);
                const mapEn = getMapEnName(match.mapId);
                
                // Logic: Check if it's "My Team" or "Neutral"
                const isMine = isMyTeamMatch(match);
                const isWin = match.result === 'WIN';
                const isTie = match.result === 'TIE';

                // Status Bar Color
                let barColor = 'bg-neutral-400'; // Default gray for neutral
                if (isMine) {
                    if (isWin) barColor = 'bg-green-500';
                    else if (isTie) barColor = 'bg-yellow-500';
                    else barColor = 'bg-red-500';
                }

                return (
                    <div 
                        key={match.id} 
                        onClick={() => onSelectMatch(match)}
                        className="relative overflow-hidden rounded-2xl cursor-pointer group transition-all duration-300 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md active:scale-[0.98]"
                    >
                        {/* Status Bar */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 z-10 ${barColor}`}></div>

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
                                        <span className={`text-3xl font-black font-mono tracking-tighter ${isMine && isWin ? 'text-green-600 dark:text-green-400' : 'text-neutral-800 dark:text-neutral-200'}`}>
                                            {match.score.us}
                                        </span>
                                        <span className="text-xl text-neutral-400/50 font-light">:</span>
                                        <span className={`text-3xl font-black font-mono tracking-tighter ${isMine && !isWin && !isTie ? 'text-red-600 dark:text-red-400' : 'text-neutral-800 dark:text-neutral-200'}`}>
                                            {match.score.them}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="text-right">
                                     {match.serverName && <div className="text-[10px] font-bold text-neutral-400 mb-1 truncate max-w-[120px]" title={match.serverName}>{match.serverName}</div>}
                                     <button className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                         查看详情 &rarr;
                                     </button>
                                </div>
                            </div>
                            
                            {onDeleteMatch && (
                                 <button 
                                    onClick={(e) => onDeleteMatch(e, match)}
                                    className="absolute top-2 right-2 p-2 text-neutral-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
