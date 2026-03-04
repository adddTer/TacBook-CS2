import React, { useState } from 'react';
import { Tournament, Match, PlayerMatchStats } from '../../types';
import { getMapDisplayName } from '../../utils/matchHelpers';
import { ScoreboardTable } from './ScoreboardTable';
import { aggregateMatchesStats } from '../../utils/analytics/matchAggregator';

interface TournamentDetailProps {
    tournament: Tournament;
    allMatches: Match[];
    onBack: () => void;
    onSelectMatch: (match: Match) => void;
    onSelectPlayer: (playerId: string) => void;
}

export const TournamentDetail: React.FC<TournamentDetailProps> = ({
    tournament, allMatches, onBack, onSelectMatch, onSelectPlayer
}) => {
    const [detailTab, setDetailTab] = useState<'matches' | 'stats'>('matches');

    // Resolve matches
    const resolvedMatches = tournament.matches.map(ref => {
        const match = allMatches.find(m => m.id === ref.matchId);
        return { ref, match };
    }).filter(m => m.match !== undefined) as { ref: any, match: Match }[];

    // Aggregate stats
    const aggregatedStats = React.useMemo(() => {
        const matchesToAggregate = resolvedMatches.map(m => m.match);
        return aggregateMatchesStats(matchesToAggregate);
    }, [resolvedMatches]);

    const stageNames: Record<string, string> = {
        'GROUP': '小组赛',
        'SWISS': '瑞士轮',
        'SWISS_ROUND': '瑞士轮',
        'RO32': '1/16决赛',
        'RO16': '1/8决赛',
        'QUARTER_FINAL': '1/4决赛',
        'SEMI_FINAL': '半决赛',
        'FINAL': '决赛',
        'UPPER_BRACKET': '胜者组',
        'LOWER_BRACKET': '败者组',
        'OTHER': '其他'
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
            {/* Header */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                <button 
                    onClick={onBack}
                    className="mb-4 flex items-center gap-2 text-sm font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    返回赛事列表
                </button>
                
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold rounded-lg uppercase tracking-wider">
                                赛事
                            </span>
                            <span className="text-sm font-medium text-neutral-500">
                                {tournament.startDate} {tournament.endDate ? `- ${tournament.endDate}` : ''}
                            </span>
                        </div>
                        <h1 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
                            {tournament.title}
                        </h1>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-neutral-200 dark:bg-neutral-800 rounded-xl overflow-x-auto hide-scrollbar">
                <button
                    onClick={() => setDetailTab('matches')}
                    className={`flex-1 min-w-[100px] py-2 rounded-lg text-sm font-bold transition-all ${detailTab === 'matches' ? 'bg-white dark:bg-neutral-700 shadow text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'}`}
                >
                    比赛列表
                </button>
                <button
                    onClick={() => setDetailTab('stats')}
                    className={`flex-1 min-w-[100px] py-2 rounded-lg text-sm font-bold transition-all ${detailTab === 'stats' ? 'bg-white dark:bg-neutral-700 shadow text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'}`}
                >
                    选手数据
                </button>
            </div>

            {/* Content */}
            <div className="mt-4">
                {detailTab === 'matches' && (
                    <div className="space-y-4">
                        {resolvedMatches.map(({ ref, match }) => (
                            <div 
                                key={match.id}
                                onClick={() => onSelectMatch(match)}
                                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                                        <span className="font-bold text-neutral-500 text-sm">{getMapDisplayName(match.mapId).substring(0, 3)}</span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-bold px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded">
                                                {ref.stage === 'OTHER' ? ref.customStageName : stageNames[ref.stage]}
                                            </span>
                                            <span className="text-xs text-neutral-500">{match.date.split('T')[0]}</span>
                                        </div>
                                        <div className="font-bold text-neutral-900 dark:text-white">
                                            {match.teamNameUs || 'Team A'} vs {match.teamNameThem || 'Team B'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-2xl font-black tracking-tighter">
                                        <span className={match.score.us > match.score.them ? 'text-green-600 dark:text-green-400' : 'text-neutral-400'}>{match.score.us}</span>
                                        <span className="text-neutral-300 dark:text-neutral-700 mx-2">-</span>
                                        <span className={match.score.them > match.score.us ? 'text-green-600 dark:text-green-400' : 'text-neutral-400'}>{match.score.them}</span>
                                    </div>
                                    <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {detailTab === 'stats' && (
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
                        <ScoreboardTable 
                            players={aggregatedStats} 
                            title="所有参赛选手" 
                            isEnemy={false}
                            onPlayerClick={onSelectPlayer}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
