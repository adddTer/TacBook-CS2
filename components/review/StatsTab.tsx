import React, { useState, useEffect, useCallback } from 'react';
import { Match } from '../../types';
import { MatchAggregator } from '../../utils/analytics/matchAggregator';
import { PlayerStatsGrid } from './player_detail/PlayerStatsGrid';
import { PlayerAbilitySection } from './player_detail/PlayerAbilitySection';
import { AbilityType } from './player_detail/config';
import { RefreshCw, BarChart2 } from 'lucide-react';

interface StatsTabProps {
    allMatches: Match[];
}

export const StatsTab: React.FC<StatsTabProps> = ({ allMatches }) => {
    const [selectedAbility, setSelectedAbility] = useState<AbilityType>('firepower');
    const [stats, setStats] = useState<any>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    const calculateStats = useCallback(() => {
        if (allMatches.length === 0) return;
        setIsCalculating(true);

        setTimeout(() => {
            // 1. Calculate the original aggregated stats for the ability section
            const aggregated = MatchAggregator.aggregateFull(allMatches);
            
            let totalRounds = 0;
            let sumRating = 0;
            let sumWpa = 0;
            let sumAdr = 0;
            let sumKpr = 0;
            let sumDpr = 0;
            let sumKast = 0;
            let sumMultiKillRate = 0;
            let sumHsPct = 0;
            
            let sumScoreFirepower = 0;
            let sumScoreEntry = 0;
            let sumScoreTrade = 0;
            let sumScoreOpening = 0;
            let sumScoreClutch = 0;
            let sumScoreSniper = 0;
            let sumScoreUtility = 0;

            const detailsAcc: Record<string, number> = {};
            const detailsWeight: Record<string, number> = {};

            aggregated.forEach(p => {
                const rounds = p.basic.r3_rounds_played || 1;
                totalRounds += rounds;
                
                const f = p.full.filtered;
                sumRating += f.details.rating * rounds;
                sumWpa += f.wpaAvg * rounds;
                sumAdr += f.adr * rounds;
                sumKpr += f.kpr * rounds;
                sumDpr += f.dpr * rounds;
                sumKast += f.kast * rounds;
                sumMultiKillRate += f.multiKillRate * rounds;
                sumHsPct += f.headshotPct * rounds;
                
                sumScoreFirepower += f.scoreFirepower * rounds;
                sumScoreEntry += f.scoreEntry * rounds;
                sumScoreTrade += f.scoreTrade * rounds;
                sumScoreOpening += f.scoreOpening * rounds;
                sumScoreClutch += f.scoreClutch * rounds;
                sumScoreSniper += f.scoreSniper * rounds;
                sumScoreUtility += f.scoreUtility * rounds;

                const isUtilityBroken = (f.details.totalFlashes > 5 && f.details.totalBlinded === 0) || 
                                        (f.details.totalFlashAssists > 0 && f.details.totalBlinded === 0);

                Object.entries(f.details).forEach(([key, val]) => {
                    if (val === null || val === undefined || typeof val !== 'number' || isNaN(val)) return;
                    const isUtilityField = ['utilDmgPerRound', 'utilKillsPer100', 'flashesPerRound', 'flashAssistsPerRound', 'blindTimePerRound', 'totalFlashes', 'totalBlinded', 'totalFlashAssists'].includes(key);
                    if (isUtilityField && isUtilityBroken) return;

                    if (!detailsAcc[key]) {
                        detailsAcc[key] = 0;
                        detailsWeight[key] = 0;
                    }
                    detailsAcc[key] += val * rounds;
                    detailsWeight[key] += rounds;
                });
            });

            const avgDetails: Record<string, number> = {};
            Object.keys(detailsAcc).forEach(key => {
                avgDetails[key] = detailsWeight[key] > 0 ? detailsAcc[key] / detailsWeight[key] : 0;
            });

            // Helper to get percentile
            const getPercentile = (data: number[], value: number, isBetterHigher: boolean) => {
                const countBelow = data.filter(d => d <= value).length;
                const percentile = (countBelow / data.length) * 100;
                return isBetterHigher ? (100 - percentile) : percentile;
            };

            // 2. Calculate fine-grained round distributions
            let totalPlayerRounds = 0;
            let totalAssists = 0;
            let totalDamage = 0;
            let totalHeadshots = 0;
            
            let totalEntryKills = 0;
            let totalEntryDeaths = 0;
            let totalTradeKills = 0;
            let totalTradedDeaths = 0;
            let totalSurvived = 0;
            
            let multiKills = { k0: 0, k1: 0, k2: 0, k3: 0, k4: 0, k5: 0 };
            let ratingDist = { r0_5: 0, r0_8: 0, r1_05: 0, r1_3: 0, r1_5: 0, rMax: 0 };
            let wpaDist = { w_neg10: 0, w_0: 0, w_10: 0, w_20: 0, w_max: 0 };
            
            let kastDist: number[] = [];
            let killsDist: number[] = [];
            let deathsDist: number[] = [];

            allMatches.forEach(match => {
                match.rounds?.forEach(round => {
                    Object.values(round.playerStats).forEach(p => {
                        totalPlayerRounds++;
                        
                        totalAssists += p.assists;
                        totalDamage += p.damage;
                        totalHeadshots += p.headshots || 0;
                        
                        if (p.isEntryKill) totalEntryKills++;
                        if (p.isEntryDeath) totalEntryDeaths++;
                        if (p.traded) totalTradeKills++;
                        if (p.wasTraded) totalTradedDeaths++;
                        if (p.survived) totalSurvived++;
                        
                        // KAST
                        const isKast = (p.kills > 0 || p.assists > 0 || p.survived || p.wasTraded) ? 1 : 0;
                        kastDist.push(isKast * 100);
                        
                        // Kills/Deaths
                        killsDist.push(p.kills);
                        deathsDist.push(p.deaths);
                        
                        // Multi-kills
                        if (p.kills === 0) multiKills.k0++;
                        else if (p.kills === 1) multiKills.k1++;
                        else if (p.kills === 2) multiKills.k2++;
                        else if (p.kills === 3) multiKills.k3++;
                        else if (p.kills === 4) multiKills.k4++;
                        else if (p.kills >= 5) multiKills.k5++;
                        
                        // Rating dist
                        if (p.rating < 0.5) ratingDist.r0_5++;
                        else if (p.rating < 0.8) ratingDist.r0_8++;
                        else if (p.rating < 1.05) ratingDist.r1_05++;
                        else if (p.rating < 1.3) ratingDist.r1_3++;
                        else if (p.rating < 1.5) ratingDist.r1_5++;
                        else ratingDist.rMax++;
                        
                        // WPA dist
                        if (p.wpa < -10) wpaDist.w_neg10++;
                        else if (p.wpa < 0) wpaDist.w_0++;
                        else if (p.wpa < 10) wpaDist.w_10++;
                        else if (p.wpa < 20) wpaDist.w_20++;
                        else wpaDist.w_max++;
                    });
                });
            });

            const avgKast = (sumKast / totalRounds);
            const avgKpr = sumKpr / totalRounds;
            const avgDpr = sumDpr / totalRounds;

            setStats({
                avgRating: sumRating / totalRounds,
                avgWpa: sumWpa / totalRounds,
                avgAdr: sumAdr / totalRounds,
                avgKpr: avgKpr,
                avgDpr: avgDpr,
                avgKast: avgKast,
                avgMultiKillRate: sumMultiKillRate / totalRounds,
                avgHsPct: sumHsPct / totalRounds,
                
                avgScoreFirepower: sumScoreFirepower / totalRounds,
                avgScoreEntry: sumScoreEntry / totalRounds,
                avgScoreTrade: sumScoreTrade / totalRounds,
                avgScoreOpening: sumScoreOpening / totalRounds,
                avgScoreClutch: sumScoreClutch / totalRounds,
                avgScoreSniper: sumScoreSniper / totalRounds,
                avgScoreUtility: sumScoreUtility / totalRounds,

                details: avgDetails,
                totalPlayers: aggregated.length,
                totalRounds,

                // New Dimensions
                totalPlayerRounds,
                totalAssists,
                totalDamage,
                totalHeadshots,
                entrySuccess: (totalEntryKills + totalEntryDeaths) > 0 ? totalEntryKills / (totalEntryKills + totalEntryDeaths) : 0,
                survivalRate: totalPlayerRounds > 0 ? totalSurvived / totalPlayerRounds : 0,
                tradeSuccess: (totalTradeKills + totalTradedDeaths) > 0 ? totalTradeKills / (totalTradeKills + totalTradedDeaths) : 0,
                multiKills,
                ratingDist,
                wpaDist,
                kastDist,
                killsDist,
                deathsDist,
                
                // Percentiles
                kastPercentile: getPercentile(kastDist, avgKast, true),
                killsPercentile: getPercentile(killsDist, avgKpr, true),
                deathsPercentile: getPercentile(deathsDist, avgDpr, false)
            });
            setIsCalculating(false);
        }, 10);
    }, [allMatches]);

    // Initial load
    useEffect(() => {
        if (allMatches.length > 0 && !stats && !isCalculating) {
            calculateStats();
        }
    }, [allMatches.length]);

    if (!stats && !isCalculating) return <div className="p-4 text-neutral-500">暂无比赛数据</div>;
    if (isCalculating) return (
        <div className="p-12 flex flex-col items-center justify-center text-neutral-500">
            <RefreshCw className="w-8 h-8 animate-spin mb-4 text-blue-500" />
            <div>正在计算全局数据分布...</div>
        </div>
    );

    const abilities = [
        { id: 'firepower' as AbilityType, label: '火力', value: stats.avgScoreFirepower }, 
        { id: 'entry' as AbilityType, label: '破点', value: stats.avgScoreEntry }, 
        { id: 'sniper' as AbilityType, label: '狙击', value: stats.avgScoreSniper }, 
        { id: 'clutch' as AbilityType, label: '残局', value: stats.avgScoreClutch }, 
        { id: 'opening' as AbilityType, label: '开局', value: stats.avgScoreOpening, isPct: false }, 
        { id: 'trade' as AbilityType, label: '补枪', value: stats.avgScoreTrade }, 
        { id: 'utility' as AbilityType, label: '道具', value: stats.avgScoreUtility }, 
    ];

    const formatWpa = (wpa: number) => {
        const sign = wpa > 0 ? '+' : '';
        return `${sign}${wpa.toFixed(3)}%`;
    };

    return (
        <div className="p-6 space-y-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">全局数据统计</h2>
                    <div className="text-sm text-neutral-500">
                        基于 {stats.totalPlayers} 名玩家，共计 {stats.totalPlayerRounds} 个玩家回合的统计数据
                    </div>
                </div>
                <button 
                    onClick={calculateStats}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium"
                >
                    <RefreshCw className="w-4 h-4" />
                    刷新数据
                </button>
            </div>

            {/* Core Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="平均 Rating" value={stats.avgRating.toFixed(3)} />
                <StatCard label="平均 WPA" value={formatWpa(stats.avgWpa)} />
                <StatCard label="平均 HS%" value={`${stats.avgHsPct.toFixed(2)}%`} />
                <StatCard label="平均 K/D" value={(stats.avgKpr / Math.max(0.01, stats.avgDpr)).toFixed(3)} />
            </div>

            {/* Text Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-neutral-900 dark:text-white">KAST%</span>
                        <span className="text-neutral-500">成功 {stats.avgKast.toFixed(0)}% / 失败 {(100 - stats.avgKast).toFixed(0)}%</span>
                    </div>
                </div>
                <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-neutral-900 dark:text-white">击杀</span>
                        <span className="text-neutral-500">0杀 {((stats.multiKills.k0 / stats.totalPlayerRounds) * 100).toFixed(0)}% / 1杀 {((stats.multiKills.k1 / stats.totalPlayerRounds) * 100).toFixed(0)}% / 2杀 {((stats.multiKills.k2 / stats.totalPlayerRounds) * 100).toFixed(0)}% / 3杀 {((stats.multiKills.k3 / stats.totalPlayerRounds) * 100).toFixed(0)}% / 4杀 {((stats.multiKills.k4 / stats.totalPlayerRounds) * 100).toFixed(0)}% / 5杀 {((stats.multiKills.k5 / stats.totalPlayerRounds) * 100).toFixed(0)}%</span>
                    </div>
                </div>
                <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-neutral-900 dark:text-white">死亡</span>
                        <span className="text-neutral-500">死亡 {((1 - stats.survivalRate) * 100).toFixed(0)}% / 存活 {(stats.survivalRate * 100).toFixed(0)}%</span>
                    </div>
                </div>
                <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-neutral-900 dark:text-white">多杀</span>
                        <span className="text-neutral-500">多杀 {((1 - (stats.multiKills.k0 / stats.totalPlayerRounds)) * 100).toFixed(0)}% / 未多杀 {(stats.multiKills.k0 / stats.totalPlayerRounds * 100).toFixed(0)}%</span>
                    </div>
                </div>
            </div>

            {/* New Dimensions: Distributions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <ContinuousDistributionChart title="Rating 分布" data={allMatches.flatMap(m => m.rounds.flatMap(r => Object.values(r.playerStats).map(p => p.rating)))} colors={['bg-blue-500']} isBetterHigher={true} />
                <ContinuousDistributionChart title="WPA 分布" data={allMatches.flatMap(m => m.rounds.flatMap(r => Object.values(r.playerStats).map(p => p.wpa)))} colors={['bg-purple-500']} isBetterHigher={true} />
                <ContinuousDistributionChart title="伤害分布" data={allMatches.flatMap(m => m.rounds.flatMap(r => Object.values(r.playerStats).map(p => p.damage)))} colors={['bg-yellow-500']} isBetterHigher={true} />
            </div>

            <PlayerStatsGrid 
                highPrecision={true}
                filtered={{
                    adr: stats.avgAdr,
                    kpr: stats.avgKpr,
                    kast: stats.avgKast,
                    wpaAvg: stats.avgWpa,
                    multiKillRate: stats.avgMultiKillRate,
                    dpr: stats.avgDpr
                }} 
            />

            <PlayerAbilitySection 
                highPrecision={true}
                abilities={abilities}
                selectedAbility={selectedAbility}
                onSelectAbility={setSelectedAbility}
                detailData={stats.details}
            />
        </div>
    );
};

const StatCard: React.FC<{ label: string, value: string }> = ({ label, value }) => (
    <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-center">
        <div className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">{label}</div>
        <div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums">{value}</div>
    </div>
);

const ContinuousDistributionChart = ({ title, data, colors, isBetterHigher = true }: { title: string, data: number[], colors?: string[], isBetterHigher?: boolean }) => {
    const sortedData = [...data].sort((a, b) => a - b);
    const min = sortedData[0];
    const max = sortedData[sortedData.length - 1];
    const range = max - min || 1;

    const bins = 60;
    const histogram = new Array(bins).fill(0);
    sortedData.forEach(val => {
        const binIndex = Math.min(bins - 1, Math.floor(((val - min) / range) * bins));
        histogram[binIndex]++;
    });

    const maxFreq = Math.max(...histogram, 1);
    
    // Percentiles to show
    const percentiles = [0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95];

    return (
        <div className="bg-neutral-900/50 p-5 rounded-2xl border border-neutral-800 shadow-sm">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4">{title}</h3>
            <div className="relative h-24 flex items-end">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox={`0 0 ${bins} 100`}>
                    <path 
                        d={`M 0 100 ${histogram.map((v, i) => `L ${i} ${100 - (v / maxFreq * 90)}`).join(' ')} L ${bins} 100 Z`}
                        className={`${colors ? colors[0].replace('bg-', 'fill-') : 'fill-blue-500'} opacity-20`}
                    />
                    <path 
                        d={`M 0 100 ${histogram.map((v, i) => `L ${i} ${100 - (v / maxFreq * 90)}`).join(' ')} L ${bins} 100 Z`}
                        className={`${colors ? colors[0].replace('bg-', 'stroke-') : 'stroke-blue-500'} fill-none stroke-[0.5px]`}
                    />
                </svg>

                <div className="absolute inset-0 flex">
                    {histogram.map((val, i) => {
                        const valAtBin = min + (i / bins) * range;
                        const countBelow = sortedData.filter(d => d <= valAtBin).length;
                        const percentile = (countBelow / sortedData.length) * 100;
                        const displayPercentile = isBetterHigher ? (100 - percentile) : percentile;

                        return (
                            <div key={i} className="flex-1 h-full group relative z-10">
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 backdrop-blur-sm text-white text-[10px] p-2 rounded shadow-lg z-20 w-32 pointer-events-none">
                                    <div className="font-bold border-b border-white/10 pb-1 mb-1">数值: {valAtBin.toFixed(2)}</div>
                                    <div className="flex justify-between"><span>人数:</span> <span>{val}</span></div>
                                    <div className="flex justify-between"><span>{isBetterHigher ? '前' : '后'} {displayPercentile.toFixed(1)}%</span></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="grid grid-cols-7 gap-1 mt-4 text-[9px] text-neutral-500">
                {percentiles.map(p => {
                    const val = sortedData[Math.floor(p * sortedData.length)];
                    return (
                        <div key={p} className="text-center">
                            <span className="block font-bold text-neutral-300">{(p * 100).toFixed(0)}%</span>
                            <span className="block">{val.toFixed(1)}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
