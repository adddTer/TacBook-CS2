import { Match, PlayerProfile, Side } from '../../types';
import { resolveName } from '../demo/helpers';
import { MatchAggregator } from './matchAggregator';
import { calculatePlayerStats } from './playerStatsCalculator';

export const calculateTeamDeepStats = (
    teamId: string,
    players: PlayerProfile[],
    matches: Match[],
    teamPlayerStats: any[],
    internalSideFilter: 'ALL' | 'CT' | 'T',
    minTeamMembers: number,
    maxTeamMembers: number
) => {
    if (!players || players.length === 0 || !matches || matches.length === 0) return null;
    
    // We use the first player's id combined with players length as a surrogate for teamId
    const teamIdSurrogate = `TDS-${players[0].id}-${players.length}`;
    const cacheKey = generateFingerprint(teamIdSurrogate, matches, internalSideFilter, minTeamMembers, maxTeamMembers);
    
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }

    // 1. Array sorted stats calculation inline
    const playerIdMap = new Map<string, string>();
    players.forEach(p => {
        playerIdMap.set(p.id, p.id);
        if (p.steamids) {
            p.steamids.forEach(steamId => playerIdMap.set(steamId, p.id));
        }
    });

    const resolveKeyToPlayerId = (key: string): string | null => {
        if (playerIdMap.has(key)) return playerIdMap.get(key)!;
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
            avgRating: newRating !== '-' ? Number(newRating).toFixed(2) : '-',
            matches: filtered ? filtered.count : 0,
            dataTypeLabel: '回合'
        };
    });

    const sortedTeamPlayerStats = updatedStats.sort((a, b) => {
        if (a.avgRating === '-' && b.avgRating === '-') return 0;
        if (a.avgRating === '-') return 1;
        if (b.avgRating === '-') return -1;
        return Number(b.avgRating) - Number(a.avgRating);
    });

    // 2. Abilities
    let totalRounds = 0;
    let sums: Record<string, number> = {};

    players.forEach(player => {
        const history = matches
            .filter(m => [...m.players, ...m.enemyPlayers].some(px => resolveName(px.playerId) === resolveName(player.id) || resolveName(px.steamid) === resolveName(player.id)))
            .map(m => {
                const rawStats = [...m.players, ...m.enemyPlayers].find(px => resolveName(px.playerId) === resolveName(player.id) || resolveName(px.steamid) === resolveName(player.id))!;
                const aggregatedStats = MatchAggregator.aggregateMatchBySide(m, [rawStats], 'ALL')[0];
                return { match: m, stats: aggregatedStats };
            });

        if (history.length === 0) return;

        const fullStats = calculatePlayerStats(player.id, history, internalSideFilter as any);
        const rounds = history.reduce((sum, h) => sum + (h.stats.r3_rounds_played || h.match.rounds?.length || Math.max(h.match.score.us + h.match.score.them, 1)), 0);

        if (rounds > 0) {
            totalRounds += rounds;
            Object.entries(fullStats.filtered.details).forEach(([k, v]) => {
                if (typeof v === 'number') {
                    sums[k] = (sums[k] || 0) + v * rounds;
                }
            });
            sums['scoreFirepower'] = (sums['scoreFirepower'] || 0) + fullStats.filtered.scoreFirepower * rounds;
            sums['scoreEntry'] = (sums['scoreEntry'] || 0) + fullStats.filtered.scoreEntry * rounds;
            sums['scoreSniper'] = (sums['scoreSniper'] || 0) + fullStats.filtered.scoreSniper * rounds;
            sums['scoreClutch'] = (sums['scoreClutch'] || 0) + fullStats.filtered.scoreClutch * rounds;
            sums['scoreOpening'] = (sums['scoreOpening'] || 0) + fullStats.filtered.scoreOpening * rounds;
            sums['scoreTrade'] = (sums['scoreTrade'] || 0) + fullStats.filtered.scoreTrade * rounds;
            sums['scoreUtility'] = (sums['scoreUtility'] || 0) + fullStats.filtered.scoreUtility * rounds;
        }
    });

    let teamAbilitiesFilteredData = null;
    let teamAbilities = null;
    if (totalRounds > 0) {
        const averagedFiltered: Record<string, number> = {};
        Object.entries(sums).forEach(([k, v]) => {
            averagedFiltered[k] = v / totalRounds;
        });
        teamAbilitiesFilteredData = averagedFiltered;
        
        teamAbilities = [
            { id: 'firepower', label: '火力', value: averagedFiltered.scoreFirepower }, 
            { id: 'entry', label: '破点', value: averagedFiltered.scoreEntry }, 
            { id: 'sniper', label: '狙击', value: averagedFiltered.scoreSniper }, 
            { id: 'clutch', label: '残局', value: averagedFiltered.scoreClutch }, 
            { id: 'opening', label: '开局', value: averagedFiltered.scoreOpening, isPct: false }, 
            { id: 'trade', label: '补枪', value: averagedFiltered.scoreTrade }, 
            { id: 'utility', label: '道具', value: averagedFiltered.scoreUtility }, 
        ];
    }

    const result = {
        sortedTeamPlayerStats,
        teamAbilitiesFilteredData,
        teamAbilities
    };
    
    cache.set(cacheKey, result);
    return result;
};


// Simple Cache implementation for team stats calculating
const cache = new Map<string, any>();

function generateFingerprint(teamId: string, matches: Match[], sideFilter: string, minTeamMembers?: number, maxTeamMembers?: number): string {
    const matchHash = matches.length + '-' + (matches[0]?.id || '') + '-' + (matches[matches.length - 1]?.id || '');
    return `${teamId}-${matchHash}-${sideFilter}-${minTeamMembers}-${maxTeamMembers}`;
}

export const clearTeamStatsCache = () => {
    cache.clear();
};

/**
 * Calculates the overall rating of a team by computing a weighted average
 * of each member's rating based on the number of rounds they played.
 */
export const calculateTeamRating = (players: PlayerProfile[], matches: Match[]): number => {
    if (!players || players.length === 0 || !matches || matches.length === 0) return 0;
    
    // We use the first player's id combined with players length as a surrogate for teamId
    const teamIdSurrogate = `TR-${players[0].id}-${players.length}`;
    const cacheKey = generateFingerprint(teamIdSurrogate, matches, 'ALL');
    
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }

    let totalScore = 0;
    let totalRoundsPlayed = 0;

    const playerIds = new Set((players || []).map(p => p.id));
    const playerSteamIds = new Set((players || []).flatMap(p => p.steamids || []));

    matches?.forEach(match => {
        const allStats = [...(match.players || []), ...(match.enemyPlayers || [])];
        allStats.forEach(stat => {
            const matchIdKey = stat.playerId ? resolveName(stat.playerId) : (stat as any).name ? resolveName((stat as any).name) : null;
            const matchSteamKey = stat.steamid ? stat.steamid.toString() : null;

            let isMatch = false;
            
            if (matchIdKey && playerIds.has(matchIdKey)) {
                isMatch = true;
            } else if (matchSteamKey) {
                for (const teamSteamStr of playerSteamIds) {
                    if (teamSteamStr === matchSteamKey || teamSteamStr.includes(matchSteamKey) || matchSteamKey.includes(teamSteamStr)) {
                        isMatch = true;
                        break;
                    }
                    if (/^\d+$/.test(matchSteamKey) && matchSteamKey.length < 16) {
                        const accountId = parseInt(matchSteamKey, 10);
                        const base = BigInt('76561197960265728');
                        const convertedId = (base + BigInt(accountId)).toString();
                        if (teamSteamStr === convertedId) {
                            isMatch = true;
                            break;
                        }
                    }
                }
            }
            
            if (isMatch) {
                const rounds = stat.r3_rounds_played || (match.rounds ? match.rounds.length : (match.score.us + match.score.them));
                
                if (rounds > 0 && stat.rating !== undefined) {
                    totalScore += stat.rating * rounds;
                    totalRoundsPlayed += rounds;
                }
            }
        });
    });

    if (totalRoundsPlayed === 0) {
        return 0; // Return 0 if the team hasn't played any rounds
    }

    const result = totalScore / totalRoundsPlayed;
    cache.set(cacheKey, result);
    return result;
};

export interface TeamComprehensiveStats {
    roundsPlayed: number;
    roundsWon: number;
    kills: number;
    deaths: number;
    assists: number;
    pistolRoundsPlayed: number;
    pistolRoundsWon: number;
    totalMapsPlayed: number;
    mapWinRates: Record<string, { wins: number, total: number }>;
    firstTo5Wins: number;
    firstTo5Matches: number;
    totalMatchesWith5: number;
    firstTo10Wins: number;
    firstTo10Matches: number;
    totalMatchesWith10: number;
}

export const calculateComprehensiveTeamStats = (
    players: PlayerProfile[], 
    matches: Match[], 
    sideFilter: 'ALL' | 'CT' | 'T', 
    minTeamMembers: number = 3, 
    maxTeamMembers: number = 5
): TeamComprehensiveStats => {
    if (!players || players.length === 0) return { roundsPlayed: 0, roundsWon: 0, kills: 0, deaths: 0, assists: 0, pistolRoundsPlayed: 0, pistolRoundsWon: 0, totalMapsPlayed: 0, mapWinRates: {}, firstTo5Wins: 0, firstTo5Matches: 0, totalMatchesWith5: 0, firstTo10Wins: 0, firstTo10Matches: 0, totalMatchesWith10: 0 };
    const teamIdSurrogate = `TC-${players[0].id}-${players.length}`;
    const cacheKey = generateFingerprint(teamIdSurrogate, matches, sideFilter, minTeamMembers, maxTeamMembers);
    
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }

    const stats: TeamComprehensiveStats = {
        roundsPlayed: 0,
        roundsWon: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
        pistolRoundsPlayed: 0,
        pistolRoundsWon: 0,
        totalMapsPlayed: 0,
        mapWinRates: {},
        firstTo5Wins: 0,
        firstTo5Matches: 0,
        totalMatchesWith5: 0,
        firstTo10Wins: 0,
        firstTo10Matches: 0,
        totalMatchesWith10: 0
    };

    const playerIds = new Set((players || []).map(p => p.id));
    const playerSteamIds = new Set((players || []).flatMap(p => p.steamids || []));

    if (!matches) return stats;

    for (const match of matches) {
        if (!match.rounds || match.rounds.length === 0) {
            continue;
        }

        let matchMeetsCriteria = false;
        let mapAdded = false;
        
        let usWonMatch = false; // Need to determine if our team won the overall match
        
        // Track round wins for this specific match to calculate first to 5 / 10
        let usMatchRoundWins = 0;
        let enemyMatchRoundWins = 0;
        let reached5First: 'us' | 'enemy' | null = null;
        let reached10First: 'us' | 'enemy' | null = null;

        for (const round of match.rounds) {
            let mySide: Side | null = null;
            let matchingMembersCount = 0;
            let roundKills = 0;
            let roundDeaths = 0;
            let roundAssists = 0;
            
            for (const [key, pStat] of Object.entries(round.playerStats)) {
                const resolvedKey = resolveName(key);
                let isMatch = false;
                if (playerIds.has(resolvedKey)) {
                    isMatch = true;
                } else {
                    for (const teamSteamStr of playerSteamIds) {
                        if (teamSteamStr === key || teamSteamStr.includes(key) || key.includes(teamSteamStr)) {
                            isMatch = true;
                            break;
                        }
                        if (/^\d+$/.test(key) && key.length < 16) {
                            const accountId = parseInt(key, 10);
                            const base = BigInt('76561197960265728');
                            const convertedId = (base + BigInt(accountId)).toString();
                            if (teamSteamStr === convertedId) {
                                isMatch = true;
                                break;
                            }
                        }
                    }
                }
                
                if (isMatch) {
                    if (!mySide) mySide = pStat.side;
                    matchingMembersCount++;
                    roundKills += (pStat.kills || 0);
                    roundDeaths += (pStat.deaths || 0);
                    roundAssists += (pStat.assists || 0);
                }
            }

            if (!mySide || matchingMembersCount < minTeamMembers || matchingMembersCount > maxTeamMembers) {
                continue;
            }

            // We consider the team was "active" in this match if they met criteria in at least one valid round.
            if (!matchMeetsCriteria) {
                matchMeetsCriteria = true;
            }

            const weWonRound = round.winnerSide === mySide;

            // Track First to X Logic (Requires no Side Filter to be accurate for full match context, but we respect the min/max member limit)
            if (weWonRound) usMatchRoundWins++;
            else enemyMatchRoundWins++;

            if (!reached5First) {
                if (usMatchRoundWins === 5) reached5First = 'us';
                else if (enemyMatchRoundWins === 5) reached5First = 'enemy';
            }
            if (!reached10First) {
                if (usMatchRoundWins === 10) reached10First = 'us';
                else if (enemyMatchRoundWins === 10) reached10First = 'enemy';
            }

            // Side Filter Application for aggregates
            if (sideFilter !== 'ALL' && mySide !== sideFilter) {
                continue;
            }

            // Apply valid round stats
            stats.roundsPlayed++;
            if (weWonRound) stats.roundsWon++;
            stats.kills += roundKills;
            stats.deaths += roundDeaths;
            stats.assists += roundAssists;

            // Check if pistol round. Standardly round index 1 and 13 (so 0 and 12).
            if (round.roundNumber === 1 || round.roundNumber === 13) {
                stats.pistolRoundsPlayed++;
                if (weWonRound) stats.pistolRoundsWon++;
            }
        }

        // Match level statistics are evaluated only if the match had valid rounds for this team
        if (matchMeetsCriteria) {
            stats.totalMapsPlayed++;
            
            // Re-evaluate if we won the match overall
            usWonMatch = usMatchRoundWins > enemyMatchRoundWins; 
            
            // Map rates
            if (!stats.mapWinRates[match.mapId]) stats.mapWinRates[match.mapId] = { wins: 0, total: 0 };
            stats.mapWinRates[match.mapId].total++;
            if (usWonMatch) stats.mapWinRates[match.mapId].wins++;

            // First to X winrate
            if (reached5First) {
                stats.totalMatchesWith5++;
                if (reached5First === 'us') {
                    stats.firstTo5Matches++;
                    if (usWonMatch) stats.firstTo5Wins++;
                }
            }
            if (reached10First) {
                stats.totalMatchesWith10++;
                if (reached10First === 'us') {
                    stats.firstTo10Matches++;
                    if (usWonMatch) stats.firstTo10Wins++;
                }
            }
        }
    }

    cache.set(cacheKey, stats);
    return stats;
};
export interface TeamWinRateMatrix {
    // 5x5 matrix where matrix[myAlive - 1][enemyAlive - 1] = { wins, total }
    // e.g. matrix[4][4] is 5v5
    matrix: { wins: number; total: number }[][];
}

export const calculateTeamWinRateMatrix = (players: PlayerProfile[], matches: Match[], sideFilter: 'ALL' | 'CT' | 'T', minTeamMembers: number = 3, maxTeamMembers: number = 5): TeamWinRateMatrix => {
    if (!players || players.length === 0) return { matrix: Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => ({ wins: 0, total: 0 }))) };
    const teamIdSurrogate = `TWM-${players[0].id}-${players.length}`;
    const cacheKey = generateFingerprint(teamIdSurrogate, matches, sideFilter, minTeamMembers, maxTeamMembers);
    
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }

    // Initialize 5x5 matrix
    const matrix: { wins: number; total: number }[][] = Array.from({ length: 5 }, () => 
        Array.from({ length: 5 }, () => ({ wins: 0, total: 0 }))
    );

    const playerIds = new Set((players || []).map(p => p.id));
    const playerSteamIds = new Set((players || []).flatMap(p => p.steamids || []));

    if (!matches) return { matrix };

    for (const match of matches) {
        if (!match.rounds) continue;

        for (const round of match.rounds) {
            // Determine our side for this round and count matching members
            let mySide: Side | null = null;
            let matchingMembersCount = 0;
            
            for (const [key, pStat] of Object.entries(round.playerStats)) {
                const resolvedKey = resolveName(key);
                let isMatch = false;
                if (playerIds.has(resolvedKey)) {
                    isMatch = true;
                } else {
                    for (const teamSteamStr of playerSteamIds) {
                        if (teamSteamStr === key || teamSteamStr.includes(key) || key.includes(teamSteamStr)) {
                            isMatch = true;
                            break;
                        }
                        if (/^\d+$/.test(key) && key.length < 16) {
                            const accountId = parseInt(key, 10);
                            const base = BigInt('76561197960265728');
                            const convertedId = (base + BigInt(accountId)).toString();
                            if (teamSteamStr === convertedId) {
                                isMatch = true;
                                break;
                            }
                        }
                    }
                }
                
                if (isMatch) {
                    // Set side based on the first matched player (assuming all team matches are same side)
                    if (!mySide) {
                        mySide = pStat.side;
                    }
                    matchingMembersCount++;
                }
            }

            if (!mySide) continue; // Our team not found in this round
            if (sideFilter !== 'ALL' && mySide !== sideFilter) continue;
            
            // Check if the round meets the minimum/maximum required team members criteria
            if (matchingMembersCount < minTeamMembers || matchingMembersCount > maxTeamMembers) {
                continue;
            }

            const weWon = round.winnerSide === mySide;

            let myAlive = 5;
            let enemyAlive = 5;

            // Track states that occurred in this round to avoid double counting the same state
            // (e.g. if state is naturally 5v5 at start, we record it once this round)
            const occurredStates = new Set<string>();

            const recordState = (me: number, enemy: number) => {
                const stateKey = `${me}-${enemy}`;
                if (me > 0 && me <= 5 && enemy > 0 && enemy <= 5 && !occurredStates.has(stateKey)) {
                    occurredStates.add(stateKey);
                    matrix[me - 1][enemy - 1].total++;
                    if (weWon) {
                        matrix[me - 1][enemy - 1].wins++;
                    }
                }
            };

            // Start of round state
            recordState(myAlive, enemyAlive);

            if (round.timeline) {
                for (const event of round.timeline) {
                    if (event.type === 'kill' && event.target) {
                        if (event.target.side === mySide) {
                            myAlive--;
                        } else {
                            enemyAlive--;
                        }
                        recordState(myAlive, enemyAlive);
                    }
                }
            }
        }
    }

    const result = { matrix };
    cache.set(cacheKey, result);
    return result;
};

