
/**
 * Calculates Clutch Score (0-100).
 * 
 * Target: Professional Average ~ 50 Points.
 * 
 * Components:
 * 1. Clutch Points Per Round (50%): Target 0.10 (Significantly Easier)
 * 2. 1v1 Win % (30%): Target 75% (Easier)
 * 3. Last Alive % (10%): Target 20% (Easier)
 * 4. Time Alive per Round (5%): Target 95s (Easier)
 * 5. Saves per Loss (5%): Target 30% (Easier)
 */
export const calculateClutch = (
    clutchPoints: number, 
    w1v1: number, 
    l1v1: number, 
    roundsLastAlive: number,
    totalTimeAlive: number,
    savesInLosses: number,
    roundsLost: number,
    rounds: number
): number => {
    if (rounds === 0) return 0;

    // 1. Clutch Points Per Round (50%)
    const cpPerRound = clutchPoints / rounds;
    const scoreCP = (cpPerRound / 0.10) * 50;

    // 2. 1v1 Win Rate (30%) - Dynamic Weighting
    const total1v1 = w1v1 + l1v1;
    let scoreWinRate = 0;
    let weightTotal = 70; // 50(CP) + 10(LastAlive) + 5(Time) + 5(Save)

    if (total1v1 > 0) {
        const winRate = w1v1 / total1v1;
        scoreWinRate = (winRate / 0.75) * 30;
        weightTotal += 30; // Add weight if applicable
    }

    // 3. Last Alive % (10%)
    const lastAliveRate = roundsLastAlive / rounds;
    const scoreLastAlive = (lastAliveRate / 0.20) * 10;

    // 4. Time Alive per Round (5%)
    const avgTimeAlive = totalTimeAlive / rounds;
    const scoreTime = (avgTimeAlive / 95) * 5;

    // 5. Saves per Loss (5%)
    const saveRate = roundsLost > 0 ? savesInLosses / roundsLost : 0;
    const scoreSave = (saveRate / 0.30) * 5;

    const rawTotalScore = scoreCP + scoreWinRate + scoreLastAlive + scoreTime + scoreSave;
    
    // Normalize to 100 based on active weights
    const finalScore = (rawTotalScore / weightTotal) * 100;

    return Math.round(Math.max(0, finalScore));
};
