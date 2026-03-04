import { Match, PlayerMatchStats, Side } from '../../types';
import { calculatePlayerStats, StatsResult } from './playerStatsCalculator';
import { resolveName } from '../demo/helpers';
import { identifyRole } from './roleIdentifier';
import { RoleDefinition } from './roleDefinitions';

export interface AggregatedPlayer {
    playerId: string;
    steamid?: string;
    name: string;
    matchesPlayed: number;
    basic: PlayerMatchStats;
    full: StatsResult;
    role: RoleDefinition;
}

/**
 * Generic aggregator for match statistics.
 * Can be used to combine stats from multiple matches into a single set of player profiles.
 */
export class MatchAggregator {
    /**
     * Aggregates stats for multiple matches into a list of player stats.
     * Useful for tournament-wide or series-wide statistics.
     */
    static aggregate(matches: Match[]): PlayerMatchStats[] {
        const statsMap = new Map<string, PlayerMatchStats>();

        matches.forEach(match => {
            const allPlayers = [...match.players, ...match.enemyPlayers];
            allPlayers.forEach(p => {
                const matchRounds = (match.score.us + match.score.them) || 24;
                const currentRounds = p.r3_rounds_played || matchRounds;
                
                const existing = statsMap.get(p.playerId);
                if (existing) {
                    existing.kills += p.kills;
                    existing.deaths += p.deaths;
                    existing.assists += p.assists;
                    existing.total_damage = (existing.total_damage || 0) + (p.total_damage || 0);
                    
                    // Aggregate headshots if available (estimate from hsRate if missing)
                    const currentHs = (p as any).headshots !== undefined 
                        ? (p as any).headshots 
                        : Math.round(p.kills * (p.hsRate / 100));
                    (existing as any).headshots = ((existing as any).headshots || 0) + currentHs;

                    existing.r3_rounds_played = (existing.r3_rounds_played || 0) + currentRounds;
                    
                    // WPA Accumulation (Internal sum)
                    const currentWpaSum = p.r3_wpa_accum !== undefined ? p.r3_wpa_accum : (p.wpa * currentRounds);
                    existing.r3_wpa_accum = (existing.r3_wpa_accum || 0) + currentWpaSum;
                    
                    // Impact Accumulation
                    existing.r3_impact_accum = (existing.r3_impact_accum || 0) + (p.r3_impact_accum || 0);
                    
                    // Economy Accumulation
                    existing.r3_econ_accum = (existing.r3_econ_accum || 0) + (p.r3_econ_accum || 0);
                    
                    existing.entry_kills = (existing.entry_kills || 0) + (p.entry_kills || 0);
                    existing.entry_deaths = (existing.entry_deaths || 0) + (p.entry_deaths || 0);
                    
                    // Accumulate rating sum to calculate average later
                    existing.rating = (existing.rating || 0) + (p.rating * currentRounds);
                    
                    if (p.multikills) {
                        if (!existing.multikills) existing.multikills = { k2: 0, k3: 0, k4: 0, k5: 0 };
                        existing.multikills.k2 = (existing.multikills.k2 || 0) + (p.multikills.k2 || 0);
                        existing.multikills.k3 = (existing.multikills.k3 || 0) + (p.multikills.k3 || 0);
                        existing.multikills.k4 = (existing.multikills.k4 || 0) + (p.multikills.k4 || 0);
                        existing.multikills.k5 = (existing.multikills.k5 || 0) + (p.multikills.k5 || 0);
                    }

                    if (p.clutches) {
                        Object.keys(p.clutches).forEach(key => {
                            const k = key as keyof typeof p.clutches;
                            if (!existing.clutches[k]) existing.clutches[k] = { won: 0, lost: 0 };
                            existing.clutches[k].won += p.clutches[k]?.won || 0;
                            existing.clutches[k].lost += p.clutches[k]?.lost || 0;
                        });
                    }

                    if (p.clutchHistory) {
                        if (!existing.clutchHistory) existing.clutchHistory = [];
                        existing.clutchHistory = [...existing.clutchHistory, ...p.clutchHistory];
                    }

                    // Duels Accumulation
                    if (p.duels) {
                        if (!existing.duels) existing.duels = {};
                        Object.entries(p.duels).forEach(([oppId, record]) => {
                            if (!existing.duels![oppId]) existing.duels![oppId] = { kills: 0, deaths: 0 };
                            existing.duels![oppId].kills += record.kills;
                            existing.duels![oppId].deaths += record.deaths;
                        });
                    }

                    // Utility Accumulation
                    if (p.utility) {
                        if (!existing.utility) existing.utility = { smokesThrown: 0, flashesThrown: 0, enemiesBlinded: 0, blindDuration: 0, heThrown: 0, heDamage: 0, molotovsThrown: 0, molotovDamage: 0 };
                        existing.utility.smokesThrown += p.utility.smokesThrown || 0;
                        existing.utility.flashesThrown += p.utility.flashesThrown || 0;
                        existing.utility.enemiesBlinded += p.utility.enemiesBlinded || 0;
                        existing.utility.blindDuration += p.utility.blindDuration || 0;
                        existing.utility.heThrown += p.utility.heThrown || 0;
                        existing.utility.heDamage += p.utility.heDamage || 0;
                        existing.utility.molotovsThrown += p.utility.molotovsThrown || 0;
                        existing.utility.molotovDamage += p.utility.molotovDamage || 0;
                    }

                    // KAST Accumulation (weighted by rounds)
                    (existing as any).kastSum = ((existing as any).kastSum || 0) + (p.kast * currentRounds);

                    existing.matchesPlayed = (existing.matchesPlayed || 1) + 1;
                } else {
                    // Deep copy to avoid mutating original match data
                    const copy = JSON.parse(JSON.stringify(p));
                    copy.matchesPlayed = 1;
                    const initialRounds = copy.r3_rounds_played || matchRounds;
                    copy.r3_rounds_played = initialRounds;
                    
                    // Store sums for later division
                    copy.rating = copy.rating * initialRounds; 
                    copy.r3_wpa_accum = copy.r3_wpa_accum !== undefined ? copy.r3_wpa_accum : (copy.wpa * initialRounds);
                    (copy as any).kastSum = copy.kast * initialRounds;

                    // Initial headshots
                    (copy as any).headshots = (p as any).headshots !== undefined 
                        ? (p as any).headshots 
                        : Math.round(p.kills * (p.hsRate / 100));

                    // Ensure all fields are initialized to avoid NaN
                    copy.entry_kills = p.entry_kills || 0;
                    copy.entry_deaths = p.entry_deaths || 0;
                    if (!copy.multikills) copy.multikills = { k2: 0, k3: 0, k4: 0, k5: 0 };

                    statsMap.set(p.playerId, copy);
                }
            });
        });

        let aggregated = Array.from(statsMap.values()).map(p => {
            const rounds = p.r3_rounds_played || 1;
            
            // Re-calculate averages
            const adr = p.total_damage ? p.total_damage / rounds : p.adr;
            
            // WPA is displayed as per-round average.
            const wpa = p.r3_wpa_accum ? (p.r3_wpa_accum / rounds) : 0;
            
            // Rating approximation
            const rating = p.rating ? (p.rating / rounds) : 0;

            // KAST average
            const kast = (p as any).kastSum ? ((p as any).kastSum / rounds) : p.kast;

            // HS Rate
            const totalHs = (p as any).headshots || 0;
            const hsRate = p.kills > 0 ? (totalHs / p.kills) * 100 : 0;

            return {
                ...p,
                adr,
                wpa,
                rating,
                hsRate,
                kast
            };
        });

        aggregated = aggregated.sort((a, b) => b.rating - a.rating);

        // Assign MVP and EVP
        if (aggregated.length > 0) {
            aggregated[0].isMvp = true;
            for (let i = 1; i < Math.min(6, aggregated.length); i++) {
                if (aggregated[i].rating >= 1.15) {
                    aggregated[i].isEvp = true;
                }
            }
        }

        return aggregated;
    }

    /**
     * Performs a deep aggregation including ability scores for all players.
     */
    static aggregateFull(matches: Match[]): AggregatedPlayer[] {
        // 1. Group matches by player
        const playerHistoryMap = new Map<string, { match: Match, stats: PlayerMatchStats }[]>();
        const playerNameMap = new Map<string, string>();
        const playerSteamMap = new Map<string, string>();

        matches.forEach(match => {
            const allPlayers = [...match.players, ...match.enemyPlayers];
            allPlayers.forEach(p => {
                const resolvedId = resolveName(p.playerId);
                const history = playerHistoryMap.get(resolvedId) || [];
                history.push({ match, stats: p });
                playerHistoryMap.set(resolvedId, history);
                
                if (!playerNameMap.has(resolvedId)) playerNameMap.set(resolvedId, p.playerId);
                if (p.steamid && !playerSteamMap.has(resolvedId)) playerSteamMap.set(resolvedId, p.steamid);
            });
        });

        // 2. Calculate full stats for each player
        const basicStats = this.aggregate(matches);
        const basicStatsMap = new Map(basicStats.map(p => [resolveName(p.playerId), p]));

        return Array.from(playerHistoryMap.entries()).map(([id, history]) => {
            const full = calculatePlayerStats(id, history, 'ALL');
            const basic = basicStatsMap.get(id)!;
            const role = identifyRole(full.filtered);

            return {
                playerId: id,
                steamid: playerSteamMap.get(id),
                name: playerNameMap.get(id) || id,
                matchesPlayed: history.length,
                basic,
                full,
                role
            };
        });
    }
}

// Functional export for backward compatibility
export const aggregateMatchesStats = MatchAggregator.aggregate;
