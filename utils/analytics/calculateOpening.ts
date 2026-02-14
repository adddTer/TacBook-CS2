
/**
 * Calculates Opening Score (0-100).
 * 
 * Target: Professional Average ~ 45 Points.
 * 
 * Components:
 * 1. Opening Success Rate (30%): Target 75% (Avg ~50% -> 20pts)
 * 2. Opening Attempts % (30%): Target 35% (Avg ~20% -> 51pts)
 * 3. Opening Kills per Round (25%): Target 0.25 (Avg ~0.10 -> 40pts)
 * 4. Win % After Opening (15%): Target 90% (Avg ~75% -> 60pts)
 */
export const calculateOpening = (
    openingKills: number, 
    openingDeaths: number, 
    roundsWonAfterEntry: number,
    rounds: number
): number => {
    if (rounds === 0) return 0;

    const attempts = openingKills + openingDeaths;
    
    // 1. Success Rate (30%)
    // Base 0.30 = 0 pts. 0.75 = Max.
    const successRate = attempts > 0 ? openingKills / attempts : 0;
    let scoreSuccess = 0;
    if (successRate <= 0.30) scoreSuccess = 0;
    else scoreSuccess = Math.min(30, ((successRate - 0.30) / 0.45) * 30);

    // 2. Attempts % (30%)
    const attemptRate = attempts / rounds;
    const scoreAttempts = (attemptRate / 0.35) * 30;

    // 3. Opening Kills per Round (25%)
    const okpr = openingKills / rounds;
    const scoreOKPR = (okpr / 0.25) * 25;

    // 4. Win % After Entry (15%)
    const winRate = openingKills > 0 ? roundsWonAfterEntry / openingKills : 0;
    const scoreWinRate = (winRate / 0.90) * 15;

    const totalScore = scoreSuccess + scoreAttempts + scoreOKPR + scoreWinRate;

    return Math.round(Math.max(0, Math.min(100, totalScore)));
};
