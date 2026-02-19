import React, { useMemo } from 'react';
import { Match, MatchSeries, PlayerMatchStats, ClutchRecord } from '../../types';
import { getMapDisplayName, getMapTheme } from './ReviewShared';
import { resolveName } from '../../utils/demo/helpers';
import { ScoreboardTable } from './ScoreboardTable';

interface SeriesDetailProps {
    series: MatchSeries;
    allMatches: Match[];
    onBack: () => void;
    onSelectMatch: (match: Match) => void;
    onSelectPlayer: (playerId: string) => void;
}

export const SeriesDetail: React.FC<SeriesDetailProps> = ({ series, allMatches, onBack, onSelectMatch, onSelectPlayer }) => {
    
    // 1. Resolve Matches & Determine Team Names
    const matches = useMemo(() => {
        return series.matches.map(ref => {
            const m = allMatches.find(x => x.id === ref.matchId);
            return m ? { data: m, swap: ref.swapSides } : null;
        }).filter(Boolean) as { data: Match, swap: boolean }[];
    }, [series, allMatches]);

    // 2. Aggregate Stats
    const { teamStats, enemyStats, scoreA, scoreB, teamAName, teamBName } = useMemo(() => {
        let winsA = 0;
        let winsB = 0;
        let tAName = "My Team";
        let tBName = "Opponent";
        
        // Try to get team names from the first match
        if (matches.length > 0) {
            const first = matches[0];
            tAName = first.swap ? (first.data.teamNameThem || 'Opponent') : (first.data.teamNameUs || 'My Team');
            tBName = first.swap ? (first.data.teamNameUs || 'My Team') : (first.data.teamNameThem || 'Opponent');
        }

        const teamMap = new Map<string, any>();
        const enemyMap = new Map<string, any>();

        matches.forEach(({ data, swap }) => {
            // Score Logic
            let sUs = data.score.us;
            let sThem = data.score.them;
            if (swap) { sUs = data.score.them; sThem = data.score.us; }
            if (sUs > sThem) winsA++; else if (sThem > sUs) winsB++;

            // Player Aggregation Logic
            const teamAPlayers = swap ? data.enemyPlayers : data.players;
            const teamBPlayers = swap ? data.players : data.enemyPlayers;

            const aggregate = (p: PlayerMatchStats, map: Map<string, any>) => {
                const name = resolveName(p.playerId);
                if (!map.has(name)) {
                    map.set(name, {
                        playerId: p.playerId, // Use original ID/Name
                        steamid: p.steamid,
                        matches: 0,
                        rounds: 0,
                        kills: 0, deaths: 0, assists: 0, damage: 0,
                        ratingSum: 0,
                        headshots: 0,
                        kastSum: 0,
                        rank: p.rank,
                        entry_kills: 0,
                        wpaSum: 0,
                        multikills: { k2: 0, k3: 0, k4: 0, k5: 0 },
                        clutches: { '1v1': { won: 0, lost: 0 }, '1v2': { won: 0, lost: 0 }, '1v3': { won: 0, lost: 0 }, '1v4': { won: 0, lost: 0 }, '1v5': { won: 0, lost: 0 } }
                    });
                }
                
                const entry = map.get(name);
                const rounds = data.score.us + data.score.them;
                
                entry.matches++;
                entry.rounds += rounds;
                entry.kills += p.kills;
                entry.deaths += p.deaths;
                entry.assists += p.assists;
                
                // Damage
                entry.damage += (p.total_damage !== undefined ? p.total_damage : (p.adr * rounds));
                
                // Headshots
                const hsCount = (p as any).headshots !== undefined ? (p as any).headshots : Math.round(p.kills * (p.hsRate / 100));
                entry.headshots += hsCount;

                // Weighted sums
                entry.ratingSum += (p.rating || 0) * rounds;
                
                // WPA, Entry Kills, MultiKills - Force recalculation from rounds if available
                // Because match-level stats might be missing or aggregated differently
                if (data.rounds && data.rounds.length > 0) {
                    const pid = p.steamid || p.playerId;
                    let matchWpaSum = 0;
                    let matchEntryKills = 0;
                    let matchMultiKills = { k2: 0, k3: 0, k4: 0, k5: 0 };

                    data.rounds.forEach(r => {
                        const pr = r.playerStats[pid];
                        if (pr) {
                            // WPA
                            if (typeof pr.wpa === 'number' && !isNaN(pr.wpa)) {
                                matchWpaSum += pr.wpa;
                            }
                            // Entry Kills
                            if (pr.isEntryKill) {
                                matchEntryKills++;
                            }
                            // MultiKills
                            if (pr.kills === 2) matchMultiKills.k2++;
                            else if (pr.kills === 3) matchMultiKills.k3++;
                            else if (pr.kills === 4) matchMultiKills.k4++;
                            else if (pr.kills >= 5) matchMultiKills.k5++;
                        }
                    });

                    entry.wpaSum += matchWpaSum;
                    entry.entry_kills += matchEntryKills;
                    entry.multikills.k2 += matchMultiKills.k2;
                    entry.multikills.k3 += matchMultiKills.k3;
                    entry.multikills.k4 += matchMultiKills.k4;
                    entry.multikills.k5 += matchMultiKills.k5;
                } else {
                    // Fallback to match stats if rounds are missing (unlikely but safe)
                    const wpa = (typeof p.wpa === 'number' && !isNaN(p.wpa)) ? p.wpa : 0;
                    // If p.wpa is average, multiply by rounds to get sum. If total, use as is.
                    // Assuming average based on ScoreboardTab logic.
                    entry.wpaSum += wpa * rounds;
                    
                    if (p.entry_kills !== undefined) entry.entry_kills += p.entry_kills;
                    
                    if (p.multikills) {
                        entry.multikills.k2 += p.multikills.k2 || 0;
                        entry.multikills.k3 += p.multikills.k3 || 0;
                        entry.multikills.k4 += p.multikills.k4 || 0;
                        entry.multikills.k5 += p.multikills.k5 || 0;
                    }
                }

                // Clutches
                if (p.clutches) {
                    Object.keys(p.clutches).forEach(k => {
                        const key = k as keyof ClutchRecord;
                        if (entry.clutches[key] && p.clutches[key]) {
                            entry.clutches[key].won += p.clutches[key].won;
                            entry.clutches[key].lost += p.clutches[key].lost;
                        }
                    });
                }
                
                // KAST Fix
                let matchKast = p.kast || 0;
                if (data.rounds && data.rounds.length > 0) {
                     const pid = p.steamid || p.playerId;
                     let kCount = 0;
                     let validRoundCount = 0;
                     
                     data.rounds.forEach(r => {
                         const pr = r.playerStats[pid];
                         if (pr) {
                             if (pr.rating === 0 && pr.damage === 0 && pr.deaths === 0 && pr.kills === 0 && pr.assists === 0) return;
                             validRoundCount++;
                             if (pr.kills > 0 || pr.assists > 0 || pr.survived || pr.wasTraded) {
                                 kCount++;
                             }
                         }
                     });
                     
                     if (validRoundCount > 0) {
                         matchKast = (kCount / validRoundCount) * 100;
                     }
                }
                entry.kastSum += matchKast * rounds;

                if (p.rank && p.rank !== '?') entry.rank = p.rank;
            };

            teamAPlayers.forEach(p => aggregate(p, teamMap));
            teamBPlayers.forEach(p => aggregate(p, enemyMap));
        });

        // Finalize Averages
        const finalize = (map: Map<string, any>) => {
            return Array.from(map.values()).map(p => {
                const r = p.rounds || 1;
                const k = p.kills || 1;
                return {
                    ...p,
                    rating: p.ratingSum / r,
                    adr: p.damage / r,
                    kast: p.kastSum / r,
                    hsRate: (p.headshots / k) * 100,
                    // Fix: WPA is already summed up as (avg_wpa_per_match * rounds_in_match), so dividing by total rounds gives the weighted average WPA per round
                    wpa: p.wpaSum / r,
                    kdDiff: p.kills - p.deaths
                } as PlayerMatchStats;
            });
        };

        return {
            teamStats: finalize(teamMap),
            enemyStats: finalize(enemyMap),
            scoreA: winsA,
            scoreB: winsB,
            teamAName: tAName,
            teamBName: tBName
        };
    }, [matches]);

    return (
        <div className="fixed inset-0 z-[200] bg-white dark:bg-neutral-950 flex flex-col h-[100dvh] w-screen overflow-hidden animate-in slide-in-from-right duration-300 font-sans">
            {/* Header */}
            <div className="bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 shadow-sm shrink-0">
                <div className="flex items-center justify-between px-4 h-[56px]">
                    <button onClick={onBack} className="flex items-center text-sm font-bold text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors">
                        <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        返回列表
                    </button>
                    <div className="font-bold text-neutral-900 dark:text-white">系列赛详情</div>
                    <div className="w-10"></div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-neutral-50 dark:bg-neutral-950">
                {/* Series Overview Card */}
                <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 dark:from-neutral-900 dark:to-black rounded-3xl p-6 text-white mb-6 relative overflow-hidden shadow-lg border border-neutral-700/50">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <svg className="w-48 h-48 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                    </div>
                    
                    <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest border border-white/20 rounded-full px-2 py-0.5 bg-white/5">
                                {series.format}
                            </span>
                            <span className="text-[10px] font-bold text-white/40 font-mono">
                                {series.date.split('T')[0]}
                            </span>
                        </div>

                        <h1 className="text-2xl md:text-3xl font-black mb-6 leading-tight">{series.title}</h1>
                        
                        <div className="flex items-center gap-6 md:gap-12 w-full max-w-lg justify-center bg-white/5 rounded-2xl p-4 backdrop-blur-sm">
                            <div className="text-right flex-1">
                                <div className={`text-5xl font-black tracking-tighter ${scoreA > scoreB ? 'text-green-400' : 'text-white'}`}>{scoreA}</div>
                                <div className="text-[10px] font-bold text-white/50 uppercase mt-1 truncate">{teamAName}</div>
                            </div>
                            <div className="text-xl text-white/20 font-light">:</div>
                            <div className="text-left flex-1">
                                <div className={`text-5xl font-black tracking-tighter ${scoreB > scoreA ? 'text-red-400' : 'text-white'}`}>{scoreB}</div>
                                <div className="text-[10px] font-bold text-white/50 uppercase mt-1 truncate">{teamBName}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Match List */}
                <div className="mb-8">
                    <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3 px-1 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 7m0 13V7m0 0L9.553 4.553A1 1 0 009 3.618" /></svg>
                        比赛列表
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {matches.map(({ data, swap }, idx) => {
                            const mapName = getMapDisplayName(data.mapId);
                            const scoreUs = swap ? data.score.them : data.score.us;
                            const scoreThem = swap ? data.score.us : data.score.them;
                            const isWin = scoreUs > scoreThem;
                            const mapTheme = getMapTheme(mapName);
                            
                            return (
                                <div 
                                    key={data.id} 
                                    onClick={() => onSelectMatch(data)}
                                    className={`bg-white dark:bg-neutral-900 border rounded-xl p-3 flex items-center justify-between cursor-pointer hover:shadow-md transition-all active:scale-[0.98] group bg-gradient-to-br ${mapTheme}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-white text-sm shadow-sm ${isWin ? 'bg-green-500' : 'bg-red-500'}`}>
                                            M{idx+1}
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{mapName}</div>
                                            <div className="text-[10px] text-neutral-500 flex items-center gap-1">
                                                {swap && <span className="px-1 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">换边</span>}
                                                <span className="font-mono">{data.score.us}:{data.score.them}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="font-mono font-black text-xl tracking-tight">
                                        <span className={isWin ? 'text-green-600 dark:text-green-400' : 'text-neutral-400'}>{scoreUs}</span>
                                        <span className="text-neutral-300/50 mx-1">:</span>
                                        <span className={!isWin ? 'text-red-600 dark:text-red-400' : 'text-neutral-400'}>{scoreThem}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Aggregated Stats */}
                <div>
                    <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3 px-1 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        系列赛综合数据
                    </h3>
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
                        <ScoreboardTable 
                            players={teamStats} 
                            title={teamAName} 
                            isEnemy={false} 
                            onPlayerClick={onSelectPlayer} 
                        />
                        <div className="h-px bg-neutral-100 dark:bg-neutral-800 mx-4"></div>
                        <ScoreboardTable 
                            players={enemyStats} 
                            title={teamBName} 
                            isEnemy={true} 
                            onPlayerClick={onSelectPlayer} 
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
