import { Match, PlayerMatchStats, MatchBon } from '../types';
import { getAllPlayers, getTeams } from './teamLoader';
import { MAPS } from '../constants/maps';

export const isPlayerInUserTeam = (p: PlayerMatchStats): boolean => {
    const userTeams = getTeams().filter(t => t.type === 'user');
    return userTeams.some(team => {
        return team.players.some(r => {
            if (r.id === p.playerId || r.name === p.playerId) return true;
            if (!p.steamid) return false;
            
            const pSteamIdStr = String(p.steamid);
            if (r.id === pSteamIdStr || r.id.slice(0, -2) === pSteamIdStr.slice(0, -2)) return true;
            
            let isMatch = false;
            if (r.steamids) {
                isMatch = r.steamids.some(sid => sid === pSteamIdStr || sid.slice(0, -2) === pSteamIdStr.slice(0, -2));
            }
                (pSteamIdStr.endsWith('00') && r.steamids?.some(id => id.startsWith(pSteamIdStr.slice(0, -2))));
                
            if (!isMatch && /^\d+$/.test(pSteamIdStr) && pSteamIdStr.length < 16) {
                const accountId = parseInt(pSteamIdStr, 10);
                const base = BigInt('76561197960265728');
                const convertedId = (base + BigInt(accountId)).toString();
                isMatch = r.steamids?.includes(convertedId) || false;
            }
            
            return isMatch;
        });
    });
};

/**
 * Determines if a match involves the "Main Roster" (My Team).
 * Returns true ONLY if exactly one team has registered players from a 'user' team.
 */
export const isMyTeamMatch = (match: Match): boolean => {
    const team1HasUserRoster = match.players.some(isPlayerInUserTeam);
    const team2HasUserRoster = match.enemyPlayers.some(isPlayerInUserTeam);
    
    return (team1HasUserRoster && !team2HasUserRoster) || (!team1HasUserRoster && team2HasUserRoster);
};

/**
 * Returns the number of players that exist in both lists (intersection).
 * Matching is done by SteamID (preferred) or PlayerName.
 */
const getCommonPlayerCount = (listA: PlayerMatchStats[], listB: PlayerMatchStats[]): number => {
    let count = 0;
    const listBMap = new Set<string>();
    
    listB.forEach(p => {
        if (p.steamid) listBMap.add(p.steamid);
        listBMap.add(p.playerId);
    });

    listA.forEach(p => {
        if ((p.steamid && listBMap.has(p.steamid)) || listBMap.has(p.playerId)) {
            count++;
        }
    });

    return count;
};

/**
 * Validates if a new match can be added to a series based on the first match (anchor).
 * Checks if at least 4 players match for Team A and Team B.
 * 
 * Returns:
 * - valid: boolean
 * - swapSides: boolean (if true, the new match has teams flipped compared to anchor match)
 * - error: string (reason for failure)
 */
export const validateSeriesMatch = (anchorMatch: Match, newMatch: Match): { valid: boolean, swapSides: boolean, error?: string } => {
    // Threshold for same team (allows 1 sub/stand-in)
    const THRESHOLD = 4;

    // Check Case 1: Direct Match (A=A, B=B)
    const matchA_A = getCommonPlayerCount(anchorMatch.players, newMatch.players);
    const matchB_B = getCommonPlayerCount(anchorMatch.enemyPlayers, newMatch.enemyPlayers);

    if (matchA_A >= THRESHOLD && matchB_B >= THRESHOLD) {
        return { valid: true, swapSides: false };
    }

    // Check Case 2: Swapped Match (A=B, B=A)
    const matchA_B = getCommonPlayerCount(anchorMatch.players, newMatch.enemyPlayers);
    const matchB_A = getCommonPlayerCount(anchorMatch.enemyPlayers, newMatch.players);

    if (matchA_B >= THRESHOLD && matchB_A >= THRESHOLD) {
        return { valid: true, swapSides: true };
    }

    return { 
        valid: false, 
        swapSides: false, 
        error: `队伍阵容不匹配。需要至少 ${THRESHOLD} 名相同队员。\n(A-A: ${matchA_A}, B-B: ${matchB_B}, A-B: ${matchA_B}, B-A: ${matchB_A})` 
    };
};

const identifyTeam = (players: PlayerMatchStats[]): string | undefined => {
    const teams = getTeams();
    for (const team of teams) {
        let matchCount = 0;
        for (const p of players) {
            const isMatch = team.players.some(tp => {
                if (tp.id === p.playerId || tp.name === p.playerId) return true;
                if (!p.steamid) return false;
                
                const pSteamIdStr = String(p.steamid);
                if (tp.id === pSteamIdStr) return true;
                
                let isIdMatch = tp.steamids?.includes(pSteamIdStr) || 
                    (pSteamIdStr.endsWith('00') && tp.steamids?.some(id => id.startsWith(pSteamIdStr.slice(0, -2))));
                    
                if (!isIdMatch && /^\d+$/.test(pSteamIdStr) && pSteamIdStr.length < 16) {
                    const accountId = parseInt(pSteamIdStr, 10);
                    const base = BigInt('76561197960265728');
                    const convertedId = (base + BigInt(accountId)).toString();
                    isIdMatch = tp.steamids?.includes(convertedId);
                }
                
                return isIdMatch;
            });
            if (isMatch) matchCount++;
        }
        if (matchCount >= 3) {
            return team.name;
        }
    }
    return undefined;
};

/**
 * Helper to get display names for teams in a match.
 */
export const getTeamNames = (match: Match): { teamA: string, teamB: string } => {
    let teamA = match.teamNameUs;
    let teamB = match.teamNameThem;

    const identifiedTeamA = identifyTeam(match.players);
    const identifiedTeamB = identifyTeam(match.enemyPlayers);

    if (identifiedTeamA) teamA = identifiedTeamA;
    if (identifiedTeamB) teamB = identifiedTeamB;

    const isTeamAUs = match.players.some(p => getAllPlayers().some(r => 
        r.id === p.playerId || r.name === p.playerId || 
        (p.steamid && (r.steamids?.includes(String(p.steamid)) || 
        (String(p.steamid).endsWith('00') && r.steamids?.some(id => id.startsWith(String(p.steamid).slice(0, -2)))) ||
        (/^\d+$/.test(String(p.steamid)) && String(p.steamid).length < 16 && r.steamids?.includes((BigInt('76561197960265728') + BigInt(parseInt(String(p.steamid), 10))).toString()))))
    ));
    
    const isTeamBUs = match.enemyPlayers.some(p => getAllPlayers().some(r => 
        r.id === p.playerId || r.name === p.playerId || 
        (p.steamid && (r.steamids?.includes(String(p.steamid)) || 
        (String(p.steamid).endsWith('00') && r.steamids?.some(id => id.startsWith(String(p.steamid).slice(0, -2)))) ||
        (/^\d+$/.test(String(p.steamid)) && String(p.steamid).length < 16 && r.steamids?.includes((BigInt('76561197960265728') + BigInt(parseInt(String(p.steamid), 10))).toString()))))
    ));

    if (!teamA) {
        teamA = 'Team A';
    }
    if (!teamB) {
        teamB = 'Team B';
    }

    return { teamA, teamB };
};

// --- Map Name Helper ---
export const getMapDisplayName = (rawId: string): string => {
    if (!rawId) return 'Unknown';
    // Normalize: remove 'de_', lowercase, trim
    const cleanId = rawId.toLowerCase().replace(/^de_/, '').trim();
    
    const mapObj = MAPS.find(m => m.id === cleanId);
    return mapObj ? mapObj.name : rawId; // Fallback to raw ID if not found
};

export const getMapEnName = (rawId: string): string => {
    if (!rawId) return 'Unknown';
    const cleanId = rawId.toLowerCase().replace(/^de_/, '').trim();
    const mapObj = MAPS.find(m => m.id === cleanId);
    return mapObj ? mapObj.enName : cleanId;
};

/**
 * Determines which side a team was on during a specific round.
 */
export const getTeamSideInRound = (match: Match, round: any, isUs: boolean): 'CT' | 'T' => {
    const players = isUs ? match.players : match.enemyPlayers;
    for (const p of players) {
        if (round.playerStats[p.playerId]) {
            return round.playerStats[p.playerId].side;
        }
        if (p.steamid && round.playerStats[p.steamid]) {
            return round.playerStats[p.steamid].side;
        }
    }
    // Fallback logic if stats are missing
    const startSide = match.startingSide || 'CT';
    // CS2 uses MR12 (12 rounds per half)
    const halfMax = 12;
    const isFirstHalf = round.roundNumber <= halfMax;
    
    if (isUs) {
        return isFirstHalf ? startSide : (startSide === 'CT' ? 'T' : 'CT');
    } else {
        return isFirstHalf ? (startSide === 'CT' ? 'T' : 'CT') : startSide;
    }
};

/**
 * Calculates the total score from individual round data.
 */
export const calculateScoreFromRounds = (match: Match) => {
    if (!match.rounds || match.rounds.length === 0) return match.score;

    let usWins = 0;
    let themWins = 0;
    let h1_us = 0, h1_them = 0;
    let h2_us = 0, h2_them = 0;
    let ot_us = 0, ot_them = 0;

    // CS2 uses MR12
    const regulationMax = 24;
    const halfMax = 12;

    match.rounds.forEach(round => {
        const usSide = getTeamSideInRound(match, round, true);
        const isUsWinner = round.winnerSide === usSide;
        
        if (isUsWinner) usWins++; else themWins++;

        if (round.roundNumber <= halfMax) {
            if (isUsWinner) h1_us++; else h1_them++;
        } else if (round.roundNumber <= regulationMax) {
            if (isUsWinner) h2_us++; else h2_them++;
        } else {
            if (isUsWinner) ot_us++; else ot_them++;
        }
    });

    return {
        us: usWins,
        them: themWins,
        half1_us: h1_us,
        half1_them: h1_them,
        half2_us: h2_us,
        half2_them: h2_them,
        ot_us: ot_us > 0 || ot_them > 0 ? ot_us : undefined,
        ot_them: ot_us > 0 || ot_them > 0 ? ot_them : undefined
    };
};

export const getBonResult = (bon: MatchBon, allMatches: Match[]): { us: number, them: number, result: 'WIN' | 'LOSS' | 'TIE' | 'PENDING' } => {
    let usWins = 0;
    let themWins = 0;

    bon.matches.forEach(ref => {
        const match = allMatches.find(m => m.id === ref.id);
        if (match) {
            if (match.result === 'WIN') usWins++;
            else if (match.result === 'LOSS') themWins++;
        }
    });

    let result: 'WIN' | 'LOSS' | 'TIE' | 'PENDING' = 'PENDING';
    
    // Simple logic: if anyone reaches majority, they win.
    const majority = bon.type === 'BO5' ? 3 : bon.type === 'BO3' ? 2 : bon.type === 'BO2' ? 2 : 1;
    
    if (usWins >= majority) result = 'WIN';
    else if (themWins >= majority) result = 'LOSS';
    else if (bon.type === 'BO2' && usWins === 1 && themWins === 1) result = 'TIE';
    // If all matches are played and no one reached majority (e.g. BO2 1-1 or incomplete)
    else if (usWins + themWins === parseInt(bon.type.replace('BO', ''))) {
        if (usWins > themWins) result = 'WIN';
        else if (themWins > usWins) result = 'LOSS';
        else result = 'TIE';
    }

    return { us: usWins, them: themWins, result };
};

export const aggregateMatches = (matches: Match[], title: string, id: string): Match => {
    if (matches.length === 0) return {} as Match;
    if (matches.length === 1) return matches[0];

    const base = matches[0];
    const aggregated: Match = {
        id: id,
        mapId: '全部地图' as any,
        date: base.date,
        rank: base.rank || 'Unknown',
        result: 'TIE',
        score: { us: 0, them: 0, half1_us: 0, half1_them: 0, half2_us: 0, half2_them: 0 },
        players: [],
        enemyPlayers: [],
        rounds: [],
        source: base.source,
        serverName: title,
        startingSide: base.startingSide,
        teamNameUs: base.teamNameUs,
        teamNameThem: base.teamNameThem
    };

    const playerMap = new Map<string, PlayerMatchStats>();
    const enemyMap = new Map<string, PlayerMatchStats>();

    // Determine the core "Us" team based on the first match
    const baseUsSteamIds = new Set(base.players.map(p => p.steamid || p.playerId));

    const mergePlayer = (map: Map<string, PlayerMatchStats>, p: PlayerMatchStats) => {
        const key = p.steamid || p.playerId;
        if (!map.has(key)) {
            map.set(key, JSON.parse(JSON.stringify({ ...p, matchesPlayed: 1, r3_rounds_played: p.r3_rounds_played || 0 })));
        } else {
            const existing = map.get(key)!;
            existing.kills += p.kills;
            existing.deaths += p.deaths;
            existing.assists += p.assists;
            existing.total_damage = (existing.total_damage || 0) + (p.total_damage || 0);
            existing.entry_kills += p.entry_kills;
            existing.entry_deaths += p.entry_deaths;
            existing.matchesPlayed = (existing.matchesPlayed || 1) + 1;
            
            const totalRounds = (existing.r3_rounds_played || 0) + (p.r3_rounds_played || 0);
            if (totalRounds > 0) {
                existing.adr = ((existing.adr * (existing.r3_rounds_played || 0)) + (p.adr * (p.r3_rounds_played || 0))) / totalRounds;
                existing.hsRate = ((existing.hsRate * (existing.r3_rounds_played || 0)) + (p.hsRate * (p.r3_rounds_played || 0))) / totalRounds;
                existing.rating = ((existing.rating * (existing.r3_rounds_played || 0)) + (p.rating * (p.r3_rounds_played || 0))) / totalRounds;
                existing.kast = ((existing.kast * (existing.r3_rounds_played || 0)) + (p.kast * (p.r3_rounds_played || 0))) / totalRounds;
            }
            existing.r3_rounds_played = totalRounds;

            existing.multikills.k2 += p.multikills.k2;
            existing.multikills.k3 += p.multikills.k3;
            existing.multikills.k4 += p.multikills.k4;
            existing.multikills.k5 += p.multikills.k5;

            for (const k of ['1v1', '1v2', '1v3', '1v4', '1v5'] as const) {
                existing.clutches[k].won += p.clutches[k].won;
                existing.clutches[k].lost += p.clutches[k].lost;
            }
            existing.clutchHistory = [...(existing.clutchHistory || []), ...(p.clutchHistory || [])];

            existing.utility.smokesThrown += p.utility.smokesThrown;
            existing.utility.flashesThrown += p.utility.flashesThrown;
            existing.utility.enemiesBlinded += p.utility.enemiesBlinded;
            existing.utility.blindDuration += p.utility.blindDuration;
            existing.utility.heThrown += p.utility.heThrown;
            existing.utility.heDamage += p.utility.heDamage;
            existing.utility.molotovsThrown += p.utility.molotovsThrown;
            existing.utility.molotovDamage += p.utility.molotovDamage;
        }
    };

    let usWins = 0;
    let themWins = 0;

    matches.forEach(m => {
        // Check alignment with base match
        let overlapWithUs = 0;
        m.players.forEach(p => {
            if (baseUsSteamIds.has(p.steamid || p.playerId)) overlapWithUs++;
        });

        // If m.players has less overlap with base.players than m.enemyPlayers would, swap them
        const isSwapped = overlapWithUs < (m.players.length / 2) && m.players.length > 0;

        const actualUsPlayers = isSwapped ? m.enemyPlayers : m.players;
        const actualThemPlayers = isSwapped ? m.players : m.enemyPlayers;

        actualUsPlayers.forEach(p => mergePlayer(playerMap, p));
        actualThemPlayers.forEach(p => mergePlayer(enemyMap, p));
        
        // Also swap match result if teams are swapped
        let actualResult = m.result;
        if (isSwapped) {
            if (m.result === 'WIN') actualResult = 'LOSS';
            else if (m.result === 'LOSS') actualResult = 'WIN';
        }

        if (actualResult === 'WIN') usWins++;
        else if (actualResult === 'LOSS') themWins++;

        const roundOffset = aggregated.rounds?.length || 0;
        if (m.rounds) {
            const adjustedRounds = m.rounds.map(r => ({
                ...r,
                roundNumber: r.roundNumber + roundOffset
            }));
            aggregated.rounds = [...(aggregated.rounds || []), ...adjustedRounds];
        }
    });

    aggregated.players = Array.from(playerMap.values());
    aggregated.enemyPlayers = Array.from(enemyMap.values());
    
    if (usWins > themWins) aggregated.result = 'WIN';
    else if (themWins > usWins) aggregated.result = 'LOSS';
    else aggregated.result = 'TIE';

    aggregated.score = { us: usWins, them: themWins, half1_us: 0, half1_them: 0, half2_us: 0, half2_them: 0 };

    return aggregated;
};
