
import React, { useState } from 'react';
import { Match } from '../../types';
import { SourceBadge, DataDefinitionsModal, getMapDisplayName } from './ReviewShared';
import { ScoreboardTab } from './ScoreboardTab';
import { DuelsTab } from './DuelsTab';
import { UtilityTab } from './UtilityTab';
import { ClutchesTab } from './ClutchesTab';
import { TimelineTab } from './TimelineTab';
import { isMyTeamMatch, getTeamNames } from '../../utils/matchHelpers';

interface MatchDetailProps {
    match: Match;
    onBack: () => void;
    onPlayerClick: (id: string) => void;
    onDelete: (match: Match) => void;
    onShare: (match: Match) => void;
}

type SideFilter = 'ALL' | 'CT' | 'T';

// --- MAIN CONTAINER ---

export const MatchDetail: React.FC<MatchDetailProps> = ({ match, onBack, onPlayerClick, onDelete, onShare }) => {
    const [detailTab, setDetailTab] = useState<'overview' | 'duels' | 'utility' | 'clutches' | 'timeline'>('overview');
    const [sideFilter, setSideFilter] = useState<SideFilter>('ALL');
    const [showDefinitions, setShowDefinitions] = useState(false);

    const mapName = getMapDisplayName(match.mapId);
    const startSide = match.startingSide || 'CT';
    const ctColor = 'text-blue-500 dark:text-blue-400';
    const tColor = 'text-yellow-500 dark:text-yellow-400';
    const half1UsColor = startSide === 'CT' ? ctColor : tColor;
    const half1ThemColor = startSide === 'CT' ? tColor : ctColor;
    const half2UsColor = startSide === 'CT' ? tColor : ctColor;
    const half2ThemColor = startSide === 'CT' ? ctColor : tColor;

    const isMine = isMyTeamMatch(match);
    const { teamA, teamB } = getTeamNames(match);

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

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => onShare(match)}
                            className="p-2 text-neutral-400 hover:text-blue-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                        </button>
                        <button 
                            onClick={() => onDelete(match)}
                            className="p-2 text-neutral-400 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 pb-20 overscroll-contain bg-neutral-50 dark:bg-neutral-950">
                
                {/* Score Header */}
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden relative shadow-sm mb-6">
                    {/* Status Bar */}
                    <div className={`absolute left-0 top-0 bottom-0 w-2 ${isMine ? (match.result === 'WIN' ? 'bg-green-500' : match.result === 'LOSS' ? 'bg-red-500' : 'bg-yellow-500') : 'bg-neutral-400'}`}></div>
                    
                    <div className="p-6 text-center">
                         {match.serverName && (
                            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                                {match.serverName}
                            </div>
                         )}
                         <h2 className="text-3xl font-black text-neutral-900 dark:text-white mb-2">{mapName}</h2>
                         <div className="flex justify-center mb-6">
                             <SourceBadge source={match.source} />
                         </div>
                         
                         <div className="flex items-center justify-center gap-8 md:gap-16 font-sans tabular-nums">
                             <div className="text-right">
                                 <div className={`text-4xl md:text-5xl font-black ${isMine && match.result === 'WIN' ? 'text-green-600 dark:text-green-500' : 'text-neutral-900 dark:text-white'}`}>
                                    {match.score.us}
                                 </div>
                                 <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">{teamA}</div>
                             </div>
                             <div className="text-2xl text-neutral-300 font-light opacity-50">:</div>
                             <div className="text-left">
                                  <div className={`text-4xl md:text-5xl font-black ${isMine && match.result === 'LOSS' ? 'text-red-600 dark:text-red-500' : 'text-neutral-400'}`}>
                                     {match.score.them}
                                 </div>
                                 <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">{teamB}</div>
                             </div>
                         </div>
                         
                         <div className="mt-6 flex justify-center gap-4 text-xs font-sans tabular-nums font-bold bg-neutral-50 dark:bg-neutral-800 py-2 rounded-lg max-w-[240px] mx-auto text-neutral-500">
                             <span>( <span className={half1ThemColor}>{match.score.half1_them}</span>-<span className={half1UsColor}>{match.score.half1_us}</span> )</span>
                             <span>( <span className={half2ThemColor}>{match.score.half2_them}</span>-<span className={half2UsColor}>{match.score.half2_us}</span> )</span>
                         </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex p-1 bg-neutral-200 dark:bg-neutral-800 rounded-xl mb-6 sticky top-0 z-20 shadow-lg shadow-neutral-100/50 dark:shadow-black/20">
                      {['overview', 'timeline', 'duels', 'utility', 'clutches'].map((t) => (
                          <button
                            key={t}
                            onClick={() => setDetailTab(t as any)}
                            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all capitalize
                                ${detailTab === t ? 'bg-white dark:bg-neutral-700 shadow text-neutral-900 dark:text-white' : 'text-neutral-500'}`}
                          >
                              {t === 'overview' ? '总览' : t === 'timeline' ? '战报' : t === 'duels' ? '对位' : t === 'utility' ? '道具' : '残局'}
                          </button>
                      ))}
                </div>

                {/* Filters (Overview Only) */}
                {detailTab === 'overview' && (
                    <div className="flex justify-end mb-4 animate-in fade-in">
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
                    {detailTab === 'overview' && <ScoreboardTab match={match} players={match.players} enemyPlayers={match.enemyPlayers} onPlayerClick={onPlayerClick} filter={sideFilter} />}
                    {detailTab === 'timeline' && <TimelineTab match={match} />}
                    {detailTab === 'duels' && <DuelsTab players={match.players} enemyPlayers={match.enemyPlayers} />}
                    {detailTab === 'utility' && <UtilityTab players={match.players} enemyPlayers={match.enemyPlayers} />}
                    {detailTab === 'clutches' && <ClutchesTab players={match.players} enemyPlayers={match.enemyPlayers} />}
                </div>

            </div>
            
            <DataDefinitionsModal isOpen={showDefinitions} onClose={() => setShowDefinitions(false)} />
        </div>
    );
};
