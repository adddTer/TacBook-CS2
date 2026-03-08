import { useMemo } from 'react';
import { Match, PlayerMatchStats, ClutchRecord, PlayerRoundStats } from '../types';

type SideFilter = 'ALL' | 'CT' | 'T';

const safeDiv = (a: number, b: number) => b === 0 ? 0 : a / b;

export const useAggregatedStats = (match: Match, targetPlayers: PlayerMatchStats[], filter: SideFilter) => useMemo(() => {
    if (!match.rounds || match.rounds.length === 0) return targetPlayers;

    // 1. Pre-filter "Ghost Rounds"
    const validRounds = match.rounds.filter(round => {
        const allStats = Object.values(round.playerStats) as PlayerRoundStats[];
        if (allStats.length === 0) return false;
        
        const isGhost = allStats.every(s => 
            s.rating === 0 && 
            s.kills === 0 && 
            s.deaths === 0 && 
            s.assists === 0 && 
            s.damage === 0
        );
        return !isGhost;
    });

    // 2. Map over targetPlayers and calculate stats
    const result = targetPlayers.map(p => {
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
        
        validRounds.forEach(round => {
            const pRound = round.playerStats[id];
            if (!pRound) return;
            if (filter !== 'ALL' && pRound.side !== filter) return;
            if (pRound.rating === 0 && pRound.kills === 0 && pRound.deaths === 0 && pRound.assists === 0 && pRound.damage === 0) return;

            roundsPlayed++;
            acc.kills += pRound.kills;
            acc.deaths += pRound.deaths;
            acc.assists += pRound.assists;
            acc.damage += pRound.damage;
            acc.ratingSum += pRound.rating;
            acc.headshots += pRound.headshots;
            
            const wpa = pRound.wpa;
            if (typeof wpa === 'number' && !isNaN(wpa)) acc.wpaSum += wpa;
            
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

            if (pRound.kills > 0 || pRound.assists > 0 || pRound.survived || pRound.wasTraded) acc.kastCount++;
        });

        if (roundsPlayed === 0) return p;

        const calculatedRating = safeDiv(acc.ratingSum, roundsPlayed);
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
            wpa: parseFloat(avgWpa.toFixed(2)),
            clutches: accClutches
        };
    });

    // 3. Assign MVP and EVP
    const sorted = [...result].sort((a, b) => b.rating - a.rating);
    if (sorted.length > 0) {
        const usWon = match.score.us > match.score.them;
        const themWon = match.score.them > match.score.us;
        const isTie = match.score.us === match.score.them;

        let mvpPlayer = null;
        if (isTie) {
            mvpPlayer = sorted[0];
        } else {
            const winningTeamIds = new Set(
                (usWon ? match.players : match.enemyPlayers).map(p => p.playerId)
            );
            mvpPlayer = sorted.find(p => winningTeamIds.has(p.playerId));
            if (!mvpPlayer) mvpPlayer = sorted[0];
        }

        if (mvpPlayer) {
            mvpPlayer.isMvp = true;
        }

        for (let i = 0; i < Math.min(6, sorted.length); i++) {
            if (sorted[i] !== mvpPlayer && sorted[i].rating >= 1.1) {
                sorted[i].isEvp = true;
            }
        }
    }

    return result;
}, [match.rounds, targetPlayers, filter]);
