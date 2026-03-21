import { Match, PlayerMatchStats, MatchSeries, SeriesMatchRef } from '../types';
import { ROSTER } from '../constants/roster';
import { MAPS } from '../constants/maps';

/**
 * Determines if a match involves the "Main Roster" (My Team).
 * Returns true if ANY player in the match is found in the defined ROSTER.
 */
export const isMyTeamMatch = (match: Match): boolean => {
    // Check both 'players' and 'enemyPlayers' arrays
    return [...match.players, ...match.enemyPlayers].some(p => {
        return ROSTER.some(r => {
            if (r.id === p.playerId || r.name === p.playerId) return true;
            if (!p.steamid) return false;
            
            const pSteamIdStr = String(p.steamid);
            if (r.id === pSteamIdStr) return true;
            
            let isMatch = r.steamids?.includes(pSteamIdStr) || 
                (pSteamIdStr.endsWith('00') && r.steamids?.some(id => id.startsWith(pSteamIdStr.slice(0, -2))));
                
            if (!isMatch && /^\d+$/.test(pSteamIdStr) && pSteamIdStr.length < 16) {
                const accountId = parseInt(pSteamIdStr, 10);
                const base = BigInt('76561197960265728');
                const convertedId = (base + BigInt(accountId)).toString();
                isMatch = r.steamids?.includes(convertedId);
            }
            
            return isMatch;
        });
    });
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

    const isTeamAUs = match.players.some(p => ROSTER.some(r => 
        r.id === p.playerId || r.name === p.playerId || 
        (p.steamid && (r.steamids?.includes(String(p.steamid)) || 
        (String(p.steamid).endsWith('00') && r.steamids?.some(id => id.startsWith(String(p.steamid).slice(0, -2)))) ||
        (/^\d+$/.test(String(p.steamid)) && String(p.steamid).length < 16 && r.steamids?.includes((BigInt('76561197960265728') + BigInt(parseInt(String(p.steamid), 10))).toString()))))
    ));
    
    const isTeamBUs = match.enemyPlayers.some(p => ROSTER.some(r => 
        r.id === p.playerId || r.name === p.playerId || 
        (p.steamid && (r.steamids?.includes(String(p.steamid)) || 
        (String(p.steamid).endsWith('00') && r.steamids?.some(id => id.startsWith(String(p.steamid).slice(0, -2)))) ||
        (/^\d+$/.test(String(p.steamid)) && String(p.steamid).length < 16 && r.steamids?.includes((BigInt('76561197960265728') + BigInt(parseInt(String(p.steamid), 10))).toString()))))
    ));

    if (!teamA) {
        teamA = isTeamAUs ? '我方' : (isTeamBUs ? '敌方' : 'Team A');
    }
    if (!teamB) {
        teamB = isTeamBUs ? '我方' : (isTeamAUs ? '敌方' : 'Team B');
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
