import React, { useState, useMemo } from 'react';
import { Match, PlayerMatchStats, ClutchRecord, MultiKillBreakdown, PlayerRoundStats } from '../../types';
import { ROSTER } from '../../constants/roster';
import { getRatingColorClass } from './ReviewShared';

type SideFilter = 'ALL' | 'CT' | 'T';

interface ScoreboardTabProps {
    match: Match;
    players: PlayerMatchStats[];
    enemyPlayers: PlayerMatchStats[];
    onPlayerClick: (id: string) => void;
    filter: SideFilter;
}

interface DataPopupCellProps {
    value: number | string;
    title: string;
    data: { label: string; value: number | string }[];
    isActive: boolean;
    onClick: (e: React.MouseEvent) => void;
    align?: 'top' | 'bottom';
    highlight?: boolean;
}

const DataPopupCell: React.FC<DataPopupCellProps> = ({ value, title, data, isActive, onClick, align = 'bottom', highlight = false }) => {
    const popupClass = align === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';
    const arrowClass = align === 'top' ? '-bottom-1 border-b border-r' : '-top-1 border-t border-l';

    return (
        <div className="relative inline-block">
            <button 
                onClick={onClick}
                className={`px-2 py-1 rounded text-xs font-bold font-sans transition-colors min-w-[2rem] ${isActive ? 'bg-purple-600 text-white' : highlight ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/10 hover:bg-orange-100' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-purple-100 dark:hover:bg-purple-900/30'}`}
            >
                {value}
            </button>
            
            {isActive && (
                <div className={`absolute left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl rounded-lg p-2 min-w-[120px] animate-in zoom-in-95 duration-200 ${popupClass}`}>
                    <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1 text-center whitespace-nowrap">{title}</div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                        {data.map((item, idx) => (
                            <React.Fragment key={idx}>
                                <div className="text-neutral-500 text-right">{item.label}:</div>
                                <div className="font-mono font-bold text-neutral-900 dark:text-white text-left">{item.value}</div>
                            </React.Fragment>
                        ))}
                    </div>
                    <div className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 transform rotate-45 ${arrowClass}`}></div>
                </div>
            )}
        </div>
    );
};

export const ScoreboardTab: React.FC<ScoreboardTabProps> = ({ 
    match,
    players, 
    enemyPlayers, 
    onPlayerClick, 
    filter 
}) => {
    const [activePopup, setActivePopup] = useState<{ id: string, type: 'mk' | 'clutch' } | null>(null);

    const handlePopupClick = (e: React.MouseEvent, id: string, type: 'mk' | 'clutch') => {
        e.stopPropagation();
        if (activePopup && activePopup.id === id && activePopup.type === type) {
            setActivePopup(null);
        } else {
            setActivePopup({ id, type });
        }
    };
    
    const closePopup = () => setActivePopup(null);

    const useAggregatedStats = (targetPlayers: PlayerMatchStats[]) => useMemo(() => {
        if (!match.rounds || match.rounds.length === 0) return targetPlayers;

        // 1. Pre-filter "Ghost Rounds": Rounds where NO ONE did anything (e.g. match paused/warmup glitch)
        const validRounds = match.rounds.filter(round => {
            const allStats = Object.values(round.playerStats) as PlayerRoundStats[];
            if (allStats.length === 0) return false;
            
            // Check if EVERY player in this round has 0 impact
            const isGhost = allStats.every(s => 
                s.rating === 0 && 
                s.kills === 0 && 
                s.deaths === 0 && 
                s.assists === 0 && 
                s.damage === 0
            );
            return !isGhost;
        });

        return targetPlayers.map(p => {
            const id = p.steamid || p.playerId;
            
            let roundsPlayed = 0;
            let acc = {
                kills: 0, deaths: 0, assists: 0, damage: 0, 
                ratingSum: 0, entryKills: 0,
                k2: 0, k3: 0, k4: 0, k5: 0,
                kastCount: 0,
                heDamage: 0, fireDamage: 0,
                headshots: 0
            };
            
            const accClutches: ClutchRecord = {
                 '1v1': { won: 0, lost: 0 }, '1v2': { won: 0, lost: 0 }, '1v3': { won: 0, lost: 0 }, '1v4': { won: 0, lost: 0 }, '1v5': { won: 0, lost: 0 }
            };
            
            if (p.clutchHistory) {
                p.clutchHistory.forEach(c => {
                    if (filter !== 'ALL' && c.side !== filter) return;
                    const k = `1v${Math.min(c.opponentCount, 5)}` as keyof ClutchRecord;
                    if (c.result === 'won') accClutches[k].won++;
                    else accClutches[k].lost++;
                });
            }

            // 2. Iterate Rounds
            validRounds.forEach(round => {
                const pRound = round.playerStats[id];
                if (!pRound) return;

                if (filter !== 'ALL' && pRound.side !== filter) return;

                // 3. Individual "Did Not Play" Check
                // RatingEngine only counts rounds where the player had an event (kill/death/dmg/etc).
                // If a player saves with 0 damage/kills/deaths, RatingEngine effectively ignores that round for the average.
                // We must mirror that logic here to match the "Correct Data".
                // Note: If a player dies (deaths > 0), they participated.
                if (pRound.rating === 0 && 
                    pRound.kills === 0 && 
                    pRound.deaths === 0 && 
                    pRound.assists === 0 && 
                    pRound.damage === 0) {
                    return; 
                }

                roundsPlayed++;
                acc.kills += pRound.kills;
                acc.deaths += pRound.deaths;
                acc.assists += pRound.assists;
                acc.damage += pRound.damage;
                acc.ratingSum += pRound.rating;
                acc.headshots += pRound.headshots;
                
                if (pRound.utility) {
                    acc.heDamage += pRound.utility.heDamage || 0;
                    acc.fireDamage += pRound.utility.molotovDamage || 0;
                } else {
                    acc.heDamage += pRound.utilityDamage || 0;
                }

                if (pRound.isEntryKill) acc.entryKills++;

                if (pRound.kills === 2) acc.k2++;
                else if (pRound.kills === 3) acc.k3++;
                else if (pRound.kills === 4) acc.k4++;
                else if (pRound.kills >= 5) acc.k5++;

                if (pRound.kills > 0 || pRound.assists > 0 || pRound.survived || pRound.wasTraded) {
                    acc.kastCount++;
                }
            });

            if (roundsPlayed === 0) {
                return {
                    ...p,
                    kills: 0, deaths: 0, assists: 0, adr: 0, rating: 0, kast: 0,
                    entry_kills: 0, multikills: { k2: 0, k3: 0, k4: 0, k5: 0 },
                    hsRate: 0,
                    utility: { ...p.utility, heDamage: 0, molotovDamage: 0 },
                    clutches: accClutches
                };
            }

            // Corrected Rating Calculation: Average Round Rating * 1.30 Scaling Factor
            const calculatedRating = (acc.ratingSum / roundsPlayed) * 1.30;

            return {
                ...p,
                kills: acc.kills,
                deaths: acc.deaths,
                assists: acc.assists,
                adr: parseFloat((acc.damage / roundsPlayed).toFixed(1)),
                rating: parseFloat(calculatedRating.toFixed(2)),
                kast: parseFloat(((acc.kastCount / roundsPlayed) * 100).toFixed(1)),
                entry_kills: acc.entryKills,
                multikills: { k2: acc.k2, k3: acc.k3, k4: acc.k4, k5: acc.k5 },
                hsRate: acc.kills > 0 ? parseFloat(((acc.headshots / acc.kills) * 100).toFixed(1)) : 0,
                utility: { ...p.utility, heDamage: acc.heDamage, molotovDamage: acc.fireDamage },
                clutches: accClutches
            };
        });
    }, [match.rounds, targetPlayers, filter]);

    const aggregatedPlayers = useAggregatedStats(players);
    const aggregatedEnemies = useAggregatedStats(enemyPlayers);

    const getMultiKillData = (mk: MultiKillBreakdown) => [
        { label: '5K', value: mk.k5 || 0 },
        { label: '4K', value: mk.k4 || 0 },
        { label: '3K', value: mk.k3 || 0 },
        { label: '2K', value: mk.k2 || 0 },
    ];

    const getClutchData = (clutches: ClutchRecord) => [
        { label: '1v1', value: clutches['1v1']?.won || 0 },
        { label: '1v2', value: clutches['1v2']?.won || 0 },
        { label: '1v3', value: clutches['1v3']?.won || 0 },
        { label: '1v4', value: clutches['1v4']?.won || 0 },
        { label: '1v5', value: clutches['1v5']?.won || 0 },
    ];

    const getFilterStyle = (isEnemy: boolean) => {
        if (filter === 'ALL') return isEnemy ? 'bg-red-50/50 dark:bg-red-900/10 text-red-500' : 'bg-blue-50/50 dark:bg-blue-900/10 text-blue-500';
        if (filter === 'CT') return 'bg-blue-50/50 dark:bg-blue-900/10 text-blue-500';
        if (filter === 'T') return 'bg-yellow-50/50 dark:bg-yellow-900/10 text-yellow-600';
        return '';
    };

    const renderTable = (teamPlayers: PlayerMatchStats[], isEnemy: boolean) => {
        const sortedPlayers = [...teamPlayers].sort((a,b) => b.rating - a.rating);
        
        return (
        <div className="overflow-x-auto pb-4"> 
            <table className="w-full text-sm text-left whitespace-nowrap min-w-[800px] border-collapse font-sans">
                <thead>
                    <tr className={`text-[10px] uppercase font-bold border-b border-neutral-100 dark:border-neutral-800 ${getFilterStyle(isEnemy)}`}>
                        <th className="px-3 py-3 sticky left-0 z-10 bg-inherit w-36">{isEnemy ? '敌方' : '我方'} {filter !== 'ALL' ? `(${filter})` : ''}</th>
                        <th className="px-2 py-3 text-center w-20">K / D / A</th>
                        <th className="px-2 py-3 text-center w-12">+/-</th>
                        <th className="px-2 py-3 text-center w-12" title="平均每回合伤害">ADR</th>
                        <th className="px-2 py-3 text-center w-12" title="KAST% (Kill, Assist, Survive, Traded) - 回合贡献率">KAST%</th>
                        <th className="px-2 py-3 text-center w-12" title="Rating 4.0">RTG</th>
                        <th className="px-2 py-3 text-center w-12" title="首杀 (Entry Kills)">首杀</th>
                        <th className="px-2 py-3 text-center w-12" title="多杀 (Multi-Kills)">多杀</th>
                        <th className="px-2 py-3 text-center w-12" title="残局获胜 (1vN Wins)">残局</th>
                        <th className="px-2 py-3 text-center w-14">爆头</th>
                        <th className="px-2 py-3 text-center w-14">道具伤</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800/50">
                    {sortedPlayers.map((p, idx) => {
                        const kdDiff = p.kills - p.deaths;
                        const rosterId = ROSTER.find(r => r.id === p.playerId || r.name === p.playerId)?.id || p.playerId;
                        const isRosterMember = ROSTER.some(r => r.id === rosterId);
                        const ratingColor = getRatingColorClass(p.rating, 'text');
                        
                        const multiKills = p.multikills || { k2: 0, k3: 0, k4: 0, k5: 0 };
                        const totalMulti: number = (multiKills.k2||0) + (multiKills.k3||0) + (multiKills.k4||0) + (multiKills.k5||0);
                        
                        const clutches = p.clutches;
                        const clutchWinCount = clutches['1v1'].won + clutches['1v2'].won + clutches['1v3'].won + clutches['1v4'].won + clutches['1v5'].won;

                        const popupAlign = idx >= sortedPlayers.length - 2 ? 'top' : 'bottom';

                        return (
                            <tr 
                                key={idx} 
                                className={`group transition-colors cursor-pointer ${isRosterMember ? 'hover:bg-blue-50/50 dark:hover:bg-blue-900/10' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/30'}`}
                                onClick={() => onPlayerClick(p.steamid || p.playerId)}
                            >
                                <td className={`px-3 py-3 font-bold sticky left-0 z-10 bg-white dark:bg-neutral-900 border-r border-transparent group-hover:border-neutral-100 dark:group-hover:border-neutral-800 truncate flex items-center gap-2 ${isRosterMember ? 'text-blue-600 dark:text-blue-400 group-hover:bg-blue-50/50 dark:group-hover:bg-blue-900/10' : 'text-neutral-800 dark:text-neutral-200 group-hover:bg-neutral-50 dark:group-hover:bg-neutral-800/30'}`}>
                                    {isRosterMember && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
                                    {p.playerId}
                                </td>
                                <td className="px-2 py-3 text-center font-sans tabular-nums text-xs">
                                    <span className="text-neutral-900 dark:text-white font-bold">{p.kills}</span>
                                    <span className="text-neutral-300 mx-0.5">/</span>
                                    <span className="text-red-500">{p.deaths}</span>
                                    <span className="text-neutral-300 mx-0.5">/</span>
                                    <span className="text-neutral-500">{p.assists}</span>
                                </td>
                                <td className={`px-2 py-3 text-center font-sans tabular-nums text-xs font-bold ${kdDiff > 0 ? 'text-green-500' : kdDiff < 0 ? 'text-red-500' : 'text-neutral-300'}`}>
                                    {kdDiff > 0 ? `+${kdDiff}` : kdDiff}
                                </td>
                                <td className="px-2 py-3 text-center font-sans tabular-nums text-xs text-neutral-600 dark:text-neutral-400">
                                    {p.adr.toFixed(0)}
                                </td>
                                <td className="px-2 py-3 text-center font-sans tabular-nums text-xs text-neutral-500">
                                    {p.kast ? p.kast.toFixed(0) : 0}%
                                </td>
                                <td className="px-2 py-3 text-center">
                                    <div className={`font-black text-center font-sans tabular-nums text-sm ${ratingColor}`}>
                                        {p.rating.toFixed(2)}
                                    </div>
                                </td>
                                
                                <td className="px-2 py-3 text-center font-sans tabular-nums text-xs text-neutral-600 dark:text-neutral-400">
                                    {p.entry_kills || 0}
                                </td>
                                <td 
                                    className="px-2 py-3 text-center"
                                    onClick={(e) => { e.stopPropagation(); closePopup(); }}
                                >
                                    <DataPopupCell 
                                        value={totalMulti > 0 ? totalMulti : '-'}
                                        title="多杀数据"
                                        data={getMultiKillData(multiKills)}
                                        isActive={activePopup?.id === p.playerId && activePopup?.type === 'mk'} 
                                        onClick={(e) => handlePopupClick(e, p.playerId, 'mk')}
                                        align={popupAlign}
                                    />
                                </td>
                                <td 
                                    className="px-2 py-3 text-center"
                                    onClick={(e) => { e.stopPropagation(); closePopup(); }}
                                >
                                    <DataPopupCell 
                                        value={clutchWinCount > 0 ? clutchWinCount : '-'}
                                        title="残局获胜 (Wins)"
                                        data={getClutchData(clutches)}
                                        isActive={activePopup?.id === p.playerId && activePopup?.type === 'clutch'}
                                        onClick={(e) => handlePopupClick(e, p.playerId, 'clutch')}
                                        align={popupAlign}
                                        highlight={true}
                                    />
                                </td>

                                <td className="px-2 py-3 text-center font-sans tabular-nums text-xs text-neutral-400">
                                    {p.hsRate}%
                                </td>
                                <td className="px-2 py-3 text-center font-sans tabular-nums text-xs text-neutral-400">
                                    {p.utility.heDamage + p.utility.molotovDamage}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
        );
    };

    return (
        <div className="space-y-6" onClick={closePopup}>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
                {renderTable(aggregatedPlayers, false)}
                <div className="h-px bg-neutral-100 dark:bg-neutral-800 mx-4"></div>
                {renderTable(aggregatedEnemies, true)}
            </div>
        </div>
    );
};