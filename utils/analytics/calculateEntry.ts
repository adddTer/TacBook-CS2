
/**
 * Calculates Entry (Sacrifice) Score (0-100).
 * 
 * Target: Professional Average ~ 45 Points.
 * 
 * Components:
 * 1. Opening Death Traded % (30%): Target 70% (Avg ~50% -> 21pts)
 * 2. Traded Deaths % (20%): Target 60% (Avg ~40% -> 13pts)
 * 3. Traded Deaths per Round (20%): Target 0.25 (Avg ~0.10 -> 40pts) (This is the volume metric)
 * 4. Saved by Teammate per Round (15%): Target 0.20 (Avg ~0.08 -> 40pts)
 * 5. Support Rounds % (15%): Target 40% (Avg ~20% -> 50pts)
 */
export const calculateEntry = (
    tradedDeaths: number, 
    openingDeaths: number,
    openingDeathsTraded: number,
    totalDeaths: number,
    savedByTeammate: number,
    assists: number, 
    supportRounds: number,
    rounds: number
): number => {
    if (rounds === 0) return 0;

    // 1. Opening Death Traded % (30%)
    const odTradeRate = openingDeaths > 0 ? openingDeathsTraded / openingDeaths : 0;
    const scoreODT = (odTradeRate / 0.70) * 30;

    // 2. Traded Deaths % (20%)
    const tdRate = totalDeaths > 0 ? tradedDeaths / totalDeaths : 0;
    const scoreTDPct = (tdRate / 0.60) * 20;

    // 3. Traded Deaths per Round (20%)
    // Volume of sacrifice
    const tradedDeathPerRound = tradedDeaths / rounds;
    const scoreTDPR = (tradedDeathPerRound / 0.25) * 20;

    // 4. Saved by Teammate per Round (15%)
    const savedRate = savedByTeammate / rounds;
    const scoreSaved = (savedRate / 0.20) * 15;

    // 5. Support Round % (15%)
    const suppRoundRate = supportRounds / rounds;
    const scoreSupp = (suppRoundRate / 0.40) * 15;
    
    const totalScore = scoreODT + scoreTDPct + scoreTDPR + scoreSaved + scoreSupp;

    return Math.round(Math.max(0, totalScore));
};
