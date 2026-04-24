import React, { useMemo, useState } from 'react';
import { Match, TeamProfile } from '../../types';
import { PlayerList } from './PlayerList';
import { calculateTeamRating, calculateTeamWinRateMatrix, calculateComprehensiveTeamStats } from '../../utils/analytics/teamStatsCalculator';
import { getRatingStyle } from '../../utils/styleConstants';
import { MATRIX_PRE } from '../../utils/rating3/wpa/constants';
import { MAPS } from '../../constants';

interface TeamDetailProps {
    team: TeamProfile;
    playerStats: any[];
    matches: Match[];
    onBack: () => void;
    onSelectPlayer: (playerId: string) => void;
}

export const TeamDetail: React.FC<TeamDetailProps> = ({ team, playerStats, matches, onBack, onSelectPlayer }) => {
    const [sideFilter, setSideFilter] = useState<'All' | 'T' | 'CT'>('All');
    const [minTeamMembers, setMinTeamMembers] = useState<number>(3);
    const [maxTeamMembers, setMaxTeamMembers] = useState<number>(5);

    // Filter playerStats to only include players in the selected team
    const teamPlayerStats = useMemo(() => {
        return playerStats.filter(p => team.players.some(tp => tp.id === p.id));
    }, [playerStats, team.players]);

    const teamRatingStr = useMemo(() => {
        const rating = calculateTeamRating(team.players, matches);
        return rating > 0 ? rating.toFixed(2) : '-';
    }, [team.players, matches]);
    
    // Use internal enum matching old toggle
    const internalSideFilter = sideFilter === 'All' ? 'ALL' : sideFilter;

    // Sort players by Rating within the team detail
    const sortedTeamPlayerStats = useMemo(() => {
        // Build a quick lookup for playerId -> player
        const playerIdMap = new Map<string, string>();
        team.players.forEach(p => {
            playerIdMap.set(p.id, p.id);
            if (p.steamids) {
                p.steamids.forEach(steamId => {
                    playerIdMap.set(steamId, p.id);
                });
            }
        });

        // Resolve generic keys mapping dynamically
        const resolveKeyToPlayerId = (key: string): string | null => {
            if (playerIdMap.has(key)) return playerIdMap.get(key)!;
            // Maybe handle missing normalizations if needed
            return null;
        };

        const filteredPlayerRatings = new Map<string, { sum: number, count: number }>();
        
        matches.forEach(match => {
            if (!match.rounds) return;
            match.rounds.forEach(round => {
                let mySide: any = null;
                let matchingMembersCount = 0;
                const roundPlayerIds = new Set<string>();
                
                Object.entries(round.playerStats).forEach(([key, pStat]) => {
                    let k = key;
                    if (k.startsWith('[U:')) {
                        const parts = k.split(':');
                        if (parts.length >= 3) {
                            const accountId = parseInt(parts[2].replace(']', ''), 10);
                            const base = BigInt('76561197960265728');
                            k = (base + BigInt(accountId)).toString();
                        }
                    } else if (/^\d+$/.test(k) && k.length < 16) {
                        const accountId = parseInt(k, 10);
                        const base = BigInt('76561197960265728');
                        k = (base + BigInt(accountId)).toString();
                    }

                    const pid = resolveKeyToPlayerId(k) || resolveKeyToPlayerId(key);
                    if (pid) {
                        if (!mySide) mySide = pStat.side;
                        matchingMembersCount++;
                        roundPlayerIds.add(pid);
                    }
                });

                if (!mySide || matchingMembersCount < minTeamMembers || matchingMembersCount > maxTeamMembers) {
                    return;
                }
                if (internalSideFilter !== 'ALL' && mySide !== internalSideFilter) {
                    return;
                }

                // If valid round, aggregate the rating scores
                Object.entries(round.playerStats).forEach(([key, pStat]) => {
                    let k = key;
                    if (k.startsWith('[U:')) {
                        const parts = k.split(':');
                        if (parts.length >= 3) {
                            const accountId = parseInt(parts[2].replace(']', ''), 10);
                            const base = BigInt('76561197960265728');
                            k = (base + BigInt(accountId)).toString();
                        }
                    } else if (/^\d+$/.test(k) && k.length < 16) {
                        const accountId = parseInt(k, 10);
                        const base = BigInt('76561197960265728');
                        k = (base + BigInt(accountId)).toString();
                    }

                    const pid = resolveKeyToPlayerId(k) || resolveKeyToPlayerId(key);
                    if (pid && roundPlayerIds.has(pid) && pStat.rating !== undefined) {
                        const current = filteredPlayerRatings.get(pid) || { sum: 0, count: 0 };
                        filteredPlayerRatings.set(pid, { sum: current.sum + pStat.rating, count: current.count + 1 });
                    }
                });
            });
        });

        const updatedStats = teamPlayerStats.map(p => {
            const filtered = filteredPlayerRatings.get(p.id);
            const newRating = filtered && filtered.count > 0 ? (filtered.sum / filtered.count).toFixed(2) : '-';
            return {
                ...p,
                avgRating: newRating !== '-' ? Number(newRating).toFixed(2) : '-', // override avgRating specifically
                matches: filtered ? filtered.count : 0, // override matches to represent rounds played in this filter context
                dataTypeLabel: '回合'
            };
        });

        return updatedStats.sort((a, b) => {
            if (a.avgRating === '-' && b.avgRating === '-') return 0;
            if (a.avgRating === '-') return 1;
            if (b.avgRating === '-') return -1;
            return Number(b.avgRating) - Number(a.avgRating);
        });
    }, [teamPlayerStats, team.players, matches, minTeamMembers, maxTeamMembers, internalSideFilter]);

    const winRateMatrix = useMemo(() => {
        return calculateTeamWinRateMatrix(team.players, matches, internalSideFilter, minTeamMembers, maxTeamMembers).matrix;
    }, [team.players, matches, internalSideFilter, minTeamMembers, maxTeamMembers]);

    const compStats = useMemo(() => {
        return calculateComprehensiveTeamStats(team.players, matches, internalSideFilter, minTeamMembers, maxTeamMembers);
    }, [team.players, matches, internalSideFilter, minTeamMembers, maxTeamMembers]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
            {/* Header Section */}
            <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 shadow-sm border border-neutral-200/50 dark:border-neutral-800/50 bg-gradient-to-br from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-950">
                <div className="absolute top-0 right-0 p-8 opacity-5 dark:opacity-10 pointer-events-none">
                    <svg className="w-48 h-48 sm:w-64 sm:h-64 rotate-12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                </div>
                
                <div className="relative flex items-start gap-4 sm:gap-6">
                    <button 
                        onClick={onBack}
                        className="w-10 h-10 shrink-0 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-full flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:scale-105 hover:shadow-md transition-all duration-200"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div className="flex-1 mt-1 sm:mt-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2 -mt-1 sm:mt-0">
                            <h2 className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white tracking-tight">{team.name}</h2>
                            <span className={`w-fit text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-md border ${team.type === 'user' ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800' : 'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700'}`}>
                                {team.type === 'user' ? '用户队伍 User Team' : '职业队伍 Pro Team'}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                            <div className="flex items-center gap-1.5">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                <span>{team.players.length} 名活跃队员</span>
                            </div>
                            
                            {teamRatingStr !== '-' && (
                                <>
                                    <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600 hidden sm:block"></span>
                                    <div className="flex items-center gap-1.5">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                        <span>综合战绩表现: <span className={`font-black ml-1 ${getRatingStyle(Number(teamRatingStr), 'text')}`}>{teamRatingStr} R</span></span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Control Bar for Filters that apply to everything below */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/60 dark:border-neutral-800/60 rounded-2xl p-2 sm:p-3 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800/50 rounded-xl p-1 shadow-sm shrink-0">
                        <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest px-2 sm:px-3">最少参与人数</span>
                        {[3, 4, 5].map(n => (
                            <button
                                key={`min-${n}`}
                                onClick={() => {
                                    setMinTeamMembers(n);
                                    if (n > maxTeamMembers) setMaxTeamMembers(n);
                                }}
                                className={`w-8 h-7 rounded-lg text-xs font-bold transition-all ${
                                    minTeamMembers === n 
                                        ? 'bg-blue-600 text-white shadow-md' 
                                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                }`}
                            >
                                {n}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800/50 rounded-xl p-1 shadow-sm shrink-0">
                        <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest px-2 sm:px-3">最多参与人数</span>
                        {[3, 4, 5].map(n => (
                            <button
                                key={`max-${n}`}
                                onClick={() => {
                                    setMaxTeamMembers(n);
                                    if (n < minTeamMembers) setMinTeamMembers(n);
                                }}
                                className={`w-8 h-7 rounded-lg text-xs font-bold transition-all ${
                                    maxTeamMembers === n 
                                        ? 'bg-blue-600 text-white shadow-md' 
                                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                }`}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800/50 rounded-xl p-1 shadow-sm shrink-0">
                    {(['All', 'T', 'CT'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setSideFilter(tab)}
                            className={`px-5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                sideFilter === tab 
                                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-md' 
                                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
                            }`}
                        >
                            {tab === 'All' ? '全部阵营' : tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Comprehensive Stats Section */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="col-span-2 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/10 dark:to-blue-900/10 border border-indigo-100 dark:border-indigo-800/30 rounded-2xl p-5 shadow-sm flex flex-col justify-center">
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>整体回合胜率 Win Rate</span>
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-black text-indigo-900 dark:text-indigo-50 leading-none">
                            {compStats.roundsPlayed > 0 ? ((compStats.roundsWon / compStats.roundsPlayed) * 100).toFixed(1) + '%' : '-'}
                        </span>
                        <span className="text-xs font-medium text-indigo-500 dark:text-indigo-400 mb-1">{compStats.roundsPlayed} 局</span>
                    </div>
                </div>
                
                <div className="col-span-2 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-2xl p-5 shadow-sm flex flex-col justify-center">
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>团队 K/D</span>
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-black text-emerald-900 dark:text-emerald-50 leading-none">
                            {compStats.deaths > 0 ? (compStats.kills / compStats.deaths).toFixed(2) : '-'}
                        </span>
                        <span className="text-xs font-medium text-emerald-500 dark:text-emerald-400 mb-1">{compStats.kills} 杀 - {compStats.deaths} 死</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mb-1">总助攻数</span>
                    <span className="text-2xl font-black text-neutral-900 dark:text-white">{compStats.assists}</span>
                </div>
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mb-1">比赛地图数</span>
                    <span className="text-2xl font-black text-neutral-900 dark:text-white">{compStats.totalMapsPlayed}</span>
                </div>
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mb-1">图均回合</span>
                    <span className="text-2xl font-black text-neutral-900 dark:text-white">
                         {compStats.totalMapsPlayed > 0 ? (compStats.roundsPlayed / compStats.totalMapsPlayed).toFixed(1) : '-'}
                    </span>
                </div>
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mb-1">手枪局胜率</span>
                    <span className="text-2xl font-black text-neutral-900 dark:text-white">
                        {compStats.pistolRoundsPlayed > 0 ? ((compStats.pistolRoundsWon / compStats.pistolRoundsPlayed) * 100).toFixed(1) + '%' : '-'}
                    </span>
                </div>

                <div className="col-span-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-3">
                        <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" /></svg>
                        <span className="text-xs text-neutral-900 dark:text-white font-bold uppercase tracking-widest">得 5 分进度</span>
                    </div>
                    <div className="flex justify-between items-end bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-neutral-400 font-medium">先得5分达成率</span>
                            <span className="text-xl font-black text-neutral-900 dark:text-white">
                                {compStats.totalMatchesWith5 > 0 ? ((compStats.firstTo5Matches / compStats.totalMatchesWith5) * 100).toFixed(1) + '%' : '-'}
                            </span>
                        </div>
                        <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-700"></div>
                        <div className="flex flex-col text-right">
                            <span className="text-[10px] text-neutral-400 font-medium">取得优势后胜率</span>
                            <span className="text-xl font-black text-neutral-900 dark:text-white">
                                {compStats.firstTo5Matches > 0 ? ((compStats.firstTo5Wins / compStats.firstTo5Matches) * 100).toFixed(1) + '%' : '-'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="col-span-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-3">
                        <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="text-xs text-neutral-900 dark:text-white font-bold uppercase tracking-widest">得 10 分进度</span>
                    </div>
                    <div className="flex justify-between items-end bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-neutral-400 font-medium">先得10分达成率</span>
                            <span className="text-xl font-black text-neutral-900 dark:text-white">
                                {compStats.totalMatchesWith10 > 0 ? ((compStats.firstTo10Matches / compStats.totalMatchesWith10) * 100).toFixed(1) + '%' : '-'}
                            </span>
                        </div>
                        <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-700"></div>
                        <div className="flex flex-col text-right">
                            <span className="text-[10px] text-neutral-400 font-medium">取得优势后胜率</span>
                            <span className="text-xl font-black text-neutral-900 dark:text-white">
                                {compStats.firstTo10Matches > 0 ? ((compStats.firstTo10Wins / compStats.firstTo10Matches) * 100).toFixed(1) + '%' : '-'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {Object.keys(compStats.mapWinRates).length > 0 && (
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-6 shadow-sm overflow-hidden flex flex-col">
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">各地图胜率</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {Object.entries(compStats.mapWinRates).map(([mapId, rate]) => {
                            const winRateRaw = (rate.wins / rate.total) * 100;
                            const winRate = winRateRaw.toFixed(1);
                            const mapObj = MAPS.find(m => m.id === mapId);
                            const isHigh = winRateRaw >= 60;
                            const isLow = winRateRaw <= 40;
                            
                            return (
                                <div key={mapId} className="relative flex flex-col justify-between py-4 px-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800 overflow-hidden group hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="text-xs text-neutral-900 dark:text-neutral-300 font-bold tracking-wider uppercase">{mapObj ? mapObj.name : mapId}</div>
                                    </div>
                                    <div className="flex items-end gap-2 z-10">
                                        <div className={`text-2xl font-black ${isHigh ? 'text-emerald-600 dark:text-emerald-400' : isLow ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-900 dark:text-white'}`}>{winRate}%</div>
                                    </div>
                                    <div className="text-[10px] text-neutral-400 font-medium mt-1 z-10 group-hover:text-neutral-500 transition-colors">{rate.wins}W - {rate.total - rate.wins}L</div>
                                    
                                    {/* Background Progress Bar */}
                                    <div 
                                        className={`absolute bottom-0 left-0 h-1 transition-all duration-1000 ease-out ${isHigh ? 'bg-emerald-500' : isLow ? 'bg-rose-500' : 'bg-blue-500'} opacity-80`}
                                        style={{ width: `${winRateRaw}%` }}
                                    ></div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Win Rate Matrix Section */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-6 shadow-sm overflow-hidden flex flex-col">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white">回合适能胜率矩阵</h3>
                </div>
                
                <div className="w-full overflow-x-auto">
                    <table className="w-full min-w-[300px] text-center table-fixed border-collapse">
                        <thead>
                            <tr>
                                <th className="w-10 sm:w-16"></th>
                                {[1, 2, 3, 4, 5].map(enemyCount => (
                                    <th key={enemyCount} className="p-1 sm:p-2 text-[10px] sm:text-xs font-medium text-neutral-500 dark:text-neutral-400 whitespace-nowrap leading-tight">
                                        敌方{enemyCount}人
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {[5, 4, 3, 2, 1].map(myCount => (
                                <tr key={myCount} className="border-t border-neutral-100 dark:border-neutral-800/50">
                                    <th className="p-1 sm:p-2 text-[10px] sm:text-xs font-medium text-neutral-500 dark:text-neutral-400 whitespace-nowrap leading-tight border-r border-neutral-100 dark:border-neutral-800/50">
                                        我方{myCount}人
                                    </th>
                                    {[1, 2, 3, 4, 5].map(enemyCount => {
                                        const cell = winRateMatrix[myCount - 1][enemyCount - 1]; // 0-indexed
                                        const winRate = cell.total > 0 ? (cell.wins / cell.total) * 100 : null;
                                        
                                        // WPA references (MATRIX_PRE is T Win Probability vs CT)
                                        // Thus, T Win Prob = MATRIX_PRE[T_Count][CT_Count]
                                        // and CT Win Prob = 1 - MATRIX_PRE[T_Count][CT_Count]
                                        let expectedWinRate = 50; 
                                        // We map myCount (our alive) and enemyCount depending on sideFilter.
                                        if (internalSideFilter === 'T') {
                                            expectedWinRate = MATRIX_PRE[myCount][enemyCount] * 100;
                                        } else if (internalSideFilter === 'CT') {
                                            expectedWinRate = (1 - MATRIX_PRE[enemyCount][myCount]) * 100;
                                        } else {
                                            // 'ALL' average
                                            const eT = MATRIX_PRE[myCount][enemyCount];
                                            const eCT = 1 - MATRIX_PRE[enemyCount][myCount];
                                            expectedWinRate = ((eT + eCT) / 2) * 100;
                                        }

                                        let cellStyle = 'bg-neutral-50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white';
                                        if (winRate !== null) {
                                            const diff = winRate - expectedWinRate;
                                            if (diff > 0) {
                                                if (diff >= 15) cellStyle = 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400';
                                                else if (diff >= 8) cellStyle = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
                                                else cellStyle = 'bg-emerald-500/5 text-emerald-600 dark:text-emerald-400';
                                            } else if (diff < 0) {
                                                if (diff <= -15) cellStyle = 'bg-rose-500/20 text-rose-700 dark:text-rose-400';
                                                else if (diff <= -8) cellStyle = 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
                                                else cellStyle = 'bg-rose-500/5 text-rose-600 dark:text-rose-400';
                                            }
                                        }

                                        return (
                                            <td key={enemyCount} className="p-0.5 sm:p-1">
                                                <div className={`flex flex-col items-center justify-center p-1 sm:p-2 rounded-lg h-10 sm:h-14 transition-colors ${winRate !== null ? cellStyle : 'bg-neutral-50/50 dark:bg-neutral-800/30'}`}>
                                                    {winRate !== null ? (
                                                        <>
                                                            <span className="text-xs sm:text-sm font-black tracking-tight drop-shadow-sm">{winRate.toFixed(0)}%</span>
                                                            <span className="text-[9px] sm:text-[10px] opacity-70 mt-0 sm:mt-0.5 mix-blend-luminosity">{cell.wins}/{cell.total}</span>
                                                        </>
                                                    ) : (
                                                        <span className="text-lg opacity-40 text-neutral-400 dark:text-neutral-500">-</span>
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm overflow-hidden">
                 <div className="mb-4">
                     <h3 className="text-lg font-bold text-neutral-900 dark:text-white">队员数据表现</h3>
                     <p className="text-xs text-neutral-500">点击队员可查看详细能力雷达图和数据报告</p>
                 </div>
                <PlayerList 
                    playerStats={sortedTeamPlayerStats} 
                    onSelectPlayer={onSelectPlayer} 
                />
            </div>
        </div>
    );
};
