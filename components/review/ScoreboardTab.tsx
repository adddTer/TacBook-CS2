import React, { useMemo } from 'react';
import { Match, PlayerMatchStats, ClutchRecord, PlayerRoundStats } from '../../types';
import { ScoreboardTable } from './ScoreboardTable';

type SideFilter = 'ALL' | 'CT' | 'T';

interface ScoreboardTabProps {
    match: Match;
    players: PlayerMatchStats[];
    enemyPlayers: PlayerMatchStats[];
    onPlayerClick: (id: string) => void;
    filter: SideFilter;
}

export const ScoreboardTab: React.FC<ScoreboardTabProps> = ({ 
    match,
    players, 
    enemyPlayers, 
    onPlayerClick, 
    filter 
}) => {
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
                ratingSum: 0, entryKills: 0, wpaSum: 0,
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
                
                // Safe WPA accumulation (handle undefined or NaN)
                const wpa = pRound.wpa;
                if (typeof wpa === 'number' && !isNaN(wpa)) {
                    acc.wpaSum += wpa;
                }
                
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
                    hsRate: 0, wpa: 0,
                    utility: { ...p.utility, heDamage: 0, molotovDamage: 0 },
                    clutches: accClutches
                };
            }

            // Corrected Rating Calculation: Average Round Rating * 1.30 Scaling Factor
            const calculatedRating = (acc.ratingSum / roundsPlayed) * 1.30;
            
            // Average WPA calculation
            const avgWpa = acc.wpaSum / roundsPlayed;

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
                wpa: parseFloat(avgWpa.toFixed(2)), // Avg WPA
                clutches: accClutches
            };
        });
    }, [match.rounds, targetPlayers, filter]);

    const aggregatedPlayers = useAggregatedStats(players);
    const aggregatedEnemies = useAggregatedStats(enemyPlayers);

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
                <ScoreboardTable 
                    players={aggregatedPlayers} 
                    title="我方" 
                    isEnemy={false} 
                    filter={filter} 
                    onPlayerClick={onPlayerClick} 
                />
                <div className="h-px bg-neutral-100 dark:bg-neutral-800 mx-4"></div>
                <ScoreboardTable 
                    players={aggregatedEnemies} 
                    title="敌方" 
                    isEnemy={true} 
                    filter={filter} 
                    onPlayerClick={onPlayerClick} 
                />
            </div>
        </div>
    );
};