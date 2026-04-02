
import React, { useMemo, useState } from 'react';
import { Match } from '../types';
import { ROSTER } from '../constants/roster';
import { resolveName } from '../utils/demo/helpers';
import { getRatingColorClass, RankBadge } from './review/ReviewShared';
import { Search, Filter, Trophy, Target, Zap, Shield, Crosshair, Activity, Flame } from 'lucide-react';
import { MatchAggregator } from '../utils/analytics/matchAggregator';

interface LeaderboardViewProps {
    allMatches: Match[];
}

type SortField = 'rating' | 'wpa' | 'adr' | 'kast' | 'kd' | 'impact' | 'entry' | 'matches' | 'utility' | 'clutch';
type SortOrder = 'asc' | 'desc';

const CommanderBadge = () => (
    <span className="ml-1 inline-flex items-center justify-center bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shadow-sm shadow-amber-500/20 shrink-0" title="指挥 (IGL)">
        <svg className="w-2.5 h-2.5 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        指挥
    </span>
);

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ allMatches }) => {
    const [sortField, setSortField] = useState<SortField>('rating');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('ALL');
    const [minMatches, setMinMatches] = useState<number>(1);

    // --- Aggregation Logic ---
    const aggregatedStats = useMemo(() => {
        const aggregatedAll = MatchAggregator.aggregateFull(allMatches);
        
        return ROSTER.map(player => {
            const aggregatedPlayer = aggregatedAll.find(p => p.playerId === player.id || p.steamid === player.id);
            if (!aggregatedPlayer || aggregatedPlayer.matchesPlayed === 0) return null;

            // Get latest rank
            const matchesPlayed = allMatches.filter(m => {
                const allP = [...m.players, ...m.enemyPlayers];
                return allP.some(p => resolveName(p.playerId) === player.id || resolveName(p.steamid) === player.id);
            });
            const latestMatch = matchesPlayed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            const latestPlayerStats = [...latestMatch.players, ...latestMatch.enemyPlayers]
                .find(p => resolveName(p.playerId) === player.id || resolveName(p.steamid) === player.id);
            const currentRank = latestPlayerStats?.rank || '?';

            // Calculate total clutches won
            let clutchWins = 0;
            if (aggregatedPlayer.basic.clutches) {
                const c = aggregatedPlayer.basic.clutches;
                clutchWins = (c['1v1']?.won || 0) + (c['1v2']?.won || 0) + (c['1v3']?.won || 0) + (c['1v4']?.won || 0) + (c['1v5']?.won || 0);
            }

            return {
                id: player.id,
                name: player.name,
                role: player.roleType, // Use roleType for cleaner display
                fullRole: player.role,
                rank: currentRank,
                matches: aggregatedPlayer.matchesPlayed,
                
                // Calculated Metrics
                rating: aggregatedPlayer.full.overall.rating,
                wpa: aggregatedPlayer.full.filtered.wpaAvg,
                adr: aggregatedPlayer.full.filtered.adr,
                kd: aggregatedPlayer.full.filtered.kdr,
                impact: aggregatedPlayer.full.filtered.impact,
                
                // Detailed Stats
                entryRate: aggregatedPlayer.full.filtered.details.openingSuccessPct,
                entryVol: aggregatedPlayer.full.filtered.details.openingAttempts,
                utilDmgPerRound: aggregatedPlayer.full.filtered.details.utilDmgPerRound,
                clutches: clutchWins
            };
        }).filter(Boolean) as any[];
    }, [allMatches]);

    // --- Filtering & Sorting ---
    const processedData = useMemo(() => {
        let data = [...aggregatedStats];

        // Filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            data = data.filter(p => p.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q));
        }
        if (roleFilter !== 'ALL') {
            data = data.filter(p => p.role === roleFilter); // Match exact roleType
        }
        if (minMatches > 0) {
            data = data.filter(p => p.matches >= minMatches);
        }

        // Sort
        return data.sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];
            
            // Special handling for mapped fields if needed
            if (sortField === 'utility') {
                valA = a.utilDmgPerRound;
                valB = b.utilDmgPerRound;
            } else if (sortField === 'clutch') {
                valA = a.clutches;
                valB = b.clutches;
            } else if (sortField === 'entry') {
                valA = a.entryRate; // Sort by success rate primarily? Or volume? Let's do rate.
                valB = b.entryRate;
            }

            return sortOrder === 'asc' ? valA - valB : valB - valA;
        });
    }, [aggregatedStats, sortField, sortOrder, searchQuery, roleFilter, minMatches]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    const SortHeader = ({ field, label, icon: Icon }: { field: SortField, label: string, icon?: any }) => (
        <th 
            onClick={() => handleSort(field)} 
            className={`px-4 py-3 text-left cursor-pointer transition-colors group select-none ${sortField === field ? 'bg-neutral-100 dark:bg-neutral-800 text-blue-600 dark:text-blue-400' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'}`}
        >
            <div className="flex items-center gap-1.5">
                {Icon && <Icon className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />}
                <span>{label}</span>
                <span className={`ml-auto text-xs transition-opacity ${sortField === field ? 'opacity-100' : 'opacity-0'}`}>
                    {sortOrder === 'desc' ? '↓' : '↑'}
                </span>
            </div>
        </th>
    );

    // Helper for bar visualization
    const StatBar = ({ value, max, colorClass }: { value: number, max: number, colorClass: string }) => (
        <div className="h-1.5 w-16 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden mt-1">
            <div 
                className={`h-full rounded-full ${colorClass}`} 
                style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
            />
        </div>
    );

    return (
        <div className="pb-24 animate-in fade-in duration-500 max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 mt-4">
                <div>
                    <h1 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
                        <Trophy className="w-8 h-8 text-yellow-500" />
                        Leaderboard
                    </h1>
                    <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
                        Compare player performance across all matches
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input 
                            type="text" 
                            placeholder="Search player..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-64"
                        />
                    </div>
                    
                    <div className="flex items-center gap-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-1">
                        {['ALL', '狙击手', '突破手', '补枪手', '自由人', '道具手'].map(role => (
                            <button
                                key={role}
                                onClick={() => setRoleFilter(role)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                    roleFilter === role 
                                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-black shadow-sm' 
                                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                                }`}
                            >
                                {role === 'ALL' ? '全部' : role}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Top 3 Podium (Only show if no search/filter active for best effect, or always?) */}
            {!searchQuery && roleFilter === 'ALL' && processedData.length >= 3 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 items-end">
                    {/* 2nd Place */}
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 relative overflow-hidden order-2 md:order-1">
                        <div className="absolute top-0 right-0 p-4 opacity-5 font-black text-6xl">2</div>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-xl font-bold text-neutral-500">
                                {processedData[1].id[0]}
                            </div>
                            <div>
                                <div className="font-bold text-lg flex items-center">
                                    {processedData[1].id}
                                    {ROSTER.find(r => r.id === processedData[1].id)?.isCommander && <CommanderBadge />}
                                </div>
                                <div className="text-xs text-neutral-500">{processedData[1].role}</div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-neutral-500">Rating</span>
                                <span className="font-bold">{processedData[1].rating.toFixed(2)}</span>
                            </div>
                            <StatBar value={processedData[1].rating} max={2.0} colorClass="bg-neutral-400" />
                        </div>
                    </div>

                    {/* 1st Place (MVP) */}
                    <div className="bg-linear-to-br from-neutral-900 to-black text-white rounded-2xl p-8 relative overflow-hidden shadow-xl shadow-black/20 order-1 md:order-2 transform md:-translate-y-4 border border-neutral-700/50">
                        <div className="absolute top-0 right-0 p-6 opacity-10">
                            <Trophy className="w-32 h-32" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-5 mb-6">
                                <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-3xl font-black text-black shadow-lg shadow-orange-500/20">
                                    {processedData[0].id[0]}
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-yellow-400 uppercase tracking-widest mb-1">Season MVP</div>
                                    <div className="font-black text-3xl flex items-center">
                                        {processedData[0].id}
                                        {ROSTER.find(r => r.id === processedData[0].id)?.isCommander && <CommanderBadge />}
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                                    <div className="text-xs text-white/50 mb-1">Rating 4.0</div>
                                    <div className="text-2xl font-bold text-yellow-400">{processedData[0].rating.toFixed(2)}</div>
                                </div>
                                <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                                    <div className="text-xs text-white/50 mb-1">ADR</div>
                                    <div className="text-2xl font-bold">{processedData[0].adr.toFixed(1)}</div>
                                </div>
                                <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                                    <div className="text-xs text-white/50 mb-1">Impact</div>
                                    <div className="text-2xl font-bold text-blue-400">{processedData[0].impact.toFixed(2)}</div>
                                </div>
                                <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                                    <div className="text-xs text-white/50 mb-1">K/D</div>
                                    <div className="text-2xl font-bold text-green-400">{processedData[0].kd.toFixed(2)}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3rd Place */}
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 relative overflow-hidden order-3">
                        <div className="absolute top-0 right-0 p-4 opacity-5 font-black text-6xl">3</div>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-xl font-bold text-neutral-500">
                                {processedData[2].id[0]}
                            </div>
                            <div>
                                <div className="font-bold text-lg flex items-center">
                                    {processedData[2].id}
                                    {ROSTER.find(r => r.id === processedData[2].id)?.isCommander && <CommanderBadge />}
                                </div>
                                <div className="text-xs text-neutral-500">{processedData[2].role}</div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-neutral-500">Rating</span>
                                <span className="font-bold">{processedData[2].rating.toFixed(2)}</span>
                            </div>
                            <StatBar value={processedData[2].rating} max={2.0} colorClass="bg-orange-700/50" />
                        </div>
                    </div>
                </div>
            )}

            {/* Main Table */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead>
                            <tr className="bg-neutral-50 dark:bg-neutral-950/50 text-[11px] uppercase font-bold text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                                <th className="px-4 py-3 sticky left-0 z-10 bg-inherit">Player</th>
                                <SortHeader field="rating" label="RTG" icon={Activity} />
                                <SortHeader field="adr" label="ADR" icon={Target} />
                                <SortHeader field="impact" label="Impact" icon={Zap} />
                                <SortHeader field="kd" label="K/D" icon={Crosshair} />
                                <SortHeader field="entry" label="Entry" icon={Flame} />
                                <SortHeader field="utility" label="Util Dmg" />
                                <SortHeader field="clutch" label="Clutches" />
                                <SortHeader field="wpa" label="WPA" />
                                <SortHeader field="matches" label="地图数" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-sans tabular-nums">
                            {processedData.map((p, idx) => (
                                <tr key={p.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group">
                                    <td className="px-4 py-3 font-bold text-neutral-900 dark:text-white sticky left-0 z-10 bg-white dark:bg-neutral-900 group-hover:bg-neutral-50 dark:group-hover:bg-neutral-800/50 border-r border-transparent transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className={`text-[10px] font-mono w-5 text-center ${idx < 3 ? 'text-yellow-500 font-black' : 'text-neutral-400'}`}>
                                                #{idx + 1}
                                            </span>
                                            <div>
                                                <div className="leading-none text-sm flex items-center">
                                                    {p.name}
                                                    {ROSTER.find(r => r.id === p.id)?.isCommander && <CommanderBadge />}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[9px] font-medium text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 rounded border border-neutral-200 dark:border-neutral-700">{p.role}</span>
                                                    <RankBadge rank={p.rank} />
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col gap-1">
                                            <span className={`text-sm font-black ${getRatingColorClass(p.rating)}`}>{p.rating.toFixed(2)}</span>
                                            <StatBar value={p.rating} max={2.0} colorClass={p.rating >= 1.2 ? 'bg-blue-500' : p.rating >= 1.0 ? 'bg-green-500' : 'bg-neutral-300'} />
                                        </div>
                                    </td>

                                    <td className="px-4 py-3">
                                        <div className="font-bold text-neutral-700 dark:text-neutral-300">{p.adr.toFixed(1)}</div>
                                        <div className="text-[10px] text-neutral-400">dmg/rnd</div>
                                    </td>

                                    <td className="px-4 py-3">
                                        <div className={`font-bold ${p.impact >= 1.2 ? 'text-blue-500' : ''}`}>{p.impact.toFixed(2)}</div>
                                    </td>

                                    <td className="px-4 py-3">
                                        <span className={`font-bold ${p.kd >= 1.1 ? 'text-green-500' : p.kd < 0.9 ? 'text-red-500' : 'text-neutral-500'}`}>
                                            {p.kd.toFixed(2)}
                                        </span>
                                    </td>

                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <span className="font-bold">{p.entryRate.toFixed(0)}%</span>
                                            <span className="text-[10px] text-neutral-400">{p.entryVol} att</span>
                                        </div>
                                    </td>

                                    <td className="px-4 py-3 text-neutral-500">
                                        {p.utilDmgPerRound.toFixed(1)}
                                    </td>

                                    <td className="px-4 py-3 text-yellow-600 dark:text-yellow-500 font-bold">
                                        {p.clutches}
                                    </td>

                                    <td className="px-4 py-3">
                                        <span className={`font-bold ${p.wpa > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            {p.wpa > 0 ? '+' : ''}{p.wpa.toFixed(2)}%
                                        </span>
                                    </td>

                                    <td className="px-4 py-3 text-neutral-400 text-xs font-mono">
                                        {p.matches}
                                    </td>
                                </tr>
                            ))}
                            
                            {processedData.length === 0 && (
                                <tr>
                                    <td colSpan={11} className="px-4 py-12 text-center text-neutral-500">
                                        No players found matching your criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
