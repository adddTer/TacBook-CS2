import React, { useState, useEffect, useCallback } from 'react';
import { Match } from '../../types';
import { calculateGlobalStats, GlobalStats } from '../../utils/analytics/globalStatsAggregator';
import { PlayerStatsGrid } from './player_detail/PlayerStatsGrid';
import { PlayerAbilitySection } from './player_detail/PlayerAbilitySection';
import { AbilityType } from './player_detail/config';
import { RefreshCw, BarChart2 } from 'lucide-react';

interface StatsTabProps {
    allMatches: Match[];
}

export const StatsTab: React.FC<StatsTabProps> = ({ allMatches }) => {
    const [selectedAbility, setSelectedAbility] = useState<AbilityType>('firepower');
    const [stats, setStats] = useState<GlobalStats | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    const calculateStats = useCallback(() => {
        if (allMatches.length === 0) return;
        setIsCalculating(true);

        setTimeout(() => {
            const globalStats = calculateGlobalStats(allMatches);
            setStats(globalStats);
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
