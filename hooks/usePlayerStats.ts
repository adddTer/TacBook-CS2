
import { useMemo } from 'react';
import { Match, PlayerMatchStats } from '../types';
import { calculatePlayerStats, StatsResult } from '../utils/analytics/playerStatsCalculator';

export const usePlayerStats = (
    profileId: string, 
    history: { match: Match, stats: PlayerMatchStats }[], 
    sideFilter: 'ALL' | 'CT' | 'T'
): StatsResult => {
    return useMemo(() => {
        return calculatePlayerStats(profileId, history, sideFilter);
    }, [history, profileId, sideFilter]);
};
