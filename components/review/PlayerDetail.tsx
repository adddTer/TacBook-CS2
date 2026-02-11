
import React, { useState, useMemo } from 'react';
import { PlayerMatchStats, Match, PlayerRoundStats } from '../../types';
import { StatBox, getMapDisplayName, getRatingColorClass, RankBadge } from './ReviewShared';

interface PlayerDetailProps {
    profile: any;
    history: { match: Match, stats: PlayerMatchStats }[];
    onBack: () => void;
    onMatchClick: (match: Match) => void;
}

type SideFilter = 'ALL' | 'CT' | 'T';

// --- Helper Components ---

const SkillBar = ({ label, value, max = 100, colorClass }: { label: string, value: number, max?: number, colorClass: string }) => {
    const percent = Math.min(100, Math.max(0, (value / max) * 100));
    return (
        <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-bold text-neutral-500 uppercase">
                <span>{label}</span>
                <span className="font-mono">{value.toFixed(1)}</span>
            </div>
            <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${percent}%` }}></div>
            </div>
        </div>
    );
};

const DetailStatBox = ({ label, value, subLabel, highlight = false }: { label: string, value: string | number, subLabel?: string, highlight?: boolean }) => (
    <div className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${highlight ? 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 shadow-sm' : 'bg-neutral-50 dark:bg-neutral-900 border-transparent'}`}>
        <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-0.5">{label}</div>
        <div className="text-lg font-black text-neutral-900 dark:text-white font-sans tabular-nums leading-tight">{value}</div>
        {subLabel && <div className="text-[9px] text-neutral-400 font-medium">{subLabel}</div>}
    </div>
);

export const PlayerDetail: React.FC<PlayerDetailProps> = ({ profile, history, onBack, onMatchClick }) => {
    const [sideFilter, setSideFilter] = useState<SideFilter>('ALL');

    // --- Dynamic Aggregation Logic ---
    const statsData = useMemo(() => {
        // Overall accumulators (Not affected by filter)
        let totalRoundsPlayed = 0;
        let totalRatingSum = 0;
        let ctRatingSum = 0, ctRounds = 0;
        let tRatingSum = 0, tRounds = 0;

        // Filtered accumulators (Affected by sideFilter)
        let fRounds = 0;
        let f = {
            kills: 0, deaths: 0, assists: 0, damage: 0,
            impactSum: 0, wpaSum: 0,
            kastCount: 0,
            multiKillRounds: 0,
            entryKills: 0,
            utilityDamage: 0,
            flashAssists: 0,
            clutchWins: 0,
            sniperKills: 0,
            headshots: 0
        };

        const SNIPER_WEAPONS = ['awp', 'ssg08', 'scar20', 'g3sg1'];

        history.forEach(({ match }) => {
            if (!match.rounds) return;
            
            // Fix: Resolve the ID used by this player in THIS specific match dynamically.
            // Do not rely on profile.steamid which might be from a different match (e.g. smurf/alt account).
            const matchPlayer = [...match.players, ...match.enemyPlayers].find(p => p.playerId === profile.id);
            if (!matchPlayer) return;
            
            // Use the SteamID recorded in this match, or fallback to the roster ID name if steamid missing
            const targetId = matchPlayer.steamid || matchPlayer.playerId;
            
            match.rounds.forEach(round => {
                // Find player stats for this round using the resolved targetId
                const pRound = round.playerStats[targetId];
                if (!pRound) return;

                // --- 1. Global (Static) Calculations ---
                // Skip ghost rounds
                if (!(pRound.rating === 0 && pRound.damage === 0 && pRound.deaths === 0)) {
                    totalRatingSum += pRound.rating;
                    totalRoundsPlayed++;

                    if (pRound.side === 'CT') {
                        ctRatingSum += pRound.rating;
                        ctRounds++;
                    } else {
                        tRatingSum += pRound.rating;
                        tRounds++;
                    }
                }

                // --- 2. Filtered Calculations ---
                if (sideFilter !== 'ALL' && pRound.side !== sideFilter) return;
                if (pRound.rating === 0 && pRound.damage === 0 && pRound.deaths === 0) return;

                fRounds++;
                f.kills += pRound.kills;
                f.deaths += pRound.deaths;
                f.assists += pRound.assists;
                f.damage += pRound.damage;
                f.impactSum += pRound.impact;
                
                // Safe WPA accumulation
                const wpa = pRound.wpa;
                if (typeof wpa === 'number' && !isNaN(wpa)) {
                    f.wpaSum += wpa;
                }
                
                f.headshots += pRound.headshots;
                
                if (pRound.kills > 0 || pRound.assists > 0 || pRound.survived || pRound.wasTraded) {
                    f.kastCount++;
                }
                
                if (pRound.kills >= 2) f.multiKillRounds++;
                if (pRound.isEntryKill) f.entryKills++;
                
                f.utilityDamage += pRound.utility ? (pRound.utility.heDamage + pRound.utility.molotovDamage) : (pRound.utilityDamage || 0);
                
                // Track Sniper Kills from Timeline
                if (pRound.kills > 0 && round.timeline) {
                    round.timeline.forEach(event => {
                        if (event.type === 'kill' && event.subject && 
                           (event.subject.steamid === targetId || event.subject.name === targetId)) {
                            if (event.weapon && SNIPER_WEAPONS.includes(event.weapon.toLowerCase())) {
                                f.sniperKills++;
                            }
                        }
                    });
                }
            });
        });

        // Flash assists & Clutches need history aggregate
        history.forEach(({ match, stats }) => {
            // Flash Assists - Fallback logic if needed, but best effort in main loop is done if round data exists
            // Since we updated parser to fill flashAssists in round.utility (not directly on stats object sometimes in old version), 
            // let's rely on the round loop above if possible. 
            // But if we want to be safe with match aggregates:
            if (match.rounds) {
                 // Already handled
            } else {
                 if (sideFilter === 'ALL') f.flashAssists += (stats.flash_assists || 0);
            }

            if (stats.clutchHistory) {
                stats.clutchHistory.forEach(c => {
                    if (sideFilter !== 'ALL' && c.side !== sideFilter) return;
                    if (c.result === 'won') f.clutchWins++;
                });
            }
        });
        
        // --- Flash Assists Accumulation from Round Data ---
        history.forEach(({ match }) => {
            if(!match.rounds) return;
            
            // Fix: Resolve ID per match
            const matchPlayer = [...match.players, ...match.enemyPlayers].find(p => p.playerId === profile.id);
            if (!matchPlayer) return;
            const targetId = matchPlayer.steamid || matchPlayer.playerId;

            match.rounds.forEach(round => {
                 const pRound = round.playerStats[targetId];
                 if (!pRound) return;
                 
                 if (sideFilter !== 'ALL' && pRound.side !== sideFilter) return;
                 if (pRound.utility && pRound.utility.flashesThrown > 0) {
                     const assists = round.timeline.filter(e => e.type === 'flash_assist' && e.subject && (e.subject.steamid === targetId || e.subject.name === targetId)).length;
                     f.flashAssists += assists;
                 }
            });
        });

        const safeDiv = (a: number, b: number) => b === 0 ? 0 : a / b;
        const wpaAvg = safeDiv(f.wpaSum, fRounds);

        return {
            overall: {
                rating: safeDiv(totalRatingSum, totalRoundsPlayed) * 1.30,
                ctRating: safeDiv(ctRatingSum, ctRounds) * 1.30,
                tRating: safeDiv(tRatingSum, tRounds) * 1.30,
            },
            filtered: {
                adr: safeDiv(f.damage, fRounds),
                kdr: safeDiv(f.kills, f.deaths),
                dpr: safeDiv(f.deaths, fRounds),
                kast: safeDiv(f.kastCount, fRounds) * 100,
                impact: safeDiv(f.impactSum, fRounds), 
                wpaSum: f.wpaSum, // Total WPA
                wpaAvg: wpaAvg, // Average WPA (Percentage Points)
                multiKillRate: safeDiv(f.multiKillRounds, fRounds) * 100,
                
                // 7 Dimensions Scores (Normalized roughly 0-100 for bars)
                // 1. Firepower (火力): ADR based. 100 ADR = 100 Score.
                scoreFirepower: Math.min(100, safeDiv(f.damage, fRounds)), 
                
                // 2. Entry (破点): Entry Kills per Round. 0.20 EKPR is elite.
                scoreEntry: Math.min(100, safeDiv(f.entryKills, fRounds) * 500), 
                
                // 3. Trade (补枪): KAST % (Consistency/Support).
                scoreTrade: Math.min(100, safeDiv(f.kastCount, fRounds) * 100), 
                
                // 4. Breakthrough (突破): REPLACED BY WPA. 
                // Avg WPA (percent) of 20% per round is godlike.
                // Logic: (Avg + 5) * 4. e.g. 20 -> 100. 0 -> 20. -5 -> 0.
                scoreBreakthrough: Math.max(0, Math.min(100, (wpaAvg + 5) * 4)), 
                
                // 5. Clutch (残局): Clutches Won / Total Rounds * weight. 
                scoreClutch: Math.min(100, safeDiv(f.clutchWins, fRounds) * 3000), 
                
                // 6. Sniper (狙击): Percentage of kills that were sniper kills.
                scoreSniper: Math.min(100, safeDiv(f.sniperKills, f.kills) * 100), 
                
                // 7. Utility (道具): UD per round + Flash Assists per round.
                scoreUtility: Math.min(100, (safeDiv(f.utilityDamage, fRounds) * 5) + (safeDiv(f.flashAssists, fRounds) * 400)),
            }
        };
    }, [history, profile, sideFilter]);

    const { overall, filtered } = statsData;

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-300 px-1 font-sans pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button 
                    onClick={onBack}
                    className="flex items-center text-sm font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    返回列表
                </button>
            </div>

            {/* Profile Header */}
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-3xl font-black text-white shadow-lg shadow-blue-500/20 shrink-0">
                    {profile.id[0]}
                </div>
                <div>
                    <h2 className="text-2xl font-black text-neutral-900 dark:text-white leading-none tracking-tight">{profile.id}</h2>
                    <div className="flex items-center gap-2 mt-2">
                        <RankBadge rank={profile.currentRank} />
                        <span className="text-[10px] font-bold text-neutral-400">{profile.role}</span>
                        <span className="text-[10px] font-mono text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">{profile.matches} Maps</span>
                    </div>
                </div>
            </div>

            {/* Main Rating Card (Static Overall) */}
            <div className="bg-white dark:bg-neutral-900 rounded-3xl p-1 shadow-sm border border-neutral-200 dark:border-neutral-800">
                <div className="bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-800 dark:to-neutral-900/50 rounded-[20px] p-5 text-center">
                    <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">Rating 4.0</div>
                    <div className={`text-6xl font-black tracking-tighter ${getRatingColorClass(overall.rating)}`}>
                        {overall.rating.toFixed(2)}
                    </div>
                    
                    {/* CT / T Split */}
                    <div className="flex justify-center gap-8 mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-bold text-blue-500 mb-0.5">CT Rating</span>
                            <span className={`text-xl font-black font-mono ${getRatingColorClass(overall.ctRating)}`}>{overall.ctRating.toFixed(2)}</span>
                        </div>
                        <div className="w-px bg-neutral-200 dark:bg-neutral-800 h-8"></div>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-bold text-yellow-600 mb-0.5">T Rating</span>
                            <span className={`text-xl font-black font-mono ${getRatingColorClass(overall.tRating)}`}>{overall.tRating.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Control */}
            <div className="flex p-1 bg-neutral-200 dark:bg-neutral-800 rounded-xl">
                {(['ALL', 'CT', 'T'] as const).map(side => (
                    <button
                        key={side}
                        onClick={() => setSideFilter(side)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${sideFilter === side ? 'bg-white dark:bg-neutral-700 shadow text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}
                    >
                        {side}
                    </button>
                ))}
            </div>

            {/* Detailed Stats Grid (Filtered) */}
            <div className="grid grid-cols-3 gap-3">
                <DetailStatBox label="KDR" value={filtered.kdr.toFixed(2)} subLabel="Kill/Death" highlight={filtered.kdr > 1.2} />
                <DetailStatBox label="ADR" value={filtered.adr.toFixed(1)} subLabel="Dmg/Round" highlight={filtered.adr > 85} />
                <DetailStatBox label="KAST" value={`${filtered.kast.toFixed(1)}%`} subLabel="Consistency" highlight={filtered.kast > 72} />
                <DetailStatBox label="Avg WPA" value={(filtered.wpaAvg > 0 ? '+' : '') + filtered.wpaAvg.toFixed(1) + '%'} subLabel="Win Prob Added" highlight={filtered.wpaAvg > 15} />
                <DetailStatBox label="MKR" value={`${filtered.multiKillRate.toFixed(1)}%`} subLabel="Multi-Kill" />
                <DetailStatBox label="DPR" value={filtered.dpr.toFixed(2)} subLabel="Death/Round" highlight={filtered.dpr < 0.65} />
            </div>

            {/* Ability Bars (Filtered, 7 Dimensions) */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4">综合能力评估 (Beta)</h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                    <SkillBar label="火力 Firepower" value={filtered.scoreFirepower} max={100} colorClass="bg-red-500" />
                    <SkillBar label="破点 Entry" value={filtered.scoreEntry} max={100} colorClass="bg-orange-500" />
                    <SkillBar label="补枪 Trade" value={filtered.scoreTrade} max={100} colorClass="bg-blue-500" />
                    <SkillBar label="突破 WPA" value={filtered.scoreBreakthrough} max={100} colorClass="bg-indigo-500" />
                    <SkillBar label="残局 Clutch" value={filtered.scoreClutch} max={100} colorClass="bg-yellow-500" />
                    <SkillBar label="狙击 Sniper" value={filtered.scoreSniper} max={100} colorClass="bg-green-500" />
                    <div className="col-span-2">
                         <SkillBar label="道具 Utility" value={filtered.scoreUtility} max={100} colorClass="bg-purple-500" />
                    </div>
                </div>
            </div>

            {/* Match History List */}
            <div>
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4 px-1">近期表现 History</h3>
                <div className="space-y-3">
                    {history.map(({ match, stats }) => {
                        const mapName = getMapDisplayName(match.mapId);
                        const kdDiff = stats.kills - stats.deaths;

                        // Calculate Result relative to this player
                        const isPlayerOnMyTeam = match.players.some(p => p.steamid === stats.steamid || p.playerId === stats.playerId);

                        let resultForPlayer = match.result;
                        if (match.result !== 'TIE') {
                            if (!isPlayerOnMyTeam) {
                                resultForPlayer = match.result === 'WIN' ? 'LOSS' : 'WIN';
                            }
                        }

                        const scoreLeft = isPlayerOnMyTeam ? match.score.us : match.score.them;
                        const scoreRight = isPlayerOnMyTeam ? match.score.them : match.score.us;
                        
                        const barColor = resultForPlayer === 'WIN' ? 'bg-green-500' : resultForPlayer === 'LOSS' ? 'bg-red-500' : 'bg-yellow-500';

                        return (
                            <button 
                                key={match.id} 
                                onClick={() => onMatchClick(match)}
                                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3 rounded-xl flex items-center justify-between hover:border-blue-500/50 hover:shadow-md transition-all active:scale-[0.99] group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-1 h-8 rounded-full ${barColor}`}></div>
                                    <div className="text-left">
                                        <div className="text-sm font-black text-neutral-900 dark:text-white flex items-center gap-2">
                                            {mapName}
                                            <span className="text-[10px] font-mono font-normal text-neutral-400">{scoreLeft}:{scoreRight}</span>
                                        </div>
                                        <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{match.date.split('T')[0]}</div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-4 text-right">
                                    <div className="flex flex-col items-end">
                                        <div className="text-[10px] font-bold text-neutral-400">K-D</div>
                                        <div className={`text-xs font-mono font-bold ${kdDiff > 0 ? 'text-green-500' : kdDiff < 0 ? 'text-red-500' : 'text-neutral-500'}`}>
                                            {stats.kills}-{stats.deaths} ({kdDiff > 0 ? '+' : ''}{kdDiff})
                                        </div>
                                    </div>
                                    
                                    <div className={`text-lg font-black tabular-nums w-12 text-right ${getRatingColorClass(stats.rating)}`}>
                                        {stats.rating.toFixed(2)}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
