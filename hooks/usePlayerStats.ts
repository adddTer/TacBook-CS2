
import { useMemo } from 'react';
import { Match, PlayerMatchStats } from '../types';
import { aggregatePlayerStats } from '../utils/analytics/statsAggregator';
import { calculateFirepower } from '../utils/analytics/calculateFirepower';
import { calculateEntry } from '../utils/analytics/calculateEntry';
import { calculateTrade } from '../utils/analytics/calculateTrade';
import { calculateOpening } from '../utils/analytics/calculateOpening';
import { calculateClutch } from '../utils/analytics/calculateClutch';
import { calculateSniper } from '../utils/analytics/calculateSniper';
import { calculateUtility } from '../utils/analytics/calculateUtility';

interface StatsResult {
    overall: {
        rating: number;
        ctRating: number;
        tRating: number;
    };
    filtered: {
        adr: number;
        kdr: number;
        dpr: number;
        kast: number;
        impact: number;
        wpaSum: number;
        wpaAvg: number;
        multiKillRate: number;
        
        // Ability Scores (0-100)
        scoreFirepower: number;
        scoreEntry: number; 
        scoreTrade: number;
        scoreOpening: number; 
        scoreClutch: number;
        scoreSniper: number;
        scoreUtility: number;

        // Granular Details for UI
        details: {
            // Firepower
            kpr: number;
            roundsWithKills: number;
            kprWin: number;
            rating: number;
            dpr: number; // Damage per round
            multiKillRounds: number;
            dprWin: number;
            pistolRating: number;

            // Entry
            savedByTeammatePerRound: number;
            tradedDeathsPerRound: number;
            tradedDeathsPct: number;
            openingDeathsTradedPct: number;
            assistsPerRound: number;
            supportRounds: number;

            // Trade
            savedTeammatePerRound: number;
            tradeKillsPerRound: number;
            tradeKillsPct: number;
            assistPct: number;
            damagePerKill: number;

            // Opening
            openingKillsPerRound: number;
            openingDeathsPerRound: number;
            openingAttempts: number;
            openingSuccessPct: number;
            winPctAfterOpening: number;
            attacksPerRound: number; // Approx opening attempts / round

            // Clutch
            clutchPointsPerRound: number;
            lastAlivePct: number;
            win1v1Pct: number;
            timeAlivePerRound: number;
            savesPerLoss: number;

            // Sniper
            sniperKillsPerRound: number;
            sniperKillsPct: number;
            roundsWithSniperKillsPct: number;
            sniperMultiKillRounds: number;
            sniperOpeningKillsPerRound: number;

            // Utility
            utilDmgPerRound: number;
            utilKillsPer100: number;
            flashesPerRound: number;
            flashAssistsPerRound: number;
            blindTimePerRound: number;
        }
    };
}

export const usePlayerStats = (
    profileId: string, 
    history: { match: Match, stats: PlayerMatchStats }[], 
    sideFilter: 'ALL' | 'CT' | 'T'
): StatsResult => {
    return useMemo(() => {
        // 1. Use the Aggregator to get all raw data
        const stats = aggregatePlayerStats(profileId, history, sideFilter);
        
        // 2. Calculate Derived Averages for Display (Filtered)
        const safeDiv = (a: number, b: number) => b === 0 ? 0 : a / b;
        const rounds = stats.roundsPlayed || 1; // Prevent div by zero globally

        const adr = safeDiv(stats.damage, rounds);
        const kpr = safeDiv(stats.kills, rounds);
        const avgRating = safeDiv(stats.ratingSum, rounds) * 1.30; 
        
        // WPA accumulation
        let wpaSum = 0;
        let kastCount = 0;
        let impactSum = 0;
        
        history.forEach(({ match }) => {
             if (!match.rounds) return;
             const pMatch = [...match.players, ...match.enemyPlayers].find(p => p.playerId === profileId);
             if(!pMatch) return;
             const pid = pMatch.steamid || pMatch.playerId;
             
             match.rounds.forEach(r => {
                 const pr = r.playerStats[pid];
                 if (!pr) return;
                 if (sideFilter !== 'ALL' && pr.side !== sideFilter) return;
                 if (pr.rating === 0 && pr.damage === 0 && pr.deaths === 0) return; // Ghost

                 if (pr.kills > 0 || pr.assists > 0 || pr.survived || pr.wasTraded) kastCount++;
                 if (typeof pr.wpa === 'number') wpaSum += pr.wpa;
                 impactSum += pr.impact;
             });
        });

        // 3. Calculate Overall Ratings (Independent of Filter) for Hero Card
        let totalRating = 0, totalRounds = 0;
        let ctRatingSum = 0, ctRounds = 0;
        let tRatingSum = 0, tRounds = 0;
        
        history.forEach(({ match }) => {
            if(!match.rounds) return;
            const pMatch = [...match.players, ...match.enemyPlayers].find(p => p.playerId === profileId);
            if(!pMatch) return;
            const pid = pMatch.steamid || pMatch.playerId;

            match.rounds.forEach(r => {
                const pr = r.playerStats[pid];
                if (!pr || (pr.rating === 0 && pr.damage === 0 && pr.deaths === 0)) return;
                
                totalRating += pr.rating;
                totalRounds++;
                if (pr.side === 'CT') { ctRatingSum += pr.rating; ctRounds++; }
                else { tRatingSum += pr.rating; tRounds++; }
            });
        });

        // 4. Compute Scores
        const scoreFirepower = calculateFirepower(
            adr, kpr, avgRating, 
            safeDiv(stats.roundsWithKills, rounds) * 100,
            safeDiv(stats.killsInWins, stats.roundsWon), 
            safeDiv(stats.damageInWins, stats.roundsWon), // NEW PARAM
            safeDiv(stats.multiKillRounds, rounds) * 100
        );

        const scoreEntry = calculateEntry(
            stats.tradedDeaths, 
            stats.entryDeaths,
            stats.entryDeathsTraded,
            stats.deaths, // NEW PARAM (Total Deaths for %)
            stats.savedByTeammate,
            stats.assists, 
            stats.supportRounds,
            rounds
        );

        const scoreTrade = calculateTrade(
            stats.tradeKills, 
            stats.kills, 
            stats.damage,
            stats.teammatesSaved, 
            stats.assists,
            rounds
        );

        const scoreOpening = calculateOpening(
            stats.entryKills, 
            stats.entryDeaths, 
            stats.roundsWonAfterEntry,
            rounds
        );
        
        const scoreClutch = calculateClutch(
            stats.clutchPoints, 
            stats.w1v1, stats.l1v1, 
            stats.roundsLastAlive, 
            stats.totalTimeAlive, 
            stats.savesInLosses, 
            stats.roundsLost, 
            rounds
        );
        
        const scoreSniper = calculateSniper(
            stats.sniperKills, 
            stats.kills, 
            stats.roundsWithSniperKills, 
            stats.sniperMultiKillRounds, 
            stats.sniperOpeningKills, 
            rounds
        );
        
        const scoreUtility = calculateUtility(
            stats.utilityDamage, 
            stats.flashAssists, 
            stats.utilityKills,
            stats.flashesThrown,
            stats.blindDuration, 
            stats.enemiesBlinded, 
            rounds
        );

        // 5. Prepare Detailed Metrics
        const details = {
            // Firepower
            kpr: kpr,
            roundsWithKills: stats.roundsWithKills,
            kprWin: safeDiv(stats.killsInWins, stats.roundsWon),
            rating: avgRating,
            dpr: adr,
            multiKillRounds: stats.multiKillRounds,
            dprWin: safeDiv(stats.damageInWins, stats.roundsWon),
            pistolRating: safeDiv(stats.pistolRatingSum, stats.pistolRoundsPlayed) * 1.30,

            // Entry
            savedByTeammatePerRound: safeDiv(stats.savedByTeammate, rounds),
            tradedDeathsPerRound: safeDiv(stats.tradedDeaths, rounds),
            tradedDeathsPct: safeDiv(stats.tradedDeaths, stats.deaths) * 100,
            openingDeathsTradedPct: safeDiv(stats.entryDeathsTraded, stats.entryDeaths) * 100,
            assistsPerRound: safeDiv(stats.assists, rounds),
            supportRounds: stats.supportRounds,

            // Trade
            savedTeammatePerRound: safeDiv(stats.teammatesSaved, rounds),
            tradeKillsPerRound: safeDiv(stats.tradeKills, rounds),
            tradeKillsPct: safeDiv(stats.tradeKills, stats.kills) * 100,
            assistPct: safeDiv(stats.assists, stats.kills) * 100, // Ratio of assists to kills usually, or assists/rounds. Standard is assist/kill ratio or assist per round. Let's use Assist/Kill% to show "Helpfulness" relative to fragging
            damagePerKill: safeDiv(stats.damage, stats.kills),

            // Opening
            openingKillsPerRound: safeDiv(stats.entryKills, rounds),
            openingDeathsPerRound: safeDiv(stats.entryDeaths, rounds),
            openingAttempts: stats.entryKills + stats.entryDeaths,
            openingSuccessPct: safeDiv(stats.entryKills, stats.entryKills + stats.entryDeaths) * 100,
            winPctAfterOpening: safeDiv(stats.roundsWonAfterEntry, stats.entryKills) * 100,
            attacksPerRound: safeDiv(stats.entryKills + stats.entryDeaths, rounds),

            // Clutch
            clutchPointsPerRound: safeDiv(stats.clutchPoints, rounds),
            lastAlivePct: safeDiv(stats.roundsLastAlive, rounds) * 100,
            win1v1Pct: safeDiv(stats.w1v1, stats.w1v1 + stats.l1v1) * 100,
            timeAlivePerRound: safeDiv(stats.totalTimeAlive, rounds),
            savesPerLoss: safeDiv(stats.savesInLosses, stats.roundsLost),

            // Sniper
            sniperKillsPerRound: safeDiv(stats.sniperKills, rounds),
            sniperKillsPct: safeDiv(stats.sniperKills, stats.kills) * 100,
            roundsWithSniperKillsPct: safeDiv(stats.roundsWithSniperKills, rounds) * 100,
            sniperMultiKillRounds: stats.sniperMultiKillRounds,
            sniperOpeningKillsPerRound: safeDiv(stats.sniperOpeningKills, rounds),

            // Utility
            utilDmgPerRound: safeDiv(stats.utilityDamage, rounds),
            utilKillsPer100: safeDiv(stats.utilityKills, rounds) * 100,
            flashesPerRound: safeDiv(stats.flashesThrown, rounds),
            flashAssistsPerRound: safeDiv(stats.flashAssists, rounds),
            blindTimePerRound: safeDiv(stats.blindDuration, rounds),
        };

        return {
            overall: {
                rating: safeDiv(totalRating, totalRounds) * 1.30,
                ctRating: safeDiv(ctRatingSum, ctRounds) * 1.30,
                tRating: safeDiv(tRatingSum, tRounds) * 1.30,
            },
            filtered: {
                adr: adr,
                kdr: safeDiv(stats.kills, stats.deaths),
                dpr: safeDiv(stats.deaths, rounds),
                kast: safeDiv(kastCount, rounds) * 100,
                impact: safeDiv(impactSum, rounds),
                wpaSum: wpaSum,
                wpaAvg: safeDiv(wpaSum, rounds),
                multiKillRate: safeDiv(stats.multiKillRounds, rounds) * 100,
                
                scoreFirepower,
                scoreEntry,
                scoreTrade,
                scoreOpening,
                scoreClutch,
                scoreSniper,
                scoreUtility,

                details: details
            }
        };
    }, [history, profileId, sideFilter]);
};
