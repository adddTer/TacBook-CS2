
import React, { useMemo, useState } from 'react';
import { Match } from '../../types';
import { ROSTER } from '../../constants/roster';
import { resolveName } from '../../utils/demo/helpers';
import { aggregatePlayerStats } from '../../utils/analytics/statsAggregator';
import { calculateFirepower } from '../../utils/analytics/calculateFirepower';
import { calculateEntry } from '../../utils/analytics/calculateEntry';
import { calculateTrade } from '../../utils/analytics/calculateTrade';
import { calculateOpening } from '../../utils/analytics/calculateOpening';
import { calculateClutch } from '../../utils/analytics/calculateClutch';
import { calculateSniper } from '../../utils/analytics/calculateSniper';
import { calculateUtility } from '../../utils/analytics/calculateUtility';
import { getScoreStyle, getRatingStyle, getWpaStyle, TIER_CLASSES } from '../../utils/styleConstants';

interface LeaderboardTabProps {
    allMatches: Match[];
}

type SortField = 
    | 'rating' | 'wpa' | 'adr' | 'kast' | 'impact' 
    | 'firepower' | 'entry' | 'opening' | 'trade' | 'sniper' | 'clutch' | 'utility'
    | 'matches';

type SortOrder = 'asc' | 'desc';

export const LeaderboardTab: React.FC<LeaderboardTabProps> = ({ allMatches }) => {
    const [sortField, setSortField] = useState<SortField>('rating');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    // --- Core Calculation Logic ---
    const leaderboardData = useMemo(() => {
        return ROSTER.map(player => {
            const matchesPlayed = allMatches.filter(m => {
                const allP = [...m.players, ...m.enemyPlayers];
                return allP.some(p => resolveName(p.playerId) === player.id || resolveName(p.steamid) === player.id);
            });

            if (matchesPlayed.length === 0) return null;

            // Aggregate Stats
            const stats = aggregatePlayerStats(player.id, matchesPlayed.map(m => {
                 const p = [...m.players, ...m.enemyPlayers].find(x => resolveName(x.playerId) === player.id || resolveName(x.steamid) === player.id)!;
                 return { match: m, stats: p };
            }), 'ALL');
            
            // Derived Averages
            const safeDiv = (a: number, b: number) => b === 0 ? 0 : a / b;
            const rounds = stats.roundsPlayed || 1;
            
            const adr = safeDiv(stats.damage, rounds);
            const kpr = safeDiv(stats.kills, rounds);
            const avgRating = safeDiv(stats.ratingSum, rounds) * 1.30;
            const wpaAvg = safeDiv(stats.wpaSum, rounds);
            const kastPct = Math.min(100, (stats.roundsWithKills + stats.assists + stats.survivedRounds + stats.tradedDeaths) / rounds * 100);

            // Ability Scores
            const scoreFirepower = calculateFirepower(
                adr, kpr, avgRating,
                safeDiv(stats.roundsWithKills, rounds) * 100,
                safeDiv(stats.killsInWins, stats.roundsWon),
                safeDiv(stats.damageInWins, stats.roundsWon),
                safeDiv(stats.multiKillRounds, rounds) * 100
            );

            const scoreEntry = calculateEntry(
                stats.tradedDeaths,
                stats.entryDeaths,
                stats.entryDeathsTraded,
                stats.deaths,
                stats.savedByTeammate,
                stats.assists,
                stats.supportRounds,
                rounds
            );

            const scoreTrade = calculateTrade(
                stats.tradeKills,
                stats.kills,
                stats.damage,
                stats.teammatesSaved,
                stats.assists,
                rounds
            );

            const scoreOpening = calculateOpening(
                stats.entryKills,
                stats.entryDeaths,
                stats.roundsWonAfterEntry,
                rounds
            );

            const scoreClutch = calculateClutch(
                stats.clutchPoints,
                stats.w1v1, stats.l1v1,
                stats.roundsLastAlive,
                stats.totalTimeAlive,
                stats.savesInLosses,
                stats.roundsLost,
                rounds
            );

            const scoreSniper = calculateSniper(
                stats.sniperKills,
                stats.kills,
                stats.roundsWithSniperKills,
                stats.sniperMultiKillRounds,
                stats.sniperOpeningKills,
                rounds
            );

            const scoreUtility = calculateUtility(
                stats.utilityDamage,
                stats.flashAssists,
                stats.utilityKills,
                stats.flashesThrown,
                stats.blindDuration,
                stats.enemiesBlinded,
                rounds
            );

            return {
                id: player.id,
                name: player.name,
                role: player.role.split(' ')[0],
                matches: matchesPlayed.length,
                
                // Metrics
                rating: avgRating,
                adr: adr,
                wpa: wpaAvg,
                kast: kastPct,
                
                // Scores
                firepower: scoreFirepower,
                entry: scoreEntry,
                opening: scoreOpening,
                trade: scoreTrade,
                sniper: scoreSniper,
                clutch: scoreClutch,
                utility: scoreUtility
            };
        }).filter(Boolean) as any[];
    }, [allMatches]);

    // --- Sorting ---
    const sortedData = useMemo(() => {
        return [...leaderboardData].sort((a, b) => {
            const valA = a[sortField];
            const valB = b[sortField];
            return sortOrder === 'asc' ? valA - valB : valB - valA;
        });
    }, [leaderboardData, sortField, sortOrder]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <span className="opacity-0 ml-1 transition-opacity group-hover:opacity-30">↓</span>;
        return <span className="ml-1 text-blue-500">{sortOrder === 'desc' ? '↓' : '↑'}</span>;
    };

    const HeaderCell = ({ field, label, title, className = "" }: { field: SortField, label: string, title?: string, className?: string }) => (
        <th 
            onClick={() => handleSort(field)} 
            className={`px-2 py-4 text-center cursor-pointer select-none group border-b border-neutral-100 dark:border-neutral-800 transition-colors ${sortField === field ? 'bg-neutral-50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/30 text-neutral-500 dark:text-neutral-400'} ${className}`}
            title={title}
        >
            <div className="flex items-center justify-center gap-0.5">
                {label} <SortIcon field={field} />
            </div>
        </th>
    );

    // Leader Card Logic (Independent of sort order)
    const leader = useMemo(() => {
        if (leaderboardData.length === 0) return null;
        // Always sort descending to find the best player for the card
        return [...leaderboardData].sort((a, b) => b[sortField] - a[sortField])[0];
    }, [leaderboardData, sortField]);
    
    const getSortLabel = (field: SortField) => {
        const labels: Record<string, string> = {
            rating: 'Rating',
            wpa: 'WPA',
            adr: 'ADR',
            firepower: '火力',
            entry: '破点',
            opening: '开局',
            trade: '补枪',
            sniper: '狙击',
            clutch: '残局',
            utility: '道具',
            matches: '场次'
        };
        return labels[field] || field.toUpperCase();
    };

    const getMvpValueDisplay = (field: SortField, val: number) => {
        if (field === 'rating') return val.toFixed(2);
        if (field === 'wpa') return (val > 0 ? '+' : '') + val.toFixed(1) + '%';
        if (field === 'adr') return val.toFixed(1);
        if (['matches', 'firepower', 'entry', 'opening', 'trade', 'sniper', 'clutch', 'utility'].includes(field)) return val.toFixed(0);
        return val;
    };

    // --- Empty State ---
    if (sortedData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-32 text-neutral-400 dark:text-neutral-600">
                <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
                <h3 className="text-lg font-bold text-neutral-500 dark:text-neutral-400">暂无数据</h3>
                <p className="text-xs mt-2 opacity-60">请先在赛程页面导入 Demo 数据</p>
            </div>
        );
    }

    return (
        <div className="pb-10 font-sans animate-in fade-in duration-500">
            
            {/* MVP/Leader Card */}
            {leader && (
                 <div className="mb-8 bg-neutral-900 dark:bg-black rounded-2xl p-6 text-white relative overflow-hidden shadow-xl border border-neutral-800">
                     <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-blue-900/20 to-transparent pointer-events-none"></div>
                     <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                         <div>
                             <div className="flex items-center gap-2 mb-2">
                                 <span className="bg-green-500/20 text-green-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border border-green-500/20">
                                     榜首
                                 </span>
                                 <span className="text-neutral-400 text-xs">{getSortLabel(sortField)}</span>
                             </div>
                             <h2 className="text-4xl font-black tracking-tight text-white mb-1">{leader.name}</h2>
                             <p className="text-sm text-neutral-400 font-medium">{leader.role}</p>
                         </div>

                         <div className="flex items-center gap-8 bg-white/5 rounded-xl p-4 backdrop-blur-sm border border-white/10">
                             <div className="text-center">
                                 <div className="text-[10px] text-neutral-400 uppercase font-bold mb-1">Rating</div>
                                 <div className="text-2xl font-black tabular-nums">{leader.rating.toFixed(2)}</div>
                             </div>
                             <div className="w-px h-8 bg-white/10"></div>
                             <div className="text-center">
                                 <div className="text-[10px] text-neutral-400 uppercase font-bold mb-1">{sortField === 'rating' ? 'ADR' : getSortLabel(sortField)}</div>
                                 <div className="text-2xl font-black tabular-nums text-green-400">
                                     {getMvpValueDisplay(sortField, leader[sortField])}
                                 </div>
                             </div>
                             <div className="w-px h-8 bg-white/10"></div>
                             <div className="text-center">
                                 <div className="text-[10px] text-neutral-400 uppercase font-bold mb-1">场次</div>
                                 <div className="text-2xl font-black tabular-nums">{leader.matches}</div>
                             </div>
                         </div>
                     </div>
                 </div>
            )}

            {/* Main Table */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead>
                            <tr className="bg-white dark:bg-neutral-900 text-[12px] font-bold text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                                <th className="px-6 py-4 sticky left-0 z-10 bg-inherit text-left w-40">选手 / 职责</th>
                                
                                {/* Core Stats */}
                                <HeaderCell field="rating" label="Rating" title="Rating 4.0 综合评分" />
                                <HeaderCell field="wpa" label="WPA" title="Win Probability Added 胜率贡献" />
                                <HeaderCell field="adr" label="ADR" title="Average Damage per Round 场均伤害" />
                                
                                {/* Ability Scores */}
                                <HeaderCell field="firepower" label="火力" title="输出能力 (Kills, Damage)" className="border-l border-neutral-100 dark:border-neutral-800" />
                                <HeaderCell field="entry" label="破点" title="突破能力 (Entry)" />
                                <HeaderCell field="opening" label="开局" title="首杀成功率 (Opening)" />
                                <HeaderCell field="trade" label="补枪" title="补枪效率 (Trade)" />
                                <HeaderCell field="sniper" label="狙击" title="狙击枪表现" />
                                <HeaderCell field="clutch" label="残局" title="残局处理能力" />
                                <HeaderCell field="utility" label="道具" title="道具使用效率" />
                                
                                <HeaderCell field="matches" label="场次" className="border-l border-neutral-100 dark:border-neutral-800" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800/50">
                            {sortedData.map((p, idx) => {
                                const rankColor = idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-neutral-400' : idx === 2 ? 'text-amber-700' : 'text-neutral-300 dark:text-neutral-600';
                                
                                return (
                                <tr key={p.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors group">
                                    <td className="px-6 py-4 sticky left-0 z-10 bg-white dark:bg-neutral-900 border-r border-transparent group-hover:border-neutral-100 dark:group-hover:border-neutral-800 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <span className={`font-mono text-lg font-black w-6 text-center ${rankColor}`}>
                                                {idx + 1}
                                            </span>
                                            <div>
                                                <div className="font-bold text-neutral-900 dark:text-white leading-none mb-1 text-sm">{p.name}</div>
                                                <div className="text-[10px] text-neutral-400 font-medium">{p.role}</div>
                                            </div>
                                        </div>
                                    </td>
                                    
                                    <td className={`px-2 py-4 text-center ${sortField === 'rating' ? 'bg-neutral-50 dark:bg-neutral-800/30' : ''}`}>
                                        <span className={`font-black font-mono text-base tracking-tight ${getRatingStyle(p.rating)}`}>
                                            {p.rating.toFixed(2)}
                                        </span>
                                    </td>
                                    <td className={`px-2 py-4 text-center ${sortField === 'wpa' ? 'bg-neutral-50 dark:bg-neutral-800/30' : ''}`}>
                                        <span className={`font-bold font-mono text-sm ${getWpaStyle(p.wpa)}`}>
                                            {p.wpa > 0 ? '+' : ''}{p.wpa.toFixed(1)}%
                                        </span>
                                    </td>
                                    <td className={`px-2 py-4 text-center font-mono text-sm font-medium text-neutral-600 dark:text-neutral-300 ${sortField === 'adr' ? 'bg-neutral-50 dark:bg-neutral-800/30' : ''}`}>
                                        {p.adr.toFixed(0)}
                                    </td>

                                    {/* Scores - Larger Font */}
                                    <td className={`px-2 py-4 text-center font-mono text-sm border-l border-neutral-50 dark:border-neutral-800/50 ${getScoreStyle(p.firepower)} ${sortField === 'firepower' ? 'bg-neutral-50 dark:bg-neutral-800/30' : ''}`}>{p.firepower}</td>
                                    <td className={`px-2 py-4 text-center font-mono text-sm ${getScoreStyle(p.entry)} ${sortField === 'entry' ? 'bg-neutral-50 dark:bg-neutral-800/30' : ''}`}>{p.entry}</td>
                                    <td className={`px-2 py-4 text-center font-mono text-sm ${getScoreStyle(p.opening)} ${sortField === 'opening' ? 'bg-neutral-50 dark:bg-neutral-800/30' : ''}`}>{p.opening}</td>
                                    <td className={`px-2 py-4 text-center font-mono text-sm ${getScoreStyle(p.trade)} ${sortField === 'trade' ? 'bg-neutral-50 dark:bg-neutral-800/30' : ''}`}>{p.trade}</td>
                                    <td className={`px-2 py-4 text-center font-mono text-sm ${getScoreStyle(p.sniper)} ${sortField === 'sniper' ? 'bg-neutral-50 dark:bg-neutral-800/30' : ''}`}>{p.sniper}</td>
                                    <td className={`px-2 py-4 text-center font-mono text-sm ${getScoreStyle(p.clutch)} ${sortField === 'clutch' ? 'bg-neutral-50 dark:bg-neutral-800/30' : ''}`}>{p.clutch}</td>
                                    <td className={`px-2 py-4 text-center font-mono text-sm ${getScoreStyle(p.utility)} ${sortField === 'utility' ? 'bg-neutral-50 dark:bg-neutral-800/30' : ''}`}>{p.utility}</td>
                                    
                                    <td className="px-2 py-4 text-center text-[10px] font-bold text-neutral-400 border-l border-neutral-50 dark:border-neutral-800/50">
                                        {p.matches}
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="mt-6 flex justify-center gap-6 text-[10px] text-neutral-400">
                <div className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${TIER_CLASSES.OUTSTANDING.bar}`}></span> 杰出 (80+)</div>
                <div className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${TIER_CLASSES.EXCELLENT.bar}`}></span> 优秀 (60-79)</div>
                <div className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${TIER_CLASSES.ORDINARY.bar}`}></span> 普通 (40-59)</div>
                <div className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${TIER_CLASSES.POOR.bar}`}></span> 需提升 (&lt;40)</div>
            </div>
        </div>
    );
};
