
import { Match, PlayerMatchStats, Side } from '../../types';
import { isSniperWeapon, isUtilityDamageWeapon } from './weaponHelper';
import { resolveName } from '../demo/helpers';

export interface AggregatedStats {
    // --- General ---
    roundsPlayed: number;
    kills: number;
    deaths: number;
    assists: number;
    damage: number;
    headshots: number;
    
    // --- Firepower ---
    multiKillRounds: number;
    roundsWithKills: number;
    killsInWins: number; 
    damageInWins: number;
    roundsWon: number;
    pistolRatingSum: number;
    pistolRoundsPlayed: number;
    ratingSum: number;
    wpaSum: number;

    // --- Entry/Trade/Support ---
    entryKills: number;
    entryDeaths: number;
    entryDeathsTraded: number; 
    tradeKills: number; 
    tradedDeaths: number; 
    killsWithAssist: number; 
    supportRounds: number; 
    roundsWonAfterEntry: number; 
    savedByTeammate: number; // Passive: I was saved
    teammatesSaved: number;  // Active: I saved a teammate
    
    // --- Utility ---
    utilityDamage: number;
    flashAssists: number;
    blindDuration: number;
    enemiesBlinded: number;
    utilityKills: number; 
    flashesThrown: number;
    
    // --- Discipline ---
    kastRounds: number;
    survivedRounds: number;
    savesInLosses: number;
    roundsLost: number;
    
    // --- Sniper ---
    sniperKills: number;              
    sniperMultiKillRounds: number;    
    sniperOpeningKills: number;       
    roundsWithSniperKills: number;    
}

export const aggregatePlayerStats = (
    profileId: string, 
    history: { match: Match, stats: PlayerMatchStats }[], 
    sideFilter: 'ALL' | 'CT' | 'T'
): AggregatedStats => {
    
    const stats: AggregatedStats = {
        roundsPlayed: 0, kills: 0, deaths: 0, assists: 0, damage: 0, headshots: 0,
        multiKillRounds: 0, roundsWithKills: 0, killsInWins: 0, damageInWins: 0, roundsWon: 0,
        pistolRatingSum: 0, pistolRoundsPlayed: 0, ratingSum: 0, wpaSum: 0,
        
        entryKills: 0, entryDeaths: 0, entryDeathsTraded: 0, tradeKills: 0, tradedDeaths: 0, 
        killsWithAssist: 0, supportRounds: 0, roundsWonAfterEntry: 0, savedByTeammate: 0, teammatesSaved: 0,
        
        utilityDamage: 0, flashAssists: 0, blindDuration: 0, enemiesBlinded: 0, utilityKills: 0, flashesThrown: 0,
        
        clutchPoints: 0, w1v1: 0, l1v1: 0,
        roundsLastAlive: 0, totalTimeAlive: 0, savesInLosses: 0, roundsLost: 0, survivedRounds: 0,
        
        kastRounds: 0,

        sniperKills: 0, sniperMultiKillRounds: 0, sniperOpeningKills: 0, roundsWithSniperKills: 0
    };

    history.forEach(({ match, stats: summaryStats }) => {
        // 1. Process Pre-calculated Match Summary Stats
        if (summaryStats.clutchHistory) {
            summaryStats.clutchHistory.forEach(c => {
                if (sideFilter !== 'ALL' && c.side !== sideFilter) return;
                
                if (c.result === 'won') {
                    stats.clutchPoints += c.opponentCount;
                    if (c.opponentCount === 1) stats.w1v1++;
                }
                if (c.result === 'lost' && c.opponentCount === 1) {
                    stats.l1v1++;
                }
            });
        }

        if (!match.rounds) return;

        // Enhanced lookup: Check ID, SteamID, and Resolved Name
        const matchPlayer = [...match.players, ...match.enemyPlayers].find(p => 
            p.playerId === profileId || 
            p.steamid === profileId ||
            resolveName(p.playerId) === profileId
        );
        
        if (!matchPlayer) return;
        
        // Target ID for Round Lookup (prefer SteamID if available, as rounds are keyed by SteamID for strangers)
        const targetId = matchPlayer.steamid || matchPlayer.playerId;

        // 2. Iterate Rounds
        match.rounds.forEach(round => {
            const pRound = round.playerStats[targetId];
            if (!pRound) return; 
            
            if (sideFilter !== 'ALL' && pRound.side !== sideFilter) return;
            if (pRound.rating === 0 && pRound.damage === 0 && pRound.deaths === 0) return;

            // --- Basic Accumulation ---
            stats.roundsPlayed++;
            stats.kills += pRound.kills;
            stats.deaths += pRound.deaths;
            stats.assists += pRound.assists;
            stats.damage += pRound.damage;
            stats.headshots += pRound.headshots;
            stats.ratingSum += pRound.rating;
            
            if (typeof pRound.wpa === 'number' && !isNaN(pRound.wpa)) {
                stats.wpaSum += pRound.wpa;
            }

            // --- Firepower ---
            if (pRound.kills >= 2) stats.multiKillRounds++;
            if (pRound.kills > 0) stats.roundsWithKills++;
            
            // --- Objectives/Win ---
            const isWin = round.winnerSide === pRound.side;
            if (isWin) {
                stats.roundsWon++;
                stats.killsInWins += pRound.kills; 
                stats.damageInWins += pRound.damage;
                
                if (pRound.isEntryKill) {
                    stats.roundsWonAfterEntry++;
                }
            } else {
                stats.roundsLost++;
                if (pRound.survived) stats.savesInLosses++;
            }

            // --- Special Rounds ---
            if (round.roundNumber === 1 || round.roundNumber === 13) {
                stats.pistolRatingSum += pRound.rating;
                stats.pistolRoundsPlayed++;
            }

            // --- Roles & Support ---
            if (pRound.isEntryKill) stats.entryKills++;
            if (pRound.isEntryDeath) {
                stats.entryDeaths++;
                if (pRound.wasTraded) stats.entryDeathsTraded++; 
            }
            if (pRound.traded) stats.tradeKills++;
            if (pRound.wasTraded) stats.tradedDeaths++;
            if (pRound.survived) stats.survivedRounds++;
            if (pRound.kills > 0 || pRound.assists > 0 || pRound.survived || pRound.wasTraded) {
                stats.kastRounds++;
            }

            let roundFlashAssists = 0;
            if (pRound.utility && pRound.utility.flashesThrown > 0) {
                 roundFlashAssists = round.timeline.filter(e => e.type === 'flash_assist' && e.subject && (e.subject.steamid === targetId || e.subject.name === targetId)).length;
                 stats.flashAssists += roundFlashAssists;
            }

            if (pRound.assists > 0 || roundFlashAssists > 0 || pRound.wasTraded) {
                stats.supportRounds++;
            }

            // --- Utility ---
            if (pRound.utility) {
                stats.utilityDamage += (pRound.utility.heDamage || 0) + (pRound.utility.molotovDamage || 0);
                stats.blindDuration += pRound.utility.blindDuration || 0;
                stats.enemiesBlinded += pRound.utility.enemiesBlinded || 0;
                stats.flashesThrown += pRound.utility.flashesThrown || 0;
            } else {
                stats.utilityDamage += pRound.utilityDamage || 0;
            }
            
            // --- Timeline Analysis (Advanced Metrics) ---
            
            const recentThreats = new Map<string, number>(); // AttackerID -> Time
            const recentDamageTaken = new Map<string, { victim: string, time: number }>(); // AttackerID -> LastVictimInfo

            let roundSniperKills = 0;
            let hasSniperOpening = false;

            if (round.timeline) {
                const playerKills = round.timeline.filter(e => 
                    e.type === 'kill' && 
                    e.subject && 
                    (e.subject.steamid === targetId || e.subject.name === targetId)
                );
                const firstKillOfRound = round.timeline.find(e => e.type === 'kill');
                const isRoundFirstKill = firstKillOfRound && firstKillOfRound === playerKills[0];

                round.timeline.forEach(e => {
                    const subjectId = e.subject ? (e.subject.steamid || e.subject.name) : '';
                    const targetIdStr = e.target ? (e.target.steamid || e.target.name) : '';

                    // 1. Track Threats (Damage)
                    if (e.type === 'damage' && subjectId && targetIdStr) {
                        // Track threats TO me (Passive Save)
                        if (targetIdStr === targetId) {
                            recentThreats.set(subjectId, e.seconds);
                        }
                        // Track threats BY enemy (Active Save)
                        if (e.subject && e.subject.side !== pRound.side) {
                            recentDamageTaken.set(subjectId, { victim: targetIdStr, time: e.seconds });
                        }
                    }

                    // 2. Process Kills
                    if (e.type === 'kill' && subjectId && targetIdStr) {
                        const killerId = subjectId;
                        const victimId = targetIdStr;
                        const killerStats = round.playerStats[killerId];

                        // A. Passive: Saved by Teammate
                        // Did 'victimId' hurt me recently?
                        if (recentThreats.has(victimId)) {
                            const hurtTime = recentThreats.get(victimId)!;
                            if (e.seconds - hurtTime <= 5.0) {
                                // Was it a teammate who killed him?
                                if (killerStats && killerStats.side === pRound.side && killerId !== targetId) {
                                    stats.savedByTeammate++;
                                    recentThreats.delete(victimId); 
                                }
                            }
                        }

                        // B. Active: I Saved a Teammate
                        if (killerId === targetId) {
                            // Did this victim hurt any of my teammates recently?
                            if (recentDamageTaken.has(victimId)) {
                                const info = recentDamageTaken.get(victimId)!;
                                // Check if the victim of the damage was my teammate (and not me)
                                const hurtPlayerStats = round.playerStats[info.victim];
                                if (hurtPlayerStats && hurtPlayerStats.side === pRound.side && info.victim !== targetId) {
                                    if (e.seconds - info.time <= 5.0) {
                                        stats.teammatesSaved++;
                                        recentDamageTaken.delete(victimId);
                                    }
                                }
                            }
                        }

                        // Sniper Logic
                        if (killerId === targetId) {
                             if (isSniperWeapon(e.weapon)) {
                                stats.sniperKills++;
                                roundSniperKills++;
                                if (pRound.isEntryKill && isRoundFirstKill) {
                                     if (e === playerKills[0]) hasSniperOpening = true;
                                }
                            }
                            if (isUtilityDamageWeapon(e.weapon)) {
                                stats.utilityKills++;
                            }
                        }
                    }
                });
            }

            if (roundSniperKills > 0) stats.roundsWithSniperKills++;
            if (roundSniperKills >= 2) stats.sniperMultiKillRounds++;
            if (hasSniperOpening) stats.sniperOpeningKills++;

            // --- Advanced Clutch Logic ---
            let timeAlive = round.duration;
            if (!pRound.survived) {
                // Find MY death event to get exact time
                const deathEvent = round.timeline.find(e => 
                    e.type === 'kill' && 
                    e.target && 
                    (e.target.steamid === targetId || e.target.name === targetId)
                );
                if (deathEvent) {
                    timeAlive = deathEvent.seconds;
                }
            }
            stats.totalTimeAlive += timeAlive;

            // Last Alive Calculation
            const teammates = Object.values(round.playerStats).filter(p => p.side === pRound.side);
            const totalTeammates = teammates.length;
            const deadTeammates = teammates.filter(p => !p.survived).length;
            
            let isLast = false;
            // Case 1: I survived, everyone else died
            if (pRound.survived) {
                if (deadTeammates === totalTeammates - 1) isLast = true;
            } else {
                // Case 2: Everyone died (including me), but I was the last to die
                if (deadTeammates === totalTeammates) {
                     const teamIds = Object.keys(round.playerStats).filter(id => round.playerStats[id].side === pRound.side);
                    let myDeathTime = 0;
                    let maxTeammateDeathTime = 0;
                    
                    round.timeline.forEach(e => {
                        if (e.type === 'kill' && e.target) {
                            const tid = e.target.steamid || e.target.name;
                            if (tid === targetId) myDeathTime = e.seconds;
                            if (teamIds.includes(tid) && tid !== targetId) {
                                maxTeammateDeathTime = Math.max(maxTeammateDeathTime, e.seconds);
                            }
                        }
                    });
                    
                    if (myDeathTime > maxTeammateDeathTime) isLast = true;
                }
            }
            if (isLast) stats.roundsLastAlive++;
        });
    });

    return stats;
};
