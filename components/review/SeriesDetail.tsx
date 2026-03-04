import React, { useMemo, useState } from 'react';
import { Match, MatchSeries, PlayerMatchStats } from '../../types';
import { getMapDisplayName, SourceBadge, DataDefinitionsModal } from './ReviewShared';
import { ScoreboardTab } from './ScoreboardTab';
import { DuelsTab } from './DuelsTab';
import { UtilityTab } from './UtilityTab';
import { ClutchesTab } from './ClutchesTab';
import { MatchPerformanceTab } from './match_detail/MatchPerformanceTab';
import { TimelineTab } from './TimelineTab';
import { isMyTeamMatch, getTeamNames } from '../../utils/matchHelpers';
import { MatchAggregator } from '../../utils/analytics/matchAggregator';

interface SeriesDetailProps {
    series: MatchSeries;
    allMatches: Match[];
    onBack: () => void;
    onSelectMatch: (match: Match) => void;
    onSelectPlayer: (playerId: string) => void;
}

type SideFilter = 'ALL' | 'CT' | 'T';

export const SeriesDetail: React.FC<SeriesDetailProps> = ({ series, allMatches, onBack, onSelectMatch, onSelectPlayer }) => {
    
    // 1. Resolve Matches & Determine Team Names
    const matches = useMemo(() => {
        return series.matches.map(ref => {
            const m = allMatches.find(x => x.id === ref.matchId);
            return m ? { data: m, swap: ref.swapSides } : null;
        }).filter(Boolean) as { data: Match, swap: boolean }[];
    }, [series, allMatches]);

    // 2. Aggregate Stats to create a "Fake" Match object for the whole series
    const aggregatedMatch = useMemo(() => {
        let winsA = 0;
        let winsB = 0;
        let tAName = "Team A";
        let tBName = "Team B";
        
        if (matches.length > 0) {
            const first = matches[0];
            const { teamA, teamB } = getTeamNames(first.data);
            tAName = first.swap ? teamB : teamA;
            tBName = first.swap ? teamA : teamB;
        }

        // Prepare matches for aggregation by swapping sides if necessary
        const normalizedMatches = matches.map(({ data, swap }) => {
            let sUs = data.score.us;
            let sThem = data.score.them;
            if (swap) { sUs = data.score.them; sThem = data.score.us; }
            if (sUs > sThem) winsA++; else if (sThem > sUs) winsB++;

            if (!swap) return data;
            
            // Return a swapped version of the match
            return {
                ...data,
                players: data.enemyPlayers,
                enemyPlayers: data.players,
                score: {
                    ...data.score,
                    us: data.score.them,
                    them: data.score.us
                },
                teamNameUs: data.teamNameThem,
                teamNameThem: data.teamNameUs
            } as Match;
        });

        // Use MatchAggregator for both teams
        const teamAPlayers = MatchAggregator.aggregate(normalizedMatches.map(m => ({
            ...m,
            enemyPlayers: [] // Only aggregate our players
        })));

        const teamBPlayers = MatchAggregator.aggregate(normalizedMatches.map(m => ({
            ...m,
            players: m.enemyPlayers,
            enemyPlayers: [] // Only aggregate enemy players
        })));

        const maxScore = Math.max(winsA, winsB);
        let format = series.format;
        if (maxScore === 2) format = 'BO3';
        else if (maxScore === 3) format = 'BO5';
        else if (maxScore === 4) format = 'BO7';
        else if (maxScore === 1 && matches.length === 1) format = 'BO1';
        else if (matches.length === 2 && winsA === 1 && winsB === 1) format = 'BO2';

        const isMine = matches.some(m => isMyTeamMatch(m.data));

        const fakeMatch: Match = {
            id: series.id,
            source: 'Demo',
            date: series.date,
            mapId: '系列赛总计',
            serverName: format,
            rank: '',
            result: winsA > winsB ? 'WIN' : winsA < winsB ? 'LOSS' : 'TIE',
            score: {
                us: winsA,
                them: winsB,
                half1_us: 0, half1_them: 0, half2_us: 0, half2_them: 0
            },
            teamNameUs: tAName,
            teamNameThem: tBName,
            players: teamAPlayers,
            enemyPlayers: teamBPlayers,
            rounds: [] // Timeline not supported for aggregated series
        };

        return { fakeMatch, isMine };
    }, [matches, series]);

    const [selectedMapId, setSelectedMapId] = useState<string>('all');
    const [detailTab, setDetailTab] = useState<'overview' | 'performance' | 'duels' | 'utility' | 'clutches' | 'timeline'>('overview');
    const [sideFilter, setSideFilter] = useState<SideFilter>('ALL');
    const [showDefinitions, setShowDefinitions] = useState(false);

    const currentMatch = selectedMapId === 'all' 
        ? aggregatedMatch.fakeMatch 
        : matches.find(m => m.data.id === selectedMapId)?.data || aggregatedMatch.fakeMatch;

    const isMine = selectedMapId === 'all' ? aggregatedMatch.isMine : isMyTeamMatch(currentMatch);
    
    // For specific match, we might need to swap teams if it was swapped in the series
    const displayMatch = useMemo(() => {
        if (selectedMapId === 'all') return currentMatch;
        const ref = matches.find(m => m.data.id === selectedMapId);
        if (!ref || !ref.swap) return currentMatch;

        // Swap the match data for display
        return {
            ...currentMatch,
            score: {
                ...currentMatch.score,
                us: currentMatch.score.them,
                them: currentMatch.score.us,
                half1_us: currentMatch.score.half1_them,
                half1_them: currentMatch.score.half1_us,
                half2_us: currentMatch.score.half2_them,
                half2_them: currentMatch.score.half2_us,
                ot_us: currentMatch.score.ot_them,
                ot_them: currentMatch.score.ot_us,
            },
            teamNameUs: currentMatch.teamNameThem,
            teamNameThem: currentMatch.teamNameUs,
            players: currentMatch.enemyPlayers,
            enemyPlayers: currentMatch.players,
            result: currentMatch.result === 'WIN' ? 'LOSS' : currentMatch.result === 'LOSS' ? 'WIN' : 'TIE'
        } as Match;
    }, [currentMatch, selectedMapId, matches]);

    const { teamA, teamB } = getTeamNames(displayMatch);

    return (
        <div className="fixed inset-0 z-[200] bg-white dark:bg-neutral-950 flex flex-col h-[100dvh] w-screen overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 shadow-sm shrink-0">
                <div className="flex items-center justify-between px-4 h-[56px]">
                    <div className="flex items-center gap-2">
                        <button onClick={onBack} className="flex items-center text-sm font-bold text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors">
                            <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            返回
                        </button>
                        <button onClick={() => setShowDefinitions(true)} className="text-[10px] font-bold text-blue-500 hover:text-blue-600 flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg transition-colors ml-2">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            说明
                        </button>
                    </div>
                    <div className="font-bold text-neutral-900 dark:text-white truncate max-w-[150px]">{series.title}</div>
                    <div className="w-16"></div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 pb-20 overscroll-contain bg-neutral-50 dark:bg-neutral-950">
                
                {/* Map Selector */}
                <div className="flex gap-2 overflow-x-auto pb-4 mb-2 snap-x">
                    <button
                        onClick={() => setSelectedMapId('all')}
                        className={`shrink-0 snap-center px-4 py-2 rounded-xl text-sm font-bold transition-all border ${selectedMapId === 'all' ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white' : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-400 dark:border-neutral-800 dark:hover:bg-neutral-800'}`}
                    >
                        全部
                    </button>
                    {matches.map((m, idx) => (
                        <button
                            key={m.data.id}
                            onClick={() => setSelectedMapId(m.data.id)}
                            className={`shrink-0 snap-center px-4 py-2 rounded-xl text-sm font-bold transition-all border flex items-center gap-2 ${selectedMapId === m.data.id ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white' : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-400 dark:border-neutral-800 dark:hover:bg-neutral-800'}`}
                        >
                            {getMapDisplayName(m.data.mapId)} ({m.swap ? m.data.score.them : m.data.score.us}:{m.swap ? m.data.score.us : m.data.score.them})
                        </button>
                    ))}
                </div>

                {/* Score Header */}
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden relative shadow-sm mb-6">
                    <div className={`absolute left-0 top-0 bottom-0 w-2 ${isMine ? (displayMatch.result === 'WIN' ? 'bg-green-500' : displayMatch.result === 'LOSS' ? 'bg-red-500' : 'bg-yellow-500') : 'bg-neutral-400'}`}></div>
                    
                    <div className="p-6 text-center">
                         {displayMatch.serverName && (
                            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                                {displayMatch.serverName}
                            </div>
                         )}
                         <h2 className="text-3xl font-black text-neutral-900 dark:text-white mb-2">
                             {selectedMapId === 'all' ? '系列赛总计' : getMapDisplayName(displayMatch.mapId)}
                         </h2>
                         <div className="flex justify-center mb-6">
                             <SourceBadge source={displayMatch.source} />
                         </div>
                         
                         <div className="flex items-center justify-center gap-8 md:gap-16 font-sans tabular-nums">
                             <div className="text-right">
                                 <div className={`text-4xl md:text-5xl font-black ${isMine && displayMatch.result === 'WIN' ? 'text-green-600 dark:text-green-500' : 'text-neutral-900 dark:text-white'}`}>
                                    {displayMatch.score.us}
                                 </div>
                                 <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">{teamA}</div>
                             </div>
                             <div className="text-2xl text-neutral-300 font-light opacity-50">:</div>
                             <div className="text-left">
                                  <div className={`text-4xl md:text-5xl font-black ${isMine && displayMatch.result === 'LOSS' ? 'text-red-600 dark:text-red-500' : 'text-neutral-400'}`}>
                                     {displayMatch.score.them}
                                 </div>
                                 <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">{teamB}</div>
                             </div>
                         </div>
                         
                         {selectedMapId !== 'all' && (
                             <div className="mt-6 flex justify-center gap-4 text-xs font-sans tabular-nums font-bold bg-neutral-50 dark:bg-neutral-800 py-2 rounded-lg max-w-[320px] mx-auto text-neutral-500">
                                 <span>( <span className={displayMatch.startingSide === 'CT' ? 'text-yellow-500' : 'text-blue-500'}>{displayMatch.score.half1_them}</span>-<span className={displayMatch.startingSide === 'CT' ? 'text-blue-500' : 'text-yellow-500'}>{displayMatch.score.half1_us}</span> )</span>
                                 <span>( <span className={displayMatch.startingSide === 'CT' ? 'text-blue-500' : 'text-yellow-500'}>{displayMatch.score.half2_them}</span>-<span className={displayMatch.startingSide === 'CT' ? 'text-yellow-500' : 'text-blue-500'}>{displayMatch.score.half2_us}</span> )</span>
                                 {(displayMatch.score.ot_us !== undefined || displayMatch.score.ot_them !== undefined) && (
                                     <span>( <span className="text-neutral-400">{displayMatch.score.ot_them || 0}</span>-<span className="text-neutral-400">{displayMatch.score.ot_us || 0}</span> )</span>
                                 )}
                             </div>
                         )}
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex p-1 bg-neutral-200 dark:bg-neutral-800 rounded-xl mb-6 sticky top-0 z-20 shadow-lg shadow-neutral-100/50 dark:shadow-black/20 overflow-x-auto">
                      {['overview', 'performance', 'timeline', 'duels', 'utility', 'clutches'].map((t) => {
                          if (t === 'timeline' && selectedMapId === 'all') return null; // Hide timeline for 'all'
                          return (
                              <button
                                key={t}
                                onClick={() => setDetailTab(t as any)}
                                className={`flex-1 py-2.5 px-2 rounded-lg text-xs font-bold transition-all capitalize whitespace-nowrap
                                    ${detailTab === t ? 'bg-white dark:bg-neutral-700 shadow text-neutral-900 dark:text-white' : 'text-neutral-500'}`}
                              >
                                  {t === 'overview' ? '战报' : t === 'performance' ? '表现' : t === 'timeline' ? '时间轴' : t === 'duels' ? '对位' : t === 'utility' ? '道具' : '残局'}
                              </button>
                          );
                      })}
                </div>

                {/* Filters (Overview Only) */}
                {detailTab === 'overview' && (
                    <div className="flex justify-end mb-4 animate-in fade-in items-center gap-3">
                        <div className="flex p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                            {(['ALL', 'CT', 'T'] as const).map(side => (
                                <button
                                    key={side}
                                    onClick={() => setSideFilter(side)}
                                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${sideFilter === side ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'}`}
                                >
                                    {side}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tab Content */}
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {detailTab === 'overview' && <ScoreboardTab match={displayMatch} players={displayMatch.players} enemyPlayers={displayMatch.enemyPlayers} onPlayerClick={onSelectPlayer} filter={sideFilter} />}
                    {detailTab === 'performance' && <MatchPerformanceTab match={displayMatch} history={matches.map(m => {
                        // We need to provide the history for the players in this series
                        // matches is an array of { data: Match, swap: boolean }
                        // We should probably just pass the raw matches or a flattened history
                        return m.data.players.concat(m.data.enemyPlayers).map(p => ({ match: m.data, stats: p }));
                    }).flat()} />}
                    {detailTab === 'timeline' && selectedMapId !== 'all' && <TimelineTab match={displayMatch} />}
                    {detailTab === 'duels' && <DuelsTab players={displayMatch.players} enemyPlayers={displayMatch.enemyPlayers} />}
                    {detailTab === 'utility' && <UtilityTab players={displayMatch.players} enemyPlayers={displayMatch.enemyPlayers} teamAName={teamA} teamBName={teamB} />}
                    {detailTab === 'clutches' && <ClutchesTab players={displayMatch.players} enemyPlayers={displayMatch.enemyPlayers} teamAName={teamA} teamBName={teamB} />}
                </div>

            </div>
            
            <DataDefinitionsModal isOpen={showDefinitions} onClose={() => setShowDefinitions(false)} />
        </div>
    );
};
