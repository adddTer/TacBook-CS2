import { Match, PlayerMatchStats, MatchSeries, SeriesMatchRef } from '../types';
import { ROSTER } from '../constants/roster';
import { MAPS } from '../constants/maps';

/**
 * Determines if a match involves the "Main Roster" (My Team).
 * Returns true if ANY player in the match is found in the defined ROSTER.
 */
export const isMyTeamMatch = (match: Match): boolean => {
    // Check 'players' array (which parser puts 'My Team' in)
    // Also check 'enemyPlayers' just in case of parsing weirdness, though typically parser handles this.
    const allPlayers = [...match.players, ...match.enemyPlayers];
    return allPlayers.some(p => {
        // Match by ID or Name
        return ROSTER.some(r => r.id === p.playerId || r.name === p.playerId || (p.steamid && r.id === p.steamid)); // Note: ROSTER usually uses short names as IDs, SteamID mapping would be better if available
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

/**
 * Helper to get display names for teams in a match.
 */
export const getTeamNames = (match: Match): { teamA: string, teamB: string } => {
    const isMine = isMyTeamMatch(match);
    
    // If it's my team, prioritize standard names
    if (isMine) {
        return {
            teamA: match.teamNameUs || '我方',
            teamB: match.teamNameThem || '敌方'
        };
    }
    
    // Neutral match
    return {
        teamA: match.teamNameUs || 'Team A',
        teamB: match.teamNameThem || 'Team B'
    };
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
