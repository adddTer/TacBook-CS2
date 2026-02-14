
import React, { useMemo, useState } from 'react';
import { Match, PlayerRoundStats } from '../types';
import { ROSTER } from '../constants/roster';
import { resolveName } from '../utils/demo/helpers';
import { getRatingColorClass, RankBadge } from './review/ReviewShared';

interface LeaderboardViewProps {
    allMatches: Match[];
}

type SortField = 'rating' | 'wpa' | 'adr' | 'kast' | 'kd' | 'impact' | 'entry' | 'matches';
type SortOrder = 'asc' | 'desc';

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ allMatches }) => {
    const [sortField, setSortField] = useState<SortField>('rating');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    // --- Aggregation Logic (Mirrors ReviewView logic for consistency) ---
    const aggregatedStats = useMemo(() => {
        return ROSTER.map(player => {
            // Find matches where this player participated
            const matchesPlayed = allMatches.filter(m => {
                const allP = [...m.players, ...m.enemyPlayers];
                return allP.some(p => resolveName(p.playerId) === player.id || resolveName(p.steamid) === player.id);
            });

            if (matchesPlayed.length === 0) return null;

            // Get latest rank
            const latestMatch = matchesPlayed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            const latestPlayerStats = [...latestMatch.players, ...latestMatch.enemyPlayers]
                .find(p => resolveName(p.playerId) === player.id || resolveName(p.steamid) === player.id);
            const currentRank = latestPlayerStats?.rank || '?';

            // Accumulators
            let sums = {
                rounds: 0,
                kills: 0, deaths: 0, assists: 0,
                damage: 0,
                ratingSum: 0, // Weighted by rounds
                wpaSum: 0,
                impactSum: 0,
                kastRounds: 0,
                entryAttempts: 0,
                entrySuccess: 0,
                multiKills: 0,
                clutchWins: 0,
                utilityDamage: 0
            };

            matchesPlayed.forEach(m => {
                if (!m.rounds) return;

                const pMatch = [...m.players, ...m.enemyPlayers].find(p => resolveName(p.playerId) === player.id || resolveName(p.steamid) === player.id);
                if (!pMatch) return;
                
                // Use defined ID to lookup in round stats
                const pid = pMatch.steamid || pMatch.playerId;
                
                // Filter ghost rounds
                const validRounds = m.rounds.filter(r => {
                    const allS = Object.values(r.playerStats) as PlayerRoundStats[];
                    return !allS.every(s => s.rating === 0 && s.damage === 0);
                });

                validRounds.forEach(r => {
                    const pr = r.playerStats[pid];
                    if (!pr) return;
                    // Skip ghost player in round
                    if (pr.rating === 0 && pr.damage === 0 && pr.deaths === 0 && pr.kills === 0) return;

                    sums.rounds++;
                    sums.kills += pr.kills;
                    sums.deaths += pr.deaths;
                    sums.assists += pr.assists;
                    sums.damage += pr.damage;
                    sums.ratingSum += pr.rating;
                    sums.impactSum += pr.impact;
                    
                    if (typeof pr.wpa === 'number' && !isNaN(pr.wpa)) {
                        sums.wpaSum += pr.wpa;
                    }

                    if (pr.kills > 0 || pr.assists > 0 || pr.survived || pr.wasTraded) {
                        sums.kastRounds++;
                    }

                    if (pr.isEntryKill || pr.isEntryDeath) {
                        sums.entryAttempts++;
                        if (pr.isEntryKill) sums.entrySuccess++;
                    }

                    if (pr.kills >= 3) sums.multiKills++; // Define multi as 3+ for leaderboard highlight? Or just total multi rounds

                    if (pr.utility) {
                        sums.utilityDamage += (pr.utility.heDamage || 0) + (pr.utility.molotovDamage || 0);
                    } else {
                        sums.utilityDamage += pr.utilityDamage || 0;
                    }
                });

                // Clutches from summary if not derived from rounds (simplified)
                if (pMatch.clutches) {
                    sums.clutchWins += pMatch.clutches['1v1'].won + pMatch.clutches['1v2'].won + pMatch.clutches['1v3'].won + pMatch.clutches['1v4'].won + pMatch.clutches['1v5'].won;
                }
            });

            const totalRounds = Math.max(1, sums.rounds);
            const totalDeaths = Math.max(1, sums.deaths);

            // Rating 4.0 Logic: Average of round ratings * Scaling
            // Note: ReviewView uses (sumRating / rounds) * 1.30. We replicate that.
            const rating = (sums.ratingSum / totalRounds) * 1.30;

            return {
                id: player.id,
                name: player.name,
                role: player.role.split(' ')[0], // Short role
                rank: currentRank,
                matches: matchesPlayed.length,
                
                // Calculated Metrics
                rating: rating,
                wpa: sums.wpaSum / matchesPlayed.length, // Average WPA per Match (Total Points)
                adr: sums.damage / totalRounds,
                kast: (sums.kastRounds / totalRounds) * 100,
                kd: sums.kills / totalDeaths,
                impact: (sums.impactSum / totalRounds) * 1.30, // Normalize impact similar to rating
                
                // Detailed Stats
                entryRate: sums.entryAttempts > 0 ? (sums.entrySuccess / sums.entryAttempts) * 100 : 0,
                entryVol: sums.entryAttempts,
                utilDmgPerRound: sums.utilityDamage / totalRounds,
                clutches: sums.clutchWins
            };
        }).filter(Boolean) as any[]; // Cast to remove nulls
    }, [allMatches]);

    // --- Sorting ---
    const sortedData = useMemo(() => {
        return [...aggregatedStats].sort((a, b) => {
            const valA = a[sortField];
            const valB = b[sortField];
            return sortOrder === 'asc' ? valA - valB : valB - valA;
        });
    }, [aggregatedStats, sortField, sortOrder]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <span className="opacity-20 ml-1">⇅</span>;
        return <span className="ml-1 text-blue-500">{sortOrder === 'desc' ? '↓' : '↑'}</span>;
    };

    return (
        <div className="pb-24 animate-in fade-in duration-500 max-w-[1920px] mx-auto">
            
            {/* Hero Section / Summary */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                 {/* MVP Card */}
                 {sortedData.length > 0 && (
                     <div className="col-span-1 md:col-span-3 bg-gradient-to-br from-neutral-800 to-black rounded-2xl p-6 text-white relative overflow-hidden shadow-lg border border-neutral-700">
                         <div className="absolute right-0 top-0 p-8 opacity-10">
                            <svg className="w-40 h-40" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                         </div>
                         <div className="relative z-10 flex items-center gap-6">
                             <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-600 flex items-center justify-center text-4xl font-black text-black shadow-lg shadow-yellow-500/20">
                                 {sortedData[0].id[0]}
                             </div>
                             <div>
                                 <div className="text-xs font-bold text-yellow-400 uppercase tracking-widest mb-1">Current MVP</div>
                                 <h2 className="text-3xl font-black">{sortedData[0].id}</h2>
                                 <div className="flex gap-4 mt-2">
                                     <div className="text-sm"><span className="opacity-50">Rating</span> <span className="font-bold text-yellow-300">{sortedData[0].rating.toFixed(2)}</span></div>
                                     <div className="text-sm"><span className="opacity-50">ADR</span> <span className="font-bold">{sortedData[0].adr.toFixed(1)}</span></div>
                                     <div className="text-sm"><span className="opacity-50">WPA</span> <span className="font-bold text-green-400">+{sortedData[0].wpa.toFixed(1)}</span></div>
                                 </div>
                             </div>
                         </div>
                     </div>
                 )}
            </div>

            {/* Main Table */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead>
                            <tr className="bg-neutral-50 dark:bg-neutral-950/50 text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                                <th className="px-4 py-3 sticky left-0 z-10 bg-inherit">Player</th>
                                <th onClick={() => handleSort('rating')} className="px-3 py-3 text-center cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800">
                                    Rating 4.0 <SortIcon field="rating" />
                                </th>
                                <th onClick={() => handleSort('wpa')} className="px-3 py-3 text-center cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800">
                                    WPA/Match <SortIcon field="wpa" />
                                </th>
                                <th onClick={() => handleSort('adr')} className="px-3 py-3 text-center cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800">
                                    ADR <SortIcon field="adr" />
                                </th>
                                <th onClick={() => handleSort('kd')} className="px-3 py-3 text-center cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800">
                                    K/D <SortIcon field="kd" />
                                </th>
                                <th onClick={() => handleSort('kast')} className="px-3 py-3 text-center cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800">
                                    KAST% <SortIcon field="kast" />
                                </th>
                                <th onClick={() => handleSort('impact')} className="px-3 py-3 text-center cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800">
                                    Impact <SortIcon field="impact" />
                                </th>
                                <th onClick={() => handleSort('entry')} className="px-3 py-3 text-center cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800">
                                    首杀率 (Att) <SortIcon field="entry" />
                                </th>
                                <th className="px-3 py-3 text-center">道具均伤</th>
                                <th className="px-3 py-3 text-center">残局胜</th>
                                <th onClick={() => handleSort('matches')} className="px-3 py-3 text-center cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800">
                                    场次 <SortIcon field="matches" />
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-sans tabular-nums">
                            {sortedData.map((p, idx) => (
                                <tr key={p.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
                                    <td className="px-4 py-3 font-bold text-neutral-900 dark:text-white sticky left-0 z-10 bg-white dark:bg-neutral-900 border-r border-transparent">
                                        <div className="flex items-center gap-3">
                                            <span className={`text-[10px] font-mono w-4 text-center ${idx < 3 ? 'text-yellow-500 font-black' : 'text-neutral-400'}`}>{idx + 1}</span>
                                            <div>
                                                <div className="leading-none">{p.name}</div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[9px] font-medium text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 rounded">{p.role}</span>
                                                    <RankBadge rank={p.rank} />
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                        <div className={`text-lg font-black ${getRatingColorClass(p.rating)}`}>{p.rating.toFixed(2)}</div>
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                        <div className={`font-bold ${p.wpa > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            {p.wpa > 0 ? '+' : ''}{p.wpa.toFixed(1)}
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 text-center font-bold text-neutral-700 dark:text-neutral-300">
                                        {p.adr.toFixed(1)}
                                    </td>
                                    <td className="px-3 py-3 text-center font-bold">
                                        <span className={p.kd >= 1.1 ? 'text-green-500' : p.kd < 0.9 ? 'text-red-500' : 'text-neutral-500'}>
                                            {p.kd.toFixed(2)}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 text-center font-bold text-neutral-600 dark:text-neutral-400">
                                        {p.kast.toFixed(1)}%
                                    </td>
                                    <td className="px-3 py-3 text-center font-bold text-blue-500">
                                        {p.impact.toFixed(2)}
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                        <div className="flex flex-col items-center">
                                            <span className="font-bold text-neutral-800 dark:text-neutral-200">{p.entryRate.toFixed(0)}%</span>
                                            <span className="text-[9px] text-neutral-400">({p.entryVol})</span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 text-center text-neutral-500">
                                        {p.utilDmgPerRound.toFixed(1)}
                                    </td>
                                    <td className="px-3 py-3 text-center text-yellow-600 dark:text-yellow-500 font-bold">
                                        {p.clutches}
                                    </td>
                                    <td className="px-3 py-3 text-center text-neutral-400 text-xs">
                                        {p.matches}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
