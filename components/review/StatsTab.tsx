import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
    const stats = useMemo(() => {
        if (allMatches.length === 0) return null;
        return calculateGlobalStats(allMatches);
    }, [allMatches]);

    if (!stats) return <div className="p-4 text-neutral-500">暂无比赛数据</div>;

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
                        <span className="text-neutral-500">多杀 {((1 - ((stats.multiKills.k0 + stats.multiKills.k1) / stats.totalPlayerRounds)) * 100).toFixed(0)}% / 未多杀 {(((stats.multiKills.k0 + stats.multiKills.k1) / stats.totalPlayerRounds) * 100).toFixed(0)}%</span>
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

            {/* Debugging Tool: Seven-Dimensional Data Exporter */}
            {(process.env.NODE_ENV === 'development' || (typeof import.meta !== 'undefined' && import.meta.env?.DEV)) && (
                <div className="mt-12 p-6 border-2 border-red-500/20 bg-red-500/5 rounded-2xl">
                    <h3 className="text-lg font-bold text-red-500 mb-2 flex items-center gap-2">
                        <span>[Debug] 七维数据标定调试工具</span>
                    </h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                        仅在开发模式显示。此工具汇总了所有已导入Demo（基于 {stats.totalPlayers} 位玩家样本）中各项核心子属性的 <strong>均值(Mean)</strong> 和 <strong>标准差(StdDev)</strong>。可以作为您使用 Z-Score 或重置 Sigmoid 基线的真实参考系。
                    </p>
                    <div className="bg-neutral-900 text-neutral-100 p-4 rounded-xl font-mono text-xs overflow-auto max-h-96">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-neutral-800 text-neutral-400">
                                    <th className="pb-2 font-medium">Metric / Data Dimension</th>
                                    <th className="pb-2 font-medium text-right">Mean</th>
                                    <th className="pb-2 font-medium text-right">StdDev (σ)</th>
                                    <th className="pb-2 font-medium text-right">Min</th>
                                    <th className="pb-2 font-medium text-right">P10</th>
                                    <th className="pb-2 font-medium text-right">Median(P50)</th>
                                    <th className="pb-2 font-medium text-right">P90</th>
                                    <th className="pb-2 font-medium text-right">Max</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.keys(stats.details).sort().map(key => (
                                    <tr key={key} className="border-b border-neutral-800/50 hover:bg-white/5">
                                        <td className="py-2 text-blue-400">{key}</td>
                                        <td className="py-2 text-right text-emerald-400">
                                            {stats.details[key]?.toFixed(4)}
                                        </td>
                                        <td className="py-2 text-right text-purple-400">
                                            {stats.detailsStdDev?.[key]?.toFixed(4) || '0.0000'}
                                        </td>
                                        <td className="py-2 text-right text-neutral-400">
                                            {stats.detailsMin?.[key]?.toFixed(4) || '0.0000'}
                                        </td>
                                        <td className="py-2 text-right text-neutral-400">
                                            {stats.detailsP10?.[key]?.toFixed(4) || '0.0000'}
                                        </td>
                                        <td className="py-2 text-right text-neutral-400">
                                            {stats.detailsP50?.[key]?.toFixed(4) || '0.0000'}
                                        </td>
                                        <td className="py-2 text-right text-neutral-400">
                                            {stats.detailsP90?.[key]?.toFixed(4) || '0.0000'}
                                        </td>
                                        <td className="py-2 text-right text-neutral-400">
                                            {stats.detailsMax?.[key]?.toFixed(4) || '0.0000'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
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
    const min = sortedData[0] || 0;
    const max = sortedData[sortedData.length - 1] || 1;
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
        <div className="bg-neutral-50 dark:bg-neutral-900/50 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col h-full">
            <h3 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-4">{title}</h3>
            <div className="flex flex-1 gap-4">
                {/* Left: Y-axis (Count) */}
                <div className="flex flex-col justify-between text-[9px] text-neutral-400 dark:text-neutral-500 h-24 pb-1">
                    <span>{maxFreq}</span>
                    <span>{Math.floor(maxFreq / 2)}</span>
                    <span>0</span>
                </div>
                
                {/* Center: Chart & X-axis */}
                <div className="flex-1 flex flex-col">
                    <div className="relative h-24 flex items-end">
                        <svg className="w-full h-full" preserveAspectRatio="none" viewBox={`0 0 ${bins} 100`}>
                            <path 
                                d={`M 0 100 ${histogram.map((v, i) => `L ${i} ${100 - (v / maxFreq * 100)}`).join(' ')} L ${bins} 100 Z`}
                                className={`${colors ? colors[0].replace('bg-', 'fill-') : 'fill-blue-500'} opacity-20`}
                            />
                            <path 
                                d={`M 0 100 ${histogram.map((v, i) => `L ${i} ${100 - (v / maxFreq * 100)}`).join(' ')} L ${bins} 100 Z`}
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
                    {/* X-axis (Values) */}
                    <div className="flex justify-between mt-1 text-[9px] text-neutral-500">
                        <span>{min.toFixed(1)}</span>
                        <span>{(min + range * 0.25).toFixed(1)}</span>
                        <span>{(min + range * 0.5).toFixed(1)}</span>
                        <span>{(min + range * 0.75).toFixed(1)}</span>
                        <span>{max.toFixed(1)}</span>
                    </div>
                </div>

                {/* Right: Percentiles */}
                <div className="flex flex-col justify-between text-[9px] text-neutral-400 pl-2 border-l border-neutral-800">
                    <div className="font-bold text-neutral-500 mb-1">百分位</div>
                    {percentiles.map(p => {
                        const val = sortedData[Math.floor(p * (sortedData.length - 1))];
                        return (
                            <div key={p} className="flex justify-between gap-3">
                                <span>{(p * 100).toFixed(0)}%</span>
                                <span className="font-mono text-neutral-300">{val?.toFixed(2) || '0.00'}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
