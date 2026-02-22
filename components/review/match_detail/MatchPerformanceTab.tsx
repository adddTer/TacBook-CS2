
import React, { useState, useMemo } from 'react';
import { Match, PlayerMatchStats } from '../../../types';
import { calculatePlayerStats, StatsResult } from '../../../utils/analytics/playerStatsCalculator';
import { identifyRole } from '../../../utils/analytics/roleIdentifier';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';
import { resolveName } from '../../../utils/demo/helpers';
import { getRatingColorClass } from '../ReviewShared';
import { getScoreStyle, getWpaStyle } from '../../../utils/styleConstants';

interface MatchPerformanceTabProps {
    match: Match;
}

export const MatchPerformanceTab: React.FC<MatchPerformanceTabProps> = ({ match }) => {
    // 1. Get all players in the match
    const allPlayers = useMemo(() => [...match.players, ...match.enemyPlayers], [match]);

    // 2. State for selected players
    const [player1Id, setPlayer1Id] = useState<string>(() => {
        return match.players[0]?.playerId || '';
    });

    const [player2Id, setPlayer2Id] = useState<string>(() => {
        const topEnemy = [...match.enemyPlayers].sort((a, b) => b.kills - a.kills)[0];
        return topEnemy?.playerId || match.enemyPlayers[0]?.playerId || '';
    });

    // 3. Calculate Stats for both players
    const stats1 = useMemo(() => {
        if (!player1Id) return null;
        const pStats = allPlayers.find(p => p.playerId === player1Id);
        if (!pStats) return null;
        return calculatePlayerStats(player1Id, [{ match, stats: pStats }], 'ALL');
    }, [player1Id, match, allPlayers]);

    const stats2 = useMemo(() => {
        if (!player2Id) return null;
        const pStats = allPlayers.find(p => p.playerId === player2Id);
        if (!pStats) return null;
        return calculatePlayerStats(player2Id, [{ match, stats: pStats }], 'ALL');
    }, [player2Id, match, allPlayers]);

    // 4. Identify Roles
    const role1 = stats1 ? identifyRole(stats1.filtered) : null;
    const role2 = stats2 ? identifyRole(stats2.filtered) : null;

    // 5. Prepare Radar Data (Merged for Overlap)
    const radarData = useMemo(() => {
        if (!stats1) return [];
        
        const s1 = stats1.filtered;
        const s2 = stats2?.filtered;

        return [
            { subject: '火力', A: s1.scoreFirepower, B: s2?.scoreFirepower || 0, fullMark: 100 },
            { subject: '破点', A: s1.scoreEntry, B: s2?.scoreEntry || 0, fullMark: 100 },
            { subject: '狙击', A: s1.scoreSniper, B: s2?.scoreSniper || 0, fullMark: 100 },
            { subject: '残局', A: s1.scoreClutch, B: s2?.scoreClutch || 0, fullMark: 100 },
            { subject: '开局', A: s1.scoreOpening, B: s2?.scoreOpening || 0, fullMark: 100 },
            { subject: '补枪', A: s1.scoreTrade, B: s2?.scoreTrade || 0, fullMark: 100 },
            { subject: '道具', A: s1.scoreUtility, B: s2?.scoreUtility || 0, fullMark: 100 },
        ];
    }, [stats1, stats2]);

    // Helper to render player selector
    const renderPlayerSelector = (
        selectedId: string, 
        onChange: (id: string) => void, 
        label: string,
        colorClass: string
    ) => (
        <div className="flex flex-col gap-2 w-full">
            <label className={`text-[10px] font-black uppercase tracking-widest ${colorClass}`}>{label}</label>
            <div className="relative">
                <select 
                    value={selectedId} 
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full appearance-none bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer hover:border-neutral-300 dark:hover:border-neutral-600"
                >
                    <optgroup label="我方队伍">
                        {match.players.map(p => (
                            <option key={p.playerId} value={p.playerId}>{resolveName(p.playerId)}</option>
                        ))}
                    </optgroup>
                    <optgroup label="敌方队伍">
                        {match.enemyPlayers.map(p => (
                            <option key={p.playerId} value={p.playerId}>{resolveName(p.playerId)}</option>
                        ))}
                    </optgroup>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
        </div>
    );

    // Helper to render stat card
    const renderStatCard = (stats: StatsResult | null, role: any, isPrimary: boolean) => {
        if (!stats) return null;
        const { filtered } = stats;
        const borderColor = isPrimary ? 'border-blue-500' : 'border-red-500';
        const textColor = isPrimary ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400';
        const bgGradient = isPrimary 
            ? 'from-blue-50/50 to-transparent dark:from-blue-900/10' 
            : 'from-red-50/50 to-transparent dark:from-red-900/10';

        return (
            <div className={`bg-white dark:bg-neutral-900 rounded-3xl p-1 shadow-sm border border-neutral-200 dark:border-neutral-800 h-full`}>
                <div className={`bg-gradient-to-b ${bgGradient} rounded-[20px] p-6 h-full flex flex-col`}>
                    
                    {/* Header: Rating & Role */}
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Rating</div>
                            <div className={`text-5xl font-black tracking-tighter ${getRatingColorClass(stats.overall.rating)}`}>
                                {stats.overall.rating.toFixed(2)}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">本局定位</div>
                            <div className={`text-xl font-black ${textColor}`}>{role?.name || '未知'}</div>
                            <div className="text-[10px] font-medium text-neutral-400 max-w-[120px] ml-auto mt-1 leading-tight">{role?.description}</div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 mt-auto">
                        <div className="bg-white/60 dark:bg-neutral-800/60 p-3 rounded-xl border border-neutral-100 dark:border-neutral-700/50 backdrop-blur-sm">
                            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">ADR</div>
                            <div className={`text-lg font-mono font-black ${getScoreStyle(filtered.adr, 'text')}`}>{filtered.adr.toFixed(1)}</div>
                        </div>
                        <div className="bg-white/60 dark:bg-neutral-800/60 p-3 rounded-xl border border-neutral-100 dark:border-neutral-700/50 backdrop-blur-sm">
                            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">KAST%</div>
                            <div className={`text-lg font-mono font-black ${getScoreStyle(filtered.kast, 'text')}`}>{filtered.kast.toFixed(1)}%</div>
                        </div>
                        <div className="bg-white/60 dark:bg-neutral-800/60 p-3 rounded-xl border border-neutral-100 dark:border-neutral-700/50 backdrop-blur-sm">
                            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">K/D</div>
                            <div className={`text-lg font-mono font-black ${getScoreStyle(filtered.kdr * 50, 'text')}`}>{filtered.kdr.toFixed(2)}</div>
                        </div>
                        <div className="bg-white/60 dark:bg-neutral-800/60 p-3 rounded-xl border border-neutral-100 dark:border-neutral-700/50 backdrop-blur-sm">
                            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">WPA</div>
                            <div className={`text-lg font-mono font-black ${getWpaStyle(filtered.wpaSum)}`}>
                                {filtered.wpaAvg > 0 ? '+' : ''}{filtered.wpaAvg.toFixed(2)}%
                            </div>
                        </div>
                        <div className="bg-white/60 dark:bg-neutral-800/60 p-3 rounded-xl border border-neutral-100 dark:border-neutral-700/50 backdrop-blur-sm">
                            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">首杀尝试</div>
                            <div className={`text-lg font-mono font-black ${getScoreStyle(filtered.details.openingAttempts, 'text')}`}>{filtered.details.openingAttempts.toFixed(1)}%</div>
                        </div>
                        <div className="bg-white/60 dark:bg-neutral-800/60 p-3 rounded-xl border border-neutral-100 dark:border-neutral-700/50 backdrop-blur-sm">
                            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">多杀回合</div>
                            <div className={`text-lg font-mono font-black ${getScoreStyle(filtered.multiKillRate, 'text')}`}>{filtered.multiKillRate.toFixed(1)}%</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Controls */}
            <div className="grid grid-cols-2 gap-4 md:gap-8 bg-neutral-100 dark:bg-neutral-900/50 p-4 rounded-2xl border border-neutral-200/50 dark:border-neutral-800/50">
                {renderPlayerSelector(player1Id, setPlayer1Id, "Player 1", "text-blue-500")}
                {renderPlayerSelector(player2Id, setPlayer2Id, "Player 2", "text-red-500")}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Player 1 Stats */}
                <div className="order-2 lg:order-1">
                    {renderStatCard(stats1, role1, true)}
                </div>

                {/* Radar Chart (Center) */}
                <div className="order-1 lg:order-2 bg-white dark:bg-neutral-900 rounded-3xl p-4 shadow-sm border border-neutral-200 dark:border-neutral-800 flex flex-col items-center justify-center min-h-[300px] lg:h-auto">
                    <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-6">能力对比</h3>
                    <div className="w-full h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                <PolarGrid strokeOpacity={0.1} />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#a3a3a3', fontSize: 11, fontWeight: 700 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar
                                    name="Player 1"
                                    dataKey="A"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    fill="#3b82f6"
                                    fillOpacity={0.2}
                                />
                                {stats2 && (
                                    <Radar
                                        name="Player 2"
                                        dataKey="B"
                                        stroke="#ef4444"
                                        strokeWidth={3}
                                        fill="#ef4444"
                                        fillOpacity={0.2}
                                    />
                                )}
                                <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '20px' }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Player 2 Stats */}
                <div className="order-3 lg:order-3">
                    {renderStatCard(stats2, role2, false)}
                </div>
            </div>
        </div>
    );
};
